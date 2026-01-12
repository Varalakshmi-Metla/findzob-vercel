"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useFirestore } from '@/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      toast({
        variant: 'destructive',
        title: 'Invalid Email',
        description: 'Please enter a valid email address.',
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Check if email exists in Firestore
      const usersRef = collection(firestore, 'users');
      const q = query(usersRef, where('email', '==', email.toLowerCase()));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        toast({
          variant: 'destructive',
          title: 'Email Not Registered',
          description: 'No account found with this email address. Please check or sign up.',
        });
        setIsLoading(false);
        return;
      }
      
      // Send password reset email
      await sendPasswordResetEmail(auth, email);
      setIsSent(true);
      
      toast({
        title: '✓ Reset Email Sent',
        description: `Check ${email} for password reset instructions.`,
      });
      
    } catch (error: any) {
      console.error('Password reset error:', error);
      
      let errorMessage = "Failed to send reset email. Please try again.";
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = "No account found with this email address.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Please enter a valid email address.";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Too many attempts. Please try again later.";
      }
      
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
      });
      
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 md:p-6 dark:bg-[#0a0a0a]">
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
              Reset Password
            </CardTitle>
            <CardDescription className="text-sm md:text-base text-gray-500 dark:text-gray-300">
              {isSent 
                ? 'Check your email for reset instructions' 
                : 'Enter your registered email address'
              }
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="px-4 md:px-6 pb-6 md:pb-8">
          {isSent ? (
            <div className="text-center py-4">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 mb-4">
                <svg className="h-6 w-6 text-green-600 dark:text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="font-semibold text-lg mb-2">Email Sent!</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                Check <strong>{email}</strong> for password reset instructions.
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
                The reset link will expire in 1 hour. If you don't see it, check your spam folder.
              </p>
              <div className="space-y-3">
                <Button 
                  onClick={() => router.push('/login')}
                  className="w-full"
                >
                  Back to Login
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsSent(false);
                    handleSubmit({ preventDefault: () => {} } as React.FormEvent);
                  }}
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? 'Sending...' : 'Resend Email'}
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Email Address</label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 md:h-10 text-sm md:text-base"
                  required
                  disabled={isLoading}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Enter the email address you used to register.
                </p>
              </div>
              
              <Button 
                type="submit"
                className="w-full h-11 md:h-10 text-sm md:text-base font-medium"
                disabled={isLoading || !email}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Sending...
                  </div>
                ) : (
                  'Send Reset Link'
                )}
              </Button>
              
              <div className="text-center mt-6">
                <Link 
                  href="/login" 
                  className="text-sm text-blue-600 hover:underline transition-colors"
                >
                  ← Back to Login
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}