"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@/firebase/provider";


export default function PaymentSuccessPage() {
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"processing" | "success" | "error" | "missing_data">("processing");

  // Use sessionStorage to persist activation status across reloads for this session
  const [hasActivated, setHasActivated] = useState(false);


  // Place this function before useEffect so it is in scope
  // Prevent duplicate activation calls
  const completeActivation = async (activationData: {
    userId: string;
    planId: string;
    plan?: any;
    paymentId?: string | null;
    orderId?: string | null;
    sessionId?: string | null;
    amount?: number;
    paymentMethod?: string;
  }, activationKey: string) => {
    if (typeof window !== 'undefined') {
      if (sessionStorage.getItem(`activated_${activationKey}`)) {
        // Already activated, skip
        return;
      }
      sessionStorage.setItem(`activated_${activationKey}`, '1');
    }
    const activateRes = await fetch("/api/activate-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(activationData),
    });
    const activateData = await activateRes.json();
    if (!activateRes.ok || !activateData.success) {
      console.error("Plan activation failed:", activateData.error);
      setStatus("error");
      setTimeout(() => {
        router.replace("/dashboard/billing?error=activation_failed");
      }, 3000);
      return;
    }
    setStatus("success");
    if (typeof window !== 'undefined') {
      localStorage.removeItem('recent_plan_id');
    }
    // Immediately redirect after activation
    router.replace("/dashboard?success=true");
  };

  useEffect(() => {
    if (!user?.uid) {
      router.replace("/auth/signin");
      return;
    }

    const planId = searchParams.get("planId");
    const paymentId = searchParams.get("paymentId");
    const orderId = searchParams.get("orderId");
    const sessionId = searchParams.get("session_id");
    const amount = searchParams.get("amount");
    // Use sessionId or paymentId as unique key for this activation
    const activationKey = sessionId || paymentId || orderId;
    if (!activationKey) return;

    // Check sessionStorage to see if this activationKey has already been processed
    if (typeof window !== 'undefined' && sessionStorage.getItem(`activated_${activationKey}`)) {
      // Already activated, redirect immediately
      router.replace("/dashboard?success=true");
      return;
    }

    const activatePlan = async () => {
      try {
        if (!planId) {
          console.warn("No planId in URL, attempting to recover from session...");
          const recentPlanId = typeof window !== 'undefined' 
            ? localStorage.getItem('recent_plan_id')
            : null;
          if (recentPlanId) {
            await completeActivation({
              userId: user.uid,
              planId: recentPlanId,
              paymentId,
              orderId,
              sessionId,
              amount: amount ? Number(amount) : undefined,
              paymentMethod: "stripe"
            }, activationKey);
            return;
          }
          if (sessionId) {
            // --- CACHE get-checkout-session result in sessionStorage ---
            let sessionData = null;
            if (typeof window !== 'undefined') {
              const cached = sessionStorage.getItem(`checkoutSession_${sessionId}`);
              if (cached) {
                sessionData = JSON.parse(cached);
              }
            }
            if (!sessionData) {
              const sessionRes = await fetch(`/api/get-checkout-session?sessionId=${sessionId}`);
              sessionData = await sessionRes.json();
              if (typeof window !== 'undefined') {
                sessionStorage.setItem(`checkoutSession_${sessionId}`, JSON.stringify(sessionData));
              }
            }
            if (sessionData.planId) {
              await completeActivation({
                userId: user.uid,
                planId: sessionData.planId,
                plan: sessionData.plan,
                paymentId: sessionId,
                orderId: sessionId,
                sessionId,
                amount: sessionData.amount_total ? sessionData.amount_total / 100 : undefined,
                paymentMethod: "stripe"
              }, activationKey);
              return;
            }
          }
          setStatus("missing_data");
          setTimeout(() => {
            router.replace("/dashboard/billing?error=missing_plan_data");
          }, 5000);
          return;
        }
        await completeActivation({
          userId: user.uid,
          planId,
          paymentId,
          orderId,
          sessionId,
          amount: amount ? Number(amount) : undefined,
          paymentMethod: "stripe"
        }, activationKey);
      } catch (error) {
        console.error("Payment processing error:", error);
        setStatus("error");
        setTimeout(() => {
          router.replace("/dashboard/billing?error=processing_error");
        }, 3000);
      }
    };

    activatePlan();
    // Only run on mount, not on hasActivated change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, router, searchParams]);

  // Add this to your payment component to store planId before redirect
  useEffect(() => {
    // Store current planId in localStorage as fallback
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const planId = urlParams.get('planId');
      if (planId) {
        localStorage.setItem('recent_plan_id', planId);
      }
    }
  }, []);

  const renderContent = () => {
    switch (status) {
      case "processing":
        return (
          <>
            <div className="text-lg font-semibold mb-4 text-blue-600">
              Processing your payment...
            </div>
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
            <p className="mt-4 text-sm text-gray-600">
              Please wait while we activate your plan.
            </p>
          </>
        );
      
      case "success":
        return (
          <>
            <div className="text-lg font-semibold mb-4 text-green-600">
              ✅ Payment Successful!
            </div>
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="mt-4 text-sm text-gray-600">
              Redirecting to your dashboard...
            </p>
          </>
        );
      
      case "error":
        return (
          <>
            <div className="text-lg font-semibold mb-4 text-red-600">
              ❌ Processing Failed
            </div>
            <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="mt-4 text-sm text-gray-600 text-center max-w-sm">
              There was an issue activating your plan. You will be redirected to the billing page.
            </p>
            <button
              onClick={() => router.replace("/dashboard/billing")}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Go to Billing Now
            </button>
          </>
        );

      case "missing_data":
        return (
          <>
            <div className="text-lg font-semibold mb-4 text-yellow-600">
              ⚠️ Additional Information Needed
            </div>
            <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="mt-4 text-sm text-gray-600 text-center max-w-sm">
              We're having trouble identifying your purchased plan. Please contact support with your payment details.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => router.replace("/support")}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Contact Support
              </button>
              <button
                onClick={() => router.replace("/dashboard/invoices")}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
              >
                Go to Invoices
              </button>
            </div>
          </>
        );
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        {renderContent()}
      </div>
    </div>
  );
}