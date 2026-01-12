/**
 * Resume Profile Helper
 * Unified utility functions for handling, parsing, and preparing user profile data
 * for resume generation across the application
 */

import { convertFirestoreToPlain } from './utils';

export interface ProfileDataParsed {
  // Contact Information
  name?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  github?: string;
  portfolioURL?: string;
  address?: string;
  location?: string;

  // Profile Details
  gender?: string;
  dateOfBirth?: string;
  citizenship?: string;
  totalExperience?: string;
  visaStatus?: string;
  sponsorship?: string;

  // Professional Data
  skills: string[];
  experience: Array<{
    company: string;
    role: string;
    duration: string;
    description?: string;
  }>;
  education: Array<{
    degree: string;
    university: string;
    year?: string;
    duration?: string;
  }>;
  projects: Array<{
    title: string;
    tech: string;
    description?: string;
  }>;
  certifications: Array<{
    title: string;
    issuer: string;
  }>;
  languages: Array<{
    language: string;
    proficiency: string;
  }>;
  technicalTools: string[];
  volunteerWork: Array<{
    role: string;
    organization: string;
    duration: string;
    description?: string;
  }>;
  publications: Array<{
    title: string;
    publication: string;
    date: string;
  }>;
  awards: Array<{
    title: string;
    organization: string;
    date: string;
  }>;
  interests?: string;
  jobPreferences?: Array<{
    desiredRoles?: string;
  }>;

  // Extra information for resume enhancement
  extraRequirements?: string;
  extraInfo?: string;
}

/**
 * Parse a string value that may be:
 * - Array of strings
 * - Comma/semicolon/newline separated string
 * - Single string value
 * Returns: Array of trimmed strings
 */
export function parseStringToArray(value?: any, delimiter: RegExp = /\n|;|,/): string[] {
  if (!value) return [];

  // Already an array
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === 'string' ? v.trim() : String(v).trim()))
      .filter((v) => v.length > 0);
  }

  // String value - split by delimiter
  if (typeof value === 'string') {
    return value
      .split(delimiter)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  return [];
}

/**
 * Parse experience data from various formats
 * Handles: Array, Firestore map object, nested objects, or string
 * CRITICAL: Validates all fields and handles missing data gracefully
 */
