'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
    useFirestore, 
    useUser, 
    useCollection, 
    useDoc, 
    addDocumentNonBlocking, 
    updateDocumentNonBlocking, 
    deleteDocumentNonBlocking, 
    useMemoFirebase 
} from '@/firebase';
import { generateResumeWithOllama } from '@/app/actions/resume-ollama-standard-action';
import { generatePdfFromHtml } from '@/app/actions/resume-actions';
import { generateResumeHTML } from '@/lib/resume-format-utils';
import { convertFirestoreToPlain } from '@/lib/utils';
import { generateUserResumeWithStandardFormat, buildResumeDataForStorage } from '@/lib/admin-resume-generation-helper';
import { collection, doc, query, where } from 'firebase/firestore';
import { Loader2, Trash2, Edit, Check, Mail, Download, MoreVertical } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type User = {
  id: string;
  name: string;
  email: string;
  uid?: string;
  lastReadAt?: string;
};

type JobApplication = {
  id: string;
  company: string;
  role: string;
  location: string;
  status: 'Applied' | 'Under Review' | 'Interview' | 'Offer' | 'Rejected';
  appliedAt: string;
  source?: 'admin' | 'user' | string;
  assignedBy?: string;
  read?: boolean;
  visibleForPlan?: string;
  jobDescription?: string;
};

const statusOptions: JobApplication['status'][] = ['Applied', 'Under Review', 'Interview', 'Offer', 'Rejected'];

