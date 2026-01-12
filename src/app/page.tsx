'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FloatingChatBox } from '@/components/FloatingChatBox';
import { ElitePlanModal } from '@/components/ElitePlanModal';
import { useRouter } from 'next/navigation';
import { plans as plansFromSeed } from './plans-static';
import {
  Briefcase,
  UserPlus,
  User,
  Search,
  FileText,
  Send,
  BarChart3,
  GraduationCap,
  CheckCircle,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Zap,
  Target,
  Shield,
  Clock,
  Star,
  Play,
  ArrowUpRight,
  Sparkles,
  Building,
  MapPin,
  DollarSign,
  Crown,
  Menu,
  X,
} from 'lucide-react';
import { collection } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';

import {
  UserPlusIcon,
  IdentificationIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  InboxArrowDownIcon,
  ChartBarIcon,
  AcademicCapIcon,
} from "@heroicons/react/24/solid";

// Types for better type safety
interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  category: 'membership' | 'service';
  billingCycle: string;
  features: string[];
}

interface HotJob {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  type: string;
  logo?: string;
}

interface Testimonial {
  name: string;
  role: string;
  content: string;
  avatar: string;
}

// Firestore Hot Jobs fetching
function useHotJobs(collectionName: string) {
  const firestore = useFirestore();
  const hotJobsCollectionRef = useMemoFirebase(
    () => firestore ? collection(firestore, collectionName) : null, 
    [firestore, collectionName]
  );
  const { data: hotJobs, isLoading } = useCollection<HotJob>(hotJobsCollectionRef);
  return { hotJobs: hotJobs || [], isLoading };
}

/**
 * Enh anced design with professional dark theme
 * Plan selection flows to signup with selected plan
 * Hot Jobs section with major companies
 */

/* ---------- Data ---------- */
const steps = [
  { title: 'Register & Submit Resume', description: 'Sign up and provide your resume brief, personal info, and job keywords. Our onboarding is fast and secure.', icon: UserPlus },
  { title: 'Profile Completion', description: 'Our team completes your job-seeker profile for maximum impact, ensuring all details are ready for applications.', icon: User },
  { title: 'Job Scouting', description: 'Our expert team scouts relevant jobs and presents them in your portal. You review and authorize which jobs to pursue.', icon: Search },
  { title: 'Tailored Resumes', description: 'Z (your HR agent) and our resume experts create custom resumes for each authorized job, maximizing your selection chances.', icon: FileText },
  { title: 'Application Submission', description: 'Z navigates and fills out job applications on your behalf, saving you hours of tedious work.', icon: Send },
  { title: 'Status Tracking', description: 'Track all your applications and get real-time updates and follow-ups directly in your portal from Z.', icon: BarChart3 },
  { title: 'Interview Prep', description: 'Z and our career coaches help you prepare for interviews, leveraging prior application & interview history for tailored coaching.', icon: GraduationCap },
];

const features = [
  { icon: <Zap className="h-6 w-6 sm:h-8 sm:w-8" />, title: 'Expert-Powered Automation', description: 'Our team of career experts handles job applications while you focus on career growth and interview preparation.' },
  { icon: <Target className="h-6 w-6 sm:h-8 sm:w-8" />, title: 'Smart Job Matching', description: 'Get matched with opportunities that truly fit your skills, experience, and career aspirations through expert human guidance.' },
  { icon: <Shield className="h-6 w-6 sm:h-8 sm:w-8" />, title: 'Secure & Confidential', description: 'Your data is protected with enterprise-grade security throughout the job search process.' },
  { icon: <Clock className="h-6 w-6 sm:h-8 sm:w-8" />, title: '24/7 Availability', description: 'Our team works around the clock to scout opportunities and submit applications.' },
];

// Use static plans from seed-plans.ts
function usePlans() {
  return { plans: plansFromSeed as Plan[], isLoading: false };
}

const testimonials: Testimonial[] = [
  { name: 'Sarah Chen', role: 'Product Manager', content: 'Found my dream job in 3 weeks instead of 3 months. The FindZob expert matching was incredibly accurate.', avatar: '/avatars/sarah.jpg' },
  { name: 'Marcus Johnson', role: 'Software Engineer', content: 'Saved 20+ hours per week on applications. The expert interview prep was game-changing.', avatar: '/avatars/marcus.jpg' },
  { name: 'Elena Rodriguez', role: 'Marketing Director', content: 'The expert-crafted resumes got me 3x more interview calls. Worth every penny.', avatar: '/avatars/elena.jpg' },
];

/* ---------- Enhanced Components ---------- */
const Spotlight: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={`relative overflow-hidden rounded-3xl ${className}`}>
    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 blur-xl" />
    {children}
  </div>
);

// Import missing components - adjust paths as needed
import { GlowCard } from '@/components/ui/GlowCard';
import HotJobsSection from '@/components/HotJobsSection';

/* ---------- Plan Selection Hook ---------- */
const usePlanSelection = () => {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const router = useRouter();

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
    sessionStorage.setItem('selectedPlan', planId);
    router.push(`/signup?plan=${planId}`);
  };

  return { selectedPlan, handlePlanSelect };
};

