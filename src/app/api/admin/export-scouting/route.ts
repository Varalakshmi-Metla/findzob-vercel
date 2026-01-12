import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import fs from 'fs';
import { isAdminEmail } from '@/lib/admin';

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

    // Iterate users and their jobs subcollection
    const usersSnap = await admin.firestore().collection('users').get();
    const rows: any[] = [];
    for (const u of usersSnap.docs) {
      const udata = u.data() as any;
      const jobsSnap = await admin.firestore().collection('users').doc(u.id).collection('jobs').get();
      for (const j of jobsSnap.docs) {
        const jd = j.data() as any;
        rows.push({ userId: u.id, userName: udata.name || '', userEmail: udata.email || '', jobId: j.id, company: jd.company || '', role: jd.role || '', location: jd.location || '', status: jd.status || '', appliedAt: jd.appliedAt || '', source: jd.source || '', assignedBy: jd.assignedBy || '', visibleForPlan: jd.visibleForPlan || '' });
      }
    }
    return NextResponse.json({ ok: true, rows });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
