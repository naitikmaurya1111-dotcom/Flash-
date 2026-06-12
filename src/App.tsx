import { useState, useEffect, useMemo } from "react";
import { Clock, Users, ClipboardList, TrendingUp, Sparkles, BookOpen, Award, Flame, CloudLightning, LogOut, LogIn, Home, ClipboardCheck, Calendar, Bell, Sun, Moon, Layers, Maximize2, Minimize2, Mail, Lock, X, Info, User as UserIcon } from "lucide-react";
import { Subject, Task, StudyLog, Reminder, GiftReward, XpGainLog, QuestChallenge } from "./types";
import { INITIAL_SUBJECTS, INITIAL_CLASSMATES } from "./data";
import RewardSystem from "./components/RewardSystem";
import { 
  collection, 
  doc, 
  getDoc,
  setDoc, 
  deleteDoc, 
  getDocs, 
  getDocFromServer 
} from "firebase/firestore";
import { db, auth, initAuth, googleSignIn, logout, getAccessToken, emailPasswordSignUp, emailPasswordSignIn } from "./lib/googleApi";
import { User } from "firebase/auth";

// Import modules
import ClassmateGrid from "./components/ClassmateGrid";
import PlannerHub from "./components/PlannerHub";
import AnalyticsDashboard from "./components/AnalyticsDashboard";
import AICoachCard from "./components/AICoachCard";
import WorkspaceHub from "./components/WorkspaceHub";

// Custom YPT-themed modules
import TimelineView from "./components/TimelineView";
import CalendarView from "./components/CalendarView";
import FeatureSidebar from "./components/FeatureSidebar";
import RemindersHub, { playChime } from "./components/RemindersHub";


// Firestore Error Helper (from firebase-integration skill)
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errorMsg = error instanceof Error ? error.message : String(error);
  const isPermissionError = errorMsg.toLowerCase().includes("permission") || 
                            errorMsg.toLowerCase().includes("insufficient") ||
                            errorMsg.toLowerCase().includes("denied");

  const errInfo: FirestoreErrorInfo = {
    error: errorMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };

  if (isPermissionError) {
    console.error('Firestore Error Details: ', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  } else {
    // For expected offline/network statuses, use warning so it does not toast/crash host container
    console.warn('Firestore Operation Warn: ', JSON.stringify(errInfo));
  }
}

