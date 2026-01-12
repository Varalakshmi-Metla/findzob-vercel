"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import StripeCheckoutPage from "@/app/checkout/StripeCheckoutPage";
import { useUser } from "@/firebase/provider";
import { useUserDoc } from "@/firebase/use-user-doc";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import CheckoutPaymentForm from "@/app/checkout/CheckoutPaymentForm";

import { useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';


export default function BillingPage() {
    const router = useRouter();
    const [showPaygDialog, setShowPaygDialog] = useState(false);
    const [selectedPaygPlan, setSelectedPaygPlan] = useState<any>(null);
    const [paygConsent, setPaygConsent] = useState(false);
    const [paygLoading, setPaygLoading] = useState(false);
    const [paygSuccess, setPaygSuccess] = useState(false);
    const userResult = useUser();
    const user = userResult?.user;
    const userDocArg = useMemo(() => (user ? { uid: user.uid } : null), [user?.uid]);
    const { userDoc, isLoading: isUserDocLoading } = useUserDoc(userDocArg);
    const isUserLoading = !user;
    const firestore = useFirestore();
    const [currency, setCurrency] = useState<'USD' | 'INR'>('USD');
    // Remove geolocation, use citizenship from user profile
    const [geoError] = useState<string | null>(null);
    const [invoice, setInvoice] = useState<any>(null);
    const [servicePlans, setServicePlans] = useState<any[]>([]);
    const [isServicePlansLoading, setIsServicePlansLoading] = useState(true);
    const [membershipPlans, setMembershipPlans] = useState<any[]>([]);
    const [isMembershipPlansLoading, setIsMembershipPlansLoading] = useState(true);

    // Fetch service plans and membership plans from Firestore, filtered by currency
    useEffect(() => {
        if (!firestore) return;
        setIsServicePlansLoading(true);
        setIsMembershipPlansLoading(true);
        const fetchPlans = async () => {
            try {
                const serviceQ = query(collection(firestore, 'plans'), where('category', '==', 'service'), where('currency', '==', currency));
                const membershipQ = query(collection(firestore, 'plans'), where('category', '==', 'membership'), where('currency', '==', currency));
                const [serviceSnap, membershipSnap] = await Promise.all([
                    getDocs(serviceQ),
                    getDocs(membershipQ)
                ]);
                setServicePlans(serviceSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                setMembershipPlans(membershipSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } catch (err) {
                setServicePlans([]);
                setMembershipPlans([]);
            }
            setIsServicePlansLoading(false);
            setIsMembershipPlansLoading(false);
        };
        fetchPlans();
    }, [firestore, currency]);

    // Find all active plans for the user (membership and service)
    let activeMembershipPlans: any[] = [];
    let activeServicePlans: any[] = [];
    if (userDoc && Array.isArray(userDoc.plans)) {
        activeMembershipPlans = userDoc.plans.filter((p: any) => String(p.category || '').toLowerCase() === 'membership');
        activeServicePlans = userDoc.plans.filter((p: any) => String(p.category || '').toLowerCase() === 'service');
    }

    // Set currency based on citizenship in user profile
    useEffect(() => {
        if (userDoc && userDoc.citizenship) {
            if (userDoc.citizenship === 'India') {
                setCurrency('INR');
            } else if (userDoc.citizenship === 'USA') {
                setCurrency('USD');
            }
        }
        // After Stripe payment, redirect to latest invoice if redirected with ?success=1
        if (typeof window !== 'undefined' && window.location.search.includes('success=1') && user?.uid) {
            // Only run this logic once per page load
            const url = new URL(window.location.href);
            url.searchParams.delete('success');
            window.history.replaceState({}, document.title, url.pathname + url.search);
            (async () => {
                try {
                    // Fetch latest invoice for this user from new endpoint
                    const res = await fetch(`/api/invoice-latest?userId=${user.uid}`);
                    const data = await res.json();
                    if (data && data.invoiceId) {
                        window.location.replace(`/invoice/${data.invoiceId}`);
                    }
                } catch {
                    // fallback: do nothing, user stays on billing page
                }
            })();
        }
    }, [userDoc, user]);

    // Helper to detect if user is Indian (simple: currency === 'inr')
    const isIndian = currency === 'INR';

    // Membership status banner (robust, type-safe, matches dashboard logic)
    const hasMembership = activeMembershipPlans.length > 0
        || (userDoc && typeof userDoc.planType === 'string' && userDoc.planType.toLowerCase().includes('membership'))
        || (userDoc && userDoc.activePlan && Array.isArray(userDoc.plans) && userDoc.plans.some((p: any) => (p.planId === userDoc.activePlan || p.id === userDoc.activePlan) && String(p.category || '').toLowerCase() === 'membership'));

    if (isUserLoading || isUserDocLoading) {
        return <div className="p-8 text-center text-lg">Loading user info...</div>;
    }

    return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:gap-6 gap-2">
            <div className="flex gap-2 items-center">
                <span className="font-semibold">Currency:</span>
                <span className="px-3 py-1 rounded border bg-blue-500 text-white">{currency}</span>
            </div>
            <span className="text-xs text-muted-foreground">Currency is set based on your citizenship in profile.</span>
        </div>

        <div className={`rounded-lg p-4 mb-8 text-center font-semibold ${hasMembership ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-yellow-50 text-yellow-700 border border-yellow-200'}`}>
            {hasMembership
                ? '✅ You have Lifetime Membership. You can now purchase any plan.'
                : '🔒 Purchase Lifetime Membership to unlock all other plans.'}
        </div>

        <div className="flex flex-col items-center justify-center">
            {/* Membership Card(s) from seed plans - hide if user has membership */}
            {!hasMembership && membershipPlans.length > 0 && (
                <div className="w-full mb-12">
                    <h2 className="text-2xl font-bold text-center mb-8">Membership Plans</h2>
                    <div className="flex flex-wrap justify-center gap-6">
                        {membershipPlans.map((plan: any) => (
                            <Card key={plan.id} className="border-2 border-blue-500 shadow-xl hover:shadow-2xl transition-all duration-300 w-80 min-h-[500px] flex flex-col bg-card">
                                <CardHeader className="text-center pb-4">
                                    <CardTitle className="text-xl font-bold text-primary">{plan.name}</CardTitle>
                                </CardHeader>
                                <CardContent className="flex flex-col flex-grow">
                                    <div className="text-center mb-4">
                                        <div className="font-bold text-lg mb-2 text-gray-700">Permanent Membership</div>
                                        <div className="text-primary font-bold text-3xl mb-3">
                                            {plan.currency.toUpperCase() === 'INR' ? `₹${plan.price}` : `$${plan.price}`} 
                                            <span className="text-sm font-normal block text-gray-600">one-time payment</span>
                                        </div>
                                    </div>
                                    <ul className="text-sm mb-6 list-disc pl-5 text-left space-y-2 flex-grow">
                                        {plan.features && plan.features.map((f: string, i: number) => <li key={i} className="leading-relaxed">{f}</li>)}
                                    </ul>
                                    <div className="text-xs text-muted-foreground mb-4 text-center">{plan.description}</div>
                                    <div className="mt-auto">
                                        <CheckoutPaymentForm
                                            selectedPlan={{
                                                id: plan.id,
                                                name: plan.name,
                                                price: plan.price,
                                                currency: plan.currency
                                            }}
                                            onSuccess={async (paymentResult: any) => {
                                                const res = await fetch('/api/generate-invoice', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({
                                                        userId: user?.uid,
                                                        plan: plan,
                                                        payment: paymentResult
                                                    })
                                                });
                                                const invoiceData = await res.json();
                                                setInvoice(invoiceData);
                                            }}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Service Plans (dashboard style, show all active) */}
            <div className="w-full">
                <h2 className="text-2xl font-bold text-center mb-8">Service Plans</h2>
                <div className="flex flex-wrap justify-center gap-6">
                    {isServicePlansLoading ? (
                        <div className="text-muted-foreground text-lg py-8">Loading service plans...</div>
                    ) : servicePlans.length === 0 ? (
                        <div className="text-muted-foreground text-lg py-8">No service plans available.</div>
                    ) : servicePlans.map((plan: any) => {
                        const isLocked = !hasMembership;
                        // Check if this plan is in user's active service plans
                        const planId = (plan.id || plan.planId || '').toString().toLowerCase();
                        const planName = (plan.name || '').toString().trim().toLowerCase();
                        // Check if this plan is the user's active plan by id or name
                        const isActive = (
                            (userDoc && userDoc.activePlan && (
                                userDoc.activePlan.toString().toLowerCase() === planId ||
                                userDoc.activePlan.toString().trim().toLowerCase() === planName
                            ))
                            || activeServicePlans.some((p: any) => {
                                const userPlanId = (p.planId || p.id || '').toString().toLowerCase();
                                const userPlanName = (p.name || '').toString().trim().toLowerCase();
                                return (
                                    (planId && userPlanId && planId === userPlanId) ||
                                    (planName && userPlanName && planName === userPlanName)
                                );
                            })
                        );
                        return (
                            <div
                                key={plan.id || plan.__id}
                                className={`border-2 rounded-xl p-6 transition-all duration-300 shadow-lg hover:shadow-xl bg-card relative w-80 min-h-[450px] flex flex-col ${
                                    isLocked ? 'opacity-60 pointer-events-none border-gray-300' : 'border-blue-200 hover:border-blue-300'
                                } ${plan.popular ? 'ring-2 ring-yellow-400 transform hover:scale-105' : ''} ${isActive ? 'border-green-500' : ''}`}
                            >
                                {plan.popular && (
                                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                                        <span className="bg-yellow-400 text-yellow-900 font-bold text-sm px-4 py-1 rounded-full shadow-md">
                                            MOST POPULAR
                                        </span>
                                    </div>
                                )}
                                <div className="text-center mb-4">
                                    <div className="font-bold text-xl mb-2 text-primary">{plan.name}</div>
                                    {/* Hide price for Pay-As-You-Go plans and show appropriate label based on citizenship */}
                                    {!((plan.name?.toLowerCase().includes('payg') || plan.name?.toLowerCase().includes('pay as you go') || plan.id?.toLowerCase().includes('payg'))) ? (
                                        <div className="text-primary font-bold text-3xl mb-2">
                                            {plan.price && !isNaN(Number(plan.price)) ? (
                                                plan.currency?.toUpperCase() === 'INR' ? `₹${Number(plan.price).toLocaleString('en-IN')}` : `$${Number(plan.price).toLocaleString('en-US')}`
                                            ) : (
                                                <span className="text-gray-500">Postpaid Plan</span>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-sm text-gray-600 font-medium mb-2">
                                            {currency === 'INR' ? 'Wallet Based' : 'Postpaid'}
                                        </div>
                                    )}
                                    {plan.note && (
                                        <div className="text-sm text-blue-600 font-medium mb-3">{plan.note}</div>
                                    )}
                                </div>
                                <ul className="text-sm mb-4 list-none pl-0 space-y-2 flex-grow">
                                    {plan.features && plan.features.map((f: string, i: number) => (
                                        <li key={i} className="flex items-start">
                                            <span className="text-green-500 mr-2 mt-0.5">✓</span>
                                            <span className="leading-relaxed">{f}</span>
                                        </li>
                                    ))}
                                </ul>
                                <div className="text-xs text-gray-500 mb-4 text-center">{plan.description}</div>
                                {isActive ? (
                                    <button
                                        className="w-full bg-transparent text-green-700 py-3 px-4 rounded-lg font-semibold mt-auto cursor-not-allowed opacity-100 border border-green-500"
                                        disabled
                                    >
                                        Active (Service Plan)
                                    </button>
                                ) : isLocked ? (
                                    <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-xl text-blue-700 font-semibold text-sm p-4 text-center z-10">
                                        <span>Purchase Lifetime Membership to unlock service plans.</span>
                                    </div>
                                ) : (
                                    ((plan.billing === 'monthly-postpaid' || plan.billing === 'payg' || (plan.name && plan.name.trim().toLowerCase() === 'pay-as-you-go')) ? (
                                        <>
                                            <button
                                                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 font-semibold transition-colors duration-200 mt-auto"
                                                onClick={() => { setSelectedPaygPlan(plan); setShowPaygDialog(true); }}
                                            >
                                                Activate Now
                                            </button>
                                        </>
                                    ) : (
                                        // ...existing code for other plans...
                                        <button
                                            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 font-semibold transition-colors duration-200 mt-auto"
                                            onClick={() => {
                                                if (user?.email) {
                                                    localStorage.setItem('userEmail', user.email);
                                                }
                                                window.location.href = `/checkout?planId=${plan.id}`;
                                            }}
                                        >
                                            Get Started
                                        </button>
                                    ))
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
        {/* Pay-As-You-Go Activation Dialog (for both USD and INR postpaid/payg) */}
        <Dialog open={showPaygDialog} onOpenChange={(open) => { setShowPaygDialog(open); if (!open) setSelectedPaygPlan(null); }}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Pay-As-You-Go Terms & Consent</DialogTitle>
                </DialogHeader>
                <div className="max-h-48 overflow-y-auto text-xs text-gray-700 border p-2 rounded mb-2">
                    <strong>7. Fees, Billing, Notices and Disputes</strong>
                            {currency === 'INR' ? (
                                <>
                                    <div>Unless otherwise agreed in a separate written agreement, FindZob's standard fees for INR Pay As You Go are as follows:</div>
                                    <ul className="list-disc pl-4">
                                        <li>Onboarding fee: ₹500, payable at the commencement of the first onboarding session during which User's resume and application materials are curated. The Onboarding fee is non-refundable.</li>
                                        <li>Per-application fee: ₹5 will be instantly debited from your wallet for each job application you submit. This fee is non-refundable.</li>
                                    </ul>
                                    <div className="mt-2"><strong>7.2 Wallet Payment</strong></div>
                                    <div>All Pay As You Go (India) users must top up their wallet in advance. Each application will instantly deduct ₹5 from your wallet balance. If your wallet balance is insufficient, you will not be able to apply for jobs. No monthly invoice will be generated; all payments are per-application and non-refundable.</div>
                                    <div className="mt-2"><strong>7.3 Notices and Billing Contact</strong></div>
                                    <div>All billing questions, notices, and legal communications may be sent to: <a href="mailto:contact@findzob.com">contact@findzob.com</a> or to FindZob at the following business address:</div>
                                    <div>266 Telluride Dr Georgetown, TX 78626</div>
                                    <div className="mt-2"><strong>7.4 Disputes</strong></div>
                                    <div>User must notify FindZob in writing of any dispute with a wallet debit within thirty (30) days of the transaction. FindZob and User agree to cooperate in good faith to resolve billing disputes. Failure to timely notify FindZob of a dispute shall be deemed acceptance of the transaction.</div>
                                </>
                            ) : (
                                <>
                                    <div>Unless otherwise agreed in a separate written agreement, FindZob's standard fees shall be as follows:</div>
                                    <ul className="list-disc pl-4">
                                        <li>Onboarding fee: Twenty Five dollars ($25.00), payable at the commencement of the first onboarding session during which User's resume and application materials are curated. The Onboarding fee is non-refundable.</li>
                                        <li>Per-application fee: Two dollars ($2.00) per application submitted on User's behalf ("Per-Application Fee"). Per-Application Fees are refundable only if User requests withdrawal of a submitted application within seventy-two (72) hours of submission; otherwise Per-Application Fees are non-refundable.</li>
                                    </ul>
                                    <div className="mt-2"><strong>7.2 Invoicing and Payment</strong></div>
                                    <div>Fees, where applicable, will be invoiced to User and are due according to the terms specified on the invoice (commonly Net 15 or Net 30). Payments may be collected by credit card, ACH, or other methods specified by FindZob.</div>
                                    <div className="mt-2"><strong>7.3 Notices and Billing Contact</strong></div>
                                    <div>All billing questions, notices, and legal communications may be sent to: <a href="mailto:contact@findzob.com">contact@findzob.com</a> or to FindZob at the following business address:</div>
                                    <div>266 Telluride Dr Georgetown, TX 78626</div>
                                    <div className="mt-2"><strong>7.4 Disputes</strong></div>
                                    <div>User must notify FindZob in writing of any dispute with an invoice or charge within thirty (30) days of the invoice date. FindZob and User agree to cooperate in good faith to resolve billing disputes. Failure to timely notify FindZob of a dispute shall be deemed acceptance of the invoice.</div>
                                </>
                            )}
                            <div className="mt-2"><strong>Consent</strong></div>
                            {currency === 'INR' ? (
                                <div>
                                    By activating Pay-As-You-Go (India), you agree to use the <strong>Wallet</strong> payment method. ₹5 will be debited from your wallet for each application you submit. You must top up your wallet in advance to apply for jobs. If your wallet balance is insufficient, you will not be able to apply. No monthly invoice will be generated; all payments are instant and per-application.
                                </div>
                            ) : (
                                <div>
                                    By activating Pay-As-You-Go, you agree to receive a monthly invoice for all applications made on your behalf, and to pay the invoice within the specified terms. Only one invoice will be generated per month, and the amount will be updated based on your application activity. Unpaid invoices may result in suspension of services.
                                </div>
                            )}
                </div>
                <div className="flex items-center space-x-2 mt-2">
                    <Checkbox id="payg-consent" checked={paygConsent} onCheckedChange={checked => setPaygConsent(checked === true)} />
                    <label htmlFor="payg-consent" className="text-sm">I have read and agree to the terms and conditions above.</label>
                </div>
                <DialogFooter>
                    <button
                        className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
                        disabled={!paygConsent || paygLoading}
                        onClick={async () => {
                            setPaygLoading(true);
                            setPaygSuccess(false);
                            if (!user?.uid || !selectedPaygPlan) return;
                            const res = await fetch('/api/activate-plan', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    userId: user.uid,
                                    planId: selectedPaygPlan.id,
                                    plan: selectedPaygPlan,
                                    paymentMethod: 'cash'
                                })
                            });
                            setPaygLoading(false);
                            if (res.ok) {
                                setPaygSuccess(true);
                                setTimeout(() => { setShowPaygDialog(false); setSelectedPaygPlan(null); router.refresh(); }, 1200);
                            }
                        }}
                    >
                        {paygLoading ? 'Activating...' : paygSuccess ? 'Activated!' : 'Confirm & Activate'}
                    </button>
                    <DialogClose asChild>
                        <button className="ml-2 px-4 py-2 rounded border">Cancel</button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
    );
}