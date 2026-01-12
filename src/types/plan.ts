export interface Plan {
  id: string;
  name: string;
  price: number;
  description?: string;
  currency?: string;
  category?: string; // 'service' | 'membership'
  validity?: number; // in days
}
