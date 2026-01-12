/**
 * Resume Generation Example Usage
 * This file demonstrates how to use the new Gemini-based resume generation system
 */

import { generateResume, generateResumeForJob, generateMultipleResumes } from '@/ai/flows/generate-resume-flow-v2';
import {
  generateResumeHTML,
  generateResumeMarkdown,
  generateResumePlainText,
  generateResumeJSON,
} from '@/lib/resume-formatter';

// Example user profile
const exampleProfile = {
  name: 'John Doe',
  email: 'john.doe@example.com',
  phone: '+1-555-0100',
  linkedin: 'https://linkedin.com/in/johndoe',
  github: 'https://github.com/johndoe',
  portfolioURL: 'https://johndoe.dev',
  totalExperience: '5 years',
  
  education: [
    {
      degree: 'Bachelor of Science in Computer Science',
      university: 'University of Technology',
      year: '2019',
      duration: '2015-2019',
    },
  ],

  experience: [
    {
      company: 'Tech Company Inc',
      role: 'Senior Software Engineer',
      duration: 'Jan 2022 - Present',
      description: `Led development of microservices architecture serving 1M+ users.
- Designed and implemented event-driven system reducing latency by 40%
- Mentored 5 junior developers on best practices
- Optimized database queries improving application performance by 30%`,
    },
    {
      company: 'StartUp Co',
      role: 'Full Stack Developer',
      duration: 'Jun 2019 - Dec 2021',
      description: `Built and maintained production web application using React and Node.js.
- Implemented CI/CD pipelines reducing deployment time by 50%
- Designed REST APIs serving 10K requests per day
- Improved code coverage from 20% to 85%`,
    },
  ],

  skills: [
    'JavaScript',
    'TypeScript',
    'React',
    'Node.js',
    'AWS',
    'Docker',
    'PostgreSQL',
    'System Design',
  ],

  projects: [
    {
      title: 'E-Commerce Platform',
      tech: 'React, Node.js, PostgreSQL, AWS',
      description: 'Built a full-stack e-commerce platform processing $1M+ in annual transactions',
    },
    {
      title: 'Real-time Chat Application',
      tech: 'TypeScript, Socket.io, MongoDB',
      description: 'Developed real-time messaging system supporting 50K concurrent users',
    },
  ],

  certifications: [
    {
      title: 'AWS Certified Solutions Architect',
      issuer: 'Amazon Web Services',
    },
    {
      title: 'Google Cloud Associate Cloud Engineer',
      issuer: 'Google Cloud',
    },
  ],

  languages: [
    {
      language: 'English',
      proficiency: 'Fluent',
    },
    {
      language: 'Spanish',
      proficiency: 'Intermediate',
    },
  ],

  technicalTools: [
    'JIRA',
    'Git',
    'Jenkins',
    'Kubernetes',
    'Terraform',
  ],

  interests: 'Open-source development, Machine Learning, Cloud Architecture',
};

// Example usage functions

/**
 * Example 1: Generate basic resume
 */
export async function exampleGenerateBasicResume() {
  console.log('\n=== Example 1: Generate Basic Resume ===\n');

  try {
    const resume = await generateResume(exampleProfile, 'Senior Full Stack Developer');

    console.log('Generated Resume Summary:');
    console.log(resume.summary);
    console.log('\nTop Skills:');
    console.log(resume.skills);

    // Save as JSON
    const json = generateResumeJSON(resume);
    console.log('\nResume as JSON (first 500 chars):');
    console.log(json.substring(0, 500) + '...\n');

    return resume;
  } catch (error) {
    console.error('Error generating resume:', error);
  }
}

/**
 * Example 2: Generate resume tailored to job posting
 */
export async function exampleGenerateJobSpecificResume() {
  console.log('\n=== Example 2: Generate Job-Specific Resume ===\n');

  const jobDescription = `
    We're looking for a Senior Full Stack Engineer to lead our team.
    
    Requirements:
    - 5+ years of software development experience
    - Expert in React and Node.js
    - Experience with AWS and containerization
    - Strong system design skills
    - Leadership and mentoring experience
    
    Preferred:
    - Cloud architecture certifications
    - Open-source contributions
    - Experience with event-driven systems
  `;

  try {
    const resume = await generateResumeForJob(
      exampleProfile,
      'Senior Full Stack Engineer',
      jobDescription
    );

    console.log('Job-Tailored Resume Summary:');
    console.log(resume.summary);

    // Export as different formats
    const html = generateResumeHTML(resume, { theme: 'professional' });
    console.log(`\nGenerated HTML resume (${html.length} bytes)`);

    const markdown = generateResumeMarkdown(resume);
    console.log(`Generated Markdown resume:\n${markdown.substring(0, 300)}...\n`);

    return resume;
  } catch (error) {
    console.error('Error generating job-specific resume:', error);
  }
}

/**
 * Example 3: Generate multiple resumes for different roles
 */
export async function exampleGenerateMultipleResumes() {
  console.log('\n=== Example 3: Generate Multiple Resumes ===\n');

  const roles = [
    'Senior Full Stack Developer',
    'Tech Lead',
    'Solutions Architect',
  ];

  try {
    const resumes = await generateMultipleResumes(exampleProfile, roles);

    console.log(`Generated ${resumes.size} resumes:\n`);

    for (const [role, resume] of resumes.entries()) {
      console.log(`\n--- ${role} ---`);
      console.log(`Summary: ${resume.summary.substring(0, 100)}...`);
    }

    return resumes;
  } catch (error) {
    console.error('Error generating multiple resumes:', error);
  }
}

/**
 * Example 4: Export resume in different formats
 */
export async function exampleExportFormats() {
  console.log('\n=== Example 4: Export Resume Formats ===\n');

  try {
    const resume = await generateResume(exampleProfile, 'Full Stack Developer');

    // Export as JSON
    const json = generateResumeJSON(resume);
    console.log('JSON Export (sample):');
    console.log(JSON.stringify(JSON.parse(json), null, 2).substring(0, 300) + '...\n');

    // Export as Markdown
    const markdown = generateResumeMarkdown(resume);
    console.log('Markdown Export (first 300 chars):');
    console.log(markdown.substring(0, 300) + '...\n');

    // Export as Plain Text
    const plainText = generateResumePlainText(resume);
    console.log('Plain Text Export (first 300 chars):');
    console.log(plainText.substring(0, 300) + '...\n');

    // Export as HTML
    const html = generateResumeHTML(resume, { theme: 'modern' });
    console.log(`HTML Export: Generated ${html.length} bytes of HTML\n`);

    return { json, markdown, plainText, html };
  } catch (error) {
    console.error('Error exporting resume:', error);
  }
}

// Run examples
if (require.main === module) {
  (async () => {
    await exampleGenerateBasicResume();
    await exampleGenerateJobSpecificResume();
    await exampleGenerateMultipleResumes();
    await exampleExportFormats();
  })().catch(console.error);
}
