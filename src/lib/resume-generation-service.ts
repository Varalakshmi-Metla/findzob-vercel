/**
 * Complete Resume Generation Service
 * Fresh implementation: User Profile → Ollama → Optimized Resume
 * Handles all resume generation logic in one place
 */

import { generateResumeFromProfile } from './resume-generation-flow';
import { parseCompleteProfile, logProfileDataSummary } from './resume-profile-helper';
import { convertFirestoreToPlain } from './utils';
import { logger } from './logger';
import { determineResumeStrategy, type ResumeStrategy } from './resume-strategy-helper';

declare const process: {
  env: {
    OLLAMA_BASE_URL?: string;
  };
};

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://192.168.27.14:11434";

/**
 * Check if Ollama server is working and accessible
 */
async function checkOllamaAvailability(): Promise<{ isAvailable: boolean; error?: string; responseTime?: number }> {
  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const responseTime = Date.now() - startTime;

    if (response.ok) {
      logger.info('Ollama server is available', {
        baseUrl: OLLAMA_BASE_URL,
        responseTime,
      });
      return { isAvailable: true, responseTime };
    } else {
      const errorMsg = `HTTP ${response.status}: ${response.statusText}`;
      logger.error('Ollama server returned error', undefined, {
        baseUrl: OLLAMA_BASE_URL,
        status: response.status,
        responseTime,
      });
      return { isAvailable: false, error: errorMsg, responseTime };
    }
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    if (error.name === 'AbortError') {
      logger.error('Ollama server check timed out', undefined, {
        baseUrl: OLLAMA_BASE_URL,
        responseTime,
      });
      return { isAvailable: false, error: 'Server timeout - no response within 5 seconds', responseTime };
    }
    
    logger.error('Ollama server is not available', error, {
      baseUrl: OLLAMA_BASE_URL,
      errorName: error.name,
      errorMessage: error.message,
      responseTime,
    });
    
    return { 
      isAvailable: false, 
      error: `Cannot connect: ${error.message || 'Server unreachable'}`,
      responseTime 
    };
  }
}

export interface ResumeGenerationConfig {
  profileData: any;           // Complete user profile from Firestore
  targetRole: string;         // Target job role
  extraRequirements?: string; // Job description or requirements
  extraInfo?: string;         // Additional context
}

export interface GeneratedResumeData {
  success: boolean;
  resumeType?: 'fresher' | 'experienced'; // Resume type detected from experience data
  resumeStrategy?: ResumeStrategy;          // Complete strategy information
  resumeData?: {
    header?: any;
    summary?: string;
    experience?: any[];
    education?: any[];
    skills?: string;
    projects?: any[];
    certifications?: any[];
    languages?: any[];
    technicalTools?: string;
    volunteerWork?: any[];
    publications?: any[];
    awards?: any[];
    interests?: string;
  };
  metadata?: {
    generatedAt: string;
    targetRole: string;
    profileName: string;
    resumeType: 'fresher' | 'experienced';
    yearsOfExperience: number;
    careerLevel: string;
    hasExtraRequirements: boolean;
    dataFieldsCount: {
      experience: number;
      education: number;
      projects: number;
      skills: number;
      certifications: number;
      languages: number;
      tools: number;
    };
  };
  error?: string;
}

/**
 * Generate optimized resume from user profile using Ollama
 * Complete flow: Profile validation → Ollama generation → Data sanitization
 */
