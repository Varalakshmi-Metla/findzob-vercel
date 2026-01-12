/**
 * Standard Resume Format Generator
 * Implements the STANDARD RESUME FORMAT (Universal) with all 10 sections
 * ATS-friendly: No tables, no images, no colors, plain text formatting
 * Font: Calibri / Arial / Times New Roman, Size: 10.5 - 12pt
 * Format: PDF (Letter/A4 8.5" x 11")
 * Length: Fresher (1 page), Experienced (1-2 pages)
 */

export interface StandardResumeHeader {
  fullName: string;
  mobileNumber?: string;
  professionalEmail?: string;
  city?: string;
  state?: string;
  linkedinURL?: string;
  githubURL?: string;
  portfolioURL?: string;
}

export interface StandardResumeExperience {
  organizationName: string;
  role: string;
  duration: string;
  responsibilities: string[];
  toolsUsed?: string[];
  outcome?: string;
}

export interface StandardResumeEducation {
  degree: string;
  branch: string;
  collegeUniversity: string;
  year: string;
  cgpaPercentage?: string;
}

export interface StandardResumeCertification {
  courseName: string;
  platformOrganization: string;
  year: string;
}

export interface StandardResumeAchievement {
  title: string;
  type: 'hackathon' | 'award' | 'recognition' | 'workshop' | 'seminar' | 'leadership';
  date?: string;
}

export interface StandardResume {
  // 1. Header (Mandatory)
  header: StandardResumeHeader;

  // 2. Profile Summary (Universal Section)
  profileSummary: string; // Career objective for fresher, Professional summary for experienced

  // 3. Key Skills
  keySkills: {
    programmingLanguages?: string[];
    webFrameworks?: string[];
    databases?: string[];
    toolsAndTechnologies?: string[];
    operatingSystems?: string[];
  };

  // 4. Professional Experience / Internships / Projects
  professionalExperience: StandardResumeExperience[];

  // 5. Education
  education: StandardResumeEducation[];

  // 6. Certifications & Training
  certifications: StandardResumeCertification[];

  // 7. Achievements & Activities
  achievements: StandardResumeAchievement[];

  // 8. Soft Skills
  softSkills: {
    communication?: boolean;
    teamwork?: boolean;
    timeManagement?: boolean;
    problemSolving?: boolean;
    customSkills?: string[];
  };

  // 9. Additional Information (Optional)
  additionalInfo?: {
    languagesKnown?: string[];
    willingnessToRelocate?: boolean;
    availability?: string;
  };

  // 10. Declaration (Optional)
  declaration?: string;

  // Metadata
  resumeType: 'fresher' | 'experienced';
  targetRole: string;
  createdAt?: string;
}

export class StandardResumeFormatter {
  /**
   * Generate plain text ATS-friendly resume
   */
  static generatePlainText(resume: StandardResume): string {
    const sections: string[] = [];

    // 1. Header
    sections.push(this.formatHeader(resume.header));

    // 2. Profile Summary
    sections.push(this.formatProfileSummary(resume.profileSummary));

    // 3. Key Skills
    sections.push(this.formatKeySkills(resume.keySkills));

    // 4. Professional Experience
    sections.push(this.formatProfessionalExperience(resume.professionalExperience));

    // 5. Education
    sections.push(this.formatEducation(resume.education));

    // 6. Certifications
    if (resume.certifications && resume.certifications.length > 0) {
      sections.push(this.formatCertifications(resume.certifications));
    }

    // 7. Achievements
    if (resume.achievements && resume.achievements.length > 0) {
      sections.push(this.formatAchievements(resume.achievements));
    }

    // 8. Soft Skills
    if (resume.softSkills) {
      sections.push(this.formatSoftSkills(resume.softSkills));
    }

    // 9. Additional Information
    if (resume.additionalInfo) {
      sections.push(this.formatAdditionalInfo(resume.additionalInfo));
    }

    // 10. Declaration
    if (resume.declaration) {
      sections.push(this.formatDeclaration(resume.declaration));
    }

    return sections.filter(Boolean).join('\n\n');
  }

