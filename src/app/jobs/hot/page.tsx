"use client";

import HotJobsSection from '@/components/HotJobsSection';
import { useState } from 'react';
import { useFirestore, useUser, useMemoFirebase, useDoc } from '@/firebase';
import { doc as fsDoc, getFirestore } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

async function submitApplication(userId: string, jobId: string, resumeId?: string | null, resumeURL?: string | null, priority?: boolean) {
  const res = await fetch('/api/applications/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, jobId, resumeId: resumeId || null, resumeURL: resumeURL || null, priority: !!priority }),
  });
  return res.json();
}

export default function HotJobsPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const currentUserDocRef = useMemoFirebase(() => (firestore && user?.uid) ? fsDoc(firestore, 'users', user.uid) : null, [firestore, user]);
  const { data: currentUserDoc } = useDoc<any>(currentUserDocRef);
  const isEmployee = Boolean(currentUserDoc && (currentUserDoc.role === 'employee' || currentUserDoc.isEmployee === true));
  const [priorityByJob, setPriorityByJob] = useState<Record<string, boolean>>({});
  const [loadingByJob, setLoadingByJob] = useState<Record<string, boolean>>({});
  const [errorsByJob, setErrorsByJob] = useState<Record<string, string | null>>({});

  const togglePriority = (jobId: string) => {
    setPriorityByJob(prev => ({ ...prev, [jobId]: !prev[jobId] }));
    setErrorsByJob(prev => ({ ...prev, [jobId]: null }));
  };

  const handleApply = async (jobId: string) => {
    if (isUserLoading) {
      // setMessage('Checking authentication...'); // Removed message state
      return;
    }
    const uid = user?.uid;
    if (!uid) {
      // setMessage('Please login to apply.'); // Removed message state
      return;
    }

    const resumeId = null;
    const resume = null;
    const priority = !!priorityByJob[jobId];

    try {
      setLoadingByJob(prev => ({ ...prev, [jobId]: true }));
      // setMessage('Applying...'); // Removed message state
      setErrorsByJob(prev => ({ ...prev, [jobId]: null }));
      const result = await submitApplication(uid, jobId, null, null, priority);
      if (result?.ok) {
        // setMessage('Application submitted successfully'); // Removed message state
        setPriorityByJob(prev => ({ ...prev, [jobId]: false }));
        router.push('/employee/requests');
      } else if (result?.errors) {
        const errMsg = result.errors.resumeId || result.errors.general || 'Application failed';
        setErrorsByJob(prev => ({ ...prev, [jobId]: errMsg }));
        // setMessage(null); // Removed message state
      }
    } catch (err: any) {
      setErrorsByJob(prev => ({ ...prev, [jobId]: err?.message || String(err) }));
    } finally {
      setLoadingByJob(prev => ({ ...prev, [jobId]: false }));
    }
  };
  if (!firestore) {
    return <div>Loading...</div>
  }

  return (
    <HotJobsSection
      handleApplyClick={handleApply}
      isEmployee={isEmployee}
      priorityByJob={priorityByJob}
      togglePriority={togglePriority}
      loadingByJob={loadingByJob}
      errorsByJob={errorsByJob}
    />
  );
}
