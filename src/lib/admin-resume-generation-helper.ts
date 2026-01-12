/**
 * Resume Generation Helper for Admin (my-users page)
 * Generates resumes using standard format with Gemini
 */

import { StandardResume } from '@/lib/resume-standard-format';
import { generateResumeWithOllama } from '@/app/actions/resume-ollama-standard-action';

export interface AdminResumeGenerationInput {
  userId: string;
  targetRole: string;
  profile: any;
  jobDescription?: string;
  extraRequirements?: string;
}

/**
 * Generate resume for user using Gemini with standard format
 */
export async function generateUserResumeWithStandardFormat(
  input: AdminResumeGenerationInput
): Promise<StandardResume> {
  const { userId, targetRole, profile, jobDescription, extraRequirements } = input;

  if (!userId) throw new Error('User ID is required');
  if (!targetRole) throw new Error('Target role is required');
  if (!profile) throw new Error('Profile data is required');

  console.log('📝 Generating resume with STANDARD FORMAT for user:', {
    userId,
    targetRole,
    hasJobDescription: !!jobDescription,
    hasExtraRequirements: !!extraRequirements,
  });

  // Call Gemini-based generation (through the legacy-named action)
  const result = await generateResumeWithOllama({
    profile,
    targetRole,
    jobDescription: jobDescription || extraRequirements,
  });

  if (!result.success || !result.resume) {
    throw new Error(result.error || 'Failed to generate resume');
  }

  console.log('✅ Standard format resume generated:', {
    type: result.resume.resumeType,
    sections: {
      header: !!result.resume.header,
      summary: !!result.resume.profileSummary,
      experience: result.resume.professionalExperience?.length || 0,
      education: result.resume.education?.length || 0,
    },
  });

  return result.resume;
}

/**
 * Build resume data object for Firestore storage
 */
export function buildResumeDataForStorage(
  resume: StandardResume,
  userId: string,
  employeeId: string | undefined,
  metadata?: any
): any {
  return {
    ...resume,
    userId,
    createdAt: new Date().toISOString(),
    createdBy: employeeId || '',
    format: 'standard',
    aiGenerated: true,
    metadata: {
      generatedRole: resume.targetRole,
      resumeType: resume.resumeType,
      generationTime: metadata?.generationTime,
      model: metadata?.modelUsed,
      ...metadata,
    },
  };
}
