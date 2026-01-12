// Example user profile for resume generation (P. Veera Chakradhar style)
import { GenerateResumeInput } from '@/ai/schemas/resume-schemas';

export const veeraChakradharProfile: GenerateResumeInput = {
  profile: {
    name: 'P. Veera Chakradhar',
    email: 'veerachakradharpampanaboyina@gmail.com',
    phone: '+91 9550885216',
    linkedin: 'linkedin.com/in/veera-chakradhar-pampanaboyina-40680a279',
    github: '', // [Link Pending - Repositories currently private]
    address: 'Kakinada, Andhra Pradesh, India',
    education: [
      {
        degree: 'Bachelor of Technology (B.Tech), Computer Science',
        university: 'Pydah College of Engineering, Patavala, AP',
        duration: '2025 – 2028',
      },
      {
        degree: 'Diploma in Electronics and Communication Engineering (ECE)',
        university: 'Aditya College of Engineering, Surampalem, AP',
        duration: '2022 – 2025',
      },
      {
        degree: 'Secondary School Certificate (SSC)',
        university: 'Z.P. High School, Lampakalova, AP',
        duration: 'Completed 2022',
      },
    ],
    experience: [
      {
        company: 'Flyhii Solutions Pvt Ltd',
        role: 'Associate Software Trainee (Intern)',
        duration: 'July 2025 – February 2026 (Ongoing)',
        description: `Contributing to full-stack development modules using Next.js and Tailwind CSS for client-facing software.\nCollaborating in an Agile environment, participating in daily stand-ups, and delivering high-quality code through peer reviews.\nOptimizing front-end components to improve user engagement and application performance.\nManaging version control and collaborative workflows via Git.`,
      },
    ],
    skills: [
      'C',
      'C++',
      'Python',
      'JavaScript (ES6+)',
      'SQL',
      'Next.js (App Router)',
      'React.js',
      'Tailwind CSS',
      'Node.js',
      'AWS (EC2, S3)',
      'Vercel',
      'Firebase (Auth, Cloud Functions)',
      'MongoDB (Schema Design)',
      'Firestore (NoSQL)',
      'Burp Suite (Vulnerability Assessment)',
      'Git',
      'GitHub',
      'Linux Shell',
      'Problem Solving',
      'Security Mindset',
      'Communication',
      'Adaptability',
      'Telugu (Native Proficiency)',
      'English (Professional Working Proficiency)'
    ],
    projects: [
      {
        title: 'Gethub | AI-Powered Competitive Exam Platform',
        tech: 'Next.js, Python, Firebase, MongoDB',
        description: `Awarded 2nd Rank at the TEK2K25 Hackathon for innovation in AI-education.\nEngineered a full-stack platform to help students prepare for competitive examinations.\nIntegrated AI features to generate personalized mock tests and performance analytics.\nImplemented real-time data synchronization using Firebase Firestore and MongoDB.`
      },
      {
        title: 'Findzob | US-Market Opportunity Finder',
        tech: 'AWS, Next.js, Firebase, Burp Suite',
        description: `Architected a specialized job discovery portal for the US market focusing on high-performance page rendering.\nUtilized AWS services for scalable cloud hosting and secure asset storage.\nConducted security audits using Burp Suite.\nIntegrated Firebase Auth for secure identity management.`
      }
    ],
    certifications: [],
    jobPreferences: [
      {
        desiredRoles: 'Associate Software Developer Intern',
        locationPreference: 'Google',
      }
    ],
    extraRequirements: '',
  },
  role: 'Associate Software Developer Intern',
};
