import { NextResponse } from 'next/server';
import { verifyBearerAndRole } from '@/lib/employee-auth';
import admin from 'firebase-admin';
import { sendEmail } from '@/lib/sendEmail';

export async function POST(req: Request) {
  try {
  // allow admins to request password resets on behalf of users
  const caller = await verifyBearerAndRole(req, ['employee', 'admin']);
    const body = await req.json();
    const { email, uid } = body || {};
    // allow employee to request a reset for themselves or for a user email
    if (!email && !uid) return NextResponse.json({ ok: false, error: 'email or uid required' }, { status: 400 });

  const targetEmail = email || (uid ? (await admin.auth().getUser(uid)).email : null);
    const link = await admin.auth().generatePasswordResetLink(targetEmail as string);

    // send email using sendEmail helper if available
    try {
      await sendEmail({ to: targetEmail as string, type: 'password_reset', templateData: { resetLink: link }, subject: 'Password reset' });
    } catch (e) {
      console.warn('Failed to send password reset via sendEmail helper', e);
    }

    return NextResponse.json({ ok: true, resetLink: link });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 401 });
  }
}
