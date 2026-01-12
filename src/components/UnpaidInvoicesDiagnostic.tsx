'use client';
import { useEffect, useState } from 'react';
import { useUser } from '@/firebase';

export function UnpaidInvoicesDiagnostic() {
  const { user } = useUser();
  const [checkResult, setCheckResult] = useState<any>(null);
  const [invoicesResult, setInvoicesResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;

    const testEndpoints = async () => {
      setLoading(true);
      try {
        // Test check-unpaid-invoices endpoint
        const checkRes = await fetch(`/api/check-unpaid-invoices?userId=${user.uid}`);
        const checkData = await checkRes.json();
        console.log('[DIAGNOSTIC] check-unpaid-invoices response:', checkData);
        setCheckResult(checkData);

        // Test invoices endpoint
        const invoicesRes = await fetch(`/api/invoices?userId=${user.uid}`);
        const invoicesData = await invoicesRes.json();
        console.log('[DIAGNOSTIC] invoices response:', invoicesData);
        setInvoicesResult(invoicesData);
      } catch (err) {
        console.error('[DIAGNOSTIC] Error:', err);
      } finally {
        setLoading(false);
      }
    };

    testEndpoints();
  }, [user?.uid]);

  if (!user) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-4 max-w-sm shadow-lg">
      <h3 className="font-bold mb-2">Invoice Diagnostic</h3>
      <p className="text-xs mb-2">User ID: {user.uid}</p>
      {loading && <p className="text-xs text-gray-500">Loading...</p>}
      {checkResult && (
        <div className="mb-3 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs">
          <p className="font-semibold">check-unpaid-invoices:</p>
          <p>✓ Has unpaid: {checkResult.hasUnpaidInvoices ? 'YES' : 'NO'}</p>
          <p>✓ Count: {checkResult.unpaidCount || 0}</p>
          {checkResult.invoices?.length > 0 && (
            <div className="mt-1 text-[10px]">
              {checkResult.invoices.map((inv: any) => (
                <p key={inv.id}>{inv.id}: ${inv.amount} ({inv.status})</p>
              ))}
            </div>
          )}
        </div>
      )}
      {invoicesResult && (
        <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs">
          <p className="font-semibold">invoices:</p>
          <p>✓ Total: {invoicesResult.invoices?.length || 0}</p>
          {invoicesResult.invoices?.length > 0 && (
            <div className="mt-1 text-[10px]">
              {invoicesResult.invoices.slice(0, 3).map((inv: any) => (
                <p key={inv.id}>{inv.id}: ${inv.amount} ({inv.status})</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
