import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_ADMIN_SVC!)),
  });
}
const db = getFirestore();

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  try {
    // Get latest invoice for this user (from invoices collection)
    const invoicesSnap = await db.collection('invoices')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();
    if (invoicesSnap.empty) return NextResponse.json({ error: 'No invoice found' }, { status: 404 });
    const invoice = invoicesSnap.docs[0];
    return NextResponse.json({ invoiceId: invoice.id });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch invoice' }, { status: 500 });
  }
}
