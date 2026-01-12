/**
 * Complete Resume Generation Flow
 * Fetches user profile + extra requirements and sends to Ollama
 * Returns ATS-optimized resume JSON for PDF/DOCX generation
 * Uses server action to bypass CORS issues
 */

import { generateResumeAction } from '@/app/actions/resume-ollama-action';
import { parseCompleteProfile } from './resume-profile-helper';
import { convertFirestoreToPlain } from './utils';
import { logger } from './logger';

export interface ResumeGenerationRequest {
  profileData: any;           // Complete user profile from Firestore
  extraRequirements?: string; // Job description or extra requirements
  targetRole?: string;        // Target job role
}

export interface GeneratedResumeResponse {
  success: boolean;
  resume?: any;               // The generated resume JSON from Ollama
  error?: string;
}

/**
 * Ensure a value is an array, safely handling various input types
 */
function ensureArray(value: any): any[] {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (typeof value === 'string') return []; // Don't try to iterate strings
  if (typeof value === 'object') return [value]; // Single object, wrap in array
  return [];
}

/**
 * Parse experience string from Ollama into array of objects
 * Ollama returns: "**Role** | Company | Date\n• Bullet 1\n• Bullet 2\n\n**Role2** | Company2 | Date2\n..."
 */
function parseExperienceString(expString: string): any[] {
  if (!expString || typeof expString !== 'string') return [];

  const experiences: any[] = [];
  
  // Split by double newlines to separate job entries
  const jobSections = expString.split(/\n\n+/).filter(s => s.trim());
  
  for (const section of jobSections) {
    const lines = section.split('\n').filter(l => l.trim());
    if (lines.length === 0) continue;
    
    // First line has: **Role** | Company | Duration
    const headerLine = lines[0];
    const headerMatch = headerLine.match(/\*\*(.*?)\*\*\s*\|\s*(.+?)\s*\|\s*(.+)/);
    
    if (!headerMatch) continue;
    
    const role = headerMatch[1].trim();
    const company = headerMatch[2].trim();
    const duration = headerMatch[3].trim();
    
    // Remaining lines are bullets
    const bullets = lines
      .slice(1)
      .map(l => l.replace(/^[•\-\*]\s*/, '').trim())
      .filter(b => b.length > 0);
    
    experiences.push({
      role,
      company,
      duration,
      description: bullets.join('\n'),
      bullets,
    });
  }
  
  return experiences;
}

/**
 * Parse education string from Ollama into array of objects
 * Ollama returns: "**Degree** | University | Year\n**Degree2** | University2 | Year2"
 */
function parseEducationString(eduString: string): any[] {
  if (!eduString || typeof eduString !== 'string') return [];

  const educations: any[] = [];
  const lines = eduString.split('\n').filter(l => l.trim());
  
  for (const line of lines) {
    const match = line.match(/\*\*(.*?)\*\*\s*\|\s*(.+?)\s*\|\s*(.+)/);
    if (match) {
      educations.push({
        degree: match[1].trim(),
        university: match[2].trim(),
        year: match[3].trim(),
      });
    }
  }
  
  return educations;
}

/**
 * Parse projects string from Ollama into array of objects
 */
function parseProjectsString(projString: string): any[] {
  if (!projString || typeof projString !== 'string') return [];

  const projects: any[] = [];
  const projectSections = projString.split(/\n\n+/).filter(s => s.trim());
  
  for (const section of projectSections) {
    const lines = section.split('\n').filter(l => l.trim());
    if (lines.length === 0) continue;
    
    // First line: **Title** | Technologies: Tech1, Tech2
    const headerLine = lines[0];
    const headerMatch = headerLine.match(/\*\*(.*?)\*\*\s*\|\s*Technologies:\s*(.+)/);
    
    if (!headerMatch) continue;
    
    const title = headerMatch[1].trim();
    const tech = headerMatch[2].trim();
    
    // Remaining lines are description
    const description = lines.slice(1).join('\n').trim();
    
    projects.push({
      title,
      tech,
      description,
    });
  }
  
  return projects;
}

/**
 * Parse certifications string from Ollama into array of objects
 */
function parseCertificationsString(certString: string): any[] {
  if (!certString || typeof certString !== 'string') return [];

  const certifications: any[] = [];
  const lines = certString.split('\n').filter(l => l.trim());
  
  for (const line of lines) {
    const match = line.match(/\*\*(.*?)\*\*\s*[—-]\s*(.+)/);
    if (match) {
      certifications.push({
        title: match[1].trim(),
        issuer: match[2].trim(),
      });
    }
  }
  
  return certifications;
}

