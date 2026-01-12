// "use client";

// import { Button } from '@/components/ui/button';
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
// import { Input } from '@/components/ui/input';
// import { useToast } from '@/hooks/use-toast';
// import { zodResolver } from '@hookform/resolvers/zod';
// import { useForm } from 'react-hook-form';
// import { z } from 'zod';
// // using inline brand SVGs for Facebook and Apple buttons
// import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, FacebookAuthProvider, OAuthProvider, UserCredential, User } from 'firebase/auth';
// import { useState } from 'react';
// import { useAuth, useFirestore, useUser } from '@/firebase';
// import { isAdminEmail } from '@/lib/admin';
// import { useRouter } from 'next/navigation';
// import Link from 'next/link';
// import { doc, setDoc, getDoc } from 'firebase/firestore';
// import { useEffect } from 'react';

// const formSchema = z.object({
//   email: z.string().email({ message: 'Invalid email address.' }),
//   password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
// });

// export default function LoginPage() {
//   const auth = useAuth();
//   const firestore = useFirestore();
//   const { user, isUserLoading } = useUser();
//   const router = useRouter();
//   const { toast } = useToast();

//   useEffect(() => {
//     if (!isUserLoading && user) {
//       router.push('/dashboard');
//     }
//   }, [user, isUserLoading, router]);

//   const form = useForm<z.infer<typeof formSchema>>({
//     resolver: zodResolver(formSchema),
//     defaultValues: {
//       email: '',
//       password: '',
//     },
//   });
//   const [isLoading, setIsLoading] = useState(false);
//   const [showLoadingModal, setShowLoadingModal] = useState(false);
//   // Hide modal after 1 minute if still loading
//   useEffect(() => {
//     let timer: NodeJS.Timeout | undefined;
//     if (isLoading) {
//       setShowLoadingModal(true);
//       timer = setTimeout(() => {
//         setShowLoadingModal(false);
//       }, 60000); // 1 minute
//     } else {
//       setShowLoadingModal(false);
//     }
//     return () => {
//       if (timer) clearTimeout(timer);
//     };
//   }, [isLoading]);
  
//   const handleRedirect = async (user: User) => {
//     // Check if middleware provided a returnTo path (original requested path)
//     // Prefer returning the user to that path if their role allows it.
//     const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
//     const returnToRaw = params.get('returnTo') || undefined;
//     const returnTo = returnToRaw ? decodeURIComponent(returnToRaw) : undefined;
//     try {
//       // First try authoritative server-side role check (uses session cookie created on sign-in)
//       // Server-side role verification endpoint has been removed. Fall back to
//       // Firestore-based user document and token-claims checks below.

//       // Fallback path: if server verify-role isn't available, use Firestore doc + token claims
//       const userDocRef = doc(firestore, 'users', user.uid);
//       const userDoc = await getDoc(userDocRef);
//       const role = userDoc.exists() ? (userDoc.data().role || (userDoc.data().isAdmin ? 'admin' : 'user')) : 'user';

//       // If a returnTo was supplied, validate that the user's role allows it
//       if (returnTo) {
//         if (returnTo.startsWith('/admin') && (role === 'admin' || isAdminEmail(user.email?.toLowerCase()))) { router.push(returnTo); return; }
//         if (returnTo.startsWith('/employee/dashboard') && role === 'employee') { router.push(returnTo); return; }
//         if (returnTo.startsWith('/dashboard') && role !== 'admin' && role !== 'employee') { router.push(returnTo); return; }
//       }

//       if (role === 'admin' || isAdminEmail(user.email?.toLowerCase())) { router.push('/admin'); return; }
//       if (role === 'employee') { router.push('/employee/dashboard'); return; }

//       // Fallback: check custom claim
//       await user.getIdToken(true);
//       const idTokenResult = await user.getIdTokenResult();
//       const isClaimAdmin = Boolean(idTokenResult.claims?.admin === true);
//       if (isClaimAdmin) { router.push('/admin'); return; }

