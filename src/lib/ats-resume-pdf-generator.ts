/**
 * Enhanced Resume PDF Generator
 * Creates professional ATS-optimized PDF from generated resume data
 */

import { logger } from './logger';

export interface ResumePDFInput {
  resume: any;           // Generated resume from Ollama
  userProfile: any;      // Complete user profile
  targetRole?: string;   // Target job role
}

/**
 * Safely ensure a value is an array
 */
function ensureArray(value: any): any[] {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (typeof value === 'string') return []; // Don't try to iterate strings
  if (typeof value === 'object') return [value]; // Single object, wrap in array
  return [];
}

/**
 * Generate HTML for ATS-optimized resume (from generated data)
 */
export function generateATSResumeHTML(input: ResumePDFInput): string {
  const { resume, userProfile } = input;

  // Build contact section
  const contactInfo = [
    userProfile?.name,
    userProfile?.email,
    userProfile?.phone,
    userProfile?.linkedin && `LinkedIn: ${userProfile.linkedin}`,
    userProfile?.github && `GitHub: ${userProfile.github}`,
    userProfile?.portfolioURL && `Portfolio: ${userProfile.portfolioURL}`,
  ]
    .filter(Boolean)
    .join(' | ');

  // Build summary/objective
  const summary = resume?.summary || '';

  // Build experience section - safely ensure it's an array
  const experienceHTML = ensureArray(resume?.experience)
    .map(
      (exp: any) => `
    <div class="resume-section-item">
      <div class="item-header">
        <div class="item-title">${exp.role || 'Position'}</div>
        <div class="item-date">${exp.duration || 'Date'}</div>
      </div>
      <div class="item-company">${exp.company || 'Company'}</div>
      <div class="item-description">${exp.description || ''}</div>
    </div>
  `
    )
    .join('');

  // Build education section - safely ensure it's an array
  const educationHTML = ensureArray(resume?.education)
    .map(
      (edu: any) => `
    <div class="resume-section-item">
      <div class="item-header">
        <div class="item-title">${edu.degree || 'Degree'}</div>
        <div class="item-date">${edu.year || 'Year'}</div>
      </div>
      <div class="item-university">${edu.university || 'University'}</div>
    </div>
  `
    )
    .join('');

  // Build skills section - safely ensure it's an array
  const skillsText = ensureArray(resume?.skills)
    .map((skill: any) => (typeof skill === 'string' ? skill : skill.name || ''))
    .filter(Boolean)
    .join(', ');

  // Build projects section - safely ensure it's an array
  const projectsHTML = ensureArray(resume?.projects)
    .map(
      (proj: any) => `
    <div class="resume-section-item">
      <div class="item-header">
        <div class="item-title">${proj.title || 'Project'}</div>
        <div class="item-tech">${proj.tech || ''}</div>
      </div>
      <div class="item-description">${proj.description || ''}</div>
    </div>
  `
    )
    .join('');

  // Build certifications section - safely ensure it's an array
  const certificationsHTML = ensureArray(resume?.certifications)
    .map((cert: any) => `<div class="resume-section-item">${cert.title || ''} - ${cert.issuer || ''}</div>`)
    .join('');

  // Build languages section - safely ensure it's an array
  const languagesText = ensureArray(resume?.languages)
    .map((lang: any) => (typeof lang === 'string' ? lang : lang.language || ''))
    .filter(Boolean)
    .join(', ');

  // Build technical tools section - safely ensure it's an array
  const toolsText = ensureArray(resume?.technicalTools)
    .map((tool: any) => (typeof tool === 'string' ? tool : tool.tool || ''))
    .filter(Boolean)
    .join(', ');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Resume - ${userProfile?.name || 'Professional'}</title>
      <style>
        @page {
          size: A4;
          margin: 10mm;
        }
        
        body {
          font-family: 'Calibri', 'Segoe UI', sans-serif;
          font-size: 11pt;
          line-height: 1.4;
          color: #333;
          margin: 0;
          padding: 10mm;
          width: 190mm;
          height: 277mm;
        }

        h1 {
          font-size: 18pt;
          font-weight: bold;
          margin: 0 0 2pt 0;
          text-align: center;
          color: #1a1a1a;
        }

        .contact-info {
          text-align: center;
          font-size: 10pt;
          margin-bottom: 8pt;
          color: #555;
        }

        .contact-info-item {
          display: inline;
          margin: 0 3pt;
        }

        h2 {
          font-size: 12pt;
          font-weight: bold;
          margin: 8pt 0 4pt 0;
          padding-bottom: 2pt;
          border-bottom: 1pt solid #333;
          text-transform: uppercase;
          color: #1a1a1a;
        }

        .resume-section {
          margin-bottom: 8pt;
        }

        .resume-section-item {
          margin-bottom: 6pt;
          page-break-inside: avoid;
        }

        .item-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 2pt;
        }

        .item-title {
          font-weight: bold;
          font-size: 11pt;
        }

        .item-date,
        .item-tech {
          text-align: right;
          font-size: 10pt;
          color: #666;
          font-style: italic;
        }

        .item-company,
        .item-university {
          font-weight: 600;
          font-size: 10.5pt;
          color: #1a1a1a;
          margin-bottom: 1pt;
        }

        .item-description {
          font-size: 10pt;
          line-height: 1.3;
          color: #333;
          margin-left: 8pt;
          white-space: pre-wrap;
          word-wrap: break-word;
        }

        .skills-list,
        .languages-list,
        .tools-list {
          font-size: 10pt;
          line-height: 1.4;
          color: #333;
          margin-left: 8pt;
        }

        .summary {
          font-size: 10.5pt;
          line-height: 1.4;
          color: #333;
          margin-bottom: 6pt;
          margin-left: 8pt;
          text-align: justify;
        }

        p {
          margin: 0;
        }

        ul {
          margin: 2pt 0 2pt 8pt;
          padding: 0;
          font-size: 10pt;
        }

        li {
          margin-bottom: 1pt;
        }

        .no-section {
          font-size: 10pt;
          color: #999;
          font-style: italic;
          margin-left: 8pt;
        }

        /* Print optimization */
        @media print {
          body {
            margin: 0;
            padding: 10mm;
          }
        }
      </style>
    </head>
    <body>
      <h1>${userProfile?.name || 'Professional Resume'}</h1>
      
      <div class="contact-info">
        ${contactInfo}
      </div>

      ${
        summary
          ? `
        <h2>Professional Summary</h2>
        <div class="summary">${summary}</div>
      `
          : ''
      }

      ${
        experienceHTML
          ? `
        <h2>Professional Experience</h2>
        <div class="resume-section">${experienceHTML}</div>
      `
          : '<h2>Professional Experience</h2><div class="no-section">No experience data provided</div>'
      }

      ${
        educationHTML
          ? `
        <h2>Education</h2>
        <div class="resume-section">${educationHTML}</div>
      `
          : ''
      }

      ${
        skillsText
          ? `
        <h2>Skills</h2>
        <div class="skills-list">${skillsText}</div>
      `
          : ''
      }

      ${
        projectsHTML
          ? `
        <h2>Projects</h2>
        <div class="resume-section">${projectsHTML}</div>
      `
          : ''
      }

      ${
        certificationsHTML
          ? `
        <h2>Certifications</h2>
        <div class="resume-section">${certificationsHTML}</div>
      `
          : ''
      }

      ${
        languagesText
          ? `
        <h2>Languages</h2>
        <div class="languages-list">${languagesText}</div>
      `
          : ''
      }

      ${
        toolsText
          ? `
        <h2>Technical Tools & Platforms</h2>
        <div class="tools-list">${toolsText}</div>
      `
          : ''
      }

      ${
        ensureArray(resume?.volunteerWork).length > 0
          ? `
        <h2>Volunteer Work</h2>
        <div class="resume-section">${ensureArray(resume?.volunteerWork)
          .map((vol: any) => `
    <div class="resume-section-item">
      <div class="item-header">
        <div class="item-title">${vol.role || 'Position'}</div>
        <div class="item-date">${vol.duration || 'Date'}</div>
      </div>
      <div class="item-company">${vol.organization || 'Organization'}</div>
      <div class="item-description">${vol.description || ''}</div>
    </div>
  `)
          .join('')}</div>
      `
          : ''
      }

      ${
        ensureArray(resume?.publications).length > 0
          ? `
        <h2>Publications</h2>
        <div class="resume-section">${ensureArray(resume?.publications)
          .map((pub: any) => `
    <div class="resume-section-item">
      <div class="item-header">
        <div class="item-title">${pub.title || 'Publication'}</div>
        <div class="item-date">${pub.date || ''}</div>
      </div>
      <div class="item-company">${pub.publication || ''}</div>
    </div>
  `)
          .join('')}</div>
      `
          : ''
      }

      ${
        ensureArray(resume?.awards).length > 0
          ? `
        <h2>Awards & Honors</h2>
        <div class="resume-section">${ensureArray(resume?.awards)
          .map((award: any) => `
    <div class="resume-section-item">
      <div class="item-header">
        <div class="item-title">${award.title || 'Award'}</div>
        <div class="item-date">${award.date || ''}</div>
      </div>
      <div class="item-company">${award.organization || ''}</div>
    </div>
  `)
          .join('')}</div>
      `
          : ''
      }

      ${
        resume?.interests
          ? `
        <h2>Interests</h2>
        <div class="summary">${resume.interests}</div>
      `
          : ''
      }
    </body>
    </html>
  `;

  return html;
}

/**
 * Generate ATS-optimized resume DOCX from generated data
 * Note: This function is kept for compatibility but the server action uses the existing generateDocx
 * which has proper DOCX library dependencies
 */
export async function generateATSResumeDOCX(input: ResumePDFInput): Promise<Buffer> {
  throw new Error('Use the server action generateResumeAsDOCX instead, which uses the proper DOCX generator');
}
