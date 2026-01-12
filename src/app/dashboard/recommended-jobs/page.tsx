"use client";
import React, { useMemo, useState, useEffect } from "react";
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, doc, getDoc } from "firebase/firestore";
import { useUserDoc } from '@/firebase/use-user-doc';
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { toast } from "@/components/ui/use-toast";
import { Loader2, AlertTriangle } from "lucide-react";
import { generatePaymentHash } from '@/lib/payment-hash';
import { useDataIntegrity, useWalletIntegrity, useSubscriptionIntegrity } from '@/hooks/use-data-integrity';

// Helper to submit application
async function submitApplication(userId: string, jobId: string) {
  const res = await fetch('/api/applications/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, jobId }),
  });
  return res.json();
}

export default function RecommendedJobsPage() {
  const [search, setSearch] = useState("");
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const { userDoc } = useUserDoc(user);
  
  // Data integrity verification
  const dataIntegrity = useDataIntegrity(userDoc);
  const walletIntegrity = useWalletIntegrity(userDoc);
  const subscriptionIntegrity = useSubscriptionIntegrity(userDoc);
  
  // Use citizenship to select collection
  const hotJobsCollectionName = userDoc?.citizenship === 'India' ? 'hot-jobs-india' : 'hotJobs';
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [showWalletWarning, setShowWalletWarning] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [showJobDetails, setShowJobDetails] = useState(false);
  
  const hotJobsRef = useMemo(() => firestore ? collection(firestore, hotJobsCollectionName) : null, [firestore, hotJobsCollectionName]);
  const { data: hotJobs, isLoading } = useCollection<any>(hotJobsRef);

  // Subscription/plan logic (copied/adapted from hot-jobs page)
  // Fetch user's applications from the applications collection
  const applicationsCollectionRef = useMemoFirebase(
    () => (user ? query(collection(firestore, 'applications'), where('userId', '==', user.uid)) : null),
    [user, firestore]
  );
  const { data: userApplications } = useCollection<any>(applicationsCollectionRef);

  // Fetch user's hot job requests from the hotJobsRequests collection to check pending status
  const hotJobsRequestsRef = useMemoFirebase(
    () => (user ? query(collection(firestore, 'hotJobsRequests'), where('userId', '==', user.uid)) : null),
    [user, firestore]
  );
  const { data: userHotJobsRequests } = useCollection<any>(hotJobsRequestsRef);

  // Filter state
  const [selectedType, setSelectedType] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [salaryRange, setSalaryRange] = useState<[number, number] | null>(null);

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

  // Salary range options
  const salaryRanges = [
    { label: "Any", value: null },
    { label: "< $30,000", value: [0, 30000] },
    { label: "$30,000 - $60,000", value: [30000, 60000] },
    { label: "$60,000 - $100,000", value: [60000, 100000] },
    { label: "> $100,000", value: [100000, Infinity] },
  ];

  // Get userDoc for plan info
  const [walletLoading, setWalletLoading] = useState(false);
  
  let hotJobLimit: number | null = null;
  let isPayAsYouGo = false;
  const [planDoc, setPlanDoc] = useState<any>(null);
  const [planName, setPlanName] = useState<string>("—");
  const [planLoading, setPlanLoading] = useState(true);
  useEffect(() => {
    const fetchPlan = async () => {
      setPlanLoading(true);
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
      setPlanLoading(false);
    };
    fetchPlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userDoc, firestore]);

  // Compute eligibility after plan info is loaded
  const isIndiaPayAsYouGo = useMemo(() => {
    if (planLoading) return false;
    return userDoc?.citizenship === 'India' && /pay[-\s]?as[-\s]?you[-\s]?go/i.test(planName || (planDoc?.name || ''));
  }, [userDoc?.citizenship, planName, planDoc, planLoading]);

  // Prefer userDoc.plan.maxHotJobs if available
  // Add plan expiry logic
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
      hotJobLimit = null;
    } else if (typeof planDoc.maxjobslimit === 'number') {
      hotJobLimit = planDoc.maxjobslimit;
    } else if (Array.isArray(planDoc.features)) {
      const match = planDoc.features.find((f: string) => /up to (\d+) hot jobs/i.test(f));
      if (match) {
        const m = match.match(/up to (\d+)/i);
        if (m && m[1]) hotJobLimit = parseInt(m[1], 10);
      }
    }
    if (!hotJobLimit && planDoc.name && /pro/i.test(planDoc.name)) hotJobLimit = planDoc.maxjobslimit;
  }

  // Get user's applications count for this month from applications collection
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2, '0')}`;
  
  useEffect(() => {
    // Only fetch wallet for India + Pay As You Go users
    if (!isIndiaPayAsYouGo) {
      setWalletBalance(null);
      setWalletLoading(false);
      return;
    }
    const fetchWallet = async () => {
      if (user && firestore) {
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
  }, [isIndiaPayAsYouGo, user, firestore]);
  
  const recommendedJobApplicationsThisMonth = userApplications
    ? userApplications.filter((app: any) => {
        if (!app.appliedAt) return false;
        const appliedDate = new Date(app.appliedAt);
        const appliedMonthKey = `${appliedDate.getFullYear()}-${(appliedDate.getMonth()+1).toString().padStart(2, '0')}`;
        return appliedMonthKey === monthKey;
      }).length
    : 0;
    
  // For Pay As You Go, show 'Unlimited (Pay As You Go)'.
  // If no active service plan, show 0.
  let recommendedJobApplicationsRemaining: string | number = 0;
  if (planIsExpired) {
    recommendedJobApplicationsRemaining = 'Inactive (Plan Expired)';
  } else if (planDoc || userDoc?.plan?.maxHotJobs !== undefined) {
    if (isPayAsYouGo) {
      recommendedJobApplicationsRemaining = 'Unlimited (Pay As You Go)';
    } else if (hotJobLimit !== null) {
      recommendedJobApplicationsRemaining = `${Math.max(0, hotJobLimit - recommendedJobApplicationsThisMonth)} of ${hotJobLimit} remaining`;
    }
  }
  const recommendedJobLimitReached = planIsExpired || (!isPayAsYouGo && hotJobLimit !== null && recommendedJobApplicationsThisMonth >= hotJobLimit);

  // Track loading/apply state per job
  const [loadingByJob, setLoadingByJob] = useState<Record<string, boolean>>({});
  const [appliedByJob, setAppliedByJob] = useState<Record<string, boolean>>({});

  // Helper to check if user has already applied for a job
  const hasAlreadyApplied = (jobId: string) => {
    if (!Array.isArray(userApplications)) return false;
    return userApplications.some((app: any) => app.jobId === jobId);
  };

  // Extract keywords from user profile (skills, roles, interests, etc.)
  // Extract keywords from user profile: desiredRole, company, location, skills, interests, etc.
  const profileKeywords = useMemo(() => {
    if (!userDoc) return [];
    const keywords = new Set<string>();
    // 1. Skills
    const skills = Array.isArray(userDoc.skills) ? userDoc.skills : (Array.isArray(userDoc["skills"]) ? userDoc["skills"] : []);
    skills.forEach((s: string) => keywords.add(s.toLowerCase()));
    // 2. Interests
    const interests = Array.isArray(userDoc.interests) ? userDoc.interests : (Array.isArray(userDoc["interests"]) ? userDoc["interests"] : []);
    interests.forEach((i: string) => keywords.add(i.toLowerCase()));
    // 3. Keywords array
    const keywordsArr = Array.isArray(userDoc.keywords) ? userDoc.keywords : (Array.isArray(userDoc["keywords"]) ? userDoc["keywords"] : []);
    keywordsArr.forEach((k: string) => keywords.add(k.toLowerCase()));
    // 4. Role
    const role = userDoc.role || userDoc["role"];
    if (role) keywords.add(String(role).toLowerCase());
    // 5. Desired Role
    const desiredRole = userDoc.desiredRole || userDoc["desiredRole"];
    if (desiredRole) keywords.add(String(desiredRole).toLowerCase());
    // 6. Company
    const company = userDoc.company || userDoc["company"];
    if (company) keywords.add(String(company).toLowerCase());
    // 7. Place
    const place = userDoc.place || userDoc["place"];
    if (place) keywords.add(String(place).toLowerCase());
    // 8. Location
    const location = userDoc.location || userDoc["location"];
    if (location) keywords.add(String(location).toLowerCase());
    // 9. Add more fields here if needed in future
    return Array.from(keywords);
  }, [userDoc]);

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

  // Filter hot jobs based on profile keywords
  // If no keywords, show all jobs (debug mode)
  const recommendedJobs = useMemo(() => {
    if (!hotJobs) return [];
    // First, sort jobs by createdAt (newest first)
    let jobs = [...hotJobs].sort((a: any, b: any) => {
      return getJobTimestamp(b) - getJobTimestamp(a); // Descending order (newest first)
    });
    // Profile keyword filter
    if (profileKeywords.length > 0) {
      jobs = jobs.filter((job: any) => {
        const fields: string[] = [];
        if (job.title) fields.push(job.title.toLowerCase());
        if (job.company) fields.push(job.company.toLowerCase());
        if (job.type) fields.push(job.type.toLowerCase());
        if (job.location) fields.push(job.location.toLowerCase());
        if (Array.isArray(job.skills)) fields.push(...job.skills.map((s: string) => s.toLowerCase()));
        if (Array.isArray(job.tags)) fields.push(...job.tags.map((t: string) => t.toLowerCase()));
        if (job.job_description) fields.push(job.job_description.toLowerCase());
        return profileKeywords.some((kw) => fields.some(f => f.includes(kw)));
      });
    }
    // Search filter
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      jobs = jobs.filter((job: any) => {
        return (
          (job.title && job.title.toLowerCase().includes(s)) ||
          (job.company && job.company.toLowerCase().includes(s)) ||
          (job.type && job.type.toLowerCase().includes(s)) ||
          (job.location && job.location.toLowerCase().includes(s)) ||
          (Array.isArray(job.skills) && job.skills.some((sk: string) => sk.toLowerCase().includes(s))) ||
          (Array.isArray(job.tags) && job.tags.some((t: string) => t.toLowerCase().includes(s))) ||
          (job.job_description && job.job_description.toLowerCase().includes(s))
        );
      });
    }
    // Type filter
    if (selectedType) {
      jobs = jobs.filter((job: any) => job.type === selectedType);
    }
    // Category filter
    if (selectedCategory) {
      jobs = jobs.filter((job: any) => {
        const jobCategory = job.category ? job.category.trim() : '';
        return jobCategory === selectedCategory;
      });
    }
    // Salary range filter
    if (salaryRange) {
      jobs = jobs.filter((job: any) => {
        let salaryNum = 0;
        if (typeof job.salary === 'number') salaryNum = job.salary;
        else if (typeof job.salary === 'string' && /^\d+$/.test(job.salary)) salaryNum = parseInt(job.salary, 10);
        else return false;
        return salaryNum >= salaryRange[0] && salaryNum < salaryRange[1];
      });
    }
    return jobs;
  }, [hotJobs, profileKeywords, search, selectedType, selectedCategory, salaryRange]);

  const handleApply = async (job: any) => {
    if (!user) {
      toast({ title: 'Error', description: 'You must be logged in to apply.', variant: 'destructive' });
      return;
    }
    
    // Ensure we have valid job data - check for job.id first
    if (!job || !job.id) {
      toast({ title: "Error", description: "Invalid job data. Please try again.", variant: "destructive" });
      return;
    }
    
    const jobId = job.id;
    if (loadingByJob[jobId]) return;
    if (hasAlreadyApplied(jobId) || appliedByJob[jobId]) {
      toast({ title: 'Already Applied', description: 'You have already applied for this job.', variant: 'default' });
      return;
    }

    // For India PAYG users: redirect to job link after wallet deduction
    if (isIndiaPayAsYouGo) {
      if (walletBalance === null || walletLoading) {
        toast({ title: 'Wallet Error', description: 'Unable to fetch wallet balance.', variant: 'destructive' });
        return;
      }
      if (walletBalance < 20) {
        setShowWalletWarning(true);
        return;
      }

      const deductionPayload = {
        userId: user.uid,
        amount: 20,
        jobId,
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
          toast({ title: 'Wallet Error', description: data.error || 'Failed to deduct from wallet.', variant: 'destructive' });
          return;
        }
        setWalletBalance(prev => (prev !== null ? prev - 20 : null));
      } catch (e) {
        toast({ title: 'Wallet Error', description: 'Failed to deduct from wallet.', variant: 'destructive' });
        return;
      }

      // Redirect to job URL after wallet deduction
      const jobUrl = job.url || job.apply_url || '';
      if (jobUrl) {
        toast({ title: "Success", description: "Redirecting to job...", variant: "default" });
        window.open(jobUrl, '_blank', 'noopener,noreferrer');
        return;
      } else {
        toast({ title: "Error", description: "Job URL not available.", variant: "destructive" });
        return;
      }
    }

    // For India users without PAYG: check if they have Pro plan
    if (userDoc?.citizenship === 'India' && !isIndiaPayAsYouGo) {
      // Pro plan users can submit applications normally
      // Fall through to continue with normal submission logic below
    } else if (userDoc?.citizenship === 'India') {
      // India users without Pro or PAYG plan
      toast({ title: "Plan Required", description: "You need an active Pro or Pay-As-You-Go plan to apply for jobs.", variant: "destructive" });
      return;
    }
    // USA and other non-India users continue with normal submission logic

    // Extract job data - use the actual job object values
    // Clean the values similar to how they're displayed (remove quotes, trim whitespace)
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
    
    // Validate that we have essential job data
    if (!jobTitle || jobTitle === '' || !company || company === '') {
      console.error('[RECOMMENDED-JOBS] Missing essential job data:', { 
        jobTitle, 
        company, 
        jobId: job.id,
        rawJob: job 
      });
      toast({ title: "Error", description: "Job data is incomplete. Please refresh the page and try again.", variant: "destructive" });
      return;
    }

    setLoadingByJob(prev => ({ ...prev, [jobId]: true }));
    try {
      // Send complete job data in payload
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
        priority: false, // Recommended jobs are not priority
        type: "recommended-job-application"
      };
      
      const res = await fetch("/api/applications/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      
      if (result.ok) {
        toast({ title: 'Application Submitted', description: 'Your application has been submitted successfully.' });
        setAppliedByJob(prev => ({ ...prev, [jobId]: true }));
        // Close job details modal if open
        setShowJobDetails(false);
        // Wait a moment to ensure data is written
        await new Promise(resolve => setTimeout(resolve, 1500));
        // Refresh the page using router instead of window.location.reload
        router.refresh();
      } else {
        toast({ title: 'Error', description: result.error || 'Failed to submit application.', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to submit application.', variant: 'destructive' });
    } finally {
      setLoadingByJob(prev => ({ ...prev, [jobId]: false }));
    }
  };

  // Function to open job details
  const openJobDetails = (job: any) => {
    setSelectedJob(job);
    setShowJobDetails(true);
  };

  // Clean job values for display
  const cleanJobValue = (val: any): string => {
    if (val === null || val === undefined) return '';
    const str = String(val).trim();
    return str.replace(/^"|"$/g, '').replace(/"/g, '');
  };

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
      // Optional: You might want to track that the user clicked on this external link
      console.log(`User ${user.uid} clicked external job link for job ${job.id}`);
    }
  };

  // Function to determine button text and action based on user citizenship
  const getApplyButtonInfo = (job: any) => {
    const alreadyApplied = hasAlreadyApplied(job.id);
    const isPending = !alreadyApplied && Array.isArray(userHotJobsRequests) && 
                     userHotJobsRequests.some((req: any) => req.jobId === job.id && req.status === 'pending');
    
    // Determine button text
    let buttonText = "Apply";
    if (!planDoc) {
      buttonText = "Service Plan Required";
    } else if (loadingByJob[job.id]) {
      buttonText = userDoc?.citizenship === 'USA' ? "Sending..." : "Applying...";
    } else if (alreadyApplied) {
      buttonText = "Already Applied";
    } else if (isPending) {
      buttonText = "Pending";
    } else if (recommendedJobLimitReached) {
      buttonText = "Limit Reached";
    } else {
      buttonText = userDoc?.citizenship === 'USA' ? "Send to Z" : "Apply";
    }
    
    // Determine button action
    const handleButtonClick = async () => {
      if (!user) {
        toast({ title: "Login required", description: "Please login to apply for jobs.", variant: "destructive" });
        return;
      }
      if (!planDoc) {
        toast({ title: "Service Plan Required", description: "Only users with an active service plan can apply for jobs.", variant: "destructive" });
        return;
      }
      if (recommendedJobLimitReached && userDoc?.citizenship !== 'India') {
        toast({ title: "Limit reached", description: "You have reached your job application limit for this month.", variant: "destructive" });
        return;
      }
      if (alreadyApplied) {
        toast({ title: "Already Applied", description: "You have already applied for this job.", variant: "info" });
        return;
      }
      
      // Use handleApply for all users - it handles India PAYG/Pro and USA users
      await handleApply(job);
    };
    
    return { buttonText, handleButtonClick };
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-2 sm:p-4 md:p-8">
      <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-6 md:mb-8">Recommended Jobs</h1>
      
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
      
      {/* Wallet block for India Pay As You Go users */}
      {planLoading ? null : isIndiaPayAsYouGo ? (
        <div className="mb-4 flex items-center gap-2 bg-blue-50 dark:bg-neutral-900 border border-blue-200 dark:border-neutral-700 rounded-lg px-4 py-2 shadow-md">
          <svg className="w-5 h-5 text-blue-700 dark:text-blue-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M2 7a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V7z"/><path d="M16 11a2 2 0 110 4 2 2 0 010-4z"/></svg>
          <span className="text-base font-bold text-blue-700 dark:text-blue-200">
            Wallet: {walletLoading ? 'Loading...' : (walletBalance !== null ? `₹${walletBalance}` : '—')}
          </span>
          {walletBalance !== null && walletBalance < 20 && !walletLoading && (
            <span className="ml-2 text-xs text-red-600 dark:text-red-400 font-semibold">(Min ₹20 required per application)</span>
          )}
          <a
            href="/dashboard/wallet"
            className="ml-3 px-3 py-1 bg-blue-600 dark:bg-blue-700 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-800 text-xs font-semibold transition"
          >
            Top Up
          </a>
        </div>
      ) : null}
      
      {/* Hide plan info and jobs remaining for India Pay As You Go users. Hide jobs remaining for USA Pay As You Go users (99999/unlimited) */}
      {!isIndiaPayAsYouGo && (
        <>
          <div className="mb-4">
            <span className="text-sm font-semibold">
              Service Plan: {planName}
            </span>
          </div>
          {/* Only show jobs remaining if not USA Pay As You Go unlimited */}
          {!(userDoc?.citizenship === 'USA' && isPayAsYouGo && (recommendedJobApplicationsRemaining === 99999 || recommendedJobApplicationsRemaining === 'Unlimited (Pay As You Go)')) ? (
            <div className="mb-4 text-sm">
              Jobs Remaining This Month: <span className={isPayAsYouGo ? 'text-green-700 font-semibold' : ''}>{recommendedJobApplicationsRemaining}</span>
            </div>
          ) : null}
        </>
      )}
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div>
          <div className="mb-6 w-full flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-4">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search job title, company, type, skill, etc..."
              className="w-full sm:w-96 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 mb-2 sm:mb-0"
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
          
          {/* Show user profile keywords visually as tags */}
          <div className="mb-4 flex flex-wrap gap-2 items-center">
            <span className="text-xs text-gray-500 font-semibold mr-2">Profile keywords:</span>
            {profileKeywords.length > 0 ? (
              profileKeywords.map((kw, i) => (
                <span key={i} className="inline-block px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full border border-blue-200">{kw}</span>
              ))
            ) : (
              <span className="text-xs text-red-600">(none found, showing all jobs)</span>
            )}
          </div>
          
          {recommendedJobs.length === 0 ? (
            <div className="text-center text-gray-500">No recommended jobs found for your profile.</div>
          ) : (
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {recommendedJobs.map((job: any) => {
                const alreadyApplied = hasAlreadyApplied(job.id);
                // Check if user has a pending request for this job in hotJobsRequests collection
                let isPending = false;
                if (!alreadyApplied && Array.isArray(userHotJobsRequests)) {
                  isPending = userHotJobsRequests.some((req: any) => req.jobId === job.id && req.status === 'pending');
                }
                // Sanitize all job fields by removing " symbol
                const cleanTitle = job.title ? job.title.replace(/"/g, '') : '';
                const cleanCompany = job.company ? job.company.replace(/"/g, '') : '';
                const cleanLocation = job.location ? job.location.replace(/"/g, '') : '';
                const cleanType = job.type ? job.type.replace(/"/g, '') : '';
                const cleanDescription = job.job_description ? job.job_description.replace(/"/g, '') : '';
                const cleanSkills = Array.isArray(job.skills) ? job.skills.map((s: string) => s.replace(/"/g, '')) : [];
                
                // Get button info based on user citizenship
                const { buttonText, handleButtonClick } = getApplyButtonInfo(job);
                
                return (
                  <Card key={job.id} className="relative shadow-xl border border-border bg-gradient-to-br from-[#f8fafc] via-[#e9f0fa] to-[#e3e7ef] dark:from-[#23272f] dark:via-[#232b36] dark:to-[#23272f] rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-200">
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
                          {/* Make job title clickable */}
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
                    <div className="px-5 pt-3 pb-2">
                      <div className="flex flex-wrap gap-2 mb-2">
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-900 text-xs rounded font-semibold border border-blue-100">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z"/><circle cx="12" cy="11" r="3"/></svg>
                          {cleanLocation}
                        </span>
                        {(() => {
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
                          return (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-900 text-xs rounded font-semibold border border-green-100">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3zm0 10c-4.418 0-8-3.582-8-8s3.582-8 8-8 8 3.582 8 8-3.582 8-8 8z"/></svg>
                              {salaryDisplay}
                            </span>
                          );
                        })()}
                        {Array.isArray(cleanSkills) && cleanSkills.map((tag: string, i: number) => (
                          <span key={i} className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full border border-gray-200">{tag}</span>
                        ))}
                      </div>
                      {cleanDescription && (
                        <div className="text-xs text-gray-600 mb-2 line-clamp-3 leading-relaxed">{cleanDescription}</div>
                      )}
                    </div>
                    <div className="flex items-center justify-between px-5 pb-4 pt-2 border-t border-border bg-muted/60">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                        {job.postedAt ? `Posted: ${new Date(job.postedAt).toLocaleDateString()}` : 'Posted Date Not Specified'}
                      </div>
                      <div>
                        <Button
                          size="sm"
                          disabled={
                            loadingByJob[job.id] ||
                            appliedByJob[job.id] ||
                            alreadyApplied ||
                            isPending ||
                            recommendedJobLimitReached ||
                            !planDoc
                          }
                          onClick={handleButtonClick}
                        >
                          {buttonText}
                        </Button>
                        {/* Show job count and out-of-limit message after apply */}
                        {/* {planDoc && !isPayAsYouGo && hotJobLimit !== null && (
                          <span className="mt-1 text-xs text-gray-500">
                            {recommendedJobApplicationsThisMonth} of {hotJobLimit} applied this month
                            {recommendedJobLimitReached && (
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
          )}
        </div>
      )}

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
                    {/* Add more job fields here as needed */}
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
                          {recommendedJobApplicationsThisMonth} of {hotJobLimit} jobs applied this month
                          {recommendedJobLimitReached && (
                            <span className="ml-2 text-red-600 font-semibold">(Out of limit)</span>
                          )}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setShowJobDetails(false)}
                      >
                        Close
                      </Button>
                      <Button
                        className="bg-blue-600 hover:bg-blue-700"
                        disabled={
                          loadingByJob[selectedJob.id] ||
                          appliedByJob[selectedJob.id] ||
                          hasAlreadyApplied(selectedJob.id) ||
                          recommendedJobLimitReached ||
                          !planDoc
                        }
                        onClick={async () => {
                          // Use handleApply for all users - it handles India PAYG/Pro and USA users
                          await handleApply(selectedJob);
                        }}
                      >
                        {!planDoc
                          ? "Service Plan Required"
                          : loadingByJob[selectedJob.id]
                          ? (userDoc?.citizenship === 'USA' ? "Sending..." : "Applying...")
                          : hasAlreadyApplied(selectedJob.id)
                          ? "Already Applied"
                          : recommendedJobLimitReached
                          ? "Limit Reached"
                          : userDoc?.citizenship === 'USA' ? "Send to Z" : "Apply Now"}
                      </Button>
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