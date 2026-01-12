/**
 * Seed roles for initial accounts.
 * Usage:
 *   - set FIREBASE_ADMIN_SVC (service account JSON or base64)
 *   - optionally set ADMIN_EMAIL and EMPLOYEE_EMAIL env vars
 *   - run with `ts-node scripts/seed-roles.ts` or compile and run with node
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
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@findzob.com';
  const employeeEmail = process.env.EMPLOYEE_EMAIL || 'employee1@findzob.com';

  console.log('Seeding roles for', { adminEmail, employeeEmail });

  // Find users by email
  let adminUser: admin.auth.UserRecord | null = null;
  let employeeUser: admin.auth.UserRecord | null = null;
  try {
    adminUser = await admin.auth().getUserByEmail(adminEmail);
    console.log('Found admin user', adminUser.uid, adminUser.email);
  } catch (e) {
    console.warn('Could not find admin user by email', adminEmail, (e as any)?.message || String(e));
  }
  try {
    employeeUser = await admin.auth().getUserByEmail(employeeEmail);
    console.log('Found employee user', employeeUser.uid, employeeUser.email);
  } catch (e) {
    console.warn('Could not find employee user by email', employeeEmail, (e as any)?.message || String(e));
  }

  const db = admin.firestore();

  if (adminUser) {
    const uid = adminUser.uid;
    await db.collection('users').doc(uid).set({ email: adminEmail, role: 'admin', updatedAt: new Date().toISOString() }, { merge: true });
    // set custom claims
    try { await admin.auth().setCustomUserClaims(uid, { admin: true, role: 'admin' }); } catch (e) { console.warn('Failed to set custom claims for admin', e); }
    console.log('Seeded admin role for', uid);
  } else {
    console.log('Skipping admin role seeding (user not found)');
  }

  if (employeeUser) {
    const uid = employeeUser.uid;
    await db.collection('users').doc(uid).set({ email: employeeEmail, role: 'employee', updatedAt: new Date().toISOString() }, { merge: true });
    // create employees collection entry
    await db.collection('employees').doc(uid).set({ email: employeeEmail, role: 'employee', createdAt: new Date().toISOString() }, { merge: true });
    // set custom claims
    try { await admin.auth().setCustomUserClaims(uid, { employee: true, role: 'employee' }); } catch (e) { console.warn('Failed to set custom claims for employee', e); }
    console.log('Seeded employee role for', uid);
  } else {
    console.log('Skipping employee role seeding (user not found)');
  }

  console.log('Seeding complete');
}

seed().catch(err => { console.error(err); process.exit(1); });
