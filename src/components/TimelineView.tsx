import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  Play, 
  Pause, 
  Columns, 
  Grid, 
  Check, 
  HelpCircle, 
  Edit, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Clock, 
  Calendar, 
  BookOpen, 
  Trash, 
  Maximize2, 
  CornerDownRight, 
  RotateCcw,
  RotateCw,
  SkipForward,
  Zap,
  Plus,
  Shield,
  Brain,
  Award,
  Flame,
  Heart
} from "lucide-react";
import { Subject, StudyLog, ALL_STUDENT_LEVELS, calculateStudentLevel, formatStudyTimeExact, NotificationSettings } from "../types";
import { playChime } from "./RemindersHub";
import { Info, X, Target, Lock, History } from "lucide-react"; // Import Info, X, Target, Lock, History icon specifically

function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

interface TimelineViewProps {
  subjects: Subject[];
  studyLogs: StudyLog[];
  setSubjects: React.Dispatch<React.SetStateAction<Subject[]>>;
  onAddStudyMinutes: (subjectId: string, minutes: number) => Promise<void>;
  activeSubjectId: string;
  setActiveSubjectId: (id: string) => void;
  isStudying: boolean;
  setIsStudying: (val: boolean) => void;
  activeSeconds: number;
  setActiveSeconds: React.Dispatch<React.SetStateAction<number>>;
  onToggleSidebar: () => void;

  // Pomodoro & custom timer props
  timerType: "stopwatch" | "pomodoro" | "custom";
  setTimerType: (type: "stopwatch" | "pomodoro" | "custom") => void;
  pomoState: "focus" | "shortBreak" | "longBreak";
  setPomoState: (state: "focus" | "shortBreak" | "longBreak") => void;
  pomoRound: number;
  setPomoRound: (round: number) => void;
  pomoFocusDuration: number;
  setPomoFocusDuration: (duration: number) => void;
  pomoShortBreakDuration: number;
  setPomoShortBreakDuration: (duration: number) => void;
  pomoLongBreakDuration: number;
  setPomoLongBreakDuration: (duration: number) => void;
  pomoSecondsLeft: number;
  setPomoSecondsLeft: React.Dispatch<React.SetStateAction<number>>;
  onUpdateSubjectGoal: (subjectId: string, goalMinutes: number) => Promise<void>;
  onAddSubject: (name: string, goalMinutes: number, colorStyle: string) => Promise<void>;
  onRemoveSubject: (subjectId: string) => Promise<void>;
  themePreset?: string;
  onThemeSelect?: (preset: string) => void;
  userXp?: number;
  onAddXp?: (reason: string, amount: number) => Promise<void>;
  onChangeTab?: (tab: any) => void;
  onResetTimer?: () => void;
  showSystemNotification?: (title: string, body: string) => void;
  setFiredNotification?: (message: string | null) => void;
  notificationSettings?: NotificationSettings;
}

