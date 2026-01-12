/**
 * Resume Format Utilities
 * Client-side formatting utilities for StandardResume objects
 * These are NOT server actions - they're pure utility functions
 */

import { StandardResume, StandardResumeFormatter } from '@/lib/resume-standard-format';

/**
 * Generate resume HTML from StandardResume object
 * Safe for client-side use - no server action involved
 * @param resume StandardResume object with all 10 sections
 * @returns HTML string ready for download or printing
 */
export function generateResumeHTML(resume: StandardResume): string {
  return StandardResumeFormatter.generateHTML(resume);
}

/**
 * Generate resume plain text from StandardResume object
 * Safe for client-side use - no server action involved
 * @param resume StandardResume object with all 10 sections
 * @returns Plain text string
 */
export function generateResumePlainText(resume: StandardResume): string {
  return StandardResumeFormatter.generatePlainText(resume);
}
