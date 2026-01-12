'use server';

/**
 * Server actions for complete resume generation flow
 * Handles: Profile fetch → Ollama generation → PDF/DOCX creation
 */

import { generateResumeFromProfile } from '@/lib/resume-generation-flow';
import { generateATSResumeHTML } from '@/lib/ats-resume-pdf-generator';
import { convertFirestoreToPlain } from '@/lib/utils';
import { logger } from '@/lib/logger';

/**
 * Generate resume from profile and return as PDF (base64)
 * Flow: Profile + ExtraRequirements → Ollama → ATS Resume JSON → HTML → PDF
 */
export async function generateResumeAsPDF(
  profileData: any,
  extraRequirements?: string,
  targetRole?: string
): Promise<string> {
  try {
    logger.info('Server action: generateResumeAsPDF started', {
      hasProfile: !!profileData,
      hasExtraRequirements: !!extraRequirements,
      targetRole,
    });

    // Step 1: Generate resume via Ollama
    const generationResult = await generateResumeFromProfile({
      profileData,
      extraRequirements,
      targetRole,
    });

    if (!generationResult.success || !generationResult.resume) {
      throw new Error(generationResult.error || 'Failed to generate resume');
    }

    logger.debug('Resume generated successfully', {
      hasSummary: !!generationResult.resume.summary,
      hasExperience: !!(generationResult.resume.experience && generationResult.resume.experience.length > 0),
    });

    // Step 2: Convert resume to ATS HTML
    const html = generateATSResumeHTML({
      resume: generationResult.resume,
      userProfile: generationResult.resume.userProfile,
      targetRole: targetRole,
    });

    logger.debug('ATS HTML generated', { htmlLength: html.length });

    // Step 3: Convert HTML to PDF using Puppeteer (server-side)
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

    logger.debug('PDF generated successfully', { pdfSize: pdfBuffer.length });

    // Step 4: Convert to base64
    const base64Pdf = Buffer.from(pdfBuffer).toString('base64');

    logger.info('generateResumeAsPDF completed successfully', {
      pdfSize: pdfBuffer.length,
      base64Length: base64Pdf.length,
    });

    return base64Pdf;
  } catch (error: any) {
    logger.error('generateResumeAsPDF failed', error instanceof Error ? error : new Error(String(error)), {
      errorMsg: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Generate resume from profile and return as DOCX (base64)
 * Flow: Profile + ExtraRequirements → Ollama → ATS Resume JSON → DOCX
 */
export async function generateResumeAsDOCX(
  profileData: any,
  extraRequirements?: string,
  targetRole?: string
): Promise<string> {
  try {
    logger.info('Server action: generateResumeAsDOCX started', {
      hasProfile: !!profileData,
      hasExtraRequirements: !!extraRequirements,
      targetRole,
    });

    // Step 1: Generate resume via Ollama
    const generationResult = await generateResumeFromProfile({
      profileData,
      extraRequirements,
      targetRole,
    });

    if (!generationResult.success || !generationResult.resume) {
      throw new Error(generationResult.error || 'Failed to generate resume');
    }

    logger.debug('Resume generated successfully', {
      hasSummary: !!generationResult.resume.summary,
      hasExperience: !!(generationResult.resume.experience && generationResult.resume.experience.length > 0),
    });

    // Step 2: Use the existing generateDocx function with the generated resume
    // The generateDocx function expects the resume object to have the ATS-formatted data
    const { generateDocx } = await import('@/app/actions/resume-actions');
    
    // Create a plain resume object from the generated resume data
    const resumeDataForDocx = {
      summary: generationResult.resume.summary,
      experience: generationResult.resume.experience,
      skills: generationResult.resume.skills,
      education: generationResult.resume.education,
      certifications: generationResult.resume.certifications,
      projects: generationResult.resume.projects,
      languages: generationResult.resume.languages,
      technicalTools: generationResult.resume.technicalTools,
      volunteer: generationResult.resume.volunteerWork,
      publications: generationResult.resume.publications,
      awards: generationResult.resume.awards,
      interests: generationResult.resume.interests,
    };

    const docxBuffer = await generateDocx(resumeDataForDocx, null, profileData);

    logger.debug('DOCX generated successfully', { docxSize: docxBuffer.length });

    // Step 3: Convert to base64
    const base64Docx = Buffer.from(docxBuffer, 'base64').toString('base64');

    logger.info('generateResumeAsDOCX completed successfully', {
      docxSize: docxBuffer.length,
      base64Length: base64Docx.length,
    });

    return base64Docx;
  } catch (error: any) {
    logger.error('generateResumeAsDOCX failed', error instanceof Error ? error : new Error(String(error)), {
      errorMsg: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Generate resume and return complete response with both formats
 * Useful for UI to show generation progress and handle both downloads
 */
export async function generateResumeComplete(
  profileData: any,
  extraRequirements?: string,
  targetRole?: string
): Promise<{
  success: boolean;
  pdf?: string;        // base64 PDF
  docx?: string;       // base64 DOCX
  resume?: any;        // Generated resume JSON
  profile?: any;       // Complete user profile
  error?: string;
}> {
  try {
    logger.info('Server action: generateResumeComplete started', {
      hasProfile: !!profileData,
      hasExtraRequirements: !!extraRequirements,
      targetRole,
    });

    // Generate resume
    const generationResult = await generateResumeFromProfile({
      profileData,
      extraRequirements,
      targetRole,
    });

    if (!generationResult.success || !generationResult.resume) {
      return {
        success: false,
        error: generationResult.error || 'Failed to generate resume',
      };
    }

    logger.debug('Resume generated, now generating formats...', {
      profileName: generationResult.resume.userProfile?.name,
    });

    try {
      // Generate PDF
      const html = generateATSResumeHTML({
        resume: generationResult.resume,
        userProfile: generationResult.resume.userProfile,
        targetRole: targetRole,
      });

      const puppeteer = await import('puppeteer');
      const browser = await puppeteer.default.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
        printBackground: true,
      });

      await browser.close();

      const pdf = Buffer.from(pdfBuffer).toString('base64');

      logger.debug('PDF generated', { pdfSize: pdfBuffer.length });

      // Generate DOCX using the existing generateDocx function
      const { generateDocx } = await import('@/app/actions/resume-actions');
      
      const resumeDataForDocx = {
        summary: generationResult.resume.summary,
        experience: generationResult.resume.experience,
        skills: generationResult.resume.skills,
        education: generationResult.resume.education,
        certifications: generationResult.resume.certifications,
        projects: generationResult.resume.projects,
        languages: generationResult.resume.languages,
        technicalTools: generationResult.resume.technicalTools,
        volunteer: generationResult.resume.volunteerWork,
        publications: generationResult.resume.publications,
        awards: generationResult.resume.awards,
        interests: generationResult.resume.interests,
      };

      const docxBase64 = await generateDocx(resumeDataForDocx, null, profileData);
      const docx = docxBase64; // Already in base64 format from generateDocx

      logger.debug('DOCX generated', { docxSize: docxBase64.length });

      return {
        success: true,
        pdf,
        docx,
        resume: generationResult.resume,
        profile: generationResult.resume.userProfile,
      };
    } catch (formatError: any) {
      // If format generation fails, still return the generated resume
      logger.warn('Format generation failed, returning resume only', {
        error: formatError.message,
      });

      return {
        success: true,
        resume: generationResult.resume,
        profile: generationResult.resume.userProfile,
        error: `Format generation warning: ${formatError.message}`,
      };
    }
  } catch (error: any) {
    logger.error('generateResumeComplete failed', error instanceof Error ? error : new Error(String(error)), {
      errorMsg: error instanceof Error ? error.message : String(error),
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
