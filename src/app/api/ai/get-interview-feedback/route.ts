import { NextResponse } from 'next/server';
import { getInterviewFeedback } from '@/ai/flows/get-interview-feedback-flow';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // Basic validation
    if (!body || !body.role || !Array.isArray(body.questions) || !Array.isArray(body.answers)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const output = await getInterviewFeedback({ role: body.role, profile: body.profile, questions: body.questions, answers: body.answers });

    return NextResponse.json({ output });
  } catch (err: any) {
    console.error('API get-interview-feedback error', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}
