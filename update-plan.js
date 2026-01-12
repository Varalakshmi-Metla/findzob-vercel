
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

try {
  if (!admin.apps.length) {
    let serviceAccountString = undefined;

    if (process.env.FIREBASE_ADMIN_SVC_PATH) {
      try {
        const serviceAccountPath = path.resolve(process.cwd(), process.env.FIREBASE_ADMIN_SVC_PATH);
        serviceAccountString = fs.readFileSync(serviceAccountPath, 'utf8');
      } catch (e) {
        console.error('Failed to read FIREBASE_ADMIN_SVC_PATH', e);
      }
    } else if (process.env.FIREBASE_ADMIN_SVC) {
      serviceAccountString = process.env.FIREBASE_ADMIN_SVC;
    }

    if (serviceAccountString) {
      let serviceAccount;
      try {
          serviceAccount = JSON.parse(serviceAccountString);
      } catch(e) {
          try {
              serviceAccount = JSON.parse(Buffer.from(serviceAccountString, 'base64').toString('utf-8'));
          } catch (e2) {
              console.error("Could not parse service account from string (JSON or base64)", e2);
          }
      }

      if (serviceAccount) {
          try {
              admin.initializeApp({
                  credential: admin.credential.cert(serviceAccount),
              });
          } catch (e) {
              console.error('Firebase admin initialization error:', e);
          }
      }
    } else {
      try {
          admin.initializeApp();
      } catch(e) {
          console.warn("Could not initialize firebase-admin with Application Default Credentials. Some features may not work.", e);
      }
    }
  }

  const db = admin.firestore();
  const planId = 'starter';
  const planData = {
      name: 'Starter Onboarding',
      description: 'Essential setup to get started',
      price: '$25 min',
      priceNumeric: 25,
      features: [
          'Personal onboarding with Z',
          'Resume intake & profile setup',
          'Expert profile review',
          'Fast, secure data handling'
      ],
      note: 'Required',
      position: 0,
      popular: false
  };

  db.collection('plans').doc(planId).set(planData, { merge: true })
    .then(() => {
        console.log('Plan updated successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Error updating plan:', error);
        process.exit(1);
    });
} catch (e) {
    console.error('An error occurred:', e);
    process.exit(1);
}
