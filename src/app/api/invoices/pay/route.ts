import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import adminApp from '@/lib/firebase-admin';

export async function POST(req: Request) {
  try {
    const { invoiceId, userId, userEmail } = await req.json();
    if (!invoiceId || !userId) {
      return NextResponse.json({ error: 'Missing invoiceId or userId' }, { status: 400 });
    }
    const db = adminApp.firestore();
    const invoiceDoc = await db.collection('invoices').doc(invoiceId).get();
    if (!invoiceDoc.exists) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    const invoice = invoiceDoc.data();
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice data missing' }, { status: 404 });
    }
    if (invoice.status === 'paid') {
      return NextResponse.json({ error: 'Invoice already paid' }, { status: 400 });
    }
    // Stripe instance
    let stripe;
    try {
      stripe = getStripe();
    } catch (e) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }
    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: userEmail,
      line_items: [
        {
          price_data: {
            currency: invoice.currency || 'usd',
            product_data: {
              name: invoice.planName || 'Invoice Payment',
              description: invoice.description || '',
            },
            unit_amount: Math.round(Number(invoice.amount) * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        invoiceId,
        userId,
      },
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/invoice/${invoiceId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/invoice/${invoiceId}`,
    });
    // Always return the Stripe Checkout URL, never a /checkout URL
    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
