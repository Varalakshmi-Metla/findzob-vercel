import { NextResponse } from 'next/server';
import admin from 'firebase-admin';

// Dev-only diagnostic endpoint to help debug FIREBASE_ADMIN_SVC parsing/init issues.
// Returns non-sensitive metadata (project_id, client_email) when parsing succeeds.
// DO NOT enable or expose in production.

function parseServiceAccount(svc?: string) {
  if (!svc) throw new Error('FIREBASE_ADMIN_SVC not set');
  // Try raw JSON
  try { return JSON.parse(svc) as any; } catch (e1) {
    // Try base64
    try {
      const decoded = Buffer.from(svc, 'base64').toString('utf8');
      return JSON.parse(decoded) as any;
    } catch (e2) {
      const err: any = new Error('Could not parse FIREBASE_ADMIN_SVC as JSON or base64 JSON');
      (err as any).rawParseError = (e1 as any)?.message || String(e1);
      (err as any).base64ParseError = (e2 as any)?.message || String(e2);
      throw err;
    }
  }
}

export async function GET() {
  // Only allow in non-production or when explicitly allowed
  if (process.env.NODE_ENV === 'production' && process.env.DEV_ALLOW_ADMIN_DIAG !== 'true') {
    return NextResponse.json({ ok: false, error: 'Not allowed in production' }, { status: 403 });
  }

  const svc = process.env.FIREBASE_ADMIN_SVC;
  try {
    const parsed = parseServiceAccount(svc);
    // Return non-sensitive fields only
    const meta = {
      project_id: parsed?.project_id || null,
      client_email: parsed?.client_email || null,
    };

    // Try to initialize admin briefly to detect credential errors (but do not expose secrets)
    try {
      if (!admin.apps.length) {
        admin.initializeApp({ credential: admin.credential.cert(parsed as any) });
      }
      return NextResponse.json({ ok: true, parsed: meta });
    } catch (initErr: any) {
      return NextResponse.json({ ok: false, error: 'Parsed but admin.initializeApp failed', detail: (initErr as any)?.message || String(initErr), parsed: meta }, { status: 500 });
    }
  } catch (e: any) {
    // Return parse errors (non-sensitive) to help debug
    return NextResponse.json({ ok: false, error: 'Failed to parse FIREBASE_ADMIN_SVC', parseError: e?.message || String(e), rawParseError: e?.rawParseError || null, base64ParseError: e?.base64ParseError || null }, { status: 500 });
  }
}