/* ---------- Enhanced ProcessSteps ---------- */
const ProcessSteps: React.FC = () => {
  return (
    <section id="process" className="py-12 sm:py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900/50 to-black/50" />
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="mx-auto max-w-4xl text-center mb-8 sm:mb-16">
          <div className="inline-flex items-center gap-2 sm:gap-3 pb-3 sm:pb-4">
            <div className="h-px w-4 sm:w-8 bg-gradient-to-r from-transparent to-blue-500" />
            <span className="text-xs sm:text-sm font-semibold text-blue-400 uppercase tracking-wider">How Z Works</span>
            <div className="h-px w-4 sm:w-8 bg-gradient-to-l from-transparent to-blue-500" />
          </div>
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold text-white mb-3 sm:mb-4">
            The <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">FindZob</span> Advantage
          </h2>
          <p className="text-gray-400 text-sm sm:text-lg max-w-2xl mx-auto px-2 sm:px-0">
            Our proven 7-step process combines human expertise with personalized service to accelerate your career growth.
          </p>
        </div>

        {/* Steps as Cards Grid - Informational Only */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-7xl mx-auto">
          {steps.map((step, index) => {
            const Icon = step.icon;
            
            return (
              <GlowCard 
                key={step.title}
                className="transition-all duration-300 hover:scale-105"
              >
                <div className="p-4 sm:p-6 h-full">
                  {/* Step Number and Icon */}
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                        <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      </div>
                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs sm:text-sm font-bold">
                        {index + 1}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {[1, 2, 3].map((dot) => (
                        <div key={dot} className="w-1 h-1 sm:w-2 sm:h-2 bg-blue-400 rounded-full" />
                      ))}
                    </div>
                  </div>

                  {/* Content */}
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-2 sm:mb-3">
                    {step.title}
                  </h3>
                  <p className="text-gray-300 text-xs sm:text-sm leading-relaxed">
                    {step.description}
                  </p>

                  {/* Progress Indicator */}
                  <div className="mt-3 sm:mt-4 flex items-center gap-2">
                    <div className="w-1 h-1 sm:w-2 sm:h-2 rounded-full bg-blue-400" />
                    <span className="text-blue-400 text-xs font-medium">
                      Step {index + 1}
                    </span>
                  </div>
                </div>
              </GlowCard>
            );
          })}
        </div>

        {/* Process Summary */}
        <div className="mt-8 sm:mt-16 max-w-4xl mx-auto">
          <Spotlight>
            <div className="rounded-3xl p-6 sm:p-8 md:p-12 text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg mx-auto mb-4 sm:mb-6">
                <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>
              
              <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-3 sm:mb-4">
                Complete Job Search Solution
              </h3>
              
              <p className="text-gray-300 text-sm sm:text-lg leading-relaxed mb-4 sm:mb-6 max-w-3xl mx-auto">
                From initial registration to interview preparation, our comprehensive 7-step process ensures 
                you have the best chance of landing your dream job. Our expert team handles the tedious work while you focus 
                on what matters most - your career growth.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-400">
                <div className="flex items-center gap-1 sm:gap-2">
                  <div className="w-1 h-1 sm:w-2 sm:h-2 bg-green-400 rounded-full" />
                  <span>Expert-Powered</span>
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <div className="w-1 h-1 sm:w-2 sm:h-2 bg-blue-400 rounded-full" />
                  <span>24/7 Support</span>
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <div className="w-1 h-1 sm:w-2 sm:h-2 bg-cyan-400 rounded-full" />
                  <span>Proven Results</span>
                </div>
              </div>
            </div>
          </Spotlight>
        </div>
      </div>
    </section>
  );
};

/* ---------- Enhanced Testimonial Card ---------- */
const TestimonialCard: React.FC<{ testimonial: Testimonial }> = ({ testimonial }) => {
  return (
    <GlowCard className="h-full">
      <div className="p-4 sm:p-6 h-full flex flex-col">
        <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold">
            {testimonial.name.charAt(0)}
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm sm:text-base">{testimonial.name}</h4>
            <p className="text-gray-400 text-xs sm:text-sm">{testimonial.role}</p>
          </div>
        </div>
        <p className="text-gray-300 text-xs sm:text-sm leading-relaxed flex-1">{testimonial.content}</p>
        <div className="flex gap-1 mt-3 sm:mt-4">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star key={star} className="w-3 h-3 sm:w-4 sm:h-4 fill-yellow-400 text-yellow-400" />
          ))}
        </div>
      </div>
    </GlowCard>
  );
};

/* ---------- Enhanced Pricing Section ---------- */
interface PricingSectionProps {
  currency: 'usd' | 'inr';
  setCurrency: (c: 'usd' | 'inr') => void;
  showCurrencyDropdown: boolean;
  setShowCurrencyDropdown: (v: boolean) => void;
  setElitePlanModalOpen: (v: boolean) => void;
}

