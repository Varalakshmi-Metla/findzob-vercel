"use client";

import { useEffect, useState, Suspense } from "react";
import CryptoJS from "crypto-js";
import { useRouter, useSearchParams } from "next/navigation";



function RazorpaySuccessInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const orderId = searchParams.get("orderId");
  const paymentId = searchParams.get("paymentId");
  const signature = searchParams.get("signature");
  const amount = searchParams.get("amount");
  const planId = searchParams.get("planId");
  const planName = searchParams.get("planName");
  const planCategory = searchParams.get("planCategory");
  const planPrice = searchParams.get("planPrice");
  const planValidity = searchParams.get("planValidity");
  // User details from query/localStorage
  let userId = null;
  let userEmail = null;
  let userName = null;
  let userPhone = null;
  let userAddress = null;
  if (typeof window !== "undefined") {
    userId = localStorage.getItem("userId");
    userEmail = searchParams.get("userEmail") || localStorage.getItem("userEmail");
    userName = searchParams.get("userName") || localStorage.getItem("userName");
    userPhone = searchParams.get("userPhone") || localStorage.getItem("userPhone");
    userAddress = searchParams.get("userAddress") || localStorage.getItem("userAddress");
  }

  useEffect(() => {
    const verifyAndRedirect = async () => {
      if (!orderId || !paymentId || !signature || !userId || !amount || !planId) {
        setError(
          `Missing required payment or plan information.\n\nDetails:\norderId: ${orderId}\npaymentId: ${paymentId}\nsignature: ${signature}\nuserId: ${userId}\namount: ${amount}\nplanId: ${planId}\nPlease contact support with this information.`
        );
        return;
      }
      // Generate hash for payment integrity (must match backend logic)
      const secret = process.env.NEXT_PUBLIC_PAYMENT_HASH_SECRET || "";
      const hashPayload = { amount, userId, planId, orderId };
      // Sort keys for deterministic hash
      const sortedKeys = Object.keys(hashPayload).sort();
      const payload = sortedKeys.map(key => `${key}=${hashPayload[key as keyof typeof hashPayload]}`).join('&');
      const hash = CryptoJS.HmacSHA256(payload, secret).toString(CryptoJS.enc.Hex);

      try {
        const res = await fetch("/api/razorpay-verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId,
            paymentId,
            signature,
            userId,
            userEmail,
            userName,
            userPhone,
            userAddress,
            amount,
            planId,
            hash,
            // planName, planCategory, planPrice, planValidity are now ignored by backend
          }),
        });
        const data = await res.json();
        if (data.success && data.invoiceId) {
          router.replace(`/invoice/${data.invoiceId}`);
        } else {
          setError(data.error || "Payment verification failed. Please contact support.");
        }
      } catch (err: any) {
        setError("Network or server error. Please try again or contact support.");
      }
    };
    verifyAndRedirect();
  }, [router, orderId, paymentId, signature, userId, amount, planId]);
  if (error) {
    return (
      <div style={{ padding: 32, color: 'red', textAlign: 'center' }}>
        <h2>Payment Error</h2>
        <p>{error}</p>
        <a href="/dashboard/billing" style={{ color: 'blue', textDecoration: 'underline' }}>Go back to Billing</a>
      </div>
    );
  }
  return null;
}

export default function RazorpaySuccessPage() {
  return (
    <Suspense>
      <RazorpaySuccessInner />
    </Suspense>
  );
}
