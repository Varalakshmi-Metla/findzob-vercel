
import { NextResponse } from 'next/server';
import admin from '@/lib/firebase-admin'; // Using shared admin instance
import sendEmail from '@/lib/sendEmail';
import { parse, isValid as isValidDate } from 'date-fns';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const match = authHeader.match(/^Bearer (.+)$/i);
    if (!match) return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 });
    const idToken = match[1];

    const decoded = await admin.auth().verifyIdToken(idToken);
    const callerUid = decoded?.uid;
    if (!callerUid) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    // verify caller is admin
    const adminDoc = await admin.firestore().collection('admins').doc(callerUid).get();
    if (!adminDoc.exists) return NextResponse.json({ error: 'Forbidden - not an admin' }, { status: 403 });

    const body = await req.json();
    const { email, name, role, phone, address, gender, dateOfBirth, password } = body as any;

    // Normalize dateOfBirth: accept MM-DD-YYYY or ISO-like strings and store as ISO
    let normalizedDOB: string | null = null;
    if (dateOfBirth) {
      if (typeof dateOfBirth === 'string') {
        // Try MM-DD-YYYY first
        try {
          const p = parse(dateOfBirth, 'MM-dd-yyyy', new Date());
          if (isValidDate(p)) normalizedDOB = p.toISOString();
        } catch (e) {
          // ignore
        }
        // Fallback to Date.parse
        if (!normalizedDOB) {
          const dt = new Date(dateOfBirth);
          if (!isNaN(dt.getTime())) normalizedDOB = dt.toISOString();
        }
      } else if (dateOfBirth instanceof Date) {
        if (isValidDate(dateOfBirth)) normalizedDOB = dateOfBirth.toISOString();
      }
    }

    // Basic server-side validation
    const errors: Record<string, string> = {};
    if (!email || typeof email !== 'string') errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Invalid email format';
    if (!name || typeof name !== 'string' || name.trim().length < 2) errors.name = 'Name is required (min 2 chars)';
    if (phone && typeof phone === 'string' && phone.length > 100) errors.phone = 'Phone is too long';
    if (address && typeof address === 'string' && address.length > 1000) errors.address = 'Address is too long';
    if (gender && !['male', 'female', 'other'].includes(gender)) errors.gender = 'Invalid gender';
  if (dateOfBirth && !normalizedDOB) errors.dateOfBirth = 'Invalid dateOfBirth';
  if (normalizedDOB && Date.parse(normalizedDOB) > Date.now()) errors.dateOfBirth = 'dateOfBirth cannot be in the future';

    if (Object.keys(errors).length) {
      return NextResponse.json({ errors }, { status: 400 });
    }

  // Create user. If a password is provided, set it; otherwise create without password and send a reset link.
  const createParams: any = { email, displayName: name || undefined };
  if (password && typeof password === 'string' && password.length >= 6) createParams.password = password;
  const userRecord = await admin.auth().createUser(createParams);
    const uid = userRecord.uid;

    // set custom claim to mark as employee
    try { await admin.auth().setCustomUserClaims(uid, { employee: true }); } catch (e) { console.warn('Failed to set custom claims', e); }

    // create employee doc with full details
    const employeeDoc = {
      name: name || email.split('@')[0],
      email,
      phone: phone || null,
      address: address || null,
      gender: gender || null,
      dateOfBirth: normalizedDOB || null,
      role: role || 'employee',
      createdAt: new Date().toISOString(),
    } as any;

    await admin.firestore().collection('employees').doc(uid).set(employeeDoc);

    // create or update user doc (merge)
    const userDocPatch: any = {
      name: name || null,
      email,
      role: role || 'employee',
      isEmployee: true,
      updatedAt: new Date().toISOString(),
    };
    if (phone) userDocPatch.phone = phone;
    if (address) userDocPatch.address = address;
    if (gender) userDocPatch.gender = gender;
  if (normalizedDOB) userDocPatch.dateOfBirth = normalizedDOB;

    await admin.firestore().collection('users').doc(uid).set(userDocPatch, { merge: true });

    // If no password was provided, generate a password reset link and email it for onboarding.
    try {
      if (!createParams.password) {
        const resetLink = await admin.auth().generatePasswordResetLink(email);
        const text = `You have been added as an employee. Please set your password using the link below:\n\n${resetLink}\n\nThis link will allow you to set a password and sign in.`;
        await sendEmail({ to: email, type: 'profile_completed', templateData: { name: name || '', userEmail: email, resetLink }, subject: 'You have been added as an employee', text });
      } else {
        // If password was provided, send a brief notification (do NOT include the password in email for security by default)
        const text = `You have been added as an employee. An account was created for you. Please sign in using your email.`;
        await sendEmail({ to: email, type: 'profile_completed', templateData: { name: name || '', userEmail: email }, subject: 'You have been added as an employee', text });
      }
    } catch (e) {
      console.warn('Failed to generate/send onboarding email', e);
    }

    return NextResponse.json({ ok: true, uid });
  } catch (err: any) {
    console.error('admin/create-employee error', err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
