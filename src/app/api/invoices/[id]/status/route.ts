import { NextResponse } from 'next/server';
import adminApp from '@/lib/firebase-admin';

// PATCH /api/invoices/[id]/status
export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const { status } = await req.json();
    if (!status) {
      return NextResponse.json({ error: 'Missing status' }, { status: 400 });
    }
    const db = adminApp.firestore();
    const invoiceRef = db.collection('invoices').doc(params.id);
    await invoiceRef.update({ status });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