  /**
   * Format Header section
   * FULL NAME
   * 📞 Mobile Number | 📧 Professional Email
   * 📍 City, State
   * 🔗 LinkedIn | GitHub | Portfolio (if any)
   */
  private static formatHeader(header: StandardResumeHeader): string {
    const lines: string[] = [];

    // Full name (uppercase, bold equivalent in plain text)
    if (header.fullName) {
      lines.push(header.fullName.toUpperCase());
    }

    // Contact info line
    const contactParts: string[] = [];
    if (header.mobileNumber) contactParts.push(`Mobile: ${header.mobileNumber}`);
    if (header.professionalEmail) contactParts.push(`Email: ${header.professionalEmail}`);
    if (contactParts.length > 0) {
      lines.push(contactParts.join(' | '));
    }

    // Location line
    const locationParts: string[] = [];
    if (header.city) locationParts.push(header.city);
    if (header.state) locationParts.push(header.state);
    if (locationParts.length > 0) {
      lines.push('Location: ' + locationParts.join(', '));
    }

    // Links line
    const linkParts: string[] = [];
    if (header.linkedinURL) linkParts.push(`LinkedIn: ${header.linkedinURL}`);
    if (header.githubURL) linkParts.push(`GitHub: ${header.githubURL}`);
    if (header.portfolioURL) linkParts.push(`Portfolio: ${header.portfolioURL}`);
    if (linkParts.length > 0) {
      lines.push(linkParts.join(' | '));
    }

    return lines.join('\n');
  }

  /**
   * Format Profile Summary section
   * Career objective for fresher, Professional summary for experienced
   */
  private static formatProfileSummary(summary: string): string {
    return `PROFILE SUMMARY\n${'-'.repeat(50)}\n${summary}`;
  }

  /**
   * Format Key Skills section
   * Programming Languages:
   * Web / Frameworks:
   * Databases:
   * Tools & Technologies:
   * Operating Systems:
   */
  private static formatKeySkills(skills: StandardResume['keySkills']): string {
    const sections: string[] = ['KEY SKILLS', '-'.repeat(50)];

    if (skills.programmingLanguages && skills.programmingLanguages.length > 0) {
      sections.push(`Programming Languages: ${skills.programmingLanguages.join(', ')}`);
    }

    if (skills.webFrameworks && skills.webFrameworks.length > 0) {
      sections.push(`Web / Frameworks: ${skills.webFrameworks.join(', ')}`);
    }

    if (skills.databases && skills.databases.length > 0) {
      sections.push(`Databases: ${skills.databases.join(', ')}`);
    }

    if (skills.toolsAndTechnologies && skills.toolsAndTechnologies.length > 0) {
      sections.push(`Tools & Technologies: ${skills.toolsAndTechnologies.join(', ')}`);
    }

    if (skills.operatingSystems && skills.operatingSystems.length > 0) {
      sections.push(`Operating Systems: ${skills.operatingSystems.join(', ')}`);
    }

    return sections.join('\n');
  }

  /**
   * Format Professional Experience section
   * Organization / Project Title
   * Role / Project Type | Duration
   * Responsibility / Work done
   * Tools & technologies used
   * Outcome / learning / impact
   */
  private static formatProfessionalExperience(experiences: StandardResumeExperience[]): string {
    if (!experiences || experiences.length === 0) {
      return '';
    }

    const sections: string[] = ['PROFESSIONAL EXPERIENCE', '-'.repeat(50)];

    for (const exp of experiences) {
      sections.push(`\n${exp.organizationName}`);
      sections.push(`${exp.role} | ${exp.duration}`);

      if (exp.responsibilities && exp.responsibilities.length > 0) {
        sections.push('Responsibilities:');
        for (const resp of exp.responsibilities) {
          sections.push(`  • ${resp}`);
        }
      }

      if (exp.toolsUsed && exp.toolsUsed.length > 0) {
        sections.push(`Tools & Technologies: ${exp.toolsUsed.join(', ')}`);
      }

      if (exp.outcome) {
        sections.push(`Outcome / Impact: ${exp.outcome}`);
      }
    }

    return sections.join('\n');
  }

  /**
   * Format Education section
   * Degree – Branch
   * College / University | Year
   * CGPA / Percentage (optional for experienced)
   */
  private static formatEducation(education: StandardResumeEducation[]): string {
    if (!education || education.length === 0) {
      return '';
    }

    const sections: string[] = ['EDUCATION', '-'.repeat(50)];

    for (const edu of education) {
      sections.push(`\n${edu.degree}${edu.branch ? ' – ' + edu.branch : ''}`);
      sections.push(`${edu.collegeUniversity} | ${edu.year}`);
      if (edu.cgpaPercentage) {
        sections.push(`CGPA / Percentage: ${edu.cgpaPercentage}`);
      }
    }

    return sections.join('\n');
  }

