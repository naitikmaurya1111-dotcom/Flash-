import { useState, useEffect, useMemo } from "react";
import { Clock, Users, ClipboardList, TrendingUp, Sparkles, BookOpen, Award, Flame, CloudLightning, LogOut, LogIn, Home, ClipboardCheck, Calendar, Bell, Sun, Moon, Layers } from "lucide-react";
import { Subject, Task, StudyLog, Reminder } from "./types";
import { INITIAL_SUBJECTS, INITIAL_CLASSMATES } from "./data";
import { 
  collection, 
  doc, 
  getDoc,
  setDoc, 
  deleteDoc, 
  getDocs, 
  getDocFromServer 
} from "firebase/firestore";
import { db, auth, initAuth, googleSignIn, logout, getAccessToken } from "./lib/googleApi";
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
  const [activeTab, setActiveTab] = useState<"focus" | "rooms" | "planner" | "analytics" | "ai-coach" | "workspace" | "calendar" | "reminders">("focus");
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // YPT configuration overlays
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [themePreset, setThemePreset] = useState(() => localStorage.getItem("ypt_theme_preset") || "dark-classic");
  const [themeMode, setThemeMode] = useState<"light" | "dark">(() => (localStorage.getItem("study_theme_mode") as "light" | "dark") || "dark");
  const [isOfflineMode, setIsOfflineMode] = useState(false);

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
  const [isStudyingUser, setIsStudyingUser] = useState(false);
  const [activeSecondsUser, setActiveSecondsUser] = useState(0);

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
        // Load cloud synced collections
        try {
          // Fetch Cloud profile
          const userDocRef = doc(db, "users", user.uid);
          const subCol = collection(db, "users", user.uid, "subjects");
          const taskCol = collection(db, "users", user.uid, "tasks");
          const logCol = collection(db, "users", user.uid, "studyLogs");

          const [userSnap, subSnap, taskSnap, logSnap] = await Promise.all([
            getDoc(userDocRef),
            getDocs(subCol),
            getDocs(taskCol),
            getDocs(logCol)
          ]);

          // Fetch or initialize customizable target minutes
          if (userSnap.exists()) {
            const userData = userSnap.data();
            if (userData.dailyTargetMinutes) {
              setDailyTargetMinutes(userData.dailyTargetMinutes);
            }
          } else {
            // Register Student configuration profile
            await setDoc(userDocRef, {
              userId: user.uid,
              email: user.email || "",
              displayName: user.displayName || "Scholar",
              dailyTargetMinutes: dailyTargetMinutes
            });
          }

          const loadedSubs: Subject[] = [];
          const loadedTasks: Task[] = [];
          const loadedLogs: StudyLog[] = [];

          subSnap.forEach(d => loadedSubs.push(d.data() as Subject));
          taskSnap.forEach(d => loadedTasks.push(d.data() as Task));
          logSnap.forEach(d => loadedLogs.push(d.data() as StudyLog));

          // Onboarding cloud sync (if brand new cloud account - write current offline state)
          if (loadedSubs.length === 0) {
            subjects.forEach(async (sub) => {
              await setDoc(doc(db, "users", user.uid, "subjects", sub.id), sub);
            });
            tasks.forEach(async (tsk) => {
              await setDoc(doc(db, "users", user.uid, "tasks", tsk.id), tsk);
            });
            studyLogs.slice(0, 50).forEach(async (lg) => { // slice prevents massive document write bursts
              await setDoc(doc(db, "users", user.uid, "studyLogs", lg.id), lg);
            });
          } else {
            // Apply loaded cloud profile
            setSubjects(loadedSubs);
            setTasks(loadedTasks);
            setStudyLogs(loadedLogs);
          }
        } catch (err) {
          console.warn("Firestore sync failed on init, loading offline cache data instead.", err);
          
          // Clear cloud loading state and fallback to local storage safely
          const localSubs = localStorage.getItem("study_subjects");
          const localTasks = localStorage.getItem("study_tasks");
          const localLogs = localStorage.getItem("study_logs");

          setSubjects(localSubs ? JSON.parse(localSubs) : INITIAL_SUBJECTS);
          setTasks(localTasks ? JSON.parse(localTasks) : []);
          setStudyLogs(localLogs ? JSON.parse(localLogs) : []);

          handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
        }
      },
      () => {
        setCurrentUser(null);
        // Clear screen data to restore clean guest values / protect user sign-outs
        const localSubs = localStorage.getItem("study_subjects");
        const localTasks = localStorage.getItem("study_tasks");
        const localLogs = localStorage.getItem("study_logs");

        setSubjects(localSubs ? JSON.parse(localSubs) : INITIAL_SUBJECTS);
        setTasks(localTasks ? JSON.parse(localTasks) : []);
        setStudyLogs(localLogs ? JSON.parse(localLogs) : []);
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


  // Combined authentications triggers
  const [authLoading, setAuthLoading] = useState(false);
  const handleHeaderLogin = async () => {
    setAuthLoading(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setCurrentUser(res.user);
      }
    } catch (err) {
      console.error("Popup authentication failed:", err);
    } finally {
      setAuthLoading(false);
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
  const handleAddStudyMinutes = async (subjectId: string, minutes: number) => {
    const todayStr = new Date().toISOString().split("T")[0];
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
    setStudyLogs(prev => [newLog, ...prev]);
    setSubjects(prev =>
      prev.map(s => (s.id === subjectId ? { ...s, totalMinutes: Math.round(s.totalMinutes + minutes) } : s))
    );

    // Sync to Cloud
    if (currentUser) {
      try {
        const userRef = doc(db, "users", currentUser.uid);
        const subRef = doc(db, "users", currentUser.uid, "subjects", subjectId);
        const logRef = doc(db, "users", currentUser.uid, "studyLogs", newLog.id);

        const updatedSubject = { ...targetSubject, totalMinutes: Math.round(targetSubject.totalMinutes + minutes) };

        await Promise.all([
          setDoc(subRef, updatedSubject),
          setDoc(logRef, newLog)
        ]);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.uid}/studyLogs/${newLog.id}`);
      }
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

    setSubjects(prev => [...prev, newSub]);
    setActiveSubjectId(nextId);

    if (currentUser) {
      try {
        await setDoc(doc(db, "users", currentUser.uid, "subjects", nextId), newSub);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${currentUser.uid}/subjects/${nextId}`);
      }
    }
  };

  const handleRemoveSubject = async (subjectId: string) => {
    setSubjects(prev => prev.filter(s => s.id !== subjectId));
    setTasks(prev => prev.map(t => (t.subjectId === subjectId ? { ...t, subjectId: "general" } : t)));
    
    // set another active subject if deleted active
    if (activeSubjectId === subjectId) {
      setSubjects(current => {
        if (current.length > 0) setActiveSubjectId(current[0].id);
        return current;
      });
    }

    if (currentUser) {
      try {
        await deleteDoc(doc(db, "users", currentUser.uid, "subjects", subjectId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${currentUser.uid}/subjects/${subjectId}`);
      }
    }
  };

  const handleAddTask = async (title: string, subjectId: string) => {
    const newTask: Task = {
      id: `task-${Date.now()}`,
      title,
      isCompleted: false,
      subjectId
    };
    setTasks(prev => [...prev, newTask]);

    if (currentUser) {
      try {
        await setDoc(doc(db, "users", currentUser.uid, "tasks", newTask.id), newTask);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${currentUser.uid}/tasks/${newTask.id}`);
      }
    }
  };

  const handleToggleTask = async (taskId: string) => {
    let tskToUpdate: Task | undefined;
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        tskToUpdate = { ...t, isCompleted: !t.isCompleted };
        return tskToUpdate;
      }
      return t;
    }));

    if (currentUser && tskToUpdate) {
      try {
        await setDoc(doc(db, "users", currentUser.uid, "tasks", taskId), tskToUpdate);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}/tasks/${taskId}`);
      }
    }
  };

  const handleRemoveTask = async (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));

    if (currentUser) {
      try {
        await deleteDoc(doc(db, "users", currentUser.uid, "tasks", taskId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${currentUser.uid}/tasks/${taskId}`);
      }
    }
  };

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
    <div className={`min-h-screen flex flex-col justify-between pb-24 transition-all duration-300 relative select-none ${
      themeMode === "light"
        ? "bg-[#f5f6f8] text-slate-800"
        : themePreset === "amoled" ? "bg-black text-white" :
        themePreset === "forest" ? "bg-[#05100c] text-[#d1e7dd]" :
        themePreset === "crimson" ? "bg-[#120102] text-[#f8d7da]" :
        "bg-[#08080c] text-white"
    }`} id="ypt-immersive-viewport-root">
      
      {/* Liquid Glass Background Drifting Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[10%] left-[10%] w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-gradient-to-tr from-orange-400/25 to-rose-400/25 dark:from-[#f26419]/15 dark:to-[#e73c7e]/15 blur-[65px] sm:blur-[95px] animate-blob-1"></div>
        <div className="absolute bottom-[20%] right-[8%] w-80 h-80 sm:w-[480px] sm:h-[480px] rounded-full bg-gradient-to-br from-indigo-400/20 to-purple-450/20 dark:from-indigo-950/20 dark:to-purple-950/25 blur-[75px] sm:blur-[105px] animate-blob-2"></div>
        <div className="absolute top-[45%] right-[22%] w-60 h-60 sm:w-85 sm:h-85 rounded-full bg-gradient-to-tl from-emerald-400/15 to-teal-400/15 dark:from-emerald-950/15 dark:to-teal-950/20 blur-[55px] sm:blur-[85px] animate-blob-3"></div>
      </div>

      {/* Floating active alarm overlay banner */}
      {firedNotification && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-sm px-4 animate-slide-in">
          <div className="bg-[#161616]/95 backdrop-blur-md border border-amber-500/40 text-slate-100 p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl animate-pulse">
                <Bell className="w-5 h-5 text-amber-400" />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-black uppercase tracking-wider text-amber-500">Focus Alarm Check</p>
                <p className="text-xs font-bold text-slate-200 mt-0.5">{firedNotification}</p>
              </div>
            </div>
            <button
              onClick={() => setFiredNotification(null)}
              className="text-[10px] font-bold text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 p-1.5 px-3 rounded-md cursor-pointer transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
      
      {/* Top compact account and state toolbar banner */}
      <header className={`sticky top-0 z-40 backdrop-blur-xl border-b px-6 py-3 px-safe transition-colors ${
        themeMode === "light"
          ? "bg-white/70 border-slate-200/50"
          : themePreset === "amoled" ? "bg-black/90 border-slate-900" :
          themePreset === "forest" ? "bg-[#05100c]/90 border-emerald-950/40" :
          themePreset === "crimson" ? "bg-[#120102]/90 border-rose-950/40" :
          "bg-[#08080c]/85 border-slate-900/40"
      }`}>
        <div className="max-w-4xl mx-auto flex items-center justify-between relative z-10">
          
          {/* Logo brand & streak info */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#f26419] flex items-center justify-center text-white shadow-md cursor-pointer hover:scale-105 active:scale-95 transition-transform" onClick={() => setActiveTab("focus")}>
              <Clock className="w-5 h-5 font-bold" />
            </div>
            <div className="text-left">
              <h1 className="text-xs font-black tracking-tight uppercase leading-none text-slate-900 dark:text-slate-100">StudyPulse</h1>
              <div className="flex items-center gap-1.5 mt-0.5" title="Daily study streak indicator">
                <Flame className="w-3.5 h-3.5 text-orange-500 animate-pulse shrink-0" />
                <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">{activeStreakCount} days streak</span>
              </div>
            </div>
          </div>

            {/* Quick Stats Summary badges */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <div className="hidden sm:flex items-center gap-1.5 bg-white/45 dark:bg-[#171717]/80 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-905 font-mono text-[11px] text-slate-700 dark:text-slate-300 shadow-sm backdrop-blur-md">
                <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-wider">Studied:</span>
                <span className="font-bold text-[#f26419]">
                  {Math.floor(totalStudiedTodayMins / 60)}h {Math.round(totalStudiedTodayMins % 60)}m
                </span>
              </div>

              {/* Mode Switcher */}
              <button
                onClick={() => setThemeMode(prev => prev === "dark" ? "light" : "dark")}
                className="p-2 rounded-full cursor-pointer border transition-all bg-white/45 hover:bg-white/70 text-slate-600 border-slate-200 dark:bg-[#171717] dark:hover:bg-[#202020] dark:border-slate-900 dark:text-slate-450 dark:hover:text-white shadow-sm backdrop-blur-md flex items-center justify-center"
                title={themeMode === "dark" ? "Toggle Light mode" : "Toggle Dark mode"}
              >
                {themeMode === "dark" ? (
                  <Sun className="w-4 h-4 text-amber-500 animate-spin-slow" />
                ) : (
                  <Moon className="w-4 h-4 text-indigo-500" />
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
                } shadow-sm backdrop-blur-md`}
                title="Study Focus Alarms & Reminders"
              >
                <Bell className="w-4 h-4" />
                {reminders.some(r => r.isActive && !r.isCompleted) && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-[#f26419] rounded-full animate-ping"></span>
                )}
              </button>

            {/* Google Authentication Section */}
            {currentUser ? (
              <div className="flex items-center gap-2.5 bg-[#161616] p-1 pr-2.5 rounded-full border border-slate-900 hover:border-slate-800 transition-colors">
                {currentUser.photoURL ? (
                  <img 
                    referrerPolicy="no-referrer" 
                    src={currentUser.photoURL} 
                    alt={currentUser.displayName || "User"} 
                    className="w-6 h-6 rounded-full border border-slate-700/50" 
                  />
                ) : (
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-white font-black uppercase font-mono ${getAvatarSeed(currentUser.email)}`}>
                    {currentUser.displayName?.[0] || currentUser.email?.[0] || "U"}
                  </div>
                )}
                <div className="hidden md:block text-left leading-none max-w-[100px] truncate">
                  <p className="text-xs font-black truncate text-slate-100 leading-none">
                    {currentUser.displayName || "Scholar"}
                  </p>
                  <p className="text-[8.5px] text-slate-500 font-mono truncate mt-0.5">{currentUser.email}</p>
                </div>
                <button
                  onClick={handleHeaderLogout}
                  disabled={authLoading}
                  className="p-1 text-slate-400 hover:text-rose-500 rounded-full cursor-pointer hover:bg-slate-800/40"
                  title="Sign Out"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={handleHeaderLogin}
                disabled={authLoading}
                className="flex items-center gap-1.5 bg-white text-[#0a0a0a] text-xs font-black py-1.5 px-3.5 rounded-full cursor-pointer hover:opacity-90 active:scale-95 transition-all select-none border border-white/10"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Google Login</span>
              </button>
            )}
          </div>

        </div>
      </header>

      {/* Main Tab dashboard container constraint */}
      <main className="max-w-4xl w-full mx-auto px-4 md:px-0 flex-1 flex flex-col justify-start relative">
        <div className="flex-1 flex flex-col pt-3 py-6" style={{ minHeight: "500px" }}>
          
          {activeTab === "focus" && (
            <TimelineView
              subjects={subjects}
              setSubjects={setSubjects}
              onAddStudyMinutes={handleAddStudyMinutes}
              activeSubjectId={activeSubjectId}
              setActiveSubjectId={setActiveSubjectId}
              isStudying={isStudyingUser}
              setIsStudying={setIsStudyingUser}
              activeSeconds={activeSecondsUser}
              setActiveSeconds={setActiveSecondsUser}
              onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
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
            <CalendarView studyLogs={studyLogs} />
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
            if (activeTab === "focus" || activeTab === "planner" || activeTab === "calendar" || activeTab === "rooms" || activeTab === "reminders") {
              setIsSidebarOpen(!isSidebarOpen);
            }
          }}
          className="w-13 h-13 bg-white/75 dark:bg-[#1c1c1c]/85 active:scale-95 text-[10.5px] text-[#f26419] uppercase font-black tracking-widest font-mono rounded-full flex items-center justify-center shadow-lg border border-slate-200/80 dark:border-slate-800/80 cursor-pointer cursor-and-touch hover:scale-105 transition-all backdrop-blur-md"
          title="YPT Quick Actions Panel"
        >
          {activeTab === "focus" && "?"}
          {activeTab === "planner" && "Day"}
          {activeTab === "calendar" && "Fil"}
          {activeTab === "rooms" && "+"}
          {activeTab === "reminders" && "🔔"}
        </button>

      </div>

      {/* Tiny descriptive brand footer */}
      <footer className="w-full text-center text-slate-650 text-[10px] select-none pb-4 font-mono opacity-50">
        <p>© 2026 StudyPulse. Built for consistent habit builders.</p>
      </footer>

    </div>
  );
}
