'use server';
/**
 * @fileOverview A resume generation AI flow.
 *
 * - generateResume - A function that handles resume generation.
 */

import { getAI } from '@/ai/genkit';
import { GenerateResumeInputSchema, GenerateResumeOutputSchema, type GenerateResumeInput, type GenerateResumeOutput } from '@/ai/schemas/resume-schemas';

let _generateResumeFlow: any = null;

async function ensureGenerateResumeFlow() {
  if (_generateResumeFlow) return _generateResumeFlow;
  const ai = await getAI();
  const prompt = ai.definePrompt({
    name: 'generateResumePrompt',
    input: { schema: GenerateResumeInputSchema },
    output: { schema: GenerateResumeOutputSchema },
    prompt: `You are an expert professional resume writer specializing in ATS-optimized Reverse Chronological Format resumes.

CRITICAL INSTRUCTION - USE ONLY USER-PROVIDED DATA:
============================================================
Generate a resume using ONLY the information provided in the user profile data.
DO NOT fabricate, invent, hallucinate, or add any information that is not explicitly provided.
DO NOT:
  ✗ Make up job experiences or companies
  ✗ Invent skills the user didn't list
  ✗ Create fake projects or certifications
  ✗ Add accomplishments not mentioned by the user
  ✗ Fill gaps with assumed information
DO:
  ✓ Use only real user data provided in the profile
  ✓ Organize and format the ACTUAL data professionally
  ✓ Highlight achievements exactly as user stated them
  ✓ Leave sections empty/omit them if user data is not provided
  ✓ If a section has no data, do not include that section in the resume

Generate a professional, modern resume following the "Gold Standard" structure used by 90% of industries. This format balances human readability with ATS (Applicant Tracking System) compatibility.

CRITICAL RESUME STRUCTURE & FORMATTING RULES:
============================================================

1. HEADER (CONTACT INFO) - Top of Resume
- Full Name: Clearly displayed
- Current Job Title/Target Role: (Optional) Your target position for this role
- Location: City, State/Country only (NO full street address)
- Phone: Mobile number
- Email: Professional format (firstname.lastname@provider.com)
- LinkedIn URL: If available
- Portfolio/GitHub URL: If available
- NO photo, marital status, or date of birth unless explicitly required for specific countries

2. PROFESSIONAL SUMMARY (Not "Objective")
- Format: 3-4 sentence paragraph (your "elevator pitch")
- Use ONLY information from user profile - do not invent credentials or experience
- If user has less than 2-3 key achievements, keep summary shorter
- Answer these questions using ONLY user's actual background:
  1. Who are they? (Current/past role and years - from their actual experience)
  2. What can they do? (Top skills ACTUALLY listed by user)
  3. What have they done? (Real achievements user mentioned)
- Make it compelling using their REAL accomplishments
- If user hasn't provided specific metrics, do not add assumed numbers
- Example structure: "[Title] with [X years] experience in [User's listed skills]. Proven track record in [user's stated achievements]..."

3. WORK EXPERIENCE (The Core Section)
- LIST JOBS IN REVERSE CHRONOLOGICAL ORDER (Most recent first)
- Use ONLY the experience entries provided by the user - do not add jobs the user didn't list
- Format for each position:
  * Job Title (Make it BOLD/Strong)
  * Company Name, Location
  * Dates: Month Year – Month Year (or "Present" if current)
  * Use the exact description/bullets provided by user (3-5 bullets max)
  
- BULLET POINT FORMATTING:
  * Use user's provided descriptions and achievements
  * If user provided descriptions, professionally format them
  * If user provided bullets, use those directly
  * Do NOT invent achievements not mentioned by user
  * Only include metrics user actually mentioned - do NOT add assumed numbers
  
- Strong action verbs ONLY if appropriate to user's actual accomplishments
- Prioritize achievements relevant to {{{role}}} if provided
- Do NOT add unmentioned experiences or responsibilities

CRITICAL: If user didn't provide detailed descriptions, use what they gave. Do not fabricate impact statements.

4. SKILLS SECTION
- Use ONLY the skills user has explicitly listed - do NOT add skills not provided
- Critical for ATS keyword scanning - list clearly without hiding in paragraphs
- Format: List skills with commas, NOT as paragraphs
- ORGANIZE BY CATEGORY (based on user's actual skills):
  * Technical Skills: [List only skills user provided]
  * Tools & Platforms: [Only from user's technicalTools field]
  * Soft Skills: [Only from user's skills if soft skills mentioned - typically 2-3]
  * Languages: [Only languages user provided with their proficiency levels]

- Number of skills: Use what user provided (don't invent to reach 10-15)
- Front-load most relevant skills user mentioned
- If job description provided: ONLY add keywords from job that MATCH user's actual background
- Example format (if user has these skills):
  Technical Skills: Python, Java, AWS (as provided)
  Tools: JIRA, Tableau (as provided)
  Soft Skills: Team Leadership, Problem Solving (if explicitly mentioned)

CRITICAL: Do not add skills the user didn't list. If they listed 5 skills, show 5 skills.

5. EDUCATION SECTION
- List ONLY the education entries provided by the user
- Do NOT invent degrees or institutions not provided
- For fresh graduates: This goes ABOVE work experience
- For experienced professionals: This goes BELOW work experience
- Format for each degree (using ONLY user's provided data):
  * Degree Name (exactly as user provided)
  * University Name, Location (exactly as user provided)
  * Graduation: Year (as user provided)
  * GPA: Only include if user provided it AND it's above 3.5/4.0
  * Relevant coursework: Only if user explicitly mentioned

- INCLUDE ALL EDUCATION LEVELS user provided:
  * Bachelor's Degree
  * Master's Degree (if provided)
  * Diploma
  * Intermediate/12th Grade
  * SSC/10th Grade
  * Any other education levels user included

- Each degree should display exactly as user entered it
- Do NOT fill in missing details with assumptions

6. OPTIONAL SECTIONS (Include ONLY if user provided data for them):
- Do NOT include optional sections if user has no data for them
- Only include sections where user provided actual information:

IF USER PROVIDED CERTIFICATIONS:
- Certification Name — Issuing Organization, Year
- Example: AWS Certified Solutions Architect — Amazon Web Services, 2023

IF USER PROVIDED PROJECTS:
- Project Name
- What the project does (use user's description)
- Skills/tools used (as user listed)
- Impact or results (only if user mentioned)

IF USER PROVIDED LANGUAGES:
- Language - Proficiency Level
- Example: Spanish - Fluent (use user's exact proficiency level)

IF USER PROVIDED TECHNICAL TOOLS:
- List specialized tools user listed: Salesforce, JIRA, Tableau, etc.
- Format: Tool 1, Tool 2, Tool 3 (comma-separated, as user provided)

IF USER PROVIDED VOLUNTEER WORK:
- Volunteer Role — Organization Name, Location
- Month Year – Month Year (exactly as user provided)
- Description of responsibilities (use user's provided description)

IF USER PROVIDED PUBLICATIONS & SPEAKING:
- Title — Publication/Conference Name, Month Year
- Example: "Scaling Microservices Architecture" — Tech Conference, March 2023

IF USER PROVIDED AWARDS & HONORS:
- Award Name — Awarding Organization/Company, Month Year
- Example: Employee of the Year — XYZ Corporation, December 2023

IF USER PROVIDED INTERESTS:
- Brief professional interests (use exactly as user stated)
- Example: Open-source development, machine learning

CRITICAL: Do NOT include sections where user provided NO data.

VISUAL FORMATTING STANDARDS (ATS & Human Compatible):
============================================================
- Length: 1 page if <10 years experience, maximum 2 pages for senior roles
- Margins: Standard 1-inch (2.54 cm). Can go to 0.5 inches if needed for space
- Font: Clean sans-serif only: Arial, Calibri, Helvetica, Roboto (10-12pt size)
- Line Spacing: 1-1.15 for readability

DO NOT USE (Breaks ATS):
✗ Two-column layouts
✗ Graphics, images, icons
✗ Rating scales ("5/5 stars", pie charts)
✗ Tables or complex formatting
✗ Colors or unusual fonts
✗ Headers/footers in middle of content

PRIORITY ORDER OF SECTIONS:
1. Header (Contact Info)
2. Professional Summary
3. Work Experience (Most relevant first within reverse chronological)
4. Key Skills (Organized by category: Technical, Tools, Soft Skills, Languages)
5. Education (Position based on experience level)
6. Certifications (if applicable)
7. Projects (if applicable - tech roles)
8. Technical Tools & Platforms (if applicable - specialized systems)
9. Volunteer Work (if applicable - shows community involvement)
10. Publications & Speaking (if applicable - thought leadership)
11. Awards & Honors (if applicable - notable achievements)
12. Languages (if multilingual)
13. Interests (optional - 1 line only)

{{#if profile.extraRequirements}}
JOB DESCRIPTION PROVIDED - SPECIAL INSTRUCTIONS:
=============================
USER PROVIDED JOB DESCRIPTION:
{{profile.extraRequirements}}

ANALYZE & APPLY TO RESUME:
1. Extract all required skills, technologies, frameworks - weave keywords naturally throughout
2. Match experience section to job responsibilities - reorder to show most relevant experience first
3. Extract seniority level expectations - adjust tone and scope accordingly
4. Pull out key metrics/results mentioned in job - use similar metrics in achievements where applicable
5. Identify domain-specific keywords and use them naturally
6. Highlight achievements demonstrating capability for this specific role
7. In Professional Summary: Reference the target role and key job requirements
8. In Skills: Ensure job-required technologies are prominently featured
9. In Experience: Emphasize achievements matching job responsibilities
10. Ensure resume tells the story of why this person is perfect for THIS role
{{/if}}

{{#if profile.extraInfo}}
ADDITIONAL USER-PROVIDED INFORMATION - ANALYZE & INCORPORATE:
=============================
USER PROVIDED EXTRA INFORMATION:
{{profile.extraInfo}}

INSTRUCTIONS FOR ANALYZING EXTRA INFO:
1. CAREFULLY READ the extra information provided by the user
2. EXTRACT any new accomplishments, achievements, metrics, or details mentioned
3. IDENTIFY any missing context or details that enhance existing sections
4. VALIDATE that the information aligns with user's actual background (don't contradict stated experience)
5. ANALYZE the extra info for:
   - Additional achievements or accomplishments to add to relevant roles
   - Measurable impact/metrics that should be highlighted
   - Additional technical skills or specialized knowledge
   - Project outcomes or results not mentioned before
   - Awards, recognitions, or special mentions
   - Leadership experiences or initiatives
   - Professional development or additional certifications
6. INCORPORATE INTO RESUME:
   - Add extracted achievements as bullet points to relevant experience entries
   - Update skills section if new technical skills are mentioned
   - Add metrics and quantifiable results to experience descriptions
   - Enhance professional summary if significant accomplishments are mentioned
   - Include any additional professional development or awards
7. MAINTAIN DATA INTEGRITY:
   - Only add information that supplements user's existing profile
   - Never contradict or replace user's existing information
   - Clearly distinguish between base profile data and extra info enhancements
   - If extra info contradicts existing data, prioritize the more detailed extra info
   - Always use the most complete version of information available
{{/if}}

FINAL OUTPUT REQUIREMENTS:
============================================================
- Generate sections in order: Header → Summary → Experience → Skills → Education → Optional Sections
- Optional Sections to include (if applicable): Certifications, Projects, Technical Tools, Volunteer Work, Publications, Awards, Languages, Interests
- Maintain consistent formatting and structure throughout
- **ONLY USE USER-PROVIDED DATA - DO NOT FABRICATE ANY INFORMATION**
- If a section has no data in the user profile, omit that section entirely
- Never invent or assume achievements, skills, or experiences not explicitly provided
- Format and organize ONLY the real data the user has provided
- All information MUST be factually accurate - taken directly from user profile
- Tailor sections to {{{role}}} using only the actual user background
- Create a resume that passes ATS systems AND impresses human recruiters
- Use metric-driven achievements (only those actually provided by user)
- Ensure logical flow and professional presentation
- Make it compelling and organized using ONLY real user information
- Keep language powerful but concise
- Prioritize sections based on relevance to {{{role}}} and user's experience level
- Ready to download as PDF/DOCX immediately`,
  });

  const generateResumeFlow = ai.defineFlow(
    {
      name: 'generateResumeFlow',
      inputSchema: GenerateResumeInputSchema,
      outputSchema: GenerateResumeOutputSchema,
    },
    async input => {
      const { output } = await prompt(input);
      return output!;
    }
  );

  _generateResumeFlow = generateResumeFlow;
  return _generateResumeFlow;
}

export async function generateResume(input: GenerateResumeInput): Promise<GenerateResumeOutput> {
  const flow = await ensureGenerateResumeFlow();
  const result = await flow(input);
  return result;
}