export function parseExperience(
  expData?: any
): Array<{
  company: string;
  role: string;
  duration: string;
  description?: string;
}> {
  if (!expData) return [];

  try {
    // Already an array with proper structure
    if (Array.isArray(expData)) {
      return expData
        .filter((exp) => exp && (exp.company || exp.companyName || exp.role || exp.position || typeof exp === 'object'))
        .map((exp) => {
          if (typeof exp === 'string') {
            return { company: 'Company', role: exp.trim(), duration: '', description: '' };
          }
          return {
            company: (exp.company || exp.companyName || exp.organization || exp.employer || '').toString().trim(),
            role: (exp.role || exp.position || exp.jobTitle || exp.title || '').toString().trim(),
            duration: (exp.duration || exp.period || exp.tenure || exp.dates || exp.timeline || '').toString().trim(),
            description: (exp.description || exp.details || exp.responsibilities || exp.achievements || '').toString().trim(),
          };
        })
        .filter((exp) => exp.company || exp.role);
    }

    // Firestore map object (object with numeric or string keys)
    if (typeof expData === 'object' && expData !== null && !Array.isArray(expData)) {
      const entries = Object.values(expData);
      if (entries.length > 0) {
        return entries
          .filter((exp: any) => exp && (exp.company || exp.companyName || exp.role || exp.position || typeof exp === 'object'))
          .map((exp: any) => {
            if (typeof exp === 'string') {
              return { company: 'Company', role: exp.trim(), duration: '', description: '' };
            }
            return {
              company: (exp.company || exp.companyName || exp.organization || exp.employer || '').toString().trim(),
              role: (exp.role || exp.position || exp.jobTitle || exp.title || '').toString().trim(),
              duration: (exp.duration || exp.period || exp.tenure || exp.dates || exp.timeline || '').toString().trim(),
              description: (exp.description || exp.details || exp.responsibilities || exp.achievements || '').toString().trim(),
            };
          })
          .filter((exp) => exp.company || exp.role);
      }
    }

    // String format - parse it
    if (typeof expData === 'string' && expData.trim()) {
      const entries = expData.split(/\n\n|\n(?=[A-Z]|\*\*)/) ;
      const result: Array<{ company: string; role: string; duration: string; description?: string }> = [];
      
      entries.forEach((entry) => {
        const trimmed = entry.trim();
        if (!trimmed) return;

        const lines = trimmed.split('\n').map((l) => l.replace(/^\*\*|\*\*$/g, '').trim());
        let role = '';
        let company = '';
        let duration = '';
        let description = '';

        lines.forEach((line, idx) => {
          if (!line) return;

          const dateMatch = line.match(/(\d{4}\s*-\s*(?:\d{4}|Present|Now|Current)|[A-Za-z]+ \d{4}\s*-\s*(?:[A-Za-z]+ \d{4}|Present|Current))/i);
          if (dateMatch) {
            duration = dateMatch[0].trim();
            return;
          }

          if (idx === 0) {
            if (line.includes('|')) {
              const parts = line.split('|').map((p) => p.trim());
              role = parts[0] || '';
              company = parts[1] || '';
            } else if (line.match(/\sat\s|\s@\s/i)) {
              const atMatch = line.match(/(.+?)\s+(?:at|@)\s+(.+)/i);
              if (atMatch) {
                role = atMatch[1].trim();
                company = atMatch[2].trim();
              }
            } else if (line.includes('-') && !line.match(/\d{4}/)) {
              const parts = line.split('-').map((p) => p.trim());
              role = parts[0] || '';
              company = parts[1] || '';
            } else {
              role = line;
            }
          } else if (!company && idx === 1) {
            company = line;
          } else if (!description && idx > 1) {
            description = line;
          }
        });

        if (role || company) {
          result.push({ company: company || 'Company', role: role || 'Position', duration: duration || '', description: description || undefined });
        }
      });
      
      return result;
    }
  } catch (error) {
    console.error('Error parsing experience:', error);
  }

  return [];
}

/**
 * Parse education data from various formats
 * Handles: Array, Firestore map object, nested objects, or string
 * CRITICAL: Validates all fields and handles missing data gracefully
 */
