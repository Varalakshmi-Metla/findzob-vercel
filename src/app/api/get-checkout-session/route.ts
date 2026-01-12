import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

// GET /api/get-checkout-session?sessionId=...
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    // planId and other info are stored in metadata
    const planId = session.metadata?.planId;
    const amount_total = session.amount_total;
    
    // Reconstruct plan object from metadata
    const plan = session.metadata ? {
      id: session.metadata.planId,
      name: session.metadata.planName,
      price: session.metadata.planPrice,
      currency: session.metadata.planCurrency,
      category: session.metadata.planCategory,
      validity: session.metadata.planValidity,
      billing: session.metadata.planBilling,
      billingCycle: session.metadata.planBillingCycle,
    } : null;

    return NextResponse.json({ planId, amount_total, plan });
  } catch (error) {
    console.error("Error fetching Stripe session:", error);
    return NextResponse.json({ error: "Failed to fetch session" }, { status: 500 });
  }
}
