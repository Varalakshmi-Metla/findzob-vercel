/**
 * Resume Formatter - Converts generated resume data to various formats
 */

import { GeneratedResume } from '@/lib/gemini-service';

export interface ResumeFormatOptions {
  includeRawJson?: boolean;
  theme?: 'professional' | 'modern' | 'minimal';
  pageSize?: 'a4' | 'letter';
}

/**
 * Convert generated resume to HTML
 */
export function generateResumeHTML(
  resume: GeneratedResume,
  options: ResumeFormatOptions = {}
): string {
  const { theme = 'professional' } = options;

  const styles = getThemeStyles(theme);

  // Build header if available
  const headerSections = [];
  if (resume.header) {
    const contactInfo = [];
    if (resume.header.name) contactInfo.push(`<strong>${escapeHtml(resume.header.name)}</strong>`);
    if (resume.header.email) contactInfo.push(`<a href="mailto:${escapeHtml(resume.header.email)}">${escapeHtml(resume.header.email)}</a>`);
    if (resume.header.phone) contactInfo.push(`<span>${escapeHtml(resume.header.phone)}</span>`);
    if (resume.header.linkedin) contactInfo.push(`<a href="${escapeHtml(resume.header.linkedin)}" target="_blank">LinkedIn</a>`);
    if (resume.header.github) contactInfo.push(`<a href="${escapeHtml(resume.header.github)}" target="_blank">GitHub</a>`);
    if (resume.header.portfolioURL) contactInfo.push(`<a href="${escapeHtml(resume.header.portfolioURL)}" target="_blank">Portfolio</a>`);

    if (contactInfo.length > 0) {
      headerSections.push(`
      <header class="header">
        <div class="contact-info">
          ${contactInfo.join(' | ')}
        </div>
      </header>
      `);
    }
  }

  const sections = [
    resume.summary && `<section class="section summary">
      <h2>Professional Summary</h2>
      <p>${escapeHtml(resume.summary)}</p>
    </section>`,

    resume.experience && `<section class="section experience">
      <h2>Work Experience</h2>
      <div class="content">
        ${resume.experience}
      </div>
    </section>`,

    resume.skills && `<section class="section skills">
      <h2>Skills</h2>
      <p>${escapeHtml(resume.skills)}</p>
    </section>`,

    resume.education && `<section class="section education">
      <h2>Education</h2>
      <div class="content">
        ${resume.education}
      </div>
    </section>`,

    resume.projects && resume.projects !== '' && `<section class="section projects">
      <h2>Projects</h2>
      <div class="content">
        ${resume.projects}
      </div>
    </section>`,

    resume.certifications && resume.certifications !== '' && `<section class="section certifications">
      <h2>Certifications</h2>
      <div class="content">
        ${resume.certifications}
      </div>
    </section>`,

    resume.languages && resume.languages !== '' && `<section class="section languages">
      <h2>Languages</h2>
      <p>${escapeHtml(resume.languages)}</p>
    </section>`,

    resume.volunteerWork && resume.volunteerWork !== '' && `<section class="section volunteer">
      <h2>Volunteer Work</h2>
      <div class="content">
        ${resume.volunteerWork}
      </div>
    </section>`,

    resume.publications && resume.publications !== '' && `<section class="section publications">
      <h2>Publications & Speaking</h2>
      <div class="content">
        ${resume.publications}
      </div>
    </section>`,

    resume.awards && resume.awards !== '' && `<section class="section awards">
      <h2>Awards & Honors</h2>
      <div class="content">
        ${resume.awards}
      </div>
    </section>`,

    resume.interests && resume.interests !== '' && `<section class="section interests">
      <h2>Interests</h2>
      <p>${escapeHtml(resume.interests)}</p>
    </section>`,
  ].filter(Boolean);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resume</title>
  <style>
    ${styles}
  </style>
</head>
<body>
  <main class="resume">
    ${headerSections.join('\n')}
    ${sections.join('\n')}
  </main>
</body>
</html>
  `;
}

/**
 * Convert generated resume to Markdown
 */
export function generateResumeMarkdown(resume: GeneratedResume): string {
  const sections: string[] = [];

  // Add header if available
  if (resume.header) {
    const contactInfo: string[] = [];
    if (resume.header.name) sections.push(`# ${resume.header.name}\n`);
    if (resume.header.email) contactInfo.push(`📧 ${resume.header.email}`);
    if (resume.header.phone) contactInfo.push(`📱 ${resume.header.phone}`);
    if (resume.header.linkedin) contactInfo.push(`🔗 [LinkedIn](${resume.header.linkedin})`);
    if (resume.header.github) contactInfo.push(`💻 [GitHub](${resume.header.github})`);
    if (resume.header.portfolioURL) contactInfo.push(`🌐 [Portfolio](${resume.header.portfolioURL})`);

    if (contactInfo.length > 0) {
      sections.push(`${contactInfo.join(' | ')}\n`);
    }
  }

  if (resume.summary) {
    sections.push(`## Professional Summary\n\n${resume.summary}\n`);
  }

  if (resume.experience) {
    sections.push(`## Work Experience\n\n${resume.experience}\n`);
  }

  if (resume.skills) {
    sections.push(`## Skills\n\n${resume.skills}\n`);
  }

  if (resume.education) {
    sections.push(`## Education\n\n${resume.education}\n`);
  }

  if (resume.projects && resume.projects !== '') {
    sections.push(`## Projects\n\n${resume.projects}\n`);
  }

  if (resume.certifications && resume.certifications !== '') {
    sections.push(`## Certifications\n\n${resume.certifications}\n`);
  }

  if (resume.languages && resume.languages !== '') {
    sections.push(`## Languages\n\n${resume.languages}\n`);
  }

  if (resume.volunteerWork && resume.volunteerWork !== '') {
    sections.push(`## Volunteer Work\n\n${resume.volunteerWork}\n`);
  }

  if (resume.publications && resume.publications !== '') {
    sections.push(`## Publications & Speaking\n\n${resume.publications}\n`);
  }

  if (resume.awards && resume.awards !== '') {
    sections.push(`## Awards & Honors\n\n${resume.awards}\n`);
  }

  if (resume.interests && resume.interests !== '') {
    sections.push(`## Interests\n\n${resume.interests}\n`);
  }

  return sections.join('\n---\n\n');
}

