import { NextRequest, NextResponse } from 'next/server';

// This is a mock implementation. Replace with real CashApp API integration.
export async function POST(req: NextRequest) {
  try {
    const { plan, userId } = await req.json();
    // Here, you would call CashApp API to create a payment request and get a payment URL
    // For now, we mock a redirect URL (replace with real CashApp payment link)
    const cashappUrl = `https://cash.app/pay?amount=${plan.price}&currency=USD&note=${encodeURIComponent(plan.name)}&user=${userId}`;
    return NextResponse.json({ cashappUrl });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to create CashApp order' }, { status: 400 });
  }
}
