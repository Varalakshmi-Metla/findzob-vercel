import admin from 'firebase-admin';
import { NextResponse } from 'next/server';

// Ensure this route runs in a Node.js runtime so `firebase-admin` (which
// depends on Node APIs) works correctly. Running under the Edge runtime
// can cause unexpected errors like "reading 'prototype' of undefined".
export const runtime = 'nodejs';
import { isAdminEmail } from '@/lib/admin';

// Initialize firebase-admin safely
if (!admin.apps.length) {
  const svc = process.env.FIREBASE_ADMIN_SVC || process.env.FIREBASE_SERVICE_ACCOUNT;
  const projectEnv =
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT ||
    process.env.FIREBASE_PROJECT_ID ||
    (() => {
      try {
        const cfg = process.env.FIREBASE_CONFIG;
        if (cfg) {
          const parsedCfg = JSON.parse(cfg);
          return parsedCfg.projectId || parsedCfg.project_id;
        }
      } catch (e) {
        /* ignore */
      }
      return undefined;
    })();

  if (svc) {
    try {
      let key = svc;
      if (!svc.trim().startsWith('{')) {
        try { key = Buffer.from(svc, 'base64').toString('utf8'); } catch (e) { key = svc; }
      }
      const parsed = JSON.parse(key);
      const projectId = parsed.project_id || parsed.projectId;
      const initOptions: any = { credential: admin.credential.cert(parsed as any) };
      if (projectId) initOptions.projectId = projectId;
      admin.initializeApp(initOptions);
    } catch (e) {
      console.warn('Failed to parse FIREBASE_ADMIN_SVC, falling back to default initializeApp()', e);
      try { admin.initializeApp(); } catch (e2) { console.error('firebase-admin initializeApp failed', e2); }
    }
  } else if (projectEnv) {
    try { admin.initializeApp(); } catch (e) { console.error('firebase-admin initializeApp failed', e); }
  } else {
    const errMsg = 'No Firebase admin credentials or project id detected.\nProvide a service account JSON via the FIREBASE_ADMIN_SVC (raw JSON or base64-encoded) environment variable,\nor set GOOGLE_CLOUD_PROJECT / GCLOUD_PROJECT / FIREBASE_PROJECT_ID / FIREBASE_CONFIG with a projectId.\nSee: https://cloud.google.com/docs/authentication/getting-started';
    console.error(errMsg);
    throw new Error(errMsg);
  }
}

type RequestBody = {
  email: string;
};

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing Authorization token' }, { status: 401 });
    }
    const idToken = authHeader.split(' ')[1];

    // Verify caller token
    let caller: any;
    try {
      caller = await admin.auth().verifyIdToken(idToken);
    } catch (err: any) {
      console.error('Token verification failed', err);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // allow if caller has admin claim or is the configured admin email
    const callerEmail = caller.email as string | undefined;
    const isCallerAdmin = Boolean(caller.admin === true) || isAdminEmail(callerEmail?.toLowerCase());
    if (!isCallerAdmin) {
      return NextResponse.json({ error: 'Forbidden: admin privileges required' }, { status: 403 });
    }

    const body: RequestBody = await req.json();
    if (!body || !body.email) {
      return NextResponse.json({ error: 'Missing email' }, { status: 400 });
    }
    const email = body.email.toLowerCase().trim();

    const firestore = admin.firestore();
    // Ensure user exists in Firestore users collection
    const usersRef = firestore.collection('users');
    const snapshot = await usersRef.where('email', '==', email).limit(1).get();
    if (snapshot.empty) {
      return NextResponse.json({ error: 'User not found in users collection' }, { status: 404 });
    }
    const userDoc = snapshot.docs[0];
    const uid = userDoc.id;

  // Update Firestore flag and role
  await usersRef.doc(uid).set({ isAdmin: true, role: 'admin' }, { merge: true });

    // Set custom claim in Auth
    try {
      await admin.auth().setCustomUserClaims(uid, { ...(await admin.auth().getUser(uid)).customClaims, admin: true });
    } catch (err: any) {
      console.error('Failed to set custom claims', err);
      // continue even if claims fail; Firestore flag is authoritative for UI
      return NextResponse.json({ success: true, warning: 'isAdmin set in Firestore but failed to set auth claims' });
    }

    return NextResponse.json({ success: true, message: `User ${email} granted admin` });
  } catch (err: any) {
    console.error('Grant admin error', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}