export default function TimelineView({
  subjects,
  studyLogs,
  setSubjects,
  onAddStudyMinutes,
  activeSubjectId,
  setActiveSubjectId,
  isStudying,
  setIsStudying,
  activeSeconds,
  setActiveSeconds,
  onToggleSidebar,
  timerType,
  setTimerType,
  pomoState,
  setPomoState,
  pomoRound,
  setPomoRound,
  pomoFocusDuration,
  setPomoFocusDuration,
  pomoShortBreakDuration,
  setPomoShortBreakDuration,
  pomoLongBreakDuration,
  setPomoLongBreakDuration,
  pomoSecondsLeft,
  setPomoSecondsLeft,
  onUpdateSubjectGoal,
  onAddSubject,
  onRemoveSubject,
  themePreset = "dark-classic",
  onThemeSelect,
  userXp = 0,
  onAddXp,
  onChangeTab,
  onResetTimer,
  showSystemNotification,
  setFiredNotification,
  notificationSettings,
}: TimelineViewProps) {
  // Navigation inside the Focus subtab
  const [subView, setSubView] = useState<"timer" | "timeline" | "atmosphere">("timer");
  const [showLevelGuide, setShowLevelGuide] = useState(false);
  const [isLaunchpadOpen, setIsLaunchpadOpen] = useState(() => localStorage.getItem("f5_launchpad_open") !== "false");
  
  const gradientStops = useMemo(() => {
    switch (themePreset) {
      case "forest":
        return {
          start: "#10b981",
          mid: "#34d399",
          end: "#059669"
        };
      case "crimson":
        return {
          start: "#e11d48",
          mid: "#f43f5e",
          end: "#9f1239"
        };
      case "honey":
        return {
          start: "#d97706",
          mid: "#f59e0b",
          end: "#b45309"
        };
      case "amoled":
        return {
          start: "#3b82f6",
          mid: "#6366f1",
          end: "#a855f7"
        };
      case "cosmic":
        return {
          start: "#8b5cf6",
          mid: "#d946ef",
          end: "#4c1d95"
        };
      case "cyberpunk":
        return {
          start: "#ec4899",
          mid: "#14b8a6",
          end: "#0f172a"
        };
      case "nordic":
        return {
          start: "#0284c7",
          mid: "#22d3ee",
          end: "#0f172a"
        };
      default: // classic-dark / steel
        return {
          start: "#f26419",
          mid: "#f34825",
          end: "#ff9f43"
        };
    }
  }, [themePreset]);

  const themeHexAccent = gradientStops.start;

  const themeTextAccent = useMemo(() => {
    switch (themePreset) {
      case "forest":
        return "text-[#10b981]";
      case "crimson":
        return "text-[#e11d48]";
      case "honey":
        return "text-[#d97706]";
      case "amoled":
        return "text-[#3b82f6] dark:text-[#6366f1]";
      case "cosmic":
        return "text-[#8b5cf6] dark:text-[#a78bfa]";
      case "cyberpunk":
        return "text-[#ec4899] dark:text-[#f472b6]";
      case "nordic":
        return "text-[#0284c7] dark:text-[#38bdf8]";
      default:
        return "text-[#f26419]";
    }
  }, [themePreset]);

  const themeBgAccent = useMemo(() => {
    switch (themePreset) {
      case "forest":
        return "bg-[#10b981] hover:bg-[#059669]";
      case "crimson":
        return "bg-[#e11d48] hover:bg-[#be123c]";
      case "honey":
        return "bg-[#d97706] hover:bg-[#b45309]";
      case "amoled":
        return "bg-[#3b82f6] hover:bg-[#2563eb] dark:bg-[#6366f1] dark:hover:bg-[#4f46e5]";
      case "cosmic":
        return "bg-[#8b5cf6] hover:bg-[#7c3aed] text-white";
      case "cyberpunk":
        return "bg-[#ec4899] hover:bg-[#db2777] text-white";
      case "nordic":
        return "bg-[#0284c7] hover:bg-[#0369a1] text-white";
      default:
        return "bg-[#f26419] hover:bg-[#df5214]";
    }
  }, [themePreset]);

  // ==================== FLASH5TUDY ADAPTIVE STUDY HABIT & STREAK CALCULATOR ====================
  const calculatedStreak = useMemo(() => {
    const uniqueDatesSet = new Set<string>();
    studyLogs.forEach(l => {
      if (l.durationMinutes > 0) {
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
      return 0;
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
  }, [studyLogs]);

  // ==================== TOTAL FOCUS SECONDS / MINUTES OF TODAY ====================
  const totalFocusMinutesToday = useMemo(() => {
    const todayStr = getLocalDateString();
    const logged = studyLogs
      .filter(l => l.date === todayStr)
      .reduce((acc, l) => acc + l.durationMinutes, 0);
    
    let liveMinutes = 0;
    if (isStudying) {
      if (timerType === "stopwatch" || timerType === "custom") {
        liveMinutes = activeSeconds / 60;
      } else if (timerType === "pomodoro" && pomoState === "focus") {
        const fullPeriodSecs = pomoFocusDuration * 60;
        liveMinutes = (fullPeriodSecs - pomoSecondsLeft) / 60;
      }
    }
    
    return logged + liveMinutes;
  }, [studyLogs, isStudying, timerType, activeSeconds, pomoState, pomoSecondsLeft, pomoFocusDuration]);

  // ==================== CIRCULAR WHEEL ARC COORDINATES GENERATOR ====================
  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  };

  const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    return [
      "M", start.x, start.y,
      "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
    ].join(" ");
  };

  const getSubjectColorHex = (colorClass: string) => {
    if (colorClass.includes("orange") || colorClass === "bg-[#f26419]" || colorClass.includes("accent")) return "#f26419";
    if (colorClass.includes("emerald") || colorClass.includes("green")) return "#10b981";
    if (colorClass.includes("blue")) return "#3b82f6";
    if (colorClass.includes("purple") || colorClass.includes("violet")) return "#a855f7";
    if (colorClass.includes("indigo")) return "#6366f1";
    if (colorClass.includes("rose") || colorClass.includes("pink") || colorClass.includes("red")) return "#f43f5e";
    if (colorClass.includes("teal") || colorClass.includes("cyan")) return "#14b8a6";
    return "#8b5cf6"; // default purple
  };

  // Convert logs to 24 hourly study blocks
  const hourlyStudiedSectors = useMemo(() => {
    type SectorInfo = { subjectId: string; name: string; color: string; duration: number };
    const segments = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      studies: [] as SectorInfo[]
    }));

    const getLocalFormattedDate = (d: Date = new Date()): string => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    const todayStr = getLocalFormattedDate();
    const todaysLogs = studyLogs.filter(log => log.date === todayStr);

    todaysLogs.forEach(log => {
      if (!log.timestamp) return;
      try {
        const endTime = new Date(log.timestamp);
        const startTime = new Date(endTime.getTime() - log.durationMinutes * 60 * 1000);
        
        let pointer = new Date(startTime.getTime());
        while (pointer.getTime() < endTime.getTime()) {
          const hr = pointer.getHours();
          const subjectOfLog = subjects.find(s => s.id === log.subjectId);
          const colorBg = subjectOfLog?.color || "bg-indigo-500";
          const subId = log.subjectId || "unknown";
          const name = log.subjectName || "Focus Study";
          
          let existing = segments[hr].studies.find(s => s.subjectId === subId);
          if (!existing) {
            existing = { subjectId: subId, name, color: colorBg, duration: 0 };
            segments[hr].studies.push(existing);
          }
          existing.duration += 1;
          
          pointer.setTime(pointer.getTime() + 60 * 1000);
        }
      } catch (e) {}
    });

    if (isStudying && activeSubjectId && activeSeconds > 0) {
      try {
        const now = new Date();
        const start = new Date(now.getTime() - activeSeconds * 1000);
        const activeSubject = subjects.find(s => s.id === activeSubjectId);
        const colorBg = activeSubject?.color || "bg-indigo-500";
        const name = activeSubject?.name || "Focus Subject";
        
        let pointer = new Date(start.getTime());
        while (pointer.getTime() < now.getTime()) {
          const hr = pointer.getHours();
          let existing = segments[hr].studies.find(s => s.subjectId === activeSubjectId);
          if (!existing) {
            existing = { subjectId: activeSubjectId, name, color: colorBg, duration: 0 };
            segments[hr].studies.push(existing);
          }
          existing.duration += 1;
          pointer.setTime(pointer.getTime() + 60 * 1000);
        }
      } catch (e) {}
    }

    return segments.map(seg => {
      if (seg.studies.length === 0) return { hour: seg.hour, color: null, dominantName: null, totalMinutes: 0 };
      const sorted = [...seg.studies].sort((a, b) => b.duration - a.duration);
      const totalMinutes = seg.studies.reduce((sum, s) => sum + s.duration, 0);
      return {
        hour: seg.hour,
        color: sorted[0].color,
        dominantName: sorted[0].name,
        totalMinutes: Math.min(60, totalMinutes)
      };
    });
  }, [studyLogs, isStudying, activeSubjectId, activeSeconds, subjects]);

  const [showSubjectsModal, setShowSubjectsModal] = useState(false);
  const [isEditingSubjectsList, setIsEditingSubjectsList] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectColor, setNewSubjectColor] = useState("bg-emerald-500");
  const [allDayEvents, setAllDayEvents] = useState<string[]>(["Google I/O event", "Diary 📓 Fill"]);

  // Audio ambient synthesizers states
  const [ambientSound, setAmbientSound] = useState<"none" | "brown" | "rain" | "waves" | "fire" | "binaural">("none");
  const [volume, setVolume] = useState(0.18);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  
  // Premium auto-dismissing inline notification state
  const [toast, setToast] = useState<{ message: string; type: "success" | "warning" | "info" } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Focus enhancers configurations persisted locally
  const [focusGuard, setFocusGuard] = useState(() => {
    return localStorage.getItem("study_focus_guard") === "true";
  });
  const [showBreathingCoach, setShowBreathingCoach] = useState(() => {
    return localStorage.getItem("study_breathing_coach") === "true";
  });
  const [breathState, setBreathState] = useState<"inhale" | "hold" | "exhale">("inhale");

  useEffect(() => {
    localStorage.setItem("study_focus_guard", String(focusGuard));
  }, [focusGuard]);

  useEffect(() => {
    localStorage.setItem("study_breathing_coach", String(showBreathingCoach));
  }, [showBreathingCoach]);

  // Breathing pacer loop (4s inflate, 4s hold, 4s deflate)
  useEffect(() => {
    if (!isStudying || !showBreathingCoach) return;
    const interval = setInterval(() => {
      setBreathState(prev => {
        if (prev === "inhale") return "hold";
        if (prev === "hold") return "exhale";
        return "inhale";
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [isStudying, showBreathingCoach]);

  // Focus guard tab auto-pause listener (disabled completely)
  useEffect(() => {
    // Tab switching auto-pause has been disabled to allow undisturbed background tracking.
  }, []);

  // ==================== NEW CUSTOM TIMER STUDY STATES ====================
  const [customTargetMinutes, setCustomTargetMinutes] = useState<number>(() => {
    const cached = localStorage.getItem("study_custom_target_minutes");
    return cached ? parseInt(cached, 10) : 45; // default to 45 mins
  });
  const [customTargetMinutesInput, setCustomTargetMinutesInput] = useState<string>("45");

  const [sessionGoalText, setSessionGoalText] = useState<string>(() => {
    return localStorage.getItem("study_session_goal_text") || "";
  });

  interface SessionTodo {
    id: string;
    text: string;
    isDone: boolean;
  }
  const [sessionTodos, setSessionTodos] = useState<SessionTodo[]>(() => {
    const cached = localStorage.getItem("study_session_todos");
    return cached ? JSON.parse(cached) : [
      { id: "s-1", text: "Create draft layout highlights", isDone: false },
      { id: "s-2", text: "Review active memory flashcards", isDone: false }
    ];
  });
  const [newTodoText, setNewTodoText] = useState<string>("");

  // Reflection and celebration states
  const [showReflectionModal, setShowReflectionModal] = useState<boolean>(false);
  const [reflectionRating, setReflectionRating] = useState<number>(5);
  const [reflectionNotes, setReflectionNotes] = useState<string>("");
  const [isTargetCompleted, setIsTargetCompleted] = useState<boolean>(false);
  const [sessionSavedMinutes, setSessionSavedMinutes] = useState<number>(0);
  const [reflectionErrorText, setReflectionErrorText] = useState<string | null>(null);
  const [timerAlertMessage, setTimerAlertMessage] = useState<string | null>(null);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem("study_custom_target_minutes", String(customTargetMinutes));
  }, [customTargetMinutes]);

  useEffect(() => {
    localStorage.setItem("study_session_goal_text", sessionGoalText);
  }, [sessionGoalText]);

  useEffect(() => {
    localStorage.setItem("study_session_todos", JSON.stringify(sessionTodos));
  }, [sessionTodos]);

  const handleAddTodo = () => {
    if (!newTodoText.trim()) return;
    const newTodo: SessionTodo = {
      id: "s-" + Date.now(),
      text: newTodoText,
      isDone: false
    };
    setSessionTodos(prev => [...prev, newTodo]);
    setNewTodoText("");
  };

  const handleToggleTodo = (id: string) => {
    setSessionTodos(prev => prev.map(t => t.id === id ? { ...t, isDone: !t.isDone } : t));
  };

  const handleDeleteTodo = (id: string) => {
    setSessionTodos(prev => prev.filter(t => t.id !== id));
  };

  // Trigger custom countdown target complete when activeSeconds >= customTargetMinutes * 60
  useEffect(() => {
    if (isStudying && timerType === "custom" && activeSeconds >= customTargetMinutes * 60) {
      // Pause studying instantly so it doesn't double-trigger
      setIsStudying(false);
      setIsTargetCompleted(true);
      setSessionSavedMinutes(customTargetMinutes);
      
      const finishedGoalText = sessionGoalText || 'Study Session';
      setReflectionNotes(sessionGoalText ? `Completed custom quest: ${sessionGoalText}` : "Achieved custom study target session! 🚀");
      setReflectionErrorText(null);
      
      const currentActiveSubjectId = activeSubjectId;
      const targetMins = customTargetMinutes;

      // Save focus minutes to database and states IMMEDIATELY (no risk of loss)
      if (currentActiveSubjectId) {
        onAddStudyMinutes(currentActiveSubjectId, targetMins).then(() => {
          // Immediately pause and reset the timer cleanly on success
          if (onResetTimer) {
            onResetTimer();
          } else {
            setActiveSeconds(0);
          }
        }).catch(e => {
          setReflectionErrorText(e instanceof Error ? e.message : "Cap limit warnings or network sync delayed.");
          // Reset as fallback anyway to prevent stuck timer
          if (onResetTimer) {
            onResetTimer();
          } else {
            setActiveSeconds(0);
          }
        });
      } else {
        if (onResetTimer) {
          onResetTimer();
        } else {
          setActiveSeconds(0);
        }
      }

      // Automatically award milestone XP without popup disruption
      if (onAddXp) {
        onAddXp(`Completed Target Countdown: "${finishedGoalText}" 🏆`, 100);
      }

      // Clear the custom states safely
      setSessionTodos([]);
      setSessionGoalText("");

      // Play the chime and trigger notifications
      try {
        if (!notificationSettings || notificationSettings.enableSoundEffects) {
          playChime("success");
        }
      } catch (e) {
        console.warn("Chime synth error: ", e);
      }

      const alertTitle = `🏆 Target Completed!`;
      const alertBody = `You successfully completed your custom countdown of ${targetMins} minutes for "${finishedGoalText}"! Outstanding persistence!`;
      
      if (setFiredNotification) {
        setFiredNotification(`🎯 ${alertTitle} ${alertBody}`);
      }
      if (showSystemNotification && (!notificationSettings || notificationSettings.notifyOnTimerAlerts)) {
        showSystemNotification(alertTitle, alertBody);
      }
    }
  }, [isStudying, timerType, activeSeconds, customTargetMinutes, sessionGoalText, activeSubjectId, onAddStudyMinutes, onResetTimer, setActiveSeconds, setIsStudying, onAddXp, showSystemNotification, setFiredNotification, notificationSettings]);

  const getActiveSessionBadge = (seconds: number) => {
    if (seconds < 120) return { title: "Focus Initiated", badge: "🌱 Seedling", desc: "Just started. Shielding thoughts from distractions.", color: "text-[#f26419] bg-[#f26419]/5 border-[#f26419]/20" };
    if (seconds < 600) return { title: "Steady Concentration Flows", badge: "🔥 Spark", desc: "Warmup phase complete. Cognitive gears aligned.", color: "text-amber-600 bg-amber-500/5 border-amber-500/20" };
    if (seconds < 1500) return { title: "Synaptic Deep Study Burst", badge: "🎯 Sharp Scholar", desc: "High-density learning. Reaching long term memory levels.", color: "text-emerald-600 bg-emerald-500/5 border-emerald-500/20" };
    if (seconds < 3000) return { title: "Unbroken Hyperfocus State", badge: "💡 Zen Titan", desc: "Incredible mastery. Mental clarity is absolute.", color: "text-indigo-650 bg-indigo-500/5 dark:text-indigo-400 border-indigo-500/20" };
    return { title: "Ascended Ultimate Flow State", badge: "🌌 Cosmic Master", desc: "Shattered limitations. Elite level of neural efficiency.", color: "text-rose-600 bg-rose-500/5 dark:text-rose-400 border-rose-500/20" };
  };

  // Sound generator Web Audio nodes refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const noiseSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const filterNodeRef = useRef<BiquadFilterNode | null>(null);

  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Clear stale activeSubjectId if it does not exist in the loaded subject lists
  useEffect(() => {
    if (activeSubjectId && subjects.length > 0) {
      const exists = subjects.some(s => s.id === activeSubjectId);
      if (!exists) {
        setActiveSubjectId("");
      }
    }
  }, [subjects, activeSubjectId, setActiveSubjectId]);

  // Current Date display label
  const [currentDateString, setCurrentDateString] = useState("");
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const formatOptions: Intl.DateTimeFormatOptions = { weekday: "short", month: "numeric", day: "numeric" };
      setCurrentDateString(now.toLocaleDateString("en-US", formatOptions));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Compute live current time pixel positioning offset
  const [currentTimeOffset, setCurrentTimeOffset] = useState(0); 
  const [currentTimeLabel, setCurrentTimeLabel] = useState("");
  const HOUR_HEIGHT = 60; 

  useEffect(() => {
    const calculateOffset = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const totalMinutes = hours * 60 + minutes;
      setCurrentTimeOffset(totalMinutes * (HOUR_HEIGHT / 60));
      setCurrentTimeLabel(`${now.getHours() % 12 || 12}:${String(now.getMinutes()).padStart(2, "0")}`);
    };

    calculateOffset();
    const interval = setInterval(calculateOffset, 10000);
    return () => clearInterval(interval);
  }, []);

  // Scroll to current time in timeline schedule mode
  useEffect(() => {
    if (subView === "timeline" && timelineContainerRef.current) {
      const container = timelineContainerRef.current;
      const targetScroll = Math.max(0, currentTimeOffset - 200);
      container.scrollTop = targetScroll;
    }
  }, [currentTimeOffset, subView]);

  // Handle live acoustic sound synthesis based on state
  useEffect(() => {
    stopAmbientSynth();
    if (ambientSound !== "none" && isStudying) {
      startAmbientSynth(ambientSound);
    }
    return () => {
      stopAmbientSynth();
    };
  }, [ambientSound, isStudying]);

  // Update master noise volume slider levels
  useEffect(() => {
    if (gainNodeRef.current && audioCtxRef.current) {
      gainNodeRef.current.gain.setValueAtTime(volume, audioCtxRef.current.currentTime);
    }
  }, [volume]);

  const startAmbientSynth = (type: "brown" | "rain" | "waves" | "fire" | "binaural") => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const bufferSize = 2 * ctx.sampleRate;
      const channels = type === "binaural" ? 2 : 1;
      const noiseBuffer = ctx.createBuffer(channels, bufferSize, ctx.sampleRate);

      if (type === "binaural") {
        const left = noiseBuffer.getChannelData(0);
        const right = noiseBuffer.getChannelData(1);
        const sampleRate = ctx.sampleRate;
        const freqL = 180; // carrier frequency (Left Ear)
        const freqR = 220; // Left + 40Hz (Right Ear) creates perfect 40Hz Gamma wave entrainment!
        for (let i = 0; i < bufferSize; i++) {
          const t = i / sampleRate;
          left[i] = Math.sin(2 * Math.PI * freqL * t) * 0.45;
          right[i] = Math.sin(2 * Math.PI * freqR * t) * 0.45;
        }
      } else {
        const output = noiseBuffer.getChannelData(0);
        
        if (type === "brown") {
          // Deep brownian focus hum
          let lastOut = 0.0;
          for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            output[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = output[i];
            output[i] *= 3.5; 
          }
        } else if (type === "waves") {
          // Beach ocean swell
          for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
          }
        } else if (type === "fire") {
          // Cozy wood fireplace: low brown rumble + transient crackling clicks
          let lastOut = 0.0;
          for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            let val = (lastOut + (0.018 * white)) / 1.018;
            lastOut = val;
            val *= 2.8;

            // Wood pops
            if (Math.random() < 0.00015) {
              val += (Math.random() > 0.55 ? 0.75 : -0.75);
            }
            output[i] = val;
          }
        } else {
          // Crackling cozy rain clicks
          for (let i = 0; i < bufferSize; i++) {
            let val = Math.random() * 2 - 1;
            if (Math.random() < 0.1) {
              val += (Math.random() * 2 - 1) * 0.5;
            }
            output[i] = val * 0.35;
          }
        }
      }

      const source = ctx.createBufferSource();
      source.buffer = noiseBuffer;
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      
      if (type === "brown") {
        filter.frequency.setValueAtTime(320, ctx.currentTime);
      } else if (type === "waves") {
        filter.frequency.setValueAtTime(400, ctx.currentTime);
        modulateFilterWaves(filter);
      } else if (type === "fire") {
        filter.frequency.setValueAtTime(450, ctx.currentTime);
      } else if (type === "binaural") {
        // Binaural focus beats should pass through unfiltered, but keep gentle warmth
        filter.frequency.setValueAtTime(600, ctx.currentTime);
      } else {
        filter.frequency.setValueAtTime(800, ctx.currentTime);
      }

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume, ctx.currentTime);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      source.start();

      noiseSourceRef.current = source;
      gainNodeRef.current = gain;
      filterNodeRef.current = filter;
    } catch (e) {
      console.error("Local web audio ambient node failed to instantiate:", e);
    }
  };

  const modulateFilterWaves = (filter: BiquadFilterNode) => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    
    let isUp = true;
    const interval = setInterval(() => {
      if (noiseSourceRef.current === null) {
        clearInterval(interval);
        return;
      }
      try {
        const nextFreq = isUp ? 620 : 220;
        filter.frequency.exponentialRampToValueAtTime(nextFreq, ctx.currentTime + 2.8);
        isUp = !isUp;
      } catch (e) {
        clearInterval(interval);
      }
    }, 3000);
  };

  const stopAmbientSynth = () => {
    try {
      if (noiseSourceRef.current) {
        noiseSourceRef.current.stop();
        noiseSourceRef.current.disconnect();
        noiseSourceRef.current = null;
      }
      if (gainNodeRef.current) {
        gainNodeRef.current.disconnect();
        gainNodeRef.current = null;
      }
      if (filterNodeRef.current) {
        filterNodeRef.current.disconnect();
        filterNodeRef.current = null;
      }
    } catch (err) {}
  };

  // Convert seconds ticker to formatted layout "00:00:00"
  const formatTickingTime = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return [
      String(hrs).padStart(2, "0"),
      String(mins).padStart(2, "0"),
      String(secs).padStart(2, "0")
    ].join(":");
  };

  const formatSubjectMinutes = (totalMins: number) => {
    return formatStudyTimeExact(totalMins);
  };

  const handleStartStudy = (subjectId: string) => {
    setActiveSubjectId(subjectId);
    const chosen = subjects.find(s => s.id === subjectId);
    if (chosen) {
      setToast({
        message: `Activated Topic: "${chosen.name}" 📂 Tap the play button below to begin focus session!`,
        type: "success"
      });
    }
  };

  const handleStopAndSave = async () => {
    const secondsToSave = timerType === "pomodoro"
      ? (pomoState === "focus" ? Math.max(0, pomoFocusDuration * 60 - pomoSecondsLeft) : 0)
      : activeSeconds;

    if (secondsToSave > 0 && activeSubjectId) {
      setReflectionErrorText(null);
      
      // Precise hours, minutes, seconds decimal value (no more 15-second minimum limit!)
      const preciseMinutes = secondsToSave / 60;
      const currentActiveSubjectId = activeSubjectId;

      // Save focus minutes to database and states IMMEDIATELY (no risk of loss)
      try {
        await onAddStudyMinutes(currentActiveSubjectId, preciseMinutes);
        setShowDiscardConfirm(false);

        // Reset the active timer after saving succeeds
        if (onResetTimer) {
          onResetTimer();
        } else {
          setActiveSeconds(0);
          setIsStudying(false);
        }
        
        // Reset Pomodoro timer left if applicable
        if (timerType === "pomodoro" && setPomoSecondsLeft) {
          setPomoSecondsLeft(pomoFocusDuration * 60);
        }

        // Prep the reflection details
        setSessionSavedMinutes(preciseMinutes);
        const hitTarget = timerType === "custom" ? preciseMinutes >= customTargetMinutes : true;
        setIsTargetCompleted(hitTarget);
        setReflectionErrorText(null); // Clear errors since we succeeded!

        // Automatically award milestone XP without popup disruption
        if (timerType === "custom") {
          if (hitTarget && onAddXp) {
            onAddXp(`Completed Target Countdown: "${sessionGoalText || 'Study Goal'}" 🏆`, 100);
          } else if (onAddXp) {
            onAddXp(`Custom study effort completed successfully ☕`, 20);
          }
        }

        // Clear custom states cleanly
        setSessionTodos([]);
        setSessionGoalText("");

        // Try playing triumph sound
        try {
          const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2019/2019-2019.wav");
          audio.volume = 0.35;
          audio.play().catch(() => {});
        } catch (e) {}

      } catch (e) {
        // Ensure active timer is still reset even if backend save rejects
        if (onResetTimer) {
          onResetTimer();
        } else {
          setActiveSeconds(0);
          setIsStudying(false);
        }
        if (timerType === "pomodoro" && setPomoSecondsLeft) {
          setPomoSecondsLeft(pomoFocusDuration * 60);
        }

        // Fallback warning logging without popup disruption
        setSessionSavedMinutes(preciseMinutes);
        setIsTargetCompleted(false);
        setReflectionNotes("Daily focus limit warning");
        setReflectionErrorText(e instanceof Error ? e.message : "Network sync delayed, but session is saved offline.");
      }
    }
  };

  // Global Keyboard Shortcuts for peak focus flow productivity UX
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      // Ignore shortcuts if user is typing in interactive form fields
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          (activeEl as HTMLElement).isContentEditable)
      ) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        if (subjects.length > 0) {
          const verifiedSubject = subjects.find(s => s.id === activeSubjectId) || subjects[0];
          if (verifiedSubject) {
            const currentStudyingState = !isStudying;
            if (!currentStudyingState) {
              handleStopAndSave();
            } else {
              setIsStudying(true);
              setToast({
                message: `Study session started for: "${verifiedSubject.name}" ⚡ (Space)`,
                type: "info"
              });
            }
          }
        }
      } else if (e.code === "KeyM") {
        e.preventDefault();
        const sounds: ("none" | "brown" | "rain" | "waves" | "fire" | "binaural")[] = [
          "none", "brown", "rain", "waves", "fire", "binaural"
        ];
        const currentIndex = sounds.indexOf(ambientSound);
        const nextIndex = (currentIndex + 1) % sounds.length;
        const nextSound = sounds[nextIndex];
        setAmbientSound(nextSound);
        setToast({
          message: nextSound === "none" ? "Acoustic ambient soundscapes muted 🎧 (M)" : `Acoustics changed to ${nextSound} 🎧 (M)`,
          type: "info"
        });
      } else if (e.code === "KeyB") {
        e.preventDefault();
        const nextCoach = !showBreathingCoach;
        setShowBreathingCoach(nextCoach);
        setToast({
          message: nextCoach ? "Breathing Coach Active 🧘 (B)" : "Breathing Coach Disabled (B)",
          type: "info"
        });
      } else if (e.code === "KeyT") {
        e.preventDefault();
        const views: ("timer" | "timeline" | "atmosphere")[] = ["timer", "timeline", "atmosphere"];
        const nextIdx = (views.indexOf(subView) + 1) % views.length;
        setSubView(views[nextIdx]);
        setToast({
          message: `Switched perspective to ${views[nextIdx].toUpperCase()} 🎛️ (T)`,
          type: "info"
        });
      } else if (e.code === "Escape" && isStudying) {
        e.preventDefault();
        handleStopAndSave();
        setToast({
          message: "Session finalized and saved! 🎉 (Esc)",
          type: "info"
        });
      }
    };

    window.addEventListener("keydown", handleGlobalShortcuts);
    return () => window.removeEventListener("keydown", handleGlobalShortcuts);
  }, [subjects, activeSubjectId, isStudying, ambientSound, showBreathingCoach, subView, handleStopAndSave]);

  const handleSubmitReflection = async () => {
    if (sessionSavedMinutes > 0 && activeSubjectId) {
      setReflectionErrorText(null);
      try {
        // Extra milestone reward XP for completing custom targets
        if (timerType === "custom") {
          if (isTargetCompleted && onAddXp) {
            onAddXp(`Completed Target Countdown: "${sessionGoalText || 'Study Goal'}" 🏆`, 100);
          } else if (onAddXp) {
            onAddXp(`Custom study effort completed successfully ☕`, 20);
          }
        }
        
        // Clear the custom states safely
        setSessionTodos([]);
        setSessionGoalText("");
        setShowReflectionModal(false);
        
        // Try playing triumph sound
        try {
          const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2019/2019-2019.wav");
          audio.volume = 0.35;
          audio.play().catch(() => {});
        } catch (e) {}
      } catch (err) {
        setReflectionErrorText(err instanceof Error ? err.message : "Failed to record study reflection.");
      }
    }
  };

  const handleDiscardProgress = () => {
    if (!showDiscardConfirm) {
      setShowDiscardConfirm(true);
      setTimeout(() => setShowDiscardConfirm(false), 5000);
      return;
    }
    // Penalize if studied for at least 15 seconds
    if (activeSeconds >= 15 && onAddXp) {
      onAddXp("Abandoned stopwatch study session ❌", -25);
    }
    if (onResetTimer) {
      onResetTimer();
    } else {
      setActiveSeconds(0);
      setIsStudying(false);
    }
    setShowDiscardConfirm(false);
  };

  // Pomodoro custom helper controls & adjusters
  const formatPomoTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const handleSkipPomo = () => {
    if (isStudying && pomoState === "focus") {
      const elapsedSeconds = (pomoFocusDuration * 60) - pomoSecondsLeft;
      if (elapsedSeconds >= 15 && onAddXp) {
        onAddXp("Skipped active focus sprint ⏱️", -30);
      }
    }
    setIsStudying(false);
    if (pomoState === "focus") {
      if (pomoRound >= 4) {
        setPomoState("longBreak");
        setPomoSecondsLeft(pomoLongBreakDuration * 60);
        setPomoRound(1);
      } else {
        setPomoState("shortBreak");
        setPomoSecondsLeft(pomoShortBreakDuration * 60);
        setPomoRound(pomoRound + 1);
      }
    } else {
      setPomoState("focus");
      setPomoSecondsLeft(pomoFocusDuration * 60);
    }
  };

  const handleResetPomo = () => {
    if (isStudying && pomoState === "focus") {
      const elapsedSeconds = (pomoFocusDuration * 60) - pomoSecondsLeft;
      if (elapsedSeconds >= 15 && onAddXp) {
        onAddXp("Aborted Pomodoro focus block early ⏱️", -40);
      }
    }
    setIsStudying(false);
    setPomoSecondsLeft(pomoFocusDuration * 60);
    setPomoState("focus");
    setPomoRound(1);
  };

  const adjustFocusDuration = (amount: number) => {
    const nextVal = Math.max(5, pomoFocusDuration + amount);
    setPomoFocusDuration(nextVal);
    if (pomoState === "focus" && !isStudying) {
      setPomoSecondsLeft(nextVal * 60);
    }
  };

  const adjustShortBreakDuration = (amount: number) => {
    const nextVal = Math.max(1, pomoShortBreakDuration + amount);
    setPomoShortBreakDuration(nextVal);
    if (pomoState === "shortBreak" && !isStudying) {
      setPomoSecondsLeft(nextVal * 60);
    }
  };

  const adjustLongBreakDuration = (amount: number) => {
    const nextVal = Math.max(5, pomoLongBreakDuration + amount);
    setPomoLongBreakDuration(nextVal);
    if (pomoState === "longBreak" && !isStudying) {
      setPomoSecondsLeft(nextVal * 60);
    }
  };

  const adjustSubjectGoal = (amount: number) => {
    if (!activeSubject) return;
    const currentGoal = activeSubject.goalMinutes || 120;
    const nextGoal = Math.max(15, currentGoal + amount);
    onUpdateSubjectGoal(activeSubject.id, nextGoal);
  };

  const colorOptions = [
    { bg: "bg-emerald-500", fromTo: "from-emerald-500 to-teal-600" },
    { bg: "bg-blue-500", fromTo: "from-blue-500 to-indigo-600" },
    { bg: "bg-orange-500", fromTo: "from-orange-500 to-amber-600" },
    { bg: "bg-purple-500", fromTo: "from-purple-500 to-pink-600" },
    { bg: "bg-pink-500", fromTo: "from-pink-500 to-rose-600" },
    { bg: "bg-violet-600", fromTo: "from-violet-600 to-indigo-750" },
    { bg: "bg-teal-500", fromTo: "from-teal-500 to-emerald-600" },
    { bg: "bg-red-500", fromTo: "from-red-500 to-rose-600" },
  ];

  const handleCreateSubject = async () => {
    if (!newSubjectName.trim()) return;
    const matchedColor = colorOptions.find(c => c.bg === newSubjectColor) || colorOptions[0];
    await onAddSubject(newSubjectName, 120, matchedColor.fromTo);
    setNewSubjectName("");
    setIsEditingSubjectsList(false);
  };

  const handleDeleteSubject = async (id: string) => {
    await onRemoveSubject(id);
  };

  const hoursArray = Array.from({ length: 24 }, (_, i) => {
    const period = i >= 12 ? "PM" : "AM";
    const hr = i % 12 || 12;
    return { hourVal: i, label: `${hr} ${period}` };
  });

  const activeSubject = subjects.find(s => s.id === activeSubjectId);

  // Percent calculation for the aesthetic ticking progress ring
  const getProgressRingPercent = () => {
    if (!activeSubject) return 0;
    const activeGoalSeconds = activeSubject.goalMinutes * 60 || 3600;
    const liveSecondsToday = (activeSubject.totalMinutes * 60) + (isStudying ? activeSeconds : 0);
    return Math.min(100, Math.round((liveSecondsToday / activeGoalSeconds) * 100));
  };

  return (
    <div id="f5-active-focus-pane" className="relative flex flex-col h-full rounded-3xl overflow-hidden border border-slate-200/50 dark:border-slate-800 bg-white/70 dark:bg-[#0c0d10]/95 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all duration-350">
      {/* Dynamic Toast / Premium Study notification banner */}
      {toast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-900/90 dark:bg-slate-50/95 text-white dark:text-slate-900 border border-slate-700/30 dark:border-slate-200/50 shadow-2xl backdrop-blur-md transition-all duration-300">
          {toast.type === "success" && <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />}
          {toast.type === "warning" && <div className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />}
          {toast.type === "info" && <div className="h-2 w-2 rounded-full bg-indigo-500 animate-ping" />}
          <span className="text-xs font-bold tracking-tight">{toast.message}</span>
        </div>
      )}
      {/* Dynamic layout tabs control bar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center justify-between px-6 pt-5 pb-3.5 border-b border-slate-100 dark:border-slate-900/60">
        <div className="flex items-center gap-1 font-sans bg-slate-100/80 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-200/30 dark:border-slate-900 flex-wrap w-full sm:w-auto justify-center sm:justify-start">
          <button 
            onClick={() => setSubView("timer")}
            className={`px-4.5 py-2 rounded-xl text-xs font-black tracking-tight transition-all duration-300 cursor-pointer flex items-center gap-2 ${
              subView === "timer" 
                ? "bg-white dark:bg-[#15161d] text-[#f26419] shadow-sm font-black border border-slate-200/60 dark:border-slate-800 scale-[1.02]" 
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Clock className="w-3.5 h-3.5" /> Study Timer
          </button>
          <button 
            onClick={() => setSubView("timeline")}
            className={`px-4.5 py-2 rounded-xl text-xs font-black tracking-tight transition-all duration-300 cursor-pointer flex items-center gap-2 ${
              subView === "timeline" 
                ? "bg-white dark:bg-[#15161d] text-[#f26419] shadow-sm font-black border border-slate-200/60 dark:border-slate-800 scale-[1.02]" 
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" /> Hour Timeline
          </button>
          <button 
            onClick={() => setSubView("atmosphere")}
            className={`px-4.5 py-2 rounded-xl text-xs font-black tracking-tight transition-all duration-300 cursor-pointer flex items-center gap-2 ${
              subView === "atmosphere" 
                ? "bg-white dark:bg-[#15161d] text-indigo-500 shadow-sm font-black border border-slate-200/60 dark:border-slate-800 scale-[1.02]" 
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Heart className="w-3.5 h-3.5 text-indigo-500" /> Zen Space 🧘
          </button>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap w-full lg:w-auto justify-center lg:justify-end">
          <button 
            type="button"
            onClick={() => setShowLevelGuide(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 dark:border-amber-500/30 rounded-xl transition-all duration-300 text-[10px] font-mono font-black text-amber-600 dark:text-amber-400 cursor-pointer hover-lift shadow-sm shadow-amber-500/5 active:scale-95"
            title="View Level Milestones & Unlockable Rewards Guide"
          >
            <span className="flex items-center gap-1">🏆 Lvl {calculateStudentLevel(userXp).level}</span>
            <span className="opacity-30">|</span>
            <span>{calculateStudentLevel(userXp).xpInCurrentLevel}/{calculateStudentLevel(userXp).xpSegmentTotal} XP</span>
            <Info className="w-3.5 h-3.5 ml-0.5 text-amber-500" />
          </button>

          <span className="text-[10px] font-mono font-black uppercase text-slate-500 bg-slate-100/80 dark:bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-200/20 dark:border-slate-900">
            {currentDateString || "Today"}
          </span>
          <button 
            type="button" 
            onClick={onToggleSidebar} 
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 dark:border-indigo-500/35 rounded-xl transition-all duration-300 text-[10px] font-mono font-black text-indigo-600 dark:text-indigo-400 cursor-pointer hover-lift shadow-sm shadow-indigo-500/5 active:scale-95" 
            title="Open Companion Tools: Music, block filters, custom books & reminders"
          >
            <Grid className="w-3.5 h-3.5 text-indigo-500 stroke-[2.5]" />
            <span>More Utilities</span>
          </button>
        </div>
      </div>

      {/* ==================== FLASH5TUDY STREAK & FOCUS OVERVIEW DASHBOARD ROW ==================== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3.5 mx-3 sm:mx-6 mt-3 sm:mt-5 antialiased">
        
        {/* Total studied minutes of today */}
        <div className="p-3 sm:p-4.5 rounded-2xl sm:rounded-3xl bg-slate-50/50 dark:bg-[#0c0d12]/50 border border-slate-150/50 dark:border-slate-900 shadow-sm hover:border-[#f26419]/20 transition-all duration-300 flex items-center gap-2 sm:gap-3">
          <div className="p-2 sm:p-2.5 rounded-2xl bg-[#f26419]/10 text-[#f26419] flex items-center justify-center border border-orange-500/10 shrink-0">
            <Flame className="w-4 sm:w-4.5 h-4 sm:h-4.5 animate-bounce" style={{ animationDuration: "2.5s" }} />
          </div>
          <div className="min-w-0 text-left">
            <span className="text-[7.5px] sm:text-[8px] font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500 font-extrabold block">Daily Focus Span</span>
            <span className="text-xs sm:text-sm md:text-base font-black text-slate-800 dark:text-neutral-100 font-mono flex items-baseline gap-0.5 truncate">
              {formatStudyTimeExact(totalFocusMinutesToday)}
            </span>
          </div>
        </div>

        {/* Continuous study daily streak counter */}
        <div className="p-3 sm:p-4.5 rounded-2xl sm:rounded-3xl bg-slate-50/50 dark:bg-[#0c0d12]/50 border border-slate-150/50 dark:border-slate-900 shadow-sm hover:border-amber-500/20 transition-all duration-300 flex items-center gap-2 sm:gap-3">
          <div className="p-2 sm:p-2.5 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/10 shrink-0">
            <Award className="w-4 sm:w-4.5 h-4 sm:h-4.5 text-amber-400" />
          </div>
          <div className="min-w-0 text-left">
            <span className="text-[7.5px] sm:text-[8px] font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500 font-extrabold block">Dedication Cycle</span>
            <span className="text-xs sm:text-sm md:text-base font-black text-slate-800 dark:text-neutral-100 font-mono flex items-baseline gap-0.5 truncate">
              {calculatedStreak} <span className="text-[9px] sm:text-[10px] font-sans font-bold text-slate-400">days</span>
            </span>
          </div>
        </div>

        {/* Live level XP Boost tier */}
        <div className="p-3 sm:p-4.5 rounded-2xl sm:rounded-3xl bg-slate-50/50 dark:bg-[#0c0d12]/50 border border-slate-150/50 dark:border-slate-900 shadow-sm hover:border-indigo-500/20 transition-all duration-300 flex items-center gap-2 sm:gap-3">
          <div className="p-2 sm:p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center border border-indigo-500/10 shrink-0">
            <Sparkles className="w-4 sm:w-4.5 h-4 sm:h-4.5 text-indigo-400" />
          </div>
          <div className="min-w-0 text-left">
            <span className="text-[7.5px] sm:text-[8px] font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500 font-extrabold block">Catalyst Amplify</span>
            <span className="text-[10.5px] sm:text-xs md:text-[12px] font-black text-[#6366f1] dark:text-indigo-400 uppercase tracking-tight block truncate mt-0.5">
              {calculateStudentLevel(userXp).level < 5 ? "1.0x Base Scale" : "1.5x Intellect 🎉"}
            </span>
          </div>
        </div>

        {/* Focus task summary checklist tracker */}
        <div className="p-3 sm:p-4.5 rounded-2xl sm:rounded-3xl bg-slate-50/50 dark:bg-[#0c0d12]/50 border border-slate-150/50 dark:border-slate-900 shadow-sm hover:border-emerald-500/20 transition-all duration-300 flex items-center gap-2 sm:gap-3">
          <div className="p-2 sm:p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/10 shrink-0">
            <Target className="w-4 sm:w-4.5 h-4 sm:h-4.5 text-emerald-400" />
          </div>
          <div className="min-w-0 text-left">
            <span className="text-[7.5px] sm:text-[8px] font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500 font-extrabold block">Scholastic Quests</span>
            <span className="text-xs sm:text-sm md:text-base font-black text-emerald-600 dark:text-emerald-400 font-mono block truncate">
              {sessionTodos.filter(t => t.isDone).length}/{sessionTodos.length} done
            </span>
          </div>
        </div>
      </div>

      {(subView === "timer" || subView === "atmosphere") ? (
        /* ==================== SCREEN A: PREMIUM STUDY CHROMOPHORE TIMER & POMODORO ==================== */
        <div className="flex-1 p-3.5 sm:p-6 md:p-8 space-y-4 sm:space-y-6 flex flex-col justify-between overflow-y-auto no-scrollbar relative">
          
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes equalizerPulse {
              0% { height: 12%; opacity: 0.4; }
              100% { height: 100%; opacity: 1; }
            }
            @keyframes flowRipple {
              0% { transform: scale(0.95); opacity: 0.5; }
              100% { transform: scale(1.15); opacity: 0; }
            }
            .progress-glow {
              filter: drop-shadow(0 0 10px rgba(242, 100, 25, 0.4));
            }
            .dark .progress-glow {
              filter: drop-shadow(0 0 16px rgba(242, 100, 25, 0.6));
            }
            .interactive-card {
              transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
            }
            .interactive-card:hover {
              transform: translateY(-2px);
              box-shadow: 0 12px 20px -8px rgba(242, 100, 25, 0.15);
            }
          `}} />

          {/* Stopwatch vs Pomodoro vs Custom Countdown Segmented Controls */}
          <div className="flex justify-center mb-2">
            <div className="bg-slate-100/60 dark:bg-slate-950 p-1.5 rounded-2xl flex items-center gap-1.5 border border-slate-200/40 dark:border-slate-850 flex-wrap justify-center shadow-inner">
              <button
                type="button"
                onClick={() => {
                  setTimerType("stopwatch");
                  setIsStudying(false); // Pause studying safely on flip
                }}
                className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer flex items-center gap-2 hover-lift ${
                  timerType === "stopwatch"
                    ? "bg-white dark:bg-[#181920] text-[#f26419] shadow-sm font-extrabold border border-slate-200/60 dark:border-slate-850 scale-[1.03]"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-[#f26419]" /> Stopwatch
              </button>
              <button
                type="button"
                onClick={() => {
                  setTimerType("pomodoro");
                  setIsStudying(false); // Pause safely on flip
                }}
                className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer flex items-center gap-2 hover-lift ${
                  timerType === "pomodoro"
                    ? "bg-white dark:bg-[#181920] text-rose-500 shadow-sm font-extrabold border border-slate-200/60 dark:border-slate-850 scale-[1.03]"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-rose-500 fill-rose-500/10" /> Pomodoro
              </button>
              <button
                type="button"
                onClick={() => {
                  setTimerType("custom");
                  setIsStudying(false); // Pause safely on flip
                }}
                className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer flex items-center gap-2 hover-lift ${
                  timerType === "custom"
                    ? "bg-white dark:bg-[#181920] text-emerald-500 shadow-sm font-extrabold border border-slate-200/60 dark:border-slate-850 scale-[1.03]"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <Target className="w-3.5 h-3.5 text-emerald-500" /> Custom Target
              </button>
            </div>
          </div>

          {/* ==================== 🚀 QUICK STUDY LAUNCHPAD ==================== */}
          <div className="bg-slate-50/50 dark:bg-slate-950/40 border border-slate-150/40 dark:border-slate-900/60 p-4 rounded-2xl text-left font-sans transition-all duration-300">
            <div 
              className="flex items-center justify-between cursor-pointer select-none" 
              onClick={() => {
                const nextVal = !isLaunchpadOpen;
                setIsLaunchpadOpen(nextVal);
                localStorage.setItem("f5_launchpad_open", String(nextVal));
              }}
            >
              <div className="flex items-center gap-2">
                <span className="p-1 px-2 rounded-lg bg-[#f26419]/10 text-[#f26419] text-[9px] font-black uppercase tracking-wider font-mono">
                  💡 Launchpad Guide
                </span>
                <span className="text-xs font-black text-slate-800 dark:text-neutral-100">
                  4 Simple Steps to Success
                </span>
                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 hidden sm:inline">
                  (Onboarding Checklist)
                </span>
              </div>
              <button className="text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer">
                {isLaunchpadOpen ? "Hide Guide ✕" : "Show Guide 🗃️"}
              </button>
            </div>

            {isLaunchpadOpen && (
              <div className="mt-3 pt-1 space-y-3">
                {/* Micro Progress Bar */}
                {(() => {
                  const step1 = subjects.length > 0;
                  const step2 = totalFocusMinutesToday > 0 || studyLogs.length > 0;
                  let step3 = false;
                  try {
                    const exData = localStorage.getItem("study_target_exams");
                    if (exData && JSON.parse(exData).length > 0) step3 = true;
                  } catch (e) {}
                  const step4 = userXp > 0;
                  
                  const completedCount = [step1, step2, step3, step4].filter(Boolean).length;
                  const progressPct = (completedCount / 4) * 100;

                  return (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-mono font-bold text-slate-550 dark:text-slate-400">
                        <span>Onboarding Progress: {completedCount}/4 Completed</span>
                        <span className="text-[#f26419]">{Math.round(progressPct)}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200/50 dark:bg-slate-900 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-[#f26419] to-amber-500 rounded-full transition-all duration-500" 
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>

                      {/* Launchpad Grid List Box */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-1">
                        
                        {/* Box 1: Subjects */}
                        <div className={`p-2.5 rounded-xl border transition-all ${
                          step1 
                            ? "bg-emerald-500/5 border-emerald-500/20 text-slate-800 dark:text-slate-200" 
                            : "bg-white dark:bg-[#121215] border-slate-200/60 dark:border-slate-900/50"
                        }`}>
                          <div className="flex items-center gap-1.5">
                            <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border text-[8px] ${
                              step1 ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 dark:border-slate-750 text-transparent"
                            }`}>
                              ✓
                            </div>
                            <span className="text-xs font-black">1. Course Subjects</span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1 leading-normal">Configure custom subjects and goals.</p>
                          <button 
                            type="button" 
                            onClick={() => {
                              setShowSubjectsModal(true);
                              setIsEditingSubjectsList(true);
                            }}
                            className="mt-1.5 text-[9px] font-black text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center gap-0.5 cursor-pointer"
                          >
                            Manage Subjects →
                          </button>
                        </div>

                        {/* Box 2: Start Focus Timer */}
                        <div className={`p-2.5 rounded-xl border transition-all ${
                          step2 
                            ? "bg-emerald-500/5 border-emerald-500/20 text-slate-800 dark:text-slate-200" 
                            : "bg-white dark:bg-[#121215] border-slate-200/60 dark:border-slate-900/50"
                        }`}>
                          <div className="flex items-center gap-1.5">
                            <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border text-[8px] ${
                              step2 ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 dark:border-slate-750 text-transparent"
                            }`}>
                              ✓
                            </div>
                            <span className="text-xs font-black">2. Focus Timer</span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1 leading-normal">Start custom countdowns or stopwatch.</p>
                          <button 
                            type="button" 
                            onClick={() => {
                              const timerEl = document.getElementById("f5-active-focus-pane");
                              if (timerEl) {
                                timerEl.scrollIntoView({ behavior: "smooth" });
                              }
                            }}
                            className="mt-1.5 text-[9px] font-black text-[#f26419] hover:opacity-90 flex items-center gap-0.5 cursor-pointer"
                          >
                            Show Timer Block ↓
                          </button>
                        </div>

                        {/* Box 3: Exam Planning */}
                        <div className={`p-2.5 rounded-xl border transition-all ${
                          step3 
                            ? "bg-emerald-500/5 border-emerald-500/20 text-slate-800 dark:text-slate-200" 
                            : "bg-white dark:bg-[#121215] border-slate-200/60 dark:border-slate-900/50"
                        }`}>
                          <div className="flex items-center gap-1.5">
                            <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border text-[8px] ${
                              step3 ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 dark:border-slate-750 text-transparent"
                            }`}>
                              ✓
                            </div>
                            <span className="text-xs font-black">3. Target Suite</span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1 leading-normal">Map board exams & target GPAs.</p>
                          <button 
                            type="button" 
                            onClick={() => onChangeTab?.("target-suite")}
                            className="mt-1.5 text-[9px] font-black text-emerald-500 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-350 flex items-center gap-0.5 cursor-pointer"
                          >
                            Explore Targets →
                          </button>
                        </div>

                        {/* Box 4: Redeem */}
                        <div className={`p-2.5 rounded-xl border transition-all ${
                          step4 
                            ? "bg-emerald-500/5 border-emerald-500/20 text-slate-800 dark:text-slate-200" 
                            : "bg-white dark:bg-[#121215] border-slate-200/60 dark:border-slate-900/50"
                        }`}>
                          <div className="flex items-center gap-1.5">
                            <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border text-[8px] ${
                              step4 ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 dark:border-slate-750 text-transparent"
                            }`}>
                              ✓
                            </div>
                            <span className="text-xs font-black">4. Rewards Store</span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1 leading-normal">Redeem earned focus XP for breaks.</p>
                          <button 
                            type="button" 
                            onClick={() => onChangeTab?.("rewards")}
                            className="mt-1.5 text-[9px] font-black text-amber-500 hover:text-amber-600 flex items-center gap-0.5 cursor-pointer"
                          >
                            Claim Rewards →
                          </button>
                        </div>

                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start flex-1 w-full">
            
            {/* Left side: Premium Circular progress ring (customizes based on stopwatch vs pomodoro) */}
            <div className="md:col-span-5 col-span-12 flex flex-col items-center justify-center p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-slate-50/45 dark:bg-[#0c0d12]/80 border border-slate-200/50 dark:border-slate-[#13141a] shadow-md relative space-y-3.5 sm:space-y-5">
              
              <div className="w-full flex items-center justify-between px-1">
                <span className="text-[10px] font-mono tracking-widest uppercase font-black text-[#f26419] bg-orange-500/10 px-2.5 py-0.5 rounded-full">
                  ⏱️ Chrono Orb
                </span>
                <span className="text-[10px] font-mono font-bold text-slate-450 dark:text-slate-500">
                  Precision Focus Gauge
                </span>
              </div>

              <div className="relative w-48 h-48 xs:w-56 xs:h-56 sm:w-60 sm:h-60 md:w-64 md:h-64 flex items-center justify-center">
                
                {/* Multi-layered Pulsing Halo Outer Rings */}
                {isStudying && (
                  <div 
                    className="absolute inset-0 rounded-full border-2 border-dashed animate-spin" 
                    style={{ animationDuration: '30s', borderColor: themeHexAccent + "33" }} 
                  />
                )}
                {isStudying && (
                  <div 
                    className="absolute -inset-1.5 rounded-full border border-solid animate-ping opacity-40" 
                    style={{ animationDuration: '3s', borderColor: themeHexAccent + "1a" }} 
                  />
                )}

                {/* Mindful Breathing Animated Anchor Overlays */}
                {showBreathingCoach && isStudying && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none rounded-full z-0 overflow-hidden">
                    <div 
                      className={`absolute rounded-full transition-all duration-[4000ms] ease-in-out ${
                        breathState === "inhale" ? "inset-2 opacity-75 scale-110"
                        : breathState === "hold" ? "inset-1.5 opacity-90 blur-[1px] scale-115 animate-pulse"
                        : "inset-6 opacity-30 scale-95"
                      }`}
                      style={{ 
                        borderColor: themeHexAccent + "33", 
                        backgroundColor: themeHexAccent + "0d" 
                      }}
                    />
                  </div>
                )}

                <svg viewBox="0 0 256 256" className="w-full h-full transform" style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}>
                  <defs>
                    <linearGradient id="timerSunsetGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor={gradientStops.start} />
                      <stop offset="50%" stopColor={gradientStops.mid} />
                      <stop offset="100%" stopColor={gradientStops.end} />
                    </linearGradient>
                    <radialGradient id="ringBackground" cx="50%" cy="50%" r="50%">
                      <stop offset="70%" stopColor="transparent" />
                      <stop offset="100%" stopColor={`${gradientStops.start}08`} />
                    </radialGradient>
                  </defs>
                  
                  {/* Outer shadow ring */}
                  <circle 
                    cx="128" 
                    cy="128" 
                    r="110" 
                    fill="url(#ringBackground)" 
                    className="stroke-slate-100/80 dark:stroke-slate-900/40" 
                    strokeWidth="1.5"
                  />
                  
                  {/* Light Tick markers around the dial */}
                  <circle 
                    cx="128" 
                    cy="128" 
                    r="105" 
                    stroke="rgba(148, 163, 184, 0.12)" 
                    strokeWidth="4" 
                    strokeDasharray="1.5 8"
                    fill="none"
                  />

                  {/* Master Background Orbit */}
                  <circle 
                    cx="128" 
                    cy="128" 
                    r="112" 
                    className="stroke-slate-200/40 dark:stroke-[#18181c]" 
                    strokeWidth="7" 
                    fill="none" 
                  />

                  {/* Active Ticking Path */}
                  {timerType === "pomodoro" ? (
                    <circle 
                      cx="128" 
                      cy="128" 
                      r="112" 
                      stroke={pomoState === "focus" ? "url(#timerSunsetGrad)" : "rgba(16, 185, 129, 0.85)"}
                      className="progress-glow transition-all duration-300"
                      strokeWidth="8" 
                      fill="none" 
                      strokeDasharray={`${
                        (703.7 * (
                          () => {
                            const maxSecs = pomoState === "focus" ? pomoFocusDuration * 60 :
                                             pomoState === "shortBreak" ? pomoShortBreakDuration * 60 :
                                             pomoLongBreakDuration * 60;
                            return Math.min(100, Math.round(((maxSecs - pomoSecondsLeft) / maxSecs) * 100));
                          }
                        )()) / 100
                      } 703.7`}
                      strokeDashoffset={0}
                      strokeLinecap="round"
                    />
                  ) : timerType === "custom" ? (
                    <circle 
                      cx="128" 
                      cy="128" 
                      r="112" 
                      stroke="url(#timerSunsetGrad)"
                      className="progress-glow transition-all duration-300"
                      strokeWidth="8" 
                      fill="none" 
                      strokeDasharray={`${(703.7 * Math.min(100, Math.round((activeSeconds / (customTargetMinutes * 60)) * 100))) / 100} 703.7`}
                      strokeDashoffset={0}
                      strokeLinecap="round"
                    />
                  ) : (
                    <circle 
                      cx="128" 
                      cy="128" 
                      r="112" 
                      stroke="url(#timerSunsetGrad)"
                      className="progress-glow transition-all duration-300"
                      strokeWidth="8" 
                      fill="none" 
                      strokeDasharray={`${(703.7 * getProgressRingPercent()) / 100} 703.7`}
                      strokeDashoffset={0}
                      strokeLinecap="round"
                    />
                  )}
                </svg>

                {/* Digital readout inside the glass crystal (Swapped/Repositioned for balanced, clean UX) */}
                <div className="absolute flex flex-col items-center justify-center text-center px-4 z-10 scale-90 xs:scale-100">
                  {activeSubject ? (
                    <div className="flex flex-col items-center max-w-[190px] mb-1">
                      <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block truncate max-w-[150px]">
                        {activeSubject.name}
                      </span>
                      <div className="flex items-center gap-1 text-[9px] font-mono font-black mt-0.5" style={{ color: themeHexAccent }}>
                        <span>Goal: {timerType === "custom" ? `${customTargetMinutes}m` : `${activeSubject.goalMinutes}m`}</span>
                        <span className="opacity-40">•</span>
                        <span>
                          {timerType === "custom" ? (
                            `${Math.min(100, Math.round((activeSeconds / (customTargetMinutes * 60)) * 100))}%`
                          ) : timerType === "stopwatch" ? (
                            `${getProgressRingPercent()}%`
                          ) : (
                            (() => {
                              const maxSecs = pomoState === "focus" ? pomoFocusDuration * 60 :
                                               pomoState === "shortBreak" ? pomoShortBreakDuration * 60 :
                                               pomoLongBreakDuration * 60;
                              return `${Math.round(((maxSecs - pomoSecondsLeft) / maxSecs) * 100)}%`;
                            })()
                          )}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">Study Focus</span>
                  )}

                  <span className="text-4xl md:text-5xl font-mono font-black tracking-tighter text-slate-800 dark:text-neutral-50 my-1 antialiased tabular-nums leading-none">
                    {timerType === "custom" 
                      ? formatTickingTime(Math.max(0, (customTargetMinutes * 60) - activeSeconds)) 
                      : (timerType === "stopwatch" ? formatTickingTime(activeSeconds) : formatPomoTime(pomoSecondsLeft))
                    }
                  </span>

                  <div className="mt-2.5 flex flex-col items-center gap-1.5">
                    <div 
                      className={`text-[9px] uppercase tracking-wider font-mono px-3 py-1 rounded-full border transition-all duration-300 font-extrabold ${
                        isStudying 
                          ? pomoState === "focus" || timerType === "stopwatch" || timerType === "custom"
                            ? "animate-pulse" 
                            : "bg-emerald-500/10 border-emerald-500/30 text-emerald-500 animate-pulse"
                          : "bg-slate-100 dark:bg-slate-950 border-transparent text-slate-500"
                        }`}
                      style={isStudying && (pomoState === "focus" || timerType === "stopwatch" || timerType === "custom") ? {
                        backgroundColor: themeHexAccent + "1a",
                        borderColor: themeHexAccent + "4d",
                        color: themeHexAccent
                      } : {}}
                    >
                      {timerType === "custom" ? (
                        isStudying ? "Countdown Active" : "Target Paused"
                      ) : timerType === "stopwatch" ? (
                        isStudying ? "Focus Flowing" : "Stopwatch Paused"
                      ) : (
                        pomoState === "focus" ? (
                          isStudying ? "Focus Period" : "Pomo Standby"
                        ) : (
                          pomoState === "shortBreak" ? "Short Break ☕" : "Long Break 🌴"
                        )
                      )}
                    </div>

                    {showBreathingCoach && isStudying && (
                      <div 
                        className="flex items-center justify-center gap-1 px-2.5 py-0.5 rounded-full animate-pulse border"
                        style={{
                          backgroundColor: themeHexAccent + "14",
                          borderColor: themeHexAccent + "26"
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: themeHexAccent }} />
                        <span 
                          className="text-[7.5px] font-mono font-black uppercase tracking-widest leading-none"
                          style={{ color: themeHexAccent }}
                        >
                          {breathState === "inhale" ? "Inhale..." : breathState === "hold" ? "Hold..." : "Exhale..."}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Pomodoro Rounds Progress Indicator */}
              {timerType === "pomodoro" && (
                <div className="flex items-center gap-2 mt-4 bg-slate-50/70 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-800 px-4 py-2 rounded-2xl">
                  <span className="text-[10px] font-mono font-black uppercase text-slate-400 dark:text-slate-500">Rounds:</span>
                  <div className="flex items-center gap-1.5 ml-1">
                    {[1, 2, 3, 4].map(r => {
                      const isActive = pomoRound === r && pomoState === "focus";
                      const isDone = pomoRound > r || (pomoRound === r && pomoState !== "focus");
                      return (
                        <div 
                          key={r}
                          className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-mono font-black transition-all ${
                            isActive 
                              ? "bg-[#f26419] text-white shadow-md animate-pulse scale-110" 
                              : isDone 
                              ? "bg-emerald-500 text-white" 
                              : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500"
                          }`}
                        >
                          {isDone ? "✓" : r}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Gamified Concentration Milestone Badge */}
              <div className="mt-4 w-full flex flex-col items-center">
                {(() => {
                  const badgeInfo = getActiveSessionBadge(timerType === "stopwatch" ? activeSeconds : (pomoState === "focus" ? (pomoFocusDuration * 60 - pomoSecondsLeft) : 0));
                  return (
                    <div className={`p-3.5 rounded-2xl border text-center w-full max-w-[256px] flex items-center gap-2.5 transition-all duration-300 ${badgeInfo.color} shadow-xs`}>
                      <div className="p-1.5 rounded-xl bg-white dark:bg-slate-900 relative shadow-xs flex items-center justify-center shrink-0">
                        {timerType === "stopwatch" && activeSeconds >= 600 ? (
                          <Award className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Flame className="w-4 h-4 text-[#f26419]" />
                        )}
                      </div>
                      <div className="text-left min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-[8px] font-mono tracking-wider font-extrabold uppercase text-slate-400 dark:text-slate-500">Level:</span>
                          <span className="text-[9px] font-sans font-extrabold tracking-wide text-slate-750 dark:text-slate-250">{badgeInfo.badge}</span>
                        </div>
                        <h5 className="text-[10px] font-bold text-slate-800 dark:text-slate-100 truncate">{badgeInfo.title}</h5>
                        <p className="text-[8px] text-slate-450 dark:text-slate-500 leading-tight mt-0.5 max-w-[190px]">{badgeInfo.desc}</p>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Control buttons under progress: Save/Discard or Pomodoro reset/skip */}
              <div className="flex items-center gap-3 mt-6">
                {(timerType === "stopwatch" || timerType === "custom") ? (
                  activeSeconds > 0 && (
                    <>
                      <button
                        onClick={handleStopAndSave}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-5 py-3 rounded-2xl transition-all cursor-pointer shadow-md flex items-center gap-1.5 hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <Check className="w-4 h-4 stroke-[2.5]" /> Finish & Reflect
                      </button>
                      <button
                        onClick={handleDiscardProgress}
                        className={`text-slate-500 font-bold text-xs p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                          showDiscardConfirm 
                            ? "bg-rose-600 border-rose-500 text-white hover:bg-rose-500 animate-pulse" 
                            : "bg-slate-50 hover:bg-slate-100 border-slate-200 dark:bg-slate-950 dark:border-slate-805 dark:text-slate-400 dark:hover:bg-slate-900"
                        }`}
                      >
                        {showDiscardConfirm ? "Sure? Clear session" : <RotateCcw className="w-4 h-4" />}
                      </button>
                    </>
                  )
                ) : (
                  <>
                    <button
                      onClick={handleResetPomo}
                      className="text-slate-500 font-black text-xs px-4 py-2.5 rounded-xl border bg-slate-50 hover:bg-slate-100 border-slate-200 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900 transition-all cursor-pointer flex items-center gap-1.5"
                      title="Reset Pomodoro"
                    >
                      <RotateCw className="w-3.5 h-3.5" /> Reset
                    </button>
                    <button
                      onClick={handleSkipPomo}
                      className="text-[#f26419] font-black text-xs px-4 py-2.5 rounded-xl border bg-orange-500/5 dark:bg-orange-500/10 border-orange-200/50 dark:border-orange-950/50 transition-all cursor-pointer flex items-center gap-1.5 hover:bg-orange-500/10"
                      title="Skip period"
                    >
                      <SkipForward className="w-3.5 h-3.5" /> Skip State
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Right side: Modern Strategic Focus Disciplines Planner */}
            <div className="md:col-span-7 col-span-12 space-y-4.5 text-left animate-fade-in">
              
              {/* RAPID STUDY LAUNCHER FOCUS COCKPIT - IMMENSE COGNITIVE ELEVATION */}
              {subView === "timer" && (
                <div className="bg-slate-900 dark:bg-[#111218]/95 text-white p-5 rounded-3xl border border-slate-800/80 dark:border-slate-850 shadow-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[9px] uppercase font-mono text-[#f26419] font-black tracking-widest block">
                        ⚡ Focus Cockpit
                      </span>
                      <h3 className="text-sm font-black tracking-tight mt-0.5">
                        {isStudying ? "Study Session in Progress" : "Ready to Start Studying?"}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] bg-white/10 dark:bg-slate-900/65 px-3 py-1 rounded-full font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping mr-1" />
                      <span className="truncate max-w-[120px] font-bold">
                        {subjects.find(s => s.id === activeSubjectId)?.name || "Select Folder"}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (subjects.length === 0) {
                          setToast({
                            message: "⚠️ Please enroll a Subject or Topic first using the '+' button!",
                            type: "warning"
                          });
                          setShowSubjectsModal(true);
                          setIsEditingSubjectsList(true);
                          return;
                        }
                        const verifiedSubject = subjects.find(s => s.id === activeSubjectId);
                        if (verifiedSubject) {
                          const currentStudyingState = !isStudying;
                          if (!currentStudyingState) {
                            handleStopAndSave();
                          } else {
                            setIsStudying(true);
                            setToast({
                              message: `Study session started for: "${verifiedSubject.name}" ⚡`,
                              type: "info"
                            });
                          }
                        } else {
                          // No valid active topic has been selected yet. Highlight selection area.
                          setToast({
                            message: "⚠️ Please select an active Subject/Topic below before starting the focus session!",
                            type: "warning"
                          });
                          const grid = document.getElementById("f5-subject-selection");
                          if (grid) {
                            grid.scrollIntoView({ behavior: "smooth" });
                          }
                        }
                      }}
                      className={`flex-1 py-4.5 px-6 rounded-2xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2.5 shadow-lg active:scale-98 ${
                        isStudying 
                          ? "bg-amber-600 hover:bg-amber-500 text-white"
                          : `${themeBgAccent} text-white hover:scale-[1.015] hover:opacity-95`
                      }`}
                    >
                      {isStudying ? (
                        <>
                          <Pause className="w-4 h-4 fill-current stroke-[3]" /> Stop & Save Study Session
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 fill-current stroke-[3] text-white animate-pulse" /> Start Focus Session Now
                        </>
                      )}
                    </button>

                    {isStudying && (
                      <button
                        type="button"
                        onClick={handleDiscardProgress}
                        className="py-4.5 px-4 rounded-2xl font-black text-xs bg-red-650/20 text-red-400 hover:bg-red-650/30 border border-red-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        title="Discard session progress"
                      >
                        <Trash className="w-4 h-4" /> Discard
                      </button>
                    )}
                  </div>

                  {/* Elegant Hotkeys Guide Panel */}
                  <div className="pt-3 border-t border-slate-800/40 flex flex-col xs:flex-row xs:items-center justify-between gap-2 text-[10px] text-slate-400 font-mono">
                    <span className="text-slate-500 font-bold uppercase tracking-wider text-[8px]">⌨️ Pro Shortcuts</span>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 bg-slate-950/20 p-2 rounded-xl border border-slate-800/40 w-full xs:w-auto">
                      <span className="flex items-center gap-1.2"><kbd className="px-1.5 py-0.2 rounded bg-white/10 text-slate-200 font-extrabold text-[9px] border border-white/5">Space</kbd> Start/Pause</span>
                      <span className="flex items-center gap-1.2"><kbd className="px-1.5 py-0.2 rounded bg-white/10 text-slate-200 font-extrabold text-[9px] border border-white/5">Esc</kbd> Stop</span>
                      <span className="flex items-center gap-1.2"><kbd className="px-1.5 py-0.2 rounded bg-white/10 text-slate-200 font-extrabold text-[9px] border border-white/5">M</kbd> Sound</span>
                      <span className="flex items-center gap-1.2"><kbd className="px-1.5 py-0.2 rounded bg-white/10 text-slate-200 font-extrabold text-[9px] border border-white/5">B</kbd> Breath</span>
                      <span className="flex items-center gap-1.2"><kbd className="px-1.5 py-0.2 rounded bg-white/10 text-slate-200 font-extrabold text-[9px] border border-white/5">T</kbd> Tab</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Atmosphere intro section */}
              {subView === "atmosphere" && (
                <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-500/25 p-5 rounded-3xl text-left relative overflow-hidden shadow-xs animate-fade-in">
                  <span className="p-1 px-2.5 rounded-lg bg-indigo-500/10 text-indigo-500 text-[9px] font-black uppercase tracking-wider font-mono">
                    🧘 Zen Space Cabin
                  </span>
                  <h3 className="text-sm font-black text-slate-800 dark:text-neutral-200 mt-2">
                    Atmosphere & Color Customization
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">
                    Play auditory focus soundscapes, toggle distraction shield guards, and customize level-achievement themes away from your active study session space.
                  </p>
                </div>
              )}

              {subView === "timer" && (
                <>
                  {/* Domain selection cockpit */}
              <div className="bg-white/45 dark:bg-[#0c0d12]/35 p-4 rounded-3xl border border-slate-200/50 dark:border-slate-900/60 shadow-xs">
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-mono tracking-widest uppercase font-black text-slate-400 dark:text-slate-500">
                      Active Scholastic Focus Domains
                    </span>
                    <h3 className="text-xs font-black uppercase text-slate-800 dark:text-slate-250 mt-0.5">
                      Academic Study Disciplines
                    </h3>
                  </div>
                  <span className="text-[9.5px] font-mono font-black text-[#f26419] bg-[#f26419]/10 px-3 py-1 rounded-full border border-[#f26419]/15">
                    {subjects.length} Domains Loaded
                  </span>
                </div>
                
                {/* Subject selection container */}
                <div id="f5-subject-selection" className="grid grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-3.5 max-h-[140px] xs:max-h-[200px] sm:max-h-[260px] overflow-y-auto no-scrollbar pr-1">
                  {subjects.map((sub) => {
                    const isSelected = activeSubjectId === sub.id;
                    const liveMinutes = sub.totalMinutes + (isSelected && isStudying && timerType === "stopwatch" ? activeSeconds / 60 : 0);
                    const percentComplete = Math.min(100, Math.round((liveMinutes / (sub.goalMinutes || 120)) * 100));

                    return (
                      <button
                        key={sub.id}
                        onClick={() => handleStartStudy(sub.id)}
                        className={`p-2 sm:p-3 sm:pl-5 rounded-xl sm:rounded-2xl border text-left flex flex-col justify-between transition-all select-none relative overflow-hidden h-[78px] xs:h-[84px] sm:h-[98px] interactive-card ${
                          isSelected 
                            ? "border-[#f26419]/70 bg-[#f26419]/5 dark:bg-[#f26419]/10 text-slate-800 dark:text-slate-100 shadow-md scale-[1.02] -translate-y-[1px]" 
                            : "border-slate-200/50 dark:border-slate-850 bg-white/95 dark:bg-[#121217]/55 hover:bg-slate-50/50 dark:hover:bg-[#161720]/80 text-slate-650 dark:text-slate-200 shadow-xs hover:border-slate-350 dark:hover:border-slate-800"
                        }`}
                      >
                        {/* Dynamic Custom Color Indicator Ribbon on Left Edge */}
                        <div 
                          className={`absolute top-0 left-0 bottom-0 w-1 sm:w-1.5 rounded-r-xs ${
                            sub.color.startsWith("bg-") ? sub.color : `bg-gradient-to-b ${sub.color}`
                          }`} 
                        />

                        <div className="text-left w-full pl-0.5">
                          <p className={`text-[7px] sm:text-[8px] font-mono uppercase font-black tracking-widest ${isSelected ? 'text-[#f26419]' : 'text-slate-400 dark:text-slate-500'}`}>
                            {isSelected ? 'Active Discipline' : 'Subject Domain'}
                          </p>
                          <h4 className="text-[10px] sm:text-[12px] font-bold truncate mt-0.2 sm:mt-0.5 max-w-[135px] text-slate-800 dark:text-neutral-250 leading-tight">{sub.name}</h4>
                        </div>

                        {/* Progress goal bar */}
                        <div className="w-full mt-1 sm:mt-1.5 space-y-0.5 sm:space-y-1 pl-0.5">
                          <div className="flex justify-between items-center text-[7.5px] sm:text-[8.5px] font-mono leading-none">
                            <span className="text-[#f26419] dark:text-[#ff7f41] font-black">{formatSubjectMinutes(liveMinutes)}</span>
                            <span className="text-slate-400 font-bold">{percentComplete}% done</span>
                          </div>
                          <div className="w-full h-0.5 sm:h-1 bg-slate-100/80 dark:bg-slate-900 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-500 rounded-full ${
                                sub.color.startsWith("bg-") ? sub.color : `bg-gradient-to-r ${sub.color}`
                              }`} 
                              style={{ width: `${percentComplete}%` }}
                            />
                          </div>
                        </div>

                        {isSelected && isStudying && (
                          <span className="absolute top-1.5 right-1.5 flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                          </span>
                        )}
                      </button>
                    );
                  })}
                  
                  {/* Create Subject Domain trigger */}
                  <button
                    onClick={() => {
                      setShowSubjectsModal(true);
                      setIsEditingSubjectsList(true);
                    }}
                    className="border border-dashed border-slate-300 dark:border-slate-800 p-2 rounded-xl sm:rounded-2xl hover:bg-slate-50/50 dark:hover:bg-[#121217] text-slate-400 hover:text-[#f26419] dark:hover:text-[#f26419] flex flex-col justify-center items-center text-center transition-all cursor-pointer h-[78px] xs:h-[84px] sm:h-[98px]"
                  >
                    <Plus className="w-4 h-4 mb-0.5 sm:mb-1 text-slate-400 hover:text-[#f26419]" />
                    <span className="text-[7.5px] sm:text-[8px] font-extrabold uppercase tracking-widest leading-none">Enroll Subject</span>
                  </button>
                </div>
              </div>

                           {timerType === "custom" && !isStudying && (
                <div className="bg-slate-50/70 dark:bg-slate-950/40 p-4.5 rounded-2xl border border-slate-200/50 dark:border-slate-900 space-y-4 animate-fade-in text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-mono text-slate-400 dark:text-slate-500 font-black tracking-wider flex items-center gap-1">
                      <Target className="w-3.5 h-3.5 text-emerald-500" /> Advanced Target Span Planner
                    </span>
                    <span className="text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Target reward: +100 XP bonus
                    </span>
                  </div>

                  {/* Preset Minute Tabs */}
                  <div className="space-y-1.5">
                    <label className="text-[8.5px] font-mono tracking-wider font-extrabold uppercase text-slate-400 dark:text-slate-500">
                      General Focus Intervals
                    </label>
                    <div className="grid grid-cols-6 gap-1.5">
                      {[15, 30, 45, 60, 90, 120].map((mins) => (
                        <button
                          key={mins}
                          onClick={() => {
                            setCustomTargetMinutes(mins);
                            setCustomTargetMinutesInput(String(mins));
                          }}
                          className={`py-2 rounded-xl text-center text-xs font-black font-mono border transition-all cursor-pointer ${
                            customTargetMinutes === mins
                              ? "bg-emerald-600 border-transparent text-white shadow-xs scale-[1.02]"
                              : "bg-white dark:bg-[#121215]/50 hover:bg-slate-50 dark:hover:bg-slate-900 border-slate-150 dark:border-slate-800 text-slate-600 dark:text-slate-350"
                          }`}
                        >
                          {mins}m
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Manual Target Minutes Input */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 items-center">
                    <div className="space-y-1">
                      <label className="text-[8.5px] font-mono tracking-wider font-extrabold uppercase text-slate-400 dark:text-slate-500">
                        Custom Span Dimension (1 - 300)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          max="300"
                          value={customTargetMinutesInput}
                          onChange={(e) => {
                            setCustomTargetMinutesInput(e.target.value);
                            const parsed = parseInt(e.target.value, 10);
                            if (!isNaN(parsed) && parsed > 0) {
                              setCustomTargetMinutes(parsed);
                            }
                          }}
                          className="w-full pl-3 pr-9 py-2 border rounded-xl bg-white dark:bg-[#121215]/50 border-slate-200 dark:border-slate-800 text-xs font-bold font-mono text-slate-800 dark:text-neutral-50 focus:border-[#f26419] focus:outline-none"
                        />
                        <span className="absolute right-3 top-2.5 text-[8.5px] font-mono text-slate-400 font-extrabold pb-0.5 uppercase">mins</span>
                      </div>
                    </div>

                    {/* Target Focus Quest Input */}
                    <div className="space-y-1">
                      <label className="text-[8.5px] font-mono tracking-wider font-extrabold uppercase text-slate-400 dark:text-slate-500">
                        Study Directives / Focus goals
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Solve test mock #2"
                        value={sessionGoalText}
                        onChange={(e) => setSessionGoalText(e.target.value)}
                        className="w-full px-3 py-2 border rounded-xl bg-white dark:bg-[#121215]/50 border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-850 dark:text-neutral-200 placeholder-slate-400 dark:placeholder-slate-550 focus:border-[#f26419] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Active projection box */}
                  <div className="bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-2xl flex items-center justify-between text-xs font-mono">
                    <div className="text-left">
                      <p className="text-[7.5px] font-black uppercase text-slate-400 leading-none mb-1">Provisional Output Projection</p>
                      <p className="text-[10px] font-bold text-slate-650 dark:text-slate-350">
                        Study for <span className="text-emerald-500 font-black">{customTargetMinutes} mins</span>
                      </p>
                    </div>
                    <div className="text-right flex items-center gap-1.5 font-bold">
                      <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md text-[8.5px] font-black">
                        +{customTargetMinutes * (calculateStudentLevel(userXp).level < 5 ? 5 : 10)} Base XP
                      </div>
                      <div className="bg-[#f26419]/10 text-[#f26419] px-2 py-0.5 rounded-md text-[8.5px] font-black">
                        +100 Milestone Bonus
                      </div>
                    </div>
                  </div>

                  {timerAlertMessage && (
                    <div className="bg-rose-50 dark:bg-rose-950/40 text-rose-750 dark:text-rose-400 text-[10.5px] font-semibold py-2 px-3.5 rounded-xl border border-rose-200 dark:border-rose-900/30 text-left leading-normal flex items-start gap-1.5 animate-flash">
                      <span className="text-rose-500 font-bold">⚠️</span>
                      <span>{timerAlertMessage}</span>
                    </div>
                  )}

                  {/* Quick Start Focus Quest button */}
                  <button
                    type="button"
                    onClick={() => {
                      setTimerAlertMessage(null);
                      if (subjects.length === 0) {
                        setTimerAlertMessage("⚠️ Please enroll a study Subject or Topic first using the '+' button!");
                        setToast({
                          message: "⚠️ Please enroll a study Subject or Topic first!",
                          type: "warning"
                        });
                        setShowSubjectsModal(true);
                        setIsEditingSubjectsList(true);
                        return;
                      }
                      const verifiedSubject = subjects.find(s => s.id === activeSubjectId);
                      if (!verifiedSubject) {
                        setTimerAlertMessage("⚠️ Please select an active Subject/Topic from the Disciplines section before initiating the Focus Odyssey.");
                        const grid = document.getElementById("f5-subject-selection");
                        if (grid) {
                          grid.scrollIntoView({ behavior: "smooth" });
                        }
                        return;
                      }
                      setActiveSeconds(0);
                      setIsStudying(true);
                    }}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 text-white font-extrabold text-[10.5px] uppercase tracking-widest cursor-pointer shadow-md transition-all active:scale-98 flex items-center justify-center gap-1.5 hover:opacity-95"
                  >
                    <Lock className="w-3.5 h-3.5 stroke-[2.5]" /> Initiate Advanced Focus Odyssey
                  </button>
                </div>
              )}

              {timerType === "custom" && isStudying && (
                <div className="bg-slate-50/70 dark:bg-slate-950/40 p-4.5 rounded-2xl border border-slate-200/50 dark:border-slate-900 space-y-3 animate-fade-in text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-mono text-slate-400 dark:text-slate-500 font-black tracking-wider flex items-center gap-1">
                      📝 Active Quest Deliverables ({sessionTodos.filter(t => t.isDone).length}/{sessionTodos.length})
                    </span>
                    <span className="text-[9px] font-mono font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      +{Math.max(1, Math.round(activeSeconds / 60 * (calculateStudentLevel(userXp).level < 5 ? 5 : 10)))} XP Earned
                    </span>
                  </div>

                  {/* Active Mission Text */}
                  {sessionGoalText && (
                    <div className="bg-[#f26419]/5 border border-[#f26419]/15 px-3 py-2 rounded-xl text-[10.5px] font-sans font-bold flex items-center gap-1.5 text-[#f26419]">
                      <span className="text-[#f26419] font-bold">🎯</span> Study Directive: "{sessionGoalText}"
                    </div>
                  )}

                  {/* Scrollable Todo checklist */}
                  <div className="space-y-1.5 max-h-[140px] overflow-y-auto no-scrollbar pr-1">
                    {sessionTodos.length === 0 ? (
                      <p className="text-[10px] text-slate-400 italic">No checklist tasks created for this session yet.</p>
                    ) : (
                      sessionTodos.map((todo) => (
                        <div key={todo.id} className="flex items-center justify-between bg-white dark:bg-[#121212]/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-850/60 font-sans">
                          <label className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={todo.isDone}
                              onChange={() => handleToggleTodo(todo.id)}
                              className="w-4 h-4 rounded text-[#f26419] border-slate-350 focus:ring-0 cursor-pointer accent-[#f26419]"
                            />
                            <span className={`text-xs truncate pr-2 font-bold ${todo.isDone ? 'line-through text-slate-400' : 'text-slate-755 dark:text-slate-200'}`}>
                              {todo.text}
                            </span>
                          </label>
                          <button
                            onClick={() => handleDeleteTodo(todo.id)}
                            className="text-slate-400 hover:text-rose-500 p-1 rounded-md cursor-pointer transition-colors"
                            title="Delete task"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add input form */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add micro-task..."
                      value={newTodoText}
                      onChange={(e) => setNewTodoText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddTodo()}
                      className="flex-1 px-3 py-2 border rounded-xl bg-white dark:bg-[#121215]/50 border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-[#f26419]"
                    />
                    <button
                      onClick={handleAddTodo}
                      className="px-4 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-black cursor-pointer transition-colors border border-transparent"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}

              {/* Daily Scholastic Target Tuner Module */}
              <div className="bg-slate-50/70 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-900 space-y-3 mt-1 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-mono text-slate-400 dark:text-slate-500 font-black tracking-wider">
                    Daily Scholastic Target Tuner
                  </span>
                  <span className="text-[10px] font-mono font-bold bg-[#f26419]/10 text-[#f26419] px-2.5 py-0.5 rounded-full">
                    {(activeSubject?.goalMinutes) || 120} mins daily
                  </span>
                </div>
                
                <div className="flex items-center justify-between bg-white dark:bg-[#121215]/50 p-2.5 rounded-xl border border-slate-150 dark:border-slate-800">
                  <div className="min-w-0">
                    <p className="text-[8px] font-mono uppercase text-slate-400">Active Focus Domain</p>
                    <h4 className="text-xs font-black truncate max-w-[140px] text-slate-700 dark:text-slate-200">
                      {activeSubject?.name || "No domain selected"}
                    </h4>
                  </div>
                  
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button 
                      onClick={() => adjustSubjectGoal(-15)}
                      disabled={!activeSubject}
                      className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 font-black font-mono text-xs text-slate-600 dark:text-slate-300 flex items-center justify-center cursor-pointer transition-all active:scale-95 disabled:opacity-50 animate-pulse-subtle"
                      title="Reduce goal by 15 mins"
                    >
                      -15
                    </button>
                    <button 
                      onClick={() => adjustSubjectGoal(15)}
                      disabled={!activeSubject}
                      className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 font-black font-mono text-xs text-slate-600 dark:text-slate-300 flex items-center justify-center cursor-pointer transition-all active:scale-95 disabled:opacity-50 animate-pulse-subtle"
                      title="Increase goal by 15 mins"
                    >
                      +15
                    </button>
                  </div>
                </div>
              </div>

              {/* Pomodoro Intervals Custom configurators (only in Pomodoro mode) */}
              {timerType === "pomodoro" && (
                <div className="bg-slate-50/70 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-900 space-y-3 mt-1 text-left">
                  <span className="text-[10px] uppercase font-mono text-slate-400 dark:text-slate-500 font-black tracking-wider block">
                    Pomodoro Intervals Configurator
                  </span>
                  
                  <div className="grid grid-cols-3 gap-2">
                    {/* Focus Adjust */}
                    <div className="bg-white dark:bg-[#121215]/50 p-2 rounded-xl border border-slate-150 dark:border-slate-800 flex flex-col items-center">
                      <span className="text-[8px] font-mono text-slate-400 font-black uppercase">Focus</span>
                      <span className="text-xs font-black font-mono my-1 text-slate-800 dark:text-slate-100">{pomoFocusDuration}m</span>
                      <div className="flex gap-1 w-full">
                        <button 
                          onClick={() => adjustFocusDuration(-5)}
                          className="flex-1 py-1 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono font-bold hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer active:scale-90"
                        >
                          -
                        </button>
                        <button 
                          onClick={() => adjustFocusDuration(5)}
                          className="flex-1 py-1 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono font-bold hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer active:scale-90"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Short Break Adjust */}
                    <div className="bg-white dark:bg-[#121215]/50 p-2 rounded-xl border border-slate-150 dark:border-slate-800 flex flex-col items-center">
                      <span className="text-[8px] font-mono text-slate-400 font-black uppercase">Short Brk</span>
                      <span className="text-xs font-black font-mono my-1 text-slate-800 dark:text-slate-100">{pomoShortBreakDuration}m</span>
                      <div className="flex gap-1 w-full">
                        <button 
                          onClick={() => adjustShortBreakDuration(-1)}
                          className="flex-1 py-1 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono font-bold hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer active:scale-90"
                        >
                          -
                        </button>
                        <button 
                          onClick={() => adjustShortBreakDuration(1)}
                          className="flex-1 py-1 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono font-bold hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer active:scale-90"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Long Break Adjust */}
                    <div className="bg-white dark:bg-[#121215]/50 p-2 rounded-xl border border-slate-150 dark:border-slate-800 flex flex-col items-center">
                      <span className="text-[8px] font-mono text-slate-400 font-black uppercase">Long Brk</span>
                      <span className="text-xs font-black font-mono my-1 text-slate-800 dark:text-slate-100">{pomoLongBreakDuration}m</span>
                      <div className="flex gap-1 w-full">
                        <button 
                          onClick={() => adjustLongBreakDuration(-5)}
                          className="flex-1 py-1 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono font-bold hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer active:scale-90"
                        >
                          -
                        </button>
                        <button 
                          onClick={() => adjustLongBreakDuration(5)}
                          className="flex-1 py-1 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono font-bold hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer active:scale-90"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
                </>
              )}

              {subView === "atmosphere" && (
                <>
                  {/* Sound equalizer deck */}
                  <div className="bg-slate-50/70 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-900 space-y-3 mt-1 text-left relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-mono text-slate-400 dark:text-slate-500 font-black tracking-wider">
                    Flow Ambient Sound Deck
                  </span>
                  <div className="flex items-center gap-1.5">
                    {ambientSound !== "none" ? (
                      <Volume2 className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                    ) : (
                      <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    <span className="text-[10px] font-mono text-slate-600 dark:text-slate-350 capitalize font-bold">{ambientSound}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "none", label: "Mute" },
                    { id: "brown", label: "Brownian" },
                    { id: "rain", label: "Cozy Rain" },
                    { id: "waves", label: "Ocean Tide" },
                    { id: "fire", label: "Campfire" },
                    { id: "binaural", label: "Gamma Beats" }
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setAmbientSound(s.id as any);
                        setToast({
                          message: s.id === "none" 
                            ? "Ambient soundscapes muted." 
                            : `Synthesizing active ${s.label} flow track 🎧`,
                          type: s.id === "none" ? "info" : "success"
                        });
                      }}
                      className={`p-2 rounded-xl text-center text-[10px] font-bold uppercase tracking-wider border transition-all cursor-pointer truncate ${
                        ambientSound === s.id 
                          ? "bg-[#f26419] text-white border-[#f26419] dark:bg-slate-950 dark:text-[#f26419] dark:border-[#f26419]/40 shadow-xs font-black" 
                          : "bg-white dark:bg-slate-900/50 text-slate-550 dark:text-slate-400 border-slate-100 dark:border-transparent hover:bg-slate-50 dark:hover:bg-slate-900"
                      }`}
                      title={s.label}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                {isStudying && ambientSound !== "none" && (
                  <div className="flex items-end justify-between px-2 pt-2 pb-1 gap-1.5 h-6 bg-slate-100/40 dark:bg-slate-900/40 rounded-lg">
                    {Array.from({ length: 15 }).map((_, barIdx) => {
                      const animationDuration = `${0.5 + (barIdx % 4) * 0.25}s`;
                      const animDelay = `${barIdx * 70}ms`;
                      return (
                        <span 
                          key={barIdx}
                          className="flex-1 bg-[#f26419] rounded-xs transition-transform"
                          style={{
                            height: "100%",
                            transformOrigin: "bottom",
                            animation: `equalizerPulse ${animationDuration} ease-in-out infinite alternate`,
                            animationDelay: animDelay
                          }}
                        />
                      );
                    })}
                  </div>
                )}

                {ambientSound !== "none" && (
                  <div className="flex items-center gap-3 pt-1">
                    <span className="text-[9px] text-slate-450 uppercase font-mono font-bold">Vol</span>
                    <input 
                      type="range"
                      min="0"
                      max="0.5"
                      step="0.01"
                      value={volume}
                      onChange={(e) => setVolume(parseFloat(e.target.value))}
                      className="flex-1 h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#f26419]"
                    />
                    <span className="text-[10px] font-mono text-slate-500 w-8 text-right font-bold font-black">
                      {Math.round(volume * 200)}%
                    </span>
                  </div>
                )}
              </div>

              {/* Cognitive Companion Enhancers Deck */}
              <div className="bg-slate-50/70 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-900 space-y-3.5 text-left relative overflow-hidden">
                <div>
                  <span className="text-[10px] uppercase font-mono text-slate-400 dark:text-slate-500 font-extrabold tracking-wider block">
                    Focus Boosters
                  </span>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">Activate real-time cognitive state assistants:</p>
                </div>

                <div className="space-y-2.5">
                  {/* Focus Guard Protection Switch */}
                  <div className="flex items-center justify-between bg-white dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100/50 dark:border-slate-900">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`p-1.5 rounded-lg transition-transform ${focusGuard ? 'bg-[#f26419]/10 text-[#f26419] scale-110' : 'bg-slate-100 text-slate-400 dark:bg-slate-900 dark:text-slate-600'}`}>
                        <Shield className="w-4 h-4 stroke-[2.5]" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block truncate">Anti-Distraction Shield</span>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 block truncate leading-none mt-0.5">Auto-pauses study if you switch browser tabs</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setFocusGuard(!focusGuard)}
                      aria-label="Toggle focus guard"
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        focusGuard ? 'bg-[#f26419]' : 'bg-slate-200 dark:bg-slate-800'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                          focusGuard ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Mindful Breathing Anchor Switch */}
                  <div className="flex items-center justify-between bg-white dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100/50 dark:border-slate-900">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`p-1.5 rounded-lg transition-transform ${showBreathingCoach ? 'bg-indigo-500/10 text-indigo-500 scale-110' : 'bg-slate-100 text-slate-400 dark:bg-slate-900 dark:text-slate-600'}`}>
                        <Brain className="w-4 h-4 stroke-[2.5]" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block truncate">Rhythmic Breath Coach</span>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 block truncate leading-none mt-0.5">Pulsing 4-4-4 visual guide for stress reduction</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowBreathingCoach(!showBreathingCoach)}
                      aria-label="Toggle breathing guide"
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        showBreathingCoach ? 'bg-[#f26419]' : 'bg-slate-200 dark:bg-slate-800'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                          showBreathingCoach ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Advanced Aesthetic Workspace Canvas Palette */}
              <div className="bg-slate-50/70 dark:bg-slate-950/40 p-4.5 rounded-3xl border border-slate-200/50 dark:border-slate-900 space-y-3 mt-3 text-left relative overflow-hidden">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-mono text-slate-450 dark:text-slate-500 font-black tracking-widest block">
                      🌈 Aesthetic Canvas Palette
                    </span>
                    <span className="text-[9px] bg-[#f26419]/10 text-[#f26419] px-2.5 py-0.5 rounded-full font-mono font-black uppercase tracking-wider">
                      Lvl Achievements 🏆
                    </span>
                  </div>
                  <p className="text-[9.5px] text-slate-400 dark:text-slate-500 font-medium mt-1 leading-normal">Instantly shift your scholastic viewport and focus space style with level milestones:</p>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: "dark-classic", name: "Amber", class: "from-[#f26419] to-[#ff9f43]", lvl: 1, hex: "#f26419" },
                    { id: "forest", name: "Matcha", class: "from-[#10b981] to-[#6ee7b7]", lvl: 3, hex: "#10b981" },
                    { id: "crimson", name: "Crimson", class: "from-[#e11d48] to-[#fda4af]", lvl: 6, hex: "#e11d48" },
                    { id: "honey", name: "Vanilla", class: "from-[#d97706] to-[#fcd34d]", lvl: 10, hex: "#d97706" },
                    { id: "amoled", name: "OLED", class: "from-zinc-500 to-black", lvl: 15, hex: "#6366f1" },
                    { id: "cosmic", name: "Cosmic", class: "from-[#8b5cf6] to-[#d946ef]", lvl: 20, hex: "#8b5cf6" },
                    { id: "cyberpunk", name: "Tokyo", class: "from-[#ec4899] to-[#06b6d4]", lvl: 25, hex: "#ec4899" },
                    { id: "nordic", name: "Frozen", class: "from-[#0284c7] to-[#34d399]", lvl: 30, hex: "#0284c7" }
                  ].map((preset) => {
                    const userLvl = calculateStudentLevel(userXp).level;
                    const isLocked = userLvl < preset.lvl;
                    const isActive = themePreset === preset.id;

                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          if (isLocked) {
                            setToast({
                              message: `🔒 Locked Theme: Reaching Student Level ${preset.lvl} unlocks this preset! Complete study sessions to earn XP!`,
                              type: "warning"
                            });
                          } else if (onThemeSelect) {
                            onThemeSelect(preset.id);
                            setToast({
                              message: `Theme styled to ${preset.name}! enjoy your study flow ✨`,
                              type: "success"
                            });
                          }
                        }}
                        className={`p-2 rounded-xl border text-center flex flex-col items-center justify-between transition-all cursor-pointer relative group aspect-square hover:scale-105 active:scale-95 ${
                          isActive 
                            ? "bg-white dark:bg-slate-900 shadow-md border-slate-350 dark:border-slate-700" 
                            : "bg-white/50 dark:bg-[#121215]/30 border-slate-150 dark:border-slate-900 hover:bg-white dark:hover:bg-[#14141a]"
                        }`}
                        title={`${preset.name} Theme (Required Level: ${preset.lvl})`}
                      >
                        <div className={`w-6 h-6 rounded-lg bg-gradient-to-tr ${preset.class} shadow-sm flex items-center justify-center text-white relative`}>
                          {isLocked ? (
                            <Lock className="w-2.5 h-2.5 text-white/90 drop-shadow-sm" />
                          ) : isActive ? (
                            <Check className="w-3 h-3 text-white drop-shadow-sm stroke-[3]" />
                          ) : null}
                        </div>
                        <span className="text-[8px] font-mono font-black tracking-tight mt-1 truncate max-w-full leading-none">
                          {preset.name}
                        </span>
                        {isLocked && (
                          <span className="absolute -top-1 -right-1 text-[7px] font-mono font-extrabold bg-amber-500 text-white rounded px-0.5 leading-none shadow-xs">
                            L{preset.lvl}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
                </>
              )}

              {/* Today's Focus Session History List */}
              <div className="bg-slate-50/65 dark:bg-[#121215]/55 p-4.5 rounded-3xl border border-slate-200/50 dark:border-slate-850/60 mt-3.5 flex flex-col text-left">
                <div className="flex items-center justify-between mb-2.5">
                  <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    <History className="w-3.5 h-3.5 text-[#f26419]" /> Session logs today
                  </h3>
                  <span className="text-[9px] font-mono font-black text-[#f26419] bg-[#f26419]/10 px-2.5 py-0.5 rounded-full">
                    {studyLogs.filter(log => log.date === getLocalDateString()).length} saved
                  </span>
                </div>

                <div className="space-y-1.5 max-h-[120px] overflow-y-auto no-scrollbar pr-0.5">
                  {(() => {
                    const todayStr = getLocalDateString();
                    const todaysLogsFiltered = studyLogs.filter(log => log.date === todayStr);
                    if (todaysLogsFiltered.length === 0) {
                      return (
                        <div className="py-6 text-center text-slate-400 dark:text-slate-650 text-[10px] font-bold">
                          No sessions recorded today yet. Spin the timer to start logging! ⏱️
                        </div>
                      );
                    }
                    return [...todaysLogsFiltered].reverse().map((log, offsetIdx) => {
                      const subjectOfLog = subjects.find(s => s.id === log.subjectId);
                      const colorBg = subjectOfLog?.color || "bg-[#f26419]";
                      const formattedTime = log.timestamp ? new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now";

                      return (
                        <div key={log.id || offsetIdx} className="bg-white dark:bg-[#16171d] p-2.5 rounded-2xl border border-slate-100 dark:border-slate-850/50 flex items-center justify-between shadow-xs hover:border-[#f26419]/30 transition-all">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`w-2 h-2 rounded-full ${colorBg.startsWith("bg-") ? colorBg : `bg-gradient-to-r ${colorBg}`} shrink-0`}></span>
                            <div className="min-w-0 text-left">
                              <span className="text-[11px] font-black text-slate-800 dark:text-slate-200 block truncate">{log.subjectName}</span>
                              <span className="text-[9px] text-slate-400 font-mono font-bold block">{formattedTime}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] font-mono font-black text-[#f26419] bg-[#f26419]/5 px-2 py-0.5 rounded-lg">
                              +{log.durationMinutes}m
                            </span>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

            </div>
          </div>



        </div>
      ) : (
        /* ==================== SCREEN B: TRADITIONAL PLAN TIME OVERVIEW ==================== */
        <div className="flex-1 flex flex-col min-h-[450px]">
          {/* Timeline events panel */}
          <div className="px-6 py-3.5 flex items-center gap-3 border-b border-slate-100 dark:border-slate-900/50 bg-slate-50/50 dark:bg-transparent">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-mono font-black">All Day Agenda</span>
            <div className="flex gap-2.5 overflow-x-auto no-scrollbar py-0.5">
              {allDayEvents.map((evt, idx) => (
                <div key={idx} className="flex items-center gap-1.5 bg-slate-100 dark:bg-[#171717] px-3 py-1 rounded-full border border-slate-200 dark:border-slate-800/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 inline-block"></span>
                  <span className="text-[10px] font-bold text-slate-700 dark:text-slate-350">{evt}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ==================== FLASH5TUDY 24-HOUR RADIAL TIMELINE WHEEL ==================== */}
          <div className="px-6 py-5 border-b border-slate-250 dark:border-slate-900/40 bg-slate-50/10 dark:bg-slate-950/20 text-left">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#f26419]" /> Flash5tudy 24-Hour Focus Dial
                </h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-500 font-bold mt-0.5">Continuous hourly study grid of today's focused sessions</p>
              </div>
              <span className="text-[9px] font-mono font-black bg-gradient-to-r from-[#f26419] to-amber-500 text-white px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm animate-pulse">
                Focus Active 🚀
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              
              {/* Radial Clock Visualization */}
              <div className="md:col-span-5 flex justify-center py-2">
                <div className="relative w-44 h-44 flex items-center justify-center">
                  
                  {/* Master SVG for 24h sector dial */}
                  <svg className="w-full h-full transform -rotate-90 pointer-events-auto" viewBox="0 0 208 208">
                    {/* Ring background backing */}
                    <circle cx="104" cy="104" r="82" fill="none" className="stroke-slate-100 dark:stroke-slate-900/30" strokeWidth="20" />
                    
                    {/* Dynamic 24 Hour Arc Sectors */}
                    {hourlyStudiedSectors.map((sector) => {
                      const startAngle = sector.hour * 15 + 0.8;
                      const endAngle = (sector.hour + 1) * 15 - 0.8;
                      const hasStudied = sector.totalMinutes > 0;
                      const strokeHex = hasStudied && sector.color 
                        ? getSubjectColorHex(sector.color) 
                        : "rgba(148, 163, 184, 0.08)";
                      const pathStr = describeArc(104, 104, 82, startAngle, endAngle);
                      
                      return (
                        <path
                          key={sector.hour}
                          d={pathStr}
                          fill="none"
                          stroke={strokeHex}
                          strokeWidth={hasStudied ? "20" : "14"}
                          className={`transition-all duration-300 ${hasStudied ? 'hover:stroke-width-24 drop-shadow-xs cursor-pointer' : ''}`}
                          title={`Hour ${sector.hour}:00: ${hasStudied ? `${formatStudyTimeExact(sector.totalMinutes)} studied` : 'No study study'}`}
                        />
                      );
                    })}

                    {/* Outer ticks / labels positions */}
                    {Array.from({ length: 4 }).map((_, idx) => {
                      const labelHour = idx * 6; // 0, 6, 12, 18
                      const angle = labelHour * 15;
                      const posInner = polarToCartesian(104, 104, 98, angle);
                      return (
                        <text
                          key={labelHour}
                          x={posInner.x}
                          y={posInner.y + 3}
                          transform={`rotate(90 ${posInner.x} ${posInner.y})`}
                          className="text-[8px] font-mono fill-slate-450 dark:fill-slate-600 font-extrabold text-center select-none"
                          textAnchor="middle"
                        >
                          {labelHour === 0 ? "24h" : `${labelHour}h`}
                        </text>
                      );
                    })}
                  </svg>

                  {/* Centered stats breakdown */}
                  <div className="absolute flex flex-col items-center text-center px-4 max-w-[155px]">
                    <span className="text-[8px] font-mono uppercase tracking-wider text-slate-450 dark:text-slate-500 font-extrabold leading-none">Today</span>
                    <span className="text-sm font-mono font-black text-slate-800 dark:text-slate-100 mt-1 leading-tight text-center break-words">
                      {formatStudyTimeExact(totalFocusMinutesToday)}
                    </span>
                  </div>

                </div>
              </div>

              {/* Color guide and summary list */}
              <div className="md:col-span-7 space-y-3 shrink-0">
                <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400 font-extrabold block">Subject Focus Metrics</span>
                
                <div className="grid grid-cols-2 gap-2 max-h-[140px] overflow-y-auto no-scrollbar">
                  {subjects.map(sub => {
                    const totalMinsToday = studyLogs
                      .filter(l => l.subjectId === sub.id && l.date === getLocalDateString())
                      .reduce((acc, l) => acc + l.durationMinutes, 0);

                    const hex = getSubjectColorHex(sub.color || "bg-indigo-500");
                    const percentOfGoal = Math.min(100, Math.round((totalMinsToday / (sub.goalMinutes || 120)) * 100));

                    return (
                      <div key={sub.id} className="bg-white dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-150/40 dark:border-slate-850 flex flex-col justify-between shrink-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="w-2 rounded-full h-2 shrink-0" style={{ backgroundColor: hex }} />
                          <span className="text-[10px] font-extrabold text-slate-700 dark:text-slate-350 truncate">{sub.name}</span>
                        </div>
                        <div className="flex items-center justify-between text-[9px] font-mono font-bold mt-1.5 text-slate-500">
                          <span>{formatStudyTimeExact(totalMinsToday)} studied</span>
                          <span className="text-[8.5px] text-[#f26419]/90 font-black">{percentOfGoal}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>

          {/* Main timeline canvas */}
          <div 
            ref={timelineContainerRef}
            className="flex-1 overflow-y-auto relative no-scrollbar bg-transparent py-4"
            style={{ height: "450px" }}
          >
            <div className="relative w-full" style={{ height: `${24 * HOUR_HEIGHT}px` }}>
              {/* Subtle gridlines */}
              {hoursArray.map(({ hourVal, label }) => (
                <div 
                  key={hourVal} 
                  className="absolute w-full flex items-center" 
                  style={{ top: `${hourVal * HOUR_HEIGHT}px`, height: `0px` }}
                >
                  <div className="w-16 pl-6 text-[10px] font-mono text-slate-500 select-none text-left">
                    {label}
                  </div>
                  <div className="flex-1 border-t border-dashed border-slate-150 dark:border-slate-800/50 mr-6"></div>
                </div>
              ))}

              {/* Today's logged history blocks */}
              {studyLogs
                .filter(log => {
                  try {
                    // Match today's logs specifically
                    const todayStr = getLocalDateString();
                    return log.date === todayStr;
                  } catch (e) {
                    return false;
                  }
                })
                .map((log, index) => {
                  // Determine block intervals
                  const endTime = log.timestamp ? new Date(log.timestamp) : new Date();
                  const startTime = new Date(endTime.getTime() - log.durationMinutes * 60 * 1000);
                  const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
                  const top = startMinutes;
                  const height = Math.max(16, log.durationMinutes);
                  const subjectOfLog = subjects.find(s => s.id === log.subjectId);
                  const colorBg = subjectOfLog?.color || "bg-indigo-500";
                  
                  return (
                    <div 
                      key={log.id || index}
                      className={`absolute left-[74px] right-6 rounded-xl border-l-4 p-3 flex flex-col justify-center select-none overflow-hidden hover:scale-[1.002] active:scale-[0.998] transition-all z-10 ${
                        colorBg === "bg-[#f26419]" || colorBg.includes("orange") ? "bg-orange-500/10 dark:bg-orange-500/10 border-orange-500" :
                        colorBg.includes("emerald") || colorBg.includes("green") ? "bg-emerald-500/10 dark:bg-emerald-500/10 border-emerald-500" :
                        colorBg.includes("blue") ? "bg-blue-500/10 dark:bg-blue-500/10 border-blue-500" :
                        colorBg.includes("purple") || colorBg.includes("violet") ? "bg-purple-500/10 dark:bg-purple-500/10 border-purple-500" :
                        colorBg.includes("indigo") ? "bg-indigo-500/10 dark:bg-indigo-500/10 border-indigo-500" :
                        colorBg.includes("rose") || colorBg.includes("pink") || colorBg.includes("red") ? "bg-rose-500/10 dark:bg-rose-500/10 border-rose-500" :
                        colorBg.includes("teal") || colorBg.includes("cyan") ? "bg-teal-500/10 dark:bg-teal-500/10 border-teal-500" :
                        "bg-indigo-500/10 dark:bg-indigo-500/10 border-indigo-500"
                      } border-slate-200 dark:border-transparent`}
                      style={{ top: `${top}px`, height: `${height}px` }}
                      title={`${log.subjectName}: ${formatStudyTimeExact(log.durationMinutes)} studied`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="font-sans font-extrabold text-[11px] text-slate-800 dark:text-slate-200 truncate flex items-center gap-1.5">
                          <span className={`w-2.5 h-2.5 rounded-full ${colorBg.startsWith("bg-") ? colorBg : `bg-gradient-to-r ${colorBg}`}`}></span>
                          {log.subjectName}
                        </span>
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 border border-slate-205 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                          {formatStudyTimeExact(log.durationMinutes)}
                        </span>
                      </div>
                    </div>
                  );
                })
              }

              {/* Live Growing/Ticking Study candleshine line */}
              {isStudying && activeSeconds > 0 && (
                (() => {
                  const elapsedMinutes = activeSeconds / 60;
                  const now = new Date();
                  const elapsedMs = activeSeconds * 1000;
                  const start = new Date(now.getTime() - elapsedMs);
                  const startMinutes = start.getHours() * 60 + start.getMinutes();
                  const top = startMinutes;
                  const height = Math.max(16, elapsedMinutes);
                  const targetSubject = subjects.find(s => s.id === activeSubjectId) || subjects[0];
                  
                  return (
                    <div 
                      className="absolute left-[74px] right-6 rounded-xl border-l-4 p-3 flex flex-col justify-center select-none overflow-hidden border-[#f26419] bg-gradient-to-r from-[#f26419]/20 via-[#f26419]/5 to-transparent animate-pulse z-15"
                      style={{ top: `${top}px`, height: `${height}px` }}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="font-sans font-black text-[11px] text-[#f26419] truncate flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#f26419] animate-ping"></span>
                          {targetSubject?.name || "Active Session"} (Studying Live...)
                        </span>
                        <span className="text-[10px] font-mono font-black px-1.5 py-0.5 rounded bg-[#f26419] text-white shadow-sm">
                          {formatTickingTime(activeSeconds)}
                        </span>
                      </div>
                    </div>
                  );
                })()
              )}

              {/* Live Current Time marker overlay */}
              <div 
                className="absolute left-0 right-0 flex items-center z-20 pointer-events-none transition-all duration-1000"
                style={{ top: `${currentTimeOffset}px` }}
              >
                <div className="w-16 flex justify-start pl-6">
                  <span className="bg-[#f26419] text-white font-mono text-[9px] font-black leading-none px-1.5 py-0.5 rounded-sm shadow-sm">
                    {currentTimeLabel}
                  </span>
                </div>
                <div className="flex-1 h-0.5 bg-[#f26419] mr-6"></div>
              </div>
            </div>
          </div>

          {/* Floating bottom widget in schedule mode */}
          <div className="absolute bottom-6 left-0 right-0 flex justify-center z-30">
            <button
              onClick={() => setShowSubjectsModal(true)}
              className="flex items-center gap-3 bg-white/95 text-[#0a0a0a] shadow-lg rounded-full py-3 px-6 hover:scale-103 active:scale-97 cursor-pointer border border-slate-200/50 select-none font-bold text-xs"
            >
              {isStudying ? (
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
              ) : (
                <Play className="w-3.5 h-3.5 fill-current stroke-none text-[#0d0d0d]" />
              )}
              <span className="font-mono text-base font-black tracking-tight">{formatTickingTime(activeSeconds)}</span>
            </button>
          </div>
        </div>
      )}

      {/* Floating Subjects List Popover Form */}
      {showSubjectsModal && (
        <div className="fixed inset-0 bg-[#0a0a0ade] backdrop-blur-md flex items-center justify-center p-5 z-50 animate-fade-in text-slate-800 dark:text-slate-100 leading-normal">
          <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-slate-800/90 rounded-3xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90%] shadow-xl">
            {/* Modal header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800/15 text-left">
              <h3 className="font-black text-xs uppercase tracking-wider text-[#f26419]">Class Configuration</h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsEditingSubjectsList(!isEditingSubjectsList)}
                  className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors bg-slate-100 dark:bg-slate-800/40 hover:bg-slate-200 dark:hover:bg-slate-800 px-3 py-1 rounded-full cursor-pointer"
                >
                  <Edit className="w-3 h-3" />
                  {isEditingSubjectsList ? "Done" : "New subject"}
                </button>
                <button 
                  onClick={() => {
                    setShowSubjectsModal(false);
                    setIsEditingSubjectsList(false);
                  }}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                >
                  <span className="font-sans font-semibold text-sm">✕</span>
                </button>
              </div>
            </div>

            {/* Modal list elements */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3.5 max-h-[300px]">
              
              {isEditingSubjectsList && (
                <div className="bg-slate-100 dark:bg-[#1a1a1a] rounded-2xl p-4 border border-slate-200 dark:border-slate-800 space-y-3 text-left">
                  <p className="text-xs text-slate-550 dark:text-slate-400 font-semibold uppercase">Add New subject</p>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="e.g., Organic chemistry" 
                      value={newSubjectName}
                      onChange={(e) => setNewSubjectName(e.target.value)}
                      className="flex-1 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-505 text-slate-800 dark:text-slate-100"
                    />
                    <button 
                      onClick={handleCreateSubject}
                      className="bg-[#f26419] px-4 py-2 rounded-xl text-xs font-black text-white hover:opacity-90 cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {colorOptions.map((c) => (
                      <button
                        key={c.bg}
                        onClick={() => setNewSubjectColor(c.bg)}
                        className={`w-6 h-6 rounded-full ${c.bg} flex items-center justify-center cursor-pointer border ${newSubjectColor === c.bg ? 'border-white' : 'border-transparent'}`}
                      >
                        {newSubjectColor === c.bg && <Check className="w-3 h-3 text-white" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {subjects.map((sub) => {
                const isCurrentActive = activeSubjectId === sub.id;
                const liveMins = sub.totalMinutes + (isCurrentActive && isStudying ? activeSeconds / 60 : 0);
                const matchesColor = colorOptions.find(c => sub.color.includes(c.bg.replace("bg-", ""))) || colorOptions[0];
                return (
                  <div key={sub.id} className="flex items-center justify-between bg-slate-50 dark:bg-[#161616] p-3 rounded-2xl border border-slate-200 dark:border-slate-800/40 text-left">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          handleStartStudy(sub.id);
                          setShowSubjectsModal(false);
                        }}
                        className={`w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-all ${sub.color.startsWith("bg-") ? sub.color : `bg-gradient-to-r ${sub.color}`} text-white hover:scale-105 active:scale-95`}
                      >
                        {isStudying && isCurrentActive ? (
                          <Pause className="w-4 h-4 fill-current stroke-none" />
                        ) : (
                          <Play className="w-4 h-4 fill-current stroke-none ml-0.5" />
                        )}
                      </button>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{sub.name}</p>
                        <p className="text-[10px] font-mono text-slate-400">Ready to study</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono font-bold text-slate-700 dark:text-slate-350">{formatSubjectMinutes(liveMins)}</span>
                      {isEditingSubjectsList && (
                        <button 
                          onClick={() => handleDeleteSubject(sub.id)}
                          className="bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/10 hover:bg-rose-500 hover:text-white transition-all text-[9px] font-black px-2 py-1 rounded-md cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Bottom Session Controls */}
            <div className="p-5 border-t border-slate-200 dark:border-slate-800/20 bg-slate-50 dark:bg-[#121212]/50 flex items-center justify-between">
              {isStudying ? (
                <div className="flex flex-col text-left">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-rose-600 dark:text-rose-400 animate-pulse">STOPWATCH RUNNING</span>
                  <span className="text-xs font-semibold truncate max-w-[130px] text-slate-800 dark:text-slate-100">{subjects.find(s => s.id === activeSubjectId)?.name}</span>
                </div>
              ) : (
                <span className="text-xs text-slate-550">No active stopwatch ticking</span>
              )}

              <div className="flex gap-2">
                {activeSeconds > 0 && (
                  <button 
                    onClick={handleStopAndSave}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer shadow-md"
                  >
                    Finish Session ({formatStudyTimeExact(activeSeconds / 60)})
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Level progression popup modal */}
      {showLevelGuide && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 z-50 animate-fade-in text-white leading-normal">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden relative">
            
            {/* Header section with gradient */}
            <div className="p-6 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3 text-left">
                <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/20">
                  <Award className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <span className="text-[10px] bg-amber-500/10 text-amber-400 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Student Milestones
                  </span>
                  <h3 className="text-base font-black text-white mt-1 antialiased uppercase tracking-wide">
                    Study XP Rank & Level Guide
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLevelGuide(false)}
                className="p-2 hover:bg-slate-800 rounded-xl transition-all cursor-pointer border border-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current status display banner */}
            <div className="p-5.5 bg-slate-950/50 border-b border-slate-850 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-left w-full sm:w-auto">
                <div className="h-16 w-16 bg-slate-900 border-2 border-amber-500 rounded-2xl flex items-center justify-center text-2xl font-black shrink-0 relative shadow-inner">
                  <span>{calculateStudentLevel(userXp).rank.split(" ").slice(-1)[0]}</span>
                  <div className="absolute -bottom-1.5 -right-1.5 bg-amber-500 text-[10px] font-black font-mono text-white px-1.5 py-0.5 rounded-md leading-none">
                    Lvl {calculateStudentLevel(userXp).level}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-100">{calculateStudentLevel(userXp).rank}</h4>
                  <p className="text-xs text-slate-400 mt-1 font-mono font-medium">
                    Total Earned Score: <span className="text-[#f26419] font-bold">{userXp} XP</span>
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Next level triggers in <span className="text-indigo-400 font-bold">{calculateStudentLevel(userXp).nextLevelXpRemaining} XP</span> (10 XP per minute studied)
                  </p>
                </div>
              </div>

              {/* Progress bar info */}
              <div className="w-full sm:w-48 space-y-1 text-left">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                  <span>Level progress</span>
                  <span>{calculateStudentLevel(userXp).percent}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-950 border border-slate-800/80 rounded-full overflow-hidden p-[1px]">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-500 to-indigo-500 rounded-full transition-all duration-750 font-medium" 
                    style={{ width: `${calculateStudentLevel(userXp).percent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Scrollable List grid of 20 levels */}
            <div className="p-6 overflow-y-auto space-y-3 flex-1 no-scrollbar bg-slate-900/40">
              <div className="text-left space-y-1 mb-4">
                <p className="text-[10px] uppercase tracking-widest font-black text-[#f26419]">
                  XP Milestones & Specialized Perk Integrations
                </p>
                <p className="text-xs text-slate-400">
                  Select color themes, buzzer ringtones, and priority cloud diagnostic tools unlock naturally as your academic XP gains accumulate.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {ALL_STUDENT_LEVELS.map((tier) => {
                  const isCurrent = calculateStudentLevel(userXp).level === tier.level;
                  const isUnlocked = calculateStudentLevel(userXp).level >= tier.level;
                  
                  return (
                    <div 
                      key={tier.level}
                      className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between text-left gap-3.5 ${
                        isCurrent 
                          ? "bg-slate-950/25 shadow-lg" 
                          : isUnlocked 
                          ? "bg-slate-950/30 border-slate-800/60 opacity-85 hover:opacity-100" 
                          : "bg-slate-950/70 border-slate-900/60 opacity-60"
                      }`}
                      style={
                        isCurrent 
                          ? { borderColor: themeHexAccent, boxShadow: `0 4px 18px -4px ${themeHexAccent}30` } 
                          : {}
                      }
                    >
                      {/* Left: Badge, Level & Rank name */}
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{tier.badge}</span>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span 
                              className="text-xs font-mono font-bold px-2 py-0.5 rounded"
                              style={{ color: themeHexAccent, backgroundColor: `${themeHexAccent}15` }}
                            >
                              Level {tier.level}
                            </span>
                            <h5 className="font-bold text-sm text-slate-100">{tier.rank}</h5>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{tier.perk}</p>
                        </div>
                      </div>

                      {/* Right: Lock Status */}
                      <div className="shrink-0 text-left md:text-right">
                        {isCurrent ? (
                          <span 
                            className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-md border"
                            style={{ color: themeHexAccent, borderColor: `${themeHexAccent}40`, backgroundColor: `${themeHexAccent}12` }}
                          >
                            ACTIVE
                          </span>
                        ) : isUnlocked ? (
                          <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md">UNLOCKED</span>
                        ) : (
                          <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-850 border border-slate-800 px-2.5 py-1 rounded-md">LOCKED ({tier.xpRequired.toLocaleString()} XP)</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      )}



    </div>
  );
}
