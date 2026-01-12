import { NextResponse } from 'next/server';
import { verifyBearerAndRole } from '@/lib/employee-auth';
import admin from 'firebase-admin';

export async function POST(req: Request) {
  try {
    const caller = await verifyBearerAndRole(req, ['employee', 'admin']);
    const body = await req.json();
    const { id, reason } = body as any;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    // admin SDK should be initialized by verifyBearerAndRole; ensure available
    if (!admin.apps.length) {
      // best-effort: try to initialize from env
      try {
        const svc = process.env.FIREBASE_ADMIN_SVC;
        if (svc) {
          let parsed: any = null;
          try { parsed = JSON.parse(svc); } catch (e) { parsed = JSON.parse(Buffer.from(svc, 'base64').toString('utf8')); }
          admin.initializeApp({ credential: admin.credential.cert(parsed as any) });
        }
      } catch (e) {
        // ignore — we'll still attempt to operate and let admin throw a clear error
      }
    }

    const ref = admin.firestore().collection('pendingProfiles').doc(String(id));
    await ref.set({ status: 'rejected', rejectedAt: new Date().toISOString(), rejectedBy: caller.uid, rejectedReason: reason || null }, { merge: true });

    // optional: create a simple notification entry for the user
    try {
      const snap = await admin.firestore().collection('pendingProfiles').doc(String(id)).get();
      const data = snap.exists ? (snap.data() as any) : {};
      const uid = data?.userId || null;
      if (uid) {
        await admin.firestore().collection('notifications').add({ userId: uid, type: 'resume_rejected', createdAt: new Date().toISOString(), meta: { pendingId: id, reason: reason || null, by: caller.uid } });
      }
    } catch (e) {
      // non-fatal
      console.warn('Failed to write notification for rejection', e);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
