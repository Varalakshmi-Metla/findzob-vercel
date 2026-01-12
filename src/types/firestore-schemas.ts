export type Plan = {
  id: string;
  name: string;
  amount: number;
  currency: string;
  category?: string;
  planName?: string;
  price?: number;
  durationDays?: number; // duration in days
  features?: string[];
};

export type UserPlan = {
  planId: string;
  planName: string;
  purchaseDate: string; // ISO date string
  expiryDate: string; // ISO date string
}

export type UserDoc = {
  name?: string;
  email?: string;
  plans?: UserPlan[];
  resumeURL?: string | null;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpSecure?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type Job = {
  title: string;
  company: string;
  description?: string;
  isHotJob?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type Application = {
  userId: string;
  jobId: string;
  appliedAt?: string;
  priority?: boolean;
  status?: string; // Submitted | Under Review | Shortlisted | Hired | Rejected
  planType?: string;
};

export type ResumeDoc = {
  userId: string;
  resumeURL: string;
  role?: string;
  createdAt?: string;
};

export type AiInterview = {
  userId: string;
  topic: string;
  questions: Array<{ q: string; expected?: string }>;
  answers?: Array<{ q: string; a: string; score?: number }>;
  score?: number;
  feedback?: string;
  createdAt?: string;
};

export type EmployeeDoc = {
  name: string;
  email: string;
  role?: string;
  permissions?: string[];
  createdAt?: string;
};