export default function MyUsersPage() {
  const searchParams = useSearchParams();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user: employee } = useUser();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUserDetailsOpen, setIsUserDetailsOpen] = useState(false);

  // Auto-generate resume if userId and role are present in query
  useEffect(() => {
    const userIdFromQuery = searchParams?.get('userId');
    const roleFromQuery = searchParams?.get('role');
    if (userIdFromQuery) {
      setSelectedUserId(userIdFromQuery);
      setIsUserDetailsOpen(true);
      if (roleFromQuery) {
        // Only trigger if not already generating
        setTimeout(async () => {
          if (!userIdFromQuery || !firestore) return;
          try {
            // Wait for user data to load
            const userDocRef = doc(firestore, 'users', userIdFromQuery);
            const userSnap = await import('firebase/firestore').then(({ getDoc }) => getDoc(userDocRef));
            const userData = userSnap.exists() ? userSnap.data() : null;
            if (!userData) return;
            
            // Generate resume using Ollama-based system
            const plainUserData = convertFirestoreToPlain(userData);
            const result = await generateResumeWithOllama({
              profile: plainUserData,
              targetRole: roleFromQuery,
            });
            
            if (!result.success || !result.resume) {
              toast({ variant: 'destructive', title: 'Generation Failed', description: result.error || 'Failed to generate resume' });
              return;
            }
            
            // Add to resumes subcollection
            const resumesRef = collection(firestore, 'users', userIdFromQuery, 'resumes');
            
            // Build resume object with standard format
            const resumeData: any = {
              ...result.resume,
              role: roleFromQuery,
              createdAt: new Date().toISOString(),
              userId: userIdFromQuery,
              createdBy: employee?.uid || employee?.email || '',
              format: 'standard',
              ollamaGenerated: true,
              metadata: {
                generatedRole: roleFromQuery,
                resumeType: result.resume.resumeType,
                generationTime: result.metadata?.generationTime,
                model: result.metadata?.modelUsed,
                generatedBy: 'query-param',
              },
            };
            
            await addDocumentNonBlocking(resumesRef, resumeData);
            toast({ title: 'Resume Generated', description: `Resume for role "${roleFromQuery}" generated with Ollama.` });
          } catch (e) {
            toast({ variant: 'destructive', title: 'Error', description: (e as Error).message });
          }
        }, 1000);
      }
    }
  }, [searchParams, firestore, employee, toast]);

  // Auto-open user details if userId is present in query param
  useEffect(() => {
    const userIdFromQuery = searchParams?.get('userId');
    if (userIdFromQuery) {
      setSelectedUserId(userIdFromQuery);
      setIsUserDetailsOpen(true);
    }
  }, [searchParams]);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentApplication, setCurrentApplication] = useState<Partial<JobApplication> | null>(null);
  const [resumeFormat, setResumeFormat] = useState<'pdf' | 'docx'>('docx');
  const [genRole, setGenRole] = useState<string>('');
  const [isGeneratingResumes, setIsGeneratingResumes] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('all');
  // per-resume format overrides (resumeId -> 'docx'|'pdf')
  const [resumeFormats, setResumeFormats] = useState<Record<string, 'docx' | 'pdf'>>({});
  // Extra requirements for resume generation
  const [extraRequirements, setExtraRequirements] = useState('');
  // Custom desired role input
  const [customDesiredRole, setCustomDesiredRole] = useState('');

  const usersCollectionRef = useMemoFirebase(
    () => (firestore && employee?.uid ? query(collection(firestore, 'users'), where('assignedEmployeeId', '==', employee.uid)) : null),
    [firestore, employee]
  );
  const { data: users, isLoading: isUsersLoading } = useCollection<User & { subscription?: { plan?: string; status?: string } }>(usersCollectionRef);

  const plansCollectionRef = useMemoFirebase(
    () => (firestore ? collection(firestore, 'plans') : null),
    [firestore]
  );
  const { data: plans, isLoading: isPlansLoading } = useCollection<any>(plansCollectionRef);

  const filteredUsers = useMemo(() => {
    return (users || []).filter((u: any) => {
      const userPlanRaw = (u.subscription?.plan || 'Free').toString().trim().toLowerCase();
      const filterPlanRaw = planFilter.toString().trim().toLowerCase();
      // Find the plan object for the filter value
      const planObj = (plans || []).find(
        p => p.id?.toString().trim().toLowerCase() === filterPlanRaw || p.name?.toString().trim().toLowerCase() === filterPlanRaw
      );
      // Accept if filter is 'all', or if user plan matches filter id or filter name
      const planMatch =
        filterPlanRaw === 'all' ||
        userPlanRaw === filterPlanRaw ||
        (planObj && (userPlanRaw === (planObj.id?.toString().trim().toLowerCase()) || userPlanRaw === (planObj.name?.toString().trim().toLowerCase())));
      const searchMatch = `${u.name} ${u.email}`.toLowerCase().includes(userSearch.toLowerCase());
      return planMatch && searchMatch;
    });
  }, [users, userSearch, planFilter, plans]);

  const selectedUserDocRef = useMemoFirebase(() => selectedUserId ? doc(firestore, 'users', selectedUserId) : null, [selectedUserId, firestore]);
  const { data: selectedUserData } = useDoc<any>(selectedUserDocRef as any);
  const selectedUserResumesRef = useMemoFirebase(() => (selectedUserId ? collection(firestore, 'users', selectedUserId, 'resumes') : null), [selectedUserId, firestore]);
  const { data: selectedUserResumes } = useCollection<any>(selectedUserResumesRef);

  // Sort resumes by creation date (newest first)
  const sortedResumes = useMemo(() => {
    if (!selectedUserResumes || !Array.isArray(selectedUserResumes)) return [];
    return [...selectedUserResumes].sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA; // Newest first (descending order)
    });
  }, [selectedUserResumes]);

  // Fetch applications from top-level 'applications' collection for the selected user
  const userApplicationsQuery = useMemoFirebase(
    () => (selectedUserId ? query(collection(firestore, 'applications'), where('userId', '==', selectedUserId)) : null),
    [selectedUserId, firestore]
  );
  const { data: applications, isLoading: isApplicationsLoading } = useCollection<JobApplication>(userApplicationsQuery);

  // Extract unique desired roles from jobPreferences in the selected user's profile
  const uniqueRoles = useMemo(() => {
    if (!selectedUserData?.jobPreferences || !Array.isArray(selectedUserData.jobPreferences)) {
      return [];
    }
    const roles = new Set<string>();
    for (const pref of selectedUserData.jobPreferences) {
      if (pref?.desiredRoles && typeof pref.desiredRoles === 'string') {
        pref.desiredRoles.split(',').forEach((role: string) => {
          const trimmed = role.trim();
          if (trimmed) roles.add(trimmed);
        });
      }
    }
    return Array.from(roles);
  }, [selectedUserData?.jobPreferences]);

  const downloadSelectedResumes = async () => {
    if (!selectedUserData || !selectedUserResumes) return;
    const matches = selectedUserResumes || [];
    
    toast({ title: 'Generating', description: `Preparing ${matches.length} resumes...` });
    
    for (const r of matches) {
      try {
        const resumeRole = r?.targetRole || r?.role || 'Resume';
        
        console.log('Starting standard format resume download:', {
          resumeRole,
          hasStandardFormat: !!r.header,
        });

        // Generate HTML from standard resume format
        const html = generateResumeHTML(r);

        // Create downloadable HTML
        const blob = new Blob([html], { type: 'text/html' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${selectedUserData.name || 'user'}-resume-${resumeRole.replace(/\s+/g, '-')}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        
        console.log(`Resume downloaded successfully for role: ${resumeRole}`);
      } catch (error) {
        console.error('Resume download error:', error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        toast({ 
          variant: 'destructive', 
          title: 'Download Error', 
          description: errorMsg || 'Failed to download resume.' 
        });
      }
    }
    
    toast({ title: 'Complete', description: `Downloaded ${matches.length} resume(s) successfully!` });
  };

  const downloadSingleResume = async (r: any) => {
    if (!selectedUserData) return;
    try {
      const resumeRole = r?.targetRole || r?.role || 'Resume';
      // Determine format for this resume (default to global preference 'docx' if not set)
      const format = resumeFormats[r.id] ?? resumeFormat;
      
      toast({ title: 'Downloading', description: `Generating ${format.toUpperCase()} resume...` });
      
      console.log('Downloading standard format resume:', {
        resumeRole,
        hasStandardFormat: !!r.header,
        format
      });

      // Generate HTML from standard resume format
      const html = generateResumeHTML(r);
      const filename = `${selectedUserData.name || 'user'}-resume-${resumeRole.replace(/\s+/g, '-')}`;

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
          
          // Download blob
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${filename}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          
          toast({ title: 'Downloaded', description: `Resume downloaded as PDF.` });
        } catch (pdfError) {
          console.error('PDF generation error:', pdfError);
          toast({ 
            variant: 'destructive', 
            title: 'PDF Generation Failed', 
            description: pdfError instanceof Error ? pdfError.message : 'Server error during PDF generation' 
          });
        }
      }
    } catch (error) {
      console.error('Resume download error:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      toast({ 
        variant: 'destructive', 
        title: 'Download Failed', 
        description: errorMsg || 'Failed to download resume.' 
      });
    }
  };

  const openModal = (app: Partial<JobApplication> | null = null) => {
    if (!selectedUserId) {
        toast({ variant: 'destructive', title: 'No User Selected', description: 'Please select a user first.' });
        return;
    }
    if (app) {
      setCurrentApplication(app);
      setIsEditing(true);
    } else {
      setCurrentApplication({
        company: '',
        role: '',
        location: '',
        status: 'Applied',
        source: 'employee',
        assignedBy: (employee?.uid || employee?.email) ?? undefined,
        read: false,
      });
      setIsEditing(false);
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!currentApplication || !selectedUserId) return;

    setIsSubmitting(true);
    try {
      if (isEditing && currentApplication.id) {
        const appRef = doc(firestore, 'applications', currentApplication.id);
        await updateDocumentNonBlocking(appRef, {
          company: currentApplication.company,
          role: currentApplication.role,
          location: currentApplication.location,
          status: currentApplication.status,
          read: Boolean(currentApplication.read),
        });
        toast({ title: 'Application Updated', description: 'The application details have been updated.' });
      } else {
        // Add to top-level 'applications' collection
        const newAppPromise = addDocumentNonBlocking(collection(firestore, 'applications'), {
          ...currentApplication,
          userId: selectedUserId,
          appliedAt: new Date().toISOString(),
          source: currentApplication.source || 'employee',
          assignedBy: currentApplication.assignedBy || employee?.uid || employee?.email,
          read: false,
        });
        
        // Wait for the new app to be created, then trigger invoice generation and send email
        const newAppDocRef = await newAppPromise;
        if (newAppDocRef) {
          try {
            // Generate invoice for USA pay-as-you-go users
            const userDocRef = doc(firestore, 'users', selectedUserId);
            const userDocSnap = await import('firebase/firestore').then(({ getDoc }) => getDoc(userDocRef));
            const userData = userDocSnap.exists() ? userDocSnap.data() : null;
            
            if (userData && userData.plans && Array.isArray(userData.plans)) {
              const citizenship = (userData.citizenship || userData.country || '').toUpperCase();
              const paygPlan = userData.plans.find((p: any) => /pay[-\s]?as[-\s]?you[-\s]?go/i.test((p.planName || p.name || '')));
              
              if (citizenship === 'USA' && paygPlan && (!paygPlan.currency || paygPlan.currency.toUpperCase() !== 'INR')) {
                // Check for existing unpaid invoice for this user/month
                const now = new Date();
                const year = now.getFullYear();
                const month = now.getMonth();
                
                const invoicesRef = collection(firestore, 'invoices');
                const existingQuery = await import('firebase/firestore').then(({ query, where, getDocs }) => 
                  getDocs(query(invoicesRef,
                    where('userId', '==', selectedUserId),
                    where('type', '==', 'payg-applications'),
                    where('month', '==', month),
                    where('year', '==', year),
                    where('status', '==', 'unpaid')
                  ))
                );
                
                const perApp = 2;
                const currency = 'USD';
                
                if (!existingQuery.empty) {
                  // Update existing invoice
                  const invoiceRef = existingQuery.docs[0].ref;
                  await import('firebase/firestore').then(({ updateDoc, increment }) =>
                    updateDoc(invoiceRef, {
                      amount: increment(perApp),
                      appCount: increment(1),
                      currency,
                      updatedAt: new Date().toISOString(),
                    })
                  );
                } else {
                  // Create new invoice
                  await import('firebase/firestore').then(({ addDoc }) =>
                    addDoc(invoicesRef, {
                      userId: selectedUserId,
                      planName: 'Pay As You Go',
                      description: `Applications for ${now.toLocaleString('default', { month: 'long' })} ${year} (1 application x $${perApp})`,
                      amount: perApp,
                      currency,
                      status: 'unpaid',
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                      type: 'payg-applications',
                      appCount: 1,
                      month,
                      year,
                      userEmail: userData.email || '',
                      userPhone: userData.phone || '',
                      userAddress: userData.address || '',
                    })
                  );
                }
              }
            }

            // Send email with application details
            if (userData && userData.email) {
              try {
                const emailResponse = await fetch('/api/notify/application-added', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    to: userData.email,
                    userName: userData.name,
                    company: currentApplication?.company || 'N/A',
                    role: currentApplication?.role || 'N/A',
                    location: currentApplication?.location || 'N/A',
                    status: currentApplication?.status || 'Applied',
                    jobDescription: currentApplication?.jobDescription || '',
                  }),
                });
                if (emailResponse.ok) {
                  console.log('Application notification email sent successfully');
                } else {
                  console.warn('Failed to send application notification email');
                }
              } catch (emailError) {
                console.error('Error sending application email:', emailError);
                // Don't block the process if email fails
              }
            }
          } catch (invoiceError) {
            console.error('Invoice generation failed:', invoiceError);
            // Don't fail the request if invoice generation fails
          }
        }
        
        toast({ title: 'Application Added', description: 'The new application has been added for the user.' });
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save the application.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (appId: string) => {
    if (!appId) return;
    const appRef = doc(firestore, 'applications', appId);
    deleteDocumentNonBlocking(appRef);
    toast({ title: 'Application Deleted', description: 'The application has been removed.' });
  };

  const toggleRead = async (appId: string, currentRead: boolean | undefined) => {
    if (!appId) return;
    const appRef = doc(firestore, 'applications', appId);
    try {
      await updateDocumentNonBlocking(appRef, { read: !currentRead });
      if (!currentRead && selectedUserId) {
        const userRef = doc(firestore, 'users', selectedUserId);
        await updateDocumentNonBlocking(userRef, { lastReadAt: new Date().toISOString() });
      }
      toast({ title: `Marked ${!currentRead ? 'Read' : 'Unread'}`, description: 'Application read status updated.' });
    } catch (err) {
      console.error('toggleRead error', err);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update read status.' });
    }
  }
  
  const selectedUserName = users?.find(u => u.id === selectedUserId)?.name;

  return (
    <div className="p-4 md:p-8">
        <Card>
            <CardHeader>
                <CardTitle>My Users</CardTitle>
                <CardDescription>Choose a user to view and manage their job applications.</CardDescription>
            </CardHeader>
            <CardContent>
            <div className="mb-4 flex gap-4">
                <Input placeholder="Search users by name or email" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} />
                <Select value={planFilter} onValueChange={setPlanFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Plans</SelectItem>
                    {(plans || [])
                      .filter(p => !p.hidden)
                      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || a.name.localeCompare(b.name))
                      .map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    <SelectItem value="Free">Free</SelectItem>
                  </SelectContent>
                </Select>
            </div>
           {isUsersLoading ? (
             <Loader2 className="h-6 w-6 animate-spin" />
           ) : (
            <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Last Read</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(filteredUsers || []).map(u => (
                    <TableRow key={u.id} className="hover:bg-muted">
                      <TableCell>{u.name}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>{u.subscription?.plan || 'Free'}</TableCell>
                      <TableCell>{u.lastReadAt ? new Date(u.lastReadAt).toLocaleString() : <span className="text-muted-foreground">--</span>}</TableCell>
                      <TableCell className="text-right">
                        <Button onClick={() => { setSelectedUserId(u.id); setIsUserDetailsOpen(true); }} className="mr-2">View</Button>
                        <a href={`/employee/user-profile?id=${u.id}`} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm">View Full Profile</Button>
                        </a>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
           )}
            </CardContent>
      </Card>

      <Dialog open={isUserDetailsOpen} onOpenChange={setIsUserDetailsOpen}>
        <DialogContent className="w-full sm:max-w-5xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>Selected user information and subscription</DialogDescription>
          </DialogHeader>
          <div className="w-full max-w-5xl mx-auto px-4 sm:px-6">
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>User Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{selectedUserData?.name || selectedUserName}</div>
                    <div className="text-sm text-muted-foreground">{selectedUserData?.email}</div>
                    <div className="mt-2">Plan: <Badge>{selectedUserData?.subscription?.plan || 'Free'}</Badge></div>
                    <div className="mt-2">Profile: {selectedUserData?.profileCompleted ? <Badge variant="secondary">Complete</Badge> : <Badge>Incomplete</Badge>}</div>
                    <div className="mt-2">
                        <Button onClick={() => openModal()} disabled={!selectedUserId}>Add Application</Button>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-4">
                    {/* Resume Download Controls */}
                    <div className="flex items-center gap-3">
                      <Select value={resumeFormat} onValueChange={(v: 'pdf' | 'docx') => setResumeFormat(v)}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="docx">DOCX</SelectItem>
                          <SelectItem value="pdf">PDF</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button onClick={downloadSelectedResumes} disabled={!sortedResumes || sortedResumes.length === 0}>
                        <Download className="h-4 w-4 mr-2" />
                        Download All
                      </Button>
                    </div>

                    <div className="text-sm font-medium">Resumes</div>
                    <div className="mt-2 space-y-2 max-w-md">
                      {sortedResumes && sortedResumes.length > 0 ? sortedResumes.map((r: any) => (
                        <div key={r.id} className="flex items-center justify-between p-3 border rounded">
                          <div>
                            <div className="text-sm font-medium">{r.role}</div>
                            <div className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Select 
                              value={resumeFormats[r.id] ?? resumeFormat} 
                              onValueChange={(v: 'pdf' | 'docx') => setResumeFormats(prev => ({ ...prev, [r.id]: v }))}
                            >
                              <SelectTrigger className="w-20 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="docx">DOCX</SelectItem>
                                <SelectItem value="pdf">PDF</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => downloadSingleResume(r)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                if (!confirm('Delete this resume? This action cannot be undone.')) return;
                                if (!selectedUserId || !firestore) return;
                                try {
                                  const resumeRef = doc(firestore, 'users', selectedUserId, 'resumes', r.id);
                                  deleteDocumentNonBlocking(resumeRef);
                                  toast({ title: 'Resume Deleted', description: 'The resume has been removed.' });
                                } catch (err) {
                                  console.error('delete resume error', err);
                                  toast({ variant: 'destructive', title: 'Delete Failed', description: 'Could not delete resume.' });
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      )) : <div className="text-sm text-muted-foreground">No resumes</div>}
                    </div>
                  </div>
                </div>
                
                {/* Resume Generation Section */}
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-2 items-start">
                  <div className="sm:col-span-2">
                    <Label>Generate Resume for User</Label>
                    <div className="mt-2 flex flex-col gap-3">
                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">Select from existing roles</Label>
                        <div className="flex items-center gap-2">
                          <Select onValueChange={setGenRole} value={genRole}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                            <SelectContent>
                              {uniqueRoles.filter(role => !!role).map((role) => (
                                <SelectItem key={role} value={role}>{role}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="space-y-2 border-t pt-3">
                        <Label className="text-sm text-muted-foreground">Or enter custom desired role</Label>
                        <Input
                          placeholder="Enter custom desired role"
                          value={customDesiredRole}
                          onChange={e => setCustomDesiredRole(e.target.value)}
                        />
                      </div>
                      
                      <Input
                        className="mt-2"
                        placeholder="Extra requirements for resume (optional)"
                        value={extraRequirements}
                        onChange={e => setExtraRequirements(e.target.value)}
                      />
                      
                      <Button disabled={isGeneratingResumes || !selectedUserId || (!genRole && !customDesiredRole)} onClick={async () => {
                        if (!selectedUserId || !selectedUserData || !firestore) {
                          toast({ variant: 'destructive', title: 'Error', description: 'Missing user or firestore reference.' });
                          return;
                        }
                        setIsGeneratingResumes(true);
                        try {
                          // Use custom role if provided, otherwise use dropdown role
                          const role = customDesiredRole.trim() || genRole;
                          if (!role) {
                            toast({ variant: 'destructive', title: 'Error', description: 'Please select or enter a role.' });
                            return;
                          }
                          // Call generateResume directly (it's a server function)
                          // Generate resume ONLY from user profile data
                          const plainUserData = convertFirestoreToPlain(selectedUserData);
                          
                          // Helper function to parse string data into arrays
                          const parseStringToArray = (str?: string, delimiter: RegExp = /\n|;|,/): string[] => {
                            if (!str || typeof str !== 'string') return [];
                            return str
                              .split(delimiter)
                              .map(s => s.trim())
                              .filter(s => s.length > 0);
                          };
                          
                          // Helper function to parse experience string into array of objects
                          const parseExperience = (expStr?: string): Array<{company: string, role: string, duration: string, description?: string}> => {
                            if (!expStr || typeof expStr !== 'string') return [];
                            const entries = expStr.split(/\n(?=[A-Z])/); // Split by newline followed by uppercase
                            return entries
                              .map(entry => {
                                const trimmed = entry.trim();
                                if (!trimmed) return null;
                                const durationMatch = trimmed.match(/(\d{4}\s*-\s*(?:\d{4}|Present|Now)|[A-Za-z]+ \d{4}\s*-\s*(?:[A-Za-z]+ \d{4}|Present))/i);
                                const duration = durationMatch?.[0] || '';
                                const withoutDuration = durationMatch ? trimmed.replace(durationMatch[0], '').trim() : trimmed;
                                const atMatch = withoutDuration.match(/(.+?)\s+(?:at|@)\s+(.+)/i);
                                if (atMatch) {
                                  return {
                                    role: atMatch[1].trim(),
                                    company: atMatch[2].trim(),
                                    duration: duration || 'Full-time',
                                    description: 'Professional experience'
                                  } as {company: string, role: string, duration: string, description?: string};
                                }
                                return null;
                              })
                              .filter((e): e is {company: string, role: string, duration: string, description?: string} => e !== null);
                          };
                          
                          // Helper function to parse education string into array of objects
                          const parseEducation = (eduStr?: string): Array<{degree: string, university: string, year?: string, duration?: string}> => {
                            if (!eduStr || typeof eduStr !== 'string') return [];
                            const entries = eduStr.split(/\n(?=[A-Z])/);
                            return entries
                              .map(entry => {
                                const trimmed = entry.trim();
                                if (!trimmed) return null;
                                const degreeMatch = trimmed.match(/(Bachelor|Master|PhD|Associate|Diploma|Certificate|B\.?Tech|B\.?Sc|M\.?Tech|M\.?Sc|HSC|SSC)/i);
                                const yearMatch = trimmed.match(/(\d{4})/);
                                if (degreeMatch) {
                                  const degreeIndex = trimmed.indexOf(degreeMatch[0]);
                                  const degree = trimmed.substring(degreeIndex).split(/\n|,/)[0].trim();
                                  const university = trimmed.substring(0, degreeIndex).trim() || 'Not specified';
                                  return {
                                    degree: degree,
                                    university: university,
                                    year: yearMatch?.[0],
                                    duration: undefined
                                  } as {degree: string, university: string, year?: string, duration?: string};
                                }
                                return null;
                              })
                              .filter((e): e is {degree: string, university: string, year?: string, duration?: string} => e !== null);
                          };
                          
                          // Helper function to parse projects string into array of objects
                          const parseProjects = (projStr?: string): Array<{title: string, tech: string, description?: string}> => {
                            if (!projStr || typeof projStr !== 'string') return [];
                            const entries = projStr.split(/\n(?=[A-Z])/);
                            return entries
                              .map(entry => {
                                const trimmed = entry.trim();
                                if (!trimmed) return null;
                                const colonIndex = trimmed.indexOf(':');
                                if (colonIndex > -1) {
                                  return {
                                    title: trimmed.substring(0, colonIndex).trim(),
                                    tech: 'Multiple technologies',
                                    description: trimmed.substring(colonIndex + 1).trim()
                                  } as {title: string, tech: string, description?: string};
                                }
                                return { title: trimmed, tech: 'Technologies used', description: '' } as {title: string, tech: string, description?: string};
                              })
                              .filter((p): p is {title: string, tech: string, description?: string} => p !== null);
                          };
                          
                          // Helper function to parse certifications string into array of objects
                          const parseCertifications = (certStr?: string): Array<{title: string, issuer: string}> => {
                            if (!certStr || typeof certStr !== 'string') return [];
                            const entries = certStr.split(/\n|;/);
                            return entries
                              .map(entry => {
                                const trimmed = entry.trim();
                                if (!trimmed) return null;
                                const fromMatch = trimmed.match(/(.+?)\s+(?:from|by|issued by)\s+(.+)/i);
                                if (fromMatch) {
                                  return { title: fromMatch[1].trim(), issuer: fromMatch[2].trim() };
                                }
                                return { title: trimmed, issuer: 'Issuer not specified' };
                              })
                              .filter((c): c is {title: string, issuer: string} => c !== null);
                          };
                          
                          // Helper function to extract info from extraInfo field
                          const extractFromExtraInfo = (extraInfo?: string) => {
                            if (!extraInfo || typeof extraInfo !== 'string') return {};
                            
                            const extracted: any = {};
                            const lines = extraInfo.split('\n');
                            let currentSection = '';
                            let sectionContent = '';
                            
                            for (const line of lines) {
                              const trimmed = line.trim();
                              if (!trimmed) continue;
                              
                              // Check for section headers
                              if (/^(skills|experience|education|projects|certifications|languages|about|summary)/i.test(trimmed)) {
                                if (currentSection && sectionContent.trim()) {
                                  extracted[currentSection.toLowerCase()] = sectionContent.trim();
                                }
                                currentSection = trimmed.replace(/[:\-]/g, '').trim();
                                sectionContent = '';
                              } else {
                                sectionContent += (sectionContent ? '\n' : '') + trimmed;
                              }
                            }
                            
                            // Add last section
                            if (currentSection && sectionContent.trim()) {
                              extracted[currentSection.toLowerCase()] = sectionContent.trim();
                            }
                            
                            return extracted;
                          };
                          
                          // Extract additional info from plainUserData.extraInfo
                          const extraInfoExtracted = extractFromExtraInfo(plainUserData.extraInfo);
                          
                          // Build profile with ONLY actual user profile information
                          let userProfileData: any = {
                            // Contact Information
                            name: plainUserData.name || '',
                            email: plainUserData.email || '',
                            phone: plainUserData.phone || '',
                            linkedin: plainUserData.linkedin || '',
                            github: plainUserData.github || '',
                            address: plainUserData.address || '',
                            location: plainUserData.location || '',
                            
                            // Profile Details
                            gender: plainUserData.gender || '',
                            dateOfBirth: plainUserData.dateOfBirth || '',
                            citizenship: plainUserData.citizenship || '',
                            
                            // Professional Data - Parse strings to arrays per schema requirements
                            skills: parseStringToArray(plainUserData.skills || extraInfoExtracted.skills),
                            experience: parseExperience(plainUserData.experience || extraInfoExtracted.experience),
                            education: parseEducation(plainUserData.education || extraInfoExtracted.education),
                            projects: parseProjects(plainUserData.projects || extraInfoExtracted.projects),
                            certifications: parseCertifications(plainUserData.certifications || extraInfoExtracted.certifications),
                            
                            // Extra requirements/job description for resume enhancement
                            extraRequirements: extraRequirements.trim() || undefined,
                          };
                          
                          // Merge languages from extraInfo if not already present
                          if (!plainUserData.languages && extraInfoExtracted.languages) {
                            userProfileData.languages = parseStringToArray(extraInfoExtracted.languages);
                          } else {
                            userProfileData.languages = Array.isArray(plainUserData.languages) ? plainUserData.languages : [];
                          }
                          
                          // Generate resume using Ollama-based system
                          const result = await generateResumeWithOllama({
                            profile: userProfileData,
                            targetRole: role,
                            jobDescription: extraRequirements.trim() || undefined,
                          });
                          
                          if (!result.success || !result.resume) {
                            throw new Error(result.error || 'Failed to generate resume with Ollama');
                          }
                          
                          const generatedData = result.resume;
                          
                          // Generate professional summary as fallback
                          const generateProfessionalSummary = (): string => {
                            const totalExpYears = userProfileData.experience?.length || 0;
                            const keySkills = userProfileData.skills?.slice(0, 3).join(', ') || 'professional skills';
                            const extraInfoSummary = plainUserData.extraInfo?.substring(0, 150).trim() || '';
                            
                            let summary = '';
                            
                            if (totalExpYears > 0) {
                              summary = `Experienced ${role} with ${totalExpYears}+ years of professional background in ${keySkills}.`;
                            } else {
                              summary = `Motivated ${role} with strong expertise in ${keySkills}.`;
                            }
                            
                            // Add extra info if available
                            if (extraInfoSummary) {
                              summary += ` ${extraInfoSummary}`;
                            } else if (userProfileData.projects && userProfileData.projects.length > 0) {
                              // Fallback to project description
                              summary += ` Proven track record of delivering successful projects including ${userProfileData.projects[0]?.title}.`;
                            }
                            
                            // Add role-specific closing
                            if (role.toLowerCase().includes('developer') || role.toLowerCase().includes('engineer')) {
                              summary += ' Passionate about writing clean, scalable code and building innovative solutions.';
                            } else if (role.toLowerCase().includes('manager') || role.toLowerCase().includes('lead')) {
                              summary += ' Strong leadership capabilities with focus on team development and project success.';
                            } else if (role.toLowerCase().includes('designer')) {
                              summary += ' Creative mindset with expertise in creating user-centered designs and experiences.';
                            } else {
                              summary += ` Dedicated professional committed to achieving excellence in ${role} role.`;
                            }
                            
                            return summary;
                          };
                          
                          // Enhance generated data with professional summary fallback
                          const enhancedGeneratedData = {
                            ...generatedData,
                            profileSummary: generatedData.profileSummary || generateProfessionalSummary(),
                          };
                          
                          // Create the reference directly here to ensure it's valid
                          const resumesRef = collection(firestore, 'users', selectedUserId, 'resumes');
                          
                          // Build resume object with standard format metadata
                          const resumeData: any = {
                            ...enhancedGeneratedData,
                            role,
                            createdAt: new Date().toISOString(),
                            userId: selectedUserId,
                            createdBy: employee?.uid || employee?.email || '',
                            format: 'standard',
                            ollamaGenerated: true,
                            metadata: {
                              generatedRole: role,
                              resumeType: generatedData.resumeType,
                              generationTime: result.metadata?.generationTime,
                              model: result.metadata?.modelUsed,
                              customRole: !!customDesiredRole.trim(),
                              includedExtraRequirements: !!extraRequirements.trim(),
                              generatedBy: 'admin',
                            },
                          };
                          
                          // Add extraRequirements only if it has content
                          if (extraRequirements.trim()) {
                            resumeData.extraRequirements = extraRequirements.trim();
                          }
                          
                          await addDocumentNonBlocking(resumesRef, resumeData);

                          toast({ title: 'Generation Complete', description: 'Resumes generated and saved to user.' });
                          setGenRole('');
                          setCustomDesiredRole('');
                          setExtraRequirements('');
                        } catch(e) {
                          console.error('Resume generation error:', e);
                          toast({ variant: 'destructive', title: 'Error', description: (e as Error).message });
                        } finally {
                          setIsGeneratingResumes(false);
                        }
                      }}>
                        {isGeneratingResumes ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Generate Resume
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Applications for {selectedUserName || '...'}</CardTitle>
                <CardDescription>A list of job applications for the selected user.</CardDescription>
              </CardHeader>
              <CardContent>
                {isApplicationsLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Company</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Read</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {applications?.map((app) => (
                        <TableRow key={app.id}>
                          <TableCell className="font-medium">{app.company}</TableCell>
                          <TableCell>{app.role}</TableCell>
                          <TableCell>{app.location}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Badge className="cursor-pointer">{app.status}</Badge>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Update Status</DropdownMenuLabel>
                                {statusOptions.map(status => (
                                  <DropdownMenuItem 
                                    key={status} 
                                    onClick={() => {
                                      const appRef = doc(firestore, 'applications', app.id);
                                      updateDocumentNonBlocking(appRef, { status });
                                    }}
                                  >
                                    {status}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                          <TableCell>
                            {app.read ? (
                              <Badge variant="secondary" title="Read" aria-label="Read"><Check className="h-3 w-3" /></Badge>
                            ) : (
                              <Badge title="Unread" aria-label="Unread"><Mail className="h-3 w-3" /></Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => openModal(app)}><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => toggleRead(app.id, (app as any).read)} title={app.read ? 'Mark Unread' : 'Mark Read'} aria-label={app.read ? 'Mark Unread' : 'Mark Read'}>
                              {app.read ? <Mail className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(app.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {applications?.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center">No applications found for this user.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="w-full sm:max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Application' : 'Add New Application'}</DialogTitle>
            <DialogDescription>Fill in the details for the user's job application.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="company" className="text-right">Company</Label>
              <Input id="company" value={currentApplication?.company || ''} onChange={(e) => setCurrentApplication({...currentApplication, company: e.target.value})} className="col-span-3" />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">Role</Label>
              <Input id="role" value={currentApplication?.role || ''} onChange={(e) => setCurrentApplication({...currentApplication, role: e.target.value})} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="location" className="text-right">Location</Label>
              <Input id="location" value={currentApplication?.location || ''} onChange={(e) => setCurrentApplication({...currentApplication, location: e.target.value})} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">Status</Label>
              <Select value={currentApplication?.status || 'Applied'} onValueChange={(value: JobApplication['status']) => setCurrentApplication({...currentApplication, status: value})}>
                <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statusOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="jobDescription" className="text-right mt-2">Job Description</Label>
              <textarea id="jobDescription" value={currentApplication?.jobDescription || ''} onChange={(e) => setCurrentApplication({...currentApplication, jobDescription: e.target.value})} className="col-span-3 min-h-[100px] p-2 border rounded" placeholder="Enter job description details" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}