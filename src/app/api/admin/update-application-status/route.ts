import { NextResponse } from "next/server";
import sendEmail from '@/lib/sendEmail';

// Do not initialize Firebase Admin at module load time. We'll try inside the request handler
// so the route can still operate (in a limited mode) when admin credentials are not present.
// const firestore will be set per-request when admin is available.

// --- ✅ API HANDLERS ---

// RequestBody: we accept either Firestore-backed fields (userId/jobId/status) or
// direct payload fields (userEmail, userName, company, role, status).
type RequestBody = {
  userId?: string;
  jobId?: string;
  status: string;
  userEmail?: string;
  userName?: string;
  company?: string;
  role?: string;
};

// 🔹 POST: Update application status + email notification
export async function POST(req: Request) {
  try {
    const body: RequestBody & Partial<{ userEmail?: string; userName?: string; company?: string; role?: string }> = await req.json();

    // For this simplified admin route we no longer require Firebase Admin.
    // The client (admin UI) must supply either userEmail (and optional userName)
    // or provide userId/jobId if you want Firestore-backed updates (deprecated here).
    if (!body.status) {
      return NextResponse.json({ error: 'Missing required field: status' }, { status: 400 });
    }

    console.log("📨 Updating application status (no-Firebase mode):", body);

    // Determine recipient and contextual fields from body
    const userEmail = body.userEmail;
    const userName = body.userName || 'User';
    const company = body.company || 'Unknown Company';
    const role = body.role || 'Unknown Position';

    if (!userEmail) {
      return NextResponse.json({ error: 'Missing userEmail for direct-send mode' }, { status: 400 });
    }
    // Try to send an email notification to the user. If the user has per-account
    // SMTP settings stored in their user doc, prefer those; otherwise use env SMTP.
    try {
      // Send email directly using env SMTP or per-user SMTP if the client provided it in body
      const smtpOverride = (body as any).smtp || undefined;

      await sendEmail({
        to: userEmail,
        type: 'application_updated',
        templateData: {
          name: userName,
          company,
          role,
          status: body.status,
          updatedAt: new Date().toLocaleDateString(),
        },
        smtp: smtpOverride,
      });

      // notify admin
      const adminTo = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.SMTP_USER || process.env.SMTP_FROM;
      if (adminTo) {
        await sendEmail({
          to: adminTo,
          type: 'application_updated',
          templateData: { name: userName, company, role, status: body.status, userEmail },
        });
      }
    } catch (emailError: any) {
      console.error('❌ Email sending failed:', emailError);
    }
    return NextResponse.json({
      success: true,
      message: "Application status updated successfully",
      userDetails: {
        userId: body.userId || null,
        name: userName,
        email: userEmail,
      },
      jobDetails: {
        jobId: body.jobId || null,
        company,
        role,
        previousStatus: null,
        newStatus: body.status,
      },
    });
  } catch (error: any) {
    console.error("🔥 Update application status error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// 🔹 GET: Fetch user + job details (for testing)
export async function GET(req: Request) {
  // Removed Firestore GET support — this admin route now only accepts POST requests
  // to update application status and send emails. If you need to fetch job/user
  // details, call your backend admin tools that have Firebase Admin credentials.
  return NextResponse.json({ error: 'GET not supported on this route. Use POST to update status.' }, { status: 501 });
}
