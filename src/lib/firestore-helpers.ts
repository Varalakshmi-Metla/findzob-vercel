import * as admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

// Tiny UUID v4 generator to avoid an extra dependency in this helper file
function uuidv4() {
  // RFC4122 version 4 compliant UUID generator (simple)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
import { UserDoc, Application, ResumeDoc, Plan } from '@/types/firestore-schemas';

function tryInitAdmin() {
  if (admin.apps.length) return admin.app();
  // Prefer explicit path variable
  let svc = process.env.FIREBASE_ADMIN_SVC;
  if (process.env.FIREBASE_ADMIN_SVC_PATH) {
    try {
      const p = process.env.FIREBASE_ADMIN_SVC_PATH;
      svc = fs.readFileSync(p, 'utf8');
      if (process.env.NODE_ENV !== 'production') console.log('tryInitAdmin: using FIREBASE_ADMIN_SVC_PATH', p);
    } catch (e) {
      console.error('Failed to read FIREBASE_ADMIN_SVC_PATH', process.env.FIREBASE_ADMIN_SVC_PATH, (e as any)?.message || e);
    }
  }

  if (!svc) return undefined;

  // Helper to trim common BOMs and null bytes
  const normalize = (s: string) => s.replace(/^\uFEFF|^\uFFFE|^\u0000+/, '').trim();

  try {
    let raw = svc;

    // If svc looks like a file path and exists, read it
    try {
      const possiblePath = svc;
      if (typeof possiblePath === 'string' && (possiblePath.endsWith('.json') || possiblePath.includes(path.sep) || possiblePath.includes('\\') || possiblePath.includes('/'))) {
        if (fs.existsSync(possiblePath)) {
          raw = fs.readFileSync(possiblePath, 'utf8');
          if (process.env.NODE_ENV !== 'production') console.log('tryInitAdmin: read service account from path', possiblePath);
        }
      }
    } catch (e) {
      /* ignore path read errors, we'll try other parsers */
    }

    raw = normalize(raw);

    // Try several common encodings/formats for SERVICE ACCOUNT content:
    // 1) raw JSON
    // 2) raw JSON wrapped in quotes
    // 3) JSON with literal "\\n" sequences
    // 4) base64-encoded JSON
    const parseAttempts: Array<{ name: string; value: string }> = [];
    parseAttempts.push({ name: 'raw', value: raw });
    const trimmedQuotes = raw.replace(/^\s*['"]|['"]\s*$/g, '');
    if (trimmedQuotes !== raw) parseAttempts.push({ name: 'trimmedQuotes', value: trimmedQuotes });
    const withNewlines = raw.replace(/\\n/g, '\n');
    if (withNewlines !== raw && withNewlines !== trimmedQuotes) parseAttempts.push({ name: 'withNewlines', value: withNewlines });
    let base64Decoded: string | null = null;
    try {
      base64Decoded = Buffer.from(raw, 'base64').toString('utf8');
      if (base64Decoded && base64Decoded !== raw) parseAttempts.push({ name: 'base64', value: base64Decoded });
    } catch (e) {
      // ignore
    }

    const parseErrors: Record<string, string> = {};
    let parsed: any = null;
    for (const attempt of parseAttempts) {
      try {
        parsed = JSON.parse(normalize(attempt.value));
        if (process.env.NODE_ENV !== 'production') console.log(`tryInitAdmin: parsed service account using ${attempt.name}`);
        break;
      } catch (err: any) {
        parseErrors[attempt.name] = err?.message || String(err);
      }
    }
    if (!parsed) {
      throw new Error('Could not parse FIREBASE_ADMIN_SVC as JSON, base64 JSON, or file path: ' + JSON.stringify(parseErrors));
    }

    admin.initializeApp({ credential: admin.credential.cert(parsed as any), storageBucket: parsed.project_id ? `${parsed.project_id}.appspot.com` : undefined });
    return admin.app();
  } catch (e) {
    console.error('Failed to initialize firebase-admin in helper', e);
    return undefined;
  }
}

export async function getUserById(uid: string): Promise<UserDoc | null> {
  const app = tryInitAdmin();
  if (!app) {
    console.warn('getUserById: firebase-admin not initialized');
    return null;
  }
  const doc = await admin.firestore().collection('users').doc(uid).get();
  if (!doc.exists) return null;
  return doc.data() as UserDoc;
}

export async function updateUserPlan(uid: string, planType: string, expiryIso?: string | null, features?: string[]) {
  const app = tryInitAdmin();
  if (!app) {
    console.warn('updateUserPlan: firebase-admin not initialized — cannot update Firestore');
    return false;
  }
  const docRef = admin.firestore().collection('users').doc(uid);
  const now = new Date().toISOString();
  
  // Enforce business rule: All plans except Lifetime Membership require Lifetime Membership.
  try {
    const userSnap = await admin.firestore().collection('users').doc(uid).get();
    const user = userSnap.exists ? (userSnap.data() as any) : {};

    const hasLifetime = Boolean(
      user.planType === 'lifetime' ||
      user.planType === 'Lifetime Membership' ||
      (user.subscription && typeof user.subscription.plan === 'string' && user.subscription.plan.toLowerCase().includes('lifetime'))
    );

    if (planType !== 'lifetime' && planType !== 'Lifetime Membership' && !hasLifetime) {
      throw new Error('Users must have the Lifetime Membership plan before purchasing other plans.');
    }
  } catch (e) {
    // Bubble the error so webhook callers get notified; still set nothing in Firestore.
    console.error('updateUserPlan: validation failed', e);
    throw e;
  }

  await docRef.set({ planType, planExpiry: expiryIso || null, features: features || [], updatedAt: now }, { merge: true });
  return true;
}

export async function createApplication(app: Application & { resumeId?: string | null; resumeURL?: string | null; priority?: boolean | null }) {
  const adm = tryInitAdmin();
  if (!adm) {
    // If admin not initialized, try to write to 'applications' collection via REST? For now, fail with clear message
    throw new Error('firebase-admin not initialized: cannot write application to Firestore');
  }

  // Defensive check: if a resumeId is provided, ensure it belongs to the userId
  if (app.resumeId) {
    try {
      const resumeDoc = await admin.firestore().collection('resumes').doc(app.resumeId).get();
      if (!resumeDoc.exists) {
        throw new Error('Resume not found');
      }
      const resumeData = resumeDoc.data() as any;
      if (resumeData.userId !== app.userId) {
        throw new Error('Resume does not belong to user');
      }
    } catch (e: any) {
      // Bubble up a clear validation error
      throw new Error(e?.message || 'Invalid resume');
    }
  }


  // Read job to determine if hot
  const jobDoc = await admin.firestore().collection('jobs').doc(app.jobId).get();
  const job = jobDoc.exists ? (jobDoc.data() as any) : null;
  const isHot = job?.isHotJob || false;
  // priority can be explicitly provided by caller (e.g. user checked a priority checkbox)
  const priorityFlag = typeof (app as any).priority === 'boolean' ? (app as any).priority : isHot;

  // Read user plan info
  const userDoc = await admin.firestore().collection('users').doc(app.userId).get();
  const user = userDoc.exists ? (userDoc.data() as any) : null;
  const planType = user?.planType || 'Free';
  const normalizedPlanType = typeof planType === 'string' ? planType.toLowerCase() : String(planType).toLowerCase();
  const userPlans = (user?.plans || []).map((p: any) => (p.planName || p.planId || '').toLowerCase());
  const hasLifetime = userPlans.includes('lifetime membership') || userPlans.includes('lifetime');
  const hasServicePlan = userPlans.some((p: string) => ['pay-as-you-go', 'payg', 'pro', 'elite add-ons'].includes(p));

  // Enforce: Hot jobs require both Lifetime Membership and a service plan
  if (isHot) {
    if (!hasLifetime || !hasServicePlan) {
      throw new Error('You must have both Lifetime Membership and a service plan (Pay-As-You-Go, Pro, or Elite Add-Ons) to apply for hot jobs.');
    }
  }

  // Plan-based monthly limits (except Pay-As-You-Go)
  let postpaidBill = false;
  if (isHot) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const appsSnap = await admin.firestore().collection('applications')
      .where('userId', '==', app.userId)
      .where('priority', '==', true)
      .where('appliedAt', '>=', monthStart.toISOString())
      .get();
    const hotJobCount = appsSnap.size;
    // Plan limits
    const planLimits: Record<string, number | null> = {
      'lifetime membership': null,
      'lifetime': null,
      'pro': 300,
      'pro one month': 300,
      'elite add-ons': 10,
      'pay-as-you-go': null, // unlimited, but invoice
      'payg': null,
      'free': 0,
    };
    // Find the highest service plan (if multiple)
    let servicePlan = userPlans.find((p: string) => ['pay-as-you-go', 'payg', 'pro', 'elite add-ons'].includes(p));
    if (!servicePlan) servicePlan = normalizedPlanType;
    const limit = planLimits[servicePlan] ?? 0;
    if ((servicePlan === 'pay-as-you-go' || servicePlan === 'payg')) {
      postpaidBill = true;
    } else if (limit !== null && hotJobCount >= limit) {
      throw new Error(`You have reached your monthly hot job application limit for your plan (${limit}).`);
    }
  }

  // Read plan document to consult permission flags if available
  let planDocData: any = null;
  try {
    const pDoc = await admin.firestore().collection('plans').doc(normalizedPlanType).get();
    if (pDoc.exists) planDocData = pDoc.data();
  } catch (e) {
    // continue — permission checks will fall back to prior behavior
  }

  const planAllowsApply = planDocData?.permissions?.allowApply !== undefined ? Boolean(planDocData.permissions.allowApply) : (normalizedPlanType !== 'free');

  if (!planAllowsApply && !isHot) {
    throw new Error('User plan does not allow job applications. Upgrade required.');
  }

  const applicationId = uuidv4();
  const now = new Date().toISOString();
  const record: Application & { resumeId?: string | null; resumeURL?: string | null; postpaidBill?: boolean } = {
    userId: app.userId,
    jobId: app.jobId,
    appliedAt: now,
    priority: priorityFlag,
    status: 'Submitted',
    planType,
    resumeId: (app as any).resumeId || null,
    resumeURL: (app as any).resumeURL || null,
    postpaidBill,
  };

  await admin.firestore().collection('applications').doc(applicationId).set(record);
  // Also create a pendingApplications entry so employees can review new applications
  try {
    const pending = {
      id: applicationId,
      userId: app.userId,
      jobId: app.jobId,
      appliedAt: now,
      status: 'pending',
      priority: priorityFlag,
      planType,
      job: job || null,
      postpaidBill,
    };
    await admin.firestore().collection('pendingApplications').doc(applicationId).set(pending);
    if (isHot) {
      await admin.firestore().collection('hotJobRequests').add(pending);
    }
  } catch (e) {
    // non-fatal — just log
    console.warn('createApplication: failed to write pendingApplications', e);
  }
  return { id: applicationId, ...record };
}

export async function saveResumeAndSetUrl(uid: string, buffer: Buffer, filename: string, role?: string) {
  const adm = tryInitAdmin();
  if (!adm) {
    console.warn('saveResumeAndSetUrl: firebase-admin not initialized — skipping upload');
    return null;
  }
  // Enforce per-user monthly quota for resume updates/creates
  try {
    await checkAndIncrementResumeQuota(uid);
  } catch (e) {
    throw new Error((e as any)?.message || 'Resume quota exceeded');
  }
  const bucket = admin.storage().bucket(process.env.FIREBASE_STORAGE_BUCKET || undefined);
  if (!bucket) {
    console.warn('saveResumeAndSetUrl: no storage bucket configured');
    return null;
  }
  const destPath = `resumes/${uid}/${Date.now()}-${filename}`;
  const file = bucket.file(destPath);
  await file.save(buffer, { resumable: false, contentType: 'application/octet-stream' });
  // Make public read? Prefer generating signed URL
  const expires = Date.now() + 1000 * 60 * 60 * 24 * 365 * 5; // 5 years
  const [url] = await file.getSignedUrl({ action: 'read', expires: new Date(expires) });

  // Update user doc and create resume doc
  const resumeDoc: ResumeDoc = { userId: uid, resumeURL: url, role, createdAt: new Date().toISOString() };
  const resumeId = uuidv4();
    await admin.firestore().collection('resumes').doc(resumeId).set(resumeDoc);
    // Also save in user's subcollection for dashboard listing
    await admin.firestore().collection('users').doc(uid).collection('resumes').doc(resumeId).set(resumeDoc);
    await admin.firestore().collection('users').doc(uid).set({ resumeURL: url, updatedAt: new Date().toISOString() }, { merge: true });
  return { url, resumeId };
}

/**
 * Enforce and increment per-user monthly resume creation/update quota.
 * Uses a transaction on users/{uid} to atomically read and increment the counter
 * stored under users.{resumeUsage}.{YYYY-MM}.
 * Throws an Error when the limit is exceeded.
 */
export async function checkAndIncrementResumeQuota(uid: string, limit = 2) {
  const adm = tryInitAdmin();
  if (!adm) throw new Error('firebase-admin not initialized');
  const userRef = admin.firestore().collection('users').doc(uid);
  const monthKey = new Date().toISOString().slice(0, 7); // YYYY-MM

  await admin.firestore().runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    const data = snap.exists ? (snap.data() as any) : {};
    const usage = data?.resumeUsage || {};
    const current = typeof usage[monthKey] === 'number' ? usage[monthKey] : 0;
    if (current >= limit) {
      throw new Error('Monthly resume update limit reached');
    }
    usage[monthKey] = current + 1;
    tx.set(userRef, { resumeUsage: usage, updatedAt: new Date().toISOString() }, { merge: true });
  });
}