const getAvatarSeed = (email?: string | null) => {
  if (!email) return "bg-emerald-500";
  const colors = [
    "bg-teal-500", 
    "bg-rose-500", 
    "bg-indigo-500", 
    "bg-amber-500", 
    "bg-pink-500", 
    "bg-purple-500", 
    "bg-blue-500", 
    "bg-emerald-500"
  ];
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export default function App() {
  const [activeTab, setActiveTab] = useState<"focus" | "rooms" | "planner" | "analytics" | "ai-coach" | "workspace" | "calendar" | "reminders" | "rewards">("focus");
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // YPT configuration overlays
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [themePreset, setThemePreset] = useState(() => localStorage.getItem("ypt_theme_preset") || "dark-classic");
  const [themeMode, setThemeMode] = useState<"light" | "dark">(() => (localStorage.getItem("study_theme_mode") as "light" | "dark") || "dark");
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [isWideHud, setIsWideHud] = useState(() => {
    const local = localStorage.getItem("ypt_wide_hud");
    return local !== null ? local === "true" : true; // Default to wide hud enabled for premium tablet landscape feel
  });

  // Reminders and local active alert popups
  const [reminders, setReminders] = useState<Reminder[]>(() => {
    const local = localStorage.getItem("study_reminders");
    if (local) return JSON.parse(local);
    return [
      { id: "rem-1", title: "💦 Hydration Water Check", time: "45", type: "timer", durationMinutes: 45, isActive: true, isCompleted: false },
      { id: "rem-2", title: "🧘 Posture Stretch Break", time: "60", type: "timer", durationMinutes: 60, isActive: true, isCompleted: false },
      { id: "rem-3", title: "📝 Checkoff Daily Study Goal", time: "20:00", type: "daily", isActive: true, isCompleted: false }
    ];
  });
  const [firedNotification, setFiredNotification] = useState<string | null>(null);

  // YPT Lobby real-time states
  const [joinedRoomId, setJoinedRoomId] = useState<string | null>(() => {
    return localStorage.getItem("ypt_joined_room_id");
  });
  const [isStudyingUser, setIsStudyingUser] = useState<boolean>(() => {
    return localStorage.getItem("study_is_studying") === "true";
  });
  const [activeSecondsUser, setActiveSecondsUser] = useState<number>(() => {
    const s = localStorage.getItem("study_active_seconds_user");
    return s ? parseInt(s, 10) : 0;
  });

  // Precise background-resilient timestamp tracking state
  const [studyStartTime, setStudyStartTime] = useState<number | null>(() => {
    const val = localStorage.getItem("study_start_time_ms");
    return val ? parseInt(val, 10) : null;
  });
  const [studySecondsBaseline, setStudySecondsBaseline] = useState<number>(() => {
    const val = localStorage.getItem("study_seconds_baseline");
    return val ? parseInt(val, 10) : 0;
  });

  // Root Study Timer / Pomodoro configurations
  const [timerType, setTimerType] = useState<"stopwatch" | "pomodoro">(() => {
    return (localStorage.getItem("study_timer_type") as "stopwatch" | "pomodoro") || "stopwatch";
  });
  const [pomoState, setPomoState] = useState<"focus" | "shortBreak" | "longBreak">(() => {
    return (localStorage.getItem("study_pomo_state") as "focus" | "shortBreak" | "longBreak") || "focus";
  });
  const [pomoRound, setPomoRound] = useState<number>(() => {
    const r = localStorage.getItem("study_pomo_round");
    return r ? parseInt(r, 10) : 1;
  });
  const [pomoFocusDuration, setPomoFocusDuration] = useState<number>(() => {
    const d = localStorage.getItem("study_pomo_focus_duration");
    return d ? parseInt(d, 10) : 25;
  });
  const [pomoShortBreakDuration, setPomoShortBreakDuration] = useState<number>(() => {
    const d = localStorage.getItem("study_pomo_short_duration");
    return d ? parseInt(d, 10) : 5;
  });
  const [pomoLongBreakDuration, setPomoLongBreakDuration] = useState<number>(() => {
    const d = localStorage.getItem("study_pomo_long_duration");
    return d ? parseInt(d, 10) : 15;
  });
  const [pomoSecondsLeft, setPomoSecondsLeft] = useState<number>(() => {
    const s = localStorage.getItem("study_pomo_seconds_left");
    if (s) return parseInt(s, 10);
    return 25 * 60; // Default to 25 mins Focus
  });

  // Sync Pomodoro/Timer Configuration
  useEffect(() => {
    localStorage.setItem("study_timer_type", timerType);
    localStorage.setItem("study_pomo_state", pomoState);
    localStorage.setItem("study_pomo_round", pomoRound.toString());
    localStorage.setItem("study_pomo_focus_duration", pomoFocusDuration.toString());
    localStorage.setItem("study_pomo_short_duration", pomoShortBreakDuration.toString());
    localStorage.setItem("study_pomo_long_duration", pomoLongBreakDuration.toString());
    localStorage.setItem("study_pomo_seconds_left", pomoSecondsLeft.toString());
    localStorage.setItem("study_is_studying", isStudyingUser.toString());
    localStorage.setItem("study_active_seconds_user", activeSecondsUser.toString());
  }, [timerType, pomoState, pomoRound, pomoFocusDuration, pomoShortBreakDuration, pomoLongBreakDuration, pomoSecondsLeft, isStudyingUser, activeSecondsUser]);

  // AI coach advice sharing state (retrieved from dynamic coach executions)
  const [aiCoachAdvice, setAiCoachAdvice] = useState<{ quote: string; rating: string; scheduleTip: string } | null>(() => {
    const local = localStorage.getItem("study_ai_advice");
    return local ? JSON.parse(local) : null;
  });

  // 1. Core Reactive States loaded with local storage and mock seeds
  const [subjects, setSubjects] = useState<Subject[]>(() => {
    const local = localStorage.getItem("study_subjects");
    return local ? JSON.parse(local) : INITIAL_SUBJECTS;
  });

  const [tasks, setTasks] = useState<Task[]>(() => {
    const local = localStorage.getItem("study_tasks");
    return local ? JSON.parse(local) : [];
  });

  const [studyLogs, setStudyLogs] = useState<StudyLog[]>(() => {
    const local = localStorage.getItem("study_logs");
    return local ? JSON.parse(local) : [];
  });

  const [activeSubjectId, setActiveSubjectId] = useState<string>(() => {
    return INITIAL_SUBJECTS[0]?.id || "";
  });

  const [dailyTargetMinutes, setDailyTargetMinutes] = useState<number>(() => {
    const local = localStorage.getItem("study_daily_target");
    return local ? parseInt(local) : 240; // 4 hours goal
  });

  // ==================== REWARD SYSTEMS STATS & CONFIGS ====================
  const [userXp, setUserXp] = useState<number>(() => {
    const local = localStorage.getItem("study_user_xp");
    return local ? parseInt(local, 10) : 0;
  });

  const INITIAL_QUESTS: QuestChallenge[] = [
    { id: "quest-daily-focus", title: "Daily Deep Focus ⏱️", condition: "Study for 30 minutes today", xpReward: 150, isCompleted: false, category: "daily" },
    { id: "quest-deep-dive", title: "Milestone: Deep Work 🧠", condition: "Study for 120 minutes today", xpReward: 400, isCompleted: false, category: "milestone" },
    { id: "quest-task-crusher", title: "To-Do Complete ✔️", condition: "Mark 1 task on check-list today", xpReward: 50, isCompleted: false, category: "daily" },
    { id: "quest-speed-demon", title: "Checklist Sweeper 🧹", condition: "Mark 3 tasks on check-list today", xpReward: 150, isCompleted: false, category: "daily" }
  ];

  const [quests, setQuests] = useState<QuestChallenge[]>(() => {
    const local = localStorage.getItem("study_quests");
    return local ? JSON.parse(local) : INITIAL_QUESTS;
  });

  const [rewards, setRewards] = useState<GiftReward[]>(() => {
    const local = localStorage.getItem("study_rewards");
    const defaults: GiftReward[] = [
      { id: "def-1", title: "☕ Coffee Break Boost", costXp: 200, purchaseUrl: "https://www.amazon.com/s?k=gourmet+coffee", category: "Daily Treats", isUnlocked: false, isClaimed: false, notes: "A crisp hot caffeine mug to celebrate your hard studies!", createdAt: new Date().toISOString() },
      { id: "def-2", title: "📚 Self-Directed Ebook", costXp: 800, purchaseUrl: "https://www.amazon.com/s?k=kindle+books", category: "Books & Supplies", isUnlocked: false, isClaimed: false, notes: "Unlock any Kindle study/story book to unwind.", createdAt: new Date().toISOString() },
      { id: "def-3", title: "🎧 Noise Isolating Earplugs", costXp: 1500, purchaseUrl: "https://www.amazon.com/s?k=noise+reduction+earplugs+for+study", category: "Tech Gadget", isUnlocked: false, isClaimed: false, notes: "Acoustic peace to supercharge your deep focus blocks.", createdAt: new Date().toISOString() }
    ];
    return local ? JSON.parse(local) : defaults;
  });

  const [xpLogs, setXpLogs] = useState<XpGainLog[]>(() => {
    const local = localStorage.getItem("study_xp_logs");
    return local ? JSON.parse(local) : [];
  });

  // 0. Connection Test (Pillar Requirements)
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, "test", "connection"));
      } catch (error) {
        if (error instanceof Error && error.message.includes("offline")) {
          console.warn("Please check your Firebase configuration (client is currently offline).");
        } else {
          console.error("Firebase connection check error:", error);
        }
      }
    }
    testConnection();
  }, []);

  // Listen to Google Sign-In persistence and load/sync with Firestore
  useEffect(() => {
    const unsubscribe = initAuth(
      async (user) => {
        setCurrentUser(user);
        // Load cloud synced collections with a fast timeout-race to prevent freezing
        try {
          // Fetch Cloud profile
          const userDocRef = doc(db, "users", user.uid);
          const subCol = collection(db, "users", user.uid, "subjects");
          const taskCol = collection(db, "users", user.uid, "tasks");
          const logCol = collection(db, "users", user.uid, "studyLogs");
          const rewardsCol = collection(db, "users", user.uid, "rewards");
          const questsCol = collection(db, "users", user.uid, "quests");
          const xpLogsCol = collection(db, "users", user.uid, "xpLogs");

          const cloudFetchPromise = Promise.all([
            getDoc(userDocRef),
            getDocs(subCol),
            getDocs(taskCol),
            getDocs(logCol),
            getDocs(rewardsCol),
            getDocs(questsCol),
            getDocs(xpLogsCol)
          ]);

          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => {
              reject(new Error("Firestore fetch timed out (3000ms threshold reached). Running in offline-resilient mode."));
            }, 3000);
          });

          // Race the Firestore query against our 3s timeout
          const [userSnap, subSnap, taskSnap, logSnap, rewardsSnap, questsSnap, xpLogsSnap] = await Promise.race([
            cloudFetchPromise,
            timeoutPromise
          ]);

          // Fetch or initialize customizable target minutes
          if (userSnap.exists()) {
            const userData = userSnap.data();
            if (userData.dailyTargetMinutes) {
              setDailyTargetMinutes(userData.dailyTargetMinutes);
            }
            if (userData.xp !== undefined) {
              setUserXp(userData.xp);
            }
          } else {
            // Register Student configuration profile (asynchronous background write)
            setDoc(userDocRef, {
              userId: user.uid,
              email: user.email || "",
              displayName: user.displayName || "Scholar",
              dailyTargetMinutes: dailyTargetMinutes,
              xp: userXp
            }).catch(e => console.warn("Background user registration failed:", e));
          }

          const loadedSubs: Subject[] = [];
          const loadedTasks: Task[] = [];
          const loadedLogs: StudyLog[] = [];
          const loadedRewards: GiftReward[] = [];
          const loadedQuests: QuestChallenge[] = [];
          const loadedXpLogs: XpGainLog[] = [];

          subSnap.forEach(d => loadedSubs.push(d.data() as Subject));
          taskSnap.forEach(d => loadedTasks.push(d.data() as Task));
          logSnap.forEach(d => loadedLogs.push(d.data() as StudyLog));
          rewardsSnap.forEach(d => loadedRewards.push(d.data() as GiftReward));
          questsSnap.forEach(d => loadedQuests.push(d.data() as QuestChallenge));
          xpLogsSnap.forEach(d => loadedXpLogs.push(d.data() as XpGainLog));

          // Onboarding cloud sync (if brand new cloud account - write current offline state in background)
          if (loadedSubs.length === 0) {
            subjects.forEach((sub) => {
              setDoc(doc(db, "users", user.uid, "subjects", sub.id), sub).catch(() => {});
            });
            tasks.forEach((tsk) => {
              setDoc(doc(db, "users", user.uid, "tasks", tsk.id), tsk).catch(() => {});
            });
            studyLogs.slice(0, 50).forEach((lg) => {
              setDoc(doc(db, "users", user.uid, "studyLogs", lg.id), lg).catch(() => {});
            });
            rewards.forEach((r) => {
              setDoc(doc(db, "users", user.uid, "rewards", r.id), r).catch(() => {});
            });
            quests.forEach((q) => {
              setDoc(doc(db, "users", user.uid, "quests", q.id), q).catch(() => {});
            });
            xpLogs.slice(0, 50).forEach((xlg) => {
              setDoc(doc(db, "users", user.uid, "xpLogs", xlg.id), xlg).catch(() => {});
            });
          } else {
            // Apply loaded cloud profile
            setSubjects(loadedSubs);
            setTasks(loadedTasks);
            setStudyLogs(loadedLogs);
            if (loadedRewards.length > 0) setRewards(loadedRewards);
            if (loadedQuests.length > 0) setQuests(loadedQuests);
            if (loadedXpLogs.length > 0) setXpLogs(loadedXpLogs);
          }
        } catch (err) {
          console.warn("Firestore sync failed or timed out on init, loading offline cache data instead.", err);
          
          // Clear cloud loading state and fallback to local storage safely
          const localSubs = localStorage.getItem("study_subjects");
          const localTasks = localStorage.getItem("study_tasks");
          const localLogs = localStorage.getItem("study_logs");
          const localXp = localStorage.getItem("study_user_xp");
          const localRewards = localStorage.getItem("study_rewards");
          const localQuests = localStorage.getItem("study_quests");
          const localXpLogs = localStorage.getItem("study_xp_logs");

          setSubjects(localSubs ? JSON.parse(localSubs) : INITIAL_SUBJECTS);
          setTasks(localTasks ? JSON.parse(localTasks) : []);
          setStudyLogs(localLogs ? JSON.parse(localLogs) : []);
          setUserXp(localXp ? parseInt(localXp, 10) : 0);
          setRewards(localRewards ? JSON.parse(localRewards) : []);
          setQuests(localQuests ? JSON.parse(localQuests) : INITIAL_QUESTS);
          setXpLogs(localXpLogs ? JSON.parse(localXpLogs) : []);

          handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
        }
      },
      () => {
        setCurrentUser(null);
        // Clear screen data to restore clean guest values / protect user sign-outs
        const localSubs = localStorage.getItem("study_subjects");
        const localTasks = localStorage.getItem("study_tasks");
        const localLogs = localStorage.getItem("study_logs");
        const localXp = localStorage.getItem("study_user_xp");
        const localRewards = localStorage.getItem("study_rewards");
        const localQuests = localStorage.getItem("study_quests");
        const localXpLogs = localStorage.getItem("study_xp_logs");

        setSubjects(localSubs ? JSON.parse(localSubs) : INITIAL_SUBJECTS);
        setTasks(localTasks ? JSON.parse(localTasks) : []);
        setStudyLogs(localLogs ? JSON.parse(localLogs) : []);
        setUserXp(localXp ? parseInt(localXp, 10) : 0);
        setRewards(localRewards ? JSON.parse(localRewards) : []);
        setQuests(localQuests ? JSON.parse(localQuests) : INITIAL_QUESTS);
        setXpLogs(localXpLogs ? JSON.parse(localXpLogs) : []);
      }
    );
    return () => unsubscribe();
  }, []);

  // Calculate Streak based on study logs dynamically
  const activeStreakCount = useMemo(() => {
    const uniqueDatesSet = new Set<string>();
    
    // Check did study today
    const todayStr = new Date().toISOString().split("T")[0];
    const studiedToday = studyLogs.some(l => l.date === todayStr && l.durationMinutes >= 1) || (isStudyingUser && activeSecondsUser > 0);
    if (studiedToday) {
      uniqueDatesSet.add(todayStr);
    }

    studyLogs.forEach(l => {
      if (l.durationMinutes >= 1) {
        uniqueDatesSet.add(l.date);
      }
    });

    if (uniqueDatesSet.size === 0) return 0;

    let streakVal = 0;
    const trackerDate = new Date();
    
    const containsToday = uniqueDatesSet.has(trackerDate.toISOString().split("T")[0]);
    
    trackerDate.setDate(trackerDate.getDate() - 1);
    const containsYesterday = uniqueDatesSet.has(trackerDate.toISOString().split("T")[0]);

    if (!containsToday && !containsYesterday) {
      return 0; // broken
    }

    const testDate = new Date();
    if (!containsToday && containsYesterday) {
      testDate.setDate(testDate.getDate() - 1);
    }

    while (true) {
      const curDateStr = testDate.toISOString().split("T")[0];
      if (uniqueDatesSet.has(curDateStr)) {
        streakVal++;
        testDate.setDate(testDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streakVal;
  }, [studyLogs, isStudyingUser, activeSecondsUser]);

  // Sync to local systems
  useEffect(() => {
    localStorage.setItem("study_subjects", JSON.stringify(subjects));
  }, [subjects]);

  useEffect(() => {
    localStorage.setItem("study_tasks", JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem("study_logs", JSON.stringify(studyLogs));
  }, [studyLogs]);

  useEffect(() => {
    localStorage.setItem("study_daily_target", String(dailyTargetMinutes));
    // Also sync to active student profile document on Firestore
    if (currentUser) {
      const syncProfile = async () => {
        try {
          await setDoc(doc(db, "users", currentUser.uid), {
            userId: currentUser.uid,
            email: currentUser.email || "",
            displayName: currentUser.displayName || "Scholar",
            dailyTargetMinutes
          }, { merge: true });
        } catch (err) {
          console.error("Failed syncing daily target minutes to profile:", err);
        }
      };
      syncProfile();
    }
  }, [dailyTargetMinutes, currentUser]);

  useEffect(() => {
    localStorage.setItem("ypt_theme_preset", themePreset);
  }, [themePreset]);

  useEffect(() => {
    localStorage.setItem("study_theme_mode", themeMode);
    if (themeMode === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [themeMode]);

  useEffect(() => {
    if (joinedRoomId) {
      localStorage.setItem("ypt_joined_room_id", joinedRoomId);
    } else {
      localStorage.removeItem("ypt_joined_room_id");
    }
  }, [joinedRoomId]);

  // Reminders saving
  useEffect(() => {
    localStorage.setItem("study_reminders", JSON.stringify(reminders));
  }, [reminders]);

  // Alert triggers system callbacks
  const handleAddReminder = (newRem: Omit<Reminder, "id" | "isCompleted" | "triggeredAt">) => {
    const fresh: Reminder = {
      ...newRem,
      id: `rem-${Date.now()}`,
      isCompleted: false
    };
    setReminders(prev => [...prev, fresh]);
  };

  const handleToggleReminder = (remId: string) => {
    setReminders(prev => prev.map(r => r.id === remId ? { ...r, isActive: !r.isActive } : r));
  };

  const handleRemoveReminder = (remId: string) => {
    setReminders(prev => prev.filter(r => r.id !== remId));
  };

  // Trigger browser & full system alerts
  const handleTriggerAlarm = (title: string) => {
    playChime("chime");
    
    // Attempt standard OS Web Notification
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      try {
        new Notification("StudyPulse Focus Alert", {
          body: title,
          icon: "/favicon.ico"
        });
      } catch (err) {
        console.warn("Push alert failed, falling back to in-app overlay:", err);
      }
    }
    
    setFiredNotification(title);
  };

  // Background clock check and interactive timer ticker checks
  useEffect(() => {
    const checkInterval = setInterval(() => {
      const now = new Date();
      const currentHHMM = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      
      let updatedReminders = [...reminders];
      let triggeredTitle: string | null = null;

      updatedReminders = updatedReminders.map(rem => {
        if (!rem.isActive || rem.isCompleted) return rem;

        // A. Daily schedule alarms matching
        if (rem.type === "daily" || rem.type === "one-shot") {
          if (rem.time === currentHHMM) {
            const todayStr = now.toDateString();
            const alreadyFiredToday = rem.triggeredAt && new Date(rem.triggeredAt).toDateString() === todayStr;

            if (!alreadyFiredToday) {
              triggeredTitle = rem.title;
              return {
                ...rem,
                isActive: rem.type === "daily", // disable if one-shot
                isCompleted: rem.type === "one-shot",
                triggeredAt: now.toISOString()
              };
            }
          }
        }
        return rem;
      });

      if (triggeredTitle) {
        setReminders(updatedReminders);
        handleTriggerAlarm(triggeredTitle);
      }
    }, 5000); // Check every 5s

    return () => clearInterval(checkInterval);
  }, [reminders]);

  // Dynamic ticking countdown relative timers checking linked directly to focus seconds!
  useEffect(() => {
    if (!isStudyingUser || activeSecondsUser <= 0) return;
    
    // Check did we hit a minute boundary?
    if (activeSecondsUser % 60 === 0) {
      const elapsedMins = activeSecondsUser / 60;
      let triggeredTitle: string | null = null;
      let updatedReminders = [...reminders];

      updatedReminders = updatedReminders.map(rem => {
        if (!rem.isActive || rem.type !== "timer" || !rem.durationMinutes) return rem;

        if (elapsedMins % rem.durationMinutes === 0) {
          triggeredTitle = `${rem.title} (Studied for ${elapsedMins}m of active focus!)`;
          return {
            ...rem,
            triggeredAt: new Date().toISOString()
          };
        }
        return rem;
      });

      if (triggeredTitle) {
        setReminders(updatedReminders);
        handleTriggerAlarm(triggeredTitle);
      }
    }
  }, [activeSecondsUser, isStudyingUser]);


  // Web Audio double bell chime generator
  const playPomoChime = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const currentTime = ctx.currentTime;
      
      // Dual high frequency bell note combination resembling an analog study alarm
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(523.25, currentTime); // C5
      gain1.gain.setValueAtTime(0.25, currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, currentTime + 1.0);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(currentTime + 1.1);
      
      setTimeout(() => {
        try {
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.type = "sine";
          osc2.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
          gain2.gain.setValueAtTime(0.3, ctx.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.4);
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.start();
          osc2.stop(ctx.currentTime + 1.5);
        } catch (_) {}
      }, 150);
    } catch (e) {
      console.warn("Web audio playback bypassed due to environment constraints: ", e);
    }
  };

  // 1. Synchronize study start time and baseline when isStudyingUser toggles
  useEffect(() => {
    if (isStudyingUser) {
      if (studyStartTime === null) {
        const now = Date.now();
        const baseline = timerType === "stopwatch" ? activeSecondsUser : pomoSecondsLeft;
        setStudyStartTime(now);
        setStudySecondsBaseline(baseline);
        localStorage.setItem("study_start_time_ms", now.toString());
        localStorage.setItem("study_seconds_baseline", baseline.toString());
      }
    } else {
      if (studyStartTime !== null) {
        const elapsed = Math.floor((Date.now() - studyStartTime) / 1000);
        if (timerType === "stopwatch") {
          setActiveSecondsUser(studySecondsBaseline + elapsed);
        } else if (timerType === "pomodoro") {
          setPomoSecondsLeft(Math.max(0, studySecondsBaseline - elapsed));
        }
      }
      setStudyStartTime(null);
      setStudySecondsBaseline(0);
      localStorage.removeItem("study_start_time_ms");
      localStorage.removeItem("study_seconds_baseline");
    }
  }, [isStudyingUser, timerType]);

  // 2. Sync timer immediately when browser tab status changes or Chrome minimizes/restores
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isStudyingUser && studyStartTime !== null) {
        const elapsed = Math.floor((Date.now() - studyStartTime) / 1000);
        if (timerType === "stopwatch") {
          setActiveSecondsUser(studySecondsBaseline + elapsed);
        } else if (timerType === "pomodoro") {
          setPomoSecondsLeft(Math.max(0, studySecondsBaseline - elapsed));
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isStudyingUser, studyStartTime, studySecondsBaseline, timerType]);

  // 3. Root Study Ticking loop that uses actual timestamps to be completely resilient against background throttling
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isStudyingUser && studyStartTime !== null) {
      const tick = () => {
        const elapsedSecs = Math.floor((Date.now() - studyStartTime) / 1000);
        if (timerType === "stopwatch") {
          setActiveSecondsUser(studySecondsBaseline + elapsedSecs);
        } else if (timerType === "pomodoro") {
          setPomoSecondsLeft(Math.max(0, studySecondsBaseline - elapsedSecs));
        }
      };
      
      tick();
      interval = setInterval(tick, 250); // High frequency check for smooth UI updates
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isStudyingUser, studyStartTime, studySecondsBaseline, timerType]);

  // Pomodoro Completion Listener
  useEffect(() => {
    if (isStudyingUser && timerType === "pomodoro" && pomoSecondsLeft === 0) {
      setIsStudyingUser(false);
      playPomoChime();
      
      if (pomoState === "focus") {
        const minsToSave = pomoFocusDuration;
        handleAddStudyMinutes(activeSubjectId, minsToSave);
        
        setFiredNotification(`🍅 Pomodoro Complete! You studied for ${minsToSave} minutes. +${minsToSave * 10} XP gained!`);
        
        // Advance rounds or shift to break
        if (pomoRound >= 4) {
          setPomoState("longBreak");
          setPomoSecondsLeft(pomoLongBreakDuration * 60);
          setPomoRound(1);
        } else {
          setPomoState("shortBreak");
          setPomoSecondsLeft(pomoShortBreakDuration * 60);
          setPomoRound(prev => prev + 1);
        }
      } else {
        const breakLabel = pomoState === "shortBreak" ? "Short break" : "Long break";
        setFiredNotification(`💪 ${breakLabel} ended! Excellent job resting, you are ready to focus!`);
        setPomoState("focus");
        setPomoSecondsLeft(pomoFocusDuration * 60);
      }
    }
  }, [pomoSecondsLeft, isStudyingUser, timerType, pomoState, pomoRound, pomoFocusDuration, pomoShortBreakDuration, pomoLongBreakDuration, activeSubjectId]);

  const handleUpdateSubjectGoal = async (subjectId: string, newGoalMinutes: number) => {
    setSubjects(prev =>
      prev.map(s => (s.id === subjectId ? { ...s, goalMinutes: newGoalMinutes } : s))
    );
    
    if (currentUser) {
      const subRef = doc(db, "users", currentUser.uid, "subjects", subjectId);
      const targetSubject = subjects.find(s => s.id === subjectId);
      if (targetSubject) {
        setDoc(subRef, { ...targetSubject, goalMinutes: newGoalMinutes }, { merge: true })
          .catch(err => handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}/subjects/${subjectId}`));
      }
    }
  };


  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authDisplayName, setAuthDisplayName] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccessMsg, setAuthSuccessMsg] = useState<string | null>(null);

  const handleEmailAuth = async (e: any) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    setAuthSuccessMsg(null);

    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthError("Please fill in all details.");
      setAuthLoading(false);
      return;
    }
    if (authPassword.length < 6) {
      setAuthError("Password must be at least 6 characters.");
      setAuthLoading(false);
      return;
    }

    try {
      if (authMode === "signup") {
        if (!authDisplayName.trim()) {
          setAuthError("Please provide a display name.");
          setAuthLoading(false);
          return;
        }
        const user = await emailPasswordSignUp(authEmail, authPassword, authDisplayName);
        setCurrentUser(user);
        setAuthSuccessMsg("Account created successfully!");
        setAuthEmail("");
        setAuthPassword("");
        setAuthDisplayName("");
        setTimeout(() => {
          setShowAuthModal(false);
          setAuthSuccessMsg(null);
        }, 1500);
      } else {
        const user = await emailPasswordSignIn(authEmail, authPassword);
        setCurrentUser(user);
        setAuthSuccessMsg("Signed in successfully!");
        setAuthEmail("");
        setAuthPassword("");
        setTimeout(() => {
          setShowAuthModal(false);
          setAuthSuccessMsg(null);
        }, 1500);
      }
    } catch (err: any) {
      console.error("Email auth error:", err);
      let errMsg = err?.message || String(err);
      if (errMsg.includes("auth/invalid-credential") || errMsg.includes("auth/wrong-password") || errMsg.includes("auth/user-not-found")) {
        errMsg = "Invalid email or password. Please verify and try again.";
      } else if (errMsg.includes("auth/email-already-in-use")) {
        errMsg = "This email is already registered. Try logging in instead.";
      } else if (errMsg.includes("auth/weak-password")) {
        errMsg = "Password is too weak. Choose at least 6 characters.";
      } else if (errMsg.includes("auth/invalid-email")) {
        errMsg = "Please format your email correctly (e.g. name@domain.com).";
      } else if (errMsg.includes("auth/operation-not-allowed")) {
        errMsg = "Please enable Email/Password authentication in your Firebase console.";
      }
      setAuthError(errMsg);
    } finally {
      setAuthLoading(false);
    }
  };

  // Combined authentications triggers
  const [authLoading, setAuthLoading] = useState(false);
  const handleHeaderLogin = async (requestWorkspace: boolean = false) => {
    if (requestWorkspace) {
      setAuthLoading(true);
      try {
        const res = await googleSignIn(requestWorkspace);
        if (res) {
          setCurrentUser(res.user);
        }
      } catch (err) {
        console.error("Popup authentication failed:", err);
      } finally {
        setAuthLoading(false);
      }
    } else {
      setShowAuthModal(true);
      setAuthError(null);
      setAuthSuccessMsg(null);
    }
  };

  const handleHeaderLogout = async () => {
    setAuthLoading(true);
    try {
      await logout();
      setCurrentUser(null);
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      setAuthLoading(false);
    }
  };

  // 2. Data modification callbacks with cloud synchronization
  // ==================== GAMIFIED REWARDS SYSTEMS MOTIVATIONS ====================
  const handleAddXp = async (reason: string, amount: number) => {
    if (amount <= 0) return;
    const nextXp = userXp + amount;
    setUserXp(nextXp);

    const newLog: XpGainLog = {
      id: `xp-log-${Date.now()}`,
      reason,
      amount,
      timestamp: new Date().toISOString()
    };

    setXpLogs(prev => [newLog, ...prev]);

    // Also auto-unlock items in state
    setRewards(prev => prev.map(r => {
      if (!r.isUnlocked && nextXp >= r.costXp) {
        return { ...r, isUnlocked: true };
      }
      return r;
    }));

    // Local instant persistence
    localStorage.setItem("study_user_xp", String(nextXp));
    localStorage.setItem("study_xp_logs", JSON.stringify([newLog, ...xpLogs]));

    // Sync to Cloud asynchronously in background
    if (currentUser) {
      Promise.all([
        setDoc(doc(db, "users", currentUser.uid), { xp: nextXp }, { merge: true }),
        setDoc(doc(db, "users", currentUser.uid, "xpLogs", newLog.id), newLog)
      ]).catch((err) => {
        console.warn("Failed saving XP to cloud background (running offline mode):", err);
      });
    }
  };

  const handleAddReward = async (newRew: GiftReward) => {
    const nextRewards = [...rewards, newRew];
    setRewards(nextRewards);
    localStorage.setItem("study_rewards", JSON.stringify(nextRewards));

    if (currentUser) {
      setDoc(doc(db, "users", currentUser.uid, "rewards", newRew.id), newRew)
        .catch(e => handleFirestoreError(e, OperationType.CREATE, `users/${currentUser.uid}/rewards/${newRew.id}`));
    }
  };

  const handleEditReward = async (updatedRew: GiftReward) => {
    const isUnlocked = userXp >= updatedRew.costXp;
    const finalReward = { ...updatedRew, isUnlocked };

    const nextRewards = rewards.map(r => r.id === updatedRew.id ? finalReward : r);
    setRewards(nextRewards);
    localStorage.setItem("study_rewards", JSON.stringify(nextRewards));

    if (currentUser) {
      setDoc(doc(db, "users", currentUser.uid, "rewards", updatedRew.id), finalReward)
        .catch(e => handleFirestoreError(e, OperationType.UPDATE, `users/${currentUser.uid}/rewards/${updatedRew.id}`));
    }
  };

  const handleDiscardReward = async (rewardId: string) => {
    const nextRewards = rewards.filter(r => r.id !== rewardId);
    setRewards(nextRewards);
    localStorage.setItem("study_rewards", JSON.stringify(nextRewards));

    if (currentUser) {
      deleteDoc(doc(db, "users", currentUser.uid, "rewards", rewardId))
        .catch(e => handleFirestoreError(e, OperationType.DELETE, `users/${currentUser.uid}/rewards/${rewardId}`));
    }
  };

  const handleClaimReward = async (rewardId: string) => {
    const target = rewards.find(r => r.id === rewardId);
    if (!target || userXp < target.costXp || target.isClaimed) return;

    // Deduct user XP
    const nextXp = Math.max(0, userXp - target.costXp);
    setUserXp(nextXp);

    const nextRewards = rewards.map(r => r.id === rewardId ? { ...r, isClaimed: true } : r);
    setRewards(nextRewards);

    // Log the transaction
    const transactionLog: XpGainLog = {
      id: `xp-log-${Date.now()}`,
      reason: `Claimed reward: ${target.title} 🛍️`,
      amount: -target.costXp,
      timestamp: new Date().toISOString()
    };
    const nextXpLogs = [transactionLog, ...xpLogs];
    setXpLogs(nextXpLogs);

    // Save to local storage right away
    localStorage.setItem("study_user_xp", String(nextXp));
    localStorage.setItem("study_rewards", JSON.stringify(nextRewards));
    localStorage.setItem("study_xp_logs", JSON.stringify(nextXpLogs));

    if (currentUser) {
      Promise.all([
        setDoc(doc(db, "users", currentUser.uid), { xp: nextXp }, { merge: true }),
        setDoc(doc(db, "users", currentUser.uid, "rewards", rewardId), { ...target, isClaimed: true }, { merge: true }),
        setDoc(doc(db, "users", currentUser.uid, "xpLogs", transactionLog.id), transactionLog)
      ]).catch(e => handleFirestoreError(e, OperationType.UPDATE, `users/${currentUser.uid}/rewards/${rewardId}`));
    }
  };

  const handleCompleteQuest = async (questId: string) => {
    const targetQ = quests.find(q => q.id === questId);
    if (!targetQ || targetQ.isCompleted) return;

    const nextQuests = quests.map(q => q.id === questId ? { ...q, isCompleted: true } : q);
    setQuests(nextQuests);
    localStorage.setItem("study_quests", JSON.stringify(nextQuests));

    // Do NOT await, execute synchronously in memory
    handleAddXp(`Completed quest: ${targetQ.title}`, targetQ.xpReward);

    if (currentUser) {
      setDoc(doc(db, "users", currentUser.uid, "quests", questId), { ...targetQ, isCompleted: true })
        .catch(e => handleFirestoreError(e, OperationType.UPDATE, `users/${currentUser.uid}/quests/${questId}`));
    }
  };

  const handleAddStudyMinutes = async (subjectId: string, minutes: number, customDate?: string) => {
    const todayStr = customDate || new Date().toISOString().split("T")[0];
    const targetSubject = subjects.find(s => s.id === subjectId);
    if (!targetSubject) return;

    // Create session entry
    const newLog: StudyLog = {
      id: `log-${Date.now()}`,
      date: todayStr,
      subjectId,
      subjectName: targetSubject.name,
      durationMinutes: minutes,
      timestamp: new Date().toISOString()
    };

    // Update state
    const nextLogs = [newLog, ...studyLogs];
    const nextSubjects = subjects.map(s => (s.id === subjectId ? { ...s, totalMinutes: Math.round(s.totalMinutes + minutes) } : s));

    setStudyLogs(nextLogs);
    setSubjects(nextSubjects);

    // Persist immediately in local storage in case of connection dropouts
    localStorage.setItem("study_logs", JSON.stringify(nextLogs));
    localStorage.setItem("study_subjects", JSON.stringify(nextSubjects));

    // Earn 10 XP per minute studied!
    const earnedXp = minutes * 10;
    handleAddXp(`Studied ${targetSubject.name} for ${minutes}m ⏱️`, earnedXp);

    // Sync to Cloud asynchronously in the background
    if (currentUser) {
      const subRef = doc(db, "users", currentUser.uid, "subjects", subjectId);
      const logRef = doc(db, "users", currentUser.uid, "studyLogs", newLog.id);
      const updatedSubject = { ...targetSubject, totalMinutes: Math.round(targetSubject.totalMinutes + minutes) };

      Promise.all([
        setDoc(subRef, updatedSubject),
        setDoc(logRef, newLog)
      ]).catch((err) => {
        handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.uid}/studyLogs/${newLog.id}`);
      });
    }
  };

  const handleAddSubject = async (name: string, goalMinutes: number, colorStyle: string) => {
    const nextId = `sub-${Date.now()}`;
    const newSub: Subject = {
      id: nextId,
      name,
      color: colorStyle,
      icon: "BookOpen",
      totalMinutes: 0,
      goalMinutes
    };

    const nextSubjects = [...subjects, newSub];
    setSubjects(nextSubjects);
    setActiveSubjectId(nextId);
    localStorage.setItem("study_subjects", JSON.stringify(nextSubjects));

    if (currentUser) {
      setDoc(doc(db, "users", currentUser.uid, "subjects", nextId), newSub)
        .catch(err => handleFirestoreError(err, OperationType.CREATE, `users/${currentUser.uid}/subjects/${nextId}`));
    }
  };

  const handleRemoveSubject = async (subjectId: string) => {
    const nextSubjects = subjects.filter(s => s.id !== subjectId);
    setSubjects(nextSubjects);
    
    const nextTasks = tasks.map(t => (t.subjectId === subjectId ? { ...t, subjectId: "general" } : t));
    setTasks(nextTasks);

    localStorage.setItem("study_subjects", JSON.stringify(nextSubjects));
    localStorage.setItem("study_tasks", JSON.stringify(nextTasks));
    
    // set another active subject if deleted active
    if (activeSubjectId === subjectId) {
      if (nextSubjects.length > 0) {
        setActiveSubjectId(nextSubjects[0].id);
      }
    }

    if (currentUser) {
      deleteDoc(doc(db, "users", currentUser.uid, "subjects", subjectId))
        .catch(err => handleFirestoreError(err, OperationType.DELETE, `users/${currentUser.uid}/subjects/${subjectId}`));
    }
  };

  const handleAddTask = async (title: string, subjectId: string) => {
    const newTask: Task = {
      id: `task-${Date.now()}`,
      title,
      isCompleted: false,
      subjectId
    };
    const nextTasks = [...tasks, newTask];
    setTasks(nextTasks);
    localStorage.setItem("study_tasks", JSON.stringify(nextTasks));

    if (currentUser) {
      setDoc(doc(db, "users", currentUser.uid, "tasks", newTask.id), newTask)
        .catch(err => handleFirestoreError(err, OperationType.CREATE, `users/${currentUser.uid}/tasks/${newTask.id}`));
    }
  };

  const handleToggleTask = async (taskId: string) => {
    let tskToUpdate: Task | undefined;
    const nextTasks = tasks.map(t => {
      if (t.id === taskId) {
        tskToUpdate = { ...t, isCompleted: !t.isCompleted };
        return tskToUpdate;
      }
      return t;
    });

    setTasks(nextTasks);
    localStorage.setItem("study_tasks", JSON.stringify(nextTasks));

    if (tskToUpdate && tskToUpdate.isCompleted) {
      // Do NOT await, execute synchronously in memory
      handleAddXp(`Completed Task: ${tskToUpdate.title} ✔️`, 50);
    }

    if (currentUser && tskToUpdate) {
      setDoc(doc(db, "users", currentUser.uid, "tasks", taskId), tskToUpdate)
        .catch(err => handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}/tasks/${taskId}`));
    }
  };

  const handleRemoveTask = async (taskId: string) => {
    const nextTasks = tasks.filter(t => t.id !== taskId);
    setTasks(nextTasks);
    localStorage.setItem("study_tasks", JSON.stringify(nextTasks));

    if (currentUser) {
      deleteDoc(doc(db, "users", currentUser.uid, "tasks", taskId))
        .catch(err => handleFirestoreError(err, OperationType.DELETE, `users/${currentUser.uid}/tasks/${taskId}`));
    }
  };

  // completed checklist tasks today
  const completedTasksCountToday = useMemo(() => {
    return tasks.filter(t => t.isCompleted).length;
  }, [tasks]);

  // total studied sum today
  const totalStudiedTodayMins = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const logMinsToday = studyLogs
      .filter(l => l.date === todayStr)
      .reduce((sum, l) => sum + l.durationMinutes, 0);
    const liveMins = isStudyingUser ? activeSecondsUser / 60 : 0;
    return Math.round(logMinsToday + liveMins);
  }, [studyLogs, isStudyingUser, activeSecondsUser]);

  const handleResetAllData = async () => {
    // 1. Reset local storage
    localStorage.removeItem("study_subjects");
    localStorage.removeItem("study_tasks");
    localStorage.removeItem("study_logs");
    localStorage.removeItem("study_daily_target");
    localStorage.removeItem("ypt_joined_room_id");
    localStorage.removeItem("google_oauth_access_token");

    // 2. Reset React states
    setSubjects(INITIAL_SUBJECTS);
    setTasks([]);
    setStudyLogs([]);
    setDailyTargetMinutes(240);
    setJoinedRoomId(null);
    setIsStudyingUser(false);
    setActiveSecondsUser(0);

    // 3. Reset Firestore if user is logged in
    if (currentUser) {
      try {
        const userRef = doc(db, "users", currentUser.uid);
        await setDoc(userRef, {
          userId: currentUser.uid,
          email: currentUser.email || "",
          displayName: currentUser.displayName || "Scholar",
          dailyTargetMinutes: 240
        });

        // Reset cloud subjects to defaults
        for (const sub of INITIAL_SUBJECTS) {
          await setDoc(doc(db, "users", currentUser.uid, "subjects", sub.id), sub);
        }

        const taskCol = collection(db, "users", currentUser.uid, "tasks");
        const logCol = collection(db, "users", currentUser.uid, "studyLogs");
        const subCol = collection(db, "users", currentUser.uid, "subjects");

        const [taskSnap, logSnap, subSnap] = await Promise.all([
          getDocs(taskCol),
          getDocs(logCol),
          getDocs(subCol)
        ]);

        const deletePromises: Promise<any>[] = [];
        taskSnap.forEach(d => deletePromises.push(deleteDoc(doc(db, "users", currentUser.uid, "tasks", d.id))));
        logSnap.forEach(d => deletePromises.push(deleteDoc(doc(db, "users", currentUser.uid, "studyLogs", d.id))));

        // Delete subject docs that are not in initial subjects list
        subSnap.forEach(d => {
          if (!INITIAL_SUBJECTS.some(s => s.id === d.id)) {
            deletePromises.push(deleteDoc(doc(db, "users", currentUser.uid, "subjects", d.id)));
          }
        });

        await Promise.all(deletePromises);
      } catch (err) {
        console.warn("Failed to clear some cloud documents during reset:", err);
      }
    }
  };

  return (
    <div className={`min-h-screen flex flex-col justify-between pb-24 transition-all duration-500 relative select-none ${
      themeMode === "light"
        ? (
            themePreset === "forest" ? "bg-[#f3f7f4] text-[#1e3d2a]" :
            themePreset === "crimson" ? "bg-[#fdf5f5] text-[#701e23]" :
            themePreset === "honey" ? "bg-[#fbf7f0] text-[#5e4115]" :
            themePreset === "amoled" ? "bg-[#ffffff] text-[#0f172a]" :
            "bg-[#f6f7fa] text-slate-900"
          )
        : (
            themePreset === "amoled" ? "bg-black text-white" :
            themePreset === "forest" ? "bg-[#05100c] text-[#d1e7dd]" :
            themePreset === "crimson" ? "bg-[#120102] text-[#f8d7da]" :
            themePreset === "honey" ? "bg-[#160e02] text-[#fbebd4]" :
            "bg-[#08080c] text-white"
          )
    }`} id="ypt-immersive-viewport-root">
      
      {/* Liquid Glass Background Drifting Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className={`absolute top-[10%] left-[10%] w-72 h-72 sm:w-96 sm:h-96 rounded-full blur-[65px] sm:blur-[95px] animate-blob-1 transition-all duration-1000 ${
          themeMode === "light"
            ? "bg-gradient-to-tr from-orange-200/20 to-rose-200/20 opacity-70"
            : "bg-gradient-to-tr from-[#f26419]/15 to-[#e73c7e]/15 opacity-100"
        }`}></div>
        <div className={`absolute bottom-[20%] right-[8%] w-80 h-80 sm:w-[480px] sm:h-[480px] rounded-full blur-[75px] sm:blur-[105px] animate-blob-2 transition-all duration-1000 ${
          themeMode === "light"
            ? "bg-gradient-to-br from-indigo-200/15 to-purple-200/15 opacity-60"
            : "bg-gradient-to-br from-indigo-950/20 to-purple-950/25 opacity-100"
        }`}></div>
        <div className={`absolute top-[45%] right-[22%] w-60 h-60 sm:w-85 sm:h-85 rounded-full blur-[55px] sm:blur-[85px] animate-blob-3 transition-all duration-1000 ${
          themeMode === "light"
            ? "bg-gradient-to-tl from-emerald-200/20 to-teal-200/20 opacity-65"
            : "bg-gradient-to-tl from-emerald-950/15 to-teal-950/20 opacity-100"
        }`}></div>
      </div>

      {/* Floating active alarm overlay banner */}
      {firedNotification && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-sm px-4 animate-slide-in">
          <div className="bg-slate-900/95 dark:bg-[#161616]/95 backdrop-blur-md border border-amber-500/40 text-slate-100 p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-left">
              <div className="p-2 bg-amber-500/15 text-amber-500 rounded-xl animate-pulse">
                <Bell className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-amber-500">Focus Alarm Check</p>
                <p className="text-xs font-bold text-slate-200 mt-0.5">{firedNotification}</p>
              </div>
            </div>
            <button
              onClick={() => setFiredNotification(null)}
              className="text-[10px] font-bold text-slate-300 hover:text-white bg-slate-950 border border-slate-800 hover:border-slate-700 p-1.5 px-3 rounded-md cursor-pointer transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
      
      {/* Top compact account and state toolbar banner */}
      <header className={`sticky top-0 z-40 backdrop-blur-xl border-b px-6 py-3 px-safe transition-all duration-500 ${
        themeMode === "light"
          ? (
              themePreset === "forest" ? "bg-[#f3f7f4]/85 border-[#e2ece6]" :
              themePreset === "crimson" ? "bg-[#fdf5f5]/85 border-[#f9e2e4]" :
              themePreset === "honey" ? "bg-[#fbf7f0]/85 border-[#f4ebda]" :
              themePreset === "amoled" ? "bg-[#ffffff]/90 border-slate-200" :
              "bg-white/75 border-slate-200/60"
            )
          : (
              themePreset === "amoled" ? "bg-black/90 border-slate-900" :
              themePreset === "forest" ? "bg-[#05100c]/90 border-emerald-950/40" :
              themePreset === "crimson" ? "bg-[#120102]/90 border-rose-950/40" :
              themePreset === "honey" ? "bg-[#160e02]/90 border-amber-950/40" :
              "bg-[#08080c]/85 border-slate-900/40"
            )
      }`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between relative z-10">
          
          {/* Logo brand & streak info */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#f26419] flex items-center justify-center text-white shadow-md cursor-pointer hover:scale-105 active:scale-95 transition-transform" onClick={() => setActiveTab("focus")}>
              <Clock className="w-5 h-5 font-bold" />
            </div>
            <div className="text-left">
              <h1 className={`text-xs font-black tracking-tight uppercase leading-none ${themeMode === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>StudyPulse</h1>
              <div className="flex items-center gap-1.5 mt-0.5" title="Daily study streak indicator">
                <Flame className="w-3.5 h-3.5 text-orange-500 animate-pulse shrink-0" />
                <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">{activeStreakCount} days streak</span>
              </div>
            </div>
          </div>

          {/* Quick Stats Summary badges */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="hidden sm:flex items-center gap-1.5 bg-white/45 dark:bg-[#171717]/80 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800/40 font-mono text-[11px] text-slate-700 dark:text-slate-300 shadow-xs backdrop-blur-md">
              <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-wider">Studied:</span>
              <span className="font-bold text-[#f26419]">
                {Math.floor(totalStudiedTodayMins / 60)}h {Math.round(totalStudiedTodayMins % 60)}m
              </span>
            </div>

            {/* cinema HUD layout toggle */}
            <button
              onClick={() => {
                const updated = !isWideHud;
                setIsWideHud(updated);
                localStorage.setItem("ypt_wide_hud", String(updated));
              }}
              className="p-2 rounded-full cursor-pointer border transition-all bg-white/45 hover:bg-white/70 text-slate-600 border-slate-200 dark:bg-[#171717] dark:hover:bg-[#202020] dark:border-slate-900 dark:text-slate-400 dark:hover:text-white shadow-xs backdrop-blur-md flex items-center justify-center"
              title={isWideHud ? "Compact panel layout" : "Immersive widescreen HUD"}
            >
              {isWideHud ? (
                <Minimize2 className="w-4 h-4 text-[#f26419]" />
              ) : (
                <Maximize2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              )}
            </button>

            {/* Mode Switcher */}
            <button
              onClick={() => setThemeMode(prev => prev === "dark" ? "light" : "dark")}
              className="p-2 rounded-full cursor-pointer border transition-all bg-white/45 hover:bg-white/70 text-slate-600 border-slate-200 dark:bg-[#171717] dark:hover:bg-[#202020] dark:border-slate-900 dark:text-slate-450 dark:hover:text-white shadow-xs backdrop-blur-md flex items-center justify-center"
              title={themeMode === "dark" ? "Toggle Light mode" : "Toggle Dark mode"}
            >
              {themeMode === "dark" ? (
                <Sun className="w-4 h-4 text-amber-500 animate-spin-slow" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-600" />
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab("reminders");
                setIsSidebarOpen(false);
              }}
              className={`p-2 rounded-full cursor-pointer relative border transition-all ${
                activeTab === "reminders"
                  ? "bg-[#f26419] border-[#f26419] text-white"
                  : "bg-white/45 border-slate-200 text-slate-500 hover:text-slate-800 dark:bg-[#171717] dark:border-slate-900 dark:text-slate-400 dark:hover:text-white dark:hover:border-slate-800"
              } shadow-xs backdrop-blur-md`}
              title="Study Focus Alarms & Reminders"
            >
              <Bell className="w-4 h-4" />
              {reminders.some(r => r.isActive && !r.isCompleted) && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-[#f26419] rounded-full animate-ping"></span>
              )}
            </button>

            {/* Google Authentication Section */}
            {currentUser ? (
              <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-[#161616] p-1 pr-2.5 rounded-full border border-slate-200 dark:border-slate-900 hover:border-slate-350 dark:hover:border-slate-800 transition-colors">
                {currentUser.photoURL ? (
                  <img 
                    referrerPolicy="no-referrer" 
                    src={currentUser.photoURL} 
                    alt={currentUser.displayName || "User"} 
                    className="w-6 h-6 rounded-full border border-slate-350 dark:border-slate-700/50" 
                  />
                ) : (
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-white font-black uppercase font-mono ${getAvatarSeed(currentUser.email)}`}>
                    {currentUser.displayName?.[0] || currentUser.email?.[0] || "U"}
                  </div>
                )}
                <div className="hidden md:block text-left leading-none max-w-[100px] truncate">
                  <p className="text-xs font-black truncate text-slate-800 dark:text-slate-100 leading-none">
                    {currentUser.displayName || "Scholar"}
                  </p>
                  <p className="text-[8.5px] text-slate-500 font-mono truncate mt-0.5">{currentUser.email}</p>
                </div>
                <button
                  onClick={handleHeaderLogout}
                  disabled={authLoading}
                  className="p-1 text-slate-400 hover:text-rose-500 rounded-full cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800/40"
                  title="Sign Out"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleHeaderLogin(false)}
                disabled={authLoading}
                className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-50 dark:text-[#0a0a0a] text-xs font-black py-1.5 px-3.5 rounded-full cursor-pointer active:scale-95 transition-all select-none border border-slate-200 dark:border-white/10"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}
          </div>

        </div>
      </header>

      {/* Main Tab dashboard container constraint */}
      <main className={`${
        isWideHud 
          ? "max-w-7xl px-4 md:px-6 lg:px-8" 
          : "max-w-4xl px-4 md:px-6"
      } w-full mx-auto flex-1 flex flex-col justify-start relative transition-all duration-300`}>
        <div className="flex-1 flex flex-col pt-3 py-6" style={{ minHeight: "500px" }}>
          
          <div className={`${isWideHud ? "grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full" : "flex flex-col w-full"}`}>
            
            {/* The main workspace page contents */}
            <div className={`${isWideHud ? "lg:col-span-8 flex flex-col space-y-4 w-full" : "flex-1 flex flex-col w-full"}`}>
          
          {activeTab === "focus" && (
            <TimelineView
              subjects={subjects}
              studyLogs={studyLogs}
              setSubjects={setSubjects}
              onAddStudyMinutes={handleAddStudyMinutes}
              activeSubjectId={activeSubjectId}
              setActiveSubjectId={setActiveSubjectId}
              isStudying={isStudyingUser}
              setIsStudying={setIsStudyingUser}
              activeSeconds={activeSecondsUser}
              setActiveSeconds={setActiveSecondsUser}
              onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
              timerType={timerType}
              setTimerType={setTimerType}
              pomoState={pomoState}
              setPomoState={setPomoState}
              pomoRound={pomoRound}
              setPomoRound={setPomoRound}
              pomoFocusDuration={pomoFocusDuration}
              setPomoFocusDuration={setPomoFocusDuration}
              pomoShortBreakDuration={pomoShortBreakDuration}
              setPomoShortBreakDuration={setPomoShortBreakDuration}
              pomoLongBreakDuration={pomoLongBreakDuration}
              setPomoLongBreakDuration={setPomoLongBreakDuration}
              pomoSecondsLeft={pomoSecondsLeft}
              setPomoSecondsLeft={setPomoSecondsLeft}
              onUpdateSubjectGoal={handleUpdateSubjectGoal}
            />
          )}

          {activeTab === "planner" && (
            <PlannerHub
              subjects={subjects}
              tasks={tasks}
              onAddTask={handleAddTask}
              onToggleTask={handleToggleTask}
              onRemoveTask={handleRemoveTask}
            />
          )}

          {activeTab === "calendar" && (
            <CalendarView 
              studyLogs={studyLogs} 
              subjects={subjects}
              onAddStudyMinutes={handleAddStudyMinutes}
            />
          )}

          {activeTab === "rewards" && (
            <div className="liquid-glass p-0 rounded-3xl shadow-xl transition-all duration-300 relative z-10 overflow-hidden text-left">
              <RewardSystem
                userXp={userXp}
                rewards={rewards}
                xpLogs={xpLogs}
                quests={quests}
                onAddReward={handleAddReward}
                onEditReward={handleEditReward}
                onDeleteReward={handleDiscardReward}
                onClaimReward={handleClaimReward}
                onAddXp={handleAddXp}
                onCompleteQuest={handleCompleteQuest}
                totalStudiedTodayMins={totalStudiedTodayMins}
                completedTasksCountToday={completedTasksCountToday}
              />
            </div>
          )}

          {activeTab === "rooms" && (
            <ClassmateGrid 
              currentUser={currentUser}
              joinedRoomId={joinedRoomId}
              setJoinedRoomId={setJoinedRoomId}
              isStudying={isStudyingUser}
              activeSeconds={activeSecondsUser}
              activeSubjectName={subjects.find(s => s.id === activeSubjectId)?.name || 'Resting'}
              totalStudiedTodayMins={totalStudiedTodayMins}
            />
          )}

          {activeTab === "analytics" && (
            <div className="liquid-glass p-6 rounded-3xl shadow-xl transition-all duration-300 relative z-10">
              <AnalyticsDashboard
                subjects={subjects}
                studyLogs={studyLogs}
                streak={activeStreakCount}
                dailyTargetMinutes={dailyTargetMinutes}
              />
            </div>
          )}

          {activeTab === "ai-coach" && (
            <div className="liquid-glass p-6 rounded-3xl shadow-xl transition-all duration-300 relative z-10">
              <AICoachCard
                subjects={subjects}
                streak={activeStreakCount}
                dailyTargetMinutes={dailyTargetMinutes}
              />
            </div>
          )}

          {activeTab === "workspace" && (
            <div className="liquid-glass p-6 rounded-3xl shadow-xl transition-all duration-300 relative z-10">
              <WorkspaceHub
                streak={activeStreakCount}
                aiCoachAdvice={aiCoachAdvice}
                globalCurrentUser={currentUser}
                onGlobalLogin={handleHeaderLogin}
                onGlobalLogout={handleHeaderLogout}
              />
            </div>
          )}

          {activeTab === "reminders" && (
            <div className="liquid-glass p-6 rounded-3xl shadow-xl transition-all duration-300 relative z-10">
              <RemindersHub
                subjects={subjects}
                reminders={reminders}
                onAddReminder={handleAddReminder}
                onToggleReminder={handleToggleReminder}
                onRemoveReminder={handleRemoveReminder}
              />
            </div>
          )}

            </div>

            {/* The Ultimate Widescreen/Tablet Landscape Focus Sidepanel HUD */}
            {isWideHud && (
              <div className="hidden lg:flex lg:col-span-4 flex-col gap-5 sticky top-22 w-full pb-4">
                
                {/* 1. Co-studying Desks Widget */}
                <div className="liquid-glass p-5 rounded-3xl border border-slate-205/50 dark:border-slate-900/60 text-left space-y-4 shadow-md backdrop-blur-xl bg-white/40 dark:bg-[#121212]/30">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] uppercase font-mono text-[#f26419] font-black tracking-widest flex items-center gap-1.5 bg-transparent">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      Co-Study Desks
                    </span>
                    <span className="text-[9.5px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-black/40 px-2.5 py-0.5 rounded-full font-bold">
                      Desks 1-5
                    </span>
                  </div>
                  
                  {/* Mate lists inside the side desk indicators */}
                  <div className="space-y-3">
                    {[
                      { name: "Jun-Woo Kim", mins: 245, isStudying: true, activeSubjectName: "Computer Science", seed: "bg-teal-500" },
                      { name: "Chloe Dupont", mins: 110, isStudying: true, activeSubjectName: "Spanish Language", seed: "bg-pink-500" },
                      { name: "Aisha Rahman", mins: 310, isStudying: true, activeSubjectName: "Math & STEM", seed: "bg-amber-500" },
                      { name: "Liam Miller", mins: 180, isStudying: false, activeSubjectName: "Resting", seed: "bg-indigo-500" },
                      { name: "Sofia de Luca", mins: 85, isStudying: true, activeSubjectName: "Organic Chemistry", seed: "bg-rose-500" }
                    ].map((mate, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white/40 dark:bg-black/15 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-900/55 shadow-[0_1px_3px_0_rgba(0,0,0,0.02)] hover:border-[#f26419]/30 transition-all">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Colored avatar sphere */}
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10.5px] text-white font-black uppercase font-mono ${mate.seed}`}>
                            {mate.name[0]}
                          </div>
                          <div className="text-left min-w-0">
                            <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 truncate leading-none">
                              {mate.name}
                            </h4>
                            <p className="text-[9.5px] font-mono text-slate-500 dark:text-slate-400 mt-1 truncate max-w-[140px]">
                              {mate.isStudying ? `🖋️ ${mate.activeSubjectName}` : "💤 Resting"}
                            </p>
                          </div>
                        </div>

                        {/* Timing indicator */}
                        <div className="text-right flex flex-col items-end shrink-0">
                          <span className={`text-[9.5px] font-mono font-black ${mate.isStudying ? "text-[#f26419] animate-pulse" : "text-slate-400"}`}>
                            {mate.isStudying ? "Ticking •" : "Paused"}
                          </span>
                          <span className="text-[9px] text-slate-450 dark:text-slate-500 font-mono mt-0.5">
                            {mate.mins} mins
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Topic Goals Distribution micro widget */}
                <div className="liquid-glass p-5 rounded-3xl border border-slate-200/50 dark:border-slate-900/60 text-left space-y-3.5 shadow-md backdrop-blur-xl bg-white/40 dark:bg-[#121212]/30">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] uppercase font-mono text-slate-400 dark:text-slate-500 font-black tracking-widest">
                      Distributions
                    </span>
                    <span className="text-[10.5px] font-mono font-black text-[#f26419]">
                      Goal distribution
                    </span>
                  </div>

                  <div className="space-y-3 pt-1">
                    {subjects.slice(0, 4).map((sub) => {
                      const percent = Math.min(100, Math.round((sub.totalMinutes / (sub.goalMinutes || 120)) * 100));
                      return (
                        <div key={sub.id} className="space-y-1">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[155px]">{sub.name}</span>
                            <span className="font-mono text-[#f26419] font-extrabold">{percent}%</span>
                          </div>
                          <div className="w-full h-1 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-[#f26419] to-orange-400 rounded-full transition-all duration-300" 
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Deep Breath Synchronizer Widget */}
                <div className="liquid-glass p-5 rounded-3xl border border-slate-205/50 dark:border-slate-900/60 text-left space-y-3 shadow-md backdrop-blur-xl relative overflow-hidden bg-white/40 dark:bg-[#121212]/30">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] uppercase font-mono text-slate-450 dark:text-slate-450 font-black tracking-widest">
                      Posture Breather
                    </span>
                    <span className="text-[9px] uppercase font-mono tracking-widest bg-emerald-500/10 border border-emerald-500/20 text-[#2e7d32] dark:text-emerald-400 px-2 py-0.5 rounded-full font-black animate-pulse">
                      Posture Alert On
                    </span>
                  </div>

                  <div className="py-2 flex items-center justify-center relative">
                    <div className="w-16 h-16 rounded-full bg-[#f26419]/10 absolute animate-ping duration-3000" style={{ animationDuration: '4s' }} />
                    <div className="w-10 h-10 rounded-full bg-[#f26419] flex items-center justify-center text-white relative shadow-lg">
                      <Sparkles className="w-4 h-4 animate-spin-slow" />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 text-center leading-relaxed">
                    Breathing rhythm synchronizing with focus cycles. Take a slow, deep breath and align your posture.
                  </p>
                </div>

              </div>
            )}

          </div>

        </div>
      </main>

      {/* Customizable Features sidebar overlays drawer */}
      <FeatureSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onThemeSelect={(themeId) => setThemePreset(themeId)}
        isOfflineMode={isOfflineMode}
        setIsOfflineMode={setIsOfflineMode}
        onResetAllData={handleResetAllData}
      />

      {/* Floating Centered bottom navigation Dock pills + Companion Button (Image 4 & 5) */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center items-center gap-3 z-40 px-4">
        
        {/* Navigation dock bar */}
        <div className="bg-white/75 dark:bg-[#121212]/85 backdrop-blur-md px-5 py-2.5 border border-slate-200/70 dark:border-slate-900/40 rounded-full flex items-center justify-center gap-5 sm:gap-6 shadow-2xl">
          {[
            { id: "focus", label: "Home", icon: Home },
            { id: "planner", label: "To-Do", icon: ClipboardCheck },
            { id: "rewards", label: "Wishlist", icon: Award },
            { id: "calendar", label: "Calendar", icon: Calendar },
            { id: "rooms", label: "Groups", icon: Users }
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setIsSidebarOpen(false);
                }}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-full cursor-pointer transition-all ${
                  isSelected 
                    ? "text-[#f26419] font-black scale-105" 
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
                title={tab.label}
              >
                <Icon className={`w-5 h-5 ${isSelected ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
                <span className="text-[9px] font-bold tracking-tight">{tab.label}</span>
              </button>
            );
          })}
        </div>
        
        {/* Hover/Float companion separate circle indicator action button (Image 4 & 5) */}
        <button 
          onClick={() => {
            if (activeTab === "focus" || activeTab === "planner" || activeTab === "calendar" || activeTab === "rooms" || activeTab === "reminders" || activeTab === "rewards") {
              setIsSidebarOpen(!isSidebarOpen);
            }
          }}
          className="w-13 h-13 bg-white/75 dark:bg-[#1c1c1c]/85 active:scale-95 text-[10.5px] text-[#f26419] uppercase font-black tracking-widest font-mono rounded-full flex items-center justify-center shadow-lg border border-slate-200/80 dark:border-slate-800/80 cursor-pointer cursor-and-touch hover:scale-105 transition-all backdrop-blur-md"
          title="YPT Quick Actions Panel"
        >
          {activeTab === "focus" && "?"}
          {activeTab === "planner" && "Day"}
          {activeTab === "rewards" && "🏆"}
          {activeTab === "calendar" && "Fil"}
          {activeTab === "rooms" && "+"}
          {activeTab === "reminders" && "🔔"}
        </button>

      </div>

      {/* Tiny descriptive brand footer */}
      <footer className="w-full text-center text-slate-650 text-[10px] select-none pb-4 font-mono opacity-50">
        <p>© 2026 StudyPulse. Built for consistent habit builders.</p>
      </footer>

      {/* Modern, Adaptive multi-method Authentication Hub Modal */}
      {showAuthModal && (
        <div 
          id="auth-modal-overlay"
          className="fixed inset-0 bg-[#0a0a0ade]/90 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-fade-in"
          onClick={() => {
            if (!authLoading) {
              setShowAuthModal(false);
              setAuthError(null);
              setAuthSuccessMsg(null);
            }
          }}
        >
          <div 
            id="auth-modal-card"
            className="w-full max-w-[420px] bg-white dark:bg-[#151515] rounded-3xl border border-slate-200 dark:border-slate-800 p-6 md:p-7 shadow-2xl relative text-left animate-slide-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button 
              id="auth-modal-close-btn"
              onClick={() => {
                setShowAuthModal(false);
                setAuthError(null);
                setAuthSuccessMsg(null);
              }}
              disabled={authLoading}
              className="absolute top-5 right-5 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-100 rounded-full cursor-pointer transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Header */}
            <div className="mb-6">
              <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#f26419]" />
                {authMode === "signin" ? "Sign In to StudyPulse" : "Create StudyPulse Account"}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">
                {authMode === "signin" 
                  ? "Access your synced notes, schedules, focus logs, and multiplayer rooms." 
                  : "Start logging your habits, earn rewards, and level up with global classmates."}
              </p>
            </div>

            {/* Email/Password Form */}
            <form id="auth-email-form" onSubmit={handleEmailAuth} className="space-y-4">
              {authMode === "signup" && (
                <div className="space-y-1">
                  <label htmlFor="auth-display-name-input" className="block text-[10px] uppercase tracking-wider font-mono font-bold text-slate-500 dark:text-slate-400">
                    Display Name
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                      <UserIcon className="w-3.5 h-3.5" />
                    </span>
                    <input 
                      id="auth-display-name-input"
                      type="text"
                      placeholder="e.g. Marie Curie"
                      value={authDisplayName}
                      onChange={(e) => setAuthDisplayName(e.target.value)}
                      disabled={authLoading}
                      required
                      className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-[#1d1d1d] border border-slate-200 dark:border-slate-800 rounded-xl focus:border-[#f26419] dark:focus:border-[#f26419] focus:outline-none focus:ring-1 focus:ring-[#f26419]/30 text-slate-850 dark:text-slate-100 transition-all font-sans"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label htmlFor="auth-email-input" className="block text-[10px] uppercase tracking-wider font-mono font-bold text-slate-500 dark:text-slate-400">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                    <Mail className="w-3.5 h-3.5" />
                  </span>
                  <input 
                    id="auth-email-input"
                    type="email"
                    placeholder="name@gmail.com"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    disabled={authLoading}
                    required
                    className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-[#1d1d1d] border border-slate-200 dark:border-slate-800 rounded-xl focus:border-[#f26419] dark:focus:border-[#f26419] focus:outline-none focus:ring-1 focus:ring-[#f26419]/30 text-slate-850 dark:text-slate-100 transition-all font-sans"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="auth-password-input" className="block text-[10px] uppercase tracking-wider font-mono font-bold text-slate-500 dark:text-slate-400">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                    <Lock className="w-3.5 h-3.5" />
                  </span>
                  <input 
                    id="auth-password-input"
                    type="password"
                    placeholder="••••••••"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    disabled={authLoading}
                    required
                    className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-[#1d1d1d] border border-slate-200 dark:border-slate-800 rounded-xl focus:border-[#f26419] dark:focus:border-[#f26419] focus:outline-none focus:ring-1 focus:ring-[#f26419]/30 text-slate-850 dark:text-slate-100 transition-all font-sans"
                  />
                </div>
              </div>

              {/* Status Alerts */}
              {authError && (
                <div id="auth-error-box" className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-2 text-rose-500 text-[10.5px] leading-relaxed transition-all">
                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
              )}

              {authSuccessMsg && (
                <div id="auth-success-box" className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-emerald-500 text-[10.5px] font-bold transition-all">
                  <Sparkles className="w-3.5 h-3.5 shrink-0 text-emerald-500 animate-pulse" />
                  <span>{authSuccessMsg}</span>
                </div>
              )}

              {/* Email Button */}
              <button
                id="auth-submit-action-btn"
                type="submit"
                disabled={authLoading}
                className="w-full py-2 bg-[#f26419] hover:bg-[#d85312] text-white text-xs font-black rounded-xl cursor-pointer select-none transition-all active:scale-[98%] disabled:opacity-60 disabled:hover:bg-[#f26419] disabled:pointer-events-none flex items-center justify-center gap-2 shadow-lg"
              >
                {authLoading ? (
                  <span className="flex items-center gap-1.5 justify-center">
                    <span className="w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Authenticating...
                  </span>
                ) : (
                  <span>{authMode === "signin" ? "Sign In with Password" : "Create Account"}</span>
                )}
              </button>
            </form>

            {/* Subtle Divider */}
            <div className="my-5 flex items-center justify-center gap-3">
              <span className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800"></span>
              <span className="text-[10px] font-mono tracking-widest text-slate-400 font-bold uppercase">or connect via</span>
              <span className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800"></span>
            </div>

            {/* Google Federated Sign In */}
            <button
              id="auth-google-auth-btn"
              type="button"
              disabled={authLoading}
              onClick={async () => {
                setAuthLoading(true);
                setAuthError(null);
                setAuthSuccessMsg(null);
                try {
                  const res = await googleSignIn(false);
                  if (res) {
                    setCurrentUser(res.user);
                    setAuthSuccessMsg("Signed in with Google!");
                    setTimeout(() => {
                      setShowAuthModal(false);
                      setAuthSuccessMsg(null);
                    }, 1000);
                  }
                } catch (err: any) {
                  console.error("Google authentication error:", err);
                  setAuthError(err?.message || "Google Authentication popup failed.");
                } finally {
                  setAuthLoading(false);
                }
              }}
              className="w-full py-2 bg-slate-50 hover:bg-slate-100 dark:bg-[#1f1f1f] dark:hover:bg-[#252525] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 text-xs font-black rounded-xl cursor-pointer select-none transition-all flex items-center justify-center gap-2 active:scale-[98%] disabled:opacity-50 disabled:pointer-events-none"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M12.24 10.285V13.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.579-7.859-8s3.529-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l2.427-2.334C18.155 2.153 15.463 1 12.24 1c-6.075 0-11 4.925-11 11s4.925 11 11 11c6.34 0 10.564-4.437 10.564-10.75 0-.726-.077-1.282-.175-1.965H12.24Z"
                />
              </svg>
              <span>Google Account</span>
            </button>

            {/* Form Toggle Mode */}
            <div className="mt-4 text-center">
              <button
                id="auth-toggle-mode-btn"
                type="button"
                disabled={authLoading}
                onClick={() => {
                  setAuthMode(authMode === "signin" ? "signup" : "signin");
                  setAuthError(null);
                  setAuthSuccessMsg(null);
                }}
                className="text-xs text-slate-500 hover:text-[#f26419] dark:hover:text-[#f26419] underline cursor-pointer disabled:opacity-50"
              >
                {authMode === "signin" 
                  ? "Don't have an account? Sign Up" 
                  : "Already have an account? Sign In"}
              </button>
            </div>

            {/* Interactive Firebase Console Diagnostic Footnote Info Box */}
            <div 
              id="auth-config-guideline-box"
              className="mt-5 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-start gap-2.5"
            >
              <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <div className="text-[9.5px] leading-relaxed text-slate-500 dark:text-slate-400">
                <strong className="text-slate-700 dark:text-slate-300">Firebase Console Setup:</strong>
                <p className="mt-0.5">
                  To ensure standard email/password login is fully active, go to your <strong>Firebase Console &gt; Authentication &gt; Sign-in method</strong>, enable the <strong>Email/Password</strong> provider, and hit Save.
                </p>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
