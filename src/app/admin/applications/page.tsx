"use client";

import { useState, useMemo } from 'react';
import { collection, collectionGroup, doc, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useUser, updateDocumentNonBlocking } from '@/firebase';
import { isAdminEmail } from '@/lib/admin';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Loader2 } from 'lucide-react';
import { formatName } from '@/lib/utils';
import { plans as allPlans } from '@/lib/seed-plans';
import { generateDocx } from '@/app/actions/resume-actions';
import { MoreVertical } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ApplicationsAdminPage() {
  const [userSearch, setUserSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const firestore = useFirestore();
  const { user } = useUser();
  const isAdmin = isAdminEmail(user?.email);

  const usersCollectionRef = useMemoFirebase(() => (firestore && isAdmin) ? collection(firestore, 'users') : null, [firestore, isAdmin]);
  const { data: users, isLoading: isUsersLoading } = useCollection<any>(usersCollectionRef);

  // load all applications across users to compute counts
  const appsCollectionGroupRef = useMemoFirebase(() => (firestore && isAdmin) ? query(collectionGroup(firestore, 'jobs')) : null, [firestore, isAdmin]);
  const { data: allApplications } = useCollection<any>(appsCollectionGroupRef);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const selectedUser = users?.find((u:any) => u.id === selectedUserId) || null;

  // selected user's resumes & applications
  const selectedUserResumesRef = useMemoFirebase(() => (selectedUserId ? collection(firestore, 'users', selectedUserId, 'resumes') : null), [selectedUserId, firestore]);
  const { data: selectedUserResumes } = useCollection<any>(selectedUserResumesRef);
  const selectedUserJobsRef = useMemoFirebase(() => (selectedUserId ? collection(firestore, 'users', selectedUserId, 'jobs') : null), [selectedUserId, firestore]);
  const { data: selectedUserApplications, isLoading: isAppsLoading } = useCollection<any>(selectedUserJobsRef);

  const [resumeFormat, setResumeFormat] = useState<'docx' | 'pdf'>('docx');
  // per-resume format overrides (resumeId -> 'docx'|'pdf')
  const [resumeFormats, setResumeFormats] = useState<Record<string, 'docx' | 'pdf'>>({});

  const getApplicationsCount = (uid: string) => {
    if (!allApplications) return 0;
    return allApplications.filter(a => a.userId === uid || a.userId === uid).length;
  };

  const updateJobStatus = async (jobId: string, status: string) => {
    if (!selectedUserId) return;
    try {
      const jobRef = doc(firestore, 'users', selectedUserId, 'jobs', jobId);
      await updateDocumentNonBlocking(jobRef, { status });
      // server-side: update status and send email via protected API
      try {
        const token = await (user as any)?.getIdToken?.();
        const app = (selectedUserApplications || []).find((a: any) => a.id === jobId);
        const payload: any = {
          userId: selectedUserId,
          jobId,
          status,
          userEmail: selectedUser?.email,
          userName: selectedUser?.name || selectedUser?.displayName || '',
          company: app?.company,
          role: app?.role,
        };
        if (token) payload.idToken = token;

        await fetch('/api/admin/update-application-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch (e) {
        console.error('server notify job status change failed', e);
      }
    } catch (err) {
      console.error('update job status error', err);
    }
  };

  const handleSelectUser = (u: any) => {
    setSelectedUserId(u.id);
    setDetailsOpen(true);
    if (!u.adminSeen) {
      try {
        const userRef = doc(firestore, 'users', u.id);
        updateDocumentNonBlocking(userRef, { adminSeen: true });
      } catch (err) {
        console.error('mark seen error', err);
      }
    }
  };

  const downloadSelectedResumes = async () => {
    if (!selectedUser) return;
    const matches = selectedUserResumes || [];
    for (const r of matches) {
      try {
          if (resumeFormat === 'docx') {
          const base64 = await generateDocx(r, null, selectedUser);
          const blob = new Blob([Buffer.from(base64, 'base64')], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
          try {
            const mod = await import('file-saver');
            (mod as any).saveAs(blob, `${selectedUser.name || 'user'}-resume-${(r.role||'role').replace(/\s+/g,'-')}.docx`);
          } catch (e) {
            console.error('file-saver dynamic import failed', e);
          }
        } else {
          // Use Puppeteer-based PDF generation for high-quality text-based PDFs
          const { convertFirestoreToPlain } = await import('@/lib/utils');
          const plainResume = convertFirestoreToPlain(r);
          const plainUser = convertFirestoreToPlain(selectedUser);
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
              (mod as any).saveAs(blob, `${selectedUser.name || 'user'}-resume-${(r.role||'role').replace(/\s+/g,'-')}.pdf`);
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
            const { getResumeHTML } = await import('@/lib/resume-template');
            const html = getResumeHTML(r, selectedUser || null);
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
              pdf.save(`${selectedUser.name || 'user'}-resume-${(r.role||'role').replace(/\s+/g,'-')}.pdf`);
            } finally {
              container.remove();
            }
          }
        }
      } catch (err) {
        console.error('download resume error', err);
      }
    }
  };

  return (
    <div className="p-2 md:p-6">
      <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6">Admin — Applications</h1>
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        <div className="flex-1 min-w-0">
          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
              <CardDescription>Click a user to view details. New users are bold.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex flex-col md:flex-row gap-2 md:gap-4">
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded text-sm"
                  placeholder="Search users by name or email..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                />
                <Select value={planFilter} onValueChange={setPlanFilter}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Filter by plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Plans</SelectItem>
                    {allPlans.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                    <SelectItem value="Free">Free</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {isUsersLoading ? (
                <div className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : (
                <div className="overflow-x-auto max-h-[70vh] -mx-2 md:mx-0">
                  <Table className="min-w-full md:min-w-[900px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs sm:text-sm px-2 sm:px-4 py-2">User Name</TableHead>
                        <TableHead className="text-xs sm:text-sm px-2 sm:px-4 py-2 hidden sm:table-cell">Email</TableHead>
                        <TableHead className="text-xs sm:text-sm px-2 sm:px-4 py-2 hidden md:table-cell">Role</TableHead>
                        <TableHead className="text-xs sm:text-sm px-2 sm:px-4 py-2">Plan</TableHead>
                        <TableHead className="text-xs sm:text-sm px-2 sm:px-4 py-2">Applications</TableHead>
                        <TableHead className="text-xs sm:text-sm px-2 sm:px-4 py-2">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(users || [])
                        .filter((u:any) => {
                          const plan = u.subscription?.plan || 'Free';
                          const planMatch = planFilter === 'all' || plan === planFilter;
                          const search = userSearch.toLowerCase();
                          const searchMatch =
                            (u.name && u.name.toLowerCase().includes(search)) ||
                            (u.displayName && u.displayName.toLowerCase().includes(search)) ||
                            (u.email && u.email.toLowerCase().includes(search));
                          return planMatch && searchMatch;
                        })
                        .slice()
                        .sort((a,b) => {
                          const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                          const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                          return tb - ta;
                        })
                        .map((u:any) => (
                        <TableRow key={u.id} className="hover:bg-muted cursor-pointer text-xs sm:text-sm" onClick={() => handleSelectUser(u)}>
                          <TableCell className="px-2 sm:px-4 py-2">
                            <div className={`${u.adminSeen ? '' : 'font-bold'}`}>{formatName(u.name || u.displayName || u.email)}</div>
                            <div className="text-xs text-muted-foreground block sm:hidden">{u.email}</div>
                          </TableCell>
                          <TableCell className="px-2 sm:px-4 py-2 hidden sm:table-cell">{u.email}</TableCell>
                          <TableCell className="px-2 sm:px-4 py-2 hidden md:table-cell">{u.role || '-'}</TableCell>
                          <TableCell className="px-2 sm:px-4 py-2"><Badge>{u.subscription?.plan || 'Free'}</Badge></TableCell>
                          <TableCell className="px-2 sm:px-4 py-2 text-right">
                            <Badge>{getApplicationsCount(u.id) || 0}</Badge>
                          </TableCell>
                          <TableCell className="px-2 sm:px-4 py-2">
                            <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); setSelectedUserId(u.id); setDetailsOpen(true); }}>
                              Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      {/* Details dialog (lightbox) */}
      <Dialog open={detailsOpen} onOpenChange={(open) => {
        setDetailsOpen(open);
        if (!open) setSelectedUserId(null);
      }}>
        <DialogContent className="max-w-4xl">
            <DialogHeader>
            <DialogTitle>{formatName(selectedUser?.name || selectedUser?.displayName || 'User details')}</DialogTitle>
            <DialogDescription>Selected user details, applications and resumes.</DialogDescription>
          </DialogHeader>

          {selectedUser ? (
            <div className="space-y-4 mt-2">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xl font-semibold">{formatName(selectedUser.name || selectedUser.displayName)}</div>
                  <div className="text-sm text-muted-foreground">{selectedUser.email}</div>
                  <div className="mt-2">Plan: <Badge>{selectedUser.subscription?.plan || 'Free'}</Badge></div>
                </div>
                <div className="flex items-center gap-3">
                  <Select value={resumeFormat} onValueChange={(v: any) => setResumeFormat(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="docx">DOCX</SelectItem>
                      <SelectItem value="pdf">PDF</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={downloadSelectedResumes}>Download Resumes</Button>
                </div>
              </div>

              <div>
                <h3 className="font-semibold">Applications</h3>
                {isAppsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : (
                  (selectedUserApplications && selectedUserApplications.length > 0) ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Company</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedUserApplications?.map((a:any) => (
                          <TableRow key={a.id}>
                            <TableCell>{a.company}</TableCell>
                            <TableCell>{a.role}</TableCell>
                            <TableCell><Badge>{a.status}</Badge></TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Update status</DropdownMenuLabel>
                                  <DropdownMenuItem onClick={() => updateJobStatus(a.id, 'Applied')}>Applied</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => updateJobStatus(a.id, 'Interview')}>Interview</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => updateJobStatus(a.id, 'Offer')}>Offer</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => updateJobStatus(a.id, 'Rejected')}>Rejected</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-sm text-muted-foreground">No applications for this user.</div>
                  )
                )}
              </div>

              <div>
                <h3 className="font-semibold">Resumes</h3>
                {(selectedUserResumes && selectedUserResumes.length > 0) ? (
                  <div className="space-y-2">
                    {selectedUserResumes.map((r:any) => (
                      <div key={r.id} className="p-3 border rounded">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{r.role}</div>
                            <div className="text-sm text-muted-foreground">{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ''}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Select value={resumeFormats[r.id] ?? resumeFormat} onValueChange={(v: any) => setResumeFormats(prev => ({ ...prev, [r.id]: v }))}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="docx">DOCX</SelectItem>
                                <SelectItem value="pdf">PDF</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button onClick={async () => {
                              const chosenFormat = resumeFormats[r.id] ?? resumeFormat;
                              try {
                                if (chosenFormat === 'docx') {
                                  const base64 = await generateDocx(r, null, selectedUser);
                                  const blob = new Blob([Buffer.from(base64, 'base64')], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
                                  try {
                                    const mod = await import('file-saver');
                                    (mod as any).saveAs(blob, `${selectedUser.name || 'user'}-resume-${(r.role||'role').replace(/\s+/g,'-')}.docx`);
                                  } catch (e) {
                                    console.error('file-saver dynamic import failed', e);
                                  }
                                } else {
                                  // Use Puppeteer-based PDF generation for high-quality text-based PDFs
                                  const { convertFirestoreToPlain } = await import('@/lib/utils');
                                  const plainResume = convertFirestoreToPlain(r);
                                  const plainUser = convertFirestoreToPlain(selectedUser);
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
                                      (mod as any).saveAs(blob, `${selectedUser.name || 'user'}-resume-${(r.role||'role').replace(/\s+/g,'-')}.pdf`);
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
                                    const { getResumeHTML } = await import('@/lib/resume-template');
                                    const html = getResumeHTML(r, selectedUser || null);
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
                                      pdf.save(`${selectedUser.name || 'user'}-resume-${(r.role||'role').replace(/\s+/g,'-')}.pdf`);
                                    } finally {
                                      container.remove();
                                    }
                                  }
                                }
                              } catch (err) {
                                console.error('download single resume error', err);
                              }
                            }}>Download</Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No resumes available.</div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground mt-2">No user selected.</div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDetailsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
