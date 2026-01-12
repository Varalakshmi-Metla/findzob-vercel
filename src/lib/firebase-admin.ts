
import admin from 'firebase-admin';

let cachedApp: admin.app.App | null = null;

function getFirebaseAdminApp() {
    if (cachedApp) return cachedApp;

    if (admin.apps.length === 0) {
        try {
            const projectId = process.env.FIREBASE_PROJECT_ID;
            const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
            let privateKey = process.env.FIREBASE_PRIVATE_KEY;

            if (!projectId || !clientEmail || !privateKey) {
                throw new Error('Missing Firebase admin environment variables');
            }

            // Handle private keys provided with literal \n characters
            if (privateKey.includes('\\n')) {
                privateKey = privateKey.replace(/\\n/g, '\n');
            }

            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId,
                    clientEmail,
                    privateKey,
                }),
            });
            console.log('Firebase Admin SDK initialized successfully.');
        } catch (e: any) {
            console.error('Firebase admin initialization error:', e?.stack || e?.message);
            throw new Error('Firebase admin initialization error');
        }
    }

    cachedApp = admin.app();
    return cachedApp;
}

export const adminApp = getFirebaseAdminApp();
export default adminApp;
