'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, doc, addDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Download, Trash2, AlertTriangle } from 'lucide-react';
import { useUserDoc } from '@/firebase/use-user-doc';
import { convertFirestoreToPlain } from '@/lib/utils';
import { generateResumeWithOllama } from '@/app/actions/resume-ollama-standard-action';
import { generateResumeHTML } from '@/lib/resume-format-utils';
import { generatePdfFromHtml } from '@/app/actions/resume-actions';
import { generatePaymentHash } from '@/lib/payment-hash';
import { useDataIntegrity, useWalletIntegrity, useSubscriptionIntegrity } from '@/hooks/use-data-integrity';

export default function ResumesPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  // User data
  const resumesRef = useMemoFirebase(() => (user ? collection(firestore, 'users', user.uid, 'resumes') : null), [user, firestore]);
  const { data: resumes, isLoading: resumesLoading } = useCollection<any>(resumesRef);
  const userDocRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
  const { data: profile } = useDoc<any>(userDocRef);
  const { userDoc } = useUserDoc(user);

  // Data integrity checks
  const dataIntegrity = useDataIntegrity(userDoc);
  const walletIntegrity = useWalletIntegrity(userDoc);
  const subscriptionIntegrity = useSubscriptionIntegrity(userDoc);

  // Membership check
  const isMembershipUser = Array.isArray(userDoc?.plans) && userDoc.plans.some((p: any) => p.category === 'service' && p.planId && (!p.expiresAt || new Date(p.expiresAt) > new Date()));

  // Plan info
  const [planDoc, setPlanDoc] = useState<any>(null);
  const [planName, setPlanName] = useState<string>("—");
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);

  // Resume generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [customRole, setCustomRole] = useState<string>('');
  const [extraRequirements, setExtraRequirements] = useState<string>('');
  const [showExtraInput, setShowExtraInput] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [format, setFormat] = useState<'pdf' | 'docx'>('pdf');

  // Determine plan type
  const isPayAsYouGo = useMemo(() => {
    if (!planDoc?.name) return false;
    return /pay[-\s]?as[-\s]?you[-\s]?go/i.test(planDoc.name);
  }, [planDoc]);

  const isIndiaPayAsYouGo = userDoc?.citizenship === 'India' && isPayAsYouGo;

  // Fetch plan details
  useEffect(() => {
    const fetchPlan = async () => {
      if (!Array.isArray(userDoc?.plans) || !firestore) return;
      const plan = userDoc.plans.find((p: any) => p.category === 'service' && p.planId);
      if (!plan?.planId) return;

      try {
        const planSnap = await getDoc(doc(firestore, 'plans', plan.planId));
        if (planSnap.exists()) {
          setPlanDoc(planSnap.data());
          setPlanName(planSnap.data().name || "—");
        }
      } catch (error) {
        console.error('Failed to fetch plan:', error);
      }
    };
    fetchPlan();
  }, [userDoc, firestore]);

  // Fetch wallet balance
  useEffect(() => {
    const fetchWallet = async () => {
      if (!isIndiaPayAsYouGo || !user || !firestore) {
        setWalletBalance(null);
        return;
      }
      setWalletLoading(true);
      try {
        const userRef = doc(firestore, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setWalletBalance(typeof userSnap.data().walletAmount === 'number' ? userSnap.data().walletAmount : 0);
        }
      } catch (error) {
        console.error('Failed to fetch wallet:', error);
        setWalletBalance(null);
      } finally {
        setWalletLoading(false);
      }
    };
    fetchWallet();
  }, [isIndiaPayAsYouGo, user, firestore]);

  // Extract desired roles from profile
  const desiredRoles = useMemo(() => {
    if (!profile?.jobPreferences || !Array.isArray(profile.jobPreferences)) return [];
    return profile.jobPreferences
      .map((p: any) => p?.desiredRoles)
      .filter(Boolean)
      .flatMap((roles: string | string[]) => (typeof roles === 'string' ? [roles] : roles));
  }, [profile]);

  // Resume counts
  const resumesUsed = resumes?.length || 0;
  const freeResumesIncluded = 5;
  const resumesRemaining = Math.max(0, freeResumesIncluded - resumesUsed);
  const isPaidResume = isIndiaPayAsYouGo && resumesUsed >= freeResumesIncluded;

  /**
   * Generate resume from user profile using Gemini with standard format
   */
  const handleGenerateResume = async () => {
    if (!user || !firestore || !profile) {
      toast({ variant: 'destructive', title: 'Error', description: 'User data not loaded' });
      return;
    }

    const role = customRole.trim() || selectedRole.trim();
    if (!role) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select or enter a role' });
      return;
    }

    // Check wallet for paid resumes
    if (isPaidResume) {
      if (walletBalance === null || walletLoading) {
        toast({ variant: 'destructive', title: 'Error', description: 'Unable to fetch wallet balance' });
        return;
      }
      if (walletBalance < 5) {
        toast({ variant: 'destructive', title: 'Insufficient Balance', description: 'Please top up your wallet. ₹5 required per resume' });
        return;
      }
    }

    setIsGenerating(true);
    try {
      console.log('📝 Starting resume generation with STANDARD FORMAT', { role, isPaidResume });

      // Convert profile to plain object
      const plainProfile = convertFirestoreToPlain(profile);

      // Generate resume using Gemini with standard format
      const result = await generateResumeWithOllama({
        profile: plainProfile,
        targetRole: role,
        jobDescription: extraRequirements.trim() || undefined,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate resume');
      }

      console.log('✅ Resume generated with standard format', {
        type: result.resume?.resumeType,
        sections: {
          header: !!result.resume?.header,
          summary: !!result.resume?.profileSummary,
          skills: !!result.resume?.keySkills,
          experience: result.resume?.professionalExperience?.length || 0,
          education: result.resume?.education?.length || 0,
        },
      });

      // Save resume to Firestore
      const resumesRef = collection(firestore, 'users', user.uid, 'resumes');
      const resumeData = {
        ...result.resume,
        role,
        createdAt: new Date().toISOString(),
        userId: user.uid,
        format: 'standard',
        aiGenerated: true,
        metadata: {
          generatedRole: role,
          resumeType: result.resume?.resumeType,
          generationTime: result.metadata?.generationTime,
          model: result.metadata?.modelUsed,
        },
      };

      await addDoc(resumesRef, resumeData);

      // Handle wallet deduction for India PAYG users
      if (isPaidResume) {
        try {
          // Create invoice
          await addDoc(collection(firestore, 'invoices'), {
            userId: user.uid,
            type: 'resume-generation',
            amount: 5,
            currency: 'INR',
            status: 'completed',
            description: `Resume generation for role: ${role}`,
            createdAt: new Date().toISOString(),
            metadata: { role, planType: 'payg', citizenship: 'India', format: 'standard' },
          });

          // Deduct from wallet
          const deductPayload = {
            userId: user.uid,
            amount: 5,
            resumeRole: role,
            ts: Date.now(),
          };
          const secret = process.env.NEXT_PUBLIC_WALLET_SECRET || 'demo_wallet_secret';
          const hash = generatePaymentHash(secret, deductPayload);

          const res = await fetch('/api/wallet/deduct', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...deductPayload, hash }),
          });

          if (!res.ok) {
            throw new Error('Failed to deduct from wallet');
          }

          setWalletBalance((prev) => (prev !== null ? prev - 5 : null));
        } catch (error) {
          console.error('Wallet deduction error:', error);
          toast({ variant: 'destructive', title: 'Wallet Error', description: 'Failed to deduct from wallet' });
          return;
        }
      }

      toast({
        title: 'Success',
        description: isPaidResume ? '✅ Standard format resume generated! ₹5 deducted.' : '✅ Standard format resume generated!',
      });

      // Reset form
      setSelectedRole('');
      setCustomRole('');
      setExtraRequirements('');
      setShowExtraInput(false);
    } catch (error) {
      console.error('Resume generation error:', error);
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Download resume as PDF or DOCX (ATS-friendly standard format)
   */
  const handleDownloadResume = async (resume: any) => {
    if (!resume || downloadingId) return;

    setDownloadingId(resume.id);
    try {
      const filename = `${resume.header?.fullName || 'resume'}-${resume.targetRole?.replace(/\s+/g, '-')}`;

      // Generate HTML from standard resume format
      const html = generateResumeHTML(resume);
      
      if (format === 'docx') {
        try {
          // Dynamic import to avoid SSR issues
          const htmlDocx = (await import('html-docx-js/dist/html-docx')).default;
          
          // Add basic styling for DOCX conversion
          const styledHtml = `
            <!DOCTYPE html>
            <html>
              <head>
                <style>
                  body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; line-height: 1.15; }
                  h1 { font-size: 16pt; font-weight: bold; text-align: center; text-transform: uppercase; margin-bottom: 5px; }
                  .contact-info { text-align: center; font-size: 10pt; margin-bottom: 10px; }
                  h2 { font-size: 12pt; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #000; margin-top: 15px; margin-bottom: 5px; }
                  p { margin: 3px 0; }
                  ul { margin: 3px 0; padding-left: 20px; }
                  li { margin-bottom: 2px; }
                </style>
              </head>
              <body>
                ${html}
              </body>
            </html>
          `;
          
          const converted = htmlDocx.asBlob(styledHtml);
          const url = URL.createObjectURL(converted);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${filename}.docx`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          
          toast({ title: 'Downloaded', description: `Resume downloaded as DOCX.` });
        } catch (docxError) {
          console.error('DOCX generation failed', docxError);
          // Fallback to HTML if docx library fails
          const blob = new Blob([html], { type: 'text/html' });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = `${filename}.html`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(link.href);
          
          toast({ variant: 'destructive', title: 'DOCX Failed', description: 'Available library for DOCX conversion missing. Downloaded as HTML instead.' });
        }
      } else {
        // PDF download using server-side Puppeteer
        try {
          // Send HTML to server to generate PDF
          const pdfBase64 = await generatePdfFromHtml(html);
          
          // Convert base64 to blob
          const byteCharacters = atob(pdfBase64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'application/pdf' });
          
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = `${filename}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(link.href);

          toast({ title: 'Downloaded', description: `Resume downloaded as PDF.` });
        } catch (pdfError) {
          console.error('PDF generation failed:', pdfError);
          
          // Fallback to client-side HTML download
          const blob = new Blob([html], { type: 'text/html' });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = `${filename}.html`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(link.href);

          toast({ 
            variant: 'destructive', 
            title: 'PDF Generation Failed', 
            description: 'Could not generate PDF on server. Downloaded as HTML instead. You can print this to PDF.',
          });
        }
      }
    } catch (error) {
      console.error('Download error:', error);
      toast({ variant: 'destructive', title: 'Download Failed', description: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setDownloadingId(null);
    }
  };

// Delete resume functionality removed
// const handleDeleteResume = async (resumeId: string) => { ... }

  if (!isMembershipUser) {
    return (
      <div className="w-full max-w-2xl mx-auto p-4">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-900">Access Restricted</CardTitle>
          </CardHeader>
          <CardContent className="text-red-800">
            Only users with an active membership can access the Resumes page. Please purchase a plan to continue.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-6">
      {/* Data Integrity Alerts */}
      {!dataIntegrity.isVerified && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-900">
          <CardContent className="pt-6 flex gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0" />
            <div className="text-sm text-yellow-800 dark:text-yellow-200">{dataIntegrity.error}</div>
          </CardContent>
        </Card>
      )}

      {!walletIntegrity.isValid && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-900">
          <CardContent className="pt-6 flex gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-500 flex-shrink-0" />
            <div className="text-sm text-red-800 dark:text-red-200">{walletIntegrity.error}</div>
          </CardContent>
        </Card>
      )}

      {/* Plan Info */}
      <Card>
        <CardHeader>
          <CardTitle>Plan & Resume Limit</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Current Plan</p>
              <p className="font-semibold">{planName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Resumes Generated</p>
              <p className="font-semibold">{resumesUsed} / {freeResumesIncluded}</p>
            </div>
            {isIndiaPayAsYouGo && walletBalance !== null && (
              <div>
                <p className="text-sm text-muted-foreground">Wallet Balance</p>
                <p className="font-semibold">₹{walletBalance}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Generate Resume Form */}
      <Card>
        <CardHeader>
          <CardTitle>Generate New Resume (Standard Format)</CardTitle>
          <CardDescription>Create a professional ATS-friendly resume using STANDARD RESUME FORMAT with all 10 sections powered by AI.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Target Role</label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select a desired role" />
              </SelectTrigger>
              <SelectContent>
                {desiredRoles.map((role: string, idx: number) => (
                  <SelectItem key={idx} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Or Enter Custom Role</label>
            <Input
              placeholder="e.g., Senior Software Engineer"
              value={customRole}
              onChange={(e) => setCustomRole(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExtraInput(!showExtraInput)}
            >
              {showExtraInput ? '−' : '+'} Job Description (Optional)
            </Button>
          </div>

          {showExtraInput && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Job Description / Requirements</label>
              <Textarea
                placeholder="Paste job description here for better customization..."
                value={extraRequirements}
                onChange={(e) => setExtraRequirements(e.target.value)}
                rows={4}
              />
            </div>
          )}

          <Button
            onClick={handleGenerateResume}
            disabled={isGenerating || !profile}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate Resume'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Generated Resumes List */}
      <Card>
        <CardHeader>
          <CardTitle>Generated Resumes ({resumesUsed})</CardTitle>
          <CardDescription>Standard format resumes with all 10 sections - ATS friendly (no tables, no colors)</CardDescription>
        </CardHeader>
        <CardContent>
          {resumesLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mx-auto" />
            </div>
          ) : resumes && resumes.length > 0 ? (
            <div className="space-y-3">
              {resumes.map((resume: any) => (
                <div key={resume.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors">
                  <div className="flex-1">
                    <p className="font-semibold">{resume.targetRole || resume.role}</p>
                    <p className="text-sm text-muted-foreground">
                      {resume.resumeType && <span className="capitalize">{resume.resumeType} • </span>}
                      {new Date(resume.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Select value={format} onValueChange={(v: any) => setFormat(v)}>
                      <SelectTrigger className="w-[85px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">PDF</SelectItem>
                        <SelectItem value="docx">DOCX</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownloadResume(resume)}
                      disabled={downloadingId === resume.id}
                      title={`Download as ${format.toUpperCase()}`}
                    >
                      {downloadingId === resume.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No resumes generated yet. Create your first resume above!
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
