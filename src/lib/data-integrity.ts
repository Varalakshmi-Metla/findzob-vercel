import crypto from 'crypto';

/**
 * Data Integrity Verification System
 * Protects user sensitive data (subscription, wallet, etc) from tampering
 * Uses HMAC SHA256 for data integrity verification
 */

export interface UserDataChecksum {
  subscriptionHash: string;
  walletHash: string;
  planHash: string;
  timestamp: number;
}

export interface UserDataSnapshot {
  // Subscription/Plan Data
  activePlan?: string;
  planName?: string;
  planExpiry?: string | null;
  planStatus?: string;
  maxHotJobs?: number;
  maxResumes?: number;
  
  // Wallet Data
  walletAmount?: number;
  walletBalance?: number;
  
  // Additional critical fields
  citizenship?: string;
  email?: string;
  userId: string;
}

/**
 * Generate HMAC SHA256 hash for subscription data
 */
export function generateSubscriptionHash(
  secret: string,
  data: {
    activePlan?: string;
    planName?: string;
    planExpiry?: string | null;
    planStatus?: string;
    maxHotJobs?: number;
    maxResumes?: number;
  }
): string {
  const payload = {
    activePlan: data.activePlan || 'none',
    planName: data.planName || 'none',
    planExpiry: data.planExpiry || 'none',
    planStatus: data.planStatus || 'none',
    maxHotJobs: data.maxHotJobs || 0,
    maxResumes: data.maxResumes || 0,
  };
  
  const sortedKeys = Object.keys(payload).sort();
  const hashPayload = sortedKeys
    .map(key => `${key}=${payload[key as keyof typeof payload]}`)
    .join('&');
  
  return crypto.createHmac('sha256', secret).update(hashPayload).digest('hex');
}

/**
 * Generate HMAC SHA256 hash for wallet data
 */
export function generateWalletHash(
  secret: string,
  data: {
    walletAmount?: number;
    walletBalance?: number;
  }
): string {
  const amount = data.walletAmount ?? data.walletBalance ?? 0;
  const hashPayload = `amount=${amount}`;
  return crypto.createHmac('sha256', secret).update(hashPayload).digest('hex');
}

/**
 * Generate HMAC SHA256 hash for plan data
 */
export function generatePlanHash(
  secret: string,
  data: {
    activePlan?: string;
    planName?: string;
    planExpiry?: string | null;
    maxHotJobs?: number;
    maxResumes?: number;
  }
): string {
  const payload = {
    planId: data.activePlan || 'none',
    name: data.planName || 'none',
    expiry: data.planExpiry || 'none',
    maxHotJobs: data.maxHotJobs || 0,
    maxResumes: data.maxResumes || 0,
  };
  
  const sortedKeys = Object.keys(payload).sort();
  const hashPayload = sortedKeys
    .map(key => `${key}=${payload[key as keyof typeof payload]}`)
    .join('&');
  
  return crypto.createHmac('sha256', secret).update(hashPayload).digest('hex');
}

/**
 * Generate complete user data checksum
 */
export function generateUserDataChecksum(
  secret: string,
  userData: UserDataSnapshot
): UserDataChecksum {
  const subscriptionHash = generateSubscriptionHash(secret, {
    activePlan: userData.activePlan,
    planName: userData.planName,
    planExpiry: userData.planExpiry,
    planStatus: userData.planStatus,
    maxHotJobs: userData.maxHotJobs,
    maxResumes: userData.maxResumes,
  });

  const walletHash = generateWalletHash(secret, {
    walletAmount: userData.walletAmount,
    walletBalance: userData.walletBalance,
  });

  const planHash = generatePlanHash(secret, {
    activePlan: userData.activePlan,
    planName: userData.planName,
    planExpiry: userData.planExpiry,
    maxHotJobs: userData.maxHotJobs,
    maxResumes: userData.maxResumes,
  });

  return {
    subscriptionHash,
    walletHash,
    planHash,
    timestamp: Date.now(),
  };
}

/**
 * Verify subscription data integrity
 */
export function verifySubscriptionHash(
  secret: string,
  data: {
    activePlan?: string;
    planName?: string;
    planExpiry?: string | null;
    planStatus?: string;
    maxHotJobs?: number;
    maxResumes?: number;
  },
  expectedHash: string
): boolean {
  const calculatedHash = generateSubscriptionHash(secret, data);
  return calculatedHash === expectedHash;
}

/**
 * Verify wallet data integrity
 */
export function verifyWalletHash(
  secret: string,
  data: {
    walletAmount?: number;
    walletBalance?: number;
  },
  expectedHash: string
): boolean {
  const calculatedHash = generateWalletHash(secret, data);
  return calculatedHash === expectedHash;
}

/**
 * Verify plan data integrity
 */
export function verifyPlanHash(
  secret: string,
  data: {
    activePlan?: string;
    planName?: string;
    planExpiry?: string | null;
    maxHotJobs?: number;
    maxResumes?: number;
  },
  expectedHash: string
): boolean {
  const calculatedHash = generatePlanHash(secret, data);
  return calculatedHash === expectedHash;
}

