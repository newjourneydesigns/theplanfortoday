import React, { useState, useEffect } from 'react';
import { ViewState, Topic, UserProfile, NameOfGod, JournalEntry, ThemeOption } from './types';
import { INITIAL_USER, getBibleUrl, THEMES, DEFAULT_MOBILE_NAV } from './constants';
import { Dashboard } from './components/Dashboard';
import { TopicDetail } from './components/TopicDetail';
import { Profile } from './components/Profile';
import { SilenceTimer } from './components/SilenceTimer';
import { NamesOfGod } from './components/NamesOfGod';
import { VerseMemorization } from './components/VerseMemorization';
import { LectioDivina } from './components/LectioDivina';
import { DailyExamen } from './components/DailyExamen';
import { GratitudeList } from './components/GratitudeList';
import { Fasting } from './components/Fasting';
import { JournalEntryEditor } from './components/JournalEntry';
import { JournalEntryRuleOfLifeEditor } from './components/JournalEntryRuleOfLifeEditor';
import { RuleOfLife } from './components/RuleOfLife';
import { Help } from './components/Help';
import { InstallPromptBanner } from './components/InstallPromptBanner';
import { NotificationPrompt } from './components/NotificationPrompt';
import { Icons } from './components/Shared';
import { Logo } from './components/Logo';
import { AnimatedLogo } from './components/AnimatedLogo';
import { Login } from './components/Login';
import { auth, authReady } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import * as db from './services/db';
import { updatePWAThemeColor } from './utils/themeUtils';
import { clearEncryptionKeys } from './services/encryptionService';
import { initializeMessaging } from './services/notificationService';

