'use server';

/**
 * Server actions for downloading already-generated resumes
 * These take pre-generated resume data and convert to PDF/DOCX
 * (No regeneration from Ollama - just format conversion)
 */

import { generateATSResumeHTML } from '@/lib/ats-resume-pdf-generator';
import { logger } from '@/lib/logger';

/**
 * Download pre-generated resume as PDF (uses stored resume data)
 * No Ollama call - just format conversion
 */
export async function downloadResumeAsPDF(
  resumeData: any,
  targetRole?: string
): Promise<string> {
  try {
    logger.info('Server action: downloadResumeAsPDF started', {
      hasResume: !!resumeData,
      targetRole,
      hasSummary: !!resumeData?.summary,
      experienceCount: resumeData?.experience?.length || 0,
    });

    if (!resumeData) {
      throw new Error('Resume data is required');
    }

    // Step 1: Generate HTML from stored resume data
    const html = generateATSResumeHTML({
      resume: resumeData,
      userProfile: resumeData.header || {},
      targetRole,
    });

    logger.debug('ATS HTML generated from stored resume', { htmlLength: html.length });

    // Step 2: Convert HTML to PDF using Puppeteer (server-side)
    const puppeteer = await import('puppeteer');
    const browser = await puppeteer.default.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Set PDF options for A4
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
      printBackground: true,
    });

    await browser.close();

    logger.debug('PDF generated successfully from stored resume', { pdfSize: pdfBuffer.length });

    // Step 3: Convert to base64
    const base64Pdf = Buffer.from(pdfBuffer).toString('base64');

    logger.info('downloadResumeAsPDF completed successfully', {
      pdfSize: pdfBuffer.length,
      base64Length: base64Pdf.length,
    });

    return base64Pdf;
  } catch (error: any) {
    logger.error('downloadResumeAsPDF failed', error instanceof Error ? error : new Error(String(error)), {
      errorMsg: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Download pre-generated resume as DOCX (uses stored resume data)
 * No Ollama call - just format conversion
 */
export async function downloadResumeAsDOCX(
  resumeData: any,
  profileData?: any,
  targetRole?: string
): Promise<string> {
  try {
    logger.info('Server action: downloadResumeAsDOCX started', {
      hasResume: !!resumeData,
      targetRole,
      hasSummary: !!resumeData?.summary,
      experienceCount: resumeData?.experience?.length || 0,
    });

    if (!resumeData) {
      throw new Error('Resume data is required');
    }

    // Use the existing generateDocx function with the stored resume data
    const { generateDocx } = await import('@/app/actions/resume-actions');

    // Create a plain resume object from the stored resume data
    const resumeDataForDocx = {
      summary: resumeData.summary,
      experience: resumeData.experience,
      skills: resumeData.skills,
      education: resumeData.education,
      certifications: resumeData.certifications,
      projects: resumeData.projects,
      languages: resumeData.languages,
      technicalTools: resumeData.technicalTools,
      volunteer: resumeData.volunteerWork,
      publications: resumeData.publications,
      awards: resumeData.awards,
      interests: resumeData.interests,
    };

    const docxBuffer = await generateDocx(resumeDataForDocx, null, profileData);

    logger.debug('DOCX generated successfully from stored resume', { docxSize: docxBuffer.length });

    // Step 2: Convert to base64
    const base64Docx = Buffer.from(docxBuffer, 'base64').toString('base64');

    logger.info('downloadResumeAsDOCX completed successfully', {
      docxSize: docxBuffer.length,
      base64Length: base64Docx.length,
    });

    return base64Docx;
  } catch (error: any) {
    logger.error('downloadResumeAsDOCX failed', error instanceof Error ? error : new Error(String(error)), {
      errorMsg: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
