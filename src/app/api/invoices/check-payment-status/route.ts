import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';

// POST /api/invoices/check-payment-status
// Check if a Stripe session payment was successful
export async function POST(req: Request) {
  try {
    const { invoiceId, sessionId } = await req.json();
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }
    
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    console.log('Stripe session status:', session.payment_status, 'for invoice:', invoiceId);
    
    if (session.payment_status === 'paid') {
      return NextResponse.json({ paid: true, message: 'Payment successful' });
    } else {
      return NextResponse.json({ paid: false, message: 'Payment not yet confirmed' });
    }
  } catch (err: any) {
    console.error('Error checking payment status:', err.message);
    return NextResponse.json({ error: err.message || 'Failed to check payment status' }, { status: 500 });
  }
}
