/**
 * Resume Template V2 - Direct User Profile to HTML Resume
 * This template converts user profile data + AI-generated formatted strings into ATS-optimized HTML
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

class ResumeGeneratorV2 {
  private static readonly STYLES = {
    container: "font-family:Arial,sans-serif;color:#000;background:#fff;padding:0.5in;line-height:1;font-size:11pt;max-width:8.5in;margin:0 auto;",
    header: "margin-bottom:10px;padding-bottom:8px;text-align:left;border-bottom:1px solid #000;",
    name: "font-size:14pt;font-weight:bold;margin:0 0 2px 0;",
    title: "font-size:11pt;margin:0 0 4px 0;color:#333;",
    contact: "font-size:10pt;margin:0;color:#666;line-height:1.2;",
    section: "margin-top:10px;margin-bottom:0;",
    sectionTitle: "font-weight:bold;margin:6px 0 3px 0;font-size:11pt;border-bottom:1px solid #000;padding-bottom:1px;",
    jobItem: "margin:4px 0 2px 0;line-height:1.2;",
    jobTitle: "font-weight:bold;",
    company: "font-weight:bold;",
    duration: "font-style:italic;float:right;",
    bullet: "margin:2px 0;padding-left:16px;text-indent:-16px;line-height:1.1;",
    item: "margin:2px 0;line-height:1.1;",
  };

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

  private static hasContent(data?: string | string[]): boolean {
    if (!data) return false;
    if (Array.isArray(data)) return data.length > 0 && data.some(item => item && item.trim().length > 0);
    if (typeof data === 'string') return data.trim().length > 0;
    return false;
  }

  private static generateHeader(profile: UserProfile, role?: string): string {
    const lines: string[] = [];
    
    if (profile.name) lines.push(profile.name);
    if (role) lines.push(role);
    
    const contactInfo: string[] = [];
    if (profile.phone) contactInfo.push(profile.phone);
    if (profile.email) contactInfo.push(profile.email);
    if (profile.linkedin) contactInfo.push(`LinkedIn: ${profile.linkedin}`);
    if (profile.github) contactInfo.push(`GitHub: ${profile.github}`);
    if (profile.portfolioURL) contactInfo.push(`Portfolio: ${profile.portfolioURL}`);

    return `
      <div style="${this.STYLES.header}">
        ${lines.map((line, idx) => `
          <div style="${idx === 0 ? this.STYLES.name : this.STYLES.title}">
            ${this.escapeHtml(line)}
          </div>
        `).join('')}
        ${contactInfo.length > 0 ? `
          <div style="${this.STYLES.contact}">
            ${contactInfo.map(info => `<div>${this.escapeHtml(info)}</div>`).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  private static generateSection(title: string, content: string): string {
    if (!content || !content.trim()) return '';
    
    return `
      <div style="${this.STYLES.section}">
        <div style="${this.STYLES.sectionTitle}">${this.escapeHtml(title)}</div>
        ${content}
      </div>
    `;
  }

  private static generateSummary(summary?: string): string {
    if (!this.hasContent(summary)) return '';
    return this.generateSection('Professional Summary', `
      <div style="${this.STYLES.item}">
        ${this.escapeHtml(summary || '')}
      </div>
    `);
  }

  private static generateExperience(experience?: Array<{ company: string; role: string; duration: string; description?: string }>): string {
    if (!experience || experience.length === 0) return '';

    const content = experience
      .map(job => `
        <div style="${this.STYLES.jobItem}">
          <span style="${this.STYLES.jobTitle}">${this.escapeHtml(job.role)}</span>
          <span> at </span>
          <span style="${this.STYLES.company}">${this.escapeHtml(job.company)}</span>
          <span style="${this.STYLES.duration}">${this.escapeHtml(job.duration)}</span>
        </div>
        ${job.description ? `
          <div style="${this.STYLES.bullet}">
            ${this.escapeHtml(job.description)}
          </div>
        ` : ''}
      `)
      .join('');

    return this.generateSection('Professional Experience', content);
  }

  private static generateSkills(skills?: string[]): string {
    if (!this.hasContent(skills)) return '';

    const skillsText = (skills || [])
      .filter(s => s && s.trim())
      .map(s => this.escapeHtml(s))
      .join(' • ');

    return this.generateSection('Skills', `
      <div style="${this.STYLES.item}">
        ${skillsText}
      </div>
    `);
  }

  private static generateEducation(education?: Array<{ degree: string; university: string; year?: string; duration?: string }>): string {
    if (!education || education.length === 0) return '';

    const content = education
      .map(edu => `
        <div style="${this.STYLES.jobItem}">
          <span style="${this.STYLES.jobTitle}">${this.escapeHtml(edu.degree)}</span>
          <span> from </span>
          <span style="${this.STYLES.company}">${this.escapeHtml(edu.university)}</span>
          ${edu.year ? `<span style="${this.STYLES.duration}">${this.escapeHtml(edu.year)}</span>` : ''}
        </div>
      `)
      .join('');

    return this.generateSection('Education', content);
  }

  private static generateProjects(projects?: Array<{ title: string; tech: string; description?: string }>): string {
    if (!projects || projects.length === 0) return '';

    const content = projects
      .map(proj => `
        <div style="${this.STYLES.jobItem}">
          <span style="${this.STYLES.jobTitle}">${this.escapeHtml(proj.title)}</span>
          <span> | </span>
          <span>${this.escapeHtml(proj.tech)}</span>
        </div>
        ${proj.description ? `
          <div style="${this.STYLES.bullet}">
            ${this.escapeHtml(proj.description)}
          </div>
        ` : ''}
      `)
      .join('');

    return this.generateSection('Projects', content);
  }

  private static generateCertifications(certifications?: Array<{ title: string; issuer: string }>): string {
    if (!certifications || certifications.length === 0) return '';

    const content = certifications
      .map(cert => `
        <div style="${this.STYLES.item}">
          <span style="${this.STYLES.jobTitle}">${this.escapeHtml(cert.title)}</span>
          <span> — </span>
          <span>${this.escapeHtml(cert.issuer)}</span>
        </div>
      `)
      .join('');

    return this.generateSection('Certifications', content);
  }

  private static generateLanguages(languages?: Array<{ language: string; proficiency: string }>): string {
    if (!languages || languages.length === 0) return '';

    const content = languages
      .map(lang => `
        <div style="${this.STYLES.item}">
          <span style="${this.STYLES.jobTitle}">${this.escapeHtml(lang.language)}</span>
          <span> - ${this.escapeHtml(lang.proficiency)}</span>
        </div>
      `)
      .join('');

    return this.generateSection('Languages', content);
  }

  private static generateTechnicalTools(tools?: string[]): string {
    if (!this.hasContent(tools)) return '';

    const toolsText = (tools || [])
      .filter(t => t && t.trim())
      .map(t => this.escapeHtml(t))
      .join(', ');

    return this.generateSection('Technical Tools', `
      <div style="${this.STYLES.item}">
        ${toolsText}
      </div>
    `);
  }

  private static generateVolunteerWork(volunteer?: Array<{ role: string; organization: string; duration: string; description?: string }>): string {
    if (!volunteer || volunteer.length === 0) return '';

    const content = volunteer
      .map(vol => `
        <div style="${this.STYLES.jobItem}">
          <span style="${this.STYLES.jobTitle}">${this.escapeHtml(vol.role)}</span>
          <span> at </span>
          <span style="${this.STYLES.company}">${this.escapeHtml(vol.organization)}</span>
          <span style="${this.STYLES.duration}">${this.escapeHtml(vol.duration)}</span>
        </div>
        ${vol.description ? `
          <div style="${this.STYLES.bullet}">
            ${this.escapeHtml(vol.description)}
          </div>
        ` : ''}
      `)
      .join('');

    return this.generateSection('Volunteer Work', content);
  }

  private static generatePublications(publications?: Array<{ title: string; publication: string; date: string }>): string {
    if (!publications || publications.length === 0) return '';

    const content = publications
      .map(pub => `
        <div style="${this.STYLES.jobItem}">
          <span style="${this.STYLES.jobTitle}">${this.escapeHtml(pub.title)}</span>
          <span> — ${this.escapeHtml(pub.publication)}</span>
          <span style="${this.STYLES.duration}">${this.escapeHtml(pub.date)}</span>
        </div>
      `)
      .join('');

    return this.generateSection('Publications & Speaking', content);
  }

  private static generateAwards(awards?: Array<{ title: string; organization: string; date: string }>): string {
    if (!awards || awards.length === 0) return '';

    const content = awards
      .map(award => `
        <div style="${this.STYLES.jobItem}">
          <span style="${this.STYLES.jobTitle}">${this.escapeHtml(award.title)}</span>
          <span> — ${this.escapeHtml(award.organization)}</span>
          <span style="${this.STYLES.duration}">${this.escapeHtml(award.date)}</span>
        </div>
      `)
      .join('');

    return this.generateSection('Awards & Honors', content);
  }

  private static generateInterests(interests?: string): string {
    if (!this.hasContent(interests)) return '';

    return this.generateSection('Interests', `
      <div style="${this.STYLES.item}">
        ${this.escapeHtml(interests || '')}
      </div>
    `);
  }

  public static generateResumeFromProfile(profile: UserProfile, generatedResume?: GeneratedResume): string {
    const role = generatedResume?.role || 'Professional';

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resume - ${this.escapeHtml(profile.name || 'Professional')}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11pt;
      line-height: 1;
      color: #000;
      background: #fff;
    }
    .container {
      width: 8.5in;
      height: 11in;
      padding: 0.5in;
      margin: 0 auto;
      background: #fff;
      page-break-after: always;
    }
    @media print {
      body { margin: 0; padding: 0; }
      .container { margin: 0; }
    }
  </style>
</head>
<body>
  <div class="container">
    ${this.generateHeader(profile, role)}
    ${generatedResume?.summary ? this.generateSummary(generatedResume.summary) : ''}
    ${this.generateExperience(profile.experience)}
    ${generatedResume?.skills ? this.generateSkills(generatedResume.skills.split(/[,•]/)) : this.generateSkills(profile.skills)}
    ${this.generateEducation(profile.education)}
    ${this.generateProjects(profile.projects)}
    ${this.generateCertifications(profile.certifications)}
    ${this.generateLanguages(profile.languages)}
    ${this.generateTechnicalTools(profile.technicalTools)}
    ${this.generateVolunteerWork(profile.volunteerWork)}
    ${this.generatePublications(profile.publications)}
    ${this.generateAwards(profile.awards)}
    ${this.generateInterests(profile.interests)}
  </div>
</body>
</html>`.trim();
  }
}

export const generateResumeHTMLFromProfile = (profile: UserProfile, generatedResume?: GeneratedResume): string => {
  return ResumeGeneratorV2.generateResumeFromProfile(profile, generatedResume);
};

export default ResumeGeneratorV2;
