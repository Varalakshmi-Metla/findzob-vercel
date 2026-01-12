
import { NextRequest, NextResponse } from 'next/server';
import adminApp from '@/lib/firebase-admin';


// POST /api/hot-jobs-requests/approve
export async function POST(req: NextRequest) {
  try {
    const { requestId } = await req.json();
    if (!requestId) return NextResponse.json({ error: 'Missing requestId' }, { status: 400 });


    const db = adminApp.firestore();

    // Get the hotJobsRequest document
    const requestRef = db.collection('hotJobsRequests').doc(requestId);
    const requestSnap = await requestRef.get();
    if (!requestSnap.exists) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    const requestData = requestSnap.data();
    if (!requestData) {
      return NextResponse.json({ error: 'Request data missing' }, { status: 500 });
    }

    // Mark as approved
    await requestRef.update({ status: 'approved', approvedAt: new Date().toISOString() });

    // Add to user's applications collection as applied, with all details
    if (requestData.userId && requestData.jobId) {
      const applicationsRef = db.collection('applications');
      await applicationsRef.add({
        userId: requestData.userId,
        userName: requestData.userName || '',
        userEmail: requestData.userEmail || '',
        jobId: requestData.jobId,
        role: requestData.jobTitle || '',
        company: requestData.company || '',
        location: requestData.location || '',
        salary: requestData.salary !== undefined && requestData.salary !== null ? requestData.salary : '',
        logoUrl: requestData.logoUrl || '',
        status: 'Applied',
        appliedAt: new Date().toISOString(),
        source: 'hot-jobs-approval',
        type: 'hot-job-application',
      });

      // Also add to user's subcollection for My Users page
      const userJobsRef = db.collection('users').doc(requestData.userId).collection('jobs');
      await userJobsRef.add({
        company: requestData.company || '',
        role: requestData.jobTitle || '',
        location: requestData.location || '',
        status: 'Applied',
        appliedAt: new Date().toISOString(),
        source: 'hot-jobs-approval',
        read: false,
      });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 });
  }
}
