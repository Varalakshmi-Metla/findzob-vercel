'use server';
/**
 * Resume Generation Flow using Ollama API
 * This uses the local Ollama server for resume generation
 */

import { generateResumeWithGemini, type ResumeGenerationInput, type GeneratedResume } from '@/lib/gemini-service';
import { logger } from '@/lib/logger';

/**
 * Main function to generate a resume for a given profile and target role
 * @param profile User profile data
 * @param role Target job role
 * @returns Generated resume
 */
export async function generateResume(
  profile: ResumeGenerationInput['profile'],
  role: string
): Promise<GeneratedResume> {
  if (!profile) {
    throw new Error('Profile data is required');
  }

  if (!role || typeof role !== 'string') {
    throw new Error('Target role is required');
  }

  const startTime = Date.now();
  try {
    logger.info('Starting resume generation', {
      role,
      hasProfile: !!profile,
      profileName: profile?.name,
      experienceCount: profile?.experience?.length || 0,
      projectsCount: profile?.projects?.length || 0,
    });
    
    const input: ResumeGenerationInput = {
      profile,
      role,
    };

    const generatedResume = await generateResumeWithGemini(input);

    if (!generatedResume) {
      logger.error('No resume was generated', undefined, { role });
      throw new Error('No resume was generated');
    }

    const totalTime = Date.now() - startTime;
    logger.info('Resume generation completed successfully', {
      role,
      totalTime,
      hasLatexCode: !!generatedResume.latexCode,
      hasSummary: !!generatedResume.summary,
    });
    return generatedResume;
  } catch (error) {
    const totalTime = Date.now() - startTime;
    logger.error('Error in generateResume', error instanceof Error ? error : new Error(String(error)), {
      role,
      totalTime,
    });
    throw new Error(
      `Resume generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Generate resume for a specific job posting
 * @param profile User profile
 * @param role Target role
 * @param jobDescription Job posting description/requirements
 * @returns Generated resume tailored to the job
 */
export async function generateResumeForJob(
  profile: ResumeGenerationInput['profile'],
  role: string,
  jobDescription: string
): Promise<GeneratedResume> {
  if (!jobDescription) {
    // Fall back to regular generation if no job description
    return generateResume(profile, role);
  }

  const startTime = Date.now();
  try {
    logger.info('Starting job-specific resume generation', {
      role,
      jobDescriptionLength: jobDescription.length,
      hasProfile: !!profile,
    });

    const enhancedProfile: ResumeGenerationInput['profile'] = {
      ...profile,
      extraRequirements: jobDescription,
    };

    const input: ResumeGenerationInput = {
      profile: enhancedProfile,
      role,
    };

    const generatedResume = await generateResumeWithGemini(input);

    const totalTime = Date.now() - startTime;
    logger.info('Job-specific resume generation completed', {
      role,
      totalTime,
      hasLatexCode: !!generatedResume.latexCode,
    });
    return generatedResume;
  } catch (error) {
    const totalTime = Date.now() - startTime;
    logger.error('Error in generateResumeForJob', error instanceof Error ? error : new Error(String(error)), {
      role,
      totalTime,
    });
    throw new Error(
      `Job-specific resume generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Generate multiple resume versions for different roles
 * @param profile User profile
 * @param roles Array of target roles
 * @returns Map of role -> generated resume
 */
export async function generateMultipleResumes(
  profile: ResumeGenerationInput['profile'],
  roles: string[]
): Promise<Map<string, GeneratedResume>> {
  if (!roles || roles.length === 0) {
    throw new Error('At least one role is required');
  }

  const startTime = Date.now();
  try {
    logger.info('Starting multiple resume generation', {
      rolesCount: roles.length,
      roles: roles.join(', '),
      hasProfile: !!profile,
    });

    const results = new Map<string, GeneratedResume>();

    // Generate resumes sequentially to respect rate limits
    for (let i = 0; i < roles.length; i++) {
      const role = roles[i];
      logger.debug('Generating resume', {
        role,
        index: i + 1,
        total: roles.length,
      });
      const resume = await generateResume(profile, role);
      results.set(role, resume);
    }

    const totalTime = Date.now() - startTime;
    logger.info('Multiple resume generation completed', {
      rolesCount: results.size,
      totalTime,
      averageTimePerResume: totalTime / results.size,
    });
    return results;
  } catch (error) {
    const totalTime = Date.now() - startTime;
    logger.error('Error in generateMultipleResumes', error instanceof Error ? error : new Error(String(error)), {
      rolesCount: roles.length,
      totalTime,
    });
    throw new Error(
      `Multiple resume generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
