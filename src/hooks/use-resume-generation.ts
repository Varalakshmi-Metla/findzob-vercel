/**
 * useResumeGeneration - React hook for resume generation
 */

'use client';

import { useState, useCallback } from 'react';
import { GeneratedResume } from '@/lib/gemini-service';

export interface ResumeGenerationState {
  loading: boolean;
  error: string | null;
  resume: GeneratedResume | null;
  progress: number; // 0-100
}

interface UseResumeGenerationReturn extends ResumeGenerationState {
  generateResume: (profile: any, role: string, jobDescription?: string) => Promise<void>;
  reset: () => void;
  downloadAsJSON: () => void;
  downloadAsMarkdown: () => void;
}

export function useResumeGeneration(): UseResumeGenerationReturn {
  const [state, setState] = useState<ResumeGenerationState>({
    loading: false,
    error: null,
    resume: null,
    progress: 0,
  });

  const generateResume = useCallback(
    async (profile: any, role: string, jobDescription?: string) => {
      setState((prev) => ({
        ...prev,
        loading: true,
        error: null,
        progress: 10,
      }));

      try {
        setState((prev) => ({ ...prev, progress: 25 }));

        const response = await fetch('/api/generate-resume-v2', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            profile,
            role,
            jobDescription,
          }),
        });

        setState((prev) => ({ ...prev, progress: 75 }));

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to generate resume');
        }

        const data = await response.json();

        setState((prev) => ({ ...prev, progress: 90 }));

        if (!data.success) {
          throw new Error(data.error || 'Resume generation returned an error');
        }

        setState((prev) => ({
          ...prev,
          resume: data.data,
          loading: false,
          progress: 100,
        }));

        // Reset progress after 1 second
        setTimeout(() => {
          setState((prev) => ({ ...prev, progress: 0 }));
        }, 1000);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'An unknown error occurred';
        setState((prev) => ({
          ...prev,
          error: errorMessage,
          loading: false,
          progress: 0,
        }));
      }
    },
    []
  );

  const reset = useCallback(() => {
    setState({
      loading: false,
      error: null,
      resume: null,
      progress: 0,
    });
  }, []);

  const downloadAsJSON = useCallback(() => {
    if (!state.resume) return;

    const dataStr = JSON.stringify(state.resume, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `resume-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [state.resume]);

  const downloadAsMarkdown = useCallback(() => {
    if (!state.resume) return;

    const { generateResumeMarkdown } = require('@/lib/resume-formatter');
    const markdown = generateResumeMarkdown(state.resume);
    const dataBlob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `resume-${Date.now()}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }, [state.resume]);

  return {
    ...state,
    generateResume,
    reset,
    downloadAsJSON,
    downloadAsMarkdown,
  };
}
