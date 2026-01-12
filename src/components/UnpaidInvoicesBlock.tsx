import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, ChevronRight } from 'lucide-react';
import { useUnpaidInvoices, UnpaidInvoice } from '@/hooks/use-unpaid-invoices';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface UnpaidInvoicesBlockProps {
  children: React.ReactNode;
  showWarning?: boolean;
}

export function UnpaidInvoicesBlock({
  children,
  showWarning = true,
}: UnpaidInvoicesBlockProps) {
  const pathname = usePathname();
  const { hasUnpaidInvoices, unpaidCount, invoices, loading } =
    useUnpaidInvoices();

  if (loading) {
    return <>{children}</>;
  }

  if (!hasUnpaidInvoices) {
    return <>{children}</>;
  }

  // Allow access to invoices page so user can pay
  if (pathname === '/dashboard/invoices') {
    return <>{children}</>;
  }

  // Calculate total amount due
  const totalAmount = invoices.reduce((sum, inv: UnpaidInvoice) => {
    return sum + (typeof inv.amount === 'number' ? inv.amount : 0);
  }, 0);

  // Get previous month name for display
  const now = new Date();
  const prevMonthNum = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const prevMonthDate = new Date(prevYear, prevMonthNum, 1);
  const previousMonthName = prevMonthDate.toLocaleString('default', { month: 'long' });

  return (
    <>
      <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950 mb-6">
        <CardHeader>
          <div className="flex items-start gap-4">
            <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <CardTitle className="text-red-900 dark:text-red-100">
                Unpaid {previousMonthName} Invoices
              </CardTitle>
              <CardDescription className="text-red-700 dark:text-red-300 mt-2">
                You have {unpaidCount} unpaid invoice{unpaidCount !== 1 ? 's' : ''} from {previousMonthName} totaling{' '}
                <strong>
                  {invoices[0]?.currency === 'INR' ? '₹' : '$'}
                  {totalAmount.toFixed(2)}
                </strong>
                . Please clear these invoices to continue using dashboard features.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {invoices.map((invoice: UnpaidInvoice, idx: number) => (
              <div
                key={invoice.id || idx}
                className="flex justify-between items-center p-3 bg-white dark:bg-gray-900 rounded border border-red-200 dark:border-red-800"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Invoice {idx + 1} ({previousMonthName})
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(invoice.createdAt).toLocaleDateString('default', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <span className="font-semibold text-red-600 dark:text-red-400">
                  {invoice.currency === 'INR' ? '₹' : '$'}
                  {(typeof invoice.amount === 'number' ? invoice.amount : 0).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <Link href="/dashboard/invoices">
            <Button className="w-full bg-red-600 hover:bg-red-700 text-white gap-2">
              Go to Invoices Page & Pay Now
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>

          <p className="text-xs text-gray-600 dark:text-gray-400">
            Once you clear all unpaid invoices from {previousMonthName}, you'll regain full access to resumes,
            interview prep, jobs, and all other dashboard features.
          </p>
        </CardContent>
      </Card>

      {showWarning && (
        <div className="opacity-50 pointer-events-none">
          {children}
        </div>
      )}
      {!showWarning && children}
    </>
  );
}