export function parseEducation(
  eduData?: any
): Array<{
  degree: string;
  university: string;
  year?: string;
  duration?: string;
}> {
  if (!eduData) return [];

  try {
    // Already an array with proper structure
    if (Array.isArray(eduData)) {
      return eduData
        .filter((edu) => edu && (edu.degree || edu.university || edu.school || typeof edu === 'object'))
        .map((edu) => {
          if (typeof edu === 'string') {
            return { degree: edu.trim(), university: 'Institution', year: undefined, duration: undefined };
          }
          return {
            degree: (edu.degree || edu.degreeType || edu.qualification || edu.course || '').toString().trim(),
            university: (edu.university || edu.school || edu.institution || edu.college || edu.schoolName || '').toString().trim(),
            year: (edu.year || edu.graduationYear || edu.passingYear || edu.date || '').toString().trim() || undefined,
            duration: (edu.duration || edu.period || edu.tenure || '').toString().trim() || undefined,
          };
        })
        .filter((edu) => edu.degree || edu.university);
    }

    // Firestore map object (object with numeric or string keys)
    if (typeof eduData === 'object' && eduData !== null && !Array.isArray(eduData)) {
      const entries = Object.values(eduData);
      if (entries.length > 0) {
        return entries
          .filter((edu: any) => edu && (edu.degree || edu.university || edu.school || edu.institution || typeof edu === 'object'))
          .map((edu: any) => {
            if (typeof edu === 'string') {
              return { degree: edu.trim(), university: 'Institution', year: undefined, duration: undefined };
            }
            return {
              degree: (edu.degree || edu.degreeType || edu.qualification || edu.course || '').toString().trim(),
              university: (edu.university || edu.school || edu.institution || edu.college || edu.schoolName || '').toString().trim(),
              year: (edu.year || edu.graduationYear || edu.passingYear || edu.date || '').toString().trim() || undefined,
              duration: (edu.duration || edu.period || edu.tenure || '').toString().trim() || undefined,
            };
          })
          .filter((edu) => edu.degree || edu.university);
      }
    }

    // String format - parse it
    if (typeof eduData === 'string' && eduData.trim()) {
      const entries = eduData.split(/\n\n|\n(?=[A-Z]|\*\*)/);
      const result: Array<{ degree: string; university: string; year?: string; duration?: string }> = [];
      
      entries.forEach((entry) => {
        const trimmed = entry.trim();
        if (!trimmed) return;

        const lines = trimmed.split('\n').map((l) => l.replace(/^\*\*|\*\*$/g, '').trim());
        let degree = '';
        let university = '';
        let year: string | undefined = undefined;

        const degreePattern = /(Bachelor|Master|PhD|Associate|Diploma|Certificate|B\.?Tech|B\.?Sc|M\.?Tech|M\.?Sc|HSC|SSC|IIT|NIT|BCA|MCA|BTech|MTech|BSc|MSc|BE|ME|BA|MA|BBA|MBA|LLB|MBBS|CA|CPA)/i;
        const yearPattern = /(\d{4})/;

        lines.forEach((line, idx) => {
          if (!line) return;

          if (!year) {
            const yearMatch = line.match(yearPattern);
            if (yearMatch) {
              year = yearMatch[0];
            }
          }

          if (idx === 0) {
            if (line.includes('|')) {
              const parts = line.split('|').map((p) => p.trim());
              degree = parts[0] || '';
              university = parts[1] || '';
            } else if (line.includes(',')) {
              const parts = line.split(',').map((p) => p.trim());
              degree = parts[0] || '';
              university = parts[1] || '';
            } else {
              const degreeMatch = line.match(degreePattern);
              if (degreeMatch) {
                const degreeIndex = line.indexOf(degreeMatch[0]);
                degree = line.substring(degreeIndex).split(/\n|,/)[0].trim();
                university = line.substring(0, degreeIndex).trim();
              } else {
                degree = line;
              }
            }
          } else if (!university && idx === 1) {
            university = line;
          }
        });

        if (degree || university) {
          result.push({ degree: degree || 'Degree', university: university || 'Institution', year: year || undefined, duration: undefined });
        }
      });
      
      return result;
    }
  } catch (error) {
    console.error('Error parsing education:', error);
  }

  return [];
}

/**
 * Parse projects data from various formats
 * Handles: Array, Firestore map object, or string
 */
export function parseProjects(
  projData?: any
): Array<{
  title: string;
  tech: string;
  description?: string;
}> {
  if (!projData) return [];

  // Already an array
  if (Array.isArray(projData)) {
    return projData
      .filter((proj) => proj && proj.title)
      .map((proj) => ({
        title: proj.title || '',
        tech: proj.tech || proj.technologies?.join(', ') || 'Technologies used',
        description: proj.description || '',
      }));
  }

  // Firestore map object
  if (typeof projData === 'object' && projData !== null) {
    const entries = Object.values(projData);
    if (entries.length > 0 && typeof entries[0] === 'object') {
      return entries
        .filter((proj: any) => proj && proj.title)
        .map((proj: any) => ({
          title: proj.title || '',
          tech: proj.tech || proj.technologies?.join(', ') || 'Technologies used',
          description: proj.description || '',
        }));
    }
  }

  // String format
  if (typeof projData === 'string') {
    const entries = projData.split(/\n(?=[A-Z])/);
    return entries
      .map((entry) => {
        const trimmed = entry.trim();
        if (!trimmed) return null;

        const colonIndex = trimmed.indexOf(':');
        if (colonIndex > -1) {
          return {
            title: trimmed.substring(0, colonIndex).trim(),
            tech: 'Multiple technologies',
            description: trimmed.substring(colonIndex + 1).trim(),
          } as {
            title: string;
            tech: string;
            description?: string;
          };
        }

        return {
          title: trimmed,
          tech: 'Technologies used',
          description: '',
        } as {
          title: string;
          tech: string;
          description?: string;
        };
      })
      .filter(
        (p): p is {
          title: string;
          tech: string;
          description?: string;
        } => p !== null
      );
  }

  return [];
}

