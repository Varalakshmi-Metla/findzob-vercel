"use server";

import { User } from 'firebase/auth';
import { generateResumeHTMLFromProfile } from '@/lib/resume-template-v2';
import { generateATSResumeHTML } from '@/lib/resume-template-ats';
import { generateOfficialResumeHTML } from '@/lib/resume-unified-formatter';
import admin from 'firebase-admin';
import sendEmail from '@/lib/sendEmail';
import { logger } from '@/lib/logger';

declare module 'html-to-docx';

type Resume = any;
type Profile = any;

/**
 * Generate DOCX resume using unified formatter
 * Uses official resume design that's consistent with PDF output
 */
export const generateDocx = async (resume: Resume, user: User | null, profile: Profile | null): Promise<string> => {
  // Use unified formatter for consistent design across DOCX and PDF
  const html = generateOfficialResumeHTML({
    name: profile?.name,
    email: profile?.email,
    phone: profile?.phone,
    location: profile?.location,
    linkedin: profile?.linkedin,
    github: profile?.github,
    portfolioURL: profile?.portfolioURL,
    role: resume?.role,
    summary: resume?.summary,
    experience: resume?.experience,
    skills: resume?.skills,
    education: resume?.education,
    certifications: resume?.certifications,
    projects: resume?.projects,
    languages: resume?.languages,
    technicalTools: resume?.technicalTools,
    volunteerWork: resume?.volunteer,
    publications: resume?.publications,
    awards: resume?.awards,
    interests: resume?.interests,
  });
  
  // Dynamically import html-to-docx at runtime to avoid Turbopack/SSR eager evaluation
  let fileBuffer: Buffer | Uint8Array;
  try {
    const htmlToDocxModule = await import('html-to-docx');
    const htmlToDocx = (htmlToDocxModule && (htmlToDocxModule.default || htmlToDocxModule)) as any;
    fileBuffer = await htmlToDocx(html, undefined, {
      table: { row: { cantSplit: true } },
      footer: false,
      header: false,
    });
  } catch (err) {
    logger.error('Failed to load or run html-to-docx', err instanceof Error ? err : new Error(String(err)), {
      userId: user?.uid,
      resumeId: resume?.id,
    });
    throw err;
  }
  return (fileBuffer as Buffer).toString('base64');
};

// Server can generate DOCX. For PDF generation on server we'd need puppeteer or an HTML-to-PDF lib
// For now, PDF is generated client-side in admin UI using jsPDF/html2canvas for simplicity.

/**
 * Server action: generate a PDF from LaTeX code
 * @param latexCode LaTeX code to compile
 * @returns Base64-encoded PDF buffer
 */
