'use server';

import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export interface ChatMessage {
  role: 'user' | 'model';
  parts: string;
}

interface InterviewContext {
  role: string;
  jobDescription?: string;
  candidateName?: string;
  resumeSummary?: string;
}

export async function chatWithInterviewer(
  history: ChatMessage[], 
  newMessage: string, 
  context: InterviewContext
) {
  try {
    const systemPrompt = `You are Sarah, a Senior Talent Acquisition Specialist at a top-tier tech company. You are conducting a formal video interview for the position of "${context.role}".
    ${context.jobDescription ? `Job Description: ${context.jobDescription}` : ''}
    ${context.candidateName ? `Candidate Name: ${context.candidateName}` : 'the candidate'}
    ${context.resumeSummary ? `Candidate Background: ${context.resumeSummary}` : ''}

    Your goal is to conduct a realistic, structured corporate interview. Maintain a professional, polite, yet rigorous demeanor.
    
    Structure the interview as follows:
    1.  **Introduction**: Briefly introduce yourself and the company. Ask the candidate to introduce themselves.
    2.  **Experience Check**: Ask regarding their relevant experience for this specific role.
    3.  **Technical/Competency**: Ask 2-3 specific technical or situational questions related to the Job Description.
    4.  **Behavioral**: Ask 1-2 behavioral questions (e.g., conflict resolution, challenges).
    5.  **Closing**: Ask if they have any questions and wrap up.

    Guidelines:
    - **One Question at a Time**: Never ask multiple questions in one turn.
    - **Dig Deeper**: If an answer is superficial, ask a follow-up ("Can you give me a specific example of that?", "What was your specific contribution?").
    - **Stay in Character**: You are busy but attentive. Use professional corporate language.
    - **Conciseness**: Keep your spoken responses under 3-4 sentences so the candidate isn't overwhelmed by long text-to-speech.
    - **Feedback**: Do NOT give feedback during the interview (e.g., don't say "Great answer, you scored well"). Just acknowledge ("Thank you for sharing that," "I see, that's interesting") and move on.
    
    If the user indicates they want to stop or finish, politely conclude the interview.`;

    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash", 
        systemInstruction: systemPrompt
    });

    let chatHistory = history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.parts }]
    }));

     // Ensure history starts with user if it's not empty (Gemini adjustment)
    if (chatHistory.length > 0 && chatHistory[0].role === 'model') {
        chatHistory = [
            { role: 'user', parts: [{ text: "Hello, I am ready for the interview." }] },
            ...chatHistory
        ];
    }

    const chat = model.startChat({
        history: chatHistory,
    });

    const result = await chat.sendMessage(newMessage);
    const response = await result.response;
    const text = response.text();
    return { success: true, message: text };
  } catch (error: any) {
    console.error("Error in chatWithInterviewer:", error);
    return { success: false, error: error.message };
  }
}

export async function generateInterviewFeedback(
    history: ChatMessage[],
    context: InterviewContext
) {
     try {
    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `Act as a Senior Hiring Manager. Review the following interview transcript for the role of "${context.role}".
    
    Transcript:
    ${history.map(m => `${m.role === 'user' ? 'Candidate' : 'Interviewer'}: ${m.parts}`).join('\n')}

    Provide a professional, honest assesssment using strict corporate standards.
    Return a JSON object with this structure:
    {
        "overallScore": number (1-10, be strict, 7 is average),
        "strengths": ["string", "string"],
        "areasForImprovement": ["string", "string"],
        "actionableSuggestions": ["string" (Must be concrete actionable advice)],
        "detailedFeedback": "string (A paragraph summarizing the performance)",
        "hiringRecommendation": "Hire" | "No Hire" | "Strong Hire" | "Possible Fit"
    }
    
    Return ONLY valid JSON.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    try {
        return { success: true, data: JSON.parse(text) };
    } catch (parseError) {
        console.error("JSON Parse Error:", text);
        // Fallback cleanup try
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        try {
             return { success: true, data: JSON.parse(jsonStr) };
        } catch(e) {
             return { success: false, error: "Failed to parse feedback" };
        }
    }

  } catch (error: any) {
    console.error("Error in generateInterviewFeedback:", error);
    return { success: false, error: error.message };
  }
}
