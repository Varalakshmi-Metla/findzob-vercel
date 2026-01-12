import { NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';

// GET /api/debug/list-user-resumes?userId=USER_ID
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'Missing userId' }, { status: 400 });
  }



  try {
    const snapshot = await adminApp.firestore().collection('users').doc(userId).collection('resumes').get();
    const resumes = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json({ ok: true, resumes });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
