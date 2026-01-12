'use server';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK if not already initialized
if (admin.apps.length === 0) {
    admin.initializeApp();
}

// Flows will be imported for their side effects in this file.
// NOTE: Resume generation has been migrated to use Ollama API directly
// see: src/ai/flows/generate-resume-flow-v2.ts for the new implementation
// OLD FLOW DISABLED - Using Ollama instead of Gemini
// import '@/ai/flows/generate-resume-flow';
import '@/ai/flows/extract-from-resume-flow';
import '@/ai/flows/generate-interview-questions-flow';
import '@/ai/flows/get-interview-feedback-flow';
