"use client";
import React, { useState } from "react";
import { useRouter } from 'next/navigation';
import { useUserDoc } from '@/firebase/use-user-doc';
import { useUser, useFirestore } from '@/firebase';
import { doc, getDoc } from "firebase/firestore";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';


export default function WalletPage() {
    const router = useRouter();
    const { user } = useUser();
    const firestore = useFirestore();
    const { userDoc, isLoading: userDocLoading } = useUserDoc(user);
    const [amount, setAmount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [walletBalance, setWalletBalance] = useState<number | null>(null);
    const fetchWalletFromProfile = React.useCallback(async () => {
      if (user && firestore) {
        const userRef = doc(firestore, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          setWalletBalance(typeof data.walletAmount === 'number' ? data.walletAmount : 0);
        } else {
          setWalletBalance(0);
        }
      }
    }, [user, firestore]);

    // Stripe integration removed: wallet now uses Razorpay only

  // Eligibility check: Only India + Pay As You Go (robust)
  const isEligible = React.useMemo(() => {
    if (!userDoc || userDocLoading) return false;
    if (userDoc.citizenship !== 'India') return false;
    // Check for plan as string, object, or in plans array
    if (typeof userDoc.plan === 'string') {
      return /pay[-\s]?as[-\s]?you[-\s]?go/i.test(userDoc.plan);
    }
    if (userDoc.plan && typeof userDoc.plan === 'object' && userDoc.plan.name) {
      return /pay[-\s]?as[-\s]?you[-\s]?go/i.test(userDoc.plan.name);
    }
    if (Array.isArray(userDoc.plans)) {
      return userDoc.plans.some((p: any) =>
        (typeof p === 'string' && /pay[-\s]?as[-\s]?you[-\s]?go/i.test(p)) ||
        (p && typeof p === 'object' && p.name && /pay[-\s]?as[-\s]?you[-\s]?go/i.test(p.name))
      );
    }
    return false;
  }, [userDoc, userDocLoading]);

  React.useEffect(() => {
    if (!isEligible) return;
    fetchWalletFromProfile();
  }, [isEligible, fetchWalletFromProfile]);


  // Razorpay integration
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (document.getElementById('razorpay-sdk')) return resolve(true);
      const script = document.createElement('script');
      script.id = 'razorpay-sdk';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePaymentGateway = async () => {
      if (amount < 1 || amount > 10000) {
        toast({ title: "Invalid Amount", description: "Enter an amount between ₹1 and ₹10000.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const res = await loadRazorpayScript();
    if (!res) {
      toast({ title: "Error", description: "Failed to load Razorpay SDK.", variant: "destructive" });
      setLoading(false);
      return;
    }
    // Create order on server (must include userId)
    const orderRes = await fetch('/api/wallet/razorpay-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, userId: user?.uid }),
    });
    const orderData = await orderRes.json();
    if (!orderData.id || !orderData.hash) {
      toast({ title: "Error", description: "Failed to create Razorpay order.", variant: "destructive" });
      setLoading(false);
      return;
    }
    // Use paise value from orderData.amount for all further steps
    const paiseAmount = orderData.amount;
    const payload: any = {
      razorpay_payment_id: '', // will be set in handler
      razorpay_order_id: orderData.id,
      amount: paiseAmount,
      ts: Date.now(),
      razorpay_signature: '',
      hash: orderData.hash,
    };

    const options = {
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_xxxxxxxx',
      amount: orderData.amount,
      currency: 'INR',
      name: 'FindZob Wallet Top Up',
      description: 'Wallet Top Up',
      order_id: orderData.id,
      handler: async function (response: any) {
        // Call backend to verify payment and credit wallet
        payload.razorpay_payment_id = response.razorpay_payment_id;
        payload.razorpay_signature = response.razorpay_signature;
        try {
          const verifyRes = await fetch('/api/wallet/razorpay-verify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(user?.uid ? { 'x-user-id': user.uid } : {}),
            },
            body: JSON.stringify(payload),
          });
          const verifyData = await verifyRes.json();
          if (verifyData.success) {
            // Fetch the latest wallet balance from Firestore after top-up
            await fetchWalletFromProfile();
            toast({ title: "Success", description: `Wallet topped up by ₹${paiseAmount / 100}` });
            setAmount(0);
          } else {
            toast({ title: "Payment Failed", description: verifyData.message || 'Could not verify payment.', variant: "destructive" });
          }
        } catch (err) {
          toast({ title: "Payment Error", description: 'Could not verify payment. Please try again.', variant: "destructive" });
        }
        setLoading(false);
      },
      prefill: {
        email: user?.email || '',
        contact: userDoc?.phone || '',
      },
      theme: { color: '#2563eb' },
      modal: {
        ondismiss: () => setLoading(false),
      },
    };
    // @ts-ignore
    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  if (userDocLoading) {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 bg-blue-50 dark:bg-neutral-900 rounded-2xl shadow-2xl border border-blue-200 dark:border-neutral-700 flex flex-col items-center">
        <h1 className="text-2xl font-bold text-blue-900 dark:text-blue-200 mb-4">Loading...</h1>
      </div>
    );
  }
  if (!isEligible) {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 bg-blue-50 dark:bg-neutral-900 rounded-2xl shadow-2xl border border-blue-200 dark:border-neutral-700 flex flex-col items-center">
        <h1 className="text-2xl font-bold text-blue-900 dark:text-blue-200 mb-4">Wallet Access Restricted</h1>
        <p className="text-gray-700 dark:text-gray-300 text-center">The wallet is only available for users with citizenship <b>India</b> and a <b>Pay As You Go</b> plan.</p>
      </div>
    );
  }
  return (
    <div className="max-w-md mx-auto mt-12 p-8 bg-blue-50 dark:bg-neutral-900 rounded-2xl shadow-2xl border border-blue-200 dark:border-neutral-700 flex flex-col items-center">
      <div className="flex items-center gap-3 mb-6">
        <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-700 dark:bg-neutral-800 dark:text-blue-300 shadow">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="10" rx="2"/><circle cx="17" cy="12" r="2.5"/><rect x="2" y="7" width="20" height="10" rx="2" strokeWidth="2"/></svg>
        </span>
        <h1 className="text-3xl font-extrabold text-blue-900 dark:text-blue-200 tracking-tight">My Wallet</h1>
      </div>
      <div className="mb-8 w-full flex flex-col items-center">
        <div className="text-xs uppercase text-gray-500 dark:text-gray-400 tracking-widest mb-1">Wallet Balance</div>
        <div className="text-3xl font-bold text-blue-700 dark:text-blue-300 bg-white dark:bg-neutral-800 rounded-xl px-6 py-2 shadow border border-blue-100 dark:border-neutral-700">
          {walletBalance !== null ? `₹${walletBalance}` : 'Loading...'}
        </div>
      </div>
      <div className="mb-6 w-full">
        <label className="block mb-2 font-semibold text-gray-700 dark:text-gray-200">Top Up Amount (₹)</label>
        <div className="flex flex-wrap gap-2 mb-3">
          {[100, 250, 500, 1000].map((preset) => (
            <Button
              key={preset}
              type="button"
              variant={amount === preset ? "default" : "outline"}
              size="sm"
              onClick={() => setAmount(preset)}
              disabled={loading}
            >
              ₹{preset}
            </Button>
          ))}
        </div>
        <Input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={amount === 0 ? '' : amount}
          onChange={e => {
            const val = e.target.value.replace(/[^0-9]/g, '');
            setAmount(val ? Number(val) : 0);
          }}
          placeholder="Enter amount"
          className="w-full max-w-xs text-lg px-4 py-2 border-2 border-blue-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-blue-100 rounded-lg focus:ring-2 focus:ring-blue-400"
        />
      </div>
      <Button onClick={handlePaymentGateway} disabled={loading || amount <= 0} className="w-full py-3 text-lg font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 transition">
        {loading ? 'Processing...' : 'Top Up via Razorpay'}
      </Button>
      <div className="mt-6 text-xs text-gray-500 dark:text-gray-400 text-center">You can top up your wallet using Razorpay.</div>
    </div>
  );
}