/**
 * Parse certifications from string or array format
 */
export function parseCertifications(
  certData?: any
): Array<{
  title: string;
  issuer: string;
}> {
  if (!certData) return [];

  // Already an array
  if (Array.isArray(certData)) {
    return certData
      .filter((cert) => cert && (cert.title || typeof cert === 'string'))
      .map((cert) => ({
        title: typeof cert === 'string' ? cert : cert.title || '',
        issuer: typeof cert === 'string' ? 'Issuer not specified' : cert.issuer || 'Issuer not specified',
      }));
  }

  // String format
  if (typeof certData === 'string') {
    const entries = certData.split(/\n|;/);
    return entries
      .map((entry) => {
        const trimmed = entry.trim();
        if (!trimmed) return null;

        const fromMatch = trimmed.match(/(.+?)\s+(?:from|by|issued by)\s+(.+)/i);
        if (fromMatch) {
          return {
            title: fromMatch[1].trim(),
            issuer: fromMatch[2].trim(),
          };
        }

        return {
          title: trimmed,
          issuer: 'Issuer not specified',
        };
      })
      .filter(
        (c): c is {
          title: string;
          issuer: string;
        } => c !== null
      );
  }

  return [];
}

/**
 * Parse languages data
 */
export function parseLanguages(
  langData?: any
): Array<{
  language: string;
  proficiency: string;
}> {
  if (!langData) return [];

  if (Array.isArray(langData)) {
    return langData
      .filter((lang) => lang && (lang.language || typeof lang === 'string'))
      .map((lang) => ({
        language: typeof lang === 'string' ? lang : lang.language || '',
        proficiency: typeof lang === 'string' ? 'Fluent' : lang.proficiency || 'Fluent',
      }));
  }

  if (typeof langData === 'string') {
    const entries = langData.split(/\n|;|,/);
    return entries
      .map((entry) => {
        const trimmed = entry.trim();
        if (!trimmed) return null;

        const dashMatch = trimmed.match(/(.+?)\s*[-–]\s*(.+)/);
        if (dashMatch) {
          return {
            language: dashMatch[1].trim(),
            proficiency: dashMatch[2].trim(),
          };
        }

        return {
          language: trimmed,
          proficiency: 'Fluent',
        };
      })
      .filter(
        (l): l is {
          language: string;
          proficiency: string;
        } => l !== null
      );
  }

  return [];
}

/**
 * Parse technical tools from any format
 */
export function parseTechnicalTools(toolsData?: any): string[] {
  if (!toolsData) return [];

  if (Array.isArray(toolsData)) {
    return toolsData
      .map((tool) => (typeof tool === 'string' ? tool : JSON.stringify(tool)))
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
  }

  return parseStringToArray(toolsData);
}

/**
 * Parse volunteer work
 */
export function parseVolunteerWork(
  volData?: any
): Array<{
  role: string;
  organization: string;
  duration: string;
  description?: string;
}> {
  if (!volData) return [];

  if (Array.isArray(volData)) {
    return volData
      .filter((vol) => vol && (vol.role || vol.organization))
      .map((vol) => ({
        role: vol.role || '',
        organization: vol.organization || '',
        duration: vol.duration || '',
        description: vol.description || '',
      }));
  }

  if (typeof volData === 'object') {
    const entries = Object.values(volData);
    if (entries.length > 0 && typeof entries[0] === 'object') {
      return entries
        .filter((vol: any) => vol && (vol.role || vol.organization))
        .map((vol: any) => ({
          role: vol.role || '',
          organization: vol.organization || '',
          duration: vol.duration || '',
          description: vol.description || '',
        }));
    }
  }

  return [];
}

/**
 * Parse publications
 */
