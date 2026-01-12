"use client";

declare global {
  interface Window {
    Razorpay?: any;
  }
}

import type { Plan } from '@/types/plan';
import React, { useState } from 'react';
import { useUser } from '@/firebase/provider';
import { useUserDoc } from '@/firebase/use-user-doc';
import { loadStripe } from '@stripe/stripe-js';


const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "");

type CheckoutPaymentFormProps = {
  selectedPlan: Plan;
  onSuccess?: (paymentResult: any) => void;
};


type LoadingState = 'stripe' | 'googlepay' | 'razorpay' | 'paytm' | 'cashapp' | null;


const CheckoutPaymentForm: React.FC<CheckoutPaymentFormProps> = ({ selectedPlan, onSuccess }) => {
  const [loading, setLoading] = useState<LoadingState>(null);
  const { user } = useUser();
  const { userDoc } = useUserDoc(user);
  let userId = user?.uid;
  if (typeof window !== 'undefined') {
    userId = userId || localStorage.getItem('userId') || undefined;
    // Always set userId in localStorage for Razorpay flow
    if (userId) localStorage.setItem('userId', userId);
  }

  const handleCashApp = async () => {
    setLoading('cashapp');
    try {
      validatePayment('stripe'); // CashApp is USD only, reuse validation
      // Use Stripe Checkout for Cash App Pay
      const res = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selectedPlan, method: 'cashapp', userId }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create Cash App Pay session');
      }
      const data = await res.json();
      if (data.sessionId) {
        const stripe = await stripePromise;
        const result = await stripe?.redirectToCheckout({
          sessionId: data.sessionId,
        });
        if (result?.error) {
          throw new Error(result.error.message);
        }
      } else if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Invalid response from payment server');
      }
    } catch (err: any) {
      console.error('Cash App Pay error:', err);
      alert('Payment error: ' + err.message);
    } finally {
      setLoading(null);
    }
  };

  const validatePayment = (method: string) => {
    if (!selectedPlan?.id || !selectedPlan?.price) {
      throw new Error('Invalid plan selected');
    }
    if (!userId) {
      throw new Error('Please log in to make a payment');
    }
    
    const isUSD = selectedPlan.currency?.toUpperCase() === 'USD';
    const isINR = selectedPlan.currency?.toUpperCase() === 'INR';
    
    if ((method === 'stripe' || method === 'googlepay') && !isUSD) {
      throw new Error('Stripe only supports USD payments');
    }
    if ((method === 'razorpay' || method === 'paytm') && !isINR) {
      throw new Error('Razorpay/Paytm only support INR payments');
    }
  };

  const handleStripeCheckout = async (method: 'stripe' | 'googlepay') => {
    setLoading(method);
    try {
      validatePayment(method);
      // Generate a unique orderId for this payment
      const orderId = 'ORDER_' + Date.now() + '_' + Math.floor(Math.random() * 1000000);
      const res = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selectedPlan, method, userId, orderId, userEmail: user?.email || '' }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create payment session');
      }
      const data = await res.json();
      if (data.sessionId) {
        const stripe = await stripePromise;
        const result = await stripe?.redirectToCheckout({
          sessionId: data.sessionId,
        });
        if (result?.error) {
          throw new Error(result.error.message);
        }
      } else if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Invalid response from payment server');
      }
    } catch (err: any) {
      console.error(`${method} error:`, err);
      alert(`Payment error: ${err.message}`);
    } finally {
      setLoading(null);
    }
  };

  const handleRazorpay = async () => {
    setLoading('razorpay');
    try {
      validatePayment('razorpay');
      
      const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      if (!razorpayKey) throw new Error('Razorpay not configured');
      
      const res = await fetch('/api/razorpay-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: selectedPlan.price,
          currency: 'INR',
          notes: { planId: selectedPlan.id, planName: selectedPlan.name },
          userId,
          userEmail: user?.email || userDoc?.email || '',
          userName: user?.displayName || userDoc?.name || '',
          userPhone: userDoc?.phone || '',
          userAddress: userDoc?.address || '',
          planId: selectedPlan.id,
        }),
      });
      
      if (!res.ok) throw new Error('Failed to create Razorpay order');
      
      const { order } = await res.json();
      if (!order) throw new Error('Invalid order response');
      
      if (typeof window !== 'undefined' && window.Razorpay) {
        const planCategory = selectedPlan.category || 'service';
        const planValidity = selectedPlan.validity || 30;
        
        const rzp = new window.Razorpay({
          key: razorpayKey,
          amount: order.amount,
          currency: order.currency,
          order_id: order.id,
          name: 'Plan Purchase',
          description: selectedPlan.name,
          handler: function (response: any) {
            const params = new URLSearchParams({
              orderId: order.id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              userId: userId || '',
              amount: String(selectedPlan.price),
              planId: selectedPlan.id,
              planName: selectedPlan.name,
              planCategory,
              planPrice: String(selectedPlan.price),
              planValidity: String(planValidity),
              userName: user?.displayName || userDoc?.name || '',
              userEmail: user?.email || userDoc?.email || '',
              userPhone: userDoc?.phone || '',
              userAddress: userDoc?.address || '',
            });
            // Also store in localStorage for success page fallback
            localStorage.setItem('userName', user?.displayName || userDoc?.name || '');
            localStorage.setItem('userEmail', user?.email || userDoc?.email || '');
            localStorage.setItem('userPhone', userDoc?.phone || '');
            localStorage.setItem('userAddress', userDoc?.address || '');
            window.location.href = `/razorpay-success?${params.toString()}`;
          },
          prefill: {
            email: user?.email || '',
            name: user?.displayName || '',
          },
          notes: order.notes,
          theme: {
            color: '#F37254'
          }
        });
        
        rzp.open();
      } else {
        throw new Error('Razorpay SDK not loaded');
      }
    } catch (err: any) {
      console.error('Razorpay error:', err);
      alert('Payment error: ' + err.message);
    } finally {
      setLoading(null);
    }
  };

  const handlePaytm = async () => {
    setLoading('paytm');
    try {
      validatePayment('paytm');
      
      const orderId = 'ORDER_' + Date.now();
      const customerId = userId || ('USER_' + Date.now());
      
      const res = await fetch('/api/paytm-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: selectedPlan.price,
          orderId,
          customerId,
          email: user?.email || '',
          mobile: '',
          userId,
        }),
      });
      
      if (!res.ok) throw new Error('Failed to create Paytm order');
      
      const data = await res.json();
      if (data.paytmParams) {
        const form = document.createElement('form');
        form.method = 'post';
        form.action = 'https://securegw.paytm.in/theia/processTransaction';
        
        Object.entries(data.paytmParams).forEach(([key, value]) => {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = value as string;
          form.appendChild(input);
        });
        
        document.body.appendChild(form);
        form.submit();
      } else {
        throw new Error('Invalid Paytm response');
      }
    } catch (err: any) {
      console.error('Paytm error:', err);
      alert('Payment error: ' + err.message);
    } finally {
      setLoading(null);
    }
  };

  const isUSD = selectedPlan.currency?.toUpperCase() === 'USD';
  const isINR = selectedPlan.currency?.toUpperCase() === 'INR';



  return (
    <div className="flex flex-col gap-4 w-full">
      {isUSD && (
        <>
          <button
            className="w-full py-3 px-6 rounded-lg bg-blue-600 text-white font-semibold text-lg hover:bg-blue-700 transition disabled:opacity-60"
            onClick={() => handleStripeCheckout('stripe')}
            disabled={loading !== null}
          >
            {loading === 'stripe' ? 'Processing...' : 'Pay with Stripe'}
          </button>
          <button
            className="w-full py-3 px-6 rounded-lg bg-green-600 text-white font-semibold text-lg hover:bg-green-700 transition disabled:opacity-60"
            onClick={() => handleStripeCheckout('googlepay')}
            disabled={loading !== null}
          >
            {loading === 'googlepay' ? 'Processing...' : 'Pay with Google Pay'}
          </button>
          <button
            className="w-full py-3 px-6 rounded-lg bg-black text-white font-semibold text-lg hover:bg-gray-800 transition disabled:opacity-60"
            onClick={handleCashApp}
            disabled={loading !== null}
          >
            {loading === 'cashapp' ? 'Processing...' : 'Pay with Cash App Pay'}
          </button>
        </>
      )}
      {isINR && (
        <>
          <button
            className="w-full py-3 px-6 rounded-lg bg-orange-600 text-white font-semibold text-lg hover:bg-orange-700 transition disabled:opacity-60"
            onClick={handleRazorpay}
            disabled={loading !== null}
          >
            {loading === 'razorpay' ? 'Processing...' : 'Pay with Razorpay'}
          </button>
          <button
            className="w-full py-3 px-6 rounded-lg bg-blue-800 text-white font-semibold text-lg hover:bg-blue-900 transition disabled:opacity-60"
            onClick={handlePaytm}
            disabled={loading !== null}
          >
            {loading === 'paytm' ? 'Processing...' : 'Pay with Paytm'}
          </button>
        </>
      )}
    </div>
  );
};

export default CheckoutPaymentForm;