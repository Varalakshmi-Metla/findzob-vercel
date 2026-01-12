/**
 * A4 PDF Resume Generator
 * Generates professional A4-sized resumes with proper formatting
 * Uses Puppeteer for server-side rendering when available, falls back to client-side jsPDF
 */

import { generateOfficialResumeHTML } from './resume-unified-formatter';
import { logger } from './logger';

/**
 * Server-side A4 PDF generation using Puppeteer
 * Produces high-quality text-based PDF that fits A4 page
 */
export async function generateA4ResumePDFServerSide(profile: any, role: string): Promise<Buffer> {
  const startTime = Date.now();
  
  logger.info('Starting server-side A4 PDF generation', {
    role,
    hasProfile: !!profile,
    profileName: profile?.name,
  });

  try {
    // Dynamic import to avoid SSR issues
    const puppeteer = await import('puppeteer');
    
    // Generate resume HTML
    const html = generateOfficialResumeHTML({
      name: profile?.name,
      email: profile?.email,
      phone: profile?.phone,
      location: profile?.location,
      linkedin: profile?.linkedin,
      github: profile?.github,
      portfolioURL: profile?.portfolioURL,
      role: role,
      summary: profile?.summary,
      experience: profile?.experience,
      skills: profile?.skills,
      education: profile?.education,
      certifications: profile?.certifications,
      projects: profile?.projects,
      languages: profile?.languages,
      technicalTools: profile?.technicalTools,
      volunteerWork: profile?.volunteerWork,
      publications: profile?.publications,
      awards: profile?.awards,
      interests: profile?.interests,
    });

    logger.debug('Resume HTML generated', {
      htmlLength: html.length,
      hasSummary: !!profile?.summary,
      hasExperience: !!(profile?.experience && profile.experience.length > 0),
    });

    // Create a complete HTML document with proper A4 styling
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${profile?.name || 'Resume'} - ${role}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    @page {
      size: A4;
      margin: 0;
      padding: 0;
    }
    
    @media print {
      body {
        margin: 0;
        padding: 0;
        width: 210mm;
        height: 297mm;
      }
      
      .resume-container {
        width: 210mm;
        height: 297mm;
        margin: 0;
        padding: 0;
        page-break-after: avoid;
        page-break-inside: avoid;
      }
    }
    
    body {
      width: 210mm;
      height: 297mm;
      margin: 0;
      padding: 0;
      font-family: 'Calibri', 'Arial', sans-serif;
      font-size: 10.5pt;
      line-height: 1.1;
      color: #333;
      background: white;
    }
    
    .resume-container {
      width: 210mm;
      height: 297mm;
      margin: 0 auto;
      padding: 0.4in;
      background: white;
      overflow: hidden;
    }
    
    /* Prevent page breaks */
    .section {
      page-break-inside: avoid;
      margin-bottom: 4pt;
    }
    
    /* All content fits on one page */
    h1, h2, h3 {
      orphans: 3;
      widows: 3;
    }
    
    p {
      orphans: 2;
      widows: 2;
    }
  </style>
</head>
<body>
  <div class="resume-container">
    ${html}
  </div>
</body>
</html>`;

    // Launch headless browser
    logger.debug('Launching Puppeteer browser');
    const browser = await puppeteer.default.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process', // Use in serverless environments
      ],
    });

    try {
      const page = await browser.newPage();
      
      // Set viewport to A4 size
      await page.setViewport({
        width: Math.round(210 * 3.78), // A4 width in pixels (210mm)
        height: Math.round(297 * 3.78), // A4 height in pixels (297mm)
        deviceScaleFactor: 1,
      });

      // Set content
      logger.debug('Setting HTML content');
      await page.setContent(fullHtml, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      // Generate PDF with proper A4 settings
      logger.debug('Generating PDF from page');
      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: {
          top: '0.4in',
          right: '0.4in',
          bottom: '0.4in',
          left: '0.4in',
        },
        printBackground: true,
        preferCSSPageSize: true,
      });

      await page.close();

      logger.info('A4 PDF generated successfully', {
        pdfSize: pdfBuffer.length,
        elapsedTime: Date.now() - startTime,
      });

      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  } catch (error) {
    const elapsed = Date.now() - startTime;
    logger.error('Server-side A4 PDF generation failed', error instanceof Error ? error : new Error(String(error)), {
      elapsed,
      role,
    });
    throw error;
  }
}

/**
 * Client-side A4 PDF generation fallback using jsPDF
 * Used when Puppeteer is not available or fails
 * Note: This is meant to be called from client-side, but exported for fallback use
 */
export function getClientSideA4PDFCode(): string {
  return `
    // Client-side A4 PDF generation using jsPDF and html2canvas
    async function generateA4ResumePDFClient(htmlContent, profileName, role) {
      try {
        const { jsPDF } = await import('jspdf');
        const html2canvas = (await import('html2canvas')).default;
        
        // Create a temporary container for rendering
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.left = '-10000px';
        container.style.top = '0';
        container.style.width = '210mm';
        container.style.height = '297mm';
        container.style.background = '#ffffff';
        container.style.padding = '14.4mm'; // 0.4in in mm
        container.innerHTML = htmlContent;
        document.body.appendChild(container);
        
        try {
          // Render HTML to canvas with high DPI
          const canvas = await html2canvas(container, {
            scale: 2,
            useCORS: true,
            logging: false,
            windowHeight: Math.round(297 * 3.78), // A4 height in pixels
            windowWidth: Math.round(210 * 3.78),   // A4 width in pixels
          });
          
          // Create PDF with A4 dimensions
          const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
          });
          
          const imgData = canvas.toDataURL('image/png');
          const imgWidth = 210 - (2 * 14.4); // A4 width minus margins
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          
          pdf.addImage(imgData, 'PNG', 14.4, 14.4, imgWidth, imgHeight);
          
          const fileName = \`\${profileName || 'user'}-resume-\${role.replace(/\\s+/g, '-')}.pdf\`;
          pdf.save(fileName);
          
          return { success: true, fileName };
        } finally {
          container.remove();
        }
      } catch (error) {
        console.error('Client-side PDF generation failed:', error);
        throw error;
      }
    }
  `;
}

/**
 * Generate A4 PDF with proper formatting for download
 * This is the main function to call - it handles both server and client scenarios
 */
export async function generateA4ResumePDF(profile: any, resume: any): Promise<string> {
  const role = resume?.role || 'Resume';
  
  logger.info('Starting A4 PDF generation', {
    role,
    profileName: profile?.name,
    method: 'server-side',
  });

  try {
    // Try server-side generation first (Puppeteer)
    const pdfBuffer = await generateA4ResumePDFServerSide(profile, role);
    const base64 = pdfBuffer.toString('base64');
    
    logger.debug('A4 PDF generated and encoded to base64', {
      base64Length: base64.length,
      role,
    });
    
    return base64;
  } catch (error) {
    logger.warn('Server-side PDF generation failed, returning client-side fallback instruction', {
      error: error instanceof Error ? error.message : String(error),
      role,
    });
    
    // Return a special marker that indicates client-side generation should be used
    throw new Error('PDF generation requires client-side rendering. Please regenerate the PDF.');
  }
}

/**
 * Generate A4-optimized HTML for resume that can be used in PDF generation
 * This HTML is designed to fit exactly on one A4 page
 */
export function generateA4OptimizedHTML(profile: any, resume: any): string {
  return generateOfficialResumeHTML({
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
    volunteerWork: resume?.volunteerWork,
    publications: resume?.publications,
    awards: resume?.awards,
    interests: resume?.interests,
  });
}