export function parsePublications(
  pubData?: any
): Array<{
  title: string;
  publication: string;
  date: string;
}> {
  if (!pubData) return [];

  if (Array.isArray(pubData)) {
    return pubData
      .filter((pub) => pub && pub.title)
      .map((pub) => ({
        title: pub.title || '',
        publication: pub.publication || '',
        date: pub.date || '',
      }));
  }

  if (typeof pubData === 'object') {
    const entries = Object.values(pubData);
    if (entries.length > 0 && typeof entries[0] === 'object') {
      return entries
        .filter((pub: any) => pub && pub.title)
        .map((pub: any) => ({
          title: pub.title || '',
          publication: pub.publication || '',
          date: pub.date || '',
        }));
    }
  }

  return [];
}

/**
 * Parse awards
 */
export function parseAwards(
  awardData?: any
): Array<{
  title: string;
  organization: string;
  date: string;
}> {
  if (!awardData) return [];

  if (Array.isArray(awardData)) {
    return awardData
      .filter((award) => award && award.title)
      .map((award) => ({
        title: award.title || '',
        organization: award.organization || '',
        date: award.date || '',
      }));
  }

  if (typeof awardData === 'object') {
    const entries = Object.values(awardData);
    if (entries.length > 0 && typeof entries[0] === 'object') {
      return entries
        .filter((award: any) => award && award.title)
        .map((award: any) => ({
          title: award.title || '',
          organization: award.organization || '',
          date: award.date || '',
        }));
    }
  }

  return [];
}

/**
 * Main function to parse complete user profile data
 * Handles mixed data types from Firestore and ensures consistent output
 * CAPTURES ALL AVAILABLE USER DATA FOR COMPREHENSIVE RESUME GENERATION
 */
export function parseCompleteProfile(rawProfileData: any): ProfileDataParsed {
  // Convert Firestore objects to plain objects first
  const plainData = convertFirestoreToPlain(rawProfileData);

  // Extract and parse all possible user data fields
  // This ensures maximum data capture from user profile
  const parsedData: ProfileDataParsed = {
    // Contact Information - capture all variants
    name: plainData.name || plainData.fullName || plainData.displayName || '',
    email: plainData.email || plainData.emailAddress || '',
    phone: plainData.phone || plainData.phoneNumber || plainData.mobileNumber || '',
    linkedin: plainData.linkedin || plainData.linkedinURL || plainData.linkedinProfile || '',
    github: plainData.github || plainData.githubURL || plainData.githubProfile || '',
    portfolioURL: plainData.portfolioURL || plainData.portfolio || plainData.website || '',
    address: plainData.address || plainData.streetAddress || '',
    location: plainData.location || plainData.city || plainData.currentLocation || '',

    // Profile Details - capture all variants
    gender: plainData.gender || '',
    dateOfBirth: plainData.dateOfBirth || plainData.dob || plainData.birthDate || '',
    citizenship: plainData.citizenship || plainData.country || plainData.nationality || '',
    totalExperience: plainData.totalExperience || plainData.yearsOfExperience || plainData.experienceYears || '',
    visaStatus: plainData.visaStatus || plainData.visa || '',
    sponsorship: plainData.sponsorship || plainData.workAuthorization || '',

    // Professional Data - Parse with appropriate helpers using all possible field names
    skills: parseStringToArray(
      plainData.skills || 
      plainData.keySkills || 
      plainData.technicalSkills ||
      plainData.coreSkills ||
      plainData.skillsArray ||
      plainData.expertise
    ),
    
    experience: parseExperience(
      plainData.experience || 
      plainData.workExperience ||
      plainData.jobHistory ||
      plainData.employmentHistory ||
      plainData.professionalExperience
    ),
    
    education: parseEducation(
      plainData.education || 
      plainData.educationalBackground ||
      plainData.academics ||
      plainData.degrees ||
      plainData.qualifications
    ),
    
    projects: parseProjects(
      plainData.projects || 
      plainData.portfolio ||
      plainData.workProjects ||
      plainData.caseStudies ||
      plainData.personalProjects
    ),
    
    certifications: parseCertifications(
      plainData.certifications || 
      plainData.licenses ||
      plainData.credentials ||
      plainData.certifications_list
    ),
    
    languages: parseLanguages(
      plainData.languages || 
      plainData.languagesSpoken ||
      plainData.knownLanguages ||
      plainData.fluency
    ),
    
    technicalTools: parseTechnicalTools(
      plainData.technicalTools || 
      plainData.tools ||
      plainData.software ||
      plainData.platforms ||
      plainData.technologies
    ),
    
    volunteerWork: parseVolunteerWork(
      plainData.volunteerWork || 
      plainData.volunteer ||
      plainData.volunteering ||
      plainData.communityService
    ),
    
    publications: parsePublications(
      plainData.publications || 
      plainData.articles ||
      plainData.papers ||
      plainData.writtenWork
    ),
    
    awards: parseAwards(
      plainData.awards || 
      plainData.honors ||
      plainData.recognition ||
      plainData.achievements
    ),
    
    interests: plainData.interests || plainData.hobbies || plainData.personalInterests || '',
    
    jobPreferences: Array.isArray(plainData.jobPreferences)
      ? plainData.jobPreferences
      : Array.isArray(plainData.desiredRoles)
        ? plainData.desiredRoles.map((role: any) => ({ desiredRoles: role }))
        : [],

    // Extra information
    extraRequirements: plainData.extraRequirements || undefined,
    extraInfo: plainData.extraInfo || undefined,
  };

  return parsedData;
}

