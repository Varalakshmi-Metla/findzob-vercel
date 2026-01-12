// This file has been removed as part of payment/billing removal.
// Script: generate-invoices.ts
// Description: Generate invoices for Pay-As-You-Go users for hot job applications at the end of the month.

import * as admin from 'firebase-admin';
import * as fs from 'fs';

function tryInitAdmin() {
  if (admin.apps.length) return admin.app();
  let svc = process.env.FIREBASE_ADMIN_SVC;
  if (process.env.FIREBASE_ADMIN_SVC_PATH) {
    svc = fs.readFileSync(process.env.FIREBASE_ADMIN_SVC_PATH, 'utf8');
  }
  if (!svc) throw new Error('Missing FIREBASE_ADMIN_SVC');
  let parsed: any = null;
  try { parsed = JSON.parse(svc); } catch (e) { parsed = JSON.parse(Buffer.from(svc, 'base64').toString('utf8')); }
  admin.initializeApp({ credential: admin.credential.cert(parsed as any) });
  return admin.app();
}

async function generateInvoices() {
  tryInitAdmin();
  const firestore = admin.firestore();
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const monthKey = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;

  // Find all users with Pay-As-You-Go plan
  const usersSnap = await firestore.collection('users').where('plans', 'array-contains-any', [
    { planName: 'Pay-As-You-Go' },
    { planName: 'pay-as-you-go' },
    { planName: 'payg' }
  ]).get();
  for (const userDoc of usersSnap.docs) {
    const user = userDoc.data();
    const userId = userDoc.id;
    // Get all hot job applications for this user in last month
    const appsSnap = await firestore.collection('applications')
      .where('userId', '==', userId)
      .where('priority', '==', true)
      .where('appliedAt', '>=', new Date(lastMonth).toISOString())
      .where('appliedAt', '<', new Date(now.getFullYear(), now.getMonth(), 1).toISOString())
      .get();
    const applications = appsSnap.docs.map(doc => doc.data());
    if (applications.length === 0) continue;

    // Check for existing invoice for this user and month
    const existingInvoiceSnap = await firestore.collection('orders')
      .where('userId', '==', userId)
      .where('month', '==', monthKey)
      .limit(1)
      .get();
    if (!existingInvoiceSnap.empty) {
      console.log(`Duplicate invoice detected for user ${user.email} (${userId}) and month ${monthKey}, skipping.`);
      continue;
    }

    // Create invoice
    const invoice = {
      userId,
      userEmail: user.email,
      month: monthKey,
      createdAt: new Date().toISOString(),
      applications: applications.map(a => ({ jobId: a.jobId, appliedAt: a.appliedAt })),
      amount: applications.length * 10, // Example: $10 per hot job application
      currency: 'USD',
      status: 'pending',
      plan: 'Pay-As-You-Go',
    };
    await firestore.collection('orders').add(invoice);
    console.log(`Invoice generated for user ${user.email} (${userId}): ${applications.length} hot jobs`);
  }
  console.log('Invoice generation complete.');
}

generateInvoices().catch(console.error);
