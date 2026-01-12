/**
 * Modern ATS-Optimized Resume Template
 * Designed for maximum ATS parsing compatibility while maintaining professional appearance
 * Follows best practices: minimal styling, clear hierarchy, no tables, standard fonts
 */

export interface UserProfile {
  name?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  github?: string;
  portfolioURL?: string;
  address?: string;
  citizenship?: string;
  gender?: string;
  dateOfBirth?: string;
  skills?: string[];
  experience?: Array<{ company: string; role: string; duration: string; description?: string }>;
  education?: Array<{ degree: string; university: string; year?: string; duration?: string }>;
  projects?: Array<{ title: string; tech: string; description?: string }>;
  certifications?: Array<{ title: string; issuer: string }>;
  languages?: Array<{ language: string; proficiency: string }>;
  technicalTools?: string[];
  volunteerWork?: Array<{ role: string; organization: string; duration: string; description?: string }>;
  publications?: Array<{ title: string; publication: string; date: string }>;
  awards?: Array<{ title: string; organization: string; date: string }>;
  interests?: string;
}

export interface GeneratedResume {
  summary?: string;
  skills?: string;
  experience?: string;
  projects?: string;
  education?: string;
  certifications?: string;
  languages?: string;
  volunteer?: string;
  publications?: string;
  awards?: string;
  interests?: string;
  role?: string;
}

