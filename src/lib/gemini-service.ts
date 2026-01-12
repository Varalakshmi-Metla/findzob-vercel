// /**
//  * Gemini API Service for Resume Generation
//  * Integration with Google's Gemini 2.5 Flash model
//  */

import { GoogleGenerativeAI } from "@google/generative-ai";

// Import logger if available, or create a simple console logger
const logger = {
  debug: (message: string, data?: any) => console.debug(`[DEBUG] ${message}`, data),
  info: (message: string, data?: any) => console.log(`[INFO] ${message}`, data),
  warn: (message: string, data?: any) => console.warn(`[WARN] ${message}`, data),
  error: (message: string, error?: any, data?: any) => console.error(`[ERROR] ${message}`, error, data)
};

import { 
  WORK_EXPERIENCE_PROMPT, 
  PROJECT_PROMPT, 
  SUMMARY_PROMPT, 
  SKILLS_PROMPT, 
  ATS_OPTIMIZATION_INSTRUCTIONS 
} from './resume-ai-prompts';
import { StandardResume } from './resume-standard-format';

declare const process: {
  env: {
    GEMINI_API_KEY?: string;
    GEMINI_MODEL?: string;
    GEMINI_TEMPERATURE?: string;
    GEMINI_TIMEOUT?: string;
    GEMINI_MAX_TOKENS?: string;
  };
};

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_TEMPERATURE = parseFloat(process.env.GEMINI_TEMPERATURE || "0.1");
const GEMINI_TIMEOUT = parseInt(process.env.GEMINI_TIMEOUT || "60000");
const GEMINI_MAX_TOKENS = parseInt(process.env.GEMINI_MAX_TOKENS || "4000");

// Initialize Gemini
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

/**
 * Test Gemini API connectivity
 */
async function testGeminiConnection(): Promise<{ success: boolean; error?: string; responseTime?: number }> {
  const startTime = Date.now();
  try {
    logger.debug('Testing Gemini API connection');
    
    const model = genAI.getGenerativeModel({ 
      model: GEMINI_MODEL,
      generationConfig: {
        maxOutputTokens: 100,
        temperature: 0.1,
      }
    });
    
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: "Test connection" }] }],
    });
    
    const responseTime = Date.now() - startTime;
    
    if (result && result.response) {
      logger.info('Gemini connection test successful', { model: GEMINI_MODEL, responseTime });
      return { success: true, responseTime };
    } else {
      logger.error('Gemini connection test failed - no response');
      return { success: false, error: 'No response from Gemini API', responseTime };
    }
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    logger.error('Gemini connection test failed', error, {
      model: GEMINI_MODEL,
      errorName: error.name,
      errorMessage: error.message,
      responseTime,
    });
    return { success: false, error: error.message || 'Unknown connection error', responseTime };
  }
}

export interface ResumeGenerationInput {
  profile: {
    name?: string;
    email?: string;
    phone?: string;
    linkedin?: string;
    github?: string;
    portfolioURL?: string;
    totalExperience?: string;
    education?: Array<{
      degree: string;
      university: string;
      year?: string;
      duration?: string;
    }>;
    experience?: Array<{
      company: string;
      role: string;
      duration: string;
      description?: string;
    }>;
    skills?: string[];
    projects?: Array<{
      title: string;
      tech: string;
      description?: string;
    }>;
    certifications?: Array<{
      title: string;
      issuer: string;
    }>;
    languages?: Array<{
      language: string;
      proficiency: string;
    }>;
    technicalTools?: string[];
    volunteerWork?: Array<{
      role: string;
      organization: string;
      duration: string;
      description?: string;
    }>;
    publications?: Array<{
      title: string;
      publication: string;
      date: string;
    }>;
    awards?: Array<{
      title: string;
      organization: string;
      date: string;
    }>;
    interests?: string;
    extraRequirements?: string;
    extraInfo?: string;
  };
  role: string;
}

export interface GeneratedResume {
  header?: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    github?: string;
    portfolioURL?: string;
  };
  
  summary: string;
  skills: string;
  experience: string;
  projects: string;
  education: string;
  certifications?: string;
  languages?: string;
  volunteerWork?: string;
  publications?: string;
  awards?: string;
  interests?: string;
  technicalTools?: string;
  
  latexCode?: string;
  
  rawJson?: {
    name?: string;
    email?: string;
    phone?: string;
    linkedin?: string;
    github?: string;
    portfolioURL?: string;
    summary: string;
    skills: string[];
    experience: Array<{
      company: string;
      role: string;
      duration: string;
      bullets: string[];
    }>;
    education: Array<{
      degree: string;
      university: string;
      year?: string;
    }>;
    projects?: Array<{
      title: string;
      description: string;
      technologies: string[];
    }>;
    certifications?: Array<{
      title: string;
      issuer: string;
    }>;
  };
}

/**
 * Build the prompt for resume generation with strict controls
 */
