import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import adminApp from "@/lib/firebase-admin";

const db = getFirestore(adminApp);

// GET /api/check-unpaid-invoices?userId=<userId>
// Returns: { hasUnpaidInvoices: boolean, unpaidCount: number, invoices: Array }
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Missing userId parameter" },
        { status: 400 }
      );
    }

    // Get all invoices for the user (simple single-where query)
    const invoicesRef = db.collection("invoices");
    const allInvoices = await invoicesRef
      .where("userId", "==", userId)
      .get();

    console.log(`[check-unpaid-invoices] Found ${allInvoices.docs.length} total invoices for userId: ${userId}`);

    // Filter for unpaid invoices from PREVIOUS month only
    // Block access only if unpaid invoices from last month exist
    // Current month invoices don't block access
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Previous month range
    const prevMonthNum = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const prevMonthStart = new Date(prevYear, prevMonthNum, 1, 0, 0, 0, 0);
    const prevMonthEnd = new Date(prevYear, prevMonthNum + 1, 0, 23, 59, 59, 999);

    console.log(`[check-unpaid-invoices] Checking for unpaid invoices from ${prevMonthStart.toISOString().split('T')[0]} to ${prevMonthEnd.toISOString().split('T')[0]}`);

    const lastMonthInvoices = allInvoices.docs
      .map((doc) => {
        const data = doc.data();
        const invoice: any = { id: doc.id, ...data };
        
        // Handle Firestore Timestamp objects (from admin SDK)
        if (data.createdAt && typeof data.createdAt === 'object' && 'seconds' in data.createdAt) {
          invoice.createdAt = new Date(data.createdAt.seconds * 1000).toISOString();
        } else if (data.createdAt) {
          invoice.createdAt = new Date(data.createdAt).toISOString();
        }
        
        if (data.updatedAt && typeof data.updatedAt === 'object' && 'seconds' in data.updatedAt) {
          invoice.updatedAt = new Date(data.updatedAt.seconds * 1000).toISOString();
        }
        
        return invoice;
      })
      .filter((inv: any) => {
        // Only include unpaid invoices
        if (inv.status !== 'unpaid') {
          console.log(`[check-unpaid-invoices] Skipping invoice ${inv.id}: status=${inv.status}`);
          return false;
        }
        
        // Check if invoice is from previous month
        const invDate = inv.createdAt ? new Date(inv.createdAt) : null;
        if (!invDate) {
          console.log(`[check-unpaid-invoices] Skipping invoice ${inv.id}: no createdAt date`);
          return false;
        }
        
        const isFromPrevMonth = invDate >= prevMonthStart && invDate <= prevMonthEnd;
        if (!isFromPrevMonth) {
          console.log(`[check-unpaid-invoices] Skipping invoice ${inv.id}: not from previous month (date=${invDate.toISOString()})`);
          return false;
        }
        
        console.log(`[check-unpaid-invoices] Including unpaid invoice ${inv.id}: amount=${inv.amount}, type=${inv.type}, createdAt=${inv.createdAt} (from previous month)`);
        return true;
      });

    const hasUnpaidInvoices = lastMonthInvoices.length > 0;

    console.log(
      `[check-unpaid-invoices] userId: ${userId}, ` +
      `totalInvoices: ${allInvoices.docs.length}, ` +
      `unpaidFromPrevMonth: ${lastMonthInvoices.length}, hasUnpaid: ${hasUnpaidInvoices}`
    );

    return NextResponse.json({
      success: true,
      hasUnpaidInvoices,
      unpaidCount: lastMonthInvoices.length,
      invoices: lastMonthInvoices,
    });
  } catch (error) {
    console.error("[check-unpaid-invoices] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to check unpaid invoices",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
