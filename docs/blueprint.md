# **App Name**: FindZob AI

## Core Features:

- Firebase Authentication: Implement Firebase Authentication with Google, Facebook, Apple, and Email/Password sign-in methods.
- Profile Completion: Create a multi-step profile completion form to collect user data and store it in Firestore.
- AI Resume Generation: Generate ATS-friendly resumes using OpenAI API based on user data and selected roles. Free plan allows only 2 resumes generated
- Resume Export: Convert AI-generated resumes to styled HTML and allow users to download them as PDF or DOCX files.
- Job Scouting: Suggest recommend jobs for a user, where the user can use their resume to apply for the selected job. Status chips update upon progress. Free plan allows only two jobs apply
- Tracking Section: Track job applications with status updates (Applied, Under Review, Interview, Offer, Rejected) from Firestore.
- Interview Prep Tool: Use the AI to generate mock interview Q&A based on selected resume, context and other data from the firestore datastore. It's role is that of an assistant who can decide when to suggest helpful context or resume tips, so the word tool is in it's description.
- Google Pay Subscription: Integrate Google Pay API for subscription payments with different plans and access control based on subscription status.

## Style Guidelines:

- Primary color: Deep blue (#2E5AA7) to convey trust and professionalism, reflecting the serious nature of job searching and career advancement.
- Background color: Light blue (#D8E2EF), a lighter tint of the primary blue, providing a calm and professional backdrop.
- Accent color: Teal (#3EB489), an analogous color to the primary, creating a refreshing contrast and highlighting key interactive elements.
- Additional colors: Black, grey, and white for a professional and clean aesthetic.
- Headline font: 'Space Grotesk' (sans-serif) for headlines and short amounts of body text; Body font: 'Inter' (sans-serif) for longer text. Note: currently only Google Fonts are supported.
- Use clean, professional icons for resume sections and job application statuses.
- Design a clean, ATS-friendly layout for resumes, focusing on readability and clear hierarchy.
- Incorporate subtle animations for loading states and transitions to enhance user experience.