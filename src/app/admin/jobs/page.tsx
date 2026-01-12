
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  addDocumentNonBlocking,
  deleteDocumentNonBlocking,
  updateDocumentNonBlocking,
  useCollection,
  useFirestore,
  useMemoFirebase,
} from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Loader2, PlusCircle, Trash2, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Job = {
  id: string;
  role: string;
  company: string;
  location: string;
  description: string;
};

export default function AdminJobsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentJob, setCurrentJob] = useState<Partial<Job> | null>(null);

  const jobsCollectionRef = useMemoFirebase(() => (firestore ? collection(firestore, 'jobs') : null), [firestore]);
  const { data: jobs, isLoading } = useCollection<Job>(jobsCollectionRef);

  const openModal = (job: Partial<Job> | null = null) => {
    if (job) {
      setCurrentJob(job);
      setIsEditing(true);
    } else {
      setCurrentJob({ role: '', company: '', location: '', description: '' });
      setIsEditing(false);
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!currentJob || !jobsCollectionRef) return;

    setIsSubmitting(true);
    try {
      if (isEditing && currentJob.id) {
        const jobRef = doc(firestore, 'jobs', currentJob.id);
        await updateDocumentNonBlocking(jobRef, {
            role: currentJob.role,
            company: currentJob.company,
            location: currentJob.location,
            description: currentJob.description,
        });
        toast({ title: 'Job Updated', description: 'The job listing has been updated.' });
      } else {
        await addDocumentNonBlocking(jobsCollectionRef, {
            role: currentJob.role,
            company: currentJob.company,
            location: currentJob.location,
            description: currentJob.description,
        });
        toast({ title: 'Job Added', description: 'The new job has been listed.' });
      }
      setIsModalOpen(false);
    } catch (error) {
        console.error(error)
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save the job.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (jobId: string) => {
      const jobRef = doc(firestore, 'jobs', jobId);
      deleteDocumentNonBlocking(jobRef);
      toast({ title: 'Job Deleted', description: 'The job listing has been removed.' });
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Manage Jobs</h1>
          <p className="text-muted-foreground">Add, edit, or remove job listings.</p>
        </div>
        <Button onClick={() => openModal()}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Job
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Job Listings</CardTitle>
          <CardDescription>The list of jobs available to users.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs?.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium">{job.role}</TableCell>
                    <TableCell>{job.company}</TableCell>
                    <TableCell>{job.location}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openModal(job)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(job.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Job' : 'Add New Job'}</DialogTitle>
            <DialogDescription>
              Fill in the details for the job listing.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">Role</Label>
              <Input id="role" value={currentJob?.role || ''} onChange={(e) => setCurrentJob({...currentJob, role: e.target.value})} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="company" className="text-right">Company</Label>
              <Input id="company" value={currentJob?.company || ''} onChange={(e) => setCurrentJob({...currentJob, company: e.target.value})} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="location" className="text-right">Location</Label>
              <Input id="location" value={currentJob?.location || ''} onChange={(e) => setCurrentJob({...currentJob, location: e.target.value})} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">Description</Label>
              <Textarea id="description" value={currentJob?.description || ''} onChange={(e) => setCurrentJob({...currentJob, description: e.target.value})} className="col-span-3" />
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
