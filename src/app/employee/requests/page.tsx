

// 'use client';

// import React from 'react';
// import { query, where } from "firebase/firestore";
// import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
// import { collection, doc, updateDoc } from 'firebase/firestore';
// import { generateResume, generateResumeForJob } from '@/ai/flows/generate-resume-flow-v2';
// import { useToast } from '@/hooks/use-toast';
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
// import { Button } from '@/components/ui/button';
// import { Card } from '@/components/ui/card';
// import { Table } from '@/components/ui/table';
// import { Loader2 } from 'lucide-react';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

//   // ...existing code...
// function ResumeRequestsTab() {
//   const { user } = useUser();
//   const firestore = useFirestore();
//   const { toast } = useToast();

//   const [confirmDialog, setConfirmDialog] = React.useState<{ open: boolean; type: 'mark' | 'generate' | null; request: any | null }>({ open: false, type: null, request: null });
//   const [isProcessing, setIsProcessing] = React.useState(false);
//   const [planFilter, setPlanFilter] = React.useState<string>('all');

//   const plansCollectionRef = useMemoFirebase(() => (firestore ? collection(firestore, 'plans') : null), [firestore]);
//   const { data: plans = [] } = useCollection<any>(plansCollectionRef);

//   // Fetch only resume-requests for this user
//   const resumeRequestsRef = useMemoFirebase(() => (firestore && user) ? collection(firestore, 'resume-requests') : null, [firestore, user]);
//   const { data: resumeRequests = [], isLoading } = useCollection<any>(resumeRequestsRef);

//   // Only show resume requests for users assigned to the current employee
//   // Fetch users assigned to this employee
//   const usersCollectionRef = React.useMemo(
//     () => (firestore && user?.uid ? query(collection(firestore, 'users'), where('assignedEmployeeId', '==', user.uid)) : null),
//     [firestore, user]
//   );
//   const { data: assignedUsers } = useCollection<any>(usersCollectionRef);
//   const assignedUserIds = React.useMemo(() => Array.isArray(assignedUsers) ? assignedUsers.map((u: any) => u.id) : [], [assignedUsers]);

//   // Only show resume requests for assigned users
//   const assignedRequests = React.useMemo(() => {
//     return (resumeRequests || []).filter((r: any) => assignedUserIds.includes(r.userId));
//   }, [resumeRequests, assignedUserIds]);

//   // Fetch user details for all unique userIds in assignedRequests
//   const userIds = React.useMemo(() => Array.from(new Set((assignedRequests || []).map((r: any) => r.userId).filter(Boolean))), [assignedRequests]);
//   const allUsersCollectionRef = useMemoFirebase(() => (firestore && userIds.length > 0) ? collection(firestore, 'users') : null, [firestore, userIds]);
//   const { data: allUsers = [] } = useCollection<any>(allUsersCollectionRef);
//   const userMap = React.useMemo(() => {
//     const map: Record<string, any> = {};
//     (allUsers || []).forEach((u: any) => { if (u.id) map[u.id] = u; });
//     return map;
//   }, [allUsers]);

//   const filteredAssignedRequests = React.useMemo(() => {
//     const filterPlanRaw = planFilter.toString().trim().toLowerCase();
//     if (filterPlanRaw === 'all') return assignedRequests;

//     const planObj = (plans || []).find(
//       (p: any) => p.id?.toString().trim().toLowerCase() === filterPlanRaw || p.name?.toString().trim().toLowerCase() === filterPlanRaw
//     );

//     return (assignedRequests || []).filter((r: any) => {
//       const u = r.userId ? userMap[r.userId] : null;
//       const userPlanRaw = (u?.subscription?.plan || 'Free').toString().trim().toLowerCase();
//       return (
//         userPlanRaw === filterPlanRaw ||
//         (planObj && (
//           userPlanRaw === planObj.id?.toString().trim().toLowerCase() ||
//           userPlanRaw === planObj.name?.toString().trim().toLowerCase()
//         ))
//       );
//     });
//   }, [assignedRequests, userMap, planFilter, plans]);

//   const handleMarkAsHandled = async (r: any) => {
//     if (!firestore || !r?.id) return;
//     setIsProcessing(true);
//     try {
//       await updateDoc(doc(firestore, 'resume-requests', r.id), { status: 'completed' });
//       toast({ title: 'Marked as handled', description: 'Resume request marked as completed.' });
//     } catch (e: any) {
//       toast({ variant: 'destructive', title: 'Error', description: e?.message || 'Failed to update status.' });
//     } finally {
//       setIsProcessing(false);
//       setConfirmDialog({ open: false, type: null, request: null });
//     }
//   };

//   const handleGenerateResume = async (r: any) => {
//     // This function is now obsolete since resume generation is handled in My Users. No action needed.
//     return;
//   };