//   // Check for profile completion for regular users. If incomplete, redirect to dashboard and
//   // trigger the dashboard to prompt the user to complete their profile via query param.
//   if (userDoc.exists() && !userDoc.data().profileCompleted) { router.push('/dashboard?promptCompleteProfile=1'); }
//   else { router.push('/dashboard'); }
//     } catch (err) {
//       console.error('handleRedirect error', err);
//       router.push('/dashboard');
//     }
//   }

//   async function onSubmit(values: z.infer<typeof formSchema>) {
//   setIsLoading(true);
//     try {
//       const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
//       const signedInUser = userCredential.user;

//       // Create or update the Firestore user document (awaited). Handle permission errors locally.
//       try {
//         const userRef = doc(firestore, 'users', signedInUser.uid);
//         const existing = await getDoc(userRef);
//         const isAdmin = isAdminEmail(signedInUser.email?.toLowerCase());
//         const payload: any = {
//           email: signedInUser.email,
//           name: signedInUser.displayName || '',
//           photoURL: signedInUser.photoURL || '',
//           isAdmin: isAdmin,
//         };
//         // Only set profileCompleted/subscription when creating the user for the first time
//         if (!existing.exists()) {
//           payload.profileCompleted = false;
//           payload.subscription = {
//             plan: 'Free',
//             status: 'active',
//             validUntil: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
//           };
//         }
//         await setDoc(userRef, payload, { merge: true });
//       } catch (err) {
//         console.error('ensure user doc set error', err, { uid: signedInUser.uid, email: signedInUser.email });
//         toast({ variant: 'destructive', title: 'Could not create user record', description: `${(err as any)?.message || 'Unknown error'}${(err as any)?.code ? ` (${(err as any).code})` : ''}` });
//       }

//       // Create session cookie for server-side middleware (exchange idToken for session cookie)
//       try {
//         const idToken = await signedInUser.getIdToken(true); // force refresh
//         const resp = await fetch('/api/auth/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }) });
//         const json = await resp.json().catch(() => ({}));
//         if (!resp.ok || json?.ok === false) {
//           console.warn('Failed to create session cookie', json || 'no-json');
//           toast({ variant: 'destructive', title: 'Server sign-in failed', description: json?.error || json?.message || 'Could not create server session. Check server logs.' });
//           return; // don't redirect to protected pages if session cookie wasn't created
//         }
//       } catch (e) {
//         console.warn('Failed to create session cookie', e);
//         toast({ variant: 'destructive', title: 'Server sign-in failed', description: 'Could not create server session. Check console for details.' });
//         return;
//       }
//       await handleRedirect(signedInUser);
//     } catch (error: any) {
//       console.error('Email sign-in error', error);
//       toast({
//         variant: 'destructive',
//         title: 'Authentication Failed',
//         description: `${error?.message || 'Unknown error'}${error?.code ? ` (${error.code})` : ''}`,
//       });
//       setIsLoading(false);
//     }
//   }

//   const handleSocialLogin = async (provider: 'google' | 'facebook' | 'apple') => {
//   setIsLoading(true);
//     try {
//       let authProvider;
//       if (provider === 'google') {
//         authProvider = new GoogleAuthProvider();
//       } else if (provider === 'facebook') {
//         authProvider = new FacebookAuthProvider();
//       } else {
//         authProvider = new OAuthProvider('apple');
//       }
//       const result = await signInWithPopup(auth, authProvider);
      
//       const user = result.user;
//       // Create or update the user document for social login.
//       try {
//         const userRef = doc(firestore, 'users', user.uid);
//         const existing = await getDoc(userRef);
//         const isAdmin = isAdminEmail(user.email?.toLowerCase());
//         const payload: any = {
//           email: user.email,
//           name: user.displayName || '',
//           photoURL: user.photoURL || '',
//           isAdmin: isAdmin,
//         };
//         if (!existing.exists()) {
//           payload.profileCompleted = false;
//           payload.subscription = {
//             plan: 'Free',
//             status: 'active',
//             validUntil: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
//           };
//         }
//         await setDoc(userRef, payload, { merge: true });
//       } catch (err) {
//         console.error('social login set user doc error', err, { uid: user.uid, email: user.email });
//         toast({ variant: 'destructive', title: 'Could not create user record', description: `${(err as any)?.message || 'Unknown error'}${(err as any)?.code ? ` (${(err as any).code})` : ''}` });
//       }

