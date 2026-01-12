import { useEffect, useState } from 'react';
import { useUser } from '@/firebase';

export interface UnpaidInvoice {
  id: string;
  userId: string;
  amount: number;
  status: string;
  createdAt: string;
  [key: string]: any;
}

export interface UnpaidInvoicesCheckResult {
  hasUnpaidInvoices: boolean;
  unpaidCount: number;
  invoices: UnpaidInvoice[];
  loading: boolean;
  error: string | null;
}

export function useUnpaidInvoices(): UnpaidInvoicesCheckResult {
  const { user } = useUser();
  const [result, setResult] = useState<UnpaidInvoicesCheckResult>({
    hasUnpaidInvoices: false,
    unpaidCount: 0,
    invoices: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    const checkInvoices = async () => {
      if (!user?.uid) {
        console.log('[useUnpaidInvoices] No user UID, skipping check');
        setResult((prev) => ({ ...prev, loading: false }));
        return;
      }

      try {
        console.log('[useUnpaidInvoices] Checking unpaid invoices for user:', user.uid);
        setResult((prev) => ({ ...prev, loading: true, error: null }));
        const response = await fetch(
          `/api/check-unpaid-invoices?userId=${user.uid}`
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        console.log('[useUnpaidInvoices] API Response:', data);

        if (data.success) {
          console.log('[useUnpaidInvoices] Found unpaid invoices:', data.unpaidCount);
          setResult({
            hasUnpaidInvoices: data.hasUnpaidInvoices,
            unpaidCount: data.unpaidCount,
            invoices: data.invoices || [],
            loading: false,
            error: null,
          });
        } else {
          throw new Error(data.error || 'Failed to check invoices');
        }
      } catch (error) {
        console.error('[useUnpaidInvoices] Error checking unpaid invoices:', error);
        setResult((prev) => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }));
      }
    };

    checkInvoices();
    // Check every 5 minutes
    const interval = setInterval(checkInvoices, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user?.uid]);

  return result;
}