//   return (
//     <Card className="mt-8">
//         <h2 className="text-xl font-bold mb-2 p-4">Resume Requests</h2>
//         <div className="px-4 pb-2 flex flex-wrap gap-2 items-center">
//           <span className="text-sm font-medium">User Plan:</span>
//           <select
//             className="border rounded px-2 py-1 text-sm bg-background"
//             value={planFilter}
//             onChange={e => setPlanFilter(e.target.value)}
//           >
//             <option value="all">All</option>
//             {(plans || []).map((p: any) => (
//               <option key={p.id} value={p.id || p.name}>{p.name || p.id}</option>
//             ))}
//           </select>
//         </div>
//         {isLoading ? (
//           <div className="flex justify-center items-center h-32">
//             <Loader2 className="animate-spin w-8 h-8 text-gray-400" />
//           </div>
//         ) : filteredAssignedRequests.length === 0 ? (
//           <div className="text-center text-muted-foreground py-8">No resume requests assigned to you.</div>
//         ) : (
//           <div className="overflow-x-auto">
//             <table className="min-w-full text-sm">
//               <thead>
//                 <tr>
//                   <th className="p-2 text-left">Name</th>
//                   <th className="p-2 text-left">Email</th>
//                   <th className="p-2 text-left">Requested Role</th>
//                   <th className="p-2 text-left">Status</th>
//                   <th className="p-2 text-left">Actions</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {filteredAssignedRequests.map((r: any) => {
//                   const userDetails = (r.userId && userMap[r.userId]) || {};
//                   return (
//                     <tr key={r.id} className="border-b border-gray-800">
//                       <td className="p-2 font-medium flex flex-col gap-1">
//                         {r.name || userDetails.name || '-'}
//                         {r.userId && (
//                           <Button
//                             size="sm"
//                             variant="outline"
//                             className="w-fit mt-1"
//                             onClick={() => window.open(`/employee/my-users?userId=${r.userId}`, '_blank')}
//                             title="View user details in My Users page"
//                           >
//                             View User
//                           </Button>
//                         )}
//                       </td>
//                       <td className="p-2">{r.email || userDetails.email || '-'}</td>
//                       <td className="p-2">{
//                         (Array.isArray(r.jobPreferences) && r.jobPreferences.length > 0 && r.jobPreferences[0]?.desiredRoles)
//                           ? r.jobPreferences[0].desiredRoles
//                           : (r.role || r.requestedRole || userDetails.role || '-')
//                       }</td>
//                       <td className="p-2">{r.status || 'pending'}</td>
//                       <td className="p-2 flex gap-2">
//                         <Button size="sm" disabled={r.status === 'completed' || isProcessing} onClick={() => setConfirmDialog({ open: true, type: 'mark', request: r })}>Approve</Button>
//                         <Button size="sm" variant="destructive" disabled={isProcessing} onClick={async () => {
//                           if (!firestore || !r?.id) return;
//                           setIsProcessing(true);
//                           try {
//                             await import('firebase/firestore').then(({ doc, deleteDoc }) =>
//                               deleteDoc(doc(firestore, 'resume-requests', r.id))
//                             );
//                             toast({ title: 'Deleted', description: 'Resume request deleted.' });
//                           } catch (e: any) {
//                             toast({ variant: 'destructive', title: 'Error', description: e?.message || 'Failed to delete.' });
//                           } finally {
//                             setIsProcessing(false);
//                           }
//                         }}>Delete</Button>
//                         {/* Removed Generate Resume button as requested */}
//                         {r.resumeURL && (
//                           <a href={r.resumeURL} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline text-xs ml-2">Open Resume</a>
//                         )}
//                       </td>
//                     </tr>
//                   );
//                 })}
//               </tbody>
//             </table>
//           </div>
//         )}
//         <Dialog open={confirmDialog.open} onOpenChange={(open) => { if (!open) setConfirmDialog({ open: false, type: null, request: null }); }}>
//         <DialogContent>
//           <DialogHeader>
//             <DialogTitle>
//               {confirmDialog.type === 'mark' ? 'Confirm Mark as Handled' : confirmDialog.type === 'generate' ? 'Confirm Resume Generation' : ''}
//             </DialogTitle>
//           </DialogHeader>
//           <div className="my-4">
//             {confirmDialog.type === 'mark' ? (
//               <span>Are you sure you want to mark this resume request as handled? This action cannot be undone.</span>
//             ) : confirmDialog.type === 'generate' ? (
//               <span>Are you sure you want to generate a resume for this request? This will use AI to create a new resume and mark the request as completed.</span>
//             ) : null}
//           </div>
//           <DialogFooter>
//             <Button variant="outline" onClick={() => setConfirmDialog({ open: false, type: null, request: null })} disabled={isProcessing}>Cancel</Button>
//             {confirmDialog.type === 'mark' ? (
//               <Button onClick={() => handleMarkAsHandled(confirmDialog.request)} disabled={isProcessing}>Confirm</Button>
//             ) : confirmDialog.type === 'generate' ? (
//               <Button onClick={() => handleGenerateResume(confirmDialog.request)} disabled={isProcessing}>Confirm</Button>
//             ) : null}
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>
//     </Card>
//   )
// }

// function HotJobsRequestsTab() {
//   const { user } = useUser();
//   const firestore = useFirestore();
//   const { toast } = useToast();
//   // Fetch users assigned to this employee
//   const usersCollectionRef = React.useMemo(
//     () => (firestore && user?.uid ? query(collection(firestore, 'users'), where('assignedEmployeeId', '==', user.uid)) : null),
//     [firestore, user]
//   );
//   const { data: assignedUsers } = useCollection<any>(usersCollectionRef);
//   const assignedUserIds = React.useMemo(() => Array.isArray(assignedUsers) ? assignedUsers.map((u: any) => u.id) : [], [assignedUsers]);

