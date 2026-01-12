'use client';

import { useUser } from '@/firebase';
import { isAdminEmail } from '@/lib/admin';
import AdminStats from '@/components/admin/admin-stats';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function AdminDashboardPage() {
  const { user, isUserLoading } = useUser();
  const isAdmin = isAdminEmail(user?.email);
  const [generating, setGenerating] = useState(false);

  const handleGenerateInvoices = async () => {
    if (!confirm('Are you sure you want to generate invoices for PAYG USA users?')) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/admin/generate-invoices', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error(error);
      alert('Failed to generate invoices');
    } finally {
      setGenerating(false);
    }
  };

  if (isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        {isAdmin && (
          <Button 
            onClick={handleGenerateInvoices} 
            disabled={generating}
          >
            {generating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Generate PAYG Invoices (USA)
          </Button>
        )}
      </div>
      {isAdmin ? <AdminStats isAdmin={true} /> : <p>You do not have permission to view this page.</p>}
    </div>
  );
}
