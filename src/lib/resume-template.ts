// Resume Types
export type ResumeRecord = {
  id?: string;
  role?: string;
  summary?: string;
  skills?: string;
  experience?: string;
  education?: string;
  projects?: string;
  certifications?: string;
  createdAt?: string;
};

export type ProfileRecord = {
  name?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  github?: string;
  address?: string;
  location?: string;
};

// ATS-Optimized Resume Generator
class ATSResumeGenerator {
  private static readonly STYLES = {
    // Gold Standard ATS-Compatible Formatting
    container: "font-family:Arial,sans-serif;color:#000;background:#fff;padding:0.5in;line-height:1;font-size:11pt;max-width:8.5in;margin:0 auto;",
    
    // HEADER - Contact Information
    header: "margin-bottom:8px;padding-bottom:0;text-align:left;",
    name: "font-size:16pt;font-weight:bold;margin:0;line-height:1.2;",
    title: "font-size:11pt;font-weight:bold;margin:0;line-height:1.2;color:#333;",
    contact: "font-size:10pt;margin:0;line-height:1.2;color:#666;",
    
    // SECTIONS - Professional Summary, Experience, etc.
    section: "margin-top:10px;margin-bottom:0;page-break-inside:avoid;",
    sectionTitle: "font-weight:bold;margin:8px 0 4px 0;font-size:11pt;border-bottom:1px solid #000;padding-bottom:2px;text-transform:uppercase;letter-spacing:0.5px;",
    
    // JOBS & ITEMS
    jobHeader: "margin:6px 0 2px 0;line-height:1.2;",
    jobTitle: "font-weight:bold;display:inline;",
    company: "font-weight:bold;display:inline;",
    duration: "float:right;font-style:italic;font-weight:normal;display:inline;",
    jobCompanyLine: "margin:0 0 2px 0;line-height:1.1;",
    
    // BULLETS
    bulletItem: "margin:2px 0;padding-left:16px;text-indent:-16px;line-height:1.2;",
    item: "margin:4px 0;line-height:1.2;",
    
    // SKILLS & CONTACT INFO
    skillsLine: "margin:2px 0;line-height:1.2;",
    inline: "display:inline;",
  };