function buildResumePrompt(input: ResumeGenerationInput): string {
  const { profile, role } = input;
  
  // Import strategy helper at runtime
  const { determineResumeStrategy, getTypeSpecificPromptInstructions } = require('./resume-strategy-helper');
  
  // Determine if this is fresher or experienced
  const strategy = determineResumeStrategy(profile);
  
  // Log data structure for debugging
  logger.debug('Building resume prompt', {
    resumeType: strategy.type,
    yearsOfExperience: strategy.years,
    requirementLevel: strategy.requirementLevel,
    experienceLength: profile.experience?.length || 0,
    projectsLength: profile.projects?.length || 0,
    educationLength: profile.education?.length || 0,
    skillsLength: profile.skills?.length || 0,
  });
  
  // Create a sanitized string representation of each section with ALL available data
  const sections = {
    // Contact & Personal Information
    personal: `Name: ${profile.name || 'Not provided'}
Email: ${profile.email || 'Not provided'}
Phone: ${profile.phone || 'Not provided'}
LinkedIn: ${profile.linkedin || 'Not provided'}
GitHub: ${profile.github || 'Not provided'}
Portfolio: ${profile.portfolioURL || 'Not provided'}
Location: ${(profile as any)?.location || (profile as any)?.address || 'Not provided'}`,

    // Personal Details
    personalDetails: `Gender: ${(profile as any)?.gender || 'Not provided'}
Date of Birth: ${(profile as any)?.dateOfBirth || 'Not provided'}
Citizenship: ${(profile as any)?.citizenship || 'Not provided'}
Visa Status: ${(profile as any)?.visaStatus || 'Not provided'}
Sponsorship Available: ${(profile as any)?.sponsorship || 'Not provided'}
Total Experience: ${profile.totalExperience || 'Not provided'}`,

    education: profile.education?.length ? profile.education.map(edu => 
      `- ${edu.degree} | ${edu.university} | ${edu.year || edu.duration || ''}`
    ).join('\n') : 'No education data provided',

    experience: profile.experience?.length ? profile.experience.map(exp => 
      `- ${exp.role} | ${exp.company} | ${exp.duration} | ${exp.description || 'No description'}`
    ).join('\n') : 'No experience data provided',

    skills: profile.skills?.length ? `- ${profile.skills.join('\n- ')}` : 'No skills data provided',

    technicalTools: profile.technicalTools?.length ? `- ${profile.technicalTools.join('\n- ')}` : 'No tools data provided',

    projects: profile.projects?.length ? profile.projects.map(proj => 
      `- ${proj.title} | ${proj.tech} | ${proj.description || 'No description provided - enhance based on title'}`
    ).join('\n') : 'No projects data provided',

    certifications: profile.certifications?.length ? profile.certifications.map(cert => 
      `- ${cert.title} | ${cert.issuer}`
    ).join('\n') : 'No certifications data provided',

    languages: profile.languages?.length ? profile.languages.map(lang => 
      `- ${lang.language} | ${lang.proficiency || 'Not specified'}`
    ).join('\n') : 'No languages data provided',

    volunteerWork: profile.volunteerWork?.length ? profile.volunteerWork.map(vol => 
      `- ${vol.role} | ${vol.organization} | ${vol.duration} | ${vol.description || ''}`
    ).join('\n') : 'No volunteer work data provided',

    publications: profile.publications?.length ? profile.publications.map(pub => 
      `- ${pub.title} | ${pub.publication} | ${pub.date || ''}`
    ).join('\n') : 'No publications data provided',

    awards: profile.awards?.length ? profile.awards.map(award => 
      `- ${award.title} | ${award.organization} | ${award.date || ''}`
    ).join('\n') : 'No awards data provided',

    interests: profile.interests || 'No interests provided',
    jobDescription: profile.extraRequirements || 'No job description provided',
    extraInfo: profile.extraInfo || 'No additional information provided'
  };

  // Get type-specific instructions
  const typeSpecificInstructions = getTypeSpecificPromptInstructions(strategy);

  return `=== RESUME GENERATION INSTRUCTIONS ===
You are an expert resume writer specializing in creating ATS-optimized resumes.

RESUME TYPE: ${strategy.type.toUpperCase()}
Years of Experience: ${strategy.years}
Career Level: ${strategy.requirementLevel}

${typeSpecificInstructions}

=== PROFESSIONAL WRITING GUIDELINES ===
${strategy.type === 'fresher' ? PROJECT_PROMPT : WORK_EXPERIENCE_PROMPT}

${SUMMARY_PROMPT}

${SKILLS_PROMPT}

${ATS_OPTIMIZATION_INSTRUCTIONS}

=== CRITICAL RULES ===
1. USE ONLY THE DATA PROVIDED BELOW. DO NOT INVENT, ASSUME, OR ADD ANY INFORMATION.
2. If data is missing, leave that section empty or use "Not provided".
3. All formatting must be exact as specified for this resume type.
4. BOLDING: Use **keyword** syntax within bullet points for technical terms, metrics, and action verbs.
5. FRESHER: Focus on learning, skills, projects, and potential (1 page max)
6. EXPERIENCED: Focus on achievements, impact, and results (1-2 pages max)
7. A4 page format with appropriate margins.

=== PROFILE DATA (USE ALL DATA PROVIDED BELOW) ===
CONTACT INFORMATION:
${sections.personal}

PERSONAL DETAILS:
${sections.personalDetails}

EDUCATION:
${sections.education}

WORK EXPERIENCE:
${sections.experience}

SKILLS:
${sections.skills}

TECHNICAL TOOLS & PLATFORMS:
${sections.technicalTools}

PROJECTS:
${sections.projects}

CERTIFICATIONS & LICENSES:
${sections.certifications}

LANGUAGES:
${sections.languages}

VOLUNTEER WORK:
${sections.volunteerWork}

PUBLICATIONS:
${sections.publications}

AWARDS & HONORS:
${sections.awards}

INTERESTS:
${sections.interests}

TARGET ROLE: ${role}

JOB DESCRIPTION / REQUIREMENTS:
${sections.jobDescription}

ADDITIONAL INFORMATION:
${sections.extraInfo}

=== OUTPUT FORMAT ===
Return ONLY valid JSON with this exact structure:

{
  "header": {
    "name": "${profile.name || ''}",
    "email": "${profile.email || ''}",
    "phone": "${profile.phone || ''}",
    "linkedin": "${profile.linkedin || ''}",
    "github": "${profile.github || ''}",
    "portfolioURL": "${profile.portfolioURL || ''}",
    "location": "${(profile as any)?.location || (profile as any)?.address || ''}"
  },
  "personalDetails": {
    "citizenship": "${(profile as any)?.citizenship || ''}",
    "visaStatus": "${(profile as any)?.visaStatus || ''}",
    "totalExperience": "${profile.totalExperience || ''}"
  },
  "${strategy.type === 'fresher' ? 'objective' : 'summary'}": "${strategy.type === 'fresher' ? '2-3 lines focusing on learning and potential' : '3-4 lines highlighting experience and achievements'}",
  "skills": "Skills organized by category, prioritized by target role",
  "technicalTools": "Technical tools and platforms in comma-separated format",
  "experience": "Formatted work experience/internships following the IMPACT-DRIVEN and ACTION-ORIENTED principles with **bolded** keywords",
  "education": "Formatted education entries",
  "projects": "Formatted projects with technically detailed bullet points and **bolded** technologies",
  "certifications": "Formatted certifications or empty string",
  "languages": "Formatted languages with proficiency levels or empty string",
  "volunteerWork": "Formatted volunteer work or empty string",
  "publications": "Formatted publications or empty string",
  "awards": "Formatted awards and honors or empty string",
  "interests": "Interests and hobbies or empty string",
  "latexCode": "DO NOT GENERATE THIS - LEAVE AS EMPTY STRING. The system will handle LaTeX generation via the provided JSON sections."
}

Generate the resume now:`;
}

