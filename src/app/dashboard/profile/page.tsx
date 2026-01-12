'use client';
import { useState, useEffect, useRef } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase, updateDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { doc, collection, addDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { useForm, useFieldArray, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Terminal, X, User as UserIcon, CalendarIcon, UploadCloud, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { updateProfile } from 'firebase/auth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
// replaced custom popover/calendar with native date input
import { cn } from '@/lib/utils';
import { format, isValid } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';
import { extractFromResume } from '@/ai/flows/extract-from-resume-flow';

const educationSchema = z.object({
    degree: z.string().min(1, "Degree is required"),
    university: z.string().min(1, "University is required"),
    course: z.string().optional(),
    year: z.string().min(4, "Year is required").max(4, "Invalid year"),
    duration: z.string().optional(),
});

const experienceSchema = z.object({
    company: z.string().min(1, "Company is required"),
    role: z.string().min(1, "Role is required"),
    duration: z.string().min(1, "Duration is required"),
    description: z.string().optional(),
});

const projectSchema = z.object({
    title: z.string().min(1, "Title is required"),
    tech: z.string().min(1, "Technologies are required"),
    description: z.string().optional(),
});

const certificationSchema = z.object({
    title: z.string().min(1, "Title is required"),
    issuer: z.string().min(1, "Issuer is required"),
});

const languageSchema = z.object({
    language: z.string().min(1, "Language is required"),
    proficiency: z.string().min(1, "Proficiency level is required"),
});

const volunteerSchema = z.object({
    role: z.string().min(1, "Role is required"),
    organization: z.string().min(1, "Organization is required"),
    duration: z.string().min(1, "Duration is required"),
    description: z.string().optional(),
});

const publicationSchema = z.object({
    title: z.string().min(1, "Title is required"),
    publication: z.string().min(1, "Publication/Conference name is required"),
    date: z.string().min(1, "Date is required"),
});

const awardSchema = z.object({
    title: z.string().min(1, "Award title is required"),
    organization: z.string().min(1, "Organization is required"),
    date: z.string().min(1, "Date is required"),
});

const jobPreferencesSchema = z.object({
    desiredRoles: z.string().min(1, "Desired roles are required"),
    locationPreference: z.string().min(1, "Location is required"),
    keywords: z.string().optional(),
});

const profileSchema = z.object({
    firstName: z.string().min(1, "First name is required").nonempty("First name is required"),
    lastName: z.string().min(1, "Last name is required").nonempty("Last name is required"),
    citizenship: z.enum(["India", "USA"], { errorMap: () => ({ message: "Citizenship is required" }) }).or(z.literal('')),
    email: z.string().email("Invalid email address").nonempty("Email is required"),
    sponsorship: z.string().optional(),
    totalExperience: z.string().optional(),
    visaStatus: z.string().optional(),
    clearance: z.string().optional(),
    relocation: z.string().optional(),
    // Address fields for USA (required if citizenship is USA)
    addressLine1: z.string().optional(),
    addressLine2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipcode: z.string().optional(),
    // Address for India (required if citizenship is India)
    address: z.string().optional(),
    pincode: z.string().optional(),
    photoURL: z.string().optional(),
    phone: z.string().min(8, "Phone number must be at least 8 characters").nonempty("Phone number is required"),
    gender: z.string().min(1, "Gender is required").nonempty("Gender is required"),
    dateOfBirth: z.union([
        z.string().min(1, "Date of birth is required").nonempty("Date of birth is required"),
        z.date()
    ]),
    race: z.string().optional(),
    veteranStatus: z.string().optional(),
    disability: z.string().optional(),
    protectedVeteranStatus: z.string().optional(),
    linkedin: z.string().url().optional().or(z.literal('')),
    github: z.string().url().optional().or(z.literal('')),
    portfolioURL: z.string().url().optional().or(z.literal('')),
    education: z.array(educationSchema).min(1, "At least one education entry is required"),
    experience: z.array(experienceSchema).optional(),
    skills: z.array(z.string()).min(1, "At least one skill is required"),
    projects: z.array(projectSchema).optional(),
    certifications: z.array(certificationSchema).optional(),
    languages: z.array(languageSchema).optional(),
    technicalTools: z.array(z.string()).optional(),
    volunteerWork: z.array(volunteerSchema).optional(),
    publications: z.array(publicationSchema).optional(),
    awards: z.array(awardSchema).optional(),
    interests: z.string().optional(),
    jobPreferences: z.array(jobPreferencesSchema).min(1, "At least one job preference is required"),
    profileCompleted: z.boolean().optional(),
    declarations: z.boolean().refine(val => val === true, {
        message: "You must accept the declarations and agreements to continue."
    }),
}).refine((data) => {
    // Only validate address fields if citizenship is properly selected (not empty string)
    if (data.citizenship === 'USA') {
        return data.addressLine1 && data.city && data.state && data.zipcode;
    }
    if (data.citizenship === 'India') {
        return data.address && data.pincode;
    }
    // If citizenship is empty string or anything else, skip address validation
    return true;
}, {
    message: 'Please fill all required address fields for your citizenship.',
    path: ['address'],
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const steps = [
    { id: 'personal', title: 'Personal Info' },
    { id: 'education', title: 'Education' },
    { id: 'experience', title: 'Experience' },
    { id: 'skills', title: 'Skills' },
    { id: 'projects', title: 'Projects & Certs' },
    { id: 'additional', title: 'Additional Details' },
    { id: 'preferences', title: 'Preferences' },
    { id: 'agreements', title: 'Agreements' },
];

// Function to recursively remove undefined values from an object
const removeUndefined = (obj: any): any => {
    // Dropdown fields that should preserve empty strings (they're not "empty" in the data sense)
    const dropdownFields = ['citizenship', 'gender', 'disability', 'veteranStatus', 'protectedVeteranStatus'];
    
    if (Array.isArray(obj)) {
        return obj.map(item => removeUndefined(item)).filter(v => v !== undefined && v !== null && (typeof v !== 'object' || Array.isArray(v) || Object.keys(v).length > 0));
    } else if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
        return Object.keys(obj).reduce((acc, key) => {
            const value = obj[key];
            if (value !== undefined && value !== null) {
                const cleanedValue = removeUndefined(value);
                
                // For dropdown fields, keep even empty strings (they represent "not selected")
                // For other fields, remove empty strings and empty arrays
                const isDropdownField = dropdownFields.includes(key);
                const shouldKeep = isDropdownField 
                    ? (cleanedValue !== undefined && cleanedValue !== null)
                    : (cleanedValue !== undefined && cleanedValue !== null && (typeof cleanedValue !== 'string' || cleanedValue.length > 0) && (!Array.isArray(cleanedValue) || cleanedValue.length > 0));
                
                if (shouldKeep) {
                    acc[key] = cleanedValue;
                }
            }
            return acc;
        }, {} as {[key: string]: any});
    }
    return obj;
};

export default function ProfilePage() {
    // Helper: accept/display DOB in MM-DD-YYYY but store as ISO.
    const formatToMMDDYYYY = (d: Date) => {
        try {
            return format(d, 'MM-dd-yyyy');
        } catch (e) {
            return '';
        }
    }

    const tryParseInputDate = (s?: string | Date) => {
        if (!s) return undefined;
        // If it's already a Date, validate and return it
        if (s instanceof Date) {
            return isValid(s) ? s : undefined;
        }
        // Try ISO / yyyy-MM-dd first
        let dt = new Date(s);
        if (isValid(dt)) return dt;
        // Try MM-dd-yyyy
        try {
            const parsed = new Date(s.replace(/-/g, '/')); // MM-DD-YYYY -> MM/DD/YYYY for Date parser
            if (isValid(parsed)) return parsed;
        } catch (e) {
            // fallthrough
        }
        return undefined;
    }

    const { user, isUserLoading: isAuthLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();
    const [currentStep, setCurrentStep] = useState(0);
    const [skillInput, setSkillInput] = useState('');
    const [technicalToolsInput, setTechnicalToolsInput] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const resumeUploadRef = useRef<HTMLInputElement>(null);
    const [isExtracting, setIsExtracting] = useState(false);

    const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
    const { data: userData, isLoading: isUserDataLoading } = useDoc<ProfileFormValues>(userDocRef);

    // Debug: log when userData is loaded
    useEffect(() => {
        if (userData) {
            console.log('📥 UserData loaded - FULL OBJECT:');
            console.table(userData);
            console.log('📥 Specific dropdown fields:', {
                citizenship: userData.citizenship,
                gender: userData.gender,
                disability: userData.disability,
                veteranStatus: userData.veteranStatus,
                protectedVeteranStatus: userData.protectedVeteranStatus,
                isLoading: isUserDataLoading,
                hasData: !!userData,
                dataKeys: userData ? Object.keys(userData) : []
            });
        }
    }, [userData, isUserDataLoading]);

    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            firstName: '',
            lastName: '',
            email: '',
            sponsorship: '',
            totalExperience: '',
            visaStatus: '',
            clearance: '',
            relocation: '',
            address: '',
            pincode: '',
            addressLine1: '',
            addressLine2: '',
            city: '',
            state: '',
            zipcode: '',
            photoURL: '',
            phone: '',
            gender: '',
            dateOfBirth: '',
            race: '',
            veteranStatus: '',
            disability: '',
            protectedVeteranStatus: '',
            linkedin: '',
            github: '',
            portfolioURL: '',
            education: [ { degree: '', university: '', course: '', year: '', duration: '' } ],
            experience: [],
            skills: [],
            projects: [],
            certifications: [],
            languages: [],
            technicalTools: [],
            volunteerWork: [],
            publications: [],
            awards: [],
            interests: '',
            jobPreferences: [],
            profileCompleted: false,
            declarations: false,
        },
    });
    
    const { control, handleSubmit, getValues, setValue, watch, formState: { isSubmitting }, reset, trigger } = form;

    const photoURL = watch('photoURL');
    const declarations = watch('declarations');
    const genderValue = watch('gender');
    const citizenshipValue = watch('citizenship');
    const disabilityValue = watch('disability');
    const veteranStatusValue = watch('veteranStatus');
    const protectedVeteranStatusValue = watch('protectedVeteranStatus');

    // Get current values from form state for fallback
    const getCurrentValue = (fieldName: string) => {
        const value = getValues(fieldName as any);
        return String(value || '').trim();
    };

    // Debug: log when watched values change
    useEffect(() => {
        console.log('📊 Form watched values updated:', { 
            genderValue: genderValue ? `"${genderValue}"` : 'undefined/null',
            citizenshipValue: citizenshipValue ? `"${citizenshipValue}"` : 'undefined/null',
            disabilityValue: disabilityValue ? `"${disabilityValue}"` : 'undefined/null',
            veteranStatusValue: veteranStatusValue ? `"${veteranStatusValue}"` : 'undefined/null',
            protectedVeteranStatusValue: protectedVeteranStatusValue ? `"${protectedVeteranStatusValue}"` : 'undefined/null'
        });
    }, [genderValue, citizenshipValue, disabilityValue, veteranStatusValue, protectedVeteranStatusValue]);

    useEffect(() => {
        if (userData) {
            console.log('====== 🔄 PROFILE LOAD FLOW STARTED ======');
            const dateFromDb = userData.dateOfBirth;
            const parsed = tryParseInputDate(dateFromDb);
            const validDate = parsed && isValid(parsed) ? parsed : undefined;

            // Set all fields individually with proper options for Select components
            const setValueOptions = { shouldDirty: false, shouldTouch: false, shouldValidate: false };
            
            // Trim and normalize string values to prevent whitespace issues
            const trimmedGender = String(userData.gender || '').trim();
            const trimmedCitizenship = String(userData.citizenship || '').trim();
            const trimmedDisability = String(userData.disability || '').trim();
            const trimmedVeteranStatus = String(userData.veteranStatus || '').trim();
            const trimmedProtectedVeteranStatus = String(userData.protectedVeteranStatus || '').trim();
            
            // Helper function for case-insensitive exact match
            const matchValue = (value: string, options: string[]): string | null => {
                if (!value) return null; // Return null if no value instead of empty string
                const lowerValue = value.toLowerCase().trim();
                for (const option of options) {
                    if (option.toLowerCase() === lowerValue) {
                        return option; // Return the correctly-cased option
                    }
                }
                // If no match found, return null (don't return original value)
                return null;
            };
            
            // Normalize to match SelectItem values exactly with case-insensitive matching
            const normalizedGender = matchValue(trimmedGender, ['Male', 'Female', 'Other', 'Prefer not to say']);
            const normalizedCitizenship = matchValue(trimmedCitizenship, ['India', 'USA']);
            const normalizedDisability = matchValue(trimmedDisability, ['Yes', 'No', 'Prefer not to say']);
            const normalizedVeteranStatus = matchValue(trimmedVeteranStatus, ['Veteran', 'Non-Veteran', 'Prefer not to say']);
            const normalizedProtectedVeteranStatus = matchValue(trimmedProtectedVeteranStatus, ['Protected Veteran', 'Not Protected', 'Prefer not to say']);
            
            console.log('🔍 Raw DB values before trim:', { 
                gender: `"${userData.gender}"`, 
                citizenship: `"${userData.citizenship}"`,
                disability: `"${userData.disability}"`,
                veteranStatus: `"${userData.veteranStatus}"`,
                protectedVeteranStatus: `"${userData.protectedVeteranStatus}"`
            });

            console.log('🔍 Trimmed DB values:', { 
                trimmedGender,
                trimmedCitizenship,
                trimmedDisability,
                trimmedVeteranStatus,
                trimmedProtectedVeteranStatus
            });

            console.log('🔍 Normalized values:', { 
                normalizedGender,
                normalizedCitizenship,
                normalizedDisability,
                normalizedVeteranStatus,
                normalizedProtectedVeteranStatus
            });

            // Instead of calling setValue multiple times, prepare all data and reset form at once
            // This ensures proper re-rendering of form fields
            // Note: For dropdowns, use empty string if no value (not undefined) to match Select component behavior
            const allFormData: ProfileFormValues = {
                firstName: (userData.firstName || user?.displayName?.split(' ')[0] || '') as string,
                lastName: (userData.lastName || user?.displayName?.split(' ').slice(1).join(' ') || '') as string,
                email: (userData.email || user?.email || '') as string,
                phone: (userData.phone || '') as string,
                gender: normalizedGender || '',
                citizenship: (normalizedCitizenship || '') as '' | 'India' | 'USA',
                disability: normalizedDisability || '',
                veteranStatus: normalizedVeteranStatus || '',
                protectedVeteranStatus: normalizedProtectedVeteranStatus || '',
                dateOfBirth: validDate ? validDate.toISOString() : '',
                photoURL: (userData.photoURL || user?.photoURL || '') as string,
                race: (userData.race || '') as string,
                sponsorship: userData.sponsorship || '',
                totalExperience: userData.totalExperience || '',
                visaStatus: userData.visaStatus || '',
                clearance: userData.clearance || '',
                relocation: userData.relocation || '',
                address: userData.address || '',
                pincode: userData.pincode || '',
                addressLine1: userData.addressLine1 || '',
                addressLine2: userData.addressLine2 || '',
                city: userData.city || '',
                state: userData.state || '',
                zipcode: userData.zipcode || '',
                linkedin: userData.linkedin || '',
                github: userData.github || '',
                portfolioURL: userData.portfolioURL || '',
                interests: userData.interests || '',
                education: userData.education || [{ degree: '', university: '', course: '', year: '', duration: '' }],
                experience: userData.experience || [],
                skills: userData.skills || [],
                projects: userData.projects || [],
                certifications: userData.certifications || [],
                languages: userData.languages || [],
                technicalTools: userData.technicalTools || [],
                volunteerWork: userData.volunteerWork || [],
                publications: userData.publications || [],
                awards: userData.awards || [],
                jobPreferences: userData.jobPreferences || [],
                profileCompleted: userData.profileCompleted || false,
                declarations: userData.declarations || false,
            };

            console.log('✅ About to reset form with data:', { 
                normalizedGender: normalizedGender ? `"${normalizedGender}"` : 'NULL/UNDEFINED', 
                normalizedCitizenship: normalizedCitizenship ? `"${normalizedCitizenship}"` : 'NULL/UNDEFINED', 
                normalizedDisability: normalizedDisability ? `"${normalizedDisability}"` : 'NULL/UNDEFINED',
                normalizedVeteranStatus: normalizedVeteranStatus ? `"${normalizedVeteranStatus}"` : 'NULL/UNDEFINED',
                normalizedProtectedVeteranStatus: normalizedProtectedVeteranStatus ? `"${normalizedProtectedVeteranStatus}"` : 'NULL/UNDEFINED'
            });
            
            // Reset form with all data at once for proper re-rendering
            reset(allFormData);
            setTechnicalToolsInput((userData.technicalTools || []).join(', '));
            
            console.log('✅ Form has been reset with all user data');

            // Force a state update after all setValues complete
            setTimeout(() => {
                const formState = getValues();
                console.log('====== 📋 FINAL FORM STATE ======');
                console.log('Dropdown fields in form state:');
                console.log({
                    gender: formState.gender ? `"${formState.gender}"` : 'UNDEFINED/NULL',
                    citizenship: formState.citizenship ? `"${formState.citizenship}"` : 'UNDEFINED/NULL',
                    disability: formState.disability ? `"${formState.disability}"` : 'UNDEFINED/NULL',
                    veteranStatus: formState.veteranStatus ? `"${formState.veteranStatus}"` : 'UNDEFINED/NULL',
                    protectedVeteranStatus: formState.protectedVeteranStatus ? `"${formState.protectedVeteranStatus}"` : 'UNDEFINED/NULL'
                });
                console.log('====== ✅ PROFILE LOAD FLOW COMPLETE ======');
            }, 100);
        } else if (user) {
            const setValueOptions = { shouldDirty: false, shouldTouch: false, shouldValidate: false };
            setValue('firstName', user.displayName ? user.displayName.split(' ')[0] : '', setValueOptions);
            setValue('lastName', user.displayName ? user.displayName.split(' ').slice(1).join(' ') : '', setValueOptions);
            setValue('citizenship', '', setValueOptions);
            setValue('photoURL', user.photoURL || '', setValueOptions);
        }
    }, [userData, user, setValue]);

    const { fields: educationFields, append: appendEducation, remove: removeEducation } = useFieldArray({ control, name: "education" });
    const { fields: experienceFields, append: appendExperience, remove: removeExperience } = useFieldArray({ control, name: "experience" });
    const { fields: projectFields, append: appendProject, remove: removeProject } = useFieldArray({ control, name: "projects" });
    const { fields: certificationFields, append: appendCertification, remove: removeCertification } = useFieldArray({ control, name: "certifications" });
    const { fields: languageFields, append: appendLanguage, remove: removeLanguage } = useFieldArray({ control, name: "languages" });
    const { fields: volunteerFields, append: appendVolunteer, remove: removeVolunteer } = useFieldArray({ control, name: "volunteerWork" });
    const { fields: publicationFields, append: appendPublication, remove: removePublication } = useFieldArray({ control, name: "publications" });
    const { fields: awardFields, append: appendAward, remove: removeAward } = useFieldArray({ control, name: "awards" });
    const { fields: jobPreferenceFields, append: appendJobPreference, remove: removeJobPreference } = useFieldArray({ control, name: "jobPreferences" });
    const { fields: skillFields, append: appendSkill, remove: removeSkill } = useFieldArray({ control, name: "skills" as any });

    // Individual step save handlers
    const handleStepSave = async (stepIndex: number) => {
        if (!user || !userDocRef) return;
        
        // Validate current step before proceeding
        let isValid = false;
        switch (stepIndex) {
            case 0: // Personal Info
                if (watch('citizenship') === 'USA') {
                    isValid = await trigger(['firstName', 'lastName', 'citizenship', 'email', 'addressLine1', 'city', 'state', 'zipcode']);
                } else if (watch('citizenship') === 'India') {
                    isValid = await trigger(['firstName', 'lastName', 'citizenship', 'email', 'address', 'pincode']);
                } else {
                    isValid = await trigger(['firstName', 'lastName', 'citizenship', 'email']);
                }
                break;
            case 1: // Education
                isValid = await trigger(['education']);
                break;
            case 2: // Experience
                isValid = await trigger(['experience']);
                break;
            case 3: // Skills
                isValid = await trigger(['skills']);
                break;
            case 4: // Projects & Certs
                isValid = await trigger(['projects', 'certifications']);
                break;
            case 5: // Additional Details
                isValid = await trigger(['languages', 'technicalTools', 'volunteerWork', 'publications', 'awards', 'interests']);
                break;
            case 6: // Preferences
                isValid = await trigger(['jobPreferences']);
                break;
            case 7: // Agreements
                isValid = await trigger(['declarations']);
                break;
            default:
                isValid = await trigger();
        }

        if (!isValid) {
            toast({
                variant: "destructive",
                title: "Validation Failed",
                description: "Please fix all errors before continuing.",
            });
            return;
        }

        setIsSaving(true);
        const data = getValues();
        console.log('💾 Raw form data before cleaning:', {
            citizenship: data.citizenship ? `"${data.citizenship}"` : 'undefined/null',
            gender: data.gender ? `"${data.gender}"` : 'undefined/null',
            disability: data.disability ? `"${data.disability}"` : 'undefined/null',
            veteranStatus: data.veteranStatus ? `"${data.veteranStatus}"` : 'undefined/null',
            protectedVeteranStatus: data.protectedVeteranStatus ? `"${data.protectedVeteranStatus}"` : 'undefined/null',
            firstName: data.firstName,
            lastName: data.lastName
        });
        const cleanData = removeUndefined(data);
        console.log('💾 Form data after removeUndefined():', {
            citizenship: cleanData.citizenship ? `"${cleanData.citizenship}"` : 'REMOVED',
            gender: cleanData.gender ? `"${cleanData.gender}"` : 'REMOVED',
            disability: cleanData.disability ? `"${cleanData.disability}"` : 'REMOVED',
            veteranStatus: cleanData.veteranStatus ? `"${cleanData.veteranStatus}"` : 'REMOVED',
            protectedVeteranStatus: cleanData.protectedVeteranStatus ? `"${cleanData.protectedVeteranStatus}"` : 'REMOVED'
        });
        const isLastStep = stepIndex === steps.length - 1;
        const finalData = { ...cleanData, profileCompleted: userData?.profileCompleted || isLastStep, profileUpdatedAt: new Date().toISOString() };
        
        // normalize dateOfBirth to ISO string (accept MM-DD-YYYY or ISO)
        if (finalData.dateOfBirth instanceof Date) {
            finalData.dateOfBirth = finalData.dateOfBirth.toISOString();
        } else if (typeof finalData.dateOfBirth === 'string' && finalData.dateOfBirth.length > 0) {
            const parsed = tryParseInputDate(finalData.dateOfBirth as string);
            if (parsed && !isNaN(parsed.getTime())) finalData.dateOfBirth = parsed.toISOString();
        }
        
        try {
            // Set displayName as "FirstName LastName" if both present
            if (data.firstName && data.lastName) {
                await updateProfile(user, { displayName: `${data.firstName} ${data.lastName}` });
            }
            // Prepare updates to user doc; increment counters when applicable
            try {
                const now = new Date().toISOString();
                const updates: any = { ...finalData };
                // If this is the final step and profile becomes completed for first time, bump profileCompletionCount
                if (isLastStep) {
                    const prevCompleted = userData?.profileCompleted === true;
                    if (!prevCompleted && updates.profileCompleted) {
                        updates.profileCompletionCount = ((userData as any)?.profileCompletionCount || 0) + 1;
                    }
                    // If declarations (terms) were just accepted, increment termsUpdateCount
                    const prevDecl = userData?.declarations === true;
                    if (updates.declarations === true && !prevDecl) {
                        updates.termsUpdateCount = ((userData as any)?.termsUpdateCount || 0) + 1;
                    }
                }
                setDocumentNonBlocking(userDocRef, updates, { merge: true });
            } catch (e) {
                console.warn('profile save auxiliary actions failed', e);
            }
            toast({
                title: "Profile Updated",
                description: "Your progress has been saved.",
            });
            if (!isLastStep) {
                setCurrentStep(stepIndex + 1);
            } else {
                updateDocumentNonBlocking(userDocRef, { profileCompleted: true, profileUpdatedAt: new Date().toISOString() });
                // Redirect user to billing to select a plan after completing profile
                try {
                    // send notification email to user about profile completion (best-effort)
                    try {
                        const idToken = await user.getIdToken();
                        const res = await fetch('/api/notify/profile-complete', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ uid: user.uid, to: user.email, idToken, templateData: { name: `${data.firstName} ${data.lastName}` } }),
                        });
                        if (res.ok) {
                            toast({ title: 'Notification Sent', description: 'We sent you a confirmation email.' });
                        } else {
                            const payload = await res.json().catch(() => ({}));
                            toast({ variant: 'destructive', title: 'Notification Failed', description: payload?.error || 'Failed to send notification email.' });
                        }
                    } catch (e) {
                        console.error('profile completion notify failed', e);
                        toast({ variant: 'destructive', title: 'Notification Error', description: 'Error while sending notification email.' });
                    }
                    router.push('/dashboard/billing');
                } catch (err) {
                    console.error('Redirect to billing failed', err);
                }
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Update Failed",
                description: "There was an error updating your profile.",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddSkill = () => {
        if (skillInput.trim()) {
            const currentSkills = getValues("skills") || [];
            if (!currentSkills.includes(skillInput.trim())) {
                appendSkill(skillInput.trim() as any);
                setSkillInput('');
            }
        }
    }

    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type and size
        if (!file.type.startsWith('image/')) {
            toast({ variant: "destructive", title: "Invalid file type", description: "Please upload an image file." });
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            toast({ variant: "destructive", title: "File too large", description: "Please upload an image smaller than 5MB." });
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 256;
                const MAX_HEIGHT = 256;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL(file.type);
                setValue('photoURL', dataUrl, { shouldDirty: true });
            };
            img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    const handleResumeExtract = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        // Do not perform automatic resume extraction for new users (profile not completed)
        if (!userData || !userData.profileCompleted) {
            toast({
                title: 'Extraction Unavailable',
                description: 'Resume extraction is disabled for new users. Please complete your profile manually first.',
            });
            if (resumeUploadRef.current) resumeUploadRef.current.value = '';
            return;
        }

        setIsExtracting(true);
        toast({ title: 'Parsing Resume...', description: 'The AI is extracting your information. Please wait.' });

        try {
            let resumeText = '';
            if (file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt')) {
                // plain text
                resumeText = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target?.result as string);
                    reader.onerror = reject;
                    reader.readAsText(file);
                });
            } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
                // PDF: extract text using pdfjs-dist dynamically
                // @ts-ignore - dynamic import of pdfjs-dist's legacy build (no types available)
                const pdfjs = await import('pdfjs-dist/legacy/build/pdf');
                // worker is required; use the bundled worker
                try {
                    // @ts-ignore - setGlobalWorkerOptions may exist
                    pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${(pdfjs as any).version}/pdf.worker.min.js`;
                } catch (e) {
                    // ignore worker setup errors; extraction may still work in some environments
                }

                const arrayBuffer = await file.arrayBuffer();
                const pdf = await (pdfjs as any).getDocument({ data: arrayBuffer }).promise;
                const maxPages = pdf.numPages;
                const pageTexts: string[] = [];
                for (let i = 1; i <= maxPages; i++) {
                    const page = await pdf.getPage(i);
                    const content = await page.getTextContent();
                    const strings = content.items.map((s: any) => s.str || '').join(' ');
                    pageTexts.push(strings);
                }
                resumeText = pageTexts.join('\n');
            } else {
                toast({ variant: 'destructive', title: 'Invalid File Type', description: 'Please upload a .txt or .pdf file.' });
                return;
            }

            const extractedData = await extractFromResume({ resumeText });
            const currentValues = getValues() as any;
            const extracted = extractedData as any;
            const newValues = {
                ...currentValues,
                ...extracted,
                name: extracted.name || currentValues.name || '',
                phone: extracted.phone || currentValues.phone || '',
                linkedin: extracted.linkedin || currentValues.linkedin || '',
                github: extracted.github || currentValues.github || '',
                address: extracted.address || currentValues.address || '',
                education: (extracted.education || []).map((e: any) => ({ ...e, duration: e.duration || '', year: e.year || '' })),
                experience: (extracted.experience || []).map((e: any) => ({ ...e, description: e.description || '' })),
                skills: extracted.skills || currentValues.skills || [],
                projects: (extracted.projects || []).map((p: any) => ({ ...p, description: p.description || '' })),
                certifications: extracted.certifications || currentValues.certifications || [],
                languages: (extracted.languages || []).map((l: any) => ({ ...l, language: l.language || '', proficiency: l.proficiency || '' })),
                technicalTools: extracted.technicalTools || currentValues.technicalTools || [],
                volunteerWork: (extracted.volunteerWork || []).map((v: any) => ({ ...v, description: v.description || '' })),
                publications: extracted.publications || currentValues.publications || [],
                awards: extracted.awards || currentValues.awards || [],
                interests: extracted.interests || currentValues.interests || '',
                jobPreferences: ((extracted?.jobPreferences as any) || (currentValues as any).jobPreferences || []).map((p: any) => ({ ...p, keywords: p?.keywords || '' })),
            };
            reset(newValues);
            setTechnicalToolsInput((newValues.technicalTools || []).join(', '));

            toast({ title: 'Extraction Complete!', description: 'Your profile has been auto-filled. Please review the information.' });
        } catch (error) {
            console.error('Resume extraction failed:', error);
            toast({ variant: 'destructive', title: 'Extraction Failed', description: 'Could not extract information from the resume. Please try again.' });
        } finally {
            setIsExtracting(false);
            if (resumeUploadRef.current) resumeUploadRef.current.value = '';
        }
    };

    const nextStep = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        }
    }

    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    }

    if (isUserDataLoading || isAuthLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    return (
        <div className="w-full h-screen flex flex-col p-1 sm:p-2 md:p-4 lg:p-8">
            <Card className="w-full h-full flex flex-col">
                <CardHeader className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 lg:py-6 flex-shrink-0">
                    <CardTitle className="text-sm sm:text-base md:text-lg lg:text-xl">{userData?.profileCompleted ? 'Edit Your Profile' : 'Complete Your Profile'}</CardTitle>
                    <CardDescription className="text-[10px] sm:text-xs md:text-sm mt-1 sm:mt-2">Keep your professional details up to date to get the best results. <span className="text-red-500">*</span> indicates required fields.</CardDescription>
                </CardHeader>
                <CardContent className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 lg:py-6 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                    {!userData?.profileCompleted && (
                         <Alert className="mb-2 sm:mb-3 md:mb-4 lg:mb-6 text-[10px] sm:text-xs md:text-sm">
                            <Terminal className="h-3 w-3 sm:h-4 sm:w-4" />
                            <AlertTitle>Welcome to FindZob!</AlertTitle>
                            <AlertDescription>
                                Let's build your professional profile. A complete profile is key to unlocking AI-powered resume generation and job matching.
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="mb-2 sm:mb-3 md:mb-4 lg:mb-6 overflow-x-auto">
                        <ol className="flex items-center w-full min-w-max" aria-label="Profile completion steps">
                            {steps.map((step, index) => (
                                <li key={step.id} className={`flex items-center ${index < steps.length - 1 ? "after:content-[''] after:w-2 sm:after:w-3 md:after:w-4 lg:after:w-6 lg:md:after:w-full after:h-0.5 sm:after:h-1 after:border-b after:border-2 sm:after:border-4 after:inline-block" : ""} ${index <= currentStep ? 'text-primary after:border-primary' : 'text-muted-foreground after:border-border'}`} aria-current={index === currentStep ? "step" : undefined}>
                                    <span 
                                        className={`flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 lg:w-10 lg:h-10 rounded-full shrink-0 cursor-pointer text-[10px] sm:text-xs md:text-sm ${index <= currentStep ? 'bg-primary text-primary-foreground' : 'bg-muted'}`} 
                                        onClick={() => setCurrentStep(index)}
                                        role="button"
                                        tabIndex={0}
                                        aria-label={`Go to ${step.title} step`}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                setCurrentStep(index);
                                            }
                                        }}
                                    >
                                        {index + 1}
                                    </span>
                                </li>
                            ))}
                        </ol>
                    </div>

                    <FormProvider {...form}>
                        <form>
                            {/* Step 0: Personal Information */}
                            <div style={{ display: 'block', visibility: currentStep === 0 ? 'visible' : 'hidden', position: currentStep === 0 ? 'static' : 'absolute', left: currentStep === 0 ? 'auto' : '-9999px' }}>
                                <h3 className="text-xs sm:text-sm md:text-base lg:text-base font-semibold mb-2 sm:mb-3 md:mb-4">Personal Information</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 md:gap-3 lg:gap-4">
                                    {/* Citizenship - Required */}
                                    <FormField control={control} name="citizenship" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] sm:text-xs md:text-sm">Citizenship<span className="text-red-500 ml-1">*</span></FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value || ''}>
                                                <FormControl>
                                                    <SelectTrigger className="text-[10px] sm:text-xs md:text-sm h-7 sm:h-8 md:h-9 lg:h-10">
                                                        <SelectValue placeholder="Select your citizenship" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="India">India</SelectItem>
                                                    <SelectItem value="USA">USA</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage className="text-xs" />
                                        </FormItem>
                                    )} />
                                    
                                    {/* First Name - Required */}
                                    <FormField control={control} name="firstName" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] sm:text-xs md:text-sm">First Name<span className="text-red-500 ml-1">*</span></FormLabel>
                                            <FormControl><Input {...field} className="text-[10px] sm:text-xs md:text-sm h-7 sm:h-8 md:h-9 lg:h-10" /></FormControl>
                                            <FormMessage className="text-xs" />
                                        </FormItem>
                                    )} />
                                    
                                    {/* Last Name - Required */}
                                    <FormField control={control} name="lastName" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] sm:text-xs md:text-sm">Last Name<span className="text-red-500 ml-1">*</span></FormLabel>
                                            <FormControl><Input {...field} className="text-[10px] sm:text-xs md:text-sm h-7 sm:h-8 md:h-9 lg:h-10" /></FormControl>
                                            <FormMessage className="text-xs" />
                                        </FormItem>
                                    )} />
                                    
                                    {/* Email - Required */}
                                    <FormField control={control} name="email" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] sm:text-xs md:text-sm">Email<span className="text-red-500 ml-1">*</span></FormLabel>
                                            <FormControl><Input {...field} className="text-[10px] sm:text-xs md:text-sm h-7 sm:h-8 md:h-9 lg:h-10" /></FormControl>
                                            <FormMessage className="text-xs" />
                                        </FormItem>
                                    )} />
                                    
                                    {/* Phone Number - Common for both India and USA */}
                                    <FormField control={control} name="phone" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] sm:text-xs md:text-sm">Phone Number<span className="text-red-500 ml-1">*</span></FormLabel>
                                            <FormControl><Input {...field} className="text-[10px] sm:text-xs md:text-sm h-7 sm:h-8 md:h-9 lg:h-10" /></FormControl>
                                            <FormMessage className="text-xs" />
                                        </FormItem>
                                    )} />
                                    
                                    {/* Gender - Common for both India and USA */}
                                    <FormField control={control} name="gender" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] sm:text-xs md:text-sm">Gender<span className="text-red-500 ml-1">*</span></FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value || ''}>
                                                <FormControl>
                                                    <SelectTrigger className="text-[10px] sm:text-xs md:text-sm h-7 sm:h-8 md:h-9 lg:h-10">
                                                        <SelectValue placeholder="Select your gender" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="Male">Male</SelectItem>
                                                    <SelectItem value="Female">Female</SelectItem>
                                                    <SelectItem value="Other">Other</SelectItem>
                                                    <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage className="text-xs" />
                                        </FormItem>
                                    )} />
                                    
                                    {/* Date of Birth - Common for both India and USA */}
                                    <FormField control={control} name="dateOfBirth" render={({ field }) => {
                                        const [open, setOpen] = useState(false);
                                        const [tempMonth, setTempMonth] = useState(field.value ? new Date(field.value).getMonth() : new Date().getMonth());
                                        const [tempYear, setTempYear] = useState(field.value ? new Date(field.value).getFullYear() : new Date().getFullYear());
                                        
                                        const currentYear = new Date().getFullYear();
                                        const years = Array.from({ length: currentYear - 1959 }, (_, i) => 1960 + i).reverse();
                                        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                                        
                                        const handleDateSelect = (day: number) => {
                                            const selectedDate = new Date(tempYear, tempMonth, day);
                                            field.onChange(selectedDate.toISOString());
                                            setOpen(false);
                                        };
                                        
                                        const getDaysInMonth = (month: number, year: number) => {
                                            return new Date(year, month + 1, 0).getDate();
                                        };
                                        
                                        const getFirstDayOfMonth = (month: number, year: number) => {
                                            return new Date(year, month, 1).getDay();
                                        };
                                        
                                        const daysInMonth = getDaysInMonth(tempMonth, tempYear);
                                        const firstDay = getFirstDayOfMonth(tempMonth, tempYear);
                                        const days = [];
                                        
                                        for (let i = 0; i < firstDay; i++) {
                                            days.push(null);
                                        }
                                        for (let i = 1; i <= daysInMonth; i++) {
                                            days.push(i);
                                        }
                                        
                                        return (
                                            <FormItem className="flex flex-col">
                                                <FormLabel className="text-[10px] sm:text-xs md:text-sm">Date of Birth<span className="text-red-500 ml-1">*</span></FormLabel>
                                                <Popover open={open} onOpenChange={setOpen}>
                                                    <PopoverTrigger asChild>
                                                        <FormControl>
                                                            <Button
                                                                variant="outline"
                                                                className={cn(
                                                                    "text-[10px] sm:text-xs md:text-sm h-7 sm:h-8 md:h-9 lg:h-10 w-full justify-start text-left font-normal",
                                                                    !field.value && "text-muted-foreground"
                                                                )}
                                                            >
                                                                <CalendarIcon className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                                                                {field.value ? (
                                                                    typeof field.value === 'string' ? 
                                                                    format(new Date(field.value), 'MMM dd, yyyy') :
                                                                    format(new Date(field.value), 'MMM dd, yyyy')
                                                                ) : (
                                                                    <span>Pick a date</span>
                                                                )}
                                                            </Button>
                                                        </FormControl>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-3 sm:p-4" align="start">
                                                        <div className="space-y-3 sm:space-y-4">
                                                            {/* Year and Month Selectors */}
                                                            <div className="grid grid-cols-2 gap-2 sm:gap-3">
                                                                <div>
                                                                    <label className="text-xs font-semibold mb-1 block text-muted-foreground">Year</label>
                                                                    <Select value={tempYear.toString()} onValueChange={(val) => setTempYear(parseInt(val))}>
                                                                        <SelectTrigger className="text-xs h-8 sm:h-9">
                                                                            <SelectValue />
                                                                        </SelectTrigger>
                                                                        <SelectContent className="max-h-48 sm:max-h-64">
                                                                            {years.map((year) => (
                                                                                <SelectItem key={year} value={year.toString()}>
                                                                                    {year}
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>
                                                                <div>
                                                                    <label className="text-xs font-semibold mb-1 block text-muted-foreground">Month</label>
                                                                    <Select value={tempMonth.toString()} onValueChange={(val) => setTempMonth(parseInt(val))}>
                                                                        <SelectTrigger className="text-xs h-8 sm:h-9">
                                                                            <SelectValue />
                                                                        </SelectTrigger>
                                                                        <SelectContent className="max-h-48 sm:max-h-64">
                                                                            {months.map((month, index) => (
                                                                                <SelectItem key={index} value={index.toString()}>
                                                                                    {month.slice(0, 3)}
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>
                                                            </div>
                                                            
                                                            {/* Calendar Grid */}
                                                            <div className="space-y-2 sm:space-y-3">
                                                                <div className="text-center text-xs sm:text-sm font-semibold">
                                                                    {months[tempMonth]} {tempYear}
                                                                </div>
                                                                
                                                                {/* Day headers */}
                                                                <div className="grid grid-cols-7 gap-1 text-center">
                                                                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                                                                        <div key={day} className="text-[9px] sm:text-xs font-semibold text-muted-foreground p-1">
                                                                            {day}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                                
                                                                {/* Day buttons */}
                                                                <div className="grid grid-cols-7 gap-1">
                                                                    {days.map((day, index) => (
                                                                        <button
                                                                            key={index}
                                                                            type="button"
                                                                            className={cn(
                                                                                "text-[9px] sm:text-xs p-1 sm:p-2 rounded hover:bg-accent transition-colors",
                                                                                !day && "invisible",
                                                                                day && "hover:bg-accent hover:text-accent-foreground cursor-pointer",
                                                                                field.value && new Date(field.value).getDate() === day && tempMonth === new Date(field.value).getMonth() && tempYear === new Date(field.value).getFullYear() && "bg-primary text-primary-foreground font-bold"
                                                                            )}
                                                                            onClick={() => day && handleDateSelect(day)}
                                                                            disabled={!day}
                                                                        >
                                                                            {day}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </PopoverContent>
                                                </Popover>
                                                <FormMessage className="text-xs" />
                                            </FormItem>
                                        );
                                    }} />
                                    
                                    {/* Disability - Common for both India and USA */}
                                    <FormField control={control} name="disability" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] sm:text-xs md:text-sm">Disability</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value || ''}>
                                                <FormControl>
                                                    <SelectTrigger className="text-[10px] sm:text-xs md:text-sm h-7 sm:h-8 md:h-9 lg:h-10">
                                                        <SelectValue placeholder="Select disability status" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="Yes">Yes</SelectItem>
                                                    <SelectItem value="No">No</SelectItem>
                                                    <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage className="text-xs" />
                                        </FormItem>
                                    )} />
                                    
                                    {/* Profile Photo - Common for both India and USA */}
                                    <FormField control={control} name="photoURL" render={({ field }) => (
                                        <FormItem className="sm:col-span-2">
                                            <FormLabel className="text-[10px] sm:text-xs md:text-sm">Profile Photo</FormLabel>
                                            <FormControl>
                                                <div className="flex items-center gap-2 sm:gap-4 flex-wrap sm:flex-nowrap">
                                                    <Avatar className="h-16 w-16 sm:h-20 sm:w-20">
                                                        <AvatarImage src={photoURL} />
                                                        <AvatarFallback><UserIcon className="h-8 w-8 sm:h-10 sm:w-10" /></AvatarFallback>
                                                    </Avatar>
                                                    <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="text-xs sm:text-sm">
                                                        Upload Photo
                                                    </Button>
                                                    <Input 
                                                        type="file" 
                                                        className="hidden" 
                                                        ref={fileInputRef}
                                                        accept="image/png, image/jpeg, image/gif"
                                                        onChange={handleImageChange}
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormMessage className="text-xs" />
                                        </FormItem>
                                    )} />
                                    {/* USA-specific fields */}
                                    {watch('citizenship') === 'USA' && (
                                        <>
                                            <FormField control={control} name="sponsorship" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-[10px] sm:text-xs md:text-sm">Sponsorship</FormLabel>
                                                    <FormControl><Input {...field} className="text-[10px] sm:text-xs md:text-sm h-7 sm:h-8 md:h-9 lg:h-10" /></FormControl>
                                                    <FormMessage className="text-xs" />
                                                </FormItem>
                                            )} />
                                            <FormField control={control} name="totalExperience" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-[10px] sm:text-xs md:text-sm">Total Professional Experience</FormLabel>
                                                    <FormControl><Input {...field} className="text-[10px] sm:text-xs md:text-sm h-7 sm:h-8 md:h-9 lg:h-10" /></FormControl>
                                                    <FormMessage className="text-xs" />
                                                </FormItem>
                                            )} />
                                            <FormField control={control} name="visaStatus" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-[10px] sm:text-xs md:text-sm">Current Visa Status</FormLabel>
                                                    <FormControl><Input {...field} className="text-[10px] sm:text-xs md:text-sm h-7 sm:h-8 md:h-9 lg:h-10" /></FormControl>
                                                    <FormMessage className="text-xs" />
                                                </FormItem>
                                            )} />
                                            <FormField control={control} name="clearance" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-[10px] sm:text-xs md:text-sm">Clearance</FormLabel>
                                                    <FormControl><Input {...field} className="text-[10px] sm:text-xs md:text-sm h-7 sm:h-8 md:h-9 lg:h-10" /></FormControl>
                                                    <FormMessage className="text-xs" />
                                                </FormItem>
                                            )} />
                                            <FormField control={control} name="relocation" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-[10px] sm:text-xs md:text-sm">Relocation</FormLabel>
                                                    <FormControl><Input {...field} className="text-[10px] sm:text-xs md:text-sm h-7 sm:h-8 md:h-9 lg:h-10" /></FormControl>
                                                    <FormMessage className="text-xs" />
                                                </FormItem>
                                            )} />
                                            {/* Address lines for USA */}
                                            <FormField control={control} name="addressLine1" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-[10px] sm:text-xs md:text-sm">Address Line 1<span className="text-red-500 ml-1">*</span></FormLabel>
                                                    <FormControl><Input {...field} className="text-[10px] sm:text-xs md:text-sm h-7 sm:h-8 md:h-9 lg:h-10" /></FormControl>
                                                    <FormMessage className="text-xs" />
                                                </FormItem>
                                            )} />
                                            <FormField control={control} name="addressLine2" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-[10px] sm:text-xs md:text-sm">Address Line 2</FormLabel>
                                                    <FormControl><Input {...field} className="text-[10px] sm:text-xs md:text-sm h-7 sm:h-8 md:h-9 lg:h-10" /></FormControl>
                                                    <FormMessage className="text-xs" />
                                                </FormItem>
                                            )} />
                                            <FormField control={control} name="city" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-[10px] sm:text-xs md:text-sm">City<span className="text-red-500 ml-1">*</span></FormLabel>
                                                    <FormControl><Input {...field} className="text-[10px] sm:text-xs md:text-sm h-7 sm:h-8 md:h-9 lg:h-10" /></FormControl>
                                                    <FormMessage className="text-xs" />
                                                </FormItem>
                                            )} />
                                            <FormField control={control} name="state" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-[10px] sm:text-xs md:text-sm">State<span className="text-red-500 ml-1">*</span></FormLabel>
                                                    <FormControl><Input {...field} className="text-[10px] sm:text-xs md:text-sm h-7 sm:h-8 md:h-9 lg:h-10" /></FormControl>
                                                    <FormMessage className="text-xs" />
                                                </FormItem>
                                            )} />
                                            <FormField control={control} name="zipcode" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-[10px] sm:text-xs md:text-sm">Zip Code<span className="text-red-500 ml-1">*</span></FormLabel>
                                                    <FormControl><Input {...field} className="text-[10px] sm:text-xs md:text-sm h-7 sm:h-8 md:h-9 lg:h-10" /></FormControl>
                                                    <FormMessage className="text-xs" />
                                                </FormItem>
                                            )} />
                                            {/* USA-only fields: race, veteranStatus, protectedVeteranStatus, linkedin, github */}
                                            <FormField control={control} name="race" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-[10px] sm:text-xs md:text-sm">Race</FormLabel>
                                                    <FormControl><Input {...field} placeholder="e.g., Asian, Black or African American, White" className="text-[10px] sm:text-xs md:text-sm h-7 sm:h-8 md:h-9 lg:h-10" /></FormControl>
                                                    <FormMessage className="text-xs" />
                                                </FormItem>
                                            )} />
                                            <FormField control={control} name="veteranStatus" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs sm:text-sm">Veteran Status</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value || ''}>
                                                        <FormControl>
                                                            <SelectTrigger className="text-xs sm:text-sm h-8 sm:h-10">
                                                                <SelectValue placeholder="Select veteran status" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="Veteran">Veteran</SelectItem>
                                                            <SelectItem value="Non-Veteran">Non-Veteran</SelectItem>
                                                            <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage className="text-xs" />
                                                </FormItem>
                                            )} />
                                            <FormField control={control} name="protectedVeteranStatus" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs sm:text-sm">Protected Veteran Status</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value || ''}>
                                                        <FormControl>
                                                            <SelectTrigger className="text-xs sm:text-sm h-8 sm:h-10">
                                                                <SelectValue placeholder="Select protected veteran status" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="Protected Veteran">Protected Veteran</SelectItem>
                                                            <SelectItem value="Not Protected">Not Protected</SelectItem>
                                                            <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage className="text-xs" />
                                                </FormItem>
                                            )} />
                                            <FormField control={control} name="linkedin" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs sm:text-sm">LinkedIn Profile</FormLabel>
                                                    <FormControl><Input {...field} placeholder="https://linkedin.com/in/yourprofile" className="text-xs sm:text-sm h-8 sm:h-10" /></FormControl>
                                                    <FormMessage className="text-xs" />
                                                </FormItem>
                                            )} />
                                            <FormField control={control} name="github" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs sm:text-sm">GitHub Profile</FormLabel>
                                                    <FormControl><Input {...field} placeholder="https://github.com/yourusername" className="text-xs sm:text-sm h-8 sm:h-10" /></FormControl>
                                                    <FormMessage className="text-xs" />
                                                </FormItem>
                                            )} />
                                        </>
                                    )}
                                    {/* India fields: hide USA-specific fields, but show First/Last Name, Email, Address, Pincode */}
                                    {watch('citizenship') === 'India' && (
                                        <>
                                            <FormField control={control} name="address" render={({ field }) => (
                                                <FormItem className="sm:col-span-2">
                                                    <FormLabel className="text-[10px] sm:text-xs md:text-sm">Address<span className="text-red-500 ml-1">*</span></FormLabel>
                                                    <FormControl><Textarea {...field} className="text-[10px] sm:text-xs md:text-sm" rows={2} /></FormControl>
                                                    <FormMessage className="text-xs" />
                                                </FormItem>
                                            )} />
                                            <FormField control={control} name="pincode" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-[10px] sm:text-xs md:text-sm">Pincode<span className="text-red-500 ml-1">*</span></FormLabel>
                                                    <FormControl><Input {...field} className="text-[10px] sm:text-xs md:text-sm h-7 sm:h-8 md:h-9 lg:h-10" /></FormControl>
                                                    <FormMessage className="text-xs" />
                                                </FormItem>
                                            )} />
                                        </>
                                    )}
                                </div>
                                <div className="mt-4 sm:mt-6 flex justify-end">
                                    <Button 
                                        type="button" 
                                        onClick={() => handleStepSave(0)} 
                                        disabled={isSubmitting || isSaving}
                                        size="sm"
                                        className="text-xs sm:text-sm"
                                    >
                                        {isSaving ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin mr-2" /> : null}
                                        Save & Next
                                    </Button>
                                </div>
                            </div>
                            
                            {/* Step 1: Education */}
                            <div style={{ display: 'block', visibility: currentStep === 1 ? 'visible' : 'hidden', position: currentStep === 1 ? 'static' : 'absolute', left: currentStep === 1 ? 'auto' : '-9999px' }}>
                               <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-4">Education<span className="text-red-500 ml-1">*</span></h3>
                               <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">At least one education entry is required.</p>
                                {educationFields.map((field, index) => (
                                    <div key={field.id} className="space-y-2 border p-2 sm:p-4 rounded-md mb-3 sm:mb-4 relative">
                                        <FormField control={control} name={`education.${index}.degree`} render={({ field }) => (
                                            <FormItem><FormLabel className="text-xs sm:text-sm">Degree<span className="text-red-500 ml-1">*</span></FormLabel><FormControl><Input {...field} className="text-xs sm:text-sm h-8 sm:h-10" /></FormControl><FormMessage className="text-xs" /></FormItem>
                                        )} />
                                        <FormField control={control} name={`education.${index}.university`} render={({ field }) => (
                                            <FormItem><FormLabel className="text-xs sm:text-sm">University<span className="text-red-500 ml-1">*</span></FormLabel><FormControl><Input {...field} className="text-xs sm:text-sm h-8 sm:h-10" /></FormControl><FormMessage className="text-xs" /></FormItem>
                                        )} />
                                        <FormField control={control} name={`education.${index}.course`} render={({ field }) => (
                                            <FormItem><FormLabel className="text-xs sm:text-sm">Course/Major</FormLabel><FormControl><Input {...field} placeholder="e.g., Computer Science, Engineering" className="text-xs sm:text-sm h-8 sm:h-10" /></FormControl><FormMessage className="text-xs" /></FormItem>
                                        )} />
                                        <FormField control={control} name={`education.${index}.duration`} render={({ field }) => (
                                            <FormItem><FormLabel className="text-xs sm:text-sm">Duration (e.g., 2020-2024)</FormLabel><FormControl><Input {...field} className="text-xs sm:text-sm h-8 sm:h-10" /></FormControl><FormMessage className="text-xs" /></FormItem>
                                        )} />
                                        <FormField control={control} name={`education.${index}.year`} render={({ field }) => (
                                            <FormItem><FormLabel className="text-xs sm:text-sm">Year of Completion<span className="text-red-500 ml-1">*</span></FormLabel><FormControl><Input {...field} className="text-xs sm:text-sm h-8 sm:h-10" /></FormControl><FormMessage className="text-xs" /></FormItem>
                                        )} />
                                        <Button type="button" variant="destructive" size="sm" onClick={() => removeEducation(index)} className="absolute top-1 right-1 sm:top-2 sm:right-2 text-xs h-6 sm:h-8">Remove</Button>
                                    </div>
                                ))}
                                <Button type="button" onClick={() => appendEducation({ degree: '', university: '', course: '', year: '', duration: '' })} size="sm" className="text-xs sm:text-sm">Add Education</Button>
                                <div className="mt-4 sm:mt-6 flex justify-end">
                                    <Button 
                                        type="button" 
                                        onClick={() => handleStepSave(1)} 
                                        disabled={isSubmitting || isSaving}
                                        size="sm"
                                        className="text-xs sm:text-sm"
                                    >
                                        {isSaving ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin mr-2" /> : null}
                                        Save & Next
                                    </Button>
                                </div>
                            </div>

                            {/* Step 2: Experience */}
                            <div style={{ display: 'block', visibility: currentStep === 2 ? 'visible' : 'hidden', position: currentStep === 2 ? 'static' : 'absolute', left: currentStep === 2 ? 'auto' : '-9999px' }}>
                               <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Work Experience</h3>
                                {experienceFields.map((field, index) => (
                                    <div key={field.id} className="space-y-2 border p-2 sm:p-4 rounded-md mb-3 sm:mb-4 relative">
                                        <FormField control={control} name={`experience.${index}.company`} render={({ field }) => (
                                            <FormItem><FormLabel className="text-xs sm:text-sm">Company<span className="text-red-500 ml-1">*</span></FormLabel><FormControl><Input {...field} className="text-xs sm:text-sm h-8 sm:h-10" /></FormControl><FormMessage className="text-xs" /></FormItem>
                                        )} />
                                        <FormField control={control} name={`experience.${index}.role`} render={({ field }) => (
                                            <FormItem><FormLabel className="text-xs sm:text-sm">Role<span className="text-red-500 ml-1">*</span></FormLabel><FormControl><Input {...field} className="text-xs sm:text-sm h-8 sm:h-10" /></FormControl><FormMessage className="text-xs" /></FormItem>
                                        )} />
                                        <FormField control={control} name={`experience.${index}.duration`} render={({ field }) => (
                                            <FormItem><FormLabel className="text-xs sm:text-sm">Duration<span className="text-red-500 ml-1">*</span></FormLabel><FormControl><Input {...field} placeholder="e.g., Jan 2022 - Present" className="text-xs sm:text-sm h-8 sm:h-10" /></FormControl><FormMessage className="text-xs" /></FormItem>
                                        )} />
                                        <FormField control={control} name={`experience.${index}.description`} render={({ field }) => (
                                            <FormItem><FormLabel className="text-xs sm:text-sm">Description</FormLabel><FormControl><Textarea {...field} className="text-xs sm:text-sm" rows={2} /></FormControl><FormMessage className="text-xs" /></FormItem>
                                        )} />
                                        <Button type="button" variant="destructive" size="sm" onClick={() => removeExperience(index)} className="absolute top-1 right-1 sm:top-2 sm:right-2 text-xs h-6 sm:h-8">Remove</Button>
                                    </div>
                                ))}
                                <Button type="button" onClick={() => appendExperience({ company: '', role: '', duration: '', description: '' })} size="sm" className="text-xs sm:text-sm">Add Experience</Button>
                                    <div className="mt-4 sm:mt-6 flex justify-end">
                                        <Button 
                                            type="button" 
                                            onClick={() => handleStepSave(2)} 
                                            disabled={isSubmitting || isSaving}
                                            size="sm"
                                            className="text-xs sm:text-sm"
                                        >
                                            {isSaving ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin mr-2" /> : null}
                                            Save & Next
                                        </Button>
                                    </div>
                            </div>

                            {/* Step 3: Skills */}
                             <div style={{ display: 'block', visibility: currentStep === 3 ? 'visible' : 'hidden', position: currentStep === 3 ? 'static' : 'absolute', left: currentStep === 3 ? 'auto' : '-9999px' }}>
                                <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-4">Skills<span className="text-red-500 ml-1">*</span></h3>
                                <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">At least one skill is required.</p>
                                <div className="flex gap-2 mb-3 sm:mb-4 flex-col sm:flex-row">
                                    <Input 
                                        value={skillInput} 
                                        onChange={(e) => setSkillInput(e.target.value)}
                                        onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleAddSkill(); } }}
                                        placeholder="e.g., React, Node.js, Python"
                                        className="text-xs sm:text-sm h-8 sm:h-10 flex-1"
                                    />
                                    <Button type="button" onClick={handleAddSkill} size="sm" className="text-xs sm:text-sm w-full sm:w-auto">Add Skill</Button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {skillFields.map((field, index) => (
                                        <Badge key={field.id} variant="secondary" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                                            {getValues(`skills.${index}`)}
                                            <button type="button" onClick={() => removeSkill(index)} className="rounded-full hover:bg-muted-foreground/20 p-0.5">
                                                <X className="h-3 w-3" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                                {skillFields.length === 0 && (
                                    <p className="text-xs text-red-500 mt-2">Please add at least one skill.</p>
                                )}
                                    <div className="mt-4 sm:mt-6 flex justify-end">
                                        <Button 
                                            type="button" 
                                            onClick={() => handleStepSave(3)} 
                                            disabled={isSubmitting || isSaving || skillFields.length === 0}
                                            size="sm"
                                            className="text-xs sm:text-sm"
                                        >
                                            {isSaving ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin mr-2" /> : null}
                                            Save & Next
                                        </Button>
                                    </div>
                            </div>
                            
                            {/* Step 4: Projects & Certifications */}
                            <div style={{ display: 'block', visibility: currentStep === 4 ? 'visible' : 'hidden', position: currentStep === 4 ? 'static' : 'absolute', left: currentStep === 4 ? 'auto' : '-9999px' }}>
                                <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Projects</h3>
                                {projectFields.map((field, index) => (
                                    <div key={field.id} className="space-y-2 border p-2 sm:p-4 rounded-md mb-3 sm:mb-4 relative">
                                        <FormField control={control} name={`projects.${index}.title`} render={({ field }) => (
                                            <FormItem><FormLabel className="text-xs sm:text-sm">Project Title<span className="text-red-500 ml-1">*</span></FormLabel><FormControl><Input {...field} className="text-xs sm:text-sm h-8 sm:h-10" /></FormControl><FormMessage className="text-xs" /></FormItem>
                                        )} />
                                        <FormField control={control} name={`projects.${index}.tech`} render={({ field }) => (
                                            <FormItem><FormLabel className="text-xs sm:text-sm">Technologies Used<span className="text-red-500 ml-1">*</span></FormLabel><FormControl><Input {...field} placeholder="e.g., Next.js, Tailwind CSS, Firebase" className="text-xs sm:text-sm h-8 sm:h-10" /></FormControl><FormMessage className="text-xs" /></FormItem>
                                        )} />
                                        <FormField control={control} name={`projects.${index}.description`} render={({ field }) => (
                                            <FormItem><FormLabel className="text-xs sm:text-sm">Description</FormLabel><FormControl><Textarea {...field} className="text-xs sm:text-sm" rows={2} /></FormControl><FormMessage className="text-xs" /></FormItem>
                                        )} />
                                        <Button type="button" variant="destructive" size="sm" onClick={() => removeProject(index)} className="absolute top-1 right-1 sm:top-2 sm:right-2 text-xs h-6 sm:h-8">Remove</Button>
                                    </div>
                                ))}
                                <Button type="button" onClick={() => appendProject({ title: '', tech: '', description: '' })} size="sm" className="text-xs sm:text-sm mb-4 sm:mb-8">Add Project</Button>

                                <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 mt-4 sm:mt-8">Certifications</h3>
                                {certificationFields.map((field, index) => (
                                    <div key={field.id} className="space-y-2 border p-2 sm:p-4 rounded-md mb-3 sm:mb-4 relative">
                                        <FormField control={control} name={`certifications.${index}.title`} render={({ field }) => (
                                            <FormItem><FormLabel className="text-xs sm:text-sm">Certification Title<span className="text-red-500 ml-1">*</span></FormLabel><FormControl><Input {...field} className="text-xs sm:text-sm h-8 sm:h-10" /></FormControl><FormMessage className="text-xs" /></FormItem>
                                        )} />
                                        <FormField control={control} name={`certifications.${index}.issuer`} render={({ field }) => (
                                            <FormItem><FormLabel className="text-xs sm:text-sm">Issuer<span className="text-red-500 ml-1">*</span></FormLabel><FormControl><Input {...field} placeholder="e.g., Google, Coursera" className="text-xs sm:text-sm h-8 sm:h-10" /></FormControl><FormMessage className="text-xs" /></FormItem>
                                        )} />
                                        <Button type="button" variant="destructive" size="sm" onClick={() => removeCertification(index)} className="absolute top-1 right-1 sm:top-2 sm:right-2 text-xs h-6 sm:h-8">Remove</Button>
                                    </div>
                                ))}
                                <Button type="button" onClick={() => appendCertification({ title: '', issuer: '' })} size="sm" className="text-xs sm:text-sm">Add Certification</Button>
                                    <div className="mt-4 sm:mt-6 flex justify-end">
                                        <Button 
                                            type="button" 
                                            onClick={() => handleStepSave(4)} 
                                            disabled={isSubmitting || isSaving}
                                            size="sm"
                                            className="text-xs sm:text-sm"
                                        >
                                            {isSaving ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin mr-2" /> : null}
                                            Save & Next
                                        </Button>
                                    </div>
                            </div>

                            {/* Step 5: Additional Details */}
                            <div style={{ display: 'block', visibility: currentStep === 5 ? 'visible' : 'hidden', position: currentStep === 5 ? 'static' : 'absolute', left: currentStep === 5 ? 'auto' : '-9999px' }}>
                                <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Languages</h3>
                                {languageFields.map((field, index) => (
                                    <div key={field.id} className="space-y-2 border p-2 sm:p-4 rounded-md mb-3 sm:mb-4 relative">
                                        <FormField control={control} name={`languages.${index}.language`} render={({ field }) => (
                                            <FormItem><FormLabel className="text-xs sm:text-sm">Language<span className="text-red-500 ml-1">*</span></FormLabel><FormControl><Input {...field} placeholder="e.g., Spanish, Hindi, French" className="text-xs sm:text-sm h-8 sm:h-10" /></FormControl><FormMessage className="text-xs" /></FormItem>
                                        )} />
                                        <FormField control={control} name={`languages.${index}.proficiency`} render={({ field }) => {
                                            const currentValue = String(field.value || '');
                                            return (
                                            <FormItem>
                                                <FormLabel className="text-xs sm:text-sm">Proficiency Level<span className="text-red-500 ml-1">*</span></FormLabel>
                                                <Select onValueChange={(value) => { field.onChange(value); field.onBlur(); }} value={currentValue}>
                                                    <FormControl>
                                                        <SelectTrigger className="text-xs sm:text-sm h-8 sm:h-10">
                                                            <SelectValue placeholder="Select proficiency level" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="Native">Native</SelectItem>
                                                        <SelectItem value="Fluent">Fluent</SelectItem>
                                                        <SelectItem value="Intermediate">Intermediate</SelectItem>
                                                        <SelectItem value="Basic">Basic</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage className="text-xs" />
                                            </FormItem>
                                            );
                                        }} />
                                        <Button type="button" variant="destructive" size="sm" onClick={() => removeLanguage(index)} className="absolute top-1 right-1 sm:top-2 sm:right-2 text-xs h-6 sm:h-8">Remove</Button>
                                    </div>
                                ))}
                                <Button type="button" onClick={() => appendLanguage({ language: '', proficiency: '' })} size="sm" className="text-xs sm:text-sm mb-4 sm:mb-8">Add Language</Button>

                                <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 mt-4 sm:mt-8">Technical Tools & Platforms</h3>
                                <div className="border p-2 sm:p-4 rounded-md mb-3 sm:mb-4">
                                    <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">Enter technical tools/platforms you know (comma-separated): Salesforce, JIRA, etc.</p>
                                    <div className="flex gap-2 mb-3 sm:mb-4">
                                        <Textarea 
                                            placeholder="e.g., Salesforce, JIRA, Azure, AWS, etc."
                                            value={technicalToolsInput}
                                            onChange={(e) => {
                                                const inputValue = e.target.value;
                                                setTechnicalToolsInput(inputValue);
                                                const tools = inputValue.split(',').map(t => t.trim()).filter(t => t.length > 0);
                                                setValue('technicalTools', tools, { shouldDirty: true });
                                            }}
                                            rows={3}
                                            className="text-xs sm:text-sm"
                                        />
                                    </div>
                                    {((getValues('technicalTools') || []).length > 0) && (
                                        <p className="text-xs text-muted-foreground">
                                            {(getValues('technicalTools') || []).length} tool{(getValues('technicalTools') || []).length !== 1 ? 's' : ''} added
                                        </p>
                                    )}
                                </div>

                                <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 mt-4 sm:mt-8">Volunteer Work</h3>
                                {volunteerFields.map((field, index) => (
                                    <div key={field.id} className="space-y-2 border p-2 sm:p-4 rounded-md mb-3 sm:mb-4 relative">
                                        <FormField control={control} name={`volunteerWork.${index}.role`} render={({ field }) => (
                                            <FormItem><FormLabel className="text-xs sm:text-sm">Role<span className="text-red-500 ml-1">*</span></FormLabel><FormControl><Input {...field} placeholder="e.g., Volunteer Coordinator" className="text-xs sm:text-sm h-8 sm:h-10" /></FormControl><FormMessage className="text-xs" /></FormItem>
                                        )} />
                                        <FormField control={control} name={`volunteerWork.${index}.organization`} render={({ field }) => (
                                            <FormItem><FormLabel className="text-xs sm:text-sm">Organization<span className="text-red-500 ml-1">*</span></FormLabel><FormControl><Input {...field} placeholder="e.g., Red Cross, Local NGO" className="text-xs sm:text-sm h-8 sm:h-10" /></FormControl><FormMessage className="text-xs" /></FormItem>
                                        )} />
                                        <FormField control={control} name={`volunteerWork.${index}.duration`} render={({ field }) => (
                                            <FormItem><FormLabel className="text-xs sm:text-sm">Duration<span className="text-red-500 ml-1">*</span></FormLabel><FormControl><Input {...field} placeholder="e.g., Jan 2022 - Present" className="text-xs sm:text-sm h-8 sm:h-10" /></FormControl><FormMessage className="text-xs" /></FormItem>
                                        )} />
                                        <FormField control={control} name={`volunteerWork.${index}.description`} render={({ field }) => (
                                            <FormItem><FormLabel className="text-xs sm:text-sm">Description</FormLabel><FormControl><Textarea {...field} className="text-xs sm:text-sm" rows={2} /></FormControl><FormMessage className="text-xs" /></FormItem>
                                        )} />
                                        <Button type="button" variant="destructive" size="sm" onClick={() => removeVolunteer(index)} className="absolute top-1 right-1 sm:top-2 sm:right-2 text-xs h-6 sm:h-8">Remove</Button>
                                    </div>
                                ))}
                                <Button type="button" onClick={() => appendVolunteer({ role: '', organization: '', duration: '', description: '' })} size="sm" className="text-xs sm:text-sm mb-4 sm:mb-8">Add Volunteer Work</Button>

                                <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 mt-4 sm:mt-8">Publications & Speaking</h3>
                                {publicationFields.map((field, index) => (
                                    <div key={field.id} className="space-y-2 border p-2 sm:p-4 rounded-md mb-3 sm:mb-4 relative">
                                        <FormField control={control} name={`publications.${index}.title`} render={({ field }) => (
                                            <FormItem><FormLabel className="text-xs sm:text-sm">Title<span className="text-red-500 ml-1">*</span></FormLabel><FormControl><Input {...field} placeholder="e.g., Building Scalable APIs" className="text-xs sm:text-sm h-8 sm:h-10" /></FormControl><FormMessage className="text-xs" /></FormItem>
                                        )} />
                                        <FormField control={control} name={`publications.${index}.publication`} render={({ field }) => (
                                            <FormItem><FormLabel className="text-xs sm:text-sm">Publication/Conference<span className="text-red-500 ml-1">*</span></FormLabel><FormControl><Input {...field} placeholder="e.g., Tech Conference 2024, Medium" className="text-xs sm:text-sm h-8 sm:h-10" /></FormControl><FormMessage className="text-xs" /></FormItem>
                                        )} />
                                        <FormField control={control} name={`publications.${index}.date`} render={({ field }) => (
                                            <FormItem><FormLabel className="text-xs sm:text-sm">Date<span className="text-red-500 ml-1">*</span></FormLabel><FormControl><Input {...field} placeholder="e.g., Jan 2024" className="text-xs sm:text-sm h-8 sm:h-10" /></FormControl><FormMessage className="text-xs" /></FormItem>
                                        )} />
                                        <Button type="button" variant="destructive" size="sm" onClick={() => removePublication(index)} className="absolute top-1 right-1 sm:top-2 sm:right-2 text-xs h-6 sm:h-8">Remove</Button>
                                    </div>
                                ))}
                                <Button type="button" onClick={() => appendPublication({ title: '', publication: '', date: '' })} size="sm" className="text-xs sm:text-sm mb-4 sm:mb-8">Add Publication</Button>

                                <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 mt-4 sm:mt-8">Awards & Honors</h3>
                                {awardFields.map((field, index) => (
                                    <div key={field.id} className="space-y-2 border p-2 sm:p-4 rounded-md mb-3 sm:mb-4 relative">
                                        <FormField control={control} name={`awards.${index}.title`} render={({ field }) => (
                                            <FormItem><FormLabel className="text-xs sm:text-sm">Award Title<span className="text-red-500 ml-1">*</span></FormLabel><FormControl><Input {...field} placeholder="e.g., Employee of the Year" className="text-xs sm:text-sm h-8 sm:h-10" /></FormControl><FormMessage className="text-xs" /></FormItem>
                                        )} />
                                        <FormField control={control} name={`awards.${index}.organization`} render={({ field }) => (
                                            <FormItem><FormLabel className="text-xs sm:text-sm">Organization<span className="text-red-500 ml-1">*</span></FormLabel><FormControl><Input {...field} placeholder="e.g., Company Name, Industry Body" className="text-xs sm:text-sm h-8 sm:h-10" /></FormControl><FormMessage className="text-xs" /></FormItem>
                                        )} />
                                        <FormField control={control} name={`awards.${index}.date`} render={({ field }) => (
                                            <FormItem><FormLabel className="text-xs sm:text-sm">Date<span className="text-red-500 ml-1">*</span></FormLabel><FormControl><Input {...field} placeholder="e.g., Mar 2023" className="text-xs sm:text-sm h-8 sm:h-10" /></FormControl><FormMessage className="text-xs" /></FormItem>
                                        )} />
                                        <Button type="button" variant="destructive" size="sm" onClick={() => removeAward(index)} className="absolute top-1 right-1 sm:top-2 sm:right-2 text-xs h-6 sm:h-8">Remove</Button>
                                    </div>
                                ))}
                                <Button type="button" onClick={() => appendAward({ title: '', organization: '', date: '' })} size="sm" className="text-xs sm:text-sm mb-4 sm:mb-8">Add Award</Button>

                                <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 mt-4 sm:mt-8">Professional Interests</h3>
                                <FormField control={control} name="interests" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs sm:text-sm">What are your professional interests?</FormLabel>
                                        <FormControl><Textarea {...field} placeholder="e.g., AI/ML, Blockchain, Cloud Computing, Frontend Development" rows={3} className="text-xs sm:text-sm" /></FormControl>
                                        <FormMessage className="text-xs" />
                                    </FormItem>
                                )} />

                                <div className="mt-4 sm:mt-6 flex justify-end">
                                    <Button 
                                        type="button" 
                                        onClick={() => handleStepSave(5)} 
                                        disabled={isSubmitting || isSaving}
                                        size="sm"
                                        className="text-xs sm:text-sm"
                                    >
                                        {isSaving ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin mr-2" /> : null}
                                        Save & Next
                                    </Button>
                                </div>
                            </div>

                            {/* Step 6: Job Preferences */}
                            <div style={{ display: 'block', visibility: currentStep === 6 ? 'visible' : 'hidden', position: currentStep === 6 ? 'static' : 'absolute', left: currentStep === 6 ? 'auto' : '-9999px' }}>
                               <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-4">Job Preferences <span className="text-red-500 ml-1">*</span></h3>
                               <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">At least one job preference is required.</p>
                                {jobPreferenceFields.map((field, index) => (
                                    <div key={field.id} className="space-y-2 border p-2 sm:p-4 rounded-md mb-3 sm:mb-4 relative">
                                        <FormField control={control} name={`jobPreferences.${index}.desiredRoles`} render={({ field }) => (
                                            <FormItem><FormLabel className="text-xs sm:text-sm">Desired Roles<span className="text-red-500 ml-1">*</span></FormLabel><FormControl><Input {...field} placeholder="e.g., Frontend Developer, Product Manager" className="text-xs sm:text-sm h-8 sm:h-10" /></FormControl><FormMessage className="text-xs" /></FormItem>
                                        )} />
                                        <FormField control={control} name={`jobPreferences.${index}.locationPreference`} render={({ field }) => (
                                            <FormItem><FormLabel className="text-xs sm:text-sm">Location Preference<span className="text-red-500 ml-1">*</span></FormLabel><FormControl><Input {...field} placeholder="e.g., Remote, New York, San Francisco" className="text-xs sm:text-sm h-8 sm:h-10" /></FormControl><FormMessage className="text-xs" /></FormItem>
                                        )} />
                                        <FormField control={control} name={`jobPreferences.${index}.keywords`} render={({ field }) => (
                                            <FormItem><FormLabel className="text-xs sm:text-sm">Job Description Keywords</FormLabel><FormControl><Input {...field} placeholder="e.g., SaaS, Fintech, AI" className="text-xs sm:text-sm h-8 sm:h-10" /></FormControl><FormMessage className="text-xs" /></FormItem>
                                        )} />
                                        <Button type="button" variant="destructive" size="sm" onClick={() => removeJobPreference(index)} className="absolute top-1 right-1 sm:top-2 sm:right-2 text-xs h-6 sm:h-8">Remove</Button>
                                    </div>
                                ))}
                                <Button type="button" onClick={() => appendJobPreference({ desiredRoles: '', locationPreference: '', keywords: '' })} size="sm" className="text-xs sm:text-sm">Add Preference</Button>
                                {jobPreferenceFields.length === 0 && (
                                    <p className="text-xs text-red-500 mt-2">Please add at least one job preference.</p>
                                )}
                                    <div className="mt-4 sm:mt-6 flex justify-end">
                                        <Button 
                                            type="button" 
                                            onClick={() => handleStepSave(6)} 
                                            disabled={isSubmitting || isSaving || jobPreferenceFields.length === 0}
                                            size="sm"
                                            className="text-xs sm:text-sm"
                                        >
                                            {isSaving ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin mr-2" /> : null}
                                            Save & Next
                                        </Button>
                                    </div>
                            </div>

                            {/* Step 7: Agreements */}
                            <div style={{ display: 'block', visibility: currentStep === 7 ? 'visible' : 'hidden', position: currentStep === 7 ? 'static' : 'absolute', left: currentStep === 7 ? 'auto' : '-9999px' }}>
                                <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Declarations & Agreements<span className="text-red-500 ml-1">*</span></h3>
                                <Card>
                                    <CardHeader className="px-3 py-3 sm:px-6 sm:py-4">
                                        <CardTitle className="text-base sm:text-lg">Terms of Service</CardTitle>
                                    </CardHeader>
                                    <CardContent className="px-3 py-3 sm:px-6 sm:py-4 space-y-4 text-xs sm:text-sm text-muted-foreground max-h-48 overflow-y-auto">
                                        <h2>FindZob Clickwrap User Authorization, AI, and Privacy Agreement</h2>
                                        <h3>1. Overview</h3>
                                        <p>Welcome to FindZob ("we," "us," or "our"). FindZob is a Texas, USA limited liability company with operations in Hyderabad, India. Our human job assistants—called "Zs"—help users apply for jobs by filling out employer career forms and preparing application materials on their behalf.</p>
                                        <p>By checking "I Agree" below, you ("User," "you," or "your") consent to the following User Authorization, AI Disclosure, Data Protection, Privacy, and Indemnity Agreement ("Agreement"). This Agreement is a legally binding contract between you and FindZob LLC.</p>
                                        <p><strong>Effective Date:</strong> This Agreement is effective as of the date you first accept these terms (the "Effective Date"). If a specific Effective Date is required for a particular engagement, it will be stated in a separate statement of work or invoice.</p>
                                        <h3>2. Authorization and Right to Represent</h3>
                                        <p>You hereby:</p>
                                        <ul>
                                            <li>Appoint FindZob LLC and its authorized agents ("Zs") as your representatives to fill, submit, and manage job application forms on your behalf on employer portals or job boards.</li>
                                            <li>Authorize FindZob to use your personal and professional information (resume, education, skills, work history, preferences) solely for the purpose of completing job applications and related communications.</li>
                                            <li>Confirm that all information you provide is accurate and lawful to share.</li>
                                            <li>Acknowledge that FindZob provides facilitation services only and does not guarantee employment or specific outcomes.</li>
                                        </ul>
                                        <h3>3. AI-Assisted Processes and Disclaimers</h3>
                                        <p>FindZob and its Z agents may use artificial intelligence (AI) tools to assist with:</p>
                                        <ul>
                                            <li>Generating or refining resumes, cover letters, or job-specific content;</li>
                                            <li>Matching your profile to job opportunities;</li>
                                            <li>Auto-completing form fields, summaries, or skill statements;</li>
                                            <li>Suggesting language or phrasing for improved application success.</li>
                                        </ul>
                                        <p>While these tools are used to improve speed and personalization, you understand and agree that:</p>
                                        <ul>
                                            <li>AI outputs may occasionally contain inaccuracies, errors, or misinterpretations.</li>
                                            <li>FindZob and its agents do not guarantee the factual correctness of AI-generated or AI-assisted content.</li>
                                            <li>You are responsible for reviewing all generated materials and verifying that they accurately represent your background, qualifications, and intent.</li>
                                            <li>FindZob shall not be liable for any false or misleading statements, inaccuracies, or outcomes produced by AI systems or human intermediaries ("HI") in the course of providing services.</li>
                                            <li>You release FindZob, its agents, and affiliates from liability for claims arising from AI- or HI-generated content, except as limited by applicable law.</li>
                                        </ul>
                                        <h3>4. Data Protection and Privacy Policy</h3>
                                        <p>FindZob respects your privacy and processes your data in accordance with applicable U.S., Indian, and international data protection standards.</p>
                                        <h4>4.1 Information We Collect</h4>
                                        <p>We collect:</p>
                                        <h2>FindZob Clickwrap User Authorization, AI Disclosure, Data Protection and Privacy Agreement</h2>
                                        <h3>1. Parties; Effective Date</h3>
                                        <p>This User Authorization, AI Disclosure, Data Protection and Privacy Agreement (the "Agreement") is entered into between you ("User" or "Client") and FindZob LLC, a Texas limited liability company with operations in Hyderabad, India ("FindZob"). This Agreement is effective as of the date on which User accepts these terms (the "Effective Date"). Specific engagements may be governed by separate statements of work, invoices, or subscription agreements that will specify any differing effective dates.</p>
                                        <h3>2. Definitions</h3>
                                        <p>Capitalized terms used in this Agreement shall have the following meanings:</p>
                                        <ul>
                                            <li>"AI" means artificial intelligence systems, models, APIs, or software used to generate, refine, or assist in producing content.</li>
                                            <li>"HI" means human intermediaries, including FindZob employees, contractors, or authorized agents who review, edit, or submit application materials on behalf of the User.</li>
                                            <li>"Services" means the job-application assistance, resume preparation, form-filling, submission, and related services provided by FindZob under this Agreement.</li>
                                        </ul>
                                        <h3>3. Appointment and Authorization</h3>
                                        <h4>3.1 Appointment</h4>
                                        <p>User hereby appoints FindZob and its authorized HIs to act as User's agent solely for the purpose of completing, submitting, and managing job application forms and related communications on User's behalf.</p>
                                        <h4>3.2 Scope of Authorization</h4>
                                        <p>User authorizes FindZob to use User's personal and professional information (including resume, education, skills, work history, and preferences) solely for the purpose of providing the Services. User acknowledges that FindZob is not a guarantor of employment and that FindZob's Services are facilitative in nature.</p>
                                        <h3>4. AI Assistance; User Responsibility</h3>
                                        <h4>4.1 Use of AI and HI</h4>
                                        <p>FindZob may employ AI tools and HIs in connection with the Services. AI tools may be used to generate, refine, or suggest content; HIs may review, edit, and submit content.</p>
                                        <h4>4.2 No Warranty as to AI Outputs</h4>
                                        <p>AI-generated or AI-assisted outputs may contain errors, inaccuracies, or misrepresentations. FindZob disclaims any warranty as to the accuracy, completeness, or fitness for a particular purpose of AI outputs.</p>
                                        <h4>4.3 User Review and Approval</h4>
                                        <p>User is solely responsible for reviewing all materials prepared or suggested by FindZob (including AI-generated content) and approving final submissions. User represents and warrants that all information provided to FindZob is true, accurate, and lawful to disclose.</p>
                                        <h3>5. Data Protection, Storage, and Sharing</h3>
                                        <h4>5.1 Information Collected</h4>
                                        <p>FindZob may collect personal information, employment preferences and history, application metadata and correspondence, device and analytics data, and other information reasonably necessary to provide the Services.</p>
                                        <h4>5.2 Purpose and Use</h4>
                                        <p>FindZob will process User data to perform the Services, to communicate with User and prospective employers, to improve FindZob's services and models (using anonymized or aggregated data where feasible), and to comply with legal obligations.</p>
                                        <h4>5.3 Storage and Security</h4>
                                        <p>User data will be stored in reasonably secure, encrypted systems hosted in the United States and India and will be accessible only to authorized personnel bound by confidentiality obligations.</p>
                                        <h4>5.4 Sharing</h4>
                                        <p>User data will be shared only with parties necessary to provide the Services (for example, employers, job boards, background check vendors, and trusted service providers) and only under confidentiality obligations. FindZob does not sell User data.</p>
                                        <h4>5.5 Retention and Deletion</h4>
                                        <p>Data will be retained only as necessary to provide Services or as required by law. User may request deletion of personal data by contacting FindZob at the contact details set forth below; deletion requests will be processed consistent with applicable law and subject to any necessary retention for pending submissions or legal compliance.</p>
                                        <h4>5.6 Data Escalations and Regulatory Contacts</h4>
                                        <p>If User has concerns about the processing, security, or treatment of personal data (including suspected breaches), User should first contact FindZob at <a href="mailto:contact@findzob.com">contact@findzob.com</a> (Attention: Data Protection Lead) or by postal mail to FindZob's business address set forth below. FindZob will:</p>
                                        <ul>
                                            <li>Acknowledge receipt of the escalation within forty-eight (48) hours where practicable;</li>
                                            <li>Undertake an initial assessment and, where necessary, commence a full investigation and provide a substantive update within fifteen (15) business days of acknowledgment; and</li>
                                            <li>Where a breach or regulatory issue is confirmed, take reasonable remedial actions and notify affected Users and any applicable supervisory authority as required by law.</li>
                                        </ul>
                                        <p>If the User is dissatisfied with FindZob's response, the User may raise the matter with the relevant data protection authority or supervisory body in the User's jurisdiction. FindZob will cooperate with any legitimate regulatory inquiry and provide reasonable assistance.</p>
                                        <h3>6. User Representations, Warranties and Responsibilities</h3>
                                        <h4>6.1 Representations and Warranties</h4>
                                        <p>User represents and warrants that: (a) User has the right to provide the information submitted to FindZob; (b) the information is accurate and not misleading; and (c) User's use of the Services and any materials submitted do not infringe third-party rights.</p>
                                        <h4>6.2 Responsibilities</h4>
                                        <p>User shall (a) provide accurate and lawful information; (b) review and approve all materials prior to submission; (c) use the Services only for lawful, legitimate job-seeking purposes; and (d) not submit fraudulent, infringing, or otherwise unlawful content.</p>
                                        <h3>7. Fees, Billing, Notices and Disputes</h3>
                                        <h4>7.1 Fees</h4>
                                        <p>Unless otherwise agreed in a separate written agreement, FindZob's standard fees shall be as follows:</p>
                                        <ul>
                                            <li>Onboarding fee: Thirty dollars ($30.00), payable at the commencement of the first onboarding session during which User's resume and application materials are curated. The Onboarding fee is non-refundable.</li>
                                            <li>Per-application fee: Two dollars ($2.00) per application submitted on User's behalf ("Per-Application Fee"). Per-Application Fees are refundable only if User requests withdrawal of a submitted application within seventy-two (72) hours of submission; otherwise Per-Application Fees are non-refundable.</li>
                                        </ul>
                                        <h4>7.2 Invoicing and Payment</h4>
                                        <p>Fees, where applicable, will be invoiced to User and are due according to the terms specified on the invoice (commonly Net 15 or Net 30). Payments may be collected by credit card, ACH, or other methods specified by FindZob.</p>
                                        <h4>7.3 Notices and Billing Contact</h4>
                                        <p>All billing questions, notices, and legal communications may be sent to: <a href="mailto:contact@findzob.com">contact@findzob.com</a> or to FindZob at the following business address:</p>
                                        <p>266 Telluride Dr Georgetown, TX 78626</p>
                                        <h4>7.4 Disputes</h4>
                                        <p>User must notify FindZob in writing of any dispute with an invoice or charge within thirty (30) days of the invoice date. FindZob and User agree to cooperate in good faith to resolve billing disputes. Failure to timely notify FindZob of a dispute shall be deemed acceptance of the invoice.</p>
                                        <h4>7.5 Billing Escalation</h4>
                                        <p>If a billing dispute is not resolved within thirty (30) days after User's initial written notice to <a href="mailto:contact@findzob.com">contact@findzob.com</a>, User may escalate the dispute by sending written notice (with full supporting documentation) to FindZob's Legal Department at the business address below. FindZob will review escalated disputes and provide a written response within thirty (30) days of receipt. If the parties are unable to resolve the dispute within sixty (60) days following User's initial notice, the parties may pursue other remedies available at law or in equity.</p>
                                        <h3>8. Indemnification; Limitation of Liability</h3>
                                        <h4>8.1 Indemnification</h4>
                                        <p>User shall indemnify, defend and hold harmless FindZob and its officers, directors, employees, agents, and affiliates from and against any and all claims, liabilities, damages, losses, costs and expenses (including reasonable attorneys' fees) arising out of or in connection with: (a) User's breach of this Agreement; (b) User's submission of false, misleading, or unlawful information; or (c) User's misuse of the Services.</p>
                                        <h4>8.2 Limitation of Liability</h4>
                                        <p>TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, FINDZOB'S AGGREGATE LIABILITY FOR DIRECT DAMAGES ARISING OUT OF OR RELATED TO THIS AGREEMENT SHALL NOT EXCEED THE TOTAL AMOUNTS PAID BY USER TO FINDZOB FOR THE SPECIFIC SERVICES GIVING RISE TO THE CLAIM. IN NO EVENT SHALL FINDZOB BE LIABLE FOR CONSEQUENTIAL, INCIDENTAL, PUNITIVE, OR SPECIAL DAMAGES, EVEN IF ADVISED OF THE POSSIBILITY THEREOF. Nothing in this Section shall limit liability that cannot be limited by applicable law.</p>
                                        <h3>9. Termination</h3>
                                        <p>Either party may terminate this Agreement for material breach by the other party if the breaching party fails to cure the breach within thirty (30) days after receipt of written notice. FindZob may suspend Services immediately in the event of suspected fraud, abuse, or other unlawful conduct. Upon termination, FindZob will handle User data in accordance with the Retention and Deletion provisions above.</p>
                                        <h3>10. Governing Law; Severability</h3>
                                        <p>This Agreement shall be governed by and construed in accordance with the laws of the State of Texas, without regard to its conflict-of-law principles, except to the extent superseded by mandatory provisions applicable to User. If any provision of this Agreement is held invalid or unenable, the remaining provisions shall remain in full force and effect.</p>
                                        <h3>11. Acknowledgment; Acceptance</h3>
                                        <p>By checking the acceptance box or otherwise indicating acceptance, User acknowledges that User has read, understands, and agrees to be bound by this Agreement, including the disclaimers regarding AI-generated content and the fee and refund terms set forth herein.</p>
                                    </CardContent>
                                </Card>
                                <FormField
                                    control={control}
                                    name="declarations"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-2 sm:space-x-3 space-y-0 rounded-md border p-2 sm:p-4 mt-3 sm:mt-4">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                            <div className="space-y-1 leading-tight">
                                                <FormLabel className="text-xs sm:text-sm">
                                                    I have read, understood, and agree to the declarations and agreements.<span className="text-red-500 ml-1">*</span>
                                                </FormLabel>
                                                <FormMessage className="text-xs" />
                                            </div>
                                        </FormItem>
                                    )}
                                />

                                <Alert className="mt-3 sm:mt-6 text-xs sm:text-sm">
                                    <Terminal className="h-3 w-3 sm:h-4 sm:w-4" />
                                    <AlertTitle className="text-xs sm:text-sm">You're all set!</AlertTitle>
                                    <AlertDescription className="text-xs sm:text-sm">
                                        Click "Save & Complete" to finalize your profile and unlock all features of FindZob.
                                    </AlertDescription>
                                </Alert>
                                <div className="mt-4 sm:mt-6 flex justify-end">
                                    <Button 
                                        type="button" 
                                        onClick={() => handleStepSave(7)} 
                                        disabled={isSubmitting || isSaving || !declarations}
                                        size="sm"
                                        className="text-xs sm:text-sm"
                                    >
                                        {isSaving ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin mr-2" /> : null}
                                        Save & Complete
                                    </Button>
                                </div>
                            </div>

                            <div className="mt-4 sm:mt-6 flex justify-between gap-2">
                                <Button type="button" variant="outline" onClick={prevStep} disabled={currentStep === 0} size="sm" className="text-xs sm:text-sm h-8 sm:h-10 w-full sm:w-auto">Back</Button>
                            </div>
                        </form>
                    </FormProvider>
                </CardContent>
            </Card>
        </div>
    );
}