"use client"
import React, { useEffect, useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDoc, useCollection, useMemoFirebase, useUser, useFirestore } from "@/firebase";
import CheckoutPaymentForm from "@/app/checkout/CheckoutPaymentForm";
// import { plans as seedPlans } from '@/lib/seed-plans';
// Membership status logic moved inside component
import { useSearchParams } from 'next/navigation';
import ProfileCompleteModal from '@/components/ProfileCompleteModal';
import { collection, doc, query, where, getDocs } from "firebase/firestore";
import Link from "next/link";
import { Briefcase, FileText, Loader2, Star, Eye, UserCheck, ThumbsUp, ThumbsDown, AlertTriangle, TrendingUp, Lightbulb, Award, CreditCard, User, Settings, Zap, Wallet } from "lucide-react";
import { useDataIntegrity, useWalletIntegrity, useSubscriptionIntegrity } from '@/hooks/use-data-integrity';

type JobApplication = {
  id: string;
  status: 'Applied' | 'Under Review' | 'Interview' | 'Offer' | 'Rejected';
};

export default function DashboardPage() {
  // Use citizenship from user profile to set currency
  const [selectedCurrency, setSelectedCurrency] = useState<'USD' | 'INR'>('USD');
  // Helper functions for date filtering
  function isToday(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  }
  function isThisMonth(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }
  // ...existing code...
  const { user } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  const { data: userDoc, isLoading: isUserDataLoading } = useDoc(userDocRef);

  // Data integrity verification
  const dataIntegrity = useDataIntegrity(userDoc);
  const walletIntegrity = useWalletIntegrity(userDoc);
  const subscriptionIntegrity = useSubscriptionIntegrity(userDoc);

  // Set currency based on citizenship in user profile
  useEffect(() => {
    if (userDoc && userDoc.citizenship) {
      if (userDoc.citizenship === 'India') {
        setSelectedCurrency('INR');
      } else if (userDoc.citizenship === 'USA') {
        setSelectedCurrency('USD');
      }
    }
  }, [userDoc]);

  const searchParams = useSearchParams();
  const prompt = searchParams?.get('promptCompleteProfile');
  const [showPromptModal, setShowPromptModal] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isUserDataLoading) return;
    const alreadyShown = sessionStorage.getItem('profilePromptShown');
    if (
      userDoc &&
      userDoc.profileCompleted === false &&
      prompt &&
      !alreadyShown
    ) {
      setShowPromptModal(true);
    }
  }, [isUserDataLoading, userDoc, prompt]);

  const handlePromptModalChange = (open: boolean) => {
    setShowPromptModal(open);
    if (!open && typeof window !== 'undefined') {
      sessionStorage.setItem('profilePromptShown', '1');
    }
  };

  const resumesCollectionRef = useMemoFirebase(() => user ? collection(firestore, `users/${user.uid}/resumes`) : null, [user, firestore]);
  const { data: resumes, isLoading: areResumesLoading } = useCollection(resumesCollectionRef);


  // Applications collection: query for applications by user
  const applicationsCollectionRef = useMemoFirebase(
    () =>
      user
        ? query(collection(firestore, "applications"), where("userId", "==", user.uid))
        : null,
    [user, firestore]
  );
  const { data: applications, isLoading: areApplicationsLoading } = useCollection<any>(
    applicationsCollectionRef
  );

  // Use applications collection for all stats
  const areApplicationsReady = !areApplicationsLoading && Array.isArray(applications);
  const totalApplications = areApplicationsReady ? applications.length : 0;
  const underReviewCount = areApplicationsReady ? applications.filter((app: any) => app.status === 'Under Review').length : 0;
  const interviewCount = areApplicationsReady ? applications.filter((app: any) => app.status === 'Interview').length : 0;


  // Hot Job Application Limit Logic based on active service plan
  let hotJobLimit: number | null = null;

  // Service plan is active if any plan in userDoc.plans has category 'service'
  let activeServicePlan: any = null;
  const [servicePlans, setServicePlans] = useState<any[]>([]);
  const [isServicePlansLoading, setIsServicePlansLoading] = useState(true);
  useEffect(() => {
    const fetchServicePlans = async () => {
      setIsServicePlansLoading(true);
      try {
        const plansRef = collection(firestore, 'plans');
        // Only filter by category and currency for service plans
        const q = query(
          plansRef,
          where('category', '==', 'service'),
          where('currency', '==', selectedCurrency)
        );
        const snapshot = await getDocs(q);
        const plans = snapshot.empty ? [] : snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setServicePlans(plans);
      } catch (err) {
        setServicePlans([]);
      }
      setIsServicePlansLoading(false);
    };
    fetchServicePlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firestore, selectedCurrency]);

  if (Array.isArray(userDoc?.plans)) {
    // Find the most recently activated service plan (case-insensitive, check both planId and id)
    // If userDoc.activePlan is set, prefer that, else pick the last service plan
    const servicePlansInUser = userDoc.plans.filter((p: any) => String(p.category || '').toLowerCase() === 'service');
    if (servicePlansInUser.length > 0) {
      if (userDoc.activePlan) {
        activeServicePlan = servicePlansInUser.find((p: any) => p.planId === userDoc.activePlan || p.id === userDoc.activePlan) || servicePlansInUser[servicePlansInUser.length - 1];
      } else {
        // Pick the last (most recently added) service plan
        activeServicePlan = servicePlansInUser[servicePlansInUser.length - 1];
      }
      // Find plan details from Firestore servicePlans
      const planDetails = servicePlans.find((sp) => sp.id === (activeServicePlan.planId || activeServicePlan.id));
      if (planDetails && planDetails.features) {
        // Find all 'Up to X hot jobs' features and take the maximum
        const matches = planDetails.features
          .map((f: string) => {
            const m = f.match(/up to (\d+) hot jobs/i);
            return m && m[1] ? parseInt(m[1], 10) : null;
          })
          .filter((n: number | null) => n !== null);
        if (matches.length > 0) {
          hotJobLimit = Math.max(...matches as number[]);
        }
      }
      // Fallback: if plan name includes 'pro', set 300; else unlimited
      if (!hotJobLimit && planDetails && planDetails.name && /pro/i.test(planDetails.name)) hotJobLimit = 300;
    }
  }

  // Count all applications (this month) for hot job limit
  const hotJobApplicationsThisMonth = useMemo(() => {
    if (!applications) return 0;
    return applications.filter((app: any) => isThisMonth(app.createdAt || app.created_at || app.timestamp)).length;
  }, [applications]);

  const hotJobApplicationsRemaining = hotJobLimit !== null ? Math.max(0, hotJobLimit - hotJobApplicationsThisMonth) : null;
  const hotJobLimitReached = hotJobLimit !== null && hotJobApplicationsThisMonth >= hotJobLimit;


  // Membership status logic (must be after userDoc is defined)

  // Membership is active if any plan in userDoc.plans has category 'membership' (case-insensitive),
  // or if userDoc.planType or userDoc.activePlan matches a membership plan
  const hasMembership = Boolean(
    userDoc && (
      (Array.isArray(userDoc.plans) && userDoc.plans.some((p: any) => String(p.category || '').toLowerCase() === 'membership')) ||
      (typeof userDoc.planType === 'string' && userDoc.planType.toLowerCase().includes('membership')) ||
      (userDoc.activePlan && Array.isArray(userDoc.plans) && userDoc.plans.some((p: any) => (p.planId === userDoc.activePlan || p.id === userDoc.activePlan) && String(p.category || '').toLowerCase() === 'membership'))
    )
  );
  let membershipExpiry: string | null = null;
  if (userDoc && Array.isArray(userDoc.plans)) {
    const plan = userDoc.plans.find((p: any) => String(p.category || '').toLowerCase() === 'membership');
    if (plan && plan.expiryDate) membershipExpiry = plan.expiryDate;
  }


  // Fetch all plans from Firestore and group by category
  const [allPlans, setAllPlans] = useState<any[]>([]);
  const [isPlansLoading, setIsPlansLoading] = useState(true);
  useEffect(() => {
    const fetchPlans = async () => {
      setIsPlansLoading(true);
      try {
        const plansRef = collection(firestore, 'plans');
        const q = query(plansRef, where('currency', '==', selectedCurrency));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          setAllPlans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } else {
          setAllPlans([]);
        }
      } catch (err) {
        setAllPlans([]);
      }
      setIsPlansLoading(false);
    };
    fetchPlans();
  }, [firestore, selectedCurrency]);

  // Group plans by category
  const membershipPlans = allPlans.filter(plan => plan.category === 'membership');
  const servicePlansFiltered = allPlans.filter(plan => plan.category === 'service');

  // Get user's active service plan ids (if any)
  const userServicePlanIds = Array.isArray(userDoc?.plans)
    ? userDoc.plans.filter((p: any) => p.category === 'service').map((p: any) => p.planId || p.id)
    : [];

  return (
    <div className="flex flex-col gap-4 sm:gap-6 md:gap-8 p-2 sm:p-4 md:p-8" style={{ position: 'relative' }}>
      {/* Data Integrity Alert */}
      {!dataIntegrity.isVerified && dataIntegrity.error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-yellow-800">Data Verification Notice</p>
            <p className="text-yellow-700">{dataIntegrity.error}</p>
          </div>
        </div>
      )}

      {/* Wallet Integrity Alert */}
      {!walletIntegrity.isValid && walletIntegrity.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-red-800">Wallet Security Alert</p>
            <p className="text-red-700">{walletIntegrity.error}</p>
          </div>
        </div>
      )}

      {/* Subscription Integrity Alert */}
      {!subscriptionIntegrity.isValid && subscriptionIntegrity.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-red-800">Subscription Security Alert</p>
            <p className="text-red-700">{subscriptionIntegrity.error}</p>
          </div>
        </div>
      )}

      {/* Location Access Button removed */}
      {/* Removed pending count details section. These metrics are now only shown in the employee dashboard. */}
      <ProfileCompleteModal open={showPromptModal} onOpenChange={handlePromptModalChange} />
      
      {/* Welcome Message - First */}
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Welcome back, {(user?.displayName || 'User').toUpperCase()}!</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Here's your job search dashboard.</p>
        {/* Location detection removed */}
      </div>

      {/* Membership Status and Service Plan Status - Same size as navigation cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {/* Membership Status Card */}
        <Card className="hover:border-primary hover:shadow-md transition-all duration-200 h-full">
          <CardContent className="flex flex-col items-center justify-center p-4 sm:p-6 text-center">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center mb-2 sm:mb-3 transition-colors ${hasMembership ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
              <Star className={`h-5 w-5 sm:h-6 sm:w-6 ${hasMembership ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} />
            </div>
            <h3 className="font-semibold text-xs sm:text-sm mb-1">Membership</h3>
            <p className={`text-xs font-bold ${hasMembership ? 'text-green-600' : 'text-red-600'}`}>
              {hasMembership ? 'Active' : 'Not Active'}
            </p>
            {isUserDataLoading && <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin mt-2" />}
          </CardContent>
        </Card>

        {/* Service Plan Status Card */}
        <Card className="hover:border-primary hover:shadow-md transition-all duration-200 h-full">
          <CardContent className="flex flex-col items-center justify-center p-4 sm:p-6 text-center">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center mb-2 sm:mb-3 transition-colors ${activeServicePlan ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'}`}>
              <Briefcase className={`h-5 w-5 sm:h-6 sm:w-6 ${activeServicePlan ? 'text-blue-600 dark:text-blue-400' : 'text-yellow-600 dark:text-yellow-400'}`} />
            </div>
            <h3 className="font-semibold text-xs sm:text-sm mb-1">Service Plan</h3>
            <p className={`text-xs font-bold ${activeServicePlan ? 'text-blue-600' : 'text-yellow-600'}`}>
              {activeServicePlan ? 'Active' : 'Not Active'}
            </p>
            {isUserDataLoading && <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin mt-2" />}
          </CardContent>
        </Card>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        <Link href="/dashboard/resumes" className="group">
          <Card className="hover:border-primary hover:shadow-md transition-all duration-200 cursor-pointer h-full">
            <CardContent className="flex flex-col items-center justify-center p-4 sm:p-6 text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-2 sm:mb-3 group-hover:bg-blue-200 dark:group-hover:bg-blue-800/50 transition-colors">
                <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold text-xs sm:text-sm">Resumes</h3>
              <p className="text-xs text-muted-foreground hidden sm:block">Manage your resumes</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/applications" className="group">
          <Card className="hover:border-primary hover:shadow-md transition-all duration-200 cursor-pointer h-full">
            <CardContent className="flex flex-col items-center justify-center p-4 sm:p-6 text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-2 sm:mb-3 group-hover:bg-green-200 dark:group-hover:bg-green-800/50 transition-colors">
                <Briefcase className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-semibold text-xs sm:text-sm">Applications</h3>
              <p className="text-xs text-muted-foreground hidden sm:block">Track applications</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/hot-jobs" className="group">
          <Card className="hover:border-primary hover:shadow-md transition-all duration-200 cursor-pointer h-full">
            <CardContent className="flex flex-col items-center justify-center p-4 sm:p-6 text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-2 sm:mb-3 group-hover:bg-orange-200 dark:group-hover:bg-orange-800/50 transition-colors">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="font-semibold text-xs sm:text-sm">Jobs</h3>
              <p className="text-xs text-muted-foreground hidden sm:block">Browse jobs</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/recommended-jobs" className="group">
          <Card className="hover:border-primary hover:shadow-md transition-all duration-200 cursor-pointer h-full">
            <CardContent className="flex flex-col items-center justify-center p-4 sm:p-6 text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-2 sm:mb-3 group-hover:bg-purple-200 dark:group-hover:bg-purple-800/50 transition-colors">
                <Award className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="font-semibold text-xs sm:text-sm">Recommended</h3>
              <p className="text-xs text-muted-foreground hidden sm:block">Jobs for you</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/interview-prep" className="group">
          <Card className="hover:border-primary hover:shadow-md transition-all duration-200 cursor-pointer h-full">
            <CardContent className="flex flex-col items-center justify-center p-4 sm:p-6 text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center mb-2 sm:mb-3 group-hover:bg-yellow-200 dark:group-hover:bg-yellow-800/50 transition-colors">
                <Lightbulb className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <h3 className="font-semibold text-xs sm:text-sm">Interview Prep</h3>
              <p className="text-xs text-muted-foreground hidden sm:block">Prepare for interviews</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/wallet" className="group">
          <Card className="hover:border-primary hover:shadow-md transition-all duration-200 cursor-pointer h-full">
            <CardContent className="flex flex-col items-center justify-center p-4 sm:p-6 text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-2 sm:mb-3 group-hover:bg-emerald-200 dark:group-hover:bg-emerald-800/50 transition-colors">
                <Wallet className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="font-semibold text-xs sm:text-sm">Wallet</h3>
              <p className="text-xs text-muted-foreground hidden sm:block">Manage funds</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/billing" className="group">
          <Card className="hover:border-primary hover:shadow-md transition-all duration-200 cursor-pointer h-full">
            <CardContent className="flex flex-col items-center justify-center p-4 sm:p-6 text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center mb-2 sm:mb-3 group-hover:bg-pink-200 dark:group-hover:bg-pink-800/50 transition-colors">
                <CreditCard className="h-5 w-5 sm:h-6 sm:w-6 text-pink-600 dark:text-pink-400" />
              </div>
              <h3 className="font-semibold text-xs sm:text-sm">Billing</h3>
              <p className="text-xs text-muted-foreground hidden sm:block">Manage billing</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/invoices" className="group">
          <Card className="hover:border-primary hover:shadow-md transition-all duration-200 cursor-pointer h-full">
            <CardContent className="flex flex-col items-center justify-center p-4 sm:p-6 text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center mb-2 sm:mb-3 group-hover:bg-cyan-200 dark:group-hover:bg-cyan-800/50 transition-colors">
                <Zap className="h-5 w-5 sm:h-6 sm:w-6 text-cyan-600 dark:text-cyan-400" />
              </div>
              <h3 className="font-semibold text-xs sm:text-sm">Invoices</h3>
              <p className="text-xs text-muted-foreground hidden sm:block">View invoices</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/profile" className="group">
          <Card className="hover:border-primary hover:shadow-md transition-all duration-200 cursor-pointer h-full">
            <CardContent className="flex flex-col items-center justify-center p-4 sm:p-6 text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-2 sm:mb-3 group-hover:bg-indigo-200 dark:group-hover:bg-indigo-800/50 transition-colors">
                <User className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="font-semibold text-xs sm:text-sm">Profile</h3>
              <p className="text-xs text-muted-foreground hidden sm:block">Edit your profile</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/settings" className="group">
          <Card className="hover:border-primary hover:shadow-md transition-all duration-200 cursor-pointer h-full">
            <CardContent className="flex flex-col items-center justify-center p-4 sm:p-6 text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-2 sm:mb-3 group-hover:bg-gray-200 dark:group-hover:bg-gray-700 transition-colors">
                <Settings className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600 dark:text-gray-400" />
              </div>
              <h3 className="font-semibold text-xs sm:text-sm">Settings</h3>
              <p className="text-xs text-muted-foreground hidden sm:block">App settings</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Service Plans Section (if no active service plan) */}
      {hasMembership && !activeServicePlan && (
        <div className="mt-4 sm:mt-6 md:mt-8">
          <Card className="col-span-full">
            <CardHeader className="px-3 sm:px-6">
              <CardTitle className="text-lg sm:text-xl">Service Plans</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Purchase or view your service plans below.</CardDescription>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 justify-center items-start">
                {servicePlans.length === 0 && <div className="text-muted-foreground text-xs sm:text-sm">No service plans available.</div>}
                {servicePlans.map((plan) => {
                  const isPaygPlan = plan.name?.toLowerCase().includes('payg') || plan.name?.toLowerCase().includes('pay as you go') || plan.id?.toLowerCase().includes('payg');
                  
                  return (
                    <div key={plan.id} className="border-2 rounded-xl p-4 sm:p-6 bg-card flex flex-col items-center text-xs sm:text-sm">
                      <div className="font-bold text-base sm:text-lg mb-3">{plan.name}</div>
                      
                      {/* Price display like billing page */}
                      {!isPaygPlan ? (
                        <div className="text-primary font-bold text-2xl sm:text-3xl mb-3">
                          {plan.price && !isNaN(Number(plan.price)) ? (
                            plan.currency?.toUpperCase() === 'INR' ? `₹${Number(plan.price).toLocaleString('en-IN')}` : `$${Number(plan.price).toLocaleString('en-US')}`
                          ) : (
                            <span className="text-gray-500">Postpaid Plan</span>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-600 font-medium mb-3">
                          {selectedCurrency === 'INR' ? 'Wallet Based' : 'Postpaid'}
                        </div>
                      )}
                      
                      {typeof (plan as any).note === 'string' && (plan as any).note && (
                        <div className="text-xs sm:text-sm text-blue-600 font-medium mb-3">{(plan as any).note}</div>
                      )}
                      
                      <ul className="text-xs sm:text-sm mb-4 list-none space-y-2 flex-grow">
                        {plan.features && plan.features.map((f: string, i: number) => (
                          <li key={i} className="flex items-start">
                            <span className="text-green-500 mr-2 mt-0.5">✓</span>
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                      
                      <div className="text-xs text-muted-foreground mb-2 text-center">{plan.description}</div>
                      
                      {typeof (plan as any).popular === 'boolean' && (plan as any).popular && (
                        <span className="inline-block bg-yellow-400 text-yellow-900 font-bold text-xs px-3 py-1 rounded-full mb-3">MOST POPULAR</span>
                      )}
                      
                      {/* Button to go to billing page */}
                      <button
                        className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white py-2 sm:py-3 px-4 rounded-lg font-semibold transition-all duration-300 text-xs sm:text-sm shadow-lg hover:shadow-blue-500/25"
                        onClick={() => window.location.href = '/dashboard/billing'}
                      >
                        View & Purchase on Billing Page
                      </button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
