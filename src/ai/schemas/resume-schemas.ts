import {z} from 'genkit';

const educationSchema = z.object({
    degree: z.string().describe("The degree or qualification obtained."),
    university: z.string().describe("The name of the university or institution."),
    year: z.string().describe("The year of completion or graduation as a four-digit string.").optional(),
    duration: z.string().optional().describe("The duration of the study (e.g., '2020-2024')."),
});

const experienceSchema = z.object({
    company: z.string().describe("The name of the company."),
    role: z.string().describe("The job title or role."),
    duration: z.string().describe("The duration of employment (e.g., 'Jan 2022 - Present')."),
    description: z.string().optional().describe("A description of responsibilities and achievements."),
});

const projectSchema = z.object({
    title: z.string().describe("The title of the project."),
    tech: z.string().describe("The technologies used in the project."),
    description: z.string().optional().describe("A description of the project."),
});

const certificationSchema = z.object({
    title: z.string().describe("The title of the certification."),
    issuer: z.string().describe("The issuing organization."),
});

const jobPreferencesSchema = z.object({
    desiredRoles: z.string(),
    locationPreference: z.string(),
    keywords: z.string().optional(),
});

const languageSchema = z.object({
    language: z.string().describe("The language name."),
    proficiency: z.string().describe("The proficiency level (e.g., Fluent, Intermediate, Basic)."),
});

const technicalToolSchema = z.string().describe("A technical tool or platform name.");

const volunteerSchema = z.object({
    role: z.string().describe("The volunteer role."),
    organization: z.string().describe("The organization name."),
    duration: z.string().describe("Duration of volunteer work."),
    description: z.string().optional().describe("Description of volunteer work."),
});

const publicationSchema = z.object({
    title: z.string().describe("Publication or speaking title."),
    publication: z.string().describe("Publication name or conference."),
    date: z.string().describe("Publication date or speaking date."),
});

const awardSchema = z.object({
    title: z.string().describe("Award title."),
    organization: z.string().describe("Organization that gave the award."),
    date: z.string().describe("Date awarded."),
});

export const userProfileSchema = z.object({
  name: z.string(),
  email: z.string(),
  phone: z.string().optional(),
  linkedin: z.string().optional(),
  github: z.string().optional(),
  portfolioURL: z.string().optional(),
  gender: z.string().optional(),
  dateOfBirth: z.union([z.string(), z.date()]).optional(),
  address: z.string().optional(),
  citizenship: z.string().optional(),
  totalExperience: z.string().optional(),
  visaStatus: z.string().optional(),
  sponsorship: z.string().optional(),
  education: z.array(educationSchema).optional(),
  experience: z.array(experienceSchema).optional(),
  skills: z.array(z.string()).optional(),
  projects: z.array(projectSchema).optional(),
  certifications: z.array(certificationSchema).optional(),
  languages: z.array(languageSchema).optional(),
  technicalTools: z.array(technicalToolSchema).optional(),
  volunteerWork: z.array(volunteerSchema).optional(),
  publications: z.array(publicationSchema).optional(),
  awards: z.array(awardSchema).optional(),
  interests: z.string().optional(),
  jobPreferences: z.array(jobPreferencesSchema).optional(),
  extraRequirements: z.string().optional().describe('Any extra requirements for resume generation.'),
  extraInfo: z.string().optional().describe('Additional information to analyze and incorporate into the resume.'),
});


export const GenerateResumeInputSchema = z.object({
  profile: userProfileSchema,
  role: z.string().describe('The job role to tailor the resume for.'),
});
export type GenerateResumeInput = z.infer<typeof GenerateResumeInputSchema>;

export const GenerateResumeOutputSchema = z.object({
  summary: z.string().describe("A professional summary for the resume."),
  skills: z.string().describe("A comma-separated list of relevant skills. This MUST include both user's existing skills and NEW skills extracted from job requirements/description."),
  experience: z.string().describe("Formatted work experience, with bullet points."),
  projects: z.string().describe("Formatted project experience, with bullet points."),
  education: z.string().describe("Formatted education, with bullet points."),
  certifications: z.string().describe("Formatted certifications, with bullet points.").optional(),
});
export type GenerateResumeOutput = z.infer<typeof GenerateResumeOutputSchema>;


export const ExtractFromResumeInputSchema = z.object({
  resumeText: z.string().describe("The full text content of a user's resume."),
});
export type ExtractFromResumeInput = z.infer<typeof ExtractFromResumeInputSchema>;

export const ExtractFromResumeOutputSchema = z.object({
  name: z.string().optional().describe("The user's full name."),
  email: z.string().optional().describe("The user's email address."),
  phone: z.string().optional().describe("The user's phone number."),
  linkedin: z.string().optional().describe("URL to the user's LinkedIn profile."),
  github: z.string().optional().describe("URL to the user's GitHub profile."),
  address: z.string().optional().describe("The user's physical address."),
  education: z.array(educationSchema).optional().describe("A list of the user's educational experiences."),
  experience: z.array(experienceSchema).optional().describe("A list of the user's professional experiences."),
  skills: z.array(z.string()).optional().describe("A list of the user's skills."),
  projects: z.array(projectSchema).optional().describe("A list of the user's projects."),
  certifications: z.array(certificationSchema).optional().describe("A list of the user's certifications."),
}).describe("Structured data extracted from a resume.");
export type ExtractFromResumeOutput = z.infer<typeof ExtractFromResumeOutputSchema>;