const App: React.FC = () => {
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [minLoadingTime, setMinLoadingTime] = useState(true);
  const [loadingScreenVisible, setLoadingScreenVisible] = useState(false);

  const [view, setView] = useState<ViewState>({ type: 'DASHBOARD' });
  const [sideNavOpen, setSideNavOpen] = useState(typeof window !== 'undefined' && window.innerWidth >= 768);
  
  // Data State - Initialize empty, will load from DB
  const [topics, setTopics] = useState<Topic[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>(INITIAL_USER);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  
  const [toast, setToast] = useState<string | null>(null);
  const [welcomeModalOpen, setWelcomeModalOpen] = useState(false);
  const [sharedTopicId, setSharedTopicId] = useState<string | null>(null);
  const [sharedTopicData, setSharedTopicData] = useState<{ topic: Topic; ownerId: string; permission: 'view' | 'edit' } | null>(null);
  const [betaBannerDismissed, setBetaBannerDismissed] = useState(() => {
    return localStorage.getItem('betaBannerDismissed') === 'true';
  });

  // Helper: Navigation from Rule of Life to linked practices
  useEffect(() => {
    (window as any).__navigateFromRule = (targetView: ViewState) => {
      setView(targetView);
    };
    return () => {
      delete (window as any).__navigateFromRule;
    };
  }, []);

  // Trigger loading screen fade-in
  useEffect(() => {
    requestAnimationFrame(() => {
      setLoadingScreenVisible(true);
    });
  }, []);

  // Ensure minimum loading time for animation to complete (3.5 seconds)
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinLoadingTime(false);
    }, 3500);
    return () => clearTimeout(timer);
  }, []);

  // Check for shared topic in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shareId = params.get('share');
    if (shareId) {
      setSharedTopicId(shareId);
      // Clean up URL after reading the share parameter
      // This ensures users bookmark the clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Load shared topic when user is authenticated
  useEffect(() => {
    if (sharedTopicId && currentUser) {
      const loadSharedTopic = async () => {
        try {
          const result = await db.getSharedTopic(sharedTopicId);
          if (result) {
            const isOwner = result.ownerId === currentUser.uid;
            const isPubliclyShared = result.topic.shareToken !== undefined;
            
            if (isOwner || isPubliclyShared) {
              // Owner gets edit permission, others get view-only
              const permission: 'view' | 'edit' = isOwner ? 'edit' : 'view';
              
              setSharedTopicData({ ...result, permission });
              setView({ type: 'TOPIC_DETAIL', topicId: sharedTopicId });
              setToast(`Viewing shared topic: ${result.topic.title}`);
              setTimeout(() => setToast(null), 3000);
              
              // Save reference to shared topic if not owner
              if (!isOwner) {
                // Get owner's name
                const ownerProfile = await db.getUserProfile(result.ownerId);
                const ownerName = ownerProfile?.name || 'Unknown User';
                
                await db.addSharedTopicReference(currentUser.uid, {
                  topicId: result.topic.id,
                  ownerId: result.ownerId,
                  ownerName: ownerName,
                  title: result.topic.title,
                  accessedAt: Date.now()
                });
                // Refresh user profile to show new shared topic
                const updatedProfile = await db.getUserProfile(currentUser.uid);
                if (updatedProfile) {
                  setUserProfile(updatedProfile);
                }
              }
            } else {
              // Remove shared topic reference if no longer accessible
              if (!isOwner) {
                await db.removeSharedTopicReference(currentUser.uid, sharedTopicId);
                const updatedProfile = await db.getUserProfile(currentUser.uid);
                if (updatedProfile) {
                  setUserProfile(updatedProfile);
                }
              }
              // Clear URL parameter and redirect to dashboard
              window.history.replaceState({}, '', '/');
              setSharedTopicId(null);
              setToast('You do not have access to this shared topic');
              setTimeout(() => setToast(null), 3000);
            }
          } else {
            // Remove shared topic reference if topic doesn't exist
            await db.removeSharedTopicReference(currentUser.uid, sharedTopicId);
            const updatedProfile = await db.getUserProfile(currentUser.uid);
            if (updatedProfile) {
              setUserProfile(updatedProfile);
            }
            // Clear URL parameter and redirect to dashboard
            window.history.replaceState({}, '', '/');
            setSharedTopicId(null);
            setToast('Shared topic not found');
            setTimeout(() => setToast(null), 3000);
          }
        } catch (error) {
          console.error('Error loading shared topic:', error);
          setToast('Failed to load shared topic');
        }
      };
      loadSharedTopic();
    }
  }, [sharedTopicId, currentUser]);

  // Update PWA theme colors when user changes theme
  useEffect(() => {
    if (userProfile.theme) {
      updatePWAThemeColor(userProfile.theme);
      // Cache theme to localStorage for early loading
      try {
        localStorage.setItem('userTheme', userProfile.theme);
      } catch (error) {
        console.log('Could not cache theme:', error);
      }
    }
  }, [userProfile.theme]);

  // Ensure theme applies globally (portals/modals render outside main app container)
  useEffect(() => {
    const themeClass = userProfile.theme === 'default' ? 'theme-default' : `theme-${userProfile.theme}`;
    const nodes: Array<HTMLElement | null> = [document.documentElement, document.body];

    for (const node of nodes) {
      if (!node) continue;
      
      // Add transition class for smooth fade
      node.style.transition = 'background-color 0.6s ease-out, color 0.6s ease-out';
      
      // Remove existing theme-* classes
      for (const cls of Array.from(node.classList)) {
        if (cls.startsWith('theme-')) node.classList.remove(cls);
      }
      node.classList.add(themeClass);
    }
  }, [userProfile.theme]);

  // Authentication & Data Sync Listener
  useEffect(() => {
    console.log('[App] Waiting for auth persistence before setting up auth listener');
    let didCancel = false;
    let unsubscribe: (() => void) | undefined;

    authReady.finally(() => {
      if (didCancel) return;

      console.log('[App] Setting up auth listener');
      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('[App] Auth state changed:', firebaseUser ? `User: ${firebaseUser.email}` : 'No user');
      setCurrentUser(firebaseUser);
      
      if (firebaseUser) {
        console.log('[App] Loading user data...');
        setDataLoading(true);
        try {
          // 1. Try to migrate local data if this is a first-time sync
          await db.migrateLocalStorageToFirebase(firebaseUser.uid);
          
          // 2. Fetch Data from Firestore
          const [fetchedTopics, fetchedJournal, fetchedProfile] = await Promise.all([
            db.getTopics(firebaseUser.uid),
            db.getJournalEntries(firebaseUser.uid),
            db.getUserProfile(firebaseUser.uid)
          ]);
          
          console.log('[App] Data loaded:', { topics: fetchedTopics.length, journal: fetchedJournal.length, hasProfile: !!fetchedProfile });

          // Sort topics by order field, falling back to createdAt for topics without order
          const sortedTopics = fetchedTopics.sort((a, b) => {
            // If both have order, sort by order
            if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
            // If only a has order, it comes first
            if (a.order !== undefined) return -1;
            // If only b has order, it comes first
            if (b.order !== undefined) return 1;
            // Otherwise sort by createdAt (newest first)
            return b.createdAt - a.createdAt;
          });
          
          setTopics(sortedTopics);
          setJournalEntries(fetchedJournal.sort((a,b) => b.date - a.date));
          if (fetchedProfile) {
            console.log('[App] Existing user profile loaded', fetchedProfile);

            // --- Practice category compatibility ---
            // We now support both `GRATITUDE` and `CELEBRATION` as separate categories.
            // During a short period, Gratitude was represented as `CELEBRATION`.
            // Migrate those practices forward when they clearly look like Gratitude.
            if (fetchedProfile.ruleOfLife?.practices?.length) {
              const migratedPractices = fetchedProfile.ruleOfLife.practices.map((p) => {
                if (p.category !== 'CELEBRATION') return p;

                const text = `${p.description || ''} ${p.customName || ''}`.toLowerCase();
                const looksLikeGratitude =
                  p.linkedAppPractice === 'GRATITUDE_LIST' ||
                  text.includes('gratitude') ||
                  text.includes('grateful') ||
                  text.includes('thankful') ||
                  text.includes('thanks') ||
                  text.includes('list 3');

                return looksLikeGratitude ? ({ ...p, category: 'GRATITUDE' } as any) : p;
              });

              const migratedRule = { ...fetchedProfile.ruleOfLife, practices: migratedPractices };
              if (JSON.stringify(migratedRule) !== JSON.stringify(fetchedProfile.ruleOfLife)) {
                fetchedProfile.ruleOfLife = migratedRule;
                await db.saveUserProfile(firebaseUser.uid, fetchedProfile);
                console.log('[App] Migrated Rule of Life practice categories (GRATITUDE vs CELEBRATION)');
              }
            }
            
            // Migrate navigation: normalize known items and enforce max length
            let updatedNavItems = fetchedProfile.mobileNavItems || [];
            let shouldSaveProfile = false;

            // Normalize Examen label/icon if present
            updatedNavItems = updatedNavItems.map(item => {
              if (item?.view?.type === 'DAILY_EXAMEN') {
                if (item.label !== 'Examen' || item.icon !== 'Sun') {
                  shouldSaveProfile = true;
                }
                return { ...item, label: 'Examen', icon: 'Sun' };
              }
              if (item?.view?.type === 'GRATITUDE_LIST') {
                if (item.label !== 'Gratitude' || item.icon !== 'Leaf') {
                  shouldSaveProfile = true;
                }
                return { ...item, label: 'Gratitude', icon: 'Leaf' };
              }
              return item;
            });

            // If no mobile nav is set yet, initialize to defaults.
            if (!updatedNavItems.length) {
              updatedNavItems = DEFAULT_MOBILE_NAV.slice(0, 3);
              shouldSaveProfile = true;
            }

            // Enforce: Menu + 3 items (max)
            if (updatedNavItems.length > 3) {
              updatedNavItems = updatedNavItems.slice(0, 3);
              shouldSaveProfile = true;
            }

            if (shouldSaveProfile) {
              fetchedProfile.mobileNavItems = updatedNavItems;
              await db.saveUserProfile(firebaseUser.uid, fetchedProfile);
              console.log('[App] Migrated user navigation (max 3 items)');
            }
            
            setUserProfile(fetchedProfile);
            
            // Initialize Firebase Cloud Messaging
            initializeMessaging();
            
            // Set homepage from user profile
            if (fetchedProfile.homepage) {
              setView(fetchedProfile.homepage);
            }
            
            // Show welcome modal if user doesn't have name set
            if (!fetchedProfile.name?.trim()) {
              console.log('[App] User missing name - showing welcome modal');
              setTimeout(() => {
                console.log('[App] Setting welcomeModalOpen to true');
                setWelcomeModalOpen(true);
              }, 500);
            }
          } else {
            console.log('[App] New user - creating profile');
            // New user in DB - extract name from email
            const emailName = firebaseUser.email 
              ? firebaseUser.email.split('@')[0].charAt(0).toUpperCase() + firebaseUser.email.split('@')[0].slice(1)
              : 'User';
            const newUserProfile = { ...INITIAL_USER, name: emailName, email: firebaseUser.email || '' };
            console.log('[App] Saving new user profile:', newUserProfile);
            await db.saveUserProfile(firebaseUser.uid, newUserProfile);
            setUserProfile(newUserProfile);
            
            // Show welcome modal for new users
            console.log('[App] Scheduling welcome modal for new user');
            setTimeout(() => {
              console.log('[App] Setting welcomeModalOpen to true for new user');
              setWelcomeModalOpen(true);
            }, 500);
          }
          console.log('[App] User data fully loaded');
        } catch (error) {
          console.error("[App] Data sync failed", error);
          setToast("Failed to sync data.");
        } finally {
          setDataLoading(false);
        }
      } else {
        console.log('[App] No user - clearing data');
        // Clear data on logout
        setTopics([]);
        setJournalEntries([]);
        setUserProfile(INITIAL_USER);
      }
      setAuthLoading(false);
      });
    });

    return () => {
      didCancel = true;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Scroll to top when view changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  // Handle side nav keyboard and body scroll
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sideNavOpen) {
        setSideNavOpen(false);
      }
    };

    if (sideNavOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when nav is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [sideNavOpen]);

  const handleSignOut = async () => {
    try {
      if (currentUser) {
        clearEncryptionKeys(currentUser.uid); // Clear encryption keys on sign out
      }
      await auth.signOut();
      setView({ type: 'DASHBOARD' });
      setToast("Signed out successfully.");
      setTimeout(() => setToast(null), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  // --- ACTIONS (Update State + DB) ---

  const handleAddTopic = async (title: string, description: string, color: string): Promise<string | undefined> => {
    if (!currentUser) return;
    // Get max order from active topics
    const activeTopics = topics.filter(t => !t.isArchived);
    const maxOrder = activeTopics.reduce((max, t) => 
      t.order !== undefined ? Math.max(max, t.order) : max, -1
    );
    
    const newTopic: Topic = {
      id: Math.random().toString(36).substr(2, 9),
      title,
      description,
      color,
      verses: [],
      requests: [],
      isArchived: false,
      order: maxOrder + 1,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    // Optimistic Update
    setTopics([newTopic, ...topics]);
    
    // DB Update
    try {
      await db.saveTopic(currentUser.uid, newTopic);
    } catch (e) {
      console.error("Failed to save topic", e);
      setToast("Error saving topic to cloud.");
    }
    
    return newTopic.id;
  };

  const handleSaveNameAsTopic = async (nameData: NameOfGod) => {
    if (!currentUser) return;
    const newTopic: Topic = {
      id: Math.random().toString(36).substr(2, 9),
      title: nameData.name,
      description: nameData.meaning + ". " + nameData.description,
      color: 'bg-flame',
      verses: [
        {
          id: Math.random().toString(36).substr(2, 9),
          reference: nameData.verseReference,
          text: nameData.verseText,
          translation: 'NIV',
          url: getBibleUrl(nameData.verseReference, 'NIV')
        }
      ],
      requests: [],
      isArchived: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    setTopics([newTopic, ...topics]);
    
    try {
      await db.saveTopic(currentUser.uid, newTopic);
      setToast(`Saved "${nameData.name}" to your journal.`);
    } catch (e) {
      setToast("Error saving to cloud.");
    }
    setTimeout(() => setToast(null), 3000);
  };

  const handleUpdateTopic = async (updated: Topic) => {
    if (!currentUser) return;
    setTopics(topics.map(t => t.id === updated.id ? updated : t));
    await db.saveTopic(currentUser.uid, updated);
  };

  const handleUpdateSharedTopic = async (ownerId: string, updated: Topic) => {
    if (!currentUser) return;
    // Update local state
    setTopics(topics.map(t => t.id === updated.id ? updated : t));
    if (sharedTopicData && sharedTopicData.topic.id === updated.id) {
      setSharedTopicData({ ...sharedTopicData, topic: updated });
    }
    // Update in owner's collection
    await db.updateSharedTopic(ownerId, updated);
  };

  const handleStopViewingSharedTopic = async (topicId: string) => {
    if (!currentUser) return;
    
    try {
      // Remove the shared topic reference from user's profile
      await db.removeSharedTopicReference(currentUser.uid, topicId);
      
      // Update user profile state
      const updatedProfile = await db.getUserProfile(currentUser.uid);
      if (updatedProfile) {
        setUserProfile(updatedProfile);
      }
      
      // Clear shared topic data and return to dashboard
      setSharedTopicData(null);
      setSharedTopicId(null);
      setView({ type: 'DASHBOARD' });
      
      setToast('Stopped viewing shared topic');
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      console.error('Error stopping viewing shared topic:', error);
      setToast('Failed to stop viewing topic');
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleArchiveTopic = async (id: string, archive: boolean) => {
    if (!currentUser) return;
    const updated = topics.find(t => t.id === id);
    if (!updated) return;

    const newTopic = { ...updated, isArchived: archive };
    
    // Remove shareToken when archiving to disable sharing
    if (archive && newTopic.shareToken) {
      delete newTopic.shareToken;
    }
    
    setTopics(topics.map(t => t.id === id ? newTopic : t));
    
    await db.saveTopic(currentUser.uid, newTopic);

    const actionName = archive ? 'Archived' : 'Unarchived';
    setToast(`${actionName} topic.`);
    setTimeout(() => setToast(null), 3000);

    if (view.type === 'TOPIC_DETAIL' && view.topicId === id && archive) {
      setView({ type: 'DASHBOARD' });
    }
  };

  const handleReorderTopic = async (id: string, direction: 'up' | 'down') => {
    if (!currentUser) return;
    
    // Get active topics sorted by order
    const activeTopics = topics
      .filter(t => !t.isArchived)
      .sort((a, b) => {
        if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
        if (a.order !== undefined) return -1;
        if (b.order !== undefined) return 1;
        return b.createdAt - a.createdAt;
      });
    
    const currentIndex = activeTopics.findIndex(t => t.id === id);
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= activeTopics.length) return;
    
    // Swap topics
    const reorderedTopics = [...activeTopics];
    [reorderedTopics[currentIndex], reorderedTopics[newIndex]] = 
      [reorderedTopics[newIndex], reorderedTopics[currentIndex]];
    
    // Assign new order values
    const updatedTopics = reorderedTopics.map((topic, index) => ({
      ...topic,
      order: index,
      updatedAt: Date.now()
    }));
    
    // Update all topics (active with new order + archived unchanged)
    const archivedTopics = topics.filter(t => t.isArchived);
    const newTopicsArray = [...updatedTopics, ...archivedTopics];
    setTopics(newTopicsArray);
    
    // Save to database
    await Promise.all(
      updatedTopics.map(topic => db.saveTopic(currentUser.uid, topic))
    );
  };

  const handleDeleteTopic = async (id: string) => {
    if (!currentUser) return;
    setTopics(topics.filter(t => t.id !== id));
    await db.deleteTopic(currentUser.uid, id);
    
    if (view.type === 'TOPIC_DETAIL' && view.topicId === id) {
      setView({ type: 'DASHBOARD' });
    }
  };

  const handleUpdateUser = async (updatedUser: UserProfile) => {
    if (!currentUser) return;
    
    console.log('handleUpdateUser called:', { 
      uid: currentUser.uid, 
      hasRuleOfLife: !!updatedUser.ruleOfLife,
      name: updatedUser.name,
      hasMeditationPlan: !!updatedUser.meditationPlan,
      meditationPlanVerses: updatedUser.meditationPlan?.verses.length
    });
    
    // Strip audio cache from meditation plan and history to prevent exceeding Firestore size limits
    const cleanedUser = { ...updatedUser };
    
    if (cleanedUser.meditationPlan) {
      const { cachedAudioBase64, ...planWithoutAudio } = cleanedUser.meditationPlan;
      cleanedUser.meditationPlan = { ...planWithoutAudio };
      console.log('Meditation plan verses to save:', cleanedUser.meditationPlan.verses.map(v => ({ 
        ref: v.reference, 
        isMemorized: v.isMemorized 
      })));
    }
    
    if (cleanedUser.meditationHistory) {
      cleanedUser.meditationHistory = cleanedUser.meditationHistory.map(plan => {
        const { cachedAudioBase64, ...planWithoutAudio } = plan;
        return { ...planWithoutAudio };
      });
    }
    
    setUserProfile(cleanedUser);
    try {
      await db.saveUserProfile(currentUser.uid, cleanedUser);
      console.log('User profile saved to Firestore successfully');
    } catch (error) {
      console.error('[App] Failed to save user profile:', error);
      setToast('Could not save your profile. Please try again.');
      setTimeout(() => setToast(null), 4000);
      throw error;
    }
  };

  const handleSaveJournalEntry = async (entry: JournalEntry) => {
    if (!currentUser) return;
    
    // Check if entry already exists (by ID only - allow multiple entries per day)
    const existingIndex = journalEntries.findIndex(e => e.id === entry.id);
    
    let updatedEntries: JournalEntry[];
    if (existingIndex !== -1) {
      // Update existing entry
      updatedEntries = [...journalEntries];
      updatedEntries[existingIndex] = entry;
    } else {
      // Add new entry
      updatedEntries = [entry, ...journalEntries];
    }
    
    setJournalEntries(updatedEntries);
    try {
      await db.saveJournalEntry(currentUser.uid, entry);
    } catch (error) {
      console.error('[App] Failed to save journal entry:', error);
      setToast('Could not save your journal entry. Please try again.');
      setTimeout(() => setToast(null), 4000);
      return;
    }

    // --- Gratitude list sync ---
    // Keep Gratitude List in sync with journal-backed gratitude content.
    // We key these by journal:<entryId> so re-saving updates instead of duplicating.
    const gratitudeTextFromEntry = (() => {
      const practiceText = entry.gratitudePractice?.trim();
      if (practiceText) return practiceText;

      const gratitudeText = (entry.gratitude || '').trim();
      if (!gratitudeText) return null;
      if (gratitudeText.includes('Lectio Divina:')) return null;
      return gratitudeText;
    })();

    const journalGratitudeId = `journal:${entry.id}`;
    const existingItems = userProfile.gratitudeItems || [];
    const withoutThis = existingItems.filter((item) => item.id !== journalGratitudeId);

    if (gratitudeTextFromEntry) {
      const syncedItem = {
        id: journalGratitudeId,
        text: gratitudeTextFromEntry,
        createdAt: entry.date
      };
      await handleUpdateUser({
        ...userProfile,
        gratitudeItems: [syncedItem, ...withoutThis]
      });
    } else {
      // If gratitude was cleared/removed from the journal entry, remove any previously synced item.
      if (withoutThis.length !== existingItems.length) {
        await handleUpdateUser({
          ...userProfile,
          gratitudeItems: withoutThis
        });
      }
    }

    setToast("Journal entry saved.");
    setTimeout(() => setToast(null), 3000);
  };

  const handleDeleteJournalEntry = async (id: string) => {
    if (!currentUser) return;
    setJournalEntries(journalEntries.filter(e => e.id !== id));
    await db.deleteJournalEntry(currentUser.uid, id);

    // Remove any journal-synced gratitude item.
    const journalGratitudeId = `journal:${id}`;
    const existingItems = userProfile.gratitudeItems || [];
    const filteredItems = existingItems.filter((item) => item.id !== journalGratitudeId);
    if (filteredItems.length !== existingItems.length) {
      await handleUpdateUser({
        ...userProfile,
        gratitudeItems: filteredItems
      });
    }

    setToast("Journal entry deleted.");
    setTimeout(() => setToast(null), 3000);
  };

  const handleAccessSharedTopic = async (topicId: string, ownerId: string) => {
    if (!currentUser) return;
    
    try {
      const result = await db.getSharedTopic(topicId);
      if (result) {
        const isOwner = result.ownerId === currentUser?.uid;
        const isPubliclyShared = result.topic.shareToken !== undefined;
        
        if (isOwner || isPubliclyShared) {
          // Owner gets edit permission, others get view-only
          const permission: 'view' | 'edit' = isOwner ? 'edit' : 'view';
          
          setSharedTopicData({ ...result, permission });
          setView({ type: 'TOPIC_DETAIL', topicId });
          
          // Update the shared topic reference with latest info
          if (!isOwner) {
            const ownerProfile = await db.getUserProfile(result.ownerId);
            const ownerName = ownerProfile?.name || 'Unknown User';
            
            await db.addSharedTopicReference(currentUser.uid, {
              topicId: result.topic.id,
              ownerId: result.ownerId,
              ownerName: ownerName,
              title: result.topic.title,
              accessedAt: Date.now()
            });
            
            const updatedProfile = await db.getUserProfile(currentUser.uid);
            if (updatedProfile) {
              setUserProfile(updatedProfile);
            }
          }
        } else {
          // Remove shared topic reference if no longer accessible
          await db.removeSharedTopicReference(currentUser.uid, topicId);
          const updatedProfile = await db.getUserProfile(currentUser.uid);
          if (updatedProfile) {
            setUserProfile(updatedProfile);
          }
          setView({ type: 'DASHBOARD' });
          setToast('You no longer have access to this shared topic');
          setTimeout(() => setToast(null), 3000);
        }
      } else {
        // Remove shared topic reference if topic no longer exists
        await db.removeSharedTopicReference(currentUser.uid, topicId);
        const updatedProfile = await db.getUserProfile(currentUser.uid);
        if (updatedProfile) {
          setUserProfile(updatedProfile);
        }
        setView({ type: 'DASHBOARD' });
        setToast('Shared topic not found');
        setTimeout(() => setToast(null), 3000);
      }
    } catch (error) {
      console.error('Error accessing shared topic:', error);
      setToast('Failed to load shared topic');
      setTimeout(() => setToast(null), 3000);
    }
  };

  // Theme Class
  const themeClass = userProfile.theme === 'default' ? 'theme-default' : `theme-${userProfile.theme}`;
  const showBottomNav = true;

  // --- RENDER ---

  if (authLoading || dataLoading || minLoadingTime) {
    return (
      <div 
        className="min-h-screen bg-texture-base flex items-center justify-center relative transition-opacity duration-300 ease-out"
        style={{ opacity: loadingScreenVisible ? 1 : 0 }}
      >
        <div className="flex flex-col items-center gap-4 relative z-10">
          <div className="w-32 h-32 md:w-48 md:h-48 flex items-center justify-center text-flame" style={{animation: 'float 6s ease-in-out 0.6s infinite'}}>
            <AnimatedLogo size={120} className="text-flame" />
          </div>
          <p className="text-oatmeal font-medium">Tending to your soul...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className={`min-h-screen bg-texture-base flex items-center justify-center transition-colors duration-500 ${themeClass}`}>
         <Login />
      </div>
    );
  }

  // Authenticated Content Logic
  let content;
  if (view.type === 'TOPIC_DETAIL') {
    // Check if we're viewing a shared topic
    const topic = sharedTopicData && sharedTopicData.topic.id === view.topicId 
      ? sharedTopicData.topic 
      : topics.find(t => t.id === view.topicId);
    
    if (topic) {
      // Only show prev/next for owned topics
      const isOwned = !sharedTopicData || sharedTopicData.ownerId === currentUser?.uid;
      let prevTopic, nextTopic;
      
      if (isOwned) {
        const matchingTopics = topics.filter(t => !!t.isArchived === !!topic.isArchived);
        const filteredIndex = matchingTopics.findIndex(t => t.id === topic.id);
        prevTopic = matchingTopics[filteredIndex - 1];
        nextTopic = matchingTopics[filteredIndex + 1];
      }

      content = (
        <TopicDetail 
          key={topic.id}
          topic={topic} 
          onBack={() => {
            setView({ type: 'DASHBOARD' });
            setSharedTopicData(null);
            setSharedTopicId(null);
          }} 
          onUpdateTopic={(updatedTopic) => {
            if (sharedTopicData && sharedTopicData.ownerId !== currentUser?.uid) {
              // Update shared topic in owner's collection
              handleUpdateSharedTopic(sharedTopicData.ownerId, updatedTopic);
            } else {
              handleUpdateTopic(updatedTopic);
            }
          }}
          onArchiveTopic={(archive) => handleArchiveTopic(topic.id, archive)}
          onDeleteTopic={() => handleDeleteTopic(topic.id)}
          onPrevious={prevTopic ? () => setView({ type: 'TOPIC_DETAIL', topicId: prevTopic.id }) : undefined}
          onNext={nextTopic ? () => setView({ type: 'TOPIC_DETAIL', topicId: nextTopic.id }) : undefined}
          isShared={sharedTopicData !== null && sharedTopicData.topic.id === topic.id}
          permission={sharedTopicData && sharedTopicData.topic.id === topic.id ? sharedTopicData.permission : 'edit'}
          ownerId={sharedTopicData?.ownerId}
          ownerName={sharedTopicData ? userProfile.sharedTopics?.find(st => st.topicId === topic.id)?.ownerName : undefined}
          onStopViewing={sharedTopicData && sharedTopicData.permission === 'view' ? () => handleStopViewingSharedTopic(topic.id) : undefined}
        />
      );
    } else {
      setView({ type: 'DASHBOARD' });
    }
  } else if (view.type === 'PROFILE') {
    content = (
      <Profile 
        user={userProfile} 
        onUpdateUser={handleUpdateUser} 
        onNavigateToHelp={() => setView({ type: 'HELP' })} 
        onSignOut={handleSignOut}
      />
    );
  } else if (view.type === 'SILENCE_TIMER') {
    content = (
      <SilenceTimer 
        onClose={() => setView({ type: 'DAILY_JOURNAL' })} 
        user={userProfile}
        onUpdateUser={handleUpdateUser}
        onSaveJournalEntry={handleSaveJournalEntry}
      />
    );
  } else if (view.type === 'NAMES_OF_GOD') {
    content = <NamesOfGod onSaveAsTopic={handleSaveNameAsTopic} />;
  } else if (view.type === 'MEMORIZE') {
    content = (
      <VerseMemorization 
        user={userProfile} 
        onUpdateUser={handleUpdateUser}
        onSaveJournalEntry={handleSaveJournalEntry}
        onNavigateToJournal={() => setView({ type: 'DAILY_JOURNAL' })}
      />
    );
  } else if (view.type === 'LECTIO') {
    content = (
      <LectioDivina 
        user={userProfile}
        onUpdateUser={handleUpdateUser}
        onSaveJournalEntry={handleSaveJournalEntry}
        onClose={() => setView({ type: 'DAILY_JOURNAL' })}
      />
    );
  } else if (view.type === 'DAILY_EXAMEN') {
    content = (
      <DailyExamen 
        onSaveEntry={handleSaveJournalEntry}
        onClose={() => setView({ type: 'DAILY_JOURNAL' })}
        user={userProfile}
        onUpdateUser={handleUpdateUser}
      />
    );
  } else if (view.type === 'FASTING') {
    content = (
      <Fasting
        user={userProfile}
        onUpdateUser={handleUpdateUser}
        onSaveJournalEntry={handleSaveJournalEntry}
        onNavigateToJournal={() => setView({ type: 'DAILY_JOURNAL' })}
      />
    );
  } else if (view.type === 'GRATITUDE_LIST') {
    content = (
      <GratitudeList 
        user={userProfile}
        onUpdateUser={handleUpdateUser}
        onSaveJournalEntry={handleSaveJournalEntry}
        onClose={() => setView({ type: 'DASHBOARD' })}
      />
    );
  } else if (view.type === 'RULE_OF_LIFE') {
    content = (
      <RuleOfLife
        user={userProfile}
        onUpdateUser={handleUpdateUser}
        onSaveJournalEntry={handleSaveJournalEntry}
        onDeleteJournalEntry={handleDeleteJournalEntry}
        journalEntries={journalEntries}
        onClose={() => setView({ type: 'DASHBOARD' })}
      />
    );
  } else if (view.type === 'DAILY_JOURNAL') {
    content = (
      <Dashboard
        key="daily-journal"
        topics={topics}
        journalEntries={journalEntries}
        sharedTopics={userProfile.sharedTopics || []}
        onTopicClick={(id) => setView({ type: 'TOPIC_DETAIL', topicId: id })}
        onSharedTopicClick={handleAccessSharedTopic}
        onAddTopic={handleAddTopic}
        onDeleteTopic={handleDeleteTopic}
        onArchiveTopic={handleArchiveTopic}
        onReorderTopic={handleReorderTopic}
        onSaveJournalEntry={handleSaveJournalEntry}
        onDeleteJournalEntry={handleDeleteJournalEntry}
        onNewJournalClick={() => setView({ type: 'JOURNAL_ENTRY' })}
        initialTab="JOURNAL"
        pageTitle="Daily Journal"
        pageIcon={<Icons.NotebookPen size={24} className="text-flame" />}
      />
    );
  } else if (view.type === 'JOURNAL_ENTRY') {
    content = (
      <JournalEntryEditor
        onSave={(entry: JournalEntry) => {
          handleSaveJournalEntry(entry);
          setView({ type: 'DAILY_JOURNAL' });
        }}
        onCancel={() => setView({ type: 'DAILY_JOURNAL' })}
      />
    );
  } else if (view.type === 'JOURNAL_ENTRY_EDIT') {
    const entry = journalEntries.find(e => e.id === view.entryId);
    const returnTo = view.returnTo || { type: 'DAILY_JOURNAL' as const };

    content = entry ? (
      <JournalEntryRuleOfLifeEditor
        entry={entry}
        focusPracticeId={view.focusPracticeId}
        onSave={(updated) => {
          handleSaveJournalEntry(updated);
          setView(returnTo);
        }}
        onCancel={() => setView(returnTo)}
      />
    ) : (
      <Dashboard
        key="daily-journal"
        topics={topics}
        journalEntries={journalEntries}
        sharedTopics={userProfile.sharedTopics || []}
        onTopicClick={(id) => setView({ type: 'TOPIC_DETAIL', topicId: id })}
        onSharedTopicClick={handleAccessSharedTopic}
        onAddTopic={handleAddTopic}
        onDeleteTopic={handleDeleteTopic}
        onArchiveTopic={handleArchiveTopic}
        onReorderTopic={handleReorderTopic}
        onSaveJournalEntry={handleSaveJournalEntry}
        onDeleteJournalEntry={handleDeleteJournalEntry}
        onNewJournalClick={() => setView({ type: 'JOURNAL_ENTRY' })}
        initialTab="JOURNAL"
        pageTitle="Daily Journal"
        pageIcon={<Icons.NotebookPen size={24} className="text-flame" />}
      />
    );
  } else if (view.type === 'HELP') {
    content = <Help onBack={() => setView({ type: 'PROFILE' })} />;
  } else {
    content = (
      <Dashboard
        key="prayer-list"
        topics={topics}
        journalEntries={journalEntries}
        sharedTopics={userProfile.sharedTopics || []}
        onTopicClick={(id) => setView({ type: 'TOPIC_DETAIL', topicId: id })}
        onSharedTopicClick={handleAccessSharedTopic}
        onAddTopic={handleAddTopic}
        onDeleteTopic={handleDeleteTopic}
        onArchiveTopic={handleArchiveTopic}
        onReorderTopic={handleReorderTopic}
        onSaveJournalEntry={handleSaveJournalEntry}
        onDeleteJournalEntry={handleDeleteJournalEntry}
        onNewJournalClick={() => setView({ type: 'JOURNAL_ENTRY' })}
        initialTab={view.type === 'DASHBOARD' ? view.tab : undefined}
        pageTitle={view.type === 'DASHBOARD' && view.tab === 'JOURNAL' ? 'Daily Journal' : 'Prayer List'}
        pageIcon={<Icons.Book size={24} className="text-flame" />}
      />
    );
  }

  return (
    <div className={`min-h-screen bg-texture-base transition-colors duration-500 ${themeClass} ${
      userProfile.fontSize === 'small' ? 'text-sm' : 
      userProfile.fontSize === 'large' ? 'text-lg' : 
      ''
    }`}>
      {/* Toast Notifications */}
      {toast && (
        <div className="fixed top-6 left-0 right-0 z-50 flex justify-center pointer-events-none">
          <div className="px-6 py-3 bg-emerald-600 text-white rounded-full shadow-xl text-sm font-medium animate-in fade-in slide-in-from-top-4 flex items-center pointer-events-auto">
            <Icons.CheckCircle size={16} className="mr-2" />
            {toast}
          </div>
        </div>
      )}

      {/* Overlay for mobile side nav */}
      {sideNavOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={() => setSideNavOpen(false)}
          style={{ opacity: sideNavOpen ? 1 : 0 }}
        />
      )}

      {/* Side Navigation - Left Side */}
      <nav
        className={`fixed top-0 left-0 bottom-0 h-full w-80 sm:w-72 md:w-64 max-w-[85vw] md:max-w-none bg-blue-abyssal shadow-2xl flex flex-col transition-transform duration-300 ease-out z-40 md:z-30 ${
          sideNavOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
        style={{ willChange: 'transform' }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setSideNavOpen(false);
        }}
      >
        {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-oatmeal/10 bg-blue-fantastic/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-flame/10 rounded-xl flex items-center justify-center">
                    <Logo size={24} className="text-flame" />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg text-palladian leading-tight">Heart Soil</h2>
                    <p className="text-xs text-oatmeal/60">Tend your soul</p>
                  </div>
                </div>
                <button
                  onClick={() => setSideNavOpen(false)}
                  className="md:hidden p-2 rounded-lg hover:bg-oatmeal/10 transition-colors"
                  aria-label="Close menu"
                >
                  <svg className="w-6 h-6 text-oatmeal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Navigation Items */}
              <div className="flex-1 overflow-y-auto py-2 px-3">
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      setView({ type: 'RULE_OF_LIFE' });
                      if (window.innerWidth < 768) setSideNavOpen(false);
                    }}
                    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all group ${
                      view.type === 'RULE_OF_LIFE'
                        ? 'bg-flame text-blue-abyssal shadow-md'
                        : 'text-oatmeal hover:bg-blue-fantastic/50 hover:text-palladian'
                    }`}
                  >
                    <Icons.Scroll size={22} strokeWidth={view.type === 'RULE_OF_LIFE' ? 2.5 : 2} className="flex-shrink-0" />
                    <span className="text-base font-medium">Rule of Life</span>
                  </button>

                  <button
                    onClick={() => {
                      setView({ type: 'DAILY_EXAMEN' });
                      if (window.innerWidth < 768) setSideNavOpen(false);
                    }}
                    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all group ${
                      view.type === 'DAILY_EXAMEN'
                        ? 'bg-flame text-blue-abyssal shadow-md'
                        : 'text-oatmeal hover:bg-blue-fantastic/50 hover:text-palladian'
                    }`}
                  >
                    <Icons.Sun size={22} strokeWidth={view.type === 'DAILY_EXAMEN' ? 2.5 : 2} className="flex-shrink-0" />
                    <span className="text-base font-medium">Daily Examen</span>
                  </button>

                  <button
                    onClick={() => {
                      setView({ type: 'DAILY_JOURNAL' });
                      if (window.innerWidth < 768) setSideNavOpen(false);
                    }}
                    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all group ${
                      view.type === 'DAILY_JOURNAL'
                        ? 'bg-flame text-blue-abyssal shadow-md'
                        : 'text-oatmeal hover:bg-blue-fantastic/50 hover:text-palladian'
                    }`}
                  >
                    <Icons.NotebookPen size={22} strokeWidth={view.type === 'DAILY_JOURNAL' ? 2.5 : 2} className="flex-shrink-0" />
                    <span className="text-base font-medium">Daily Journal</span>
                  </button>

                  <button
                    onClick={() => {
                      setView({ type: 'DASHBOARD' });
                      if (window.innerWidth < 768) setSideNavOpen(false);
                    }}
                    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all group ${
                      view.type === 'DASHBOARD'
                        ? 'bg-flame text-blue-abyssal shadow-md'
                        : 'text-oatmeal hover:bg-blue-fantastic/50 hover:text-palladian'
                    }`}
                  >
                    <Icons.Book size={22} strokeWidth={view.type === 'DASHBOARD' ? 2.5 : 2} className="flex-shrink-0" />
                    <span className="text-base font-medium">Prayer List</span>
                  </button>

                  <button
                    onClick={() => {
                      setView({ type: 'GRATITUDE_LIST' });
                      if (window.innerWidth < 768) setSideNavOpen(false);
                    }}
                    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all group ${
                      view.type === 'GRATITUDE_LIST'
                        ? 'bg-flame text-blue-abyssal shadow-md'
                        : 'text-oatmeal hover:bg-blue-fantastic/50 hover:text-palladian'
                    }`}
                  >
                    <Icons.Leaf size={22} strokeWidth={view.type === 'GRATITUDE_LIST' ? 2.5 : 2} className="flex-shrink-0" />
                    <span className="text-base font-medium">Gratitude</span>
                  </button>

                  <button
                    onClick={() => {
                      setView({ type: 'FASTING' });
                      if (window.innerWidth < 768) setSideNavOpen(false);
                    }}
                    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all group ${
                      view.type === 'FASTING'
                        ? 'bg-flame text-blue-abyssal shadow-md'
                        : 'text-oatmeal hover:bg-blue-fantastic/50 hover:text-palladian'
                    }`}
                  >
                    <Icons.Focus size={22} strokeWidth={view.type === 'FASTING' ? 2.5 : 2} className="flex-shrink-0" />
                    <span className="text-base font-medium">Fasting</span>
                  </button>

                  <button
                    onClick={() => {
                      setView({ type: 'LECTIO' });
                      if (window.innerWidth < 768) setSideNavOpen(false);
                    }}
                    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all group ${
                      view.type === 'LECTIO'
                        ? 'bg-flame text-blue-abyssal shadow-md'
                        : 'text-oatmeal hover:bg-blue-fantastic/50 hover:text-palladian'
                    }`}
                  >
                    <Icons.Feather size={22} strokeWidth={view.type === 'LECTIO' ? 2.5 : 2} className="flex-shrink-0" />
                    <span className="text-base font-medium">Lectio Divina</span>
                  </button>

                  <button
                    onClick={() => {
                      setView({ type: 'MEMORIZE' });
                      if (window.innerWidth < 768) setSideNavOpen(false);
                    }}
                    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all group ${
                      view.type === 'MEMORIZE'
                        ? 'bg-flame text-blue-abyssal shadow-md'
                        : 'text-oatmeal hover:bg-blue-fantastic/50 hover:text-palladian'
                    }`}
                  >
                    <Icons.BookmarkCheck size={22} strokeWidth={view.type === 'MEMORIZE' ? 2.5 : 2} className="flex-shrink-0" />
                    <span className="text-base font-medium">Memorize Scripture</span>
                  </button>

                  <button
                    onClick={() => {
                      setView({ type: 'SILENCE_TIMER' });
                      if (window.innerWidth < 768) setSideNavOpen(false);
                    }}
                    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all group ${
                      view.type === 'SILENCE_TIMER'
                        ? 'bg-flame text-blue-abyssal shadow-md'
                        : 'text-oatmeal hover:bg-blue-fantastic/50 hover:text-palladian'
                    }`}
                  >
                    <Icons.Timer size={22} strokeWidth={view.type === 'SILENCE_TIMER' ? 2.5 : 2} className="flex-shrink-0" />
                    <span className="text-base font-medium">Silence</span>
                  </button>

                  <button
                    onClick={() => {
                      setView({ type: 'NAMES_OF_GOD' });
                      if (window.innerWidth < 768) setSideNavOpen(false);
                    }}
                    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all group ${
                      view.type === 'NAMES_OF_GOD'
                        ? 'bg-flame text-blue-abyssal shadow-md'
                        : 'text-oatmeal hover:bg-blue-fantastic/50 hover:text-palladian'
                    }`}
                  >
                    <Icons.Heart size={22} strokeWidth={view.type === 'NAMES_OF_GOD' ? 2.5 : 2} className="flex-shrink-0" />
                    <span className="text-base font-medium">Names of God</span>
                  </button>
                </div>

                {/* Divider */}
                <div className="my-4 border-t border-oatmeal/10 max-md:hidden"></div>

                {/* Settings Section */}
                <div className="space-y-1 flex flex-col max-md:hidden">
                  <button
                    onClick={() => {
                      setView({ type: 'HELP' });
                      if (window.innerWidth < 768) setSideNavOpen(false);
                    }}
                    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all group ${
                      view.type === 'HELP'
                        ? 'bg-flame text-blue-abyssal shadow-md'
                        : 'text-oatmeal hover:bg-blue-fantastic/50 hover:text-palladian'
                    }`}
                  >
                    <Icons.Help size={22} strokeWidth={view.type === 'HELP' ? 2.5 : 2} className="flex-shrink-0" />
                    <span className="text-base font-medium">App Guide</span>
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-oatmeal/10 bg-blue-fantastic/20">
                <button
                  onClick={() => {
                    setView({ type: 'PROFILE' });
                    // Only close sidebar on mobile
                    if (window.innerWidth < 768) {
                      setSideNavOpen(false);
                    }
                  }}
                  className="w-full flex items-center gap-3 mb-3 p-2 rounded-lg hover:bg-oatmeal/10 transition-colors"
                >
                  <div className="w-10 h-10 flex-shrink-0 rounded-full bg-oatmeal/10 flex items-center justify-center">
                    <span className="text-sm font-bold text-flame">{userProfile.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                  </div>
                  <div className="flex-1 min-w-0 overflow-hidden text-left">
                    <p className="text-sm font-medium text-palladian truncate">{userProfile.name || 'User'}</p>
                    <p className="text-xs text-oatmeal/60 truncate" title={currentUser?.email || ''}>{currentUser?.email}</p>
                  </div>
                </button>
                <button
                  onClick={() => {
                    handleSignOut();
                    setSideNavOpen(false);
                  }}
                  className="w-full px-4 py-2 text-sm text-oatmeal hover:text-palladian hover:bg-oatmeal/10 rounded-lg transition-colors flex items-center gap-2 justify-center"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign Out
                </button>
              </div>
            </nav>

      {/* Bottom Tab Bar - Mobile Only */}
      {showBottomNav && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-blue-abyssal/95 backdrop-blur-md border-t border-oatmeal/10 z-30" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="flex items-center justify-around px-2 pt-2 pb-3">
            {/* Menu Button - Always First */}
            <button
              onClick={() => setSideNavOpen(true)}
              className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all min-w-[70px] text-oatmeal/70 active:text-oatmeal"
            >
              <Icons.Menu size={24} strokeWidth={2} />
              <span className="text-xs font-medium">Menu</span>
            </button>
            
            {/* Custom Navigation Items */}
            {(userProfile.mobileNavItems || DEFAULT_MOBILE_NAV).slice(0, 3).map((item, index) => {
              const iconName = item.view?.type === 'GRATITUDE_LIST' ? 'Leaf' : item.icon;
              const IconComponent = Icons[iconName as keyof typeof Icons] as React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
              const isActive = JSON.stringify(view) === JSON.stringify(item.view);
              
              return (
                <button
                  key={index}
                  onClick={() => setView(item.view)}
                  className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all min-w-[70px] ${
                    isActive ? 'text-flame' : 'text-oatmeal/70 active:text-oatmeal'
                  }`}
                >
                  <IconComponent size={24} strokeWidth={isActive ? 2.5 : 2} />
                  <span className="text-xs font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Content Area - Offset on desktop for sidebar */}
      <div className="min-h-screen md:ml-64 flex justify-center">
        <div className="w-full max-w-md md:max-w-2xl lg:max-w-4xl bg-blue-abyssal/95 min-h-screen shadow-2xl shadow-black flex flex-col transition-colors duration-500 backdrop-blur-sm">
          {/* Beta Banner */}
          {!betaBannerDismissed && (
            <div className="bg-blue-fantastic/30 border-b border-oatmeal/10 px-4 py-2.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-xs font-semibold text-flame uppercase tracking-wide flex-shrink-0">Beta</span>
                <p className="text-xs text-oatmeal/80 leading-relaxed">
                  Thank you for your patience as we continue to improve the app experience.
                </p>
              </div>
              <button
                onClick={() => {
                  setBetaBannerDismissed(true);
                  localStorage.setItem('betaBannerDismissed', 'true');
                }}
                className="flex-shrink-0 p-1 hover:bg-blue-fantastic/50 rounded transition-colors"
                aria-label="Dismiss banner"
              >
                <Icons.X size={16} className="text-oatmeal/60 hover:text-oatmeal" />
              </button>
            </div>
          )}
          <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-fantastic scrollbar-track-blue-abyssal">
            {content}
          </main>
        </div>
      </div>

            {/* Welcome Modal for New Users */}
      {welcomeModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-blue-abyssal rounded-xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-300 my-8">
            <h2 className="text-2xl font-bold text-flame mb-2">Welcome to Heart Soil!</h2>
            <p className="text-oatmeal mb-6">Tend your soul. A toolkit for spiritual formation.</p>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-palladian mb-2">Display Name</label>
                <input
                  type="text"
                  value={userProfile.name || ''}
                  onChange={(e) => setUserProfile({ ...userProfile, name: e.target.value })}
                  className="w-full bg-blue-fantastic text-oatmeal px-4 py-3 rounded-lg border border-blue-fantastic focus:border-flame focus:outline-none"
                  placeholder="Enter your name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-palladian mb-3">Choose a Theme</label>
                <div className="grid grid-cols-2 gap-3">
                  {THEMES.slice(0, 6).map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setUserProfile({ ...userProfile, theme: theme.id })}
                      className={`relative flex flex-col items-center p-3 rounded-lg border-2 transition-all ${userProfile.theme === theme.id ? 'border-flame bg-blue-fantastic shadow-md' : 'border-transparent hover:bg-blue-fantastic/50'}`}
                    >
                      <div className="flex gap-1.5 mb-2">
                        <div className="w-6 h-6 rounded-full shadow-sm border border-oatmeal/10" style={{ backgroundColor: theme.colors[0] }}></div>
                        <div className="w-6 h-6 rounded-full shadow-sm border border-oatmeal/10" style={{ backgroundColor: theme.colors[1] }}></div>
                      </div>
                      <span className={`text-xs font-medium ${userProfile.theme === theme.id ? 'text-flame' : 'text-oatmeal'}`}>
                        {theme.name.split(' ')[0]}
                      </span>
                      {userProfile.theme === theme.id && (
                        <div className="absolute top-2 right-2 text-flame">
                          <Icons.CheckCircle size={14} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-oatmeal/70 mt-2">You can change this anytime in Settings</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={async () => {
                    if (currentUser) {
                      if (!userProfile.name?.trim()) {
                        setToast('Please enter your name');
                        setTimeout(() => setToast(null), 3000);
                        return;
                      }
                      await db.saveUserProfile(currentUser.uid, userProfile);
                      setWelcomeModalOpen(false);
                      setToast('Welcome! Your profile has been set up.');
                      setTimeout(() => setToast(null), 3000);
                    }
                  }}
                  className="flex-1 bg-flame text-blue-abyssal px-6 py-3 rounded-lg font-semibold hover:bg-flame/90 transition-colors"
                >
                  Get Started
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Install Prompt Banner */}
      <InstallPromptBanner />

      {/* Notification Permission Prompt for PWA */}
      {currentUser && <NotificationPrompt userId={currentUser.uid} />}
    </div>
  );
};

export default App;