/**
 * Parse languages string from Ollama into array of objects
 */
function parseLanguagesString(langString: string): any[] {
  if (!langString || typeof langString !== 'string') return [];

  const languages: any[] = [];
  const items = langString.split(',').filter(s => s.trim());
  
  for (const item of items) {
    const match = item.trim().match(/(.+?)\s*\((.+?)\)/);
    if (match) {
      languages.push({
        language: match[1].trim(),
        proficiency: match[2].trim(),
      });
    } else if (item.trim()) {
      languages.push({
        language: item.trim(),
        proficiency: 'Fluent',
      });
    }
  }
  
  return languages;
}

/**
 * Parse volunteer work string from Ollama into array of objects
 */
function parseVolunteerString(volString: string): any[] {
  if (!volString || typeof volString !== 'string') return [];

  const volunteers: any[] = [];
  const sections = volString.split(/\n\n+/).filter(s => s.trim());
  
  for (const section of sections) {
    const lines = section.split('\n').filter(l => l.trim());
    if (lines.length === 0) continue;
    
    const headerLine = lines[0];
    const match = headerLine.match(/\*\*(.*?)\*\*\s*\|\s*(.+?)\s*\|\s*(.+)/);
    
    if (match) {
      volunteers.push({
        role: match[1].trim(),
        organization: match[2].trim(),
        duration: match[3].trim(),
        description: lines.slice(1).join('\n').trim(),
      });
    }
  }
  
  return volunteers;
}

/**
 * Parse publications string from Ollama into array of objects
 */
function parsePublicationsString(pubString: string): any[] {
  if (!pubString || typeof pubString !== 'string') return [];

  const publications: any[] = [];
  const lines = pubString.split('\n').filter(l => l.trim());
  
  for (const line of lines) {
    const match = line.match(/\*\*(.*?)\*\*\s*[—-]\s*(.+?),\s*(.+)/);
    if (match) {
      publications.push({
        title: match[1].trim(),
        publication: match[2].trim(),
        date: match[3].trim(),
      });
    }
  }
  
  return publications;
}

/**
 * Parse awards string from Ollama into array of objects
 */
function parseAwardsString(awardString: string): any[] {
  if (!awardString || typeof awardString !== 'string') return [];

  const awards: any[] = [];
  const lines = awardString.split('\n').filter(l => l.trim());
  
  for (const line of lines) {
    const match = line.match(/\*\*(.*?)\*\*\s*[—-]\s*(.+?),\s*(.+)/);
    if (match) {
      awards.push({
        title: match[1].trim(),
        organization: match[2].trim(),
        date: match[3].trim(),
      });
    }
  }
  
  return awards;
}

/**
 * Parse skills string into array if needed (Ollama may return comma-separated string)
 */
function parseSkillsString(skillString: string): string | string[] {
  if (!skillString || typeof skillString !== 'string') return '';
  
  // If it looks like a comma-separated list, keep as string (PDF generator can handle it)
  // The PDF generator treats skills as comma-separated text
  return skillString.trim();
}

/**
 * Sanitize and validate resume structure from Ollama
 * Converts formatted strings into structured arrays
 */
function sanitizeResumeData(resume: any): any {
  if (!resume) return {};

  return {
    ...resume,
    header: resume.header || {},
    personalDetails: resume.personalDetails || {},
    summary: resume.summary || '',
    skills: resume.skills ? (typeof resume.skills === 'string' ? resume.skills : (Array.isArray(resume.skills) ? resume.skills.join(', ') : '')) : '',
    technicalTools: resume.technicalTools ? (typeof resume.technicalTools === 'string' ? resume.technicalTools : (Array.isArray(resume.technicalTools) ? resume.technicalTools.join(', ') : '')) : '',
    // Parse string fields into arrays
    experience: typeof resume.experience === 'string' ? parseExperienceString(resume.experience) : ensureArray(resume.experience),
    education: typeof resume.education === 'string' ? parseEducationString(resume.education) : ensureArray(resume.education),
    projects: typeof resume.projects === 'string' ? parseProjectsString(resume.projects) : ensureArray(resume.projects),
    certifications: typeof resume.certifications === 'string' ? parseCertificationsString(resume.certifications) : ensureArray(resume.certifications),
    languages: typeof resume.languages === 'string' ? parseLanguagesString(resume.languages) : ensureArray(resume.languages),
    volunteerWork: typeof resume.volunteerWork === 'string' ? parseVolunteerString(resume.volunteerWork) : ensureArray(resume.volunteerWork),
    publications: typeof resume.publications === 'string' ? parsePublicationsString(resume.publications) : ensureArray(resume.publications),
    awards: typeof resume.awards === 'string' ? parseAwardsString(resume.awards) : ensureArray(resume.awards),
    interests: resume.interests || '',
    latexCode: resume.latexCode || '',
  };
}

