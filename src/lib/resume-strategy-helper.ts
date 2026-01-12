/**
 * Resume Strategy Helper - Determines if resume should be Fresher or Experienced
 * and provides tailored prompt instructions for each type
 */

export interface ResumeStrategy {
  type: 'fresher' | 'experienced';
  years: number;
  requirementLevel: 'entry-level' | 'mid-level' | 'senior';
  recommendation: string;
}

/**
 * Determine resume strategy based on experience data
 * Fresher: 0-2 years experience or no work experience
 * Experienced: 2+ years experience
 */
export function determineResumeStrategy(profile: any): ResumeStrategy {
  // Extract experience years
  let totalYears = 0;
  const experiences = profile.experience || [];
  
  if (typeof profile.totalExperience === 'string') {
    const yearMatch = profile.totalExperience.match(/(\d+)\+?\s*year/i);
    if (yearMatch) {
      totalYears = parseInt(yearMatch[1]);
    }
  } else if (typeof profile.totalExperience === 'number') {
    totalYears = profile.totalExperience;
  } else if (experiences.length > 0) {
    // Estimate from experience entries
    totalYears = experiences.length; // Rough estimate: 1 year per job
  }
  
  // Determine level
  let type: 'fresher' | 'experienced' = totalYears < 2 ? 'fresher' : 'experienced';
  let requirementLevel: 'entry-level' | 'mid-level' | 'senior' = 'entry-level';
  
  if (totalYears >= 2 && totalYears < 5) {
    requirementLevel = 'mid-level';
  } else if (totalYears >= 5) {
    requirementLevel = 'senior';
  }
  
  // Determine recommendation
  let recommendation = '';
  if (type === 'fresher') {
    recommendation = `
FRESHER RESUME FORMAT:
- Focus on academic projects and learning
- Highlight core skills and fundamentals
- Show enthusiasm and potential for growth
- Include internships and training
- Emphasize what you learned and built
- Keep to 1 page maximum
- Section order: Header → Objective → Education → Skills → Projects → Certifications
`;
  } else {
    recommendation = `
EXPERIENCED RESUME FORMAT:
- Highlight achievements and business impact
- Show career progression and results
- Use metrics and numbers where applicable
- Prioritize work experience
- Keep education brief (degree + university only)
- Keep to 1-2 pages
- Section order: Header → Summary → Experience → Skills → Education → Projects → Certifications
`;
  }
  
  return {
    type,
    years: totalYears,
    requirementLevel,
    recommendation,
  };
}

/**
 * Generate fresher-specific prompt instructions
 */
export function getFresherPromptInstructions(): string {
  return `
=== FRESHER RESUME FORMAT ===

CAREER OBJECTIVE (instead of Summary):
- 2-3 lines maximum
- Focus on: Learning opportunities, skills development, enthusiasm
- Example: "Motivated BTech graduate with strong fundamentals in web development seeking an entry-level role to leverage technical skills and contribute to innovative projects."
- DO NOT include years of experience (you have none or very few)
- DO NOT claim expertise (you're learning)

EDUCATION (VERY IMPORTANT):
- Degree, College/University, Year of completion
- Include CGPA if above 3.5 and you have it
- Include honors/distinctions if applicable
- Can include relevant coursework if space permits
- Example: "Bachelor of Technology in Computer Science | ABC Engineering College | 2024 | CGPA: 3.8"

SKILLS (ORGANIZE BY CATEGORY):
- Include basics AND learning skills
- Group related skills together
- Show breadth of knowledge
- Example format:
  Languages: Java, Python, JavaScript
  Web: HTML, CSS, React, Node.js
  Database: MySQL, MongoDB
  Tools: Git, VS Code, Postman

PROJECTS (MOST IMPORTANT - SHOW WHAT YOU BUILT):
- Academic, Mini, or Personal projects are OK
- For each project:
  • What you built (2-3 lines)
  • Technologies used
  • Key learnings or achievements
- Focus on LEARNING, not just listing
- Use action verbs: Built, Developed, Implemented, Created
- Example:
  **E-Commerce Platform | React, Node.js, MongoDB**
  • Developed full-stack web application with user authentication and payment integration
  • Implemented real-time shopping cart and inventory management system
  • Enhanced UI responsiveness resulting in faster load times

EXPERIENCE / INTERNSHIPS:
- If you have internships, include them
- Focus on tools learned and tasks accomplished
- Format: **Role Title** | Company | Duration
  • Task/responsibility 1
  • Task/responsibility 2
  • Technology/tool used

CERTIFICATIONS:
- Online courses and certifications are valuable
- Include workshop participation
- Format: **Certification Name** — Issuing Platform/Organization, Year

WHAT TO SKIP FOR FRESHERS:
- Volunteer work (unless directly relevant)
- Publications (unlikely at fresher level)
- Awards and honors (unless significant academic awards)
- Don't fabricate experience or achievements

RESUME LENGTH:
- MUST fit on 1 page only
- Keep text concise but descriptive
- Prioritize: Skills > Projects > Education > Certifications

TONE:
- Enthusiastic but professional
- Show eagerness to learn
- Demonstrate potential and capability
- NO false claims or exaggeration
`;
}

/**
 * Generate experienced-specific prompt instructions
 */
