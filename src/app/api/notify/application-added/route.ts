import { NextResponse } from 'next/server';
import sendEmail from '@/lib/sendEmail';

type NotifyApplicationRequest = {
  to: string;
  userName?: string;
  company: string;
  role: string;
  location: string;
  status: string;
  jobDescription?: string;
};

export async function POST(req: Request) {
  try {
    const body = await req.json() as NotifyApplicationRequest;
    const { to, userName, company, role, location, status, jobDescription } = body;

    if (!to || !company || !role) {
      return NextResponse.json({ error: 'Missing required fields: to, company, role' }, { status: 400 });
    }

    const appliedDate = new Date().toLocaleDateString();

    // Build HTML email
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>Job Application Added</h2>
        <p>Dear ${userName || 'User'},</p>
        <p>A new job application has been added to your profile:</p>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Company:</strong> ${company || 'N/A'}</p>
          <p><strong>Position:</strong> ${role || 'N/A'}</p>
          <p><strong>Location:</strong> ${location || 'N/A'}</p>
          <p><strong>Status:</strong> ${status || 'Applied'}</p>
          <p><strong>Applied Date:</strong> ${appliedDate}</p>
          ${jobDescription ? `
            <hr style="margin: 15px 0; border: none; border-top: 1px solid #ddd;" />
            <p><strong>Job Description:</strong></p>
            <p style="white-space: pre-wrap; background-color: #fff; padding: 10px; border-left: 3px solid #007bff;">${jobDescription}</p>
          ` : ''}
        </div>
        <p>You can view and manage all your applications in your dashboard.</p>
        <p>Best regards,<br/>FindZob Team</p>
      </div>
    `;

    await sendEmail({
      to,
      type: 'application_notification',
      subject: `New Job Application Added: ${role} at ${company}`,
      html,
    });

    return NextResponse.json({ ok: true, message: 'Email sent successfully' });
  } catch (error: any) {
    console.error('notify/application-added error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to send email' },
      { status: 500 }
    );
  }
}
