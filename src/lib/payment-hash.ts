import crypto from 'crypto';

/**
 * Generate a HMAC SHA256 hash for payment integrity.
 * @param secret Secret key (from env)
 * @param data Object containing payment details (amount, userId, planId, etc)
 * @returns Hex string hash
 */
export function generatePaymentHash(secret: string, data: Record<string, any>): string {
  // Sort keys for deterministic hash
  const sortedKeys = Object.keys(data).sort();
  const payload = sortedKeys.map(key => `${key}=${data[key]}`).join('&');
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Verify a payment hash
 * @param secret Secret key
 * @param data Payment data
 * @param hash Hash to verify
 * @returns true if valid
 */
export function verifyPaymentHash(secret: string, data: Record<string, any>, hash: string): boolean {
  return generatePaymentHash(secret, data) === hash;
}
