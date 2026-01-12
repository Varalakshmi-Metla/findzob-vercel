import admin from 'firebase-admin';
import { NextResponse } from 'next/server';

function tryInitAdmin() {
  try {
    if (admin.apps.length) return admin.app();
    const svc = process.env.FIREBASE_ADMIN_SVC;
    if (!svc) return undefined;
    let parsed: any = null;
    try { parsed = JSON.parse(svc); } catch (e1) {
      try { parsed = Buffer.from(svc, 'base64').toString('utf8'); parsed = JSON.parse(parsed); } catch (e2) { return undefined; }
    }
    admin.initializeApp({ credential: admin.credential.cert(parsed as any) });
    return admin.app();
  } catch (e) {
    console.error('Failed to init admin in diagnostics', e);
    return undefined;
  }
}

export async function GET(req: Request) {
  try {
    const adminApp = tryInitAdmin();
    const ok = !!adminApp;
    const message = ok ? 'Admin SDK initialized' : 'Admin SDK not initialized. Ensure FIREBASE_ADMIN_SVC env var is set (raw JSON or base64-encoded JSON)';

    // If caller provided a bearer token, verify admin claim
    const authHeader = req.headers.get('authorization') || '';
    let callerIsAdmin = false;
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = admin.auth().verifyIdToken(token);
        // we don't await intentionally; this call will blow up if admin isn't initialized
        // but wrap in try/catch above
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const d = await decoded as any;
        callerIsAdmin = !!(d && (d.admin === true || d.role === 'admin' || d.employee === true));
      } catch (e) {
        // ignore
      }
    }

    return NextResponse.json({ ok, message, callerIsAdmin });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: String(e) }, { status: 500 });
  }
}
