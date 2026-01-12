'use client';

import { Suspense, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
// using inline brand SVGs for Facebook and Apple buttons
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, FacebookAuthProvider, OAuthProvider, updateProfile, User } from 'firebase/auth';
import { useAuth, useFirestore, useUser } from '@/firebase';
import { doc, setDoc, collection } from 'firebase/firestore';
import { isAdminEmail } from '@/lib/admin';
import { useRouter, useSearchParams } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect } from 'react';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

function SignupPageContent() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [showWelcomeModal, setShowWelcomeModal] = useState(false);

    useEffect(() => {
      if (!isUserLoading && user) {
        router.push('/dashboard');
      }
    }, [user, isUserLoading, router]);

    const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

    // Read plan query param set from the landing page (e.g. /signup?plan=pro)
    const searchParams = useSearchParams();
    const urlPlan = searchParams?.get('plan') || null;

    // Map URL plan ids to canonical subscription plan names used in the app
        const planIdToCanonicalName: Record<string, string> = {
            lifetime: 'Lifetime Membership',
            payg: 'Pay-As-You-Go',
            pro_month: 'Pro (One Month)',
            elite: 'Elite Add-Ons',
            starter: 'Free',
        };

        // Set the order: Lifetime Membership, Pay-As-You-Go, Pro (One Month), Elite Add-Ons
        const planOrder = ['lifetime', 'payg', 'pro_month', 'elite'];

        const initialPlanName = urlPlan ? (planIdToCanonicalName[urlPlan] ?? 'Free') : 'Free';

    const createInitialUserDocument = async (user: User, name?: string, planName?: string, planId?: string | null) => {
        const userRef = doc(firestore, 'users', user.uid);
        const isAdmin = isAdminEmail(user.email?.toLowerCase());

        try {
                    await setDoc(userRef, {
                        email: user.email,
                        name: name || user.displayName || '',
                        photoURL: user.photoURL || '',
                        profileCompleted: false,
                        role: 'user',
                        assignedEmployeeId: null,
                        subscription: {
                            plan: planName || 'Free',
                            status: 'active',
                            validUntil: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
                        },                // store a machine-friendly plan id (e.g. 'payg', 'starter', 'pro') so server logic
                // and feature gates can consistently check the user's plan
                planType: planId || (planName ? planName.toLowerCase() : 'free'),
                isAdmin: isAdmin,
            }, { merge: true });
            // indicate success
            return true;
        } catch (err: any) {
            console.error('createInitialUserDocument set error', err, { uid: user.uid, email: user.email });
            toast({
                variant: 'destructive',
                title: 'Could not create user record',
                description: `${err?.message || 'Unknown error'}${err?.code ? ` (${err.code})` : ''}`,
            });
            // If write is rejected by security rules, we fail gracefully — user can still sign in.
            // Return false so caller can decide how to handle it.
            return false;
        }
    }

  async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
        setIsLoading(true);
        const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
            await updateProfile(userCredential.user, { displayName: values.name });
      
    const created = await createInitialUserDocument(userCredential.user, values.name, initialPlanName, urlPlan);
      if (!created) {
          // The record failed to be created (permission issue or other); log for debugging.
          console.warn('User record creation failed for uid:', userCredential.user.uid, userCredential.user.email);
      }
            // If the signup selected the Starter onboarding plan, notify employees by
            // creating a pendingProfiles entry so employee users can process onboarding.
            try {
                const planId = urlPlan;
                if (planId === 'starter' && firestore) {
                    const pendingRef = doc(firestore, 'pendingProfiles', userCredential.user.uid);
                    await setDoc(pendingRef, {
                        userId: userCredential.user.uid,
                        email: userCredential.user.email,
                        name: values.name || userCredential.user.displayName || '',
                        createdAt: new Date().toISOString(),
                        status: 'pending',
                        plan: 'Free',
                    }, { merge: true });
                }
            } catch (e) {
                console.warn('Failed to create pendingProfiles entry', e);
            }
            // After signup, route admin to /admin immediately; otherwise show a welcome modal
            try {
                await userCredential.user.getIdToken(true);
                const idTokenResult = await userCredential.user.getIdTokenResult();
                const isClaimAdmin = Boolean(idTokenResult.claims?.admin === true);
                const isAdmin = isAdminEmail(userCredential.user.email?.toLowerCase());
                if (isClaimAdmin || isAdmin) {
                    router.push('/admin');
                } else {
                    // Show a lightweight welcome modal prompting the user to complete their profile
                    setShowWelcomeModal(true);
                }
            } catch (err) {
                const isAdmin = isAdminEmail(userCredential.user.email?.toLowerCase());
                if (isAdmin) router.push('/admin'); else setShowWelcomeModal(true);
            } finally {
                setIsLoading(false);
            }
      
    } catch (error: any)      {
        toast({
            variant: 'destructive',
            title: 'Sign-up Failed',
            description: error.message,
        });
        setIsLoading(false);
        }
    }

    const handleSocialLogin = async (provider: 'google' | 'facebook' | 'apple') => {
        setIsLoading(true);
        try {
            let authProvider;
            if (provider === 'google') {
                authProvider = new GoogleAuthProvider();
            } else if (provider === 'facebook') {
                authProvider = new FacebookAuthProvider();
            } else {
                authProvider = new OAuthProvider('apple.com');
            }
            const result = await signInWithPopup(auth, authProvider);
                                            const created = await createInitialUserDocument(result.user, undefined, initialPlanName, urlPlan);
                            // On social signup, redirect same as above logic
                            try {
                                await result.user.getIdToken(true);
                                const idTokenResult = await result.user.getIdTokenResult();
                                const isClaimAdmin = Boolean(idTokenResult.claims?.admin === true);
                                const isAdmin = isAdminEmail(result.user.email?.toLowerCase());
                                if (isClaimAdmin || isAdmin) {
                                    router.push('/admin');
                                } else {
                                    setShowWelcomeModal(true);
                                }
                            } catch (err) {
                                const isAdmin = isAdminEmail(result.user.email?.toLowerCase());
                                if (isAdmin) router.push('/admin'); else setShowWelcomeModal(true);
                            } finally {
                                setIsLoading(false);
                            }

        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Social Sign-up Failed',
                description: error.message,
            });
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4 md:p-6 dark:bg-[#0a0a0a]">
            <Card className="w-full max-w-md mx-auto shadow-xl rounded-2xl border-0 bg-white dark:bg-[#18181b]">
                <CardHeader className="flex flex-col items-center gap-2 pb-2 px-4 md:px-6 pt-6 md:pt-8">
                    <Image 
                        src="/logo.png" 
                        alt="Findzob Logo" 
                        width={48} 
                        height={48} 
                        className="mb-2 rounded-full shadow" 
                        style={{objectFit:'contain'}} 
                    />
                    <CardTitle className="text-xl md:text-2xl font-extrabold tracking-tight text-blue-900 dark:text-white text-center">
                        Create your FindZob account
                    </CardTitle>
                    <CardDescription className="text-sm md:text-base text-gray-500 dark:text-gray-300 text-center">
                        Join FindZob to supercharge your job search.
                    </CardDescription>
                </CardHeader>
                
                <CardContent className="px-4 md:px-6 pb-6 md:pb-8">
                    {/* Social Login Buttons - Stack on mobile */}
                    <div className="flex flex-col sm:grid sm:grid-cols-3 gap-3 mb-6">
                        <Button 
                            variant="outline" 
                            onClick={() => handleSocialLogin('google')}
                            className="flex items-center justify-center h-11"
                            disabled={isLoading}
                        >
                            <svg role="img" viewBox="0 0 24 24" className="mr-2 h-5 w-5 flex-shrink-0" style={{display: 'block'}} xmlns="http://www.w3.org/2000/svg" aria-hidden>
                              <path fill="#4285F4" d="M23.64 12.2c0-.76-.07-1.49-.2-2.2H12v4.16h6.35c-.27 1.41-1.08 2.6-2.3 3.4v2.82h3.72c2.17-2 3.43-4.93 3.43-8.18z"/>
                              <path fill="#34A853" d="M12 24c2.97 0 5.47-0.98 7.29-2.66l-3.72-2.82c-1.03.69-2.35 1.1-3.57 1.1-2.74 0-5.06-1.85-5.89-4.33H2.21v2.72C3.99 21.74 7.78 24 12 24z"/>
                              <path fill="#FBBC05" d="M6.11 14.29c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.39H2.21C1.44 8.72 1 10.3 1 12s.44 3.28 1.21 4.61l3.9-2.32z"/>
                              <path fill="#EA4335" d="M12 4.77c1.62 0 3.07.56 4.21 1.65l3.15-3.15C17.45 1.46 14.97.5 12 .5 7.78.5 3.99 2.76 2.21 5.89l3.9 2.72C6.94 6.62 9.26 4.77 12 4.77z"/>
                            </svg>
                            <span className="truncate">Google</span>
                        </Button>
                        
                        <Button 
                            variant="outline" 
                            onClick={() => handleSocialLogin('facebook')} 
                            className="flex items-center justify-center h-11"
                            disabled={isLoading}
                        >
                            <svg viewBox="0 0 48 48" className="mr-2 h-5 w-5 flex-shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                                <rect width="48" height="48" rx="10" fill="#1877F2"/>
                                <path d="M32 25h-4v9h-5v-9h-3v-4h3v-2.5C23 15.5 24.5 14 27 14h3v4h-2c-.7 0-1 .3-1 1v2h3.5l-.5 4z" fill="#fff"/>
                            </svg>
                            <span className="truncate">Facebook</span>
                        </Button>
                        
                        <Button 
                            variant="outline" 
                            onClick={() => handleSocialLogin('apple')}
                            className="flex items-center justify-center h-11"
                            disabled={isLoading}
                        >
                            <svg role="img" viewBox="0 0 16 16" className="mr-2 h-5 w-5 flex-shrink-0" style={{display: 'block'}} xmlns="http://www.w3.org/2000/svg" aria-hidden>
                                <g clipPath="url(#clip0_apple_logo)">
                                    <path d="M8.08803 4.3535C8.74395 4.3535 9.56615 3.91006 10.0558 3.31881C10.4992 2.78299 10.8226 2.03469 10.8226 1.28639C10.8226 1.18477 10.8133 1.08314 10.7948 1C10.065 1.02771 9.18738 1.48963 8.6608 2.10859C8.24508 2.57975 7.86631 3.31881 7.86631 4.07635C7.86631 4.18721 7.88479 4.29807 7.89402 4.33502C7.94021 4.34426 8.01412 4.3535 8.08803 4.3535ZM5.77846 15.5318C6.67457 15.5318 7.07182 14.9313 8.18965 14.9313C9.32596 14.9313 9.57539 15.5133 10.5731 15.5133C11.5524 15.5133 12.2083 14.608 12.8273 13.7211C13.5201 12.7049 13.8065 11.7072 13.825 11.661C13.7603 11.6425 11.885 10.8757 11.885 8.7232C11.885 6.85707 13.3631 6.01639 13.4462 5.95172C12.467 4.5475 10.9796 4.51055 10.5731 4.51055C9.47377 4.51055 8.57766 5.1757 8.01412 5.1757C7.4044 5.1757 6.60066 4.5475 5.64912 4.5475C3.83842 4.5475 2 6.0441 2 8.87101C2 10.6263 2.68363 12.4832 3.52432 13.6842C4.2449 14.7004 4.87311 15.5318 5.77846 15.5318Z" fill="currentColor"></path>
                                </g>
                                <defs>
                                    <clipPath id="clip0_apple_logo">
                                        <rect width="16" height="16"></rect>
                                    </clipPath>
                                </defs>
                            </svg>
                            <span className="truncate">Apple</span>
                        </Button>
                    </div>
                    
                    {/* Divider */}
                    <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground text-xs">Or continue with</span>
                        </div>
                    </div>
                    
                    {/* Email/Password Form */}
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-sm md:text-base">Name</FormLabel>
                                        <FormControl>
                                            <Input 
                                                placeholder="John Doe" 
                                                {...field} 
                                                className="h-11 md:h-10 text-sm md:text-base"
                                                disabled={isLoading}
                                            />
                                        </FormControl>
                                        <FormMessage className="text-xs" />
                                    </FormItem>
                                )}
                            />
                            
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-sm md:text-base">Email</FormLabel>
                                        <FormControl>
                                            <Input 
                                                placeholder="name@example.com" 
                                                {...field} 
                                                className="h-11 md:h-10 text-sm md:text-base"
                                                disabled={isLoading}
                                            />
                                        </FormControl>
                                        <FormMessage className="text-xs" />
                                    </FormItem>
                                )}
                            />
                            
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-sm md:text-base">Password</FormLabel>
                                        <FormControl>
                                            <Input 
                                                type="password" 
                                                placeholder="Password" 
                                                {...field} 
                                                className="h-11 md:h-10 text-sm md:text-base"
                                                disabled={isLoading}
                                            />
                                        </FormControl>
                                        <FormMessage className="text-xs" />
                                    </FormItem>
                                )}
                            />
                            
                            <Button 
                                type="submit" 
                                className="w-full h-11 md:h-10 text-sm md:text-base font-medium" 
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <div className="flex items-center justify-center">
                                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                                        Creating account...
                                    </div>
                                ) : (
                                    'Sign Up'
                                )}
                            </Button>
                        </form>
                    </Form>
                    
                    {/* Welcome modal shown after successful signup for non-admin users */}
                    <Dialog open={showWelcomeModal} onOpenChange={(open) => setShowWelcomeModal(open)}>
                        <DialogContent className="sm:max-w-md mx-4">
                            <DialogHeader>
                                <DialogTitle className="text-lg md:text-xl text-center">Welcome to FindZob!</DialogTitle>
                                <DialogDescription className="text-sm md:text-base text-center">
                                    Thanks for signing up — complete your profile to unlock all FindZob features.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="flex flex-col sm:flex-row gap-3 mt-4">
                                <Button 
                                    onClick={() => { setShowWelcomeModal(false); router.push('/dashboard/profile'); }}
                                    className="flex-1 h-11"
                                >
                                    Complete Profile
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    onClick={() => { setShowWelcomeModal(false); router.push('/dashboard'); }}
                                    className="flex-1 h-11"
                                >
                                    Go to Dashboard
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                    
                    {/* Login link */}
                    <p className="mt-6 text-center text-sm text-muted-foreground">
                        Already have an account?{' '}
                        <Link 
                            href="/login" 
                            className="font-medium text-primary hover:underline transition-colors"
                        >
                            Log in
                        </Link>
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

export default function SignupPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center bg-background p-4 dark:bg-[#0a0a0a]">
                <div className="flex items-center justify-center">
                    <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                    <span className="ml-3 text-lg">Loading...</span>
                </div>
            </div>
        }>
            <SignupPageContent />
        </Suspense>
    );
}