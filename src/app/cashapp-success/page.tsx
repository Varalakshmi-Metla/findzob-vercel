"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function CashAppSuccessInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");
  const amount = searchParams.get("amount");
  const currency = searchParams.get("currency");
  const planId = searchParams.get("planId");
  const planName = searchParams.get("planName");
  const planCategory = searchParams.get("planCategory");
  const planPrice = searchParams.get("planPrice");
  const planValidity = searchParams.get("planValidity");
  const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;

  useEffect(() => {
    const verifyAndRedirect = async () => {
      if (!sessionId || !userId || !amount || !currency || !planId || !planName || !planCategory || !planPrice || !planValidity) {
        router.replace("/");
        return;
      }
      try {
        const res = await fetch("/api/cashapp-verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            userId,
            amount,
            currency,
            planId,
            planName,
            planCategory,
            planPrice,
            planValidity,
          }),
        });
        const data = await res.json();
        if (data.success && data.invoiceId) {
          router.replace(`/invoice/${data.invoiceId}`);
        } else {
          router.replace("/");
        }
      } catch (err) {
        router.replace("/");
      }
    };
    verifyAndRedirect();
  }, [router, sessionId, userId, amount, currency, planId, planName, planCategory, planPrice, planValidity]);
  return null;
}

export default function CashAppSuccessPage() {
  return (
    <Suspense>
      <CashAppSuccessInner />
    </Suspense>
  );
}
