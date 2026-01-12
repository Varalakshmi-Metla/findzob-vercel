import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import adminApp from "@/lib/firebase-admin";
import { isAdminEmail } from "@/lib/admin";
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

// POST /api/admin/activate-plan-by-email
// Admin endpoint to activate plans for users by email
export async function POST(req: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = req.headers.get("authorization") || "";
    const match = authHeader.match(/^Bearer (.+)$/i);
    if (!match) {
      return NextResponse.json(
        { success: false, error: "Missing Authorization header" },
        { status: 401 }
      );
    }

    const idToken = match[1];
    let decoded;
    try {
      decoded = await adminApp.auth().verifyIdToken(idToken);
    } catch (err: any) {
      console.error("[activate-plan-by-email] Token verification failed", err);
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 401 }
      );
    }

    const callerUid = decoded?.uid;
    const callerEmail = decoded?.email?.toLowerCase();

    if (!callerUid) {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 401 }
      );
    }

    // Verify caller is admin
    const adminDoc = await adminApp
      .firestore()
      .collection("admins")
      .doc(callerUid)
      .get();

    if (!adminDoc.exists && !isAdminEmail(callerEmail)) {
      return NextResponse.json(
        { success: false, error: "Forbidden - not an admin" },
        { status: 403 }
      );
    }

    // Parse request body
    const data = await req.json();
    let {
      userEmail,
      planId,
      plan,
      paymentId,
      orderId,
      sessionId,
      amount,
      signature,
      paymentMethod,
    } = data;

    console.log("[activate-plan-by-email] Incoming data:", data);

    // Validate required fields
    if (!userEmail) {
      console.error("[activate-plan-by-email] Missing required field: userEmail");
      return NextResponse.json(
        { success: false, error: "Missing required field: userEmail" },
        { status: 400 }
      );
    }

    if (!planId && !plan) {
      console.error("[activate-plan-by-email] Missing required field: planId or plan");
      return NextResponse.json(
        { success: false, error: "Missing required field: planId or plan" },
        { status: 400 }
      );
    }

    // For cash/manual activation, only planId is required
    if (paymentMethod === "cash") {
      if (!planId && plan && plan.id) {
        planId = plan.id;
      }
      if (!planId) {
        console.error(
          "[activate-plan-by-email] Missing required fields for cash/manual activation",
          { planId }
        );
        return NextResponse.json(
          {
            success: false,
            error: "Missing required fields: planId is required for cash/manual activation.",
          },
          { status: 400 }
        );
      }
    } else {
      // For payment methods, verify payment details
      if (!paymentId || !orderId) {
        console.error("[activate-plan-by-email] Missing required payment fields", {
          planId,
          paymentId,
          orderId,
        });
        return NextResponse.json(
          {
            success: false,
            error: "Missing required fields: planId, paymentId, orderId are required.",
          },
          { status: 400 }
        );
      }

      // Razorpay: require signature and verify
      if (paymentMethod === "razorpay") {
        if (!signature) {
          console.error("[activate-plan-by-email] Missing signature for Razorpay");
          return NextResponse.json(
            { success: false, error: "Missing signature for Razorpay" },
            { status: 400 }
          );
        }
        const isPaymentValid = verifyRazorpayPayment(orderId, paymentId, signature);
        if (!isPaymentValid) {
          console.error("[activate-plan-by-email] Payment verification failed for Razorpay", {
            orderId,
            paymentId,
            signature,
          });
          return NextResponse.json(
            { success: false, error: "Payment verification failed" },
            { status: 400 }
          );
        }
      }
    }

    // Fetch user by email
    let userId: string | null = null;
    let userData: any = null;
    try {
      const userQuery = await db
        .collection("users")
        .where("email", "==", userEmail.toLowerCase())
        .limit(1)
        .get();

      if (userQuery.empty) {
        console.error("[activate-plan-by-email] User not found by email:", userEmail);
        return NextResponse.json(
          { success: false, error: `User not found with email: ${userEmail}` },
          { status: 404 }
        );
      }

      const userDoc = userQuery.docs[0];
      userId = userDoc.id;
      userData = userDoc.data();

      console.log("[activate-plan-by-email] User found:", {
        userId,
        email: userData.email,
      });
    } catch (err) {
      console.error("[activate-plan-by-email] Error fetching user by email:", err);
      return NextResponse.json(
        { success: false, error: "Error fetching user by email" },
        { status: 500 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: `User not found with email: ${userEmail}` },
        { status: 404 }
      );
    }

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
        const querySnap = await db
          .collection("plans")
          .where("id", "==", planId)
          .limit(1)
          .get();
        if (!querySnap.empty) {
          planData = querySnap.docs[0].data();
          planId = querySnap.docs[0].id;
        }
      }
    } catch (fetchErr) {
      console.warn(
        `[activate-plan-by-email] Firestore fetch error for planId: ${planId}. Using provided plan data if available.`,
        fetchErr
      );
    }

    if (!planData) {
      if (plan) {
        console.warn(
          `[activate-plan-by-email] Plan not found in Firestore for planId: ${planId}. Using provided plan data.`
        );
        planData = plan;
      } else {
        console.error(
          `[activate-plan-by-email] Plan not found in Firestore and no plan data provided for planId: ${planId}`
        );
        return NextResponse.json(
          { success: false, error: `Plan not found for planId: ${planId}` },
          { status: 404 }
        );
      }
    }

    let expiryDate = null;
    let planType = undefined;
    let subscription = undefined;
    const validity = planData?.validity;
    const category = String(planData?.category || "").toLowerCase();

    if (category === "membership") {
      planType = "membership";
    }

    // Fetch user citizenship for membership validity adjustment
    let userCitizenship = "";
    try {
      const userRef = db.collection("users").doc(userId);
      const userSnap = await userRef.get();
      if (userSnap.exists && userSnap.data()?.citizenship) {
        userCitizenship = String(userSnap.data()?.citizenship || "").trim();
      }
    } catch (err) {
      console.warn(
        `[activate-plan-by-email] Could not fetch user citizenship for userId: ${userId}`,
        err
      );
    }

    // Calculate expiryDate based on plan validity first
    if (validity) {
      if (String(validity).toLowerCase() === "lifetime") {
        expiryDate = "lifetime";
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
      if (category === "membership") {
        // For India citizenship users: 1 year (365 days) membership validity
        if (userCitizenship.toLowerCase() === "india") {
          const now = new Date();
          now.setDate(now.getDate() + 365);
          expiryDate = now.toISOString();
          console.log(
            `[activate-plan-by-email] India citizenship detected. Setting membership validity to 1 year (365 days) for userId: ${userId}`
          );
        } else {
          // For other countries: lifetime membership
          expiryDate = "lifetime";
        }
      } else if (category === "service") {
        // If Pay-As-You-Go (monthly-postpaid), set lifetime validity for all countries
        if (
          planData.billing === "monthly-postpaid" ||
          planData.billing === "payg" ||
          planData.name?.toLowerCase().includes("pay as you go")
        ) {
          expiryDate = "lifetime";
          console.log(
            `[activate-plan-by-email] Pay-As-You-Go plan activated with lifetime validity for userId: ${userId}`
          );
        } else {
          // Default: 36500 days for other service plans
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

    if (category === "membership") {
      subscription.membership = "lifetime";
    }

    console.log("[activate-plan-by-email] Plan data:", planData);
    console.log("[activate-plan-by-email] Computed expiryDate:", expiryDate);

    // Prepare plan object to add to user's plans array
    const planToAdd = {
      ...planData,
      planId: planId,
      id: planId,
      activatedAt: new Date().toISOString(),
      expiryDate: expiryDate,
      status: "active",
      paymentMethod: paymentMethod || null,
      paymentId: paymentId || null,
      orderId: orderId || null,
      sessionId: sessionId || null,
      amount: amount || null,
      activatedBy: callerEmail || callerUid, // Track which admin activated
    };

    // Atomically add plan to user's plans array if not already present
    const userRef = db.collection("users").doc(userId);
    const userSnap = await userRef.get();
    let existingPlans = [];

    if (userData && Array.isArray(userData.plans)) {
      existingPlans = userData.plans;
    }

    // Check if plan already exists in array (by planId or id)
    const alreadyExists = existingPlans.some((p: any) => p.planId === planId || p.id === planId);

    let updatedPlans;
    if (category === "service") {
      // Remove all previous service plans, keep only non-service plans
      const nonServicePlans = existingPlans.filter(
        (p: any) => String(p.category || "").toLowerCase() !== "service"
      );
      updatedPlans = [...nonServicePlans, planToAdd];
    } else {
      // Membership or other plan: add or update as before
      if (!alreadyExists) {
        updatedPlans = [...existingPlans, planToAdd];
      } else {
        updatedPlans = existingPlans.map((p: any) =>
          p.planId === planId || p.id === planId ? { ...p, ...planToAdd } : p
        );
      }
    }

    await userRef.set(
      {
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
      },
      { merge: true }
    );

    // Generate and store invoice in Firestore
    try {
      await db.runTransaction(async (transaction) => {
        let invoiceQuery = db.collection("invoices").where("userId", "==", userId);
        const conditions = [];
        if (paymentId) conditions.push(["paymentId", "==", paymentId]);
        if (orderId) conditions.push(["orderId", "==", orderId]);
        if (sessionId) conditions.push(["sessionId", "==", sessionId]);

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
          // Fetch user details for invoice
          let userName = "";
          let userPhone = "";
          let userAddress = "";

          try {
            if (userData) {
              if (userData.name) userName = userData.name;
              if (userData.phone) userPhone = userData.phone;
              if (userData.address) userAddress = userData.address;
            }
          } catch {}

          const invoiceData = {
            userId,
            userName,
            userPhone,
            userAddress,
            userEmail,
            planId,
            planName: planData?.name || "",
            category: planData?.category || "",
            price: planData?.price || null,
            currency: planData?.currency || null,
            description: planData?.description || "",
            features: planData?.features || [],
            activatedAt: new Date().toISOString(),
            activatedBy: callerEmail || callerUid,
            expiryDate: expiryDate,
            status: "paid",
            paymentMethod: paymentMethod || null,
            paymentId: paymentId || null,
            orderId: orderId || null,
            sessionId: sessionId || null,
            amount: amount || null,
            createdAt: new Date().toISOString(),
          };

          const invoiceRef = db.collection("invoices").doc();
          transaction.set(invoiceRef, invoiceData);
          console.log("[activate-plan-by-email] Invoice created in Firestore (transaction):", invoiceData);
        } else {
          console.log(
            "[activate-plan-by-email] Invoice already exists for this payment. Skipping creation."
          );
        }
      });
    } catch (invoiceErr) {
      console.error("[activate-plan-by-email] Failed to create invoice (transaction):", invoiceErr);
      // Do not fail the activation if invoice creation fails
    }

    console.log("[activate-plan-by-email] Plan activated successfully for user:", {
      userId,
      userEmail,
      planId,
      planName: planData?.name,
      activatedBy: callerEmail || callerUid,
    });

    return NextResponse.json({
      success: true,
      message: "Plan activated successfully",
      data: {
        userId,
        userEmail,
        planId,
        planName: planData?.name,
        expiryDate,
        activatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[activate-plan-by-email] Error activating plan:", error);
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
    return NextResponse.json(
      { success: false, error: `Activation error: ${errorMessage}` },
      { status: 500 }
    );
  }
}
