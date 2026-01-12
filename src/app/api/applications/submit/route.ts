import { NextResponse } from 'next/server';
import sendEmail from '@/lib/sendEmail';
import adminApp from '@/lib/firebase-admin';
import admin from 'firebase-admin';

type Body = {
  userId: string;
  jobId: string;
  resumeId?: string;
  resumeURL?: string;
  priority?: boolean;
  type?: string;
};

// --- INVOICE GENERATION LOGIC ---
async function generateOrUpdatePaygInvoice(db: FirebaseFirestore.Firestore, userId: string) {
  // Fetch user
  const userDoc = await db.collection('users').doc(userId).get();
  const user = userDoc.data();
  console.log('[INVOICE][DEBUG] User fetched for invoice:', { userId, user });
  if (!user || !user.plans || !Array.isArray(user.plans)) {
    console.log('[INVOICE][DEBUG] No user or plans array');
    return;
  }
  const paygPlan = user.plans.find((p: any) => /pay[-\s]?as[-\s]?you[-\s]?go/i.test((p.planName || p.name || '')));
  if (!paygPlan) {
    console.log('[INVOICE][DEBUG] No PAYG plan for user', userId, user.plans);
    return;
  }
  const citizenship = (user.citizenship || user.country || '').toUpperCase();
  if (citizenship !== 'USA') {
    console.log('[INVOICE][DEBUG] Not USA citizenship/country:', citizenship);
    return;
  }
  if (paygPlan.currency && paygPlan.currency.toUpperCase() === 'INR') {
    console.log('[INVOICE][DEBUG] Skipped due to INR currency');
    return;
  }
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const start = new Date(year, month, 1, 0, 0, 0, 0);
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
  // Update or create invoice by incrementing amount and hotJobCount by 1
  const existingInvoiceSnap = await db.collection('invoices')
    .where('userId', '==', userId)
    .where('type', '==', 'payg-hotjobs')
    .where('month', '==', month)
    .where('year', '==', year)
    .where('status', '==', 'unpaid')
    .limit(1)
    .get();
  const perApp = 3;
  const currency = 'USD';
  let invoiceId = null;
  let isUpdate = false;
  if (!existingInvoiceSnap.empty) {
    // Update existing invoice: increment amount and hotJobCount by 1, update updatedAt
    const invoiceRef = existingInvoiceSnap.docs[0].ref;
    await invoiceRef.update({
      amount: admin.firestore.FieldValue.increment(perApp),
      hotJobCount: admin.firestore.FieldValue.increment(1),
      currency,
      updatedAt: admin.firestore.Timestamp.fromDate(new Date()),
      userEmail: user.email || '',
      userPhone: user.phone || '',
      userAddress: user.address || '',
    });
    invoiceId = invoiceRef.id;
    isUpdate = true;
    console.log('[INVOICE][DEBUG] Incremented invoice for user', userId);
  } else {
    // Create new invoice for this month
    const invoice = {
      userId,
      planName: 'Pay As You Go',
      description: `Hot Job Applications for ${now.toLocaleString('default', { month: 'long' })} ${year} (1 application x $${perApp})`,
      amount: perApp,
      currency,
      status: 'unpaid',
      createdAt: admin.firestore.Timestamp.fromDate(new Date()),
      updatedAt: admin.firestore.Timestamp.fromDate(new Date()),
      type: 'payg-hotjobs',
      hotJobCount: 1,
      month,
      year,
      userEmail: user.email || '',
      userPhone: user.phone || '',
      userAddress: user.address || '',
    };
    const docRef = await db.collection('invoices').add(invoice);
    invoiceId = docRef.id;
    isUpdate = false;
    console.log('[INVOICE][DEBUG] Created new invoice for user', userId);
  }

  // Send invoice email to user
  try {
    if (user.email && invoiceId) {
      // Fetch latest invoice data
      const invoiceDoc = await db.collection('invoices').doc(invoiceId).get();
      const invoiceData = invoiceDoc.data();
      const amount = invoiceData?.amount ?? 0;
      const description = invoiceData?.description ?? '';
      await sendEmail({
        to: user.email,
        type: 'invoice_notification',
        subject: isUpdate ? 'Your PAYG Invoice was Updated' : 'Your PAYG Invoice was Created',
        html: `<p>Dear ${user.name || ''},</p>
          <p>Your PAYG Hot Jobs invoice for <b>${now.toLocaleString('default', { month: 'long' })} ${year}</b> has been ${isUpdate ? 'updated' : 'created'}.</p>
          <p><b>Amount:</b> $${amount} USD<br/>
          <b>Description:</b> ${description}</p>
          <p>You can view and pay your invoice in your dashboard.</p>
          <p>Thank you,<br/>Findzob Team</p>`,
        text: `Dear ${user.name || ''},\nYour PAYG Hot Jobs invoice for ${now.toLocaleString('default', { month: 'long' })} ${year} has been ${isUpdate ? 'updated' : 'created'}.\nAmount: $${amount} USD\nDescription: ${description}\nYou can view and pay your invoice in your dashboard.\nThank you,\nFindzob Team`,
      });
      console.log('[INVOICE][DEBUG] Invoice email sent to', user.email);
    }
  } catch (emailErr) {
    console.error('[INVOICE][ERROR] Failed to send invoice email:', emailErr);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body || !body.userId || !body.jobId) return NextResponse.json({ error: 'userId and jobId required' }, { status: 400 });

    const db = adminApp.firestore();
    
    // Fetch user document to determine citizenship and select the correct collection
    let userDoc: any = null;
    try {
      const userDocSnap = await db.collection('users').doc(body.userId).get();
      if (userDocSnap.exists) {
        userDoc = userDocSnap.data();
      }
    } catch (e) {
      console.warn(`[APPLICATIONS/SUBMIT] Error fetching user document:`, e);
    }
    
    // Determine collection based on user citizenship
    const citizenship = userDoc?.citizenship || userDoc?.country || '';
    const collectionName = citizenship === 'India' ? 'hot-jobs-india' : 'hotJobs';
    console.log(`[APPLICATIONS/SUBMIT] User citizenship: ${citizenship}, using collection: ${collectionName}`);
    
    // Fetch job data from the correct collection based on user location
    let jobData: any = null;
    try {
      const jobDoc = await db.collection(collectionName).doc(body.jobId).get();
      if (jobDoc.exists) {
        jobData = jobDoc.data();
        console.log(`[APPLICATIONS/SUBMIT] Found job in ${collectionName} by doc ID:`, { 
          id: body.jobId, 
          title: jobData?.title, 
          company: jobData?.company,
          location: jobData?.location,
          salary: jobData?.salary,
          logoUrl: jobData?.logoUrl,
          url: jobData?.url,
          apply_url: jobData?.apply_url,
          jobUrl: jobData?.jobUrl
        });
      } else {
        console.warn(`[APPLICATIONS/SUBMIT] Job not found in ${collectionName} with jobId: ${body.jobId}`);
        // Try the other collection as fallback
        const fallbackCollection = citizenship === 'India' ? 'hotJobs' : 'hot-jobs-india';
        try {
          const fallbackDoc = await db.collection(fallbackCollection).doc(body.jobId).get();
          if (fallbackDoc.exists) {
            jobData = fallbackDoc.data();
            console.log(`[APPLICATIONS/SUBMIT] Found job in fallback collection ${fallbackCollection}:`, { 
              id: body.jobId, 
              title: jobData?.title 
            });
          }
        } catch (fallbackError) {
          console.warn(`[APPLICATIONS/SUBMIT] Error checking fallback collection:`, fallbackError);
        }
      }
    } catch (e) {
      console.error(`[APPLICATIONS/SUBMIT] Error fetching job from ${collectionName}:`, e);
    }
    
    // Helper function to clean values - remove "-" and empty strings, return null if invalid
    const cleanValue = (value: any): string => {
      if (value === null || value === undefined) return '';
      if (typeof value === 'string') {
        const trimmed = value.trim();
        // Don't accept "-" as a valid value
        if (trimmed === '' || trimmed === '-') return '';
        return trimmed;
      }
      // For non-string values (like numbers), return as-is or convert to string
      if (typeof value === 'number') return String(value);
      return String(value);
    };
    
    if (!jobData) {
      console.warn(`[APPLICATIONS/SUBMIT] Job not found in Firestore for jobId: ${body.jobId}, using body data`);
      console.log(`[APPLICATIONS/SUBMIT] Body data received:`, {
        jobTitle: body.jobTitle,
        company: body.company,
        location: body.location,
        salary: body.salary,
        logoUrl: body.logoUrl
      });
    }
    
    // Use job data from Firestore if available, otherwise fall back to body data
    // Prioritize Firestore data, but clean all values to remove "-" placeholders
    // Only use body data if Firestore doesn't have it AND body data is valid (not empty or "-")
    let jobTitle = '';
    let company = '';
    let location = '';
    let salary: string | number = '';
    let logoUrl = '';
    
    if (jobData) {
      // Use Firestore data (cleaned)
      jobTitle = cleanValue(jobData.title);
      company = cleanValue(jobData.company);
      location = cleanValue(jobData.location);
      logoUrl = cleanValue(jobData.logoUrl || jobData.logo);
      
      // Handle salary from Firestore
      if (jobData.salary !== undefined && jobData.salary !== null && jobData.salary !== '' && jobData.salary !== '-') {
        salary = jobData.salary;
      }
    }
    
    // Fall back to body data only if Firestore data is missing AND body data is valid
    if (!jobTitle && body.jobTitle) {
      const cleaned = cleanValue(body.jobTitle);
      if (cleaned) jobTitle = cleaned;
    }
    if (!company && body.company) {
      const cleaned = cleanValue(body.company);
      if (cleaned) company = cleaned;
    }
    if (!location && body.location) {
      const cleaned = cleanValue(body.location);
      if (cleaned) location = cleaned;
    }
    if (!logoUrl && (body.logoUrl || body.logo)) {
      const cleaned = cleanValue(body.logoUrl || body.logo);
      if (cleaned) logoUrl = cleaned;
    }
    if (!salary && body.salary !== undefined && body.salary !== null && body.salary !== '' && body.salary !== '-') {
      salary = body.salary;
    }
    
    // Get job URL from Firestore job data (prioritize Firestore data)
    let jobUrl = '';
    if (jobData) {
      // Try multiple possible URL field names
      jobUrl = cleanValue(jobData.url || jobData.apply_url || jobData.jobUrl || jobData.job_url);
    }
    // Fall back to body data only if Firestore doesn't have it
    if (!jobUrl && (body.jobUrl || body.url || body.apply_url)) {
      jobUrl = cleanValue(body.jobUrl || body.url || body.apply_url);
    }
    
    // Validate that we have essential fields
    if (!jobTitle || !company) {
      console.error(`[APPLICATIONS/SUBMIT] Missing essential job data:`, { jobTitle, company, jobId: body.jobId });
      return NextResponse.json({ 
        error: 'Missing essential job data (title or company). Please ensure the job exists and has complete information.' 
      }, { status: 400 });
    }
    
    console.log(`[APPLICATIONS/SUBMIT] Final job data (cleaned):`, { jobTitle, company, location, salary, logoUrl, jobUrl });
    
    // Create hotJobsRequests document (pending approval)
    const hotJobRequest = {
      userId: body.userId,
      userName: body.userName || '',
      userEmail: body.userEmail || '',
      jobId: body.jobId,
      jobTitle: jobTitle,
      company: company,
      location: location,
      salary: salary,
      logoUrl: logoUrl,
      jobUrl: jobUrl, // Add job URL to the request
      url: jobUrl, // Also add as 'url' for compatibility
      apply_url: jobUrl, // Also add as 'apply_url' for compatibility
      resumeId: body.resumeId || null,
      priority: typeof body.priority === 'boolean' ? body.priority : null,
      status: 'pending',
      type: body.type || 'hot-job-application',
      requestedAt: new Date().toISOString(),
    };
    const hotJobReqRef = await db.collection('hotJobsRequests').add(hotJobRequest);

    // Increment user's hot job application count for the current month
    const userRef = db.collection('users').doc(body.userId);
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2, '0')}`;
    await userRef.set({
      hotJobApplications: {
        [monthKey]: admin.firestore.FieldValue.increment(1)
      },
      hotJobRequests: admin.firestore.FieldValue.arrayUnion(body.jobId)
    }, { merge: true });

    // If user applied without selecting a resume, also create a pendingProfiles document
    if (!body.resumeId) {
      const pending = {
        userId: body.userId,
        jobId: body.jobId,
        hotJobRequestId: hotJobReqRef.id,
        resumeId: body.resumeId || null,
        priority: typeof body.priority === 'boolean' ? body.priority : null,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      await db.collection('pendingProfiles').add(pending);
    }

    // After application is submitted, auto-generate or update invoice for PAYG users
    let invoiceStatus = 'skipped';
    try {
      await generateOrUpdatePaygInvoice(db, body.userId);
      invoiceStatus = 'success';
    } catch (err) {
      console.error('[INVOICE][ERROR] Failed to generate or update invoice:', err);
      invoiceStatus = 'error';
    }

    return NextResponse.json({ ok: true, hotJobRequestId: hotJobReqRef.id, invoiceStatus });
  } catch (err: any) {
    console.error('applications/submit error', err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