/**
 * Generate a resume using Google's Gemini API
 */
export async function generateResumeWithGemini(
  input: ResumeGenerationInput
): Promise<GeneratedResume> {
  const startTime = Date.now();
  const operationId = `resume-gen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  logger.info('Starting resume generation', {
    operationId,
    role: input.role,
    model: GEMINI_MODEL,
    hasName: !!input.profile.name,
    hasEmail: !!input.profile.email,
    hasExperience: !!(input.profile.experience && input.profile.experience.length > 0),
    hasEducation: !!(input.profile.education && input.profile.education.length > 0),
    hasSkills: !!(input.profile.skills && input.profile.skills.length > 0),
  });

  try {
    // Validate input
    if (!input.profile) {
      logger.error('Missing profile data', undefined, { operationId });
      throw new Error('Profile data is required');
    }

    // Test connection first
    logger.debug('Testing Gemini API connection', { operationId });
    const connectionTest = await testGeminiConnection();
    
    if (!connectionTest.success) {
      logger.error('Gemini API connection failed', undefined, {
        operationId,
        error: connectionTest.error,
      });
      throw new Error(`Cannot connect to Gemini API: ${connectionTest.error}`);
    }

    logger.info('Gemini API connection successful', {
      operationId,
      model: GEMINI_MODEL,
      responseTime: connectionTest.responseTime,
    });

    // Build prompt
    const prompt = buildResumePrompt(input);
    const promptLength = prompt.length;
    
    logger.debug('Prompt built', {
      operationId,
      promptLength,
      promptPreview: prompt.substring(0, 200) + '...',
    });

    // Log profile data being sent to Gemini
    console.log('🔍 PROFILE DATA SENT TO GEMINI:', {
      name: input.profile.name,
      email: input.profile.email,
      phone: input.profile.phone,
      experienceCount: input.profile.experience?.length || 0,
      experienceSample: input.profile.experience?.[0] ? {
        role: input.profile.experience[0].role,
        company: input.profile.experience[0].company,
        duration: input.profile.experience[0].duration,
      } : 'N/A',
      educationCount: input.profile.education?.length || 0,
      educationSample: input.profile.education?.[0] ? {
        degree: input.profile.education[0].degree,
        university: input.profile.education[0].university,
      } : 'N/A',
      skillsCount: input.profile.skills?.length || 0,
      skillsSample: input.profile.skills?.slice(0, 3).join(', '),
      projectsCount: input.profile.projects?.length || 0,
      projectsSample: input.profile.projects?.[0] ? {
        title: input.profile.projects[0].title,
        tech: input.profile.projects[0].tech,
      } : 'N/A',
      certificationsCount: input.profile.certifications?.length || 0,
      languagesCount: input.profile.languages?.length || 0,
      awardsCertificationsCount: input.profile.awards?.length || 0,
      targetRole: input.role,
      promptLength,
    });

    // Call Gemini API
    const apiStartTime = Date.now();
    logger.info('Calling Gemini API', {
      operationId,
      model: GEMINI_MODEL,
      promptLength,
      temperature: GEMINI_TEMPERATURE,
      timeout: GEMINI_TIMEOUT,
    });

    const model = genAI.getGenerativeModel({ 
      model: GEMINI_MODEL,
      generationConfig: {
        maxOutputTokens: GEMINI_MAX_TOKENS,
        temperature: GEMINI_TEMPERATURE,
        topP: 0.9,
        topK: 40,
      },
    });

    let result;
    try {
      result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });
    } catch (fetchError: any) {
      const elapsed = Date.now() - apiStartTime;
      logger.error('Gemini API request failed', fetchError, {
        operationId,
        model: GEMINI_MODEL,
        errorName: fetchError.name,
        errorMessage: fetchError.message,
        elapsed,
        promptLength,
      });
      
      throw new Error(`API request failed: ${fetchError.message}`);
    }

    const apiTime = Date.now() - apiStartTime;
    logger.debug('Gemini API response received', {
      operationId,
      apiTime,
    });

    if (!result || !result.response) {
      logger.error('Empty response from Gemini API', undefined, { operationId, apiTime });
      throw new Error("Empty response from Gemini API");
    }

    const text = result.response.text();
    const responseLength = text.length;

    logger.debug('Gemini response parsed', {
      operationId,
      responseLength,
      responsePreview: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
      apiTime,
    });

    if (!text) {
      logger.error('Empty text in response', undefined, { operationId, apiTime });
      throw new Error("Empty text in Gemini API response");
    }

    // Log actual Gemini response for debugging
    console.log('🔍 GEMINI API RESPONSE:', {
      length: responseLength,
      preview: text.substring(0, 500),
      fullResponse: text, // Log full response for inspection
    });

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.error('No JSON found in response', undefined, {
        operationId,
        responseLength,
        responsePreview: text.substring(0, 500),
      });
      console.error('❌ NO JSON FOUND IN RESPONSE:', text.substring(0, 1000));
      throw new Error("Could not parse JSON response");
    }

    let generatedResume: GeneratedResume;
    try {
      generatedResume = JSON.parse(jsonMatch[0]);
      
      // Log all sections present in response
      console.log('📊 GEMINI RESPONSE SECTIONS:', {
        header: {
          hasName: !!generatedResume.header?.name,
          hasEmail: !!generatedResume.header?.email,
          hasPhone: !!generatedResume.header?.phone,
        },
        summary: !!generatedResume.summary ? `Present (${generatedResume.summary.length} chars)` : 'EMPTY',
        skills: !!generatedResume.skills ? `Present (${generatedResume.skills.length} chars)` : 'EMPTY',
        experience: !!generatedResume.experience ? `Present (${generatedResume.experience.length} chars)` : 'EMPTY',
        education: !!generatedResume.education ? `Present (${generatedResume.education.length} chars)` : 'EMPTY',
        projects: !!generatedResume.projects ? `Present (${generatedResume.projects.length} chars)` : 'EMPTY',
        certifications: !!generatedResume.certifications ? `Present (${generatedResume.certifications.length} chars)` : 'EMPTY',
        languages: !!generatedResume.languages ? `Present (${generatedResume.languages.length} chars)` : 'EMPTY',
        volunteerWork: !!generatedResume.volunteerWork ? `Present (${generatedResume.volunteerWork.length} chars)` : 'EMPTY',
        publications: !!generatedResume.publications ? `Present (${generatedResume.publications.length} chars)` : 'EMPTY',
        awards: !!generatedResume.awards ? `Present (${generatedResume.awards.length} chars)` : 'EMPTY',
        interests: !!generatedResume.interests ? `Present (${generatedResume.interests.length} chars)` : 'EMPTY',
        technicalTools: !!generatedResume.technicalTools ? `Present (${generatedResume.technicalTools.length} chars)` : 'EMPTY',
        latexCode: !!generatedResume.latexCode ? `Present (${generatedResume.latexCode.length} chars)` : 'EMPTY',
      });

      logger.debug('JSON parsed successfully', {
        operationId,
        hasHeader: !!generatedResume.header,
        hasSummary: !!generatedResume.summary,
        hasLatexCode: !!generatedResume.latexCode,
        latexCodeLength: generatedResume.latexCode?.length || 0,
      });
    } catch (parseError: any) {
      logger.error('Failed to parse JSON response', parseError, {
        operationId,
        jsonPreview: jsonMatch[0].substring(0, 500),
      });
      console.error('❌ JSON PARSE ERROR:', {
        error: parseError.message,
        jsonPreview: jsonMatch[0].substring(0, 500),
      });
      throw new Error(`JSON parse error: ${parseError.message}`);
    }

    // Validate and fix the generated resume
    logger.debug('Validating generated resume', { operationId });
    const validationResult = validateResumeContent(generatedResume, input.profile);
    
    if (validationResult.errors.length > 0) {
      logger.warn('Resume validation issues found', {
        operationId,
        errors: validationResult.errors,
        warnings: validationResult.warnings,
      });
    }

    // Apply fixes to ensure data accuracy
    generatedResume = applyResumeFixes(generatedResume, input.profile);

    // Ensure LaTeX code has correct font sizes
    if (!generatedResume.latexCode || !isValidLatexCode(generatedResume.latexCode)) {
      logger.info('Generating LaTeX code from scratch', { operationId });
      generatedResume.latexCode = generateLaTeXFromResume(generatedResume, input.profile);
    } else {
      logger.debug('Using generated LaTeX code', {
        operationId,
        latexLength: generatedResume.latexCode.length,
        hasCorrectFont: generatedResume.latexCode.includes('16pt'),
      });
    }

    const totalTime = Date.now() - startTime;
    logger.info('Resume generation completed successfully', {
      operationId,
      totalTime,
      apiTime,
      validationErrors: validationResult.errors.length,
      validationWarnings: validationResult.warnings.length,
      hasLatexCode: !!generatedResume.latexCode,
    });

    return generatedResume;

  } catch (error: any) {
    const totalTime = Date.now() - startTime;
    logger.error('Resume generation failed', error, {
      operationId,
      totalTime,
      role: input.role,
      model: GEMINI_MODEL,
    });
    
    // Return a fallback resume in case of error
    logger.info('Generating fallback resume', { operationId });
    return generateFallbackResume(input.profile, input.role);
  }
}

/**
 * Validate resume content for hallucinations and formatting
 */
function validateResumeContent(generated: GeneratedResume, originalProfile: any): {
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  logger.debug('Starting resume validation', {
    hasGeneratedHeader: !!generated.header,
    hasOriginalName: !!originalProfile.name,
  });

  // Check for name mismatch
  if (originalProfile.name && generated.header?.name) {
    const generatedName = generated.header.name.trim();
    const originalName = originalProfile.name.trim();
    
    if (generatedName.toLowerCase() !== originalName.toLowerCase()) {
      errors.push(`Name mismatch: "${generatedName}" vs "${originalName}"`);
    }
  }

  // Check for invented companies
  const originalCompanies = new Set(
    (originalProfile.experience || []).map((exp: any) => exp.company?.toLowerCase().trim()).filter(Boolean) as string[]
  );
  
  if (generated.experience && originalCompanies.size > 0) {
    const generatedText = generated.experience.toLowerCase();
    originalCompanies.forEach((company: string) => {
      if (!generatedText.includes(company)) {
        warnings.push(`Company "${company}" might be missing from experience`);
      }
    });
  }

  // Check for invented skills
  const originalSkills = new Set(
    (originalProfile.skills || []).map((skill: string) => skill.toLowerCase().trim()) as string[]
  );
  
  if (generated.skills && originalSkills.size > 0) {
    const generatedSkills = generated.skills.toLowerCase();
    originalSkills.forEach((skill: string) => {
      if (!generatedSkills.includes(skill)) {
        warnings.push(`Skill "${skill}" might be missing`);
      }
    });
  }

  // Check font sizes in LaTeX
  if (generated.latexCode) {
    if (!generated.latexCode.includes('16pt')) {
      errors.push('LaTeX code missing 16pt font specification');
    }
    if (!generated.latexCode.includes('margin=0.75in')) {
      warnings.push('LaTeX margins might not be 0.75 inches');
    }
  }

  // Check for hallucinated metrics (e.g., "increased by 50%")
  const textToCheck = [
    generated.summary,
    generated.experience,
    generated.projects,
  ].filter(Boolean).join(' ');

  const metricPatterns = [
    /\d+%/g,
    /\$\d+/g,
    /increased by \d+/gi,
    /reduced by \d+/gi,
    /improved by \d+/gi,
    /saved \$\d+/gi,
    /grew by \d+/gi,
  ];

  metricPatterns.forEach(pattern => {
    const matches = textToCheck.match(pattern);
    if (matches) {
      // Check if these metrics exist in original data
      const originalText = JSON.stringify(originalProfile);
      matches.forEach(metric => {
        if (!originalText.includes(metric.replace(/\D/g, ''))) {
          warnings.push(`Possible invented metric: "${metric}"`);
        }
      });
    }
  });

  logger.debug('Resume validation completed', {
    errorCount: errors.length,
    warningCount: warnings.length,
  });

  return { errors, warnings };
}

/**
 * Apply fixes to resume to ensure data accuracy
 */
function applyResumeFixes(generated: GeneratedResume, originalProfile: any): GeneratedResume {
  const fixed = { ...generated };

  logger.debug('Applying resume fixes', {
    hasOriginalName: !!originalProfile.name,
    hasGeneratedSkills: !!generated.skills,
  });

  // Ensure header uses only original data
  fixed.header = {
    name: originalProfile.name || '',
    email: originalProfile.email || '',
    phone: originalProfile.phone || '',
    linkedin: originalProfile.linkedin || '',
    github: originalProfile.github || '',
    portfolioURL: originalProfile.portfolioURL || '',
    location: (originalProfile as any).location || (originalProfile as any).address || generated.header?.location || '',
  };

  // Ensure skills are present; if AI failed to generate any, use original
  if (!fixed.skills || fixed.skills.trim().length < 5) {
    if (originalProfile.skills && originalProfile.skills.length > 0) {
      fixed.skills = originalProfile.skills.join(', ');
    }
  }

  // Ensure education is present; if AI failed, use original
  if (!fixed.education || fixed.education.trim().length < 10) {
    if (originalProfile.education && originalProfile.education.length > 0) {
      fixed.education = originalProfile.education.map((edu: any) => 
        `**${edu.degree}** | ${edu.university} | ${edu.year || edu.duration || ''}`
      ).join('\n');
    }
  }

  // Ensure experience is present; if AI failed, use original
  if (!fixed.experience || fixed.experience.trim().length < 20) {
    if (originalProfile.experience && originalProfile.experience.length > 0) {
        fixed.experience = originalProfile.experience.map((exp: any) => 
        `**${exp.role}** | ${exp.company} | ${exp.duration}\n- ${exp.description || 'Professional role'}`
      ).join('\n\n');
    }
  }

  // Note: We deliberately allow the AI-generated summary, projects, and structured skills 
  // to remain as generated to benefit from professional tailoring and formatting.

  return fixed;
}

/**
 * Check if LaTeX code is valid
 */
function isValidLatexCode(latexCode: string): boolean {
  return latexCode.includes('\\documentclass') &&
         latexCode.includes('\\begin{document}') &&
         latexCode.includes('\\end{document}') &&
         latexCode.includes('16pt') &&
         latexCode.includes('a4paper');
}

/**
 * Generate LaTeX code from resume data
 */
function generateLaTeXFromResume(resume: GeneratedResume, profile: any): string {
  logger.debug('Generating LaTeX code from resume data');
  
  // Helper function to escape LaTeX special characters
  const escapeLaTeX = (text: string): string => {
    if (!text) return '';
    return String(text)
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
  };
  
  // Build contact line
  const contactItems = [];
  if (profile.email) contactItems.push(`\\href{mailto:${profile.email}}{${escapeLaTeX(profile.email)}}`);
  if (profile.phone) contactItems.push(escapeLaTeX(profile.phone));
  if (profile.linkedin) {
    const linkedinUrl = profile.linkedin.startsWith('http') ? profile.linkedin : `https://${profile.linkedin}`;
    contactItems.push(`\\href{${escapeLaTeX(linkedinUrl)}}{LinkedIn}`);
  }
  if (profile.github) {
    const githubUrl = profile.github.startsWith('http') ? profile.github : `https://${profile.github}`;
    contactItems.push(`\\href{${escapeLaTeX(githubUrl)}}{GitHub}`);
  }
  if (profile.portfolioURL) {
    const portfolioUrl = profile.portfolioURL.startsWith('http') ? profile.portfolioURL : `https://${profile.portfolioURL}`;
    contactItems.push(`\\href{${escapeLaTeX(portfolioUrl)}}{Portfolio}`);
  }
  const contactLine = contactItems.join(' \\textbullet{} ');

  // Build experience items
  const experienceItems = (profile.experience || []).map((exp: any) => {
    const bullets = exp.description 
      ? exp.description.split('.').filter((b: string) => b.trim()).map((b: string) => `  \\item ${escapeLaTeX(b.trim())}`).join('\n')
      : '  \\item Responsibilities and achievements';
    
    return `\\textbf{${escapeLaTeX(exp.role)}} | ${escapeLaTeX(exp.company)} | \\textit{${escapeLaTeX(exp.duration || '')}}
\\begin{itemize}
${bullets}
\\end{itemize}`;
  }).join('\n\\vspace{8pt}\n');

  // Build education items
  const educationItems = (profile.education || []).map((edu: any) => 
    `\\textbf{${escapeLaTeX(edu.degree)}} | ${escapeLaTeX(edu.university)} | \\textit{${escapeLaTeX(edu.year || edu.duration || '')}}`
  ).join('\n\\\\');

  // Build projects section if exists
  const projectsSection = (profile.projects || []).length > 0 ? `
\\section*{Projects}
${profile.projects.map((proj: any) => {
  // Split description into bullet points if it contains newlines or multiple sentences
  let description = proj.description || 'Project details and outcomes';
  // If description doesn't have bullet points, split by sentences or newlines
  const bullets = description.includes('•') || description.includes('-') 
    ? description.split(/[•\-]/).filter((b: string) => b.trim()).map((b: string) => b.trim())
    : description.split(/[.!?]\s+/).filter((b: string) => b.trim()).map((b: string) => b.trim()).slice(0, 3); // Max 3 bullets
  
  const bulletItems = bullets.length > 0 
    ? bullets.map((b: string) => `  \\item ${escapeLaTeX(b.replace(/^[•\-]\s*/, ''))}`).join('\n')
    : `  \\item ${escapeLaTeX(description)}`;
  
  return `\\textbf{${escapeLaTeX(proj.title)}} | ${escapeLaTeX(proj.tech || 'N/A')}
