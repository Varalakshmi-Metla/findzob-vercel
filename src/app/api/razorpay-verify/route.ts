import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { verifyPaymentHash } from '@/lib/payment-hash';
const PAYMENT_HASH_SECRET = process.env.PAYMENT_HASH_SECRET!;

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_ADMIN_SVC!)),
  });
}
const db = getFirestore();

// Helper to verify Razorpay payment (stub, replace with real API call)
async function verifyRazorpayPayment(orderId: string, paymentId: string, signature: string) {
  // In production, verify signature and payment status with Razorpay API
  // For demo, always return success
  return { status: 'success' };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, paymentId, signature, userId, amount, planId, hash, userName, userEmail, userPhone, userAddress } = body;
    if (!orderId || !paymentId || !signature || !userId || !amount || !planId || !hash) {
      console.error('Missing required fields', { orderId, paymentId, signature, userId, amount, planId, hash });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    // Verify hash integrity
    const validHash = verifyPaymentHash(PAYMENT_HASH_SECRET, {
      amount,
      userId,
      planId,
      orderId,
    }, hash);
    if (!validHash) {
      return NextResponse.json({ error: 'Invalid payment hash, possible tampering detected' }, { status: 400 });
    }
    // Fetch plan details from Firestore
    const planSnap = await db.collection('plans').doc(planId).get();
    if (!planSnap.exists) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }
    const plan = planSnap.data();
    const planName = plan?.name || '';
    const planCategory = plan?.category || 'service';
    const planPrice = plan?.price;
    const planValidity = plan?.validity || 30;
    // Validate amount matches planPrice
    if (Number(amount) !== Number(planPrice)) {
      return NextResponse.json({ error: 'Paid amount does not match plan price' }, { status: 400 });
    }
    // 1. Verify payment with Razorpay
    const result = await verifyRazorpayPayment(orderId, paymentId, signature);
    if (result.status !== 'success') {
      console.error('Payment not successful', result);
      return NextResponse.json({ error: 'Payment not successful' }, { status: 400 });
    }
    // 2. Update user membership or service plan in Firestore
    let expiry: string | null = null;
    try {
      const now = new Date();
      if (planCategory === 'service') {
        let validityDays = Number(planValidity);
        if (!Number.isFinite(validityDays) || validityDays <= 0) {
          validityDays = 30; // fallback to default
        }
        const expiryDate = new Date(now);
        expiryDate.setDate(expiryDate.getDate() + validityDays);
        if (isNaN(expiryDate.getTime())) {
          throw new Error('Invalid expiry date calculation: planValidity is not a valid number');
        }
        expiry = expiryDate.toISOString();
      } else {
        // membership: expiry remains null (lifetime)
      }
      const userRef = db.collection('users').doc(userId);
      const userSnap = await userRef.get();
      let userPlans = [];
      const userData = userSnap.exists ? userSnap.data() : undefined;
      if (userData && Array.isArray(userData.plans)) {
        userPlans = userData.plans;
      }
      // Store all relevant admin plan fields in user's plan
      const newPlan: any = {
        planId,
        planName,
        planPrice,
        planValidity,
        category: planCategory,
        purchaseDate: new Date().toISOString(),
        expiryDate: expiry,
        // Extra admin plan fields
        planType: plan?.planType ?? null,
        billing: plan?.billing ?? null,
        billingCycle: plan?.billingCycle ?? null,
        resumesLimit: plan?.resumesLimit ?? plan?.maxHotJobsApplications ?? null,
        jobsLimit: plan?.jobsLimit ?? plan?.maxHotJobs ?? null,
        features: plan?.features ?? [],
        permissions: plan?.permissions ?? null,
        popular: plan?.popular ?? null,
      };
      if (planCategory === 'service') {
        userPlans = [newPlan];
        await userRef.set({ plans: userPlans }, { merge: true });
      } else {
        // Default: activate membership
        userPlans = [
          ...userPlans.filter((p: any) => (p.category || '').toLowerCase() !== 'membership'),
          newPlan
        ];
        await userRef.set({
          planType: planName,
          plans: userPlans
        }, { merge: true });
      }
    } catch (membershipErr) {
      console.error('Failed to update membership/service plan', membershipErr);
      return NextResponse.json({ error: 'Failed to update membership/service plan' }, { status: 500 });
    }
    // 3. Save invoice
    try {
      // Check for existing invoice with this orderId
      const existingInvoiceSnap = await db.collection('invoices')
        .where('orderId', '==', orderId)
        .limit(1)
        .get();
      if (!existingInvoiceSnap.empty) {
        const invoiceId = existingInvoiceSnap.docs[0].id;
        console.log('[RAZORPAY VERIFY] Duplicate invoice detected, skipping creation. Invoice ID:', invoiceId);
        return NextResponse.json({ success: true, invoiceId });
      } else {
        const invoiceData = {
          userId,
          userName: userName || null,
          userEmail: userEmail || null,
          userPhone: userPhone || null,
          userAddress: userAddress || null,
          amount: Number(planPrice), // Always set amount
          planPrice: Number(planPrice), // Always set planPrice
          currency: 'inr',
          status: 'success',
          createdAt: new Date(),
          type: planCategory,
          planId,
          planName,
          planValidity,
          expiryDate: expiry,
          paymentMethod: 'razorpay',
          orderId,
          company: {
            name: 'Findzob Technologies Pvt Ltd',
            address: '123, Main Road, Bengaluru, Karnataka, India',
            gst: '29ABCDE1234F1Z5',
            email: 'support@findzob.com',
            phone: '+91-9876543210',
          }
        };
        console.log('[RAZORPAY VERIFY] Attempting to create invoice:', invoiceData);
        const invoiceRef = await db.collection('invoices').add(invoiceData);
        console.log('[RAZORPAY VERIFY] Invoice created with ID:', invoiceRef.id);
        return NextResponse.json({ success: true, invoiceId: invoiceRef.id });
      }
    } catch (invoiceErr) {
      console.error('[RAZORPAY VERIFY] Failed to save invoice:', invoiceErr);
      return NextResponse.json({ error: 'Failed to save invoice', details: String(invoiceErr) }, { status: 500 });
    }
  } catch (err: any) {
    console.error('Server error', err);
    return NextResponse.json({ error: err.message || 'Failed to verify Razorpay payment' }, { status: 500 });
  }
}
