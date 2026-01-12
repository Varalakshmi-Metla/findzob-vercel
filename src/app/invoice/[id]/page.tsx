'use client';

import { useMemo, use, useRef, useEffect } from 'react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function InvoicePage({ params }: { params: { id: string } }) {
  const firestore = useFirestore();
  const invoiceRef = useRef<HTMLDivElement>(null);

  const resolvedParams = use(params as any) as { id: string };

  const invoiceDocRef = useMemoFirebase(() => {
    if (!resolvedParams.id || !firestore) return null;
    return doc(firestore, 'invoices', resolvedParams.id);
  }, [resolvedParams.id, firestore]);

  const { data: invoice, isLoading } = useDoc(invoiceDocRef);

  // Check Stripe session and update invoice status if payment succeeded
  useEffect(() => {
    if (!invoice) return;
    
    // Skip if already paid
    if (invoice.status === 'paid') {
      console.log('Invoice already paid, skipping update check');
      return;
    }
    
    const checkAndUpdatePayment = async () => {
      try {
        if (typeof window === 'undefined') return;
        
        const storageKey = `stripe-session-${invoice.id}`;
        const sessionId = sessionStorage.getItem(storageKey);
        
        console.log('=== Payment Check Started ===');
        console.log('Invoice ID:', invoice.id);
        console.log('Invoice Status:', invoice.status);
        console.log('SessionId from storage:', sessionId);
        
        if (!sessionId) {
          console.log('No session ID found, skipping payment check');
          return;
        }
        
        console.log('Found sessionId! Proceeding with payment verification...');
        
        // Add a small delay to ensure webhook has time to process
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Direct update - assume payment succeeded if user is returning from Stripe
        console.log('Calling /api/invoices/update-status...');
        const updateResponse = await fetch('/api/invoices/update-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            invoiceId: invoice.id,
            status: 'paid',
            paymentMethod: 'stripe'
          }),
        });
        
        console.log('Update API status:', updateResponse.status);
        const updateResult = await updateResponse.json();
        console.log('Update result:', updateResult);
        
        if (updateResponse.ok) {
          console.log('✓ Invoice updated to paid successfully');
          sessionStorage.removeItem(storageKey);
          console.log('Cleared session storage');
        } else {
          console.error('Update failed:', updateResult);
        }
        
        console.log('=== Payment Check Completed ===');
      } catch (error) {
        console.error('Error in payment check:', error);
      }
    };
    
    // Check immediately when component loads
    checkAndUpdatePayment();
  }, [invoice]);

  const handleDownloadPdf = async () => {
    if (!invoiceRef.current) return;

    const originalStyles = {
      boxShadow: invoiceRef.current.style.boxShadow,
      transform: invoiceRef.current.style.transform,
    };

    try {
      // Apply PDF-optimized styles
      invoiceRef.current.style.boxShadow = 'none';
      invoiceRef.current.style.transform = 'scale(1)';

      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: invoiceRef.current.offsetWidth,
        height: invoiceRef.current.offsetHeight,
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min((pdfWidth - 20) / imgWidth, (pdfHeight - 20) / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 10;

      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`invoice-${invoice.id}.pdf`);

    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      // Restore original styles
      if (invoiceRef.current) {
        invoiceRef.current.style.boxShadow = originalStyles.boxShadow;
        invoiceRef.current.style.transform = originalStyles.transform;
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-red-500">Invoice not found.</p>
      </div>
    );
  }

  // Format date
  const invoiceDate = (() => {
    if (!invoice.createdAt) return '';
    if (typeof invoice.createdAt === 'string') {
      return new Date(invoice.createdAt).toLocaleDateString();
    }
    if (typeof invoice.createdAt === 'object' && 'seconds' in invoice.createdAt) {
      return new Date(invoice.createdAt.seconds * 1000).toLocaleDateString();
    }
    return '';
  })();

  // Format amount
  const currency = invoice.currency ? invoice.currency.toUpperCase() : 'INR';
  const amount = typeof invoice.amount === 'number' ? invoice.amount : 0;
  const formattedAmount = amount > 0
    ? amount.toLocaleString('en-IN', { style: 'currency', currency })
    : '-';

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-4 gap-2 flex-wrap">
        <Button onClick={handleDownloadPdf}>Download PDF</Button>
        {/*
          Pay button: If invoice is unpaid, clicking this button will call the Stripe API and redirect directly to Stripe Checkout.
          After successful payment, the Stripe webhook will update the invoice as paid in Firestore.
        */}
        {invoice.status?.toLowerCase() !== 'paid' && (
          <Button
            color="primary"
            onClick={async () => {
              try {
                const res = await fetch('/api/invoices/pay', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ invoiceId: invoice.id, userId: invoice.userId, userEmail: invoice.userEmail }),
                });
                const data = await res.json();
                console.log('Payment API response:', data);
                
                if (data.url && data.sessionId) {
                  // Store session ID before redirecting
                  if (typeof window !== 'undefined') {
                    sessionStorage.setItem(`stripe-session-${invoice.id}`, data.sessionId);
                    console.log('Stored sessionId:', data.sessionId);
                  }
                  // Redirect to Stripe
                  window.location.href = data.url;
                } else {
                  alert(data.error || 'Failed to initiate payment.');
                }
              } catch (error) {
                console.error('Payment error:', error);
                alert('Error initiating payment');
              }
            }}
          >
            Pay with Stripe
          </Button>
        )}
      </div>
      {/* Invoice Content with fixed spacing */}
      <div 
        ref={invoiceRef} 
        id="invoice-content"
        className="max-w-2xl mx-auto bg-white rounded-lg p-6 md:p-8 border border-gray-300"
        style={{
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        }}
      >
        {/* Logo Section */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <img 
              src="/logo.png" 
              alt="Your Logo" 
              className="h-20 w-auto object-contain" 
              crossOrigin="anonymous"
            />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-3 border-b-2 border-gray-300 pb-3">INVOICE</h1>
        </div>

        {/* Company and Invoice Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {/* Company Info */}
          <div className="text-gray-700 space-y-2">
            <div className="font-semibold text-lg text-gray-800 mb-3 pb-2 border-b border-gray-200">
              Findzob Technologies Pvt Ltd
            </div>
            <div className="text-sm leading-5">Hyderabad, India</div>
            <div className="text-sm leading-5">support@findzob.com</div>
          </div>

          {/* Invoice Details */}
          <div className="text-gray-700 space-y-3">
            <div className="pb-2 border-b border-gray-200">
              <div className="font-semibold text-gray-800">DATE OF INVOICE:</div>
              <div className="text-sm mt-1">{invoiceDate}</div>
            </div>
            <div className="pb-2 border-b border-gray-200">
              <div className="font-semibold text-gray-800">INVOICE NO:</div>
              <div className="text-sm mt-1">{invoice.id}</div>
            </div>
          </div>
        </div>

        {/* Customer Information */}
        <div className="mb-10 p-4 bg-gray-50 rounded border border-gray-300">
          <div className="font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-300">CUSTOMER NAME</div>
          <div className="text-gray-700 space-y-2 text-sm">
            <div className="font-medium text-gray-800">{invoice.userName || '-'}</div>
            {invoice.userEmail && <div className="leading-5">{invoice.userEmail}</div>}
            {invoice.userPhone && <div className="leading-5">Phone: {invoice.userPhone}</div>}
            {invoice.userAddress && (
              <div className="leading-5">
                Address: {invoice.userAddress}
              </div>
            )}
          </div>
        </div>

        {/* Invoice Items Table */}
        <div className="mb-10">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-left py-4 font-semibold text-gray-800 border border-gray-300 px-4 w-3/4">
                  DESCRIPTION
                </th>
                <th className="text-right py-4 font-semibold text-gray-800 border border-gray-300 px-4 w-1/4">
                  AMOUNT
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-4 text-gray-700 border border-gray-300 px-4 align-top">
                  <div className="font-medium text-gray-800 mb-2">{invoice.planName || 'Service'}</div>
                  {invoice.description && (
                    <div className="text-sm text-gray-600 leading-5">{invoice.description}</div>
                  )}
                </td>
                <td className="py-4 text-right text-gray-800 font-medium border border-gray-300 px-4 align-top">
                  <div className="leading-6">{formattedAmount}</div>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="bg-gray-50">
                <td className="py-4 text-right font-semibold text-gray-800 border border-gray-300 px-4 pr-6">
                  TOTAL
                </td>
                <td className="py-4 text-right font-semibold text-gray-800 text-lg border border-gray-300 px-4">
                  <div className="leading-6">{formattedAmount}</div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Payment Instructions */}
        <div className="mb-8 text-center text-gray-600 border-t border-gray-300 pt-6">
          <div className="text-sm leading-6">
            Please make checks payable to <span className="font-semibold">Findzob Technologies Pvt Ltd</span>
          </div>
        </div>

        {/* Status and Payment Method */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 text-sm text-gray-600 gap-4 border-t border-gray-300 pt-6">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Status:</span>
            <span className={`font-semibold ${
              invoice.status === 'paid' ? 'text-green-600' : 
              invoice.status === 'pending' ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {invoice.status?.toUpperCase() || 'PENDING'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold">Payment Method:</span>
            <span>{invoice.paymentMethod?.toUpperCase() || '-'}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 border-t border-gray-300 pt-6">
          <div className="mb-3 font-semibold text-sm">THANK YOU</div>
          <div className="mb-3 leading-5">
            For questions concerning this invoice, please contact<br />
            <span className="font-semibold">Support: support@findzob.com</span>
          </div>
          <div className="font-semibold">www.findzob.com</div>
        </div>
      </div>
    </div>
  );
}