import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import fs from 'fs';
import { isAdminEmail } from '@/lib/admin';

function tryInitAdmin() {
  try {
    if (admin.apps.length) return admin.app();
    let svc: string | undefined = undefined;
    if (process.env.FIREBASE_ADMIN_SVC_PATH) {
      try {
        svc = fs.readFileSync(process.env.FIREBASE_ADMIN_SVC_PATH, 'utf8');
      } catch (e) {
        return undefined;
      }
    } else if (process.env.FIREBASE_ADMIN_SVC) {
      svc = process.env.FIREBASE_ADMIN_SVC;
    }
    if (!svc) return undefined;
    let parsed: any = null;
    try {
      parsed = JSON.parse(svc);
    } catch (e1) {
      try {
        const decoded = Buffer.from(svc, 'base64').toString('utf8');
        parsed = JSON.parse(decoded);
      } catch (e2) {
        return undefined;
      }
    }
    admin.initializeApp({ credential: admin.credential.cert(parsed as any) });
    return admin.app();
  } catch (e) {
    return undefined;
  }
}

export const runtime = 'nodejs';

export async function GET(req: Request, ctx: any) {
  const params = ctx?.params as Record<string, string | undefined> | undefined;
  try {
    const resumeId = params?.resumeId || params?.resumeid || params?.resumeId?.toString();
    if (!resumeId) return NextResponse.json({ ok: false, error: 'Missing resumeId' }, { status: 400 });

    const adminApp = tryInitAdmin();
    if (!adminApp) return NextResponse.json({ ok: false, error: 'Admin SDK not initialized' }, { status: 500 });

    const authHeader = req.headers.get('authorization') || '';
    let token: string | null = null;
    if (authHeader.startsWith('Bearer ')) token = authHeader.split(' ')[1];

    let decoded: any = null;
    if (token) {
      decoded = await admin.auth().verifyIdToken(token) as any;
    } else {
      const cookieHeader = req.headers.get('cookie') || '';
      const match = cookieHeader.match(/(?:^|; )session=([^;]+)/);
      const sessionCookie = match ? match[1] : null;
      if (!sessionCookie) return NextResponse.json({ ok: false, error: 'Missing token or session cookie' }, { status: 401 });
      try {
        decoded = await admin.auth().verifySessionCookie(sessionCookie, true) as any;
      } catch (e) {
        return NextResponse.json({ ok: false, error: 'Invalid session cookie' }, { status: 401 });
      }
    }

    const uid = decoded?.uid;
    if (!uid) return NextResponse.json({ ok: false, error: 'Invalid token' }, { status: 401 });

    const userSnap = await admin.firestore().collection('users').doc(uid).get();
    const data = userSnap.exists ? (userSnap.data() as any) : {};
    const email = (data?.email || decoded?.email || '') as string;
    if (isAdminEmail(email?.toLowerCase())) {
      // admin allowed
    } else {
      const roleFromData = data?.role;
      const roleFromClaims = decoded?.role || (decoded?.employee ? 'employee' : undefined);
      const role = roleFromData || roleFromClaims || 'user';
      if (role !== 'employee') return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
    }

    const resumeSnap = await admin.firestore().collection('resumes').doc(resumeId).get();
    if (!resumeSnap.exists) return NextResponse.json({ ok: false, error: 'Resume not found' }, { status: 404 });
    const resume = resumeSnap.data() as any;
    const url = resume?.resumeURL;
    if (!url) return NextResponse.json({ ok: false, error: 'No resume URL' }, { status: 404 });

    return NextResponse.json({ ok: true, url });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
