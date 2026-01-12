/**
 * Standard Resume Format Validation Utility
 * CRITICAL: Ensures only Ollama-generated resumes follow standard format
 * Validates all 10 sections and ATS compliance
 */

import { StandardResume } from '@/lib/resume-standard-format';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  completenessScore: number; // 0-100 (based on sections present)
  atsCompliance: boolean; // true if ATS-friendly
}

export class StandardResumeValidator {
  /**
   * Validate a complete standard resume
   */
  static validate(resume: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let sectionsPresent = 0;
    const totalSections = 10;

    // 1. Validate Header (MANDATORY)
    if (!resume.header) {
      errors.push('❌ Header is mandatory');
    } else {
      if (!resume.header.fullName) {
        errors.push('❌ Header: Full name is required');
      } else {
        sectionsPresent++;
      }
    }

    // 2. Validate Profile Summary (MANDATORY)
    if (!resume.profileSummary || typeof resume.profileSummary !== 'string') {
      errors.push('❌ Profile Summary is mandatory');
    } else if (resume.profileSummary.trim().length < 50) {
      warnings.push('⚠️ Profile Summary is too short (min 50 chars)');
    } else {
      sectionsPresent++;
    }

    // 3. Validate Key Skills (MANDATORY)
    if (!resume.keySkills) {
      errors.push('❌ Key Skills section is mandatory');
    } else {
      const hasAnySkills = resume.keySkills.programmingLanguages?.length > 0 ||
        resume.keySkills.webFrameworks?.length > 0 ||
        resume.keySkills.databases?.length > 0 ||
        resume.keySkills.toolsAndTechnologies?.length > 0 ||
        resume.keySkills.operatingSystems?.length > 0;

      if (!hasAnySkills) {
        warnings.push('⚠️ Key Skills: No skills categories filled');
      } else {
        sectionsPresent++;
      }
    }

    // 4. Validate Professional Experience (MANDATORY)
    if (!Array.isArray(resume.professionalExperience) || resume.professionalExperience.length === 0) {
      warnings.push('⚠️ Professional Experience: No entries (optional for some freshers)');
    } else {
      // Validate experience entries
      for (let i = 0; i < resume.professionalExperience.length; i++) {
        const exp = resume.professionalExperience[i];
        if (!exp.organizationName) {
          errors.push(`❌ Experience [${i}]: Organization name is required`);
        }
        if (!exp.role) {
          errors.push(`❌ Experience [${i}]: Role is required`);
        }
        if (!exp.duration) {
          errors.push(`❌ Experience [${i}]: Duration is required`);
        }
      }
      if (resume.professionalExperience.length > 0 && !errors.some(e => e.includes('Experience'))) {
        sectionsPresent++;
      }
    }

    // 5. Validate Education (MANDATORY)
    if (!Array.isArray(resume.education) || resume.education.length === 0) {
      errors.push('❌ Education is mandatory');
    } else {
      // Validate education entries
      for (let i = 0; i < resume.education.length; i++) {
        const edu = resume.education[i];
        if (!edu.degree) {
          errors.push(`❌ Education [${i}]: Degree is required`);
        }
        if (!edu.collegeUniversity) {
          errors.push(`❌ Education [${i}]: College/University is required`);
        }
        if (!edu.year) {
          warnings.push(`⚠️ Education [${i}]: Year is recommended`);
        }
      }
      if (resume.education.length > 0 && !errors.some(e => e.includes('Education'))) {
        sectionsPresent++;
      }
    }

    // 6. Validate Certifications (OPTIONAL)
    if (resume.certifications && Array.isArray(resume.certifications)) {
      if (resume.certifications.length > 0) {
        for (let i = 0; i < resume.certifications.length; i++) {
          const cert = resume.certifications[i];
          if (!cert.courseName) {
            warnings.push(`⚠️ Certification [${i}]: Course name should be specified`);
          }
        }
        sectionsPresent++;
      }
    }

    // 7. Validate Achievements (OPTIONAL)
    if (resume.achievements && Array.isArray(resume.achievements) && resume.achievements.length > 0) {
      sectionsPresent++;
    }

    // 8. Validate Soft Skills (MANDATORY)
    if (!resume.softSkills) {
      warnings.push('⚠️ Soft Skills section is recommended');
    } else {
      const hasSoftSkills = resume.softSkills.communication ||
        resume.softSkills.teamwork ||
        resume.softSkills.timeManagement ||
        resume.softSkills.problemSolving ||
        (resume.softSkills.customSkills && resume.softSkills.customSkills.length > 0);

      if (hasSoftSkills) {
        sectionsPresent++;
      }
    }

    // 9. Validate Additional Info (OPTIONAL)
    if (resume.additionalInfo && (
      (resume.additionalInfo.languagesKnown && resume.additionalInfo.languagesKnown.length > 0) ||
      resume.additionalInfo.willingnessToRelocate !== undefined ||
      resume.additionalInfo.availability
    )) {
      sectionsPresent++;
    }

    // 10. Validate Declaration (OPTIONAL)
    if (resume.declaration && resume.declaration.length > 0) {
      sectionsPresent++;
    }

    // Validate Resume Type and Target Role
    if (!resume.resumeType || !['fresher', 'experienced'].includes(resume.resumeType)) {
      errors.push('❌ Resume type must be "fresher" or "experienced"');
    }

    if (!resume.targetRole || typeof resume.targetRole !== 'string') {
      errors.push('❌ Target role is required');
    }

    // ATS Compliance Checks
    const atsErrors = this.checkATSCompliance(resume);
    warnings.push(...atsErrors);

    const atsCompliance = atsErrors.length === 0;
    const completenessScore = Math.round((sectionsPresent / totalSections) * 100);
    const isValid = errors.length === 0;

    return {
      isValid,
      errors,
      warnings,
      completenessScore,
      atsCompliance,
    };
  }