  // HTML escape for XSS prevention (server-safe)
  private static escapeHtml(text: string): string {
    const htmlEscapeMap: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return text.replace(/[&<>"']/g, (char) => htmlEscapeMap[char] || char);
  }

  // Helper: Check if text data is meaningful (not empty, not just placeholders)
  private static hasValidData(data?: string): boolean {
    if (!data) return false;
    const trimmed = data.trim();
    if (trimmed.length === 0) return false;
    // Exclude common placeholders
    const placeholders = ['no data', 'n/a', 'not available', '—', '-', 'none'];
    return !placeholders.some(p => trimmed.toLowerCase() === p);
  }

  // Parse text data
  private static parseText(text?: string, separator: RegExp = /\n|;/): string[] {
    return text?.split(separator).map(s => s.trim()).filter(Boolean) || [];
  }

  // Parse experience with dates
  private static parseExperience(exp?: string): Array<{role: string, company: string, desc: string, duration?: string}> {
    const items: Array<{role: string, company: string, desc: string, duration?: string}> = [];
    const entries = this.parseText(exp, /\n|;(?=\s*[A-Z])/);
    
    entries.forEach(entry => {
      const durationMatch = entry.match(/(\d{4}\s*-\s*(?:\d{4}|Present|Now))/i);
      const duration = durationMatch?.[0];
      const cleanEntry = duration ? entry.replace(durationMatch[0], '').trim() : entry;
      
      const atMatch = cleanEntry.match(/(.+?)\s+(?:at|@)\s+(.+)/i);
      if (atMatch) {
        items.push({
          role: atMatch[1].trim(),
          company: atMatch[2].trim(),
          desc: 'Key responsibilities and achievements',
          duration
        });
      } else {
        items.push({
          role: 'Professional Role',
          company: 'Company',
          desc: cleanEntry || 'Responsibilities and achievements',
          duration
        });
      }
    });
    
    return items;
  }

  // Parse education
  private static parseEducation(edu?: string): Array<{institution: string, degree: string, duration?: string}> {
    const items: Array<{institution: string, degree: string, duration?: string}> = [];
    const entries = this.parseText(edu, /\n|;/);
    
    entries.forEach(entry => {
      const durationMatch = entry.match(/(\d{4}\s*-\s*(?:\d{4}|Present))/);
      const duration = durationMatch?.[0];
      const cleanEntry = duration ? entry.replace(durationMatch[0], '').trim() : entry;
      
      const degreeMatch = cleanEntry.match(/(Bachelor|Master|PhD|Associate|Diploma|Certificate)/i);
      if (degreeMatch) {
        const index = cleanEntry.indexOf(degreeMatch[0]);
        items.push({
          institution: cleanEntry.substring(0, index).trim() || 'Institution',
          degree: cleanEntry.substring(index).trim(),
          duration
        });
      } else {
        items.push({
          institution: cleanEntry,
          degree: 'Degree',
          duration
        });
      }
    });
    
    return items;
  }

  // Parse skills
  private static parseSkills(skills?: string): string[] {
    return this.parseText(skills, /\n|;|,/).slice(0, 15);
  }

  // Parse projects
  private static parseProjects(projects?: string): Array<{name: string, desc: string}> {
    const items: Array<{name: string, desc: string}> = [];
    const entries = this.parseText(projects, /\n|;/);
    
    entries.forEach(entry => {
      const colonIndex = entry.indexOf(':');
      if (colonIndex > -1) {
        items.push({
          name: entry.substring(0, colonIndex).trim(),
          desc: entry.substring(colonIndex + 1).trim()
        });
      } else {
        items.push({
          name: 'Project',
          desc: entry
        });
      }
    });
    
    return items;
  }

  // Parse certifications
  private static parseCertifications(certs?: string): Array<{name: string, issuer?: string}> {
    const items: Array<{name: string, issuer?: string}> = [];
    const entries = this.parseText(certs, /\n|;/);
    
    entries.forEach(entry => {
      const fromMatch = entry.match(/(.+?)\s+(?:from|by)\s+(.+)/i);
      if (fromMatch) {
        items.push({
          name: fromMatch[1].trim(),
          issuer: fromMatch[2].trim()
        });
      } else {
        items.push({ name: entry });
      }
    });
    
    return items;
  }

  // Generate header section - ATS Compliant
  private static generateHeader(profile: ProfileRecord, jobTitle: string): string {
    // Build contact info lines (one per line for ATS parsing)
    const contactLines: string[] = [];
    
    if (profile.email) contactLines.push(profile.email);
    if (profile.phone) contactLines.push(profile.phone);
    if (profile.location) contactLines.push(profile.location);
    if (profile.linkedin) {
      const linkedinHandle = profile.linkedin.split('/').pop();
      if (linkedinHandle) contactLines.push(`LinkedIn: linkedin.com/in/${linkedinHandle}`);
    }
    if (profile.github) {
      const githubHandle = profile.github.split('/').pop();
      if (githubHandle) contactLines.push(`GitHub: github.com/${githubHandle}`);
    }

    return `
      <div style="${this.STYLES.header}">
        <div style="${this.STYLES.name}">${this.escapeHtml(profile.name || 'Your Name')}</div>
        ${jobTitle ? `<div style="${this.STYLES.title}">${this.escapeHtml(jobTitle)}</div>` : ''}
        <div style="${this.STYLES.contact}">
          ${contactLines.map(line => `<div style="margin:0;line-height:1.2;">${this.escapeHtml(line)}</div>`).join('')}
        </div>
      </div>
    `;
  }

  // Generate summary section
  private static generateSummary(summary?: string): string {
    if (!this.hasValidData(summary)) return '';
    return `
      <div style="${this.STYLES.section}">
        <div style="${this.STYLES.sectionTitle}">Professional Summary</div>
        <div style="${this.STYLES.item}">${this.escapeHtml(summary || '')}</div>
      </div>
    `;
  }

  // Generate formatted experience section from AI-generated string
  private static generateExperienceFromString(experienceStr?: string): string {
    if (!this.hasValidData(experienceStr)) return '';
    
    // Split experience into lines/bullets
    const lines = (experienceStr || '').split('\n').filter(line => line.trim());
    const itemsHtml = lines.map(line => {
      // Check if it's a job header (contains "at" or "—" or is in bold-like format)
      const isJobHeader = line.match(/^\s*\*?\*?[^•\-\*]*\s+(?:at|@)\s+[^•\-\*]*\*?\*?/i) || 
                          line.includes('—') && line.length < 100;
      
      if (isJobHeader) {
        return `<div style="${this.STYLES.jobCompanyLine}">${this.escapeHtml(line)}</div>`;
      } else if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
        return `<div style="${this.STYLES.bulletItem}">${this.escapeHtml(line.replace(/^[•\-\*]\s*/, ''))}</div>`;
      } else {
        return `<div style="${this.STYLES.item}">${this.escapeHtml(line)}</div>`;
      }
    }).join('');
    
    return `
      <div style="${this.STYLES.section}">
        <div style="${this.STYLES.sectionTitle}">Professional Experience</div>
        ${itemsHtml}
      </div>
    `;
  }

  // Generate skills section from AI-generated string
  private static generateSkillsFromString(skillsStr?: string): string {
    if (!this.hasValidData(skillsStr)) return '';
    
    // The AI returns skills as categories or comma-separated list
    const lines = (skillsStr || '').split('\n').filter(line => line.trim());
    const itemsHtml = lines.map(line => {
      return `<div style="${this.STYLES.skillsLine}">${this.escapeHtml(line)}</div>`;
    }).join('');
    
    return `
      <div style="${this.STYLES.section}">
        <div style="${this.STYLES.sectionTitle}">Skills</div>
        ${itemsHtml}
      </div>
    `;
  }

  // Generate education section from AI-generated string
  private static generateEducationFromString(educationStr?: string): string {
    if (!this.hasValidData(educationStr)) return '';
    
    const lines = (educationStr || '').split('\n').filter(line => line.trim());
    const itemsHtml = lines.map(line => {
      return `<div style="${this.STYLES.item}">${this.escapeHtml(line)}</div>`;
    }).join('');
    
    return `
      <div style="${this.STYLES.section}">
        <div style="${this.STYLES.sectionTitle}">Education</div>
        ${itemsHtml}
      </div>
    `;
  }

  // Generate projects section from AI-generated string
  private static generateProjectsFromString(projectsStr?: string): string {
    if (!this.hasValidData(projectsStr)) return '';
    
    const lines = (projectsStr || '').split('\n').filter(line => line.trim());
    const itemsHtml = lines.map(line => {
      if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
        return `<div style="${this.STYLES.bulletItem}">${this.escapeHtml(line.replace(/^[•\-\*]\s*/, ''))}</div>`;
      } else {
        return `<div style="${this.STYLES.item}">${this.escapeHtml(line)}</div>`;
      }
    }).join('');
    
    return `
      <div style="${this.STYLES.section}">
        <div style="${this.STYLES.sectionTitle}">Projects</div>
        ${itemsHtml}
      </div>
    `;
  }

