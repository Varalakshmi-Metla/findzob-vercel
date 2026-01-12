
import { NextResponse } from "next/server";
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_ADMIN_SVC!)),
  });
}
const db = getFirestore();

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ invoices: [] });
  try {
    console.log('[INVOICES-API] Fetching invoices for userId:', userId);
    const snapshot = await db.collection("invoices")
      .where("userId", "==", userId)
      .get();
    
    console.log('[INVOICES-API] Found invoices count:', snapshot.docs.length);
    const invoices = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        // Serialize Firestore Timestamp objects to ISO strings for frontend
        const invoice: any = { id: doc.id, ...data };
        if (data.createdAt && typeof data.createdAt === 'object' && 'seconds' in data.createdAt) {
          invoice.createdAt = new Date(data.createdAt.seconds * 1000).toISOString();
        }
        if (data.updatedAt && typeof data.updatedAt === 'object' && 'seconds' in data.updatedAt) {
          invoice.updatedAt = new Date(data.updatedAt.seconds * 1000).toISOString();
        }
        return invoice;
      })
      // Sort by updatedAt (latest first), then by createdAt
      .sort((a: any, b: any) => {
        const getDate = (inv: any) => {
          // Prioritize updatedAt over createdAt
          if (inv.updatedAt) {
            return inv.updatedAt.seconds ? inv.updatedAt.seconds * 1000 : new Date(inv.updatedAt).getTime();
          }
          if (inv.createdAt) {
            return inv.createdAt.seconds ? inv.createdAt.seconds * 1000 : new Date(inv.createdAt).getTime();
          }
          // Fallback to purchaseDate for INR/razorpay if neither is available
          if (inv.paymentMethod === 'razorpay' && inv.purchaseDate) {
            return new Date(inv.purchaseDate).getTime();
          }
          return 0;
        };
        const dateA = getDate(a);
        const dateB = getDate(b);
        return dateB - dateA;
      });

    console.log('[INVOICES-API] Returning invoices:', invoices.length);
    return NextResponse.json({ invoices });
  } catch (err: any) {
    console.error("[INVOICES-API] Error fetching invoices:", err);
    return NextResponse.json({ invoices: [], error: err.message }, { status: 500 });
  }
}