export function getExperiencedPromptInstructions(): string {
  return `
=== EXPERIENCED RESUME FORMAT ===

PROFESSIONAL SUMMARY (instead of Objective):
- 3-4 lines maximum
- Highlight: Years of experience, key skills, major achievements
- Include job title/role and main focus area
- Example: "Software Engineer with 4+ years of experience in full-stack development and cloud architecture. Proven track record of designing and implementing scalable systems that serve millions of users. Skilled in React, Node.js, AWS, and microservices architecture."
- Focus on IMPACT and RESULTS, not just duties

WORK EXPERIENCE (MOST IMPORTANT):
- List in reverse chronological order (most recent first)
- For EACH position, include:
  **Job Title** | Company Name | Duration (Month Year – Month Year or Present)
  • Achievement 1 with business impact (use numbers/metrics if possible)
  • Achievement 2 showing responsibility
  • Achievement 3 demonstrating technical skill
  • Maximum 4-5 bullet points per role
- Focus on RESULTS and IMPACT, not just tasks
- Use action verbs: Developed, Implemented, Led, Designed, Optimized, Increased, Reduced, etc.
- Include metrics where honest and verifiable
- Example:
  **Senior Software Engineer** | TechCorp | Jan 2022 - Present
  • Led team of 5 engineers in designing microservices architecture reducing API response time by 40%
  • Implemented automated testing pipeline increasing code coverage from 45% to 85%
  • Mentored 3 junior engineers on best practices and code quality standards

SKILLS (PROVEN SKILLS ONLY):
- Focus on skills you've actually used in jobs
- List technologies/tools from your experience
- Group by category: Programming Languages, Frameworks, Databases, Cloud Platforms, etc.
- Prioritize skills used in target role
- No need to list basics (everyone knows git, IDE, etc.)
- Example:
  Languages: Java, Python, JavaScript/TypeScript
  Frameworks: React, Node.js, Spring Boot
  Databases: PostgreSQL, MongoDB, Elasticsearch
  Cloud: AWS (EC2, S3, Lambda), Google Cloud Platform
  Tools: Docker, Kubernetes, Jenkins, GitLab CI/CD

EDUCATION (BRIEF):
- Just degree, university, and year
- NO CGPA needed (unless exceptional 4.0)
- Example: "Bachelor of Science in Computer Science | Stanford University | 2015"
- Can skip if space is tight on 2-page limit

CERTIFICATIONS & AWARDS:
- Include if relevant to current role or prestigious
- Professional certifications (AWS, Azure, etc.) valuable
- Skip hobby certifications
- Example: "AWS Solutions Architect Associate Certification | 2022"

PROJECTS (SHOW MAJOR WORK):
- Include only significant or recent projects
- Can be from personal, open-source, or work projects
- Focus on business impact and technical challenges solved
- Example:
  **Real-Time Analytics Dashboard | React, Node.js, Apache Kafka**
  • Designed distributed data pipeline processing 100K+ events per second
  • Reduced data latency from 10 minutes to real-time using Kafka streaming
  • Implemented microservices architecture serving 50K+ concurrent users

WHAT TO INCLUDE FOR EXPERIENCED:
- Volunteer work (if leadership position or relevant skill demonstration)
- Publications (technical blogs, papers, conference talks)
- Awards and honors (industry awards, employee of the year, etc.)
- Speaking engagements at conferences

RESUME LENGTH:
- Should be 1-2 pages maximum
- Prioritize: Experience > Skills > Education > Projects > Certifications
- Trim less important details if space needed
- Keep each bullet point to 1-2 lines

TONE:
- Professional and confident
- Results-focused
- Demonstrate expertise and leadership
- Show business value, not just technical skills
- Use strong action verbs and metrics
`;
}

/**
 * Determine section priority order based on resume type
 */
export function getSectionPriorityOrder(type: 'fresher' | 'experienced'): string[] {
  if (type === 'fresher') {
    return [
      'header',
      'objective',      // Career Objective instead of Summary
      'education',      // Very important for freshers
      'skills',
      'projects',       // Show what you built
      'experience',     // Internships if any
      'certifications',
      'languages',
      'interests',
      'awards',
      'publications',
      'volunteerWork',
    ];
  } else {
    return [
      'header',
      'summary',        // Professional Summary
      'experience',     // Most important for experienced
      'skills',
      'education',      // Brief for experienced
      'certifications',
      'projects',       // Major projects only
      'languages',
      'awards',
      'publications',
      'volunteerWork',
      'interests',
    ];
  }
}

/**
 * Get font size recommendations based on resume type
 */
export function getFontSizes(type: 'fresher' | 'experienced'): {
  name: string;
  section: string;
  body: string;
  contact: string;
} {
  if (type === 'fresher') {
    return {
      name: '16pt',      // Slightly smaller for freshers to fit more content
      section: '11pt',
      body: '10pt',
      contact: '10pt',
    };
  } else {
    return {
      name: '18pt',      // Larger for experienced professionals
      section: '12pt',
      body: '11pt',
      contact: '11pt',
    };
  }
}

/**
 * Generate complete prompt for resume generation based on type
 */
export function getTypeSpecificPromptInstructions(strategy: ResumeStrategy): string {
  if (strategy.type === 'fresher') {
    return getFresherPromptInstructions();
  } else {
    return getExperiencedPromptInstructions();
  }
}
