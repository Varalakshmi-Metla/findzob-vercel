import admin from 'firebase-admin';
import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/sendEmail';
import { isAdminEmail } from '@/lib/admin';

type EmailRequest = {
  to: string;
  type?: 'profile_completed' | 'application_updated' | 'application_created' | 'resume_generated' | string;
  subject?: string;
  templateData?: Record<string, any>;
  text?: string;
  html?: string;
  from?: string;
};

const DEFAULT_FROM_EMAIL = process.env.EMAIL_FROM || 'veerachakradharpampanaboyina@gmail.com';

function buildTemplates(type: string | undefined, data: Record<string, any> | undefined) {
  const name = (data?.name) || '';
  switch (type) {
    case 'profile_completed':
      return {
        subject: 'Your FindZob profile is complete',
        html: `<p>Hi ${name || ''},</p><p>Thanks — your profile is now complete. You can now access resume generation, job matching and interview prep.</p><p>— The FindZob Team</p>`,
        text: `Hi ${name || ''},\n\nYour profile is now complete. You can now access resume generation, job matching and interview prep.\n\n— The FindZob Team`,
      };
    case 'application_updated':
      return {
        subject: `Application status updated: ${data?.status || ''}`,
        html: `<p>Hi ${name || ''},</p><p>Your application for <strong>${data?.role || ''}</strong> at <strong>${data?.company || ''}</strong> was updated to <strong>${data?.status || ''}</strong>.</p><p>— The FindZob Team</p>`,
        text: `Hi ${name || ''},\n\nYour application for ${data?.role || ''} at ${data?.company || ''} was updated to ${data?.status || ''}.\n\n— The FindZob Team`,
      };
    case 'application_created':
      return {
        subject: `New application added: ${data?.role || ''}`,
        html: `<p>Hi ${name || ''},</p><p>An application for <strong>${data?.role || ''}</strong> at <strong>${data?.company || ''}</strong> was added to your account by ${data?.assignedBy || 'admin'}.</p><p>— The FindZob Team</p>`,
        text: `Hi ${name || ''},\n\nAn application for ${data?.role || ''} at ${data?.company || ''} was added to your account by ${data?.assignedBy || 'admin'}.\n\n— The FindZob Team`,
      };
    case 'resume_generated':
      return {
        subject: `New resume generated: ${data?.role || ''}`,
        html: `<p>Hi ${name || ''},</p><p>A new resume tailored for <strong>${data?.role || ''}</strong> was generated and saved to your account.</p><p>— The FindZob Team</p>`,
        text: `Hi ${name || ''},\n\nA new resume tailored for ${data?.role || ''} was generated and saved to your account.\n\n— The FindZob Team`,
      };
    default:
      return {
        subject: data?.subject || 'Notification from FindZob',
        html: data?.html || `<p>Hi ${name || ''},</p><p>${data?.text || 'You have a new notification.'}</p>`,
        text: data?.text || 'You have a new notification.',
      };
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as EmailRequest;
    if (!body || !body.to) return NextResponse.json({ error: 'Missing to field' }, { status: 400 });

    // Verify Firebase ID token from Authorization header and ensure caller is an admin
    const authHeader = req.headers.get('authorization') || '';
    const match = authHeader.match(/^Bearer (.+)$/i);
    if (!match) return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 });
    const idToken = match[1];

    let decoded: any = null;
    try {
      decoded = await admin.auth().verifyIdToken(idToken);
    } catch (err: any) {
      console.error('send-email token verify failed', err);
      const msg = (err && (err.message || String(err))) || '';
      if (msg.includes('metadata.google.internal') || msg.includes('ENOTFOUND')) {
        const fallbackAdminEmail = req.headers.get('x-admin-email');
        if (fallbackAdminEmail && isAdminEmail(fallbackAdminEmail)) {
          decoded = { email: fallbackAdminEmail } as any;
        } else {
          return NextResponse.json({ error: 'Missing or invalid fallback admin email header x-admin-email' }, { status: 401 });
        }
      } else {
        return NextResponse.json({ error: 'Invalid auth token' }, { status: 401 });
      }
    }

    if (!isAdminEmail((decoded && (decoded as any).email) as string)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const emailType = body.type || 'notification';
    const templateData = body.templateData || { name: '', company: '', role: '', status: '', updatedAt: undefined };
    const from = body.from || DEFAULT_FROM_EMAIL;

    await sendEmail({
      to: body.to,
      type: emailType,
      templateData: templateData as any,
      text: body.text,
      html: body.html,
      from,
      subject: body.subject,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('send-email error', err?.message || err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
