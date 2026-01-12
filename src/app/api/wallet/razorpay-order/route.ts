import { NextRequest, NextResponse } from 'next/server';
import { generatePaymentHash } from '@/lib/payment-hash';

// Use the same credentials as main Razorpay integration
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID!;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET!;
const PAYMENT_HASH_SECRET = process.env.PAYMENT_HASH_SECRET!;

let Razorpay: any;

// POST /api/wallet/razorpay-order
// Body: { userId: string, amount: number }
export async function POST(req: NextRequest) {
  try {
    if (!Razorpay) {
      Razorpay = (await import('razorpay')).default;
    }
    const { userId, amount } = await req.json();
    if (!userId || !amount || amount < 1 || amount > 10000) {
      return NextResponse.json({ error: 'Missing or invalid userId/amount (must be between 1 and 10000)' }, { status: 400 });
    }

    const razorpay = new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET,
    });

    const rupees = Number(amount);

    // Razorpay requires `receipt` length to be <= 40 characters.
    // We generate a compact receipt and hard-cap its length.
    const rawReceipt = `w_${userId}_${Date.now()}`;
    const receipt = rawReceipt.slice(0, 40);

    const order = await razorpay.orders.create({
      amount: Math.round(rupees * 100), // paise
      currency: 'INR',
      receipt,
      notes: {
        userId,
        purpose: 'wallet-topup',
      },
    });

    const hash = generatePaymentHash(PAYMENT_HASH_SECRET, {
      userId,
      amount: rupees,
      orderId: order.id,
      type: 'wallet-topup-razorpay',
    });

    return NextResponse.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      hash,
    });
  } catch (err: any) {
    console.error('Wallet Razorpay order error', err);
    return NextResponse.json({ error: err.message || 'Failed to create Razorpay order' }, { status: 500 });
  }
}
