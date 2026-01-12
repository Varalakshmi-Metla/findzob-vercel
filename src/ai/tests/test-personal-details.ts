/**
 * Test file to verify personal details are included in generated resumes
 */

import { generateResume } from '@/ai/flows/generate-resume-flow-v2';
import {
  generateResumeHTML,
  generateResumeMarkdown,
  generateResumePlainText,
} from '@/lib/resume-formatter';

async function testPersonalDetailsInResume() {
  console.log('\n=== Testing Personal Details in Resume Generation ===\n');

  // Create test profile with personal details
  const testProfile = {
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    phone: '+1-555-0123',
    linkedin: 'https://linkedin.com/in/janesmith',
    github: 'https://github.com/janesmith',
    portfolioURL: 'https://janesmith.dev',
    
    education: [
      {
        degree: 'Bachelor of Science in Computer Science',
        university: 'Tech University',
        year: '2020',
      },
    ],

    experience: [
      {
        company: 'Tech Corp',
        role: 'Software Engineer',
        duration: 'Jan 2021 - Present',
        description: 'Developed web applications using React and Node.js',
      },
    ],

    skills: ['React', 'JavaScript', 'Node.js', 'AWS'],
  };

  try {
    console.log('Generating resume with personal details...\n');
    
    const resume = await generateResume(testProfile, 'Full Stack Developer');

    // Check if personal details are in the output
    console.log('✓ Resume generated successfully\n');

    if (resume.header) {
      console.log('📋 HEADER INFORMATION EXTRACTED:');
      console.log(`  Name: ${resume.header.name || 'NOT FOUND'}`);
      console.log(`  Email: ${resume.header.email || 'NOT FOUND'}`);
      console.log(`  Phone: ${resume.header.phone || 'NOT FOUND'}`);
      console.log(`  LinkedIn: ${resume.header.linkedin || 'NOT FOUND'}`);
      console.log(`  GitHub: ${resume.header.github || 'NOT FOUND'}`);
      console.log(`  Portfolio: ${resume.header.portfolioURL || 'NOT FOUND'}\n`);

      // Validate personal details
      const detailsFound = {
        name: !!resume.header.name,
        email: !!resume.header.email,
        phone: !!resume.header.phone,
        linkedin: !!resume.header.linkedin,
        github: !!resume.header.github,
        portfolio: !!resume.header.portfolioURL,
      };

      console.log('✓ VALIDATION RESULTS:');
      Object.entries(detailsFound).forEach(([key, found]) => {
        console.log(`  ${found ? '✓' : '✗'} ${key}: ${found ? 'FOUND' : 'MISSING'}`);
      });

      const allDetailsFound = Object.values(detailsFound).every(Boolean);
      if (allDetailsFound) {
        console.log('\n✓ SUCCESS: All personal details are included!\n');
      } else {
        console.log('\n⚠️  WARNING: Some personal details are missing!\n');
      }
    } else {
      console.log('✗ ERROR: No header section in resume output\n');
    }

    // Show formatted output samples
    console.log('📄 FORMATTED OUTPUT SAMPLES:\n');

    const plainText = generateResumePlainText(resume);
    console.log('Plain Text (first 300 chars):');
    console.log(plainText.substring(0, 300));
    console.log('\n---\n');

    const markdown = generateResumeMarkdown(resume);
    console.log('Markdown (first 300 chars):');
    console.log(markdown.substring(0, 300));
    console.log('\n---\n');

    const html = generateResumeHTML(resume, { theme: 'professional' });
    console.log(`HTML Output: Generated ${html.length} bytes\n`);

    // Check if name appears in HTML
    if (html.includes('Jane Smith')) {
      console.log('✓ Name is visible in HTML output');
    } else {
      console.log('✗ Name is NOT visible in HTML output');
    }

    if (html.includes('jane.smith@example.com')) {
      console.log('✓ Email is visible in HTML output');
    } else {
      console.log('✗ Email is NOT visible in HTML output');
    }

    if (html.includes('linkedin.com/in/janesmith')) {
      console.log('✓ LinkedIn is visible in HTML output');
    } else {
      console.log('✗ LinkedIn is NOT visible in HTML output');
    }

    console.log('\n=== Test Complete ===\n');

    return resume;
  } catch (error) {
    console.error('✗ Error during test:', error);
    throw error;
  }
}

// Run test if this is the main module
if (require.main === module) {
  testPersonalDetailsInResume().catch(console.error);
}

export { testPersonalDetailsInResume };
