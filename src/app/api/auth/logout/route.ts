import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import fs from 'fs';

function tryInitAdmin() {
  try {
    if (admin.apps.length) return admin.app();
    let svc: string | undefined = undefined;
    if (process.env.FIREBASE_ADMIN_SVC_PATH) {
      try {
        svc = fs.readFileSync(process.env.FIREBASE_ADMIN_SVC_PATH, 'utf8');
        if (process.env.NODE_ENV !== 'production') console.log('tryInitAdmin: using FIREBASE_ADMIN_SVC_PATH', process.env.FIREBASE_ADMIN_SVC_PATH);
      } catch (e) {
        if (process.env.NODE_ENV !== 'production') console.error('Failed to read FIREBASE_ADMIN_SVC_PATH', process.env.FIREBASE_ADMIN_SVC_PATH, (e as any)?.message || e);
        return undefined;
      }
    } else if (process.env.FIREBASE_ADMIN_SVC) {
      svc = process.env.FIREBASE_ADMIN_SVC;
      if (process.env.NODE_ENV !== 'production') console.log('tryInitAdmin: using FIREBASE_ADMIN_SVC env var');
    }
    if (!svc) return undefined;
    const parseAttempts: Array<{ name: string; value: string }> = [];
    parseAttempts.push({ name: 'raw', value: svc });
    const trimmedQuotes = svc.replace(/^\s*['"]|['"]\s*$/g, '');
    if (trimmedQuotes !== svc) parseAttempts.push({ name: 'trimmedQuotes', value: trimmedQuotes });
    const withNewlines = svc.replace(/\\n/g, '\n');
    if (withNewlines !== svc && withNewlines !== trimmedQuotes) parseAttempts.push({ name: 'withNewlines', value: withNewlines });
    try {
      const base64Decoded = Buffer.from(svc, 'base64').toString('utf8');
      if (base64Decoded && base64Decoded !== svc) parseAttempts.push({ name: 'base64', value: base64Decoded });
    } catch (e) {
      // ignore
    }

    const parseErrors: Record<string, string> = {};
    let parsed: any = null;
    for (const attempt of parseAttempts) {
      try {
        parsed = JSON.parse(attempt.value);
        if (process.env.NODE_ENV !== 'production') console.log(`tryInitAdmin: parsed service account using ${attempt.name}`);
        break;
      } catch (err: any) {
        parseErrors[attempt.name] = err?.message || String(err);
      }
    }
    if (!parsed) {
      if (process.env.NODE_ENV !== 'production') console.error('tryInitAdmin parse errors', parseErrors);
      return undefined;
    }
    admin.initializeApp({ credential: admin.credential.cert(parsed as any) });
    return admin.app();
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') console.error('Failed to init admin in logout route', (e as any)?.message || e);
    return undefined;
  }
}

export async function POST(req: Request) {
  try {
    // Attempt to revoke refresh tokens for server-side session if possible
    const adminApp = tryInitAdmin();
    // Try to read session cookie
    const cookieHeader = req.headers.get('cookie') || '';
    const match = cookieHeader.match(/(?:^|; )session=([^;]+)/);
    const sessionCookie = match ? match[1] : null;
    if (adminApp && sessionCookie) {
      try {
        const decoded = await admin.auth().verifySessionCookie(sessionCookie, true) as any;
        const uid = decoded?.uid;
        if (uid) {
          await admin.auth().revokeRefreshTokens(uid).catch(() => {});
        }
      } catch (e) {
        // ignore invalid session cookie
      }
    }

    // Clear the cookie
    const cookieOptions = [] as string[];
    cookieOptions.push(`session=; Path=/; HttpOnly; Max-Age=0`);
    if (process.env.NODE_ENV === 'production') cookieOptions.push('Secure');
    cookieOptions.push('SameSite=Strict');

    const headers = new Headers();
    headers.append('Set-Cookie', cookieOptions.join('; '));

    return new NextResponse(JSON.stringify({ ok: true }), { status: 200, headers });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
