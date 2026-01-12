import { NextRequest, NextResponse } from 'next/server';
import { generatePaymentHash } from '@/lib/payment-hash';

// You should store these securely, e.g. in environment variables
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID!;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET!;
const PAYMENT_HASH_SECRET = process.env.PAYMENT_HASH_SECRET!;

// Dynamically import Razorpay to avoid issues in edge runtimes
let Razorpay: any;

export async function POST(req: NextRequest) {
  try {
    if (!Razorpay) {
      Razorpay = (await import('razorpay')).default;
    }
    const body = await req.json();
    const { amount, currency, receipt, notes, userId, planId, userName, userEmail, userPhone, userAddress } = body;
    if (!amount || !currency || !userId || !planId) {
      return NextResponse.json({ error: 'Missing amount, currency, userId, or planId' }, { status: 400 });
    }
    const razorpay = new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET,
    });
    // Add user details to notes for traceability
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Razorpay expects paise
      currency,
      receipt: receipt || `rcpt_${Date.now()}`,
      notes: {
        ...(notes || {}),
        userId,
        userName,
        userEmail,
        userPhone,
        userAddress,
      },
    });
    // Generate hash for integrity
    const hash = generatePaymentHash(PAYMENT_HASH_SECRET, {
      amount,
      userId,
      planId,
      orderId: order.id,
    });
    return NextResponse.json({ order, hash });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create Razorpay order' }, { status: 500 });
  }
}

// Optionally, add a POST /verify endpoint for payment verification
// (to be implemented after frontend integration)
