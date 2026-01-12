"use client";
import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Plan } from "@/types/firestore-schemas";

export default function StripeCheckoutPage({ 
  plan, 
  onPay 
}: { 
  plan: Plan; 
  onPay: (plan: Plan) => void; 
}) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePay = async () => {
    setIsProcessing(true);
    try {
      await onPay(plan);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatPrice = (price: number, currency?: string) => {
    if (currency?.toUpperCase() === 'INR') {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
      }).format(price);
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  return (
    <div className="max-w-lg mx-auto p-8">
      <Card className="shadow-lg border-2 border-blue-500">
        <CardHeader>
          <CardTitle>Checkout: {plan.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="font-bold text-xl mb-1">{plan.name}</div>
            <div className="text-primary font-bold text-2xl mb-2">
              {formatPrice(plan.price ?? 0, plan.currency)} 
              <span className="text-base font-normal"> (one-time)</span>
            </div>
            {plan.features && plan.features.length > 0 && (
              <ul className="text-sm mb-4 list-disc pl-4 text-left">
                {plan.features.map((f: string, i: number) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            )}
          </div>
          <Button 
            onClick={handlePay}
            className="w-full mt-4"
            size="lg"
            disabled={isProcessing}
          >
            {isProcessing ? "Processing..." : "Pay Now"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
