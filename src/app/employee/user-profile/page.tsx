"use client";

import { useSearchParams } from "next/navigation";
import { useFirestore, updateDocumentNonBlocking } from "@/firebase";
import { useEffect, useState } from "react";
import { CardDescription } from "@/components/ui/card";
import { Star, Briefcase, Mail, Phone, MapPin, Linkedin, Github, Calendar, Users, Award, FileText, Globe, Zap, BookOpen, Trophy, Volume2, Image as ImageIcon, Wrench, Sparkles, CheckCircle, XCircle, Heart, Edit3, Save, X } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import React from "react";
import { collection, doc, getDoc, getDocs, query, orderBy } from 'firebase/firestore';
import { convertFirestoreToPlain } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function UserProfilePage() {
  const searchParams = useSearchParams();
  const firestore = useFirestore();
  const { toast } = useToast();
  const userId = searchParams.get('id') || '';
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // State management
  const [user, setUser] = useState<any>(null);
  const [editedUser, setEditedUser] = useState<any>(null);
  const [education, setEducation] = useState<any[]>([]);
  const [editedEducation, setEditedEducation] = useState<any[]>([]);
  const [experience, setExperience] = useState<any[]>([]);
  const [editedExperience, setEditedExperience] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  const [editedSkills, setEditedSkills] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [editedProjects, setEditedProjects] = useState<any[]>([]);
  const [certifications, setCertifications] = useState<any[]>([]);
  const [editedCertifications, setEditedCertifications] = useState<any[]>([]);
  const [languages, setLanguages] = useState<any[]>([]);
  const [editedLanguages, setEditedLanguages] = useState<any[]>([]);
  const [volunteerWork, setVolunteerWork] = useState<any[]>([]);
  const [editedVolunteerWork, setEditedVolunteerWork] = useState<any[]>([]);
  const [publications, setPublications] = useState<any[]>([]);
  const [editedPublications, setEditedPublications] = useState<any[]>([]);
  const [awards, setAwards] = useState<any[]>([]);
  const [editedAwards, setEditedAwards] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all user data
  useEffect(() => {
    const fetchUserData = async () => {
      if (!firestore || !userId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Fetch user document
        const userDocRef = doc(firestore, 'users', userId);
        const userSnap = await getDoc(userDocRef);

        if (!userSnap.exists()) {
          setError('User not found');
          setIsLoading(false);
          return;
        }

        const userData = convertFirestoreToPlain(userSnap.data());
        console.log('User Data:', userData);
        setUser(userData);
        setEditedUser(JSON.parse(JSON.stringify(userData)));

        // Check if education/experience/skills are in the user document itself
        const educationData = userData?.education || [];
        const experienceData = userData?.experience || [];
        const skillsData = userData?.skills || [];
        const projectsData = userData?.projects || [];
        const certificationsData = userData?.certifications || [];
        const languagesData = userData?.languages || [];
        const volunteerData = userData?.volunteerWork || [];
        const publicationsData = userData?.publications || [];
        const awardsData = userData?.awards || [];

        console.log('Data from user doc - Education:', educationData, 'Experience:', experienceData, 'Skills:', skillsData);

        // Try to fetch from subcollections as fallback
        const [educationSnap, experienceSnap, skillsSnap, projectsSnap, certificationsSnap, languagesSnap, volunteerSnap, publicationsSnap, awardsSnap] = await Promise.all([
          getDocs(collection(firestore, 'users', userId, 'education')),
          getDocs(collection(firestore, 'users', userId, 'experience')),
          getDocs(collection(firestore, 'users', userId, 'skills')),
          getDocs(collection(firestore, 'users', userId, 'projects')),
          getDocs(collection(firestore, 'users', userId, 'certifications')),
          getDocs(collection(firestore, 'users', userId, 'languages')),
          getDocs(collection(firestore, 'users', userId, 'volunteerWork')),
          getDocs(collection(firestore, 'users', userId, 'publications')),
          getDocs(collection(firestore, 'users', userId, 'awards')),
        ]);

        // Use data from user document if available, otherwise use subcollections
        const finalEducation = educationData.length > 0 
          ? educationData 
          : educationSnap.docs.map(doc => convertFirestoreToPlain({ id: doc.id, ...doc.data() }));
        
        const finalExperience = experienceData.length > 0 
          ? experienceData 
          : experienceSnap.docs.map(doc => convertFirestoreToPlain({ id: doc.id, ...doc.data() }));
        
        const finalSkills = skillsData.length > 0 
          ? skillsData 
          : skillsSnap.docs.map(doc => convertFirestoreToPlain({ id: doc.id, ...doc.data() }));
        
        const finalProjects = projectsData.length > 0 
          ? projectsData 
          : projectsSnap.docs.map(doc => convertFirestoreToPlain({ id: doc.id, ...doc.data() }));
        
        const finalCertifications = certificationsData.length > 0 
          ? certificationsData 
          : certificationsSnap.docs.map(doc => convertFirestoreToPlain({ id: doc.id, ...doc.data() }));
        
        const finalLanguages = languagesData.length > 0 
          ? languagesData 
          : languagesSnap.docs.map(doc => convertFirestoreToPlain({ id: doc.id, ...doc.data() }));
        
        const finalVolunteer = volunteerData.length > 0 
          ? volunteerData 
          : volunteerSnap.docs.map(doc => convertFirestoreToPlain({ id: doc.id, ...doc.data() }));
        
        const finalPublications = publicationsData.length > 0 
          ? publicationsData 
          : publicationsSnap.docs.map(doc => convertFirestoreToPlain({ id: doc.id, ...doc.data() }));
        
        const finalAwards = awardsData.length > 0 
          ? awardsData 
          : awardsSnap.docs.map(doc => convertFirestoreToPlain({ id: doc.id, ...doc.data() }));

        setEducation(finalEducation);
        setEditedEducation(JSON.parse(JSON.stringify(finalEducation)));
        setExperience(finalExperience);
        setEditedExperience(JSON.parse(JSON.stringify(finalExperience)));
        setSkills(finalSkills);
        setEditedSkills(JSON.parse(JSON.stringify(finalSkills)));
        setProjects(finalProjects);
        setEditedProjects(JSON.parse(JSON.stringify(finalProjects)));
        setCertifications(finalCertifications);
        setEditedCertifications(JSON.parse(JSON.stringify(finalCertifications)));
        setLanguages(finalLanguages);
        setEditedLanguages(JSON.parse(JSON.stringify(finalLanguages)));
        setVolunteerWork(finalVolunteer);
        setEditedVolunteerWork(JSON.parse(JSON.stringify(finalVolunteer)));
        setPublications(finalPublications);
        setEditedPublications(JSON.parse(JSON.stringify(finalPublications)));
        setAwards(finalAwards);
        setEditedAwards(JSON.parse(JSON.stringify(finalAwards)));

        console.log('Fetched Education:', finalEducation);
        console.log('Fetched Experience:', finalExperience);
        console.log('Fetched Skills:', finalSkills);
        console.log('Fetched Projects:', finalProjects);
        console.log('Fetched Certifications:', finalCertifications);
        console.log('Fetched Languages:', finalLanguages);
        console.log('Fetched VolunteerWork:', finalVolunteer);
        console.log('Fetched Publications:', finalPublications);
        console.log('Fetched Awards:', finalAwards);

        setIsLoading(false);
      } catch (err: any) {
        console.error('Error fetching user profile:', err);
        console.error('Error details:', err.code, err.message);
        setError(err?.message || 'Failed to load user profile');
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [firestore, userId]);

  // Handle save changes
  const handleSaveChanges = async () => {
    if (!user || !userId || !firestore) return;
    
    try {
      setIsSaving(true);
      const userDocRef = doc(firestore, 'users', userId);

      const updateData = {
        ...editedUser,
        education: editedEducation,
        experience: editedExperience,
        skills: editedSkills,
        projects: editedProjects,
        certifications: editedCertifications,
        languages: editedLanguages,
        volunteerWork: editedVolunteerWork,
        publications: editedPublications,
        awards: editedAwards,
        updatedAt: new Date().toISOString()
      };

      await updateDocumentNonBlocking(userDocRef, updateData);
      
      // Update local state
      setUser(editedUser);
      setEducation(editedEducation);
      setExperience(editedExperience);
      setSkills(editedSkills);
      setProjects(editedProjects);
      setCertifications(editedCertifications);
      setLanguages(editedLanguages);
      setVolunteerWork(editedVolunteerWork);
      setPublications(editedPublications);
      setAwards(editedAwards);
      setIsEditMode(false);
      
      toast({
        title: "Success",
        description: "Profile updated successfully!",
        variant: "default"
      });
    } catch (err: any) {
      console.error('Error saving changes:', err);
      toast({
        title: "Error",
        description: "Failed to save changes. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditedUser(JSON.parse(JSON.stringify(user)));
    setEditedEducation(JSON.parse(JSON.stringify(education)));
    setEditedExperience(JSON.parse(JSON.stringify(experience)));
    setEditedSkills(JSON.parse(JSON.stringify(skills)));
    setEditedProjects(JSON.parse(JSON.stringify(projects)));
    setEditedCertifications(JSON.parse(JSON.stringify(certifications)));
    setEditedLanguages(JSON.parse(JSON.stringify(languages)));
    setEditedVolunteerWork(JSON.parse(JSON.stringify(volunteerWork)));
    setEditedPublications(JSON.parse(JSON.stringify(publications)));
    setEditedAwards(JSON.parse(JSON.stringify(awards)));
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="animate-spin w-8 h-8 mx-auto mb-2" />
            <p className="text-gray-500">Loading user profile...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-6">
            <p className="text-red-700 font-semibold">Error: {error}</p>
            {!userId && <p className="text-red-600 text-sm mt-2">No user ID provided in the URL</p>}
          </CardContent>
        </Card>
      )}

      {/* Profile Content */}
      {!isLoading && user && !error && (
        <>
          {/* Action Buttons - Top Right */}
          <div className="mb-6 flex gap-2 justify-end">
            {!isEditMode ? (
              <Button 
                onClick={() => setIsEditMode(true)}
                className="gap-2"
                variant="default"
              >
                <Edit3 className="w-4 h-4" />
                Edit Profile
              </Button>
            ) : (
              <>
                <Button 
                  onClick={handleCancelEdit}
                  className="gap-2"
                  variant="outline"
                  disabled={isSaving}
                >
                  <X className="w-4 h-4" />
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveChanges}
                  className="gap-2"
                  disabled={isSaving}
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </>
            )}
          </div>
          {/* Header Card with Contact Information */}
          <Card className="border-2 border-blue-500 dark:border-blue-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800">
            <CardHeader>
              <div className="flex justify-between items-start mb-4 flex-wrap gap-4">
                <div className="flex-1">
                  <CardTitle className="text-2xl mb-2 dark:text-white">
                    {isEditMode ? (
                      <Input
                        value={editedUser.name || ''}
                        onChange={(e) => setEditedUser({...editedUser, name: e.target.value})}
                        placeholder="Full Name"
                        className="text-2xl h-auto"
                      />
                    ) : (
                      editedUser.name
                    )}
                  </CardTitle>
                </div>
                <div className="flex items-center gap-4">
                  {editedUser.photoURL && (
                    <img src={editedUser.photoURL} alt={editedUser.name} className="w-20 h-20 rounded-full object-cover border-2 border-blue-300 dark:border-blue-600" />
                  )}
                  <div className="text-right">
                    <Badge className="mb-2 mr-2 dark:bg-blue-700">{editedUser.subscription?.plan || 'Free Plan'}</Badge>
                    <div>
                      {editedUser.profileCompleted ? (
                        <Badge variant="default" className="bg-green-600 dark:bg-green-700">Profile Complete</Badge>
                      ) : (
                        <Badge variant="secondary" className="dark:bg-gray-700">Profile Incomplete</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {isEditMode ? (
                <>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <div className="text-sm flex-1">
                      <div className="text-xs text-gray-500 dark:text-gray-400">Email</div>
                      <Input
                        value={editedUser.email || ''}
                        onChange={(e) => setEditedUser({...editedUser, email: e.target.value})}
                        placeholder="Email"
                        type="email"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <div className="text-sm flex-1">
                      <div className="text-xs text-gray-500 dark:text-gray-400">Phone</div>
                      <Input
                        value={editedUser.phone || ''}
                        onChange={(e) => setEditedUser({...editedUser, phone: e.target.value})}
                        placeholder="Phone"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <div className="text-sm flex-1">
                      <div className="text-xs text-gray-500 dark:text-gray-400">Location</div>
                      <Input
                        value={editedUser.location || ''}
                        onChange={(e) => setEditedUser({...editedUser, location: e.target.value})}
                        placeholder="Location"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Linkedin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <div className="text-sm flex-1">
                      <div className="text-xs text-gray-500 dark:text-gray-400">LinkedIn</div>
                      <Input
                        value={editedUser.linkedin || ''}
                        onChange={(e) => setEditedUser({...editedUser, linkedin: e.target.value})}
                        placeholder="LinkedIn URL"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Github className="w-4 h-4 text-gray-800 dark:text-gray-200" />
                    <div className="text-sm flex-1">
                      <div className="text-xs text-gray-500 dark:text-gray-400">GitHub</div>
                      <Input
                        value={editedUser.github || ''}
                        onChange={(e) => setEditedUser({...editedUser, github: e.target.value})}
                        placeholder="GitHub URL"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <div className="text-sm flex-1">
                      <div className="text-xs text-gray-500 dark:text-gray-400">Portfolio</div>
                      <Input
                        value={editedUser.portfolioURL || ''}
                        onChange={(e) => setEditedUser({...editedUser, portfolioURL: e.target.value})}
                        placeholder="Portfolio URL"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <div className="text-sm flex-1">
                      <div className="text-xs text-gray-500 dark:text-gray-400">Address</div>
                      <Input
                        value={editedUser.address || ''}
                        onChange={(e) => setEditedUser({...editedUser, address: e.target.value})}
                        placeholder="Address"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {editedUser.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      <div className="text-sm">
                        <div className="text-xs text-gray-500 dark:text-gray-400">Email</div>
                        <div className="font-medium dark:text-gray-100">{editedUser.email}</div>
                      </div>
                    </div>
                  )}
                  {editedUser.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      <div className="text-sm">
                        <div className="text-xs text-gray-500 dark:text-gray-400">Phone</div>
                        <div className="font-medium dark:text-gray-100">{editedUser.phone}</div>
                      </div>
                    </div>
                  )}
                  {editedUser.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      <div className="text-sm">
                        <div className="text-xs text-gray-500 dark:text-gray-400">Location</div>
                        <div className="font-medium dark:text-gray-100">{editedUser.location}</div>
                      </div>
                    </div>
                  )}
                  {editedUser.linkedin && (
                    <div className="flex items-center gap-2">
                      <Linkedin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <div className="text-sm">
                        <div className="text-xs text-gray-500 dark:text-gray-400">LinkedIn</div>
                        <a href={editedUser.linkedin} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 dark:text-blue-400 hover:underline truncate">
                          Profile
                        </a>
                      </div>
                    </div>
                  )}
                  {editedUser.github && (
                    <div className="flex items-center gap-2">
                      <Github className="w-4 h-4 text-gray-800 dark:text-gray-200" />
                      <div className="text-sm">
                        <div className="text-xs text-gray-500 dark:text-gray-400">GitHub</div>
                        <a href={editedUser.github} target="_blank" rel="noopener noreferrer" className="font-medium text-gray-800 dark:text-blue-400 hover:underline truncate">
                          Profile
                        </a>
                      </div>
                    </div>
                  )}
                  {editedUser.portfolioURL && (
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <div className="text-sm">
                        <div className="text-xs text-gray-500 dark:text-gray-400">Portfolio</div>
                        <a href={editedUser.portfolioURL} target="_blank" rel="noopener noreferrer" className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline truncate">
                          Visit
                        </a>
                      </div>
                    </div>
                  )}
                  {editedUser.address && (
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      <div className="text-sm">
                        <div className="text-xs text-gray-500 dark:text-gray-400">Address</div>
                        <div className="font-medium text-gray-800 dark:text-gray-100">{editedUser.address}</div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Uniform Grid Cards Section - All Profile Data */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Personal Details Card */}
            <Card className="border-2 border-purple-500 dark:border-purple-700 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-slate-900 dark:to-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-white text-lg">
                  <Users className="w-5 h-5" />
                  Personal Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 min-h-[200px]">
                {editedUser.dateOfBirth || editedUser.gender || editedUser.citizenship || editedUser.phone || editedUser.location ? (
                  <>
                    {editedUser.dateOfBirth && (
                      <div className="border-l-4 border-purple-300 dark:border-purple-500 pl-4">
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold">Date of Birth</div>
                        {isEditMode ? (
                          <Input
                            type="date"
                            value={editedUser.dateOfBirth?.split('T')[0] || ''}
                            onChange={(e) => setEditedUser({...editedUser, dateOfBirth: e.target.value})}
                          />
                        ) : (
                          <div className="text-sm font-medium dark:text-gray-100">{new Date(editedUser.dateOfBirth).toLocaleDateString()}</div>
                        )}
                      </div>
                    )}
                    {editedUser.gender && (
                      <div className="border-l-4 border-purple-300 dark:border-purple-500 pl-4">
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold">Gender</div>
                        {isEditMode ? (
                          <Input
                            value={editedUser.gender}
                            onChange={(e) => setEditedUser({...editedUser, gender: e.target.value})}
                            placeholder="Gender"
                          />
                        ) : (
                          <div className="text-sm font-medium dark:text-gray-100">{editedUser.gender}</div>
                        )}
                      </div>
                    )}
                    {editedUser.citizenship && (
                      <div className="border-l-4 border-purple-300 dark:border-purple-500 pl-4">
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold">Citizenship</div>
                        {isEditMode ? (
                          <Input
                            value={editedUser.citizenship}
                            onChange={(e) => setEditedUser({...editedUser, citizenship: e.target.value})}
                            placeholder="Citizenship"
                          />
                        ) : (
                          <div className="text-sm font-medium dark:text-gray-100">{editedUser.citizenship}</div>
                        )}
                      </div>
                    )}
                    {editedUser.phone && (
                      <div className="border-l-4 border-purple-300 dark:border-purple-500 pl-4">
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold">Phone</div>
                        {isEditMode ? (
                          <Input
                            value={editedUser.phone}
                            onChange={(e) => setEditedUser({...editedUser, phone: e.target.value})}
                            placeholder="Phone"
                          />
                        ) : (
                          <div className="text-sm font-medium dark:text-gray-100">{editedUser.phone}</div>
                        )}
                      </div>
                    )}
                    {editedUser.location && (
                      <div className="border-l-4 border-purple-300 dark:border-purple-500 pl-4">
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold">Location</div>
                        {isEditMode ? (
                          <Input
                            value={editedUser.location}
                            onChange={(e) => setEditedUser({...editedUser, location: e.target.value})}
                            placeholder="Location"
                          />
                        ) : (
                          <div className="text-sm font-medium dark:text-gray-100">{editedUser.location}</div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 text-sm">
                    No data found
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Education Card */}
            <Card className="border-2 border-blue-500 dark:border-blue-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-white text-lg">
                  <BookOpen className="w-5 h-5" />
                  Education ({editedEducation.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 min-h-[200px]">
                {editedEducation && editedEducation.length > 0 ? (
                  editedEducation.map((edu: any, index: number) => (
                    isEditMode ? (
                      <div key={index} className="border-2 border-blue-300 dark:border-blue-600 p-3 rounded">
                        <div className="space-y-2">
                          <Input
                            value={edu.degree || ''}
                            onChange={(e) => {
                              const updated = [...editedEducation];
                              updated[index].degree = e.target.value;
                              setEditedEducation(updated);
                            }}
                            placeholder="Degree"
                          />
                          <Input
                            value={edu.university || ''}
                            onChange={(e) => {
                              const updated = [...editedEducation];
                              updated[index].university = e.target.value;
                              setEditedEducation(updated);
                            }}
                            placeholder="University"
                          />
                          <Input
                            value={edu.course || ''}
                            onChange={(e) => {
                              const updated = [...editedEducation];
                              updated[index].course = e.target.value;
                              setEditedEducation(updated);
                            }}
                            placeholder="Course (optional)"
                          />
                          <Input
                            value={edu.year || ''}
                            onChange={(e) => {
                              const updated = [...editedEducation];
                              updated[index].year = e.target.value;
                              setEditedEducation(updated);
                            }}
                            placeholder="Graduation Year"
                          />
                          <Input
                            value={edu.duration || ''}
                            onChange={(e) => {
                              const updated = [...editedEducation];
                              updated[index].duration = e.target.value;
                              setEditedEducation(updated);
                            }}
                            placeholder="Duration (optional)"
                          />
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              const updated = editedEducation.filter((_, i) => i !== index);
                              setEditedEducation(updated);
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div key={index} className="border-l-4 border-blue-400 dark:border-blue-500 pl-4 pb-3 last:pb-0">
                        <div className="font-semibold dark:text-white text-sm">
                          {edu.degree || 'Degree'}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-300">
                          {edu.university || 'University'}
                        </div>
                        {edu.year && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Graduation Year: {edu.year}
                          </div>
                        )}
                        {edu.duration && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Duration: {edu.duration}
                          </div>
                        )}
                      </div>
                    )
                  ))
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 text-sm">
                    No data found
                  </div>
                )}
                {isEditMode && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditedEducation([...editedEducation, {degree: '', university: '', course: '', year: '', duration: ''}])}
                  >
                    + Add Education
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Skills Card */}
            <Card className="border-2 border-cyan-500 dark:border-cyan-700 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-white text-lg">
                  <Zap className="w-5 h-5" />
                  Skills ({editedSkills.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="min-h-[200px]">
                {editedSkills && editedSkills.length > 0 ? (
                  <>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {editedSkills.map((skill: any, index: number) => (
                        <div key={index} className="flex items-center gap-2">
                          <Badge variant="secondary" className="dark:bg-slate-700 dark:text-gray-200 text-xs">
                            {typeof skill === 'string' ? skill : (skill.skillName || skill.name || skill.skill || 'Skill')}
                          </Badge>
                          {isEditMode && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                const updated = editedSkills.filter((_, i) => i !== index);
                                setEditedSkills(updated);
                              }}
                              className="h-6 w-6 p-0"
                            >
                              ✕
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                    {isEditMode && (
                      <div className="flex gap-2">
                        <Input
                          id="skillInput"
                          placeholder="Add a skill"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                              setEditedSkills([...editedSkills, e.currentTarget.value.trim()]);
                              e.currentTarget.value = '';
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const input = document.getElementById('skillInput') as HTMLInputElement;
                            if (input && input.value.trim()) {
                              setEditedSkills([...editedSkills, input.value.trim()]);
                              input.value = '';
                            }
                          }}
                        >
                          Add
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 text-sm">
                    No data found
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Certifications Card */}
            <Card className="border-2 border-orange-500 dark:border-orange-700 bg-gradient-to-r from-orange-50 to-red-50 dark:from-slate-900 dark:to-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-white text-lg">
                  <Award className="w-5 h-5" />
                  Certifications ({editedCertifications.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 min-h-[200px]">
                {editedCertifications && editedCertifications.length > 0 ? (
                  editedCertifications.map((cert: any, index: number) => (
                    isEditMode ? (
                      <div key={index} className="border-2 border-orange-300 dark:border-orange-600 p-3 rounded">
                        <div className="space-y-2">
                          <Input
                            value={cert.title || ''}
                            onChange={(e) => {
                              const updated = [...editedCertifications];
                              updated[index].title = e.target.value;
                              setEditedCertifications(updated);
                            }}
                            placeholder="Certification Title"
                          />
                          <Input
                            value={cert.issuer || ''}
                            onChange={(e) => {
                              const updated = [...editedCertifications];
                              updated[index].issuer = e.target.value;
                              setEditedCertifications(updated);
                            }}
                            placeholder="Issuer/Organization"
                          />
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              const updated = editedCertifications.filter((_, i) => i !== index);
                              setEditedCertifications(updated);
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div key={index} className="border-l-4 border-orange-400 dark:border-orange-500 pl-4 pb-3 last:pb-0">
                        <div className="font-semibold dark:text-white text-sm">
                          {cert.title || 'Certification'}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-300">
                          {cert.issuer || 'Organization'}
                        </div>
                      </div>
                    )
                  ))
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 text-sm">
                    No data found
                  </div>
                )}
                {isEditMode && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditedCertifications([...editedCertifications, {title: '', issuer: ''}])}
                  >
                    + Add Certification
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Projects Card */}
            <Card className="border-2 border-indigo-500 dark:border-indigo-700 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-white text-lg">
                  <FileText className="w-5 h-5" />
                  Projects ({editedProjects.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 min-h-[200px]">
                {editedProjects && editedProjects.length > 0 ? (
                  editedProjects.map((project: any, index: number) => (
                    isEditMode ? (
                      <div key={index} className="border-2 border-indigo-300 dark:border-indigo-600 p-3 rounded">
                        <div className="space-y-2">
                          <Input
                            value={project.title || ''}
                            onChange={(e) => {
                              const updated = [...editedProjects];
                              updated[index].title = e.target.value;
                              setEditedProjects(updated);
                            }}
                            placeholder="Project Title"
                          />
                          <Textarea
                            value={project.description || ''}
                            onChange={(e) => {
                              const updated = [...editedProjects];
                              updated[index].description = e.target.value;
                              setEditedProjects(updated);
                            }}
                            placeholder="Description"
                          />
                          <Input
                            value={Array.isArray(project.tech) ? project.tech.join(', ') : (project.tech || '')}
                            onChange={(e) => {
                              const updated = [...editedProjects];
                              updated[index].tech = e.target.value.split(',').map(t => t.trim());
                              setEditedProjects(updated);
                            }}
                            placeholder="Technologies (comma-separated)"
                          />
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              const updated = editedProjects.filter((_, i) => i !== index);
                              setEditedProjects(updated);
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div key={index} className="border-l-4 border-indigo-400 dark:border-indigo-500 pl-4 pb-3 last:pb-0">
                        <div className="font-semibold dark:text-white text-sm">{project.title || 'Project'}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">
                          {project.description || 'No description'}
                        </div>
                        {project.tech && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(Array.isArray(project.tech) ? project.tech : project.tech.split(',')).map((tech: string, idx: number) => (
                              <Badge key={idx} variant="outline" className="text-xs dark:border-indigo-500 dark:text-indigo-300">
                                {typeof tech === 'string' ? tech.trim() : tech}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  ))
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 text-sm">
                    No data found
                  </div>
                )}
                {isEditMode && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditedProjects([...editedProjects, {title: '', description: '', tech: []}])}
                  >
                    + Add Project
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Experience Card */}
            <Card className="border-2 border-blue-500 dark:border-blue-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-white text-lg">
                  <Briefcase className="w-5 h-5" />
                  Experience ({editedExperience.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 min-h-[200px]">
                {editedExperience && editedExperience.length > 0 ? (
                  editedExperience.map((exp: any, index: number) => (
                    isEditMode ? (
                      <div key={index} className="border-2 border-blue-300 dark:border-blue-600 p-3 rounded">
                        <div className="space-y-2">
                          <Input
                            value={exp.role || ''}
                            onChange={(e) => {
                              const updated = [...editedExperience];
                              updated[index].role = e.target.value;
                              setEditedExperience(updated);
                            }}
                            placeholder="Job Title/Role"
                          />
                          <Input
                            value={exp.company || ''}
                            onChange={(e) => {
                              const updated = [...editedExperience];
                              updated[index].company = e.target.value;
                              setEditedExperience(updated);
                            }}
                            placeholder="Company"
                          />
                          <Input
                            value={exp.duration || ''}
                            onChange={(e) => {
                              const updated = [...editedExperience];
                              updated[index].duration = e.target.value;
                              setEditedExperience(updated);
                            }}
                            placeholder="Duration"
                          />
                          <Textarea
                            value={exp.description || ''}
                            onChange={(e) => {
                              const updated = [...editedExperience];
                              updated[index].description = e.target.value;
                              setEditedExperience(updated);
                            }}
                            placeholder="Description (optional)"
                          />
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              const updated = editedExperience.filter((_, i) => i !== index);
                              setEditedExperience(updated);
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div key={index} className="border-l-4 border-blue-400 dark:border-blue-500 pl-4 pb-3 last:pb-0">
                        <div className="font-semibold dark:text-white text-sm">
                          {exp.role || 'Position'}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-300">
                          {exp.company || 'Company'}
                        </div>
                        {exp.duration && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {exp.duration}
                          </div>
                        )}
                        {exp.description && (
                          <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                            {exp.description}
                          </div>
                        )}
                      </div>
                    )
                  ))
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 text-sm">
                    No data found
                  </div>
                )}
                {isEditMode && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditedExperience([...editedExperience, {role: '', company: '', duration: '', description: ''}])}
                  >
                    + Add Experience
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Job Preferences Card */}
            <Card className="border-2 border-rose-500 dark:border-rose-700 bg-gradient-to-r from-rose-50 to-pink-50 dark:from-slate-900 dark:to-slate-800">
              <CardHeader>
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2 dark:text-white text-lg mb-2">
                      <Briefcase className="w-5 h-5" />
                      Job Preferences
                    </CardTitle>
                    {editedUser?.desiredRoles && editedUser.desiredRoles.length > 0 && (
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        Based on desired roles: <span className="font-semibold dark:text-gray-300">{editedUser.desiredRoles.join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 min-h-[200px]">
                {editedUser?.jobPreferences && Array.isArray(editedUser.jobPreferences) && editedUser.jobPreferences.length > 0 ? (
                  editedUser.jobPreferences.map((pref: any, index: number) => (
                    isEditMode ? (
                      <div key={index} className="border-2 border-rose-300 dark:border-rose-600 p-3 rounded">
                        <div className="space-y-2">
                          <div className="text-xs font-semibold text-rose-700 dark:text-rose-400 mb-1">Desired Role</div>
                          <Input
                            value={pref.desiredRoles || ''}
                            onChange={(e) => {
                              const updated = [...editedUser.jobPreferences];
                              updated[index].desiredRoles = e.target.value;
                              setEditedUser({...editedUser, jobPreferences: updated});
                            }}
                            placeholder="Desired Roles"
                          />
                          <Input
                            value={pref.locationPreference || ''}
                            onChange={(e) => {
                              const updated = [...editedUser.jobPreferences];
                              updated[index].locationPreference = e.target.value;
                              setEditedUser({...editedUser, jobPreferences: updated});
                            }}
                            placeholder="Location Preference"
                          />
                          <Input
                            value={pref.keywords || ''}
                            onChange={(e) => {
                              const updated = [...editedUser.jobPreferences];
                              updated[index].keywords = e.target.value;
                              setEditedUser({...editedUser, jobPreferences: updated});
                            }}
                            placeholder="Keywords (optional)"
                          />
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              const updated = (editedUser.jobPreferences as typeof editedUser.jobPreferences).filter((_: any, i: number) => i !== index);
                              setEditedUser({...editedUser, jobPreferences: updated});
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div key={index} className="border-l-4 border-rose-400 dark:border-rose-500 pl-4 pb-3 last:pb-0">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Desired Role</div>
                        <div className="font-semibold dark:text-white text-sm mb-2">{pref.desiredRoles || 'Job Preference'}</div>
                        {pref.locationPreference && <div className="text-xs text-gray-600 dark:text-gray-300">📍 {pref.locationPreference}</div>}
                        {pref.keywords && <div className="text-xs text-gray-500 dark:text-gray-400">Keywords: {pref.keywords}</div>}
                      </div>
                    )
                  ))
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 text-sm">
                    No data found
                  </div>
                )}
                {isEditMode && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditedUser({...editedUser, jobPreferences: [...(editedUser.jobPreferences || []), {desiredRoles: '', locationPreference: '', keywords: ''}]})}
                  >
                    + Add Job Preference
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Career Goals Card */}
            <Card className="border-2 border-emerald-500 dark:border-emerald-700 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-slate-900 dark:to-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-white text-lg">
                  <Briefcase className="w-5 h-5" />
                  Career Goals
                </CardTitle>
              </CardHeader>
              <CardContent className="min-h-[200px]">
                {editedUser?.desiredRoles && editedUser.desiredRoles.length > 0 ? (
                  <>
                    {isEditMode ? (
                      <div className="space-y-2">
                        <Textarea
                          value={(editedUser.desiredRoles || []).join(', ')}
                          onChange={(e) => setEditedUser({...editedUser, desiredRoles: e.target.value.split(',').map(r => r.trim())})}
                          placeholder="Desired Roles (comma-separated)"
                        />
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {editedUser.desiredRoles.map((role: string, index: number) => (
                          <Badge key={index} className="bg-emerald-600 dark:bg-emerald-700 text-white">
                            {role}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 text-sm">
                    No data found
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Languages Card */}
            <Card className="border-2 border-teal-500 dark:border-teal-700 bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-slate-900 dark:to-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-white text-lg">
                  <Globe className="w-5 h-5" />
                  Languages ({editedLanguages.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 min-h-[200px]">
                {editedLanguages && editedLanguages.length > 0 ? (
                  editedLanguages.map((lang: any, index: number) => (
                    isEditMode ? (
                      <div key={index} className="border-2 border-teal-300 dark:border-teal-600 p-3 rounded">
                        <div className="space-y-2">
                          <Input
                            value={lang.language || ''}
                            onChange={(e) => {
                              const updated = [...editedLanguages];
                              updated[index].language = e.target.value;
                              setEditedLanguages(updated);
                            }}
                            placeholder="Language"
                          />
                          <Input
                            value={lang.proficiency || ''}
                            onChange={(e) => {
                              const updated = [...editedLanguages];
                              updated[index].proficiency = e.target.value;
                              setEditedLanguages(updated);
                            }}
                            placeholder="Proficiency Level"
                          />
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              const updated = editedLanguages.filter((_, i) => i !== index);
                              setEditedLanguages(updated);
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div key={index} className="border-l-4 border-teal-400 dark:border-teal-500 pl-4">
                        <div className="font-semibold dark:text-white text-sm">{lang.language || 'Language'}</div>
                        {lang.proficiency && <div className="text-xs text-gray-600 dark:text-gray-300">Proficiency: {lang.proficiency}</div>}
                      </div>
                    )
                  ))
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 text-sm">
                    No data found
                  </div>
                )}
                {isEditMode && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditedLanguages([...editedLanguages, {language: '', proficiency: ''}])}
                  >
                    + Add Language
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Volunteer Work Card */}
            <Card className="border-2 border-pink-500 dark:border-pink-700 bg-gradient-to-r from-pink-50 to-rose-50 dark:from-slate-900 dark:to-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-white text-lg">
                  <Heart className="w-5 h-5" />
                  Volunteer Work ({editedVolunteerWork.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 min-h-[200px]">
                {editedVolunteerWork && editedVolunteerWork.length > 0 ? (
                  editedVolunteerWork.map((vol: any, index: number) => (
                    isEditMode ? (
                      <div key={index} className="border-2 border-pink-300 dark:border-pink-600 p-3 rounded">
                        <div className="space-y-2">
                          <Input
                            value={vol.role || ''}
                            onChange={(e) => {
                              const updated = [...editedVolunteerWork];
                              updated[index].role = e.target.value;
                              setEditedVolunteerWork(updated);
                            }}
                            placeholder="Volunteer Role"
                          />
                          <Input
                            value={vol.organization || ''}
                            onChange={(e) => {
                              const updated = [...editedVolunteerWork];
                              updated[index].organization = e.target.value;
                              setEditedVolunteerWork(updated);
                            }}
                            placeholder="Organization"
                          />
                          <Input
                            value={vol.duration || ''}
                            onChange={(e) => {
                              const updated = [...editedVolunteerWork];
                              updated[index].duration = e.target.value;
                              setEditedVolunteerWork(updated);
                            }}
                            placeholder="Duration"
                          />
                          <Textarea
                            value={vol.description || ''}
                            onChange={(e) => {
                              const updated = [...editedVolunteerWork];
                              updated[index].description = e.target.value;
                              setEditedVolunteerWork(updated);
                            }}
                            placeholder="Description (optional)"
                          />
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              const updated = editedVolunteerWork.filter((_, i) => i !== index);
                              setEditedVolunteerWork(updated);
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div key={index} className="border-l-4 border-pink-400 dark:border-pink-500 pl-4 pb-3 last:pb-0">
                        <div className="font-semibold dark:text-white text-sm">{vol.role || 'Volunteer Role'}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-300">{vol.organization || 'Organization'}</div>
                        {vol.duration && <div className="text-xs text-gray-500 dark:text-gray-400">{vol.duration}</div>}
                        {vol.description && <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">{vol.description}</div>}
                      </div>
                    )
                  ))
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 text-sm">
                    No data found
                  </div>
                )}
                {isEditMode && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditedVolunteerWork([...editedVolunteerWork, {role: '', organization: '', duration: '', description: ''}])}
                  >
                    + Add Volunteer Work
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Publications Card */}
            <Card className="border-2 border-amber-500 dark:border-amber-700 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-slate-900 dark:to-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-white text-lg">
                  <BookOpen className="w-5 h-5" />
                  Publications ({editedPublications.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 min-h-[200px]">
                {editedPublications && editedPublications.length > 0 ? (
                  editedPublications.map((pub: any, index: number) => (
                    isEditMode ? (
                      <div key={index} className="border-2 border-amber-300 dark:border-amber-600 p-3 rounded">
                        <div className="space-y-2">
                          <Input
                            value={pub.title || ''}
                            onChange={(e) => {
                              const updated = [...editedPublications];
                              updated[index].title = e.target.value;
                              setEditedPublications(updated);
                            }}
                            placeholder="Publication Title"
                          />
                          <Input
                            value={pub.publication || ''}
                            onChange={(e) => {
                              const updated = [...editedPublications];
                              updated[index].publication = e.target.value;
                              setEditedPublications(updated);
                            }}
                            placeholder="Publication/Conference Name"
                          />
                          <Input
                            type="date"
                            value={pub.date ? pub.date.split('T')[0] : ''}
                            onChange={(e) => {
                              const updated = [...editedPublications];
                              updated[index].date = e.target.value;
                              setEditedPublications(updated);
                            }}
                            placeholder="Date"
                          />
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              const updated = editedPublications.filter((_, i) => i !== index);
                              setEditedPublications(updated);
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div key={index} className="border-l-4 border-amber-400 dark:border-amber-500 pl-4 pb-3 last:pb-0">
                        <div className="font-semibold dark:text-white text-sm">{pub.title || 'Publication'}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-300">{pub.publication || 'Publication Name'}</div>
                        {pub.date && <div className="text-xs text-gray-500 dark:text-gray-400">Published: {pub.date}</div>}
                      </div>
                    )
                  ))
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 text-sm">
                    No data found
                  </div>
                )}
                {isEditMode && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditedPublications([...editedPublications, {title: '', publication: '', date: ''}])}
                  >
                    + Add Publication
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Awards Card */}
            <Card className="border-2 border-yellow-500 dark:border-yellow-700 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-slate-900 dark:to-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-white text-lg">
                  <Trophy className="w-5 h-5" />
                  Awards ({editedAwards.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 min-h-[200px]">
                {editedAwards && editedAwards.length > 0 ? (
                  editedAwards.map((award: any, index: number) => (
                    isEditMode ? (
                      <div key={index} className="border-2 border-yellow-300 dark:border-yellow-600 p-3 rounded">
                        <div className="space-y-2">
                          <Input
                            value={award.title || ''}
                            onChange={(e) => {
                              const updated = [...editedAwards];
                              updated[index].title = e.target.value;
                              setEditedAwards(updated);
                            }}
                            placeholder="Award Title"
                          />
                          <Input
                            value={award.organization || ''}
                            onChange={(e) => {
                              const updated = [...editedAwards];
                              updated[index].organization = e.target.value;
                              setEditedAwards(updated);
                            }}
                            placeholder="Organization"
                          />
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              const updated = editedAwards.filter((_, i) => i !== index);
                              setEditedAwards(updated);
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div key={index} className="border-l-4 border-yellow-400 dark:border-yellow-500 pl-4 pb-3 last:pb-0">
                        <div className="font-semibold dark:text-white text-sm">{award.title || 'Award'}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-300">{award.organization || 'Organization'}</div>
                      </div>
                    )
                  ))
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 text-sm">
                    No data found
                  </div>
                )}
                {isEditMode && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditedAwards([...editedAwards, {title: '', organization: ''}])}
                  >
                    + Add Award
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Professional Details Card */}
            <Card className="border-2 border-violet-500 dark:border-violet-700 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-slate-900 dark:to-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-white text-lg">
                  <Briefcase className="w-5 h-5" />
                  Professional Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 min-h-[200px]">
                {editedUser?.sponsorship || editedUser?.visaStatus || editedUser?.totalExperience || editedUser?.clearance || editedUser?.relocation ? (
                  <>
                    {editedUser.totalExperience && (
                      <div className="border-l-4 border-violet-300 dark:border-violet-500 pl-4">
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold">Total Experience</div>
                        {isEditMode ? (
                          <Input
                            value={editedUser.totalExperience}
                            onChange={(e) => setEditedUser({...editedUser, totalExperience: e.target.value})}
                            placeholder="Total Experience"
                          />
                        ) : (
                          <div className="text-sm font-medium dark:text-gray-100">{editedUser.totalExperience}</div>
                        )}
                      </div>
                    )}
                    {editedUser.visaStatus && (
                      <div className="border-l-4 border-violet-300 dark:border-violet-500 pl-4">
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold">Visa Status</div>
                        {isEditMode ? (
                          <Input
                            value={editedUser.visaStatus}
                            onChange={(e) => setEditedUser({...editedUser, visaStatus: e.target.value})}
                            placeholder="Visa Status"
                          />
                        ) : (
                          <div className="text-sm font-medium dark:text-gray-100">{editedUser.visaStatus}</div>
                        )}
                      </div>
                    )}
                    {editedUser.sponsorship && (
                      <div className="border-l-4 border-violet-300 dark:border-violet-500 pl-4">
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold">Sponsorship</div>
                        {isEditMode ? (
                          <Input
                            value={editedUser.sponsorship}
                            onChange={(e) => setEditedUser({...editedUser, sponsorship: e.target.value})}
                            placeholder="Sponsorship"
                          />
                        ) : (
                          <div className="text-sm font-medium dark:text-gray-100">{editedUser.sponsorship}</div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 text-sm">
                    No data found
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Address Card */}
            <Card className="border-2 border-green-500 dark:border-green-700 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-slate-900 dark:to-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-white text-lg">
                  <MapPin className="w-5 h-5" />
                  Address
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 min-h-[200px]">
                {editedUser?.address || editedUser?.addressLine1 || editedUser?.city || editedUser?.country ? (
                  <>
                    {editedUser.addressLine1 && (
                      <div className="border-l-4 border-green-400 dark:border-green-500 pl-4">
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold">Street</div>
                        {isEditMode ? (
                          <Input
                            value={editedUser.addressLine1}
                            onChange={(e) => setEditedUser({...editedUser, addressLine1: e.target.value})}
                            placeholder="Street Address"
                          />
                        ) : (
                          <div className="text-sm font-medium dark:text-gray-100">{editedUser.addressLine1}</div>
                        )}
                      </div>
                    )}
                    {editedUser.city && (
                      <div className="border-l-4 border-green-400 dark:border-green-500 pl-4">
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold">City</div>
                        {isEditMode ? (
                          <Input
                            value={editedUser.city}
                            onChange={(e) => setEditedUser({...editedUser, city: e.target.value})}
                            placeholder="City"
                          />
                        ) : (
                          <div className="text-sm font-medium dark:text-gray-100">{editedUser.city}</div>
                        )}
                      </div>
                    )}
                    {editedUser.country && (
                      <div className="border-l-4 border-green-400 dark:border-green-500 pl-4">
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold">Country</div>
                        {isEditMode ? (
                          <Input
                            value={editedUser.country}
                            onChange={(e) => setEditedUser({...editedUser, country: e.target.value})}
                            placeholder="Country"
                          />
                        ) : (
                          <div className="text-sm font-medium dark:text-gray-100">{editedUser.country}</div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 text-sm">
                    No data found
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Interests Card */}
            <Card className="border-2 border-fuchsia-500 dark:border-fuchsia-700 bg-gradient-to-r from-fuchsia-50 to-purple-50 dark:from-slate-900 dark:to-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-white text-lg">
                  <Sparkles className="w-5 h-5" />
                  Interests
                </CardTitle>
              </CardHeader>
              <CardContent className="min-h-[200px]">
                {editedUser?.interests ? (
                  <>
                    {isEditMode ? (
                      <Textarea
                        value={editedUser.interests}
                        onChange={(e) => setEditedUser({...editedUser, interests: e.target.value})}
                        placeholder="Interests (comma-separated)"
                      />
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {editedUser.interests.split(',').map((interest: string, index: number) => (
                          <Badge key={index} variant="secondary" className="dark:bg-slate-700 dark:text-gray-200 text-xs">
                            {interest.trim()}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 text-sm">
                    No data found
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Technical Tools Card */}
            <Card className="border-2 border-sky-500 dark:border-sky-700 bg-gradient-to-r from-sky-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-white text-lg">
                  <Wrench className="w-5 h-5" />
                  Technical Tools
                </CardTitle>
              </CardHeader>
              <CardContent className="min-h-[200px]">
                {editedUser?.technicalTools && Array.isArray(editedUser.technicalTools) && editedUser.technicalTools.length > 0 ? (
                  <>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {editedUser.technicalTools.map((tool: string, index: number) => (
                        <div key={index} className="flex items-center gap-2">
                          <Badge variant="outline" className="dark:border-sky-500 dark:text-sky-300 text-xs">
                            {tool}
                          </Badge>
                          {isEditMode && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                const updated = editedUser.technicalTools.filter((_: any, i: number) => i !== index);
                                setEditedUser({...editedUser, technicalTools: updated});
                              }}
                              className="h-6 w-6 p-0"
                            >
                              ✕
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                    {isEditMode && (
                      <div className="flex gap-2">
                        <Input
                          id="toolInput"
                          placeholder="Add a tool"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                              setEditedUser({...editedUser, technicalTools: [...(editedUser.technicalTools || []), e.currentTarget.value.trim()]});
                              e.currentTarget.value = '';
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const input = document.getElementById('toolInput') as HTMLInputElement;
                            if (input && input.value.trim()) {
                              setEditedUser({...editedUser, technicalTools: [...(editedUser.technicalTools || []), input.value.trim()]});
                              input.value = '';
                            }
                          }}
                        >
                          Add
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 text-sm">
                    No data found
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Demographic Info Card */}
            <Card className="border-2 border-slate-500 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900 dark:to-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-white text-lg">
                  <Users className="w-5 h-5" />
                  Demographic Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 min-h-[200px]">
                {editedUser?.race || editedUser?.veteranStatus || editedUser?.disability || editedUser?.protectedVeteranStatus ? (
                  <>
                    {editedUser.race && (
                      <div className="border-l-4 border-slate-400 dark:border-slate-500 pl-4">
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold">Race/Ethnicity</div>
                        {isEditMode ? (
                          <Input
                            value={editedUser.race}
                            onChange={(e) => setEditedUser({...editedUser, race: e.target.value})}
                            placeholder="Race/Ethnicity"
                          />
                        ) : (
                          <div className="text-sm font-medium dark:text-gray-100">{editedUser.race}</div>
                        )}
                      </div>
                    )}
                    {editedUser.veteranStatus && (
                      <div className="border-l-4 border-slate-400 dark:border-slate-500 pl-4">
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold">Veteran Status</div>
                        {isEditMode ? (
                          <Input
                            value={editedUser.veteranStatus}
                            onChange={(e) => setEditedUser({...editedUser, veteranStatus: e.target.value})}
                            placeholder="Veteran Status"
                          />
                        ) : (
                          <div className="text-sm font-medium dark:text-gray-100">{editedUser.veteranStatus}</div>
                        )}
                      </div>
                    )}
                    {editedUser.disability && (
                      <div className="border-l-4 border-slate-400 dark:border-slate-500 pl-4">
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold">Disability</div>
                        {isEditMode ? (
                          <Input
                            value={editedUser.disability}
                            onChange={(e) => setEditedUser({...editedUser, disability: e.target.value})}
                            placeholder="Disability"
                          />
                        ) : (
                          <div className="text-sm font-medium dark:text-gray-100">{editedUser.disability}</div>
                        )}
                      </div>
                    )}
                    {editedUser.protectedVeteranStatus && (
                      <div className="border-l-4 border-slate-400 dark:border-slate-500 pl-4">
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold">Protected Veteran Status</div>
                        {isEditMode ? (
                          <Input
                            value={editedUser.protectedVeteranStatus}
                            onChange={(e) => setEditedUser({...editedUser, protectedVeteranStatus: e.target.value})}
                            placeholder="Protected Veteran Status"
                          />
                        ) : (
                          <div className="text-sm font-medium dark:text-gray-100">{editedUser.protectedVeteranStatus}</div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 text-sm">
                    No data found
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Declarations & Agreements Card */}
            <Card className="border-2 border-lime-500 dark:border-lime-700 bg-gradient-to-r from-lime-50 to-green-50 dark:from-slate-900 dark:to-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-white text-lg">
                  <CheckCircle className="w-5 h-5" />
                  Legal Agreements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 min-h-[200px]">
                {editedUser?.declarations !== undefined ? (
                  <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-700 rounded border-l-4 border-lime-400 dark:border-lime-500">
                    <div className="flex-1">
                      <div className="font-medium dark:text-white">Terms & Conditions</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Platform agreements accepted</div>
                    </div>
                    <div className="flex-shrink-0">
                      {editedUser.declarations ? (
                        <Badge className="bg-green-600 dark:bg-green-700">✓ Accepted</Badge>
                      ) : (
                        <Badge variant="destructive" className="dark:bg-red-700">✗ Declined</Badge>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 text-sm">
                    No data found
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Empty State Message */}
          {!isLoading && user && !error && 
            (!experience || experience.length === 0) &&
            (!education || education.length === 0) &&
            (!skills || skills.length === 0) &&
            (!projects || projects.length === 0) &&
            (!certifications || certifications.length === 0) &&
            (!languages || languages.length === 0) &&
            !user.dateOfBirth && !user.gender && !user.phone && (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <p className="text-gray-500">Profile is incomplete. Additional details are needed.</p>
                </CardContent>
              </Card>
            )}
        </>
      )}
    </div>
  );
}