
'use client';

import { Badge } from '@/components/ui/badge';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { isAdminEmail } from '@/lib/admin';
import { collection, doc, query, where, collectionGroup, updateDoc } from 'firebase/firestore';
import { Briefcase, Loader2, Check, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Job = {
  id: string;
  company: string;
  role: string;
  location: string;
  status: 'Applied' | 'Under Review' | 'Interview' | 'Offer' | 'Rejected';
  resumeUsed: string;
  appliedAt: string;
  // admin metadata
  source?: string;
  assignedBy?: string;
  read?: boolean;
  visibleForPlan?: string;
}

const statusColors = {
  Applied: 'bg-blue-500',
  'Under Review': 'bg-yellow-500',
  Interview: 'bg-purple-500',
  Offer: 'bg-green-500',
  Rejected: 'bg-red-500',
};

export default function ApplicationsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  // Show all applications from the 'applications' collection for this user
  const applicationsCollectionRef = useMemoFirebase(
    () => (user ? query(collection(firestore, 'applications'), where('userId', '==', user.uid)) : null),
    [user, firestore]
  );
  const { data: jobs, isLoading, error } = useCollection<any>(applicationsCollectionRef);
  const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  const { data: userData } = useDoc<any>(userDocRef);
  const isAdmin = isAdminEmail(user?.email);
  const resumesCollectionRef = useMemoFirebase(() => (user ? collection(firestore, 'users', user.uid, 'resumes') : null), [user, firestore]);
  const { data: resumes } = useCollection<any>(resumesCollectionRef);
  async function handleStatusChange(id: string, value: Job['status']): Promise<void> {
    if (!isAdmin) {
      toast({
        title: "Permission denied",
        description: "Only admins can change application status.",
        variant: "destructive",
      });
      return;
    }
    try {
      const jobRef = doc(firestore, 'job-applications', id);
      await updateDoc(jobRef, { status: value });
      toast({
        title: "Status updated",
        description: `Application status changed to "${value}".`,
      });
    } catch (err: any) {
      toast({
        title: "Error updating status",
        description: err.message || "An error occurred while updating status.",
        variant: "destructive",
      });
    }
  } // Remove status change for subcollection jobs (applications page only shows 'applications' collection)

  return (
    <div className="w-full max-w-4xl mx-auto p-2 sm:p-4 md:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 md:mb-8 gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Your Applications</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Track the status of all your job applications in one place.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="px-3 sm:px-6">
          <CardTitle className="text-base sm:text-lg">Your Profile</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Basic info and subscription plan</CardDescription>
        </CardHeader>
        <CardContent className="mb-4 px-3 sm:px-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 w-full">
            <div className="text-xs sm:text-sm">
              <div className="text-sm sm:text-lg font-semibold">{userData?.name || user?.displayName}</div>
              <div className="text-xs sm:text-sm text-muted-foreground">{userData?.email || user?.email}</div>
              <div className="mt-2">Plan: <Badge className="text-xs">{userData?.subscription?.plan || 'Free'}</Badge></div>
            </div>
            <div className="text-xs sm:text-sm">
              <div className="text-xs sm:text-sm font-medium">Resumes</div>
              <div className="mt-2 space-y-1 sm:space-y-2">
                {resumes && resumes.length > 0 ? resumes.map((r: any) => (
                  <div key={r.id} className="text-xs sm:text-sm flex items-center gap-2 sm:gap-3">
                    <span className="break-words">{r.role} — {new Date(r.createdAt).toLocaleDateString()}</span>
                    {r.resumeURL && (
                      <a href={r.resumeURL} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline whitespace-nowrap">Download</a>
                    )}
                  </div>
                )) : <div className="text-xs text-muted-foreground">No resumes</div>}
              </div>
            </div>
          </div>
        </CardContent>
        <CardHeader className="px-3 sm:px-6">
          <CardTitle className="text-base sm:text-lg">Application History</CardTitle>
          <CardDescription className="text-xs sm:text-sm">A list of jobs you've applied to via FindZob.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto px-3 sm:px-6">
          {isLoading && <div className="flex justify-center items-center py-12"><Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-primary" /></div>}

          {/* Surface any collection errors for easier debugging */}
          {error && (
            <div className="mb-4 p-2 sm:p-3 bg-red-50 border border-red-200 text-red-700 rounded text-xs sm:text-sm">
              Firestore error: {error.message || String(error)}
            </div>
          )}

          {/* Quick debug: show how many jobs were returned and plan info */}
          {!isLoading && (
            <div className="mb-3 text-xs space-y-1">
              <div className="text-muted-foreground">Found {jobs ? jobs.length : 0} total application(s)</div>
              <div className="text-muted-foreground">Your plan: {userData?.subscription?.plan || 'Starter (default)'}</div>
              {jobs && jobs.some(j => j.visibleForPlan) && (
                <div className="text-muted-foreground">
                  {jobs.filter(j => {
                    const userPlan = userData?.subscription?.plan || 'Free';
                    return true;
                  }).length} applications visible for your plan
                </div>
              )}
            </div>
          )}

          {!isLoading && jobs && jobs.length > 0 && (
            <div className="w-full overflow-x-auto">
            <Table className="min-w-full text-xs sm:text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs sm:text-sm">Company</TableHead>
                  <TableHead className="text-xs sm:text-sm">Role</TableHead>
                  <TableHead className="text-xs sm:text-sm">Location</TableHead>
                  <TableHead className="text-xs sm:text-sm">Applied On</TableHead>
                  <TableHead className="text-xs sm:text-sm">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs
                  .filter(job => {
                    // If a job has a visibleForPlan, show it if:
                    // 1. User has the matching plan, or
                    // 2. User has no plan and job is for Starter plan
                    if (job.visibleForPlan) {
                      const userPlan = userData?.subscription?.plan || 'Free';
                      return true;
                    }
                    // No plan restriction on the job, show it
                    return true;
                  })
                  .sort((a,b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime())
                  .map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium text-xs sm:text-sm">{job.company}</TableCell>
                    <TableCell className="text-xs sm:text-sm">{job.role}</TableCell>
                    <TableCell className="text-xs sm:text-sm">{job.location}</TableCell>
                    <TableCell className="text-xs sm:text-sm">{new Date(job.appliedAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-xs sm:text-sm">
                      <Select value={job.status} onValueChange={(value: Job['status']) => handleStatusChange(job.id, value)} disabled={!isAdmin}>
                        <SelectTrigger className="w-24 sm:w-[180px] h-8 sm:h-10 text-xs sm:text-sm">
                           <SelectValue placeholder="Change status" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.keys(statusColors).map(status => (
                            <SelectItem key={status} value={status} className="text-xs sm:text-sm">
                              <div className="flex items-center gap-2">
                                <span className={`h-2 w-2 rounded-full ${statusColors[status as keyof typeof statusColors]}`}></span>
                                {status}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!isAdmin && <div className="text-xs text-muted-foreground mt-1">Status changes are managed by admins.</div>}
                    </TableCell>
                    <TableCell>
                      {job.read ? (
                        <Badge variant="secondary" title="Read" aria-label="Read" className="text-xs">
                          <Check className="h-2 w-2 sm:h-3 sm:w-3" />
                        </Badge>
                      ) : (
                        <Badge title="Unread" aria-label="Unread" className="text-xs">
                          <Mail className="h-2 w-2 sm:h-3 sm:w-3" />
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}

          {!isLoading && (!jobs || jobs.length === 0) && (
            <div className="text-center py-8 sm:py-12 border-2 border-dashed rounded-lg">
              <Briefcase className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground" />
              <h3 className="mt-3 sm:mt-4 text-sm sm:text-lg font-medium">No Applications Yet</h3>
              <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-muted-foreground">
                Start applying for jobs from the Job Scouting page.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