//       // set session cookie for social login before redirecting so middleware
//       // and any protected-server checks see a valid session immediately.
//       try {
//         const idToken = await result.user.getIdToken(true);
//         const resp = await fetch('/api/auth/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }) });
//         const json = await resp.json().catch(() => ({}));
//         if (!resp.ok || json?.ok === false) {
//           console.warn('Failed to create session cookie for social login', json || 'no-json');
//           toast({ variant: 'destructive', title: 'Server sign-in failed', description: json?.error || json?.message || 'Could not create server session.' });
//           return;
//         }
//       } catch (e) {
//         console.warn('Failed to create session cookie for social login', e);
//         toast({ variant: 'destructive', title: 'Server sign-in failed', description: 'Could not create server session.' });
//         return;
//       }

//       await handleRedirect(result.user);
//     } catch (error: any) {
//       console.error('Social sign-in error', error);
//       toast({
//         variant: 'destructive',
//         title: 'Social Login Failed',
//         description: `${error?.message || 'Unknown error'}${error?.code ? ` (${error.code})` : ''}`,
//       });
//       setIsLoading(false);
//     }
//   };

//   return (
//     <div className="flex min-h-screen items-center justify-center bg-background p-4 md:p-6 dark:bg-[#0a0a0a]">
//       {/* Login Loading Modal */}
//       {showLoadingModal && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
//           <div className="bg-white dark:bg-[#18181b] rounded-lg shadow-lg p-6 md:p-8 flex flex-col items-center w-full max-w-xs md:max-w-sm">
//             <div className="animate-spin h-8 w-8 mb-4 border-4 border-blue-500 border-t-transparent rounded-full"></div>
//             <div className="font-semibold text-lg mb-2 text-center">Logging you in...</div>
//             <div className="text-sm text-gray-500 dark:text-gray-300 text-center">Please wait while we complete your login.</div>
//           </div>
//         </div>
//       )}
      
//       <Card className="w-full max-w-md mx-auto shadow-xl rounded-2xl border-0 bg-white dark:bg-[#18181b]">
//         <CardHeader className="text-center px-4 md:px-6 pt-6 md:pt-8 pb-4">
//           <div className="flex flex-col items-center gap-2">
//             <img 
//               src="/logo.png" 
//               alt="Findzob Logo" 
//               width={48} 
//               height={48} 
//               className="mb-2 rounded-full shadow"
//               style={{objectFit:'contain'}} 
//             />
//             <CardTitle className="text-xl md:text-2xl font-extrabold tracking-tight text-blue-900 dark:text-white">
//               Welcome Back
//             </CardTitle>
//             <CardDescription className="text-sm md:text-base text-gray-500 dark:text-gray-300">
//               Log in to your FindZob account
//             </CardDescription>
//           </div>
//         </CardHeader>
        
//         <CardContent className="px-4 md:px-6 pb-6 md:pb-8">
//           {/* Social Login Buttons - Stack on mobile */}
//           <div className="flex flex-col sm:grid sm:grid-cols-3 gap-3 mb-6">
//             <Button 
//               variant="outline" 
//               onClick={() => handleSocialLogin('google')}
//               className="flex items-center justify-center h-11"
//               disabled={isLoading}
//             >
//               <svg role="img" viewBox="0 0 24 24" className="mr-2 h-5 w-5 flex-shrink-0" style={{display: 'block'}} xmlns="http://www.w3.org/2000/svg" aria-hidden>
//                 <path fill="#4285F4" d="M23.64 12.2c0-.76-.07-1.49-.2-2.2H12v4.16h6.35c-.27 1.41-1.08 2.6-2.3 3.4v2.82h3.72c2.17-2 3.43-4.93 3.43-8.18z"/>
//                 <path fill="#34A853" d="M12 24c2.97 0 5.47-0.98 7.29-2.66l-3.72-2.82c-1.03.69-2.35 1.1-3.57 1.1-2.74 0-5.06-1.85-5.89-4.33H2.21v2.72C3.99 21.74 7.78 24 12 24z"/>
//                 <path fill="#FBBC05" d="M6.11 14.29c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.39H2.21C1.44 8.72 1 10.3 1 12s.44 3.28 1.21 4.61l3.9-2.32z"/>
//                 <path fill="#EA4335" d="M12 4.77c1.62 0 3.07.56 4.21 1.65l3.15-3.15C17.45 1.46 14.97.5 12 .5 7.78.5 3.99 2.76 2.21 5.89l3.9 2.72C6.94 6.62 9.26 4.77 12 4.77z"/>
//               </svg>
//               <span className="truncate">Google</span>
//             </Button>
            
