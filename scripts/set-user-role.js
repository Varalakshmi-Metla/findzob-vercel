// Utility to set a user's role in Firestore users/{uid} doc using Admin SDK
// Usage: node scripts/set-user-role.js <uid> <role>

const admin = require('firebase-admin');
const path = require('path');

const svcPath = path.join(__dirname, '..', 'serviceAccountKey.json');
try {
  const svc = require(svcPath);
  if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(svc) });
} catch (e) {
  console.error('Could not load serviceAccountKey.json from repo root. Make sure it exists.');
  process.exit(1);
}

const db = admin.firestore();

async function main() {
  const [,, uid, role] = process.argv;
  if (!uid || !role) {
    console.error('Usage: node scripts/set-user-role.js <uid> <role>');
    process.exit(1);
  }
  const ref = db.collection('users').doc(uid);
  try {
    await ref.set({ role, isEmployee: role === 'employee', updatedAt: new Date().toISOString() }, { merge: true });
    console.log(`Set role='${role}' for users/${uid}`);
    process.exit(0);
  } catch (err) {
    console.error('Failed to set role:', err);
    process.exit(2);
  }
}

main();
