'use client';

import AdminActivatePlanByEmail from '@/components/admin/AdminActivatePlanByEmail';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

/**
 * Example implementation of AdminActivatePlanByEmail component
 * Add this to your admin dashboard or settings page
 */
export default function AdminPlanManagementSection() {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Manual Plan Activation</CardTitle>
        <CardDescription>
          Activate plans for users by email address. Use this for cash payments, special offers, or administrative purposes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Info Alert */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This action bypasses payment verification. An invoice will be automatically generated and tracked with admin activation.
          </AlertDescription>
        </Alert>

        {/* Component */}
        <div className="pt-2">
          <AdminActivatePlanByEmail />
        </div>

        {/* Usage Tips */}
        <div className="text-sm text-gray-600 space-y-2">
          <p className="font-semibold">How to use:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Enter the user's email address exactly as registered</li>
            <li>Select the plan to activate from the dropdown</li>
            <li>Payment method defaults to "Cash/Manual"</li>
            <li>Amount is auto-filled from plan price but can be overridden</li>
            <li>Plan validity respects user's citizenship settings</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Integration example for admin dashboard
 * 
 * Add this to your admin page like:
 * 
 * import AdminPlanManagementSection from '@/components/admin/AdminPlanManagementSection';
 * 
 * export default function AdminDashboard() {
 *   return (
 *     <div className="space-y-6">
 *       <AdminPlanManagementSection />
 *     </div>
 *   );
 * }
 */
