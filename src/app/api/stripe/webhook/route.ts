import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import adminApp from '@/lib/firebase-admin';

// Stripe webhook secret from your Stripe dashboard
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: Request) {
  const stripe = getStripe();
  const sig = req.headers.get('stripe-signature');
  const rawBody = await req.text();

  let event;
  try {
    if (!STRIPE_WEBHOOK_SECRET) throw new Error('Missing STRIPE_WEBHOOK_SECRET');
    event = stripe.webhooks.constructEvent(rawBody, sig!, STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const invoiceId = session.metadata?.invoiceId;
    console.log('Payment completed for invoiceId:', invoiceId);
    if (invoiceId) {
      try {
        const db = adminApp.firestore();
        const invoiceRef = db.collection('invoices').doc(invoiceId);
        
        // Check if invoice exists
        const invoiceDoc = await invoiceRef.get();
        if (invoiceDoc.exists) {
          await invoiceRef.update({
            status: 'paid',
            paymentMethod: 'stripe',
            paidAt: new Date(),
          });
          console.log('Invoice updated to paid:', invoiceId);
        } else {
          console.error('Invoice not found:', invoiceId);
        }
      } catch (err: any) {
        console.error('Error updating invoice:', err.message);
      }
    } else {
      console.error('No invoiceId in session metadata');
    }
  }

  // Return a 200 response to acknowledge receipt of the event
  return NextResponse.json({ received: true });
}
