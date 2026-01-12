// This file has been removed as part of payment/billing removal.

import Stripe from 'stripe';
import { Firestore } from 'firebase-admin/firestore';

let stripe: Stripe | null = null;

export function getStripe() {
    if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error('Missing STRIPE_SECRET_KEY environment variable.');
    }
    if (!stripe) {
        stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
    }
    return stripe;
}

/**
 * Gets or creates a Stripe customer for a given Firebase user ID.
 *
 * @param userId The Firebase user ID.
 * @param firestore The Firestore database instance.
 * @returns The Stripe customer object.
 */
export async function getOrCreateStripeCustomer(userId: string, firestore: Firestore): Promise<Stripe.Customer> {
  const userDocRef = firestore.collection('users').doc(userId);
  const userDoc = await userDocRef.get();
  const userData = userDoc.data();
  const stripeClient = getStripe();

  if (userData?.stripeCustomerId) {
    try {
      const customer = await stripeClient.customers.retrieve(userData.stripeCustomerId);
      if (customer.deleted) {
        // This customer was deleted in Stripe, so create a new one.
        throw new Error('Customer deleted in Stripe.'); 
      }
      return customer as Stripe.Customer;
    } catch (error) {
      // Could be deleted or invalid ID, so proceed to create a new one.
      console.warn('Could not retrieve Stripe customer, creating a new one.');
    }
  }

  if (!userData?.email) {
    throw new Error('User email is missing, which is required for creating a Stripe customer.');
  }

  const customer = await stripeClient.customers.create({
    email: userData.email,
    metadata: { firebaseUserId: userId },
  });
  await userDocRef.set({ stripeCustomerId: customer.id }, { merge: true });
  return customer;
}