//             <Button 
//               variant="outline" 
//               onClick={() => handleSocialLogin('facebook')}
//               className="flex items-center justify-center h-11"
//               disabled={isLoading}
//             >
//               <svg role="img" viewBox="0 0 24 24" className="mr-2 h-5 w-5 flex-shrink-0" style={{display: 'block'}} xmlns="http://www.w3.org/2000/svg" aria-hidden>
//                 <path fill="#1877F2" d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073c0 6.01 4.388 10.99 10.125 11.854v-8.385H7.078v-3.47h3.047V9.413c0-3.016 1.792-4.682 4.54-4.682 1.312 0 2.686.235 2.686.235v2.953h-1.513c-1.491 0-1.953.926-1.953 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.063 24 18.083 24 12.073z" />
//                 <path fill="#fff" d="M16.671 15.543l.532-3.47h-3.328v-2.25c0-.948.462-1.874 1.953-1.874h1.513V5.996s-1.374-.235-2.686-.235c-2.748 0-4.54 1.666-4.54 4.682v2.47H7.078v3.47h3.047v8.385h2.549v-8.385h2.003z" />
//               </svg>
//               <span className="truncate">Facebook</span>
//             </Button>
            
//             <Button 
//               variant="outline" 
//               onClick={() => handleSocialLogin('apple')}
//               className="flex items-center justify-center h-11"
//               disabled={isLoading}
//             >
//               <svg role="img" viewBox="0 0 16 16" className="mr-2 h-5 w-5 flex-shrink-0" style={{display: 'block'}} xmlns="http://www.w3.org/2000/svg" aria-hidden>
//                 <g clipPath="url(#clip0_apple_logo)">
//                   <path d="M8.08803 4.3535C8.74395 4.3535 9.56615 3.91006 10.0558 3.31881C10.4992 2.78299 10.8226 2.03469 10.8226 1.28639C10.8226 1.18477 10.8133 1.08314 10.7948 1C10.065 1.02771 9.18738 1.48963 8.6608 2.10859C8.24508 2.57975 7.86631 3.31881 7.86631 4.07635C7.86631 4.18721 7.88479 4.29807 7.89402 4.33502C7.94021 4.34426 8.01412 4.3535 8.08803 4.3535ZM5.77846 15.5318C6.67457 15.5318 7.07182 14.9313 8.18965 14.9313C9.32596 14.9313 9.57539 15.5133 10.5731 15.5133C11.5524 15.5133 12.2083 14.608 12.8273 13.7211C13.5201 12.7049 13.8065 11.7072 13.825 11.661C13.7603 11.6425 11.885 10.8757 11.885 8.7232C11.885 6.85707 13.3631 6.01639 13.4462 5.95172C12.467 4.5475 10.9796 4.51055 10.5731 4.51055C9.47377 4.51055 8.57766 5.1757 8.01412 5.1757C7.4044 5.1757 6.60066 4.5475 5.64912 4.5475C3.83842 4.5475 2 6.0441 2 8.87101C2 10.6263 2.68363 12.4832 3.52432 13.6842C4.2449 14.7004 4.87311 15.5318 5.77846 15.5318Z" fill="currentColor"></path>
//                 </g>
//                 <defs>
//                   <clipPath id="clip0_apple_logo">
//                     <rect width="16" height="16"></rect>
//                   </clipPath>
//                 </defs>
//               </svg>
//               <span className="truncate">Apple</span>
//             </Button>
//           </div>
          
//           {/* Divider */}
//           <div className="relative mb-6">
//             <div className="absolute inset-0 flex items-center">
//               <span className="w-full border-t" />
//             </div>
//             <div className="relative flex justify-center text-xs uppercase">
//               <span className="bg-background px-2 text-muted-foreground text-xs">Or continue with</span>
//             </div>
//           </div>
          
