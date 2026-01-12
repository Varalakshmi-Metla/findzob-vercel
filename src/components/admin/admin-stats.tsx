
'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, collectionGroup, query } from 'firebase/firestore';
import { Loader2, Users, Briefcase, FileText, BadgeCheck } from 'lucide-react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
// file-saver is browser-only; import dynamically where needed to avoid server-side errors
import { useState } from 'react';
import GeneratePaygInvoicesButton from './generate-payg-invoices-btn';

// helpers
const formatCurrency = (cents: number) => {
    const n = Number(cents || 0) / 100;
    return `$${n.toFixed(2)}`;
};

type User = {
    id: string;
    subscription?: {
        status?: string;
        plan?: string;
    }
}
type Job = {
    id: string;
}
type Application = {
    id: string;
}

export default function AdminStats({ isAdmin }: { isAdmin: boolean }) {
    const firestore = useFirestore();
    const usersCollectionRef = useMemoFirebase(() => (firestore && isAdmin) ? collection(firestore, 'users') : null, [firestore, isAdmin]);
    const { data: users, isLoading: areUsersLoading } = useCollection<User>(usersCollectionRef);
    const totalUsers = users?.length || 0;
    const employeeCount = (users || []).filter(u => (u as any).role === 'employee').length || 0;
    const isLoading = areUsersLoading || !isAdmin;

    // Fetch jobs data from Firestore
    const jobsCollectionRef = useMemoFirebase(() => (firestore && isAdmin) ? collection(firestore, 'jobs') : null, [firestore, isAdmin]);
    const { data: jobs, isLoading: areJobsLoading } = useCollection<any>(jobsCollectionRef);
    // Hot jobs: jobs with isHotJob true
    const hotJobsCount = (jobs || []).filter((j: any) => j.isHotJob).length || 0;

    // Fetch resumes using collectionGroup to get all resumes
    const resumesCollectionRef = useMemoFirebase(() => (firestore && isAdmin) ? query(collectionGroup(firestore, 'resumes')) : null, [firestore, isAdmin]);
    const { data: resumes, isLoading: areResumesLoading } = useCollection<any>(resumesCollectionRef);
    const totalResumes = resumes?.length || 0;

    const areAllLoading = isLoading || areJobsLoading || areResumesLoading;

    // Fetch orders data from Firestore
    const ordersCollectionRef = useMemoFirebase(() => (firestore && isAdmin) ? collection(firestore, 'orders') : null, [firestore, isAdmin]);
    const { data: ordersData, isLoading: areOrdersLoading } = useCollection<any>(ordersCollectionRef);

    // Payment / orders stats (group by planName). Only consider completed orders for revenue.
    const paymentStatsByPlan: Record<string, { count: number; totalCents: number }> = {};
    let totalRevenueCents = 0;
    let totalCompletedOrders = 0;
    (ordersData || []).forEach((o: any) => {
        const status = (o.status || '').toLowerCase();
        const planName = o.planName || 'Unknown';
        const amount = Number(o.amount || 0);
        if (!paymentStatsByPlan[planName]) paymentStatsByPlan[planName] = { count: 0, totalCents: 0 };
        // Count all orders (created/pending/completed) for volume; only add to revenue if completed
        paymentStatsByPlan[planName].count += 1;
        if (status === 'completed') {
            paymentStatsByPlan[planName].totalCents += amount;
            totalRevenueCents += amount;
            totalCompletedOrders += 1;
        }
    });

    // Removed duplicate declaration of areAllLoading

    return (
      <>
        <GeneratePaygInvoicesButton />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
        {areAllLoading ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Loading Stats...</CardTitle>
              <Loader2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">—</div>
              <p className="text-xs text-muted-foreground">Fetching data...</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalUsers}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{employeeCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{hotJobsCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Resumes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalResumes}</div>
              </CardContent>
            </Card>
          </>
        )}
        </div>
      </>
    );
}
