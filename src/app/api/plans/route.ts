import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import adminApp from "@/lib/firebase-admin";

const db = getFirestore(adminApp);

// GET /api/plans
// Public endpoint to list all plans
export async function GET(req: NextRequest) {
  try {
    // Fetch all plans from Firestore
    const plansSnapshot = await db.collection("plans").get();

    if (plansSnapshot.empty) {
      return NextResponse.json([], { status: 200 });
    }

    // Map documents to include both document ID and plan data
    const plans = plansSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json(plans, { status: 200 });
  } catch (error) {
    console.error("[get-plans] Error fetching plans:", error);
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
    return NextResponse.json(
      { success: false, error: `Failed to fetch plans: ${errorMessage}` },
      { status: 500 }
    );
  }
}