export const generatePdfFromLatex = async (latexCode: string): Promise<string> => {
  try {
    const { compileLaTeXToPDF } = await import('@/lib/latex-pdf-service');
    const pdfBuffer = await compileLaTeXToPDF(latexCode);
    return Buffer.from(pdfBuffer).toString('base64');
  } catch (error) {
    logger.error('Failed to generate PDF from LaTeX', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
};

/**
 * Server action: generate a high-quality PDF resume using Puppeteer and Gemini
 * @param profile User profile data
 * @param role Target role for the resume
 * @returns Base64-encoded PDF buffer
 */
export const generateResumePdfPuppeteer = async (profile: any, role: string): Promise<string> => {
  try {
    const { generateResumePDF } = await import('@/lib/resume-service-puppeteer');
    const pdfBuffer = await generateResumePDF({ profile, role });
    // Handle both Buffer and Uint8Array
    const buffer = pdfBuffer instanceof Uint8Array 
      ? Buffer.from(pdfBuffer) 
      : (typeof pdfBuffer === 'object' && pdfBuffer !== null && 'toString' in pdfBuffer && typeof (pdfBuffer as any).toString === 'function'
        ? Buffer.from(pdfBuffer as any)
        : Buffer.from(pdfBuffer as any));
    return buffer.toString('base64');
  } catch (error) {
    logger.error('Failed to generate PDF with Puppeteer', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
};

/**
 * Server action: generate a professional A4-sized PDF resume that fits on one page
 * Uses Puppeteer for high-quality server-side rendering
 * @param profile User profile data
 * @param role Target role for the resume (stored in resume or provided separately)
 * @returns Base64-encoded PDF buffer
 */
export const generateA4ResumePDF = async (profile: any, role?: string): Promise<string> => {
  const startTime = Date.now();
  const targetRole = role || 'Resume';
  
  logger.info('Server action: Starting A4 PDF generation', {
    profileName: profile?.name,
    role: targetRole,
  });
  
  try {
    const { generateA4ResumePDFServerSide } = await import('@/lib/resume-a4-pdf-generator');
    const pdfBuffer = await generateA4ResumePDFServerSide(profile, targetRole);
    const base64 = pdfBuffer.toString('base64');
    
    const elapsed = Date.now() - startTime;
    logger.info('A4 PDF generation completed successfully', {
      profileName: profile?.name,
      role: targetRole,
      pdfSize: pdfBuffer.length,
      elapsed,
    });
    
    return base64;
  } catch (error) {
    const elapsed = Date.now() - startTime;
    logger.error('A4 PDF generation failed', error instanceof Error ? error : new Error(String(error)), {
      profileName: profile?.name,
      role: targetRole,
      elapsed,
    });
    throw error;
  }
};


/**
 * Server action: generate a DOCX resume and email it to the user as an attachment.
 * @param resume Resume data
 * @param user User object (must have .email and .name)
 * @param profile Profile data
 * @returns {Promise<{ok: boolean; error?: string}>}
 */
export const generateAndEmailResume = async (resume: Resume, user: User | null, profile: Profile | null): Promise<{ok: boolean; error?: string; uploadResult?: { docxUrl: string; pdfUrl: string } | null; generatedOnly?: boolean}> => {
  const startTime = Date.now();
  logger.info('Starting resume generation and email', {
    userId: user?.uid,
    userEmail: user?.email,
    resumeId: resume?.id,
    hasLatexCode: !!resume?.latexCode,
  });
  // Helper to upload buffer to Firebase Storage and get public URL
  async function uploadResumeToStorage(buffer: Buffer, filename: string, contentType: string): Promise<string> {
    if (!admin.apps.length) throw new Error('Firebase admin not initialized');
    const bucket = admin.storage().bucket();
    const file = bucket.file(`resumes/${user?.uid}/${filename}`);
    await file.save(buffer, { contentType });
    await file.makePublic();
    return file.publicUrl();
  }
  if (!user || !user.email) throw new Error('User email required');
  const html = generateATSResumeHTML(profile || {}, resume);
  let docxBuffer: Buffer | Uint8Array;
  let pdfBuffer: Buffer | Uint8Array | undefined;
  // Generate DOCX
  try {
    const htmlToDocxModule = await import('html-to-docx');
    const htmlToDocx = (htmlToDocxModule && (htmlToDocxModule.default || htmlToDocxModule)) as any;
    docxBuffer = await htmlToDocx(html, undefined, {
      table: { row: { cantSplit: true } },
      footer: false,
      header: false,
    });
    // Convert to Buffer if needed
    if (!(docxBuffer instanceof Buffer)) docxBuffer = Buffer.from(docxBuffer);
    logger.info('DOCX generated successfully', {
      userId: user?.uid,
      docxSize: docxBuffer.length,
    });
  } catch (err) {
    logger.error('Failed to load or run html-to-docx', err instanceof Error ? err : new Error(String(err)), {
      userId: user?.uid,
      resumeId: resume?.id,
    });
    return { ok: false, error: 'Resume generation failed. Please try again later.' };
  }
  // Generate PDF from LaTeX if available, otherwise fall back to HTML
  try {
    if (resume.latexCode) {
      logger.info('Generating PDF from LaTeX', {
        userId: user?.uid,
        latexLength: resume.latexCode.length,
      });
      // Use LaTeX to generate PDF
      const { compileLaTeXToPDF } = await import('@/lib/latex-pdf-service');
      pdfBuffer = await compileLaTeXToPDF(resume.latexCode);
      logger.info('PDF generated from LaTeX successfully', {
        userId: user?.uid,
        pdfSize: pdfBuffer?.length,
      });
    } else {
      logger.info('Generating PDF from HTML (fallback)', {
        userId: user?.uid,
      });
      // Fallback to HTML-to-PDF
      const htmlPdfNode = await import('html-pdf-node');
      const pdfOptions = { format: 'A4' };
      const pdfResult = await htmlPdfNode.generatePdf({ content: html }, pdfOptions) as unknown as { buffer: Buffer };
      if (pdfResult && pdfResult.buffer && Buffer.isBuffer(pdfResult.buffer)) {
        pdfBuffer = pdfResult.buffer;
      }
      // Convert to Buffer if needed
      if (!(pdfBuffer instanceof Buffer) && pdfBuffer) pdfBuffer = Buffer.from(pdfBuffer);
      logger.info('PDF generated from HTML successfully', {
        userId: user?.uid,
        pdfSize: pdfBuffer?.length,
      });
    }
  } catch (err) {
    logger.error('Failed to generate PDF', err instanceof Error ? err : new Error(String(err)), {
      userId: user?.uid,
      resumeId: resume?.id,
      usingLatex: !!resume.latexCode,
    });
    // PDF generation is optional, continue if it fails
  }
  // Prefer sending PDF only. If PDF generation failed, fall back to DOCX.
  // Upload both PDF and DOCX to Firebase Storage and get URLs
  let pdfUrl = '';
  let docxUrl = '';
  const attachments: Array<{filename: string; content: Buffer; contentType: string}> = [];
  if (pdfBuffer) {
    const pdfBufferFixed = Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);
    pdfUrl = await uploadResumeToStorage(pdfBufferFixed, `${profile?.name || user?.email}-resume.pdf`, 'application/pdf');
    attachments.push({
      filename: `${profile?.name || user?.email}-resume.pdf`,
      content: pdfBufferFixed,
      contentType: 'application/pdf',
    });
  }
  if (docxBuffer) {
    const docxBufferFixed = Buffer.isBuffer(docxBuffer) ? docxBuffer : Buffer.from(docxBuffer);
    docxUrl = await uploadResumeToStorage(docxBufferFixed, `${profile?.name || user?.email}-resume.docx`, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    attachments.push({
      filename: `${profile?.name || user?.email}-resume.docx`,
      content: docxBufferFixed,
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
  }
  // Attempt to send the resume to the user and notify admin.
  try {
    // Ensure firebase-admin is initialized if not already
    if (!admin.apps.length) {
      const svc = process.env.FIREBASE_ADMIN_SVC;
      if (svc) {
        try {
          const key = svc.trim().startsWith('{') ? svc : Buffer.from(svc, 'base64').toString('utf8');
          const parsed = JSON.parse(key);
          admin.initializeApp({ credential: admin.credential.cert(parsed as any) });
        } catch (e) {
          logger.error('Failed to init firebase-admin for resume email', e instanceof Error ? e : new Error(String(e)), {
            userId: user?.uid,
          });
        }
      }
    }

    // Try to read per-user SMTP settings from Firestore (optional)
    let smtpOverride: any = undefined;
    try {
      const udoc = await admin.firestore().collection('users').doc(user.uid).get();
      if (udoc.exists) {
        const data = udoc.data() as any;
        const { smtpHost, smtpPort, smtpUser, smtpPass, smtpSecure } = data || {};
        if (smtpHost && smtpUser && smtpPass) {
          smtpOverride = { host: smtpHost, port: smtpPort ? Number(smtpPort) : 587, user: smtpUser, pass: smtpPass, secure: Boolean(smtpSecure) };
        }
      }
    } catch (e) {
      logger.error('Failed to read user SMTP settings', e instanceof Error ? e : new Error(String(e)), {
        userId: user?.uid,
      });
    }

    // Send to user
    // Update Firestore: pendingProfiles and users/{uid}/resumes
    const db = admin.firestore();
    // Find pendingProfile for this user and role
    let pendingProfileDoc: any = null;
    if (user?.uid && resume?.requestedRole) {
      const pendingSnap = await db.collection('pendingProfiles')
        .where('userId', '==', user.uid)
        .where('requestedRole', '==', resume.requestedRole)
        .where('status', 'in', ['requested', 'processing'])
        .limit(1).get();
      if (!pendingSnap.empty) pendingProfileDoc = pendingSnap.docs[0];
    }
    // Update pendingProfile with resume URLs and status
    if (pendingProfileDoc) {
      await pendingProfileDoc.ref.update({
        resumeURL: docxUrl,
        resumePDFURL: pdfUrl,
        status: 'completed',
        generatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    // Add resume to users/{uid}/resumes
    if (user?.uid) {
      const userResumesCol = db.collection('users').doc(user.uid).collection('resumes');
      await userResumesCol.add({
        role: resume.requestedRole || resume.role || '',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        resumeURL: docxUrl,
        resumePDFURL: pdfUrl,
        name: profile?.name || user.displayName || '',
        email: user.email || '',
        status: 'completed',
      });
    }
    const uploadResult = { docxUrl, pdfUrl };

    logger.info('Sending resume email to user', {
      userId: user?.uid,
      userEmail: user.email,
      attachmentsCount: attachments.length,
      hasPdf: !!pdfBuffer,
      hasDocx: !!docxBuffer,
    });

    await sendEmail({
      to: user.email,
      type: 'resume_generated',
      templateData: { name: profile?.name || user.displayName || '', role: resume.role || '' },
      attachments,
      smtp: smtpOverride,
    });

    logger.info('Resume email sent to user successfully', {
      userId: user?.uid,
      userEmail: user.email,
    });

    // Send copy to admin
    const adminTo = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.SMTP_USER || process.env.SMTP_FROM;
    if (adminTo) {
      logger.info('Sending resume copy to admin', {
        adminEmail: adminTo,
        userId: user?.uid,
      });
      await sendEmail({
        to: adminTo,
        type: 'resume_generated',
        templateData: { name: profile?.name || user.displayName || '', role: resume.role || '', userEmail: user.email },
        attachments,
      });
      logger.info('Resume copy sent to admin successfully', {
        adminEmail: adminTo,
      });
    }

    const totalTime = Date.now() - startTime;
    logger.info('Resume generation and email completed successfully', {
      userId: user?.uid,
      userEmail: user.email,
      totalTime,
      pdfUrl,
      docxUrl,
    });

    return { ok: true, uploadResult, generatedOnly: true };
  } catch (err: any) {
    const totalTime = Date.now() - startTime;
    logger.error('Failed to send resume email', err instanceof Error ? err : new Error(String(err)), {
      userId: user?.uid,
      userEmail: user?.email,
      totalTime,
    });
    return { ok: false, error: 'Resume email failed. Please try again later.' };
  }
};

/**
 * Server action: generate a PDF from provided HTML content using Puppeteer
 * @param htmlContent The full HTML content to print to PDF
 * @returns Base64-encoded PDF buffer
 */
export const generatePdfFromHtml = async (htmlContent: string): Promise<string> => {
  try {
    const { generatePdfFromHtml: serviceGeneratePdf } = await import('@/lib/resume-service-puppeteer');
    const pdfBuffer = await serviceGeneratePdf(htmlContent);
    // Handle both Buffer and Uint8Array
    const buffer = pdfBuffer instanceof Uint8Array 
      ? Buffer.from(pdfBuffer) 
      : (typeof pdfBuffer === 'object' && pdfBuffer !== null && 'toString' in pdfBuffer && typeof (pdfBuffer as any).toString === 'function'
        ? Buffer.from(pdfBuffer as any)
        : Buffer.from(pdfBuffer as any));
    return buffer.toString('base64');
  } catch (error) {
    logger.error('Failed to generate PDF from HTML via Puppeteer', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
};