  // Generate certifications section from AI-generated string
  private static generateCertificationsFromString(certificationsStr?: string): string {
    if (!this.hasValidData(certificationsStr)) return '';
    
    const lines = (certificationsStr || '').split('\n').filter(line => line.trim());
    const itemsHtml = lines.map(line => {
      return `<div style="${this.STYLES.item}">${this.escapeHtml(line)}</div>`;
    }).join('');
    
    return `
      <div style="${this.STYLES.section}">
        <div style="${this.STYLES.sectionTitle}">Certifications</div>
        ${itemsHtml}
      </div>
    `;
  }

  // Generate education section - Point-wise display for all levels
  private static generateEducation(education: Array<{institution: string, degree: string, duration?: string}>): string {
    if (education.length === 0) return '';
    
    // Sort by degree level to show higher education first
    const degreeOrder: {[key: string]: number} = {
      'PhD': 0,
      'Master': 1,
      'Bachelor': 2,
      'B.Tech': 2,
      'B.Sc': 2,
      'Diploma': 3,
      'Intermediate': 4,
      'HSC': 4,
      'SSC': 5,
      'Associate': 3,
      'Certificate': 4
    };

    const sortedEducation = [...education].sort((a, b) => {
      // Extract degree level from degree field
      const aLevel = Math.min(...Object.entries(degreeOrder)
        .filter(([key]) => a.degree.toUpperCase().includes(key.toUpperCase()))
        .map(([, val]) => val));
      const bLevel = Math.min(...Object.entries(degreeOrder)
        .filter(([key]) => b.degree.toUpperCase().includes(key.toUpperCase()))
        .map(([, val]) => val));
      
      return (aLevel === Infinity ? 999 : aLevel) - (bLevel === Infinity ? 999 : bLevel);
    });

    const itemsHtml = sortedEducation.map(edu => `
      <div style="${this.STYLES.bulletItem}">
        <strong>${this.escapeHtml(edu.degree)}</strong> from ${this.escapeHtml(edu.institution)}${edu.duration ? ` (${this.escapeHtml(edu.duration)})` : ''}
      </div>
    `).join('');
    
    return `
      <div style="${this.STYLES.section}">
        <div style="${this.STYLES.sectionTitle}">Education</div>
        ${itemsHtml}
      </div>
    `;
  }

