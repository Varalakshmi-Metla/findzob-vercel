import { NextRequest, NextResponse } from 'next/server';
import { adminApp } from '@/lib/firebase-admin';
import { Auth, getAuth, UserRecord } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

async function listAllUsers(auth: Auth): Promise<UserRecord[]> {
    const allUsers: UserRecord[] = [];
    let pageToken;
    do {
        const listUsersResult = await auth.listUsers(1000, pageToken);
        allUsers.push(...listUsersResult.users);
        pageToken = listUsersResult.pageToken;
    } while (pageToken);
    return allUsers;
}

export async function GET(request: NextRequest) {
    try {
    const auth = getAuth(adminApp);
    const firestore = getFirestore(adminApp);

        // Get all users from Firebase Auth
        const authUsers = await listAllUsers(auth);
        const totalAuthUsers = authUsers.length;

        // Get all users from Firestore
        const firestoreUsersSnapshot = await firestore.collection('users').get();
        const firestoreUsers = firestoreUsersSnapshot.docs.map(doc => doc.data());

        // Calculate stats from Firestore users
        const totalFirestoreUsers = firestoreUsers.length;
        const employeeCount = firestoreUsers.filter(u => u.role === 'employee').length;
        const nonEmployeeUsers = firestoreUsers.filter(u => u.role !== 'employee');
        const totalNonEmployeeUsers = nonEmployeeUsers.length;
        const onboardedCount = nonEmployeeUsers.filter(u => u.profileCompleted === true).length;
        
        const planCounts: Record<string, number> = {};
        let estimatedMRR = 0;
        const planPrices: Record<string, number> = { Free: 0, Starter: 29, Pro: 99, Enterprise: 299 }; // Assuming from user page snippet
        
        nonEmployeeUsers.forEach(u => {
            const plan = u.subscription?.plan || 'Free';
            planCounts[plan] = (planCounts[plan] || 0) + 1;
            estimatedMRR += planPrices[plan] ?? 0;
        });

        const starterOnboarded = nonEmployeeUsers.filter(u => (u.subscription?.plan || '').toLowerCase() === 'starter' && u.profileCompleted === true).length;

        const stats = {
            totalAuthUsers,
            totalFirestoreUsers,
            totalNonEmployeeUsers,
            employeeCount,
            onboardedCount,
            starterOnboarded,
            planCounts,
            estimatedMRR,
        };

        return NextResponse.json(stats);
    } catch (error: any) {
        console.error('Error getting user stats:', error);
        return new NextResponse(JSON.stringify({ error: 'Failed to get user stats' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}
