import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

function tryInitAdmin() {
  try {
    if (admin.apps.length) return admin.app();

    let svc = process.env.FIREBASE_ADMIN_SVC;
    if (process.env.FIREBASE_ADMIN_SVC_PATH) {
      try {
        const p = process.env.FIREBASE_ADMIN_SVC_PATH;
        svc = fs.readFileSync(p, 'utf8');
        if (process.env.NODE_ENV !== 'production') console.log('tryInitAdmin: using FIREBASE_ADMIN_SVC_PATH', p);
      } catch (e) {
        console.error('Failed to read FIREBASE_ADMIN_SVC_PATH', process.env.FIREBASE_ADMIN_SVC_PATH, (e as any)?.message || e);
      }
    }

    if (!svc) return undefined;

    const normalize = (s: string) => s.replace(/^\uFEFF|^\uFFFE|^\u0000+/, '').trim();

    // If svc looks like a path, try to read it
    try {
      if (svc && (svc.endsWith('.json') || svc.includes(path.sep) || svc.includes('\\') || svc.includes('/'))) {
        if (fs.existsSync(svc)) {
          svc = fs.readFileSync(svc, 'utf8');
          if (process.env.NODE_ENV !== 'production') console.log('tryInitAdmin: read service account from path', svc);
        }
      }
    } catch (e) {
      // ignore
    }

    svc = normalize(svc as string);

    const parseAttempts: Array<{ name: string; value: string }> = [];
    parseAttempts.push({ name: 'raw', value: svc as string });
    const trimmedQuotes = (svc as string).replace(/^\s*['"]|['"]\s*$/g, '');
    if (trimmedQuotes !== svc) parseAttempts.push({ name: 'trimmedQuotes', value: trimmedQuotes });
    const withNewlines = (svc as string).replace(/\\n/g, '\n');
    if (withNewlines !== svc && withNewlines !== trimmedQuotes) parseAttempts.push({ name: 'withNewlines', value: withNewlines });
    try {
      const base64Decoded = Buffer.from(svc as string, 'base64').toString('utf8');
      if (base64Decoded && base64Decoded !== svc) parseAttempts.push({ name: 'base64', value: base64Decoded });
    } catch (e) {
      // ignore
    }

    const parseErrors: Record<string, string> = {};
    let parsed: any = null;
    for (const attempt of parseAttempts) {
      try {
        parsed = JSON.parse(normalize(attempt.value));
        if (process.env.NODE_ENV !== 'production') console.log(`tryInitAdmin: parsed service account using ${attempt.name}`);
        break;
      } catch (err: any) {
        parseErrors[attempt.name] = err?.message || String(err);
      }
    }
    if (!parsed) {
      if (process.env.NODE_ENV !== 'production') console.error('employee-auth: failed to parse FIREBASE_ADMIN_SVC', parseErrors);
      return undefined;
    }

    admin.initializeApp({ credential: admin.credential.cert(parsed as any) });
    return admin.app();
  } catch (e) {
    console.error('Failed to init admin in employee-auth', e);
    return undefined;
  }
}

export async function verifyBearerAndRole(req: Request, allowedRoles: string[] = ['employee']) {
  const adminApp = tryInitAdmin();
  if (!adminApp) throw new Error('Admin SDK not initialized');

  const authHeader = req.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) throw new Error('Missing Bearer token');
  const token = authHeader.split(' ')[1];

  try {
    const decoded = await admin.auth().verifyIdToken(token) as any;
    const uid = decoded?.uid;
    if (!uid) throw new Error('Invalid token');

    // Read authoritative role from users/{uid}
    const userDoc = await admin.firestore().collection('users').doc(uid).get();
    if (!userDoc.exists) throw new Error('User record not found');
    const data = userDoc.data() as any;
    const role = data?.role || decoded?.role || (decoded?.employee ? 'employee' : 'user');
    const isAllowed = allowedRoles.includes(role) || (role === 'employee' && allowedRoles.includes('employee'));
    if (!isAllowed) throw new Error('Forbidden - insufficient role');
    return { uid, role, claims: decoded };
  } catch (e: any) {
    throw new Error('Invalid token or insufficient role: ' + (e?.message || String(e)));
  }
}
