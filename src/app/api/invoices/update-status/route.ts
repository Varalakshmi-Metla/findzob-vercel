import { NextResponse } from 'next/server';
import adminApp from '@/lib/firebase-admin';

// POST /api/invoices/update-status
// Call this after successful payment to update invoice status
export async function POST(req: Request) {
  try {
    const { invoiceId, status, paymentMethod } = await req.json();
    
    if (!invoiceId || !status) {
      return NextResponse.json({ error: 'Missing invoiceId or status' }, { status: 400 });
    }
    
    const db = adminApp.firestore();
    const invoiceRef = db.collection('invoices').doc(invoiceId);
    
    // Check if invoice exists
    const invoiceDoc = await invoiceRef.get();
    if (!invoiceDoc.exists) {
      console.error('Invoice not found:', invoiceId);
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    
    // Update invoice
    const updateData: any = { status };
    if (paymentMethod) {
      updateData.paymentMethod = paymentMethod;
    }
    if (status === 'paid') {
      updateData.paidAt = new Date();
    }
    
    await invoiceRef.update(updateData);
    console.log('Invoice updated:', invoiceId, updateData);
    
    return NextResponse.json({ success: true, message: 'Invoice updated successfully' });
  } catch (err: any) {
    console.error('Error updating invoice status:', err.message);
    return NextResponse.json({ error: err.message || 'Failed to update invoice' }, { status: 500 });
  }
}