  /**
   * Format Certifications & Training section
   * Course Name – Platform / Organization
   * Year
   */
  private static formatCertifications(certifications: StandardResumeCertification[]): string {
    const sections: string[] = ['CERTIFICATIONS & TRAINING', '-'.repeat(50)];

    for (const cert of certifications) {
      sections.push(`${cert.courseName} – ${cert.platformOrganization}`);
      sections.push(`Year: ${cert.year}`);
      sections.push('');
    }

    return sections.join('\n');
  }

  /**
   * Format Achievements & Activities section
   * Hackathons / Awards / Recognition
   * Workshops / Seminars / Leadership roles
   */
  private static formatAchievements(achievements: StandardResumeAchievement[]): string {
    const sections: string[] = ['ACHIEVEMENTS & ACTIVITIES', '-'.repeat(50)];

    for (const achievement of achievements) {
      const dateStr = achievement.date ? ` (${achievement.date})` : '';
      sections.push(`• ${achievement.title}${dateStr}`);
    }

    return sections.join('\n');
  }

  /**
   * Format Soft Skills section
   * Communication
   * Teamwork
   * Time Management
   * Problem Solving
   */
  private static formatSoftSkills(softSkills: StandardResume['softSkills']): string {
    const sections: string[] = ['SOFT SKILLS', '-'.repeat(50)];
    const skills: string[] = [];

    if (softSkills.communication) skills.push('Communication');
    if (softSkills.teamwork) skills.push('Teamwork');
    if (softSkills.timeManagement) skills.push('Time Management');
    if (softSkills.problemSolving) skills.push('Problem Solving');

    if (softSkills.customSkills && softSkills.customSkills.length > 0) {
      skills.push(...softSkills.customSkills);
    }

    if (skills.length > 0) {
      sections.push(skills.join(', '));
    }

    return sections.join('\n');
  }

  /**
   * Format Additional Information section
   * Languages Known
   * Willingness to Relocate
   * Availability
   */
  private static formatAdditionalInfo(additionalInfo: StandardResume['additionalInfo']): string {
    if (!additionalInfo) return '';
    
    const sections: string[] = ['ADDITIONAL INFORMATION', '-'.repeat(50)];

    if (additionalInfo.languagesKnown && additionalInfo.languagesKnown.length > 0) {
      sections.push(`Languages Known: ${additionalInfo.languagesKnown.join(', ')}`);
    }

    if (additionalInfo.willingnessToRelocate !== undefined) {
      sections.push(`Willing to Relocate: ${additionalInfo.willingnessToRelocate ? 'Yes' : 'No'}`);
    }

    if (additionalInfo.availability) {
      sections.push(`Availability: ${additionalInfo.availability}`);
    }

    return sections.join('\n');
  }

  /**
   * Format Declaration section
   */
  private static formatDeclaration(declaration: string): string {
    return `DECLARATION\n${'-'.repeat(50)}\n${declaration}`;
  }

  /**
   * Generate HTML for resume with proper ATS-friendly formatting
   */
  static generateHTML(resume: StandardResume): string {
    const plainText = this.generatePlainText(resume);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${resume.header.fullName || 'Resume'} - ${resume.targetRole}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Calibri', 'Arial', 'Times New Roman', serif;
            font-size: 11pt;
            line-height: 1.4;
            color: #000;
            background: #fff;
            padding: 0.5in;
            max-width: 8.5in;
            margin: 0 auto;
        }
        
        @media print {
            body {
                padding: 0.4in;
                margin: 0;
            }
        }
        
        /* Header Styles */
        .header {
            text-align: center;
            margin-bottom: 0.2in;
            padding-bottom: 0.15in;
            border-bottom: 2px solid #000;
        }
        
        .name {
            font-weight: bold;
            font-size: 14pt;
            letter-spacing: 1px;
            margin-bottom: 0.05in;
        }
        
        .contact-info {
            font-size: 10.5pt;
            margin: 0.02in 0;
        }
        
        /* Section Headers */
        .section-header {
            font-weight: bold;
            font-size: 11pt;
            text-transform: uppercase;
            margin-top: 0.15in;
            margin-bottom: 0.08in;
            border-bottom: 1px solid #000;
            padding-bottom: 0.05in;
        }
        
