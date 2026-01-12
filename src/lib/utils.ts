import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function base64ToBlob(base64: string, contentType: string) {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: contentType });
}

/**
 * Format a name into Title Case (e.g. "john DOE" -> "John Doe").
 * If input is falsy returns empty string.
 */
export function formatName(name?: string | null) {
  if (!name) return '';
  return String(name)
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Get up to two initials from a name. Returns uppercase initials (e.g. "John Doe" -> "JD").
 */
export function getInitials(name?: string | null) {
  if (!name) return 'U';
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
}

/**
 * Convert Firestore objects (with toJSON methods) to plain JavaScript objects.
 * Handles Firestore Timestamps and other Firestore types.
 */
export function convertFirestoreToPlain(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj !== 'object') return obj;
  
  // Handle Firestore Timestamp objects (has toDate method)
  if (typeof obj.toDate === 'function') {
    return obj.toDate().toISOString();
  }
  
  // Handle Firestore objects with toJSON method
  if (typeof obj.toJSON === 'function') {
    return obj.toJSON();
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => convertFirestoreToPlain(item));
  }
  
  // Handle regular objects - recursively convert all properties
  const plain: any = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      plain[key] = convertFirestoreToPlain(obj[key]);
    }
  }
  return plain;
}
