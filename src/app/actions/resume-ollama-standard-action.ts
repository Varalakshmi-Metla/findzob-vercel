/**
 * Resume Generation with Standard Format
 * This action used to use Ollama but is now migrated to Google Gemini API
 * Enforces STANDARD RESUME FORMAT (Universal) with all 10 sections
 */

'use server';

import { logger } from '@/lib/logger';
import { StandardResume } from '@/lib/resume-standard-format';
import { generateStandardResumeWithGemini } from '@/lib/gemini-service';

export interface ResumeGenerationRequest {
  profile: any;
  targetRole: string;
  jobDescription?: string;
  extraRequirements?: string;
}

export interface ResumeGenerationResult {
  success: boolean;
  resume?: StandardResume;
  error?: string;
  metadata?: {
    generationTime: number;
    modelUsed: string;
  };
}

/**
 * Generate resume using Gemini
 * Replaces legacy Ollama implementation
 */
export async function generateResumeWithOllama(
  request: ResumeGenerationRequest
): Promise<ResumeGenerationResult> {
  const startTime = Date.now();

  try {
    logger.info('🎯 Standard resume generation started (Gemini)', {
      targetRole: request.targetRole,
    });

    const result = await generateStandardResumeWithGemini({
      profile: request.profile,
      targetRole: request.targetRole,
      jobDescription: request.jobDescription || request.extraRequirements
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to generate resume with Gemini');
    }

    return {
      success: true,
      resume: result.resume,
      metadata: {
        generationTime: Date.now() - startTime,
        modelUsed: result.metadata?.modelUsed || 'Gemini',
      },
    };
  } catch (error: any) {
    logger.error('❌ Standard resume generation failed', error);

    return {
      success: false,
      error: error.message || 'Unknown error during resume generation',
      metadata: {
        generationTime: Date.now() - startTime,
        modelUsed: 'Gemini',
      },
    };
  }
}

