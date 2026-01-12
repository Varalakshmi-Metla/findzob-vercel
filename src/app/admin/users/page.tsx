'use client';
import React from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

import { useCollection, useFirestore, useMemoFirebase, useUser, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { collection, doc, collectionGroup, query } from 'firebase/firestore';
import { isAdminEmail } from '@/lib/admin';
import { Loader2 } from 'lucide-react';
import { format, parseISO, isValid as isValidDate } from 'date-fns';
import { formatName, getInitials } from '@/lib/utils';

type User = {
  id: string;
  name: string;
  email: string;
  photoURL?: string;
  subscription?: {
    plan?: string;
    status?: string;
  };
  profileCompleted?: boolean;
  role?: string;
  dateOfBirth?: string;
  phone?: string;
  address?: string;
  gender?: string;
};

export default function AdminUsersPage() {
    // Filter states for currency, plan, and assigned employee name
    const [currencyFilter, setCurrencyFilter] = React.useState<'all' | 'USD' | 'INR'>('all');
    const [planFilter, setPlanFilter] = React.useState<string>('all');
    const [employeeNameFilter, setEmployeeNameFilter] = React.useState<string>('all');
  const firestore = useFirestore();
  const { user } = useUser();
  const isAdmin = isAdminEmail(user?.email);

  // Fetch all users
  const usersCollectionRef = useMemoFirebase(() => (firestore && isAdmin) ? collection(firestore, 'users') : null, [firestore, isAdmin]);
  const { data: users, isLoading } = useCollection<User>(usersCollectionRef as any);

  // Fetch all resumes, jobs, and hot jobs across all users
  const resumesCollectionRef = useMemoFirebase(() => (firestore && isAdmin) ? query(collectionGroup(firestore, 'resumes')) : null, [firestore, isAdmin]);
  const { data: allResumes } = useCollection<any>(resumesCollectionRef);

  const jobsCollectionRef = useMemoFirebase(() => (firestore && isAdmin) ? query(collectionGroup(firestore, 'jobs')) : null, [firestore, isAdmin]);
  const { data: allJobs } = useCollection<any>(jobsCollectionRef);

  const hotJobsCollectionRef = useMemoFirebase(() => (firestore && isAdmin) ? query(collectionGroup(firestore, 'hot_jobs')) : null, [firestore, isAdmin]);
  const { data: allHotJobs } = useCollection<any>(hotJobsCollectionRef);

  const getCompletedResumesCount = (userId: string) => {
    if (!allResumes) return 0;
    return allResumes.filter((resume: any) => resume.userId === userId && resume.resumeURL).length;
  };

  const getCompletedJobsCount = (userId: string) => {
    if (!allJobs) return 0;
    return allJobs.filter((job: any) => job.userId === userId && job.status === 'completed').length;
  };

  const getCompletedHotJobsCount = (userId: string) => {
    if (!allHotJobs) return 0;
    return allHotJobs.filter((job: any) => job.userId === userId && job.status === 'completed').length;
  };
  
  // Fetch employees for assignment dropdown
  const employeesCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: employeesData } = useCollection<any>(employeesCollectionRef as any);
  const employeeOptions = (employeesData || []).filter((e: any) => e.role === 'employee').map((e: any) => ({ value: e.id, label: e.name }));

  // Fetch admin plans from Firestore
  const plansCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, 'plans') : null, [firestore]);
  const { data: plansData, isLoading: plansLoading } = useCollection<any>(plansCollectionRef as any);
  // Plan options filtered by currency
  const planOptions = React.useMemo(() => {
    if (!plansData) return [];
    let filtered = plansData;
    if (currencyFilter !== 'all') {
      filtered = plansData.filter((plan: any) => plan.currency === currencyFilter);
    }
    return filtered.map((plan: any) => ({ value: plan.name, label: plan.name }));
  }, [plansData, currencyFilter]);
  const { toast } = useToast();

  // Modal / form state for Create Employee
  const [showModal, setShowModal] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [form, setForm] = React.useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    gender: '',
    dateOfBirth: '',
    password: '',
  });

  const updateForm = (patch: Partial<typeof form>) => setForm(s => ({ ...s, ...patch }));

  const validateEmail = (e: string) => !!e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleCreateEmployee = async () => {
    if (!user) { toast({ variant: 'destructive', title: 'Not signed in', description: 'Please sign in.' }); return; }
    if (!form.name.trim()) { toast({ variant: 'destructive', title: 'Validation', description: 'Name is required' }); return; }
    if (!validateEmail(form.email)) { toast({ variant: 'destructive', title: 'Validation', description: 'A valid email is required' }); return; }

    setSubmitting(true);
    try {
      const idToken = await (user as any).getIdToken();
      // Starter onboarding mandatory for all new users
      const payload = {
        ...form,
        role: 'user',
        subscription: { plan: 'Starter', status: 'active', price: 25, membership: 'lifetime' }
      };
      const res = await fetch('/api/admin/create-user', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` }, body: JSON.stringify(payload) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (json?.error && typeof json.error === 'string' && json.error.toLowerCase().includes('admin sdk not available')) {
          throw new Error('Server admin SDK is not initialized. Set FIREBASE_ADMIN_SVC environment variable (service account JSON or base64) on the server. See src/firebase/config.ts for project config.');
        }
        throw new Error(json?.error || json?.message || 'Failed to create user');
      }
      toast({ title: 'User created with Starter Onboarding', description: `${form.email} created. Starter onboarding ($25, lifetime) is mandatory.` });
      setShowModal(false);
      setForm({ name: '', email: '', phone: '', address: '', gender: '', dateOfBirth: '', password: '' });
    } catch (err: any) {
      console.error('create user failed', err);
      toast({ variant: 'destructive', title: 'Error', description: err?.message || 'Failed to create user' });
    } finally {
      setSubmitting(false);
    }
  };

  const [searchQuery, setSearchQuery] = React.useState('');
  const [debouncedQuery, setDebouncedQuery] = React.useState('');

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery.trim().toLowerCase()), 250);
    return () => clearTimeout(t);
  }, [searchQuery]);

  React.useEffect(() => {
    setEmployeeNameFilter('all');
  }, [planFilter]);

  // Admin stats derived from users collection
  const userList = (users as any[]) || [];
  // Only include non-employee users
  const filteredUserList = userList.filter(u => u.role !== 'employee');
  const totalUsers = filteredUserList.length;
  const onboardedCount = filteredUserList.filter(u => (u as any).profileCompleted === true).length;
  const starterOnboarded = filteredUserList.filter(u => ((u as any).subscription?.plan || '').toLowerCase() === 'starter' && (u as any).profileCompleted === true).length;
  // Price mapping for simple MRR estimate
  const planPrices: Record<string, number> = { Free: 0, Starter: 29, Pro: 99, Enterprise: 299 };
  const planCounts: Record<string, number> = {};
  let estimatedMRR = 0;
  for (const u of userList) {
    const plan = (u as any).subscription?.plan || 'Free';
    planCounts[plan] = (planCounts[plan] || 0) + 1;
    const price = planPrices[plan] ?? 0;
    estimatedMRR += price;
  }

  const [updatingIds, setUpdatingIds] = React.useState<Record<string, boolean>>({});

  const changeRole = async (u: any, newRole: string) => {
    if (!user) { toast({ variant: 'destructive', title: 'Not signed in', description: 'Please sign in.' }); return; }
    const originalRole = (u as any).role || 'user';
    setUpdatingIds(prev => ({ ...prev, [u.id]: true }));
    try {
      const idToken = await user.getIdToken();
      if (newRole === 'admin') {
        const res = await fetch('/api/admin/grant-admin', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` }, body: JSON.stringify({ email: u.email }) });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to grant admin');
        toast({ title: 'Success', description: `Granted admin to ${u.email}` });
      } else if (originalRole === 'admin' && newRole !== 'admin') {
        const res = await fetch('/api/admin/revoke-admin', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` }, body: JSON.stringify({ email: u.email }) });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to revoke admin');
        toast({ title: 'Success', description: `Revoked admin from ${u.email}` });
      }
      try {
        const ref = doc(firestore, 'users', u.id);
        updateDocumentNonBlocking(ref, { role: newRole, isAdmin: newRole === 'admin' });
      } catch (err) {
        console.error('Local update failed', err);
      }
    } catch (err: any) {
      console.error('changeRole failed', err);
      toast({ variant: 'destructive', title: 'Error', description: err?.message || 'Role change failed' });
    } finally {
      setUpdatingIds(prev => { const c = { ...prev }; delete c[u.id]; return c; });
    }
  };

  // Edit modal state
  const [editingUser, setEditingUser] = React.useState<any>(null);
  const [editSubmitting, setEditSubmitting] = React.useState(false);

  const openEdit = (u: any) => {
    const rawDob = (u as any).dateOfBirth || '';
    // try parse ISO first
    let formattedDob = '';
    try {
      const iso = parseISO(String(rawDob));
      if (isValidDate(iso)) formattedDob = format(iso, 'MM-dd-yyyy');
      else formattedDob = String(rawDob || '');
    } catch (e) {
      formattedDob = String(rawDob || '');
    }
    setEditingUser({
      uid: u.id,
      name: u.name || '',
      email: u.email || '',
      phone: (u as any).phone || '',
      address: (u as any).address || '',
      gender: (u as any).gender || '',
      dateOfBirth: formattedDob,
      role: (u as any).role || 'job_seeker',
      plan: (u.subscription?.plan || ''),
      planStatus: (u.subscription?.status || ''),
      assignedEmployeeId: u.assignedEmployeeId || '',
      assignedEmployeeName: u.assignedEmployeeName || '',
    });
  };

  const submitEdit = async () => {
    if (!editingUser) return;
    if (!user) { toast({ variant: 'destructive', title: 'Not signed in' }); return; }
    if (!editingUser.name || editingUser.name.trim().length < 2) { toast({ variant: 'destructive', title: 'Validation', description: 'Name is required (min 2 chars)' }); return; }
    if (!validateEmail(editingUser.email)) { toast({ variant: 'destructive', title: 'Validation', description: 'A valid email is required' }); return; }
    setEditSubmitting(true);
    try {
      const idToken = await (user as any).getIdToken();
      const payload = {
        uid: editingUser.uid,
        name: editingUser.name,
        email: editingUser.email,
        phone: editingUser.phone,
        address: editingUser.address,
        gender: editingUser.gender,
        dateOfBirth: editingUser.dateOfBirth,
        role: editingUser.role,
        subscription: {
          plan: editingUser.plan,
          status: editingUser.planStatus
        },
        assignedEmployeeId: editingUser.assignedEmployeeId || '',
        assignedEmployeeName: editingUser.assignedEmployeeName || ''
      };
      const res = await fetch('/api/admin/update-user', { method: 'POST', headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${idToken}` }, body: JSON.stringify(payload) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || json?.message || 'Failed to update user');
      toast({ title: 'User updated', description: editingUser.email });
      setEditingUser(null);
      setSearchQuery(editingUser.email || '');
    } catch (err: any) {
      console.error('update user failed', err);
      toast({ variant: 'destructive', title: 'Error', description: err?.message || 'Failed to update user' });
    } finally {
      setEditSubmitting(false);
    }
  };

  // Add role filter state
  const [roleFilter, setRoleFilter] = React.useState<string>('all');

  // Assignment logic for multiple users per employee
  // Update user document with assigned employee info
  async function assignEmployeeToUser(userId: string, employeeId: string, employeeName: string) {
    if (!firestore) return;
    const userRef = doc(firestore, 'users', userId);
    await updateDocumentNonBlocking(userRef, {
      assignedEmployeeId: employeeId,
      assignedEmployeeName: employeeName,
    });
  }
  // Update employee document with array of assigned user IDs and names
  async function addUserToEmployee(employeeId: string, userId: string, userName: string) {
    if (!firestore) return;
    const employeeRef = doc(firestore, 'employees', employeeId);
    await updateDocumentNonBlocking(employeeRef, {
      assignedUserIds: (prev: string[] = []) => [...prev, userId],
      assignedUserNames: (prev: string[] = []) => [...prev, userName],
    });
  }
  // After assigning a user in pending profile, update user and employee docs
  async function assignPendingUserToEmployee(userId: string, userName: string, employeeId: string, employeeName: string) {
    if (!firestore) return;
    // Update user document with assigned employee info
    const userRef = doc(firestore, 'users', userId);
    await updateDocumentNonBlocking(userRef, {
      assignedEmployeeId: employeeId,
      assignedEmployeeName: employeeName,
    });
    // Update employee document with arrays of assigned users
    const employeeRef = doc(firestore, 'employees', employeeId);
    await updateDocumentNonBlocking(employeeRef, {
      assignedUserIds: (prev: string[] = []) => [...prev, userId],
      assignedUserNames: (prev: string[] = []) => [...prev, userName],
    });
  }

  // User Management Table, Search, Filter, CRUD
  // Filtering logic for user list
  const filteredByPlan = planFilter === 'all' ? filteredUserList : filteredUserList.filter(u => (u.subscription?.plan || 'Free') === planFilter);
  const filteredByEmployeeName = employeeNameFilter === 'all' ? filteredByPlan : filteredByPlan.filter(u => (u.assignedEmployeeName || '-') === employeeNameFilter);

  // Get unique plan options from admin plans, filtered by currency
  const uniquePlans = React.useMemo(() => {
    if (!plansData) return [];
    let filtered = plansData;
    if (currencyFilter !== 'all') {
      filtered = plansData.filter((plan: any) => plan.currency === currencyFilter);
    }
    return Array.from(new Set(filtered.map((plan: any) => plan.name)));
  }, [plansData, currencyFilter]);
  // Get unique assigned employee names from users
  const uniqueEmployeeNames = Array.from(new Set(filteredByPlan.map(u => u.assignedEmployeeName).filter(Boolean)));

  return (
    <div className="p-8">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>Manage all users, search, filter, and perform actions.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <select
              className="border rounded px-2 py-1"
              value={currencyFilter}
              onChange={e => {
                setCurrencyFilter(e.target.value as 'all' | 'USD' | 'INR');
                setPlanFilter('all'); // Reset plan filter when currency changes
              }}
              style={{ minWidth: 120 }}
            >
              <option value="all">All Currencies</option>
              <option value="USD">USD</option>
              <option value="INR">INR</option>
            </select>
            <Input
              placeholder="Search by name or email"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
            <Button onClick={() => setShowModal(true)} className="bg-blue-600 text-white">Add User</Button>
            <select
              className="border rounded px-2 py-1"
              value={planFilter}
              onChange={e => setPlanFilter(e.target.value)}
              style={{ minWidth: 120 }}
            >
              <option value="all">All Plans</option>
              {uniquePlans.map(plan => (
                <option key={plan} value={plan}>{plan}</option>
              ))}
            </select>
            <select
              className="border rounded px-2 py-1"
              value={employeeNameFilter}
              onChange={e => setEmployeeNameFilter(e.target.value)}
              style={{ minWidth: 120 }}
            >
              <option value="all">All Employees</option>
              {uniqueEmployeeNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned Employee Name</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredByEmployeeName.filter(u => {
                const matchesQuery = debouncedQuery ? ((u.name || '').toLowerCase().includes(debouncedQuery) || (u.email || '').toLowerCase().includes(debouncedQuery)) : true;
                const matchesRole = roleFilter === 'all' ? true : (u.role === roleFilter);
                return matchesQuery && matchesRole;
              }).map(u => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar>
                        <AvatarImage src={u.photoURL || ''} />
                        <AvatarFallback>{getInitials(u.name)}</AvatarFallback>
                      </Avatar>
                      <span>{formatName(u.name)}</span>
                    </div>
                  </TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{u.role || 'user'}</Badge>
                  </TableCell>
                  <TableCell>{u.role === 'employee' ? 'Employee' : (u.subscription?.plan || 'Free')}</TableCell>
                  <TableCell>
                    {u.role === 'employee' ? (
                      <Badge variant="default">Active</Badge>
                    ) : (
                      u.profileCompleted ? (
                        <Badge variant="default">Onboarded</Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )
                    )}
                  </TableCell>
                  {/* Show assigned employee info for users */}
                  <TableCell>{u.assignedEmployeeName ? u.assignedEmployeeName : (u.assignedEmployeeId ? (userList.find((emp: any) => emp.id === u.assignedEmployeeId && emp.role === 'employee')?.name || '-') : '-')}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => openEdit(u)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteDocumentNonBlocking(doc(firestore, 'users', u.id))}>
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {isLoading && <Loader2 className="animate-spin mx-auto mt-4" />}
          {!isLoading && userList.length === 0 && <div className="text-center text-gray-500 mt-4">No users found.</div>}
          {!isLoading && filteredUserList.length === 0 && <div className="text-center text-gray-500 mt-4">No users found.</div>}
        </CardContent>
      </Card>
      {/* Create/Edit User Modal */}
      <Dialog open={showModal || !!editingUser} onOpenChange={v => { setShowModal(v); if (!v) setEditingUser(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Edit User' : 'Add User'}</DialogTitle>
          </DialogHeader>
          {editingUser ? (
            <EditModal editingUser={editingUser} setEditingUser={setEditingUser} submitEdit={submitEdit} editSubmitting={editSubmitting} employeeOptions={employeeOptions} planOptions={planOptions} />
          ) : (
            <form
              onSubmit={e => {
                e.preventDefault();
                handleCreateEmployee();
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={form.name}
                    onChange={e => updateForm({ name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    value={form.email}
                    onChange={e => updateForm({ email: e.target.value })}
                    required
                    type="email"
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={form.phone}
                    onChange={e => updateForm({ phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Address</Label>
                  <Input
                    value={form.address}
                    onChange={e => updateForm({ address: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Gender</Label>
                  <Select
                    value={form.gender}
                    onValueChange={v => updateForm({ gender: v })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Date of Birth</Label>
                  <Input
                    value={form.dateOfBirth}
                    onChange={e => updateForm({ dateOfBirth: e.target.value })}
                    type="date"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create User'}
                </Button>
                <Button type="button" variant="secondary" onClick={() => { setShowModal(false); setEditingUser(null); }}>
                  Cancel
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EditModal({
  editingUser,
  setEditingUser,
  submitEdit,
  editSubmitting,
  employeeOptions,
  planOptions
}: {
  editingUser: any;
  setEditingUser: (v: any) => void;
  submitEdit: () => Promise<void>;
  editSubmitting: boolean;
  employeeOptions: { value: string; label: string }[];
  planOptions: { value: string; label: string }[];
}) {
  const close = () => setEditingUser(null);
  if (!editingUser) return null;
  return (
    <Dialog open={Boolean(editingUser)} onOpenChange={(val) => { if (!val) close(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label>Assigned Employee</Label>
            <Select value={editingUser.assignedEmployeeId || ''} onValueChange={v => {
              const selected = employeeOptions.find((e) => e.value === v);
              setEditingUser({
                ...editingUser,
                assignedEmployeeId: v,
                assignedEmployeeName: selected ? selected.label : ''
              });
            }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employeeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Name</Label>
            <Input value={editingUser.name} onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })} placeholder="Full name" />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={editingUser.email} onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })} placeholder="email@company.com" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Phone</Label>
              <Input value={editingUser.phone} onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })} placeholder="Phone" />
            </div>
            <div>
              <Label>Date of birth</Label>
              <Input value={editingUser.dateOfBirth} onChange={(e) => setEditingUser({ ...editingUser, dateOfBirth: e.target.value })} placeholder="MM-DD-YYYY" />
            </div>
          </div>
          <div>
            <Label>Address</Label>
            <Input value={editingUser.address} onChange={(e) => setEditingUser({ ...editingUser, address: e.target.value })} placeholder="Address" />
          </div>
          <div>
            <Label>Gender</Label>
            <Select value={editingUser.gender || ''} onValueChange={(v) => setEditingUser({ ...editingUser, gender: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Role</Label>
            <Select value={editingUser.role || ''} onValueChange={v => setEditingUser({ ...editingUser, role: v })}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="employee">Employee</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Plan</Label>
            <Select value={editingUser.plan || ''} onValueChange={v => setEditingUser({ ...editingUser, plan: v })}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select plan" />
              </SelectTrigger>
              <SelectContent>
                {planOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Plan Status</Label>
            <Select value={editingUser.planStatus || ''} onValueChange={v => setEditingUser({ ...editingUser, planStatus: v })}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={close} disabled={editSubmitting}>Cancel</Button>
          <Button onClick={submitEdit} disabled={editSubmitting}>{editSubmitting ? 'Saving…' : 'Save changes'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