const PricingSection: React.FC<PricingSectionProps> = ({ 
  currency, 
  setCurrency, 
  showCurrencyDropdown, 
  setShowCurrencyDropdown,
  setElitePlanModalOpen
}) => {
  const { handlePlanSelect } = usePlanSelection();
  const { plans, isLoading } = usePlans();
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoFetched, setGeoFetched] = useState(false);

  // Helper to format numbers with commas
  function formatAmount(amount: number | string, currency: string): string {
    let numAmount: number;
    
    if (typeof amount === 'string') {
      numAmount = parseFloat(amount.replace(/[^\d.]/g, ''));
    } else {
      numAmount = amount;
    }
    
    if (currency.toLowerCase() === 'inr') {
      return numAmount.toLocaleString('en-IN');
    }
    return numAmount.toLocaleString('en-US');
  }

  // Geolocation: auto-detect country and set currency (runs once)
  useEffect(() => {
    if (!geoFetched && typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const { latitude, longitude } = pos.coords;
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
              {
                headers: {
                  'User-Agent': 'FindZob-App/1.0'
                }
              }
            );
            const data = await res.json();
            const country = data.address?.country_code || '';
            if (country.toLowerCase() === 'in') {
              setCurrency('inr');
            } else {
              setCurrency('usd');
            }
            setGeoFetched(true);
          } catch (e) {
            console.error('Geolocation error:', e);
            setGeoError('Could not auto-detect location.');
            setGeoFetched(true);
          }
        },
        (err) => {
          console.warn('Geolocation permission denied:', err);
          setGeoError('Location permission denied or unavailable.');
          setGeoFetched(true);
        },
        { timeout: 5000 }
      );
    }
  }, [geoFetched, setCurrency]);

  const membershipPlans = plans.filter(
    plan => plan.category === 'membership' && 
           (plan.currency?.toUpperCase?.() === currency.toUpperCase()) && 
           plan.id !== 'free'
  );
  
  const servicePlans = plans.filter(
    plan => plan.category === 'service' &&
           (plan.currency?.toUpperCase?.() === currency.toUpperCase()) &&
           // Hide Elite plan for India (INR)
           !(currency.toLowerCase() === 'inr' && plan.name?.toLowerCase().includes('elite'))
  );

  return (
    <section id="pricing" className="py-12 sm:py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900/50 to-black/50" />
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-8 sm:mb-16">
          <div className="inline-flex items-center gap-2 sm:gap-3 pb-3 sm:pb-4">
            <div className="h-px w-4 sm:w-8 bg-gradient-to-r from-transparent to-blue-500" />
            <span className="text-xs sm:text-sm font-semibold text-blue-400 uppercase tracking-wider">Pricing</span>
            <div className="h-px w-4 sm:w-8 bg-gradient-to-l from-transparent to-blue-500" />
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 sm:mb-4">
            Simple, <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Transparent</span> Pricing
          </h2>
          <p className="text-gray-400 text-sm sm:text-base md:text-lg max-w-2xl mx-auto px-2">
            Choose the perfect plan for your job search journey. Start with membership, then add services as needed.
          </p>
        </div>

        {geoError && (
          <div className="text-center mb-6 sm:mb-8">
            <span className="text-xs text-blue-300 bg-blue-500/10 px-3 py-1.5 rounded-full border border-blue-500/20">
              {geoError}
            </span>
          </div>
        )}

        {/* Membership Plans */}
        {membershipPlans.length > 0 && (
          <div className="max-w-6xl mx-auto mb-8 sm:mb-16">
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white text-center mb-4 sm:mb-6 md:mb-8">
              Membership Plans
            </h3>
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
              {membershipPlans.map((plan) => (
                <div key={plan.id} className="relative group w-full max-w-xs flex-shrink-0">
                  <div className={`absolute inset-0 rounded-xl sm:rounded-2xl md:rounded-3xl blur-lg opacity-20 group-hover:opacity-30 transition duration-1000 group-hover:duration-200 ${
                    plan.name?.toLowerCase().includes('lifetime')
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500'
                      : 'bg-gradient-to-r from-gray-600 to-gray-500'
                  }`} />
                  <div className={`relative rounded-xl sm:rounded-2xl md:rounded-3xl p-4 sm:p-6 md:p-8 border-2 ${
                    plan.name?.toLowerCase().includes('lifetime')
                      ? 'bg-gray-900/80 border-blue-500/30 backdrop-blur-sm'
                      : 'bg-gray-900/60 border-gray-700/50 backdrop-blur-sm flex flex-col'
                  }`}>
                    <div className="text-center mb-3 sm:mb-4 md:mb-6">
                      <div className={`w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-lg sm:rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-2 sm:mb-3 md:mb-4 ${
                        plan.name?.toLowerCase().includes('lifetime')
                          ? 'bg-gradient-to-br from-blue-500 to-cyan-500'
                          : 'bg-gradient-to-br from-gray-500 to-gray-600'
                      }`}>
                        {plan.name?.toLowerCase().includes('lifetime') ? (
                          <Crown className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" />
                        ) : (
                          <User className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" />
                        )}
                      </div>
                      <h3 className="text-base sm:text-lg md:text-xl font-bold text-white mb-1 sm:mb-2">
                        {plan.name}
                      </h3>
                      <p className="text-gray-400 text-xs sm:text-sm">
                        {plan.description}
                      </p>
                    </div>
                    <div className="text-center mb-3 sm:mb-4 md:mb-6">
                      <div className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1 sm:mb-2">
                        {plan.currency.toLowerCase() === 'inr' 
                          ? `₹${formatAmount(plan.price, 'inr')}`
                          : `$${formatAmount(plan.price, 'usd')}`
                        }
                      </div>
                      <div className="text-gray-400 text-xs sm:text-sm">
                        {plan.billingCycle === 'one-time' ? 'one-year' : plan.billingCycle}
                      </div>
                    </div>
                    <ul className="space-y-1 sm:space-y-2 md:space-y-3 mb-3 sm:mb-4 md:mb-6 flex-1">
                      {plan.features?.map((feature: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 sm:gap-3 text-gray-300">
                          <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-green-400 flex-shrink-0 mt-0.5" />
                          <span className="text-xs sm:text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => handlePlanSelect(plan.id)}
                      className={`w-full ${
                        plan.name?.toLowerCase().includes('lifetime')
                          ? 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white py-2 sm:py-3 md:py-4 rounded-lg sm:rounded-xl font-bold text-sm sm:text-base md:text-lg shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2'
                          : 'bg-gray-800 hover:bg-gray-700 text-white py-2 sm:py-3 md:py-4 rounded-lg sm:rounded-xl font-bold text-sm sm:text-base md:text-lg border border-gray-600 hover:border-gray-500 transition-all duration-300 flex items-center justify-center gap-2'
                      }`}
                    >
                      {plan.name?.toLowerCase().includes('lifetime') ? 'Get Started' : 'Choose Plan'}
                      <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-xs sm:text-sm px-2">
                All memberships include access to our platform. Service plans are purchased separately based on your needs.
              </p>
            </div>
          </div>
        )}

        {/* Service Plans */}
        {servicePlans.length > 0 && (
          <div className="max-w-7xl mx-auto">
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white text-center mb-4 sm:mb-6 md:mb-8">
              Service Plans
            </h3>
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
              {servicePlans.map((plan, idx) => {
                const isPro = plan.name?.toLowerCase().includes('pro');
                const isElite = plan.name?.toLowerCase().includes('elite');
                const displayPrice = plan.price;
                const displayCurrency = plan.currency || 'usd';
                const isVariablePrice = typeof displayPrice === 'string' || isElite;
                const formattedPrice = isVariablePrice 
                  ? '' 
                  : (displayCurrency.toLowerCase() === 'inr'
                    ? `₹${formatAmount(displayPrice, 'inr')}`
                    : `$${formatAmount(displayPrice, 'usd')}`);
                
                let planKey = `${plan.id}-${plan.currency || 'usd'}-${idx}`;
                
                return (
                  <div key={planKey} className="relative group w-full max-w-xs flex-shrink-0">
                    <div className={`absolute inset-0 rounded-xl sm:rounded-2xl md:rounded-3xl blur-lg opacity-20 group-hover:opacity-30 transition duration-1000 group-hover:duration-200 ${
                      isPro
                        ? 'bg-gradient-to-r from-blue-500 to-cyan-500'
                        : 'bg-gradient-to-r from-gray-500 to-gray-600'
                    }`} />
                    <div className={`relative rounded-xl sm:rounded-2xl md:rounded-3xl p-4 sm:p-6 md:p-8 backdrop-blur-sm h-full border transition-all duration-300 ${
                      isPro
                        ? 'bg-gray-900/80 border-blue-500/30 group-hover:border-blue-500/50'
                        : 'bg-gray-900/60 border-gray-700/30 group-hover:border-gray-600/50'
                    }`}>
                      {isPro && (
                        <div className="absolute -top-2 sm:-top-3 left-1/2 transform -translate-x-1/2">
                          <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-2 sm:px-3 md:px-4 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                            <Zap className="w-2 h-2 sm:w-3 sm:h-3" />
                            Most Popular
                          </div>
                        </div>
                      )}
                      <div className="text-center mb-3 sm:mb-4 md:mb-6">
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-lg sm:rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-2 sm:mb-3 md:mb-4 ${
                          isPro
                            ? 'bg-gradient-to-br from-blue-500 to-cyan-500'
                            : 'bg-gradient-to-br from-gray-500 to-gray-600'
                        }`}>
                          {isPro ? (
                            <Zap className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
                          ) : (
                            <Briefcase className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
                          )}
                        </div>
                        <h3 className="text-base sm:text-lg md:text-xl font-bold text-white mb-1 sm:mb-2">
                          {plan.name}
                        </h3>
                        <p className="text-gray-400 text-xs sm:text-sm">
                          {plan.description}
                        </p>
                      </div>
                      <div className="text-center mb-3 sm:mb-4 md:mb-6">
                        {isElite ? (
                          <div className="text-lg sm:text-xl md:text-2xl font-bold text-transparent bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text mb-2">
                            Custom Pricing
                          </div>
                        ) : (
                          <div className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1">
                            {formattedPrice}
                          </div>
                        )}
                        {!isVariablePrice && !isElite && (
                          <div className="text-gray-400 text-xs sm:text-sm">
                            {plan.billingCycle === 'one-time' 
                              ? 'one-time payment' 
                              : plan.billingCycle === 'monthly' 
                                ? 'per month' 
                                : 'per application'
                            }
                          </div>
                        )}
                      </div>
                      <ul className="space-y-1 sm:space-y-2 md:space-y-3 mb-3 sm:mb-4 md:mb-6">
                        {plan.features?.map((feature: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2 sm:gap-3 text-xs sm:text-sm">
                            <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-400 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-300">{feature}</span>
                          </li>
                        ))}
                      </ul>
                      {isElite && (
                        <button
                          onClick={() => setElitePlanModalOpen(true)}
                          className="w-full block text-center bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white py-2 sm:py-3 md:py-4 rounded-lg sm:rounded-xl font-bold text-sm sm:text-base md:text-lg shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 transform hover:scale-105"
                        >
                          Contact Us
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Plan Comparison Tables */}
            {currency.toLowerCase() === 'usd' && (
              <div className="bg-gray-900/40 rounded-xl sm:rounded-2xl md:rounded-3xl p-3 sm:p-4 md:p-6 lg:p-8 border border-gray-700/30 backdrop-blur-sm mb-8">
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white text-center mb-4 sm:mb-6 md:mb-8">
                  Plan Comparison
                </h3>
                <div className="text-center mb-3 sm:mb-4 md:mb-6">
                  <span className="inline-block bg-blue-900/60 text-blue-200 border border-blue-500/30 rounded-full px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 text-xs sm:text-sm font-semibold">
                    <strong>Note:</strong> Membership is required before purchasing Pro or Pay As You Go plans.
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs sm:text-sm">
                    <thead>
                      <tr>
                        <th className="w-20 sm:w-32 md:w-48 text-left text-gray-400 font-medium py-2 sm:py-3 px-1 sm:px-2 md:px-4 border-b border-gray-700/30">
                          Features
                        </th>
                        <th className="text-center text-white font-bold py-2 sm:py-3 px-1 sm:px-2 md:px-4 border-b border-gray-700/30">
                          Membership<br/>
                          <span className="text-blue-400 font-semibold text-xs sm:text-sm">$25</span>
                        </th>
                        <th className="text-center text-white font-bold py-2 sm:py-3 px-1 sm:px-2 md:px-4 border-b border-gray-700/30">
                          Pay As You Go<br/>
                          <span className="text-blue-400 font-semibold text-xs sm:text-sm">$2/app & $3/hot job</span>
                        </th>
                        <th className="text-center text-white font-bold py-2 sm:py-3 px-1 sm:px-2 md:px-4 border-b border-gray-700/30">
                          Pro<br/>
                          <span className="text-blue-400 font-semibold text-xs sm:text-sm">$500</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: 'Billing Cycle', values: ['Bi-yearly', '1 Month', '1 Month'] },
                        { label: 'View Jobs', values: [true, true, true] },
                        { label: 'Submissions', values: [false, 'Unlimited', 'Minimum 300'] },
                        { label: 'Interview Prep & Training', values: [false, true, true] },
                        { label: 'Dedicated Z Concierge', values: [false, false, true] },
                      ].map((row, idx) => (
                        <tr key={row.label}>
                          <td className="text-gray-400 font-medium py-2 sm:py-3 px-1 sm:px-2 md:px-4 border-b border-gray-700/30">
                            {row.label}
                          </td>
                          {row.values.map((val, i) => (
                            <td key={i} className="text-center py-2 sm:py-3 px-1 sm:px-2 md:px-4 border-b border-gray-700/30">
                              {val === true ? (
                                <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-400 mx-auto" />
                              ) : val === false ? (
                                <X className="w-3 h-3 sm:w-4 sm:h-4 text-red-400 mx-auto" />
                              ) : (
                                <span className="text-white font-semibold text-xs sm:text-sm">{val}</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {currency.toLowerCase() === 'inr' && (
              <div className="bg-gray-900/40 rounded-xl sm:rounded-2xl md:rounded-3xl p-3 sm:p-4 md:p-6 lg:p-8 border border-gray-700/30 backdrop-blur-sm mb-8">
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white text-center mb-4 sm:mb-6 md:mb-8">
                  Plan Comparison
                </h3>
                <div className="text-center mb-3 sm:mb-4 md:mb-6">
                  <span className="inline-block bg-blue-900/60 text-blue-200 border border-blue-500/30 rounded-full px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 text-xs sm:text-sm font-semibold">
                    <strong>Note:</strong> Membership is required before purchasing Pro or Pay As You Go plans.
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs sm:text-sm">
                    <thead>
                      <tr>
                        <th className="w-20 sm:w-32 md:w-48 text-left text-gray-400 font-medium py-2 sm:py-3 px-1 sm:px-2 md:px-4 border-b border-gray-700/30">
                          Features
                        </th>
                        <th className="text-center text-white font-bold py-2 sm:py-3 px-1 sm:px-2 md:px-4 border-b border-gray-700/30">
                          Standard<br/>
                          <span className="text-blue-400 font-semibold text-xs sm:text-sm">₹999</span>
                        </th>
                        <th className="text-center text-white font-bold py-2 sm:py-3 px-1 sm:px-2 md:px-4 border-b border-gray-700/30">
                          Pay As You Go<br/>
                          <span className="text-blue-400 font-semibold text-xs sm:text-sm">Wallet Recharge</span>
                        </th>
                        <th className="text-center text-white font-bold py-2 sm:py-3 px-1 sm:px-2 md:px-4 border-b border-gray-700/30">
                          Pro<br/>
                          <span className="text-blue-400 font-semibold text-xs sm:text-sm">₹1999</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: 'Billing Cycle', values: ['Bi-yearly', 'Monthly postpaid', 'Monthly'] },
                        { label: 'View Jobs', values: [true, true, true] },
                        { label: 'Submissions', values: [false, 'Unlimited', 'Minimum 300'] },
                        { label: 'Interview Prep & Training', values: [false, true, true] },
                        { label: 'Dedicated Z Concierge', values: [false, false, true] },
                      ].map((row, idx) => (
                        <tr key={row.label}>
                          <td className="text-gray-400 font-medium py-2 sm:py-3 px-1 sm:px-2 md:px-4 border-b border-gray-700/30">
                            {row.label}
                          </td>
                          {row.values.map((val, i) => (
                            <td key={i} className="text-center py-2 sm:py-3 px-1 sm:px-2 md:px-4 border-b border-gray-700/30">
                              {val === true ? (
                                <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-400 mx-auto" />
                              ) : val === false ? (
                                <X className="w-3 h-3 sm:w-4 sm:h-4 text-red-400 mx-auto" />
                              ) : (
                                <span className="text-white font-semibold text-xs sm:text-sm">{val}</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* FAQ Section */}
        <div className="max-w-4xl mx-auto mt-8 sm:mt-12 md:mt-16">
          <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white text-center mb-4 sm:mb-6 md:mb-8">
            Frequently Asked Questions
          </h3>
          <div className="grid gap-2 sm:gap-3 md:gap-4 px-2 sm:px-0">
            {[
              {
                q: "What's the difference between membership and service plans?",
                a: "Membership gives you access to our platform and basic features. Service plans are for specific job application services you can purchase as needed."
              },
              {
                q: "Can I change or cancel my plan?",
                a: "Yes, you can upgrade, downgrade, or cancel your service plans at any time. Membership is one-time for lifetime access."
              }
            ].map((faq, index) => (
              <div key={index} className="bg-gray-800/30 rounded-lg sm:rounded-xl md:rounded-2xl p-3 sm:p-4 md:p-6 border border-gray-700/30">
                <h4 className="font-semibold text-white mb-1 sm:mb-2 text-sm sm:text-base">
                  {faq.q}
                </h4>
                <p className="text-gray-400 text-xs sm:text-sm">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const interactiveSteps = [
  {
    title: "1. Register & Submit Resume",
    description: "Sign up and provide your resume brief, personal info, and job keywords. Our onboarding is fast and secure.",
  },
  {
    title: "2. Profile Completion",
    description: "Our team completes your job-seeker profile for maximum impact, ensuring all details are ready for applications.",
  },
  {
    title: "3. Job Scouting",
    description: "We scout relevant jobs and present them in your portal. You review and authorize which jobs to pursue.",
  },
  {
    title: "4. Tailored Resumes",
    description: "Z (your HR agent) and our resume experts create custom resumes for each authorized job, maximizing your selection chances.",
  },
  {
    title: "5. Application Submission",
    description: "Z navigates and fills out job applications on your behalf, saving you hours of tedious work.",
  },
  {
    title: "6. Status Tracking",
    description: "Track all your applications and get real-time updates and follow-ups directly in your portal from Z.",
  },
  {
    title: "7. Interview Prep",
    description: "Z and our career coaches help you prepare for interviews, leveraging prior application & interview history for tailored coaching.",
  },
];

const stepIcons = [
  UserPlusIcon,
  IdentificationIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  InboxArrowDownIcon,
  ChartBarIcon,
  AcademicCapIcon,
];

const InteractiveProcessSteps: React.FC = () => {
  const [active, setActive] = useState(0);
  const scrollRef = useRef<HTMLOListElement>(null);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight")
        setActive((a) => Math.min(a + 1, interactiveSteps.length - 1));
      if (e.key === "ArrowLeft") setActive((a) => Math.max(a - 1, 0));
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // Scroll to active step
  useEffect(() => {
    if (scrollRef.current && scrollRef.current.children[active]) {
      const child = scrollRef.current.children[active] as HTMLElement;
      child.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }, [active]);

  return (
    <section
      className="py-12 sm:py-16 px-4 bg-gradient-to-b from-gray-950 to-gray-800"
      id="interactive-process"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl pb-8 sm:pb-12 text-center">
          <div className="inline-flex items-center gap-2 sm:gap-3 pb-2 sm:pb-3 before:h-px before:w-4 sm:before:w-8 before:bg-gradient-to-r before:from-transparent before:to-indigo-200/50 after:h-px after:w-4 sm:after:w-8 after:bg-gradient-to-l after:from-transparent after:to-indigo-200/50">
            <span className="inline-flex bg-gradient-to-r from-indigo-500 to-indigo-200 bg-clip-text text-transparent text-xs sm:text-sm">
              How Z Works
            </span>
          </div>
          <h2 className="animate-[gradient_6s_linear_infinite] bg-gradient-to-r from-gray-200 via-indigo-200 via-gray-50 via-indigo-300 to-gray-200 bg-[length:200%_auto] bg-clip-text pb-3 sm:pb-4 text-2xl sm:text-3xl md:text-4xl font-semibold text-transparent">
            Our 7-Step Process for Job Seekers
          </h2>
          <p className="text-sm sm:text-lg text-indigo-200/65 px-2 sm:px-0">
            We combine expert guidance and human expertise to handle your job search from
            start to finish. Here's how Z does it:
          </p>
        </div>
        <div className="flex flex-col md:flex-row gap-4 sm:gap-6 md:gap-8 items-start">
          <ol
            ref={scrollRef}
            className="flex md:flex-col gap-1 sm:gap-2 md:gap-4 flex-shrink-0 w-full md:w-64 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 scrollbar-thin scrollbar-thumb-indigo-400/40 scrollbar-track-transparent"
          >
            {interactiveSteps.map((step, idx) => (
              <li
                key={idx}
                className={`flex items-center gap-2 px-2 sm:px-3 py-1 sm:py-2 rounded-lg cursor-pointer transition-all duration-200 min-w-max
                  ${active === idx
                    ? "bg-indigo-700/80 text-white font-semibold shadow-lg"
                    : "bg-gray-800/60 text-indigo-200/80 hover:bg-indigo-700/40"
                  }`}
                onClick={() => setActive(idx)}
                tabIndex={0}
              >
                <span
                  className={`flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 ${active === idx
                      ? "bg-indigo-400 border-indigo-200"
                      : "border-indigo-700 bg-gray-900"
                    }`}
                >
                  {active > idx ? (
                    <svg
                      className="w-2 h-2 sm:w-3 sm:h-3 text-white"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      viewBox="0 0 24 24"
                    >
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="text-xs font-bold">{idx + 1}</span>
                  )}
                </span>
                <span className="truncate text-xs sm:text-sm">
                  {step.title.replace(/^\d+\. /, "")}
                </span>
              </li>
            ))}
          </ol>
          <div className="flex-1 min-w-0 flex flex-col items-center w-full md:w-auto justify-center md:items-center">
            <div className="w-full flex justify-center">
              <FadeCard key={active} step={interactiveSteps[active]} />
            </div>
            <div className="flex justify-center gap-4 sm:gap-6 mt-3 sm:mt-4">
              <button
                className="rounded-full bg-gray-800/70 p-1 sm:p-2 shadow hover:bg-indigo-700/70 transition disabled:opacity-30"
                onClick={() => setActive((a) => Math.max(a - 1, 0))}
                disabled={active === 0}
                aria-label="Previous step"
              >
                <svg
                  className="w-4 h-4 sm:w-6 sm:h-6 text-indigo-300"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                className="rounded-full bg-gray-800/70 p-1 sm:p-2 shadow hover:bg-indigo-700/70 transition disabled:opacity-30"
                onClick={() => setActive((a) => Math.min(a + 1, interactiveSteps.length - 1))}
                disabled={active === interactiveSteps.length - 1}
                aria-label="Next step"
              >
                <svg
                  className="w-4 h-4 sm:w-6 sm:h-6 text-indigo-300"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            <div className="flex justify-center gap-1 sm:gap-2 mt-3 sm:mt-4 md:mt-6">
              {interactiveSteps.map((_, idx) => (
                <button
                  key={idx}
                  className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-all duration-200 ${active === idx
                      ? "bg-indigo-400 scale-125"
                      : "bg-indigo-700/40"
                    }`}
                  onClick={() => setActive(idx)}
                  aria-label={`Go to step ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// FadeCard component for smooth fade in/out
function FadeCard({ step }: { step: typeof interactiveSteps[number] }) {
  const [show, setShow] = React.useState(false);
  
  React.useEffect(() => {
    setShow(false);
    const t = setTimeout(() => setShow(true), 10);
    return () => clearTimeout(t);
  }, [step]);
  
  const idx = interactiveSteps.findIndex((s) => s.title === step.title);
  const Icon = stepIcons[idx] || UserPlusIcon;
  
  return (
    <div
      className={`transition-opacity duration-500 ${show ? "opacity-100" : "opacity-0"}
        w-full max-w-xs sm:max-w-sm md:max-w-md rounded-xl sm:rounded-2xl bg-gray-800/80 p-4 sm:p-6 shadow-lg flex flex-col items-center justify-center text-center border border-indigo-400/60`}
      style={{ minHeight: 280 }}
    >
      <span className="mb-3 sm:mb-4 flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-lg sm:rounded-xl bg-indigo-900/60 border border-indigo-300/60 shadow-md mx-auto">
        <Icon className="w-6 h-6 sm:w-9 sm:h-9 text-indigo-200" />
      </span>
      <div className="flex flex-col items-center justify-center flex-1 w-full">
        <h3 className="text-base sm:text-lg md:text-xl font-bold text-indigo-200 mb-2 text-center">
          {step.title}
        </h3>
        <p className="text-indigo-100/80 text-xs sm:text-sm text-center">
          {step.description}
        </p>
      </div>
    </div>
  );
}

/* ---------- Enhanced Main Home ---------- */
interface ElitePlanInquiryModalProps {
  onClose: () => void;
}

const ElitePlanInquiryModal: React.FC<ElitePlanInquiryModalProps> = ({ onClose }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    company: '',
    phone: '',
    requirements: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/send-elite-inquiry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: 'success',
          text: 'Your inquiry has been sent successfully! Our team will contact you soon.',
        });
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Failed to send your inquiry. Please try again.',
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'An error occurred. Please try again later.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-black rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-blue-500/20">
        {/* Header with gradient backdrop */}
        <div className="bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 rounded-t-2xl p-8 text-white sticky top-0 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-3xl font-bold">Elite Plan Inquiry</h2>
              </div>
              <p className="text-blue-100 ml-13">Get personalized solutions for your business</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-3 transition-all hover:scale-110"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {/* Full Name */}
          <div className="group">
            <label className="block text-sm font-bold text-cyan-400 mb-3 uppercase tracking-wide">
              Full Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              required
              className="w-full px-5 py-3 bg-gray-800/50 border-2 border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all hover:border-gray-600 group-focus-within:border-cyan-500/50"
              placeholder="John Doe"
            />
          </div>

          {/* Email */}
          <div className="group">
            <label className="block text-sm font-bold text-cyan-400 mb-3 uppercase tracking-wide">
              Email Address <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-5 py-3 bg-gray-800/50 border-2 border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all hover:border-gray-600 group-focus-within:border-cyan-500/50"
              placeholder="john@example.com"
            />
          </div>

          {/* Company */}
          <div className="group">
            <label className="block text-sm font-bold text-cyan-400 mb-3 uppercase tracking-wide">
              Company Name
            </label>
            <input
              type="text"
              name="company"
              value={formData.company}
              onChange={handleChange}
              className="w-full px-5 py-3 bg-gray-800/50 border-2 border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all hover:border-gray-600 group-focus-within:border-cyan-500/50"
              placeholder="Acme Corp"
            />
          </div>

          {/* Phone */}
          <div className="group">
            <label className="block text-sm font-bold text-cyan-400 mb-3 uppercase tracking-wide">
              Phone Number
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-5 py-3 bg-gray-800/50 border-2 border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all hover:border-gray-600 group-focus-within:border-cyan-500/50"
              placeholder="+1 (555) 123-4567"
            />
          </div>

          {/* Requirements */}
          <div className="group">
            <label className="block text-sm font-bold text-cyan-400 mb-3 uppercase tracking-wide">
              Requirements & Use Case
            </label>
            <textarea
              name="requirements"
              value={formData.requirements}
              onChange={handleChange}
              rows={5}
              className="w-full px-5 py-3 bg-gray-800/50 border-2 border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 resize-none transition-all hover:border-gray-600 group-focus-within:border-cyan-500/50"
              placeholder="Tell us about your team size, job search goals, and specific requirements..."
            />
          </div>

          {/* Message */}
          {message && (
            <div
              className={`p-4 rounded-xl border-2 backdrop-blur-sm transition-all ${
                message.type === 'success'
                  ? 'bg-green-900/30 text-green-400 border-green-500/50'
                  : 'bg-red-900/30 text-red-400 border-red-500/50'
              }`}
            >
              <div className="flex items-center gap-2">
                {message.type === 'success' ? (
                  <CheckCircle className="w-5 h-5 flex-shrink-0" />
                ) : (
                  <div className="w-5 h-5 flex-shrink-0 text-lg">⚠️</div>
                )}
                {message.text}
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="space-y-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500 hover:from-blue-600 hover:via-cyan-600 hover:to-blue-600 disabled:from-gray-600 disabled:via-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-3 shadow-xl hover:shadow-cyan-500/30 transform hover:scale-[1.02] active:scale-95"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Sending Your Inquiry...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>Submit Inquiry</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full bg-gray-800 hover:bg-gray-700 border-2 border-gray-700 hover:border-gray-600 text-white py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-[1.02] active:scale-95"
            >
              Cancel
            </button>
          </div>

          {/* Footer Info */}
          <div className="pt-4 border-t border-gray-700/50 text-center">
            <p className="text-gray-400 text-sm">
              We'll review your inquiry and contact you within 24 hours
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ---------- Enhanced Main Home ---------- */
export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const [currency, setCurrency] = useState<'usd' | 'inr'>(
    typeof window !== 'undefined' && window.navigator.language.startsWith('en-IN') ? 'inr' : 'usd'
  );
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [elitePlanModalOpen, setElitePlanModalOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(t);
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-gray-900 to-black text-gray-300">
        <div className="text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3 sm:mb-4" />
          <div className="flex items-center gap-1 sm:gap-2 justify-center mb-1 sm:mb-2">
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Briefcase className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-white">FindZob</h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-400">Preparing your career acceleration...</p>
        </div>
      </div>
    );
  }

  // Determine hot jobs collection based on country
  const hotJobsCollectionName = currency === 'inr' ? 'hot-jobs-india' : 'today-hot-jobs-usa';

  return (
    <div className="min-h-screen flex flex-col text-gray-200 bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <header className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 relative z-50">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 sm:gap-3 group">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl overflow-hidden bg-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Image 
                src="/logo.png" 
                alt="Findzob Logo" 
                width={40} 
                height={40} 
                style={{ objectFit: 'contain' }}
                priority
              />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">FindZob</h1>
          </Link>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="sm:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white"
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>

            <div className="hidden sm:flex items-center gap-2 sm:gap-4">
              <div className="relative">
                <button
                  className="flex items-center gap-1 sm:gap-2 bg-gradient-to-r from-gray-800 via-gray-900 to-gray-800 border border-blue-700/40 text-white px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl shadow-xl hover:from-blue-900/60 hover:to-cyan-900/60 hover:border-blue-500/60 transition-all font-semibold text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  onClick={() => setShowCurrencyDropdown((v) => !v)}
                  aria-label="Select country/currency"
                >
                  <span className="mr-1 flex items-center gap-1 sm:gap-2">
                    {currency === 'inr' ? (
                      <>
                        <span className="text-lg sm:text-xl">🇮🇳</span>
                        <span className="font-semibold tracking-wide hidden sm:inline">India</span>
                      </>
                    ) : (
                      <>
                        <span className="text-lg sm:text-xl">🇺🇸</span>
                        <span className="font-semibold tracking-wide hidden sm:inline">USA</span>
                      </>
                    )}
                  </span>
                  <ArrowUpRight className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-cyan-400 transition-transform duration-200" />
                </button>
                {showCurrencyDropdown && (
                  <div className="absolute right-0 mt-2 w-40 sm:w-48 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-blue-700/40 rounded-xl sm:rounded-2xl shadow-2xl z-40 overflow-hidden">
                    <button
                      className={`w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base transition-all duration-200 hover:bg-blue-900/30 ${currency === 'inr' ? 'bg-blue-900/40 text-cyan-300 font-bold' : 'text-white'}`}
                      onClick={() => { setCurrency('inr'); setShowCurrencyDropdown(false); }}
                    >
                      <span className="text-lg sm:text-xl">🇮🇳</span>
                      <span className="font-semibold tracking-wide text-xs sm:text-sm">India (INR)</span>
                      {currency === 'inr' && <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 ml-auto" />}
                    </button>
                    <button
                      className={`w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base transition-all duration-200 hover:bg-blue-900/30 ${currency === 'usd' ? 'bg-blue-900/40 text-cyan-300 font-bold' : 'text-white'}`}
                      onClick={() => { setCurrency('usd'); setShowCurrencyDropdown(false); }}
                    >
                      <span className="text-lg sm:text-xl">🇺🇸</span>
                      <span className="font-semibold tracking-wide text-xs sm:text-sm">USA (USD)</span>
                      {currency === 'usd' && <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 ml-auto" />}
                    </button>
                  </div>
                )}
              </div>
              <Link href="/login" className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white px-4 sm:px-6 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl font-semibold shadow-lg hover:shadow-blue-500/25 transition-all duration-300 text-sm sm:text-base">
                Sign In
              </Link>
              <Link href="/signup" className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white px-4 sm:px-6 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl font-semibold shadow-lg hover:shadow-blue-500/25 transition-all duration-300 text-sm sm:text-base">
                Get Started
              </Link>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden absolute top-full left-0 right-0 bg-gray-900/95 backdrop-blur-sm border-t border-gray-700/50 mt-2 rounded-b-2xl shadow-2xl z-50">
            <div className="p-4 space-y-3">
              <div className="flex flex-col gap-2 mb-4">
                <button
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${currency === 'inr' ? 'bg-blue-900/40 text-cyan-300 font-bold' : 'bg-gray-800/50 text-white'}`}
                  onClick={() => { setCurrency('inr'); setShowCurrencyDropdown(false); setMobileMenuOpen(false); }}
                >
                  <span className="text-xl">🇮🇳</span>
                  <span className="font-semibold">India (INR)</span>
                  {currency === 'inr' && <CheckCircle className="w-5 h-5 text-green-400 ml-auto" />}
                </button>
                <button
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${currency === 'usd' ? 'bg-blue-900/40 text-cyan-300 font-bold' : 'bg-gray-800/50 text-white'}`}
                  onClick={() => { setCurrency('usd'); setShowCurrencyDropdown(false); setMobileMenuOpen(false); }}
                >
                  <span className="text-xl">🇺🇸</span>
                  <span className="font-semibold">USA (USD)</span>
                  {currency === 'usd' && <CheckCircle className="w-5 h-5 text-green-400 ml-auto" />}
                </button>
              </div>
              <Link 
                href="/login" 
                className="block w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-3 rounded-xl font-semibold text-center shadow-lg transition-all duration-300"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign In
              </Link>
              <Link 
                href="/signup" 
                className="block w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-3 rounded-xl font-semibold text-center shadow-lg transition-all duration-300"
                onClick={() => setMobileMenuOpen(false)}
              >
                Get Started
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="flex-grow relative">
        {/* Hero Section */}
        <section className="relative px-4 py-12 sm:py-16 md:py-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-cyan-500/5" />
          <div className="absolute top-1/4 -left-10 w-48 h-48 sm:w-72 sm:h-72 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -right-10 w-48 h-48 sm:w-72 sm:h-72 bg-cyan-500/10 rounded-full blur-3xl" />
          
          <div className="container mx-auto relative z-10 text-center">
            <div className="inline-flex items-center gap-1 sm:gap-2 pb-3 sm:pb-4 justify-center">
              <div className="h-px w-8 sm:w-16 bg-gradient-to-r from-transparent to-blue-500/60" />
              <span className="text-blue-400 text-xs sm:text-sm font-semibold tracking-wider uppercase bg-blue-500/10 px-2 sm:px-4 py-1 rounded-full">
                Z: Your Career Accelerator
              </span>
              <div className="h-px w-8 sm:w-16 bg-gradient-to-l from-transparent to-blue-500/60" />
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight text-white leading-tight mb-3 sm:mb-4 px-2">
              Land Your <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent animate-pulse">Dream Job</span> Faster
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-gray-300 max-w-3xl mx-auto mb-4 sm:mb-6 leading-relaxed px-2">
              Let our team of Z agents handle your job search and submissions while you focus on interviews and career growth.
            </p>

            <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-3">
              <Link 
                href="/signup" 
                className="group inline-flex items-center gap-2 sm:gap-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 px-6 sm:px-8 py-3 sm:py-4 rounded-lg sm:rounded-xl text-base sm:text-lg font-semibold shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 transform hover:scale-105 w-full sm:w-auto justify-center"
              >
                Join Now 
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="mt-8 sm:mt-10 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 max-w-3xl mx-auto px-2">
              {[
                { number: '200,000', label: 'Jobs Available' },
                { number: '3×', label: 'Job Applications' },
                { number: '12%', label: 'Follow-up Rate' },
                { number: '2×', label: 'Submission Speed' },
              ].map((m, i) => (
                <div key={i} className="text-center group">
                  <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-1 sm:mb-2 group-hover:scale-110 transition-transform duration-300">
                    {m.number}
                  </div>
                  <div className="text-gray-400 text-xs sm:text-sm font-medium">{m.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Hot Jobs Section */}
        {typeof HotJobsSection === 'function' ? (
          <HotJobsSection
            handleApplyClick={() => router.push('/login')}
            isEmployee={false}
            priorityByJob={{}}
            togglePriority={() => {}}
            loadingByJob={{}}
            errorsByJob={{}}
            collectionName={hotJobsCollectionName}
          />
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-400">Hot Jobs section loading...</p>
          </div>
        )}

        {/* Interactive Process Steps */}
        <InteractiveProcessSteps />

        {/* Pricing Section */}
        <PricingSection 
          currency={currency} 
          setCurrency={setCurrency} 
          showCurrencyDropdown={showCurrencyDropdown} 
          setShowCurrencyDropdown={setShowCurrencyDropdown}
          setElitePlanModalOpen={setElitePlanModalOpen}
        />

        {/* Testimonials Section */}
        <section className="py-12 sm:py-24 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/5 to-transparent" />
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl" />
          
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center mb-8 sm:mb-16">
              <div className="inline-flex items-center gap-2 sm:gap-3 pb-3 sm:pb-4">
                <div className="h-px w-4 sm:w-8 bg-gradient-to-r from-transparent to-blue-500" />
                <span className="text-xs sm:text-sm font-semibold text-blue-400 uppercase tracking-wider">Success Stories</span>
                <div className="h-px w-4 sm:w-8 bg-gradient-to-l from-transparent to-blue-500" />
              </div>
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold text-white mb-3 sm:mb-4">
                Loved by <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Job Seekers</span> Worldwide
              </h2>
              <p className="text-gray-400 text-sm sm:text-lg max-w-2xl mx-auto px-2">
                Hear from professionals who've transformed their careers with Z agents.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto">
              {testimonials.map((testimonial, idx) => (
                <TestimonialCard key={idx} testimonial={testimonial} />
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-12 sm:py-16 relative">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center mb-8 sm:mb-16">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 sm:mb-4 px-2">
                Everything You Need for <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Career Success</span>
              </h2>
              <p className="text-gray-400 text-sm sm:text-base md:text-lg max-w-2xl mx-auto px-2">
                We combine human expertise with personalized service to create a job search experience that's both efficient and effective.
              </p>
            </div>

            <div className="grid gap-4 sm:gap-6 md:gap-8 md:grid-cols-2 lg:grid-cols-4">
              {features.map((f, idx) => (
                <div key={idx} className="group">
                  {typeof GlowCard === 'function' ? (
                    <GlowCard className="group hover:scale-105 transition-transform duration-300">
                      <div className="p-4 sm:p-6 h-full">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-4 sm:mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300">
                          {f.icon}
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-3">{f.title}</h3>
                        <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">{f.description}</p>
                      </div>
                    </GlowCard>
                  ) : (
                    <div className="p-4 sm:p-6 h-full bg-gray-800/30 rounded-xl border border-gray-700/30">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-4 sm:mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300">
                        {f.icon}
                      </div>
                      <h3 className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-3">{f.title}</h3>
                      <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">{f.description}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-12 sm:py-16 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/10" />
          <div className="container mx-auto text-center px-4 sm:px-6 lg:px-8 relative z-10">
            {typeof GlowCard === 'function' ? (
              <GlowCard className="max-w-3xl mx-auto">
                <div className="p-4 sm:p-6 md:p-8">
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2 sm:mb-3">
                    Ready to Transform Your Career?
                  </h2>
                  <p className="text-gray-300 text-sm sm:text-base max-w-2xl mx-auto mb-4 sm:mb-5 leading-relaxed">
                    Join thousands of successful professionals and let our expert team handle your job search while you focus on your career growth.
                  </p>
                  <Link href="/signup" className="group inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold shadow-lg hover:shadow-blue-500/25 transition-all duration-300 transform hover:scale-105">
                    Start Your Journey
                    <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </GlowCard>
            ) : (
              <div className="max-w-3xl mx-auto bg-gray-800/30 rounded-xl p-4 sm:p-6 md:p-8 border border-gray-700/30">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2 sm:mb-3">
                  Ready to Transform Your Career?
                </h2>
                <p className="text-gray-300 text-sm sm:text-base max-w-2xl mx-auto mb-4 sm:mb-5 leading-relaxed">
                  Join thousands of successful professionals and let our expert team handle your job search while you focus on your career growth.
                </p>
                <Link href="/signup" className="group inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold shadow-lg hover:shadow-blue-500/25 transition-all duration-300 transform hover:scale-105">
                  Start Your Journey
                  <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800/50 bg-gradient-to-b from-gray-900/50 to-black/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 sm:mb-12">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 sm:gap-3 mb-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-white flex items-center justify-center">
                  <Image 
                    src="/logo.png" 
                    alt="Findzob Logo" 
                    width={80} 
                    height={80} 
                    style={{ objectFit: 'contain' }}
                  />
                </div>
                <span className="text-lg sm:text-xl font-bold text-white">FindZob</span>
              </div>
              <p className="text-gray-400 text-xs sm:text-sm">Expert-powered job search acceleration with Z agents.</p>
              <div className="mt-4 pt-4 border-t border-gray-700/50">
                <div className="flex items-center gap-4 mb-2">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded overflow-hidden bg-white flex items-center justify-center flex-shrink-0">
                    <Image 
                      src="/triaright-logo.png" 
                      alt="Triaright Logo" 
                      width={80} 
                      height={80} 
                      style={{ objectFit: 'contain' }}
                    />
                  </div>
                  <span className="text-gray-300 text-sm sm:text-base font-semibold">A Triaright Product</span>
                </div>
              </div>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm">Product</h4>
              <ul className="space-y-2 text-gray-400 text-xs sm:text-sm">
                <li><Link href="#pricing" className="hover:text-cyan-400 transition-colors">Pricing</Link></li>
                <li><Link href="#process" className="hover:text-cyan-400 transition-colors">How Z Works</Link></li>
                <li><Link href="/jobs/hot" className="hover:text-cyan-400 transition-colors">Latest Jobs</Link></li>
                <li><Link href="/dashboard" className="hover:text-cyan-400 transition-colors">Dashboard</Link></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm">Company</h4>
              <ul className="space-y-2 text-gray-400 text-xs sm:text-sm">
                <li><a href="#" className="hover:text-cyan-400 transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition-colors">Contact</a></li>
              </ul>
            </div>

            {/* Newsletter */}
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm">Newsletter</h4>
              <p className="text-gray-400 text-xs sm:text-sm mb-3">Get tips and updates delivered to your inbox.</p>
              <div className="flex gap-2">
                <input 
                  type="email" 
                  placeholder="Your email" 
                  className="flex-1 px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white text-xs sm:text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
                <button className="px-3 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-lg font-semibold text-xs sm:text-sm transition-all">
                  Subscribe
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="border-t border-gray-800/50 pt-6 sm:pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-gray-400 text-xs sm:text-sm">
            <div className="text-center md:text-left">
              <p>&copy; {new Date().getFullYear()} FindZob. A Triaright Product. All rights reserved.</p>
            </div>
            <div className="flex gap-4">
              <a href="#" className="hover:text-cyan-400 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-cyan-400 transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-cyan-400 transition-colors">Sitemap</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating Chat/Support Icon */}
      <FloatingChatBox />

      {/* Elite Plan Modal */}
      {elitePlanModalOpen && <ElitePlanInquiryModal onClose={() => setElitePlanModalOpen(false)} />}
    </div>
  );
}