/**
 * Convert generated resume to plain text
 */
export function generateResumePlainText(resume: GeneratedResume): string {
  const sections: string[] = [];

  // Add header if available
  if (resume.header) {
    if (resume.header.name) {
      sections.push(`${'='.repeat(60)}`);
      sections.push(resume.header.name.toUpperCase());
      sections.push(`${'='.repeat(60)}\n`);
    }

    const contactInfo: string[] = [];
    if (resume.header.email) contactInfo.push(`Email: ${resume.header.email}`);
    if (resume.header.phone) contactInfo.push(`Phone: ${resume.header.phone}`);
    if (resume.header.linkedin) contactInfo.push(`LinkedIn: ${resume.header.linkedin}`);
    if (resume.header.github) contactInfo.push(`GitHub: ${resume.header.github}`);
    if (resume.header.portfolioURL) contactInfo.push(`Portfolio: ${resume.header.portfolioURL}`);

    if (contactInfo.length > 0) {
      sections.push(contactInfo.join('\n'));
      sections.push('\n');
    }
  }

  if (resume.summary) {
    sections.push(`PROFESSIONAL SUMMARY\n${'='.repeat(30)}\n${resume.summary}\n`);
  }

  if (resume.experience) {
    sections.push(`WORK EXPERIENCE\n${'='.repeat(30)}\n${resume.experience}\n`);
  }

  if (resume.skills) {
    sections.push(`SKILLS\n${'='.repeat(30)}\n${resume.skills}\n`);
  }

  if (resume.education) {
    sections.push(`EDUCATION\n${'='.repeat(30)}\n${resume.education}\n`);
  }

  if (resume.projects && resume.projects !== '') {
    sections.push(`PROJECTS\n${'='.repeat(30)}\n${resume.projects}\n`);
  }

  if (resume.certifications && resume.certifications !== '') {
    sections.push(`CERTIFICATIONS\n${'='.repeat(30)}\n${resume.certifications}\n`);
  }

  if (resume.languages && resume.languages !== '') {
    sections.push(`LANGUAGES\n${'='.repeat(30)}\n${resume.languages}\n`);
  }

  if (resume.volunteerWork && resume.volunteerWork !== '') {
    sections.push(`VOLUNTEER WORK\n${'='.repeat(30)}\n${resume.volunteerWork}\n`);
  }

  if (resume.publications && resume.publications !== '') {
    sections.push(`PUBLICATIONS & SPEAKING\n${'='.repeat(30)}\n${resume.publications}\n`);
  }

  if (resume.awards && resume.awards !== '') {
    sections.push(`AWARDS & HONORS\n${'='.repeat(30)}\n${resume.awards}\n`);
  }

  if (resume.interests && resume.interests !== '') {
    sections.push(`INTERESTS\n${'='.repeat(30)}\n${resume.interests}\n`);
  }

  return sections.join('\n');
}

