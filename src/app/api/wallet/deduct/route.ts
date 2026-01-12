import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_ADMIN_SVC!)),
  });
}

const db = getFirestore();

// POST /api/wallet/deduct
// Body: { userId, amount, jobId?, ts }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, amount, jobId, ts } = body;
    if (!userId || !amount || !ts) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }
    if (Number(amount) !== 5) {
      return NextResponse.json({ success: false, error: 'Invalid deduction amount' }, { status: 400 });
    }

    const userRef = db.collection('users').doc(userId);

    await db.runTransaction(async (t) => {
      const userSnap = await t.get(userRef);
      if (!userSnap.exists) throw new Error('User not found');
      const prevAmount = userSnap.data()?.walletAmount || 0;
      if (prevAmount < 5) throw new Error('Insufficient wallet balance');
      t.update(userRef, { walletAmount: prevAmount - 5 });
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Wallet deduct error', err);
    return NextResponse.json({ success: false, error: err.message || 'Failed to deduct from wallet' }, { status: 500 });
  }
}
