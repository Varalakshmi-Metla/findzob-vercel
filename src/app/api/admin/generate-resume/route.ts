import { NextResponse } from 'next/server';
import { generateAndEmailResume } from '@/app/actions/resume-actions';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { uid, resume, profile } = body as any;
    if (!uid || !resume) return NextResponse.json({ error: 'uid and resume required' }, { status: 400 });

    // Note: generateAndEmailResume expects a User object for 'user'. We'll call it with a minimal shape
    const fakeUser = { uid, email: profile?.email || (profile?.contactEmail || ''), displayName: profile?.name || '' } as any;

    const result = await generateAndEmailResume(resume, fakeUser, profile || null);
    if (!result.ok) return NextResponse.json({ error: result.error || 'generation failed' }, { status: 500 });
    return NextResponse.json({ ok: true, data: result.uploadResult });
  } catch (err: any) {
    console.error('admin/generate-resume error', err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
