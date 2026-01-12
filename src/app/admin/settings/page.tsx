
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useUser, useDoc, useMemoFirebase } from '@/firebase';
import { isAdminEmail } from '@/lib/admin';
import { doc as docRef } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs, doc, writeBatch } from 'firebase/firestore';
import { getAuth, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';

export default function AdminSettingsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user } = useUser();

  // basic isAdmin check - prefer server-side custom claims or Firestore-stored isAdmin
  const userDocRef = useMemoFirebase(() => (user ? docRef(firestore, 'users', user.uid) : null), [user, firestore]);
  const { data: currentUserDoc } = useDoc(userDocRef);
  const isAdmin = isAdminEmail(user?.email) || currentUserDoc?.isAdmin === true;
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  const handleSetAdmin = async () => {
    if (!isAdmin) {
      toast({ variant: 'destructive', title: 'Unauthorized', description: 'You do not have permission to perform this action.' });
      return;
    }
    if (!email) {
      toast({ variant: 'destructive', title: 'Email required', description: 'Please enter a user email.' });
      return;
    }
    setIsLoading(true);
    try {
  const usersRef = collection(firestore, 'users');
      const q = query(usersRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error('User not found.');
      }

      // Call server route to set admin claim and update Firestore safely
      if (!user) throw new Error('Current user not available');
      const idToken = await user.getIdToken();
      const res = await fetch('/api/admin/grant-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ email })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Server error');
      toast({ title: 'Success', description: `Successfully made ${email} an admin.` });
      setEmail('');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Not signed in', description: 'Please sign in to change your password.' });
      return;
    }
    if (!currentPassword || !newPassword) {
      toast({ variant: 'destructive', title: 'Missing fields', description: 'Please provide current and new passwords.' });
      return;
    }
    setPwLoading(true);
    try {
      const auth = getAuth();
      const credential = EmailAuthProvider.credential(user.email || '', currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      toast({ title: 'Password changed', description: 'Your password was updated successfully.' });
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err?.message || 'Could not change password.' });
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-8">Admin Settings</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Grant Admin Privileges</CardTitle>
            <CardDescription>
              Enter the email of a user to grant them admin rights. This action is irreversible through the UI.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">User Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button onClick={handleSetAdmin} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Make Admin
            </Button>
          </CardContent>
        </Card>
      
        <Card>
          <CardHeader>
            <CardTitle>Change Your Password</CardTitle>
            <CardDescription>Update the password for the currently signed-in admin account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="currentPw">Current Password</Label>
              <Input id="currentPw" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPw">New Password</Label>
              <Input id="newPw" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <Button onClick={handleChangePassword} disabled={pwLoading}>
              {pwLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Change Password'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
