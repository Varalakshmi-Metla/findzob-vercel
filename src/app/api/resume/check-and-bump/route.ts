import { NextResponse } from 'next/server';
import { checkAndIncrementResumeQuota } from '@/lib/firestore-helpers';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const uid = body?.uid;
    if (!uid) return NextResponse.json({ ok: false, error: 'Missing uid' }, { status: 400 });
    await checkAndIncrementResumeQuota(uid);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 400 });
  }
}
