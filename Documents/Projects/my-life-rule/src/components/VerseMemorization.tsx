import React, { useState, useRef, useEffect } from 'react';
import { Button, Icons, Input, Modal } from './Shared';
import { HelpModal } from './Help';
import { getVerseText, getVerseSpeech, getPassageVerses } from '../services/geminiService';
import { UserProfile, MeditationPlan, PlanVerse } from '../types';
import { BIBLE_TRANSLATION_IDS, getBibleUrl } from '../constants';

type ExerciseStep = 'SEARCH' | 'PREVIEW' | 'ACTIVE' | 'RESULT';
type ExerciseMode = 'TYPE' | 'FILL' | 'UNJUMBLE' | 'REVEAL' | 'SPEAK';
type RevealType = 'WORD' | 'PHRASE' | 'LETTER';
type AppView = 'HOME' | 'PLAN_SETUP' | 'PLAN_DASHBOARD' | 'HISTORY';

interface PuzzleToken {
  id: number;
  word: string;     
  display: string;  
  isHidden: boolean;
  userGuess?: string;
  options?: string[]; 
}

interface UnjumbleToken {
  id: number;
  word: string;
  normalized: string;
}

const COMMON_DISTRACTORS = [
  "God", "Lord", "Jesus", "Heart", "Soul", "Life", "Light", "Faith", "Love", "Grace",
  "Peace", "Holy", "Spirit", "Father", "Son", "World", "Heaven", "Earth", "Truth", "Word",
  "Walk", "Pray", "Believe", "Save", "Glory", "Power", "Time", "Day", "Night", "Hope"
];

const AVAILABLE_TRANSLATIONS = ['NIV'];

const SUGGESTED_VERSE_CATEGORIES: Array<{
  id: string;
  title: string;
  items: Array<{ label: string; refs: [string, string] }>;
}> = [
  {
    id: 'A',
    title: 'Living The New Life',
    items: [
      { label: 'Christ the Center', refs: ['2 Corinthians 5:17', 'Galatians 2:20'] },
      { label: 'Obedience to Christ', refs: ['Romans 12:1', 'John 14:21'] },
      { label: 'The Word', refs: ['2 Timothy 3:16', 'Joshua 1:8'] },
      { label: 'Prayer', refs: ['John 15:7', 'Philippians 4:6-7'] },
      { label: 'Fellowship', refs: ['Matthew 18:20', 'Hebrews 10:24-25'] },
      { label: 'Witnessing', refs: ['Matthew 4:19', 'Romans 1:16'] },
    ],
  },
  {
    id: 'B',
    title: 'Proclaiming Christ',
    items: [
      { label: 'All Have Sinned', refs: ['Romans 3:23', 'Isaiah 53:6'] },
      { label: "Sin’s Penalty", refs: ['Romans 6:23', 'Hebrews 9:27'] },
      { label: 'Christ Paid the Penalty', refs: ['Romans 5:8', '1 Peter 3:18'] },
      { label: 'Salvation is not by Works', refs: ['Ephesians 2:8-9', 'Titus 3:5'] },
      { label: 'Must Receive Christ', refs: ['John 1:12', 'Revelation 3:20'] },
      { label: 'Assurance of Salvation', refs: ['1 John 5:13', 'John 5:24'] },
    ],
  },
  {
    id: 'C',
    title: "Reliance On God’s Resources",
    items: [
      { label: 'His Spirit', refs: ['1 Corinthians 3:16', '1 Corinthians 2:12'] },
      { label: 'His Strength', refs: ['Isaiah 41:10', 'Philippians 4:13'] },
      { label: 'His Faithfulness', refs: ['Lamentations 3:22-23', 'Numbers 23:19'] },
      { label: 'His Peace', refs: ['Isaiah 26:3', '1 Peter 5:7'] },
      { label: 'His Provision', refs: ['Romans 8:32', 'Philippians 4:19'] },
      { label: 'His Help in Temptation', refs: ['Hebrews 2:18', 'Psalms 119:9,11'] },
    ],
  },
  {
    id: 'D',
    title: "Being Christ’s Disciple",
    items: [
      { label: 'Put Christ First', refs: ['Matthew 6:33', 'Luke 9:23'] },
      { label: 'Separate From the World', refs: ['1 John 2:15-16', 'Romans 12:2'] },
      { label: 'Be Steadfast', refs: ['1 Corinthians 15:58', 'Hebrews 12:3'] },
      { label: 'Serve Others', refs: ['Mark 10:45', '2 Corinthians 4:5'] },
      { label: 'Give Generously', refs: ['Proverbs 3:9-10', '2 Corinthians 9:6-7'] },
      { label: 'Develop World Vision', refs: ['Acts 1:8', 'Matthew 28:19-20'] },
    ],
  },
  {
    id: 'E',
    title: 'Growth In Christlikeness',
    items: [
      { label: 'Love', refs: ['John 13:34-35', '1 John 3:18'] },
      { label: 'Humility', refs: ['Philippians 2:3-4', '1 Peter 5:5-6'] },
      { label: 'Purity', refs: ['Ephesians 5:3', '1 Peter 2:11'] },
      { label: 'Honesty', refs: ['Leviticus 19:11', 'Acts 24:16'] },
      { label: 'Faith', refs: ['Hebrews 11:6', 'Romans 4:20-21'] },
      { label: 'Good Works', refs: ['Galatians 6:9-10', 'Matthew 5:16'] },
    ],
  },
];

// --- Audio Helpers ---
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

interface VerseMemorizationProps {
  user: UserProfile;
  onUpdateUser: (user: UserProfile) => void;
  onSaveJournalEntry?: (entry: any) => void;
  onNavigateToJournal?: () => void;
}

