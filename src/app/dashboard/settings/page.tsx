'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useDoc, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { getAuth, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { doc } from 'firebase/firestore';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function SettingsPage() {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [activePayGoPlan, setActivePayGoPlan] = useState<any>(null);
  const [showDeactivationConfirm, setShowDeactivationConfirm] = useState(false);

  const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  const { data: userDoc } = useDoc(userDocRef);

  // Find active pay-as-you-go plan
  useEffect(() => {
    if (userDoc && Array.isArray(userDoc.plans)) {
      const servicePlans = userDoc.plans.filter((p: any) => String(p.category || '').toLowerCase() === 'service');
      const payGoPlan = servicePlans.find((p: any) => {
        const planName = (p.name || p.planName || '').toString().toLowerCase();
        const planId = (p.id || p.planId || '').toString().toLowerCase();
        return planName.includes('payg') || planName.includes('pay as you go') || planName.includes('pay-as-you-go')  || planId.includes('payg') || p.billing === 'payg';
      });
      setActivePayGoPlan(payGoPlan || null);
    }
  }, [userDoc]);

  const handleChangePassword = async () => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Not signed in', description: 'Please sign in to change your password.' });
      return;
    }
    if (!currentPassword || !newPassword) {
      toast({ variant: 'destructive', title: 'Missing fields', description: 'Please provide current and new passwords.' });
      return;
    }
    setIsLoading(true);
    try {
      const auth = getAuth();
      const credential = EmailAuthProvider.credential(user.email || '', currentPassword);
      // Reauthenticate then update password
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      toast({ title: 'Password changed', description: 'Your password was updated successfully.' });
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      console.error('Password change failed', err);
      toast({ variant: 'destructive', title: 'Failed', description: err?.message || 'Could not change password. You may need to sign in again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeactivatePayGoPlan = async () => {
    if (!user || !userDoc || !activePayGoPlan) {
      toast({ variant: 'destructive', title: 'Error', description: 'Unable to deactivate plan. Please refresh and try again.' });
      return;
    }

    setIsDeactivating(true);
    try {
      const userDocRef = doc(firestore, 'users', user.uid);
      
      // Remove the pay-as-you-go plan from user's plans array
      const updatedPlans = userDoc.plans.filter((p: any) => {
        const planName = (p.name || p.planName || '').toString().toLowerCase();
        const planId = (p.id || p.planId || '').toString().toLowerCase();
        const isPayGoPlan = planName.includes('payg') || planName.includes('pay as you go') || planName.includes('pay-as-you-go') || planId.includes('payg') || p.billing === 'payg';
        return !isPayGoPlan;
      });

      // Clear all plan-related fields when deactivating
      const updateData: any = {
        plans: updatedPlans,
        activePlan: null,
        serviceplanStatus: null,
        activeMembershipPlan: null,
        planExpiryDate: null,
        planStartDate: null,
      };

      await updateDocumentNonBlocking(userDocRef, updateData);
      
      toast({
        title: 'Plan Deactivated',
        description: 'Your pay-as-you-go plan has been successfully deactivated. You can reactivate it anytime from the billing page.',
        variant: 'default',
      });
      setShowDeactivationConfirm(false);
      setActivePayGoPlan(null);
    } catch (err: any) {
      console.error('Error deactivating plan:', err);
      toast({
        variant: 'destructive',
        title: 'Failed',
        description: err?.message || 'Could not deactivate plan. Please try again.',
      });
    } finally {
      setIsDeactivating(false);
    }
  };

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>
      
      {/* Account Settings Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>
            Manage your account settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-md">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </div>
            <div className="space-y-2 mt-4">
              <Label htmlFor="newPassword">New Password</Label>
              <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <div className="mt-4">
              <Button onClick={handleChangePassword} disabled={isLoading}>
                {isLoading ? 'Updating...' : 'Change Password'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Service Plan Management Card */}
      {activePayGoPlan && (
        <Card className="border-red-800 bg-slate-900 dark:bg-slate-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-500">
              <AlertCircle className="w-5 h-5" />
              Manage Service Plan
            </CardTitle>
            <CardDescription className="text-slate-400">
              Manage your pay-as-you-go service plan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 border border-red-800 rounded-lg bg-slate-800 dark:bg-slate-900">
                <div className="text-sm font-semibold text-slate-300 mb-2">Active Plan</div>
                <div className="text-lg font-bold text-red-400 mb-1">
                  {activePayGoPlan.name || activePayGoPlan.planName || 'Pay-As-You-Go Plan'}
                </div>
                <div className="text-sm text-slate-400 mb-3">
                  {activePayGoPlan.description || 'Flexible pay-as-you-go service plan'}
                </div>
                <Alert className="border-red-900 bg-red-950 mb-3">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <AlertDescription className="text-red-400 text-sm">
                    Deactivating this plan will remove access to pay-as-you-go features and delete all plan data. You can reactivate it anytime from the billing page.
                  </AlertDescription>
                </Alert>

                {!showDeactivationConfirm ? (
                  <Button
                    variant="destructive"
                    onClick={() => setShowDeactivationConfirm(true)}
                    className="w-full bg-red-700 hover:bg-red-800"
                  >
                    Deactivate Plan
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <Alert className="border-red-900 bg-red-950">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      <AlertDescription className="text-red-400 text-sm">
                        Are you sure? This action will permanently deactivate and delete your pay-as-you-go plan immediately.
                      </AlertDescription>
                    </Alert>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowDeactivationConfirm(false)}
                        disabled={isDeactivating}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleDeactivatePayGoPlan}
                        disabled={isDeactivating}
                        className="flex-1"
                      >
                        {isDeactivating ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Deactivating...
                          </>
                        ) : (
                          'Confirm Deactivation'
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
