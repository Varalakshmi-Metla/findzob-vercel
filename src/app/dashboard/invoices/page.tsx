"use client";
import { useEffect, useState, useRef } from "react";
import { useUser } from "@/firebase/provider";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function InvoicesPage() {
  const { user } = useUser();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const lastFetchedUserId = useRef<string | undefined>(undefined);

  // Refetch invoices when page becomes visible (user returns from Stripe payment)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Page became visible, refetching invoices...');
        setRefreshTrigger(prev => prev + 1);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Refetch invoices on mount, user change, or when page becomes visible
  useEffect(() => {
    if (!user?.uid) return;
    
    lastFetchedUserId.current = user.uid;
    const fetchInvoices = async () => {
      setLoading(true);
      try {
        console.log('Fetching invoices for user:', user.uid);
        const res = await fetch(`/api/invoices?userId=${user.uid}`);
        const data = await res.json();
        setInvoices(data.invoices || []);
        console.log('Invoices fetched:', data.invoices?.length || 0);
      } catch (err) {
        console.error('Error fetching invoices:', err);
        setInvoices([]);
      } finally {
        setLoading(false);
      }
    };
    fetchInvoices();
  }, [user?.uid, refreshTrigger]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      console.log('Manually refreshing invoices for user:', user?.uid);
      const res = await fetch(`/api/invoices?userId=${user?.uid}`);
      const data = await res.json();
      setInvoices(data.invoices || []);
      console.log('Invoices refreshed:', data.invoices?.length || 0);
    } catch (err) {
      console.error('Error refreshing invoices:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="w-full h-screen flex flex-col p-2 sm:p-4 md:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3 sm:gap-0">
        <h1 className="text-xl sm:text-2xl font-bold">Invoices</h1>
        <Button 
          onClick={handleRefresh} 
          disabled={isRefreshing}
          variant="outline"
          size="sm"
          className="text-xs sm:text-sm w-full sm:w-auto h-8 sm:h-10"
        >
          {isRefreshing ? (
            <>
              <Loader2 className="mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
              Refreshing...
            </>
          ) : (
            'Refresh'
          )}
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        {loading ? (
          <div className="text-xs sm:text-sm">Loading...</div>
        ) : invoices.length === 0 ? (
          <div className="text-xs sm:text-sm">No invoices found.</div>
        ) : (
          <div className="w-full">
            <table className="w-full border-collapse border text-[10px] sm:text-xs md:text-sm">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-800 sticky top-0">
                  <th className="border border-gray-300 dark:border-gray-600 px-1 sm:px-2 md:px-3 py-1 sm:py-2 text-left text-gray-900 dark:text-white font-semibold">Invoice ID</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-1 sm:px-2 md:px-3 py-1 sm:py-2 text-left text-gray-900 dark:text-white font-semibold">Date</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-1 sm:px-2 md:px-3 py-1 sm:py-2 text-left text-gray-900 dark:text-white font-semibold">Type</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-1 sm:px-2 md:px-3 py-1 sm:py-2 text-left text-gray-900 dark:text-white font-semibold">Amount</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-1 sm:px-2 md:px-3 py-1 sm:py-2 text-left text-gray-900 dark:text-white font-semibold">Status</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-1 sm:px-2 md:px-3 py-1 sm:py-2 text-left text-gray-900 dark:text-white font-semibold">View</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b border-gray-300 dark:border-gray-600">
                    <td className="border border-gray-300 dark:border-gray-600 px-1 sm:px-2 md:px-3 py-1 sm:py-2 text-[10px] sm:text-xs md:text-sm text-gray-900 dark:text-gray-100 break-words max-w-[50px] sm:max-w-[70px] md:max-w-none">{inv.id}</td>
                    <td className="border border-gray-300 dark:border-gray-600 px-1 sm:px-2 md:px-3 py-1 sm:py-2 text-[10px] sm:text-xs md:text-sm text-gray-900 dark:text-gray-100">{
                      (() => {
                        let dateVal = inv.updatedAt || inv.createdAt;
                        if (!dateVal && inv.paymentMethod === 'razorpay' && inv.purchaseDate) {
                          dateVal = inv.purchaseDate;
                        }
                        if (!dateVal) return "-";
                        if (typeof dateVal === "string") {
                          const d = new Date(dateVal);
                          return isNaN(d.getTime()) ? "-" : d.toLocaleDateString();
                        }
                        if (typeof dateVal === "object" && "seconds" in dateVal) {
                          return new Date(dateVal.seconds * 1000).toLocaleDateString();
                        }
                        return "-";
                      })()
                    }</td>
                    <td className="border border-gray-300 dark:border-gray-600 px-1 sm:px-2 md:px-3 py-1 sm:py-2 text-[10px] sm:text-xs md:text-sm text-gray-900 dark:text-gray-100">
                      {(() => {
                        const type = inv.type || 'standard';
                        const typeLabel = {
                          'payg-hotjobs': 'Hot Jobs',
                          'payg-applications': 'Applications',
                          'plan-purchase': 'Plan Purchase',
                          'standard': 'Plan Purchase'
                        }[type] || type;
                        return typeLabel;
                      })()}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-1 sm:px-2 md:px-3 py-1 sm:py-2 text-[10px] sm:text-xs md:text-sm text-gray-900 dark:text-gray-100">{inv.amount} {inv.currency?.toUpperCase()}</td>
                    <td className="border border-gray-300 dark:border-gray-600 px-1 sm:px-2 md:px-3 py-1 sm:py-2 text-center">
                      {inv.status === 'paid' ? (
                        <span className="text-green-600 dark:text-green-400 font-bold text-[10px] sm:text-xs md:text-sm" title="Paid">✔ Paid</span>
                      ) : inv.status === 'unpaid' ? (
                        <span className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 font-bold px-0.5 sm:px-1.5 md:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs md:text-sm" title="Unpaid">✗ Unpaid</span>
                      ) : (
                        <span className="text-gray-600 dark:text-gray-300 font-bold text-[10px] sm:text-xs md:text-sm" title="Status">{inv.status?.toUpperCase() || 'UNKNOWN'}</span>
                      )}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-1 sm:px-2 md:px-3 py-1 sm:py-2">
                      <a href={`/invoice/${inv.id}`} target="_blank" rel="noopener noreferrer" className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 underline text-[10px] sm:text-xs md:text-sm">
                        {inv.status === 'unpaid' ? 'Pay' : 'View'}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
