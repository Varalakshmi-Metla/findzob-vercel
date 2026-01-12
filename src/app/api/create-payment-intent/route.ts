import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { generatePaymentHash } from '@/lib/payment-hash';
const PAYMENT_HASH_SECRET = process.env.PAYMENT_HASH_SECRET!;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

import { getAuth } from 'firebase-admin/auth';
import { initializeApp, cert, getApps } from 'firebase-admin/app';

if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_ADMIN_SVC!)),
  });
}

export async function POST(req: NextRequest) {
  try {
    const { method, plan, userId: userIdFromBody, userEmail } = await req.json();
    // Get user from body or header
    let userId = userIdFromBody || null;
    const authHeader = req.headers.get('x-user-id');
    if (!userId && authHeader) userId = authHeader;
    if (!userId) {
      return NextResponse.json({ error: 'User not authenticated or userId missing.' }, { status: 400 });
    }

    // Always fetch plan details from Firestore using planId
    let planData = null;
    if (plan?.id || plan?.__id) {
      try {
        const { getFirestore } = await import('firebase-admin/firestore');
        const db = getFirestore();
        const planId = plan.id || plan.__id;
        const planSnap = await db.collection('plans').doc(planId).get();
        if (planSnap.exists) {
          planData = planSnap.data();
          if (planData) {
            planData.id = planId;
          }
        } else {
          // Try fetching by 'id' field
          const querySnap = await db.collection('plans').where('id', '==', planId).limit(1).get();
          if (!querySnap.empty) {
            const doc = querySnap.docs[0];
            planData = doc.data();
            if (planData) {
              planData.id = doc.id; // Use Firestore doc ID
            }
          } else {
            // Fallback to provided plan data if not found in DB (e.g. invoices, seed plans)
            console.warn(`Plan ${planId} not found in Firestore. Using provided data.`);
            planData = plan;
          }
        }
      } catch (e) {
        return NextResponse.json({ error: 'Failed to fetch plan from database' }, { status: 500 });
      }
    }

    // Use planData for price, currency, name
    let amount = 2500;
    let currency = 'usd';
    let productName = 'Membership Fee';
    if (planData) {
      if (planData.currency && planData.currency.toLowerCase() === 'inr') {
        amount = Math.round(Number(planData.price) * 100);
        currency = 'inr';
      } else {
        amount = Math.round(Number(planData.price) * 100);
        currency = 'usd';
      }
      productName = planData.name || productName;
    }

    // Default to card. CashApp is handled specifically when method === 'cashapp'
    let payment_method_types: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] = ['card'];
    if (currency === 'inr') {
      payment_method_types = ['card']; // Stripe does not support 'upi' as a PaymentMethodType, only 'card' is supported for INR
    }

    // Generate a unique orderId for this payment
    const orderId = 'ORDER_' + Date.now() + '_' + Math.floor(Math.random() * 1000000);

    const sessionParams = {
      payment_method_types,
      line_items: [
        {
          price_data: {
            currency,
            product_data: { name: productName },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment' as const,
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/dashboard/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/dashboard/billing?canceled=1`,
      metadata: {
        orderId,
        ...(userId ? { userId } : {}),
        ...(userEmail ? { userEmail } : {}),
        ...(planData ? {
          planId: String(planData.id || ''),
          planName: String(planData.name || ''),
          planPrice: String(planData.price || ''),
          planCurrency: String(planData.currency || ''),
          planCategory: String(planData.category || ''),
          planValidity: String(planData.validity || ''),
          planBilling: String(planData.billing || ''),
          planBillingCycle: String(planData.billingCycle || ''),
        } : {}),
      },
    };

    let session;
    if (method === 'google_pay' || method === 'googlepay') {
      // Google Pay via Stripe Checkout
      session = await stripe.checkout.sessions.create({
        ...sessionParams,
        payment_method_options: {
          card: {},
        },
      });
    } else if (method === 'cashapp') {
      // Cash App Pay via Stripe Checkout
      session = await stripe.checkout.sessions.create({
        ...sessionParams,
        payment_method_types: ['cashapp'] as Stripe.Checkout.SessionCreateParams.PaymentMethodType[],
        mode: 'payment' as const,
      });
    } else {
      // Card payment via Stripe Checkout
      session = await stripe.checkout.sessions.create(sessionParams);
    }

    // Save a pending plan activation for the user (to be activated after payment success)
    // Optionally, you can create a Firestore document to track this intent
    try {
      const { getFirestore } = await import('firebase-admin/firestore');
      const db = getFirestore();
      // Save a pending plan activation (or update user doc with pending plan)
      await db.collection('users').doc(userId).set({
        pendingPlan: {
          planId: planData?.id,
          planName: planData?.name,
          planPrice: planData?.price,
          planCurrency: planData?.currency,
          userEmail: userEmail || null,
          createdAt: new Date(),
          status: 'pending',
        }
      }, { merge: true });
    } catch (e) {
      // Log but don't block payment
      console.error('Failed to save pending plan for user', e);
    }

    // Generate hash for integrity
    const hash = generatePaymentHash(PAYMENT_HASH_SECRET, {
      amount,
      userId,
      planId: planData?.id,
      sessionId: session.id,
    });
    // Return session info with hash
    if (session.url) {
      return NextResponse.json({ url: session.url, sessionId: session.id, hash });
    } else {
      return NextResponse.json({ sessionId: session.id, hash });
    }

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


