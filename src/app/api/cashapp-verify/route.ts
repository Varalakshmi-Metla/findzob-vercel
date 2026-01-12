import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_ADMIN_SVC!)),
  });
}
const db = getFirestore();

// Helper to verify Cash App payment (stub, replace with real API call)
async function verifyCashAppPayment(sessionId: string) {
  // In production, verify payment status with Stripe API for Cash App
  // For demo, always return success
  return { status: 'success' };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, userId, amount, currency } = body;
    if (!sessionId || !userId || !amount || !currency) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    // 1. Verify payment with Cash App (via Stripe)
    const result = await verifyCashAppPayment(sessionId);
    if (result.status !== 'success') {
      return NextResponse.json({ error: 'Payment not successful' }, { status: 400 });
    }
    // 2. Update user membership or service plan in Firestore
    const { planId, planName, planCategory } = body;
    const now = new Date();
    let expiry: string | null = null;
    if (planCategory === 'service') {
      const expiryDate = new Date(now);
      expiryDate.setDate(expiryDate.getDate() + 30);
      expiry = expiryDate.toISOString();
    } // membership: expiry remains null (lifetime)
    const userRef = db.collection('users').doc(userId);
    const userSnap = await userRef.get();
    let userPlans = [];
    const userData = userSnap.exists ? userSnap.data() : undefined;
    if (userData && Array.isArray(userData.plans)) {
      userPlans = userData.plans;
    }
    if (planCategory === 'service' && planId && planName) {
      // Only activate the most recently purchased service plan
      userPlans = [
        {
          planId,
          planName,
          category: 'service',
          purchaseDate: new Date().toISOString(),
          expiryDate: expiry
        }
      ];
      await userRef.set({ plans: userPlans }, { merge: true });
    } else {
      // Default: activate membership
      userPlans = [
        ...userPlans.filter((p: any) => (p.category || '').toLowerCase() !== 'membership'),
        {
          planId: 'lifetime',
          planName: 'Lifetime Membership',
          category: 'membership',
          purchaseDate: new Date().toISOString(),
          expiryDate: expiry
        }
      ];
      await userRef.set({
        planType: 'Lifetime Membership',
        plans: userPlans
      }, { merge: true });
    }
    // 3. Save invoice
    const invoiceRef = await db.collection('invoices').add({
      userId,
      amount,
      currency,
      status: 'success',
      createdAt: new Date(),
      type: 'membership',
      planId: 'lifetime',
      planName: 'Lifetime Membership',
      paymentMethod: 'cashapp',
      company: {
        name: 'Findzob Technologies Pvt Ltd',
        address: '123, Main Road, Bengaluru, Karnataka, India',
        gst: '29ABCDE1234F1Z5',
        email: 'support@findzob.com',
        phone: '+91-9876543210',
      }
    });
    return NextResponse.json({ success: true, invoiceId: invoiceRef.id });
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