export interface ResumeGenerationRequest {
  profileData: any;           // Complete user profile from Firestore
  extraRequirements?: string; // Job description or extra requirements
  targetRole?: string;        // Target job role
}

export interface GeneratedResumeResponse {
  success: boolean;
  resume?: any;               // The generated resume JSON from Ollama
  error?: string;
}

/**
 * Main resume generation function
 * Orchestrates the complete flow: profile extraction → Ollama → resume JSON
 */
export async function generateResumeFromProfile(
  request: ResumeGenerationRequest
): Promise<GeneratedResumeResponse> {
  const operationId = `resume-flow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    logger.info('Starting resume generation flow', {
      operationId,
      hasProfile: !!request.profileData,
      hasExtraRequirements: !!request.extraRequirements,
      targetRole: request.targetRole,
    });

    // Step 1: Validate input
    if (!request.profileData) {
      throw new Error('Profile data is required');
    }

    // Step 2: Convert Firestore data to plain object
    logger.debug('Converting profile data', { operationId });
    const plainProfileData = convertFirestoreToPlain(request.profileData);

    // Step 3: Parse complete profile (extracts all fields)
    logger.debug('Parsing complete profile', { operationId });
    const completeProfile = parseCompleteProfile(plainProfileData);

    logger.debug('Profile parsed successfully', {
      operationId,
      name: completeProfile.name,
      email: completeProfile.email,
      experienceCount: completeProfile.experience?.length || 0,
      educationCount: completeProfile.education?.length || 0,
      skillsCount: completeProfile.skills?.length || 0,
      projectsCount: completeProfile.projects?.length || 0,
    });

    // Step 4: Prepare Ollama input
    const role = request.targetRole || completeProfile.jobPreferences?.[0]?.desiredRoles || 'Professional';
    const extraInfo = request.extraRequirements || completeProfile.extraInfo || '';

    logger.debug('Preparing Ollama request', {
      operationId,
      role,
      hasExtraInfo: !!extraInfo,
    });

    // Step 5: Send to Ollama for resume generation
    logger.info('Calling Ollama for resume generation', {
      operationId,
      role,
      profileName: completeProfile.name,
    });

    const ollamaInput = {
      profile: completeProfile,
      role: role,
      extraRequirements: extraInfo,
    };

    const generatedResume = await generateResumeAction(ollamaInput);

    // Sanitize resume data to ensure all fields are properly structured
    const sanitizedResume = sanitizeResumeData(generatedResume);

    logger.info('Resume generated successfully', {
      operationId,
      hasSummary: !!sanitizedResume.summary,
      hasHeader: !!sanitizedResume.header,
      experienceCount: sanitizedResume.experience?.length || 0,
      educationCount: sanitizedResume.education?.length || 0,
      skillsCount: sanitizedResume.skills?.length || 0,
    });

    // Step 6: Return success with generated resume
    return {
      success: true,
      resume: {
        ...sanitizedResume,
        userProfile: completeProfile, // Include profile for reference
        role: role,
        generatedAt: new Date().toISOString(),
      },
    };
  } catch (error: any) {
    const errorMsg = error instanceof Error ? error.message : String(error);

    logger.error('Resume generation flow failed', error, {
      operationId,
      errorMessage: errorMsg,
    });

    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Generate resume and return both the resume data and the complete user profile
 * Useful for passes to PDF/DOCX generators
 */
export async function generateResumeWithProfileData(
  profileData: any,
  extraRequirements?: string,
  targetRole?: string
): Promise<{
  success: boolean;
  resume?: any;
  profile?: any;
  error?: string;
}> {
  const result = await generateResumeFromProfile({
    profileData,
    extraRequirements,
    targetRole,
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return {
    success: true,
    resume: result.resume,
    profile: result.resume?.userProfile,
  };
}
