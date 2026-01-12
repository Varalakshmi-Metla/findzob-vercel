import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import fs from 'fs';
import { isAdminEmail } from '@/lib/admin';

function tryInitAdmin() {
  try {
    if (admin.apps.length) return admin.app();
    let svc: string | undefined = undefined;
    if (process.env.FIREBASE_ADMIN_SVC_PATH) svc = fs.readFileSync(process.env.FIREBASE_ADMIN_SVC_PATH, 'utf8');
    else if (process.env.FIREBASE_ADMIN_SVC) svc = process.env.FIREBASE_ADMIN_SVC;
    if (!svc) return undefined;
    let parsed: any = null;
    try { parsed = JSON.parse(svc); } catch (e1) { parsed = JSON.parse(Buffer.from(svc, 'base64').toString('utf8')); }
    admin.initializeApp({ credential: admin.credential.cert(parsed as any) });
    return admin.app();
  } catch (e) {
    console.error('init admin failed', e);
    return undefined;
  }
}

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const adminApp = tryInitAdmin();
    if (!adminApp) return NextResponse.json({ ok: false, error: 'Admin SDK not initialized' }, { status: 500 });

    const cookie = req.headers.get('cookie') || '';
    const match = cookie.match(/(?:^|; )session=([^;]+)/);
    const sessionCookie = match ? match[1] : null;
    let decoded: any = null;
    if (!sessionCookie) return NextResponse.json({ ok: false, error: 'Missing session cookie' }, { status: 401 });
    try { decoded = await admin.auth().verifySessionCookie(sessionCookie, true) as any; } catch (e) { return NextResponse.json({ ok: false, error: 'Invalid session cookie' }, { status: 401 }); }
    const email = decoded?.email || '';
    if (!isAdminEmail(String(email).toLowerCase())) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => null);
    if (!body || !Array.isArray(body.rows)) return NextResponse.json({ ok: false, error: 'Invalid payload' }, { status: 400 });

    // rows should contain: userId, company, role, location, status, appliedAt, source, assignedBy, visibleForPlan
    const batch = admin.firestore().batch();
    for (const r of body.rows) {
      const uid = r.userId || (r.userEmail ? r.userEmail.split('@')[0] : undefined);
      if (!uid) continue;
      const jobId = r.jobId || undefined;
      const docRef = jobId ? admin.firestore().collection('users').doc(uid).collection('jobs').doc(jobId) : admin.firestore().collection('users').doc(uid).collection('jobs').doc();
      const payload: any = { company: r.company || '', role: r.role || '', location: r.location || '', status: r.status || 'Applied', appliedAt: r.appliedAt || new Date().toISOString(), source: r.source || 'admin', assignedBy: r.assignedBy || '', visibleForPlan: r.visibleForPlan || '' };
      batch.set(docRef, payload, { merge: true });
    }
    await batch.commit();
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
