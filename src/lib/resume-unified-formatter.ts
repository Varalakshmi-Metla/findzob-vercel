/**
 * Unified Resume Formatter
 * Generates consistent, professional resume formatting for both PDF and DOCX output
 * Uses official resume design standards for ATS compatibility and visual appeal
 */

export interface ResumeFormatterInput {
  // Header/Contact Info
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
  portfolioURL?: string;

  // Content Sections
  summary?: string;
  experience?: string; // Formatted string from AI or structured data
  skills?: string; // Comma-separated or formatted string
  education?: string;
  certifications?: string;
  projects?: string;
  languages?: string;
  technicalTools?: string;
  volunteerWork?: string;
  publications?: string;
  awards?: string;
  interests?: string;

  // Metadata
  role?: string;
}

/**
 * Generate official resume HTML for both PDF and DOCX output
 * Optimized for tight PDF formatting to fit content on single page
 * This HTML is designed to work well with both jsPDF and html-to-docx
 */
export function generateOfficialResumeHTML(input: ResumeFormatterInput): string {
  const contactInfo = generateContactLine(input);
  const hasLocation = !!(input.location && input.location.trim());

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${input.name || 'Resume'}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        html, body {
            width: 8.5in;
            height: 11in;
            margin: 0;
            padding: 0;
        }
        
        body {
            font-family: 'Calibri', 'Times New Roman', serif;
            font-size: 10.5pt;
            line-height: 1.1;
            color: #000;
            background: #fff;
            padding: 0.4in 0.45in;
            page-break-after: avoid;
        }
        
        @media print {
            html, body {
                width: 8.5in;
                height: 11in;
                margin: 0;
                padding: 0;
            }
            body {
                padding: 0.4in 0.45in;
            }
            .section {
                page-break-inside: avoid;
            }
        }
        
        /* Header/Contact Section */
        .header {
            text-align: center;
            margin-bottom: 5pt;
            border-bottom: 1pt solid #000;
            padding-bottom: 4pt;
            page-break-inside: avoid;
        }
        
        .name {
            font-family: Arial, sans-serif;
            font-size: 13pt;
            font-weight: bold;
            letter-spacing: 0.3pt;
            margin-bottom: 2pt;
            text-transform: uppercase;
        }
        
        .title {
            font-size: 9.5pt;
            font-weight: bold;
            margin-bottom: 1pt;
        }
        
        .contact-info {
            font-size: 9.5pt;
            line-height: 1.1;
            word-wrap: break-word;
        }
        
        .contact-info span {
            margin: 0 2pt;
        }
        
        /* Section Headers */
        section {
            margin-bottom: 4pt;
            page-break-inside: avoid;
        }
        
        h2 {
            font-family: Arial, sans-serif;
            font-size: 10pt;
            font-weight: bold;
            text-transform: uppercase;
            margin-bottom: 2pt;
            border-bottom: 1pt solid #000;
            padding-bottom: 1pt;
            page-break-inside: avoid;
        }
        
        /* Entry Styles */
        .entry {
            margin-bottom: 4pt;
            page-break-inside: avoid;
        }
        
        .entry-header {
            display: flex;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 2pt;
            margin-bottom: 1pt;
        }
        
        .entry-title {
            font-weight: bold;
            font-size: 10.5pt;
        }
        
        .entry-subtitle {
            font-style: italic;
            font-size: 10pt;
        }
        
        .entry-date {
            font-size: 9pt;
            text-align: right;
            white-space: nowrap;
        }
        
        .entry-description {
            font-size: 10pt;
            margin-bottom: 1pt;
            line-height: 1.1;
        }
        
        /* Lists */
        ul {
            margin-left: 0.22in;
            margin-bottom: 1pt;
            padding-left: 0.15in;
        }
        
        li {
            margin-bottom: 0.5pt;
            font-size: 10pt;
            line-height: 1.1;
        }
        
        /* Skills Section */
        .skills-container {
            margin-bottom: 2pt;
        }
        
        .skill-category {
            margin-bottom: 2pt;
        }
        
        .skill-category-name {
            font-weight: bold;
            font-size: 9.5pt;
            margin-bottom: 0.5pt;
        }
        
        .skill-items {
            font-size: 10pt;
            line-height: 1.1;
        }
        
        /* Inline Content */
        .inline-content {
            font-size: 10pt;
            line-height: 1.1;
            margin-bottom: 1pt;
        }
        
        /* Spacing */
        p {
            margin-bottom: 1pt;
            line-height: 1.1;
        }
    </style>
</head>
<body>
    ${generateHeaderSection(input)}
    ${input.summary ? generateSummarySection(input.summary) : ''}
    ${input.experience ? generateExperienceSection(input.experience) : ''}
    ${input.skills ? generateSkillsSection(input.skills) : ''}
    ${input.education ? generateEducationSection(input.education) : ''}
    ${input.certifications ? generateCertificationsSection(input.certifications) : ''}
    ${input.projects ? generateProjectsSection(input.projects) : ''}
    ${input.languages ? generateLanguagesSection(input.languages) : ''}
    ${input.technicalTools ? generateTechnicalToolsSection(input.technicalTools) : ''}
    ${input.volunteerWork ? generateVolunteerSection(input.volunteerWork) : ''}
    ${input.publications ? generatePublicationsSection(input.publications) : ''}
    ${input.awards ? generateAwardsSection(input.awards) : ''}
    ${input.interests ? generateInterestsSection(input.interests) : ''}
</body>
</html>`;
}

/**
 * Generate header section with name and contact info
 */
function generateHeaderSection(input: ResumeFormatterInput): string {
  const title = input.role ? `${input.role}` : '';
  const contactLine = generateContactLine(input);

  return `
    <div class="header">
        <div class="name">${escapeHtml(input.name || 'Your Name')}</div>
        ${title ? `<div class="title">${escapeHtml(title)}</div>` : ''}
        <div class="contact-info">${contactLine}</div>
    </div>`;
}

/**
 * Generate contact information line
 */
function generateContactLine(input: ResumeFormatterInput): string {
  const contacts: string[] = [];

  if (input.location?.trim()) {
    contacts.push(escapeHtml(input.location.trim()));
  }
  if (input.phone?.trim()) {
    contacts.push(escapeHtml(input.phone.trim()));
  }
  if (input.email?.trim()) {
    contacts.push(`<a href="mailto:${escapeHtml(input.email)}">${escapeHtml(input.email)}</a>`);
  }
  if (input.linkedin?.trim()) {
    const linkedinUrl = formatURL(input.linkedin);
    contacts.push(`<a href="${linkedinUrl}">LinkedIn</a>`);
  }
  if (input.github?.trim()) {
    const githubUrl = formatURL(input.github);
    contacts.push(`<a href="${githubUrl}">GitHub</a>`);
  }
  if (input.portfolioURL?.trim()) {
    const portfolioUrl = formatURL(input.portfolioURL);
    contacts.push(`<a href="${portfolioUrl}">Portfolio</a>`);
  }

  return contacts.map(c => `<span>${c}</span>`).join(' | ');
}

/**
 * Generate professional summary section
 */
function generateSummarySection(summary: string): string {
  if (!summary || !summary.trim()) return '';

  return `
    <section>
        <h2>Professional Summary</h2>
        <p class="entry-description">${escapeHtml(summary)}</p>
    </section>`;
}

/**
 * Generate experience section
 */
function generateExperienceSection(experience: string): string {
  if (!experience || !experience.trim()) return '';

  // Parse formatted experience string
  const entries = parseExperienceEntries(experience);

  if (entries.length === 0) {
    return `
    <section>
        <h2>Experience</h2>
        <p class="inline-content">${escapeHtml(experience)}</p>
    </section>`;
  }

  const html = entries
    .map(
      (entry) => `
    <div class="entry">
        <div class="entry-header">
            <div>
                <div class="entry-title">${escapeHtml(entry.title || 'Position')}</div>
                <div class="entry-subtitle">${escapeHtml(entry.company || 'Company')}</div>
            </div>
            <div class="entry-date">${escapeHtml(entry.date || '')}</div>
        </div>
        ${entry.bullets.length > 0 ? `<ul>${entry.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join('')}</ul>` : ''}
    </div>`
    )
    .join('');

  return `
    <section>
        <h2>Experience</h2>
        ${html}
    </section>`;
}

/**
 * Generate skills section with organization
 */
function generateSkillsSection(skills: string): string {
  if (!skills || !skills.trim()) return '';

  const skillLines = skills.split('\n').filter((s) => s.trim());

  if (skillLines.length === 0) return '';

  // Check if it's categorized (contains colons) or flat list
  const isCategorized = skillLines.some((line) => line.includes(':'));

  if (isCategorized) {
    const categories = skillLines
      .map((line) => {
        const [category, items] = line.split(':');
        return {
          category: category.trim(),
          items: items?.trim() || '',
        };
      })
      .filter((c) => c.category && c.items);

    return `
    <section>
        <h2>Skills</h2>
        <div class="skills-container">
            ${categories.map((cat) => `<div class="skill-category"><div class="skill-category-name">${escapeHtml(cat.category)}:</div><div class="skill-items">${escapeHtml(cat.items)}</div></div>`).join('')}
        </div>
    </section>`;
  } else {
    // Flat list - join all skills
    const allSkills = skillLines.join(', ');
    return `
    <section>
        <h2>Skills</h2>
        <p class="skill-items">${escapeHtml(allSkills)}</p>
    </section>`;
  }
}

/**
 * Generate education section
 */
function generateEducationSection(education: string): string {
  if (!education || !education.trim()) return '';

  const entries = parseEducationEntries(education);

  if (entries.length === 0) {
    return `
    <section>
        <h2>Education</h2>
        <p class="inline-content">${escapeHtml(education)}</p>
    </section>`;
  }

  const html = entries
    .map(
      (entry) => `
    <div class="entry">
        <div class="entry-header">
            <div>
                <div class="entry-title">${escapeHtml(entry.degree || 'Degree')}</div>
                <div class="entry-subtitle">${escapeHtml(entry.school || 'School')}</div>
            </div>
            <div class="entry-date">${escapeHtml(entry.year || '')}</div>
        </div>
    </div>`
    )
    .join('');

  return `
    <section>
        <h2>Education</h2>
        ${html}
    </section>`;
}

/**
 * Generate certifications section
 */
function generateCertificationsSection(certifications: string): string {
  if (!certifications || !certifications.trim()) return '';

  const entries = parseCertificationEntries(certifications);

  if (entries.length === 0) {
    return `
    <section>
        <h2>Certifications</h2>
        <p class="inline-content">${escapeHtml(certifications)}</p>
    </section>`;
  }

  return `
    <section>
        <h2>Certifications</h2>
        ${entries
          .map(
            (entry) => `
        <div class="entry">
            <div class="entry-title">${escapeHtml(entry.title || 'Certification')}</div>
            ${entry.issuer ? `<div class="entry-subtitle">${escapeHtml(entry.issuer)}</div>` : ''}
        </div>`
          )
          .join('')}
    </section>`;
}

/**
 * Generate projects section
 */
function generateProjectsSection(projects: string): string {
  if (!projects || !projects.trim()) return '';

  const entries = parseProjectEntries(projects);

  if (entries.length === 0) {
    return `
    <section>
        <h2>Projects</h2>
        <p class="inline-content">${escapeHtml(projects)}</p>
    </section>`;
  }

  const html = entries
    .map(
      (entry) => `
    <div class="entry">
        <div class="entry-title">${escapeHtml(entry.title || 'Project')}</div>
        ${entry.tech ? `<div class="entry-subtitle">Technologies: ${escapeHtml(entry.tech)}</div>` : ''}
        ${entry.description ? `<p class="entry-description">${escapeHtml(entry.description)}</p>` : ''}
    </div>`
    )
    .join('');

  return `
    <section>
        <h2>Projects</h2>
        ${html}
    </section>`;
}

/**
 * Generate languages section
 */
function generateLanguagesSection(languages: string): string {
  if (!languages || !languages.trim()) return '';

  return `
    <section>
        <h2>Languages</h2>
        <p class="inline-content">${escapeHtml(languages)}</p>
    </section>`;
}

/**
 * Generate technical tools section
 */
function generateTechnicalToolsSection(tools: string): string {
  if (!tools || !tools.trim()) return '';

  return `
    <section>
        <h2>Technical Tools & Platforms</h2>
        <p class="inline-content">${escapeHtml(tools)}</p>
    </section>`;
}

/**
 * Generate volunteer section
 */
function generateVolunteerSection(volunteer: string): string {
  if (!volunteer || !volunteer.trim()) return '';

  return `
    <section>
        <h2>Volunteer Work</h2>
        <p class="inline-content">${escapeHtml(volunteer)}</p>
    </section>`;
}

/**
 * Generate publications section
 */
function generatePublicationsSection(publications: string): string {
  if (!publications || !publications.trim()) return '';

  return `
    <section>
        <h2>Publications & Speaking</h2>
        <p class="inline-content">${escapeHtml(publications)}</p>
    </section>`;
}

/**
 * Generate awards section
 */
function generateAwardsSection(awards: string): string {
  if (!awards || !awards.trim()) return '';

  return `
    <section>
        <h2>Awards & Honors</h2>
        <p class="inline-content">${escapeHtml(awards)}</p>
    </section>`;
}

/**
 * Generate interests section
 */
function generateInterestsSection(interests: string): string {
  if (!interests || !interests.trim()) return '';

  return `
    <section>
        <h2>Interests</h2>
        <p class="inline-content">${escapeHtml(interests)}</p>
    </section>`;
}

/**
 * Parse experience entries from formatted string
 */
function parseExperienceEntries(
  experience: string
): Array<{ title: string; company: string; date: string; bullets: string[] }> {
  const entries: Array<{ title: string; company: string; date: string; bullets: string[] }> = [];

  // Try to parse structured format
  const sections = experience.split(/\n(?=\*\*|[A-Z])/);

  sections.forEach((section) => {
    const lines = section.split('\n').filter((l) => l.trim());
    if (lines.length === 0) return;

    let title = '';
    let company = '';
    let date = '';
    const bullets: string[] = [];

    lines.forEach((line, idx) => {
      const cleaned = line.replace(/^\*\*|\*\*$/g, '').trim();

      if (idx === 0) {
        // First line might be title or title | company
        if (cleaned.includes('|')) {
          const parts = cleaned.split('|');
          title = parts[0].trim();
          company = parts.slice(1).join('|').trim();
        } else {
          title = cleaned;
        }
      } else if (idx === 1 && !cleaned.startsWith('•')) {
        // Second line might be company or date
        if (cleaned.includes('—') || cleaned.match(/\d{4}/)) {
          date = cleaned;
        } else {
          company = cleaned;
        }
      } else if (cleaned.startsWith('•')) {
        bullets.push(cleaned.substring(1).trim());
      } else if (cleaned && !cleaned.startsWith('|')) {
        bullets.push(cleaned);
      }
    });

    if (title) {
      entries.push({ title, company, date, bullets });
    }
  });

  return entries;
}

/**
 * Parse education entries from formatted string
 */
function parseEducationEntries(education: string): Array<{ degree: string; school: string; year: string }> {
  const entries: Array<{ degree: string; school: string; year: string }> = [];

  const sections = education.split(/\n(?=[A-Z])/);

  sections.forEach((section) => {
    const lines = section.split('\n').filter((l) => l.trim());
    if (lines.length === 0) return;

    let degree = '';
    let school = '';
    let year = '';

    lines.forEach((line, idx) => {
      const cleaned = line.replace(/^\*\*|\*\*$/g, '').trim();

      if (cleaned.includes('|')) {
        const parts = cleaned.split('|');
        if (idx === 0) {
          degree = parts[0].trim();
          school = parts[1]?.trim() || '';
          year = parts[2]?.trim() || '';
        }
      } else if (idx === 0) {
        degree = cleaned;
      } else if (!year && cleaned.match(/\d{4}/)) {
        year = cleaned;
      } else if (!school && cleaned) {
        school = cleaned;
      }
    });

    if (degree) {
      entries.push({ degree, school, year });
    }
  });

  return entries;
}

/**
 * Parse certification entries
 */
function parseCertificationEntries(certifications: string): Array<{ title: string; issuer: string }> {
  return certifications
    .split(/\n|;/)
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return null;

      const parts = trimmed.split('—');
      return {
        title: parts[0].trim(),
        issuer: parts[1]?.trim() || '',
      };
    })
    .filter((e): e is { title: string; issuer: string } => e !== null);
}

/**
 * Parse project entries
 */
function parseProjectEntries(
  projects: string
): Array<{ title: string; tech: string; description: string }> {
  const entries: Array<{ title: string; tech: string; description: string }> = [];

  const sections = projects.split(/\n(?=\*\*|[A-Z])/);

  sections.forEach((section) => {
    const lines = section.split('\n').filter((l) => l.trim());
    if (lines.length === 0) return;

    let title = '';
    let tech = '';
    let description = '';

    lines.forEach((line, idx) => {
      const cleaned = line.replace(/^\*\*|\*\*$/g, '').trim();

      if (idx === 0) {
        title = cleaned.split('|')[0].trim();
      } else if (cleaned.includes('Technologies:') || cleaned.includes('Tech:')) {
        tech = cleaned.split(':')[1]?.trim() || '';
      } else if (!description && cleaned) {
        description = cleaned;
      }
    });

    if (title) {
      entries.push({ title, tech, description });
    }
  });

  return entries;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Format URL - add protocol if missing
 */
function formatURL(url: string): string {
  if (!url) return '#';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('www.')) return `https://${url}`;
  return `https://${url}`;
}
