import { NextResponse } from 'next/server';
import sendEmail from '@/lib/sendEmail';
import adminApp from '@/lib/firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password } = body as any;
    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
    }

    const auth = adminApp.auth();
    const db = getFirestore(adminApp);

    // Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
    });

    // Create corresponding employee and user docs
    const empRef = db.collection('employees').doc(userRecord.uid);
    await empRef.set({
      name: name || email.split('@')[0],
      email,
      role: 'employee',
      createdAt: FieldValue.serverTimestamp(),
    });

    await db.collection('users').doc(userRecord.uid).set(
      {
        name,
        email,
        role: 'employee',
        isEmployee: true,
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    // Notify new employee by email with a generic welcome template (env SMTP used)
    try {
      await sendEmail({ to: email, type: 'profile_completed', templateData: { name: name || '', userEmail: email }, subject: 'You have been added as an employee' });
    } catch (e) {
      console.warn('Failed to send new-employee email', e);
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('admin/add-employee error', err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
