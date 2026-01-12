import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import fs from 'fs';
import { isAdminEmail } from '@/lib/admin';
import { parseISO, format, isValid as isValidDate } from 'date-fns';

function tryInitAdmin() {
  try {
    if (admin.apps.length) return admin.app();
    let svc: string | undefined = undefined;
    if (process.env.FIREBASE_ADMIN_SVC_PATH) {
      svc = fs.readFileSync(process.env.FIREBASE_ADMIN_SVC_PATH, 'utf8');
    } else if (process.env.FIREBASE_ADMIN_SVC) {
      svc = process.env.FIREBASE_ADMIN_SVC;
    }
    if (!svc) return undefined;
    let parsed: any = null;
    try { parsed = JSON.parse(svc); } catch (e1) {
      const decoded = Buffer.from(svc, 'base64').toString('utf8'); parsed = JSON.parse(decoded);
    }
    admin.initializeApp({ credential: admin.credential.cert(parsed as any) });
    return admin.app();
  } catch (e) {
    console.error('init admin failed', e);
    return undefined;
  }
}

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const adminApp = tryInitAdmin();
    if (!adminApp) return NextResponse.json({ ok: false, error: 'Admin SDK not initialized' }, { status: 500 });

    // verify session cookie
    const cookie = req.headers.get('cookie') || '';
    const match = cookie.match(/(?:^|; )session=([^;]+)/);
    const sessionCookie = match ? match[1] : null;
    let decoded: any = null;
    if (!sessionCookie) return NextResponse.json({ ok: false, error: 'Missing session cookie' }, { status: 401 });
    try {
      decoded = await admin.auth().verifySessionCookie(sessionCookie, true) as any;
    } catch (e) {
      return NextResponse.json({ ok: false, error: 'Invalid session cookie' }, { status: 401 });
    }

    const email = decoded?.email || '';
    if (!isAdminEmail(String(email).toLowerCase())) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });

    const snap = await admin.firestore().collection('users').get();
    const users: any[] = [];
    for (const doc of snap.docs) {
      const d = doc.data() as any;
      // format dateOfBirth to MM-DD-YYYY for exports when possible
      let outDob = '';
      if (d.dateOfBirth) {
        try {
          const iso = parseISO(d.dateOfBirth);
          if (isValidDate(iso)) outDob = format(iso, 'MM-dd-yyyy');
          else {
            const dt = new Date(d.dateOfBirth);
            if (!isNaN(dt.getTime())) outDob = format(dt, 'MM-dd-yyyy');
          }
        } catch (e) {
          // fallback to raw
          outDob = String(d.dateOfBirth || '');
        }
      }
      users.push({ id: doc.id, name: d.name || '', email: d.email || '', role: d.role || '', subscription: d.subscription || {}, phone: d.phone || '', address: d.address || '', gender: d.gender || '', dateOfBirth: outDob, createdAt: d.createdAt || '' });
    }
    return NextResponse.json({ ok: true, users });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
