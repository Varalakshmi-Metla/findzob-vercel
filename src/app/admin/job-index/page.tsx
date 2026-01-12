
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function AdminJobIndexPage() {
  return (
    <div className="p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-8">Job Index</h1>
      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            This section is under construction.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>You will be able to view indexed job information and analytics here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
