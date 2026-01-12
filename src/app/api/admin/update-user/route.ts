import adminApp from '../../../../lib/firebase-admin';
import { isAdminEmail } from '@/lib/admin';
import { NextResponse } from 'next/server';
import { parse, isValid as isValidDate } from 'date-fns';
import { getFirestore } from 'firebase-admin/firestore';

const adminAuth = adminApp.auth();
const adminDb = getFirestore(adminApp);

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const match = authHeader.match(/^Bearer (.+)$/i);
    if (!match) return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 });
    const idToken = match[1];

    const decoded = await adminApp.auth().verifyIdToken(idToken);
    const callerUid = decoded?.uid;
    if (!callerUid) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const adminDoc = await adminApp.firestore().collection('admins').doc(callerUid).get();
    const callerEmail = decoded?.email?.toLowerCase();
    // Allow admin if caller has an admins doc or their email matches configured admin emails
    if (!adminDoc.exists && !isAdminEmail(callerEmail)) return NextResponse.json({ error: 'Forbidden - not an admin' }, { status: 403 });

    const body = await req.json();
    const { uid, name, email, role, phone, address, gender, dateOfBirth } = body as any;
    // Normalize incoming DOB (accept MM-DD-YYYY or ISO)
    let normalizedDOB: string | null = null;
    if (dateOfBirth) {
      if (typeof dateOfBirth === 'string') {
        try {
          const p = parse(dateOfBirth, 'MM-dd-yyyy', new Date());
          if (isValidDate(p)) normalizedDOB = p.toISOString();
        } catch (e) {}
        if (!normalizedDOB) {
          const dt = new Date(dateOfBirth);
          if (!isNaN(dt.getTime())) normalizedDOB = dt.toISOString();
        }
      } else if (dateOfBirth instanceof Date) {
        if (isValidDate(dateOfBirth)) normalizedDOB = dateOfBirth.toISOString();
      }
    }
    if (!uid) return NextResponse.json({ error: 'uid required' }, { status: 400 });

    // Update Auth email if provided and different
    try {
      if (email) {
        // fetch existing user to compare
        const existing = await adminAuth.getUser(uid);
        if (existing.email !== email) {
          await adminAuth.updateUser(uid, { email });
        }
      }
    } catch (e) {
      console.warn('Failed to update auth user email', e);
      return NextResponse.json({ error: 'Failed to update auth user email', detail: String(e) }, { status: 500 });
    }

    const userPatch: any = { updatedAt: new Date().toISOString() };
    if (name) userPatch.name = name;
    if (email) userPatch.email = email;
    if (role) userPatch.role = role;
    if (phone) userPatch.phone = phone;
    if (address) userPatch.address = address;
    if (gender) userPatch.gender = gender;
    if (normalizedDOB) userPatch.dateOfBirth = normalizedDOB;

    try {
      await adminDb.collection('users').doc(uid).set(userPatch, { merge: true });
      // If employee doc exists or role is employee, update employees collection
      const empDocRef = adminDb.collection('employees').doc(uid);
      const empExists = (await empDocRef.get()).exists;
      if (role === 'employee' || empExists) {
        const empPatch: any = { updatedAt: new Date().toISOString() };
        if (name) empPatch.name = name;
        if (email) empPatch.email = email;
        if (phone) empPatch.phone = phone;
        if (address) empPatch.address = address;
        if (gender) empPatch.gender = gender;
        if (normalizedDOB) empPatch.dateOfBirth = normalizedDOB;
        if (role) empPatch.role = role;
        await adminDb.collection('employees').doc(uid).set(empPatch, { merge: true });
      } else if (role !== 'employee' && empExists) {
        // role changed away from employee - remove employees doc
        try { await empDocRef.delete(); } catch (e) { console.warn('Failed to delete employee doc on demotion', e); }
      }
    } catch (e) {
      console.error('Failed to update firestore docs', e);
      return NextResponse.json({ error: 'Failed to update firestore docs', detail: String(e) }, { status: 500 });
    }

    // Audit log: if role changed, write a record and notify the user
    try {
      const beforeRole = (await adminDb.collection('users').doc(uid).get()).data()?.role || null;
      const afterRole = role || null;
      if (beforeRole !== afterRole) {
        const audit = {
          targetUid: uid,
          targetEmail: email || null,
          changedBy: callerUid,
          beforeRole,
          afterRole,
          timestamp: new Date().toISOString(),
        } as any;
        await adminDb.collection('userRoleChanges').add(audit);

        // Notify the affected user by email
        try {
          const resetHint = 'You may need to sign out and sign in again to pick up the new role.';
          const subject = 'Your account role has changed';
          const text = `Hi ${name || ''},\n\nYour account role has been changed from ${beforeRole || 'none'} to ${afterRole || 'none'} by an administrator. ${resetHint}\n\nIf you did not expect this change, please contact support.`;
          // If sendEmail is available in this module scope, use it; otherwise import lazily
          try {
            const { sendEmail } = await import('@/lib/sendEmail');
            await sendEmail({ to: email, subject, type: 'role_changed', templateData: { beforeRole, afterRole, resetHint }, text });
          } catch (e) {
            console.warn('Failed to send role change email', e);
          }
        } catch (e) {
          console.warn('Failed to notify user of role change', e);
        }
      }
    } catch (e) {
      console.warn('Failed to write audit log or notify user', e);
    }

    // Set Auth custom claims to reflect role changes (employee/admin flags and role field)
    try {
      const claims: any = {};
      if (role === 'employee') {
        claims.employee = true;
        claims.role = 'employee';
      } else if (role === 'admin') {
        claims.admin = true;
        claims.role = 'admin';
      } else {
        // jobseeker / user
        claims.employee = false;
        claims.admin = false;
        claims.role = role || 'user';
      }
      // clean up falsy claims by only writing explicit booleans
      await adminAuth.setCustomUserClaims(uid, claims);
    } catch (e) {
      console.warn('Failed to set custom claims for user', uid, e);
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('admin/update-user error', err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