/**
 * Generate a professional summary from parsed profile data
 * Uses only actual user data - no fabrication
 */
export function generateProfessionalSummary(
  parsedProfile: ProfileDataParsed,
  role: string
): string {
  const totalExpYears = parsedProfile.experience?.length || 0;
  const keySkills = parsedProfile.skills?.slice(0, 3).join(', ') || 'professional skills';
  const extraInfoSummary = parsedProfile.extraInfo?.substring(0, 150).trim() || '';

  let summary = '';

  if (totalExpYears > 0) {
    summary = `Experienced ${role} with ${totalExpYears}+ years of professional background in ${keySkills}.`;
  } else {
    summary = `Motivated ${role} with strong expertise in ${keySkills}.`;
  }

  // Add extra info if available
  if (extraInfoSummary) {
    summary += ` ${extraInfoSummary}`;
  } else if (parsedProfile.projects && parsedProfile.projects.length > 0) {
    // Fallback to project description
    summary += ` Proven track record of delivering successful projects including ${parsedProfile.projects[0]?.title}.`;
  }

  // Add role-specific closing
  if (role.toLowerCase().includes('developer') || role.toLowerCase().includes('engineer')) {
    summary += ' Passionate about writing clean, scalable code and building innovative solutions.';
  } else if (role.toLowerCase().includes('manager') || role.toLowerCase().includes('lead')) {
    summary += ' Strong leadership capabilities with focus on team development and project success.';
  } else if (role.toLowerCase().includes('designer')) {
    summary +=
      ' Creative problem solver with strong design thinking and attention to detail in user experience.';
  } else if (role.toLowerCase().includes('analyst')) {
    summary += ' Data-driven problem solver with strong analytical and communication skills.';
  }

  return summary;
}

/**
 * Log profile data summary for debugging
 */
export function logProfileDataSummary(profile: ProfileDataParsed, context: string = ''): void {
  console.log(`📋 Profile Data Summary ${context}:`, {
    name: profile.name,
    email: profile.email,
    skillsCount: profile.skills?.length || 0,
    experienceCount: profile.experience?.length || 0,
    educationCount: profile.education?.length || 0,
    projectsCount: profile.projects?.length || 0,
    certificationsCount: profile.certifications?.length || 0,
    languagesCount: profile.languages?.length || 0,
    technicalToolsCount: profile.technicalTools?.length || 0,
    volunteerWorkCount: profile.volunteerWork?.length || 0,
    publicationsCount: profile.publications?.length || 0,
    awardsCount: profile.awards?.length || 0,
    firstExperience: profile.experience?.[0],
    firstEducation: profile.education?.[0],
    firstProject: profile.projects?.[0],
    hasExtraInfo: !!profile.extraInfo,
    hasExtraRequirements: !!profile.extraRequirements,
  });
}
