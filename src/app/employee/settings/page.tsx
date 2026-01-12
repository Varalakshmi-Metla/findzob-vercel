// 'use client';

// import { useState, useEffect } from 'react';
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// import { Label } from '@/components/ui/label';
// import { Input } from '@/components/ui/input';
// import { Button } from '@/components/ui/button';
// import { useToast } from '@/hooks/use-toast';
// import { useUser } from '@/firebase';
// import { getAuth, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';

// export default function SettingsPage() {
//   const { toast } = useToast();
//   const { user } = useUser();
//   const [currentPassword, setCurrentPassword] = useState('');
//   const [newPassword, setNewPassword] = useState('');
//   const [isLoading, setIsLoading] = useState(false);

//   // Cleanup any leftover modals on page load
//   useEffect(() => {
//     // Force remove any modal overlays that might be blocking
//     const removeModals = () => {
//       // Remove fixed position overlays
//       const fixedOverlays = document.querySelectorAll('.fixed.inset-0.z-50, .fixed.inset-0');
//       fixedOverlays.forEach(el => {
//         console.log('Removing overlay:', el);
//         el.remove();
//       });
      
//       // Remove backdrop elements
//       const backdrops = document.querySelectorAll('.bg-black\\/50, [class*="backdrop"]');
//       backdrops.forEach(el => {
//         console.log('Removing backdrop:', el);
//         el.remove();
//       });
      
//       // Reset body styles
//       document.body.style.overflow = 'auto';
//       document.body.style.position = 'static';
//     };
    
//     // Run immediately
//     removeModals();
    
//     // Run again after a short delay to catch dynamically added elements
//     setTimeout(removeModals, 100);
    
//     // Cleanup function
//     return () => {
//       document.body.style.overflow = 'auto';
//     };
//   }, []);

//   const handleChangePassword = async () => {
//     if (!user) {
//       toast({ variant: 'destructive', title: 'Not signed in', description: 'Please sign in to change your password.' });
//       return;
//     }
//     if (!currentPassword || !newPassword) {
//       toast({ variant: 'destructive', title: 'Missing fields', description: 'Please provide current and new passwords.' });
//       return;
//     }
//     setIsLoading(true);
//     try {
//       const auth = getAuth();
//       const credential = EmailAuthProvider.credential(user.email || '', currentPassword);
//       await reauthenticateWithCredential(user, credential);
//       await updatePassword(user, newPassword);
//       toast({ title: 'Password changed', description: 'Your password was updated successfully.' });
//       setCurrentPassword('');
//       setNewPassword('');
//     } catch (err: any) {
//       console.error('Password change failed', err);
//       toast({ variant: 'destructive', title: 'Failed', description: err?.message || 'Could not change password. You may need to sign in again.' });
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <div className="space-y-6">
//       {/* PAGE HEADER */}
//       <div>
//         <h1 className="text-3xl font-bold">Settings</h1>
//         <p className="text-muted-foreground">
//           Manage your account settings and security
//         </p>
//       </div>
      
//       {/* PASSWORD CHANGE CARD */}
//       <Card>
//         <CardHeader>
//           <CardTitle>Change Password</CardTitle>
//           <CardDescription>
//             Update your password to keep your account secure
//           </CardDescription>
//         </CardHeader>
//         <CardContent className="space-y-4">
//           <div className="space-y-2 max-w-md">
//             <Label htmlFor="currentPassword">Current Password</Label>
//             <Input
//               id="currentPassword"
//               type="password"
//               value={currentPassword}
//               onChange={(e) => setCurrentPassword(e.target.value)}
//               disabled={isLoading}
//               placeholder="Enter current password"
//             />
//           </div>
          
//           <div className="space-y-2 max-w-md">
//             <Label htmlFor="newPassword">New Password</Label>
//             <Input
//               id="newPassword"
//               type="password"
//               value={newPassword}
//               onChange={(e) => setNewPassword(e.target.value)}
//               disabled={isLoading}
//               placeholder="Enter new password"
//             />
//             <p className="text-xs text-muted-foreground">
//               Password must be at least 6 characters long
//             </p>
//           </div>
          
