"use server";
import { getAI } from '@/ai/genkit';
import { userProfileSchema } from '../schemas/resume-schemas';
import { z } from 'genkit';

const GenerateQuestionsInputSchema = z.object({
  role: z.string().describe('The job role the user is interviewing for.'),
  profile: userProfileSchema.describe("The user's profile data."),
});

type GenerateQuestionsInput = z.infer<typeof GenerateQuestionsInputSchema>;

const GenerateQuestionsOutputSchema = z.array(z.string()).describe("A list of interview questions.");

type GenerateQuestionsOutput = z.infer<typeof GenerateQuestionsOutputSchema>;

let _generateInterviewQuestionsFlow: any = null;

async function ensureGenerateInterviewQuestionsFlow() {
  if (_generateInterviewQuestionsFlow) return _generateInterviewQuestionsFlow;
  const ai = await getAI();
  const generateQuestionsPrompt = ai.definePrompt({
    name: 'generateInterviewQuestionsPrompt',
    input: { schema: GenerateQuestionsInputSchema },
    output: { schema: GenerateQuestionsOutputSchema },
    prompt: `You are an expert HR Manager preparing interview questions for a candidate.
Based on the provided user profile and the target role of '{{{role}}}', generate 5-7 relevant interview questions.
The questions should cover a mix of behavioral, technical, and situational topics directly related to the user's experience and skills listed in their profile.

**Candidate's Profile:**
- Name: {{profile.name}}
- Email: {{profile.email}}
{{#if profile.phone}}- Phone: {{profile.phone}}{{/if}}
{{#if profile.linkedin}}- LinkedIn: {{profile.linkedin}}{{/if}}
{{#if profile.github}}- GitHub: {{profile.github}}{{/if}}

{{#if profile.education}}
- Education:
{{#each profile.education}}
  - {{degree}} at {{university}}, {{year}}
{{/each}}
{{/if}}

{{#if profile.experience}}
- Experience:
{{#each profile.experience}}
  - {{role}} at {{company}} ({{duration}}): {{description}}
{{/each}}
{{/if}}

{{#if profile.skills}}
- Skills: {{#each profile.skills}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
{{/if}}

{{#if profile.projects}}
- Projects:
{{#each profile.projects}}
  - {{title}} ({{tech}}): {{description}}
{{/each}}
{{/if}}

{{#if profile.certifications}}
- Certifications:
{{#each profile.certifications}}
  - {{title}} from {{issuer}}
{{/each}}
{{/if}}

Generate a JSON array of strings containing the questions.
`,
  });

  const generateInterviewQuestionsFlow = ai.defineFlow(
    {
      name: 'generateInterviewQuestionsFlow',
      inputSchema: GenerateQuestionsInputSchema,
      outputSchema: GenerateQuestionsOutputSchema,
    },
    async (input) => {
      const { output } = await generateQuestionsPrompt(input);
      if (!output) {
        throw new Error("Failed to generate interview questions.");
      }
      return output;
    }
  );

  _generateInterviewQuestionsFlow = generateInterviewQuestionsFlow;
  return _generateInterviewQuestionsFlow;
}

export async function generateInterviewQuestions(input: GenerateQuestionsInput): Promise<GenerateQuestionsOutput> {
  const flow = await ensureGenerateInterviewQuestionsFlow();
  return flow(input);
}
