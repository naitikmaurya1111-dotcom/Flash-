import { useState, useEffect, useMemo, useRef } from "react";
import { Clock, Users, ClipboardList, TrendingUp, Sparkles, BookOpen, Award, Flame, CloudLightning, LogOut, LogIn, Home, ClipboardCheck, Calendar, Bell, Sun, Moon, Laptop, Layers, Maximize2, Minimize2, Mail, Lock, X, Info, User as UserIcon, Eye, EyeOff, ChevronLeft } from "lucide-react";
import { Subject, Task, StudyLog, Reminder, GiftReward, XpGainLog, QuestChallenge, NotificationSettings } from "./types";
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
import { db, auth, initAuth, googleSignIn, logout, getAccessToken, emailPasswordSignUp, emailPasswordSignIn, resetUserPassword, verifyUserEmail } from "./lib/googleApi";
import { User } from "firebase/auth";
import { secureStorage } from "./lib/crypto";

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

function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
  // Synchronous Day Rollover Check on Page Mount / Init
  const isNewDayOnStart = (() => {
    const today = getLocalDateString();
    const lastDay = localStorage.getItem("study_last_active_date");
    if (lastDay && lastDay !== today) {
      return true;
    }
    if (!lastDay) {
      localStorage.setItem("study_last_active_date", today);
    }
    return false;
  })();

  const [activeTab, setActiveTab] = useState<"focus" | "rooms" | "planner" | "analytics" | "ai-coach" | "workspace" | "calendar" | "reminders" | "rewards">("focus");
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // YPT configuration overlays
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [themePreset, setThemePreset] = useState(() => localStorage.getItem("ypt_theme_preset") || "dark-classic");
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(() => {
    const local = localStorage.getItem("study_notification_settings");
    if (local) {
      try {
        return JSON.parse(local);
      } catch (e) {}
    }
    return {
      enableDesktopBanners: true,
      enableSoundEffects: true,
      notifyOnTimerAlerts: true,
      notifyOnReminderDue: true,
      notifyOnDailyGoalMet: true,
      notifyOnLevelUp: true,
      activeSoundPreset: "chime"
    };
  });

  useEffect(() => {
    localStorage.setItem("study_notification_settings", JSON.stringify(notificationSettings));
  }, [notificationSettings]);
  const [themeMode, setThemeMode] = useState<"light" | "dark" | "system">(() => {
    return (localStorage.getItem("study_theme_mode") as "light" | "dark" | "system") || "system";
  });
  const [activeTheme, setActiveTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("study_theme_mode") || "system";
    if (saved === "system") {
      if (typeof window !== "undefined") {
        return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      }
      return "dark";
    }
    return saved as "light" | "dark";
  });
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const dynamicBlobs = useMemo(() => {
    const isLight = activeTheme === "light";
    switch (themePreset) {
      case "forest":
        return {
          blob1: isLight
            ? "bg-gradient-to-tr from-emerald-200/25 to-teal-200/25 opacity-80"
            : "bg-gradient-to-tr from-emerald-950/30 to-teal-900/30 opacity-100",
          blob2: isLight
            ? "bg-gradient-to-br from-lime-200/20 to-emerald-250/20 opacity-70"
            : "bg-gradient-to-br from-emerald-900/25 to-zinc-900/25 opacity-100",
          blob3: isLight
            ? "bg-gradient-to-tl from-amber-150/30 to-emerald-200/35 opacity-70"
            : "bg-gradient-to-tl from-emerald-950/20 to-teal-950/20 opacity-100"
        };
      case "crimson":
        return {
          blob1: isLight
            ? "bg-gradient-to-tr from-rose-200/25 to-red-200/25 opacity-80"
            : "bg-gradient-to-tr from-red-950/25 to-rose-950/25 opacity-100",
          blob2: isLight
            ? "bg-gradient-to-br from-amber-100/30 to-rose-200/30 opacity-70"
            : "bg-gradient-to-br from-rose-950/25 to-red-950/25 opacity-100",
          blob3: isLight
            ? "bg-gradient-to-tl from-orange-200/25 to-red-100/35 opacity-70"
            : "bg-gradient-to-tl from-rose-900/20 to-orange-950/20 opacity-100"
        };
      case "honey":
        return {
          blob1: isLight
            ? "bg-gradient-to-tr from-amber-200/35 to-yellow-250/30 opacity-80"
            : "bg-gradient-to-tr from-amber-950/35 to-yellow-950/30 opacity-100",
          blob2: isLight
            ? "bg-gradient-to-br from-orange-100/30 to-amber-200/30 opacity-70"
            : "bg-gradient-to-br from-amber-950/25 to-neutral-900/25 opacity-100",
          blob3: isLight
            ? "bg-gradient-to-tl from-yellow-100/40 to-amber-200/35 opacity-80"
            : "bg-gradient-to-tl from-amber-900/25 to-stone-900/25 opacity-100"
        };
      case "amoled":
        return {
          blob1: isLight
            ? "bg-gradient-to-tr from-zinc-200/30 to-slate-200/30 opacity-80"
            : "bg-gradient-to-tr from-zinc-900/45 to-neutral-800/45 opacity-100",
          blob2: isLight
            ? "bg-gradient-to-br from-slate-100/35 to-zinc-200/35 opacity-75"
            : "bg-gradient-to-br from-neutral-950/50 to-zinc-950/50 opacity-100",
          blob3: isLight
            ? "bg-gradient-to-tl from-zinc-100/40 to-slate-100/40 opacity-85"
            : "bg-gradient-to-tl from-neutral-900/30 to-zinc-950/30 opacity-100"
        };
      default: // dark-classic / steel secondary slate
        return {
          blob1: isLight
            ? "bg-gradient-to-tr from-orange-200/20 to-rose-200/20 opacity-70"
            : "bg-gradient-to-tr from-[#f26419]/15 to-[#e73c7e]/15 opacity-100",
          blob2: isLight
            ? "bg-gradient-to-br from-indigo-200/15 to-purple-200/15 opacity-60"
            : "bg-gradient-to-br from-indigo-950/20 to-purple-950/25 opacity-100",
          blob3: isLight
            ? "bg-gradient-to-tl from-emerald-200/20 to-teal-200/20 opacity-65"
            : "bg-gradient-to-tl from-emerald-950/15 to-teal-950/20 opacity-100"
        };
    }
  }, [themePreset, activeTheme]);

  const [isWideHud, setIsWideHud] = useState(() => {
    const local = localStorage.getItem("ypt_wide_hud");
    return local !== null ? local === "true" : true; // Default to wide hud enabled for premium tablet landscape feel
  });

  // Reminders and local active alert popups
  const [reminders, setReminders] = useState<Reminder[]>(() => {
    const defaultReminders = [
      { id: "rem-1", title: "💦 Hydration Water Check", time: "45", type: "timer", durationMinutes: 45, isActive: true, isCompleted: false },
      { id: "rem-2", title: "🧘 Posture Stretch Break", time: "60", type: "timer", durationMinutes: 60, isActive: true, isCompleted: false },
      { id: "rem-3", title: "📝 Checkoff Daily Study Goal", time: "20:00", type: "daily", isActive: true, isCompleted: false }
    ];
    if (isNewDayOnStart) {
      secureStorage.setItem("study_reminders", JSON.stringify(defaultReminders));
      return defaultReminders;
    }
    const local = secureStorage.getItem("study_reminders");
    if (local) {
      try {
        return JSON.parse(local);
      } catch (e) {
        console.warn("Reminders decryption error", e);
      }
    }
    return defaultReminders;
  });
  const [firedNotification, setFiredNotification] = useState<string | null>(null);

  // States for unified alerts and sound approvals
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const [audioAutoplayApproved, setAudioAutoplayApproved] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("audio_autoplay_approved") === "true";
    }
    return false;
  });
  const [dismissedPermBanner, setDismissedPermBanner] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("dismissed_perm_banner") === "true";
    }
    return false;
  });

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const handleGrantAllPermissions = async () => {
    let notifyOutcome: NotificationPermission = "default";
    
    // 1. Request Push Notifications permission
    if (typeof window !== "undefined" && "Notification" in window) {
      try {
        notifyOutcome = await Notification.requestPermission();
        setNotificationPermission(notifyOutcome);
      } catch (err) {
        console.warn("Notification request failed:", err);
      }
    }

    // 2. Unlock & play Web Audio synth chime to bypass browser autoplay policy
    try {
      playChime("success");
      localStorage.setItem("audio_autoplay_approved", "true");
      setAudioAutoplayApproved(true);
    } catch (err) {
      console.warn("Audio Context activation failed:", err);
    }

    // 3. Show dynamic confirmation notice
    if (notifyOutcome === "granted") {
      setFiredNotification("🔔 Awesome! Desktop Push Notifications authorized & Alarm synthesizer sound channel enabled successfully!");
    } else {
      setFiredNotification("🔊 Alarm synthesizer sound channel enabled! (OS notification permissions were not approved, but within-tab alarms will sound perfectly).");
    }
  };

  // YPT Lobby real-time states
  const [joinedRoomId, setJoinedRoomId] = useState<string | null>(() => {
    return localStorage.getItem("ypt_joined_room_id");
  });
  const [isStudyingUser, setIsStudyingUser] = useState<boolean>(() => {
    if (isNewDayOnStart) {
      localStorage.setItem("study_is_studying", "false");
      return false;
    }
    return localStorage.getItem("study_is_studying") === "true";
  });
  const [activeSecondsUser, setActiveSecondsUser] = useState<number>(() => {
    if (isNewDayOnStart) {
      localStorage.setItem("study_active_seconds_user", "0");
      return 0;
    }
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

    if (currentUser) {
      setDoc(doc(db, "users", currentUser.uid), {
        timerType,
        pomoFocusDuration,
        pomoShortBreakDuration,
        pomoLongBreakDuration
      }, { merge: true })
        .catch(e => console.warn("Failed syncing timer configuration to cloud:", e));
    }
  }, [timerType, pomoState, pomoRound, pomoFocusDuration, pomoShortBreakDuration, pomoLongBreakDuration, pomoSecondsLeft, isStudyingUser, activeSecondsUser, currentUser]);

  // AI coach advice sharing state (retrieved from dynamic coach executions)
  const [aiCoachAdvice, setAiCoachAdvice] = useState<{ quote: string; rating: string; scheduleTip: string } | null>(() => {
    const local = secureStorage.getItem("study_ai_advice");
    if (local) {
      try {
        return JSON.parse(local);
      } catch (e) {
        console.warn("AI coach advice parsing error", e);
      }
    }
    return null;
  });

  // 1. Core Reactive States loaded with local storage and mock seeds
  const [subjects, setSubjects] = useState<Subject[]>(() => {
    if (isNewDayOnStart) {
      const resetSubs = INITIAL_SUBJECTS.map((s) => ({ ...s, totalMinutes: 0 }));
      secureStorage.setItem("study_subjects", JSON.stringify(resetSubs));
      return resetSubs;
    }
    const local = secureStorage.getItem("study_subjects");
    if (local) {
      try {
        return JSON.parse(local);
      } catch (e) {
        console.warn("Subjects parsing error", e);
      }
    }
    return INITIAL_SUBJECTS;
  });

  const [tasks, setTasks] = useState<Task[]>(() => {
    if (isNewDayOnStart) {
      const local = secureStorage.getItem("study_tasks");
      let allTasks: Task[] = [];
      if (local) {
        try {
          allTasks = JSON.parse(local);
        } catch (e) {}
      }
      const uncompletedTasks = allTasks.filter(t => !t.isCompleted);
      secureStorage.setItem("study_tasks", JSON.stringify(uncompletedTasks));
      return uncompletedTasks;
    }
    const local = secureStorage.getItem("study_tasks");
    if (local) {
      try {
        return JSON.parse(local);
      } catch (e) {
        console.warn("Tasks parsing error", e);
      }
    }
    return [];
  });

  const [studyLogs, setStudyLogs] = useState<StudyLog[]>(() => {
    const local = secureStorage.getItem("study_logs");
    if (local) {
      try {
        return JSON.parse(local);
      } catch (e) {
        console.warn("Study logs parsing error", e);
      }
    }
    return [];
  });

  const [activeSubjectId, setActiveSubjectId] = useState<string>(() => {
    return INITIAL_SUBJECTS[0]?.id || "";
  });

  const [dailyTargetMinutes, setDailyTargetMinutes] = useState<number>(() => {
    const local = secureStorage.getItem("study_daily_target");
    return local ? parseInt(local) : 240; // 4 hours goal
  });

  // ==================== REWARD SYSTEMS STATS & CONFIGS ====================
  const [userXp, setUserXp] = useState<number>(() => {
    const local = secureStorage.getItem("study_user_xp");
    return local ? parseInt(local, 10) : 0;
  });

  const INITIAL_QUESTS: QuestChallenge[] = [
    { id: "quest-daily-focus", title: "Daily Deep Focus ⏱️", condition: "Study for 30 minutes today", xpReward: 150, isCompleted: false, category: "daily" },
    { id: "quest-deep-dive", title: "Milestone: Deep Work 🧠", condition: "Study for 120 minutes today", xpReward: 400, isCompleted: false, category: "milestone" },
    { id: "quest-task-crusher", title: "To-Do Complete ✔️", condition: "Mark 1 task on check-list today", xpReward: 50, isCompleted: false, category: "daily" },
    { id: "quest-speed-demon", title: "Checklist Sweeper 🧹", condition: "Mark 3 tasks on check-list today", xpReward: 150, isCompleted: false, category: "daily" }
  ];

  const [quests, setQuests] = useState<QuestChallenge[]>(() => {
    if (isNewDayOnStart) {
      secureStorage.setItem("study_quests", JSON.stringify(INITIAL_QUESTS));
      return INITIAL_QUESTS;
    }
    const local = secureStorage.getItem("study_quests");
    if (local) {
      try {
        return JSON.parse(local);
      } catch (e) {
        console.warn("Quests parsing error", e);
      }
    }
    return INITIAL_QUESTS;
  });

  const [rewards, setRewards] = useState<GiftReward[]>(() => {
    const local = secureStorage.getItem("study_rewards");
    const defaults: GiftReward[] = [
      { id: "def-1", title: "☕ Coffee Break Boost", costXp: 200, purchaseUrl: "https://www.amazon.com/s?k=gourmet+coffee", category: "Daily Treats", isUnlocked: false, isClaimed: false, notes: "A crisp hot caffeine mug to celebrate your hard studies!", createdAt: new Date().toISOString() },
      { id: "def-2", title: "📚 Self-Directed Ebook", costXp: 800, purchaseUrl: "https://www.amazon.com/s?k=kindle+books", category: "Books & Supplies", isUnlocked: false, isClaimed: false, notes: "Unlock any Kindle study/story book to unwind.", createdAt: new Date().toISOString() },
      { id: "def-3", title: "🎧 Noise Isolating Earplugs", costXp: 1500, purchaseUrl: "https://www.amazon.com/s?k=noise+reduction+earplugs+for+study", category: "Tech Gadget", isUnlocked: false, isClaimed: false, notes: "Acoustic peace to supercharge your deep focus blocks.", createdAt: new Date().toISOString() }
    ];
    if (local) {
      try {
        return JSON.parse(local);
      } catch (e) {
        console.warn("Rewards parsing error", e);
      }
    }
    return defaults;
  });

  const [xpLogs, setXpLogs] = useState<XpGainLog[]>(() => {
    const local = secureStorage.getItem("study_xp_logs");
    if (local) {
      try {
        return JSON.parse(local);
      } catch (e) {
        console.warn("XP logs parsing error", e);
      }
    }
    return [];
  });

  // Keep latest timer state values stored in a Ref to prevent dependency re-runs on fast-changing numbers
  const timerStateRef = useRef({
    isStudyingUser,
    activeSecondsUser,
    timerType,
    pomoState,
    pomoSecondsLeft,
    pomoFocusDuration,
    activeSubjectId,
    currentUser,
  });

  // Keep state reference continually updated on each change
  useEffect(() => {
    timerStateRef.current = {
      isStudyingUser,
      activeSecondsUser,
      timerType,
      pomoState,
      pomoSecondsLeft,
      pomoFocusDuration,
      activeSubjectId,
      currentUser,
    };
  }, [isStudyingUser, activeSecondsUser, timerType, pomoState, pomoSecondsLeft, pomoFocusDuration, activeSubjectId, currentUser]);

  // -------------- DAY ROLLOVER CHECK --------------
  useEffect(() => {
    const checkDayRollover = () => {
      const today = getLocalDateString();
      const lastDay = localStorage.getItem("study_last_active_date");

      if (lastDay && lastDay !== today) {
        const state = timerStateRef.current;
        
        // If they were actively studying across midnight, log credit to the previous day so zero progress is lost!
        if (state.isStudyingUser) {
          let minsToSave = 0;
          if (state.timerType === "stopwatch") {
            minsToSave = Math.round(state.activeSecondsUser / 60);
          } else if (state.timerType === "pomodoro" && state.pomoState === "focus") {
            const elapsedFocusSeconds = (state.pomoFocusDuration * 60) - state.pomoSecondsLeft;
            minsToSave = Math.round(elapsedFocusSeconds / 60);
          }

          if (minsToSave >= 1 && state.activeSubjectId) {
            handleAddStudyMinutes(state.activeSubjectId, minsToSave, lastDay);
          }
        }

        // Date changed! Reset daily arrays from secure storage AND state
        setSubjects((prev) => {
          const resetSubs = prev.map((s) => ({ ...s, totalMinutes: 0 }));
          secureStorage.setItem("study_subjects", JSON.stringify(resetSubs));
          // If logged in, wipe the cloud records for the current day
          if (state.currentUser) {
            resetSubs.forEach(sub => {
              setDoc(doc(db, "users", state.currentUser.uid, "subjects", sub.id), sub)
                .catch(() => {});
            });
          }
          return resetSubs;
        });

        setQuests((prev) => {
          const resetQuests = prev.map((q) => ({ ...q, isCompleted: false }));
          secureStorage.setItem("study_quests", JSON.stringify(resetQuests));
          if (state.currentUser) {
            resetQuests.forEach(q => {
              setDoc(doc(db, "users", state.currentUser.uid, "quests", q.id), q)
                .catch(() => {});
            });
          }
          return resetQuests;
        });

        setReminders((prev) => {
          const resetReminders = prev.map((r) => ({
            ...r,
            isCompleted: false,
            triggeredAt: undefined
          }));
          secureStorage.setItem("study_reminders", JSON.stringify(resetReminders));
          return resetReminders;
        });

        setTasks((prev) => {
          const uncompletedTasks = prev.filter(t => !t.isCompleted);
          secureStorage.setItem("study_tasks", JSON.stringify(uncompletedTasks));
          // If logged in, wipe the completed tasks from the cloud
          if (state.currentUser) {
            const completed = prev.filter(t => t.isCompleted);
            completed.forEach(t => {
              deleteDoc(doc(db, "users", state.currentUser.uid, "tasks", t.id))
                .catch(() => {});
            });
          }
          return uncompletedTasks;
        });

        // Any active study session should be halted because it's a new day
        setIsStudyingUser(false);
        setActiveSecondsUser(0);
        setPomoState("focus");
        setPomoRound(1);
        setPomoSecondsLeft(pomoFocusDuration * 60);

        localStorage.removeItem("study_start_time_ms");
        localStorage.removeItem("study_seconds_baseline");
        localStorage.setItem("study_is_studying", "false");
        localStorage.setItem("study_active_seconds_user", "0");
        
        setFiredNotification("🌅 A new day has begun! Your timers and daily stats have been reset.");
        // Also clean up older task logs if you optionally wished here (for now just tracking standard totalMins).
      }

      if (lastDay !== today) {
        localStorage.setItem("study_last_active_date", today);
      }
    };

    checkDayRollover();
    // Re-check periodically every 60 seconds (useful past midnight or on simulate clicks)
    const intv = setInterval(checkDayRollover, 60000);
    return () => clearInterval(intv);
  }, [pomoFocusDuration]);
  // ------------------------------------------------

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
          const remindersCol = collection(db, "users", user.uid, "reminders");

          const cloudFetchPromise = Promise.all([
            getDoc(userDocRef),
            getDocs(subCol),
            getDocs(taskCol),
            getDocs(logCol),
            getDocs(rewardsCol),
            getDocs(questsCol),
            getDocs(xpLogsCol),
            getDocs(remindersCol)
          ]);

          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => {
              reject(new Error("Firestore fetch timed out (3000ms threshold reached). Running in offline-resilient mode."));
            }, 3000);
          });

          // Race the Firestore query against our 3s timeout
          const [userSnap, subSnap, taskSnap, logSnap, rewardsSnap, questsSnap, xpLogsSnap, remindersSnap] = await Promise.race([
            cloudFetchPromise,
            timeoutPromise
          ]);

          const todayStr = getLocalDateString();
          let cloudDayRolloverTriggered = false;

          // Fetch or initialize customizable target minutes
          if (userSnap.exists()) {
            const userData = userSnap.data();
            if (userData.dailyTargetMinutes) {
              setDailyTargetMinutes(userData.dailyTargetMinutes);
            }
            if (userData.xp !== undefined) {
              setUserXp(userData.xp);
            }
            if (userData.themePreset) {
              setThemePreset(userData.themePreset);
            }
            if (userData.themeMode) {
              setThemeMode(userData.themeMode);
            }
            if (userData.timerType) {
              setTimerType(userData.timerType);
            }
            if (userData.pomoFocusDuration) {
              setPomoFocusDuration(userData.pomoFocusDuration);
              setPomoSecondsLeft(userData.pomoFocusDuration * 60);
            }
            if (userData.pomoShortBreakDuration) {
              setPomoShortBreakDuration(userData.pomoShortBreakDuration);
            }
            if (userData.pomoLongBreakDuration) {
              setPomoLongBreakDuration(userData.pomoLongBreakDuration);
            }
            
            // Check if user's cloud profile last active date is from a previous day
            const lastActiveDate = userData.lastActiveDate || "";
            if (lastActiveDate !== todayStr) {
              cloudDayRolloverTriggered = true;
              // Synchronize fresh active date immediately
              setDoc(userDocRef, { lastActiveDate: todayStr }, { merge: true })
                .catch(e => console.warn("Failed to update cloud lastActiveDate:", e));
            }
          } else {
            // Register Student configuration profile (asynchronous background write)
            setDoc(userDocRef, {
              userId: user.uid,
              email: user.email || "",
              displayName: user.displayName || "Scholar",
              dailyTargetMinutes: dailyTargetMinutes,
              xp: userXp,
              lastActiveDate: todayStr,
              themePreset,
              themeMode,
              timerType,
              pomoFocusDuration,
              pomoShortBreakDuration,
              pomoLongBreakDuration
            }).catch(e => console.warn("Background user registration failed:", e));
          }

          const loadedSubs: Subject[] = [];
          const loadedTasks: Task[] = [];
          const loadedLogs: StudyLog[] = [];
          const loadedRewards: GiftReward[] = [];
          const loadedQuests: QuestChallenge[] = [];
          const loadedXpLogs: XpGainLog[] = [];
          const loadedReminders: Reminder[] = [];

          subSnap.forEach(d => loadedSubs.push(d.data() as Subject));
          taskSnap.forEach(d => loadedTasks.push(d.data() as Task));
          logSnap.forEach(d => loadedLogs.push(d.data() as StudyLog));
          rewardsSnap.forEach(d => loadedRewards.push(d.data() as GiftReward));
          questsSnap.forEach(d => loadedQuests.push(d.data() as QuestChallenge));
          xpLogsSnap.forEach(d => loadedXpLogs.push(d.data() as XpGainLog));
          remindersSnap.forEach(d => loadedReminders.push(d.data() as Reminder));

          // Self-healing daily totalMinutes calculations based entirely on matching today's actual study logs!
          const finalSubs = loadedSubs.map(sub => {
            const todayMins = loadedLogs
              .filter(log => log.subjectId === sub.id && log.date === todayStr)
              .reduce((sum, log) => sum + log.durationMinutes, 0);
            return { ...sub, totalMinutes: Math.round(todayMins) };
          });

          // Reset daily quests if date changed
          const finalQuests = loadedQuests.map(q => {
            if ((cloudDayRolloverTriggered || q.isCompleted === undefined) && q.category === "daily") {
              return { ...q, isCompleted: false };
            }
            return q;
          });

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
            xpLogs.slice(0, 30).forEach((xlg) => {
              setDoc(doc(db, "users", user.uid, "xpLogs", xlg.id), xlg).catch(() => {});
            });
            reminders.forEach((rem) => {
              setDoc(doc(db, "users", user.uid, "reminders", rem.id), rem).catch(() => {});
            });
          } else {
            // Apply loaded cloud profile (with reset/daily self-healing totals applied)
            setSubjects(finalSubs);
            setTasks(loadedTasks);
            setStudyLogs(loadedLogs);
            if (loadedRewards.length > 0) setRewards(loadedRewards);
            setQuests(finalQuests);
            if (loadedXpLogs.length > 0) setXpLogs(loadedXpLogs);
            if (loadedReminders.length > 0) {
              setReminders(loadedReminders);
            } else {
              // Populate cloud if empty
              reminders.forEach((rem) => {
                setDoc(doc(db, "users", user.uid, "reminders", rem.id), rem).catch(() => {});
              });
            }

            // Sync resets back to Firestore
            if (cloudDayRolloverTriggered) {
              finalSubs.forEach(sub => {
                setDoc(doc(db, "users", user.uid, "subjects", sub.id), sub).catch(() => {});
              });
              finalQuests.forEach(q => {
                if (q.category === "daily") {
                  setDoc(doc(db, "users", user.uid, "quests", q.id), q).catch(() => {});
                }
              });
            }
          }
        } catch (err) {
          console.warn("Firestore sync failed or timed out on init, loading offline cache data instead.", err);
          
          // Clear cloud loading state and fallback to secure storage safely
          const localSubs = secureStorage.getItem("study_subjects");
          const localTasks = secureStorage.getItem("study_tasks");
          const localLogs = secureStorage.getItem("study_logs");
          const localXp = secureStorage.getItem("study_user_xp");
          const localRewards = secureStorage.getItem("study_rewards");
          const localQuests = secureStorage.getItem("study_quests");
          const localXpLogs = secureStorage.getItem("study_xp_logs");

          let parsedLogs: StudyLog[] = [];
          if (localLogs) {
            try { parsedLogs = JSON.parse(localLogs); } catch (e) { console.warn("Log parse err", e); }
          }
          let parsedSubs: Subject[] = INITIAL_SUBJECTS;
          if (localSubs) {
            try { parsedSubs = JSON.parse(localSubs); } catch (e) { console.warn("Subs parse err", e); }
          }
          let parsedQuests: QuestChallenge[] = INITIAL_QUESTS;
          if (localQuests) {
            try { parsedQuests = JSON.parse(localQuests); } catch (e) { console.warn("Quests parse err", e); }
          }

          const todayStr = getLocalDateString();
          const localLastActive = localStorage.getItem("study_last_active_date") || "";
          const localDayRolloverTriggered = localLastActive !== todayStr;

          const finalSubs = parsedSubs.map(sub => {
            const todayMins = parsedLogs
              .filter(log => log.subjectId === sub.id && log.date === todayStr)
              .reduce((sum, log) => sum + log.durationMinutes, 0);
            return { ...sub, totalMinutes: Math.round(todayMins) };
          });

          const finalQuests = parsedQuests.map(q => {
            if (localDayRolloverTriggered && q.category === "daily") {
              return { ...q, isCompleted: false };
            }
            return q;
          });

          if (localDayRolloverTriggered) {
            localStorage.setItem("study_last_active_date", todayStr);
          }

          setSubjects(finalSubs);
          let parsedTasks: Task[] = [];
          if (localTasks) {
            try { parsedTasks = JSON.parse(localTasks); } catch (e) { console.warn("Tasks parse err", e); }
          }
          setTasks(parsedTasks);
          setStudyLogs(parsedLogs);
          setUserXp(localXp ? parseInt(localXp, 10) : 0);
          let parsedRewards: GiftReward[] = [];
          if (localRewards) {
            try { parsedRewards = JSON.parse(localRewards); } catch (e) { console.warn("Rewards parse err", e); }
          }
          setRewards(parsedRewards.length > 0 ? parsedRewards : rewards);
          setQuests(finalQuests);
          let parsedXpLogs: XpGainLog[] = [];
          if (localXpLogs) {
            try { parsedXpLogs = JSON.parse(localXpLogs); } catch (e) { console.warn("XpLogs parse err", e); }
          }
          setXpLogs(parsedXpLogs);

          handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
        }
      },
      () => {
        setCurrentUser(null);
        // Clear screen data to restore clean guest values / protect user sign-outs
        const localSubs = secureStorage.getItem("study_subjects");
        const localTasks = secureStorage.getItem("study_tasks");
        const localLogs = secureStorage.getItem("study_logs");
        const localXp = secureStorage.getItem("study_user_xp");
        const localRewards = secureStorage.getItem("study_rewards");
        const localQuests = secureStorage.getItem("study_quests");
        const localXpLogs = secureStorage.getItem("study_xp_logs");

        let parsedLogs: StudyLog[] = [];
        if (localLogs) {
          try { parsedLogs = JSON.parse(localLogs); } catch (e) { console.warn("Log parse err log", e); }
        }
        let parsedSubs: Subject[] = INITIAL_SUBJECTS;
        if (localSubs) {
          try { parsedSubs = JSON.parse(localSubs); } catch (e) { console.warn("Subs parse err log", e); }
        }
        let parsedQuests: QuestChallenge[] = INITIAL_QUESTS;
        if (localQuests) {
          try { parsedQuests = JSON.parse(localQuests); } catch (e) { console.warn("Quests parse err log", e); }
        }

        const todayStr = getLocalDateString();
        const localLastActive = localStorage.getItem("study_last_active_date") || "";
        const localDayRolloverTriggered = localLastActive !== todayStr;

        const finalSubs = parsedSubs.map(sub => {
          const todayMins = parsedLogs
            .filter(log => log.subjectId === sub.id && log.date === todayStr)
            .reduce((sum, log) => sum + log.durationMinutes, 0);
          return { ...sub, totalMinutes: Math.round(todayMins) };
        });

        const finalQuests = parsedQuests.map(q => {
          if (localDayRolloverTriggered && q.category === "daily") {
            return { ...q, isCompleted: false };
          }
          return q;
        });

        if (localDayRolloverTriggered) {
          localStorage.setItem("study_last_active_date", todayStr);
        }

        setSubjects(finalSubs);
        let parsedTasks: Task[] = [];
        if (localTasks) {
          try { parsedTasks = JSON.parse(localTasks); } catch (e) { console.warn("Tasks parse err", e); }
        }
        setTasks(parsedTasks);
        setStudyLogs(parsedLogs);
        setUserXp(localXp ? parseInt(localXp, 10) : 0);
        let parsedRewards: GiftReward[] = [];
        if (localRewards) {
          try { parsedRewards = JSON.parse(localRewards); } catch (e) { console.warn("Rewards parse err", e); }
        }
        setRewards(parsedRewards.length > 0 ? parsedRewards : rewards);
        setQuests(finalQuests);
        let parsedXpLogs: XpGainLog[] = [];
        if (localXpLogs) {
          try { parsedXpLogs = JSON.parse(localXpLogs); } catch (e) { console.warn("XpLogs parse err", e); }
        }
        setXpLogs(parsedXpLogs);
      }
    );
    return () => unsubscribe();
  }, []);

  // Calculate Streak based on study logs dynamically
  const activeStreakCount = useMemo(() => {
    const uniqueDatesSet = new Set<string>();
    
    // Check did study today
    const todayStr = getLocalDateString();
    const isActivelyFocusing = isStudyingUser && (
      timerType === "stopwatch"
        ? activeSecondsUser > 0
        : (pomoState === "focus" && (pomoFocusDuration * 60 - pomoSecondsLeft) > 0)
    );
    const studiedToday = studyLogs.some(l => l.date === todayStr && l.durationMinutes >= 1) || isActivelyFocusing;
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
    
    const containsToday = uniqueDatesSet.has(getLocalDateString(trackerDate));
    
    trackerDate.setDate(trackerDate.getDate() - 1);
    const containsYesterday = uniqueDatesSet.has(getLocalDateString(trackerDate));

    if (!containsToday && !containsYesterday) {
      return 0; // broken
    }

    const testDate = new Date();
    if (!containsToday && containsYesterday) {
      testDate.setDate(testDate.getDate() - 1);
    }

    while (true) {
      const curDateStr = getLocalDateString(testDate);
      if (uniqueDatesSet.has(curDateStr)) {
        streakVal++;
        testDate.setDate(testDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streakVal;
  }, [studyLogs, isStudyingUser, activeSecondsUser, timerType, pomoState, pomoFocusDuration, pomoSecondsLeft]);

  // Sync to local systems
  useEffect(() => {
    secureStorage.setItem("study_subjects", JSON.stringify(subjects));
  }, [subjects]);

  useEffect(() => {
    secureStorage.setItem("study_tasks", JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    secureStorage.setItem("study_logs", JSON.stringify(studyLogs));
  }, [studyLogs]);

  useEffect(() => {
    secureStorage.setItem("study_daily_target", String(dailyTargetMinutes));
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
    if (currentUser) {
      setDoc(doc(db, "users", currentUser.uid), { themePreset }, { merge: true })
        .catch(e => console.warn("Failed syncing theme preset to cloud:", e));
    }
  }, [themePreset, currentUser]);

  useEffect(() => {
    if (themeMode === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleSystemThemeChange = (e: MediaQueryListEvent | MediaQueryList) => {
        setActiveTheme(e.matches ? "dark" : "light");
      };

      // Set initial state
      handleSystemThemeChange(mediaQuery);

      // Listen in real-time
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener("change", handleSystemThemeChange);
        return () => mediaQuery.removeEventListener("change", handleSystemThemeChange);
      } else {
        mediaQuery.addListener(handleSystemThemeChange);
        return () => mediaQuery.removeListener(handleSystemThemeChange);
      }
    } else {
      setActiveTheme(themeMode);
    }
  }, [themeMode]);

  useEffect(() => {
    localStorage.setItem("study_theme_mode", themeMode);
    if (activeTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    if (currentUser) {
      setDoc(doc(db, "users", currentUser.uid), { themeMode }, { merge: true })
        .catch(e => console.warn("Failed syncing theme mode to cloud:", e));
    }
  }, [themeMode, activeTheme, currentUser]);

  useEffect(() => {
    if (joinedRoomId) {
      localStorage.setItem("ypt_joined_room_id", joinedRoomId);
    } else {
      localStorage.removeItem("ypt_joined_room_id");
    }
  }, [joinedRoomId]);

  // Reminders saving
  useEffect(() => {
    secureStorage.setItem("study_reminders", JSON.stringify(reminders));
    if (currentUser) {
      reminders.forEach(rem => {
        setDoc(doc(db, "users", currentUser.uid, "reminders", rem.id), rem)
          .catch(e => console.warn("Failed syncing individual reminder:", e));
      });
    }
  }, [reminders, currentUser]);

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
    if (currentUser) {
      deleteDoc(doc(db, "users", currentUser.uid, "reminders", remId))
        .catch(err => handleFirestoreError(err, OperationType.DELETE, `users/${currentUser.uid}/reminders/${remId}`));
    }
  };

  // Show native systems notifications leveraging the registration service worker fallback for mobile trays
  const showSystemNotification = (title: string, body: string) => {
    if (!notificationSettings.enableDesktopBanners) return;
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      try {
        if ("serviceWorker" in navigator) {
          navigator.serviceWorker.ready.then((reg) => {
            reg.showNotification(title, {
              body: body,
              icon: "/favicon.ico",
              vibrate: [300, 100, 305, 101, 400],
              tag: "study-alarm",
              requireInteraction: true
            } as any);
          }).catch(() => {
            new Notification(title, { body, icon: "/favicon.ico" });
          });
        } else {
          new Notification(title, { body, icon: "/favicon.ico" });
        }
      } catch (err) {
        console.warn("System notification presentation failed:", err);
      }
    }
  };

  // Trigger browser & full system alerts
  const handleTriggerAlarm = (title: string) => {
    if (notificationSettings.notifyOnReminderDue) {
      if (notificationSettings.enableSoundEffects) {
        playChime(notificationSettings.activeSoundPreset);
      }
      if (notificationSettings.enableDesktopBanners) {
        showSystemNotification("Flash5tudy Focus Alert", title);
      }
      setFiredNotification(title);
    }
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
    if (!isStudyingUser) return;
    
    const currentSessionFocusSeconds = timerType === "stopwatch"
      ? activeSecondsUser
      : (pomoState === "focus" ? (pomoFocusDuration * 60 - pomoSecondsLeft) : 0);
      
    if (currentSessionFocusSeconds <= 0) return;
    
    // Check did we hit a minute boundary?
    if (currentSessionFocusSeconds % 60 === 0) {
      const elapsedMins = Math.floor(currentSessionFocusSeconds / 60);
      let triggeredTitle: string | null = null;
      let updatedReminders = [...reminders];

      updatedReminders = updatedReminders.map(rem => {
        if (!rem.isActive || rem.type !== "timer" || !rem.durationMinutes) return rem;

        // Prevent double triggering on the exact same minute boundary
        const lastTriggeredTime = rem.triggeredAt ? new Date(rem.triggeredAt).getTime() : 0;
        const nowMs = Date.now();
        if (nowMs - lastTriggeredTime < 50000) return rem;

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
  }, [activeSecondsUser, pomoSecondsLeft, isStudyingUser, timerType, pomoState, pomoFocusDuration, reminders]);


  // Web Audio double bell chime generator
  const playPomoChime = () => {
    if (!notificationSettings.enableSoundEffects) return;
    try {
      playChime(notificationSettings.activeSoundPreset);
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
        
        const completionMsg = `🍅 Pomodoro Complete! You studied for ${minsToSave} minutes. +${minsToSave * 10} XP gained!`;
        setFiredNotification(completionMsg);
        
        // Push Native Desktop / Mobile Notification if granted
        showSystemNotification("Flash5tudy Focus Alert", completionMsg);
        
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
        const breakEndMsg = `💪 ${breakLabel} ended! Excellent job resting, you are ready to focus!`;
        setFiredNotification(breakEndMsg);

        // Push Native Desktop / Mobile Notification if granted
        showSystemNotification("Flash5tudy Focus Alert", breakEndMsg);

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
  const [authMode, setAuthMode] = useState<"signin" | "signup" | "forgot">("signup");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authDisplayName, setAuthDisplayName] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccessMsg, setAuthSuccessMsg] = useState<string | null>(null);
  const [authStep, setAuthStep] = useState<1 | 2>(1);
  const [showPassword, setShowPassword] = useState(false);

  // Dynamic Password Strength Meter
  const passwordStrength = useMemo(() => {
    if (!authPassword) return { score: 0, text: "Enter a password", color: "bg-slate-200 dark:bg-slate-800", textColor: "text-slate-400" };
    let score = 0;
    if (authPassword.length >= 6) score += 1;
    if (authPassword.length >= 10) score += 1;
    if (/[a-z]/.test(authPassword) && /[A-Z]/.test(authPassword)) score += 1;
    if (/[0-9]/.test(authPassword)) score += 1;
    if (/[^a-zA-Z0-9]/.test(authPassword)) score += 1;

    if (score <= 2) return { score: 1, text: "Weak", color: "bg-rose-500", textColor: "text-rose-500" };
    if (score <= 4) return { score: 2, text: "Medium", color: "bg-amber-500", textColor: "text-amber-500" };
    return { score: 3, text: "Strong", color: "bg-emerald-500", textColor: "text-emerald-500" };
  }, [authPassword]);

  const handleEmailNext = (e: any) => {
    e.preventDefault();
    setAuthError(null);
    const trimmedEmail = authEmail.trim();
    if (!trimmedEmail) {
      setAuthError("Enter an email address");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setAuthError("Enter a valid email address (e.g. name@domain.com)");
      return;
    }
    setAuthStep(2);
  };

  const handleForgotPasswordAction = async (e: any) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    setAuthSuccessMsg(null);

    const trimmedEmail = authEmail.trim();
    if (!trimmedEmail) {
      setAuthError("Please provide your email address first.");
      setAuthLoading(false);
      return;
    }

    try {
      await resetUserPassword(trimmedEmail);
      setAuthSuccessMsg("Password reset email sent! Check your inbox.");
      setTimeout(() => {
        setAuthMode("signin");
        setAuthStep(1);
        setAuthSuccessMsg(null);
      }, 3500);
    } catch (err: any) {
      console.error("Forgot password error:", err);
      let errMsg = err?.message || String(err);
      if (errMsg.includes("auth/user-not-found")) {
        errMsg = "There is no account registered with this email.";
      } else if (errMsg.includes("auth/invalid-email")) {
        errMsg = "Please format your email correctly.";
      }
      setAuthError(errMsg);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleEmailAuth = async (e: any) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    setAuthSuccessMsg(null);

    const trimmedEmail = authEmail.trim();
    if (!trimmedEmail || !authPassword.trim()) {
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
        const user = await emailPasswordSignUp(trimmedEmail, authPassword, authDisplayName);
        setCurrentUser(user);
        setAuthSuccessMsg("Account created successfully!");
        setAuthEmail("");
        setAuthPassword("");
        setAuthDisplayName("");
        setAuthStep(1);
        setTimeout(() => {
          setShowAuthModal(false);
          setAuthSuccessMsg(null);
        }, 1500);
      } else {
        const user = await emailPasswordSignIn(trimmedEmail, authPassword);
        setCurrentUser(user);
        setAuthSuccessMsg("Signed in successfully!");
        setAuthEmail("");
        setAuthPassword("");
        setAuthStep(1);
        setTimeout(() => {
          setShowAuthModal(false);
          setAuthSuccessMsg(null);
        }, 1500);
      }
    } catch (err: any) {
      console.error("Email auth error:", err);
      let errMsg = err?.message || String(err);
      if (errMsg.includes("auth/invalid-credential") || errMsg.includes("auth/wrong-password") || errMsg.includes("auth/user-not-found")) {
        errMsg = "Incorrect password, or this email is not registered yet. Click 'Create account' below to register first, or use the fast, real Google Login instead.";
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
    if (amount === 0) return;
    const nextXp = Math.max(0, userXp + amount);
    setUserXp(nextXp);

    const newLog: XpGainLog = {
      id: `xp-log-${Date.now()}`,
      reason,
      amount,
      timestamp: new Date().toISOString()
    };

    setXpLogs(prev => {
      const nextLogs = [newLog, ...prev];
      secureStorage.setItem("study_xp_logs", JSON.stringify(nextLogs));
      return nextLogs;
    });

    // Also auto-unlock/lock items in state based on new XP
    setRewards(prev => {
      const nextRewards = prev.map(r => {
        const shouldBeUnlocked = nextXp >= r.costXp;
        if (r.isUnlocked !== shouldBeUnlocked) {
          return { ...r, isUnlocked: shouldBeUnlocked };
        }
        return r;
      });
      secureStorage.setItem("study_rewards", JSON.stringify(nextRewards));
      return nextRewards;
    });

    // Local instant persistence
    secureStorage.setItem("study_user_xp", String(nextXp));

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
    secureStorage.setItem("study_rewards", JSON.stringify(nextRewards));

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
    secureStorage.setItem("study_rewards", JSON.stringify(nextRewards));

    if (currentUser) {
      setDoc(doc(db, "users", currentUser.uid, "rewards", updatedRew.id), finalReward)
        .catch(e => handleFirestoreError(e, OperationType.UPDATE, `users/${currentUser.uid}/rewards/${updatedRew.id}`));
    }
  };

  const handleDiscardReward = async (rewardId: string) => {
    const nextRewards = rewards.filter(r => r.id !== rewardId);
    setRewards(nextRewards);
    secureStorage.setItem("study_rewards", JSON.stringify(nextRewards));

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

    // Save to secure storage right away
    secureStorage.setItem("study_user_xp", String(nextXp));
    secureStorage.setItem("study_rewards", JSON.stringify(nextRewards));
    secureStorage.setItem("study_xp_logs", JSON.stringify(nextXpLogs));

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

    setQuests(prev => {
      const nextQuests = prev.map(q => q.id === questId ? { ...q, isCompleted: true } : q);
      secureStorage.setItem("study_quests", JSON.stringify(nextQuests));
      return nextQuests;
    });

    // Do NOT await, execute synchronously in memory
    handleAddXp(`Completed quest: ${targetQ.title}`, targetQ.xpReward);

    if (currentUser) {
      setDoc(doc(db, "users", currentUser.uid, "quests", questId), { ...targetQ, isCompleted: true })
        .catch(e => handleFirestoreError(e, OperationType.UPDATE, `users/${currentUser.uid}/quests/${questId}`));
    }
  };

  const handleAddStudyMinutes = async (subjectId: string, minutes: number, customDate?: string) => {
    const todayStr = customDate || getLocalDateString();
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

    // Update state using functional approach
    setStudyLogs(prev => {
      const nextLogs = [newLog, ...prev];
      secureStorage.setItem("study_logs", JSON.stringify(nextLogs));
      return nextLogs;
    });

    setSubjects(prev => {
      const nextSubjects = prev.map(s => (s.id === subjectId ? { ...s, totalMinutes: Math.round(s.totalMinutes + minutes) } : s));
      secureStorage.setItem("study_subjects", JSON.stringify(nextSubjects));
      return nextSubjects;
    });

    // Earn 10 XP per minute studied!
    const earnedXp = minutes * 10;
    handleAddXp(`Studied ${targetSubject.name} for ${minutes}m ⏱️`, earnedXp);

    // Check if the subject's daily goal is newly met!
    const previouslyCompleted = targetSubject.totalMinutes >= targetSubject.goalMinutes;
    const newlyCompleted = Math.round(targetSubject.totalMinutes + minutes) >= targetSubject.goalMinutes;
    if (!previouslyCompleted && newlyCompleted) {
      const bonusXp = 150;
      setTimeout(() => {
        handleAddXp(`🎉 Daily Goal Met: ${targetSubject.name}!`, bonusXp);
        setFiredNotification(`🎯 Subject Goal Completed! You completed your daily study goal of ${targetSubject.goalMinutes} minutes for ${targetSubject.name}. Outstanding persistent effort! (+${bonusXp} XP Bonus)`);
      }, 800);
    }

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
    secureStorage.setItem("study_subjects", JSON.stringify(nextSubjects));

    if (currentUser) {
      setDoc(doc(db, "users", currentUser.uid, "subjects", nextId), newSub)
        .catch(err => handleFirestoreError(err, OperationType.CREATE, `users/${currentUser.uid}/subjects/${nextId}`));
    }
  };

  const handleRemoveSubject = async (subjectId: string) => {
    let finalSubjects: Subject[] = [];
    setSubjects(prev => {
      const filtered = prev.filter(s => s.id !== subjectId);
      finalSubjects = filtered;
      secureStorage.setItem("study_subjects", JSON.stringify(filtered));
      return filtered;
    });
    
    setTasks(prev => {
      const nextTasks = prev.map(t => (t.subjectId === subjectId ? { ...t, subjectId: "general" } : t));
      secureStorage.setItem("study_tasks", JSON.stringify(nextTasks));
      return nextTasks;
    });
    
    // set another active subject if deleted active
    if (activeSubjectId === subjectId) {
      setTimeout(() => {
        if (finalSubjects.length > 0) {
          setActiveSubjectId(finalSubjects[0].id);
        }
      }, 0);
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
    
    setTasks(prev => {
      const nextTasks = [...prev, newTask];
      secureStorage.setItem("study_tasks", JSON.stringify(nextTasks));
      return nextTasks;
    });

    if (currentUser) {
      setDoc(doc(db, "users", currentUser.uid, "tasks", newTask.id), newTask)
        .catch(err => handleFirestoreError(err, OperationType.CREATE, `users/${currentUser.uid}/tasks/${newTask.id}`));
    }
  };

  const handleToggleTask = async (taskId: string) => {
    let tskToUpdate: Task | undefined;
    
    setTasks(prev => {
      const nextTasks = prev.map(t => {
        if (t.id === taskId) {
          tskToUpdate = { ...t, isCompleted: !t.isCompleted };
          return tskToUpdate;
        }
        return t;
      });
      secureStorage.setItem("study_tasks", JSON.stringify(nextTasks));
      return nextTasks;
    });

    setTimeout(() => {
      if (tskToUpdate) {
        if (tskToUpdate.isCompleted) {
          handleAddXp(`Completed Task: ${tskToUpdate.title} ✔️`, 50);
        }
        if (currentUser) {
          setDoc(doc(db, "users", currentUser.uid, "tasks", taskId), tskToUpdate)
            .catch(err => handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}/tasks/${taskId}`));
        }
      }
    }, 0);
  };

  const handleRemoveTask = async (taskId: string) => {
    setTasks(prev => {
      const nextTasks = prev.filter(t => t.id !== taskId);
      secureStorage.setItem("study_tasks", JSON.stringify(nextTasks));
      return nextTasks;
    });

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
    const todayStr = getLocalDateString();
    const logMinsToday = studyLogs
      .filter(l => l.date === todayStr)
      .reduce((sum, l) => sum + l.durationMinutes, 0);
    const liveMins = isStudyingUser
      ? (timerType === "stopwatch"
          ? activeSecondsUser / 60
          : (pomoState === "focus" ? (pomoFocusDuration * 60 - pomoSecondsLeft) / 60 : 0))
      : 0;
    return Math.round(logMinsToday + liveMins);
  }, [studyLogs, isStudyingUser, activeSecondsUser, timerType, pomoState, pomoFocusDuration, pomoSecondsLeft]);

  const handleSimulateTomorrow = async () => {
    // Force reset today's session as if a new day has arrived
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = getLocalDateString(tomorrow);

    setSubjects((prev) => {
      const resetSubs = prev.map((s) => ({ ...s, totalMinutes: 0 }));
      secureStorage.setItem("study_subjects", JSON.stringify(resetSubs));
      if (currentUser) {
        resetSubs.forEach(sub => {
          setDoc(doc(db, "users", currentUser.uid, "subjects", sub.id), sub)
            .catch(() => {});
        });
      }
      return resetSubs;
    });

    setQuests((prev) => {
      const resetQuests = prev.map((q) => ({ ...q, isCompleted: false }));
      secureStorage.setItem("study_quests", JSON.stringify(resetQuests));
      if (currentUser) {
        resetQuests.forEach(q => {
          setDoc(doc(db, "users", currentUser.uid, "quests", q.id), q)
            .catch(() => {});
        });
      }
      return resetQuests;
    });

    setReminders((prev) => {
      const resetReminders = prev.map((r) => ({
        ...r,
        isCompleted: false,
        triggeredAt: undefined
      }));
      secureStorage.setItem("study_reminders", JSON.stringify(resetReminders));
      return resetReminders;
    });

    setTasks((prev) => {
      const uncompletedTasks = prev.filter(t => !t.isCompleted);
      secureStorage.setItem("study_tasks", JSON.stringify(uncompletedTasks));
      if (currentUser) {
        const completed = prev.filter(t => t.isCompleted);
        completed.forEach(t => {
          deleteDoc(doc(db, "users", currentUser.uid, "tasks", t.id))
            .catch(() => {});
        });
      }
      return uncompletedTasks;
    });

    setIsStudyingUser(false);
    setActiveSecondsUser(0);
    setPomoState("focus");
    setPomoRound(1);
    setPomoSecondsLeft(pomoFocusDuration * 60);

    localStorage.removeItem("study_start_time_ms");
    localStorage.removeItem("study_seconds_baseline");
    localStorage.setItem("study_is_studying", "false");
    localStorage.setItem("study_active_seconds_user", "0");
    localStorage.setItem("study_last_active_date", tomorrowStr);

    setFiredNotification("🌅 Rollover simulation complete! Welcome to your new study session. Daily goals and timers have been reset.");
  };

  const handleResetAllData = async () => {
    // 1. Reset secure storage
    secureStorage.removeItem("study_subjects");
    secureStorage.removeItem("study_tasks");
    secureStorage.removeItem("study_logs");
    secureStorage.removeItem("study_daily_target");
    secureStorage.removeItem("study_rewards");
    secureStorage.removeItem("study_quests");
    secureStorage.removeItem("study_xp_logs");
    secureStorage.removeItem("study_reminders");
    
    // Clear other keys
    localStorage.removeItem("ypt_joined_room_id");
    secureStorage.removeItem("google_oauth_access_token");

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
    <div className={`min-h-screen w-full max-w-full overflow-x-hidden flex flex-col justify-between pb-24 transition-all duration-500 relative select-none ${
      activeTheme === "light"
        ? (
            themePreset === "forest" ? "bg-[#f3f7f4] text-[#1e3d2a]" :
            themePreset === "crimson" ? "bg-[#fdf5f5] text-[#701e23]" :
            themePreset === "honey" ? "bg-[#fbf7f0] text-[#5e4115]" :
            themePreset === "amoled" ? "bg-[#ffffff] text-[#0f172a]" :
            "bg-[#f8fafc] text-slate-900"
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
        <div className={`absolute top-[10%] left-[10%] w-72 h-72 sm:w-96 sm:h-96 rounded-full blur-[65px] sm:blur-[95px] animate-blob-1 transition-all duration-1000 ${dynamicBlobs.blob1}`}></div>
        <div className={`absolute bottom-[20%] right-[8%] w-80 h-80 sm:w-[480px] sm:h-[480px] rounded-full blur-[75px] sm:blur-[105px] animate-blob-2 transition-all duration-1000 ${dynamicBlobs.blob2}`}></div>
        <div className={`absolute top-[45%] right-[22%] w-60 h-60 sm:w-85 sm:h-85 rounded-full blur-[55px] sm:blur-[85px] animate-blob-3 transition-all duration-1000 ${dynamicBlobs.blob3}`}></div>
      </div>

      {/* Floating active alarm overlay banner */}
      {firedNotification && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4 animate-slide-in">
          <div className="bg-slate-900/98 dark:bg-[#121213]/98 border border-amber-500/35 text-slate-100 p-5 rounded-2xl shadow-2xl space-y-4">
            
            {/* 1. Header with Fired Message */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 text-left">
                <div className="p-2.5 bg-amber-500/15 text-amber-500 rounded-xl animate-pulse shrink-0">
                  <Bell className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#f26419]">Event Notification</p>
                  <p className="text-sm font-bold text-slate-100 mt-0.5 leading-snug">{firedNotification}</p>
                </div>
              </div>
              <button
                onClick={() => setFiredNotification(null)}
                className="text-[10px] uppercase font-black text-slate-300 hover:text-white bg-slate-950 border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-lg cursor-pointer transition-colors shrink-0"
              >
                Dismiss
              </button>
            </div>

            {/* 2. Interactive Focus Timer status (the active "timer" inside notification) */}
            <div className="p-3.5 bg-slate-950/75 border border-slate-900 rounded-xl space-y-2">
              <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-widest text-slate-400">
                <span>{isStudyingUser ? "⏱️ Active Study Stream" : "⚠️ Study Stream Paused"}</span>
                <span className="text-indigo-400 font-mono">
                  {timerType === "stopwatch" ? "Stopwatch Mode" : `Pomodoro (${pomoState})`}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="text-left font-mono font-black text-xl text-white">
                  {timerType === "stopwatch" ? (
                    `${String(Math.floor(activeSecondsUser / 3600)).padStart(2, "0")}:${String(Math.floor((activeSecondsUser % 3600) / 60)).padStart(2, "0")}:${String(activeSecondsUser % 60).padStart(2, "0")}`
                  ) : (
                    `${String(Math.floor(pomoSecondsLeft / 60)).padStart(2, "0")}:${String(pomoSecondsLeft % 60).padStart(2, "0")}`
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setIsStudyingUser(!isStudyingUser)}
                    className={`px-3 py-1.5 rounded-lg text-[9px] uppercase font-black cursor-pointer transition-colors ${
                      isStudyingUser
                        ? "bg-amber-600/20 text-amber-500 hover:bg-amber-600/30 border border-amber-500/25"
                        : "bg-emerald-600 text-white hover:bg-emerald-700"
                    }`}
                  >
                    {isStudyingUser ? "Pause" : "Resume"}
                  </button>
                  <button
                    onClick={() => {
                      setIsStudyingUser(false);
                      if (timerType === "stopwatch") {
                        setActiveSecondsUser(0);
                      } else {
                        setPomoSecondsLeft(pomoFocusDuration * 60);
                        setPomoState("focus");
                        setPomoRound(1);
                      }
                    }}
                    className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-[9px] uppercase font-black text-slate-350 cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Dynamic visual miniature progress bar for Pomodoro */}
              {timerType === "pomodoro" && (
                <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-500 transition-all duration-300"
                    style={{ 
                      width: `${
                        (pomoSecondsLeft / (
                          (pomoState === "focus" ? pomoFocusDuration : pomoState === "shortBreak" ? pomoShortBreakDuration : pomoLongBreakDuration) * 60
                        )) * 100
                      }%` 
                    }}
                  />
                </div>
              )}
            </div>

            {/* 3. "Remainders" (Upcoming Active Reminders remaining time checks) */}
            <div className="space-y-2 pt-1">
              <p className="text-[10px] uppercase font-black tracking-widest text-[#f26419] text-left">
                Study Alarms & Reminders Status
              </p>
              
              {reminders.filter(r => r.isActive && !r.isCompleted).length === 0 ? (
                <p className="text-[10px] text-slate-500 italic text-left">No other active reminders scheduled.</p>
              ) : (
                <div className="space-y-1.5 max-h-[140px] overflow-y-auto no-scrollbar pr-1">
                  {reminders.filter(r => r.isActive && !r.isCompleted).slice(0, 3).map((r) => {
                    // Calculate countdown remaining for timers
                    let statusLabel = "";
                    if (r.type === "timer" && r.durationMinutes) {
                      const currentSessionSeconds = timerType === "stopwatch"
                        ? activeSecondsUser
                        : (pomoState === "focus" ? (pomoFocusDuration * 60 - pomoSecondsLeft) : 0);
                      const currentMins = Math.floor(currentSessionSeconds / 60);
                      const minsRemaining = r.durationMinutes - (currentMins % r.durationMinutes);
                      statusLabel = `💦 Cycles: triggers in ~${minsRemaining > 0 ? minsRemaining : r.durationMinutes}m`;
                    } else {
                      statusLabel = `⏰ Alarm @ ${r.time}`;
                    }

                    return (
                      <div key={r.id} className="p-2.5 bg-slate-950/40 border border-slate-900 rounded-xl flex items-center justify-between text-left gap-2 hover:bg-slate-950/70 transition-colors">
                        <div className="flex items-center gap-2 max-w-[80%]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#f26419] shrink-0" />
                          <div className="truncate">
                            <span className="text-[10.5px] font-bold text-slate-200 block truncate">{r.title}</span>
                            <span className="text-[8.5px] font-mono text-slate-505 text-slate-400 leading-none">{statusLabel}</span>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => {
                            handleToggleReminder(r.id);
                          }}
                          className="text-[8px] uppercase font-black px-2 py-1 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-800 text-slate-300 rounded-md cursor-pointer transition-colors"
                        >
                          Mute
                        </button>
                      </div>
                    );
                  })}
                  
                  {reminders.filter(r => r.isActive && !r.isCompleted).length > 3 && (
                    <p className="text-[8px] uppercase tracking-wider font-mono font-black text-indigo-400 text-left pl-1">
                      + {reminders.filter(r => r.isActive && !r.isCompleted).length - 3} more active alarms pending in queue
                    </p>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      )}
      
      {/* Top compact account and state toolbar banner */}
      <header className={`sticky top-0 z-40 backdrop-blur-xl border-b px-6 py-3 px-safe transition-all duration-500 ${
        activeTheme === "light"
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
              <h1 className={`text-sm font-black tracking-wider uppercase leading-none ${activeTheme === 'light' ? 'text-slate-950' : 'text-white'}`}>Flash5tudy</h1>
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

            {/* Mode Switcher Segmented Control */}
            <div className="flex items-center gap-0.5 bg-white/45 dark:bg-[#171717]/80 p-1 rounded-full border border-slate-200 dark:border-slate-900 shadow-xs backdrop-blur-md">
              <button
                onClick={() => setThemeMode("light")}
                className={`p-1.5 px-2.5 rounded-full cursor-pointer transition-all flex items-center justify-center gap-1 focus:outline-none ${
                  themeMode === "light"
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 font-black shadow-xs"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-450 dark:hover:text-white"
                }`}
                title="Force Light Mode"
              >
                <Sun className="w-3.5 h-3.5" />
                <span className="text-[9px] font-mono font-bold uppercase hidden md:inline">Light</span>
              </button>
              
              <button
                onClick={() => setThemeMode("dark")}
                className={`p-1.5 px-2.5 rounded-full cursor-pointer transition-all flex items-center justify-center gap-1 focus:outline-none ${
                  themeMode === "dark"
                    ? "bg-violet-500/10 text-violet-600 dark:text-violet-400 font-black shadow-xs"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-450 dark:hover:text-white"
                }`}
                title="Force Dark Mode"
              >
                <Moon className="w-3.5 h-3.5" />
                <span className="text-[9px] font-mono font-bold uppercase hidden md:inline">Dark</span>
              </button>

              <button
                onClick={() => setThemeMode("system")}
                className={`p-1.5 px-2.5 rounded-full cursor-pointer transition-all flex items-center justify-center gap-1 focus:outline-none ${
                  themeMode === "system"
                    ? "bg-[#f26419]/10 text-[#f26419] font-black shadow-xs"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-450 dark:hover:text-white"
                }`}
                title="Sync with Device Scheme"
              >
                <Laptop className="w-3.5 h-3.5" />
                <span className="text-[9px] font-mono font-bold uppercase hidden sm:inline">Sync</span>
              </button>
            </div>

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
                className="flex items-center gap-1.5 bg-[#f26419] hover:bg-[#d85311] text-white text-xs font-black py-1.5 px-3.5 rounded-full cursor-pointer active:scale-95 transition-all select-none border border-transparent shadow-sm shadow-orange-500/10"
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

              {/* Dynamic Alerts & Sounds Quick Permission Granting Dashboard Banner */}
              {(notificationPermission !== "granted" || !audioAutoplayApproved) && !dismissedPermBanner && (
                <div className="bg-gradient-to-r from-indigo-950/95 via-slate-900/98 to-indigo-950/95 border border-indigo-500/30 p-4 rounded-3xl shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all animate-fade-in relative overflow-hidden z-25 mb-2">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-505/10 rounded-full blur-2xl -z-10 pointer-events-none"></div>
                  
                  <div className="flex items-start text-left gap-3.5">
                    <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl border border-indigo-500/20 shrink-0 self-start animate-pulse">
                      <div className="relative">
                        <Bell className="w-5 h-5 text-indigo-400" />
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-indigo-500 rounded-full animate-ping"></span>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-100 flex items-center gap-1.5 leading-none">
                        Activate Precision Study Alerts & Sound Alarms
                      </h4>
                      <p className="text-[11px] text-slate-300 leading-normal mt-1.5 max-w-xl">
                        Ensure you are alerted instantly when study intervals complete! Authorize **OS Push Notifications** and unlock **browser chime audios** so timers notify you even when working in other tabs.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      onClick={() => {
                        localStorage.setItem("dismissed_perm_banner", "true");
                        setDismissedPermBanner(true);
                      }}
                      className="px-3.5 py-2 bg-slate-950/60 hover:bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl cursor-pointer transition-all active:scale-95"
                    >
                      Maybe Later
                    </button>
                    <button
                      onClick={handleGrantAllPermissions}
                      className="px-4 py-2 bg-gradient-to-r from-indigo-650 to-indigo-500 hover:opacity-95 active:scale-95 text-xs text-white uppercase tracking-wider font-extrabold rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-600/15"
                    >
                      Enable Both
                    </button>
                  </div>
                </div>
              )}
          
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
              themePreset={themePreset}
              userXp={userXp}
              onAddXp={handleAddXp}
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
                themePreset={themePreset}
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
                totalMinutesToday={totalStudiedTodayMins}
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
                notificationPermission={notificationPermission}
                audioAutoplayApproved={audioAutoplayApproved}
                onGrantPermissions={handleGrantAllPermissions}
                notificationSettings={notificationSettings}
                onUpdateNotificationSettings={setNotificationSettings}
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
        onSimulateNewDay={handleSimulateTomorrow}
        userXp={userXp}
      />

      {/* Floating Centered bottom navigation Dock pills + Companion Button (Image 4 & 5) */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center items-center gap-2.5 sm:gap-3 z-40 px-3 sm:px-4">
        
        {/* Navigation dock bar */}
        <div className="bg-white/85 dark:bg-[#121212]/90 backdrop-blur-md px-3 sm:px-5 py-1.5 sm:py-2.5 border border-slate-200/70 dark:border-slate-900/40 rounded-full flex items-center justify-center gap-1.5 xs:gap-2.5 sm:gap-5 md:gap-6 shadow-2xl">
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
                className={`flex flex-col items-center gap-0.5 px-2 xs:px-3 py-0.5 sm:py-1 rounded-full cursor-pointer transition-all ${
                  isSelected 
                    ? "text-[#f26419] font-black scale-105" 
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
                title={tab.label}
              >
                <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${isSelected ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
                <span className="text-[8px] sm:text-[9px] font-bold tracking-tight">{tab.label}</span>
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
          className="w-11 h-11 sm:w-13 sm:h-13 bg-white/85 dark:bg-[#18181c]/90 active:scale-95 text-[#f26419] rounded-full flex items-center justify-center shadow-xl border border-slate-200/90 dark:border-slate-800/80 cursor-pointer hover:scale-105 transition-all backdrop-blur-md shrink-0"
          title="Flash5tudy Menu & Settings"
        >
          {activeTab === "focus" && <Layers className="w-5 h-5 text-[#f26419] animate-pulse" />}
          {activeTab === "planner" && <Sparkles className="w-5 h-5 text-pink-500" />}
          {activeTab === "rewards" && <Award className="w-5 h-5 text-amber-500 animate-bounce" />}
          {activeTab === "calendar" && <TrendingUp className="w-5 h-5 text-emerald-500" />}
          {activeTab === "rooms" && <Users className="w-5 h-5 text-[#f26419]" />}
          {activeTab === "reminders" && <Bell className="w-5 h-5 text-violet-500 animate-pulse" />}
          {!["focus", "planner", "rewards", "calendar", "rooms", "reminders"].includes(activeTab) && <Sparkles className="w-5 h-5 text-indigo-500 animate-spin-slow" />}
        </button>

      </div>

      {/* Tiny descriptive brand footer */}
      <footer className="w-full text-center text-slate-650 text-[10px] select-none pb-4 font-mono opacity-50">
        <p>© 2026 Flash5tudy. Built for consistent habit builders.</p>
      </footer>

      {/* Modern, Adaptive multi-method Authentication Hub Modal */}
      {showAuthModal && (
        <div 
          id="auth-modal-overlay"
          className="fixed inset-0 bg-[#0a0a0ade]/95 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-fade-in"
          onClick={() => {
            if (!authLoading) {
              setShowAuthModal(false);
              setAuthError(null);
              setAuthSuccessMsg(null);
              setAuthStep(1);
            }
          }}
        >
          <div 
            id="auth-modal-card"
            className="w-full max-w-[420px] bg-white dark:bg-[#151515] rounded-3xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 shadow-2xl relative text-left animate-slide-in overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Google-Style Top Multi-Colored Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-1.5 flex rounded-t-3xl overflow-hidden">
              <div className="bg-[#4285F4] flex-1"></div>
              <div className="bg-[#EA4335] flex-1"></div>
              <div className="bg-[#FBBC05] flex-1"></div>
              <div className="bg-[#34A853] flex-1"></div>
            </div>

            {/* Close Button */}
            <button 
              id="auth-modal-close-btn"
              onClick={() => {
                setShowAuthModal(false);
                setAuthError(null);
                setAuthSuccessMsg(null);
                setAuthStep(1);
              }}
              disabled={authLoading}
              className="absolute top-5 right-5 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-100 rounded-full cursor-pointer transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Brand Logo Wrapper */}
            <div className="mb-5 flex flex-col items-start select-none">
              <div className="flex items-center gap-1 font-sans text-2xl font-black tracking-tight mb-1">
                <span className="text-[#f26419]">F</span>
                <span className="text-[#4285F4]">l</span>
                <span className="text-[#EA4335]">a</span>
                <span className="text-[#FBBC05]">s</span>
                <span className="text-[#34A853]">h</span>
                <span className="text-[#f26419]">5</span>
                <span className="text-slate-800 dark:text-slate-100 font-extrabold">tudy</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-orange-500/10 text-[#f26419] font-bold tracking-wider uppercase ml-2 border border-orange-500/20">Cloud Synchronized</span>
              </div>
              
              {authMode === "forgot" ? (
                <>
                  <h3 className="text-base font-black tracking-tight text-slate-900 dark:text-slate-100 mt-2">
                    Account Recovery
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Enter your verified email address to receive a secure recovery link.
                  </p>
                </>
              ) : (
                <>
                  {/* High usability: State explicitly to the user they are creating or accessing their personal workspace */}
                  <h3 className="text-base font-bold tracking-tight text-slate-800 dark:text-slate-200 mt-2">
                    {authMode === "signup" ? "✨ Create Your study profile first" : "🔑 Sign in to your account"}
                  </h3>
                  <p className="text-xs text-slate-550 dark:text-slate-400 mt-1 leading-relaxed">
                    {authMode === "signup" 
                      ? "First-time here? Create your free study profile in Flash5tudy to sync YPT rooms, active focus stats, and your AI study logs!" 
                      : "Welcome back! Access your customized study tracking dashboard with your credentials."}
                  </p>
                </>
              )}
            </div>

            {/* Smart, Friendly Selector Tabs so the User Knows Exactly what to do */}
            {authMode !== "forgot" && authStep === 1 && (
              <div className="flex bg-slate-100 dark:bg-slate-900/90 p-1 rounded-xl mb-4.5 border border-slate-200/50 dark:border-slate-800/60 select-none">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("signup");
                    setAuthError(null);
                  }}
                  className={`flex-1 py-2 text-center text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1 ${
                    authMode === "signup"
                      ? "bg-white dark:bg-[#1e1e1e] text-orange-500 shadow-sm font-black scale-102"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  }`}
                >
                  <span className="text-[11px] animate-pulse">✨</span> 1. Create Free Account
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("signin");
                    setAuthError(null);
                  }}
                  className={`flex-1 py-2 text-center text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1 ${
                    authMode === "signin"
                      ? "bg-white dark:bg-[#1e1e1e] text-[#4285F4] shadow-sm font-black scale-102"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  }`}
                >
                  <span>🔑</span> 2. Sign In Instead
                </button>
              </div>
            )}

            {/* Educational Alert Banner reminding them to create an account first */}
            {authMode === "signup" && authStep === 1 && (
              <div className="mb-4 p-3 bg-gradient-to-r from-orange-500/5 to-amber-500/5 border border-orange-500/10 rounded-xl text-[10.5px] text-orange-600 dark:text-orange-400/90 leading-relaxed font-sans">
                💡 <span className="font-bold">First Time in Flash5tudy?</span> You need to create an account first. Enter your email address below, click <span className="font-bold font-mono">Next</span> to choose a name and password, or log in instantly using the Google button!
              </div>
            )}

            {/* Render Stepped Layout */}
            {authMode === "forgot" ? (
              /* ================= forgot password layout ================= */
              <form onSubmit={handleForgotPasswordAction} className="space-y-4">
                <div className="space-y-1">
                  <label htmlFor="recovery-email-input" className="block text-[10px] uppercase tracking-wider font-mono font-bold text-slate-500 dark:text-slate-400">
                    Email Address
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                      <Mail className="w-3.5 h-3.5" />
                    </span>
                    <input 
                      id="recovery-email-input"
                      type="email"
                      placeholder="name@gmail.com"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      disabled={authLoading}
                      required
                      className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-[#1d1d1d] border border-slate-200 dark:border-slate-800 rounded-xl focus:border-[#4285F4] focus:outline-none focus:ring-1 focus:ring-[#4285F4]/30 text-slate-850 dark:text-slate-100 transition-all font-sans"
                    />
                  </div>
                </div>

                {authError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-2 text-rose-500 text-[10.5px]">
                    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{authError}</span>
                  </div>
                )}

                {authSuccessMsg && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-emerald-500 text-[10.5px] font-bold">
                    <Sparkles className="w-3.5 h-3.5 shrink-0 text-emerald-500 animate-pulse" />
                    <span>{authSuccessMsg}</span>
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    disabled={authLoading}
                    onClick={() => {
                      setAuthMode("signin");
                      setAuthStep(1);
                      setAuthError(null);
                      setAuthSuccessMsg(null);
                    }}
                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-250 cursor-pointer font-bold select-none py-2"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Back to Sign In
                  </button>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="px-5 py-2.5 bg-[#4285F4] hover:bg-[#357ae8] text-white text-xs font-black rounded-xl cursor-pointer select-none transition-all active:scale-[98%] disabled:opacity-60 flex items-center gap-1.5 shadow-lg"
                  >
                    {authLoading ? "Sending..." : "Send link"}
                  </button>
                </div>
              </form>
            ) : authStep === 1 ? (
              /* ================= step 1 layout ================= */
              <div className="space-y-4">
                {/* Primary Google Login Button */}
                <button
                  id="auth-google-auth-btn-top"
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
                      let errMsg = err?.message || String(err);
                      if (err?.code === "auth/unauthorized-domain" || errMsg.includes("unauthorized-domain") || errMsg.includes("unauthorized client") || errMsg.includes("unauthorized_client")) {
                        errMsg = `This domain (${window.location.hostname}) is not authorized in your Firebase Console. Please add '${window.location.hostname}' to Firebase > Authentication > Settings (last tab) > Authorized domains.`;
                      } else {
                        errMsg = `Popup failed: ${errMsg}. Please ensure popups are allowed in your browser settings.`;
                      }
                      setAuthError(errMsg);
                    } finally {
                      setAuthLoading(false);
                    }
                  }}
                  className="w-full py-3 bg-[#4285F4] hover:bg-[#357ae8] text-white text-xs font-black rounded-xl cursor-pointer select-none transition-all flex items-center justify-center gap-2.5 active:scale-[98%] disabled:opacity-50 disabled:pointer-events-none shadow-md"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M12.24 10.285V13.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.579-7.859-8s3.529-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l2.427-2.334C18.155 2.153 15.463 1 12.24 1c-6.075 0-11 4.925-11 11s4.925 11 11 11c6.34 0 10.564-4.437 10.564-10.75 0-.726-.077-1.282-.175-1.965H12.24Z"
                    />
                  </svg>
                  <span>Sign In with Google</span>
                </button>

                <div className="flex items-center justify-center gap-3 select-none py-1.5">
                  <span className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800/80"></span>
                  <span className="text-[9px] font-mono tracking-widest text-slate-400 font-bold uppercase">or connect via email</span>
                  <span className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800/80"></span>
                </div>

                <form onSubmit={handleEmailNext} className="space-y-4">
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
                        className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-[#1d1d1d] border border-slate-200 dark:border-slate-800 rounded-xl focus:border-[#4285F4] focus:outline-none focus:ring-1 focus:ring-[#4285F4]/30 text-slate-800 dark:text-slate-100 transition-all font-sans"
                      />
                    </div>
                  </div>

                  {authError && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-2 text-rose-500 text-[10.5px]">
                      <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>{authError}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-3 pt-2">
                    <button
                      type="button"
                      disabled={authLoading}
                      onClick={() => {
                        setAuthMode(authMode === "signin" ? "signup" : "signin");
                        setAuthError(null);
                      }}
                      className="text-xs text-[#4285F4] hover:text-[#357ae8] hover:underline cursor-pointer font-bold select-none py-2"
                    >
                      {authMode === "signin" ? "Create account" : "Sign in instead"}
                    </button>

                    <button
                      type="submit"
                      disabled={authLoading}
                      className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-black rounded-xl cursor-pointer select-none transition-all active:scale-[98%] disabled:opacity-60 flex items-center gap-1.5"
                    >
                      <span>Next</span>
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* ================= step 2 layout ================= */
              <form onSubmit={handleEmailAuth} className="space-y-4">
                {/* Email Display Pill */}
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-[#1e1e1e] border border-slate-250 dark:border-slate-800 rounded-full px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 w-fit select-none shadow-xs">
                  <div className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 flex items-center justify-center text-[9px] font-black uppercase">
                    {authEmail.charAt(0)}
                  </div>
                  <span className="truncate max-w-[200px] font-medium">{authEmail}</span>
                  <button
                    type="button"
                    onClick={() => setAuthStep(1)}
                    className="p-0.5 text-[#4285F4] hover:text-[#357ae8] rounded-full hover:bg-blue-500/10 transition-colors ml-1 cursor-pointer"
                    title="Change email"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                  </button>
                </div>

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
                        className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-[#1d1d1d] border border-slate-200 dark:border-slate-800 rounded-xl focus:border-[#4285F4] focus:outline-none focus:ring-1 focus:ring-[#4285F4]/30 text-slate-800 dark:text-slate-100 transition-all font-sans"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label htmlFor="auth-password-input" className="block text-[10px] uppercase tracking-wider font-mono font-bold text-slate-500 dark:text-slate-400">
                      Password
                    </label>
                    {authMode === "signin" && (
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode("forgot");
                          setAuthError(null);
                        }}
                        className="text-[10px] text-[#4285F4] hover:underline cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                      <Lock className="w-3.5 h-3.5" />
                    </span>
                    <input 
                      id="auth-password-input"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      disabled={authLoading}
                      required
                      className="w-full pl-9 pr-10 py-2 text-xs bg-slate-50 dark:bg-[#1d1d1d] border border-slate-200 dark:border-slate-800 rounded-xl focus:border-[#4285F4] focus:outline-none focus:ring-1 focus:ring-[#4285F4]/30 text-slate-800 dark:text-slate-100 transition-all font-sans"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Password Strength Meter */}
                {authPassword && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-1.5 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Strength:</span>
                      <span className={`text-[10px] font-black ${passwordStrength.textColor}`}>{passwordStrength.text}</span>
                    </div>
                    {/* Multi-segmented strength bar */}
                    <div className="h-1 flex gap-1 rounded-full overflow-hidden bg-slate-250 dark:bg-slate-800">
                      <div className={`h-full flex-1 transition-all duration-300 ${passwordStrength.score >= 1 ? passwordStrength.color : ""}`}></div>
                      <div className={`h-full flex-1 transition-all duration-300 ${passwordStrength.score >= 2 ? passwordStrength.color : ""}`}></div>
                      <div className={`h-full flex-1 transition-all duration-300 ${passwordStrength.score >= 3 ? passwordStrength.color : ""}`}></div>
                    </div>
                    {/* Live Criteria Feedback */}
                    <div className="grid grid-cols-3 gap-2 pt-1 text-[9px] text-slate-500 select-none">
                      <span className={`flex items-center gap-1 ${authPassword.length >= 6 ? "text-emerald-500 font-bold" : ""}`}>
                        {authPassword.length >= 6 ? "✓" : "○"} 6+ chars
                      </span>
                      <span className={`flex items-center gap-1 ${(/[a-z]/.test(authPassword) && /[A-Z]/.test(authPassword)) ? "text-emerald-500 font-bold" : ""}`}>
                        {(/[a-z]/.test(authPassword) && /[A-Z]/.test(authPassword)) ? "✓" : "○"} Aa mixed
                      </span>
                      <span className={`flex items-center gap-1 ${(/[0-9]/.test(authPassword) || /[^a-zA-Z0-9]/.test(authPassword)) ? "text-emerald-500 font-bold" : ""}`}>
                        {(/[0-9]/.test(authPassword) || /[^a-zA-Z0-9]/.test(authPassword)) ? "✓" : "○"} Num/Symbol
                      </span>
                    </div>
                  </div>
                )}

                {authError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-2 text-rose-500 text-[10.5px]">
                    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{authError}</span>
                  </div>
                )}

                {authSuccessMsg && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-emerald-500 text-[10.5px] font-bold">
                    <Sparkles className="w-3.5 h-3.5 shrink-0 text-emerald-500 animate-pulse" />
                    <span>{authSuccessMsg}</span>
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    disabled={authLoading}
                    onClick={() => setAuthStep(1)}
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-350 cursor-pointer font-bold select-none py-2"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="px-6 py-2.5 bg-[#4285F4] hover:bg-[#357ae8] text-white text-xs font-black rounded-xl cursor-pointer select-none transition-all active:scale-[98%] disabled:opacity-60 flex items-center gap-1.5 shadow-lg"
                  >
                    {authLoading ? (
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        Loading
                      </span>
                    ) : (
                      <span>{authMode === "signin" ? "Sign In" : "Register"}</span>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Subtle Divider */}
            {authMode !== "forgot" && (
              <>
                <div className="my-5 flex items-center justify-center gap-3 select-none">
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
                      let errMsg = err?.message || String(err);
                      if (err?.code === "auth/unauthorized-domain" || errMsg.includes("unauthorized-domain") || errMsg.includes("unauthorized client") || errMsg.includes("unauthorized_client")) {
                        errMsg = `This domain (${window.location.hostname}) is not authorized in your Firebase Console. Please add '${window.location.hostname}' to Firebase > Authentication > Settings (last tab) > Authorized domains.`;
                      } else {
                        errMsg = `Popup failed: ${errMsg}. Please ensure popups are allowed in your browser settings.`;
                      }
                      setAuthError(errMsg);
                    } finally {
                      setAuthLoading(false);
                    }
                  }}
                  className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-[#1f1f1f] dark:hover:bg-[#252525] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 text-xs font-black rounded-xl cursor-pointer select-none transition-all flex items-center justify-center gap-2 active:scale-[98%] disabled:opacity-50 disabled:pointer-events-none"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M12.24 10.285V13.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.579-7.859-8s3.529-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l2.427-2.334C18.155 2.153 15.463 1 12.24 1c-6.075 0-11 4.925-11 11s4.925 11 11 11c6.34 0 10.564-4.437 10.564-10.75 0-.726-.077-1.282-.175-1.965H12.24Z"
                    />
                  </svg>
                  <span>Google Account</span>
                </button>
              </>
            )}

            {/* Interactive Firebase Console Diagnostic Footnote Info Box */}
            <div 
              id="auth-config-guideline-box"
              className="mt-5 p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col gap-2"
            >
              <div className="flex items-start gap-2.5">
                <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                <div className="text-[10px] leading-relaxed text-slate-600 dark:text-slate-350">
                  <strong className="text-slate-800 dark:text-slate-200 font-bold font-sans">Google Login &amp; Domain Setup:</strong>
                  <p className="mt-0.5">
                    For real Google Login, please ensure Google Auth is enabled in your Firebase Console. You must also add the dynamic testing domains below to your authorized domains settings:
                  </p>
                </div>
              </div>
              <div className="p-2 bg-slate-100 dark:bg-slate-950 rounded-xl space-y-1 text-[9px] font-mono text-slate-500 border border-slate-200/40 select-text">
                <div className="flex justify-between items-center gap-2">
                  <span className="truncate selection:bg-blue-500 selection:text-white">{window.location.hostname}</span>
                  <span className="text-[8px] bg-blue-500/10 text-blue-500 px-1 rounded uppercase font-black shrink-0">Current</span>
                </div>
                <div className="text-slate-400 text-[8px] leading-normal pt-1">
                  👉 Go to <strong>Firebase Console &gt; Authentication &gt; Settings</strong> (last tab) &gt; <strong>Authorized domains</strong>, and click "Add domain" to paste it!
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
