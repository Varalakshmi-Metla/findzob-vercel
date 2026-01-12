"use server";
import { getAI } from '@/ai/genkit';
import { ExtractFromResumeInputSchema, ExtractFromResumeOutputSchema, type ExtractFromResumeInput, type ExtractFromResumeOutput } from '@/ai/schemas/resume-schemas';

let _extractFromResumeFlow: any = null;

async function ensureExtractFromResumeFlow() {
  if (_extractFromResumeFlow) return _extractFromResumeFlow;
  const ai = await getAI();
  const prompt = ai.definePrompt({
    name: 'extractFromResumePrompt',
    input: { schema: ExtractFromResumeInputSchema },
    output: { schema: ExtractFromResumeOutputSchema },
    prompt: `You are an expert resume parser. Analyze the following resume text and extract the user's information into a structured JSON format.
- Extract the full name, email, phone number, LinkedIn URL, and GitHub URL.
- For education, extract the degree, university, and year of completion.
- For experience, extract the company name, role/title, and duration of employment.
- For skills, compile a list of all mentioned skills.
- For projects, extract the project title and technologies used.
- For certifications, extract the certification title and the issuer.
- If a piece of information is not present, omit the corresponding field.

Resume Text:
{{{resumeText}}}
`,
  });

  const extractFromResumeFlow = ai.defineFlow(
    {
      name: 'extractFromResumeFlow',
      inputSchema: ExtractFromResumeInputSchema,
      outputSchema: ExtractFromResumeOutputSchema,
    },
    async (input) => {
      const { output } = await prompt(input);
      return output!;
    }
  );

  _extractFromResumeFlow = extractFromResumeFlow;
  return _extractFromResumeFlow;
}

export async function extractFromResume(input: ExtractFromResumeInput): Promise<ExtractFromResumeOutput> {
  const flow = await ensureExtractFromResumeFlow();
  return flow(input);
}
