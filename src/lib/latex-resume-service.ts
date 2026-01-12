/**
 * LaTeX Resume Service
 * Generates LaTeX code for professional resume formatting
 */

import { GeneratedResume } from './gemini-service';

export interface LaTeXResumeData {
  latexCode: string;
  rawJson: GeneratedResume['rawJson'];
}

/**
 * Convert GeneratedResume to LaTeX code
 */
export function generateLaTeXFromResume(resume: GeneratedResume, profile: any): string {
  const name = resume.header?.name || profile?.name || 'Your Name';
  const email = resume.header?.email || profile?.email || '';
  const phone = resume.header?.phone || profile?.phone || '';
  const linkedin = resume.header?.linkedin || profile?.linkedin || '';
  const github = resume.header?.github || profile?.github || '';
  const portfolio = resume.header?.portfolioURL || profile?.portfolioURL || '';

  // Build contact info
  const contactItems: string[] = [];
  if (phone) contactItems.push(phone);
  if (email) contactItems.push(`\\href{mailto:${email}}{${escapeLaTeX(email)}}`);
  if (linkedin) {
    const linkedinUrl = linkedin.startsWith('http') ? linkedin : `https://${linkedin}`;
    contactItems.push(`\\href{${linkedinUrl}}{LinkedIn}`);
  }
  if (github) {
    const githubUrl = github.startsWith('http') ? github : `https://${github}`;
    contactItems.push(`\\href{${githubUrl}}{GitHub}`);
  }
  if (portfolio) {
    const portfolioUrl = portfolio.startsWith('http') ? portfolio : `https://${portfolio}`;
    contactItems.push(`\\href{${portfolioUrl}}{Portfolio}`);
  }

  const latex = `\\documentclass[16pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[margin=0.6in]{geometry}
\\usepackage{enumitem}
\\usepackage{hyperref}
\\usepackage{titlesec}
\\usepackage{fontspec}

% Set fonts
\\setmainfont{Times New Roman}
\\setsansfont{Arial}

% Remove page numbers
\\pagestyle{empty}

% Section formatting
\\titleformat{\\section}
  {\\Large\\bfseries\\sffamily\\uppercase}
  {}
  {0em}
  {}
  [\\titlerule]

\\titlespacing*{\\section}{0pt}{0.18in}{0.1in}

% Custom commands
\\newcommand{\\resumeheader}[1]{
  \\begin{center}
    {\\sffamily\\fontsize{18}{22}\\selectfont\\bfseries\\uppercase{#1}}\\\\[0.1in]
    \\normalfont\\fontsize{16}{18}\\selectfont\\sffamily
  }

\\newcommand{\\resumeendheader}{
  \\end{center}
  \\vspace{0.1in}
}

\\begin{document}

% Header
\\resumeheader{${escapeLaTeX(name)}}
${contactItems.join(' \\quad $|$ \\quad ')}
\\resumeendheader

${resume.summary ? `% Professional Summary
\\section{Professional Summary}
${formatLaTeXText(resume.summary)}

` : ''}${resume.experience ? `% Experience
\\section{Professional Experience}
${formatLaTeXExperience(resume.experience)}

` : ''}${resume.skills ? `% Skills
\\section{Technical Skills}
${formatLaTeXSkills(resume.skills)}

` : ''}${resume.education ? `% Education
\\section{Education}
${formatLaTeXEducation(resume.education)}

` : ''}${resume.projects || (profile?.projects && profile.projects.length > 0) ? `% Projects
\\section{Projects}
${formatLaTeXProjects(
  resume.projects || 
  (profile?.projects && Array.isArray(profile.projects) ? profile.projects.map((proj: any) => {
    const title = proj.title || 'Project';
    const tech = proj.tech || (Array.isArray(proj.technologies) ? proj.technologies.join(', ') : 'N/A');
    const desc = proj.description || 'Project implementation and features';
    return `**${title}** | Technologies: ${tech}\n${desc}`;
  }).join('\n\n') : '')
)}

` : ''}${resume.certifications ? `% Certifications
\\section{Certifications}
${formatLaTeXCertifications(resume.certifications)}

` : ''}${resume.languages ? `% Languages
\\section{Languages}
${formatLaTeXLanguages(resume.languages)}

` : ''}${resume.volunteerWork ? `% Volunteer Work
\\section{Volunteer Work}
${formatLaTeXVolunteer(resume.volunteerWork)}

` : ''}\\end{document}`;

  return latex;
}