\\begin{itemize}
${bulletItems}
\\end{itemize}`;
}).join('\n\\vspace{6pt}\n')}
` : '';

  // Build certifications section if exists
  const certificationsSection = (profile.certifications || []).length > 0 ? `
\\section*{Certifications}
${profile.certifications.map((cert: any) => 
  `\\textbf{${escapeLaTeX(cert.title)}} | ${escapeLaTeX(cert.issuer)}`
).join('\n\\\\')}
` : '';

  const latexCode = `\\documentclass[16pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[margin=0.75in]{geometry}
\\usepackage{enumitem}
\\usepackage{hyperref}
\\usepackage{fontspec}
\\usepackage{titlesec}
\\usepackage{xcolor}

% Set fonts - Times New Roman 16pt for body
\\setmainfont{Times New Roman}[
  SizeFeatures={Size=16},
  Ligatures=TeX
]
\\setsansfont{Arial}[
  SizeFeatures={Size=14},
  BoldFont={Arial Bold}
]

% Section formatting
\\titleformat{\\section}
  {\\sffamily\\large\\bfseries\\uppercase}
  {}
  {0em}
  {}
  [\\vspace{-8pt}\\titlerule]

\\titlespacing*{\\section}{0pt}{16pt}{8pt}

% Adjust itemize spacing
\\setlist[itemize]{
  leftmargin=0.5in,
  itemsep=2pt,
  topsep=4pt,
  parsep=0pt
}

% Line spacing
\\renewcommand{\\baselinestretch}{1.15}
\\setlength{\\parskip}{4pt}
\\setlength{\\parindent}{0pt}

\\begin{document}

% HEADER - Centered with proper spacing
\\begin{center}
  {\\sffamily\\fontsize{18}{22}\\selectfont\\bfseries\\uppercase ${escapeLaTeX(profile.name || 'FULL NAME')}}
  \\\\[8pt]
  
  \\normalfont\\fontsize{16}{18}\\selectfont
  ${contactLine}
  \\\\[12pt]
\\end{center}

% PROFESSIONAL SUMMARY
\\section*{Professional Summary}
${escapeLaTeX(resume.summary || `Experienced professional with expertise in ${(profile.skills || []).slice(0, 3).join(', ') || 'relevant field'}.`)}

% WORK EXPERIENCE
\\section*{Work Experience}
${experienceItems || 'No work experience provided.'}

% SKILLS
\\section*{Skills}
${escapeLaTeX(profile.skills?.join(', ') || 'Skills not provided.')}

% EDUCATION
\\section*{Education}
${educationItems || 'Education not provided.'}

${projectsSection}
${certificationsSection}

\\end{document}`;

  logger.debug('LaTeX code generated', { length: latexCode.length });
  return latexCode;
}