/**
 * Export resume as JSON
 */
export function generateResumeJSON(resume: GeneratedResume): string {
  return JSON.stringify(resume, null, 2);
}

/**
 * Get CSS styles for different themes
 */
function getThemeStyles(theme: 'professional' | 'modern' | 'minimal'): string {
  const baseStyles = `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Calibri', 'Arial', sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
    }

    .resume {
      max-width: 8.5in;
      height: 11in;
      margin: 20px auto;
      padding: 0.5in;
      background-color: white;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
      page-break-after: always;
    }

    .header {
      margin-bottom: 1em;
      padding-bottom: 1em;
      border-bottom: 2px solid #333;
      text-align: center;
    }

    .header strong {
      font-size: 1.3em;
      display: block;
      margin-bottom: 0.3em;
      font-weight: bold;
    }

    .contact-info {
      font-size: 0.85em;
      line-height: 1.4;
      color: #555;
    }

    .contact-info a {
      color: #0066cc;
      text-decoration: none;
      margin: 0 0.2em;
    }

    .contact-info a:hover {
      text-decoration: underline;
    }

    .contact-info span {
      margin: 0 0.2em;
    }

    .section {
      margin-bottom: 1.5em;
    }

    h2 {
      font-size: 1.1em;
      font-weight: bold;
      margin-bottom: 0.5em;
      padding-bottom: 0.3em;
      border-bottom: 2px solid #333;
    }

    p {
      margin-bottom: 0.5em;
      font-size: 0.9em;
    }

    .content {
      font-size: 0.9em;
      line-height: 1.5;
    }

    @media print {
      body {
        background-color: white;
      }
      .resume {
        box-shadow: none;
        margin: 0;
        max-width: 100%;
        height: auto;
      }
      .contact-info a {
        color: #0066cc;
      }
    }
  `;

  const themeStyles: Record<string, string> = {
    professional: `
      ${baseStyles}
      h2 {
        color: #1a1a1a;
        border-color: #333;
      }
      .header {
        border-color: #333;
      }
    `,
    modern: `
      ${baseStyles}
      h2 {
        color: #0066cc;
        border-color: #0066cc;
      }
      .resume {
        border-left: 4px solid #0066cc;
      }
      .header {
        border-color: #0066cc;
      }
      .header strong {
        color: #0066cc;
      }
    `,
    minimal: `
      ${baseStyles}
      h2 {
        color: #555;
        border-color: #ddd;
        font-size: 1em;
      }
      .section {
        margin-bottom: 1em;
      }
      .header {
        border-color: #ddd;
      }
    `,
  };

  return themeStyles[theme] || themeStyles.professional;
}

/**
 * Escape HTML entities for safe display
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
