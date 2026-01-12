Recommended Firestore security rules (starter)

This file contains a short template and guidance for protecting admin/employee collections used by the app. Tailor to your auth and role system.

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Public read for non-sensitive collections (for example: public job listings)
    match /hotJobs/{jobId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // Users: allow users to read/write their own doc, admins can read/write all
    match /users/{userId} {
      allow read: if request.auth != null && (request.auth.uid == userId || isAdmin());
      allow write: if request.auth != null && (request.auth.uid == userId || isAdmin());
    }

    // Employee records: only admins can manage
    match /employees/{empId} {
      allow read, write: if isAdmin();
    }

    // Applications: users can create for themselves, admins/employees can read all
    match /applications/{appId} {
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid && hasPaidPlan(request.auth.uid);
      allow read, update: if isAdmin() || isEmployee();
    }

    // Pending profiles: only employees and admins can read, users can create their own
    match /pendingProfiles/{p} {
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
      allow read, update: if isAdmin() || isEmployee();
    }

    // resumes collection: store metadata only - protect url storage
    match /resumes/{r} {
      allow read: if request.auth != null && (request.auth.uid == resource.data.userId || isAdmin() || isEmployee());
      allow create: if isAdmin() || isEmployee();
    }

    // admins helper methods
    function isAdmin() {
      return request.auth != null && exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }

    function isEmployee() {
      return request.auth != null && exists(/databases/$(database)/documents/employees/$(request.auth.uid));
    }

    // Example check for paid plan - adapt to your schema
    function hasPaidPlan(uid) {
      return get(/databases/$(database)/documents/users/$(uid)).data.planType in ['Premium', 'Pro'];
    }
  }
}

Notes:
- The rules above are a starting point. Adjust read/write permissions carefully.
- Keep long-lived admin accounts minimal and use service accounts for server-side writes when possible (your server uses FIREBASE_ADMIN_SVC).
- Test rules via the Firebase Emulator before deploying.