class ATSResumeGenerator {
  /**
   * Generate ATS-optimized HTML resume
   * Uses clean, semantic HTML with minimal styling
   */
  static generateHTML(profile: UserProfile, generatedResume: GeneratedResume): string {
    const contactInfo = this.generateContactInfo(profile);
    const summary = this.generateSummary(generatedResume.summary);
    // Use AI-generated experience string if available, otherwise fall back to profile data
    const experience = generatedResume.experience 
      ? this.generateExperienceFromString(generatedResume.experience)
      : this.generateExperience(profile.experience);
    // Use AI-generated education string if available
    const education = generatedResume.education
      ? this.generateEducationFromString(generatedResume.education)
      : this.generateEducation(profile.education);
    // Use AI-generated skills string if available
    const skills = generatedResume.skills
      ? this.generateSkillsFromString(generatedResume.skills)
      : this.generateSkills(profile.skills);
    // Use AI-generated projects string if available
    const projects = generatedResume.projects
      ? this.generateProjectsFromString(generatedResume.projects)
      : this.generateProjects(profile.projects);
    const certifications = this.generateCertifications(profile.certifications);
    const languages = this.generateLanguages(profile.languages);
    const volunteer = this.generateVolunteer(profile.volunteerWork);
    const publications = generatedResume.publications 
      ? this.generatePublicationsFromString(generatedResume.publications)
      : this.generatePublications(profile.publications);
    const awards = generatedResume.awards
      ? this.generateAwardsFromString(generatedResume.awards)
      : this.generateAwards(profile.awards);
    const technicalTools = this.generateTechnicalTools(profile.technicalTools);
    const interests = generatedResume.interests 
      ? this.generateInterestsFromString(generatedResume.interests)
      : this.generateInterests(profile.interests);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${profile.name || 'Resume'}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        html {
            width: 8.5in;
            height: 11in;
        }
        
        body {
            font-family: 'Times New Roman', Times, serif;
            font-size: 16px;
            line-height: 1.25;
            color: #000;
            background: #fff;
            padding: 0.43in;
            max-width: 8.5in;
            width: 8.5in;
            height: 11in;
            margin: 0;
            overflow: hidden;
            text-rendering: optimizeLegibility;
            -webkit-font-smoothing: antialiased;
        }
        
        @media print {
            html, body {
                width: 8.5in;
                height: 11in;
                margin: 0;
                padding: 0.4in;
            }
            body {
                padding: 0.4in;
            }
        }
        
        /* Header Styles */
        .header {
            margin-bottom: 0.15in;
            padding-bottom: 0.1in;
            border-bottom: 1.5px solid #000;
            text-align: center;
            page-break-inside: avoid;
        }
        
        .name {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 5px;
            letter-spacing: 0.3px;
            text-transform: uppercase;
        }
        
        .title {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 12px;
            color: #000;
            margin-bottom: 3px;
            font-weight: normal;
        }
        
        .contact-info {
            font-size: 14px;
            color: #000;
            line-height: 1.25;
            margin-top: 5px;
            word-break: break-word;
        }
        
        .contact-item {
            display: inline;
            margin: 0 0.2em;
        }
        
        .contact-item:not(:last-child)::after {
            content: " | ";
            margin: 0 0.1em;
            color: #000;
        }
        
        .contact-item a {
            color: #000;
            text-decoration: none;
        }
        
        /* Section Styles */
        section {
            margin-top: 0.08in;
            margin-bottom: 0.04in;
            page-break-inside: avoid;
        }
        
        section h2 {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 13px;
            font-weight: bold;
            margin-bottom: 0.07in;
            padding-bottom: 0.05in;
            border-bottom: 1px solid #000;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        
        /* Entry Styles */
        .entry {
            margin-bottom: 0.07in;
            line-height: 1.2;
            page-break-inside: avoid;
        }
        
        .entry-header {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            margin-bottom: 0.04in;
            flex-wrap: wrap;
        }
        
        .entry-title {
            font-weight: bold;
            font-size: 16px;
            color: #000;
            flex-grow: 1;
        }
        
        .entry-subtitle {
            font-weight: normal;
            font-size: 16px;
            color: #000;
            font-style: italic;
            flex-shrink: 0;
            margin-left: 0.08in;
        }
        
        .entry-date {
            font-size: 14px;
            color: #000;
            white-space: nowrap;
            font-style: italic;
            flex-shrink: 0;
            margin-left: 0.08in;
        }
        
        .entry-location {
            font-size: 10px;
            color: #000;
            font-style: italic;
            width: 100%;
        }
        
        .entry-description {
            font-size: 16px;
            margin-top: 0.07in;
            line-height: 1.25;
            text-align: left;
        }
        
        .bullet-list {
            margin-left: 0.15in;
            margin-top: 0.01in;
            margin-bottom: 0.01in;
            list-style: none;
            padding-left: 0;
            page-break-inside: avoid;
        }
        
        .bullet-list li {
            margin-bottom: 0.07in;
            padding-left: 0.18in;
            text-indent: -0.18in;
            line-height: 1.25;
            text-align: left;
            font-size: 16px;
        }
        
        .bullet-list li:before {
            content: "• ";
            font-weight: normal;
            margin-right: 0.07in;
        }
        
        /* Skills Section */
        .skills-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0.09in;
            font-size: 16px;
        }
        
        .skills-category {
            margin-bottom: 0.06in;
            page-break-inside: avoid;
        }
        
        .skills-category-title {
            font-weight: bold;
            margin-bottom: 0.04in;
            font-size: 16px;
        }
        
        .skills-list {
            font-size: 16px;
            line-height: 1.25;
        }
        
        /* Projects Section */
        .project-entry {
            margin-bottom: 0.07in;
            page-break-inside: avoid;
        }
        
        .project-title {
            font-weight: bold;
            font-size: 16px;
        }
        
        .project-tech {
            color: #000;
            font-size: 16px;
            font-style: italic;
        }
        
        /* Education Section */
        .education-entry {
            margin-bottom: 0.06in;
            page-break-inside: avoid;
        }
        
        .degree {
            font-weight: bold;
            font-size: 16px;
        }
        
        .school {
            font-weight: normal;
            font-size: 16px;
            color: #000;
            font-style: italic;
        }
        
        /* Certifications */
        .cert-entry {
            margin-bottom: 0.06in;
            page-break-inside: avoid;
        }
        
        .cert-title {
            font-weight: bold;
            font-size: 16px;
        }
        
        .cert-issuer {
            color: #000;
            font-size: 16px;
            font-style: italic;
        }
        
        /* Languages */
        .language-entry {
            margin-bottom: 0.05in;
            font-size: 16px;
        }
        
        /* Publications */
        .publication-entry {
            margin-bottom: 0.06in;
            page-break-inside: avoid;
        }
        
        .publication-title {
            font-weight: bold;
            font-size: 16px;
        }
        
        .publication-info {
            color: #000;
            font-size: 16px;
            font-style: italic;
        }
        
        /* Awards */
        .award-entry {
            margin-bottom: 0.06in;
            page-break-inside: avoid;
        }
        
        .award-title {
            font-weight: bold;
            font-size: 16px;
        }
        
        .award-info {
            color: #000;
            font-size: 16px;
            font-style: italic;
        }
        
        /* Technical Tools */
        .tools-list {
            font-size: 16px;
            line-height: 1.25;
        }
        
        /* Interests */
        .interests-text {
            font-size: 16px;
            line-height: 1.25;
        }
    </style>
</head>
<body>
    ${contactInfo}
    ${summary}
    ${experience}
    ${education}
    ${skills}
    ${projects}
    ${certifications}
    ${languages}
    ${publications}
    ${awards}
    ${technicalTools}
    ${interests}
    ${volunteer}
</body>
</html>`;

    return html;
  }

  private static generateContactInfo(profile: UserProfile): string {
    const name = profile.name || '';
    const role = profile.name ? '' : ''; // Role can be added if needed
    
    const contacts: string[] = [];
    if (profile.phone) contacts.push(`<span class="contact-item">${this.escapeHtml(profile.phone)}</span>`);
    if (profile.email) contacts.push(`<span class="contact-item"><a href="mailto:${this.escapeHtml(profile.email)}">${this.escapeHtml(profile.email)}</a></span>`);
    if (profile.linkedin) {
      const linkedinUrl = profile.linkedin.startsWith('http') ? profile.linkedin : `https://${profile.linkedin}`;
      contacts.push(`<span class="contact-item"><a href="${this.escapeHtml(linkedinUrl)}" target="_blank">LinkedIn</a></span>`);
    }
    if (profile.github) {
      const githubUrl = profile.github.startsWith('http') ? profile.github : `https://${profile.github}`;
      contacts.push(`<span class="contact-item"><a href="${this.escapeHtml(githubUrl)}" target="_blank">GitHub</a></span>`);
    }
    if (profile.portfolioURL) {
      const portfolioUrl = profile.portfolioURL.startsWith('http') ? profile.portfolioURL : `https://${profile.portfolioURL}`;
      contacts.push(`<span class="contact-item"><a href="${this.escapeHtml(portfolioUrl)}" target="_blank">Portfolio</a></span>`);
    }

