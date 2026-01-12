
"use server";
/**
 * @fileOverview An AI flow to provide feedback on interview answers.
 */
import { getAI } from '@/ai/genkit';
import { userProfileSchema } from '../schemas/resume-schemas';
import { z } from 'genkit';

const qaPairSchema = z.object({
  question: z.string(),
  answer: z.string(),
  idealAnswer: z.string().optional(),
});

const GetFeedbackInputSchema = z.object({
  role: z.string().describe('The job role the user was interviewed for.'),
  profile: userProfileSchema.describe("The user's profile data."),
  questions: z.array(z.string()).describe("The list of questions that were asked."),
  answers: z.array(z.string()).describe("The user's answers to the questions."),
});

// This is the schema the prompt will actually receive
const GetFeedbackPromptSchema = GetFeedbackInputSchema.extend({
  qaPairs: z.array(qaPairSchema).describe("An array of question, user answer and ideal answer pairs.")
});

type GetFeedbackInput = z.infer<typeof GetFeedbackInputSchema>;

const GetFeedbackOutputSchema = z.object({
  overall: z.string().describe("Overall feedback on the interview performance"),
  perQuestion: z.array(z.object({
    score: z.number().min(0).max(10).describe("Score out of 10"),
    feedback: z.string().describe("Detailed feedback for this specific answer")
  })).describe("Per-question feedback and scores"),
  idealAnswers: z.array(z.string()).optional().describe("Ideal/model answers for each question")
}).describe("Structured feedback on the user's interview performance");

type GetFeedbackOutput = z.infer<typeof GetFeedbackOutputSchema>;

let _getInterviewFeedbackFlow: any = null;

async function ensureGetInterviewFeedbackFlow() {
  if (_getInterviewFeedbackFlow) return _getInterviewFeedbackFlow;
  const ai = await getAI();
  const getFeedbackPrompt = ai.definePrompt({
    name: 'getInterviewFeedbackPrompt',
    input: { schema: GetFeedbackPromptSchema },
    output: { schema: GetFeedbackOutputSchema },
    system: `You are an expert HR Manager and Technical Interviewer providing feedback on a candidate's mock interview performance.
Your goal is to give constructive, detailed, and actionable feedback based on the user's answers to the provided questions.

You must provide feedback in this structured format:
{
  "overall": "A comprehensive summary of the interview performance, highlighting strengths and areas for improvement",
  "perQuestion": [
    {
      "score": <number 0-10>,
      "feedback": "Detailed feedback for this specific answer, mentioning strengths and improvement areas"
    }
  ],
  "idealAnswers": ["Ideal model answer for Q1", "Ideal model answer for Q2", ...]
}

Evaluation Criteria for Scoring (0-10):
- 8-10: Excellent answer that fully addresses the question with specific examples and clear structure
- 6-7: Good answer that covers most points but could use more detail or better structure
- 4-5: Basic answer that needs significant improvement in content or delivery
- 0-3: Incomplete or irrelevant answer

Consider these aspects when evaluating:
- Clarity and Conciseness: Was the answer clear and to the point?
- Relevance: Did the answer directly address the question?
- STAR Method: For behavioral questions, did they use Situation, Task, Action, Result?
- Technical Depth: For technical questions, was the answer accurate and knowledgeable?
- **Overall Impression:** What is your overall verdict and summary of the performance?

**Feedback Format:**
  const GetFeedbackOutputSchema = z.object({
    feedback: z.string().describe("Detailed feedback on the user's interview performance in Markdown format."),
    idealAnswers: z.array(z.string()).optional().describe('Array of ideal/model answers in the same order as questions'),
  });
1.  **Verdict:** Start with a clear verdict: "Selected" or "Not Selected".
2.  **Overall Feedback:** A detailed paragraph summarizing their performance, highlighting strengths and weaknesses.
3.  **Question-by-Question Breakdown:** For each question, provide a short analysis of the user's answer.
4.  **Suggestions for Improvement:** A bulleted list of actionable suggestions to help them improve their interviewing skills.

**Candidate's Profile:**
- **Target Role:** {{{role}}}
- **Profile Summary:** {{#if profile.experience}}{{profile.experience.[0].role}} at {{profile.experience.[0].company}}{{else}}Entry-level candidate{{/if}} with skills in {{#if profile.skills}}{{#each profile.skills}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{else}}N/A{{/if}}.

**Interview Transcript:**
{{#each qaPairs}}
---
**Question {{@index}}:** {{this.question}}

**Answer:** {{this.answer}}
{{/each}}
---
`,
  });

  const getInterviewFeedbackFlow = ai.defineFlow(
    {
      name: 'getInterviewFeedbackFlow',
      inputSchema: GetFeedbackInputSchema,
      outputSchema: GetFeedbackOutputSchema,
    },
    async (input) => {
      // First: ask the AI to generate model/ideal answers for each question
      try {
        const generateIdealPrompt = ai.definePrompt({
          name: 'generateIdealAnswersPrompt',
          input: { schema: z.object({ role: z.string(), profile: userProfileSchema, questions: z.array(z.string()) }) },
          output: { schema: z.array(z.string()) },
          prompt: `You are an expert interviewer and subject-matter expert for the role {{{role}}}.
Given the candidate profile and the following questions, produce a concise, well-structured, ideal answer for each question. Return a JSON array of strings, one ideal answer per question, matching order.

Candidate Profile Summary:
{{#if profile.experience}}{{profile.experience.[0].role}} at {{profile.experience.[0].company}}{{else}}Entry-level candidate{{/if}}

Questions:
{{#each questions}}
- {{this}}
{{/each}}
`
        });

        const { output: idealOutput } = await generateIdealPrompt({ role: input.role, profile: input.profile, questions: input.questions });
        const idealAnswers: string[] = idealOutput || [];

        // Create the question-answer pairs including ideal answers
        const qaPairs = input.questions.map((q: any, i: number) => ({
          question: q,
          answer: input.answers[i] || "No answer provided.",
          idealAnswer: idealAnswers[i] || 'No ideal answer available.'
        }));

        const promptInput = {
          ...input,
          qaPairs: qaPairs,
        };

        const { output } = await getFeedbackPrompt(promptInput);
        if (!output) {
          throw new Error("Failed to generate feedback.");
        }
        return output;
      } catch (err) {
        // If the auxiliary ideal-answer generation fails, fall back to original flow without ideal answers
        const qaPairs = input.questions.map((q: any, i: number) => ({
          question: q,
          answer: input.answers[i] || "No answer provided."
        }));
        const promptInput = { ...input, qaPairs };
        const { output } = await getFeedbackPrompt(promptInput);
        if (!output) throw new Error("Failed to generate feedback fallback.");
        return output;
      }
    }
  );

  _getInterviewFeedbackFlow = getInterviewFeedbackFlow;
  return _getInterviewFeedbackFlow;
}

export async function getInterviewFeedback(input: GetFeedbackInput): Promise<GetFeedbackOutput> {
  const flow = await ensureGetInterviewFeedbackFlow();
  return flow(input);
}
