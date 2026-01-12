import { NextResponse } from 'next/server';
import adminApp from '@/lib/firebase-admin';

// POST /api/invoices/[id]/mark-paid
export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    if (!params?.id) {
      console.error('No invoice id in params:', params);
      return NextResponse.json({ error: 'Missing invoice id in params' }, { status: 400 });
    }
    const db = adminApp.firestore();
    const invoiceRef = db.collection('invoices').doc(params.id);
    const invoiceDoc = await invoiceRef.get();
    if (!invoiceDoc.exists) {
      console.error('Invoice not found for id:', params.id);
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    await invoiceRef.update({ status: 'paid', paymentMethod: 'stripe' });
    console.log('Invoice updated to paid for id:', params.id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error updating invoice:', err);
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