  // Generate skills section - ATS Compliant with better formatting
  private static generateSkills(skills: string[]): string {
    if (skills.length === 0) return '';
    
    // Group skills into categories if they contain category markers
    const skillsText = skills.join(', ');
    
    // Try to detect categories (e.g., "Technical: Java, Python; Soft Skills: Leadership, Communication")
    const categoryMatch = skillsText.match(/([A-Z][^:]*?):\s*([^;]+)/g);
    
    let skillsHtml = '';
    if (categoryMatch && categoryMatch.length > 0) {
      // Format with categories
      skillsHtml = categoryMatch.map(cat => {
        const [category, items] = cat.split(':').map(s => s.trim());
        return `<div style="${this.STYLES.item}"><strong>${category}:</strong> ${items}</div>`;
      }).join('');
    } else {
      // Format as simple comma-separated list
      skillsHtml = `<div style="${this.STYLES.item}">${this.escapeHtml(skillsText)}</div>`;
    }
    
    return `
      <div style="${this.STYLES.section}">
        <div style="${this.STYLES.sectionTitle}">Skills</div>
        ${skillsHtml}
      </div>
    `;
  }

  // Generate projects section - ATS Compliant
  // ONLY shows if user has actual project data
  private static generateProjects(projects: Array<{name: string, desc: string}>): string {
    if (projects.length === 0) return ''; // Hide section if no projects
    
    const itemsHtml = projects.map(proj => `
      <div style="${this.STYLES.bulletItem}">
        <strong>${this.escapeHtml(proj.name)}:</strong> ${this.escapeHtml(proj.desc)}
      </div>
    `).join('');
    
    return `
      <div style="${this.STYLES.section}">
        <div style="${this.STYLES.sectionTitle}">Projects</div>
        ${itemsHtml}
      </div>
    `;
  }

  // Generate certifications section - ATS Compliant
  // ONLY shows if user has actual certification data
  private static generateCertifications(certifications: Array<{name: string, issuer?: string}>): string {
    if (certifications.length === 0) return ''; // Hide section if no certifications
    
    const itemsHtml = certifications.map(cert => `
      <div style="${this.STYLES.bulletItem}">
        ${this.escapeHtml(cert.name)}${cert.issuer ? ` - ${this.escapeHtml(cert.issuer)}` : ''}
      </div>
    `).join('');
    
    return `
      <div style="${this.STYLES.section}">
        <div style="${this.STYLES.sectionTitle}">Certifications</div>
        ${itemsHtml}
      </div>
    `;
  }

  // Main resume generation function - ATS Optimized
  public static generateResume(resume: ResumeRecord, profile: ProfileRecord): string {
    // Use AI-generated string data directly (resume contains formatted strings from AI)
    const jobTitle = resume.role || 'Professional';

    // Gold Standard ATS Resume Section Ordering:
    // 1. Header (Contact Info) - REQUIRED
    // 2. Professional Summary - Optional but recommended
    // 3. Professional Experience - Most important, reverse chronological
    // 4. Skills - Organized by category
    // 5. Education - All levels, highest first
    // 6. Projects - Optional
    // 7. Certifications - Optional

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resume - ${this.escapeHtml(profile.name || 'Your Name')}</title>
  <style>
    @media print {
      body { margin: 0; padding: 0; }
      .no-print { display: none; }
      .container { max-width: 100%; }
    }
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
  </style>
</head>
<body>
  <div class="container">
    ${this.generateHeader(profile, jobTitle)}
    ${this.generateSummary(resume.summary)}
    ${this.generateExperienceFromString(resume.experience)}
    ${this.generateSkillsFromString(resume.skills)}
    ${this.generateEducationFromString(resume.education)}
    ${this.generateProjectsFromString(resume.projects)}
    ${this.generateCertificationsFromString(resume.certifications)}
  </div>
</body>
</html>`.trim();
  }
}

// Export the main function as getResumeHTML (fixing the import error)
export const getResumeHTML = (resume: ResumeRecord, profile: ProfileRecord): string => {
  return ATSResumeGenerator.generateResume(resume, profile);
};

// Also export generateResumeHTML for backward compatibility
export const generateResumeHTML = getResumeHTML;

// Export default
export default ATSResumeGenerator;