//           {/* Email/Password Form */}
//           <Form {...form}>
//             <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
//               <FormField
//                 control={form.control}
//                 name="email"
//                 render={({ field }) => (
//                   <FormItem>
//                     <FormLabel className="text-sm md:text-base">Email</FormLabel>
//                     <FormControl>
//                       <Input 
//                         placeholder="name@example.com" 
//                         {...field} 
//                         className="h-11 md:h-10 text-sm md:text-base"
//                         disabled={isLoading}
//                       />
//                     </FormControl>
//                     <FormMessage className="text-xs" />
//                   </FormItem>
//                 )}
//               />
              
//               <FormField
//                 control={form.control}
//                 name="password"
//                 render={({ field }) => (
//                   <FormItem>
//                     <FormLabel className="text-sm md:text-base">Password</FormLabel>
//                     <FormControl>
//                       <Input 
//                         type="password" 
//                         placeholder="Password" 
//                         {...field} 
//                         className="h-11 md:h-10 text-sm md:text-base"
//                         disabled={isLoading}
//                       />
//                     </FormControl>
//                     <FormMessage className="text-xs" />
//                   </FormItem>
//                 )}
//               />
              
//               <Button 
//                 type="submit" 
//                 className="w-full h-11 md:h-10 text-sm md:text-base font-medium" 
//                 disabled={isLoading}
//               >
//                 {isLoading ? (
//                   <div className="flex items-center justify-center">
//                     <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
//                     Logging in...
//                   </div>
//                 ) : (
//                   'Log In'
//                 )}
//               </Button>
//             </form>
//           </Form>
          
//           {/* Sign up link */}
//           <p className="mt-6 text-center text-sm text-muted-foreground">
//             Don't have an account?{' '}
//             <Link 
//               href="/signup" 
//               className="font-medium text-primary hover:underline transition-colors"
//             >
//               Sign up
//             </Link>
//           </p>
//         </CardContent>
//       </Card>
//     </div>
//   );
// }



"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
// using inline brand SVGs for Facebook and Apple buttons
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, FacebookAuthProvider, OAuthProvider, UserCredential, User } from 'firebase/auth';
import { useState } from 'react';
import { useAuth, useFirestore, useUser } from '@/firebase';
import { isAdminEmail } from '@/lib/admin';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useEffect } from 'react';

const formSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