//   const hotJobsRequestsRef = React.useMemo(() => (firestore ? collection(firestore, "hotJobsRequests") : null), [firestore]);
//   const { data: hotJobsRequests, isLoading, error } = useCollection(hotJobsRequestsRef);
//   const [isApproving, setIsApproving] = React.useState<string | null>(null);
//   const [statusFilter, setStatusFilter] = React.useState<'all' | 'pending' | 'approved'>('all');
//   const [planFilter, setPlanFilter] = React.useState<string>('all');

//   const plansCollectionRef = useMemoFirebase(() => (firestore ? collection(firestore, 'plans') : null), [firestore]);
//   const { data: plans = [] } = useCollection<any>(plansCollectionRef);

//   const usersCollectionForPlansRef = React.useMemo(
//     () => (firestore && assignedUserIds.length > 0 ? collection(firestore, 'users') : null),
//     [firestore, assignedUserIds]
//   );
//   const { data: allUsersForPlans = [] } = useCollection<any>(usersCollectionForPlansRef);
//   const userPlanMap = React.useMemo(() => {
//     const map: Record<string, any> = {};
//     (allUsersForPlans || []).forEach((u: any) => { if (u.id) map[u.id] = u; });
//     return map;
//   }, [allUsersForPlans]);

//   const filteredHotJobsRequests = React.useMemo(() => {
//     if (!Array.isArray(hotJobsRequests)) return [];
//     const base = hotJobsRequests.filter((request: any) => assignedUserIds.includes(request.userId));

//     const filterPlanRaw = planFilter.toString().trim().toLowerCase();
//     if (filterPlanRaw === 'all') return base;

//     const planObj = (plans || []).find(
//       (p: any) => p.id?.toString().trim().toLowerCase() === filterPlanRaw || p.name?.toString().trim().toLowerCase() === filterPlanRaw
//     );

//     return base.filter((request: any) => {
//       const u = request.userId ? userPlanMap[request.userId] : null;
//       const userPlanRaw = (u?.subscription?.plan || 'Free').toString().trim().toLowerCase();
//       return (
//         userPlanRaw === filterPlanRaw ||
//         (planObj && (
//           userPlanRaw === planObj.id?.toString().trim().toLowerCase() ||
//           userPlanRaw === planObj.name?.toString().trim().toLowerCase()
//         ))
//       );
//     });
//   }, [hotJobsRequests, assignedUserIds, planFilter, plans, userPlanMap]);

//   const handleApprove = async (request: any) => {
//     setIsApproving(request.id);
//     try {
//       const res = await fetch('/api/hot-jobs-requests/approve', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ requestId: request.id }),
//       });
//       const data = await res.json();
//       if (!res.ok) throw new Error(data.error || 'Failed to approve');
//       toast({ title: 'Approved', description: 'Hot job request approved and marked as applied.' });
//     } catch (e: any) {
//       toast({ variant: 'destructive', title: 'Error', description: e?.message || 'Failed to approve.' });
//     } finally {
//       setIsApproving(null);
//     }
//   };

