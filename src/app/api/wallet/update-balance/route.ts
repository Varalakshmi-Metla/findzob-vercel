import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import type { ServiceAccount } from 'firebase-admin';
import Stripe from 'stripe';

// Import the service account key directly from the file for reliability
//import serviceAccount from '../../../../../serviceAccountKey.json';
/*const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT as string);
// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount as ServiceAccount),
  });
} */ 
function initFirebase() {
  if (getApps().length) return;

  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT missing');
  }

  let serviceAccount;

  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch (e) {
    throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT JSON');
  }

  initializeApp({
    credential: cert(serviceAccount),
  });
}


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' });

// POST /api/wallet/update-balance: Update wallet amount after payment or just fetch balance
export async function POST(req: NextRequest) {
  try {
    const { userId, sessionId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }
    const db = getFirestore();
    const userRef = db.collection('users').doc(userId);

    // If sessionId provided, try to process the Stripe session server-side (idempotent)
    if (sessionId) {
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId as string);
        // Only proceed if session indicates successful payment and is a wallet top-up
        if ((session.payment_status === 'paid' || session.status === 'complete') && session.metadata?.purpose === 'wallet-topup') {
          const orderRef = db.collection('walletOrders').doc(session.id as string);
          const orderSnap = await orderRef.get();
          if (!orderSnap.exists || orderSnap.data()?.status !== 'completed') {
            // Determine rupee amount
            let rupeeAmount = 0;
            if (typeof session.amount_total === 'number') rupeeAmount = Number(session.amount_total) / 100;
            else if (session.metadata && session.metadata.amount) rupeeAmount = Number(session.metadata.amount);

            // perform transaction: update wallet and record order
            await db.runTransaction(async (t) => {
              const userDoc = await t.get(userRef);
              if (!userDoc.exists) throw new Error('User not found');
              const prevAmount = userDoc.data()?.walletAmount || 0;
              t.update(userRef, { walletAmount: prevAmount + rupeeAmount });
              t.set(orderRef, {
                userId,
                amount: rupeeAmount,
                currency: session.currency || (session.metadata?.currency || 'INR'),
                status: 'completed',
                paymentProvider: 'stripe',
                payment_intent: session.payment_intent || null,
                processed_at: new Date().toISOString(),
              }, { merge: true });
            });
          }
        }
      } catch (stripeErr) {
        console.error('Failed to retrieve/process Stripe session in update-balance:', stripeErr);
      }
    }

    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const data = userSnap.data();
    // Firestore uses `walletAmount` for stored balance; return it as `walletBalance` for API compatibility
    const walletBalance = typeof data.walletAmount === 'number' ? data.walletAmount : 0;
    return NextResponse.json({ walletBalance });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch wallet balance' }, { status: 500 });
  }
}
