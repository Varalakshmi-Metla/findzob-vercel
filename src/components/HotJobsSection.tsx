'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import {
  Briefcase,
  ArrowRight,
  ChevronRight,
  Zap,
  Building,
  MapPin,
  DollarSign,
} from 'lucide-react';

import { GlowCard } from '@/components/ui/GlowCard';

interface HotJobsSectionProps {
  handleApplyClick: (jobId: string) => void;
  isEmployee: boolean;
  priorityByJob: Record<string, boolean>;
  togglePriority: (jobId: string) => void;
  loadingByJob: Record<string, boolean>;
  errorsByJob: Record<string, string | null>;
  searchQuery?: string;
  collectionName?: string; // Optional: override collection name
}

const HotJobsSection: React.FC<HotJobsSectionProps> = ({
  handleApplyClick,
  isEmployee,
  priorityByJob,
  togglePriority,
  loadingByJob,
  errorsByJob,
  searchQuery,
  collectionName
}) => {
  const router = useRouter();
  const [visibleJobs, setVisibleJobs] = useState(6);
  const firestore = useFirestore();
  // Use collectionName prop if provided, else default to 'hotJobs'
  const hotJobsCollectionRef = useMemoFirebase(
    () => firestore ? collection(firestore, collectionName || 'hotJobs') : null,
    [firestore, collectionName]
  );
  const { data: hotJobs, isLoading } = useCollection<any>(hotJobsCollectionRef);

  const loadMoreJobs = () => {
    setVisibleJobs(prev => Math.min(prev + 3, (hotJobs || []).length));
  };

  if (isLoading) {
    return <div className="py-24 text-center text-white">Loading hot jobs...</div>;
  }

  // Helper to get timestamp from job for sorting (newest first)
  const getJobTimestamp = (job: any): number => {
    if (job.createdAt?.seconds) return job.createdAt.seconds * 1000;
    if (job.createdAt?.toDate) return job.createdAt.toDate().getTime();
    if (job.createdAt) return new Date(job.createdAt).getTime();
    if (job.addedAt?.seconds) return job.addedAt.seconds * 1000;
    if (job.addedAt?.toDate) return job.addedAt.toDate().getTime();
    if (job.addedAt) return new Date(job.addedAt).getTime();
    if (job.timestamp?.seconds) return job.timestamp.seconds * 1000;
    if (job.timestamp?.toDate) return job.timestamp.toDate().getTime();
    if (job.timestamp) return new Date(job.timestamp).getTime();
    // Fallback: use document ID or 0 (will appear last)
    return 0;
  };

  // apply optional search filtering and assignment filtering for employees
  const normalizedQuery = (searchQuery || '').trim().toLowerCase();
  // First, sort jobs by createdAt (newest first)
  let filteredJobs = (hotJobs || []).sort((a: any, b: any) => {
    return getJobTimestamp(b) - getJobTimestamp(a); // Descending order (newest first)
  });
  if (isEmployee) {
    // Only show jobs assigned to this employee
    const employeeId = typeof window !== 'undefined' ? window.localStorage.getItem('uid') : undefined;
    filteredJobs = filteredJobs.filter((job: any) => job.assignedEmployeeId === employeeId);
  }
  if (normalizedQuery) {
    filteredJobs = filteredJobs.filter((job: any) => {
      const title = (job.title || '').toString().toLowerCase();
      const company = (job.company || '').toString().toLowerCase();
      const location = (job.location || '').toString().toLowerCase();
      const tags = Array.isArray(job.tags) ? job.tags.join(' ').toLowerCase() : '';
      return title.includes(normalizedQuery) || company.includes(normalizedQuery) || location.includes(normalizedQuery) || tags.includes(normalizedQuery);
    });
  }

  return (
    <section id="hot-jobs" className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900/50 to-black/50" />
      <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="mx-auto max-w-4xl text-center mb-16">
          <div className="inline-flex items-center gap-3 pb-4">
            <div className="h-px w-8 bg-gradient-to-r from-transparent to-red-500" />
            <span className="text-sm font-semibold text-red-400 uppercase tracking-wider">Latest Jobs</span>
            <div className="h-px w-8 bg-gradient-to-l from-transparent to-red-500" />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Trending <span className="bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">Opportunities</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Discover top positions at leading tech companies. Let us handle your applications while you focus on interviews.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {filteredJobs.slice(0, visibleJobs).map((job: any) => (
            <GlowCard key={job.id} className="group hover:scale-105 transition-all duration-300">
              <div className="p-6 h-full flex flex-col">
                {/* Job Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">
                      {job.company.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-lg">{job.title}</h3>
                      <p className="text-gray-400 text-sm">{job.company}</p>
                    </div>
                  </div>
                  {job.featured && (
                    <span className="bg-red-500/20 text-red-300 px-2 py-1 rounded-full text-xs font-medium border border-red-500/30">
                      Featured
                    </span>
                  )}
                </div>

                {/* Job Details */}
                <div className="space-y-3 mb-4 flex-1">
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <MapPin className="w-4 h-4" />
                    <span>{job.location || 'Location Not Specified'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <DollarSign className="w-4 h-4" />
                    <span>{(() => {
                      const salary = job.salary;
                      if (salary === null || salary === undefined || salary === '') return 'Salary Not Specified';
                      if (typeof salary === 'string' && (salary.trim() === '' || salary.trim() === '-')) return 'Salary Not Specified';
                      if (typeof salary === 'number') {
                        return salary.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
                      }
                      if (typeof salary === 'string' && /^\d+$/.test(salary)) {
                        const salaryNum = parseInt(salary, 10);
                        return salaryNum.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
                      }
                      return String(salary);
                    })()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <Building className="w-4 h-4" />
                    <span>{job.type || 'Job Type Not Specified'}</span>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {Array.isArray(job.tags) && job.tags.map((tag: any, index: number) => (
                    <span 
                      key={index}
                      className="bg-gray-800 text-gray-300 px-2 py-1 rounded-lg text-xs border border-gray-700/50"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Apply Button */}
                {isEmployee ? (
                  <div className="text-sm text-yellow-400">Employees: manage hot jobs in the employee dashboard.</div>
                ) : (
                  <>
                    {/* <label className="flex items-center gap-2 text-sm mb-2">
                      <input type="checkbox" checked={!!priorityByJob[job.id]} onChange={() => togglePriority(job.id)} className="w-4 h-4" />
                      <span className="text-sm text-gray-200">Priority</span>
                    </label> */}
                    <button 
                      onClick={() => handleApplyClick(job.id)}
                      className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white py-3 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 group/btn"
                      disabled={loadingByJob[job.id]}
                    >
                      <Briefcase className="w-4 h-4" />
                      {loadingByJob[job.id] ? 'Applying…' : 'Help me to Apply'}
                      <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                    {errorsByJob[job.id] ? <div className="w-full mt-2 text-sm text-red-400">{errorsByJob[job.id]}</div> : null}
                  </>
                )}
              </div>
            </GlowCard>
          ))}
        </div>

  {visibleJobs < (hotJobs ? hotJobs.length : 0) && (
          <div className="text-center mt-12">
            <button 
              onClick={loadMoreJobs}
              className="inline-flex items-center gap-2 border border-gray-700 px-6 py-3 rounded-xl text-gray-300 hover:bg-gray-800/50 hover:border-gray-600 transition-all duration-300"
            >
              Load More Jobs
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default HotJobsSection;