/**
 * Convert Markdown bold to LaTeX bold
 */
function markdownToLaTeX(text: string): string {
  if (!text) return '';
  return text.replace(/\*\*(.*?)\*\*/g, '\\textbf{$1}');
}

/**
 * Format experience section for LaTeX
 */
function formatLaTeXExperience(experience: string): string {
  const lines = experience.split('\n').filter(l => l.trim());
  let output = '';
  let currentJob = '';
  let currentBullets: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Check if it's a job header (contains **bold** title, company, and duration)
    const headerMatch = trimmed.match(/\*\*([^*]+)\*\*\s*\|\s*([^|]+)\s*\|\s*(.+)/);
    if (headerMatch) {
      // Save previous job if exists
      if (currentJob) {
        output += `\\textbf{${escapeLaTeX(currentJob)}}\\\\[0.05in]\n`;
        if (currentBullets.length > 0) {
          output += `\\begin{itemize}[leftmargin=0.25in, itemsep=0.02in]\n`;
          output += currentBullets.map(b => `  \\item ${escapeLaTeX(b.replace(/^[•\-]\s*/, ''))}`).join('\n');
          output += `\n\\end{itemize}\n\\vspace{0.05in}\n`;
        }
      }
      // Start new job
      currentJob = `${headerMatch[1].trim()} | ${headerMatch[2].trim()} | ${headerMatch[3].trim()}`;
      currentBullets = [];
    } else if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
      currentBullets.push(trimmed);
    } else if (trimmed && !trimmed.match(/^#+\s/)) {
      if (!currentJob) {
        currentJob = trimmed;
      } else {
        currentBullets.push(trimmed);
      }
    }
  }

  // Add last job
  if (currentJob) {
    output += `\\textbf{${escapeLaTeX(currentJob)}}\\\\[0.05in]\n`;
    if (currentBullets.length > 0) {
      output += `\\begin{itemize}[leftmargin=0.25in, itemsep=0.02in]\n`;
      output += currentBullets.map(b => `  \\item ${escapeLaTeX(b.replace(/^[•\-]\s*/, ''))}`).join('\n');
      output += `\n\\end{itemize}\n\\vspace{0.05in}\n`;
    }
  }

  return output || formatLaTeXText(experience);
}

/**
 * Format skills section for LaTeX
 */
function formatLaTeXSkills(skills: string): string {
  const skillsList = skills.split(/[,•]/).map(s => s.trim()).filter(s => s);
  return skillsList.map(s => escapeLaTeX(s)).join(' $\\bullet$ ');
}

/**
 * Format education section for LaTeX
 */
function formatLaTeXEducation(education: string): string {
  const lines = education.split('\n').filter(l => l.trim());
  return lines.map(line => {
    const match = line.match(/\*\*([^*]+)\*\*\s*\|\s*([^|]+)\s*\|\s*(.+)/);
    if (match) {
      return `\\textbf{${escapeLaTeX(match[1].trim())}} | ${escapeLaTeX(match[2].trim())} | ${escapeLaTeX(match[3].trim())}`;
    }
    return escapeLaTeX(line);
  }).join('\\\\[0.05in]\n');
}

/**
 * Format projects section for LaTeX
 * ALWAYS formats descriptions as bullet points, even if user provided plain text
 */
