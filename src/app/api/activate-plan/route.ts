import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import adminApp from "@/lib/firebase-admin";
// Razorpay payment verification (reuse logic from razorpay-verify)
import crypto from "crypto";
const db = getFirestore(adminApp);

// Helper to verify Razorpay payment signature
function verifyRazorpayPayment(orderId: string, paymentId: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  const generatedSignature = crypto
    .createHmac("sha256", secret)
    .update(orderId + "|" + paymentId)
    .digest("hex");
  return generatedSignature === signature;
}

// POST /api/activate-plan

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
      let { userId, planId, plan, paymentId, orderId, sessionId, amount, signature, paymentMethod, userEmail } = data;

    // Log all incoming data for debugging
    console.log("[activate-plan] Incoming data:", data);

    // For cash/manual activation, only userId and planId are required
    if (paymentMethod === 'cash') {
        if (!planId && plan && plan.id) {
          planId = plan.id;
        }
        if (!userId || !planId) {
        console.error("[activate-plan] Missing required fields for cash/manual activation", { userId, planId });
        return NextResponse.json({ success: false, error: "Missing required fields: userId, planId are required for cash/manual activation." }, { status: 400 });
      }
    } else {
      if (!userId || !planId || !paymentId || !orderId) {
        console.error("[activate-plan] Missing required fields", { userId, planId, paymentId, orderId });
        return NextResponse.json({ success: false, error: "Missing required fields: userId, planId, paymentId, orderId are required." }, { status: 400 });
      }
      // Razorpay: require signature and verify
      if (paymentMethod === 'razorpay') {
        if (!signature) {
          console.error("[activate-plan] Missing signature for Razorpay");
          return NextResponse.json({ success: false, error: "Missing signature for Razorpay" }, { status: 400 });
        }
        const isPaymentValid = verifyRazorpayPayment(orderId, paymentId, signature);
        if (!isPaymentValid) {
          console.error("[activate-plan] Payment verification failed for Razorpay", { orderId, paymentId, signature });
          return NextResponse.json({ success: false, error: "Payment verification failed" }, { status: 400 });
        }
      }
      // Stripe: no signature required, assume payment already verified by Stripe webhook/session
      // Add more payment methods as needed
    }
    // Stripe: no signature required, assume payment already verified by Stripe webhook/session
    // Add more payment methods as needed

    // Initialize Firestore
    // const db = getFirestore(adminApp); // Already initialized at top level

    // Fetch plan details from Firestore
    let planSnap;
    let planData: any = null;
    try {
      // 1. Try by Doc ID
      planSnap = await db.collection("plans").doc(planId).get();
      if (planSnap.exists) {
        planData = planSnap.data();
        planId = planSnap.id; // Ensure planId is the doc ID
      } else {
        // 2. Try by 'id' field
        const querySnap = await db.collection("plans").where("id", "==", planId).limit(1).get();
        if (!querySnap.empty) {
          planData = querySnap.docs[0].data();
          // Update planId to the actual doc ID if found
          planId = querySnap.docs[0].id;
        }
      }
    } catch (fetchErr) {
      console.warn(`[activate-plan] Firestore fetch error for planId: ${planId}. Using provided plan data if available.`, fetchErr);
    }

    if (!planData) {
      if (plan) {
        console.warn(`[activate-plan] Plan not found in Firestore for planId: ${planId}. Using provided plan data.`);
        planData = plan;
      } else {
        console.error(`[activate-plan] Plan not found in Firestore and no plan data provided for planId: ${planId}`);
        return NextResponse.json({ success: false, error: `Plan not found for planId: ${planId}` }, { status: 404 });
      }
    }

    let expiryDate = null;
    let planType = undefined;
    let subscription = undefined;
    // planData is already set above
    const validity = planData?.validity;
    const category = String(planData?.category || '').toLowerCase();

    if (category === 'membership') {
      planType = 'membership';
    }

    // Fetch user citizenship for membership validity adjustment
    let userCitizenship = '';
    try {
      const userRef = db.collection("users").doc(userId);
      const userSnap = await userRef.get();
      if (userSnap.exists && userSnap.data()?.citizenship) {
        userCitizenship = String(userSnap.data()?.citizenship || '').trim();
      }
    } catch (err) {
      console.warn(`[activate-plan] Could not fetch user citizenship for userId: ${userId}`, err);
    }

    // Calculate expiryDate based on plan validity first
    if (validity) {
      if (String(validity).toLowerCase() === 'lifetime') {
        expiryDate = 'lifetime';
      } else {
        const days = Number(validity);
        if (!isNaN(days) && days > 0) {
          const now = new Date();
          now.setDate(now.getDate() + days);
          expiryDate = now.toISOString();
        }
      }
    }

    // Fallback defaults if validity not specified
    if (!expiryDate) {
      if (category === 'membership') {
        // For India citizenship users: 1 year (365 days) membership validity
        if (userCitizenship.toLowerCase() === 'india') {
          const now = new Date();
          now.setDate(now.getDate() + 365);
          expiryDate = now.toISOString();
          console.log(`[activate-plan] India citizenship detected. Setting membership validity to 1 year (365 days) for userId: ${userId}`);
        } else {
          // For other countries: lifetime membership
          expiryDate = 'lifetime';
        }
      } else if (category === 'service') {
        // If Pay-As-You-Go (monthly-postpaid), set lifetime validity for all countries
        if (planData.billing === 'monthly-postpaid' || planData.billing === 'payg' || planData.name?.toLowerCase().includes('pay as you go')) {
          // Pay-As-You-Go is a postpaid plan with lifetime validity (no expiry date) for all users
          expiryDate = 'lifetime';
          console.log(`[activate-plan] Pay-As-You-Go plan activated with lifetime validity for userId: ${userId}`);
        } else {
          // Default: 30 days for other service plans
          const now = new Date();
          now.setDate(now.getDate() + 36500);
          expiryDate = now.toISOString();
        }
      }
    }
    // Build subscription object for user

    subscription = {
      plan: planData?.name || planId,
      status: "active",
      price: planData?.price || null,
      type: planData?.category || undefined,
    } as any;
    if (category === 'membership') {
      subscription.membership = 'lifetime';
    }

    // Log plan details and computed expiry
    console.log("[activate-plan] Plan data:", planData);
    console.log("[activate-plan] Computed expiryDate:", expiryDate);


    // Prepare plan object to add to user's plans array (copy all plan fields)
    const planToAdd = {
      ...planData,
      planId: planId,
      id: planId,
      activatedAt: new Date().toISOString(),
      expiryDate: expiryDate,
      status: 'active',
      paymentMethod: paymentMethod || null,
      paymentId: paymentId || null,
      orderId: orderId || null,
      sessionId: sessionId || null,
      amount: amount || null,
    };

    // Atomically add plan to user's plans array if not already present
    const userRef = db.collection("users").doc(userId);
    const userSnap = await userRef.get();
    let existingPlans = [];
    const userData = userSnap.exists ? userSnap.data() : undefined;
    if (userData && Array.isArray(userData.plans)) {
      existingPlans = userData.plans;
    }
    // Check if plan already exists in array (by planId or id)
    const alreadyExists = existingPlans.some((p: any) => p.planId === planId || p.id === planId);

    let updatedPlans;
    if (category === 'service') {
      // Remove all previous service plans, keep only non-service plans
      const nonServicePlans = existingPlans.filter((p: any) => String(p.category || '').toLowerCase() !== 'service');
      updatedPlans = [...nonServicePlans, planToAdd];
    } else {
      // Membership or other plan: add or update as before
      if (!alreadyExists) {
        updatedPlans = [...existingPlans, planToAdd];
      } else {
        updatedPlans = existingPlans.map((p: any) => (p.planId === planId || p.id === planId) ? { ...p, ...planToAdd } : p);
      }
    }

    await userRef.set({
      activePlan: planId,
      planActivatedAt: new Date().toISOString(),
      planExpiry: expiryDate,
      paymentId: paymentId || null,
      orderId: orderId || null,
      sessionId: sessionId || null,
      amount: amount || null,
      status: "active",
      paymentMethod: paymentMethod || null,
      ...(planType ? { planType } : {}),
      ...(subscription ? { subscription } : {}),
      plans: updatedPlans,
    }, { merge: true });

    // Generate and store invoice in Firestore (now for all payment methods, including Stripe)
    // Atomic invoice creation: use Firestore transaction to ensure only one invoice per payment/order/session
    try {
      await db.runTransaction(async (transaction) => {
        let invoiceQuery = db.collection('invoices').where('userId', '==', userId);
        const conditions = [];
        if (paymentId) conditions.push(['paymentId', '==', paymentId]);
        if (orderId) conditions.push(['orderId', '==', orderId]);
        if (sessionId) conditions.push(['sessionId', '==', sessionId]);
        let existingInvoiceSnap = null;
        if (conditions.length > 0) {
          for (const [field, op, value] of conditions) {
            const q = invoiceQuery.where(field, op, value);
            const snap = await q.limit(1).get();
            if (!snap.empty) {
              existingInvoiceSnap = snap;
              break;
            }
          }
        }
        if (!existingInvoiceSnap || existingInvoiceSnap.empty) {
          // Fetch user name for invoice
          let userName = '';
          let userPhone = '';
          let userAddress = '';
          let userEmailFinal = userEmail || '';
          try {
            if (userData) {
              if (userData.name) userName = userData.name;
              if (userData.phone) userPhone = userData.phone;
              if (userData.address) userAddress = userData.address;
            } else {
              const userDocSnap = await userRef.get();
              const userDocData = userDocSnap.exists ? userDocSnap.data() : undefined;
              if (userDocData) {
                if (userDocData.name) userName = userDocData.name;
                if (userDocData.phone) userPhone = userDocData.phone;
                if (userDocData.address) userAddress = userDocData.address;
                if (userDocData.email) userEmailFinal = userDocData.email;
              }
            }
          } catch {}
          const invoiceData = {
            userId,
            userName,
            userPhone,
            userAddress,
            userEmail: userEmailFinal,
            planId,
            planName: planData?.name || '',
            category: planData?.category || '',
            price: planData?.price || null,
            currency: planData?.currency || null,
            description: planData?.description || '',
            features: planData?.features || [],
            activatedAt: new Date().toISOString(),
            expiryDate: expiryDate,
            status: 'paid',
            paymentMethod: paymentMethod || null,
            paymentId: paymentId || null,
            orderId: orderId || null,
            sessionId: sessionId || null,
            amount: amount || null,
            createdAt: new Date().toISOString(),
          };
          const invoiceRef = db.collection('invoices').doc();
          transaction.set(invoiceRef, invoiceData);
          console.log('[activate-plan] Invoice created in Firestore (transaction):', invoiceData);
        } else {
          console.log('[activate-plan] Invoice already exists for this payment. Skipping creation.');
        }
      });
    } catch (invoiceErr) {
      console.error('[activate-plan] Failed to create invoice (transaction):', invoiceErr);
      // Do not fail the activation if invoice creation fails
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[activate-plan] Error activating plan:", error);
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
    return NextResponse.json({ success: false, error: `Activation error: ${errorMessage}` }, { status: 500 });
  }
}
