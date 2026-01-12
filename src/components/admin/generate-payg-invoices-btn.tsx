import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function GeneratePaygInvoicesButton() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setSuccess(false);
    setError(null);
    try {
      const res = await fetch('/api/admin/generate-payg-invoices', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to trigger invoice generation');
      setSuccess(true);
    } catch (e: any) {
      setError(e.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="my-4">
      {success && <div className="text-green-600 mt-2">Invoices generated successfully!</div>}
      {error && <div className="text-red-600 mt-2">{error}</div>}
    </div>
  );
}