export const VerseMemorization: React.FC<VerseMemorizationProps> = ({ user, onUpdateUser, onSaveJournalEntry, onNavigateToJournal }) => {
  // Main View State
  const [appView, setAppView] = useState<AppView>(user.meditationPlan ? 'PLAN_DASHBOARD' : 'HOME');
  
  // Quick/Exercise State
  const [step, setStep] = useState<ExerciseStep>('SEARCH');
  const [mode, setMode] = useState<ExerciseMode>('TYPE');
  const [reference, setReference] = useState('');
  const [translation, setTranslation] = useState('NIV');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [verseText, setVerseText] = useState('');
  const [userInput, setUserInput] = useState('');
  const [useCustomText, setUseCustomText] = useState(false);
  const [customText, setCustomText] = useState('');

  // When true, the current exercise is complete and user can review before scoring.
  const [isReadyToScore, setIsReadyToScore] = useState(false);

  // Track the currently-started exercise so we can return to mode selection without losing progress.
  const [resumeExerciseKey, setResumeExerciseKey] = useState<string | null>(null);
  const [resumeMode, setResumeMode] = useState<ExerciseMode | null>(null);
  const [resumeRevealType, setResumeRevealType] = useState<RevealType | null>(null);

  // Type exercise options
  const [typeIncludePunctuation, setTypeIncludePunctuation] = useState(true);
  
  // Plan Setup State
  const [planRef, setPlanRef] = useState('');
  const [planDate, setPlanDate] = useState('');
  const [planUseCustomText, setPlanUseCustomText] = useState(false);
  const [planCustomText, setPlanCustomText] = useState('');
  
  // Exercise Specific State
  const [puzzleTokens, setPuzzleTokens] = useState<PuzzleToken[]>([]);
  const [currentBlankIndex, setCurrentBlankIndex] = useState<number>(-1);
  const [revealType, setRevealType] = useState<RevealType>('WORD');
  const [revealChunks, setRevealChunks] = useState<string[]>([]);
  const [revealIndex, setRevealIndex] = useState(-1);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [currentAudioText, setCurrentAudioText] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [useWebSpeech, setUseWebSpeech] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  // Tracking State
  const [mistakes, setMistakes] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [isError, setIsError] = useState(false);
  const [mistakeIndices, setMistakeIndices] = useState<Set<number>>(new Set());
  const [hintIndices, setHintIndices] = useState<Set<number>>(new Set());
  const [wrongTokenIds, setWrongTokenIds] = useState<Set<number>>(new Set());
  const [score, setScore] = useState(0);
  
  // Speech Recognition State
  const [isListening, setIsListening] = useState(false);
  const [spokenWords, setSpokenWords] = useState<string[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [verseWords, setVerseWords] = useState<string[]>([]);
  const [revealedWordIndices, setRevealedWordIndices] = useState<Set<number>>(new Set());
  const [flashingWordIndex, setFlashingWordIndex] = useState<number | null>(null);
  const [currentTranscript, setCurrentTranscript] = useState<string>('');
  const recognitionRef = useRef<any>(null);

  // Unjumble words exercise state
  const [unjumbleExpected, setUnjumbleExpected] = useState<UnjumbleToken[]>([]);
  const [unjumbleBank, setUnjumbleBank] = useState<UnjumbleToken[]>([]);
  const [unjumbleSelectedIds, setUnjumbleSelectedIds] = useState<number[]>([]);
  const [unjumbleWrongId, setUnjumbleWrongId] = useState<number | null>(null);
  
  // Help Modal State
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  
  // Current Plan Verse ID being practiced (if any)
  const [activePlanVerseId, setActivePlanVerseId] = useState<string | null>(null);
  
  // Completion Modal State
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completedPlanDetails, setCompletedPlanDetails] = useState<string>('');
  const [hasShownCompletionModal, setHasShownCompletionModal] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const resetExerciseProgressForNewVerse = () => {
    // Stop audio/recognition and reset any per-verse progress state.
    stopAudio();

    // Stop speech recognition if running
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // no-op
      }
    }
    recognitionRef.current = null;
    setIsListening(false);
    setCurrentTranscript('');

    // Common progress
    setUserInput('');
    setIsReadyToScore(false);
    setResumeExerciseKey(null);
    setResumeMode(null);
    setResumeRevealType(null);
    setMistakes(0);
    setHintsUsed(0);
    setIsError(false);
    setMistakeIndices(new Set());
    setHintIndices(new Set());
    setWrongTokenIds(new Set());
    setScore(0);

    // Fill mode
    setPuzzleTokens([]);
    setCurrentBlankIndex(-1);

    // Unjumble mode
    setUnjumbleExpected([]);
    setUnjumbleBank([]);
    setUnjumbleSelectedIds([]);
    setUnjumbleWrongId(null);

    // Reveal mode
    setRevealChunks([]);
    setRevealIndex(-1);

    // Speak mode
    setSpokenWords([]);
    setVerseWords([]);
    setCurrentWordIndex(0);
    setRevealedWordIndices(new Set());
    setFlashingWordIndex(null);

    // Listen/audio state
    setAudioBuffer(null);
    setCurrentAudioText(null);
    setIsPlaying(false);
    setIsPaused(false);
    setIsAudioLoading(false);
  };

  // Sync view with user prop changes
  useEffect(() => {
    if (user.meditationPlan && appView === 'HOME') {
      // Logic removed to allow users to stay on HOME view even if plan exists
    }
  }, [user.meditationPlan]);

  // Check if plan is complete when viewing dashboard
  useEffect(() => {
    if (appView === 'PLAN_DASHBOARD' && user.meditationPlan && !hasShownCompletionModal && onSaveJournalEntry) {
      const allMemorized = user.meditationPlan.verses.every(v => v.isMemorized);
      if (allMemorized) {
        const details = `${user.meditationPlan.reference} (${user.meditationPlan.translation}) · ${user.meditationPlan.verses.length} verse${user.meditationPlan.verses.length !== 1 ? 's' : ''} · ${Math.ceil((Date.now() - user.meditationPlan.startDate) / (1000 * 60 * 60 * 24))} days`;
        setCompletedPlanDetails(details);
        setShowCompletionModal(true);
        setHasShownCompletionModal(true);
      }
    }
  }, [appView, user.meditationPlan, hasShownCompletionModal, onSaveJournalEntry]);

  // Debug: Log when completion modal state changes
  useEffect(() => {
    console.log('showCompletionModal state changed to:', showCompletionModal);
  }, [showCompletionModal]);

  // Load voices for Web Speech API (important for mobile)
  useEffect(() => {
    if ('speechSynthesis' in window) {
      // Load voices
      const loadVoices = () => {
        const voices = speechSynthesis.getVoices();
        console.log('Available voices loaded:', voices.length);
      };
      
      // Load voices immediately if available
      loadVoices();
      
      // Also listen for voiceschanged event (needed on some mobile browsers)
      speechSynthesis.addEventListener('voiceschanged', loadVoices);
      
      return () => {
        speechSynthesis.removeEventListener('voiceschanged', loadVoices);
      };
    }
  }, []);

  // Cleanup Audio
  useEffect(() => {
    return () => {
      if (sourceNodeRef.current) sourceNodeRef.current.stop();
      if (audioContextRef.current) audioContextRef.current.close();
      if (utteranceRef.current) {
        speechSynthesis.cancel();
      }
    };
  }, []);

  // --- Plan Logic ---

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planRef.trim() || !planDate) return;

    setIsLoading(true);
    setError('');
    setHasShownCompletionModal(false);

    try {
      let verses;
      
      // If using custom text, split into verses manually
      if (planUseCustomText) {
        if (!planCustomText.trim()) {
          setError('Please enter your passage text');
          setIsLoading(false);
          return;
        }
        // Split by sentences (periods, exclamation marks, question marks followed by space or end)
        const sentences = planCustomText
          .trim()
          .split(/([.!?]+)(?:\s+|$)/)
          .reduce((acc: string[], part, idx, arr) => {
            // Combine text with its punctuation
            if (idx % 2 === 0 && part.trim()) {
              const punctuation = arr[idx + 1] || '';
              acc.push((part + punctuation).trim());
            }
            return acc;
          }, [])
          .filter(s => s.length > 0);
        
        verses = sentences.map((sentence, idx) => ({
          reference: `${planRef} (Part ${idx + 1})`,
          text: sentence
        }));
      } else {
        // Fetch from API
        verses = await getPassageVerses(planRef, translation);
        if (!verses || verses.length === 0) {
          setError(`Unable to find "${planRef}" in the ${translation} translation. Please try a different translation or check the reference.`);
          setIsLoading(false);
          return;
        }
      }

      const newPlan: MeditationPlan = {
        id: Math.random().toString(36).substr(2, 9),
        reference: planRef,
        translation: planUseCustomText ? 'Custom' : translation,
        targetDate: new Date(planDate).getTime(),
        startDate: Date.now(),
        verses: verses.map(v => ({
          id: Math.random().toString(36).substr(2, 9),
          reference: v.reference,
          text: v.text,
          isMemorized: false
        }))
      };

      onUpdateUser({ ...user, meditationPlan: newPlan });
      setAppView('PLAN_DASHBOARD');
      setPlanRef('');
      setPlanDate('');
      setPlanCustomText('');
      setPlanUseCustomText(false);

    } catch (e) {
      setError(`Unable to load the passage in the ${translation} translation. Please try a different translation or check the reference.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPlan = () => {
    stopAudio();
    setHasShownCompletionModal(false);
    setShowCompletionModal(false);
    setCompletedPlanDetails('');
    
    // Save current plan to history if it exists
    if (user.meditationPlan) {
      const { cachedAudioBase64, ...planWithoutAudio } = user.meditationPlan;
      const completedPlan = {
        ...planWithoutAudio,
        completedDate: Date.now()
      };
      const history = user.meditationHistory || [];
      onUpdateUser({ 
        ...user, 
        meditationPlan: null,
        meditationHistory: [completedPlan, ...history].slice(0, 20) // Keep last 20
      });
    } else {
      onUpdateUser({ ...user, meditationPlan: null });
    }
    
    // Clear all audio state and cached audio when resetting plan
    setAudioBuffer(null);
    setCurrentAudioText(null);
    setIsPlaying(false);
    setIsPaused(false);
    setIsAudioLoading(false);
    
    // Stop any playing audio and clean up audio context
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      } catch (e) {}
      sourceNodeRef.current = null;
    }
    
    setAppView('HOME');
    setStep('SEARCH');
  };

  const handlePracticePlanVerse = (planVerse: PlanVerse) => {
    // From the dashboard, we intentionally start at PREVIEW.
    resetExerciseProgressForNewVerse();

    // Load verse into exercise state
    setActivePlanVerseId(planVerse.id);
    setUseCustomText(false);
    setCustomText('');
    setReference(planVerse.reference);
    setVerseText(planVerse.text);
    // Go to preview mode directly
    setStep('PREVIEW');
    // Hide dashboard, show exercise area
    setAppView('HOME'); 
  };

  const loadPlanVerseIntoCurrentExercise = (planVerse: PlanVerse) => {
    // Called while already in an exercise: keep the selected mode and reset progress.
    resetExerciseProgressForNewVerse();

    setActivePlanVerseId(planVerse.id);
    setUseCustomText(false);
    setCustomText('');
    setReference(planVerse.reference);
    setVerseText(planVerse.text);

    // If user is on PREVIEW (or viewing RESULTS), keep them at PREVIEW.
    // This lets users navigate between plan verses without forcing them into a mode.
    if (step === 'PREVIEW' || step === 'RESULT') {
      setStep('PREVIEW');
      return;
    }

    // Otherwise keep them in the current exercise mode.
    const nextText = planVerse.text;
    switch (mode) {
      case 'TYPE': {
        setMode('TYPE');
        setStep('ACTIVE');
        setTimeout(() => inputRef.current?.focus(), 100);
        break;
      }
      case 'FILL': {
        setMode('FILL');
        initializeFillGame(nextText);
        setStep('ACTIVE');
        break;
      }
      case 'UNJUMBLE': {
        setMode('UNJUMBLE');
        initializeUnjumbleGame(nextText);
        setStep('ACTIVE');
        break;
      }
      case 'REVEAL': {
        setMode('REVEAL');
        let chunks: string[] = [];
        if (revealType === 'PHRASE') {
          const matches = nextText.match(/[^,.;:?!]+[,.;:?!]*\s*/g);
          chunks = matches ? Array.from(matches) : [nextText];
        } else {
          chunks = nextText.split(' ');
        }
        setRevealChunks(chunks);
        setRevealIndex(-1);
        setStep('ACTIVE');
        break;
      }
      case 'SPEAK': {
        setMode('SPEAK');

        // Prepare verse words (remove punctuation for comparison)
        const words = nextText.split(' ').map(w => w.replace(/[^\w\s]/g, '').toLowerCase());
        setVerseWords(words);
        setStep('ACTIVE');

        // Initialize speech recognition
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
          const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'en-US';

          recognition.onresult = (event: any) => {
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
              transcript += event.results[i][0].transcript;
            }
            transcript = transcript.trim().toLowerCase();
            setCurrentTranscript(transcript);

            const last = event.results.length - 1;
            const isFinal = event.results[last].isFinal;
            if (!isFinal) return;

            const spokenWordsArray = transcript.split(' ').map((w: string) => w.replace(/[^\w\s]/g, ''));

            spokenWordsArray.forEach((spokenWord: string) => {
              setCurrentWordIndex(prevIndex => {
                if (prevIndex >= words.length) return prevIndex;
                const expectedWord = words[prevIndex];
                if (spokenWord === expectedWord) {
                  setSpokenWords(prev => [...prev, spokenWord]);
                  return prevIndex + 1;
                }

                setFlashingWordIndex(prevIndex);
                setTimeout(() => setFlashingWordIndex(null), 500);
                setMistakes(prev => prev + 1);
                setMistakeIndices(prev => {
                  const next = new Set(prev);
                  next.add(prevIndex);
                  return next;
                });
                return prevIndex;
              });
            });
          };

          recognition.onerror = () => {
            setIsListening(false);
          };

          recognition.onend = () => {
            setIsListening(false);
          };

          recognitionRef.current = recognition;
        }

        break;
      }
      default: {
        // Fallback: keep them at preview.
        setStep('PREVIEW');
      }
    }
  };

  const goToNextPlanVerse = () => {
    if (!user.meditationPlan || !activePlanVerseId) return;
    const currentIndex = user.meditationPlan.verses.findIndex(v => v.id === activePlanVerseId);
    if (currentIndex < user.meditationPlan.verses.length - 1) {
      loadPlanVerseIntoCurrentExercise(user.meditationPlan.verses[currentIndex + 1]);
    }
  };

  const goToPreviousPlanVerse = () => {
    if (!user.meditationPlan || !activePlanVerseId) return;
    const currentIndex = user.meditationPlan.verses.findIndex(v => v.id === activePlanVerseId);
    if (currentIndex > 0) {
      loadPlanVerseIntoCurrentExercise(user.meditationPlan.verses[currentIndex - 1]);
    }
  };

  const markPlanVerseMemorized = (verseId: string) => {
    if (!user.meditationPlan) return;
    const updatedVerses = user.meditationPlan.verses.map(v => 
      v.id === verseId ? { ...v, isMemorized: !v.isMemorized } : v
    );
    
    console.log('[VerseMemorization] Marking verse as memorized:', {
      verseId,
      updatedVerses: updatedVerses.map(v => ({ id: v.id, ref: v.reference, isMemorized: v.isMemorized }))
    });
    
    // Check if all verses are now memorized
    const allMemorized = updatedVerses.every(v => v.isMemorized);
    
    onUpdateUser({
      ...user,
      meditationPlan: {
        ...user.meditationPlan,
        verses: updatedVerses
      }
    });
    
    // If plan is complete, show modal asking to record
    if (allMemorized && onSaveJournalEntry) {
      const details = `${user.meditationPlan.reference} (${user.meditationPlan.translation}) · ${updatedVerses.length} verse${updatedVerses.length !== 1 ? 's' : ''} · ${Math.ceil((Date.now() - user.meditationPlan.startDate) / (1000 * 60 * 60 * 24))} days`;
      setCompletedPlanDetails(details);
      setShowCompletionModal(true);
    }
  };
  
  const handleRecordToJournal = () => {
    if (!onSaveJournalEntry || !user.meditationPlan) return;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const entry = {
      id: Math.random().toString(36).substr(2, 9),
      date: today.getTime(),
      gratitude: '',
      review: '',
      repentance: '',
      hope: '',
      aiPrayer: '',
      memorizationCompletion: completedPlanDetails
    };
    onSaveJournalEntry(entry);
    setShowCompletionModal(false);
    
    // Navigate to journal after saving
    if (onNavigateToJournal) {
      onNavigateToJournal();
    }
  };

  const handleMarkPlanComplete = () => {
    console.log('handleMarkPlanComplete called');
    if (!user.meditationPlan) {
      console.log('No meditation plan found');
      return;
    }
    console.log('Creating completion modal');
    const details = `${user.meditationPlan.reference} (${user.meditationPlan.translation}) · ${user.meditationPlan.verses.length} verse${user.meditationPlan.verses.length !== 1 ? 's' : ''} · ${Math.ceil((Date.now() - user.meditationPlan.startDate) / (1000 * 60 * 60 * 24))} days`;
    setCompletedPlanDetails(details);
    setShowCompletionModal(true);
    setHasShownCompletionModal(true);
    console.log('Modal should be showing now');
  };

  const backToDashboard = () => {
    stopAudio();
    setStep('SEARCH'); // Reset exercise
    setActivePlanVerseId(null);
    setResumeExerciseKey(null);
    setResumeMode(null);
    setResumeRevealType(null);
    setAppView('PLAN_DASHBOARD');
  };

  const exitPlanDashboardToHome = () => {
    stopAudio();
    setActivePlanVerseId(null);
    setError('');
    setIsLoading(false);
    setStep('SEARCH');
    setAppView('HOME');
  };

  const practiceMemorizedVerse = (referenceToPractice: string, textToPractice: string) => {
    stopAudio();
    setActivePlanVerseId(null);
    setError('');
    setIsLoading(false);
    setUseCustomText(false);
    setCustomText('');
    setReference(referenceToPractice);
    setVerseText(textToPractice);
    setStep('PREVIEW');
    setAppView('HOME');
  };

  const goToModeSelection = () => {
    // Stop any ongoing audio / mic, but keep exercise state intact.
    if (isPlaying || isPaused) stopAudio();
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // no-op
      }
      setIsListening(false);
    }
    setIsError(false);
    setStep('PREVIEW');
  };

  const resumeOrStart = (targetMode: ExerciseMode, start: () => void, targetRevealType?: RevealType) => {
    const key = `${reference}::${verseText}`;
    const canResume =
      resumeExerciseKey === key &&
      resumeMode === targetMode &&
      (targetMode !== 'REVEAL' || resumeRevealType === targetRevealType);

    if (canResume) {
      if (targetMode === 'LISTEN' && currentAudioText !== verseText) {
        fetchAudio(verseText);
      }
      setStep('ACTIVE');
      if (targetMode === 'TYPE') setTimeout(() => inputRef.current?.focus(), 100);
      return;
    }

    start();
  };

  // --- Ad-Hoc Fetch ---
  const fetchVerseForQuickPractice = async (ref: string) => {
    const trimmedRef = ref.trim();
    if (!trimmedRef) return;

    setIsLoading(true);
    setError('');

    try {
      const text = await getVerseText(trimmedRef, translation);
      if (text) {
        setReference(trimmedRef);
        setUseCustomText(false);
        setCustomText('');
        setVerseText(text);
        setStep('PREVIEW');
      } else {
        setError(`Unable to find "${trimmedRef}" in the ${translation} translation. Please try a different translation or check the reference.`);
      }
    } catch (err) {
      setError(`Unable to load the verse in the ${translation} translation. Please try a different translation or check the reference.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetchVerse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reference.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      // If using custom text, use that directly
      if (useCustomText) {
        if (!customText.trim()) {
          setError('Please enter your verse text');
          setIsLoading(false);
          return;
        }
        setVerseText(customText.trim());
        setStep('PREVIEW');
        setIsLoading(false);
        return;
      }

      await fetchVerseForQuickPractice(reference);
    } finally {
      // fetchVerseForQuickPractice handles loading state; keep this as a guard for custom-text path
      if (!useCustomText) {
        // no-op
      }
    }
  };

  const startSuggestedPlan = (ref: string) => {
    setPlanUseCustomText(false);
    setPlanCustomText('');
    setPlanRef(ref);
    setAppView('PLAN_SETUP');
  };

  // --- Reset/Retry Helpers ---
  const resetExercise = () => {
    stopAudio();
    if (activePlanVerseId) {
      backToDashboard();
    } else {
      setReference('');
      setVerseText('');
      setUserInput('');
      setScore(0);
      setStep('SEARCH');
      setAudioBuffer(null);
      setResumeExerciseKey(null);
      setResumeMode(null);
      setResumeRevealType(null);
    }
  };

  const retry = () => {
    setUserInput('');
    setIsReadyToScore(false);
    setMistakes(0);
    setHintsUsed(0);
    setMistakeIndices(new Set());
    setHintIndices(new Set());
    setWrongTokenIds(new Set());
    setRevealIndex(-1);
    
    // Reset speak mode states
    if (mode === 'SPEAK') {
      setSpokenWords([]);
      setCurrentWordIndex(0);
      setRevealedWordIndices(new Set());
      setFlashingWordIndex(null);
      setIsListening(false);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    }
    
    if (mode === 'FILL') initializeFillGame(verseText);
    if (mode === 'UNJUMBLE') initializeUnjumbleGame(verseText);
    setStep('ACTIVE');
  };

  // --- Scoring ---
  const calculateScore = (finalMistakes: number, finalHints: number) => {
    const penalty = (finalMistakes * 2) + (finalHints * 10);
    const finalScore = Math.max(0, 100 - penalty);
    setScore(finalScore);
    setIsReadyToScore(false);
    setStep('RESULT');
  };

  // --- Modes Setup ---
  const startTypeMode = () => {
    setResumeExerciseKey(`${reference}::${verseText}`);
    setResumeMode('TYPE');
    setResumeRevealType(null);
    setMode('TYPE');
    setUserInput('');
    setIsReadyToScore(false);
    setMistakes(0);
    setHintsUsed(0);
    setMistakeIndices(new Set());
    setHintIndices(new Set());
    setIsError(false);
    setStep('ACTIVE');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const startFillMode = () => {
    setResumeExerciseKey(`${reference}::${verseText}`);
    setResumeMode('FILL');
    setResumeRevealType(null);
    setMode('FILL');
    setIsReadyToScore(false);
    setMistakes(0);
    setHintsUsed(0);
    setMistakeIndices(new Set());
    setHintIndices(new Set());
    initializeFillGame(verseText);
    setStep('ACTIVE');
  };

  const startUnjumbleMode = () => {
    setResumeExerciseKey(`${reference}::${verseText}`);
    setResumeMode('UNJUMBLE');
    setResumeRevealType(null);
    setMode('UNJUMBLE');
    setIsReadyToScore(false);
    setMistakes(0);
    setHintsUsed(0);
    setMistakeIndices(new Set());
    setHintIndices(new Set());
    initializeUnjumbleGame(verseText);
    setStep('ACTIVE');
  };

  const startRevealMode = (type: RevealType) => {
    setResumeExerciseKey(`${reference}::${verseText}`);
    setResumeMode('REVEAL');
    setResumeRevealType(type);
    setMode('REVEAL');
    setRevealType(type);
    setIsReadyToScore(false);
    setMistakes(0);
    setHintsUsed(0);
    setRevealIndex(-1);
    
    let chunks: string[] = [];
    if (type === 'PHRASE') {
      const matches = verseText.match(/[^,.;:?!]+[,.;:?!]*\s*/g);
      chunks = matches ? Array.from(matches) : [verseText];
    } else {
      chunks = verseText.split(' ');
    }
    setRevealChunks(chunks);
    setStep('ACTIVE');
  };

  const startSpeakMode = () => {
    setResumeExerciseKey(`${reference}::${verseText}`);
    setResumeMode('SPEAK');
    setResumeRevealType(null);
    setMode('SPEAK');
    setIsReadyToScore(false);
    setMistakes(0);
    setHintsUsed(0);
    setMistakeIndices(new Set());
    setHintIndices(new Set());
    setSpokenWords([]);
    setCurrentWordIndex(0);
    setRevealedWordIndices(new Set());
    setFlashingWordIndex(null);
    setCurrentTranscript('');
    
    // Prepare verse words (remove punctuation for comparison)
    const words = verseText.split(' ').map(w => w.replace(/[^\w\s]/g, '').toLowerCase());
    setVerseWords(words);
    
    setStep('ACTIVE');
    
    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      recognition.onresult = (event: any) => {
        // Get the latest result (could be interim or final)
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        transcript = transcript.trim().toLowerCase();
        
        // Update current transcript display immediately (even for interim results)
        setCurrentTranscript(transcript);
        
        // Only process word matching on FINAL results to avoid counting mistakes multiple times
        const last = event.results.length - 1;
        const isFinal = event.results[last].isFinal;
        
        if (!isFinal) return; // Skip interim results for word processing
        
        // Split transcript into words
        const spokenWordsArray = transcript.split(' ').map((w: string) => w.replace(/[^\w\s]/g, ''));
        
        spokenWordsArray.forEach((spokenWord: string, arrayIdx: number) => {
          setCurrentWordIndex(prevIndex => {
            if (prevIndex >= words.length) return prevIndex;
            
            const expectedWord = words[prevIndex];
            
            if (spokenWord === expectedWord) {
              // Correct word
              setSpokenWords(prev => [...prev, spokenWord]);
              return prevIndex + 1;
            } else {
              // Incorrect word - flash red
              setFlashingWordIndex(prevIndex);
              setTimeout(() => setFlashingWordIndex(null), 500);
              
              setMistakes(prev => prev + 1);
              setMistakeIndices(prev => {
                const next = new Set(prev);
                next.add(prevIndex);
                return next;
              });
              return prevIndex;
            }
          });
        });
      };
      
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        
        // Provide user-friendly error messages
        let errorMessage = '';
        switch(event.error) {
          case 'aborted':
            errorMessage = 'Microphone access was denied. Please allow microphone access in your browser settings to use voice recognition.';
            break;
          case 'not-allowed':
            errorMessage = 'Microphone permission denied. Please enable microphone access in your browser settings.';
            break;
          case 'no-speech':
            errorMessage = 'No speech detected. Please try speaking again.';
            break;
          case 'network':
            errorMessage = 'Network error. Please check your internet connection.';
            break;
          case 'audio-capture':
            errorMessage = 'No microphone found or microphone not working.';
            break;
          default:
            errorMessage = `Speech recognition error: ${event.error}. Please try again.`;
        }
        setError(errorMessage);
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognitionRef.current = recognition;
    } else {
      setError('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
    }
  };

  const startRecognition = () => {
    if (recognitionRef.current && !isListening) {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const normalizeTypeText = (text: string, includePunctuation: boolean) => {
    let normalized = (text || '').normalize('NFKC');

    // Normalize common “smart” apostrophes to straight apostrophe
    normalized = normalized.replace(/[\u2018\u2019\u02BC]/g, "'");

    // Accept forms like "' s" / "’ s" (often from mobile keyboards)
    normalized = normalized.replace(/'\s+(?=s\b)/gi, "'");

    // Collapse whitespace (keep trailing single space if present)
    normalized = normalized.replace(/\s+/g, ' ');

    if (!includePunctuation) {
      // Strip punctuation (including apostrophes) while keeping letters/numbers/whitespace
      normalized = normalized.replace(/[^\p{L}\p{N}\s]/gu, '');
      normalized = normalized.replace(/\s+/g, ' ');
    }

    return normalized;
  };

  const getTypeNormalizedTarget = () => normalizeTypeText(verseText, typeIncludePunctuation);
  const getTypeNormalizedInput = (raw: string) => normalizeTypeText(raw, typeIncludePunctuation);

  const stopRecognition = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      
      // When done speaking, allow review before scoring.
      if (currentWordIndex >= verseWords.length) setIsReadyToScore(true);
    }
  };

  // If Speak It reaches completion while still listening, stop automatically and allow review.
  useEffect(() => {
    if (mode !== 'SPEAK' || step !== 'ACTIVE') return;
    if (verseWords.length === 0) return;
    if (currentWordIndex < verseWords.length) return;

    setIsReadyToScore(true);

    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // no-op
      }
      setIsListening(false);
    }
  }, [mode, step, currentWordIndex, verseWords.length, isListening]);

  const handleSpeakHint = () => {
    // Reveal the next word that hasn't been spoken yet
    if (currentWordIndex < verseWords.length) {
      setRevealedWordIndices(prev => {
        const next = new Set(prev);
        next.add(currentWordIndex);
        return next;
      });
      setHintsUsed(prev => prev + 1);
      setHintIndices(prev => {
        const next = new Set(prev);
        next.add(currentWordIndex);
        return next;
      });
    }
  };

  // Cleanup recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // --- Exercise Implementations ---
  const handleTypeInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (isReadyToScore) return;
    if (val.length < userInput.length) {
      setUserInput(val);
      setIsError(false);
      return;
    }

    const inputNorm = getTypeNormalizedInput(val);
    const targetNorm = getTypeNormalizedTarget();
    const targetPrefix = targetNorm.slice(0, inputNorm.length);
    const isMatch = inputNorm.toLowerCase() === targetPrefix.toLowerCase();

    if (isMatch) {
      setUserInput(val);
      setIsError(false);

      if (inputNorm.length === targetNorm.length) {
        setIsReadyToScore(true);
      }
    } else {
      setIsError(true);
      setMistakes(prev => prev + 1);

      // Only track precise indices for strict typing (with punctuation), otherwise indices don't map reliably.
      if (typeIncludePunctuation) {
        setMistakeIndices(prev => {
          const next = new Set(prev);
          next.add(userInput.length);
          return next;
        });
      }
      setTimeout(() => setIsError(false), 500);
    }
  };

  const handleTypeHint = () => {
    if (isReadyToScore) return;
    if (typeIncludePunctuation) {
      const remaining = verseText.slice(userInput.length);
      if (!remaining) return;
      const match = remaining.match(/^(\S+\s*)/);
      if (match) {
        const nextChunk = match[0];
        const startIndex = userInput.length;
        setUserInput(userInput + nextChunk);
        setHintsUsed(prev => prev + 1);
        setHintIndices(prev => {
          const next = new Set(prev);
          for (let i = 0; i < nextChunk.length; i++) next.add(startIndex + i);
          return next;
        });
        inputRef.current?.focus();
        if ((userInput + nextChunk).length === verseText.length) setIsReadyToScore(true);
      }
      return;
    }

    // Punctuation excluded: hint is based on normalized target text
    const inputNorm = normalizeTypeText(userInput, false);
    const targetNorm = normalizeTypeText(verseText, false);
    const remainingNorm = targetNorm.slice(inputNorm.length);
    if (!remainingNorm) return;
    const match = remainingNorm.match(/^(\S+\s*)/);
    if (!match) return;

    const nextChunk = match[0];
    setUserInput(userInput + nextChunk);
    setHintsUsed(prev => prev + 1);
    inputRef.current?.focus();

    const newNormLen = normalizeTypeText(userInput + nextChunk, false).length;
    if (newNormLen === targetNorm.length) setIsReadyToScore(true);
  };

  const initializeFillGame = (text: string) => {
    const rawWords = text.split(' ');
    const tokens: PuzzleToken[] = rawWords.map((raw, idx) => {
      const clean = raw.replace(/[^\w\s]|_/g, "");
      const shouldHide = clean.length > 2 && Math.random() > 0.6;
      return { id: idx, word: clean, display: raw, isHidden: shouldHide };
    });
    const allWords = tokens.map(t => t.word).filter(w => w.length > 2);
    tokens.forEach(token => {
      if (token.isHidden) {
        const options = new Set<string>();
        options.add(token.word);
        while(options.size < 3) {
          const source = Math.random() > 0.5 ? allWords : COMMON_DISTRACTORS;
          const randomWord = source[Math.floor(Math.random() * source.length)];
          const formatted = token.word[0] === token.word[0].toUpperCase() 
            ? randomWord.charAt(0).toUpperCase() + randomWord.slice(1).toLowerCase()
            : randomWord.toLowerCase();
          if (formatted.toLowerCase() !== token.word.toLowerCase()) options.add(formatted);
        }
        token.options = Array.from(options).sort(() => Math.random() - 0.5);
      }
    });
    setPuzzleTokens(tokens);
    const firstBlank = tokens.findIndex(t => t.isHidden);
    setCurrentBlankIndex(firstBlank !== -1 ? firstBlank : (tokens.length > 0 ? tokens.length - 1 : -1));
  };

  const normalizeUnjumbleWord = (word: string) => {
    return (word || '')
      .normalize('NFKC')
      .replace(/[\u2018\u2019\u02BC]/g, "'")
      .replace(/[^\p{L}\p{N}'’]+/gu, '')
      .toLowerCase();
  };

  const extractUnjumbleWords = (text: string): string[] => {
    const matches = (text || '').match(/[\p{L}\p{N}]+(?:[’'][\p{L}\p{N}]+)*/gu);
    return matches ? Array.from(matches) : [];
  };

  const shuffleTokens = <T,>(arr: T[]): T[] => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const initializeUnjumbleGame = (text: string) => {
    const words = extractUnjumbleWords(text);
    const expected: UnjumbleToken[] = words.map((w, idx) => ({
      id: idx,
      word: w,
      normalized: normalizeUnjumbleWord(w),
    }));

    // Shuffle until it is not identical to the original order (best-effort).
    let bank = shuffleTokens(expected);
    if (bank.length > 1) {
      let attempts = 0;
      while (attempts < 6 && bank.every((t, idx) => t.id === expected[idx]?.id)) {
        bank = shuffleTokens(expected);
        attempts += 1;
      }
    }

    setUnjumbleExpected(expected);
    setUnjumbleBank(bank);
    setUnjumbleSelectedIds([]);
    setUnjumbleWrongId(null);
    setUserInput('');
    setIsError(false);
  };

  const handleUnjumbleWordTap = (token: UnjumbleToken) => {
    // Ignore taps after completion
    if (unjumbleSelectedIds.length >= unjumbleExpected.length) return;

    // Ignore already-used tokens
    if (unjumbleSelectedIds.includes(token.id)) return;

    const expectedToken = unjumbleExpected[unjumbleSelectedIds.length];
    const isCorrect = expectedToken && token.normalized === expectedToken.normalized;

    if (isCorrect) {
      const nextSelected = [...unjumbleSelectedIds, token.id];
      setUnjumbleSelectedIds(nextSelected);
      setUnjumbleWrongId(null);
      setIsError(false);

      const nextText = nextSelected
        .map((id) => unjumbleExpected.find((t) => t.id === id)?.word)
        .filter(Boolean)
        .join(' ');
      setUserInput(nextText);

      // When complete, let user review before scoring.
      return;
    }

    setIsError(true);
    setUnjumbleWrongId(token.id);
    setMistakes((prev) => prev + 1);
    setTimeout(() => {
      setIsError(false);
      setUnjumbleWrongId(null);
    }, 500);
  };

  const undoUnjumble = () => {
    setUnjumbleSelectedIds((prev) => {
      if (prev.length === 0) return prev;
      const next = prev.slice(0, -1);
      const nextText = next
        .map((id) => unjumbleExpected.find((t) => t.id === id)?.word)
        .filter(Boolean)
        .join(' ');
      setUserInput(nextText);
      return next;
    });
  };

  const resetUnjumble = () => {
    initializeUnjumbleGame(verseText);
  };

  const handleOptionSelect = (selectedWord: string) => {
    if (isReadyToScore) return;
    if (currentBlankIndex === -1) return;
    const currentToken = puzzleTokens[currentBlankIndex];
    if (selectedWord.toLowerCase() === currentToken.word.toLowerCase()) {
      const newTokens = [...puzzleTokens];
      newTokens[currentBlankIndex].userGuess = selectedWord;
      newTokens[currentBlankIndex].isHidden = false;
      setPuzzleTokens(newTokens);
      setIsError(false);
      const nextBlank = newTokens.findIndex((t, idx) => idx > currentBlankIndex && t.isHidden);
      if (nextBlank !== -1) setCurrentBlankIndex(nextBlank);
      else {
        setUserInput(newTokens.map(t => t.display).join(' '));
        setCurrentBlankIndex(-1);
        setIsReadyToScore(true);
      }
    } else {
      setIsError(true);
      setMistakes(prev => prev + 1);
      setWrongTokenIds(prev => {
        const next = new Set(prev);
        next.add(currentBlankIndex);
        return next;
      });
      setTimeout(() => setIsError(false), 500);
    }
  };

  const handleRevealNext = () => {
    if (isReadyToScore) return;
    if (revealIndex < revealChunks.length - 1) setRevealIndex(prev => prev + 1);
    else {
      setUserInput(verseText);
      setIsReadyToScore(true);
    }
  };

  const handleRevealPrev = () => {
    if (revealIndex >= 0) {
      setRevealIndex(prev => prev - 1);
      setMistakes(prev => prev + 1);
    }
  };

  const fetchAudio = async (text: string, shouldCache: boolean = false): Promise<AudioBuffer | null> => {
    // Return cached buffer if we already have it for this text
    if (text === currentAudioText && (audioBuffer || useWebSpeech)) return audioBuffer;

    setIsAudioLoading(true);
    setError('');
    console.log('Setting up audio for text:', text.substring(0, 50) + '...');
    
    try {
      const result = await getVerseSpeech(text, user?.uid);
      
      if (result === 'WEB_SPEECH_API' || !result) {
        // Use Web Speech API (either no result or explicit marker)
        console.log('Using Web Speech API');
        setUseWebSpeech(true);
        setCurrentAudioText(text);
        setIsAudioLoading(false);
        return null; // No AudioBuffer needed for Web Speech
      } else {
        // Google Cloud TTS returned base64 MP3 audio data
        console.log('Google Cloud TTS audio received, decoding...');
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const ctx = audioContextRef.current;
        
        // Decode base64 to binary
        const binaryString = atob(result);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        // Use native MP3 decoding (browser handles sample rate automatically)
        const buffer = await ctx.decodeAudioData(bytes.buffer);
        setAudioBuffer(buffer);
        setCurrentAudioText(text);
        setUseWebSpeech(false);
        console.log('Google Cloud TTS audio decoded successfully');
        
        // Don't save audio to Firestore to avoid exceeding document size limits
        // Audio will be regenerated as needed
        
        setIsAudioLoading(false);
        return buffer;
      }
    } catch (e) { 
      console.error('Audio setup error:', e);
      // Fallback to Web Speech API on error
      console.log('Falling back to Web Speech API due to error');
      setUseWebSpeech(true);
      setCurrentAudioText(text);
      setIsAudioLoading(false);
      return null;
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      stopAudio();
      return;
    }
    
    const textToUse = currentAudioText || verseText;
    
    // Try to use premium AudioBuffer if available
    if (audioBuffer && audioContextRef.current) {
      try {
        if (audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume();
        }
        
        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current.destination);
        source.onended = () => {
          sourceNodeRef.current = null;
          if (isLooping) {
            setTimeout(() => {
              if (isLooping) togglePlay();
            }, 2000);
          } else {
            setIsPlaying(false);
          }
        };
        source.start();
        sourceNodeRef.current = source;
        setIsPlaying(true);
        console.log('Playing premium Google Cloud TTS audio');
        return;
      } catch (e) {
        console.error('Error playing AudioBuffer, falling back to Web Speech:', e);
      }
    }
    
    // Fallback to Web Speech API (MUST be called synchronously for mobile)
    try {
      speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(textToUse);
      utterance.rate = 0.85;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      const voices = speechSynthesis.getVoices();
      if (voices.length > 0) {
        const preferredVoice = voices.find(voice => voice.lang.startsWith('en'));
        if (preferredVoice) utterance.voice = preferredVoice;
      }
      
      utterance.onstart = () => {
        console.log('Playing Web Speech API audio');
        setIsPlaying(true);
      };
      
      utterance.onend = () => {
        if (isLooping) {
          setTimeout(() => {
            if (isLooping) togglePlay();
          }, 2000);
        } else {
          setIsPlaying(false);
        }
      };
      
      utterance.onerror = (e) => {
        console.error('Speech error:', e);
        alert('Speech failed: ' + e.error + '. Make sure your device volume is up and not on silent mode.');
        setIsPlaying(false);
      };
      
      utteranceRef.current = utterance;
      speechSynthesis.speak(utterance);
      
    } catch (e) {
      console.error('Error initializing speech:', e);
      alert('Unable to play audio. Error: ' + e);
    }
  };

  const pauseAudio = () => {
    if (audioContextRef.current && audioContextRef.current.state === 'running') {
      audioContextRef.current.suspend();
    }
    if (speechSynthesis.speaking && !speechSynthesis.paused) {
      speechSynthesis.pause();
    }
    setIsPlaying(false);
    setIsPaused(true);
  };

  const resumeAudio = () => {
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    if (speechSynthesis.paused) {
      speechSynthesis.resume();
    }
    setIsPlaying(true);
    setIsPaused(false);
  };

  const stopAudio = () => {
    // Stop AudioBuffer if playing
    if (sourceNodeRef.current) {
      sourceNodeRef.current.onended = null;
      sourceNodeRef.current.stop();
      sourceNodeRef.current = null;
    }
    
    // Stop Web Speech if playing
    speechSynthesis.cancel();
    utteranceRef.current = null;
    
    setIsPlaying(false);
    setIsPaused(false);
  };

  const toggleLoop = () => {
    setIsLooping(!isLooping);
  };

  // --- Derived Data (must be before any conditional returns) ---
  const toMillis = (value: unknown): number => {
    if (typeof value === 'number') return value;
    if (value instanceof Date) return value.getTime();
    if (value && typeof value === 'object') {
      const anyValue = value as any;
      if (typeof anyValue.toMillis === 'function') {
        const millis = anyValue.toMillis();
        if (typeof millis === 'number') return millis;
      }
      if (typeof anyValue.seconds === 'number') return anyValue.seconds * 1000;
    }
    return 0;
  };

  const memorizedVerses = React.useMemo(() => {
    const plans: MeditationPlan[] = [];

    if (user.meditationPlan) plans.push(user.meditationPlan);
    if (user.meditationHistory && user.meditationHistory.length > 0) {
      plans.push(...(user.meditationHistory.filter(Boolean) as MeditationPlan[]));
    }

    const seen = new Set<string>();
    const result: Array<PlanVerse & { planReference: string; translation: string; sortDate: number }> = [];

    for (const plan of plans) {
      const verses = Array.isArray((plan as any)?.verses) ? ((plan as any).verses as PlanVerse[]) : [];
      for (const verse of verses) {
        if (!verse?.isMemorized) continue;

        const key = `${verse.reference}::${verse.text}`;
        if (seen.has(key)) continue;
        seen.add(key);

        result.push({
          ...verse,
          planReference: plan.reference,
          translation: plan.translation,
          sortDate: toMillis((plan as any).completedDate ?? (plan as any).targetDate ?? (plan as any).startDate),
        });
      }
    }

    result.sort((a, b) => b.sortDate - a.sortDate);
    return result;
  }, [user.meditationPlan, user.meditationHistory]);

  const totalMemorizedCount = memorizedVerses.length;
  const activePlanTotalVerses = user.meditationPlan?.verses.length ?? 0;
  const activePlanMemorizedCount = user.meditationPlan
    ? user.meditationPlan.verses.filter(v => v.isMemorized).length
    : 0;
  const activePlanProgressPct = activePlanTotalVerses > 0
    ? Math.round((activePlanMemorizedCount / activePlanTotalVerses) * 100)
    : 0;

  // --- RENDER START ---
  
  // 1. Plan Dashboard View
  if (appView === 'PLAN_DASHBOARD' && user.meditationPlan) {
    const plan = user.meditationPlan;
    const memorizedCount = plan.verses.filter(v => v.isMemorized).length;
    const totalVerses = plan.verses.length;
    const percentage = totalVerses > 0 ? Math.round((memorizedCount / totalVerses) * 100) : 0;
    const daysLeft = Math.ceil((plan.targetDate - Date.now()) / (1000 * 60 * 60 * 24));
    
    // Concatenate all verses for passage audio
    const fullPassageText = plan.verses.map(v => v.text).join(' ');

    const togglePassagePlay = async () => {
       // Initialize/Resume AudioContext immediately for iOS support
       if (!audioContextRef.current) {
         audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
       }

       if (isPlaying) {
         pauseAudio();
         return;
       }

       // Always resume on interaction for Start/Resume
       try {
         await audioContextRef.current.resume();
       } catch (e) {
         // ignore
       }

       if (isPaused) {
         resumeAudio();
         return;
       }

       // Helper for Web Speech to ensure consistent config
       const playWebSpeechSync = (text: string) => {
         try {
           speechSynthesis.cancel();
           const utterance = new SpeechSynthesisUtterance(text);
           utterance.rate = 0.85;
           utterance.pitch = 1.0;
           utterance.volume = 1.0;
           const voices = speechSynthesis.getVoices();
           if (voices.length > 0) {
             const preferredVoice = voices.find(voice => voice.lang.startsWith('en'));
             if (preferredVoice) utterance.voice = preferredVoice;
           }
           utterance.onstart = () => {
             console.log('Passage Web Speech started');
             setIsPlaying(true);
           };
           utterance.onend = () => {
             if (isLooping) {
               setTimeout(() => {
                 if (isLooping) togglePassagePlay();
               }, 2000);
             } else {
               setIsPlaying(false);
             }
           };
           utterance.onerror = (e) => {
             console.error('Passage speech error:', e);
             // Don't alert on 'interrupted' or 'canceled'
             if (e.error !== 'interrupted' && e.error !== 'canceled') {
                alert('Speech failed. Make sure volume is up.');
             }
             setIsPlaying(false);
           };
           utteranceRef.current = utterance;
           speechSynthesis.speak(utterance);
         } catch (e) {
           console.error('Error with passage speech:', e);
           alert('Unable to play audio: ' + e);
         }
       };

       const isMobile = window.innerWidth < 768;

       const playAudioBuffer = async (buffer: AudioBuffer, sourceLabel: string) => {
         try {
           if (!audioContextRef.current) {
             audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
           }
           if (audioContextRef.current.state === 'suspended') {
             await audioContextRef.current.resume();
           }

           const source = audioContextRef.current.createBufferSource();
           source.buffer = buffer;
           source.connect(audioContextRef.current.destination);
           source.onended = () => {
             sourceNodeRef.current = null;
             if (isLooping) {
               setTimeout(() => {
                 if (isLooping) togglePassagePlay();
               }, 2000);
             } else {
               setIsPlaying(false);
             }
           };
           source.start();
           sourceNodeRef.current = source;
           setIsPlaying(true);
           console.log(`Playing ${sourceLabel} passage audio`);
           return true;
         } catch (e) {
           console.error('Error playing passage AudioBuffer:', e);
           return false;
         }
       };

       // 0. If premium audio is already loaded for this passage, prefer it (HQ voice)
       if (!useWebSpeech && currentAudioText === fullPassageText && audioBuffer) {
         const ok = await playAudioBuffer(audioBuffer, 'premium');
         if (ok) return;
       }

       // 1. Check if we should use Web Speech (previously determined)
       if (useWebSpeech && currentAudioText === fullPassageText) {
          playWebSpeechSync(fullPassageText);
          return;
       }

       // 2. Check for cached audio in the plan (Synchronous check avoids iOS await issue)
       if (plan.cachedAudioBase64) {
         try {
           const binaryString = atob(plan.cachedAudioBase64);
           const bytes = new Uint8Array(binaryString.length);
           for (let i = 0; i < binaryString.length; i++) {
             bytes[i] = binaryString.charCodeAt(i);
           }
           const buffer = await audioContextRef.current.decodeAudioData(bytes.buffer);
           const ok = await playAudioBuffer(buffer, 'cached');
           if (ok) return;
         } catch (e) {
           console.error('Error playing cached audio:', e);
           // Fall through to fetch
         }
       }

       // 3. Desktop: prefer premium audio (HQ voice) and only fall back to Web Speech if needed.
       if (!isMobile) {
         const buffer = await fetchAudio(fullPassageText, true);
         if (buffer) {
           const ok = await playAudioBuffer(buffer, 'premium');
           if (ok) return;
         }

         // If premium isn't available, fetchAudio will have switched us to Web Speech.
         playWebSpeechSync(fullPassageText);
         return;
       }

       // 4. Mobile: start Web Speech immediately (reliable on first tap),
       // and warm premium audio in the background for subsequent plays.
       playWebSpeechSync(fullPassageText);
       void fetchAudio(fullPassageText, true);
    };

    return (
      <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-20">
        <div className="relative text-center">
           <button 
             onClick={() => setIsHelpOpen(true)}
             className="absolute right-0 top-0 p-2 text-oatmeal hover:text-flame transition-colors rounded-full hover:bg-blue-fantastic/50"
             title="Help"
           >
             <Icons.Help size={20} />
           </button>
           <h1 className="text-2xl font-bold text-palladian">Meditation Plan</h1>
           <p className="text-oatmeal text-sm">{plan.reference}</p>
        </div>

        {/* Stats */}
        <div className="bg-blue-fantastic p-6 rounded-2xl border border-oatmeal/10">
          <div className="grid grid-cols-4 gap-2 text-center mb-4">
           <div>
             <div className="text-2xl font-bold text-palladian">{memorizedCount}</div>
             <div className="text-[10px] uppercase text-oatmeal">Memorized</div>
           </div>
           <div>
             <div className="text-2xl font-bold text-flame">{percentage}%</div>
             <div className="text-[10px] uppercase text-oatmeal">Complete</div>
           </div>
           <div>
             <div className="text-2xl font-bold text-palladian">{Math.max(0, daysLeft)}</div>
             <div className="text-[10px] uppercase text-oatmeal">Days Left</div>
           </div>
           <div>
             <div className="text-sm font-bold text-palladian pt-1">{new Date(plan.targetDate).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric', year: 'numeric' })}</div>
             <div className="text-[10px] uppercase text-oatmeal">Target</div>
           </div>
          </div>
          
          {percentage === 100 && (
            <Button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleMarkPlanComplete();
              }}
              className="w-full"
            >
              <Icons.CheckCircle size={18} className="mr-2" />
              Mark Plan Complete
            </Button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-blue-fantastic rounded-full overflow-hidden">
          <div className="h-full bg-flame transition-all duration-1000" style={{ width: `${percentage}%` }}></div>
        </div>

        {/* YouVersion Link */}
        <a 
          href={getBibleUrl(plan.reference, plan.translation)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center space-x-2 bg-blue-fantastic/50 p-4 rounded-xl border border-oatmeal/10 hover:border-flame/50 transition-colors group"
        >
          <Icons.Book size={18} className="text-flame" />
          <span className="text-sm font-medium text-palladian group-hover:text-flame transition-colors">Read on YouVersion Bible</span>
          <Icons.ExternalLink size={16} className="text-oatmeal group-hover:text-flame transition-colors" />
        </a>

        <div className="bg-blue-fantastic rounded-2xl p-6 border border-oatmeal/10 space-y-4">
           <div className="flex justify-between items-center border-b border-oatmeal/10 pb-2">
              <h3 className="font-bold text-palladian">Verses</h3>
              <button onClick={handleResetPlan} className="text-xs text-oatmeal/70 hover:text-oatmeal hover:underline">Reset Plan</button>
           </div>
           
           <div className="space-y-4">
             {plan.verses.map((v, i) => (
               <div key={v.id} className="group relative">
                 <div className="flex gap-3">
                   <div className="pt-1">
                      <span className="text-xs font-mono text-oatmeal/50">{i+1}</span>
                   </div>
                   <div className="flex-1">
                      <p className={`text-palladian text-sm leading-relaxed mb-2 transition-all ${v.isMemorized ? 'opacity-50' : ''}`}>
                         {v.text}
                      </p>
                      <div className="flex items-center justify-between">
                         <span className="text-xs font-bold text-flame">{v.reference}</span>
                         <div className="flex gap-2">
                           <Button 
                             onClick={() => handlePracticePlanVerse(v)}
                             size="sm" 
                             variant={v.isMemorized ? "ghost" : "primary"}
                             className="text-xs h-7 px-3"
                           >
                             Practice
                           </Button>
                           <button 
                             onClick={() => markPlanVerseMemorized(v.id)}
                             className={`p-1.5 rounded-full border transition-all ${v.isMemorized ? 'bg-flame border-flame text-blue-abyssal' : 'border-oatmeal/20 text-oatmeal hover:border-flame hover:text-flame'}`}
                             title={v.isMemorized ? "Memorized" : "Mark as Memorized"}
                           >
                             <Icons.CheckCircle size={14} />
                           </button>
                         </div>
                      </div>
                   </div>
                 </div>
                 {i < plan.verses.length - 1 && <div className="h-px bg-oatmeal/5 mt-4"></div>}
               </div>
             ))}
           </div>
           
           <div className="pt-4">
             <Button 
               onClick={exitPlanDashboardToHome}
               className="w-full"
             >
               <Icons.CheckCircle size={16} className="mr-2" />
               Done For Today
             </Button>
             <p className="text-center text-[10px] text-oatmeal/40 mt-2">Practice other verses</p>
           </div>
        </div>

        {/* Help Modal */}
        <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} section="MEMORIZE" />
        
        {/* Completion Modal */}
        <Modal isOpen={showCompletionModal} onClose={() => {
          console.log('Modal close button clicked');
          setShowCompletionModal(false);
        }} title="Plan Complete!">
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-flame rounded-full flex items-center justify-center mx-auto">
              <Icons.CheckCircle size={40} className="text-blue-abyssal" />
            </div>
            
            <div>
              <h3 className="text-xl font-bold text-flame mb-2">Congratulations!</h3>
              <p className="text-oatmeal">
                You've memorized all verses in your meditation plan. The Word is now hidden in your heart.
              </p>
            </div>
            
            <div className="bg-flame/15 p-4 rounded-xl border border-flame/30">
              <p className="text-sm font-medium text-flame">{completedPlanDetails}</p>
            </div>
            
            <div className="bg-blue-abyssal/30 p-4 rounded-lg border border-oatmeal/10">
              <p className="text-sm text-oatmeal/90 leading-relaxed italic">
                "I have hidden your word in my heart that I might not sin against you." - Psalm 119:11
              </p>
            </div>
            
            <div className="space-y-3">
              <p className="text-sm text-palladian font-medium">
                Would you like to record this accomplishment in your daily journal?
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                <Button onClick={handleRecordToJournal} className="w-full">
                  <Icons.Book size={16} className="mr-2" />
                  Record to Journal
                </Button>
                <Button variant="ghost" onClick={() => setShowCompletionModal(false)}>
                  Not Now
                </Button>
              </div>
              
              <div className="pt-2 border-t border-oatmeal/10">
                <p className="text-xs text-oatmeal/70 mb-2">
                  Clear this plan to start a new one?
                </p>
                <Button 
                  onClick={() => {
                    setShowCompletionModal(false);
                    handleResetPlan();
                  }} 
                  variant="ghost" 
                  className="w-full text-truffle hover:text-flame"
                >
                  <Icons.X size={16} className="mr-2" />
                  Clear Plan
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  // 2. Plan Setup View
  if (appView === 'PLAN_SETUP') {
    return (
      <div className="h-full flex flex-col justify-center pb-20 px-4 animate-in fade-in">
        <div className="max-w-md w-full mx-auto space-y-6">
           <div className="text-center">
             <h1 className="text-2xl font-bold text-palladian">Create Plan</h1>
             <p className="text-oatmeal text-sm">Pick a passage to memorize</p>
           </div>
           
           <form onSubmit={handleCreatePlan} className="bg-blue-fantastic p-6 rounded-2xl border border-oatmeal/10 space-y-4">
              <Input 
                label="Passage Reference"
                placeholder="e.g. Psalm 23, Romans 8:1-4"
                value={planRef}
                onChange={e => setPlanRef(e.target.value)}
                required
              />
              
              {/* Toggle between search and paste */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPlanUseCustomText(false)}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                    !planUseCustomText 
                      ? 'bg-flame text-blue-abyssal' 
                      : 'bg-blue-abyssal text-oatmeal hover:text-palladian'
                  }`}
                >
                  Search
                </button>
                <button
                  type="button"
                  onClick={() => setPlanUseCustomText(true)}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                    planUseCustomText 
                      ? 'bg-flame text-blue-abyssal' 
                      : 'bg-blue-abyssal text-oatmeal hover:text-palladian'
                  }`}
                >
                  Paste Text
                </button>
              </div>
              
              {planUseCustomText ? (
                <div>
                  <label className="block text-sm font-medium text-oatmeal mb-1">Passage Text</label>
                  <textarea
                    className="w-full px-4 py-3 bg-blue-abyssal border border-oatmeal/20 rounded-lg text-palladian placeholder-oatmeal/40 focus:outline-none focus:ring-2 focus:ring-flame focus:border-transparent transition-all resize-none"
                    placeholder="Paste your text here... It will be split by sentences."
                    value={planCustomText}
                    onChange={e => setPlanCustomText(e.target.value)}
                    rows={6}
                    required
                  />
                  <p className="text-xs text-oatmeal/60 mt-1">Text will be automatically split by sentences</p>
                </div>
              ) : (
                <div>
                   <p className="text-xs text-oatmeal/60 text-center py-2">
                     Verses will be retrieved in NIV translation
                   </p>
                </div>
              )}
              
              <div className="flex items-end justify-between gap-3">
                <label htmlFor="memorize-target-date" className="block text-sm font-medium text-oatmeal mb-1">
                  Target Date
                </label>
                <input
                  id="memorize-target-date"
                  type="date"
                  value={planDate}
                  onChange={e => setPlanDate(e.target.value)}
                  required
                  className="w-44 sm:w-56 px-4 py-3 bg-blue-abyssal border border-oatmeal/20 rounded-lg text-palladian text-base placeholder-oatmeal/40 focus:outline-none focus:ring-2 focus:ring-flame focus:border-transparent transition-all"
                  style={{ colorScheme: 'dark' }}
                />
              </div>

              {error && <p className="text-truffle text-sm">{error}</p>}

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={() => setAppView('HOME')} className="flex-1">Cancel</Button>
                <Button type="submit" isLoading={isLoading} className="flex-1">Start Plan</Button>
              </div>
           </form>
        </div>
      </div>
    );
  }

  // History View
  if (appView === 'HISTORY') {
    const history = user.meditationHistory || [];
    
    const handleRestartPlan = (plan: MeditationPlan) => {
      // Create a new plan based on the historical one
      const newPlan: MeditationPlan = {
        ...plan,
        id: Math.random().toString(36).substr(2, 9),
        startDate: Date.now(),
        targetDate: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days from now
        verses: plan.verses.map(v => ({ ...v, isMemorized: false })),
        cachedAudioBase64: undefined
      };
      onUpdateUser({ ...user, meditationPlan: newPlan });
      setAppView('PLAN_DASHBOARD');
    };
    
    const handlePracticeVerse = (plan: MeditationPlan, verse: PlanVerse) => {
      setReference(verse.reference);
      setVerseText(verse.text);
      setTranslation(plan.translation);
      setStep('PREVIEW');
      setAppView('HOME');
    };
    
    return (
      <div className="h-full flex flex-col px-4 py-6 pb-20 animate-in fade-in overflow-y-auto">
        <div className="max-w-2xl w-full mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => setAppView('HOME')}
              className="p-2 text-oatmeal hover:text-flame transition-colors rounded-full hover:bg-blue-fantastic/50"
            >
              <Icons.Back size={24} />
            </button>
            <h1 className="text-2xl font-bold text-palladian">Past Plans</h1>
            <div className="w-10"></div>
          </div>
          
          {history.length === 0 ? (
            <div className="text-center py-12 text-oatmeal">
              <Icons.Clock size={48} className="mx-auto mb-4 opacity-50" />
              <p>No past plans yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((plan) => {
                const completedVerses = plan.verses.filter(v => v.isMemorized).length;
                const progress = Math.round((completedVerses / plan.verses.length) * 100);
                
                return (
                  <div key={plan.id} className="bg-blue-fantastic rounded-2xl border border-oatmeal/10 overflow-hidden">
                    <div className="p-6 space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-bold text-palladian">{plan.reference}</h3>
                          <p className="text-sm text-oatmeal">{plan.translation} • {plan.verses.length} {plan.verses.length === 1 ? 'verse' : 'verses'}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-flame">{progress}%</div>
                          <div className="text-xs text-oatmeal">Complete</div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => handleRestartPlan(plan)}
                          className="flex-1 text-sm"
                        >
                          <Icons.Repeat size={14} className="mr-1" /> Restart Plan
                        </Button>
                      </div>
                      
                      {/* Collapsible verses */}
                      <details className="group">
                        <summary className="cursor-pointer text-sm text-oatmeal hover:text-palladian transition-colors list-none flex items-center justify-between">
                          <span>View verses ({plan.verses.length})</span>
                          <Icons.Down size={16} className="group-open:rotate-180 transition-transform" />
                        </summary>
                        <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                          {plan.verses.map((verse) => (
                            <div 
                              key={verse.id}
                              className="p-3 bg-blue-abyssal rounded-lg flex items-center justify-between gap-3"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="text-xs text-flame font-medium mb-1">{verse.reference}</div>
                                <div className="text-sm text-oatmeal line-clamp-2">{verse.text}</div>
                              </div>
                              <Button
                                onClick={() => handlePracticeVerse(plan, verse)}
                                variant="secondary"
                                className="text-xs py-2 px-3 flex-shrink-0"
                              >
                                Practice
                              </Button>
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 3. Home / Quick Practice View
  if (appView === 'HOME' && step === 'SEARCH') {
    return (
      <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-24 px-4 sm:px-6 lg:px-12 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
         <div className="relative text-center pl-14 pr-14 lg:pl-0 lg:pr-0">
           <button 
             onClick={() => setIsHelpOpen(true)}
             className="absolute right-0 top-0 p-2 text-oatmeal hover:text-flame transition-colors rounded-full hover:bg-blue-fantastic/50"
             title="Help"
           >
             <Icons.Help size={20} />
           </button>
           <div className="w-16 h-16 bg-blue-fantastic rounded-2xl flex items-center justify-center mx-auto mb-4 text-flame shadow-lg shadow-black/20">
             <Icons.BookmarkCheck size={32} strokeWidth={1.5} />
           </div>
           <h1 className="text-2xl md:text-3xl font-bold text-palladian">Memorize Scripture</h1>
           <p className="text-oatmeal text-sm mt-1">Hide the Word in your heart</p>
           <p className="text-xs text-oatmeal/60 italic mt-2">
             {totalMemorizedCount > 0
               ? `You’ve memorized ${totalMemorizedCount} verse${totalMemorizedCount === 1 ? '' : 's'} so far.`
               : 'Start with a verse, then build a plan for longer passages.'}
           </p>
        </div>

        <div className="w-full max-w-lg mx-auto space-y-4">
          {/* Meditation Plan (primary draw) */}
          {user.meditationPlan ? (
            <div className="bg-blue-fantastic p-6 rounded-2xl border border-flame/30 shadow-sm space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="font-bold text-palladian">Meditation Plan</h3>
                  <p className="text-oatmeal/80 text-sm mt-1 truncate">
                    {user.meditationPlan.reference} • {user.meditationPlan.translation}
                  </p>
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-blue-abyssal/60 border border-oatmeal/10 text-xs text-oatmeal flex-shrink-0">
                  {activePlanMemorizedCount}/{activePlanTotalVerses} memorized
                </div>
              </div>

              <div className="w-full bg-blue-abyssal/50 h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-flame to-palladian transition-all duration-500 rounded-full"
                  style={{ width: `${activePlanProgressPct}%` }}
                />
              </div>

              <Button onClick={backToDashboard} className="w-full">
                Continue Plan
                <Icons.ArrowRight size={16} className="ml-2" />
              </Button>
            </div>
          ) : (
            <div className="bg-blue-fantastic p-6 rounded-2xl border border-flame/30 shadow-sm space-y-3">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-flame/20 rounded-xl flex-shrink-0">
                  <Icons.BookmarkCheck size={22} className="text-flame" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-palladian">Meditation Plan</h3>
                  <p className="text-oatmeal text-sm mt-1">
                    Memorize longer passages with daily practice and progress tracking.
                  </p>
                </div>
              </div>
              <Button onClick={() => setAppView('PLAN_SETUP')} className="w-full">
                Create Meditation Plan
              </Button>
            </div>
          )}

          {/* Memorized Verses (clear display) */}
          <div className="bg-blue-fantastic p-6 rounded-2xl border border-oatmeal/10 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-palladian">Your Memorized Verses</h3>
              <span className="text-xs text-oatmeal/60">{totalMemorizedCount}</span>
            </div>

            {totalMemorizedCount === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-oatmeal/20 rounded-2xl bg-blue-abyssal/20">
                <Icons.BookmarkCheck size={40} className="mx-auto mb-3 text-oatmeal/30" />
                <p className="text-oatmeal mb-1">No memorized verses yet.</p>
                <p className="text-oatmeal/60 text-sm">
                  Start with Quick Practice, then save a plan for longer passages.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {memorizedVerses.slice(0, 25).map((v) => (
                  <button
                    key={`${v.planReference}::${v.id}::${v.sortDate}`}
                    type="button"
                    onClick={() => practiceMemorizedVerse(v.reference, v.text)}
                    className="w-full text-left p-4 bg-blue-abyssal/40 rounded-xl border border-oatmeal/10 hover:border-flame/40 hover:bg-blue-abyssal/55 transition-colors"
                    title="Practice this verse"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-palladian">{v.reference}</div>
                        <div className="text-xs text-oatmeal/60 mt-0.5 truncate">{v.planReference} • {v.translation}</div>
                      </div>
                      <div className="text-xs text-flame flex-shrink-0">Practice</div>
                    </div>
                    <div className="text-sm text-oatmeal mt-3 leading-relaxed line-clamp-3">{v.text}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Suggested Verses */}
          <div className="bg-blue-fantastic p-6 rounded-2xl border border-oatmeal/10 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-palladian">Suggested Verses</h3>
              <span className="text-xs text-oatmeal/60">Tap to practice</span>
            </div>

            <div className="space-y-4">
              {SUGGESTED_VERSE_CATEGORIES.map((cat) => (
                <div key={cat.id} className="space-y-3">
                  <div className="text-xs text-oatmeal/60 uppercase tracking-wide">
                    {cat.id}: {cat.title}
                  </div>
                  <div className="space-y-2">
                    {cat.items.map((item) => (
                      <div
                        key={`${cat.id}-${item.label}`}
                        className="p-4 bg-blue-abyssal/40 rounded-xl border border-oatmeal/10"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-palladian">{item.label}</div>
                            <div className="flex flex-wrap gap-2 mt-2">
                              <button
                                type="button"
                                onClick={() => fetchVerseForQuickPractice(item.refs[0])}
                                className="px-3 py-1.5 rounded-lg bg-blue-abyssal border border-oatmeal/10 text-xs text-oatmeal hover:text-palladian hover:border-flame/40 transition-colors"
                              >
                                {item.refs[0]}
                              </button>
                              <button
                                type="button"
                                onClick={() => fetchVerseForQuickPractice(item.refs[1])}
                                className="px-3 py-1.5 rounded-lg bg-blue-abyssal border border-oatmeal/10 text-xs text-oatmeal hover:text-palladian hover:border-flame/40 transition-colors"
                              >
                                {item.refs[1]}
                              </button>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => startSuggestedPlan(item.refs[0])}
                            className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-flame/15 border border-flame/30 text-xs text-flame hover:bg-flame/25 transition-colors"
                            title="Create a Meditation Plan (starts with the first verse)"
                          >
                            Create Plan
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Practice */}
           <div className="bg-blue-fantastic p-6 rounded-2xl border border-oatmeal/10">
              <h3 className="font-bold text-palladian mb-4">Quick Practice</h3>
              
              {/* Toggle between search and paste */}
              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setUseCustomText(false)}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                    !useCustomText 
                      ? 'bg-flame text-blue-abyssal' 
                      : 'bg-blue-abyssal text-oatmeal hover:text-palladian'
                  }`}
                >
                  Search
                </button>
                <button
                  type="button"
                  onClick={() => setUseCustomText(true)}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                    useCustomText 
                      ? 'bg-flame text-blue-abyssal' 
                      : 'bg-blue-abyssal text-oatmeal hover:text-palladian'
                  }`}
                >
                  Paste Text
                </button>
              </div>
              
              <form onSubmit={handleFetchVerse} className="space-y-4">
                {useCustomText ? (
                  <>
                    <Input 
                      placeholder="Reference (e.g. John 3:16)"
                      value={reference}
                      onChange={e => setReference(e.target.value)}
                    />
                    <div>
                      <textarea
                        className="w-full px-4 py-3 bg-blue-abyssal border border-oatmeal/20 rounded-lg text-palladian placeholder-oatmeal/40 focus:outline-none focus:ring-2 focus:ring-flame focus:border-transparent transition-all resize-none"
                        placeholder="Paste your verse text here..."
                        value={customText}
                        onChange={e => setCustomText(e.target.value)}
                        rows={4}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <Input 
                          placeholder="e.g. Philippians 4:13"
                          value={reference}
                          onChange={e => setReference(e.target.value)}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-oatmeal/60 text-center">
                      Verses will be retrieved in NIV translation
                    </p>
                  </>
                )}

                <Button type="submit" className="w-full" isLoading={isLoading} disabled={!reference.trim()}>
                  Find Verse
                </Button>
                {error && <p className="text-truffle text-sm">{error}</p>}
              </form>
           </div>
           
           {/* History Button */}
           {user.meditationHistory && user.meditationHistory.length > 0 && (
             <Button onClick={() => setAppView('HISTORY')} variant="ghost" className="w-full">
               <Icons.Clock size={16} className="mr-2" /> View Past Plans ({user.meditationHistory.length})
             </Button>
           )}
        </div>

        {/* Help Modal */}
        <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} section="MEMORIZE" />
        </div>
      </div>
    );
  }

  // 4. Active Exercise Views
  return (
    <div className="h-full flex flex-col overflow-y-auto pb-20">
      <div className="flex-1 flex flex-col items-center py-4 px-3 md:py-6 md:px-4 md:justify-center">
        <div className="w-full max-w-lg bg-blue-fantastic p-4 md:p-8 rounded-xl md:rounded-2xl border border-oatmeal/10 md:shadow-xl">
          
          {/* EXERCISE STEP: PREVIEW */}
          {step === 'PREVIEW' && (
            <div className="space-y-5 text-center animate-in fade-in slide-in-from-right-4">
              <div className="flex justify-between items-start">
                 {activePlanVerseId ? (
                   <button onClick={backToDashboard} className="p-2 rounded-full bg-blue-fantastic hover:bg-flame text-palladian hover:text-blue-abyssal transition-colors flex-shrink-0"><Icons.Back size={24}/></button>
                 ) : (
                   <div className="w-10 lg:w-2"></div>
                 )}
                 <h3 className="text-flame font-bold text-base md:text-lg flex-1 px-2">{reference}</h3>
                 <button onClick={resetExercise} className="text-oatmeal hover:text-white flex-shrink-0"><Icons.X size={20}/></button>
              </div>
              
              {/* Navigation buttons for plan verses */}
              {activePlanVerseId && user.meditationPlan && (
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={goToPreviousPlanVerse}
                    disabled={user.meditationPlan.verses.findIndex(v => v.id === activePlanVerseId) === 0}
                    className="p-2 rounded-full bg-blue-abyssal border border-oatmeal/20 text-palladian hover:border-flame hover:text-flame disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    title="Previous Verse"
                  >
                    <Icons.Back size={20} />
                  </button>
                  <span className="text-xs text-oatmeal">
                    Verse {user.meditationPlan.verses.findIndex(v => v.id === activePlanVerseId) + 1} of {user.meditationPlan.verses.length}
                  </span>
                  <button
                    onClick={goToNextPlanVerse}
                    disabled={user.meditationPlan.verses.findIndex(v => v.id === activePlanVerseId) === user.meditationPlan.verses.length - 1}
                    className="p-2 rounded-full bg-blue-abyssal border border-oatmeal/20 text-palladian hover:border-flame hover:text-flame disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    title="Next Verse"
                  >
                    <Icons.Next size={20} />
                  </button>
                </div>
              )}
              
              <div className="bg-blue-abyssal p-5 md:p-6 rounded-xl border border-oatmeal/5">
                <p className="text-lg md:text-xl text-palladian font-serif leading-relaxed">
                  "{verseText}"
                </p>
              </div>
              <p className="text-oatmeal text-sm">Choose how you want to memorize.</p>
              
              {/* UNIFORM GRID OF BUTTONS */}
              <div className="grid grid-cols-2 gap-2.5 md:gap-3">
                 {/* Type It - Highlighted */}
                 <button onClick={() => resumeOrStart('TYPE', startTypeMode)} className="w-full h-28 md:h-32 flex flex-col items-center justify-center space-y-1.5 md:space-y-2 rounded-xl md:rounded-2xl border transition-all bg-blue-fantastic border-flame text-flame shadow-md active:scale-[0.98]">
                    <Icons.Brain size={24} className="md:size-7 opacity-90" />
                    <div className="text-center">
                       <span className="block font-bold text-sm md:text-base">Type It</span>
                       <span className="block text-[9px] md:text-[10px] opacity-80 mt-0.5 md:mt-1">Strict typing</span>
                    </div>
                 </button>

                 {/* Speak It */}
                 <button onClick={() => resumeOrStart('SPEAK', startSpeakMode)} className="w-full h-28 md:h-32 flex flex-col items-center justify-center space-y-1.5 md:space-y-2 rounded-xl md:rounded-2xl border transition-all bg-blue-abyssal/40 border-oatmeal/10 text-palladian hover:border-flame/50 hover:text-flame hover:bg-blue-abyssal active:scale-[0.98]">
                    <Icons.Mic size={24} className="md:size-7 opacity-80" />
                    <div className="text-center">
                       <span className="block font-bold text-sm md:text-base">Speak It</span>
                       <span className="block text-[9px] md:text-[10px] text-oatmeal mt-0.5 md:mt-1">Voice recognition</span>
                    </div>
                 </button>

                 {/* Fill Blanks */}
                 <button onClick={() => resumeOrStart('FILL', startFillMode)} className="w-full h-28 md:h-32 flex flex-col items-center justify-center space-y-1.5 md:space-y-2 rounded-xl md:rounded-2xl border transition-all bg-blue-abyssal/40 border-oatmeal/10 text-palladian hover:border-flame/50 hover:text-flame hover:bg-blue-abyssal active:scale-[0.98]">
                    <Icons.CheckList size={24} className="md:size-7 opacity-80" />
                    <div className="text-center">
                       <span className="block font-bold text-sm md:text-base">Fill Blanks</span>
                       <span className="block text-[9px] md:text-[10px] text-oatmeal mt-0.5 md:mt-1">Multiple choice</span>
                    </div>
                 </button>

                    {/* Scramble Words */}
                    <button onClick={() => resumeOrStart('UNJUMBLE', startUnjumbleMode)} className="w-full h-28 md:h-32 flex flex-col items-center justify-center space-y-1.5 md:space-y-2 rounded-xl md:rounded-2xl border transition-all bg-blue-abyssal/40 border-oatmeal/10 text-palladian hover:border-flame/50 hover:text-flame hover:bg-blue-abyssal active:scale-[0.98]">
                    <Icons.List size={24} className="md:size-7 opacity-80" />
                    <div className="text-center">
                        <span className="block font-bold text-sm md:text-base">Scramble</span>
                      <span className="block text-[9px] md:text-[10px] text-oatmeal mt-0.5 md:mt-1">Tap words in order</span>
                    </div>
                  </button>

                 {/* Reveal Word */}
                 <button onClick={() => resumeOrStart('REVEAL', () => startRevealMode('WORD'), 'WORD')} className="w-full h-28 md:h-32 flex flex-col items-center justify-center space-y-1.5 md:space-y-2 rounded-xl md:rounded-2xl border transition-all bg-blue-abyssal/40 border-oatmeal/10 text-palladian hover:border-flame/50 hover:text-flame hover:bg-blue-abyssal active:scale-[0.98]">
                    <Icons.Eye size={24} className="md:size-7 opacity-80" />
                    <div className="text-center">
                       <span className="block font-bold text-sm md:text-base">Reveal Word</span>
                       <span className="block text-[9px] md:text-[10px] text-oatmeal mt-0.5 md:mt-1">One by one</span>
                    </div>
                 </button>

                 {/* Reveal Phrase */}
                 <button onClick={() => resumeOrStart('REVEAL', () => startRevealMode('PHRASE'), 'PHRASE')} className="w-full h-28 md:h-32 flex flex-col items-center justify-center space-y-1.5 md:space-y-2 rounded-xl md:rounded-2xl border transition-all bg-blue-abyssal/40 border-oatmeal/10 text-palladian hover:border-flame/50 hover:text-flame hover:bg-blue-abyssal active:scale-[0.98]">
                    <Icons.Scroll size={24} className="md:size-7 opacity-80" />
                    <div className="text-center">
                       <span className="block font-bold text-sm md:text-base">Reveal Phrase</span>
                       <span className="block text-[9px] md:text-[10px] text-oatmeal mt-0.5 md:mt-1">Chunk by chunk</span>
                    </div>
                 </button>

                 {/* Reveal Letter */}
                 <button onClick={() => resumeOrStart('REVEAL', () => startRevealMode('LETTER'), 'LETTER')} className="w-full h-28 md:h-32 flex flex-col items-center justify-center space-y-1.5 md:space-y-2 rounded-xl md:rounded-2xl border transition-all bg-blue-abyssal/40 border-oatmeal/10 text-palladian hover:border-flame/50 hover:text-flame hover:bg-blue-abyssal active:scale-[0.98]">
                    <Icons.Sparkles size={24} className="md:size-7 opacity-80" />
                    <div className="text-center">
                       <span className="block font-bold text-sm md:text-base">First Letter</span>
                       <span className="block text-[9px] md:text-[10px] text-oatmeal mt-0.5 md:mt-1">Hard mode</span>
                    </div>
                 </button>
              </div>
            </div>
          )}

          {/* EXERCISE STEP: ACTIVE (TYPE) */}
          {step === 'ACTIVE' && mode === 'TYPE' && (
            <div className="space-y-6 animate-in zoom-in-95">
               <div className="flex justify-between items-center border-b border-oatmeal/10 pb-2">
                 <h3 className="text-flame font-bold">{reference}</h3>
                 <span className="text-xs text-truffle font-bold">{mistakes > 0 && `${mistakes} Mistakes`}</span>
               </div>

               <div className="flex items-center justify-between gap-3 bg-blue-abyssal/40 border border-oatmeal/10 rounded-xl px-4 py-3">
                 <div className="min-w-0">
                   <div className="text-xs font-semibold text-palladian uppercase tracking-wider">Typing options</div>
                   <div className="text-[11px] text-oatmeal/70 mt-0.5">
                     {typeIncludePunctuation ? 'Include punctuation (strict)' : 'Ignore punctuation (for easier typing)'}
                   </div>
                 </div>
                 <label className="inline-flex items-center gap-2 flex-shrink-0 text-xs text-oatmeal/80">
                   <input
                     type="checkbox"
                     checked={typeIncludePunctuation}
                     onChange={(e) => {
                       setTypeIncludePunctuation(e.target.checked);
                       setIsError(false);
                     }}
                     className="h-4 w-4 rounded border-oatmeal/20 bg-blue-abyssal text-flame focus:ring-flame"
                   />
                   <span>Include punctuation</span>
                 </label>
               </div>
               
               {/* Navigation buttons */}
               {activePlanVerseId && user.meditationPlan && (
                <div className="flex items-center justify-center gap-3 -mt-2 mb-2">
                  <button
                    onClick={goToPreviousPlanVerse}
                    disabled={user.meditationPlan.verses.findIndex(v => v.id === activePlanVerseId) === 0}
                    className="p-1.5 rounded-full bg-blue-abyssal border border-oatmeal/20 text-palladian hover:border-flame hover:text-flame disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    title="Previous Verse"
                  >
                    <Icons.Back size={16} />
                  </button>
                  <span className="text-[10px] text-oatmeal">
                    {user.meditationPlan.verses.findIndex(v => v.id === activePlanVerseId) + 1}/{user.meditationPlan.verses.length}
                  </span>
                  <button
                    onClick={goToNextPlanVerse}
                    disabled={user.meditationPlan.verses.findIndex(v => v.id === activePlanVerseId) === user.meditationPlan.verses.length - 1}
                    className="p-1.5 rounded-full bg-blue-abyssal border border-oatmeal/20 text-palladian hover:border-flame hover:text-flame disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    title="Next Verse"
                  >
                    <Icons.Next size={16} />
                  </button>
                </div>
              )}
               <div className="relative">
                 <textarea 
                    ref={inputRef}
                    className={`w-full h-40 bg-blue-abyssal border rounded-xl p-4 text-lg text-palladian focus:outline-none resize-none placeholder-oatmeal/20 transition-all duration-200 ${isError ? 'border-truffle ring-2 ring-truffle/50' : 'border-oatmeal/20 focus:ring-2 focus:ring-flame'}`}
                    placeholder="Type the verse here..."
                    value={userInput}
                    onChange={handleTypeInputChange}
                    autoFocus
                    spellCheck={false}
                    readOnly={isReadyToScore}
                 />
                 {isError && <div className="absolute right-4 top-4 text-truffle animate-bounce"><Icons.X size={20} /></div>}
               </div>
               {isReadyToScore ? (
                 <div className="flex gap-3">
                   <Button onClick={() => calculateScore(mistakes, hintsUsed)} className="flex-1"><Icons.CheckCircle size={18} className="mr-2" />Done</Button>
                   <Button onClick={goToModeSelection} variant="ghost" className="flex-1">Back to Modes</Button>
                 </div>
               ) : (
                 <div className="flex gap-3">
                   <Button onClick={handleTypeHint} variant="secondary" className="flex-1"><Icons.Help size={16} className="mr-2" />Hint</Button>
                   <Button onClick={goToModeSelection} variant="ghost" className="flex-1">Cancel</Button>
                 </div>
               )}
               <div className="w-full bg-blue-abyssal rounded-full h-1.5 overflow-hidden">
                  {(() => {
                    const inputLen = getTypeNormalizedInput(userInput).length;
                    const targetLen = Math.max(1, getTypeNormalizedTarget().length);
                    const pct = Math.min(100, Math.max(0, (inputLen / targetLen) * 100));
                    return (
                      <div className="bg-flame h-full transition-all duration-300 ease-out" style={{ width: `${pct}%` }}></div>
                    );
                  })()}
               </div>
            </div>
          )}

          {/* EXERCISE STEP: ACTIVE (FILL) */}
          {step === 'ACTIVE' && mode === 'FILL' && (
             <div className="space-y-6 animate-in zoom-in-95">
                <div className="flex justify-between items-center border-b border-oatmeal/10 pb-2">
                 <h3 className="text-flame font-bold">{reference}</h3>
                 <span className="text-xs text-truffle font-bold">{mistakes > 0 && `${mistakes} Mistakes`}</span>
               </div>
               
               {/* Navigation buttons */}
               {activePlanVerseId && user.meditationPlan && (
                <div className="flex items-center justify-center gap-3 -mt-2 mb-2">
                  <button
                    onClick={goToPreviousPlanVerse}
                    disabled={user.meditationPlan.verses.findIndex(v => v.id === activePlanVerseId) === 0}
                    className="p-1.5 rounded-full bg-blue-abyssal border border-oatmeal/20 text-palladian hover:border-flame hover:text-flame disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    title="Previous Verse"
                  >
                    <Icons.Back size={16} />
                  </button>
                  <span className="text-[10px] text-oatmeal">
                    {user.meditationPlan.verses.findIndex(v => v.id === activePlanVerseId) + 1}/{user.meditationPlan.verses.length}
                  </span>
                  <button
                    onClick={goToNextPlanVerse}
                    disabled={user.meditationPlan.verses.findIndex(v => v.id === activePlanVerseId) === user.meditationPlan.verses.length - 1}
                    className="p-1.5 rounded-full bg-blue-abyssal border border-oatmeal/20 text-palladian hover:border-flame hover:text-flame disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    title="Next Verse"
                  >
                    <Icons.Next size={16} />
                  </button>
                </div>
              )}
               <div className="bg-blue-abyssal p-6 rounded-xl border border-oatmeal/20 text-xl font-serif leading-relaxed text-palladian flex flex-wrap gap-2">
                  {puzzleTokens.map((token, idx) => {
                    const isActive = idx === currentBlankIndex;
                    if (token.isHidden) {
                      return <span key={idx} className={`min-w-[50px] border-b-2 text-center transition-colors px-1 ${isActive ? 'border-flame bg-flame/10' : 'border-oatmeal/30 text-transparent select-none'}`}>{isActive ? '_____' : '_____'}</span>;
                    }
                    return <span key={idx}>{token.display}</span>;
                  })}
               </div>
               <div className="pt-4">
                 <p className="text-xs text-center text-oatmeal uppercase tracking-wider mb-3">Select the missing word</p>
                 <div className="grid grid-cols-3 gap-3">
                      {currentBlankIndex !== -1 && puzzleTokens[currentBlankIndex].options?.map((opt, i) => (
                        <button
                          key={i}
                          onClick={() => handleOptionSelect(opt)}
                        disabled={isReadyToScore}
                        className={`p-3 rounded-xl text-sm font-bold border transition-all focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 disabled:opacity-40 disabled:cursor-not-allowed ${isError ? 'bg-truffle/20 border-truffle text-palladian' : 'bg-blue-fantastic border-oatmeal/20 text-palladian'}`}
                        >
                          {opt}
                        </button>
                      ))}
                 </div>
               </div>
               <div className="pt-2 text-center">
                 {isReadyToScore ? (
                   <div className="flex gap-3">
                     <Button onClick={() => calculateScore(mistakes, hintsUsed)} className="flex-1"><Icons.CheckCircle size={18} className="mr-2" />Done</Button>
                     <Button onClick={goToModeSelection} variant="ghost" className="flex-1">Back to Modes</Button>
                   </div>
                 ) : (
                  <Button onClick={goToModeSelection} variant="ghost" size="sm">Cancel</Button>
                 )}
               </div>
             </div>
          )}

          {/* EXERCISE STEP: ACTIVE (SCRAMBLE) */}
          {step === 'ACTIVE' && mode === 'UNJUMBLE' && (
            <div className="space-y-6 animate-in zoom-in-95">
              <div className="flex justify-between items-center border-b border-oatmeal/10 pb-2">
                <h3 className="text-flame font-bold">{reference}</h3>
                <span className="text-xs text-truffle font-bold">{mistakes > 0 && `${mistakes} Mistakes`}</span>
              </div>

              {/* Navigation buttons */}
              {activePlanVerseId && user.meditationPlan && (
                <div className="flex items-center justify-center gap-3 -mt-2 mb-2">
                  <button
                    onClick={goToPreviousPlanVerse}
                    disabled={user.meditationPlan.verses.findIndex(v => v.id === activePlanVerseId) === 0}
                    className="p-1.5 rounded-full bg-blue-abyssal border border-oatmeal/20 text-palladian hover:border-flame hover:text-flame disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    title="Previous Verse"
                  >
                    <Icons.Back size={16} />
                  </button>
                  <span className="text-[10px] text-oatmeal">
                    {user.meditationPlan.verses.findIndex(v => v.id === activePlanVerseId) + 1}/{user.meditationPlan.verses.length}
                  </span>
                  <button
                    onClick={goToNextPlanVerse}
                    disabled={user.meditationPlan.verses.findIndex(v => v.id === activePlanVerseId) === user.meditationPlan.verses.length - 1}
                    className="p-1.5 rounded-full bg-blue-abyssal border border-oatmeal/20 text-palladian hover:border-flame hover:text-flame disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    title="Next Verse"
                  >
                    <Icons.Next size={16} />
                  </button>
                </div>
              )}

              <div className="bg-blue-abyssal p-4 rounded-xl border border-oatmeal/20">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-oatmeal uppercase tracking-wider">Tap words in order</p>
                  <p className="text-[10px] text-oatmeal/70">
                    {unjumbleSelectedIds.length}/{unjumbleExpected.length}
                  </p>
                </div>

                <div className="min-h-[72px] flex flex-wrap gap-2">
                  {unjumbleSelectedIds.length === 0 ? (
                    <span className="text-oatmeal/50 text-sm">Your answer will appear here…</span>
                  ) : (
                    unjumbleSelectedIds.map((id, idx) => {
                      const w = unjumbleExpected.find((t) => t.id === id)?.word;
                      return (
                        <span
                          key={`${id}-${idx}`}
                          className="px-2.5 py-1.5 rounded-lg bg-blue-fantastic border border-oatmeal/10 text-palladian text-sm"
                        >
                          {w}
                        </span>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={undoUnjumble} variant="secondary" className="flex-1" disabled={unjumbleSelectedIds.length === 0}>
                  <Icons.Back size={16} className="mr-2" />Undo
                </Button>
                {unjumbleSelectedIds.length === unjumbleExpected.length ? (
                  <Button
                    onClick={() => calculateScore(mistakes, hintsUsed)}
                    className="flex-1"
                  >
                    <Icons.CheckCircle size={16} className="mr-2" />Done
                  </Button>
                ) : (
                  <Button onClick={resetUnjumble} variant="ghost" className="flex-1">
                    Reset
                  </Button>
                )}
              </div>

              <div className="pt-1">
                <p className="text-xs text-center text-oatmeal uppercase tracking-wider mb-3">Word bank</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {unjumbleBank.map((token) => {
                    const used = unjumbleSelectedIds.includes(token.id);
                    const isWrong = unjumbleWrongId === token.id;
                    return (
                      <button
                        key={token.id}
                        onClick={() => handleUnjumbleWordTap(token)}
                        disabled={used || unjumbleSelectedIds.length === unjumbleExpected.length}
                        className={`px-3 py-2 rounded-xl text-sm font-semibold border transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed ${
                          isWrong || isError
                            ? 'bg-truffle/20 border-truffle text-palladian'
                            : used
                            ? 'bg-blue-abyssal/50 border-oatmeal/10 text-oatmeal/60'
                            : 'bg-blue-fantastic border-oatmeal/20 text-palladian hover:border-flame/50 hover:text-flame'
                        }`}
                      >
                        {token.word}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="text-center pt-2">
                <Button onClick={goToModeSelection} variant="ghost" size="sm">Back to Modes</Button>
              </div>
            </div>
          )}

          {/* EXERCISE STEP: ACTIVE (REVEAL) */}
          {step === 'ACTIVE' && mode === 'REVEAL' && (
             <div className="space-y-6 animate-in zoom-in-95">
               <div className="flex justify-between items-center border-b border-oatmeal/10 pb-2">
                 <h3 className="text-flame font-bold">{reference}</h3>
                 <span className="text-xs text-oatmeal uppercase tracking-wider">{revealType === 'LETTER' ? 'First Letter' : `${revealType} by ${revealType}`}</span>
               </div>
               <div className="bg-blue-abyssal p-6 rounded-xl border border-oatmeal/20 min-h-[200px] flex items-center justify-center">
                 <div className="text-xl font-serif leading-relaxed text-palladian flex flex-wrap gap-x-2 gap-y-1 justify-center text-center">
                   {revealChunks.map((chunk, idx) => {
                     const isRevealed = idx <= revealIndex;
                     let content = chunk;
                     let style = "transition-all duration-300 ";
                     if (revealType === 'LETTER') {
                        if (!isRevealed) {
                          const firstLetter = chunk.replace(/^(\W*)(\w)(.*)$/, '$1$2');
                          const restLength = chunk.length - firstLetter.length;
                          content = (chunk.match(/[a-zA-Z]/)) ? firstLetter + '_'.repeat(Math.max(0, Math.min(3, restLength))) : chunk;
                          style += "text-oatmeal/50";
                        } else style += "text-palladian font-medium";
                     } else {
                        if (!isRevealed) {
                          content = '•'.repeat(Math.min(5, chunk.length));
                          style += "text-blue-abyssal bg-blue-fantastic/50 rounded px-1 select-none animate-pulse";
                        } else style += "text-palladian";
                     }
                     if (idx === revealIndex) style += " text-flame";
                     return <span key={idx} className={style}>{content}</span>;
                   })}
                 </div>
               </div>
               
               {/* Navigation buttons */}
               {activePlanVerseId && user.meditationPlan && (
                <div className="flex items-center justify-center gap-3 -mt-2 mb-2">
                  <button
                    onClick={goToPreviousPlanVerse}
                    disabled={user.meditationPlan.verses.findIndex(v => v.id === activePlanVerseId) === 0}
                    className="p-1.5 rounded-full bg-blue-abyssal border border-oatmeal/20 text-palladian hover:border-flame hover:text-flame disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    title="Previous Verse"
                  >
                    <Icons.Back size={16} />
                  </button>
                  <span className="text-[10px] text-oatmeal">
                    {user.meditationPlan.verses.findIndex(v => v.id === activePlanVerseId) + 1}/{user.meditationPlan.verses.length}
                  </span>
                  <button
                    onClick={goToNextPlanVerse}
                    disabled={user.meditationPlan.verses.findIndex(v => v.id === activePlanVerseId) === user.meditationPlan.verses.length - 1}
                    className="p-1.5 rounded-full bg-blue-abyssal border border-oatmeal/20 text-palladian hover:border-flame hover:text-flame disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    title="Next Verse"
                  >
                    <Icons.Next size={16} />
                  </button>
                </div>
              )}
               
               {isReadyToScore ? (
                 <div className="grid grid-cols-2 gap-4 pt-2">
                   <Button onClick={() => calculateScore(mistakes, hintsUsed)} className="border border-oatmeal/10"><Icons.CheckCircle size={18} className="mr-2" />Done</Button>
                   <Button onClick={goToModeSelection} variant="ghost" className="border border-oatmeal/10">Back to Modes</Button>
                 </div>
               ) : (
                 <div className="grid grid-cols-2 gap-4 pt-2">
                   <Button onClick={handleRevealPrev} variant="ghost" disabled={revealIndex === -1} className="border border-oatmeal/10"><Icons.Back size={18} className="mr-2" />Previous</Button>
                   <Button onClick={handleRevealNext}>{revealIndex === revealChunks.length - 1 ? 'Finish' : 'Reveal Next'}<Icons.Next size={18} className="ml-2" /></Button>
                 </div>
               )}
               <div className="text-center"><p className="text-xs text-oatmeal/40">{revealIndex + 1} / {revealChunks.length} revealed</p></div>
               <div className="text-center pt-2">
                 <Button onClick={goToModeSelection} variant="ghost" size="sm">Back to Modes</Button>
               </div>
             </div>
          )}

          {/* EXERCISE STEP: ACTIVE (SPEAK) */}
          {step === 'ACTIVE' && mode === 'SPEAK' && (
             <div className="space-y-6 md:space-y-8 animate-in zoom-in-95">
               <div className="flex justify-between items-center border-b border-oatmeal/10 pb-2">
                 <h3 className="text-flame font-bold text-base md:text-lg">{reference}</h3>
                 <span className="text-xs text-truffle font-bold">{mistakes > 0 && `${mistakes} Mistakes`}</span>
               </div>
               
               {/* Navigation buttons */}
               {activePlanVerseId && user.meditationPlan && (
                <div className="flex items-center justify-center gap-3 -mt-2 mb-1">
                  <button
                    onClick={goToPreviousPlanVerse}
                    disabled={user.meditationPlan.verses.findIndex(v => v.id === activePlanVerseId) === 0}
                    className="p-1.5 rounded-full bg-blue-abyssal border border-oatmeal/20 text-palladian hover:border-flame hover:text-flame disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    title="Previous Verse"
                  >
                    <Icons.Back size={16} />
                  </button>
                  <span className="text-[10px] text-oatmeal">
                    {user.meditationPlan.verses.findIndex(v => v.id === activePlanVerseId) + 1}/{user.meditationPlan.verses.length}
                  </span>
                  <button
                    onClick={goToNextPlanVerse}
                    disabled={user.meditationPlan.verses.findIndex(v => v.id === activePlanVerseId) === user.meditationPlan.verses.length - 1}
                    className="p-1.5 rounded-full bg-blue-abyssal border border-oatmeal/20 text-palladian hover:border-flame hover:text-flame disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    title="Next Verse"
                  >
                    <Icons.Next size={16} />
                  </button>
                </div>
              )}

               {/* Instructions */}
               <div className="bg-blue-abyssal/50 rounded-xl p-4 border border-oatmeal/20">
                 <p className="text-sm text-palladian text-center">
                   <Icons.Mic size={20} className="inline mr-2 text-flame" />
                   Speak the verse word by word. Use hints to reveal words. Correctly spoken words turn green.
                 </p>
               </div>

               {/* Expected Text - What you should say */}
               <div className="bg-blue-abyssal p-6 rounded-2xl border border-oatmeal/20 min-h-[200px]">
                 <h4 className="text-xs font-semibold text-oatmeal/60 mb-3 uppercase tracking-wide">Expected Text</h4>
                 <div className="flex flex-wrap gap-2 text-lg leading-relaxed">
                   {verseWords.map((word, idx) => {
                     const isSpoken = idx < spokenWords.length;
                     const isCurrent = idx === currentWordIndex;
                     const isMistake = mistakeIndices.has(idx);
                     const isRevealed = revealedWordIndices.has(idx);
                     const isFlashing = flashingWordIndex === idx;
                     const shouldShow = isSpoken || isRevealed;
                     
                     return (
                       <span
                         key={idx}
                         className={`px-2 py-1 rounded transition-all duration-300 ${
                           isFlashing
                             ? 'bg-red-600 text-white animate-pulse'
                             : isSpoken
                             ? 'bg-green-600/30 text-green-400 font-semibold'
                             : isCurrent && isRevealed
                             ? 'bg-flame/30 text-flame font-semibold ring-2 ring-flame'
                             : isMistake && isRevealed
                             ? 'bg-red-600/30 text-red-400'
                             : isRevealed
                             ? 'text-oatmeal/60'
                             : 'text-oatmeal/10'
                         }`}
                       >
                         {shouldShow ? verseText.split(' ')[idx] : '___'}
                       </span>
                     );
                   })}
                 </div>
               </div>

               {/* What You Said */}
               {currentTranscript && (
                 <div className="bg-blue-fantastic/30 p-6 rounded-2xl border border-oatmeal/20 min-h-[120px]">
                   <h4 className="text-xs font-semibold text-oatmeal/60 mb-3 uppercase tracking-wide">You Said</h4>
                   <div className="text-lg leading-relaxed text-palladian">
                     {currentTranscript}
                   </div>
                 </div>
               )}

               {/* Progress */}
               <div className="text-center space-y-2">
                 <div className="text-sm text-oatmeal">
                   Progress: <span className="text-flame font-bold">{spokenWords.length}/{verseWords.length}</span> words
                 </div>
                 <div className="w-full bg-blue-abyssal/50 rounded-full h-2 overflow-hidden">
                   <div 
                     className="h-full bg-flame transition-all duration-300"
                     style={{ width: `${(spokenWords.length / verseWords.length) * 100}%` }}
                   />
                 </div>
               </div>

               {/* Controls */}
               <div className="flex flex-col items-center space-y-4">
                 <div className="flex items-center justify-center space-x-4">
                   {!isListening ? (
                     <button 
                       onClick={startRecognition}
                       disabled={isReadyToScore}
                       className="px-8 py-4 bg-flame text-blue-abyssal rounded-full font-semibold hover:scale-105 transition-transform flex items-center space-x-2"
                     >
                       <Icons.Mic size={24} />
                       <span>Start Speaking</span>
                     </button>
                   ) : (
                     <button 
                       onClick={stopRecognition}
                       className="px-8 py-4 bg-truffle text-white rounded-full font-semibold hover:scale-105 transition-transform flex items-center space-x-2 animate-pulse"
                     >
                       <Icons.Stop size={24} />
                       <span>Stop</span>
                     </button>
                   )}
                 </div>
                 {currentWordIndex < verseWords.length && (
                   <button 
                     onClick={handleSpeakHint}
                     className="px-6 py-2 bg-blue-abyssal border border-oatmeal/30 text-oatmeal rounded-lg hover:border-flame hover:text-flame transition-all flex items-center space-x-2"
                   >
                     <Icons.Eye size={18} />
                     <span className="text-sm">Reveal Next Word</span>
                   </button>
                 )}

                 {isReadyToScore && (
                   <div className="flex gap-3 pt-1 w-full">
                     <Button onClick={() => calculateScore(mistakes, hintsUsed)} className="flex-1"><Icons.CheckCircle size={18} className="mr-2" />Done</Button>
                     <Button onClick={goToModeSelection} variant="ghost" className="flex-1">Back to Modes</Button>
                   </div>
                 )}
               </div>

               {error && (
                 <div className="bg-red-600/20 border border-red-600/50 rounded-xl p-4">
                   <p className="text-red-400 text-sm text-center">{error}</p>
                 </div>
               )}

               <div className="text-center pt-4">
                 <Button onClick={goToModeSelection} variant="ghost" size="sm">Back to Modes</Button>
               </div>
             </div>
          )}

          {/* EXERCISE STEP: RESULT */}
          {step === 'RESULT' && (
            <div className="space-y-6 animate-in zoom-in-95">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-blue-abyssal border-4 border-flame mb-4 relative">
                  <span className="text-3xl font-bold text-palladian">{score}%</span>
                </div>
                <h3 className="text-xl font-bold text-palladian mb-2">
                  {score === 100 ? "Perfect!" : score >= 80 ? "Great Job!" : "Keep Practicing!"}
                </h3>
                <p className="text-oatmeal text-sm">
                  Mistakes: <span className="text-truffle font-bold">{mistakes}</span> • 
                  Hints: <span className="text-flame font-bold">{hintsUsed}</span>
                </p>
              </div>

              {/* Navigation buttons (plan verses) */}
              {activePlanVerseId && user.meditationPlan && (
                <div className="flex items-center justify-center gap-3 -mt-2">
                  <button
                    onClick={goToPreviousPlanVerse}
                    disabled={user.meditationPlan.verses.findIndex(v => v.id === activePlanVerseId) === 0}
                    className="p-2 rounded-full bg-blue-abyssal border border-oatmeal/20 text-palladian hover:border-flame hover:text-flame disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    title="Previous Verse"
                  >
                    <Icons.Back size={18} />
                  </button>
                  <span className="text-xs text-oatmeal">
                    Verse {user.meditationPlan.verses.findIndex(v => v.id === activePlanVerseId) + 1} of {user.meditationPlan.verses.length}
                  </span>
                  <button
                    onClick={goToNextPlanVerse}
                    disabled={user.meditationPlan.verses.findIndex(v => v.id === activePlanVerseId) === user.meditationPlan.verses.length - 1}
                    className="p-2 rounded-full bg-blue-abyssal border border-oatmeal/20 text-palladian hover:border-flame hover:text-flame disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    title="Next Verse"
                  >
                    <Icons.Next size={18} />
                  </button>
                </div>
              )}

              {/* Detailed Feedback */}
              {(mistakes > 0 || hintsUsed > 0) && mode === 'TYPE' && (
                <div className="bg-blue-fantastic/30 rounded-xl p-4 space-y-4">
                  <h4 className="text-palladian font-semibold mb-3">Word-by-Word Feedback</h4>
                  
                  {/* Word-by-word breakdown */}
                  <div className="space-y-2">
                    {verseText.split(' ').map((word, wordIdx) => {
                      // Calculate character indices for this word
                      const wordsBeforeCurrent = verseText.split(' ').slice(0, wordIdx);
                      const startIdx = wordsBeforeCurrent.reduce((sum, w) => sum + w.length + 1, 0);
                      const endIdx = startIdx + word.length;
                      
                      // Check if this word has mistakes or hints
                      let hasMistake = false;
                      let hasHint = false;
                      const mistakeChars: number[] = [];
                      const hintChars: number[] = [];
                      
                      for (let i = startIdx; i < endIdx; i++) {
                        if (mistakeIndices.has(i)) {
                          hasMistake = true;
                          mistakeChars.push(i - startIdx);
                        }
                        if (hintIndices.has(i)) {
                          hasHint = true;
                          hintChars.push(i - startIdx);
                        }
                      }
                      
                      if (!hasMistake && !hasHint) return null;
                      
                      return (
                        <div key={wordIdx} className="bg-blue-abyssal/50 rounded-lg p-3">
                          <div className="flex items-start gap-3">
                            <span className="text-oatmeal/60 text-xs font-mono">#{wordIdx + 1}</span>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-lg font-semibold">
                                  {word.split('').map((char, charIdx) => (
                                    <span
                                      key={charIdx}
                                      className={
                                        mistakeChars.includes(charIdx)
                                          ? 'text-truffle'
                                          : hintChars.includes(charIdx)
                                          ? 'text-flame'
                                          : 'text-palladian'
                                      }
                                    >
                                      {char}
                                    </span>
                                  ))}
                                </span>
                                {hasMistake && (
                                  <span className="text-xs px-2 py-0.5 bg-truffle/20 text-truffle rounded">
                                    {mistakeChars.length} {mistakeChars.length === 1 ? 'error' : 'errors'}
                                  </span>
                                )}
                                {hasHint && (
                                  <span className="text-xs px-2 py-0.5 bg-flame/20 text-flame rounded">
                                    hint used
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-oatmeal/70">
                                {hasMistake && `Mistakes at position${mistakeChars.length > 1 ? 's' : ''}: ${mistakeChars.map(i => i + 1).join(', ')}`}
                                {hasMistake && hasHint && ' • '}
                                {hasHint && 'Revealed with hint'}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    }).filter(Boolean)}
                  </div>

                  {/* Legend */}
                  <div className="flex gap-4 text-xs pt-3 border-t border-oatmeal/10">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-truffle rounded"></div>
                      <span className="text-oatmeal">Mistakes (-2 pts each)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-flame rounded"></div>
                      <span className="text-oatmeal">Hints (-10 pts each)</span>
                    </div>
                  </div>

                  {/* Score breakdown */}
                  <div className="text-xs text-oatmeal/70 pt-2 border-t border-oatmeal/10">
                    <p>Score: 100 - ({mistakes} mistakes × 2) - ({hintsUsed} hints × 10) = {score}%</p>
                  </div>
                </div>
              )}

              {mistakes > 0 && mode === 'FILL' && (
                <div className="bg-blue-fantastic/30 rounded-xl p-4 space-y-4">
                  <h4 className="text-palladian font-semibold mb-3">Word-by-Word Feedback</h4>
                  
                  <div className="space-y-2">
                    {puzzleTokens.filter((token, idx) => wrongTokenIds.has(idx)).map((token) => (
                      <div key={token.id} className="bg-blue-abyssal/50 rounded-lg p-3">
                        <div className="flex items-start gap-3">
                          <span className="text-oatmeal/60 text-xs font-mono">#{token.id + 1}</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-lg font-semibold text-truffle">
                                {token.word}
                              </span>
                              <span className="text-xs px-2 py-0.5 bg-truffle/20 text-truffle rounded">
                                incorrect
                              </span>
                            </div>
                            <p className="text-xs text-oatmeal/70">
                              Had {wrongTokenIds.has(token.id) ? 'multiple' : 'one'} incorrect {wrongTokenIds.has(token.id) ? 'attempts' : 'attempt'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="text-xs text-oatmeal/70 pt-3 border-t border-oatmeal/10">
                    <p>Score: 100 - ({mistakes} mistakes × 2) = {score}%</p>
                  </div>
                </div>
              )}

              {mistakes > 0 && mode === 'REVEAL' && (
                <div className="bg-blue-fantastic/30 rounded-xl p-4 space-y-4">
                  <h4 className="text-palladian font-semibold mb-3">Section-by-Section Feedback</h4>
                  
                  <div className="bg-blue-abyssal/50 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Icons.Repeat size={20} className="text-truffle" />
                      <div>
                        <p className="text-palladian font-semibold">Reviewed Previous Sections</p>
                        <p className="text-oatmeal/70 text-sm">Went back {mistakes} {mistakes === 1 ? 'time' : 'times'}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-oatmeal">Total sections:</span>
                        <span className="text-palladian font-semibold">{revealChunks.length}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-oatmeal">Back steps taken:</span>
                        <span className="text-truffle font-semibold">{mistakes}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-oatmeal">Penalty per back step:</span>
                        <span className="text-truffle font-semibold">-2 points</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-oatmeal/70 pt-3 border-t border-oatmeal/10">
                    <p>Score: 100 - ({mistakes} back steps × 2) = {score}%</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <Button onClick={retry} variant="secondary">
                  <Icons.Repeat size={18} className="mr-2" />
                  Retry
                </Button>
                <Button onClick={resetExercise}>
                  <Icons.CheckCircle size={18} className="mr-2" />
                  Done
                </Button>
              </div>
            </div>
          )}

        </div>
      </div>
      
      {/* Help Modal */}
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} section="MEMORIZE" />
      
      {/* Completion Modal */}
      <Modal isOpen={showCompletionModal} onClose={() => {
        console.log('Modal close button clicked');
        setShowCompletionModal(false);
      }} title="Plan Complete!">
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="w-20 h-20 bg-flame rounded-full flex items-center justify-center mx-auto shadow-lg shadow-black/20">
              <Icons.CheckCircle size={40} className="text-blue-abyssal" />
            </div>
          </div>
          
          <div>
            <h3 className="text-xl font-bold text-flame mb-2">Congratulations!</h3>
            <p className="text-oatmeal">
              You've memorized all verses in your meditation plan. The Word is now hidden in your heart.
            </p>
          </div>
          
          <div className="bg-flame/15 p-4 rounded-xl border border-flame/30">
            <p className="text-sm font-medium text-flame">{completedPlanDetails}</p>
          </div>
          
          <div className="bg-blue-abyssal/30 p-4 rounded-lg border border-oatmeal/10">
            <p className="text-sm text-oatmeal/90 leading-relaxed italic">
              "I have hidden your word in my heart that I might not sin against you." - Psalm 119:11
            </p>
          </div>
          
          <div className="space-y-3">
            <p className="text-sm text-palladian font-medium">
              Would you like to record this accomplishment in your daily journal?
            </p>
            
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={handleRecordToJournal}>
                <Icons.Book size={16} className="mr-2" />
                Record to Journal
              </Button>
              <Button variant="ghost" onClick={() => setShowCompletionModal(false)}>
                Not Now
              </Button>
            </div>
            
            <div className="pt-2 border-t border-oatmeal/10">
              <p className="text-xs text-oatmeal/70 mb-2">
                Clear this plan to start a new one?
              </p>
              <Button 
                onClick={() => {
                  setShowCompletionModal(false);
                  handleResetPlan();
                }} 
                variant="ghost" 
                className="w-full text-truffle hover:text-flame"
              >
                <Icons.X size={16} className="mr-2" />
                Clear Plan
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};