/**
 * Generate a fallback resume when AI generation fails
 */
function generateFallbackResume(profile: any, role: string): GeneratedResume {
  logger.info('Generating fallback resume');
  
  const fallbackResume: GeneratedResume = {
    header: {
      name: profile.name || '',
      email: profile.email || '',
      phone: profile.phone || '',
      linkedin: profile.linkedin || '',
      github: profile.github || '',
      portfolioURL: profile.portfolioURL || '',
    },
    summary: `Professional ${profile.experience?.[0]?.role || 'individual'} with experience in ${profile.skills?.slice(0, 3).join(', ') || 'relevant field'}. Seeking ${role} position.`,
    skills: profile.skills?.join(', ') || '',
    experience: profile.experience?.map((exp: any) => 
      `**${exp.role}** | ${exp.company} | ${exp.duration}\n• ${exp.description || 'Responsibilities included relevant tasks and achievements.'}`
    ).join('\n\n') || 'No experience provided.',
    education: profile.education?.map((edu: any) => 
      `**${edu.degree}** | ${edu.university} | ${edu.year || edu.duration || ''}`
    ).join('\n') || 'Education not provided.',
    projects: profile.projects?.map((proj: any) => 
      `**${proj.title}** | ${proj.tech}\n• ${proj.description || 'Project involving relevant technologies and skills.'}`
    ).join('\n\n') || '',
    latexCode: generateLaTeXFromResume({
      summary: '',
      skills: '',
      experience: '',
      projects: '',
      education: '',
    }, profile),
  };

  logger.debug('Fallback resume generated', {
    hasName: !!fallbackResume.header?.name,
    hasExperience: !!fallbackResume.experience,
    hasEducation: !!fallbackResume.education,
  });

  return fallbackResume;
}

