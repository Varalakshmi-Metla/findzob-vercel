
'use client';

import { useState } from 'react';
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
  addDocumentNonBlocking,
  deleteDocumentNonBlocking,
  updateDocumentNonBlocking,
  useCollection,
  useFirestore,
  useMemoFirebase,
  useUser,
  useDoc,
} from '@/firebase';
import { generateResume, generateResumeForJob } from '@/ai/flows/generate-resume-flow-v2';
import { isAdminEmail } from '@/lib/admin';
import { collection, doc } from 'firebase/firestore';
import { Loader2, Trash2, Edit, Check, Mail } from 'lucide-react';
// dynamic import of file-saver will be used where needed to avoid server-side imports
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

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
  // admin metadata
  source?: 'admin' | 'user' | string;
  assignedBy?: string;
  read?: boolean;
  visibleForPlan?: string;
};

const statusOptions: JobApplication['status'][] = ['Applied', 'Under Review', 'Interview', 'Offer', 'Rejected'];

export default function AdminScoutingPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUserDetailsOpen, setIsUserDetailsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentApplication, setCurrentApplication] = useState<Partial<JobApplication> | null>(null);
  const [resumeFormat, setResumeFormat] = useState<'pdf' | 'docx'>('docx');
  const [genRole, setGenRole] = useState<string>('');
  const [isGeneratingResumes, setIsGeneratingResumes] = useState(false);

  const { user } = useUser();
  const isAdmin = isAdminEmail(user?.email);

  const usersCollectionRef = useMemoFirebase(() => (firestore && isAdmin) ? collection(firestore, 'users') : null, [firestore, isAdmin]);
  const { data: users, isLoading: isUsersLoading } = useCollection<User & { subscription?: { plan?: string; status?: string } }>(usersCollectionRef);
  const plansCollectionRef = useMemoFirebase(() => (firestore && isAdmin) ? collection(firestore, 'plans') : null, [firestore, isAdmin]);
  const { data: plansData = [], isLoading: isPlansLoading } = useCollection<any>(plansCollectionRef);
  // Fetch selected user's doc and resumes to show details
  const selectedUserDocRef = useMemoFirebase(() => selectedUserId ? doc(firestore, 'users', selectedUserId) : null, [selectedUserId, firestore]);
  const { data: selectedUserData } = useDoc<any>(selectedUserDocRef as any);
  const selectedUserResumesRef = useMemoFirebase(() => (selectedUserId ? collection(firestore, 'users', selectedUserId, 'resumes') : null), [selectedUserId, firestore]);
  const { data: selectedUserResumes } = useCollection<any>(selectedUserResumesRef);

  const userApplicationsCollectionRef = useMemoFirebase(
    () => (selectedUserId ? collection(firestore, 'users', selectedUserId, 'jobs') : null),
    [selectedUserId, firestore]
  );
  const { data: applications, isLoading: isApplicationsLoading } = useCollection<JobApplication>(userApplicationsCollectionRef);

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
        // admin metadata fields
        source: 'admin',
  assignedBy: user?.uid || user?.email || 'admin',
        read: false,
  visibleForPlan: (plansData && plansData.length > 0) ? (plansData[0].name || plansData[0].id || 'Free') : 'Free',
      });
      setIsEditing(false);
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!currentApplication || !selectedUserId || !userApplicationsCollectionRef) return;

    setIsSubmitting(true);
    try {
      if (isEditing && currentApplication.id) {
        const appRef = doc(firestore, 'users', selectedUserId, 'jobs', currentApplication.id);
        await updateDocumentNonBlocking(appRef, {
          company: currentApplication.company,
          role: currentApplication.role,
          location: currentApplication.location,
          status: currentApplication.status,
          // allow admin to update metadata as well
          read: Boolean(currentApplication.read),
          visibleForPlan: currentApplication.visibleForPlan || ((plansData && plansData.length > 0) ? (plansData[0].name || plansData[0].id) : 'Free'),
        });
        toast({ title: 'Application Updated', description: 'The application details have been updated.' });
        // Notify via server-side protected API (updates and sends email)
        try {
          const token = await (user as any)?.getIdToken?.();
          if (user?.email) {
            await fetch('/api/admin/update-application-status', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-admin-email': user.email },
              body: JSON.stringify({
                userId: selectedUserId,
                jobId: currentApplication.id,
                status: currentApplication.status,
                userEmail: selectedUserData?.email,
                userName: selectedUserData?.name || selectedUserData?.displayName,
                company: currentApplication.company,
                role: currentApplication.role,
              }),
            });
          }
        } catch (e) {
          console.error('server notify application updated failed', e);
        }
  // NOTE: writing into another user's notifications subcollection from the client
  // may be blocked by Firestore rules. Implement a server-side endpoint (Cloud
  // Function or API route) to perform admin-side writes into users/{uid}/notifications
  // using admin credentials if you need to notify users about admin actions.
      } else {
        await addDocumentNonBlocking(userApplicationsCollectionRef, {
          ...currentApplication,
          userId: selectedUserId,
          appliedAt: new Date().toISOString(),
          source: currentApplication.source || 'admin',
          assignedBy: currentApplication.assignedBy || user?.uid || user?.email,
          read: false,
          visibleForPlan: currentApplication.visibleForPlan || 'Free',
        });
        toast({ title: 'Application Added', description: 'The new application has been added for the user.' });
        // Optionally notify via server API - for created applications we enqueue an 'application_created' email
        try {
          const token = await (user as any)?.getIdToken?.();
          if (user?.email) {
            await fetch('/api/admin/update-application-status', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-admin-email': user.email },
              body: JSON.stringify({
                userId: selectedUserId,
                jobId: null,
                status: 'Created',
                userEmail: selectedUserData?.email,
                userName: selectedUserData?.name || selectedUserData?.displayName,
                company: currentApplication.company,
                role: currentApplication.role,
              }),
            });
          }
        } catch (e) {
          console.error('server notify application created failed', e);
        }
  // NOTE: avoid client-side writes to other user's notification collections.
  // Use a trusted server-side function to add notifications for users when an admin
  // creates or updates resources on their behalf.
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
    if (!selectedUserId) return;
    const appRef = doc(firestore, 'users', selectedUserId, 'jobs', appId);
    deleteDocumentNonBlocking(appRef);
    toast({ title: 'Application Deleted', description: 'The application has been removed.' });
    // NOTE: consider using a server-side function to notify the user about deletions
    // rather than writing into users/{uid}/notifications from the client.
  };

  const toggleRead = async (appId: string, currentRead: boolean | undefined) => {
    if (!selectedUserId) return;
    const appRef = doc(firestore, 'users', selectedUserId, 'jobs', appId);
    try {
      await updateDocumentNonBlocking(appRef, { read: !currentRead });
      // when an application is marked as read, update the user's lastReadAt
      if (!currentRead) {
        const userRef = doc(firestore, 'users', selectedUserId);
        await updateDocumentNonBlocking(userRef, { lastReadAt: new Date().toISOString() });
      }
      toast({ title: `Marked ${!currentRead ? 'Read' : 'Unread'}`, description: 'Application read status updated.' });
    } catch (err) {
      console.error('toggleRead error', err);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update read status.' });
    }
    // NOTE: to inform the user about changes an admin makes, call a server-side
    // endpoint that writes the notification using admin credentials.
  }
  
  const selectedUserName = users?.find(u => u.id === selectedUserId)?.name;

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Job Scouting</h1>
          <p className="text-muted-foreground">Manage job applications for specific users.</p>
        </div>
        <div className="flex items-center gap-2">
          <input id="scouting-import-input" type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={async (e) => {
            const f = e.currentTarget.files && e.currentTarget.files[0];
            if (!f) return;
            try {
              const { read, utils } = await import('xlsx');
              const data = await f.arrayBuffer();
              const wb = read(data, { type: 'array' });
              const sheet = wb.Sheets[wb.SheetNames[0]];
              const rows = utils.sheet_to_json(sheet, { defval: '' });
              const res = await fetch('/api/admin/import-scouting', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rows }) });
              const j = await res.json().catch(() => ({}));
              if (!res.ok || j?.ok === false) throw new Error(j?.error || 'Import failed');
              window.location.reload();
            } catch (err) {
              console.error('Import scouting failed', err);
              alert('Import failed: ' + ((err as any)?.message || String(err)));
            }
          }} />
          <button className="px-3 py-1 bg-gray-700 rounded text-white" onClick={() => (document.getElementById('scouting-import-input') as HTMLInputElement)?.click()}>Import Scouting</button>
          <button className="px-3 py-1 bg-blue-600 rounded text-white" onClick={async () => {
            try {
              const resp = await fetch('/api/admin/export-scouting');
              const json = await resp.json();
              if (!resp.ok || json?.ok === false) throw new Error(json?.error || 'Export failed');
              const rows = json.rows || [];
              const { utils, write } = await import('xlsx');
              const ws = utils.json_to_sheet(rows);
              const wb = utils.book_new();
              utils.book_append_sheet(wb, ws, 'scouting');
              const wbout = write(wb, { bookType: 'xlsx', type: 'array' });
              const blob = new Blob([wbout], { type: 'application/octet-stream' });
              const { saveAs } = await import('file-saver');
              saveAs(blob, `scouting-export-${new Date().toISOString().slice(0,10)}.xlsx`);
            } catch (err) {
              console.error('Export scouting failed', err);
              alert('Export failed: ' + ((err as any)?.message || String(err)));
            }
          }}>Export Scouting</button>
        </div>
      </div>
      
      <Card className="mb-8">
        <CardHeader>
            <CardTitle>Select a User</CardTitle>
            <CardDescription>Choose a user to view and manage their job applications.</CardDescription>
        </CardHeader>
        <CardContent>
       {isUsersLoading ? (
         <Loader2 className="h-6 w-6 animate-spin" />
       ) : (
        <div>
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:gap-4">
            <Input placeholder="Search users by name or email" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="flex-1" />
            <div className="mt-2 sm:mt-0 w-full sm:w-48">
              <Select value={planFilter} onValueChange={(value: string) => setPlanFilter(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Plans</SelectItem>
                  {plansData && plansData.length > 0 ? (
                    plansData.map((p: any) => (
                      <SelectItem key={p.id || p.__id || p.name} value={p.name || p.id || p.__id}>{p.name || p.id || p.__id}</SelectItem>
                    ))
                  ) : (
                    // fallback if no admin plans defined
                    <>
                      <SelectItem value="Starter">Starter</SelectItem>
                      <SelectItem value="Pro">Pro</SelectItem>
                      <SelectItem value="Enterprise">Enterprise</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
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
              {(users || [])
                .filter(u => `${u.name} ${u.email}`.toLowerCase().includes(userSearch.toLowerCase()))
                .filter(u => planFilter === 'All' || ((u.subscription?.plan || 'Free') === planFilter))
                .sort((a,b) => {
                  const order = { Enterprise: 0, Pro: 1, Starter: 2 } as any;
                  const pa = a.subscription?.plan || 'Free';
                  const pb = b.subscription?.plan || 'Free';
                  return (order[pa] ?? 99) - (order[pb] ?? 99);
                })
                .map(u => (
                <TableRow key={u.id} className="hover:bg-muted">
                  <TableCell>{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{u.subscription?.plan || 'Free'}</TableCell>
                  <TableCell>{u.lastReadAt ? new Date(u.lastReadAt).toLocaleString() : <span className="text-muted-foreground">--</span>}</TableCell>
                  <TableCell className="text-right">
                    <Button onClick={() => { setSelectedUserId(u.id); setIsUserDetailsOpen(true); }} className="mr-2">View</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
       )}
        </CardContent>
      </Card>
      <Dialog open={isUserDetailsOpen} onOpenChange={(open) => { if (!open) { setIsUserDetailsOpen(false); } setIsUserDetailsOpen(open); }}>
        <DialogContent className="w-full sm:max-w-5xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>Selected user information and subscription</DialogDescription>
          </DialogHeader>
          <div className="w-full max-w-5xl mx-auto px-4 sm:px-6">
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>User Details</CardTitle>
                <CardDescription>Selected user information and subscription</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{selectedUserData?.name || selectedUserName}</div>
                    <div className="text-sm text-muted-foreground">{selectedUserData?.email}</div>
                    <div className="mt-2">Plan: <Badge>{selectedUserData?.subscription?.plan || 'Free'}</Badge></div>
                    <div className="mt-2">Profile: {selectedUserData?.profileCompleted ? <Badge variant="secondary">Complete</Badge> : <Badge>Incomplete</Badge>}</div>
                    <div className="mt-2 text-sm">Last Profile Update: {selectedUserData?.profileUpdatedAt ? new Date(selectedUserData.profileUpdatedAt).toLocaleString() : <span className="text-muted-foreground">Never</span>}</div>
                    <div className="mt-2 text-sm">Last Read: {selectedUserData?.lastReadAt ? new Date(selectedUserData.lastReadAt).toLocaleString() : <span className="text-muted-foreground">Never</span>}</div>
                    <div className="mt-4">
                      <div className="mt-4">
                        <Button onClick={() => openModal()} disabled={!selectedUserId}>
                          Add Application
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">Resumes</div>
                    <div className="mt-2 space-y-2">
                      {selectedUserResumes && selectedUserResumes.length > 0 ? selectedUserResumes.map((r: any) => (
                        <div key={r.id} className="text-sm">{r.role} — {new Date(r.createdAt).toLocaleDateString()}</div>
                      )) : <div className="text-sm text-muted-foreground">No resumes</div>}
                    </div>
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                      <div className="sm:col-span-2">
                        <Button onClick={async () => {
                          if (!selectedUserData) return;
                          const desiredRolesRaw = selectedUserData.jobPreferences ? (Array.isArray(selectedUserData.jobPreferences) ? selectedUserData.jobPreferences.map((p:any)=>p.desiredRoles).join(',') : '') : '';
                          const desiredRoles = desiredRolesRaw ? desiredRolesRaw.split(',').map((s:string)=>s.trim().toLowerCase()) : [];
                          const matches = (selectedUserResumes || []).filter((res: any) => {
                            if (!res.role) return false;
                            if (desiredRoles.length === 0) return true;
                            return desiredRoles.some((dr: string) => res.role.toLowerCase().includes(dr));
                          });
                          if (matches.length === 0) {
                            toast({ title: 'No matches', description: 'No resumes match the user\'s desired roles.' });
                            return;
                          }
                          for (const r of matches) {
                            try {
                              if (resumeFormat === 'docx') {
                                const { generateDocx } = await import('@/app/actions/resume-actions');
                                const base64 = await generateDocx(r, null, selectedUserData);
                                const blob = new Blob([Buffer.from(base64, 'base64')], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
                try {
                  const mod = await import('file-saver');
                  (mod as any).saveAs(blob, `${selectedUserData.name || 'user'}-resume-${(r.role||'role').replace(/\s+/g,'-')}.docx`);
                } catch (e) {
                  console.error('file-saver dynamic import failed', e);
                }
                              } else {
                                // Use Puppeteer-based PDF generation for high-quality text-based PDFs
                                const { convertFirestoreToPlain } = await import('@/lib/utils');
                                const plainResume = convertFirestoreToPlain(r);
                                const plainUser = convertFirestoreToPlain(selectedUserData);
                                try {
                                  console.log('Generating PDF using Puppeteer...');
                                  const { generateResumePdfPuppeteer } = await import('@/app/actions/resume-actions');
                                  const base64Pdf = await generateResumePdfPuppeteer(plainUser, r.role || 'role');
                                  console.log('PDF generated from Puppeteer successfully');
                                  // Convert base64 to binary
                                  const binaryString = atob(base64Pdf);
                                  const bytes = new Uint8Array(binaryString.length);
                                  for (let i = 0; i < binaryString.length; i++) {
                                    bytes[i] = binaryString.charCodeAt(i);
                                  }
                                  const blob = new Blob([bytes], { type: 'application/pdf' });
                                  try {
                                    const mod = await import('file-saver');
                                    (mod as any).saveAs(blob, `${selectedUserData.name || 'user'}-resume-${(r.role||'role').replace(/\s+/g,'-')}.pdf`);
                                    console.log('PDF downloaded successfully');
                                  } catch (e) {
                                    console.error('file-saver dynamic import failed', e);
                                  }
                                } catch (puppeteerError) {
                                  console.error('Puppeteer PDF generation failed, falling back to image-based PDF', puppeteerError);
                                  // Fall back to HTML-to-PDF (image-based)
                                  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
                                    await import('html2canvas'),
                                    await import('jspdf')
                                  ]);
                                  const html = (await import('@/lib/resume-template')).getResumeHTML(r, selectedUserData || null);
                                  const container = document.createElement('div');
                                  container.style.position = 'fixed';
                                  container.style.left = '-10000px';
                                  container.innerHTML = html;
                                  document.body.appendChild(container);
                                  try {
                                    const canvas = await html2canvas(container, { scale: 2 });
                                    const imgData = canvas.toDataURL('image/png');
                                    const pdf = new jsPDF({ unit: 'px', format: [canvas.width, canvas.height] });
                                    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
                                    pdf.save(`${selectedUserData.name || 'user'}-resume-${(r.role||'role').replace(/\s+/g,'-')}.pdf`);
                                  } finally {
                                    container.remove();
                                  }
                                }
                              }
                            } catch (err) {
                              console.error('download resume error', err);
                              toast({ variant: 'destructive', title: 'Download failed', description: 'Could not generate or download a resume.' });
                            }
                          }
                        }}>Download Resumes by Desired Roles</Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select value={resumeFormat} onValueChange={(v: 'pdf' | 'docx') => setResumeFormat(v)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="docx">DOCX</SelectItem>
                            <SelectItem value="pdf">PDF</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Admin: generate resume(s) for this user based on their desired roles */}
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                      <div className="sm:col-span-2">
                        <Label>Generate Resume for User</Label>
                        <div className="mt-2 flex items-center gap-2">
                          <Select value={genRole} onValueChange={(v: string) => setGenRole(v)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select role or choose 'All'" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__ALL__">Generate All Desired Roles</SelectItem>
                              {selectedUserData?.jobPreferences && selectedUserData.jobPreferences.length > 0 && selectedUserData.jobPreferences.map((pref: any, idx: number) => (
                                <SelectItem key={idx} value={pref.desiredRoles}>{pref.desiredRoles}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button disabled={isGeneratingResumes || !selectedUserId || (!genRole)} onClick={async () => {
                            if (!selectedUserId || !selectedUserData || !selectedUserResumesRef) {
                              toast({ variant: 'destructive', title: 'Error', description: 'Missing user or firestore reference.' });
                              return;
                            }
                            setIsGeneratingResumes(true);
                            try {
                              const rolesToGenerate: string[] = [];
                              if (genRole === '__ALL__') {
                                if (selectedUserData.jobPreferences && Array.isArray(selectedUserData.jobPreferences)) {
                                  for (const p of selectedUserData.jobPreferences) {
                                    if (p.desiredRoles) rolesToGenerate.push(...p.desiredRoles.split(',').map((s:string)=>s.trim()).filter(Boolean));
                                  }
                                }
                              } else {
                                rolesToGenerate.push(genRole);
                              }

                              if (rolesToGenerate.length === 0) {
                                toast({ variant: 'destructive', title: 'No Roles', description: 'No roles to generate.' });
                                return;
                              }

                              for (const role of rolesToGenerate) {
                                try {
                                  const generatedData = await generateResume(selectedUserData, role);
                                  await addDocumentNonBlocking(selectedUserResumesRef, {
                                    ...generatedData,
                                    role,
                                    createdAt: new Date().toISOString(),
                                    interviewHistory: [],
                                    userId: selectedUserId,
                                    createdBy: user?.uid || user?.email || 'admin',
                                  });
                                  // best-effort: notify user email that a resume was generated
                                  try {
                                    await fetch('/api/send-email', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ to: selectedUserData?.email, type: 'resume_generated', templateData: { name: selectedUserData?.name, role } }),
                                    });
                                  } catch (e) {
                                    console.error('notify user resume generated failed', e);
                                  }
                                } catch (err) {
                                  console.error('generate resume error', err);
                                  toast({ variant: 'destructive', title: 'Generation failed for role', description: role });
                                }
                              }

                              toast({ title: 'Generation Complete', description: 'Resumes generated and saved to user.' });
                              setGenRole('');
                            } finally {
                              setIsGeneratingResumes(false);
                            }
                          }}>
                            {isGeneratingResumes ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Generate
                          </Button>
                        </div>
                      </div>
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
                          <TableCell><Badge>{app.status}</Badge></TableCell>
                          <TableCell>
                            {app.read ? (
                              <Badge variant="secondary" title="Read" aria-label="Read">
                                <Check className="h-3 w-3" />
                              </Badge>
                            ) : (
                              <Badge title="Unread" aria-label="Unread">
                                <Mail className="h-3 w-3" />
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => openModal(app)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleRead(app.id, (app as any).read)}
                              title={app.read ? 'Mark Unread' : 'Mark Read'}
                              aria-label={app.read ? 'Mark Unread' : 'Mark Read'}
                            >
                              {app.read ? <Mail className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(app.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
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
            <DialogDescription>
              Fill in the details for the user's job application.
            </DialogDescription>
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
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="visibleForPlan" className="text-right">Visible For Plan</Label>
              <Select value={currentApplication?.visibleForPlan || 'Free'} onValueChange={(value: string) => setCurrentApplication({...currentApplication, visibleForPlan: value})}>
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {plansData && plansData.length > 0 ? (
                    plansData.map((p: any) => (
                      <SelectItem key={p.id || p.__id || p.name} value={p.name || p.id || p.__id}>{p.name || p.id || p.__id}</SelectItem>
                    ))
                  ) : (
                    <>
                      <SelectItem value="Starter">Starter</SelectItem>
                      <SelectItem value="Pro">Pro</SelectItem>
                      <SelectItem value="Enterprise">Enterprise</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            {/* Assigned By hidden in lightbox by request */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="read" className="text-right">Read</Label>
              <div className="col-span-3">
                <input
                  id="read"
                  type="checkbox"
                  checked={Boolean(currentApplication?.read)}
                  onChange={async (e) => {
                    const checked = e.target.checked;
                    // optimistic update
                    setCurrentApplication(prev => ({ ...(prev || {}), read: checked }));

                    // if this is an existing application persisted in Firestore, update it
                    if (currentApplication && currentApplication.id && selectedUserId) {
                      try {
                        const appRef = doc(firestore, 'users', selectedUserId, 'jobs', currentApplication.id);
                        await updateDocumentNonBlocking(appRef, { read: checked });
                        // when marking read, update user's lastReadAt
                        if (checked) {
                          const userRef = doc(firestore, 'users', selectedUserId);
                          await updateDocumentNonBlocking(userRef, { lastReadAt: new Date().toISOString() });
                        }
                        toast({ title: 'Updated', description: `Marked ${checked ? 'read' : 'unread'}.` });
                      } catch (err) {
                        console.error('update read status error', err);
                        // rollback optimistic change
                        setCurrentApplication(prev => ({ ...(prev || {}), read: !checked }));
                        toast({ variant: 'destructive', title: 'Error', description: 'Could not update read status.' });
                      }
                    }
                  }}
                />
              </div>
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
