
"use client";

import React, { useMemo } from "react";
import { collection, query, where } from "firebase/firestore";
import { useCollection, useFirestore, useUser } from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import { Loader2 } from "lucide-react";

export default function EmployeeDashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const empUid = (user as any)?.uid;

  // Assigned users for this employee
  const assignedUsersRef = useMemo(() => {
    if (!firestore || !empUid) return null;
    return query(collection(firestore, "users"), where("assignedEmployeeId", "==", empUid));
  }, [firestore, empUid]);
  const { data: assignedUsers, isLoading: isLoadingAssignedUsers } = useCollection(assignedUsersRef as any);

  const assignedUserIds = useMemo(() => (assignedUsers || []).map((u: any) => u.id), [assignedUsers]);

  // Resume requests for assigned users
  const resumeRequestsRef = useMemo(() => {
    if (!firestore || !assignedUserIds.length) return null;
    return query(collection(firestore, "resume-requests"), where("userId", "in", assignedUserIds), where("status", "==", "pending"));
  }, [firestore, assignedUserIds]);
  const { data: resumeRequests, isLoading: isLoadingResumeRequests } = useCollection(resumeRequestsRef as any);

  // Hot job requests for assigned users
  const hotJobsRef = useMemo(() => {
    if (!firestore || !assignedUserIds.length) return null;
    return query(collection(firestore, "hot-jobs"), where("userId", "in", assignedUserIds), where("status", "==", "pending"));
  }, [firestore, assignedUserIds]);
  const { data: hotJobs, isLoading: isLoadingHotJobs } = useCollection(hotJobsRef as any);

  if (isUserLoading || isLoadingAssignedUsers || isLoadingResumeRequests || isLoadingHotJobs) {
    return <div className="p-6 flex justify-center items-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  // Date helpers
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10); // 'YYYY-MM-DD'
  const monthStr = now.toISOString().slice(0, 7); // 'YYYY-MM'

  // Assigned users: today and month
  const assignedToday = (assignedUsers || []).filter((u: any) => (u.createdAt || u.created_at || '').slice(0, 10) === todayStr);
  const assignedMonth = (assignedUsers || []).filter((u: any) => (u.createdAt || u.created_at || '').slice(0, 7) === monthStr);

  // Resume requests: today and month
  const resumeToday = (resumeRequests || []).filter((r: any) => (r.createdAt || r.created_at || '').slice(0, 10) === todayStr);
  const resumeMonth = (resumeRequests || []).filter((r: any) => (r.createdAt || r.created_at || '').slice(0, 7) === monthStr);

  // Hot jobs: today and month
  const hotToday = (hotJobs || []).filter((h: any) => (h.createdAt || h.created_at || '').slice(0, 10) === todayStr);
  const hotMonth = (hotJobs || []).filter((h: any) => (h.createdAt || h.created_at || '').slice(0, 7) === monthStr);

  const assignedCount = assignedUsers?.length || 0;
  const resumeRequestsCount = resumeRequests?.length || 0;
  const hotJobRequestsCount = hotJobs?.length || 0;

  return (
    <div className="p-6">
      <div className="mb-6 pb-4 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h1 className="text-2xl font-bold">Employee Dashboard</h1>
          {user?.uid && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
              <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Agent ID:</span>
              <span className="text-lg sm:text-xl font-mono font-bold bg-primary/10 text-primary px-4 py-2 rounded-lg border-2 border-primary/20 break-all sm:break-normal">
                {user.uid}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle>Assigned Users</CardTitle>
              <CardDescription>Users assigned to you</CardDescription>
            </div>
            <div className="text-3xl font-bold">{assignedCount}</div>
          </CardHeader>
          <CardContent>
            <div className="text-sm mb-2">Today: <span className="font-semibold">{assignedToday.length}</span> | This Month: <span className="font-semibold">{assignedMonth.length}</span></div>
            <Link href="/employee/my-users" className="text-sm font-bold text-white hover:underline">View My Users</Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle>Resume Requests</CardTitle>
              <CardDescription>Pending resume requests</CardDescription>
            </div>
            <div className="text-3xl font-bold">{resumeRequestsCount}</div>
          </CardHeader>
          <CardContent>
            <div className="text-sm mb-2">Today: <span className="font-semibold">{resumeToday.length}</span> | This Month: <span className="font-semibold">{resumeMonth.length}</span></div>
            <Link href="/employee/requests" className="text-sm font-bold text-white hover:underline">Manage Resume Requests</Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle>Hot Job Requests</CardTitle>
              <CardDescription>Hot job applications to review</CardDescription>
            </div>
            <div className="text-3xl font-bold">{hotJobRequestsCount}</div>
          </CardHeader>
          <CardContent>
            <div className="text-sm mb-2">Today: <span className="font-semibold">{hotToday.length}</span> | This Month: <span className="font-semibold">{hotMonth.length}</span></div>
            <Link href="/employee/requests" className="text-sm font-bold text-white hover:underline">View Hot Jobs</Link>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-3">Notifications</h2>
        <div className="text-sm text-muted-foreground">New assignments, new requests and completions will appear here.</div>
      </div>
    </div>
  );
}
