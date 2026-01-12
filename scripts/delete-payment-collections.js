// Script to delete Firestore collections: orders, plans, payments, invoices
// and remove 'subscription' field from all users
// Usage: node scripts/delete-payment-collections.js

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function deleteCollection(collectionName, batchSize = 500) {
  const collectionRef = db.collection(collectionName);
  const query = collectionRef.limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(db, query, resolve, reject);
  });
}

async function deleteQueryBatch(db, query, resolve, reject) {
  try {
    const snapshot = await query.get();
    const batchSize = snapshot.size;
    if (batchSize === 0) {
      resolve();
      return;
    }
    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    process.nextTick(() => {
      deleteQueryBatch(db, query, resolve, reject);
    });
  } catch (err) {
    reject(err);
  }
}

async function removeSubscriptionFieldFromUsers() {
  const usersRef = db.collection('users');
  const snapshot = await usersRef.get();
  const batch = db.batch();
  snapshot.docs.forEach(doc => {
    batch.update(doc.ref, { subscription: admin.firestore.FieldValue.delete() });
  });
  await batch.commit();
  console.log('Removed subscription field from all users.');
}

(async () => {
  for (const col of ['orders', 'plans', 'payments', 'invoices']) {
    console.log(`Deleting collection: ${col}`);
    await deleteCollection(col);
    console.log(`Deleted collection: ${col}`);
  }
  await removeSubscriptionFieldFromUsers();
  console.log('Done.');
  process.exit(0);
})();
