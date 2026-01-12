import admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}
const db = admin.firestore();

async function main() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  // Get first and last day of the month
  const start = new Date(year, month, 1, 0, 0, 0, 0);
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999);

  // Find all users with Pay As You Go service plan
  const usersSnap = await db.collection('users').get();
  for (const userDoc of usersSnap.docs) {
    const user = userDoc.data();
    if (!user.plans || !Array.isArray(user.plans)) continue;
    // Find PAYG plan (USD or INR)
    const paygPlan = user.plans.find((p: any) => p.category === 'service' && /pay as you go/i.test((p.planName || p.name || '')));
    if (!paygPlan) continue;
    // Determine currency and per-application rate
    let currency = 'USD';
    let perApp = 3;
    if (paygPlan.currency && paygPlan.currency.toUpperCase() === 'INR') {
      currency = 'INR';
      perApp = 20;
    }
    // Count hot job applications for this user this month
    const appsSnap = await db.collection('applications')
      .where('userId', '==', userDoc.id)
      .where('priority', '==', true)
      .get();
    let count = 0;
    for (const appDoc of appsSnap.docs) {
      const app = appDoc.data();
      const createdAt = app.createdAt ? new Date(app.createdAt) : (app.timestamp ? new Date(app.timestamp) : null);
      if (!createdAt) continue;
      if (createdAt >= start && createdAt <= end) count++;
    }
    if (count === 0) continue;
    // Check for existing unpaid invoice for this user/month
    const existingInvoiceSnap = await db.collection('invoices')
      .where('userId', '==', userDoc.id)
      .where('type', '==', 'payg-hotjobs')
      .where('month', '==', month)
      .where('year', '==', year)
      .where('status', '==', 'unpaid')
      .limit(1)
      .get();
    const amount = count * perApp;
    const description = `Hot Job Applications for ${now.toLocaleString('default', { month: 'long' })} ${year} (${count} applications x ${currency === 'INR' ? '₹' : '$'}${perApp})`;
    if (!existingInvoiceSnap.empty) {
      // Update existing invoice
      const invoiceRef = existingInvoiceSnap.docs[0].ref;
      await invoiceRef.update({
        amount,
        hotJobCount: count,
        currency,
        description,
        updatedAt: Timestamp.fromDate(new Date()),
      });
      console.log(`Invoice updated for user ${userDoc.id}: ${currency} ${amount} for ${count} hot jobs.`);
    } else {
      // Create new invoice
      const invoice = {
        userId: userDoc.id,
        planName: 'Pay As You Go',
        description,
        amount,
        currency,
        status: 'unpaid',
        createdAt: Timestamp.fromDate(new Date()),
        type: 'payg-hotjobs',
        hotJobCount: count,
        month,
        year,
      };
      await db.collection('invoices').add(invoice);
      console.log(`Invoice created for user ${userDoc.id}: ${currency} ${amount} for ${count} hot jobs.`);
    }
  }
  console.log('Done.');
}

main().catch(console.error);