  /**
   * Check ATS Compliance
   * ATS systems cannot parse: tables, images, unusual formatting, special characters
   */
  private static checkATSCompliance(resume: any): string[] {
    const warnings: string[] = [];

    // Check for potential ATS issues
    const profileSummary = resume.profileSummary || '';
    const allText = JSON.stringify(resume);

    // Check for special characters that might break parsing
    const specialCharPattern = /[®™©§†‡]/g;
    if (specialCharPattern.test(allText)) {
      warnings.push('⚠️ ATS: Contains special symbols that may not parse correctly');
    }

    // Check text length limits (ATS often has limits)
    if (profileSummary.length > 500) {
      warnings.push('⚠️ ATS: Profile summary is quite long (may be truncated by some ATS)');
    }

    // Check for URLs (some ATS systems have issues with URLs)
    const urlPattern = /https?:\/\/|www\./g;
    const urlMatches = allText.match(urlPattern) || [];
    if (urlMatches.length > 5) {
      warnings.push('⚠️ ATS: Many URLs detected (keep LinkedIn/GitHub URLs minimal)');
    }

    // Warn about very short entries
    if (resume.professionalExperience) {
      for (const exp of resume.professionalExperience) {
        const desc = (exp.responsibilities?.join(' ') || '').length;
        if (desc > 0 && desc < 50) {
          warnings.push('⚠️ ATS: Some experience descriptions are very short');
          break;
        }
      }
    }

    return warnings;
  }

  /**
   * Validate Ollama generation metadata
   */
  static validateOllamaMetadata(resume: any): boolean {
    return (
      resume.format === 'standard' &&
      resume.ollamaGenerated === true &&
      resume.metadata?.modelUsed !== undefined &&
      resume.metadata?.generatedRole !== undefined
    );
  }

  /**
   * Generate validation report
   */
  static generateReport(resume: any): string {
    const result = this.validate(resume);

    let report = `
═══════════════════════════════════════════════════════════════
📋 STANDARD RESUME VALIDATION REPORT
═══════════════════════════════════════════════════════════════

Resume Type: ${resume.resumeType || 'Unknown'}
Target Role: ${resume.targetRole || 'Unknown'}

📊 COMPLETENESS SCORE: ${result.completenessScore}%
${result.completenessScore === 100 ? '✅ All 10 sections present!' : '⚠️ Some sections missing'}

🔒 ATS COMPLIANCE: ${result.atsCompliance ? '✅ Compliant' : '⚠️ Issues detected'}

VALIDATION STATUS: ${result.isValid ? '✅ VALID' : '❌ INVALID'}

═══════════════════════════════════════════════════════════════
`;

    if (result.errors.length > 0) {
      report += `\n❌ ERRORS (${result.errors.length}):\n`;
      result.errors.forEach(error => {
        report += `   ${error}\n`;
      });
    }

    if (result.warnings.length > 0) {
      report += `\n⚠️  WARNINGS (${result.warnings.length}):\n`;
      result.warnings.forEach(warning => {
        report += `   ${warning}\n`;
      });
    }

    if (result.isValid && result.warnings.length === 0) {
      report += `\n✅ PERFECT RESUME!\n`;
      report += `   • All required sections present\n`;
      report += `   • ATS-friendly format\n`;
      report += `   • Ready for download and submission\n`;
    }

    report += `\n═══════════════════════════════════════════════════════════════\n`;

    return report;
  }
}

/**
 * Quick validation function
 */
export function isValidStandardResume(resume: any): boolean {
  const result = StandardResumeValidator.validate(resume);
  return result.isValid && result.atsCompliance;
}

/**
 * Quick completeness check
 */
export function getResumeCompletenessScore(resume: any): number {
  const result = StandardResumeValidator.validate(resume);
  return result.completenessScore;
}
