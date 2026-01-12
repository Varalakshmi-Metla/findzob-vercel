
"use client";
import { useUserDoc } from '@/firebase/use-user-doc';
import React, { useState, useMemo, useEffect } from "react";
import { generatePaymentHash } from '@/lib/payment-hash';
import { doc, getDoc, updateDoc, increment, collection, query, where } from "firebase/firestore";
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { useDataIntegrity, useWalletIntegrity, useSubscriptionIntegrity } from '@/hooks/use-data-integrity';


export default function DashboardHotJobsPage() {
    // ...existing code...
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  // Wallet state for eligible users
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [showWalletWarning, setShowWalletWarning] = useState(false);
  // Job details dialog state
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [showJobDetails, setShowJobDetails] = useState(false);

  // Get userDoc for citizenship
  const { userDoc } = useUserDoc(user);
  
  // Data integrity verification
  const dataIntegrity = useDataIntegrity(userDoc);
  const walletIntegrity = useWalletIntegrity(userDoc);
  const subscriptionIntegrity = useSubscriptionIntegrity(userDoc);


  // Fetch user's hot job requests from the hotJobsRequests collection
  const hotJobsRequestsRef = useMemoFirebase(
    () => (user ? query(collection(firestore, 'hotJobsRequests'), where('userId', '==', user.uid)) : null),
    [user, firestore]
  );
  const { data: userHotJobsRequests, isLoading: isLoadingHotJobsRequests } = useCollection<any>(hotJobsRequestsRef);

  // Determine which collection to use for hot jobs based on citizenship
  const hotJobsCollectionName = userDoc?.citizenship === 'India' ? 'hot-jobs-india' : 'hotJobs';
  const hotJobsRef = useMemoFirebase(() => firestore ? collection(firestore, hotJobsCollectionName) : null, [firestore, hotJobsCollectionName]);
  const { data: hotJobs, isLoading } = useCollection<any>(hotJobsRef);

  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedType, setSelectedType] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [salaryRange, setSalaryRange] = useState<[number, number] | null>(null);

  // Fetch user's applications from the applications collection
  const applicationsCollectionRef = useMemoFirebase(
    () => (user ? query(collection(firestore, 'applications'), where('userId', '==', user.uid)) : null),
    [user, firestore]
  );
  const { data: userApplications, isLoading: isLoadingApplications } = useCollection<any>(applicationsCollectionRef);

  // Collect all unique job types for dropdown
  const jobTypes = useMemo(() => {
    if (!hotJobs) return [];
    const types = new Set<string>();
    hotJobs.forEach((job: any) => {
      if (job.type && job.type.trim() !== '') {
        types.add(job.type.trim());
      }
    });
    return Array.from(types);
  }, [hotJobs]);

  // Collect all unique job categories for dropdown
  const jobCategories = useMemo(() => {
    if (!hotJobs) return [];
    const categories = new Set<string>();
    hotJobs.forEach((job: any) => {
      if (job.category && job.category.trim() !== '') {
        categories.add(job.category.trim());
      }
    });
    return Array.from(categories).sort();
  }, [hotJobs]);

  // Salary range options (example ranges)
  const salaryRanges = [
    { label: "Any", value: null },
    { label: "< $30,000", value: [0, 30000] },
    { label: "$30,000 - $60,000", value: [30000, 60000] },
    { label: "$60,000 - $100,000", value: [60000, 100000] },
    { label: "> $100,000", value: [100000, Infinity] },
  ];
  const [loadingJobId, setLoadingJobId] = useState<string | null>(null);

  // userDoc already declared above for citizenship and plan info
  // Get user's active service plan and hot job limit
  const [planDoc, setPlanDoc] = useState<any>(null);
  const [planName, setPlanName] = useState<string>("—");
  // Use useMemo to ensure isPayAsYouGo and hotJobLimit are always correct and not reset on rerender
  const memoizedPlan = useMemo(() => {
    let hotJobLimit: number | null = null;
    let isPayAsYouGo = false;
    let planIsExpired = false;
    let planExpiryDate: Date | null = null;
    if (userDoc?.plan?.expiresAt) {
      planExpiryDate = new Date(userDoc.plan.expiresAt);
      if (!isNaN(planExpiryDate.getTime()) && planExpiryDate < new Date()) {
        planIsExpired = true;
      }
    }
    if (userDoc?.plan?.maxHotJobs !== undefined && userDoc?.plan?.maxHotJobs !== null && !planIsExpired) {
      hotJobLimit = userDoc.plan.maxHotJobs;
    } else if (planDoc && !planIsExpired) {
      if (planDoc.name && /pay as you go/i.test(planDoc.name)) {
        isPayAsYouGo = true;
        hotJobLimit = 9999; // treat as unlimited for UI logic
      } else if (typeof planDoc.maxjobslimit === 'number') {
        hotJobLimit = planDoc.maxjobslimit;
      } else if (Array.isArray(planDoc.features)) {
        let match = planDoc.features.find((f: string) => /up to (\d+) hot jobs/i.test(f));
        if (match) {
          let m = match.match(/up to (\d+)/i);
          if (m && m[1]) hotJobLimit = parseInt(m[1], 10);
        }
      }
      if (!hotJobLimit && planDoc.name && /pro/i.test(planDoc.name)) hotJobLimit = planDoc.maxjobslimit;
    }
    return { isPayAsYouGo, hotJobLimit, planIsExpired };
  }, [userDoc, planDoc]);
  const { isPayAsYouGo, hotJobLimit, planIsExpired } = memoizedPlan;
  // Use planName or planDoc.name for wallet check to avoid race condition
  const effectivePlanName = planName && planName !== '—' ? planName : (planDoc?.name || '');
  // Accept 'Pay-As-You-Go', 'Pay As You Go', etc.
  const isIndiaPayAsYouGo = userDoc?.citizenship === 'India' && /pay[-\s]?as[-\s]?you[-\s]?go/i.test(effectivePlanName);

    // Fetch wallet balance for India Pay As You Go users
    // Only use stable, primitive dependencies in useEffect
    useEffect(() => {
      const fetchWallet = async () => {
        if (isIndiaPayAsYouGo && user && firestore) {
          setWalletLoading(true);
          try {
            const userRef = doc(firestore, 'users', user.uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              const data = userSnap.data();
              setWalletBalance(typeof data.walletAmount === 'number' ? data.walletAmount : 0);
            } else {
              setWalletBalance(0);
            }
          } catch (e) {
            setWalletBalance(null);
          } finally {
            setWalletLoading(false);
          }
        }
      };
      fetchWallet();
    }, [Boolean(isIndiaPayAsYouGo), String(user?.uid), Boolean(firestore)]);
  useEffect(() => {
    const fetchPlan = async () => {
      if (Array.isArray(userDoc?.plans)) {
        const plan = userDoc.plans.find((p: any) => p.category === 'service' && p.planId);
        if (plan && plan.planId && firestore) {
          const planSnap = await import("firebase/firestore").then(({ doc, getDoc }) => getDoc(doc(firestore, "plans", plan.planId)));
          if (planSnap.exists()) {
            setPlanDoc(planSnap.data());
            setPlanName(planSnap.data().name || "—");
          }
        }
      }
    };
    fetchPlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userDoc, firestore]);

  // All plan logic is handled in useMemo above. Do not reassign isPayAsYouGo or hotJobLimit here.

  // Get user's applications count for this month from applications collection (manual, admin, user, any job)
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2, '0')}`;
  const hotJobApplicationsThisMonth = userApplications
    ? userApplications.filter((app: any) => {
        if (!app.appliedAt) return false;
        const appliedDate = new Date(app.appliedAt);
        const appliedMonthKey = `${appliedDate.getFullYear()}-${(appliedDate.getMonth()+1).toString().padStart(2, '0')}`;
        return appliedMonthKey === monthKey;
      }).length
    : 0;
  // For Pay As You Go, show 'Unlimited (Pay As You Go)'.
  // If no active service plan, show 0.
  let hotJobApplicationsRemaining: string | number = 0;
  if (planIsExpired) {
    hotJobApplicationsRemaining = 'Inactive (Plan Expired)';
  } else if (isPayAsYouGo) {
    hotJobApplicationsRemaining = 'Unlimited (Pay As You Go)';
  } else if (planDoc || userDoc?.plan?.maxHotJobs !== undefined) {
    if (hotJobLimit !== null) {
      hotJobApplicationsRemaining = `${Math.max(0, hotJobLimit - hotJobApplicationsThisMonth)} of ${hotJobLimit} remaining`;
    }
  }
  const hotJobLimitReached = planIsExpired || (hotJobLimit !== null && hotJobApplicationsThisMonth >= hotJobLimit);

  // Define activeServicePlan: true if planDoc exists and is a valid service plan and not expired
  const activeServicePlan = !!planDoc && !planIsExpired;

  // Function to open job details
  const openJobDetails = (job: any) => {
    setSelectedJob(job);
    setShowJobDetails(true);
  };

  // Function to handle external job application for Indian users
  const handleExternalApply = (job: any) => {
    if (!job) return;
    
    // Get the URL from the job data
    const jobUrl = job.url || job.apply_url || '';
    
    if (!jobUrl) {
      toast({ 
        title: 'Error', 
        description: 'Job application link not available.', 
        variant: 'destructive' 
      });
      return;
    }
    
    // Open the job URL in a new tab
    window.open(jobUrl, '_blank', 'noopener,noreferrer');
    
    // Record the application if user is logged in
    if (user) {
      console.log(`User ${user.uid} clicked external job link for job ${job.id}`);
    }
  };

  // Clean job values for display
  const cleanJobValue = (val: any): string => {
    if (val === null || val === undefined) return '';
    const str = String(val).trim();
    
    return str.replace(/^"|"$/g, '').replace(/"/g, '');
  };

  // Helper to get timestamp from job for sorting (newest first)
  const getJobTimestamp = (job: any): number => {
    if (job.createdAt?.seconds) return job.createdAt.seconds * 1000;
    if (job.createdAt?.toDate) return job.createdAt.toDate().getTime();
    if (job.createdAt) return new Date(job.createdAt).getTime();
    if (job.addedAt?.seconds) return job.addedAt.seconds * 1000;
    if (job.addedAt?.toDate) return job.addedAt.toDate().getTime();
    if (job.addedAt) return new Date(job.addedAt).getTime();
    if (job.timestamp?.seconds) return job.timestamp.seconds * 1000;
    if (job.timestamp?.toDate) return job.timestamp.toDate().getTime();
    if (job.timestamp) return new Date(job.timestamp).getTime();
    // Fallback: use document ID or 0 (will appear last)
    return 0;
  };

  // Sort jobs by createdAt (newest first)
  const sortedHotJobs = useMemo(() => {
    if (!hotJobs || !Array.isArray(hotJobs)) return [];
    return [...hotJobs].sort((a: any, b: any) => {
      return getJobTimestamp(b) - getJobTimestamp(a); // Descending order (newest first)
    });
  }, [hotJobs]);
  // Helper to determine Work Mode (Remote/Hybrid/On-Site)
  const getJobWorkMode = (job: any) => {
    if (!job) return 'Work Mode Not Specified';

    // 1. Check Boolean flags
    if (job.remote === true) return 'Remote';
    if (job.hybrid === true) return 'Hybrid';
    
    // 2. Explicit check: If both are strictly false, it is On-Site
    if (job.remote === false && job.hybrid === false) return 'On-Site';

    // 3. Fallback: If flags are undefined, check the 'type' string or default
    const typeText = cleanJobValue(job.type);
    
    // Optional: Check if the text itself says Remote/Hybrid
    if (typeText && typeText.toLowerCase().includes('remote')) return 'Remote';
    if (typeText && typeText.toLowerCase().includes('hybrid')) return 'Hybrid';

    // Return the original text (e.g., "Full-time") or default to "Work Mode Not Specified" if empty
    return typeText || 'Work Mode Not Specified';
  };
  const handleApply = async (job: any) => {
    // For India PAYG users only: navigate to job URL and deduct wallet
    if (userDoc?.citizenship === 'India' && isIndiaPayAsYouGo) {
      // Wallet deduction logic for India Pay As You Go users
      if (walletBalance === null || walletLoading) {
        toast({ title: "Wallet Error", description: "Unable to fetch wallet balance.", variant: "destructive" });
        setLoadingJobId(null);
        return;
      }
      if (walletBalance < 20) {
        setShowWalletWarning(true);
        setLoadingJobId(null);
        return;
      }
      if (!user) {
        toast({ title: "Error", description: "You must be logged in to apply.", variant: "destructive" });
        setLoadingJobId(null);
        return;
      }
      const deductionPayload = {
        userId: user.uid,
        amount: 20,
        jobId: job.id,
        ts: Date.now(),
      };
      const secret = process.env.NEXT_PUBLIC_WALLET_SECRET || 'demo_wallet_secret';
      const hash = generatePaymentHash(secret, deductionPayload);
      try {
        const res = await fetch('/api/wallet/deduct', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...deductionPayload, hash }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          toast({ title: "Wallet Error", description: data.error || 'Failed to deduct from wallet.', variant: "destructive" });
          setLoadingJobId(null);
          return;
        }
        setWalletBalance((prev: number | null) => (prev !== null ? prev - 20 : null));
        
        // Increment hotJobApplicationsCount in user doc
        try {
          const userRef = doc(firestore, 'users', user.uid);
          await updateDoc(userRef, {
            hotJobApplicationsCount: increment(1),
          });
        } catch (e) {
          console.error('Failed to update hot job applications count', e);
        }
      } catch (e) {
        toast({ title: "Wallet Error", description: "Failed to deduct from wallet.", variant: "destructive" });
        setLoadingJobId(null);
        return;
      }
      
      // For India PAYG users, navigate to job URL after wallet deduction
      const jobUrl = job.url || job.apply_url || '';
      if (jobUrl) {
        toast({ title: "Success", description: "Redirecting to job...", variant: "default" });
        window.open(jobUrl, '_blank', 'noopener,noreferrer');
        setLoadingJobId(null);
        return;
      } else {
        toast({ title: "Error", description: "Job URL not available.", variant: "destructive" });
        setLoadingJobId(null);
        return;
      }
    }
    
    // For India Pro plan users: continue with normal application submission flow
    if (userDoc?.citizenship === 'India' && !isIndiaPayAsYouGo) {
      // Pro plan users can submit requests normally
      // Fall through to continue with normal submission logic below
    } else if (userDoc?.citizenship === 'India') {
      // India users without Pro or PAYG plan
      toast({ title: "Plan Required", description: "You need an active Pro or Pay-As-You-Go plan to apply for hot jobs.", variant: "destructive" });
      return;
    }
    
    // USA users: Continue with normal application submission flow
    if (!user) {
      toast({ title: "Error", description: "You must be logged in to apply.", variant: "destructive" });
      return;
    }
    if (!planDoc) {
      toast({ title: "Service Plan Required", description: "Only users with an active service plan can apply for hot jobs.", variant: "destructive" });
      return;
    }
    if (!isPayAsYouGo && hotJobLimitReached) {
      toast({ title: "Limit reached", description: "You have reached your hot job application limit for this month.", variant: "destructive" });
      return;
    }
    if (loadingJobId === job.id) {
      // Prevent duplicate submit
      return;
    }
    setLoadingJobId(job.id);
    try {
      // Ensure we have valid job data - check for job.id first
      if (!job || !job.id) {
        toast({ title: "Error", description: "Invalid job data. Please try again.", variant: "destructive" });
        setLoadingJobId(null);
        return;
      }
      
      // Extract job data - use the actual job object values
      // Clean the values similar to how they're displayed (remove quotes, trim whitespace)
      const cleanJobValue = (val: any): string => {
        if (val === null || val === undefined) return '';
        const str = String(val).trim();
        // Remove quotes that might be in the data
        return str.replace(/^"|"$/g, '').replace(/"/g, '');
      };
      
      const jobTitle = cleanJobValue(job.title || job.jobTitle);
      const company = cleanJobValue(job.company);
      const location = cleanJobValue(job.location);
      
      // Handle salary - can be number or string
      let salary: string | number = '';
      if (job.salary !== undefined && job.salary !== null) {
        if (typeof job.salary === 'number') {
          salary = job.salary;
        } else if (typeof job.salary === 'string' && job.salary.trim() !== '' && job.salary.trim() !== '-') {
          // Try to parse if it's a numeric string
          const num = parseFloat(job.salary.trim());
          salary = isNaN(num) ? job.salary.trim() : num;
        }
      }
      
      const logoUrl = cleanJobValue(job.logoUrl || job.logo);
      
      // Log job data for debugging
      console.log('[HOT-JOBS] Applying for job:', {
        id: job.id,
        rawTitle: job.title,
        rawCompany: job.company,
        rawLocation: job.location,
        rawSalary: job.salary,
        rawLogoUrl: job.logoUrl,
        cleanedTitle: jobTitle,
        cleanedCompany: company,
        cleanedLocation: location,
        cleanedSalary: salary,
        cleanedLogoUrl: logoUrl,
        fullJob: job
      });
      
      // Validate that we have essential job data
      if (!jobTitle || jobTitle === '' || !company || company === '') {
        console.error('[HOT-JOBS] Missing essential job data:', { 
          jobTitle, 
          company, 
          jobId: job.id,
          rawJob: job 
        });
        toast({ title: "Error", description: "Job data is incomplete. Please refresh the page and try again.", variant: "destructive" });
        setLoadingJobId(null);
        return;
      }
      
      const payload = {
        userId: user.uid,
        userName: user.displayName || user.email || user.uid,
        userEmail: user.email || '',
        jobId: job.id,
        jobTitle: jobTitle,
        company: company,
        location: location,
        salary: salary,
        logoUrl: logoUrl,
        jobUrl: job.url || job.apply_url || '', // Include job URL
        url: job.url || job.apply_url || '', // Also include as 'url' for compatibility
        apply_url: job.apply_url || job.url || '', // Also include as 'apply_url' for compatibility
        requestedAt: new Date().toISOString(),
        priority: true,
        type: "hot-job-application"
      };
      
      console.log('[HOT-JOBS] Payload being sent:', payload);
      const res = await fetch("/api/applications/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (result.ok) {
        console.log('[HOT-JOBS] Application submitted successfully. Invoice status:', result.invoiceStatus);
        toast({ title: "Success", description: "Applied to hot job!" });
        // Wait a moment to ensure invoice is written and indexed in Firestore
        await new Promise(resolve => setTimeout(resolve, 1500));
        // Refresh the page using router instead of window.location.reload
        router.refresh();
      } else if (result.error && /duplicate/i.test(result.error)) {
        toast({ title: "Already Submitted", description: "You have already submitted a request for this job.", variant: "info" });
      } else {
        toast({ title: "Error", description: result.error || "Failed to apply.", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to apply.", variant: "destructive" });
    } finally {
      setLoadingJobId(null);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-2 sm:p-4 md:p-8 relative">
      {/* Data Integrity Alerts */}
      {!dataIntegrity.isVerified && dataIntegrity.error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3 mb-4">
          <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-yellow-800">Data Verification Notice</p>
            <p className="text-yellow-700">{dataIntegrity.error}</p>
          </div>
        </div>
      )}

      {!walletIntegrity.isValid && walletIntegrity.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3 mb-4">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-red-800">Wallet Security Alert</p>
            <p className="text-red-700">{walletIntegrity.error}</p>
          </div>
        </div>
      )}

      {!subscriptionIntegrity.isValid && subscriptionIntegrity.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3 mb-4">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-red-800">Subscription Security Alert</p>
            <p className="text-red-700">{subscriptionIntegrity.error}</p>
          </div>
        </div>
      )}

      {/* Wallet at top right for eligible users - Citizenship is taken from user profile (userDoc.citizenship). Wallet is shown only for India + Pay As You Go users. */}
      {isIndiaPayAsYouGo && (
        <div className="absolute left-[10px] top-8 z-20 flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 shadow-md">
          <svg className="w-5 h-5 text-blue-700" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M2 7a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V7z"/><path d="M16 11a2 2 0 110 4 2 2 0 010-4z"/></svg>
          <span className="text-base font-bold text-blue-700">
            Wallet: {walletLoading ? 'Loading...' : (walletBalance !== null ? `₹${walletBalance}` : '—')}
          </span>
          {walletBalance === 0 && !walletLoading && (
            <span className="ml-2 text-xs text-red-600 font-semibold">(Top up required)</span>
          )}
          <a href="/dashboard/wallet" className="ml-3 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs font-semibold transition">Top Up</a>
        </div>
      )}
      <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-6 md:mb-8 text-center">Jobs</h1>
      <div className="mb-4 flex flex-col gap-1 w-full">
        {/* For India Pay As You Go users, hide plan and jobs remaining, only show wallet (already at top right) */}
        {!(userDoc?.citizenship === 'India' && /pay[-\s]?as[-\s]?you[-\s]?go/i.test(effectivePlanName)) ? (
            <>
              <span className="text-sm font-semibold">
                Service Plan: {planName}
              </span>
              {/* Hide jobs remaining for USA Pay As You Go users (99999/unlimited) */}
              {!(userDoc?.citizenship === 'USA' && isPayAsYouGo && (hotJobApplicationsRemaining === 'Unlimted' || hotJobApplicationsRemaining === 'Unlimited (Pay As You Go)' || (typeof hotJobApplicationsRemaining === 'string' && hotJobApplicationsRemaining.toLowerCase().includes('unlimited')))) ? (
                <span className="text-sm">
                  {isPayAsYouGo
                    ? (userDoc?.citizenship === 'India' ? null : <><span className="text-green-700 font-semibold">Unlimited</span> jobs remaining this month (Pay As You Go)</>)
                    : (typeof hotJobApplicationsRemaining === 'string' ? hotJobApplicationsRemaining : <><span className="font-semibold">{hotJobLimit === 9999 ? (userDoc?.citizenship === 'India' ? null : 'Unlimited') : hotJobApplicationsRemaining}</span> jobs remaining this month</>)}
                </span>
              ) : null}
            </>
          ) : null}
      </div>
      {/* Search and Filter Controls - Single Section */}
      <div className="mb-6 w-full flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-4">
        <Input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search job title, company, type, or place..."
          className="w-full sm:max-w-xs shadow-sm focus:ring-2 focus:ring-blue-400"
        />
        <div className="flex flex-col w-full sm:w-auto">
          <label className="block text-xs font-semibold mb-1">Type</label>
          <Select value={selectedType || undefined} onValueChange={val => setSelectedType(val || "")}>
            <SelectTrigger className="min-w-[120px] shadow-sm w-full sm:w-auto">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              {jobTypes
                .filter(type => type && typeof type === 'string' && type.trim() !== '')
                .map(type => {
                  const trimmedType = type.trim();
                  if (!trimmedType) return null;
                  return <SelectItem key={trimmedType} value={trimmedType}>{trimmedType}</SelectItem>;
                })
                .filter(Boolean)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col w-full sm:w-auto">
          <label className="block text-xs font-semibold mb-1">Category</label>
          <Select value={selectedCategory || undefined} onValueChange={val => setSelectedCategory(val || "")}>
            <SelectTrigger className="min-w-[140px] shadow-sm w-full sm:w-auto">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              {jobCategories
                .filter(category => category && typeof category === 'string' && category.trim() !== '')
                .map(category => {
                  const trimmedCategory = category.trim();
                  if (!trimmedCategory) return null;
                  return <SelectItem key={trimmedCategory} value={trimmedCategory}>{trimmedCategory}</SelectItem>;
                })
                .filter(Boolean)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col w-full sm:w-auto">
          <label className="block text-xs font-semibold mb-1">Salary Range</label>
          <Select value={salaryRange ? salaryRange.join('-') : undefined} onValueChange={val => {
            if (!val) setSalaryRange(null);
            else {
              const [min, max] = val.split('-').map(Number);
              setSalaryRange([min, max]);
            }
          }}>
            <SelectTrigger className="min-w-[140px] shadow-sm w-full sm:w-auto">
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              {salaryRanges.filter(r => r.value).map(r => (
                r.value ? <SelectItem key={r.label} value={r.value.join('-')}>{r.label}</SelectItem> : null
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="secondary"
          type="button"
          className="shadow-sm h-10 w-full sm:w-auto"
          onClick={() => { setSelectedType(""); setSelectedCategory(""); setSalaryRange(null); }}
        >
          Reset Filters
        </Button>
      </div>
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {sortedHotJobs
          .filter((job: any) => job.isHot !== false)
          .filter((job: any) => {
            // Search filter
            if (!search.trim()) return true;
            const s = search.trim().toLowerCase();
            return (
              (job.title && job.title.toLowerCase().includes(s)) ||
              (job.company && job.company.toLowerCase().includes(s)) ||
              (job.type && job.type.toLowerCase().includes(s)) ||
              (job.location && job.location.toLowerCase().includes(s))
            );
          })
          .filter((job: any) => {
            // Type filter
            if (!selectedType) return true;
            return job.type === selectedType;
          })
          .filter((job: any) => {
            // Category filter
            if (!selectedCategory) return true;
            const jobCategory = job.category ? job.category.trim() : '';
            return jobCategory === selectedCategory;
          })
          .filter((job: any) => {
            // Salary range filter
            if (!salaryRange) return true;
            let salaryNum = 0;
            if (typeof job.salary === 'number') salaryNum = job.salary;
            else if (typeof job.salary === 'string' && /^\d+$/.test(job.salary)) salaryNum = parseInt(job.salary, 10);
            else return false;
            return salaryNum >= salaryRange[0] && salaryNum < salaryRange[1];
          })
          .map((job: any) => {
          // Check if user has already applied for this job in applications collection
          let alreadyApplied = false;
          if (Array.isArray(userApplications)) {
            alreadyApplied = userApplications.some((app: any) => app.jobId === job.id);
          }
          // Check if user has a pending request for this job in hotJobsRequests collection
          let isPending = false;
          if (!alreadyApplied && Array.isArray(userHotJobsRequests)) {
            isPending = userHotJobsRequests.some((req: any) => req.jobId === job.id && req.status === 'pending');
          }
          // Format salary - always return a displayable value
          const formatSalary = (salary: any): string => {
            if (salary === null || salary === undefined || salary === '') return 'Salary Not Specified';
            if (typeof salary === 'string' && (salary.trim() === '' || salary.trim() === '-')) return 'Salary Not Specified';
            if (typeof salary === 'number') {
              return salary.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
            }
            if (typeof salary === 'string' && /^\d+$/.test(salary)) {
              const salaryNum = parseInt(salary, 10);
              return salaryNum.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
            }
            return String(salary);
          };
          const salaryDisplay = formatSalary(job.salary);

          // Sanitize all job fields by removing " symbol
          const cleanTitle = job.title ? job.title.replace(/"/g, '') : '';
          const cleanCompany = job.company ? job.company.replace(/"/g, '') : '';
          const cleanLocation = job.location ? job.location.replace(/"/g, '') : '';
          const cleanType = job.type ? job.type.replace(/"/g, '') : '';
          const cleanDescription = job.job_description ? job.job_description.replace(/"/g, '') : '';
          const cleanSkills = Array.isArray(job.skills) ? job.skills.map((s: string) => s.replace(/"/g, '')) : [];

          // Tags (skills, type, etc.)
          const tags: string[] = [];
          if (cleanType) tags.push(cleanType);
          if (cleanSkills.length > 0) tags.push(...cleanSkills);
          if (job.remote) tags.push('Remote');

          return (
            <Card key={job.id} className="relative shadow-xl border border-border bg-gradient-to-br from-[#f8fafc] via-[#e9f0fa] to-[#e3e7ef] dark:from-[#23272f] dark:via-[#232b36] dark:to-[#23272f] rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-200">
              {/* Header: Logo, Title, Company */}
              <div className="flex items-center gap-4 px-5 pt-5 pb-2 border-b border-border bg-muted/60">
                {(() => {
                  // Display company name's first letter as logo
                  const companyFirstLetter = cleanCompany?.[0]?.toUpperCase() || '?';
                  return (
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 flex items-center justify-center text-2xl font-bold text-white shadow-md">
                      {companyFirstLetter}
                    </div>
                  );
                })()}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <button
                      onClick={() => openJobDetails(job)}
                      className="text-xl font-extrabold text-blue-800 dark:text-blue-300 truncate drop-shadow-sm hover:text-blue-600 dark:hover:text-blue-200 hover:underline text-left cursor-pointer transition-colors duration-200"
                    >
                      {cleanTitle}
                    </button>
                    {job.urgent && (
                      <span className="ml-1 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full font-semibold animate-pulse">Urgent</span>
                    )}
                  </div>
                  <div className="text-base font-bold text-gray-900 dark:text-white truncate">{cleanCompany}</div>
                </div>
              </div>
              {/* Main Info: Location, Salary, Tags */}
              <div className="px-5 pt-3 pb-2">
                <div className="flex flex-wrap gap-2 mb-2">
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-900 text-xs rounded font-semibold border border-blue-100">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z"/><circle cx="12" cy="11" r="3"/></svg>
                    {cleanLocation}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-900 text-xs rounded font-semibold border border-green-100">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3zm0 10c-4.418 0-8-3.582-8-8s3.582-8 8-8 8 3.582 8 8-3.582 8-8 8z"/></svg>
                    {salaryDisplay}
                  </span>
                  {tags.length > 0 && tags.map((tag, i) => (
                    <span key={i} className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full border border-gray-200">{tag}</span>
                  ))}
                </div>
                {cleanDescription && (
                  <div className="text-xs text-gray-600 mb-2 line-clamp-3 leading-relaxed">{cleanDescription}</div>
                )}
              </div>
              {/* Footer: Posted, Apply */}
              <div className="flex items-center justify-between px-5 pb-4 pt-2 border-t border-border bg-muted/60">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                  {job.postedAt ? `Posted: ${new Date(job.postedAt).toLocaleDateString()}` : 'Posted Date Not Specified'}
                </div>
                <div className="flex flex-col items-end w-full">
                  <Button
                    onClick={async () => {
                      // handleApply now handles both USA and India users correctly
                      await handleApply(job);
                    }}
                    disabled={loadingJobId === job.id || hotJobLimitReached || alreadyApplied || isPending || !planDoc}
                    className="ml-2 px-5 py-2 rounded-full font-semibold text-base shadow-md"
                  >
                    {!planDoc
                      ? "Service Plan Required"
                      : loadingJobId === job.id
                      ? (userDoc?.citizenship === 'USA' ? "Sending..." : "Applying...")
                      : alreadyApplied
                      ? "Already Applied"
                      : isPending
                      ? "Pending"
                      : hotJobLimitReached
                      ? "Limit Reached"
                      : userDoc?.citizenship === 'USA' ? "Send to Z" : "Apply"}
                  </Button>
                  {/* Show job count and out-of-limit message after apply */}
                  {/* {planDoc && !isPayAsYouGo && hotJobLimit !== null && (
                    <span className="mt-1 text-xs text-gray-500">
                      {hotJobApplicationsThisMonth} of {hotJobLimit} applied this month
                      {hotJobLimitReached && (
                        <span className="ml-2 text-red-600 font-semibold">(Out of limit)</span>
                      )}
                    </span>
                  )} */}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Job Details Dialog */}
      <Dialog open={showJobDetails} onOpenChange={setShowJobDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedJob && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-4 mb-4">
                  {(() => {
                    // Display company name's first letter as logo
                    const companyName = cleanJobValue(selectedJob.company);
                    const companyFirstLetter = companyName?.[0]?.toUpperCase() || '?';
                    return (
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 flex items-center justify-center text-3xl font-bold text-white shadow-md">
                        {companyFirstLetter}
                      </div>
                    );
                  })()}
                  <div className="flex-1">
                    <DialogTitle className="text-2xl font-bold text-blue-800 dark:text-blue-300 mb-1">
                      {cleanJobValue(selectedJob.title || selectedJob.jobTitle)}
                    </DialogTitle>
                    <DialogDescription className="text-lg font-semibold text-gray-900 dark:text-white">
                      {cleanJobValue(selectedJob.company)}
                    </DialogDescription>
                  </div>
                  {selectedJob.urgent && (
                    <span className="px-3 py-1 bg-red-500 text-white text-sm rounded-full font-semibold animate-pulse">
                      Urgent
                    </span>
                  )}
                </div>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Basic Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z"/>
                        <circle cx="12" cy="11" r="3"/>
                      </svg>
                      <div>
                        <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Location</p>
                        <p className="text-lg font-medium text-gray-900 dark:text-white">
                          {cleanJobValue(selectedJob.location) || 'Location Not Specified'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3zm0 10c-4.418 0-8-3.582-8-8s3.582-8 8-8 8 3.582 8 8-3.582 8-8 8z"/>
                      </svg>
                      <div>
                        <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Salary</p>
                        <p className="text-lg font-medium text-green-700 dark:text-green-400">
                          {(() => {
                            const salary = selectedJob.salary;
                            if (salary === null || salary === undefined || salary === '') return 'Salary Not Specified';
                            if (typeof salary === 'string' && (salary.trim() === '' || salary.trim() === '-')) return 'Salary Not Specified';
                            if (typeof salary === 'number') {
                              return salary.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
                            }
                            if (typeof salary === 'string' && /^\d+$/.test(salary)) {
                              const salaryNum = parseInt(salary, 10);
                              return salaryNum.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
                            }
                            return String(salary);
                          })()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                      </svg>
                      <div>
                        <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Posted Date</p>
                        <p className="text-lg font-medium text-gray-900 dark:text-white">
                          {selectedJob.postedAt 
                            ? new Date(selectedJob.postedAt).toLocaleDateString('en-US', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              })
                            : 'Posted Date Not Specified'}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                      </svg>
                      <div>
                        <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Job Type</p>
                        <p className="text-lg font-medium text-gray-900 dark:text-white">
                          {getJobWorkMode(selectedJob)}
                        </p>
                      </div>
                    </div>
                    
                    {/* Add other fields here if needed */}
                  </div>
                </div>
                
                {/* Skills & Tags */}
                {(selectedJob.skills && selectedJob.skills.length > 0) || (selectedJob.tags && selectedJob.tags.length > 0) ? (
                  <div className="space-y-3">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Required Skills & Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedJob.skills && selectedJob.skills.map((skill: string, i: number) => (
                        <span key={i} className="px-3 py-1.5 bg-blue-100 text-blue-800 text-sm font-medium rounded-full border border-blue-200">
                          {cleanJobValue(skill)}
                        </span>
                      ))}
                      {selectedJob.tags && selectedJob.tags.map((tag: string, i: number) => (
                        <span key={`tag-${i}`} className="px-3 py-1.5 bg-purple-100 text-purple-800 text-sm font-medium rounded-full border border-purple-200">
                          {cleanJobValue(tag)}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
                
                {/* Job Description */}
                {selectedJob.job_description && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Job Description</h3>
                    <div className="prose dark:prose-invert max-w-none p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
                        {cleanJobValue(selectedJob.job_description)}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Additional Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Additional Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedJob.experience && (
                      <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M12 14l9-5-9-5-9 5 9 5z"/>
                          <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/>
                        </svg>
                        <div>
                          <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Experience Required</p>
                          <p className="font-medium text-gray-900 dark:text-white">{cleanJobValue(selectedJob.experience)}</p>
                        </div>
                      </div>
                    )}
                    
                    {selectedJob.qualification && (
                      <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        <div>
                          <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Qualification</p>
                          <p className="font-medium text-gray-900 dark:text-white">{cleanJobValue(selectedJob.qualification)}</p>
                        </div>
                      </div>
                    )}
                    
                    {selectedJob.deadline && (
                      <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        <div>
                          <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Application Deadline</p>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {new Date(selectedJob.deadline).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {selectedJob.vacancies && (
                      <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                        </svg>
                        <div>
                          <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Vacancies</p>
                          <p className="font-medium text-gray-900 dark:text-white">{cleanJobValue(selectedJob.vacancies)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Apply Button in Modal */}
                <div className="sticky bottom-0 pt-4 bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800">
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {planDoc && !isPayAsYouGo && hotJobLimit !== null && (
                        <span>
                          {hotJobApplicationsThisMonth} of {hotJobLimit} jobs applied this month
                          {hotJobLimitReached && (
                            <span className="ml-2 text-red-600 font-semibold">(Out of limit)</span>
                          )}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-3">
                      {(() => {
                        // Calculate alreadyApplied and isPending for selectedJob
                        const dialogAlreadyApplied = Array.isArray(userApplications) && userApplications.some((app: any) => app.jobId === selectedJob.id);
                        const dialogIsPending = !dialogAlreadyApplied && Array.isArray(userHotJobsRequests) && userHotJobsRequests.some((req: any) => req.jobId === selectedJob.id && req.status === 'pending');
                        
                        return (
                          <>
                            <Button
                              variant="outline"
                              onClick={() => setShowJobDetails(false)}
                            >
                              Close
                            </Button>
                            <Button
                              className="bg-blue-600 hover:bg-blue-700"
                              disabled={
                                loadingJobId === selectedJob.id ||
                                hotJobLimitReached ||
                                dialogAlreadyApplied ||
                                dialogIsPending ||
                                !planDoc
                              }
                              onClick={async () => {
                                if (userDoc?.citizenship === 'USA') {
                                  // USA users: Use the existing handleApply function
                                  await handleApply(selectedJob);
                                  setShowJobDetails(false);
                                } else {
                                  // Indian users: Navigate to job URL
                                  handleExternalApply(selectedJob);
                                  setShowJobDetails(false);
                                }
                              }}
                            >
                              {!planDoc
                                ? "Service Plan Required"
                                : loadingJobId === selectedJob.id
                                ? (userDoc?.citizenship === 'USA' ? "Sending..." : "Applying...")
                                : dialogAlreadyApplied
                                ? "Already Applied"
                                : dialogIsPending
                                ? "Pending"
                                : hotJobLimitReached
                                ? "Limit Reached"
                                : userDoc?.citizenship === 'USA' ? "Send to Z" : "Apply Now"}
                            </Button>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Wallet Warning Dialog */}
      <AlertDialog open={showWalletWarning} onOpenChange={setShowWalletWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Insufficient Wallet Balance</AlertDialogTitle>
            <AlertDialogDescription>
              Your wallet balance is less than ₹20 required to apply for this job. Please top up your wallet to continue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => router.push('/dashboard/wallet')}>
              Top Up Wallet
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
