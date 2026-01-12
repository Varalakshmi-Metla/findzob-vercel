"use client";

import { useState } from "react";
import { useUser } from "@/firebase";
import { isAdminEmail } from "@/lib/admin";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// This should be replaced with Firestore integration
const initialHotJobs = [
  {
    id: 1,
    title: "Senior Software Engineer",
    company: "Google",
    location: "Mountain View, CA",
    salary: "$150,000 - $200,000",
    type: "Full-time",
    logo: "",
    featured: true,
    tags: ["AI/ML", "Cloud", "Backend"],
  },
  {
    id: 2,
    title: "Product Manager",
    company: "Microsoft",
    location: "Redmond, WA",
    salary: "$140,000 - $180,000",
    type: "Full-time",
    logo: "",
    featured: true,
    tags: ["Azure", "Enterprise", "Strategy"],
  },
];

export default function HotJobsAdminPage() {
  const { user } = useUser();
  const isAdmin = isAdminEmail(user?.email);
  const [hotJobs, setHotJobs] = useState(initialHotJobs);
  const [newJob, setNewJob] = useState({ title: "", company: "", location: "", salary: "", type: "", logo: "", featured: false, tags: "" });

  if (!isAdmin) {
    return <div className="p-8 text-center">Access denied. Admins only.</div>;
  }

  const handleAddJob = () => {
  setHotJobs([...hotJobs, { ...newJob, id: Date.now(), tags: newJob.tags.split(",").map(t => t.trim()) }]);
  setNewJob({ title: "", company: "", location: "", salary: "", type: "", logo: "", featured: false, tags: "" });
  };

  const handleRemoveJob = (id: number) => {
    setHotJobs(hotJobs.filter((job) => job.id !== id));
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Jobs Control</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {hotJobs.map((job) => (
              <div key={job.id} className="border rounded p-3 flex justify-between items-center">
                <div>
                  <div className="font-semibold">{job.title}</div>
                  <div className="text-sm text-muted-foreground">{job.company} — {job.location}</div>
                  <div className="text-xs">{job.salary} | {job.type}</div>
                </div>
                <Button variant="destructive" size="sm" onClick={() => handleRemoveJob(job.id)}>Remove</Button>
              </div>
            ))}
            <div className="pt-4 border-t mt-4 grid grid-cols-1 gap-2">
              <input
                type="text"
                placeholder="Title"
                className="border rounded px-2 py-1"
                value={newJob.title}
                onChange={e => setNewJob({ ...newJob, title: e.target.value })}
              />
              <input
                type="text"
                placeholder="Company"
                className="border rounded px-2 py-1"
                value={newJob.company}
                onChange={e => setNewJob({ ...newJob, company: e.target.value })}
              />
              <input
                type="text"
                placeholder="Location"
                className="border rounded px-2 py-1"
                value={newJob.location}
                onChange={e => setNewJob({ ...newJob, location: e.target.value })}
              />
              <input
                type="text"
                placeholder="Salary"
                className="border rounded px-2 py-1"
                value={newJob.salary}
                onChange={e => setNewJob({ ...newJob, salary: e.target.value })}
              />
              <input
                type="text"
                placeholder="Type"
                className="border rounded px-2 py-1"
                value={newJob.type}
                onChange={e => setNewJob({ ...newJob, type: e.target.value })}
              />
              <input
                type="text"
                placeholder="Logo URL"
                className="border rounded px-2 py-1"
                value={newJob.logo}
                onChange={e => setNewJob({ ...newJob, logo: e.target.value })}
              />
              <input
                type="text"
                placeholder="Tags (comma separated)"
                className="border rounded px-2 py-1"
                value={newJob.tags}
                onChange={e => setNewJob({ ...newJob, tags: e.target.value })}
              />
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newJob.featured}
                  onChange={e => setNewJob({ ...newJob, featured: e.target.checked })}
                />
                Featured
              </label>
              <Button size="sm" className="mt-2" onClick={handleAddJob}>Add Job</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
