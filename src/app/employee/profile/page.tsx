"use client";

import React from "react";
import { useUser, useAuth } from "@/firebase";

export default function EmployeeProfilePage() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();

  if (isUserLoading) return <div className="p-6">Loading...</div>;

  const handleSendPasswordReset = async () => {
    try {
      if (!user?.email) return alert('No email found');
      const { sendPasswordResetEmail } = await import('firebase/auth');
      await sendPasswordResetEmail(auth as any, user.email);
      alert('Password reset email sent to ' + user.email);
    } catch (e) {
      console.error(e);
      alert('Failed to send password reset');
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Profile & Settings</h1>
      <div className="border rounded p-4 max-w-xl">
        <div className="font-semibold">{user?.displayName || user?.email}</div>
        <div className="text-sm text-muted-foreground">{user?.email}</div>
        <div className="mt-4">
          <button onClick={handleSendPasswordReset} className="px-3 py-2 bg-blue-600 text-white rounded">Send password reset</button>
        </div>
      </div>
    </div>
  );
}