export default function LoginPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    // If user is already logged in, redirect based on their role
    const redirectLoggedInUser = async () => {
      if (!isUserLoading && user) {
        try {
          const userDocRef = doc(firestore, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          const role = userDoc.exists() ? (userDoc.data().role || (userDoc.data().isAdmin ? 'admin' : 'user')) : 'user';
          
          if (role === 'admin' || isAdminEmail(user.email?.toLowerCase())) {
            router.push('/admin');
          } else if (role === 'employee') {
            router.push('/employee/dashboard');
          } else {
            router.push('/dashboard');
          }
        } catch (err) {
          console.error('Error checking user role for redirect:', err);
          router.push('/dashboard');
        }
      }
    };
    redirectLoggedInUser();
  }, [user, isUserLoading, router, firestore]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  
  // Hide modal after 1 minute if still loading
  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    if (isLoading) {
      setShowLoadingModal(true);
      timer = setTimeout(() => {
        setShowLoadingModal(false);
      }, 60000); // 1 minute
    } else {
      setShowLoadingModal(false);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isLoading]);
  
  const handleRedirect = async (user: User) => {
    // Check if middleware provided a returnTo path (original requested path)
    // Prefer returning the user to that path if their role allows it.
    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    const returnToRaw = params.get('returnTo') || undefined;
    const returnTo = returnToRaw ? decodeURIComponent(returnToRaw) : undefined;
    try {
      // First try authoritative server-side role check (uses session cookie created on sign-in)
      // Server-side role verification endpoint has been removed. Fall back to
      // Firestore-based user document and token-claims checks below.

      // Fallback path: if server verify-role isn't available, use Firestore doc + token claims
      const userDocRef = doc(firestore, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      const role = userDoc.exists() ? (userDoc.data().role || (userDoc.data().isAdmin ? 'admin' : 'user')) : 'user';

      // If a returnTo was supplied, validate that the user's role allows it
      if (returnTo) {
        if (returnTo.startsWith('/admin') && (role === 'admin' || isAdminEmail(user.email?.toLowerCase()))) { router.push(returnTo); return; }
        if (returnTo.startsWith('/employee/dashboard') && role === 'employee') { router.push(returnTo); return; }
        if (returnTo.startsWith('/dashboard') && role !== 'admin' && role !== 'employee') { router.push(returnTo); return; }
      }

      if (role === 'admin' || isAdminEmail(user.email?.toLowerCase())) { router.push('/admin'); return; }
      if (role === 'employee') { router.push('/employee/dashboard'); return; }

      // Fallback: check custom claim
      await user.getIdToken(true);
      const idTokenResult = await user.getIdTokenResult();
      const isClaimAdmin = Boolean(idTokenResult.claims?.admin === true);
      if (isClaimAdmin) { router.push('/admin'); return; }

  // Check for profile completion for regular users. If incomplete, redirect to dashboard and
  // trigger the dashboard to prompt the user to complete their profile via query param.
  if (userDoc.exists() && !userDoc.data().profileCompleted) { router.push('/dashboard?promptCompleteProfile=1'); }
  else { router.push('/dashboard'); }
    } catch (err) {
      console.error('handleRedirect error', err);
      router.push('/dashboard');
    }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
  setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      const signedInUser = userCredential.user;

      // Create or update the Firestore user document (awaited). Handle permission errors locally.
      try {
        const userRef = doc(firestore, 'users', signedInUser.uid);
        const existing = await getDoc(userRef);
        const isAdmin = isAdminEmail(signedInUser.email?.toLowerCase());
        const payload: any = {
          email: signedInUser.email,
          name: signedInUser.displayName || '',
          photoURL: signedInUser.photoURL || '',
          isAdmin: isAdmin,
        };
        // Only set profileCompleted/subscription when creating the user for the first time
        if (!existing.exists()) {
          payload.profileCompleted = false;
          payload.subscription = {
            plan: 'Free',
            status: 'active',
            validUntil: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
          };
        }
        await setDoc(userRef, payload, { merge: true });
      } catch (err) {
        console.error('ensure user doc set error', err, { uid: signedInUser.uid, email: signedInUser.email });
        toast({ variant: 'destructive', title: 'Could not create user record', description: `${(err as any)?.message || 'Unknown error'}${(err as any)?.code ? ` (${(err as any).code})` : ''}` });
      }

      // Create session cookie for server-side middleware (exchange idToken for session cookie)
      try {
        const idToken = await signedInUser.getIdToken(true); // force refresh
        const resp = await fetch('/api/auth/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }) });
        const json = await resp.json().catch(() => ({}));
        if (!resp.ok || json?.ok === false) {
          console.warn('Failed to create session cookie', json || 'no-json');
          toast({ variant: 'destructive', title: 'Server sign-in failed', description: json?.error || json?.message || 'Could not create server session. Check server logs.' });
          return; // don't redirect to protected pages if session cookie wasn't created
        }
      } catch (e) {
        console.warn('Failed to create session cookie', e);
        toast({ variant: 'destructive', title: 'Server sign-in failed', description: 'Could not create server session. Check console for details.' });
        return;
      }
      await handleRedirect(signedInUser);
    } catch (error: any) {
      console.error('Email sign-in error', error);
      toast({
        variant: 'destructive',
        title: 'Authentication Failed',
        description: `${error?.message || 'Unknown error'}${error?.code ? ` (${error.code})` : ''}`,
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
        authProvider = new OAuthProvider('apple');
      }
      const result = await signInWithPopup(auth, authProvider);
      
      const user = result.user;
      // Create or update the user document for social login.
      try {
        const userRef = doc(firestore, 'users', user.uid);
        const existing = await getDoc(userRef);
        const isAdmin = isAdminEmail(user.email?.toLowerCase());
        const payload: any = {
          email: user.email,
          name: user.displayName || '',
          photoURL: user.photoURL || '',
          isAdmin: isAdmin,
        };
        if (!existing.exists()) {
          payload.profileCompleted = false;
          payload.subscription = {
            plan: 'Free',
            status: 'active',
            validUntil: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
          };
        }
        await setDoc(userRef, payload, { merge: true });
      } catch (err) {
        console.error('social login set user doc error', err, { uid: user.uid, email: user.email });
        toast({ variant: 'destructive', title: 'Could not create user record', description: `${(err as any)?.message || 'Unknown error'}${(err as any)?.code ? ` (${(err as any).code})` : ''}` });
      }

      // set session cookie for social login before redirecting so middleware
      // and any protected-server checks see a valid session immediately.
      try {
        const idToken = await result.user.getIdToken(true);
        const resp = await fetch('/api/auth/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }) });
        const json = await resp.json().catch(() => ({}));
        if (!resp.ok || json?.ok === false) {
          console.warn('Failed to create session cookie for social login', json || 'no-json');
          toast({ variant: 'destructive', title: 'Server sign-in failed', description: json?.error || json?.message || 'Could not create server session.' });
          return;
        }
      } catch (e) {
        console.warn('Failed to create session cookie for social login', e);
        toast({ variant: 'destructive', title: 'Server sign-in failed', description: 'Could not create server session.' });
        return;
      }

      await handleRedirect(result.user);
    } catch (error: any) {
      console.error('Social sign-in error', error);
      toast({
        variant: 'destructive',
        title: 'Social Login Failed',
        description: `${error?.message || 'Unknown error'}${error?.code ? ` (${error.code})` : ''}`,
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 md:p-6 dark:bg-[#0a0a0a]">
      {/* Login Loading Modal */}
      {showLoadingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
          <div className="bg-white dark:bg-[#18181b] rounded-lg shadow-lg p-6 md:p-8 flex flex-col items-center w-full max-w-xs md:max-w-sm">
            <div className="animate-spin h-8 w-8 mb-4 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            <div className="font-semibold text-lg mb-2 text-center">Logging you in...</div>
            <div className="text-sm text-gray-500 dark:text-gray-300 text-center">Please wait while we complete your login.</div>
          </div>
        </div>
      )}
      
      <Card className="w-full max-w-md mx-auto shadow-xl rounded-2xl border-0 bg-white dark:bg-[#18181b]">
        <CardHeader className="text-center px-4 md:px-6 pt-6 md:pt-8 pb-4">
          <div className="flex flex-col items-center gap-2">
            <img 
              src="/logo.png" 
              alt="Findzob Logo" 
              width={48} 
              height={48} 
              className="mb-2 rounded-full shadow"
              style={{objectFit:'contain'}} 
            />
            <CardTitle className="text-xl md:text-2xl font-extrabold tracking-tight text-blue-900 dark:text-white">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-sm md:text-base text-gray-500 dark:text-gray-300">
              Log in to your FindZob account
            </CardDescription>
          </div>
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
              <svg role="img" viewBox="0 0 24 24" className="mr-2 h-5 w-5 flex-shrink-0" style={{display: 'block'}} xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <path fill="#1877F2" d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073c0 6.01 4.388 10.99 10.125 11.854v-8.385H7.078v-3.47h3.047V9.413c0-3.016 1.792-4.682 4.54-4.682 1.312 0 2.686.235 2.686.235v2.953h-1.513c-1.491 0-1.953.926-1.953 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.063 24 18.083 24 12.073z" />
                <path fill="#fff" d="M16.671 15.543l.532-3.47h-3.328v-2.25c0-.948.462-1.874 1.953-1.874h1.513V5.996s-1.374-.235-2.686-.235c-2.748 0-4.54 1.666-4.54 4.682v2.47H7.078v3.47h3.047v8.385h2.549v-8.385h2.003z" />
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
                    Logging in...
                  </div>
                ) : (
                  'Log In'
                )}
              </Button>
            </form>
          </Form>
          
          {/* Forgot Password Link */}
          <div className="text-center mt-4">
            <Link
              href="/forgot-password"
              className="text-sm text-blue-600 hover:underline transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          
          {/* Sign up link */}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link 
              href="/signup" 
              className="font-medium text-primary hover:underline transition-colors"
            >
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}