/**
 * Extract resume data from a resume text
 */
export async function extractResumeData(resumeText: string): Promise<Partial<ResumeGenerationInput["profile"]>> {
  const operationId = `extract-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  logger.info('Starting resume data extraction', {
    operationId,
    resumeLength: resumeText.length,
  });

  try {
    const prompt = `Extract structured data from this resume text. Return ONLY JSON.

Resume text:
${resumeText.substring(0, 5000)}  // Limit to prevent overflow

Extract and return JSON with these fields (use empty strings/arrays for missing data):
{
  "name": "Full name if found",
  "email": "Email address if found",
  "phone": "Phone number if found",
  "linkedin": "LinkedIn URL if found",
  "github": "GitHub URL if found",
  "education": [{"degree": "...", "university": "...", "year": "..."}],
  "experience": [{"company": "...", "role": "...", "duration": "...", "description": "..."}],
  "skills": ["skill1", "skill2", ...],
  "certifications": [{"title": "...", "issuer": "..."}]
}

Rules:
1. Extract ONLY information that is clearly present in the text
2. Do not invent or assume any information
3. If a field is not found, use empty string or empty array
4. Return valid JSON only`;

    logger.debug('Extraction prompt built', {
      operationId,
      promptLength: prompt.length,
    });

    const model = genAI.getGenerativeModel({ 
      model: GEMINI_MODEL,
      generationConfig: {
        maxOutputTokens: 2000,
        temperature: 0.1,
        topP: 0.9,
        topK: 40,
      },
    });

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    if (!result || !result.response) {
      logger.error('Empty extraction response', undefined, { operationId });
      throw new Error("No response from Gemini API");
    }

    const text = result.response.text();

    if (!text) {
      logger.error('Empty text in extraction response', undefined, { operationId });
      throw new Error("No text in Gemini API response");
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.error('No JSON in extraction response', undefined, {
        operationId,
        responsePreview: text.substring(0, 500),
      });
      throw new Error("Could not parse JSON response");
    }

    const extractedData = JSON.parse(jsonMatch[0]);
    
    logger.info('Resume data extraction completed', {
      operationId,
      hasName: !!extractedData.name,
      hasEmail: !!extractedData.email,
      experienceCount: extractedData.experience?.length || 0,
      skillsCount: extractedData.skills?.length || 0,
    });

    return extractedData;

  } catch (error: any) {
    logger.error('Resume data extraction failed', error, { operationId });
    throw new Error(`Extraction failed: ${error.message}`);
  }
}

/**
 * Get Gemini API information
 */
export async function getGeminiInfo(): Promise<{
  model: string;
  status: string;
  available: boolean;
}> {
  try {
    const connectionTest = await testGeminiConnection();
    return {
      model: GEMINI_MODEL,
      status: connectionTest.success ? 'connected' : 'disconnected',
      available: connectionTest.success,
    };
  } catch (error: any) {
    logger.error('Failed to get Gemini info', error instanceof Error ? error : new Error(String(error)));
    return {
      model: GEMINI_MODEL,
      status: 'disconnected',
      available: false,
    };
  }
}

// Export constants for testing/monitoring
export const GEMINI_CONFIG = {
  MODEL: GEMINI_MODEL,
  TEMPERATURE: GEMINI_TEMPERATURE,
  TIMEOUT: GEMINI_TIMEOUT,
  MAX_TOKENS: GEMINI_MAX_TOKENS,
};

/**
 * Generate a standard format resume using Gemini
 */
export async function generateStandardResumeWithGemini(input: {
  profile: any;
  targetRole: string;
  jobDescription?: string;
}): Promise<{ success: boolean; resume?: StandardResume; error?: string; metadata?: any }> {
  const startTime = Date.now();
  const operationId = `standard-resume-${Date.now()}`;

  try {
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const model = genAI.getGenerativeModel({ 
      model: GEMINI_MODEL,
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    });

    const prompt = `You are an expert professional resume writer. Generate a resume in STANDARD RESUME FORMAT with ALL 10 sections.

USER PROFILE: ${JSON.stringify(input.profile)}
TARGET ROLE: ${input.targetRole}
JOB DESCRIPTION: ${input.jobDescription || 'N/A'}

STANDARD RESUME FORMAT (Universal):
1. HEADER: fullName, mobileNumber, professionalEmail, city, state, linkedinURL, githubURL, portfolioURL
2. PROFILE SUMMARY: 3-4 sentences (Objective for freshers, Summary for experienced)
3. KEY SKILLS: Categorized: programmingLanguages, webFrameworks, databases, toolsAndTechnologies, operatingSystems
4. PROFESSIONAL EXPERIENCE: organizationName, role, duration, responsibilities[], toolsUsed[], outcome
5. EDUCATION: degree, branch, collegeUniversity, year, cgpaPercentage
6. CERTIFICATIONS: courseName, platformOrganization, year
7. ACHIEVEMENTS: title, type (hackathon, award, recognition, workshop, seminar, leadership)
8. SOFT SKILLS: communication, teamwork, timeManagement, problemSolving (booleans)
9. ADDITIONAL INFO: languagesKnown[], willingnessToRelocate, availability
10. DECLARATION: Standard declaration

Return as VALID JSON matching the StandardResume interface. 
Determine if the user is 'fresher' or 'experienced' based on their profile.

JSON structure:
{
  "header": { ... },
  "profileSummary": "...",
  "keySkills": { ... },
  "professionalExperience": [ ... ],
  "education": [ ... ],
  "certifications": [ ... ],
  "achievements": [ ... ],
  "softSkills": { ... },
  "additionalInfo": { ... },
  "declaration": "...",
  "resumeType": "fresher" | "experienced",
  "targetRole": "${input.targetRole}"
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");
    
    const resumeData = JSON.parse(jsonMatch[0]) as StandardResume;

    return {
      success: true,
      resume: resumeData,
      metadata: {
        generationTime: Date.now() - startTime,
        modelUsed: GEMINI_MODEL,
        operationId
      }
    };
  } catch (error: any) {
    logger.error('Gemini standard resume generation failed', error);
    return {
      success: false,
      error: error.message || 'Unknown error during generation'
    };
  }
}