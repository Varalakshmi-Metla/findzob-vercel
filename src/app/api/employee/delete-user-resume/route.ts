import { NextResponse } from 'next/server';
import { verifyBearerAndRole } from '@/lib/employee-auth';
import admin from 'firebase-admin';

export async function POST(req: Request) {
  try {
    const caller = await verifyBearerAndRole(req, ['employee', 'admin']);
    const body = await req.json();
    const { uid, resumeId, deleteAll } = body as any;
    if (!uid) return NextResponse.json({ error: 'uid required' }, { status: 400 });

    if (!admin.apps.length) {
      try {
        const svc = process.env.FIREBASE_ADMIN_SVC;
        if (svc) {
          let parsed: any = null;
          try { parsed = JSON.parse(svc); } catch (e) { parsed = JSON.parse(Buffer.from(svc, 'base64').toString('utf8')); }
          admin.initializeApp({ credential: admin.credential.cert(parsed as any) });
        }
      } catch (e) {
        // continue and let admin methods throw
      }
    }

    const db = admin.firestore();
    const deletions: Promise<any>[] = [];

    if (resumeId) {
      // Delete specific top-level resume doc
      deletions.push(db.collection('resumes').doc(String(resumeId)).delete());
      // Attempt to remove matching docs in users/{uid}/resumes where resumeURL matches
      try {
        const rSnap = await db.collection('resumes').doc(String(resumeId)).get();
        const rData = rSnap.exists ? (rSnap.data() as any) : null;
        const url = rData?.resumeURL;
        if (url) {
          const coll = await db.collection('users').doc(uid).collection('resumes').get();
          coll.forEach((d) => {
            const dd = d.data() as any;
            if (dd?.resumeURL === url) deletions.push(db.collection('users').doc(uid).collection('resumes').doc(d.id).delete());
          });
        }
      } catch (e) {
        // ignore
      }
    }

    if (deleteAll) {
      // Delete all top-level resumes for user
      const snap = await db.collection('resumes').where('userId', '==', uid).get();
      snap.forEach((d) => deletions.push(db.collection('resumes').doc(d.id).delete()));
      // Delete subcollection docs
      const sub = await db.collection('users').doc(uid).collection('resumes').get();
      sub.forEach((d) => deletions.push(db.collection('users').doc(uid).collection('resumes').doc(d.id).delete()));
      // Clear user's resumeURL field
      deletions.push(db.collection('users').doc(uid).set({ resumeURL: null, updatedAt: new Date().toISOString() }, { merge: true }));
    }

    // If nothing requested, return error
    if (!resumeId && !deleteAll) return NextResponse.json({ error: 'resumeId or deleteAll required' }, { status: 400 });

    await Promise.all(deletions);

    // Optionally log audit
    try {
      await db.collection('audits').add({ action: 'delete_user_resume', performedBy: caller.uid, targetUser: uid, resumeId: resumeId || null, deleteAll: !!deleteAll, createdAt: new Date().toISOString() });
    } catch (e) { /* ignore */ }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
