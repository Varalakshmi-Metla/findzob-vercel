import { NextRequest, NextResponse } from 'next/server';
import sendEmail from '@/lib/sendEmail';

interface EliteInquiryBody {
  fullName: string;
  email: string;
  company?: string;
  phone?: string;
  requirements?: string;
  budget?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: EliteInquiryBody = await request.json();

    // Validate required fields
    if (!body.fullName || !body.email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Prepare email to admin
    const adminEmailContent = `
      <h2 style="color: #1e3a8a; margin-bottom: 20px;">New Elite Add-Ons Plan Inquiry</h2>
      
      <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="margin-top: 0; color: #334155;">Contact Information</h3>
        <p><strong>Name:</strong> ${body.fullName}</p>
        <p><strong>Email:</strong> <a href="mailto:${body.email}">${body.email}</a></p>
        ${body.company ? `<p><strong>Company:</strong> ${body.company}</p>` : ''}
        ${body.phone ? `<p><strong>Phone:</strong> ${body.phone}</p>` : ''}
      </div>

      ${body.requirements ? `
      <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="margin-top: 0; color: #334155;">Requirements & Use Case</h3>
        <p>${body.requirements.replace(/\n/g, '<br>')}</p>
      </div>
      ` : ''}

      ${body.budget ? `
      <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="margin-top: 0; color: #334155;">Budget Range</h3>
        <p>${body.budget}</p>
      </div>
      ` : ''}

      <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; color: #64748b; font-size: 12px;">
        <p>This is an automated message from the Elite Add-Ons inquiry form on FindZob.</p>
      </div>
    `;

    // Prepare email to user
    const userEmailContent = `
      <h2 style="color: #0ea5e9; margin-bottom: 20px;">Thank You for Your Elite Add-Ons Plan Inquiry</h2>
      
      <p style="color: #334155; line-height: 1.6;">
        Hello ${body.fullName},
      </p>

      <p style="color: #334155; line-height: 1.6;">
        Thank you for your interest in our Elite Add-Ons plan! We've received your inquiry and our team is reviewing your requirements.
      </p>

      <p style="color: #334155; line-height: 1.6;">
        <strong>What happens next:</strong>
      </p>

      <ul style="color: #334155; line-height: 1.8; margin-left: 20px;">
        <li>Our team will review your requirements</li>
        <li>A specialist will contact you within 24 hours</li>
        <li>We'll discuss customized solutions that fit your needs</li>
        <li>We'll provide a personalized quote</li>
      </ul>

      <div style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 20px; border-radius: 4px; margin: 30px 0;">
        <p style="color: #334155; margin: 0;">
          <strong>Your Inquiry Details:</strong><br>
          ${body.requirements ? `Requirements: ${body.requirements.substring(0, 100)}${body.requirements.length > 100 ? '...' : ''}` : 'No specific requirements provided'}
        </p>
      </div>

      <p style="color: #334155; line-height: 1.6;">
        If you have any urgent questions, feel free to reach out to us at support@findzob.com.
      </p>

      <p style="color: #334155; line-height: 1.6;">
        Best regards,<br>
        <strong>The FindZob Team</strong>
      </p>

      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
      <p style="color: #64748b; font-size: 12px; margin: 0;">
        This is an automated message from FindZob. Please do not reply to this email.
      </p>
    `;

    // Send email to admin
    const adminResult = await sendEmail({
      to: 'findzob@gmail.com',
      type: 'elite_inquiry_admin',
      subject: `New Elite Add-Ons Plan Inquiry from ${body.fullName}`,
      html: adminEmailContent,
    });

    // Send confirmation email to user
    const userResult = await sendEmail({
      to: body.email,
      type: 'elite_inquiry_user',
      subject: 'Your Elite Add-Ons Plan Inquiry - FindZob',
      html: userEmailContent,
    });

    if (!adminResult.response || !userResult.response) {
      throw new Error('Failed to send one or more emails');
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Inquiry sent successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Elite inquiry email error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process your inquiry. Please try again later.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