//   return (
//     <Card className="mt-8">
//       <h2 className="text-xl font-bold mb-2 p-4">Hot Jobs Requests</h2>
//       <div className="flex flex-wrap gap-4 mb-4 items-center px-4">
//         <label htmlFor="statusFilter" className="font-medium">Filter:</label>
//         <select
//           id="statusFilter"
//           className="border rounded px-2 py-1 text-sm"
//           value={statusFilter}
//           onChange={e => setStatusFilter(e.target.value as 'all' | 'pending' | 'approved')}
//         >
//           <option value="all">All</option>
//           <option value="pending">Pending</option>
//           <option value="approved">Approved</option>
//         </select>
//         <label htmlFor="planFilter" className="font-medium ml-4">User Plan:</label>
//         <select
//           id="planFilter"
//           className="border rounded px-2 py-1 text-sm"
//           value={planFilter}
//           onChange={e => setPlanFilter(e.target.value)}
//         >
//           <option value="all">All</option>
//           {(plans || []).map((p: any) => (
//             <option key={p.id} value={p.id || p.name}>{p.name || p.id}</option>
//           ))}
//         </select>
//       </div>
//       {isLoading ? (
//         <div className="flex justify-center items-center h-32">
//           <Loader2 className="animate-spin w-8 h-8 text-gray-400" />
//         </div>
//       ) : error ? (
//         <div className="text-center text-red-500 py-8">Error loading requests.</div>
//       ) : !filteredHotJobsRequests || filteredHotJobsRequests.length === 0 ? (
//         <div className="text-center text-muted-foreground py-8">No hot jobs requests found.</div>
//       ) : (
//         <Table>
//           <thead>
//             <tr>
//               <th className="text-left p-4">User Name</th>
//               <th className="text-left p-4">User Email</th>
//               <th className="text-left p-4">Job Title</th>
//               <th className="text-left p-4">Company</th>
//               <th className="text-left p-4">Location</th>
//               <th className="text-left p-4">Salary</th>
//               <th className="text-left p-4">Logo</th>
//               <th className="text-left p-4">Requested At</th>
//               <th className="text-left p-4">Priority</th>
//               <th className="text-left p-4">Type</th>
//               <th className="text-left p-4">Status</th>
//               <th className="text-left p-4">Action</th>
//             </tr>
//           </thead>
//           <tbody>
//             {filteredHotJobsRequests
//               .filter((request: any) => {
//                 if (statusFilter === 'all') return true;
//                 return (request.status || 'pending') === statusFilter;
//               })
//               .map((request: any) => {
//                 let requestedAt = '-';
//                 if (request.requestedAt) {
//                   if (typeof request.requestedAt === 'object' && request.requestedAt.seconds) {
//                     requestedAt = new Date(request.requestedAt.seconds * 1000).toLocaleString();
//                   } else if (typeof request.requestedAt === 'string' || typeof request.requestedAt === 'number') {
//                     const date = new Date(request.requestedAt);
//                     requestedAt = isNaN(date.getTime()) ? String(request.requestedAt) : date.toLocaleString();
//                   } else if (typeof request.requestedAt === 'object') {
//                     requestedAt = JSON.stringify(request.requestedAt);
//                   }
//                 }
//                 return (
//                   <tr key={request.id}>
//                     <td className="py-2 px-4">
//                       <div className="flex flex-col gap-1">
//                         <span>{request.userName || request.userId || '-'}</span>
//                         {request.userId && (
//                           <Button
//                             size="sm"
//                             variant="outline"
//                             className="w-fit mt-1"
//                             onClick={() => {
//                               window.open(`/employee/my-users?userId=${request.userId}`, '_blank');
//                             }}
//                             title="View user details in My Users page"
//                           >
//                             View User
//                           </Button>
//                         )}
//                       </div>
//                     </td>
//                     <td className="py-2 px-4">{request.userEmail || '-'}</td>
//                     <td className="py-2 px-4">{request.jobTitle || '-'}</td>
//                     <td className="py-2 px-4">{request.company || '-'}</td>
//                     <td className="py-2 px-4">{request.location || '-'}</td>
//                     <td className="py-2 px-4">{request.salary !== undefined && request.salary !== null && request.salary !== '' ? request.salary : '-'}</td>
//                     <td className="py-2 px-4">{request.logoUrl ? <img src={request.logoUrl} alt="logo" className="w-8 h-8 rounded" /> : '-'}</td>
//                     <td className="py-2 px-4">{requestedAt}</td>
//                     <td className="py-2 px-4">{request.priority !== undefined && request.priority !== null ? String(request.priority) : '-'}</td>
//                     <td className="py-2 px-4">{request.type || '-'}</td>
//                     <td className="py-2 px-4">{request.status || 'pending'}</td>
//                     <td className="py-2 px-4 flex gap-2 flex-wrap">
//                       <Button
//                         size="sm"
//                         disabled={request.status === 'approved' || isApproving === request.id}
//                         onClick={() => handleApprove(request)}
//                       >
//                         {isApproving === request.id ? <Loader2 className="animate-spin w-4 h-4" /> : (request.status === 'approved' ? 'Approved' : 'Approve')}
//                       </Button>
//                       {/* Apply Job button - redirects to job URL */}
//                       {(request.jobUrl || request.url || request.apply_url) && (
//                         <Button
//                           size="sm"
//                           variant="outline"
//                           onClick={() => {
//                             const jobUrl = request.jobUrl || request.url || request.apply_url;
//                             if (jobUrl) {
//                               window.open(jobUrl, '_blank', 'noopener,noreferrer');
//                             }
//                           }}
//                           title="Open job application page"
//                         >
//                           Apply Job
//                         </Button>
//                       )}
//                       <Button
//                         size="sm"
//                         variant="destructive"
//                         onClick={async () => {
//                           if (!request?.id) return;
//                           try {
//                             await import('firebase/firestore').then(({ doc, deleteDoc }) =>
//                               deleteDoc(doc(firestore, 'hotJobsRequests', request.id))
//                             );
//                             toast({ title: 'Deleted', description: 'Hot job request deleted.' });
//                           } catch (e: any) {
//                             toast({ variant: 'destructive', title: 'Error', description: e?.message || 'Failed to delete.' });
//                           }
//                         }}
//                       >
//                         Delete
//                       </Button>
//                     </td>
//                   </tr>
//                 );
//               })}
//           </tbody>
//         </Table>
//       )}
//     </Card>
//   );
// }

// export default function RequestsPage() {
//   return (
//     <div className="p-4 md:p-8">
//       <h1 className="text-3xl font-bold mb-8">Requests</h1>
//       <Tabs defaultValue="resume-requests">
//         <TabsList>
//           <TabsTrigger value="resume-requests">Resume Requests</TabsTrigger>
//           <TabsTrigger value="hot-jobs-requests">Hot Jobs Requests</TabsTrigger>
//         </TabsList>
//         <TabsContent value="resume-requests">
//           <ResumeRequestsTab />
//         </TabsContent>
//         <TabsContent value="hot-jobs-requests">
//           <HotJobsRequestsTab />
//         </TabsContent>
//       </Tabs>
//     </div>
//   );
// }




'use client';

