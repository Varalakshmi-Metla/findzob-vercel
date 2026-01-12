import { NextRequest, NextResponse } from 'next/server';
import { generateResume, generateResumeForJob, generateMultipleResumes } from '@/ai/flows/generate-resume-flow-v2';
import admin from 'firebase-admin';

// Initialize Firebase Admin if not already done
function getFirebaseAdmin() {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  }
  return admin;
}

/**
 * POST /api/generate-resume
 * 
 * Request body:
 * {
 *   profile: UserProfile,
 *   role: string,
 *   jobDescription?: string (optional - for tailoring)
 * }
 * 
 * Returns: GeneratedResume
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { profile, role, jobDescription } = body;

    // Validation
    if (!profile) {
      return NextResponse.json(
        { error: 'Profile data is required' },
        { status: 400 }
      );
    }

    if (!role || typeof role !== 'string') {
      return NextResponse.json(
        { error: 'Target role is required' },
        { status: 400 }
      );
    }

    // Generate resume
    let generatedResume;
    if (jobDescription) {
      console.log(`[API] Generating resume for ${role} with job description`);
      generatedResume = await generateResumeForJob(profile, role, jobDescription);
    } else {
      console.log(`[API] Generating resume for ${role}`);
      generatedResume = await generateResume(profile, role);
    }

    // Return success response
    return NextResponse.json(
      {
        success: true,
        data: generatedResume,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] Resume generation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/generate-resume
 * Health check and usage info
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      message: 'Resume generation API is running',
      endpoint: 'POST /api/generate-resume',
      method: 'POST',
      expectedBody: {
        profile: 'UserProfile object',
        role: 'string - target job role',
        jobDescription: 'string (optional) - job posting for tailoring',
      },
    },
    { status: 200 }
  );
}
