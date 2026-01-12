"use client";
import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import CheckoutPaymentForm from "@/app/checkout/CheckoutPaymentForm";
import { useFirestore } from "@/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";

function CheckoutComponent() {
  const searchParams = useSearchParams();
  const planId = searchParams.get("planId");
  const invoiceId = searchParams.get("invoiceId");
  const invoiceAmount = searchParams.get("amount");
  const firestore = useFirestore();
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (invoiceId && invoiceAmount) {
      // Invoice payment mode
      setPlan({
        id: invoiceId,
        name: 'Pay As You Go Hot Jobs Invoice',
        price: Number(invoiceAmount),
        currency: 'USD',
        description: 'Payment for Pay As You Go Hot Jobs invoice',
        features: [],
        billing: 'one-time',
        type: 'payg-hotjobs',
        invoiceId,
      });
      setLoading(false);
      return;
    }
    if (!planId) return;
    if (!firestore) return;
    setLoading(true);
    // Try to load from Firestore first (admin/plans/plans/{planId})
    const fetchPlan = async () => {
      try {
        // 1. Try by Doc ID
        const planDoc = await getDoc(doc(firestore, "plans", planId));
        if (planDoc.exists()) {
          setPlan({ id: planDoc.id, ...planDoc.data() });
        } else {
          // 2. Try by 'id' field
          const q = query(collection(firestore, "plans"), where("id", "==", planId));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const d = querySnapshot.docs[0];
            setPlan({ id: d.id, ...d.data() });
          } else {
            // Fallback: try to load from seed plans
            const { plans: seedPlans } = await import("@/lib/seed-plans");
            const found = seedPlans.find((p: any) => p.id === planId);
            setPlan(found || null);
          }
        }
      } catch (err: any) {
        setError("Failed to load plan");
      } finally {
        setLoading(false);
      }
    };
    fetchPlan();
  }, [planId, invoiceId, invoiceAmount, firestore]);

  if (loading) return <Skeleton className="w-full h-32" />;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!plan)
    return <div className="text-muted-foreground">Plan not found.</div>;

  return (
    <div className="max-w-lg mx-auto py-10 px-4 rounded-xl shadow-lg border bg-card border-border">
      <h1 className="text-3xl font-bold mb-2 text-center">{plan.name}</h1>
      <div className="flex items-end justify-center gap-2 mb-2">
        <span className="text-4xl font-extrabold text-primary">
          {plan.currency === "INR" ? `₹${plan.price}` : `$${plan.price}`}
        </span>
        {plan.billing && (
          <span className="text-base text-muted-foreground mb-1">
            {plan.billing === "one-time"
              ? "One-time"
              : plan.billing.replace("-", " ")}
          </span>
        )}
      </div>
      <div className="mb-4 text-center text-gray-600">{plan.description}</div>
      {plan.features && Array.isArray(plan.features) && plan.features.length > 0 && (
        <ul className="mb-6 grid gap-2">
          {plan.features.map((f: string, i: number) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
              {f}
            </li>
          ))}
        </ul>
      )}
      {plan.validity && (
        <div className="mb-2 text-xs text-muted-foreground text-center">
          Validity: {plan.validity}
        </div>
      )}
      <div className="flex justify-center mt-6">
        <CheckoutPaymentForm selectedPlan={plan} />
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<Skeleton className="w-full h-screen" />}>
      <CheckoutComponent />
    </Suspense>
  );
}
