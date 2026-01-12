const admin = require('firebase-admin');
const fs = require('fs');

async function main() {
  try {
    const svcPath = process.env.FIREBASE_ADMIN_SVC_PATH || './serviceAccountKey.json';
    let svcRaw = null;
    if (fs.existsSync(svcPath)) {
      svcRaw = fs.readFileSync(svcPath, 'utf8');
      console.log('Using service account file at', svcPath);
    } else if (process.env.FIREBASE_ADMIN_SVC) {
      svcRaw = process.env.FIREBASE_ADMIN_SVC;
      console.log('Using service account from FIREBASE_ADMIN_SVC env var');
    } else {
      console.error('No service account found. Set FIREBASE_ADMIN_SVC_PATH or FIREBASE_ADMIN_SVC.');
      process.exit(2);
    }

    // Try parsing common formats
    let parsed = null;
    const attempts = [svcRaw, svcRaw.replace(/^\s*['"]|['"]\s*$/g, ''), svcRaw.replace(/\\n/g, '\n')];
    for (const a of attempts) {
      try {
        parsed = JSON.parse(a);
        break;
      } catch (e) {
        // continue
      }
    }

    if (!parsed) {
      // try base64
      try {
        const decoded = Buffer.from(svcRaw, 'base64').toString('utf8');
        parsed = JSON.parse(decoded);
      } catch (e) {
        console.error('Failed to parse service account JSON:', e.message || e);
        process.exit(3);
      }
    }

    try {
      admin.initializeApp({ credential: admin.credential.cert(parsed) });
    } catch (e) {
      console.error('admin.initializeApp error:', e && e.message ? e.message : e);
      process.exit(4);
    }

    try {
      console.log('Calling admin.auth().listUsers(1)...');
      const list = await admin.auth().listUsers(1);
      console.log('listUsers ok, userCount:', list.users.length);
      process.exit(0);
    } catch (e) {
      console.error('auth API error:', e && e.message ? e.message : e);
      process.exit(5);
    }
  } catch (e) {
    console.error('Unexpected error', e);
    process.exit(1);
  }
}

main();
