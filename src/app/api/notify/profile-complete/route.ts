import admin from 'firebase-admin';
import { NextResponse } from 'next/server';
import sendEmail from '@/lib/sendEmail';

// Try to initialize admin only if FIREBASE_ADMIN_SVC is present. Otherwise operate without admin.
function tryInitializeFirebaseAdmin() {
  try {
    if (admin.apps.length) return admin.app();
    const svc = process.env.FIREBASE_ADMIN_SVC;
    if (!svc) return undefined;
    let key = svc;
    if (!svc.trim().startsWith('{')) key = Buffer.from(svc, 'base64').toString('utf8');
    const parsed = JSON.parse(key);
    admin.initializeApp({ credential: admin.credential.cert(parsed as any) });
    return admin.app();
  } catch (e) {
    console.error('Failed to initialize firebase admin (continuing without it)', e);
    return undefined;
  }
}

export async function POST(req: Request) {
  try {
    // No server-side token verification per request from user: client should provide uid/email
    const adminApp = tryInitializeFirebaseAdmin();
    const body = await req.json();
    const uid = body.uid as string | undefined;
    const to = body.to as string | undefined;
    const name = body.templateData?.name || 'User';

    let smtpOverride = undefined;
    if (uid && adminApp) {
      try {
        // Read user's SMTP settings (optional) from Firestore
        const userDoc = await admin.firestore().collection('users').doc(uid).get();
        const userData = userDoc.exists ? userDoc.data() : undefined;
        if (userData) {
          const { smtpHost, smtpPort, smtpUser, smtpPass, smtpSecure } = userData as any;
          if (smtpHost && smtpUser && smtpPass) {
            smtpOverride = { host: smtpHost, port: smtpPort ? Number(smtpPort) : 465, user: smtpUser, pass: smtpPass, secure: Boolean(smtpSecure) };
          }
        }
      } catch (e) {
        console.error('Failed to read user SMTP settings, continuing without per-user SMTP', e);
      }
    }

    // If no 'to' provided and we don't have admin to look up email, return error
    if (!to && !adminApp) return NextResponse.json({ error: 'Missing recipient (to) and no admin SDK available to lookup uid' }, { status: 400 });

    let recipient = to;
    if (!recipient && uid && adminApp) {
      const doc = await admin.firestore().collection('users').doc(uid as string).get();
      recipient = doc.data()?.email;
    }

    if (!recipient) return NextResponse.json({ error: 'Recipient email not found' }, { status: 400 });

    // Send to user using their SMTP if available
    await sendEmail({ to: recipient, type: 'profile_completed', templateData: { name }, smtp: smtpOverride });

    // Send a copy to admin (fallback to env SMTP)
    const adminTo = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.SMTP_USER || process.env.SMTP_FROM;
    if (adminTo) {
      await sendEmail({ to: adminTo, type: 'profile_completed', templateData: { name, userEmail: recipient }, subject: `Profile completed: ${name}` });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('profile-complete notify error', err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
