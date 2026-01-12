'use client';

import { useState, useRef, useMemo } from 'react';
import { useFirestore, useCollection, useUser } from '@/firebase';
import { collection, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { useUser as useAuthUser } from '@/firebase';
import { isAdminEmail } from '@/lib/admin';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL, UploadTask } from "firebase/storage";
import { Loader2 } from 'lucide-react';

// This should be replaced with Firestore integration

export default function HotJobsAdminPage() {
  const { user } = useAuthUser();
  const isAdmin = isAdminEmail(user?.email);
  const firestore = useFirestore();
  const hotJobsCollectionRef = useMemo(() => firestore ? collection(firestore, 'today-hot-jobs-usa') : null, [firestore]);
  const { data: hotJobs, isLoading: hotJobsLoading, error: hotJobsError } = useCollection<any>(hotJobsCollectionRef);

  const [newJob, setNewJob] = useState({ title: "", company: "", location: "", salary: "", type: "", logo: "", priority: false, tags: "" });
  const [editJobId, setEditJobId] = useState<string | null>(null);
  const [editJob, setEditJob] = useState<any>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const MAX_FILE_BYTES = 2_500_000; // 2.5 MB
  const [searchQuery, setSearchQuery] = useState('');
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [bulkUploadCount, setBulkUploadCount] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Resize image using canvas to max width/height to reduce upload size
  const resizeImage = (file: File, maxWidth = 800, quality = 0.8): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth) {
          const ratio = maxWidth / width;
          width = maxWidth;
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas not supported'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url);
          if (blob) resolve(blob);
          else reject(new Error('Canvas toBlob failed'));
        }, file.type, quality);
      };
      img.onerror = (e) => {
        URL.revokeObjectURL(url);
        reject(new Error('Image load error'));
      };
      img.src = url;
    });
  };

  if (!isAdmin) {
    return <div className="p-8 text-center">Access denied. Admins only.</div>;
  }

  const handleAddJob = async (): Promise<boolean> => {
    if (!hotJobsCollectionRef) return false;
    const jobData = { ...newJob, tags: newJob.tags.split(",").map(t => t.trim()) };
    await addDoc(hotJobsCollectionRef, jobData);
    setNewJob({ title: "", company: "", location: "", salary: "", type: "", logo: "", priority: false, tags: "" });
    return true;
  };

  const handleRemoveJob = async (docId: string) => {
    if (!hotJobsCollectionRef || !docId) return;
    const jobDocRef = doc(hotJobsCollectionRef, docId);
    await deleteDoc(jobDocRef);
  };
  
  if (!firestore) {
    return <div>Loading...</div>
  }

    const filteredJobs = (hotJobs || []).filter(job => {
      const query = searchQuery.toLowerCase();
      return (
        (job.title || '').toLowerCase().includes(query) ||
        (job.company || '').toLowerCase().includes(query) ||
        (job.location || '').toLowerCase().includes(query)
      );
    });

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-8">Jobs</h1>
      <Card>
        <CardHeader>
          <div className="w-full flex items-start justify-between">
            <CardTitle>Jobs</CardTitle>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={async (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (!file) return;
                  if (!hotJobsCollectionRef) { alert('Firestore not available.'); return; }
                  setIsBulkUploading(true);
                  setBulkUploadCount(null);
                  try {
                    const name = file.name.toLowerCase();
                    let rows: any[] = [];
                    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
                      try {
                        const xlsx = await import('xlsx');
                        const data = await file.arrayBuffer();
                        const workbook = xlsx.read(data, { type: 'array' });
                        const sheetName = workbook.SheetNames[0];
                        const sheet = workbook.Sheets[sheetName];
                        rows = xlsx.utils.sheet_to_json(sheet, { defval: '' }) as any[];
                      } catch (err) {
                        console.warn('xlsx parse failed, will try CSV fallback', err);
                      }
                    }
                    if (rows.length === 0) {
                      // fallback: parse CSV
                      const text = await file.text();
                      const lines = text.split(/\r?\n/).filter(Boolean);
                      if (lines.length === 0) { alert('No rows found in file'); return; }
                      const headers = lines[0].split(',').map(h => h.trim());
                      for (let i = 1; i < lines.length; i++) {
                        const cols = lines[i].split(',');
                        const obj: any = {};
                        for (let j = 0; j < headers.length; j++) obj[headers[j]] = (cols[j] || '').trim();
                        rows.push(obj);
                      }
                    }

                    // Map rows to job objects and bulk add to Firestore
                    const cleanValue = (val: any) => String(val || '').replace(/^"|"$/g, '').trim();
                    const toAdd = rows.map(r => ({
                      title: cleanValue(r.title || r.Title || r.job_title),
                      company: cleanValue(r.company || r.Company || r.employer),
                      location: cleanValue(r.location || r.Location),
                      salary: cleanValue(r.salary || r.Salary),
                      type: cleanValue(r.type || r.Type || r.employment_type),
                      logo: cleanValue(r.logo || r.logoURL || r.logo_url),
                      tags: cleanValue(r.tags || r.Tags).split(',').map((s:string) => s.trim()).filter(Boolean),
                      priority: cleanValue(r.priority || r.Priority || r.is_priority).toLowerCase() === 'true',
                    }));

                    let added = 0;
                    for (const jobData of toAdd) {
                      if (!hotJobsCollectionRef) continue;
                      try {
                        await addDoc(hotJobsCollectionRef, jobData as any);
                        added++;
                        setBulkUploadCount(added);
                      } catch (err: any) {
                        console.error('Failed to add job from bulk upload', err);
                      }
                    }
                    alert(`Bulk upload complete. Added ${added} jobs.`);
                  } catch (err: any) {
                    console.error('Bulk upload failed', err);
                    alert('Bulk upload failed: ' + (err?.message || err));
                  } finally {
                    setIsBulkUploading(false);
                    (e.target as HTMLInputElement).value = '';
                  }
                }}
              />
              <Button size="sm" onClick={() => fileInputRef.current?.click()}>Import</Button>
              <Button size="sm" onClick={() => {
                // export current hotJobs to CSV
                const rows = (hotJobs || []).map(h => ({
                  title: h.title || '', company: h.company || '', location: h.location || '', salary: h.salary || '', type: h.type || '', logo: h.logo || '', tags: Array.isArray(h.tags) ? h.tags.join(',') : (h.tags || ''), priority: h.priority ? 'true' : 'false'
                }));
                const headers = ['title','company','location','salary','type','logo','tags','priority'];
                const csv = [headers.join(',')].concat(rows.map(r => headers.map(h => `"${String((r as any)[h] || '').replace(/"/g,'""')}"`).join(','))).join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = 'hot-jobs-export.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
              }}>Export CSV</Button>
              <Button size="sm" onClick={() => {
                // download sample CSV headings
                const headers = ['title','company','location','salary','type','logo','tags','priority'];
                const sample = [headers.join(','), 'Senior Software Engineer,Google,Mountain View,120000-150000,Full-time,,AI/ML;Cloud,true'].join('\n');
                const blob = new Blob([sample], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = 'hot-jobs-sample.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
              }}>Sample CSV</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <input
              type="search"
              placeholder="Search jobs by title, company, or place..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Salary</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>

              {hotJobsLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="h-48 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              )}

              {!hotJobsLoading && filteredJobs.map(job => (
                editJobId === job.id ? (
                  <TableRow key={`edit-${job.id}`}>
                    <TableCell colSpan={8}>
                      <div className="w-full">
                        <div className="flex-1">
                          <input type="text" className="border rounded px-2 py-1 mb-1 w-full" value={editJob?.title || ''} onChange={e => setEditJob({ ...editJob, title: e.target.value })} placeholder="Title" />
                          <input type="text" className="border rounded px-2 py-1 mb-1 w-full" value={editJob?.company || ''} onChange={e => setEditJob({ ...editJob, company: e.target.value })} placeholder="Company" />
                          <input type="text" className="border rounded px-2 py-1 mb-1 w-full" value={editJob?.location || ''} onChange={e => setEditJob({ ...editJob, location: e.target.value })} placeholder="Location" />
                          <input type="text" className="border rounded px-2 py-1 mb-1 w-full" value={editJob?.salary || ''} onChange={e => setEditJob({ ...editJob, salary: e.target.value })} placeholder="Salary" />
                          <input type="text" className="border rounded px-2 py-1 mb-1 w-full" value={editJob?.type || ''} onChange={e => setEditJob({ ...editJob, type: e.target.value })} placeholder="Type" />
                          <input type="text" className="border rounded px-2 py-1 mb-1 w-tool" value={editJob?.logo || ''} onChange={e => setEditJob({ ...editJob, logo: e.target.value })} placeholder="Logo URL" />
                          <input type="text" className="border rounded px-2 py-1 mb-1 w-full" value={Array.isArray(editJob?.tags) ? editJob.tags.join(', ') : editJob?.tags || ''} onChange={e => setEditJob({ ...editJob, tags: e.target.value.split(',').map(t => t.trim()) })} placeholder="Tags (comma separated)" />
                          <label className="flex items-center gap-2">
                            <input type="checkbox" checked={editJob?.priority || false} onChange={e => setEditJob({ ...editJob, priority: e.target.checked })} />
                            Priority
                          </label>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <Button size="sm" onClick={async () => {
                            if (!hotJobsCollectionRef || !editJobId) return;
                            const jobDocRef = doc(hotJobsCollectionRef, editJobId);
                            await updateDoc(jobDocRef, editJob);
                            setEditJobId(null);
                            setEditJob(null);
                          }}>Save</Button>
                          <Button size="sm" variant="secondary" onClick={() => { setEditJobId(null); setEditJob(null); }}>Cancel</Button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  <TableRow key={job.id}>
                    <TableCell>
                      <div className="font-medium">{job.title}</div>
                    </TableCell>
                    <TableCell>{job.company}</TableCell>
                    <TableCell>{job.location}</TableCell>
                    <TableCell>{job.salary}</TableCell>
                    <TableCell>{job.type}</TableCell>
                    <TableCell>{Array.isArray(job.tags) ? job.tags.join(', ') : job.tags}</TableCell>
                    <TableCell>{job.priority ? 'Yes' : 'No'}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => { setEditJobId(job.id); setEditJob(job); }}>Edit</Button>
                        <Button variant="destructive" size="sm" onClick={() => handleRemoveJob(job.id)}>Remove</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              ))}

              {!hotJobsLoading && filteredJobs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="h-48 text-center text-muted-foreground">No jobs found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="pt-4 border-t mt-4 grid grid-cols-1 gap-2">
            <Button size="sm" className="mt-2" onClick={() => setShowAddDialog(true)}>
              Add Job
            </Button>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Job</DialogTitle>
                </DialogHeader>
                <div className="pt-2">
                  <input
                    type="text"
                    placeholder="Title"
                    className="border rounded px-2 py-1 mb-2 w-full"
                    value={newJob.title}
                    onChange={e => setNewJob({ ...newJob, title: e.target.value })}
                  />
                  <input
                    type="text"
                    placeholder="Company"
                    className="border rounded px-2 py-1 mb-2 w-full"
                    value={newJob.company}
                    onChange={e => setNewJob({ ...newJob, company: e.target.value })}
                  />
                  <input
                    type="text"
                    placeholder="Location"
                    className="border rounded px-2 py-1 mb-2 w-full"
                    value={newJob.location}
                    onChange={e => setNewJob({ ...newJob, location: e.target.value })}
                  />
                  <input
                    type="text"
                    placeholder="Salary"
                    className="border rounded px-2 py-1 mb-2 w-full"
                    value={newJob.salary}
                    onChange={e => setNewJob({ ...newJob, salary: e.target.value })}
                  />
                  <input
                    type="text"
                    placeholder="Type"
                    className="border rounded px-2 py-1 mb-2 w-full"
                    value={newJob.type}
                    onChange={e => setNewJob({ ...newJob, type: e.target.value })}
                  />
                  <div className="mb-2">
                    <label className="block text-sm font-medium mb-1">Company Logo</label>
                    <input
                      type="file"
                      accept="image/*"
                      className="w-full"
                      onChange={async (e) => {
                          let file = (e.target as HTMLInputElement).files?.[0];
                          if (!file) return;
                        try {
                          setLogoUploading(true);
                            if (file.size > MAX_FILE_BYTES) {
                              // try to resize first
                              const blob = await resizeImage(file);
                              if (blob.size > MAX_FILE_BYTES) {
                                alert('Image is too large even after resizing. Please choose a smaller image.');
                                return;
                              }
                              // convert blob back to File-like for name
                              const resizedFile = new File([blob], file.name, { type: file.type });
                              file = resizedFile;
                            } else {
                              // attempt lightweight resize to improve speed
                              try {
                                const blob = await resizeImage(file, 1200, 0.85);
                                file = new File([blob], file.name, { type: file.type });
                              } catch (e) {
                                // ignore resize errors and continue with original file
                              }
                            }

                            const storage = getStorage();
                            const path = `hotJobs/${Date.now()}_${file.name}`;
                            const sRef = storageRef(storage, path);
                            // use resumable upload for progress
                            setUploadPercent(0);
                            const task: UploadTask = uploadBytesResumable(sRef, file);
                            task.on('state_changed', (snapshot) => {
                              const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                              setUploadPercent(percent);
                            });
                            await new Promise<void>((resolve, reject) => {
                              task.then(async (snapshot) => {
                                try {
                                  const url = await getDownloadURL(sRef);
                                  setNewJob(prev => ({ ...prev, logo: url }));
                                  setLogoPreview(url);
                                  setUploadPercent(null);
                                  resolve();
                                } catch (err) {
                                  reject(err);
                                }
                              }).catch(reject);
                            });
                        } catch (err: any) {
                          alert('Error uploading logo: ' + (err?.message || err));
                        } finally {
                          setLogoUploading(false);
                        }
                      }}
                    />
                    {logoUploading ? (
                      <div className="text-sm text-muted-foreground mt-2">Uploading...</div>
                    ) : logoPreview || newJob.logo ? (
                      <img src={logoPreview || newJob.logo} alt="logo preview" className="h-12 mt-2 object-contain" />
                    ) : null}
                  </div>
                  <input
                    type="text"
                    placeholder="Tags (comma separated)"
                    className="border rounded px-2 py-1 mb-2 w-full"
                    value={newJob.tags}
                    onChange={e => setNewJob({ ...newJob, tags: e.target.value })}
                  />
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newJob.priority}
                      onChange={e => setNewJob({ ...newJob, priority: e.target.checked })}
                    />
                    Priority
                  </label>
                </div>
                <DialogFooter>
                  <Button size="sm" onClick={async () => { const ok = await handleAddJob(); if (ok) setShowAddDialog(false); }}>Add</Button>
                  <DialogClose asChild>
                    <Button size="sm" variant="secondary">Cancel</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
