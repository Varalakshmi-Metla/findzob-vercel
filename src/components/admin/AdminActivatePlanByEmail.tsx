'use client';

import { useState } from 'react';
import { useAuth } from '@/firebase/provider';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface Plan {
  id: string;
  name: string;
  price: number;
  category: string;
  validity: number | string;
}

export default function AdminActivatePlanByEmail() {
  const auth = useAuth();
  const user = auth.currentUser;
  const { toast } = useToast();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amount, setAmount] = useState('');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);

  // Fetch plans when dialog opens
  const handleOpenChange = async (open: boolean) => {
    setIsOpen(open);
    if (open && plans.length === 0) {
      await fetchPlans();
    }
  };

  const fetchPlans = async () => {
    try {
      setLoadingPlans(true);
      const response = await fetch('/api/plans');
      if (!response.ok) {
        throw new Error('Failed to fetch plans');
      }
      const data = await response.json();
      setPlans(Array.isArray(data) ? data : data.plans || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch plans',
      });
    } finally {
      setLoadingPlans(false);
    }
  };

  const handleActivatePlan = async () => {
    // Validation
    if (!userEmail) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please enter user email',
      });
      return;
    }

    if (!selectedPlanId) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please select a plan',
      });
      return;
    }

    try {
      setIsLoading(true);

      const idToken = await user?.getIdToken();
      if (!idToken) {
        throw new Error('No authentication token available');
      }

      const selectedPlan = plans.find((p) => p.id === selectedPlanId);
      const requestBody = {
        userEmail: userEmail.toLowerCase(),
        planId: selectedPlanId,
        paymentMethod: paymentMethod || 'cash',
        amount: amount ? parseFloat(amount) : selectedPlan?.price || 0,
        plan: selectedPlan,
      };

      const response = await fetch('/api/admin/activate-plan-by-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to activate plan');
      }

      toast({
        title: 'Success',
        description: `Plan "${selectedPlan?.name}" activated for ${userEmail}`,
      });

      // Reset form
      setUserEmail('');
      setSelectedPlanId('');
      setPaymentMethod('cash');
      setAmount('');
      setIsOpen(false);
    } catch (error) {
      console.error('Error activating plan:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to activate plan',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">Activate Plan by Email</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Activate Plan by Email</DialogTitle>
          <DialogDescription>
            Enter user email and select a plan to activate. This will bypass payment verification.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* User Email Input */}
          <div className="space-y-2">
            <Label htmlFor="user-email">User Email *</Label>
            <Input
              id="user-email"
              type="email"
              placeholder="user@example.com"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {/* Plan Selection */}
          <div className="space-y-2">
            <Label htmlFor="plan-select">Select Plan *</Label>
            {loadingPlans ? (
              <div className="text-sm text-gray-500">Loading plans...</div>
            ) : (
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId} disabled={isLoading}>
                <SelectTrigger id="plan-select">
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} (₹{plan.price})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label htmlFor="payment-method">Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod} disabled={isLoading}>
              <SelectTrigger id="payment-method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash/Manual</SelectItem>
                <SelectItem value="razorpay">Razorpay</SelectItem>
                <SelectItem value="stripe">Stripe</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Amount (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (Optional)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="Leave empty to use plan price"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isLoading}
              step="0.01"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleActivatePlan}
              disabled={isLoading || !userEmail || !selectedPlanId}
              className="flex-1"
            >
              {isLoading ? 'Activating...' : 'Activate Plan'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
