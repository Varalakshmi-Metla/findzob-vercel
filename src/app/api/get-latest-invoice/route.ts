import { NextResponse } from 'next/server';

export async function GET() {
  // This endpoint is deprecated. Invoices are now generated only via the generate invoice flow.
  return NextResponse.json({
    error: 'This endpoint has been removed. Please use the invoice generation flow instead.'
  }, { status: 410 }); // 410 Gone
}