import { NextResponse } from 'next/server';
import { verifyBearerAndRole } from '@/lib/employee-auth';
import admin from 'firebase-admin';

// --- INVOICE GENERATION LOGIC ---
async function generateOrUpdateEmployeeApplicationInvoice(db: FirebaseFirestore.Firestore, userId: string) {
  // Fetch user
  const userDoc = await db.collection('users').doc(userId).get();
  const user = userDoc.data();
  console.log('[INVOICE][DEBUG] User fetched for employee app invoice:', { userId, user });
  if (!user || !user.plans || !Array.isArray(user.plans)) {
    console.log('[INVOICE][DEBUG] No user or plans array');
    return;
  }
  const paygPlan = user.plans.find((p: any) => /pay[-\s]?as[-\s]?you[-\s]?go/i.test((p.planName || p.name || '')));
  if (!paygPlan) {
    console.log('[INVOICE][DEBUG] No PAYG plan for user', userId);
    return;
  }
  const citizenship = (user.citizenship || user.country || '').toUpperCase();
  if (citizenship !== 'USA') {
    console.log('[INVOICE][DEBUG] Not USA citizenship/country:', citizenship);
    return;
  }
  if (paygPlan.currency && paygPlan.currency.toUpperCase() === 'INR') {
    console.log('[INVOICE][DEBUG] Skipped due to INR currency');
    return;
  }
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  
  // Check for existing unpaid invoice for this user/month
  const existingInvoiceSnap = await db.collection('invoices')
    .where('userId', '==', userId)
    .where('type', '==', 'payg-applications')
    .where('month', '==', month)
    .where('year', '==', year)
    .where('status', '==', 'unpaid')
    .limit(1)
    .get();
  
  const perApp = 2;
  const currency = 'USD';
  let invoiceId = null;
  let isUpdate = false;
  
  if (!existingInvoiceSnap.empty) {
    // Update existing invoice: increment amount and appCount by 1
    const invoiceRef = existingInvoiceSnap.docs[0].ref;
    console.log('[INVOICE][DEBUG] Found existing invoice, incrementing amount by', perApp);
    await invoiceRef.update({
      amount: admin.firestore.FieldValue.increment(perApp),
      appCount: admin.firestore.FieldValue.increment(1),
      currency,
      updatedAt: admin.firestore.Timestamp.fromDate(new Date()),
      userEmail: user.email || '',
      userPhone: user.phone || '',
      userAddress: user.address || '',
    });
    invoiceId = invoiceRef.id;
    isUpdate = true;
    console.log('[INVOICE][DEBUG] Incremented employee application invoice for user', userId, 'by amount:', perApp);
  } else {
    // Create new invoice for this month
    const invoice = {
      userId,
      planName: 'Pay As You Go',
      description: `Applications for ${now.toLocaleString('default', { month: 'long' })} ${year} (1 application x $${perApp})`,
      amount: perApp,
      currency,
      status: 'unpaid',
      createdAt: admin.firestore.Timestamp.fromDate(new Date()),
      updatedAt: admin.firestore.Timestamp.fromDate(new Date()),
      type: 'payg-applications',
      appCount: 1,
      month,
      year,
      userEmail: user.email || '',
      userPhone: user.phone || '',
      userAddress: user.address || '',
    };
    const docRef = await db.collection('invoices').add(invoice);
    invoiceId = docRef.id;
    isUpdate = false;
    console.log('[INVOICE][DEBUG] Created new employee application invoice for user', userId, 'with amount:', perApp, 'invoice data:', invoice);
  }
}

export async function POST(req: Request) {
  try {
  // allow admins to perform employee actions as well
  const caller = await verifyBearerAndRole(req, ['employee', 'admin']);
    const body = await req.json();
    const { applicationId, status, note, userId } = body || {};
    if (!applicationId || !status) return NextResponse.json({ ok: false, error: 'applicationId and status required' }, { status: 400 });

    const adminApp = admin.apps.length ? admin.app() : admin.initializeApp();
    const db = adminApp.firestore();
    const appRef = db.collection('applications').doc(applicationId);
    const snap = await appRef.get();
    if (!snap.exists) return NextResponse.json({ ok: false, error: 'application not found' }, { status: 404 });

  // Permission check: if caller is not admin, verify the caller's plan allows editing applications
  try {
    if (caller.role !== 'admin') {
      const userSnap = await db.collection('users').doc(caller.uid).get();
      const user = userSnap.exists ? (userSnap.data() as any) : null;
      const planTypeRaw = user?.planType || (user?.subscription?.plan || 'free');
      const planId = String(planTypeRaw).toLowerCase();
      const planDoc = await db.collection('plans').doc(planId).get();
      const planData = planDoc.exists ? (planDoc.data() as any) : null;
      const allowEditApplications = planData?.permissions?.allowEditApplications;
      if (allowEditApplications === false) {
        return NextResponse.json({ ok: false, error: 'Your plan does not allow editing applications' }, { status: 403 });
      }
    }
  } catch (e) {
    // If plan check fails due to admin config, log and allow the action (non-fatal)
    // eslint-disable-next-line no-console
    console.warn('update-application: failed to validate plan permissions', e);
  }

  const patch: any = { status, updatedAt: new Date().toISOString(), updatedBy: caller.uid };
    if (note) patch.internalNote = note;

    await appRef.set(patch, { merge: true });

    // Generate invoice for USA pay-as-you-go users if userId is provided
    // But ONLY if this is a manually added application (source: 'employee'), not from hot jobs
    if (userId && snap.data()?.source !== 'hot-jobs-approval' && snap.data()?.source !== 'hot-job-application') {
      console.log('[INVOICE][DEBUG] Triggering invoice generation for userId:', userId, 'source:', snap.data()?.source);
      try {
        await generateOrUpdateEmployeeApplicationInvoice(db, userId);
        console.log('[INVOICE][DEBUG] Invoice generation completed successfully');
      } catch (e: any) {
        console.error('[INVOICE][ERROR] Failed to generate/update invoice:', e);
        // Don't fail the request if invoice generation fails
      }
    } else {
      console.log('[INVOICE][DEBUG] Skipping invoice generation - userId:', userId, 'source:', snap.data()?.source);
    }

    return NextResponse.json({ ok: true, applicationId });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 401 });
  }
}
