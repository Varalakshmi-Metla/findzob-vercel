import { NextRequest, NextResponse } from 'next/server';
// Stripe wallet top-up is disabled; keep this route to avoid 404s.
// If called, it will respond with a clear error.

export async function POST(req: NextRequest) {
  return NextResponse.json(
    { error: 'Wallet top-up via Stripe is no longer available. Please use Razorpay.' },
    { status: 400 },
  );
}