export async function generateOptimizedResume(
  config: ResumeGenerationConfig
): Promise<GeneratedResumeData> {
  const startTime = Date.now();
  const operationId = `resume-opt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    logger.info('Starting optimized resume generation', {
      operationId,
      targetRole: config.targetRole,
      hasExtraRequirements: !!config.extraRequirements,
    });

    // Step 1: Validate input
    if (!config.profileData) {
      throw new Error('Profile data is required');
    }
    if (!config.targetRole || config.targetRole.trim().length === 0) {
      throw new Error('Target role is required');
    }

    // Step 1.5: Check if Ollama is available BEFORE processing profile
    logger.info('Checking Ollama server availability', {
      operationId,
      baseUrl: OLLAMA_BASE_URL,
    });

    const ollamaCheck = await checkOllamaAvailability();
    console.log('🔍 OLLAMA SERVER STATUS:', {
      operationId,
      timestamp: new Date().toISOString(),
      isAvailable: ollamaCheck.isAvailable,
      baseUrl: OLLAMA_BASE_URL,
      responseTime: ollamaCheck.responseTime,
      error: ollamaCheck.error || null,
    });

    if (!ollamaCheck.isAvailable) {
      const errorMessage = `Ollama server is not available: ${ollamaCheck.error || 'Unknown error'}`;
      logger.error('Resume generation aborted - Ollama unavailable', undefined, {
        operationId,
        baseUrl: OLLAMA_BASE_URL,
        error: ollamaCheck.error,
        responseTime: ollamaCheck.responseTime,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }

    logger.info('Ollama server is available - proceeding with generation', {
      operationId,
      responseTime: ollamaCheck.responseTime,
    });

    // Step 2: Convert and parse profile
    logger.debug('Converting and parsing user profile', { operationId });
    const plainProfileData = convertFirestoreToPlain(config.profileData);
    const completeProfile = parseCompleteProfile(plainProfileData);

    // Log detailed profile data
    console.log('🔍 RESUME GENERATION - COMPLETE PROFILE DATA:', {
      timestamp: new Date().toISOString(),
      operationId,
      targetRole: config.targetRole,
      
      contactInfo: {
        name: completeProfile.name,
        email: completeProfile.email,
        phone: completeProfile.phone,
        linkedin: completeProfile.linkedin,
        github: completeProfile.github,
        portfolioURL: completeProfile.portfolioURL,
        location: completeProfile.location,
      },
      
      personalDetails: {
        gender: completeProfile.gender,
        dateOfBirth: completeProfile.dateOfBirth,
        citizenship: completeProfile.citizenship,
        totalExperience: completeProfile.totalExperience,
        visaStatus: completeProfile.visaStatus,
        sponsorship: completeProfile.sponsorship,
      },
      
      professionalData: {
        experience: completeProfile.experience?.length || 0,
        education: completeProfile.education?.length || 0,
        skills: completeProfile.skills?.length || 0,
        projects: completeProfile.projects?.length || 0,
        certifications: completeProfile.certifications?.length || 0,
        languages: completeProfile.languages?.length || 0,
        technicalTools: completeProfile.technicalTools?.length || 0,
        volunteerWork: completeProfile.volunteerWork?.length || 0,
        publications: completeProfile.publications?.length || 0,
        awards: completeProfile.awards?.length || 0,
      },
      
      extraData: {
        hasExtraRequirements: !!config.extraRequirements?.trim(),
        hasExtraInfo: !!config.extraInfo?.trim(),
        interests: !!completeProfile.interests,
      },
    });

    logProfileDataSummary(completeProfile, 'resume-service-generation');

    // Step 3: Detect resume type (fresher vs experienced)
    const resumeStrategy = determineResumeStrategy(completeProfile);
    
    logger.info('Resume type detected', {
      operationId,
      resumeType: resumeStrategy.type,
      yearsOfExperience: resumeStrategy.years,
      careerLevel: resumeStrategy.requirementLevel,
    });

    // Log resume strategy for debugging
    console.log('📋 RESUME STRATEGY DETECTED:', {
      operationId,
      resumeType: resumeStrategy.type,
      yearsOfExperience: resumeStrategy.years,
      careerLevel: resumeStrategy.requirementLevel,
      recommendation: resumeStrategy.recommendation,
      profileName: completeProfile.name,
      targetRole: config.targetRole,
      experienceCount: completeProfile.experience?.length || 0,
      educationCount: completeProfile.education?.length || 0,
      projectsCount: completeProfile.projects?.length || 0,
      skillsCount: completeProfile.skills?.length || 0,
    });

    // Step 4: Send to Ollama for resume generation
    logger.info('Sending to Ollama for resume generation', {
      operationId,
      role: config.targetRole,
      profileName: completeProfile.name,
      resumeType: resumeStrategy.type,
    });

    const generationResult = await generateResumeFromProfile({
      profileData: {
        ...completeProfile,
        extraRequirements: config.extraRequirements?.trim(),
        extraInfo: config.extraInfo?.trim(),
      },
      targetRole: config.targetRole,
      extraRequirements: config.extraRequirements?.trim(),
    });

    if (!generationResult.success || !generationResult.resume) {
      throw new Error(generationResult.error || 'Failed to generate resume from Ollama');
    }

    logger.info('Resume generated successfully from Ollama', {
      operationId,
      resumeType: resumeStrategy.type,
      hasSummary: !!generationResult.resume.summary,
      experienceCount: generationResult.resume.experience?.length || 0,
      educationCount: generationResult.resume.education?.length || 0,
    });

    // Step 5: Build response with metadata
    const generatedResume = generationResult.resume;

    const response: GeneratedResumeData = {
      success: true,
      resumeType: resumeStrategy.type,
      resumeStrategy: resumeStrategy,
      resumeData: {
        header: generatedResume.header || {},
        summary: generatedResume.summary || '',
        experience: Array.isArray(generatedResume.experience) ? generatedResume.experience : [],
        education: Array.isArray(generatedResume.education) ? generatedResume.education : [],
        skills: generatedResume.skills || '',
        projects: Array.isArray(generatedResume.projects) ? generatedResume.projects : [],
        certifications: Array.isArray(generatedResume.certifications) ? generatedResume.certifications : [],
        languages: Array.isArray(generatedResume.languages) ? generatedResume.languages : [],
        technicalTools: generatedResume.technicalTools || '',
        volunteerWork: Array.isArray(generatedResume.volunteerWork) ? generatedResume.volunteerWork : [],
        publications: Array.isArray(generatedResume.publications) ? generatedResume.publications : [],
        awards: Array.isArray(generatedResume.awards) ? generatedResume.awards : [],
        interests: generatedResume.interests || '',
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        targetRole: config.targetRole,
        profileName: completeProfile.name || 'User',
        resumeType: resumeStrategy.type,
        yearsOfExperience: resumeStrategy.years,
        careerLevel: resumeStrategy.requirementLevel,
        hasExtraRequirements: !!config.extraRequirements?.trim(),
        dataFieldsCount: {
          experience: completeProfile.experience?.length || 0,
          education: completeProfile.education?.length || 0,
          projects: completeProfile.projects?.length || 0,
          skills: completeProfile.skills?.length || 0,
          certifications: completeProfile.certifications?.length || 0,
          languages: completeProfile.languages?.length || 0,
          tools: completeProfile.technicalTools?.length || 0,
        },
      },
    };

    logger.info('Resume generation completed successfully', {
      operationId,
      resumeType: resumeStrategy.type,
      duration: Date.now() - startTime,
      hasMetadata: !!response.metadata,
    });

    return response;
  } catch (error) {
    logger.error('Resume generation failed', error instanceof Error ? error : new Error(String(error)), {
      operationId,
      duration: Date.now() - startTime,
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during resume generation',
    };
  }
}

/**
 * Build resume object for storing in Firestore
 * Includes all profile data and metadata
 */
export function buildResumeObject(
  resumeData: GeneratedResumeData['resumeData'],
  profileData: any,
  config: ResumeGenerationConfig,
  userId: string,
  metadata?: any
): any {
  if (!resumeData) {
    throw new Error('Resume data is required');
  }

  // Parse profile for storage
  const parsedProfile = parseCompleteProfile(convertFirestoreToPlain(profileData));

  const resumeObject = {
    // Generated resume content
    summary: resumeData.summary || '',
    header: resumeData.header || {},
    experience: resumeData.experience || [],
    education: resumeData.education || [],
    skills: resumeData.skills || '',
    projects: resumeData.projects || [],
    certifications: resumeData.certifications || [],
    languages: resumeData.languages || [],
    technicalTools: resumeData.technicalTools || '',
    volunteerWork: resumeData.volunteerWork || [],
    publications: resumeData.publications || [],
    awards: resumeData.awards || [],
    interests: resumeData.interests || '',

    // Metadata
    role: config.targetRole,
    createdAt: new Date().toISOString(),
    userId: userId,
    extraRequirements: config.extraRequirements?.trim() || undefined,
    extraInfo: config.extraInfo?.trim() || undefined,

    // Complete profile data for download/reference
    profileData: {
      name: parsedProfile.name || '',
      email: parsedProfile.email || '',
      phone: parsedProfile.phone || '',
      linkedin: parsedProfile.linkedin || '',
      github: parsedProfile.github || '',
      portfolioURL: parsedProfile.portfolioURL || '',
      location: parsedProfile.location || '',
      address: parsedProfile.address || '',
      gender: parsedProfile.gender || '',
      dateOfBirth: parsedProfile.dateOfBirth || '',
      citizenship: parsedProfile.citizenship || '',
      totalExperience: parsedProfile.totalExperience || '',
      visaStatus: parsedProfile.visaStatus || '',
      sponsorship: parsedProfile.sponsorship || '',
      skills: parsedProfile.skills || [],
      experience: parsedProfile.experience || [],
      education: parsedProfile.education || [],
      projects: parsedProfile.projects || [],
      certifications: parsedProfile.certifications || [],
      languages: parsedProfile.languages || [],
      technicalTools: parsedProfile.technicalTools || [],
      volunteerWork: parsedProfile.volunteerWork || [],
      publications: parsedProfile.publications || [],
      awards: parsedProfile.awards || [],
      interests: parsedProfile.interests || '',
    },

    // Generation metadata
    generationMetadata: {
      generatedAt: new Date().toISOString(),
      targetRole: config.targetRole,
      hasExtraRequirements: !!config.extraRequirements?.trim(),
      hasExtraInfo: !!config.extraInfo?.trim(),
      ollamaGenerated: true,
      ...metadata,
    },

    // System fields
    interviewHistory: [],
    isPaid: metadata?.isPaid || false,
  };

  // Log what's being stored
  console.log('📝 RESUME OBJECT BEING STORED:', {
    timestamp: new Date().toISOString(),
    role: config.targetRole,
    storedData: {
      summary: !!resumeObject.summary,
      experienceCount: resumeObject.experience?.length || 0,
      educationCount: resumeObject.education?.length || 0,
      skillsLength: resumeObject.skills?.length || 0,
      projectsCount: resumeObject.projects?.length || 0,
      certificationsCount: resumeObject.certifications?.length || 0,
      languagesCount: resumeObject.languages?.length || 0,
      technicalToolsLength: resumeObject.technicalTools?.length || 0,
      volunteerWorkCount: resumeObject.volunteerWork?.length || 0,
      publicationsCount: resumeObject.publications?.length || 0,
      awardsCount: resumeObject.awards?.length || 0,
      interests: !!resumeObject.interests,
    },
  });

  return resumeObject;
}

/**
 * Helper to clean undefined values from object
 */
export function removeUndefinedValues(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) {
    return obj.map(removeUndefinedValues).filter(item => item !== null && item !== undefined);
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined && value !== null) {
        const cleanedValue = removeUndefinedValues(value);
        if (cleanedValue !== null) {
          cleaned[key] = cleanedValue;
        }
      }
    }
    return cleaned;
  }
  return obj;
}
