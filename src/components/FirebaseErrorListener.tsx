'use client';

import { useState, useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';

/**
 * An invisible component that listens for globally emitted 'permission-error' events.
 * It throws any received error to be caught by Next.js's global-error.tsx.
 */
export function FirebaseErrorListener() {
  const { toast } = useToast();
  // Keep a local state to optionally render nothing but allow cleanup
  const [lastError, setLastError] = useState<FirestorePermissionError | null>(null);

  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      // Log for debugging
      console.error('Firestore permission error (captured):', error);
      setLastError(error);
      // Show a user-friendly toast without crashing the app
      try {
        toast({ variant: 'destructive', title: 'Permission error', description: error.message || 'A permission error occurred.' });
      } catch (e) {
        // If toast isn't available for some reason, swallow
        console.error('Failed to show toast for firestore permission error', e);
      }
    };

    errorEmitter.on('permission-error', handleError);
    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, [toast]);

  // Render nothing
  return null;
}
