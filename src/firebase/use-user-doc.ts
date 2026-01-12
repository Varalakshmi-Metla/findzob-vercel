import { useEffect, useMemo } from 'react';
import { doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { useDoc } from '@/firebase/firestore/use-doc';

/**
 * Hook to get the Firestore user document for the current user (by UID).
 * Returns { userDoc, isLoading, error }
 */
export function useUserDoc(user: { uid: string } | null) {
  const firestore = useFirestore();
  // Use useMemoFirebase to ensure stable doc ref for useDoc
  const userDocRef = (globalThis as any).useMemoFirebase
    ? (globalThis as any).useMemoFirebase(() => (firestore && user?.uid ? doc(firestore, 'users', user.uid) : null), [firestore, user])
    : useMemo(() => (firestore && user?.uid ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
  const { data, isLoading, error } = useDoc<any>(userDocRef);
  return { userDoc: data, isLoading, error };
}