//           <Button
//             onClick={handleChangePassword}
//             disabled={isLoading || !currentPassword || !newPassword}
//           >
//             {isLoading ? 'Changing Password...' : 'Change Password'}
//           </Button>
//         </CardContent>
//       </Card>
      
//       {/* ACCOUNT INFO CARD */}
//       <Card>
//         <CardHeader>
//           <CardTitle>Account Information</CardTitle>
//           <CardDescription>
//             Your current account details
//           </CardDescription>
//         </CardHeader>
//         <CardContent className="space-y-3">
//           <div className="flex items-center justify-between py-2 border-b">
//             <span className="font-medium">Email Address</span>
//             <span className="text-muted-foreground">
//               {user?.email || 'Not signed in'}
//             </span>
//           </div>
          
//           <div className="flex items-center justify-between py-2 border-b">
//             <span className="font-medium">Account Status</span>
//             <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
//               Active
//             </span>
//           </div>
          
//           <div className="flex items-center justify-between py-2">
//             <span className="font-medium">Member Since</span>
//             <span className="text-muted-foreground">
//               {user?.metadata?.creationTime 
//                 ? new Date(user.metadata.creationTime).toLocaleDateString()
//                 : 'N/A'}
//             </span>
//           </div>
//         </CardContent>
//       </Card>
//     </div>
//   );
// }



'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';
import { getAuth, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';

export default function SettingsPage() {
  const { toast } = useToast();
  const { user } = useUser();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Cleanup any leftover modals on page load
  useEffect(() => {
    // Force remove any modal overlays that might be blocking
    const removeModals = () => {
      // Remove fixed position overlays
      const fixedOverlays = document.querySelectorAll('.fixed.inset-0.z-50, .fixed.inset-0');
      fixedOverlays.forEach(el => {
        console.log('Removing overlay:', el);
        el.remove();
      });
      
      // Remove backdrop elements
      const backdrops = document.querySelectorAll('.bg-black\\/50, [class*="backdrop"]');
      backdrops.forEach(el => {
        console.log('Removing backdrop:', el);
        el.remove();
      });
      
      // Reset body styles
      document.body.style.overflow = 'auto';
      document.body.style.position = 'static';
    };
    
    // Run immediately
    removeModals();
    
    // Run again after a short delay to catch dynamically added elements
    setTimeout(removeModals, 100);
    
    // Cleanup function
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

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

  return (
    <div className="space-y-6">
      {/* PAGE HEADER */}
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and security
        </p>
      </div>
      
      {/* PASSWORD CHANGE CARD */}
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>
            Update your password to keep your account secure
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 max-w-md">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={isLoading}
              placeholder="Enter current password"
            />
          </div>
          
          <div className="space-y-2 max-w-md">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={isLoading}
              placeholder="Enter new password"
            />
            <p className="text-xs text-muted-foreground">
              Password must be at least 6 characters long
            </p>
          </div>
          
          <Button
            onClick={handleChangePassword}
            disabled={isLoading || !currentPassword || !newPassword}
          >
            {isLoading ? 'Changing Password...' : 'Change Password'}
          </Button>
        </CardContent>
      </Card>
      
      {/* ACCOUNT INFO CARD */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>
            Your current account details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b">
            <span className="font-medium">Email Address</span>
            <span className="text-muted-foreground">
              {user?.email || 'Not signed in'}
            </span>
          </div>
          
          <div className="flex items-center justify-between py-2 border-b">
            <span className="font-medium">Account Status</span>
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
              Active
            </span>
          </div>
          
          <div className="flex items-center justify-between py-2">
            <span className="font-medium">Member Since</span>
            <span className="text-muted-foreground">
              {user?.metadata?.creationTime 
                ? new Date(user.metadata.creationTime).toLocaleDateString()
                : 'N/A'}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}