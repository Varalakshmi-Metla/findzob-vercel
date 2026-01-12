import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import fs from 'fs';

function tryInitAdmin() {
  try {
    if (admin.apps.length) return admin.app();

    let svc: string | undefined;
    if (process.env.FIREBASE_ADMIN_SVC_PATH) {
      try {
        svc = fs.readFileSync(process.env.FIREBASE_ADMIN_SVC_PATH, 'utf8');
        if (process.env.NODE_ENV !== 'production')
          console.log('tryInitAdmin: using FIREBASE_ADMIN_SVC_PATH');
      } catch (e) {
        console.error('Failed to read FIREBASE_ADMIN_SVC_PATH', e);
        return undefined;
      }
    } else if (process.env.FIREBASE_ADMIN_SVC) {
      svc = process.env.FIREBASE_ADMIN_SVC;
      if (process.env.NODE_ENV !== 'production')
        console.log('tryInitAdmin: using FIREBASE_ADMIN_SVC env var');
    }

    if (!svc) return undefined;

    // Try multiple parse methods (raw, newline-fixed, base64)
    const attempts: string[] = [svc, svc.replace(/\\n/g, '\n')];
    try {
      const decoded = Buffer.from(svc, 'base64').toString('utf8');
      if (decoded && decoded !== svc) attempts.push(decoded);
    } catch (_) {}

    let parsed: any = null;
    for (const val of attempts) {
      try {
        parsed = JSON.parse(val);
        break;
      } catch (_) {}
    }

    if (!parsed) return undefined;

    admin.initializeApp({
      credential: admin.credential.cert(parsed),
    });

    return admin.app();
  } catch (e) {
    console.error('Failed to init admin SDK:', e);
    return undefined;
  }
}

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    let token: string | null = null;

    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    const adminApp = tryInitAdmin();
    if (!adminApp) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Admin SDK not initialized. Check FIREBASE_ADMIN_SVC env var.',
        },
        { status: 500 }
      );
    }

    let decoded: any = null;

    if (token) {
      decoded = await admin.auth().verifyIdToken(token);
    } else {
      // Try session cookie fallback
      const cookieHeader = req.headers.get('cookie') || '';
      const match = cookieHeader.match(/(?:^|; )session=([^;]+)/);
      const sessionCookie = match ? match[1] : null;

      if (!sessionCookie)
        return NextResponse.json(
          { ok: false, error: 'Missing token or session cookie' },
          { status: 401 }
        );

      try {
        decoded = await admin.auth().verifySessionCookie(sessionCookie, true);
      } catch (e) {
        return NextResponse.json(
          { ok: false, error: 'Invalid session cookie' },
          { status: 401 }
        );
      }
    }

    if (!decoded?.uid) {
      return NextResponse.json(
        { ok: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    // ✅ Only return basic verified info
    return NextResponse.json({
      ok: true,
      uid: decoded.uid,
      email: decoded.email || null,
      decoded,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    );
  }
}
