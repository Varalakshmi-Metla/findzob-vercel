import { useEffect, useState, useCallback } from 'react';
import {
  extractUserDataSnapshot,
  generateUserDataChecksum,
  verifyUserDataChecksum,
  detectDataTampering,
  UserDataSnapshot,
  UserDataChecksum,
} from '@/lib/data-integrity';

interface DataIntegrityState {
  isVerified: boolean;
  isTampered: boolean;
  error: string | null;
  checksum: UserDataChecksum | null;
  changes: Record<string, { old: any; new: any }>;
}

/**
 * Hook for verifying user data integrity
 * Generates checksum on initial fetch and verifies on subsequent reads
 */
export function useDataIntegrity(userDoc: any | null) {
  const secret = process.env.NEXT_PUBLIC_DATA_INTEGRITY_SECRET || 'default_secret';
  
  const [state, setState] = useState<DataIntegrityState>({
    isVerified: false,
    isTampered: false,
    error: null,
    checksum: null,
    changes: {},
  });

  const [lastSnapshot, setLastSnapshot] = useState<UserDataSnapshot | null>(null);

  // Generate initial checksum when user data loads
  useEffect(() => {
    if (!userDoc) {
      setState(prev => ({ ...prev, isVerified: false }));
      return;
    }

    try {
      const snapshot = extractUserDataSnapshot(userDoc);
      const checksum = generateUserDataChecksum(secret, snapshot);

      // Store first snapshot for comparison
      if (!lastSnapshot) {
        setLastSnapshot(snapshot);
      }

      setState({
        isVerified: true,
        isTampered: false,
        error: null,
        checksum,
        changes: {},
      });
    } catch (err) {
      setState({
        isVerified: false,
        isTampered: false,
        error: `Data extraction error: ${err instanceof Error ? err.message : 'Unknown'}`,
        checksum: null,
        changes: {},
      });
    }
  }, [userDoc, secret, lastSnapshot]);

  // Verify data against checksum
  const verifyData = useCallback((snapshot: UserDataSnapshot) => {
    if (!state.checksum) {
      return {
        valid: false,
        error: 'No checksum available',
      };
    }

    try {
      const verification = verifyUserDataChecksum(secret, snapshot, state.checksum);

      if (!verification.isValid) {
        console.error('Data integrity verification failed', verification);
      }

      return {
        valid: verification.isValid,
        error: verification.isValid ? null : 'Data integrity check failed',
        verification,
      };
    } catch (err) {
      return {
        valid: false,
        error: `Verification error: ${err instanceof Error ? err.message : 'Unknown'}`,
      };
    }
  }, [state.checksum, secret]);

  // Check for tampering
  const checkForTampering = useCallback(() => {
    if (!userDoc || !lastSnapshot) {
      return {
        tampered: false,
        changes: {},
      };
    }

    try {
      const currentSnapshot = extractUserDataSnapshot(userDoc);
      const tampering = detectDataTampering(lastSnapshot, currentSnapshot);

      if (tampering.tampered) {
        console.warn('Potential data tampering detected', tampering.changes);
        setState(prev => ({
          ...prev,
          isTampered: true,
          changes: tampering.changes,
        }));
      }

      return {
        tampered: tampering.tampered,
        changes: tampering.changes,
      };
    } catch (err) {
      console.error('Tampering check error:', err);
      return {
        tampered: false,
        changes: {},
      };
    }
  }, [userDoc, lastSnapshot]);

  return {
    ...state,
    verifyData,
    checkForTampering,
    snapshot: lastSnapshot,
  };
}

/**
 * Hook for monitoring wallet balance integrity
 */
export function useWalletIntegrity(userDoc: any | null) {
  const secret = process.env.NEXT_PUBLIC_DATA_INTEGRITY_SECRET || 'default_secret';
  
  const [walletState, setWalletState] = useState<{
    lastValidBalance: number | null;
    isValid: boolean;
    error: string | null;
  }>({
    lastValidBalance: null,
    isValid: true,
    error: null,
  });

  useEffect(() => {
    if (!userDoc) return;

    try {
      const currentBalance = userDoc.walletAmount || 0;

      // If we have a previously validated balance
      if (walletState.lastValidBalance !== null) {
        // Only allow decreases (deductions) or small increases (credited)
        const diff = currentBalance - walletState.lastValidBalance;
        
        // Large sudden increases are suspicious
        if (diff > 100) {
          setWalletState({
            lastValidBalance: walletState.lastValidBalance,
            isValid: false,
            error: `Suspicious wallet increase detected: ₹${diff}`,
          });
          console.warn('Wallet tampering detected', { old: walletState.lastValidBalance, new: currentBalance });
          return;
        }
      }

      setWalletState({
        lastValidBalance: currentBalance,
        isValid: true,
        error: null,
      });
    } catch (err) {
      setWalletState({
        lastValidBalance: null,
        isValid: false,
        error: `Wallet check error: ${err instanceof Error ? err.message : 'Unknown'}`,
      });
    }
  }, [userDoc?.walletAmount]);

  return walletState;
}

/**
 * Hook for monitoring subscription integrity
 */
export function useSubscriptionIntegrity(userDoc: any | null) {
  const [subscriptionState, setSubscriptionState] = useState<{
    isValid: boolean;
    error: string | null;
    detectedChanges: string[];
  }>({
    isValid: true,
    error: null,
    detectedChanges: [],
  });

  const [lastSubscription, setLastSubscription] = useState<any>(null);

  useEffect(() => {
    if (!userDoc) return;

    try {
      const currentPlan = userDoc.plan || {};
      const detectedChanges: string[] = [];

      if (lastSubscription) {
        // Check for suspicious changes
        if (lastSubscription.expiresAt !== currentPlan.expiresAt) {
          // Expiry date changed - acceptable if renewed
          detectedChanges.push(`Plan expiry changed from ${lastSubscription.expiresAt} to ${currentPlan.expiresAt}`);
        }

        if (lastSubscription.maxHotJobs && currentPlan.maxHotJobs && 
            currentPlan.maxHotJobs > lastSubscription.maxHotJobs) {
          // Increased max hot jobs - check if suspicious
          const increase = currentPlan.maxHotJobs - lastSubscription.maxHotJobs;
          if (increase > 100) {
            detectedChanges.push(`Suspicious hot jobs increase: +${increase}`);
            setSubscriptionState({
              isValid: false,
              error: `Suspicious subscription modification detected`,
              detectedChanges,
            });
            console.warn('Subscription tampering detected', { old: lastSubscription, new: currentPlan });
            return;
          }
        }

        if (lastSubscription.status && lastSubscription.status !== currentPlan.status) {
          detectedChanges.push(`Subscription status changed from ${lastSubscription.status} to ${currentPlan.status}`);
        }
      }

      setLastSubscription(currentPlan);
      setSubscriptionState({
        isValid: true,
        error: null,
        detectedChanges,
      });
    } catch (err) {
      setSubscriptionState({
        isValid: false,
        error: `Subscription check error: ${err instanceof Error ? err.message : 'Unknown'}`,
        detectedChanges: [],
      });
    }
  }, [userDoc?.plan, lastSubscription]);

  return subscriptionState;
}