        /* Section Content */
        .section-content {
            font-size: 10.5pt;
            line-height: 1.3;
            margin-left: 0;
        }
        
        /* Entry styles */
        .entry {
            margin-bottom: 0.1in;
        }
        
        .entry-header {
            font-weight: bold;
            margin-bottom: 0.02in;
        }
        
        .entry-subheader {
            font-size: 10.5pt;
            margin-bottom: 0.05in;
        }
        
        .bullet-list {
            margin-left: 0.25in;
            margin-top: 0.05in;
            font-size: 10.5pt;
        }
        
        .bullet-list li {
            margin-bottom: 0.02in;
            line-height: 1.25;
        }
        
        /* Skills section */
        .skill-category {
            margin-bottom: 0.05in;
            font-size: 10.5pt;
        }
        
        .skill-category strong {
            font-weight: bold;
        }
        
        /* ATS-Friendly: no colors, no special formatting */
        a {
            color: #000;
            text-decoration: none;
        }
    </style>
</head>
<body>
    ${this.getHTMLHeader(resume.header)}
    ${this.getHTMLProfileSummary(resume.profileSummary)}
    ${this.getHTMLKeySkills(resume.keySkills)}
    ${this.getHTMLProfessionalExperience(resume.professionalExperience)}
    ${this.getHTMLEducation(resume.education)}
    ${resume.certifications && resume.certifications.length > 0 ? this.getHTMLCertifications(resume.certifications) : ''}
    ${resume.achievements && resume.achievements.length > 0 ? this.getHTMLAchievements(resume.achievements) : ''}
    ${resume.softSkills ? this.getHTMLSoftSkills(resume.softSkills) : ''}
    ${resume.additionalInfo ? this.getHTMLAdditionalInfo(resume.additionalInfo) : ''}
    ${resume.declaration ? this.getHTMLDeclaration(resume.declaration) : ''}
</body>
</html>`;

    return html;
  }

  private static getHTMLHeader(header: StandardResumeHeader): string {
    let contactInfo: string[] = [];
    if (header.mobileNumber) contactInfo.push(`Mobile: ${header.mobileNumber}`);
    if (header.professionalEmail) contactInfo.push(`Email: ${header.professionalEmail}`);
    if (header.city || header.state) {
      const location = [header.city, header.state].filter(Boolean).join(', ');
      contactInfo.push(`Location: ${location}`);
    }

    let links: string[] = [];
    if (header.linkedinURL) links.push(`LinkedIn: ${header.linkedinURL}`);
    if (header.githubURL) links.push(`GitHub: ${header.githubURL}`);
    if (header.portfolioURL) links.push(`Portfolio: ${header.portfolioURL}`);

    return `<div class="header">
        <div class="name">${header.fullName || 'Your Name'}</div>
        ${contactInfo.map(info => `<div class="contact-info">${info}</div>`).join('')}
        ${links.length > 0 ? `<div class="contact-info">${links.join(' | ')}</div>` : ''}
    </div>`;
  }

  private static getHTMLProfileSummary(summary: string): string {
    return `<div class="section">
        <div class="section-header">Profile Summary</div>
        <div class="section-content">${summary}</div>
    </div>`;
  }

  private static getHTMLKeySkills(skills: StandardResume['keySkills']): string {
    const skillsContent: string[] = [];

    if (skills.programmingLanguages?.length) {
      skillsContent.push(`<div class="skill-category"><strong>Programming Languages:</strong> ${skills.programmingLanguages.join(', ')}</div>`);
    }
    if (skills.webFrameworks?.length) {
      skillsContent.push(`<div class="skill-category"><strong>Web / Frameworks:</strong> ${skills.webFrameworks.join(', ')}</div>`);
    }
    if (skills.databases?.length) {
      skillsContent.push(`<div class="skill-category"><strong>Databases:</strong> ${skills.databases.join(', ')}</div>`);
    }
    if (skills.toolsAndTechnologies?.length) {
      skillsContent.push(`<div class="skill-category"><strong>Tools & Technologies:</strong> ${skills.toolsAndTechnologies.join(', ')}</div>`);
    }
    if (skills.operatingSystems?.length) {
      skillsContent.push(`<div class="skill-category"><strong>Operating Systems:</strong> ${skills.operatingSystems.join(', ')}</div>`);
    }

    return `<div class="section">
        <div class="section-header">Key Skills</div>
        <div class="section-content">${skillsContent.join('')}</div>
    </div>`;
  }

  private static getHTMLProfessionalExperience(experiences: StandardResumeExperience[]): string {
    if (!experiences?.length) return '';

    const expHTML = experiences.map(exp => `
        <div class="entry">
            <div class="entry-header">${exp.organizationName}</div>
            <div class="entry-subheader">${exp.role} | ${exp.duration}</div>
            ${exp.responsibilities?.length ? `<ul class="bullet-list">${exp.responsibilities.map(r => `<li>${r}</li>`).join('')}</ul>` : ''}
            ${exp.toolsUsed?.length ? `<div class="skill-category"><strong>Tools & Technologies:</strong> ${exp.toolsUsed.join(', ')}</div>` : ''}
            ${exp.outcome ? `<div class="entry-subheader">Outcome / Impact: ${exp.outcome}</div>` : ''}
        </div>
    `).join('');

    return `<div class="section">
        <div class="section-header">Professional Experience</div>
        <div class="section-content">${expHTML}</div>
    </div>`;
  }

  private static getHTMLEducation(education: StandardResumeEducation[]): string {
    if (!education?.length) return '';

    const eduHTML = education.map(edu => `
        <div class="entry">
            <div class="entry-header">${edu.degree}${edu.branch ? ' – ' + edu.branch : ''}</div>
            <div class="entry-subheader">${edu.collegeUniversity} | ${edu.year}</div>
            ${edu.cgpaPercentage ? `<div class="entry-subheader">CGPA / Percentage: ${edu.cgpaPercentage}</div>` : ''}
        </div>
    `).join('');

    return `<div class="section">
        <div class="section-header">Education</div>
        <div class="section-content">${eduHTML}</div>
    </div>`;
  }

  private static getHTMLCertifications(certifications: StandardResumeCertification[]): string {
    const certHTML = certifications.map(cert => `
        <div class="entry">
            <div class="entry-header">${cert.courseName} – ${cert.platformOrganization}</div>
            <div class="entry-subheader">Year: ${cert.year}</div>
        </div>
    `).join('');

    return `<div class="section">
        <div class="section-header">Certifications & Training</div>
        <div class="section-content">${certHTML}</div>
    </div>`;
  }

  private static getHTMLAchievements(achievements: StandardResumeAchievement[]): string {
    const achievHTML = achievements.map(ach => `
        <div class="entry-subheader">• ${ach.title}${ach.date ? ` (${ach.date})` : ''}</div>
    `).join('');

    return `<div class="section">
        <div class="section-header">Achievements & Activities</div>
        <div class="section-content">${achievHTML}</div>
    </div>`;
  }

  private static getHTMLSoftSkills(softSkills: StandardResume['softSkills']): string {
    const skills: string[] = [];
    if (softSkills.communication) skills.push('Communication');
    if (softSkills.teamwork) skills.push('Teamwork');
    if (softSkills.timeManagement) skills.push('Time Management');
    if (softSkills.problemSolving) skills.push('Problem Solving');
    if (softSkills.customSkills?.length) skills.push(...softSkills.customSkills);

    if (!skills.length) return '';

    return `<div class="section">
        <div class="section-header">Soft Skills</div>
        <div class="section-content">${skills.join(', ')}</div>
    </div>`;
  }

  private static getHTMLAdditionalInfo(additionalInfo: StandardResume['additionalInfo']): string {
    if (!additionalInfo) return '';
    
    const infoContent: string[] = [];

    if (additionalInfo.languagesKnown?.length) {
      infoContent.push(`<div class="skill-category"><strong>Languages Known:</strong> ${additionalInfo.languagesKnown.join(', ')}</div>`);
    }
    if (additionalInfo.willingnessToRelocate !== undefined) {
      infoContent.push(`<div class="skill-category"><strong>Willing to Relocate:</strong> ${additionalInfo.willingnessToRelocate ? 'Yes' : 'No'}</div>`);
    }
    if (additionalInfo.availability) {
      infoContent.push(`<div class="skill-category"><strong>Availability:</strong> ${additionalInfo.availability}</div>`);
    }

    if (!infoContent.length) return '';

    return `<div class="section">
        <div class="section-header">Additional Information</div>
        <div class="section-content">${infoContent.join('')}</div>
    </div>`;
  }

  private static getHTMLDeclaration(declaration: string): string {
    return `<div class="section">
        <div class="section-header">Declaration</div>
        <div class="section-content">${declaration}</div>
    </div>`;
  }
}
