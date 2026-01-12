import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import crypto from 'crypto';
import { verifyPaymentHash } from '@/lib/payment-hash';

// Use FIREBASE_ADMIN_SVC JSON env like other routes
if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_ADMIN_SVC!)),
  });
}

const db = getFirestore();
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET!;
const PAYMENT_HASH_SECRET = process.env.PAYMENT_HASH_SECRET!;

// POST /api/wallet/razorpay-verify
// Body: { razorpay_payment_id, razorpay_order_id, razorpay_signature, amount, ts, hash }
export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id') || undefined;
    const body = await req.json();
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, amount, hash } = body;

    if (!userId || !razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !amount || !hash) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
    }

    const rupeeAmount = Number(amount) / 100;
    if (!Number.isFinite(rupeeAmount) || rupeeAmount <= 0) {
      return NextResponse.json({ success: false, message: 'Invalid amount' }, { status: 400 });
    }

    const validHash = verifyPaymentHash(PAYMENT_HASH_SECRET, {
      userId,
      amount: rupeeAmount,
      orderId: razorpay_order_id,
      type: 'wallet-topup-razorpay',
    }, hash);

    if (!validHash) {
      return NextResponse.json({ success: false, message: 'Invalid payment hash, possible tampering detected' }, { status: 400 });
    }

    // Verify signature
    const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(payload)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json({ success: false, message: 'Invalid Razorpay signature' }, { status: 400 });
    }

    const userRef = db.collection('users').doc(userId);
    const orderRef = db.collection('walletOrders').doc(razorpay_payment_id);
    const invoicesRef = db.collection('invoices');

    await db.runTransaction(async (t) => {
      const existingOrder = await t.get(orderRef);
      if (!existingOrder.exists) {
        const userSnap = await t.get(userRef);
        if (!userSnap.exists) throw new Error('User not found');
        const userData = userSnap.data() || {};
        const prevAmount = userData.walletAmount || 0;

        t.update(userRef, { walletAmount: prevAmount + rupeeAmount });
        t.set(orderRef, {
          userId,
          amount: rupeeAmount,
          currency: 'INR',
          status: 'completed',
          paymentProvider: 'razorpay',
          razorpay_order_id,
          razorpay_payment_id,
          processed_at: new Date().toISOString(),
        }, { merge: true });

        const invoiceRef = invoicesRef.doc();
        t.set(invoiceRef, {
          userId,
          userEmail: userData.email || null,
          amount: rupeeAmount,
          currency: 'INR',
          status: 'paid',
          type: 'wallet-topup',
          paymentMethod: 'razorpay',
          razorpay_order_id,
          razorpay_payment_id,
          createdAt: new Date().toISOString(),
          description: 'Wallet Top Up',
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Wallet Razorpay verify error', err);
    return NextResponse.json({ success: false, message: err.message || 'Failed to verify Razorpay payment' }, { status: 500 });
  }
}
