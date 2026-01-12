'use client';

import { useState } from 'react';
import AdminActivatePlanByEmail from '@/components/admin/AdminActivatePlanByEmail';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AdminPlanActivationPage() {
  const [recentActivations, setRecentActivations] = useState<any[]>([]);

  return (
    <div className="flex-1 overflow-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Plan Activation</h1>
        <p className="text-muted-foreground mt-2">
          Activate plans for users directly by email. Perfect for cash payments, special offers, and administrative purposes.
        </p>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Activation Form - Spans 2 columns on large screens */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Activate Plan by Email</CardTitle>
              <CardDescription>
                Enter user email and select a plan to activate instantly
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
            </CardContent>
          </Card>
        </div>

        {/* Quick Info - Right Sidebar */}
        <div className="space-y-4">
          {/* How to Use Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">How to Use</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3 text-sm">
                <li className="flex gap-3">
                  <span className="font-semibold text-primary min-w-fit">1.</span>
                  <span>Enter the user's registered email address</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-primary min-w-fit">2.</span>
                  <span>Select the plan from the dropdown list</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-primary min-w-fit">3.</span>
                  <span>Choose payment method (default: Cash)</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-primary min-w-fit">4.</span>
                  <span>Override amount if needed (optional)</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-semibold text-primary min-w-fit">5.</span>
                  <span>Click "Activate Plan" to proceed</span>
                </li>
              </ol>
            </CardContent>
          </Card>

          {/* Important Notes Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Important Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="space-y-1">
                <p className="font-semibold">✓ Plan Validity</p>
                <p className="text-muted-foreground">Respects user citizenship settings</p>
              </div>
              <div className="space-y-1">
                <p className="font-semibold">✓ Invoice Auto-Generated</p>
                <p className="text-muted-foreground">System tracks admin activation</p>
              </div>
              <div className="space-y-1">
                <p className="font-semibold">✓ Audit Trail</p>
                <p className="text-muted-foreground">Records which admin activated</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs Section */}
      <Tabs defaultValue="details" className="w-full">
        <TabsList>
          <TabsTrigger value="details">Plan Details</TabsTrigger>
          <TabsTrigger value="validity">Validity Rules</TabsTrigger>
        </TabsList>

        {/* Plan Details Tab */}
        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>What Information is Recorded</CardTitle>
              <CardDescription>
                Details automatically saved when a plan is activated
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {/* User Document Updates */}
                <Card className="border-dashed">
                  <CardHeader>
                    <CardTitle className="text-base">User Document</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="font-mono text-xs bg-muted p-1 rounded">activePlan</span>
                      <span className="text-muted-foreground">Plan ID</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-mono text-xs bg-muted p-1 rounded">planActivatedAt</span>
                      <span className="text-muted-foreground">Timestamp</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-mono text-xs bg-muted p-1 rounded">planExpiry</span>
                      <span className="text-muted-foreground">Expiry date</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-mono text-xs bg-muted p-1 rounded">status</span>
                      <span className="text-muted-foreground">"active"</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-mono text-xs bg-muted p-1 rounded">paymentMethod</span>
                      <span className="text-muted-foreground">Method used</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Invoice Details */}
                <Card className="border-dashed">
                  <CardHeader>
                    <CardTitle className="text-base">Invoice Created</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="font-mono text-xs bg-muted p-1 rounded">userId</span>
                      <span className="text-muted-foreground">User ID</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-mono text-xs bg-muted p-1 rounded">planId</span>
                      <span className="text-muted-foreground">Plan ID</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-mono text-xs bg-muted p-1 rounded">activatedBy</span>
                      <span className="text-muted-foreground">Admin email</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-mono text-xs bg-muted p-1 rounded">activatedAt</span>
                      <span className="text-muted-foreground">Timestamp</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-mono text-xs bg-muted p-1 rounded">status</span>
                      <span className="text-muted-foreground">"paid"</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Validity Rules Tab */}
        <TabsContent value="validity">
          <Card>
            <CardHeader>
              <CardTitle>Plan Validity Rules</CardTitle>
              <CardDescription>
                How plan expiry dates are calculated based on plan category and user citizenship
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                {/* Membership Plans */}
                <div className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <h3 className="font-semibold">Membership Plans</h3>
                  </div>
                  <div className="ml-7 space-y-2 text-sm">
                    <div className="flex justify-between items-start">
                      <span className="font-medium">India Citizenship:</span>
                      <span className="text-muted-foreground">1 year (365 days)</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="font-medium">Other Countries:</span>
                      <span className="text-muted-foreground">Lifetime</span>
                    </div>
                  </div>
                </div>

                {/* Service Plans */}
                <div className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <h3 className="font-semibold">Service Plans</h3>
                  </div>
                  <div className="ml-7 space-y-2 text-sm">
                    <div className="flex justify-between items-start">
                      <span className="font-medium">Pay-as-you-go:</span>
                      <span className="text-muted-foreground">Lifetime (no expiry)</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="font-medium">Other Service Plans:</span>
                      <span className="text-muted-foreground">36,500 days (~100 years)</span>
                    </div>
                  </div>
                </div>

                {/* Override */}
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-2">
                  <p className="text-sm">
                    <span className="font-semibold">Note:</span> If a plan has an explicit "validity" field, it will be used instead of the defaults above.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Info Section */}
      <Card>
        <CardHeader>
          <CardTitle>Authentication & Security</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            <span className="font-semibold">✓ Admin Only:</span> Requires admin role verification using Firebase ID token
          </p>
          <p>
            <span className="font-semibold">✓ Audit Trail:</span> All activations are logged with admin identification
          </p>
          <p>
            <span className="font-semibold">✓ Email Lookup:</span> Users are identified by registered email (case-insensitive)
          </p>
          <p>
            <span className="font-semibold">✓ Auto Invoice:</span> System generates invoices with complete tracking information
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