import React from 'react';
import { query, where } from "firebase/firestore";
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, doc, updateDoc } from 'firebase/firestore';
import { generateResume, generateResumeForJob } from '@/ai/flows/generate-resume-flow-v2';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function ResumeRequestsTab() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [confirmDialog, setConfirmDialog] = React.useState<{ open: boolean; type: 'mark' | 'generate' | null; request: any | null }>({ open: false, type: null, request: null });
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [planFilter, setPlanFilter] = React.useState<string>('all');

  const plansCollectionRef = useMemoFirebase(() => (firestore ? collection(firestore, 'plans') : null), [firestore]);
  const { data: plans = [] } = useCollection<any>(plansCollectionRef);

  // Fetch users assigned to this employee FIRST
  const usersCollectionRef = React.useMemo(
    () => (firestore && user?.uid ? query(collection(firestore, 'users'), where('assignedEmployeeId', '==', user.uid)) : null),
    [firestore, user]
  );
  const { data: assignedUsers } = useCollection<any>(usersCollectionRef);
  const assignedUserIds = React.useMemo(() => Array.isArray(assignedUsers) ? assignedUsers.map((u: any) => u.id) : [], [assignedUsers]);

  // OPTIMIZED: Fetch only resume-requests for assigned users
  const resumeRequestsRef = useMemoFirebase(() => {
    if (!firestore || !user || !assignedUserIds || assignedUserIds.length === 0) return null;
    
    // If we have 10 or fewer assigned users, use 'in' query for efficiency
    if (assignedUserIds.length <= 10) {
      return query(
        collection(firestore, 'resume-requests'),
        where('userId', 'in', assignedUserIds)
      );
    }
    
    // If more than 10 assigned users, fall back to fetching all and filtering client-side
    return collection(firestore, 'resume-requests');
  }, [firestore, user, assignedUserIds]);

  const { data: resumeRequests = [], isLoading } = useCollection<any>(resumeRequestsRef);

  // Only show resume requests for assigned users (if using fallback method)
  const assignedRequests = React.useMemo(() => {
    if (!resumeRequests || assignedUserIds.length === 0) return [];
    
    // If we used the optimized query, all results are already for assigned users
    if (assignedUserIds.length <= 10) {
      return resumeRequests;
    }
    
    // Fallback: filter client-side
    return (resumeRequests || []).filter((r: any) => assignedUserIds.includes(r.userId));
  }, [resumeRequests, assignedUserIds]);

  // Fetch user details for all unique userIds in assignedRequests
  const userIds = React.useMemo(() => Array.from(new Set((assignedRequests || []).map((r: any) => r.userId).filter(Boolean))), [assignedRequests]);
  const allUsersCollectionRef = useMemoFirebase(() => (firestore && userIds.length > 0) ? collection(firestore, 'users') : null, [firestore, userIds]);
  const { data: allUsers = [] } = useCollection<any>(allUsersCollectionRef);
  const userMap = React.useMemo(() => {
    const map: Record<string, any> = {};
    (allUsers || []).forEach((u: any) => { if (u.id) map[u.id] = u; });
    return map;
  }, [allUsers]);

  const filteredAssignedRequests = React.useMemo(() => {
    const filterPlanRaw = planFilter.toString().trim().toLowerCase();
    
    // First filter by plan if needed
    let filtered = assignedRequests;
    if (filterPlanRaw !== 'all') {
      const planObj = (plans || []).find(
        (p: any) => p.id?.toString().trim().toLowerCase() === filterPlanRaw || p.name?.toString().trim().toLowerCase() === filterPlanRaw
      );

      filtered = assignedRequests.filter((r: any) => {
        const u = r.userId ? userMap[r.userId] : null;
        const userPlanRaw = (u?.subscription?.plan || 'Free').toString().trim().toLowerCase();
        return (
          userPlanRaw === filterPlanRaw ||
          (planObj && (
            userPlanRaw === planObj.id?.toString().trim().toLowerCase() ||
            userPlanRaw === planObj.name?.toString().trim().toLowerCase()
          ))
        );
      });
    }

    // Sort by date in descending order (newest first)
    return filtered.sort((a, b) => {
      // Try multiple possible timestamp fields
      const getTimestamp = (item: any) => {
        if (item.createdAt?.seconds) return item.createdAt.seconds * 1000;
        if (item.createdAt?.toDate) return item.createdAt.toDate().getTime();
        if (item.createdAt) return new Date(item.createdAt).getTime();
        if (item.timestamp?.seconds) return item.timestamp.seconds * 1000;
        if (item.timestamp?.toDate) return item.timestamp.toDate().getTime();
        if (item.timestamp) return new Date(item.timestamp).getTime();
        if (item.requestedAt?.seconds) return item.requestedAt.seconds * 1000;
        if (item.requestedAt?.toDate) return item.requestedAt.toDate().getTime();
        if (item.requestedAt) return new Date(item.requestedAt).getTime();
        return 0; // Fallback for items without timestamp
      };
      
      return getTimestamp(b) - getTimestamp(a); // Descending order
    });
  }, [assignedRequests, userMap, planFilter, plans]);

  const handleMarkAsHandled = async (r: any) => {
    if (!firestore || !r?.id) return;
    setIsProcessing(true);
    try {
      await updateDoc(doc(firestore, 'resume-requests', r.id), { status: 'completed' });
      toast({ title: 'Marked as applied', description: 'Resume request marked as applied.' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e?.message || 'Failed to update status.' });
    } finally {
      setIsProcessing(false);
      setConfirmDialog({ open: false, type: null, request: null });
    }
  };

  const handleGenerateResume = async (r: any) => {
    return;
  };

  return (
    <Card className="mt-8">
        <h2 className="text-xl font-bold mb-2 p-4">Resume Requests</h2>
        <div className="px-4 pb-2 flex flex-wrap gap-2 items-center">
          <span className="text-sm font-medium">User Plan:</span>
          <select
            className="border rounded px-2 py-1 text-sm bg-background"
            value={planFilter}
            onChange={e => setPlanFilter(e.target.value)}
          >
            <option value="all">All</option>
            {(plans || []).map((p: any) => (
              <option key={p.id} value={p.id || p.name}>{p.name || p.id}</option>
            ))}
          </select>
        </div>
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <Loader2 className="animate-spin w-8 h-8 text-gray-400" />
          </div>
        ) : filteredAssignedRequests.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">No resume requests assigned to you.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  <th className="p-2 text-left">Name</th>
                  <th className="p-2 text-left">Email</th>
                  <th className="p-2 text-left">Requested Role</th>
                  <th className="p-2 text-left">Requested Date</th>
                  <th className="p-2 text-left">Status</th>
                  <th className="p-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssignedRequests.map((r: any) => {
                  const userDetails = (r.userId && userMap[r.userId]) || {};
                  
                  // Format requested date
                  const getFormattedDate = () => {
                    if (r.createdAt?.seconds) return new Date(r.createdAt.seconds * 1000).toLocaleDateString();
                    if (r.timestamp?.seconds) return new Date(r.timestamp.seconds * 1000).toLocaleDateString();
                    if (r.createdAt) return new Date(r.createdAt).toLocaleDateString();
                    if (r.timestamp) return new Date(r.timestamp).toLocaleDateString();
                    if (r.requestedAt?.seconds) return new Date(r.requestedAt.seconds * 1000).toLocaleDateString();
                    return 'N/A';
                  };
                  
                  return (
                    <tr key={r.id} className="border-b border-gray-800">
                      <td className="p-2 font-medium flex flex-col gap-1">
                        {r.name || userDetails.name || '-'}
                        {r.userId && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-fit mt-1"
                            onClick={() => window.open(`/employee/my-users?userId=${r.userId}`, '_blank')}
                            title="View user details in My Users page"
                          >
                            View User
                          </Button>
                        )}
                      </td>
                      <td className="p-2">{r.email || userDetails.email || '-'}</td>
                      <td className="p-2">{
                        (Array.isArray(r.jobPreferences) && r.jobPreferences.length > 0 && r.jobPreferences[0]?.desiredRoles)
                          ? r.jobPreferences[0].desiredRoles
                          : (r.role || r.requestedRole || userDetails.role || '-')
                      }</td>
                      <td className="p-2">{getFormattedDate()}</td>
                      <td className="p-2">{r.status || 'pending'}</td>
                      <td className="p-2 flex gap-2">
                        <Button size="sm" disabled={r.status === 'completed' || isProcessing} onClick={() => setConfirmDialog({ open: true, type: 'mark', request: r })}>Applied</Button>
                        <Button size="sm" variant="destructive" disabled={isProcessing} onClick={async () => {
                          if (!firestore || !r?.id) return;
                          setIsProcessing(true);
                          try {
                            await import('firebase/firestore').then(({ doc, deleteDoc }) =>
                              deleteDoc(doc(firestore, 'resume-requests', r.id))
                            );
                            toast({ title: 'Deleted', description: 'Resume request deleted.' });
                          } catch (e: any) {
                            toast({ variant: 'destructive', title: 'Error', description: e?.message || 'Failed to delete.' });
                          } finally {
                            setIsProcessing(false);
                          }
                        }}>Delete</Button>
                        {r.resumeURL && (
                          <a href={r.resumeURL} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline text-xs ml-2">Open Resume</a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Dialog open={confirmDialog.open} onOpenChange={(open) => { if (!open) setConfirmDialog({ open: false, type: null, request: null }); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog.type === 'mark' ? 'Confirm Mark as Applied' : confirmDialog.type === 'generate' ? 'Confirm Resume Generation' : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="my-4">
            {confirmDialog.type === 'mark' ? (
              <span>Are you sure you want to mark this resume request as applied? This action cannot be undone.</span>
            ) : confirmDialog.type === 'generate' ? (
              <span>Are you sure you want to generate a resume for this request? This will use AI to create a new resume and mark the request as completed.</span>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog({ open: false, type: null, request: null })} disabled={isProcessing}>Cancel</Button>
            {confirmDialog.type === 'mark' ? (
              <Button onClick={() => handleMarkAsHandled(confirmDialog.request)} disabled={isProcessing}>Confirm</Button>
            ) : confirmDialog.type === 'generate' ? (
              <Button onClick={() => handleGenerateResume(confirmDialog.request)} disabled={isProcessing}>Confirm</Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function HotJobsRequestsTab() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  // Fetch users assigned to this employee
  const usersCollectionRef = React.useMemo(
    () => (firestore && user?.uid ? query(collection(firestore, 'users'), where('assignedEmployeeId', '==', user.uid)) : null),
    [firestore, user]
  );
  const { data: assignedUsers } = useCollection<any>(usersCollectionRef);
  const assignedUserIds = React.useMemo(() => Array.isArray(assignedUsers) ? assignedUsers.map((u: any) => u.id) : [], [assignedUsers]);

  // OPTIMIZED: Fetch only hotJobsRequests for assigned users
  const hotJobsRequestsRef = React.useMemo(() => {
    if (!firestore || !assignedUserIds || assignedUserIds.length === 0) return null;
    
    // If we have 10 or fewer assigned users, use 'in' query for efficiency
    if (assignedUserIds.length <= 10) {
      return query(
        collection(firestore, "hotJobsRequests"),
        where('userId', 'in', assignedUserIds)
      );
    }
    
    // If more than 10 assigned users, fall back to fetching all
    return collection(firestore, "hotJobsRequests");
  }, [firestore, assignedUserIds]);

  const { data: hotJobsRequests, isLoading, error } = useCollection(hotJobsRequestsRef);
  const [isApproving, setIsApproving] = React.useState<string | null>(null);
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'pending' | 'approved'>('all');
  const [planFilter, setPlanFilter] = React.useState<string>('all');

  const plansCollectionRef = useMemoFirebase(() => (firestore ? collection(firestore, 'plans') : null), [firestore]);
  const { data: plans = [] } = useCollection<any>(plansCollectionRef);

  const usersCollectionForPlansRef = React.useMemo(
    () => (firestore && assignedUserIds.length > 0 ? collection(firestore, 'users') : null),
    [firestore, assignedUserIds]
  );
  const { data: allUsersForPlans = [] } = useCollection<any>(usersCollectionForPlansRef);
  const userPlanMap = React.useMemo(() => {
    const map: Record<string, any> = {};
    (allUsersForPlans || []).forEach((u: any) => { if (u.id) map[u.id] = u; });
    return map;
  }, [allUsersForPlans]);

  const filteredHotJobsRequests = React.useMemo(() => {
    if (!Array.isArray(hotJobsRequests)) return [];
    
    // If we used the optimized query, all results are already for assigned users
    let base = hotJobsRequests;
    if (assignedUserIds.length > 10) {
      // Fallback: filter client-side
      base = hotJobsRequests.filter((request: any) => assignedUserIds.includes(request.userId));
    }

    // Sort by requestedAt in descending order (newest first)
    base = base.sort((a, b) => {
      // Try multiple possible timestamp fields
      const getTimestamp = (item: any) => {
        if (item.requestedAt?.seconds) return item.requestedAt.seconds * 1000;
        if (item.requestedAt?.toDate) return item.requestedAt.toDate().getTime();
        if (item.requestedAt) return new Date(item.requestedAt).getTime();
        if (item.createdAt?.seconds) return item.createdAt.seconds * 1000;
        if (item.createdAt?.toDate) return item.createdAt.toDate().getTime();
        if (item.createdAt) return new Date(item.createdAt).getTime();
        if (item.timestamp?.seconds) return item.timestamp.seconds * 1000;
        if (item.timestamp?.toDate) return item.timestamp.toDate().getTime();
        if (item.timestamp) return new Date(item.timestamp).getTime();
        return 0;
      };
      
      return getTimestamp(b) - getTimestamp(a); // Descending order
    });

    const filterPlanRaw = planFilter.toString().trim().toLowerCase();
    if (filterPlanRaw === 'all') return base;

    const planObj = (plans || []).find(
      (p: any) => p.id?.toString().trim().toLowerCase() === filterPlanRaw || p.name?.toString().trim().toLowerCase() === filterPlanRaw
    );

    return base.filter((request: any) => {
      const u = request.userId ? userPlanMap[request.userId] : null;
      const userPlanRaw = (u?.subscription?.plan || 'Free').toString().trim().toLowerCase();
      return (
        userPlanRaw === filterPlanRaw ||
        (planObj && (
          userPlanRaw === planObj.id?.toString().trim().toLowerCase() ||
          userPlanRaw === planObj.name?.toString().trim().toLowerCase()
        ))
      );
    });
  }, [hotJobsRequests, assignedUserIds, planFilter, plans, userPlanMap]);

  const handleApprove = async (request: any) => {
    setIsApproving(request.id);
    try {
      const res = await fetch('/api/hot-jobs-requests/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: request.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to approve');
      toast({ title: 'Applied', description: 'Hot job request marked as applied.' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e?.message || 'Failed to approve.' });
    } finally {
      setIsApproving(null);
    }
  };

  return (
    <Card className="mt-8">
      <h2 className="text-xl font-bold mb-2 p-4">Hot Jobs Requests</h2>
      <div className="flex flex-wrap gap-4 mb-4 items-center px-4">
        <label htmlFor="statusFilter" className="font-medium">Filter:</label>
        <select
          id="statusFilter"
          className="border rounded px-2 py-1 text-sm"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as 'all' | 'pending' | 'approved')}
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="approved">Applied</option>
        </select>
        <label htmlFor="planFilter" className="font-medium ml-4">User Plan:</label>
        <select
          id="planFilter"
          className="border rounded px-2 py-1 text-sm"
          value={planFilter}
          onChange={e => setPlanFilter(e.target.value)}
        >
          <option value="all">All</option>
          {(plans || []).map((p: any) => (
            <option key={p.id} value={p.id || p.name}>{p.name || p.id}</option>
          ))}
        </select>
      </div>
      {isLoading ? (
        <div className="flex justify-center items-center h-32">
          <Loader2 className="animate-spin w-8 h-8 text-gray-400" />
        </div>
      ) : error ? (
        <div className="text-center text-red-500 py-8">Error loading requests.</div>
      ) : !filteredHotJobsRequests || filteredHotJobsRequests.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">No hot jobs requests found.</div>
      ) : (
        <Table>
          <thead>
            <tr>
              <th className="text-left p-4">User Name</th>
              <th className="text-left p-4">User Email</th>
              <th className="text-left p-4">Job Title</th>
              <th className="text-left p-4">Company</th>
              <th className="text-left p-4">Location</th>
              <th className="text-left p-4">Salary</th>
              <th className="text-left p-4">Logo</th>
              <th className="text-left p-4">Requested At</th>
              <th className="text-left p-4">Priority</th>
              <th className="text-left p-4">Type</th>
              <th className="text-left p-4">Status</th>
              <th className="text-left p-4">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredHotJobsRequests
              .filter((request: any) => {
                if (statusFilter === 'all') return true;
                return (request.status || 'pending') === statusFilter;
              })
              .map((request: any) => {
                // Format requested date
                let requestedAt = '-';
                if (request.requestedAt) {
                  if (typeof request.requestedAt === 'object' && request.requestedAt.seconds) {
                    requestedAt = new Date(request.requestedAt.seconds * 1000).toLocaleString();
                  } else if (typeof request.requestedAt === 'string' || typeof request.requestedAt === 'number') {
                    const date = new Date(request.requestedAt);
                    requestedAt = isNaN(date.getTime()) ? String(request.requestedAt) : date.toLocaleString();
                  } else if (typeof request.requestedAt === 'object') {
                    requestedAt = JSON.stringify(request.requestedAt);
                  }
                }
                
                return (
                  <tr key={request.id}>
                    <td className="py-2 px-4">
                      <div className="flex flex-col gap-1">
                        <span>{request.userName || request.userId || '-'}</span>
                        {request.userId && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-fit mt-1"
                            onClick={() => {
                              window.open(`/employee/my-users?userId=${request.userId}`, '_blank');
                            }}
                            title="View user details in My Users page"
                          >
                            View User
                          </Button>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-4">{request.userEmail || '-'}</td>
                    <td className="py-2 px-4">{request.jobTitle || '-'}</td>
                    <td className="py-2 px-4">{request.company || '-'}</td>
                    <td className="py-2 px-4">{request.location || '-'}</td>
                    <td className="py-2 px-4">{request.salary !== undefined && request.salary !== null && request.salary !== '' ? request.salary : '-'}</td>
                    <td className="py-2 px-4">{request.logoUrl ? <img src={request.logoUrl} alt="logo" className="w-8 h-8 rounded" /> : '-'}</td>
                    <td className="py-2 px-4">{requestedAt}</td>
                    <td className="py-2 px-4">{request.priority !== undefined && request.priority !== null ? String(request.priority) : '-'}</td>
                    <td className="py-2 px-4">{request.type || '-'}</td>
                    <td className="py-2 px-4">{request.status === 'approved' ? 'Applied' : (request.status || 'pending')}</td>
                    <td className="py-2 px-4 flex gap-2 flex-wrap">
                      <Button
                        size="sm"
                        disabled={request.status === 'approved' || isApproving === request.id}
                        onClick={() => handleApprove(request)}
                      >
                        {isApproving === request.id ? <Loader2 className="animate-spin w-4 h-4" /> : (request.status === 'approved' ? 'Applied' : 'Applied')}
                      </Button>
                      {/* Apply Job button - redirects to job URL */}
                      {(request.jobUrl || request.url || request.apply_url) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const jobUrl = request.jobUrl || request.url || request.apply_url;
                            if (jobUrl) {
                              window.open(jobUrl, '_blank', 'noopener,noreferrer');
                            }
                          }}
                          title="Open job application page"
                        >
                          Apply Job
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={async () => {
                          if (!request?.id) return;
                          try {
                            await import('firebase/firestore').then(({ doc, deleteDoc }) =>
                              deleteDoc(doc(firestore, 'hotJobsRequests', request.id))
                            );
                            toast({ title: 'Deleted', description: 'Hot job request deleted.' });
                          } catch (e: any) {
                            toast({ variant: 'destructive', title: 'Error', description: e?.message || 'Failed to delete.' });
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </Table>
      )}
    </Card>
  );
}

export default function RequestsPage() {
  return (
    <div className="p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-8">Requests</h1>
      <Tabs defaultValue="resume-requests">
        <TabsList>
          <TabsTrigger value="resume-requests">Resume Requests</TabsTrigger>
          <TabsTrigger value="hot-jobs-requests">Hot Jobs Requests</TabsTrigger>
        </TabsList>
        <TabsContent value="resume-requests">
          <ResumeRequestsTab />
        </TabsContent>
        <TabsContent value="hot-jobs-requests">
          <HotJobsRequestsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}