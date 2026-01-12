"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
};

export default function ProfileCompleteModal({ open, onOpenChange, title, description }: Props) {
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title || 'Complete your profile'}</DialogTitle>
          <DialogDescription>{description || 'Finish your profile to unlock all FindZob features and improve job matches.'}</DialogDescription>
        </DialogHeader>
        <div className="flex gap-2 mt-4">
          <Button onClick={() => { onOpenChange(false); router.push('/dashboard/profile'); }}>Complete profile</Button>
          <Button variant="ghost" onClick={() => { onOpenChange(false); router.push('/dashboard'); }}>Maybe later</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
