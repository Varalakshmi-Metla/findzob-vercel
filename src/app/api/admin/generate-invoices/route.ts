import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

// GET: Return all user details for admin/debug
export async function GET() {
  try {
    const db = adminApp.firestore();
    const usersSnap = await db.collection('users').get();
    const paygRegex = /pay as you go|payg|pay-as-you-go/i;
    const users = usersSnap.docs
      .map(doc => {
        const data = doc.data();
        if (!Array.isArray(data.plans)) return null;
        const matchedPlan = data.plans.find((p: any) => paygRegex.test((p.planName || p.name || '').toLowerCase()));
        if (!matchedPlan) return null;
        return { id: doc.id, email: data.email, name: data.name, citizenship: data.citizenship, country: data.country, matchedPlan };
      })
      .filter(Boolean);
    return NextResponse.json({ success: true, users });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const db = adminApp.firestore();
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed
    // Get first and last day of the month
    const start = new Date(year, month, 1, 0, 0, 0, 0);
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999);

    let processedCount = 0;
    let invoiceCount = 0;

    // Find all users with Pay As You Go service plan
    const usersSnap = await db.collection('users').get();
    console.log(`[INVOICE][DEBUG] usersSnap.size: ${usersSnap.size}`);
    if (usersSnap.size > 0) {
      console.log('[INVOICE][DEBUG] First 3 user docs:', usersSnap.docs.slice(0, 3).map(doc => ({ id: doc.id, data: doc.data() })));
    }

    let paygUserCount = 0;
    let paygUsdUserCount = 0;

    for (const userDoc of usersSnap.docs) {
      const user = userDoc.data();
      console.log(`[INVOICE][DEBUG] User:`, {
        id: userDoc.id,
        email: user.email,
        plans: user.plans,
        citizenship: user.citizenship,
        country: user.country
      });
      if (!user.plans || !Array.isArray(user.plans)) continue;

      // Find PAYG plan (USD or INR) — match planName only
      const paygPlan = user.plans.find((p) =>
        /pay as you go/i.test((p.planName || p.name || ''))
      );
      if (!paygPlan) {
        console.log(`[INVOICE][DEBUG] User ${userDoc.id} skipped: no PAYG plan`);
        continue;
      }
      paygUserCount++;

      // Only generate bill if citizenship is USA
      const citizenship = (user.citizenship || user.country || '').toUpperCase();
      if (citizenship !== 'USA') {
        console.log(`[INVOICE][DEBUG] User ${userDoc.id} skipped: not USA (citizenship/country: ${citizenship})`);
        continue;
      }

      // STRICTLY for USA users (USD) only. Skip India (INR).
      if (paygPlan.currency && paygPlan.currency.toUpperCase() === 'INR') {
        console.log(`[INVOICE][DEBUG] User ${userDoc.id} skipped: plan currency INR`);
        continue;
      }
      paygUsdUserCount++;

      const currency = 'USD';
      const perApp = 3;

      // Count all applications for this user this month (no priority filter)
      const appsSnap = await db.collection('applications')
        .where('userId', '==', userDoc.id)
        .get();

      let count = 0;
      for (const appDoc of appsSnap.docs) {
        const app = appDoc.data();
        // Check timestamp
        const createdAt = app.createdAt ? new Date(app.createdAt) : (app.timestamp ? new Date(app.timestamp) : null);
        if (!createdAt) continue;
        if (createdAt >= start && createdAt <= end) {
          count++;
        }
      }
      console.log(`[INVOICE][DEBUG] User ${userDoc.id} PAYG, USA, found ${count} applications this month.`);

      if (count === 0) {
        console.log(`[INVOICE] User ${userDoc.id} skipped: 0 applications this month`);
        continue;
      }

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
      const description = `Hot Job Applications for ${now.toLocaleString('default', { month: 'long' })} ${year} (${count} applications x $${perApp})`;

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
          userEmail: user.email,
          userName: user.name,
          type: 'payg-hotjobs',
          status: 'unpaid',
          amount,
          currency,
          description,
          hotJobCount: count,
          month,
          year,
          createdAt: Timestamp.fromDate(new Date()),
          updatedAt: Timestamp.fromDate(new Date()),
        };
        await db.collection('invoices').add(invoice);
        console.log(`Invoice created for user ${userDoc.id}: ${currency} ${amount} for ${count} hot jobs.`);
      }
      invoiceCount++;
      processedCount++;
    }

    console.log(`[INVOICE] PAYG users: ${paygUserCount}, PAYG USD users: ${paygUsdUserCount}`);
    return NextResponse.json({ 
      success: true, 
      message: `Processed ${processedCount} users. Generated/Updated ${invoiceCount} invoices. PAYG users: ${paygUserCount}, PAYG USD users: ${paygUsdUserCount}` 
    });

  } catch (error: any) {
    console.error('Error generating invoices:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}