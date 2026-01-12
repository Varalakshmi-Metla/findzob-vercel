import { NextResponse } from 'next/server';
import { verifyBearerAndRole } from '@/lib/employee-auth';
import { generateAndEmailResume } from '@/app/actions/resume-actions';

export async function POST(req: Request) {
  try {
  // allow admins to trigger resume generation / create scouted jobs
  const caller = await verifyBearerAndRole(req, ['employee', 'admin']);
    const body = await req.json();
    const { uid, resume, profile } = body as any;
    if (!uid || !resume) return NextResponse.json({ error: 'uid and resume required' }, { status: 400 });

    // Permission check: if caller is not an admin, ensure the target user's plan allows resume generation
    if (!(caller.role === 'admin')) {
      try {
        const mod = await import('firebase-admin');
        const admin = mod.default || mod;
        if (!admin.apps.length) {
          const svc = process.env.FIREBASE_ADMIN_SVC;
          if (svc) {
            let parsed: any = null;
            try { parsed = JSON.parse(svc); } catch (e) { parsed = Buffer.from(svc, 'base64').toString('utf8'); parsed = JSON.parse(parsed); }
            admin.initializeApp({ credential: admin.credential.cert(parsed as any) });
          } else {
            // if admin SDK not available, allow generation to avoid breaking dev flows
            // but log a warning
            // eslint-disable-next-line no-console
            console.warn('generate-resume: firebase-admin not configured; skipping plan permission check');
          }
        }
        if (admin.apps.length) {
          const db = admin.firestore();
          const userSnap = await db.collection('users').doc(uid).get();
          const user = userSnap.exists ? (userSnap.data() as any) : null;
          const planTypeRaw = user?.planType || (user?.subscription?.plan || 'free');
          const planId = String(planTypeRaw).toLowerCase();
          const planDoc = await db.collection('plans').doc(planId).get();
          const planData = planDoc.exists ? (planDoc.data() as any) : null;
          const allowResume = planData?.permissions?.allowResume;
          if (allowResume === false) {
            return NextResponse.json({ ok: false, error: 'Plan does not allow resume generation' }, { status: 403 });
          }
        }
      } catch (e) {
        // Non-fatal: continue but log
        // eslint-disable-next-line no-console
        console.warn('generate-resume: failed to validate plan permissions', e);
      }
    }

    const fakeUser = { uid, email: profile?.email || '', displayName: profile?.name || '' } as any;
    const result = await generateAndEmailResume(resume, fakeUser, profile || null);
    if (!result.ok) return NextResponse.json({ error: result.error || 'generation failed' }, { status: 500 });
    
  // After successful resume generation, create simple scouted job entries
    // under users/{uid}/jobs so employees can track/manage them. This is a
    // lightweight auto-scout: create one job per provided role or from profile
    // jobPreferences if present.
  try {
      const admin = await (async () => {
        try {
          const mod = await import('firebase-admin');
          return mod.default || mod;
        } catch (e) {
          // fallback to require
          // @ts-ignore
          return require('firebase-admin');
        }
      })();
      if (!admin.apps.length) {
        const svc = process.env.FIREBASE_ADMIN_SVC;
        if (svc) {
          let parsed: any = null;
          try { parsed = JSON.parse(svc); } catch (e) { parsed = Buffer.from(svc, 'base64').toString('utf8'); parsed = JSON.parse(parsed); }
          admin.initializeApp({ credential: admin.credential.cert(parsed as any) });
        }
      }

      const db = admin.firestore();
      const rolesToCreate: string[] = [];
      if (resume?.role) rolesToCreate.push(resume.role);
      // profile.jobPreferences may contain desiredRoles as comma-separated strings
      if (profile?.jobPreferences && Array.isArray(profile.jobPreferences)) {
        for (const p of profile.jobPreferences) {
          if (p?.desiredRoles) rolesToCreate.push(...String(p.desiredRoles).split(',').map((s: string) => s.trim()).filter(Boolean));
        }
      }
      // Default fallback role
      if (rolesToCreate.length === 0) rolesToCreate.push(resume?.title || resume?.role || (profile?.headline || 'Scouted Role'));

      // Removed auto-creation of scouted job entries after resume generation. Applications must be added manually by employee.
      // If this generation was triggered from a pendingProfiles entry, delete the pending request
      try {
        const pendingId = profile?.id || profile?._id || null;
        if (pendingId) {
          const pendingRef = db.collection('pendingProfiles').doc(String(pendingId));
          try {
            // Save resume metadata on the pendingProfiles doc for traceability (generate-only: no URL)
            try {
              await pendingRef.set({
                status: 'completed',
                resumeURL: null,
                resumeId: null,
                generatedBy: caller.uid || null,
                generatedAt: new Date().toISOString(),
                generatedOnly: true,
              } as any, { merge: true });
            } catch (e) {
              // non-fatal: continue to deletion attempt
              console.warn('failed to write resume metadata to pendingProfiles', e);
            }
            await pendingRef.delete();
          } catch (e) {
            // if delete fails, fall back to marking as approved for traceability
            await pendingRef.set({ status: 'approved', approvedAt: new Date().toISOString(), approvedBy: caller.uid }, { merge: true });
          }
        }

        // assign the user document to this employee so future views filter by assigned users
        const userRef = db.collection('users').doc(uid);
        await userRef.set({ assignedEmployee: caller.uid || null, assignedEmployeeAt: new Date().toISOString() }, { merge: true });

        // optional: add a notification to the user that they were assigned and resume generated
        try {
          await db.collection('notifications').add({ userId: uid, type: 'resume_approved', createdAt: new Date().toISOString(), meta: { by: caller.uid } });
        } catch (e) {
          // non-fatal
          console.warn('failed to create notification for approval', e);
        }
      } catch (e) {
        console.warn('post-generate assignment/approval step failed', e);
      }
      // Record per-employee resume generation event and increment summary counter
      try {
        if (caller && caller.uid) {
          const statsRef = db.collection('employeeStats').doc(String(caller.uid)).collection('resumeEvents');
          await statsRef.add({
            userId: uid,
            generatedAt: new Date().toISOString(),
            source: 'employee_api',
            pendingProfileId: profile?.id || profile?._id || null,
            resumeURL: null,
            resumeId: null,
            generatedOnly: true,
            generatedBy: caller.uid || null,
          });
          // maintain a small summary doc for quick counts
          try {
            await db.collection('employeeStatsSummary').doc(String(caller.uid)).set({ resumeGeneratedCount: admin.firestore.FieldValue.increment(1) }, { merge: true });
          } catch (e) {
            // non-fatal
            console.warn('failed to increment employee summary counter', e);
          }
        }
      } catch (e) {
        console.warn('failed to record employee resume generation stat', e);
      }
    } catch (e) {
      // Non-fatal: resume generation succeeded; log the error server-side.
      // Employee manage UI will still work with existing jobs.
      // eslint-disable-next-line no-console
      console.error('Failed to create scouted job entries:', e);
    }
    
    return NextResponse.json({ ok: true, data: result.uploadResult });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 401 });
  }
}
