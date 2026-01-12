// Example: How to generate a resume from user profile data
import { generateResume } from './generate-resume-flow-v2';
import { veeraChakradharProfile } from './veeraChakradharProfile';

export async function generateVeeraResume() {
  // You can replace veeraChakradharProfile with any user profile object matching the schema
  // The new system includes personal details (name, email, phone, LinkedIn, GitHub, portfolio)
  const resume = await generateResume(veeraChakradharProfile.profile, veeraChakradharProfile.role);
  return resume;
}

// Usage example (in an API route, server action, or script):
// generateVeeraResume().then(resume => console.log(resume));
