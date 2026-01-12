import { NextRequest, NextResponse } from 'next/server';
import { getAI } from '@/ai/genkit';

export async function POST(req: NextRequest) {
  try {
    const { message, userId } = await req.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid message' },
        { status: 400 }
      );
    }

    console.log('[chat-api] Processing message:', message, 'userId:', userId);

    // Get user plan information if userId is provided
    let userPlanContext = '';
    if (userId) {
      try {
        const { getFirestore } = await import('firebase-admin/firestore');
        const adminApp = await import('@/lib/firebase-admin').then(m => m.default);
        const db = getFirestore(adminApp);
        
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          const activePlan = userData?.activePlan || 'None';
          const plans = userData?.plans || [];
          const planDetails = plans.map((p: any) => `${p.name || p.id} (${p.status})`).join(', ');
          userPlanContext = `\nUser's Current Plan: ${activePlan}\nUser's All Plans: ${planDetails || 'No plans'}`;
        }
      } catch (error) {
        console.warn('[chat-api] Could not fetch user plan info:', error);
        userPlanContext = '';
      }
    }

    // Get the AI instance
    const ai = await getAI();

    // Enhanced system prompt with website context and plan knowledge
    const systemPrompt = `You are Z, a friendly and professional AI career assistant for FindZob. 

ABOUT FINDZOB:
FindZob is a comprehensive career platform offering:
- Resume generation and optimization (using AI)
- Job application tracking
- Interview preparation modules
- Hot jobs recommendations
- Resume AI chatbot
- Multiple pricing plans (Membership for unlimited access, Pay-As-You-Go for postpaid usage)

YOUR RESPONSIBILITIES:
1. Help users with their careers (resume, job search, interviews)
2. Answer questions about FindZob plans and features
3. Provide solutions for website/account issues
4. Guide users on how to use the platform

WEBSITE FEATURES & SOLUTIONS:
- Resume Generation: Go to Dashboard > Resumes, click "Generate Resume" to create AI-powered resumes
- Job Applications: Track applications in Dashboard > Applications
- Interview Prep: Access Dashboard > Interview Prep for preparation materials
- Hot Jobs: Find recommended opportunities in Dashboard > Hot Jobs
- Billing: Manage plans in Dashboard > Billing
- Invoices: View and pay invoices in Dashboard > Invoices
- Account: Update profile and settings in Dashboard > Profile

PLAN INFORMATION:
- Lifetime Membership: One-time payment for lifetime access to all features
- Pay-As-You-Go (PAYG): Postpaid plan - pay per usage, no fixed monthly cost
- Check Dashboard > Billing to view all available plans and pricing

COMMON ISSUES & SOLUTIONS:
1. Cannot access dashboard? → Check if you have an active plan (Dashboard > Billing)
2. Resume not generating? → Ensure profile is complete (Dashboard > Profile)
3. Can't view invoices? → Go to Dashboard > Invoices to see billing history
4. Unpaid invoice blocking access? → Go to Dashboard > Invoices and pay outstanding bills
5. Want to change plan? → Visit Dashboard > Billing to upgrade/downgrade
6. Forgot password? → Use "Forgot Password" on login page

Be concise (2-3 sentences), helpful, and encouraging. Provide actionable solutions.
Always suggest relevant dashboard pages when helping users.${userPlanContext}`;

    try {
      // Call the AI model
      const result = await ai.generate({
        model: 'googleai/gemini-2.5-flash',
        prompt: `${systemPrompt}\n\nUser Question: ${message}`,
        config: {
          temperature: 0.7,
          maxOutputTokens: 300,
        },
      });

      const response = result.text || 'I apologize, I could not generate a response. Please try again.';

      console.log('[chat-api] Generated response:', response);

      return NextResponse.json({
        success: true,
        response,
      });
    } catch (aiError: any) {
      console.error('[chat-api] AI Model Error:', aiError?.message);

      // Check if it's an API key issue
      if (aiError?.message?.includes('API key') || aiError?.message?.includes('expired')) {
        console.error('[chat-api] Google API key issue detected');
        
        // Provide helpful fallback response
        const fallbackResponses: { [key: string]: string } = {
          resume: 'To create a resume, go to Dashboard > Resumes and click "Generate Resume". Our AI will help you create a professional resume in minutes!',
          billing: 'Visit Dashboard > Billing to view all available plans. We offer Lifetime Membership and Pay-As-You-Go options.',
          invoice: 'You can view and manage your invoices at Dashboard > Invoices. If you have an unpaid invoice, please pay it there.',
          plan: 'We offer two plans: Lifetime Membership (one-time payment) and Pay-As-You-Go (postpaid). Check Dashboard > Billing for details.',
          interview: 'Access interview preparation materials at Dashboard > Interview Prep to boost your interview skills!',
          default: 'I\'m currently processing your request. Please check back shortly or visit the relevant dashboard section for more information.',
        };

        // Match user message to fallback response
        const lowerMessage = message.toLowerCase();
        let fallbackResponse = fallbackResponses.default;

        for (const [key, value] of Object.entries(fallbackResponses)) {
          if (key !== 'default' && lowerMessage.includes(key)) {
            fallbackResponse = value;
            break;
          }
        }

        return NextResponse.json({
          success: true,
          response: fallbackResponse,
        });
      }

      throw aiError;
    }
  } catch (error) {
    console.error('[chat-api] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        error: `Failed to process chat: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}
