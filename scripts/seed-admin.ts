/**
 * Seed script to create an admin entry in Firestore under 'admins/{uid}'.
 * Usage: set FIREBASE_ADMIN_SVC env to service account JSON (or base64) and run with ts-node or node after transpile.
 */
import admin from 'firebase-admin';

function initAdmin() {
  if (admin.apps.length) return admin.app();
  const svc = process.env.FIREBASE_ADMIN_SVC;
  if (!svc) throw new Error('Set FIREBASE_ADMIN_SVC env with service account JSON or base64');
  const key = svc.trim().startsWith('{') ? svc : Buffer.from(svc, 'base64').toString('utf8');
  const parsed = JSON.parse(key);
  admin.initializeApp({ credential: admin.credential.cert(parsed as any) });
  return admin.app();
}

async function seed() {
  const app = initAdmin();
  const uid = process.env.SEED_ADMIN_UID;
  const email = process.env.SEED_ADMIN_EMAIL;
  if (!uid || !email) throw new Error('Set SEED_ADMIN_UID and SEED_ADMIN_EMAIL env vars');
  await admin.firestore().collection('admins').doc(uid).set({ email, createdAt: new Date().toISOString() });
  console.log('Seeded admin', uid, email);
}

seed().catch(err => { console.error(err); process.exit(1); });
