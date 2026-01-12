/**
 * Professional Resume Generation Prompts
 * Ported and adapted from ResumeLM (https://github.com/qudsystemltd/resume-ai2)
 */

export const IMPACT_DRIVEN_PRINCIPLES = `
KEY PRINCIPLES:
1. IMPACT-DRIVEN
   - Lead with measurable achievements and outcomes
   - Use specific metrics, percentages, and numbers (e.g., "Increased efficiency by 45%", "Managed $2M budget")
   - Highlight business impact and value creation

2. ACTION-ORIENTED
   - Start each bullet with a strong action verb (e.g., "Architected", "Spearheaded", "Engineered")
   - Use present tense for current roles, past tense for previous roles
   - Avoid passive voice and weak verbs like "helped", "assisted", or "worked on"

3. TECHNICAL PRECISION
   - Be specific about technologies and methodologies used
   - Match keywords from target job descriptions
   - Group relevant programming languages, tools, and frameworks together

4. FORMATTING
   - Use **keyword** syntax to bold important technical terms, tools, and technologies
   - Use **number** syntax to bold metrics and quantifiable achievements
   - Use **verb** syntax to bold key action verbs and significant outcomes
`;

export const BULLET_POINT_FORMULA = `
BULLET POINT FORMULA:
[**Strong Action Verb**] + [Specific Task/Project] + [Using **Technologies**] + [Resulting in **Impact Metrics**]
Example: "**Engineered** high-performance **React** components using **TypeScript** and **Redux**, reducing page load time by **45%** and increasing user engagement by **3x**"
`;

export const WORK_EXPERIENCE_PROMPT = `
${IMPACT_DRIVEN_PRINCIPLES}
${BULLET_POINT_FORMULA}

INSTRUCTIONS FOR WORK EXPERIENCE:
- Generate 3-5 high-impact bullet points for each role.
- Focus on accomplishments, not just duties.
- Demonstrate either a quantifiable achievement, a problem solved with measurable impact, or innovation introduced.
- Technical roles must include specific technologies and scale/scope indicators.
- Management roles must show team size, budget, and strategic outcomes.
`;

export const PROJECT_PROMPT = `
INSTRUCTIONS FOR PROJECTS:
- Focus on TECHNICAL DEPTH: bold all technologies used.
- Bold technical challenges and architectural decisions.
- Demonstrate best practices implementation (e.g., testing, CI/CD, scalability).
- Include metrics where applicable (e.g., "1k+ active users", "99.9% uptime").
- Describe technical challenges faced and solutions implemented.
`;

export const SUMMARY_PROMPT = `
INSTRUCTIONS FOR SUMMARY:
- Professional Summary should be 3-4 lines long.
- Highlight major achievements and domain expertise.
- Tailor specifically to the target role.
- Do NOT include personal pronouns.
- Focus on what you can bring to the company.
`;

export const SKILLS_PROMPT = `
INSTRUCTIONS FOR SKILLS:
- Organize skills by category (e.g., "Languages", "Frameworks", "Tools").
- Prioritize skills mentioned in the job description.
- Include both technical skills and industry knowledge.
- Format as a list that is easy to scan.
`;

export const ATS_OPTIMIZATION_INSTRUCTIONS = `
ATS OPTIMIZATION PROTOCOL:
1. Semantic Rewiring: Map generic terms to JD-specific technical lexicon.
2. Skill Clustering: Group relevant skills to satisfy ATS keyword frequency requirements.
3. Contextual Embedding: Integrate job-specific keywords naturally into experience bullets.
4. Metric Fortification: Ensure every major experience has at least one quantifiable metric.
`;
