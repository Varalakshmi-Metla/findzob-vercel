// app/api/auth/session/route.ts
import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import fs from 'fs';

function initAdmin() {
  if (admin.apps.length) return admin.app();

  // Try loading from FIREBASE_ADMIN_SVC_PATH (JSON file)
  let serviceAccount: Record<string, any> | undefined;

  if (process.env.FIREBASE_ADMIN_SVC_PATH) {
    try {
      const file = fs.readFileSync(process.env.FIREBASE_ADMIN_SVC_PATH, 'utf8');
      serviceAccount = JSON.parse(file);
      console.log('✅ Loaded Firebase Admin service account from file');
    } catch (e) {
      console.error('❌ Failed to read FIREBASE_ADMIN_SVC_PATH:', e);
    }
  }

  // Try loading from FIREBASE_ADMIN_SVC (base64, raw, or escaped string)
  if (!serviceAccount && process.env.FIREBASE_ADMIN_SVC) {
    try {
      const raw = process.env.FIREBASE_ADMIN_SVC;
      let decoded = raw;

      // Try base64 decode
      try {
        const base64Decoded = Buffer.from(raw, 'base64').toString('utf8');
        if (base64Decoded.includes('"private_key"')) decoded = base64Decoded;
      } catch {
        // ignore
      }

      // Try escaped newline handling
      decoded = decoded.replace(/\\n/g, '\n');
      serviceAccount = JSON.parse(decoded);
      console.log('✅ Loaded Firebase Admin service account from FIREBASE_ADMIN_SVC');
    } catch (e) {
      console.error('❌ Failed to parse FIREBASE_ADMIN_SVC:', e);
    }
  }

  // Fallback: use individual vars
  if (!serviceAccount && process.env.FIREBASE_PROJECT_ID) {
    serviceAccount = {
      project_id: process.env.FIREBASE_PROJECT_ID,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };
    console.log('✅ Loaded Firebase Admin credentials from individual env vars');
  }

  if (!serviceAccount) {
    console.error('❌ No Firebase Admin credentials found');
    return undefined;
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  });

  return admin.app();
}

export async function POST(req: Request) {
  try {
    const { idToken } = await req.json();

    if (!idToken) {
      return NextResponse.json({ ok: false, error: 'Missing idToken' }, { status: 400 });
    }

    const adminApp = initAdmin();
    if (!adminApp) {
      return NextResponse.json({ ok: false, error: 'Admin SDK not initialized' }, { status: 500 });
    }

    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
    const sessionCookie = await admin.auth().createSessionCookie(idToken, { expiresIn });

    const headers = new Headers();
    headers.append(
      'Set-Cookie',
      [
        `session=${sessionCookie}`,
        'Path=/',
        'HttpOnly',
        'SameSite=Strict',
        process.env.NODE_ENV === 'production' ? 'Secure' : '',
        `Max-Age=${Math.floor(expiresIn / 1000)}`,
      ]
        .filter(Boolean)
        .join('; '),
    );

    return new NextResponse(JSON.stringify({ ok: true }), { status: 200, headers });
  } catch (e: any) {
    console.error('❌ Error creating session cookie:', e);
    return NextResponse.json({ ok: false, error: e.message || String(e) }, { status: 500 });
  }
}
