'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch'; // Ensure you have this component or use a checkbox
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { Bot, Loader2, User as UserIcon, Mic, Square, Play, Send, Trophy, AlertTriangle, CheckCircle, Volume2, VolumeX } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { chatWithInterviewer, generateInterviewFeedback, type ChatMessage } from '@/app/actions/interview-actions';
import { Progress } from '@/components/ui/progress';

type JobPreference = {
  desiredRoles: string;
  locationPreference: string;
  keywords?: string;
};

type Profile = {
  name: string;
  email?: string;
  photoURL?: string;
  jobPreferences?: JobPreference[];
  [key: string]: any;
}

type InterviewState = 'setup' | 'active' | 'feedback';

export default function InterviewPrepPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  // Setup State
  const [mode, setMode] = useState<'role' | 'application'>('role');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedAppId, setSelectedAppId] = useState<string>('');
  const [interviewState, setInterviewState] = useState<InterviewState>('setup');
  const [isLoading, setIsLoading] = useState(false);

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Feedback State
  const [feedbackData, setFeedbackData] = useState<any>(null);

  // Voice State
  const [isRecording, setIsRecording] = useState(false);
  const [isFullVoiceMode, setIsFullVoiceMode] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Data Fetching
  const userDocRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
  const { data: userDoc, isLoading: isUserDocLoading } = useDoc<any>(userDocRef);
  const { data: userData, isLoading: isUserLoading } = useDoc<Profile>(userDocRef);
  const jobsCollectionRef = useMemoFirebase(() => user ? collection(firestore, 'users', user.uid, 'jobs') : null, [user, firestore]);
  const { data: userJobs, isLoading: isJobsLoading } = useCollection<any>(jobsCollectionRef);

  // Initialize Speech Recognition & Synthesis
  useEffect(() => {
    // Synth
    if (typeof window !== 'undefined') {
        synthRef.current = window.speechSynthesis;
        
        const loadVoices = () => {
            const vs = window.speechSynthesis.getVoices();
            if (vs.length > 0) {
                setVoices(vs);
            }
        };

        // Initial load
        loadVoices();

        // Event listener for when voices are loaded (Chrome needs this)
        window.speechSynthesis.onvoiceschanged = () => {
            loadVoices();
        };
    }

    // Recognition
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true; 
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
        if (finalTranscript) {
           setCurrentInput(prev => (prev ? prev + ' ' : '') + finalTranscript);
           
           // If Full Voice Mode, reset silence timer
           if (isFullVoiceMode) {
               if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
               silenceTimerRef.current = setTimeout(() => {
                   stopRecordingAndSend();
               }, 2000); // 2 seconds silence = send
           }
        } else if (interimTranscript && isFullVoiceMode) {
            // Also reset timer on interim to prevent cut-off while thinking
             if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
             silenceTimerRef.current = setTimeout(() => {
                 stopRecordingAndSend();
             }, 2500); 
        }
      };

      recognitionRef.current.onend = () => {
         setIsRecording(false);
      };
      
      recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          setIsRecording(false);
          // Don't auto-restart on error loops
      };
    }

    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      if (synthRef.current) synthRef.current.cancel();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, [isFullVoiceMode]);

  // Helper to trigger stop from outside
  const stopRecordingAndSend = () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      // Logic handled in useEffect watching isRecording
  };
  
  // Watch logic: When recording stops in Full Voice Mode, if there is input, send it.
  const prevIsRecording = useRef(false);
  useEffect(() => {
      // Transition from True -> False
      if (prevIsRecording.current && !isRecording) {
          if (isFullVoiceMode && currentInput.trim().length > 0) {
              // Delay slightly to ensure state is settled
              setTimeout(() => {
                  sendMessage();
              }, 100);
          }
      }
      prevIsRecording.current = isRecording;
  }, [isRecording, isFullVoiceMode, currentInput]); // Depend on currentInput to know IF we should send

  // Scroll to bottom of chat
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, isAiThinking]);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      // setIsRecording(false); // Let onend handle it
    } else {
      try {
        recognitionRef.current?.start();
        setIsRecording(true);
        if (!isFullVoiceMode) {
             toast({ title: "Listening...", description: "Speak now." });
        }
      } catch (e) {
          console.error("Mic start error", e);
      }
    }
  };

  const speakText = (text: string) => {
    if (!synthRef.current) return;
    
    // Cancel any ongoing speech
    synthRef.current.cancel();
    
    // Helper to strip markdown for TTS
    const cleanText = text.replace(/[*#_`]/g, '');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Store reference to prevent GC
    currentUtteranceRef.current = utterance;

    // Advanced Voice Selection
    // 1. Try to find a high-quality "Google" or "Natural" English voice
    // 2. Fallback to any US English voice
    // 3. Fallback to any English voice
    const availableVoices = voices.length > 0 ? voices : window.speechSynthesis.getVoices();
    const preferredVoice = 
        availableVoices.find(v => (v.name.includes('Google') && v.lang.includes('en-US'))) ||
        availableVoices.find(v => (v.name.includes('Natural') && v.lang.includes('en'))) ||
        availableVoices.find(v => v.name.includes('Samantha')) || 
        availableVoices.find(v => v.lang === 'en-US') ||
        availableVoices.find(v => v.lang.startsWith('en'));

    if (preferredVoice) {
        utterance.voice = preferredVoice;
        console.log(`Using voice: ${preferredVoice.name}`);
    } else {
        console.warn('No suitable English voice found, using default.');
    }

    utterance.volume = 1.0; 
    utterance.rate = 1.0; 
    utterance.pitch = 1.0;

    utterance.onstart = () => {
        setIsSpeaking(true);
    };

    utterance.onend = () => {
        setIsSpeaking(false);
        currentUtteranceRef.current = null; // Clear ref
        
        // If Full Voice Mode, start listening again automatically
        if (isFullVoiceMode) {
            // Wait a breathing moment
            setTimeout(() => {
               // Double check we are still in mode and not manually stopped
               if (!isRecording && !isAiThinking) {
                   toggleRecording();
               }
            }, 500);
        }
    };
    
    utterance.onerror = (e) => {
        console.error("TTS Error:", e);
        setIsSpeaking(false);
        currentUtteranceRef.current = null;
    };
    
    // Small delay to ensure synthesis is ready
    setTimeout(() => {
        if (synthRef.current) synthRef.current.speak(utterance);
    }, 10);
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  const startInterview = async () => {
    if (mode === 'role' && !selectedRole) {
      toast({ variant: 'destructive', title: 'Start Failed', description: 'Please enter a role.' });
      return;
    }
    if (mode === 'application' && !selectedAppId) {
      toast({ variant: 'destructive', title: 'Start Failed', description: 'Please select an application.' });
      return;
    }

    let roleName = selectedRole;
    let jobDesc = '';

    if (mode === 'application' && userJobs) {
        const job = userJobs.find((j:any) => j.id === selectedAppId);
        if (job) {
            roleName = job.role || job.title || job.position || 'Job Role';
            jobDesc = job.description || `Application for ${roleName} at ${job.company}`;
        }
    }

    setIsLoading(true);
    setInterviewState('active');
    setMessages([]);

    // Initial Context
    const context = {
        role: roleName,
        jobDescription: jobDesc,
        candidateName: userData?.name || 'Candidate',
        resumeSummary: userData?.bio || userData?.summary || '',
    };

    setIsAiThinking(true);
    
    // If full voice mode, we wait for AI welcome message then auto-record
    try {
        const res = await chatWithInterviewer([], "Hi, I am ready to start the interview.", context);
        if (res.success && res.message) {
            const aiMsg: ChatMessage = { role: 'model', parts: res.message };
            setMessages([aiMsg]);
            speakText(res.message);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to start interview.' });
            setInterviewState('setup');
        }
    } catch (e) {
        console.error(e);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to start interview.' });
        setInterviewState('setup');
    } finally {
        setIsAiThinking(false);
        setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!currentInput.trim()) return;

    // Force stop recording if it's still running (manual send case)
    if (isRecording) {
        recognitionRef.current?.stop();
        // Don't set state false here, let onend do it or it might double trigger
    }
    stopSpeaking();
    
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

    const userMsg: ChatMessage = { role: 'user', parts: currentInput };
    const newHistory = [...messages, userMsg];
    
    setMessages(newHistory); // Optimistic update
    setCurrentInput('');
    setIsAiThinking(true);

    try {
        let roleName = selectedRole;
        let jobDesc = '';
        if (mode === 'application' && userJobs) {
            const job = userJobs.find((j:any) => j.id === selectedAppId);
            if (job) {
                roleName = job.role || job.title;
                jobDesc = job.description;
            }
        }
        
        const context = {
            role: roleName,
            jobDescription: jobDesc,
            candidateName: userData?.name || 'Candidate',
            resumeSummary: userData?.bio || userData?.summary || '',
        };

        const res = await chatWithInterviewer(messages, userMsg.parts, context);
        
        if (res.success && res.message) {
             const aiMsg: ChatMessage = { role: 'model', parts: res.message };
             setMessages(prev => [...prev, aiMsg]);
             speakText(res.message);
        } else {
             toast({ variant: 'destructive', title: 'Error', description: 'Failed to get response.' });
             setMessages(messages); // Revert
        }
    } catch (e) {
        console.error(e);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to send message.' });
        setMessages(messages); // Revert
    } finally {
        setIsAiThinking(false);
    }
  };

  const endInterview = async () => {
    if (messages.length < 2) {
        toast({ variant: 'destructive', title: 'Too Short', description: 'Please answer at least one question before ending.' });
        return;
    }

    stopSpeaking();
    if (isRecording) recognitionRef.current?.stop();
    setIsFullVoiceMode(false); // Disable voice mode on end

    setIsLoading(true);
    try {
        let roleName = selectedRole;
        let jobDesc = '';
        
        if (mode === 'application' && userJobs) {
            const job = userJobs.find((j:any) => j.id === selectedAppId);
            if (job) {
                roleName = job.role || job.title;
                jobDesc = job.description || '';
            }
        }

        const context = { role: roleName, jobDescription: jobDesc };
        const res = await generateInterviewFeedback(messages, context);
        
        if (res.success && res.data) {
            setFeedbackData(res.data);
            setInterviewState('feedback');
        } else {
             toast({ variant: 'destructive', title: 'Error', description: 'Failed to generate feedback.' });
        }
    } catch (e) {
         console.error(e);
         toast({ variant: 'destructive', title: 'Error', description: 'Failed to generate feedback.' });
    } finally {
        setIsLoading(false);
    }
  };

  const resetInterview = () => {
    setInterviewState('setup');
    setMessages([]);
    setFeedbackData(null);
    setCurrentInput('');
    stopSpeaking();
    setIsFullVoiceMode(false);
  };

  if (isUserLoading || isJobsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl py-8 space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">AI Interview Prep</h1>
        <p className="text-muted-foreground">
          Practice your interview skills with our sophisticated AI HR Manager.
        </p>
      </div>

      {interviewState === 'setup' && (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Configure Interview</CardTitle>
            <CardDescription>
              Choose how you want to practice. You can interview for a specific role or link it to one of your applications.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Interview Mode</Label>
              <div className="flex gap-4">
                <Button 
                  variant={mode === 'role' ? 'default' : 'outline'} 
                  onClick={() => setMode('role')}
                  className="flex-1"
                >
                  By Role
                </Button>
                <Button 
                  variant={mode === 'application' ? 'default' : 'outline'} 
                  onClick={() => setMode('application')}
                  className="flex-1"
                >
                  By Application
                </Button>
              </div>
            </div>

            {mode === 'role' ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Target Role</Label>
                  <div className="relative">
                    <Input 
                        placeholder="e.g. Senior Frontend Developer" 
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value)}
                    />
                    {userData?.jobPreferences && userData.jobPreferences.length > 0 && (
                        <div className="mt-3">
                            <Label className="text-xs text-muted-foreground mb-2 block">Quick Select from Profile:</Label>
                            <div className="flex flex-wrap gap-2">
                                {userData.jobPreferences
                                    .flatMap(p => (p.desiredRoles || '').split(','))
                                    .map(r => r.trim())
                                    .filter(Boolean)
                                    .map((role, i) => (
                                    <Badge 
                                        key={i} 
                                        variant={selectedRole === role ? "default" : "outline"}
                                        className="cursor-pointer hover:bg-primary/80 transition-colors py-1 px-3"
                                        onClick={() => setSelectedRole(role)}
                                    >
                                        {role}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Select Application</Label>
                <Select value={selectedAppId} onValueChange={setSelectedAppId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a job application" />
                  </SelectTrigger>
                  <SelectContent>
                    {userJobs?.map((job: any) => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.title || job.role || 'Untitled Role'} at {job.company || 'Unknown Company'}
                      </SelectItem>
                    ))}
                    {(!userJobs || userJobs.length === 0) && (
                      <SelectItem value="none" disabled>No applications found</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {/* Warning about microphone access */}
            <Alert>
                <Mic className="h-4 w-4" />
                <AlertTitle>Microphone Access</AlertTitle>
                <AlertDescription>
                    Enable Full Voice Mode internally to experience a realistic interview loop.
                </AlertDescription>
            </Alert>

          </CardContent>
          <CardFooter>
            <Button 
                onClick={startInterview} 
                className="w-full" 
                size="lg"
                disabled={isLoading}
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
              Start Interview
            </Button>
          </CardFooter>
        </Card>
      )}

      {interviewState === 'active' && (
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <Card className="flex flex-col h-[700px] lg:col-span-2 shadow-lg border-primary/20">
                <CardHeader className="border-b bg-muted/30 pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-full">
                                <Bot className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="text-lg">AI HR Manager (Sarah)</CardTitle>
                                <CardDescription className="flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse" />
                                    Live Interview
                                </CardDescription>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                             <div className="flex items-center gap-2 bg-background p-2 rounded-lg border">
                                <span className={`text-xs font-medium ${isFullVoiceMode ? 'text-primary' : 'text-muted-foreground'}`}>Full Voice Mode</span>
                                <Switch 
                                    checked={isFullVoiceMode} 
                                    onCheckedChange={(c) => {
                                        setIsFullVoiceMode(c);
                                        if(!c) {
                                            stopSpeaking();
                                            recognitionRef.current?.stop();
                                        }
                                    }} 
                                />
                             </div>
                            <Button variant="destructive" size="sm" onClick={endInterview}>
                                <Square className="w-4 h-4 mr-2" fill="currentColor" />
                                End
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0 relative">
                    <ScrollArea className="h-full p-4" ref={scrollAreaRef}>
                        <div className="space-y-6 pb-4">
                            {messages.map((msg, idx) => (
                                <div
                                    key={idx}
                                    className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`
                                        flex gap-3 max-w-[80%] 
                                        ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}
                                    `}>
                                        <div className={`
                                            w-8 h-8 rounded-full flex items-center justify-center shrink-0
                                            ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}
                                        `}>
                                            {msg.role === 'user' ? <UserIcon className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                                        </div>
                                        <div className={`
                                            p-4 rounded-2xl 
                                            ${msg.role === 'user' 
                                                ? 'bg-primary text-primary-foreground rounded-tr-none' 
                                                : 'bg-muted/50 border rounded-tl-none'}
                                        `}>
                                            <p className="whitespace-pre-wrap leading-relaxed">{msg.parts}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {isAiThinking && (
                                <div className="flex w-full justify-start">
                                    <div className="flex gap-3 max-w-[80%]">
                                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                                            <Bot className="w-5 h-5" />
                                        </div>
                                        <div className="bg-muted/50 border rounded-2xl rounded-tl-none p-4 flex items-center gap-2">
                                            <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" />
                                            <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                                            <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce [animation-delay:0.4s]" />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                    
                    {/* Voice Overlay UI */}
                    {isFullVoiceMode && (
                        <div className="absolute top-4 right-4 flex flex-col gap-2">
                            {isSpeaking && <Badge variant="default" className="bg-green-600 animate-pulse">AI Speaking...</Badge>}
                            {isRecording && <Badge variant="destructive" className="animate-pulse">Listening...</Badge>}
                        </div>
                    )}
                </CardContent>
                <CardFooter className="p-4 border-t bg-background">
                    <div className="flex gap-2 w-full items-end">
                         <div className="relative flex-1">
                            <Textarea
                                placeholder={isFullVoiceMode ? "Listening mode active..." : "Type your answer here..."}
                                value={currentInput}
                                onChange={(e) => setCurrentInput(e.target.value)}
                                className="min-h-[60px] max-h-[120px] resize-none pr-12 transition-all focus-visible:ring-primary"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        sendMessage();
                                    }
                                }}
                            />
                            <Button 
                                size="icon" 
                                variant={isRecording ? "destructive" : "ghost"}
                                className={`absolute right-2 bottom-2 hover:bg-muted ${isRecording ? "animate-pulse" : ""}`}
                                onClick={toggleRecording}
                            >
                                <Mic className={`w-5 h-5 ${isRecording ? "animate-bounce" : ""}`} />
                            </Button>
                        </div>
                        <Button 
                            onClick={sendMessage} 
                            disabled={!currentInput.trim() || isAiThinking}
                            className="h-[60px] w-[60px] rounded-xl"
                        >
                            <Send className="w-6 h-6" />
                        </Button>
                    </div>
                </CardFooter>
            </Card>

            {/* Tips Panel */}
            <div className="hidden lg:block space-y-4">
                 <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Bot className="w-4 h-4" /> Interview Tips
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground space-y-3">
                        <p>• Speak clearly and at a moderate pace.</p>
                        <p>• Structure your answers using the STAR method.</p>
                        <p>• Be specific with your examples.</p>
                        {isFullVoiceMode && (
                            <p className="text-primary font-medium mt-4">
                                Full Voice Mode: The AI will listen automatically after it speaks. Pause for 2 seconds to finish your answer.
                            </p>
                        )}
                    </CardContent>
                 </Card>
            </div>
        </div>
      )}

      {interviewState === 'feedback' && feedbackData && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="border-primary/20 bg-gradient-to-b from-background to-muted/20">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4">
                        <Trophy className="w-10 h-10 text-primary" />
                    </div>
                    <CardTitle className="text-3xl">Interview Analysis</CardTitle>
                    <CardDescription>Performance Summary</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-8 md:grid-cols-3 pt-6">
                    <div className="space-y-2 text-center p-6 bg-background rounded-xl border shadow-sm">
                        <div className="text-sm font-medium text-muted-foreground">Overall Score</div>
                        <div className="text-5xl font-bold text-primary">{feedbackData.overallScore}<span className="text-xl text-muted-foreground">/10</span></div>
                        <Progress value={feedbackData.overallScore * 10} className="h-2 w-24 mx-auto mt-2" />
                    </div>
                    <div className="space-y-2 text-center p-6 bg-background rounded-xl border shadow-sm">
                        <div className="text-sm font-medium text-muted-foreground">Recommendation</div>
                        <Badge className={`text-lg px-4 py-1 ${
                            feedbackData.hiringRecommendation?.toLowerCase().includes('no') ? 'bg-destructive' : 
                            feedbackData.hiringRecommendation?.toLowerCase().includes('strong') ? 'bg-green-600' : 'bg-primary'
                        }`}>
                            {feedbackData.hiringRecommendation}
                        </Badge>
                    </div>
                    <div className="space-y-2 text-center p-6 bg-background rounded-xl border shadow-sm">
                        <div className="text-sm font-medium text-muted-foreground">Status</div>
                        <div className="text-2xl font-semibold">Completed</div>
                         <p className="text-xs text-muted-foreground">Review feedback below</p>
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-500" /> Key Strengths
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-3">
                            {feedbackData.strengths?.map((s: string, i: number) => (
                                <li key={i} className="flex gap-2 items-start text-sm">
                                    <span className="text-green-500 mt-1 flex-shrink-0">•</span>
                                    {s}
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-amber-500" /> Areas for Improvement
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-3">
                            {feedbackData.areasForImprovement?.map((s: string, i: number) => (
                                <li key={i} className="flex gap-2 items-start text-sm">
                                    <span className="text-amber-500 mt-1 flex-shrink-0">•</span>
                                    {s}
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            </div>

            {feedbackData.actionableSuggestions && (
                <Card className="border-blue-200 bg-blue-50/30">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-blue-700">
                             <span className="p-1.5 bg-blue-100 rounded-lg">💡</span> 
                             Expert Suggestions
                        </CardTitle>
                        <CardDescription>Actionable steps to improve your chances</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <ul className="grid gap-3 sm:grid-cols-2">
                            {feedbackData.actionableSuggestions.map((s: string, i: number) => (
                                <li key={i} className="flex gap-3 items-start bg-background p-3 rounded-lg border text-sm shadow-sm">
                                    <span className="bg-blue-100 text-blue-700 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                                        {i + 1}
                                    </span>
                                    <span>{s}</span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Detailed Feedback</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {feedbackData.detailedFeedback}
                    </p>
                </CardContent>
                <CardFooter className="flex justify-end gap-4 border-t pt-6">
                    <Button variant="outline" onClick={() => window.print()}>Print Report</Button>
                    <Button onClick={resetInterview}>Start New Interview</Button>
                </CardFooter>
            </Card>
        </div>
      )}
    </div>
  );
}
