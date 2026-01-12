import { NextRequest, NextResponse } from 'next/server';

// You should store these securely, e.g. in environment variables
const PAYTM_MID = process.env.PAYTM_MID!;
const PAYTM_MERCHANT_KEY = process.env.PAYTM_MERCHANT_KEY!;
const PAYTM_WEBSITE = process.env.PAYTM_WEBSITE || 'WEBSTAGING';
const PAYTM_CALLBACK_URL = process.env.PAYTM_CALLBACK_URL || '';

// Helper to generate checksum (Paytm uses this for security)
// You need to install 'paytmchecksum' npm package
let PaytmChecksum: any;

export async function POST(req: NextRequest) {
  try {
    if (!PaytmChecksum) {
      PaytmChecksum = (await import('paytmchecksum')).default;
    }
    const body = await req.json();
    const { amount, orderId, customerId } = body;
    if (!amount || !orderId || !customerId) {
      return NextResponse.json({ error: 'Missing amount, orderId, or customerId' }, { status: 400 });
    }
    const paytmParams: any = {
      MID: PAYTM_MID,
      WEBSITE: PAYTM_WEBSITE,
      INDUSTRY_TYPE_ID: 'Retail',
      CHANNEL_ID: 'WEB',
      ORDER_ID: orderId,
      CUST_ID: customerId,
      TXN_AMOUNT: amount.toString(),
      CALLBACK_URL: PAYTM_CALLBACK_URL,
      EMAIL: body.email || '',
      MOBILE_NO: body.mobile || '',
    };
    const checksum = await PaytmChecksum.generateSignature(paytmParams, PAYTM_MERCHANT_KEY);
    paytmParams.CHECKSUMHASH = checksum;
    return NextResponse.json({ paytmParams });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create Paytm order' }, { status: 500 });
  }
}

// Optionally, add a POST /verify endpoint for payment verification
// (to be implemented after frontend integration)
