import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';

// POST /api/admin/generate-payg-invoices
export async function POST(req: NextRequest) {
  return new Promise((resolve) => {
    exec('npx ts-node scripts/generate-payg-hotjob-invoices.ts', (error, stdout, stderr) => {
      if (error) {
        console.error('Invoice script error:', error, stderr);
        resolve(NextResponse.json({ success: false, error: stderr || error.message }, { status: 500 }));
      } else {
        resolve(NextResponse.json({ success: true, output: stdout }));
      }
    });
  });
}
