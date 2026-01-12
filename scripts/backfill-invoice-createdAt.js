// Script to backfill missing createdAt fields in Firestore invoices
// Usage: Run with Node.js after setting GOOGLE_APPLICATION_CREDENTIALS to your service account JSON

const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');

// Update this path to your service account JSON if needed
const serviceAccount = require(path.resolve(__dirname, '../../serviceAccountKey.json'));

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

async function backfillCreatedAt() {
  const snapshot = await db.collection('invoices').get();
  let updated = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (!data.createdAt) {
      // Use server timestamp or fallback to now
      await doc.ref.update({ createdAt: new Date() });
      updated++;
      console.log(`Updated invoice ${doc.id}`);
    }
  }
  console.log(`Backfill complete. Updated ${updated} invoices.`);
}

backfillCreatedAt().catch(console.error);