function formatLaTeXProjects(projects: string): string {
  const lines = projects.split('\n').filter(l => l.trim());
  let output = '';
  let currentProject = '';
  let currentDesc: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const headerMatch = trimmed.match(/\*\*([^*]+)\*\*\s*\|\s*Technologies:\s*(.+)/i);
    if (headerMatch) {
      // Save previous project with bullets
      if (currentProject) {
        output += `\\textbf{${escapeLaTeX(currentProject)}}\\\\[0.03in]\n`;
        if (currentDesc.length > 0) {
          output += `\\begin{itemize}[leftmargin=0.25in, itemsep=0.02in]\n`;
          // Always format as bullets - split by sentences if needed
          const bulletItems = currentDesc.flatMap(d => {
            const cleaned = d.replace(/^[•\-]\s*/, '').trim();
            // If it's a long description without bullets, split by sentences
            if (cleaned.length > 100 && !cleaned.includes('•') && !cleaned.includes('-')) {
              return cleaned.split(/[.!?]\s+/).filter(b => b.trim()).map(b => b.trim());
            }
            return [cleaned];
          }).filter(b => b.length > 0);
          
          output += bulletItems.map(b => `  \\item ${escapeLaTeX(b)}`).join('\n');
          output += `\n\\end{itemize}\n\\vspace{0.05in}\n`;
        } else {
          // Even if no description, add a placeholder bullet
          output += `\\begin{itemize}[leftmargin=0.25in, itemsep=0.02in]\n`;
          output += `  \\item Project details and implementation\n`;
          output += `\\end{itemize}\n\\vspace{0.05in}\n`;
        }
      }
      currentProject = `${headerMatch[1].trim()} | Technologies: ${headerMatch[2].trim()}`;
      currentDesc = [];
    } else if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
      currentDesc.push(trimmed);
    } else if (trimmed && !trimmed.match(/^#+\s/)) {
      // Plain text description - will be converted to bullets
      currentDesc.push(trimmed);
    }
  }

  // Handle last project
  if (currentProject) {
    output += `\\textbf{${escapeLaTeX(currentProject)}}\\\\[0.03in]\n`;
    if (currentDesc.length > 0) {
      output += `\\begin{itemize}[leftmargin=0.25in, itemsep=0.02in]\n`;
      // Always format as bullets - split by sentences if needed
      const bulletItems = currentDesc.flatMap(d => {
        const cleaned = d.replace(/^[•\-]\s*/, '').trim();
        // If it's a long description without bullets, split by sentences
        if (cleaned.length > 100 && !cleaned.includes('•') && !cleaned.includes('-')) {
          return cleaned.split(/[.!?]\s+/).filter(b => b.trim()).map(b => b.trim()).slice(0, 3); // Max 3 bullets
        }
        return [cleaned];
      }).filter(b => b.length > 0);
      
      output += bulletItems.map(b => `  \\item ${escapeLaTeX(b)}`).join('\n');
      output += `\n\\end{itemize}\n`;
    } else {
      // Even if no description, add a placeholder bullet
      output += `\\begin{itemize}[leftmargin=0.25in, itemsep=0.02in]\n`;
      output += `  \\item Project details and implementation\n`;
      output += `\\end{itemize}\n`;
    }
  }

  return output || formatLaTeXText(projects);
}

/**
 * Format certifications section for LaTeX
 */
function formatLaTeXCertifications(certifications: string): string {
  const lines = certifications.split('\n').filter(l => l.trim());
  return lines.map(line => {
    const match = line.match(/\*\*([^*]+)\*\*\s*—\s*(.+)/);
    if (match) {
      return `\\textbf{${escapeLaTeX(match[1].trim())}} --- ${escapeLaTeX(match[2].trim())}`;
    }
    return escapeLaTeX(line);
  }).join('\\\\[0.05in]\n');
}

/**
 * Format languages section for LaTeX
 */
function formatLaTeXLanguages(languages: string): string {
  const lines = languages.split('\n').filter(l => l.trim());
  return lines.map(line => escapeLaTeX(line)).join('\\\\[0.05in]\n');
}

/**
 * Format volunteer work section for LaTeX
 */
function formatLaTeXVolunteer(volunteer: string): string {
  return formatLaTeXExperience(volunteer);
}

/**
 * Escape LaTeX special characters and handle markdown bold (**text**)
 */
function escapeLaTeX(text: string): string {
  if (!text) return '';
  
  // First split by markdown bold pattern
  const parts = text.split(/(\*\*.*?\*\*)/g);
  let result = '';
  
  for (const part of parts) {
    if (part.startsWith('**') && part.endsWith('**')) {
      // This is a bold section
      const content = part.slice(2, -2);
      result += `\\textbf{${escapeLaTeXInternal(content)}}`;
    } else {
      // This is regular text
      result += escapeLaTeXInternal(part);
    }
  }
  
  return result;
}

/**
 * Internal helper to escape LaTeX special characters
 */
function escapeLaTeXInternal(text: string): string {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/\$/g, '\\$')
    .replace(/\&/g, '\\&')
    .replace(/\#/g, '\\#')
    .replace(/\^/g, '\\textasciicircum{}')
    .replace(/\_/g, '\\_')
    .replace(/\~/g, '\\textasciitilde{}')
    .replace(/\%/g, '\\%');
}

/**
 * Format plain text for LaTeX
 */
function formatLaTeXText(text: string): string {
  return escapeLaTeX(text).replace(/\n\n+/g, '\n\n').replace(/\n/g, '\\\\[0.05in]\n');
}

