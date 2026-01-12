'use server';

/**
 * Server action for resume generation with Ollama
 * Bypasses CORS issues by making Ollama requests server-side
 */

import { generateResumeWithGemini } from '@/lib/gemini-service';
import { logger } from '@/lib/logger';

export async function generateResumeAction(input: any) {
  try {
    logger.info('Server action: generateResumeAction started', {
      hasProfile: !!input.profile,
      hasRole: !!input.role,
    });

    const result = await generateResumeWithGemini(input);

    logger.info('Server action: generateResumeAction completed successfully', {
      success: !!result,
    });

    return result;
  } catch (error: any) {
    logger.error('Server action: generateResumeAction failed', error instanceof Error ? error : new Error(String(error)), {
      errorMessage: error?.message || String(error),
    });
    throw error;
  }
}
