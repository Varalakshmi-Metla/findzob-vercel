const admin = require('firebase-admin');
const fs = require('fs');

async function run() {
  try {
    const raw = fs.readFileSync('./serviceAccountKey.json', 'utf8');
    const svc = JSON.parse(raw);
    admin.initializeApp({ credential: admin.credential.cert(svc) });
    console.log('Initialized admin from serviceAccountKey.json');
  } catch (e) {
    console.error('Failed to initialize admin from file:', e);
    process.exit(1);
  }

  try {
    console.log('Calling admin.auth().listUsers(1) to validate credentials...');
    const res = await admin.auth().listUsers(1);
    console.log('listUsers succeeded, user count:', res.users.length);
    process.exit(0);
  } catch (err) {
    console.error('Admin SDK call failed:', err);
    process.exit(2);
  }
}

run();
