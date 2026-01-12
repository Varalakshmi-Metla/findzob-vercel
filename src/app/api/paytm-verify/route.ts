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

// Helper to verify Paytm payment status
async function verifyPaytmTransaction(orderId: string) {
  // You should use Paytm's Transaction Status API here
  // For demo, always return success
  // In production, make a server-to-server call to Paytm to verify
  return { status: 'TXN_SUCCESS' };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, userId, amount, planId } = body;
    if (!orderId || !userId || !amount || !planId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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
    // 1. Verify payment with Paytm
    const paytmResult = await verifyPaytmTransaction(orderId);
    if (paytmResult.status !== 'TXN_SUCCESS') {
      return NextResponse.json({ error: 'Payment not successful' }, { status: 400 });
    }
    // 2. Update user membership or service plan in Firestore
    let expiry: string | null = null;
    const now = new Date();
    if (planCategory === 'service') {
      const expiryDate = new Date(now);
      expiryDate.setDate(expiryDate.getDate() + Number(planValidity));
      expiry = expiryDate.toISOString();
    } // membership: expiry remains null (lifetime)
    const userRef = db.collection('users').doc(userId);
    const userSnap = await userRef.get();
    let userPlans = [];
    const userData = userSnap.exists ? userSnap.data() : undefined;
    if (userData && Array.isArray(userData.plans)) {
      userPlans = userData.plans;
    }
    if (planCategory === 'service') {
      userPlans = [
        {
          planId,
          planName,
          planPrice,
          planValidity,
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
          planId,
          planName,
          planPrice,
          planValidity,
          category: 'membership',
          purchaseDate: new Date().toISOString(),
          expiryDate: expiry
        }
      ];
      await userRef.set({
        planType: planName,
        plans: userPlans
      }, { merge: true });
    }
    // 3. Save invoice (prevent duplicates)
    // Check for existing invoice with this orderId
    const existingInvoiceSnap = await db.collection('invoices')
      .where('orderId', '==', orderId)
      .limit(1)
      .get();
    if (!existingInvoiceSnap.empty) {
      const invoiceId = existingInvoiceSnap.docs[0].id;
      console.log('[PAYTM VERIFY] Duplicate invoice detected, skipping creation. Invoice ID:', invoiceId);
      return NextResponse.json({ success: true, invoiceId });
    } else {
      const invoiceRef = await db.collection('invoices').add({
        userId,
        amount: planPrice,
        currency: 'inr',
        status: 'success',
        createdAt: new Date(),
        type: planCategory,
        planId,
        planName,
        planPrice,
        planValidity,
        expiryDate: expiry,
        paymentMethod: 'paytm',
        orderId,
        company: {
          name: 'Findzob Technologies Pvt Ltd',
          address: '123, Main Road, Bengaluru, Karnataka, India',
          gst: '29ABCDE1234F1Z5',
          email: 'support@findzob.com',
          phone: '+91-9876543210',
        }
      });
      console.log('[PAYTM VERIFY] Invoice created with ID:', invoiceRef.id);
      return NextResponse.json({ success: true, invoiceId: invoiceRef.id });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to verify Paytm payment' }, { status: 500 });
  }
}