/**
 * Verify complete user data checksum
 */
export function verifyUserDataChecksum(
  secret: string,
  userData: UserDataSnapshot,
  checksum: UserDataChecksum
): {
  isValid: boolean;
  subscriptionValid: boolean;
  walletValid: boolean;
  planValid: boolean;
} {
  const subscriptionValid = verifySubscriptionHash(secret, {
    activePlan: userData.activePlan,
    planName: userData.planName,
    planExpiry: userData.planExpiry,
    planStatus: userData.planStatus,
    maxHotJobs: userData.maxHotJobs,
    maxResumes: userData.maxResumes,
  }, checksum.subscriptionHash);

  const walletValid = verifyWalletHash(secret, {
    walletAmount: userData.walletAmount,
    walletBalance: userData.walletBalance,
  }, checksum.walletHash);

  const planValid = verifyPlanHash(secret, {
    activePlan: userData.activePlan,
    planName: userData.planName,
    planExpiry: userData.planExpiry,
    maxHotJobs: userData.maxHotJobs,
    maxResumes: userData.maxResumes,
  }, checksum.planHash);

  return {
    isValid: subscriptionValid && walletValid && planValid,
    subscriptionValid,
    walletValid,
    planValid,
  };
}

/**
 * Create a sealed data package with checksum
 * Use this when sending sensitive data to client
 */
export function createSealedDataPackage<T extends UserDataSnapshot>(
  secret: string,
  data: T
) {
  const checksum = generateUserDataChecksum(secret, data);
  return {
    data,
    checksum,
    // Add timestamp for freshness validation
    sealed_at: new Date().toISOString(),
  };
}

/**
 * Verify and unseal data package on client
 */
export function verifySealedDataPackage<T extends UserDataSnapshot>(
  secret: string,
  sealedPackage: {
    data: T;
    checksum: UserDataChecksum;
    sealed_at: string;
  },
  maxAgeMs: number = 5 * 60 * 1000 // 5 minutes default
): {
  valid: boolean;
  data: T | null;
  error: string | null;
  verification: ReturnType<typeof verifyUserDataChecksum> | null;
} {
  try {
    // Check timestamp freshness
    const sealedTime = new Date(sealedPackage.sealed_at).getTime();
    const now = Date.now();
    if (now - sealedTime > maxAgeMs) {
      return {
        valid: false,
        data: null,
        error: 'Data package expired - please refresh',
        verification: null,
      };
    }

    // Verify checksum
    const verification = verifyUserDataChecksum(secret, sealedPackage.data, sealedPackage.checksum);
    
    if (!verification.isValid) {
      console.error('Data integrity check failed', {
        subscriptionValid: verification.subscriptionValid,
        walletValid: verification.walletValid,
        planValid: verification.planValid,
      });
      return {
        valid: false,
        data: null,
        error: 'Data integrity check failed - potential data tampering detected',
        verification,
      };
    }

    return {
      valid: true,
      data: sealedPackage.data,
      error: null,
      verification,
    };
  } catch (err) {
    return {
      valid: false,
      data: null,
      error: `Data verification error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      verification: null,
    };
  }
}

/**
 * Extract and validate critical user data from document
 */
export function extractUserDataSnapshot(userDoc: any): UserDataSnapshot {
  return {
    userId: userDoc.uid || userDoc.id || '',
    activePlan: userDoc.plan?.planId || userDoc.activePlan || '',
    planName: userDoc.plan?.name || userDoc.planName || '',
    planExpiry: userDoc.plan?.expiresAt || userDoc.planExpiry || null,
    planStatus: userDoc.plan?.status || userDoc.planStatus || '',
    maxHotJobs: userDoc.plan?.maxHotJobs || 0,
    maxResumes: userDoc.plan?.maxResumes || 0,
    walletAmount: userDoc.walletAmount || 0,
    walletBalance: userDoc.walletAmount || 0, // Map walletAmount to walletBalance
    citizenship: userDoc.citizenship || '',
    email: userDoc.email || '',
  };
}

/**
 * Detect data tampering by comparing two snapshots
 */
export function detectDataTampering(
  original: UserDataSnapshot,
  current: UserDataSnapshot
): {
  tampered: boolean;
  changes: Record<string, { old: any; new: any }>;
} {
  const changes: Record<string, { old: any; new: any }> = {};
  
  // Check subscription fields
  const subscriptionFields = ['activePlan', 'planName', 'planExpiry', 'planStatus', 'maxHotJobs', 'maxResumes'];
  subscriptionFields.forEach(field => {
    if (original[field as keyof UserDataSnapshot] !== current[field as keyof UserDataSnapshot]) {
      changes[field] = {
        old: original[field as keyof UserDataSnapshot],
        new: current[field as keyof UserDataSnapshot],
      };
    }
  });

  // Check wallet fields
  if ((original.walletAmount || 0) !== (current.walletAmount || 0)) {
    changes.walletAmount = {
      old: original.walletAmount || 0,
      new: current.walletAmount || 0,
    };
  }

  return {
    tampered: Object.keys(changes).length > 0,
    changes,
  };
}
