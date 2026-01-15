import React, { useState, useEffect, useLayoutEffect } from 'react';
import { UserProfile, JournalEntry, RuleOfLifePlan, RulePractice, ManualCompletion, PracticeCategory } from '../types';
import { Button, Icons, Input, Modal, Textarea } from './Shared';
import { CANONICAL_PRACTICES, STARTERS, StarterPreset } from '../constants/practices';

interface RuleOfLifeProps {
  user: UserProfile;
  onUpdateUser: (user: UserProfile) => void;
  onSaveJournalEntry?: (entry: JournalEntry) => void;
  onDeleteJournalEntry?: (id: string) => Promise<void>;
  onClose: () => void;
  journalEntries?: JournalEntry[];
}

type RuleView = 'INTRO' | 'WEEK' | 'MANAGE' | 'HISTORY' | 'EDIT_PRACTICE' | 'REFLECTION';

export const RuleOfLife: React.FC<RuleOfLifeProps> = ({ 
  user, 
  onUpdateUser, 
  onSaveJournalEntry,
  onClose,
  journalEntries = []
}) => {
  // Determine if this is first-time entry
  const isFirstTime = !user.ruleOfLife;
  
  // View state
  const [view, setView] = useState<RuleView>(isFirstTime ? 'INTRO' : 'WEEK');
  
  // Current rule
  const [rule, setRule] = useState<RuleOfLifePlan | null>(user.ruleOfLife || null);
  
  // Engagement modal state
  const [engagementModal, setEngagementModal] = useState<{
    isOpen: boolean;
    practice: RulePractice | null;
    date: number;
  }>({ isOpen: false, practice: null, date: Date.now() });
  
  const [engagementReflection, setEngagementReflection] = useState('');
  const [journalPromptModal, setJournalPromptModal] = useState<{
    isOpen: boolean;
    practice: RulePractice | null;
    reflection: string;
    date: number;
  }>({ isOpen: false, practice: null, reflection: '', date: Date.now() });
  const [uncheckModal, setUncheckModal] = useState<{
    isOpen: boolean;
    practice: RulePractice | null;
    date: number;
    hasJournalEntry: boolean;
  }>({ isOpen: false, practice: null, date: Date.now(), hasJournalEntry: false });
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  
  // Weekly reflection modal
  const [weeklyReflectionModal, setWeeklyReflectionModal] = useState(false);
  const [weeklyReflectionText, setWeeklyReflectionText] = useState('');
  
  // Historical reflection editing
  const [editingHistoricalWeek, setEditingHistoricalWeek] = useState<number | null>(null); // index of week being edited
  const [historicalReflectionText, setHistoricalReflectionText] = useState('');
  
  // Management state
  const [editingPractice, setEditingPractice] = useState<RulePractice | null>(null);
  const [showAddPractice, setShowAddPractice] = useState(false);
  
  // Practice form state
  const [practiceForm, setPracticeForm] = useState<{
    category: PracticeCategory;
    customName: string;
    description: string;
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
    target: number;
    scheduledDays: number[];
    linkedAppPractice?: 'DAILY_EXAMEN' | 'LECTIO' | 'SILENCE_TIMER' | 'GRATITUDE_LIST' | 'MEMORIZE';
  }>({
    category: 'SCRIPTURE',
    customName: '',
    description: '',
    frequency: 'WEEKLY',
    target: 1,
    scheduledDays: [],
    linkedAppPractice: undefined,
  });
  
  // Sync rule changes to user profile
  useEffect(() => {
    if (rule && JSON.stringify(rule) !== JSON.stringify(user.ruleOfLife)) {
      console.log('Saving Rule of Life changes:', { rule, userId: user.uid });
      onUpdateUser({ ...user, ruleOfLife: rule });
    }
  }, [rule, user, onUpdateUser]);
  
  // Check for week transition and archive previous week's reflection
  useEffect(() => {
    if (!rule) return;
    
    const now = new Date();
    const { weekStart } = getWeekBoundaries(now, rule.weekStartDay);
    const currentWeekStartTimestamp = weekStart.getTime();
    
    // If currentWeekStart is not set, initialize it
    if (!rule.currentWeekStart) {
      setRule({
        ...rule,
        currentWeekStart: currentWeekStartTimestamp,
        weeklyHistory: rule.weeklyHistory || []
      });
      return;
    }
    
    // Check if we've transitioned to a new week
    if (currentWeekStartTimestamp !== rule.currentWeekStart) {
      console.log('Week transition detected, archiving previous week');
      
      // Get previous week boundaries
      const prevWeekStart = new Date(rule.currentWeekStart);
      const prevWeekEnd = new Date(prevWeekStart);
      prevWeekEnd.setDate(prevWeekStart.getDate() + 6);
      prevWeekEnd.setHours(23, 59, 59, 999);
      
      // Only archive if there's a reflection or completions from that week
      const prevWeekCompletions = rule.manualCompletions.filter(comp => {
        const compDate = new Date(comp.date);
        return compDate >= prevWeekStart && compDate <= prevWeekEnd;
      });
      
      if (rule.weeklyReflection || prevWeekCompletions.length > 0) {
        // Build practices summary for the previous week
        const practicesSummary = rule.practices.map(practice => {
          const practiceCompletions = prevWeekCompletions.filter(c => c.practiceId === practice.id);
          const reflections = practiceCompletions
            .map(c => c.reflection)
            .filter((r): r is string => !!r);
          
          return {
            practiceId: practice.id,
            practiceName: getPracticeName(practice),
            engagementCount: practiceCompletions.length,
            reflections
          };
        });
        
        const historicalEntry = {
          weekStart: rule.currentWeekStart,
          weekEnd: prevWeekEnd.getTime(),
          reflection: rule.weeklyReflection || '',
          practicesSummary
        };
        
        // Add to history (newest first)
        const updatedHistory = [historicalEntry, ...(rule.weeklyHistory || [])];
        
        // Keep only last 52 weeks
        const trimmedHistory = updatedHistory.slice(0, 52);
        
        setRule({
          ...rule,
          currentWeekStart: currentWeekStartTimestamp,
          weeklyReflection: '', // Clear the reflection for new week
          weeklyHistory: trimmedHistory
        });
      } else {
        // No data to archive, just update the week start
        setRule({
          ...rule,
          currentWeekStart: currentWeekStartTimestamp,
          weeklyReflection: ''
        });
      }
    }
  }, [rule]); // Run when rule changes or on mount
  
  // Scroll to top when view changes (useLayoutEffect for synchronous scroll before paint)
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);
  
  // Scroll to top when any modal opens
  useLayoutEffect(() => {
    if (showAddPractice || engagementModal.isOpen || weeklyReflectionModal) {
      window.scrollTo(0, 0);
    }
  }, [showAddPractice, engagementModal.isOpen, weeklyReflectionModal]);
  
  // HELPER FUNCTIONS
  
  // Get week boundaries
  const getWeekBoundaries = (date: Date, weekStartDay: 'MONDAY' | 'SUNDAY') => {
    const day = date.getDay();
    const startOffset = weekStartDay === 'MONDAY' 
      ? (day === 0 ? -6 : 1 - day) 
      : -day;
    
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() + startOffset);
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    return { weekStart, weekEnd };
  };
  
  // Get current week dates
  const getCurrentWeekDates = () => {
    if (!rule) return [];
    const { weekStart } = getWeekBoundaries(new Date(), rule.weekStartDay);
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      dates.push(date);
    }
    return dates;
  };
  
  // Check if practice is engaged on a date (or how many times for daily practices)
  const getPracticeCompletionCount = (practice: RulePractice, date: Date): number => {
    const dateStr = date.toDateString();
    
    // Count manual completions
    const manualCount = rule?.manualCompletions.filter(c => 
      c.practiceId === practice.id && 
      new Date(c.date).toDateString() === dateStr
    ).length || 0;
    
    // Check journal entries for linked practices (counts as 1)
    let journalCount = 0;
    if (practice.linkedAppPractice && journalEntries.length > 0) {
      const hasJournalEntry = journalEntries.some(entry => {
        if (new Date(entry.date).toDateString() !== dateStr) return false;
        
        switch (practice.linkedAppPractice) {
          case 'LECTIO':
            return !!entry.lectioPassage;
          case 'SILENCE_TIMER':
            return !!entry.silencePractice;
          case 'GRATITUDE_LIST':
            return !!entry.gratitudePractice;
          case 'MEMORIZE':
            return !!entry.memorizationCompletion;
          case 'DAILY_EXAMEN':
            return !!entry.review;
          default:
            return false;
        }
      });
      if (hasJournalEntry) journalCount = 1;
    }
    
    return manualCount + journalCount;
  };
  
  // Check if practice is fully engaged (all instances completed)
  const isPracticeEngaged = (practice: RulePractice, date: Date): boolean => {
    const completionCount = getPracticeCompletionCount(practice, date);
    
    // For daily practices, check if count meets target
    if (practice.frequency === 'DAILY') {
      const target = practice.targetPerWeek || 1;
      return completionCount >= target;
    }
    
    // For weekly/monthly, any completion counts as engaged
    return completionCount > 0;
  };
  
  // Count engagements for a practice in current period
  const getEngagementCount = (practice: RulePractice): number => {
    const now = new Date();
    
    if (practice.frequency === 'DAILY' || practice.frequency === 'WEEKLY') {
      const { weekStart, weekEnd } = getWeekBoundaries(now, rule!.weekStartDay);
      const weekDates: Date[] = [];
      for (let d = new Date(weekStart); d <= weekEnd; d.setDate(d.getDate() + 1)) {
        weekDates.push(new Date(d));
      }
      return weekDates.filter(date => isPracticeEngaged(practice, date)).length;
    } else {
      // Monthly
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const monthDates: Date[] = [];
      for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
        monthDates.push(new Date(d));
      }
      return monthDates.filter(date => isPracticeEngaged(practice, date)).length;
    }
  };
  
  // Get practice display name
  const getPracticeName = (practice: RulePractice): string => {
    if (practice.category === 'CUSTOM') {
      return practice.customName || 'Custom Practice';
    }
    return CANONICAL_PRACTICES[practice.category].name;
  };
  
  // Get next reflection prompt for a practice
  const getNextPrompt = (practice: RulePractice): string => {
    if (practice.category === 'CUSTOM') return 'How did this practice shape you today?';
    
    const prompts = CANONICAL_PRACTICES[practice.category].reflectionPrompts;
    const used = practice.usedPrompts || [];
    
    // Find first unused prompt, or cycle back to start
    const unused = prompts.filter(p => !used.includes(p));
    return unused.length > 0 ? unused[0] : prompts[0];
  };
  
  // Get all prompts for a practice
  const getAllPrompts = (practice: RulePractice): string[] => {
    if (practice.category === 'CUSTOM') return ['How did this practice shape you today?'];
    return CANONICAL_PRACTICES[practice.category].reflectionPrompts;
  };
  
  // EVENT HANDLERS
  
  // Handle starter selection
  const handleStarterSelect = (starter: StarterPreset | null) => {
    const newRule: RuleOfLifePlan = {
      id: Math.random().toString(36).substr(2, 9),
      name: starter ? `${starter.name} Rule` : 'My Rule of Life',
      startDate: Date.now(),
      weekStartDay: 'MONDAY',
      practices: starter ? starter.practices.map(p => ({
        id: Math.random().toString(36).substr(2, 9),
        category: p.category,
        description: p.commitment,
        frequency: p.frequency,
        ...(p.frequency === 'WEEKLY' && { targetPerWeek: p.target, scheduledDays: p.scheduledDays }),
        ...(p.frequency === 'DAILY' && { targetPerWeek: p.target }),
        ...(p.frequency === 'MONTHLY' && { targetPerMonth: p.target }),
      })) : [],
      manualCompletions: [],
    };
    
    setRule(newRule);
    setView('WEEK');
  };
  
  // Handle practice engagement
  const handleEngagePractice = (practice: RulePractice, date: Date) => {
    // Check if already engaged
    if (isPracticeEngaged(practice, date)) {
      return;
    }
    
    // Navigate to reflection page
    setEngagementModal({ isOpen: false, practice, date: date.getTime() });
    setSelectedPrompt(getNextPrompt(practice));
    setEngagementReflection('');
    setView('REFLECTION');
  };
  
  // Handle unchecking a practice
  const handleUncheckPractice = (practice: RulePractice, date: Date) => {
    // Check if there's a journal entry with this practice's reflection
    const dateStr = date.toDateString();
    const journalEntry = journalEntries?.find(e => new Date(e.date).toDateString() === dateStr);
    const hasJournalEntry = journalEntry?.rulePracticeReflections?.some(
      r => r.practiceId === practice.id
    ) || false;
    
    setUncheckModal({
      isOpen: true,
      practice,
      date: date.getTime(),
      hasJournalEntry,
    });
  };
  
  // Confirm engagement
  const confirmEngagement = () => {
    if (!engagementModal.practice || !rule) return;
    
    const completion: ManualCompletion = {
      practiceId: engagementModal.practice.id,
      date: engagementModal.date,
      ...(engagementReflection.trim() && { reflection: engagementReflection.trim() }),
    };
    
    // Update rule with new completion
    const updatedRule = {
      ...rule,
      manualCompletions: [...rule.manualCompletions, completion],
    };
    
    // Mark prompt as used
    if (selectedPrompt && engagementModal.practice.category !== 'CUSTOM') {
      const practiceIndex = updatedRule.practices.findIndex(p => p.id === engagementModal.practice!.id);
      if (practiceIndex !== -1) {
        updatedRule.practices[practiceIndex] = {
          ...updatedRule.practices[practiceIndex],
          usedPrompts: [
            ...(updatedRule.practices[practiceIndex].usedPrompts || []),
            selectedPrompt,
          ],
        };
      }
    }
    
    setRule(updatedRule);
    
    // If there's a reflection, offer to add to journal
    if (engagementReflection.trim()) {
      setJournalPromptModal({
        isOpen: true,
        practice: engagementModal.practice,
        reflection: engagementReflection.trim(),
        date: engagementModal.date,
      });
    }
    
    // Go back to week view
    setView('WEEK');
    setEngagementModal({ isOpen: false, practice: null, date: Date.now() });
    setEngagementReflection('');
    setSelectedPrompt(null);
  };
  
  // Save weekly reflection
  const saveWeeklyReflection = () => {
    if (!rule) return;
    
    const updatedRule = {
      ...rule,
      weeklyReflection: weeklyReflectionText.trim(),
    };
    
    setRule(updatedRule);
    setWeeklyReflectionModal(false);
  };
  
  // Update historical weekly reflection
  const updateHistoricalReflection = (index: number) => {
    if (!rule || !rule.weeklyHistory) return;
    
    const updatedHistory = [...rule.weeklyHistory];
    updatedHistory[index] = {
      ...updatedHistory[index],
      reflection: historicalReflectionText.trim()
    };
    
    setRule({
      ...rule,
      weeklyHistory: updatedHistory
    });
    
    setEditingHistoricalWeek(null);
    setHistoricalReflectionText('');
  };
  
  // Delete historical week
  const deleteHistoricalWeek = (index: number) => {
    if (!rule || !rule.weeklyHistory) return;
    
    const updatedHistory = rule.weeklyHistory.filter((_, i) => i !== index);
    
    setRule({
      ...rule,
      weeklyHistory: updatedHistory
    });
  };
  
  // Save practice reflection to journal
  const savePracticeReflectionToJournal = () => {
    if (!journalPromptModal.practice || !onSaveJournalEntry) {
      setJournalPromptModal({ isOpen: false, practice: null, reflection: '', date: Date.now() });
      return;
    }
    
    const dateStr = new Date(journalPromptModal.date).toDateString();
    const existingEntry = journalEntries?.find(e => new Date(e.date).toDateString() === dateStr);
    
    const practiceName = getPracticeName(journalPromptModal.practice);
    console.log('Saving practice reflection:', {
      practiceId: journalPromptModal.practice.id,
      practiceCategory: journalPromptModal.practice.category,
      practiceName,
      reflection: journalPromptModal.reflection
    });
    
    const practiceReflectionEntry = {
      practiceId: journalPromptModal.practice.id,
      practiceName,
      reflection: journalPromptModal.reflection,
      timestamp: Date.now(),
    };
    
    if (existingEntry) {
      // Update existing entry
      const updated: JournalEntry = {
        ...existingEntry,
        rulePracticeReflections: [
          ...(existingEntry.rulePracticeReflections || []),
          practiceReflectionEntry,
        ],
      };
      onSaveJournalEntry(updated);
    } else {
      // Create new entry
      const newEntry: JournalEntry = {
        id: Math.random().toString(36).substr(2, 9),
        date: journalPromptModal.date,
        gratitude: '',
        review: '',
        repentance: '',
        hope: '',
        aiPrayer: '',
        rulePracticeReflections: [practiceReflectionEntry],
      };
      onSaveJournalEntry(newEntry);
    }
    
    setJournalPromptModal({ isOpen: false, practice: null, reflection: '', date: Date.now() });
  };
  
  // Confirm uncheck with optional journal entry deletion
  const confirmUncheck = (deleteJournalEntry: boolean) => {
    if (!uncheckModal.practice || !rule) {
      setUncheckModal({ isOpen: false, practice: null, date: Date.now(), hasJournalEntry: false });
      return;
    }
    
    const dateStr = new Date(uncheckModal.date).toDateString();
    
    // Remove ONE manual completion (the most recent one for this practice on this date)
    const completionsForPracticeOnDate = rule.manualCompletions.filter(c => 
      c.practiceId === uncheckModal.practice!.id &&
      new Date(c.date).toDateString() === dateStr
    );
    
    // Remove the most recent completion
    let removedOne = false;
    const updatedCompletions = rule.manualCompletions.filter(c => {
      if (removedOne) return true;
      if (c.practiceId === uncheckModal.practice!.id && new Date(c.date).toDateString() === dateStr) {
        // Skip the first matching completion (remove it)
        removedOne = true;
        return false;
      }
      return true;
    });
    
    // Update rule
    const updatedRule = {
      ...rule,
      manualCompletions: updatedCompletions,
    };
    setRule(updatedRule);
    
    // Handle journal entry deletion if requested
    // Only delete if this was the LAST completion for this practice on this date
    if (deleteJournalEntry && uncheckModal.hasJournalEntry && onSaveJournalEntry && completionsForPracticeOnDate.length === 1) {
      const journalEntry = journalEntries?.find(e => new Date(e.date).toDateString() === dateStr);
      if (journalEntry?.rulePracticeReflections) {
        const updatedReflections = journalEntry.rulePracticeReflections.filter(
          r => r.practiceId !== uncheckModal.practice!.id
        );
        const updatedEntry: JournalEntry = {
          ...journalEntry,
          rulePracticeReflections: updatedReflections.length > 0 ? updatedReflections : undefined,
        };
        onSaveJournalEntry(updatedEntry);
      }
    }
    
    setUncheckModal({ isOpen: false, practice: null, date: Date.now(), hasJournalEntry: false });
  };
  
  // Add new practice
  const handleAddPractice = () => {
    if (!rule) return;
    
    const newPractice: RulePractice = {
      id: Math.random().toString(36).substr(2, 9),
      category: practiceForm.category,
      ...(practiceForm.category === 'CUSTOM' && { customName: practiceForm.customName }),
      description: practiceForm.description,
      frequency: practiceForm.frequency,
      ...(practiceForm.frequency === 'DAILY' && { targetPerWeek: practiceForm.target }),
      ...(practiceForm.frequency === 'WEEKLY' && { 
        targetPerWeek: practiceForm.target,
        scheduledDays: practiceForm.scheduledDays,
      }),
      ...(practiceForm.frequency === 'MONTHLY' && { targetPerMonth: practiceForm.target }),
      ...(practiceForm.linkedAppPractice && { linkedAppPractice: practiceForm.linkedAppPractice }),
    };
    
    const updatedRule = {
      ...rule,
      practices: [...rule.practices, newPractice],
    };
    
    setRule(updatedRule);
    setView('MANAGE');
    resetPracticeForm();
  };
  
  // Edit existing practice
  const handleSavePracticeEdit = () => {
    if (!rule || !editingPractice) return;
    
    console.log('Saving practice edit:', {
      editingPractice,
      practiceForm,
      frequency: practiceForm.frequency,
      target: practiceForm.target,
    });
    
    const updatedPractices = rule.practices.map(p => {
      if (p.id === editingPractice.id) {
        // Build the updated practice from scratch to ensure old fields are removed
        const updated: RulePractice = {
          id: p.id,
          category: practiceForm.category,
          description: practiceForm.description,
          frequency: practiceForm.frequency,
        };
        
        // Add custom name if applicable
        if (practiceForm.category === 'CUSTOM') {
          updated.customName = practiceForm.customName;
        }
        
        // Add frequency-specific fields
        if (practiceForm.frequency === 'DAILY') {
          updated.targetPerWeek = practiceForm.target;
        } else if (practiceForm.frequency === 'WEEKLY') {
          updated.targetPerWeek = practiceForm.target;
          updated.scheduledDays = practiceForm.scheduledDays;
        } else if (practiceForm.frequency === 'MONTHLY') {
          updated.targetPerMonth = practiceForm.target;
        }
        
        // Add linkedAppPractice if set
        if (practiceForm.linkedAppPractice) {
          updated.linkedAppPractice = practiceForm.linkedAppPractice;
        }
        
        console.log('Updated practice object:', updated);
        
        return updated;
      }
      return p;
    });
    
    setRule({ ...rule, practices: updatedPractices });
    setView('MANAGE');
    setEditingPractice(null);
    resetPracticeForm();
  };
  
  // Delete practice
  const handleDeletePractice = (practiceId: string) => {
    if (!rule) return;
    
    const updatedPractices = rule.practices.filter(p => p.id !== practiceId);
    setRule({ ...rule, practices: updatedPractices });
  };
  
  // Reset practice form
  const resetPracticeForm = () => {
    setPracticeForm({
      category: 'SCRIPTURE',
      customName: '',
      description: '',
      frequency: 'WEEKLY',
      target: 1,
      scheduledDays: [],
      linkedAppPractice: undefined,
    });
  };
  
  // Start editing a practice
  const startEditPractice = (practice: RulePractice) => {
    setPracticeForm({
      category: practice.category,
      customName: practice.customName || '',
      description: practice.description,
      frequency: practice.frequency,
      target: practice.frequency === 'MONTHLY' 
        ? (practice.targetPerMonth || 1)
        : (practice.targetPerWeek || 1),
      scheduledDays: practice.scheduledDays || [],
      linkedAppPractice: practice.linkedAppPractice,
    });
    setEditingPractice(practice);
  };
  
  // Load example commitment
  const loadExampleCommitment = (commitment: string) => {
    setPracticeForm(prev => ({ ...prev, description: commitment }));
  };
  
  // Render text with clickable URLs
  const renderTextWithUrls = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-flame hover:text-flame/80 underline"
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };
  
  // Continue to part 2...
  
  // RENDER FUNCTIONS
  
  const renderIntro = () => (
    <div className="min-h-screen bg-gradient-to-b from-blue-abyssal to-blue-fantastic px-3 sm:px-6 lg:px-12 py-6 sm:py-8 animate-in slide-in-from-bottom duration-500 pb-24">
      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex p-4 sm:p-6 bg-flame/20 rounded-2xl mb-4 sm:mb-6">
            <Icons.Scroll size={40} className="sm:size-12 text-flame" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-palladian mb-3 sm:mb-4">Rule of Life</h2>
          <p className="text-oatmeal/80 text-xs sm:text-sm italic mb-3 sm:mb-4">A Living Rhythm of Practices</p>
        </div>
        
        <div className="bg-blue-fantastic/50 border border-flame/20 rounded-lg sm:rounded-xl p-4 sm:p-6 space-y-3 sm:space-y-4">
          <h3 className="text-lg sm:text-xl font-bold text-palladian">What is a Rule of Life?</h3>
          <p className="text-oatmeal leading-relaxed">
            A Rule of Life is a spiritual rhythm—a pattern of practices that help you encounter God 
            and abide with Him throughout your days. It's not a checklist of achievements, but an 
            invitation into deeper formation.
          </p>
          <p className="text-oatmeal leading-relaxed">
            This is something you <span className="text-flame font-semibold">live inside</span>, not something you finish. 
            It remains flexible and seasonal, always open to the Spirit's leading.
          </p>
        </div>
        
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-palladian text-center mb-6">Choose Your Starting Point</h3>
          
          {STARTERS.map((starter) => (
            <button
              key={starter.id}
              onClick={() => handleStarterSelect(starter)}
              className="w-full bg-blue-fantastic/50 hover:bg-blue-fantastic border border-oatmeal/20 hover:border-flame/50 rounded-xl p-6 text-left transition-all"
            >
              <h4 className="text-lg font-bold text-palladian mb-2">{starter.name}</h4>
              <p className="text-flame text-sm mb-3">{starter.focus}</p>
              <p className="text-oatmeal/80 text-sm mb-4">{starter.description}</p>
              <div className="flex flex-wrap gap-2">
                {starter.practices.map((p) => (
                  <span key={p.category} className="px-3 py-1 bg-flame/20 rounded-full text-xs text-flame">
                    {p.category !== 'CUSTOM' ? CANONICAL_PRACTICES[p.category].name : 'Custom'}
                  </span>
                ))}
              </div>
            </button>
          ))}
          
          <button
            onClick={() => handleStarterSelect(null)}
            className="w-full bg-blue-fantastic/30 hover:bg-blue-fantastic/50 border border-oatmeal/20 hover:border-oatmeal/40 rounded-xl p-6 text-left transition-all"
          >
            <h4 className="text-lg font-bold text-palladian mb-2">Start From Scratch</h4>
            <p className="text-oatmeal/80 text-sm">
              Begin with an empty rule and add practices intentionally, one at a time.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
  
  const renderWeek = () => {
    if (!rule) return null;
    
    const weekDates = getCurrentWeekDates();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const startDay = rule.weekStartDay === 'MONDAY' ? 1 : 0;
    const orderedDays = [...dayNames.slice(startDay), ...dayNames.slice(0, startDay)];
    
    // Separate practices by frequency
    const dailyPractices = rule.practices.filter(p => p.frequency === 'DAILY');
    const weeklyPractices = rule.practices.filter(p => p.frequency === 'WEEKLY');
    const monthlyPractices = rule.practices.filter(p => p.frequency === 'MONTHLY');
    
    // Debug: Log prayer practice
    const prayerPractice = rule.practices.find(p => p.category === 'PRAYER');
    if (prayerPractice) {
      console.log('Prayer practice:', prayerPractice);
    }
    
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-abyssal to-blue-fantastic px-3 sm:px-6 lg:px-12 py-4 sm:py-8 animate-in slide-in-from-bottom duration-500 pb-24">
        <div className="max-w-6xl mx-auto space-y-4 sm:space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-palladian">Rule of Life</h2>
              <p className="text-oatmeal/70 text-xs sm:text-sm">Week of {weekDates[0].toLocaleDateString()}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="ghost" size="sm" onClick={() => setView('HISTORY')} className="flex-1 sm:flex-initial" title="View practice history">
                <Icons.Calendar size={16} className="mr-2" />
                <span>History</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setView('MANAGE')} className="flex-1 sm:flex-initial" title="Manage practices">
                <Icons.Settings size={16} className="mr-2" />
                <span>Manage</span>
              </Button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-blue-fantastic/50 rounded-lg transition-colors"
                title="Close Rule of Life"
              >
                <Icons.X size={20} className="text-oatmeal" />
              </button>
            </div>
          </div>
          
          {/* Week Grid */}
          <div className="bg-blue-fantastic/50 border border-oatmeal/10 rounded-lg sm:rounded-xl p-3 sm:p-6 space-y-3 sm:space-y-4">
            {weekDates.map((date, dayIndex) => {
              const dayOfWeek = (date.getDay() + 7) % 7;
              const practicesForDay = [
                ...dailyPractices,
                ...weeklyPractices.filter(p => p.scheduledDays?.includes(dayOfWeek)),
              ];
              
              return (
                <div key={date.toDateString()} className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3">
                    <div className="flex-shrink-0 w-full sm:w-32">
                      <div className="text-sm sm:text-base font-semibold text-palladian">{orderedDays[dayIndex]}</div>
                      <div className="text-xs text-oatmeal/70">{date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                    </div>
                    
                    <div className="flex-1 flex flex-wrap gap-1.5 sm:gap-2 items-start">
                      {practicesForDay.length === 0 ? (
                        <span className="text-oatmeal/40 text-sm italic">No practices scheduled</span>
                      ) : (
                        practicesForDay.flatMap(practice => {
                          const isToday = date.toDateString() === new Date().toDateString();
                          const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
                          const completionCount = getPracticeCompletionCount(practice, date);
                          
                          // For daily practices with target > 1, show multiple buttons
                          if (practice.frequency === 'DAILY') {
                            const target = practice.targetPerWeek || 1;
                            return Array.from({ length: target }, (_, index) => {
                              const isThisInstanceEngaged = index < completionCount;
                              
                              return (
                                <button
                                  key={`${practice.id}-${index}`}
                                  onClick={() => isThisInstanceEngaged 
                                    ? handleUncheckPractice(practice, date)
                                    : handleEngagePractice(practice, date)
                                  }
                                  className={`px-2.5 sm:px-3 py-2 rounded-lg text-xs sm:text-sm transition-all active:scale-95 ${
                                    isThisInstanceEngaged
                                      ? 'bg-flame/30 text-flame border border-flame/50 font-medium cursor-pointer hover:bg-flame/40'
                                      : isToday
                                      ? 'bg-blue-fantastic text-palladian border border-palladian/30 hover:border-flame/50 font-medium'
                                      : isPast
                                      ? 'bg-blue-abyssal/50 text-oatmeal/50 border border-oatmeal/20'
                                      : 'bg-blue-fantastic/70 text-oatmeal border border-oatmeal/30 hover:border-oatmeal/50'
                                  }`}
                                >
                                  {isThisInstanceEngaged && <Icons.Check size={12} className="inline mr-1" />}
                                  {getPracticeName(practice)}
                                </button>
                              );
                            });
                          }
                          
                          // For weekly/monthly practices, show single button
                          const isEngaged = completionCount > 0;
                          return (
                            <button
                              key={practice.id}
                              onClick={() => isEngaged 
                                ? handleUncheckPractice(practice, date)
                                : handleEngagePractice(practice, date)
                              }
                              className={`px-2.5 sm:px-3 py-2 rounded-lg text-xs sm:text-sm transition-all active:scale-95 ${
                                isEngaged
                                  ? 'bg-flame/30 text-flame border border-flame/50 font-medium cursor-pointer hover:bg-flame/40'
                                  : isToday
                                  ? 'bg-blue-fantastic text-palladian border border-palladian/30 hover:border-flame/50 font-medium'
                                  : isPast
                                  ? 'bg-blue-abyssal/50 text-oatmeal/50 border border-oatmeal/20'
                                  : 'bg-blue-fantastic/70 text-oatmeal border border-oatmeal/30 hover:border-oatmeal/50'
                              }`}
                            >
                              {isEngaged && <Icons.Check size={12} className="inline mr-1" />}
                              {getPracticeName(practice)}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Monthly Practices */}
          {monthlyPractices.length > 0 && (
            <div className="bg-blue-fantastic/50 border border-oatmeal/10 rounded-lg sm:rounded-xl p-3 sm:p-6 space-y-3 sm:space-y-4">
              <h3 className="text-base sm:text-lg font-bold text-palladian">This Month's Practices</h3>
              <div className="space-y-3">
                {monthlyPractices.map(practice => {
                  const count = getEngagementCount(practice);
                  const target = practice.targetPerMonth || 1;
                  
                  return (
                    <div key={practice.id} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-palladian font-semibold">{getPracticeName(practice)}</div>
                        <div className="text-oatmeal/80 text-sm">{renderTextWithUrls(practice.description)}</div>
                        <div className="text-oatmeal/70 text-xs mt-1">
                          Engaged {count} of {target} {target === 1 ? 'time' : 'times'}
                        </div>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleEngagePractice(practice, new Date())}
                      >
                        Practice
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Weekly Reflection */}
          <div className="bg-blue-fantastic/50 border border-oatmeal/10 rounded-lg sm:rounded-xl p-3 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-base sm:text-lg font-bold text-palladian">Weekly Reflection</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setWeeklyReflectionText(rule.weeklyReflection || '');
                  setWeeklyReflectionModal(true);
                }}
              >
                <Icons.Edit size={16} className="mr-2" />
                {rule.weeklyReflection ? 'Edit' : 'Add'}
              </Button>
            </div>
            {rule.weeklyReflection ? (
              <p className="text-oatmeal leading-relaxed">{rule.weeklyReflection}</p>
            ) : (
              <p className="text-oatmeal/60 italic text-sm">
                What did you notice God doing in you or around you this week?
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  const renderManage = () => {
    if (!rule) return null;
    
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-abyssal to-blue-fantastic px-3 sm:px-4 py-4 sm:py-8 pb-24">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 sm:mb-8">
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                onClick={() => setView('WEEK')}
                className="p-2 hover:bg-blue-fantastic/50 rounded-lg transition-colors flex-shrink-0"
              >
                <Icons.ArrowLeft size={20} className="text-oatmeal" />
              </button>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-palladian">Manage Practices</h2>
                <p className="text-oatmeal/60 text-xs sm:text-sm">Add, edit, or remove your practices</p>
              </div>
            </div>
            <Button
              onClick={() => {
                setView('EDIT_PRACTICE');
              }}
              className="flex items-center gap-2 justify-center w-full sm:w-auto"
              size="sm"
            >
              <Icons.Plus size={16} />
              <span>Add Practice</span>
            </Button>
          </div>
          
          {/* Practices List */}
          <div className="space-y-4">
            {rule.practices.length === 0 ? (
              <div className="bg-blue-fantastic/30 rounded-xl p-8 text-center">
                <Icons.Scroll size={48} className="text-oatmeal/40 mx-auto mb-4" />
                <p className="text-oatmeal/60">No practices yet. Click "Add Practice" to begin.</p>
              </div>
            ) : (
              rule.practices.map((practice) => {
                const canonicalDef = practice.category !== 'CUSTOM' ? CANONICAL_PRACTICES[practice.category] : null;
                const Icon = canonicalDef?.icon || Icons.Scroll;
                const name = getPracticeName(practice);
                
                let frequencyText = '';
                if (practice.frequency === 'DAILY') {
                  const target = practice.targetPerWeek || 1;
                  frequencyText = `${target}x per day`;
                } else if (practice.frequency === 'WEEKLY') {
                  const target = practice.targetPerWeek || 1;
                  const days = practice.scheduledDays || [];
                  if (days.length > 0) {
                    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                    frequencyText = days.map(d => dayNames[d]).join(', ');
                  } else {
                    frequencyText = `${target}x per week`;
                  }
                } else {
                  const target = practice.targetPerMonth || 1;
                  frequencyText = `${target}x per month`;
                }
                
                return (
                  <div
                    key={practice.id}
                    className="bg-blue-fantastic/50 border border-oatmeal/20 rounded-xl p-6"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className="p-3 bg-flame/20 rounded-lg flex-shrink-0">
                          <Icon size={24} className="text-flame" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold text-palladian mb-1">{name}</h3>
                          <p className="text-flame text-sm mb-2">{frequencyText}</p>
                          <p className="text-oatmeal/80 text-sm leading-relaxed">
                            {renderTextWithUrls(practice.description)}
                          </p>
                          {practice.linkedAppPractice && (
                            <div className="mt-3 pt-3 border-t border-oatmeal/10">
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-palladian/20 rounded text-xs text-palladian">
                                <Icons.Link size={12} />
                                Linked to app practice
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => {
                            startEditPractice(practice);
                            setView('EDIT_PRACTICE');
                          }}
                          className="p-2 hover:bg-blue-fantastic rounded-lg transition-colors"
                          title="Edit practice"
                        >
                          <Icons.Edit size={18} className="text-oatmeal" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Remove "${name}" from your rule?`)) {
                              handleDeletePractice(practice.id);
                            }
                          }}
                          className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                          title="Remove practice"
                        >
                          <Icons.Trash size={18} className="text-red-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          
          {/* Settings */}
          <div className="mt-8 bg-blue-fantastic/30 rounded-xl p-6">
            <h3 className="text-lg font-bold text-palladian mb-4">Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-oatmeal mb-2">
                  Week starts on
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setRule({ ...rule, weekStartDay: 'SUNDAY' })}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      rule.weekStartDay === 'SUNDAY'
                        ? 'bg-flame text-blue-abyssal'
                        : 'bg-blue-fantastic text-oatmeal hover:bg-blue-fantastic/70'
                    }`}
                  >
                    Sunday
                  </button>
                  <button
                    onClick={() => setRule({ ...rule, weekStartDay: 'MONDAY' })}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      rule.weekStartDay === 'MONDAY'
                        ? 'bg-flame text-blue-abyssal'
                        : 'bg-blue-fantastic text-oatmeal hover:bg-blue-fantastic/70'
                    }`}
                  >
                    Monday
                  </button>
                </div>
              </div>
              
              <div className="pt-4 border-t border-oatmeal/20">
                <label className="block text-sm font-medium text-oatmeal mb-2">
                  Start Over
                </label>
                <p className="text-oatmeal/60 text-sm mb-3">
                  This will completely reset your Rule of Life and let you choose a new starter or begin from scratch.
                </p>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    if (confirm('Are you sure you want to start over? This will remove all your practices and engagement history.')) {
                      onUpdateUser({ ...user, ruleOfLife: null });
                      setRule(null);
                      setView('INTRO');
                    }
                  }}
                >
                  Start Over
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  const renderEditPractice = () => {
    if (!rule) return null;
    
    return (
      <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-24">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => {
              setView('MANAGE');
              setEditingPractice(null);
              resetPracticeForm();
            }}
            className="p-2 hover:bg-blue-fantastic rounded-lg transition-colors"
          >
            <Icons.ArrowLeft size={20} className="text-oatmeal" />
          </button>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-palladian">
              {editingPractice ? 'Edit Practice' : 'Add Practice'}
            </h2>
            <p className="text-oatmeal/60 text-xs sm:text-sm">
              {editingPractice ? 'Update your commitment' : 'Add a new spiritual practice'}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Category Selection */}
          <div>
            <label className="block text-sm font-medium text-oatmeal mb-2">
              Practice Category
            </label>
            <div className="relative">
              <select
                value={practiceForm.category}
                onChange={(e) => {
                  const category = e.target.value as PracticeCategory;
                  setPracticeForm(prev => ({
                    ...prev,
                    category,
                    description: '',
                  }));
                }}
                className="w-full bg-blue-fantastic border border-oatmeal/30 rounded-lg pl-4 pr-10 py-3 text-oatmeal appearance-none focus:outline-none focus:ring-2 focus:ring-flame focus:border-flame transition-all cursor-pointer"
              >
                <option value="SCRIPTURE">Scripture</option>
                <option value="MEDITATION">Meditation</option>
                <option value="CELEBRATION">Celebration</option>
                <option value="PRAYER">Prayer</option>
                <option value="FASTING">Fasting</option>
                <option value="SABBATH">Sabbath</option>
                <option value="SILENCE_SOLITUDE">Silence & Solitude</option>
                <option value="SIMPLICITY">Simplicity</option>
                <option value="COMMUNITY">Community</option>
                <option value="SERVICE">Service</option>
                <option value="GENEROSITY">Generosity</option>
                <option value="CONFESSION">Confession</option>
                <option value="CUSTOM">Custom Practice</option>
              </select>
              <Icons.Down className="absolute right-3 top-[52%] -translate-y-1/2 text-flame pointer-events-none" size={20} />
            </div>
          </div>
          
          {/* Custom Name (if custom category) */}
          {practiceForm.category === 'CUSTOM' && (
            <div>
              <label className="block text-sm font-medium text-oatmeal mb-2">
                Practice Name
              </label>
              <Input
                value={practiceForm.customName}
                onChange={(e) => setPracticeForm(prev => ({ ...prev, customName: e.target.value }))}
                placeholder="e.g., Morning Walk, Gardening"
              />
            </div>
          )}
          
          {/* Example Commitments (if not custom) */}
          {practiceForm.category !== 'CUSTOM' && (
            <div>
              <label className="block text-sm font-medium text-oatmeal mb-2">
                Example Commitments (click to use)
              </label>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {CANONICAL_PRACTICES[practiceForm.category].exampleCommitments.map((example, i) => (
                  <button
                    key={i}
                    onClick={() => loadExampleCommitment(example)}
                    className="w-full text-left px-3 py-2 rounded text-sm bg-blue-fantastic/30 text-oatmeal/70 hover:bg-blue-fantastic/50 transition-colors"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-oatmeal mb-2">
              Your Commitment
            </label>
            <Textarea
              value={practiceForm.description}
              onChange={(e) => setPracticeForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe how you'll practice this..."
              rows={4}
            />
          </div>
          
          {/* Frequency */}
          <div>
            <label className="block text-sm font-medium text-oatmeal mb-2">
              Frequency
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setPracticeForm(prev => ({ ...prev, frequency: 'DAILY', target: 1, scheduledDays: [] }))}
                className={`flex-1 px-3 py-2 rounded-lg transition-colors ${
                  practiceForm.frequency === 'DAILY'
                    ? 'bg-flame text-blue-abyssal'
                    : 'bg-blue-fantastic text-oatmeal hover:bg-blue-fantastic/70'
                }`}
              >
                Daily
              </button>
              <button
                onClick={() => setPracticeForm(prev => ({ ...prev, frequency: 'WEEKLY', target: 1, scheduledDays: [] }))}
                className={`flex-1 px-3 py-2 rounded-lg transition-colors ${
                  practiceForm.frequency === 'WEEKLY'
                    ? 'bg-flame text-blue-abyssal'
                    : 'bg-blue-fantastic text-oatmeal hover:bg-blue-fantastic/70'
                }`}
              >
                Weekly
              </button>
              <button
                onClick={() => setPracticeForm(prev => ({ ...prev, frequency: 'MONTHLY', target: 1, scheduledDays: [] }))}
                className={`flex-1 px-3 py-2 rounded-lg transition-colors ${
                  practiceForm.frequency === 'MONTHLY'
                    ? 'bg-flame text-blue-abyssal'
                    : 'bg-blue-fantastic text-oatmeal hover:bg-blue-fantastic/70'
                }`}
              >
                Monthly
              </button>
            </div>
          </div>
          
          {/* Target */}
          {practiceForm.frequency === 'DAILY' && (
            <div>
              <label className="block text-sm font-medium text-oatmeal mb-2">
                Times per day
              </label>
              <div className="relative">
                <select
                  value={practiceForm.target}
                  onChange={(e) => setPracticeForm(prev => ({ ...prev, target: parseInt(e.target.value) }))}
                  className="w-full bg-blue-fantastic border border-oatmeal/30 rounded-lg pl-4 pr-10 py-3 text-oatmeal appearance-none focus:outline-none focus:ring-2 focus:ring-flame focus:border-flame transition-all cursor-pointer"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                    <option key={num} value={num}>{num}</option>
                  ))}
                </select>
                <Icons.Down className="absolute right-3 top-[52%] -translate-y-1/2 text-flame pointer-events-none" size={20} />
              </div>
            </div>
          )}
          
          {practiceForm.frequency === 'WEEKLY' && (
            <div>
              <label className="block text-sm font-medium text-oatmeal mb-2">
                Times per week
              </label>
              <div className="relative">
                <select
                  value={practiceForm.target}
                  onChange={(e) => {
                    const newTarget = parseInt(e.target.value);
                    setPracticeForm(prev => ({
                      ...prev,
                      target: newTarget,
                      scheduledDays: prev.scheduledDays.length > newTarget
                        ? prev.scheduledDays.slice(0, newTarget)
                        : prev.scheduledDays
                    }));
                  }}
                  className="w-full bg-blue-fantastic border border-oatmeal/30 rounded-lg pl-4 pr-10 py-3 text-oatmeal appearance-none focus:outline-none focus:ring-2 focus:ring-flame focus:border-flame transition-all cursor-pointer"
                >
                  {[1, 2, 3, 4, 5, 6, 7].map(num => (
                    <option key={num} value={num}>{num}</option>
                  ))}
                </select>
                <Icons.Down className="absolute right-3 top-[52%] -translate-y-1/2 text-flame pointer-events-none" size={20} />
              </div>
            </div>
          )}
          
          {practiceForm.frequency === 'MONTHLY' && (
            <div>
              <label className="block text-sm font-medium text-oatmeal mb-2">
                Times per month
              </label>
              <div className="relative">
                <select
                  value={practiceForm.target}
                  onChange={(e) => setPracticeForm(prev => ({ ...prev, target: parseInt(e.target.value) }))}
                  className="w-full bg-blue-fantastic border border-oatmeal/30 rounded-lg pl-4 pr-10 py-3 text-oatmeal appearance-none focus:outline-none focus:ring-2 focus:ring-flame focus:border-flame transition-all cursor-pointer"
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(num => (
                    <option key={num} value={num}>{num}</option>
                  ))}
                </select>
                <Icons.Down className="absolute right-3 top-[52%] -translate-y-1/2 text-flame pointer-events-none" size={20} />
              </div>
            </div>
          )}
          
          {/* Scheduled Days (weekly only) */}
          {practiceForm.frequency === 'WEEKLY' && (
            <div>
              <label className="block text-sm font-medium text-oatmeal mb-2">
                Specific Days (optional)
              </label>
              {practiceForm.scheduledDays.length > 0 && (
                <p className="text-oatmeal/60 text-xs mb-2">
                  {practiceForm.scheduledDays.length} of {practiceForm.target} selected
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => {
                  const isSelected = practiceForm.scheduledDays.includes(index);
                  const canSelect = isSelected || practiceForm.scheduledDays.length < practiceForm.target;
                  
                  return (
                    <button
                      key={day}
                      onClick={() => {
                        if (!canSelect && !isSelected) return;
                        
                        const days = practiceForm.scheduledDays;
                        setPracticeForm(prev => ({
                          ...prev,
                          scheduledDays: days.includes(index)
                            ? days.filter(d => d !== index)
                            : [...days, index].sort(),
                        }));
                      }}
                      disabled={!canSelect && !isSelected}
                      className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                        practiceForm.scheduledDays.includes(index)
                          ? 'bg-flame text-blue-abyssal'
                          : canSelect
                          ? 'bg-blue-fantastic text-oatmeal hover:bg-blue-fantastic/70'
                          : 'bg-blue-fantastic/30 text-oatmeal/30 cursor-not-allowed'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Linked App Practice */}
          <div>
            <label className="block text-sm font-medium text-oatmeal mb-2">
              Link to App Practice (optional)
            </label>
            <div className="relative">
              <select
                value={practiceForm.linkedAppPractice || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setPracticeForm(prev => ({
                    ...prev,
                    linkedAppPractice: value ? value as any : undefined,
                  }));
                }}
                className="w-full bg-blue-fantastic border border-oatmeal/30 rounded-lg pl-4 pr-10 py-3 text-oatmeal appearance-none focus:outline-none focus:ring-2 focus:ring-flame focus:border-flame transition-all cursor-pointer"
              >
                <option value="">None</option>
                <option value="LECTIO">Lectio Divina</option>
                <option value="DAILY_EXAMEN">Daily Examen</option>
                <option value="SILENCE_TIMER">Silence Timer</option>
                <option value="GRATITUDE_LIST">Gratitude</option>
                <option value="MEMORIZE">Memorize Scripture</option>
              </select>
              <Icons.Down className="absolute right-3 top-[52%] -translate-y-1/2 text-flame pointer-events-none" size={20} />
            </div>
          </div>
          
          {/* Actions - Fixed at bottom */}
          <div className="flex gap-3 pt-6 sticky bottom-0 bg-blue-abyssal pb-6 -mx-4 px-4 border-t border-oatmeal/10">
            <Button
              onClick={editingPractice ? handleSavePracticeEdit : handleAddPractice}
              className="flex-1"
              disabled={
                !practiceForm.description.trim() ||
                (practiceForm.category === 'CUSTOM' && !practiceForm.customName.trim())
              }
            >
              {editingPractice ? 'Save Changes' : 'Add Practice'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setView('MANAGE');
                setEditingPractice(null);
                resetPracticeForm();
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  };
  
  const renderHistory = () => {
    if (!rule) return null;
    
    // Combine new weeklyHistory with calculated past weeks for backward compatibility
    const weeklyHistory = rule.weeklyHistory || [];
    
    // Also get past weeks from manualCompletions (for data before the new system)
    const calculatedWeeks: Array<{ start: Date; end: Date }> = [];
    const today = new Date();
    const ruleStartDate = new Date(rule.startDate);
    
    // Get last 12 weeks
    for (let i = 1; i <= 12; i++) {
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - (i * 7));
      const { weekStart, weekEnd } = getWeekBoundaries(weekAgo, rule.weekStartDay);
      
      // Only include weeks where the rule was active and not already in weeklyHistory
      if (weekEnd >= ruleStartDate) {
        const alreadyInHistory = weeklyHistory.some(h => 
          h.weekStart === weekStart.getTime() && h.weekEnd === weekEnd.getTime()
        );
        if (!alreadyInHistory) {
          calculatedWeeks.push({ start: weekStart, end: weekEnd });
        }
      }
    }
    
    const formatDateRange = (start: Date | number, end: Date | number) => {
      const startDate = start instanceof Date ? start : new Date(start);
      const endDate = end instanceof Date ? end : new Date(end);
      const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
      const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
      const startDay = startDate.getDate();
      const endDay = endDate.getDate();
      
      if (startMonth === endMonth) {
        return `${startMonth} ${startDay}-${endDay}`;
      }
      return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
    };
    
    const totalHistoryItems = weeklyHistory.length + calculatedWeeks.length;
    
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-abyssal to-blue-fantastic px-3 sm:px-4 py-4 sm:py-8 pb-24">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
            <button
              onClick={() => setView('WEEK')}
              className="p-2 hover:bg-blue-fantastic/50 rounded-lg transition-colors flex-shrink-0"
            >
              <Icons.ArrowLeft size={20} className="text-oatmeal" />
            </button>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-palladian">Rule of Life History</h2>
              <p className="text-oatmeal/60 text-xs sm:text-sm">Reflect on past weeks</p>
            </div>
          </div>
          
          {/* Past Weeks */}
          <div className="space-y-4">
            {totalHistoryItems === 0 ? (
              <div className="bg-blue-fantastic/50 border border-oatmeal/20 rounded-xl p-12 text-center">
                <p className="text-oatmeal/60">
                  No past weeks to show yet. Your history will appear here as you complete weeks of your rule of life.
                </p>
              </div>
            ) : (
              <>
                {/* Show archived weeks from weeklyHistory (with full details) */}
                {weeklyHistory.map((week, index) => {
                  const totalPractices = rule.practices.length;
                  const practicesEngaged = week.practicesSummary.filter(p => p.engagementCount > 0).length;
                  const isEditing = editingHistoricalWeek === index;
                  
                  return (
                    <div
                      key={`history-${index}`}
                      className="bg-blue-fantastic/50 border border-oatmeal/20 rounded-xl p-6"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-palladian">
                            {formatDateRange(week.weekStart, week.weekEnd)}
                          </h3>
                          <p className="text-oatmeal/60 text-sm">
                            {practicesEngaged} of {totalPractices} practices engaged
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            if (window.confirm('Delete this week\'s history? This cannot be undone.')) {
                              deleteHistoricalWeek(index);
                            }
                          }}
                          className="p-2 hover:bg-truffle/20 rounded-lg transition-colors text-truffle"
                          title="Delete this week"
                        >
                          <Icons.Trash size={18} />
                        </button>
                      </div>
                      
                      {/* Practice Details */}
                      <div className="space-y-3 mb-4">
                        {week.practicesSummary.map(practice => {
                          if (practice.engagementCount === 0) return null;
                          
                          return (
                            <div key={practice.practiceId} className="bg-blue-abyssal/30 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-palladian font-semibold">{practice.practiceName}</span>
                                <span className="text-oatmeal/70 text-sm">
                                  {practice.engagementCount} {practice.engagementCount === 1 ? 'time' : 'times'}
                                </span>
                              </div>
                              
                              {/* Show reflections from this practice */}
                              {practice.reflections.length > 0 && (
                                <div className="mt-3 space-y-2">
                                  {practice.reflections.map((reflection, rIndex) => (
                                    <div key={rIndex} className="bg-blue-fantastic/30 rounded p-3">
                                      <p className="text-oatmeal/90 text-sm leading-relaxed italic">
                                        "{reflection}"
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Weekly Reflection */}
                      <div className="pt-4 border-t border-oatmeal/20">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-semibold text-palladian">Weekly Reflection</p>
                          {!isEditing && (
                            <button
                              onClick={() => {
                                setEditingHistoricalWeek(index);
                                setHistoricalReflectionText(week.reflection);
                              }}
                              className="text-flame hover:text-flame/80 text-sm flex items-center gap-1"
                            >
                              <Icons.Edit size={14} />
                              Edit
                            </button>
                          )}
                        </div>
                        
                        {isEditing ? (
                          <div className="space-y-3">
                            <Textarea
                              value={historicalReflectionText}
                              onChange={(e) => setHistoricalReflectionText(e.target.value)}
                              placeholder="What did you notice God doing in you or around you this week?"
                              rows={4}
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => updateHistoricalReflection(index)}
                              >
                                Save
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  setEditingHistoricalWeek(null);
                                  setHistoricalReflectionText('');
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-oatmeal/80 text-sm leading-relaxed">
                            {week.reflection || <span className="italic text-oatmeal/50">No reflection recorded for this week</span>}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
                
                {/* Show calculated weeks (for backward compatibility with old data) */}
                {calculatedWeeks.map((week, index) => {
                  const weekEngagements = rule.manualCompletions.filter(comp => {
                    const compDate = new Date(comp.date);
                    return compDate >= week.start && compDate <= week.end;
                  });
                  
                  const practicesEngaged = new Set(weekEngagements.map(e => e.practiceId));
                  
                  return (
                    <div
                      key={`calculated-${index}`}
                      className="bg-blue-fantastic/50 border border-oatmeal/20 rounded-xl p-6"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-palladian">
                            {formatDateRange(week.start, week.end)}
                          </h3>
                          <p className="text-oatmeal/60 text-sm">
                            {practicesEngaged.size} of {rule.practices.length} practices engaged
                          </p>
                        </div>
                      </div>
                      
                      {/* Practice Summaries */}
                      <div className="space-y-2">
                        {rule.practices.map(practice => {
                          const engagements = weekEngagements.filter(e => e.practiceId === practice.id);
                          const count = engagements.length;
                          
                          if (count === 0) return null;
                          
                          return (
                            <div key={practice.id} className="bg-blue-abyssal/30 rounded-lg p-4">
                              <div className="flex items-center justify-between">
                                <span className="text-palladian font-semibold">{getPracticeName(practice)}</span>
                                <span className="text-oatmeal/70 text-sm">
                                  {count} {count === 1 ? 'time' : 'times'}
                                </span>
                              </div>
                              
                              {/* Show any reflections */}
                              {engagements.some(e => e.reflection) && (
                                <div className="mt-3 space-y-2">
                                  {engagements.filter(e => e.reflection).map((engagement, eIndex) => (
                                    <div key={eIndex} className="bg-blue-fantastic/30 rounded p-3">
                                      <p className="text-oatmeal/90 text-sm leading-relaxed italic">
                                        "{engagement.reflection}"
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  const renderReflection = () => {
    if (!engagementModal.practice) return null;
    
    return (
      <div className="w-screen h-screen overflow-y-scroll bg-gradient-to-b from-blue-abyssal to-blue-fantastic" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, WebkitOverflowScrolling: 'touch' }}>
        <div className="min-h-screen pb-safe">
          {/* Header */}
          <div className="px-4 pt-8 pb-4 border-b border-oatmeal/10 sticky top-0 bg-blue-abyssal/95 backdrop-blur-md z-10">
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    setView('WEEK');
                    setEngagementModal({ isOpen: false, practice: null, date: Date.now() });
                    setEngagementReflection('');
                    setSelectedPrompt(null);
                  }}
                  className="p-2 hover:bg-blue-fantastic/50 rounded-lg transition-colors flex-shrink-0"
                >
                  <Icons.ArrowLeft size={20} className="text-oatmeal" />
                </button>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl sm:text-2xl font-bold text-palladian truncate">
                    Reflection on {getPracticeName(engagementModal.practice)}
                  </h2>
                  <p className="text-oatmeal/60 text-xs sm:text-sm mt-1">
                    {new Date(engagementModal.date).toLocaleDateString('en-US', { 
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-4 py-6">
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="bg-blue-fantastic/50 border border-oatmeal/10 rounded-xl p-4 sm:p-6">
                <p className="text-oatmeal leading-relaxed text-sm sm:text-base">
                  Would you like to capture anything about your experience?
                </p>
              </div>
              
              {selectedPrompt && (
                <div className="bg-flame/10 border border-flame/30 rounded-xl p-4 sm:p-6">
                  <p className="text-palladian font-medium mb-2 text-sm sm:text-base">Reflection Prompt:</p>
                  <p className="text-oatmeal/90 leading-relaxed italic text-sm sm:text-base">
                    {selectedPrompt}
                  </p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-palladian mb-2">
                  Your Reflection (Optional)
                </label>
                <Textarea
                  value={engagementReflection}
                  onChange={(e) => setEngagementReflection(e.target.value)}
                  placeholder="Add a brief reflection about your experience..."
                  rows={8}
                  className="text-base w-full"
                />
              </div>
              
              {/* Extra space to ensure buttons are visible */}
              <div className="h-6"></div>
              
              {/* Buttons inside the scrollable area */}
              <div className="pb-6">
                <div className="flex gap-3">
                  <Button 
                    onClick={confirmEngagement} 
                    className="flex-1"
                  >
                    <Icons.Check size={18} className="mr-2" />
                    Save Reflection
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setView('WEEK');
                      setEngagementModal({ isOpen: false, practice: null, date: Date.now() });
                      setEngagementReflection('');
                      setSelectedPrompt(null);
                    }}
                    className="flex-shrink-0"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Main render
  if (view === 'INTRO') return renderIntro();
  if (view === 'REFLECTION') return renderReflection();
  
  if (view === 'WEEK') return (
    <>
      {renderWeek()}
      
      {/* Engagement Modal */}
      <Modal
        isOpen={engagementModal.isOpen}
        onClose={() => setEngagementModal({ isOpen: false, practice: null, date: Date.now() })}
        title={engagementModal.practice ? `Reflection on ${getPracticeName(engagementModal.practice)}` : ''}
      >
        <div className="space-y-4">
          <div className="bg-blue-fantastic/30 rounded-lg p-4">
            <p className="text-oatmeal text-sm">
              Would you like to capture anything about your experience?
            </p>
          </div>
          
          <Textarea
            value={engagementReflection}
            onChange={(e) => setEngagementReflection(e.target.value)}
            placeholder="Optional: Add a brief reflection..."
            rows={4}
          />
          
          <div className="flex gap-2">
            <Button onClick={confirmEngagement} className="flex-1">
              Save Reflection
            </Button>
            <Button
              variant="secondary"
              onClick={() => setEngagementModal({ isOpen: false, practice: null, date: Date.now() })}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
      
      {/* Weekly Reflection Modal */}
      <Modal
        isOpen={weeklyReflectionModal}
        onClose={() => setWeeklyReflectionModal(false)}
        title="Weekly Reflection"
      >
        <div className="space-y-4">
          <div className="bg-blue-fantastic/30 rounded-lg p-4">
            <p className="text-oatmeal text-sm italic">
              What did you notice God doing in you or around you this week?
            </p>
          </div>
          
          <Textarea
            value={weeklyReflectionText}
            onChange={(e) => setWeeklyReflectionText(e.target.value)}
            placeholder="Write your reflection..."
            rows={6}
          />
          
          <div className="flex gap-2">
            <Button onClick={saveWeeklyReflection} className="flex-1">
              Save
            </Button>
            <Button variant="ghost" onClick={() => setWeeklyReflectionModal(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
      
      {/* Journal Prompt Modal */}
      <Modal
        isOpen={journalPromptModal.isOpen}
        onClose={() => setJournalPromptModal({ isOpen: false, practice: null, reflection: '', date: Date.now() })}
        title="Add to Daily Journal?"
      >
        <div className="space-y-4">
          <div className="bg-blue-fantastic/30 rounded-lg p-4">
            <p className="text-oatmeal text-sm leading-relaxed mb-3">
              Would you like to add your reflection to today's journal entry?
            </p>
            {journalPromptModal.practice && (
              <div className="flex gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-flame/20 rounded text-xs text-flame border border-flame/30">
                  {getPracticeName(journalPromptModal.practice)}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-palladian/20 rounded text-xs text-palladian border border-palladian/30">
                  Rule of Life
                </span>
              </div>
            )}
          </div>
          
          <div className="bg-blue-abyssal/30 rounded-lg p-3 border-l-2 border-flame">
            <p className="text-oatmeal/90 text-sm italic leading-relaxed">
              {journalPromptModal.reflection}
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={savePracticeReflectionToJournal} className="flex-1">
              Yes, Add to Journal
            </Button>
            <Button
              variant="secondary"
              onClick={() => setJournalPromptModal({ isOpen: false, practice: null, reflection: '', date: Date.now() })}
            >
              No Thanks
            </Button>
          </div>
        </div>
      </Modal>
      
      {/* Uncheck Practice Modal */}
      <Modal
        isOpen={uncheckModal.isOpen}
        onClose={() => setUncheckModal({ isOpen: false, practice: null, date: Date.now(), hasJournalEntry: false })}
        title="Uncheck Practice?"
      >
        <div className="space-y-4">
          <div className="bg-blue-fantastic/30 rounded-lg p-4">
            <p className="text-oatmeal text-sm leading-relaxed">
              Are you sure you want to uncheck this practice?
            </p>
            {uncheckModal.practice && (
              <div className="mt-3">
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-flame/20 rounded text-xs text-flame border border-flame/30">
                  {getPracticeName(uncheckModal.practice)}
                </span>
              </div>
            )}
          </div>
          
          {uncheckModal.hasJournalEntry && (
            <div className="bg-blue-abyssal/30 rounded-lg p-4 border-l-2 border-palladian">
              <div className="flex items-start gap-2">
                <Icons.Info size={16} className="text-palladian mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-palladian text-sm font-medium mb-1">
                    Journal Entry Found
                  </p>
                  <p className="text-oatmeal/80 text-sm leading-relaxed">
                    You have a reflection for this practice in today's journal. Would you like to delete it?
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex flex-col gap-2">
            {uncheckModal.hasJournalEntry ? (
              <>
                <Button onClick={() => confirmUncheck(true)} variant="secondary" className="w-full">
                  Uncheck & Delete Journal Entry
                </Button>
                <Button onClick={() => confirmUncheck(false)} className="w-full">
                  Uncheck Only (Keep Journal)
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setUncheckModal({ isOpen: false, practice: null, date: Date.now(), hasJournalEntry: false })}
                  className="w-full"
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button onClick={() => confirmUncheck(false)} className="w-full">
                  Yes, Uncheck
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setUncheckModal({ isOpen: false, practice: null, date: Date.now(), hasJournalEntry: false })}
                  className="w-full"
                >
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
  
  if (view === 'MANAGE') return renderManage();
  
  if (view === 'EDIT_PRACTICE') return renderEditPractice();
  
  if (view === 'HISTORY') return renderHistory();
  
  // Fallback
  return null;
};

