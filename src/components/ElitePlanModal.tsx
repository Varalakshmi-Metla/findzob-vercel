'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, X } from 'lucide-react';

interface ElitePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ElitePlanModal({ isOpen, onClose }: ElitePlanModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    company: '',
    phone: '',
    requirements: '',
    budget: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.fullName || !formData.email) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please fill in your name and email address.'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/send-elite-inquiry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send inquiry');
      }

      toast({
        title: 'Inquiry Sent Successfully',
        description: 'We will contact you soon about the Elite Add-Ons plan.',
        variant: 'default',
      });

      // Reset form
      setFormData({
        fullName: '',
        email: '',
        company: '',
        phone: '',
        requirements: '',
        budget: '',
      });

      onClose();
    } catch (error: any) {
      console.error('Elite plan inquiry error:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to Send',
        description: error.message || 'Failed to send your inquiry. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-950 border-blue-500/30">
        <DialogHeader>
          <DialogTitle className="text-2xl bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Elite Add-Ons Plan Inquiry
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Tell us about your needs and we'll create a customized solution for you.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-gray-300">
              Full Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="fullName"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="John Doe"
              className="bg-slate-900 border-slate-700 text-white placeholder-gray-500"
              disabled={isSubmitting}
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-gray-300">
              Email Address <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="john@example.com"
              className="bg-slate-900 border-slate-700 text-white placeholder-gray-500"
              disabled={isSubmitting}
            />
          </div>

          {/* Company */}
          <div className="space-y-2">
            <Label htmlFor="company" className="text-gray-300">
              Company Name
            </Label>
            <Input
              id="company"
              name="company"
              value={formData.company}
              onChange={handleChange}
              placeholder="Your Company Ltd."
              className="bg-slate-900 border-slate-700 text-white placeholder-gray-500"
              disabled={isSubmitting}
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-gray-300">
              Phone Number
            </Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+1 (555) 000-0000"
              className="bg-slate-900 border-slate-700 text-white placeholder-gray-500"
              disabled={isSubmitting}
            />
          </div>

          {/* Requirements */}
          <div className="space-y-2">
            <Label htmlFor="requirements" className="text-gray-300">
              Your Requirements & Use Case
            </Label>
            <Textarea
              id="requirements"
              name="requirements"
              value={formData.requirements}
              onChange={handleChange}
              placeholder="Tell us about your specific needs, team size, volume requirements, and any special features you're looking for..."
              rows={4}
              className="bg-slate-900 border-slate-700 text-white placeholder-gray-500 resize-none"
              disabled={isSubmitting}
            />
          </div>

          {/* Budget */}
          <div className="space-y-2">
            <Label htmlFor="budget" className="text-gray-300">
              Budget Range (Optional)
            </Label>
            <Input
              id="budget"
              name="budget"
              value={formData.budget}
              onChange={handleChange}
              placeholder="e.g., $5,000 - $10,000 per month"
              className="bg-slate-900 border-slate-700 text-white placeholder-gray-500"
              disabled={isSubmitting}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-slate-600 text-gray-300 hover:bg-slate-800"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Inquiry
                </>
              )}
            </Button>
          </div>

          <p className="text-xs text-gray-500 text-center pt-2">
            Our team will review your inquiry and contact you within 24 hours.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