    return `
        <div class="header">
            <div class="name">${this.escapeHtml(name)}</div>
            ${role ? `<div class="title">${this.escapeHtml(role)}</div>` : ''}
            <div class="contact-info">
                ${contacts.join('')}
            </div>
        </div>
    `;
  }

  private static generateSummary(summary?: string): string {
    if (!summary || !summary.trim()) return '';
    return `
        <section>
            <h2>Professional Summary</h2>
            <p style="margin-top: 0.07in; font-size: 16px; line-height: 1.25; text-align: justify;">
                ${this.escapeHtml(summary)}
            </p>
        </section>
    `;
  }

  private static generateExperience(experience?: Array<{ company: string; role: string; duration: string; description?: string }>): string {
    if (!experience || experience.length === 0) return '';

    const entries = experience.map(job => {
      // Parse description if it contains bullet points
      let descriptionHtml = '';
      if (job.description) {
        const descLines = job.description.split('\n').filter(l => l.trim());
        const bullets: string[] = [];
        const paragraphs: string[] = [];
        
        descLines.forEach(line => {
          const trimmed = line.trim();
          if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
            bullets.push(trimmed.replace(/^[•\-]\s*/, ''));
          } else if (trimmed) {
            paragraphs.push(trimmed);
          }
        });
        
        if (bullets.length > 0) {
          descriptionHtml = `<ul class="bullet-list">${bullets.map(b => `<li>${this.escapeHtml(b)}</li>`).join('')}</ul>`;
        } else if (paragraphs.length > 0) {
          descriptionHtml = `<div class="entry-description">${paragraphs.map(p => `<p>${this.escapeHtml(p)}</p>`).join('')}</div>`;
        }
      }
      
      return `
        <div class="entry">
            <div class="entry-header">
                <div>
                    <span class="entry-title">${this.escapeHtml(job.role)}</span>
                    <span style="margin: 0 0.18in;">|</span>
                    <span class="entry-subtitle">${this.escapeHtml(job.company)}</span>
                </div>
                <span class="entry-date">${this.escapeHtml(job.duration)}</span>
            </div>
            ${descriptionHtml}
        </div>
      `;
    }).join('');

    return `
        <section>
            <h2>Professional Experience</h2>
            ${entries}
        </section>
    `;
  }

  private static generateExperienceFromString(experienceStr?: string): string {
    if (!experienceStr || !experienceStr.trim()) return '';

    // Parse the formatted experience string from AI
    const lines = experienceStr.split('\n').filter(line => line.trim());
    const entries: string[] = [];
    let currentEntry = '';
    let currentBullets: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      
      // Check if it's a job header (contains **bold** title, company, and duration)
      const headerMatch = trimmed.match(/\*\*([^*]+)\*\*\s*\|\s*([^|]+)\s*\|\s*(.+)/);
      if (headerMatch) {
        // Save previous entry if exists
        if (currentEntry) {
          entries.push(`
            <div class="entry">
              ${currentEntry}
              ${currentBullets.length > 0 ? `
                <ul class="bullet-list">
                  ${currentBullets.map(bullet => `<li>${this.escapeHtml(bullet.replace(/^[•\-]\s*/, ''))}</li>`).join('')}
                </ul>
              ` : ''}
            </div>
          `);
        }
        // Start new entry
        currentEntry = `
          <div class="entry-header">
            <div>
              <span class="entry-title">${this.escapeHtml(headerMatch[1].trim())}</span>
              <span style="margin: 0 0.18in;">|</span>
              <span class="entry-subtitle">${this.escapeHtml(headerMatch[2].trim())}</span>
            </div>
            <span class="entry-date">${this.escapeHtml(headerMatch[3].trim())}</span>
          </div>
        `;
        currentBullets = [];
      } else if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
        // It's a bullet point
        currentBullets.push(trimmed);
      } else if (trimmed && !trimmed.match(/^#+\s/)) {
        // Regular text line (not a markdown header)
        if (!currentEntry) {
          // If no header yet, treat as header
          currentEntry = `<div class="entry-header"><div><span class="entry-title">${this.escapeHtml(trimmed)}</span></div></div>`;
        } else {
          currentBullets.push(trimmed);
        }
      }
    }

    // Add last entry
    if (currentEntry) {
      entries.push(`
        <div class="entry">
          ${currentEntry}
          ${currentBullets.length > 0 ? `
            <ul class="bullet-list">
              ${currentBullets.map(bullet => `<li>${this.escapeHtml(bullet.replace(/^[•\-]\s*/, ''))}</li>`).join('')}
            </ul>
          ` : ''}
        </div>
      `);
    }

    if (entries.length === 0) {
      // Fallback: just display the string as-is with basic formatting
      const formatted = lines.map(line => {
        if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
          return `<div style="margin-left: 0.23in; padding-left: 0.18in; text-indent: -0.18in; margin-bottom: 0.06in; line-height: 1.2;">
            <span style="font-weight: bold;">• </span>${this.escapeHtml(line.trim().replace(/^[•\-]\s*/, ''))}
          </div>`;
        }
        return `<div style="margin-bottom: 0.08in; font-weight: bold;">${this.escapeHtml(line)}</div>`;
      }).join('');
      
      return `
        <section>
          <h2>Professional Experience</h2>
          ${formatted}
        </section>
      `;
    }

    return `
      <section>
        <h2>Professional Experience</h2>
        ${entries.join('')}
      </section>
    `;
  }

  private static generateEducationFromString(educationStr?: string): string {
    if (!educationStr || !educationStr.trim()) return '';

    const lines = educationStr.split('\n').filter(line => line.trim());
    const entries = lines.map(line => {
      // Parse format: **Degree** | University | Year
      const match = line.match(/\*\*([^*]+)\*\*\s*\|\s*([^|]+)\s*\|\s*(.+)/);
      if (match) {
        return `
          <div class="education-entry">
            <div class="entry-header">
              <div>
                <span class="degree">${this.escapeHtml(match[1].trim())}</span>
                <span style="margin: 0 0.13in;">|</span>
                <span class="school">${this.escapeHtml(match[2].trim())}</span>
              </div>
              <span class="entry-date">${this.escapeHtml(match[3].trim())}</span>
            </div>
          </div>
        `;
      }
      // Fallback: just display the line
      return `<div class="education-entry">${this.escapeHtml(line)}</div>`;
    }).join('');

    return `
      <section>
        <h2>Education</h2>
        ${entries}
      </section>
    `;
  }

  private static generateSkillsFromString(skillsStr?: string): string {
    if (!skillsStr || !skillsStr.trim()) return '';

    // Skills are typically comma-separated
    const skillsList = skillsStr.split(',').map(s => s.trim()).filter(s => s);
    
    return `
      <section>
        <h2>Technical Skills</h2>
        <p style="margin-top: 0.05in; font-size: 10.5pt; line-height: 1.3;">
          ${skillsList.map(s => this.escapeHtml(s)).join(' • ')}
        </p>
      </section>
    `;
  }

  private static generateProjectsFromString(projectsStr?: string): string {
    if (!projectsStr || !projectsStr.trim()) return '';

    const lines = projectsStr.split('\n').filter(line => line.trim());
    const entries: string[] = [];
    let currentProject = '';
    let currentDescription: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      
      // Check if it's a project header (contains **bold** title and technologies)
      const headerMatch = trimmed.match(/\*\*([^*]+)\*\*\s*\|\s*Technologies:\s*(.+)/i);
      if (headerMatch) {
        // Save previous project if exists
        if (currentProject) {
          entries.push(`
            <div class="project-entry" style="margin-bottom: 0.11in;">
              ${currentProject}
              ${currentDescription.length > 0 ? `
                <div style="font-size: 10.5pt; margin-top: 0.06in; line-height: 1.2; text-align: left;">
                  ${currentDescription.map(desc => {
                    if (desc.trim().startsWith('•') || desc.trim().startsWith('-')) {
                      return `<div style="margin-left: 0.23in; margin-top: 0.05in; padding-left: 0.18in; text-indent: -0.18in; line-height: 1.2;">
                        <span style="font-weight: bold;">• </span>${this.escapeHtml(desc.trim().replace(/^[•\-]\s*/, ''))}
                      </div>`;
                    }
                    return `<div style="margin-top: 0.05in; line-height: 1.2;">${this.escapeHtml(desc)}</div>`;
                  }).join('')}
                </div>
              ` : ''}
            </div>
          `);
        }
        // Start new project
        currentProject = `
          <div style="margin-bottom: 0.06in;">
            <span class="project-title">${this.escapeHtml(headerMatch[1].trim())}</span>
            <span> | </span>
            <span class="project-tech">${this.escapeHtml(headerMatch[2].trim())}</span>
          </div>
        `;
        currentDescription = [];
      } else if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
        currentDescription.push(trimmed);
      } else if (trimmed && !trimmed.match(/^#+\s/)) {
        currentDescription.push(trimmed);
      }
    }

    // Add last project
    if (currentProject) {
      entries.push(`
        <div class="project-entry" style="margin-bottom: 0.11in;">
          ${currentProject}
          ${currentDescription.length > 0 ? `
            <div style="font-size: 10.5pt; margin-top: 0.06in; line-height: 1.2; text-align: left;">
              ${currentDescription.map(desc => {
                if (desc.trim().startsWith('•') || desc.trim().startsWith('-')) {
                  return `<div style="margin-left: 0.23in; margin-top: 0.05in; padding-left: 0.18in; text-indent: -0.18in; line-height: 1.2;">
                    <span style="font-weight: bold;">• </span>${this.escapeHtml(desc.trim().replace(/^[•\-]\s*/, ''))}
                  </div>`;
                }
                return `<div style="margin-top: 0.05in; line-height: 1.2;">${this.escapeHtml(desc)}</div>`;
              }).join('')}
            </div>
          ` : ''}
        </div>
      `);
    }

    if (entries.length === 0) {
      // Fallback: display as formatted text
      const formatted = lines.map(line => {
        if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
          return `<div style="margin-left: 0.23in; padding-left: 0.18in; text-indent: -0.18in; margin-bottom: 0.06in; line-height: 1.2;">
            <span style="font-weight: bold;">• </span>${this.escapeHtml(line.trim().replace(/^[•\-]\s*/, ''))}
          </div>`;
        }
        return `<div style="margin-bottom: 0.08in; font-weight: bold;">${this.escapeHtml(line)}</div>`;
      }).join('');
      
      return `
        <section>
          <h2>Projects</h2>
          ${formatted}
        </section>
      `;
    }

    return `
      <section>
        <h2>Projects</h2>
        ${entries.join('')}
      </section>
    `;
  }

  private static generateEducation(education?: Array<{ degree: string; university: string; year?: string; duration?: string }>): string {
    if (!education || education.length === 0) return '';

    const entries = education.map(edu => {
      const dateInfo = edu.year || edu.duration || '';
      return `
        <div class="education-entry">
            <div class="entry-header">
                <div>
                    <span class="degree">${this.escapeHtml(edu.degree)}</span>
                    <span style="margin: 0 0.15in;">|</span>
                    <span class="school">${this.escapeHtml(edu.university)}</span>
                </div>
                ${dateInfo ? `<span class="entry-date">${this.escapeHtml(dateInfo)}</span>` : ''}
            </div>
        </div>
      `;
    }).join('');

    return `
        <section>
            <h2>Education</h2>
            ${entries}
        </section>
    `;
  }

  private static generateSkills(skills?: string[]): string {
    if (!skills || skills.length === 0) return '';

    const skillsList = skills
      .filter(s => s && s.trim())
      .map(s => this.escapeHtml(s))
      .join(' • ');

    return `
        <section>
            <h2>Technical Skills</h2>
            <p style="margin-top: 0.08in; font-size: 11pt; line-height: 1.4;">
                ${skillsList}
            </p>
        </section>
    `;
  }

  private static generateProjects(projects?: Array<{ title: string; tech: string; description?: string }>): string {
    if (!projects || projects.length === 0) return '';

    const entries = projects.map(proj => {
      // Parse description if it contains markdown bullets or newlines
      let descriptionHtml = '';
      if (proj.description) {
        // Convert markdown bullets to HTML bullets
        const lines = proj.description.split('\n');
        const formattedLines = lines.map(line => {
          const trimmed = line.trim();
          if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
            return `<div style="margin-left: 0.2in; margin-top: 0.02in; padding-left: 0.15in; text-indent: -0.15in; line-height: 1.2;">
              <span style="font-weight: bold;">• </span>${this.escapeHtml(trimmed.replace(/^[•\-]\s*/, ''))}
            </div>`;
          } else if (trimmed) {
            return `<div style="margin-top: 0.02in; line-height: 1.2;">${this.escapeHtml(trimmed)}</div>`;
          }
          return '';
        }).filter(Boolean).join('');
        descriptionHtml = formattedLines;
      }

      return `
        <div class="project-entry" style="margin-bottom: 0.08in;">
            <div style="margin-bottom: 0.03in;">
                <span class="project-title">${this.escapeHtml(proj.title)}</span>
                <span> | </span>
                <span class="project-tech">${this.escapeHtml(proj.tech)}</span>
            </div>
            ${descriptionHtml ? `
                <div style="font-size: 10.5pt; line-height: 1.2; text-align: left;">
                    ${descriptionHtml}
                </div>
            ` : ''}
        </div>
      `;
    }).join('');

    return `
        <section>
            <h2>Projects</h2>
            ${entries}
        </section>
    `;
  }

  private static generateCertifications(certifications?: Array<{ title: string; issuer: string }>): string {
    if (!certifications || certifications.length === 0) return '';

    const entries = certifications.map(cert => `
        <div class="cert-entry">
            <span class="cert-title">${this.escapeHtml(cert.title)}</span>
            <span> — </span>
            <span class="cert-issuer">${this.escapeHtml(cert.issuer)}</span>
        </div>
    `).join('');

    return `
        <section>
            <h2>Certifications</h2>
            ${entries}
        </section>
    `;
  }

  private static generateLanguages(languages?: Array<{ language: string; proficiency: string }>): string {
    if (!languages || languages.length === 0) return '';

    const entries = languages.map(lang => `
        <div class="language-entry" style="margin-bottom: 0.09in;">
            <span class="entry-title">${this.escapeHtml(lang.language)}</span>
            <span> - </span>
            <span>${this.escapeHtml(lang.proficiency)}</span>
        </div>
    `).join('');

    return `
        <section>
            <h2>Languages</h2>
            ${entries}
        </section>
    `;
  }

  private static generateVolunteer(volunteer?: Array<{ role: string; organization: string; duration: string; description?: string }>): string {
    if (!volunteer || volunteer.length === 0) return '';

    const entries = volunteer.map(vol => `
        <div class="entry">
            <div class="entry-header">
                <div>
                    <span class="entry-title">${this.escapeHtml(vol.role)}</span>
                    <span style="margin: 0 0.13in;">|</span>
                    <span class="entry-subtitle">${this.escapeHtml(vol.organization)}</span>
                </div>
                <span class="entry-date">${this.escapeHtml(vol.duration)}</span>
            </div>
            ${vol.description ? `
                <div class="entry-description">
                    ${this.escapeHtml(vol.description)}
                </div>
            ` : ''}
        </div>
    `).join('');

    return `
        <section>
            <h2>Volunteer Work</h2>
            ${entries}
        </section>
    `;
  }

  private static generatePublications(publications?: Array<{ title: string; publication: string; date: string }>): string {
    if (!publications || publications.length === 0) return '';

    const entries = publications.map(pub => `
        <div class="publication-entry">
            <span class="publication-title">${this.escapeHtml(pub.title)}</span>
            <div style="margin-top: 0.02in;">
                <span class="publication-info">${this.escapeHtml(pub.publication)}</span>
                <span> • </span>
                <span class="publication-info">${this.escapeHtml(pub.date)}</span>
            </div>
        </div>
    `).join('');

    return `
        <section>
            <h2>Publications</h2>
            ${entries}
        </section>
    `;
  }

  private static generatePublicationsFromString(publicationsStr?: string): string {
    if (!publicationsStr || !publicationsStr.trim()) return '';

    const lines = publicationsStr.split('\n').filter(line => line.trim());
    const entries = lines.map(line => {
      const trimmed = line.trim();
      if (trimmed) {
        return `
          <div class="publication-entry">
              <span class="publication-title">${this.escapeHtml(trimmed)}</span>
          </div>
        `;
      }
      return '';
    }).filter(Boolean).join('');

    return `
        <section>
            <h2>Publications</h2>
            ${entries}
        </section>
    `;
  }

  private static generateAwards(awards?: Array<{ title: string; organization: string; date: string }>): string {
    if (!awards || awards.length === 0) return '';

    const entries = awards.map(award => `
        <div class="award-entry">
            <span class="award-title">${this.escapeHtml(award.title)}</span>
            <div style="margin-top: 0.02in;">
                <span class="award-info">${this.escapeHtml(award.organization)}</span>
                <span> • </span>
                <span class="award-info">${this.escapeHtml(award.date)}</span>
            </div>
        </div>
    `).join('');

    return `
        <section>
            <h2>Awards & Recognition</h2>
            ${entries}
        </section>
    `;
  }

  private static generateAwardsFromString(awardsStr?: string): string {
    if (!awardsStr || !awardsStr.trim()) return '';

    const lines = awardsStr.split('\n').filter(line => line.trim());
    const entries = lines.map(line => {
      const trimmed = line.trim();
      if (trimmed) {
        return `
          <div class="award-entry">
              <span class="award-title">${this.escapeHtml(trimmed)}</span>
          </div>
        `;
      }
      return '';
    }).filter(Boolean).join('');

    return `
        <section>
            <h2>Awards & Recognition</h2>
            ${entries}
        </section>
    `;
  }

  private static generateTechnicalTools(tools?: string[]): string {
    if (!tools || tools.length === 0) return '';

    const toolsList = tools.map(tool => this.escapeHtml(tool)).join(', ');

    return `
        <section>
            <h2>Technical Tools & Software</h2>
            <div class="tools-list">
                ${toolsList}
            </div>
        </section>
    `;
  }

  private static generateInterests(interests?: string): string {
    if (!interests || !interests.trim()) return '';

    return `
        <section>
            <h2>Interests</h2>
            <div class="interests-text">
                ${this.escapeHtml(interests)}
            </div>
        </section>
    `;
  }

  private static generateInterestsFromString(interestsStr?: string): string {
    if (!interestsStr || !interestsStr.trim()) return '';

    return `
        <section>
            <h2>Interests</h2>
            <div class="interests-text">
                ${this.escapeHtml(interestsStr)}
            </div>
        </section>
    `;
  }

  private static escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return text.replace(/[&<>"']/g, (char) => map[char] || char);
  }
}

export function generateATSResumeHTML(profile: UserProfile, resume: GeneratedResume): string {
  return ATSResumeGenerator.generateHTML(profile, resume);
}
