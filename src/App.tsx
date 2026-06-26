import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Clock, Users, ClipboardList, TrendingUp, Sparkles, BookOpen, Award, Flame, CloudLightning, LogOut, LogIn, Home, ClipboardCheck, Calendar, Bell, Sun, Moon, Laptop, Layers, Maximize2, Minimize2, Mail, Lock, X, Info, User as UserIcon, Eye, EyeOff, ChevronLeft, Target, Expand, Shrink, ExternalLink } from "lucide-react";
import { Subject, Task, StudyLog, Reminder, GiftReward, XpGainLog, QuestChallenge, NotificationSettings, calculateStudentLevel, ALL_STUDENT_LEVELS, getXpRateForLevel, formatStudyTimeExact } from "./types";
import { INITIAL_SUBJECTS, INITIAL_CLASSMATES } from "./data";
import RewardSystem from "./components/RewardSystem";
import { 
  collection, 
  doc, 
  getDoc,
  setDoc, 
  deleteDoc, 
  getDocs, 
  getDocFromServer,
  onSnapshot
} from "firebase/firestore";
import { db, auth, initAuth, googleSignIn, logout, getAccessToken, emailPasswordSignUp, emailPasswordSignIn, resetUserPassword, verifyUserEmail } from "./lib/googleApi";
import { User } from "firebase/auth";
import { secureStorage } from "./lib/crypto";

// Import modules
import TargetRoadmap from "./components/TargetRoadmap";
import PlannerHub from "./components/PlannerHub";
import AnalyticsDashboard from "./components/AnalyticsDashboard";
import AICoachCard from "./components/AICoachCard";
import WorkspaceHub from "./components/WorkspaceHub";

// Custom Flash5tudy-themed modules
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


// Full spectrum adaptive theme presets mapping for the ultimate visual "Aura"
export const THEME_PRESET_STYLES: Record<string, {
  name: string;
  primary: string;
  gradientText: string;
  accentBg: string;
  accentText: string;
  accentBorder: string;
  badge: string;
  glowClass: string;
  glowText: string;
  gradient: string;
  sideBg: string;
  panelGlass: string;
  interactiveBg: string;
  auraRing: string;
}> = {
  "forest": {
    name: "Matcha Forest & Mint",
    primary: "#10b981",
    gradientText: "bg-gradient-to-r from-emerald-600 via-teal-500 to-green-600 bg-clip-text text-transparent dark:from-emerald-400 dark:via-teal-350 dark:to-green-400",
    accentBg: "bg-[#10b981]",
    accentText: "text-[#10b981]",
    accentBorder: "border-[#10b981]/25 dark:border-[#10b981]/40",
    badge: "bg-[#10b981]/15 text-[#10b981] border-[#10b981]/30",
    glowClass: "shadow-lg shadow-emerald-500/10 dark:shadow-[#10b981]/15 hover:shadow-emerald-500/20",
    glowText: "text-emerald-500 [text-shadow:0_0_8px_rgba(16,185,129,0.4)]",
    gradient: "from-emerald-500 via-teal-400 to-green-600",
    sideBg: "bg-[#05100c] dark:bg-[#040c09]",
    panelGlass: "backdrop-blur-xl border-emerald-900/15 dark:border-emerald-950/45 bg-emerald-50/15 dark:bg-emerald-950/10",
    interactiveBg: "hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20",
    auraRing: "ring-2 ring-emerald-500/30 ring-offset-2 ring-offset-emerald-950"
  },
  "crimson": {
    name: "Sunset Crimson & Cherry",
    primary: "#e11d48",
    gradientText: "bg-gradient-to-r from-rose-600 via-red-500 to-pink-600 bg-clip-text text-transparent dark:from-rose-400 dark:via-red-400 dark:to-pink-400",
    accentBg: "bg-[#e11d48]",
    accentText: "text-[#e11d48]",
    accentBorder: "border-[#e11d48]/25 dark:border-[#e11d48]/40",
    badge: "bg-[#e11d48]/15 text-[#e11d48] border-[#e11d48]/30",
    glowClass: "shadow-lg shadow-rose-500/10 dark:shadow-[#e11d48]/15 hover:shadow-rose-500/20",
    glowText: "text-rose-500 [text-shadow:0_0_8px_rgba(225,29,72,0.4)]",
    gradient: "from-rose-500 via-red-400 to-pink-600",
    sideBg: "bg-[#120102] dark:bg-[#0c0101]",
    panelGlass: "backdrop-blur-xl border-rose-900/15 dark:border-rose-950/45 bg-rose-50/15 dark:bg-rose-950/10",
    interactiveBg: "hover:bg-rose-50/40 dark:hover:bg-rose-950/20",
    auraRing: "ring-2 ring-rose-500/30 ring-offset-2 ring-offset-rose-950"
  },
  "honey": {
    name: "Amber Honey & Vanilla",
    primary: "#d97706",
    gradientText: "bg-gradient-to-r from-amber-600 via-yellow-500 to-orange-600 bg-clip-text text-transparent dark:from-amber-400 dark:via-yellow-450 dark:to-orange-400",
    accentBg: "bg-[#d97706]",
    accentText: "text-[#d97706]",
    accentBorder: "border-[#d97706]/25 dark:border-[#d97706]/40",
    badge: "bg-[#d97706]/15 text-[#d97706] border-[#d97706]/30",
    glowClass: "shadow-lg shadow-amber-500/10 dark:shadow-[#d97706]/15 hover:shadow-amber-500/20",
    glowText: "text-amber-550 dark:text-amber-400 [text-shadow:0_0_8px_rgba(217,119,6,0.4)]",
    gradient: "from-amber-500 via-yellow-405 to-orange-600",
    sideBg: "bg-[#160e02] dark:bg-[#0f0a01]",
    panelGlass: "backdrop-blur-xl border-amber-900/15 dark:border-amber-950/45 bg-amber-50/15 dark:bg-amber-950/10",
    interactiveBg: "hover:bg-amber-50/40 dark:hover:bg-amber-950/20",
    auraRing: "ring-2 ring-amber-500/30 ring-offset-2 ring-offset-amber-950"
  },
  "amoled": {
    name: "Modern High Contrast / OLED",
    primary: "#6366f1",
    gradientText: "bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-600 bg-clip-text text-transparent dark:from-blue-400 dark:via-indigo-400 dark:to-violet-400",
    accentBg: "bg-[#6366f1]",
    accentText: "text-[#6366f1]",
    accentBorder: "border-slate-200/90 dark:border-slate-800/90",
    badge: "bg-[#6366f1]/15 text-[#6366f1] border-slate-350 dark:border-slate-805",
    glowClass: "shadow-lg shadow-indigo-500/10 dark:shadow-[#6366f1]/15 hover:shadow-indigo-500/20",
    glowText: "text-indigo-550 dark:text-indigo-400 [text-shadow:0_0_8px_rgba(99,102,241,0.4)]",
    gradient: "from-blue-600 via-indigo-500 to-violet-650",
    sideBg: "bg-black dark:bg-black",
    panelGlass: "backdrop-blur-xl border-slate-200 dark:border-slate-900 bg-white dark:bg-[#020202]",
    interactiveBg: "hover:bg-slate-50 dark:hover:bg-slate-950",
    auraRing: "ring-2 ring-indigo-500/35 ring-offset-2 ring-offset-black"
  },
  "cosmic": {
    name: "Cosmic Nebula & Obsidian",
    primary: "#8b5cf6",
    gradientText: "bg-gradient-to-r from-violet-600 via-fuchsia-500 to-indigo-600 bg-clip-text text-transparent dark:from-violet-400 dark:via-fuchsia-400 dark:to-indigo-405",
    accentBg: "bg-[#8b5cf6]",
    accentText: "text-[#8b5cf6]",
    accentBorder: "border-[#8b5cf6]/25 dark:border-[#8b5cf6]/40",
    badge: "bg-[#8b5cf6]/15 text-[#8b5cf6] border-[#8b5cf6]/30",
    glowClass: "shadow-lg shadow-violet-500/10 dark:shadow-[#8b5cf6]/20 hover:shadow-violet-500/25",
    glowText: "text-violet-500 dark:text-violet-350 [text-shadow:0_0_10px_rgba(139,92,246,0.5)]",
    gradient: "from-violet-505 via-fuchsia-500 to-indigo-605",
    sideBg: "bg-[#070512] dark:bg-[#04030a]",
    panelGlass: "backdrop-blur-xl border-[#8b5cf6]/20 dark:border-[#3b0764]/40 bg-[#f5f3f9]/30 dark:bg-[#070512]/40",
    interactiveBg: "hover:bg-[#8b5cf6]/10 dark:hover:bg-[#3b0764]/20",
    auraRing: "ring-2 ring-violet-500/40 ring-offset-2 ring-offset-[#070512]"
  },
  "cyberpunk": {
    name: "Tokyo Cyberpunk Neon & Grid",
    primary: "#ec4899",
    gradientText: "bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent dark:from-pink-400 dark:via-purple-400 dark:to-cyan-400",
    accentBg: "bg-[#ec4899]",
    accentText: "text-[#ec4899]",
    accentBorder: "border-[#ec4899]/30 dark:border-[#ec4899]/40",
    badge: "bg-[#ec4899]/15 text-[#ec4899] border-[#ec4899]/30",
    glowClass: "shadow-lg shadow-pink-550/15 dark:shadow-[#ec4899]/25 hover:shadow-pink-550/30",
    glowText: "text-pink-500 dark:text-pink-350 [text-shadow:0_0_12px_rgba(236,72,153,0.6)]",
    gradient: "from-pink-500 via-purple-500 to-cyan-500",
    sideBg: "bg-[#09050d] dark:bg-[#050308]",
    panelGlass: "backdrop-blur-xl border-pink-500/20 dark:border-[#4a044e]/40 bg-[#faf5fa]/30 dark:bg-[#09050d]/40",
    interactiveBg: "hover:bg-pink-500/10 dark:hover:bg-[#4a044e]/20",
    auraRing: "ring-2 ring-pink-500/45 ring-offset-2 ring-offset-[#09050d]"
  },
  "nordic": {
    name: "Nordic Frost & Aurora Blue",
    primary: "#0284c7",
    gradientText: "bg-gradient-to-r from-[#0284c7] via-cyan-500 to-emerald-500 bg-clip-text text-transparent dark:from-[#38bdf8] dark:via-cyan-400 dark:to-emerald-400",
    accentBg: "bg-[#0284c7]",
    accentText: "text-[#0284c7]",
    accentBorder: "border-[#0284c7]/25 dark:border-[#0284c7]/40",
    badge: "bg-[#0284c7]/15 text-[#0284c7] border-[#0284c7]/30",
    glowClass: "shadow-lg shadow-sky-500/10 dark:shadow-[#0284c7]/15 hover:shadow-sky-500/20",
    glowText: "text-sky-500 dark:text-sky-350 [text-shadow:0_0_8px_rgba(2,132,199,0.4)]",
    gradient: "from-[#0284c7] via-cyan-400 to-emerald-500",
    sideBg: "bg-[#0b1016] dark:bg-[#070b0f]",
    panelGlass: "backdrop-blur-xl border-[#0284c7]/20 dark:border-[#1e293b]/40 bg-[#f0f4f8]/30 dark:bg-[#0b1016]/40",
    interactiveBg: "hover:bg-sky-50/40 dark:hover:bg-slate-900/40",
    auraRing: "ring-2 ring-[#0284c7]/30 ring-offset-2 ring-offset-[#0b1016]"
  },
  "dark-classic": {
    name: "Classic Steel & Amber",
    primary: "#f26419",
    gradientText: "bg-gradient-to-r from-[#f26419] via-[#f34825] to-[#ff9f43] bg-clip-text text-transparent dark:from-[#ff7a2e] dark:via-[#f34825] dark:to-[#ffb26b]",
    accentBg: "bg-[#f26419]",
    accentText: "text-[#f26419]",
    accentBorder: "border-[#f26419]/25 dark:border-[#f26419]/40",
    badge: "bg-[#f26419]/15 text-[#f26419] border-[#f26419]/30",
    glowClass: "shadow-lg shadow-orange-550/10 dark:shadow-[#f26419]/15 hover:shadow-orange-550/20",
    glowText: "text-[#f26419] [text-shadow:0_0_8px_rgba(242,100,25,0.4)]",
    gradient: "from-[#f26419] via-[#f34825] to-[#ff9f43]",
    sideBg: "bg-[#08080c] dark:bg-[#040406]",
    panelGlass: "backdrop-blur-xl border-slate-200/50 dark:border-slate-800/80 bg-white/70 dark:bg-[#0c0d10]/95",
    interactiveBg: "hover:bg-slate-100/55 dark:hover:bg-slate-900/40",
    auraRing: "ring-2 ring-[#f26419]/30 ring-offset-2 ring-offset-[#08080c]"
  }
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

  const [activeTab, setActiveTab] = useState<"focus" | "target-suite" | "planner" | "analytics" | "ai-coach" | "workspace" | "calendar" | "reminders" | "rewards">("focus");
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Flash5tudy configuration overlays
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [themePreset, setThemePreset] = useState(() => localStorage.getItem("f5_theme_preset") || "dark-classic");
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
  const [isFirebaseConnected, setIsFirebaseConnected] = useState<boolean | null>(null);
  const [lastNotifiedLevel, setLastNotifiedLevel] = useState<number | null>(() => {
    const val = localStorage.getItem("study_last_notified_level_guest");
    return val ? parseInt(val, 10) : null;
  });
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
      case "cosmic":
        return {
          blob1: isLight
            ? "bg-gradient-to-tr from-violet-205/35 to-indigo-205/35 opacity-80"
            : "bg-gradient-to-tr from-violet-950/40 to-indigo-900/40 opacity-100",
          blob2: isLight
            ? "bg-gradient-to-br from-fuchsia-200/25 to-blue-200/35 opacity-70"
            : "bg-gradient-to-br from-fuchsia-950/25 to-indigo-950/30 opacity-100",
          blob3: isLight
            ? "bg-gradient-to-tl from-purple-200/45 to-indigo-200/40 opacity-80"
            : "bg-gradient-to-tl from-[#7c3aed]/15 to-purple-950/25 opacity-100"
        };
      case "cyberpunk":
        return {
          blob1: isLight
            ? "bg-gradient-to-tr from-pink-200/30 to-cyan-200/30 opacity-80"
            : "bg-gradient-to-tr from-fuchsia-950/45 to-cyan-950/45 opacity-105",
          blob2: isLight
            ? "bg-gradient-to-br from-fuchsia-200/35 to-teal-200/35 opacity-80"
            : "bg-gradient-to-br from-purple-950/45 to-emerald-950/30 opacity-100",
          blob3: isLight
            ? "bg-gradient-to-tl from-cyan-100/45 to-pink-200/45 opacity-85"
            : "bg-gradient-to-tl from-[#e879f9]/20 to-teal-950/25 opacity-100"
        };
      case "nordic":
        return {
          blob1: isLight
            ? "bg-gradient-to-tr from-[#93c5fd]/35 to-[#a5f3fc]/30 opacity-80"
            : "bg-gradient-to-tr from-[#1e3a8a]/25 to-[#155e75]/25 opacity-100",
          blob2: isLight
            ? "bg-gradient-to-br from-[#e0f2fe]/40 to-[#e0f7fa]/35 opacity-80"
            : "bg-gradient-to-br from-[#0f172a]/45 to-[#0e4429]/20 opacity-100",
          blob3: isLight
            ? "bg-gradient-to-tl from-[#93c5fd]/25 to-[#99f6e4]/30 opacity-80"
            : "bg-gradient-to-tl from-[#1e40af]/15 to-[#134e5e]/25 opacity-100"
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

  const currentThemeStyle = useMemo(() => {
    return THEME_PRESET_STYLES[themePreset] || THEME_PRESET_STYLES["dark-classic"];
  }, [themePreset]);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullscreenModal, setShowFullscreenModal] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(
        !!(
          document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).mozFullScreenElement ||
          (document as any).msFullscreenElement
        )
      );
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
    };
  }, []);

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
      const docEl = document.documentElement as any;
      const requestFS = docEl.requestFullscreen || 
                        docEl.webkitRequestFullscreen || 
                        docEl.mozRequestFullScreen || 
                        docEl.msRequestFullscreen;

      if (requestFS) {
        requestFS.call(docEl)
          .then(() => {
            setIsFullscreen(true);
          })
          .catch((err: any) => {
            console.warn("Fullscreen request blocked/failed:", err);
            setShowFullscreenModal(true);
          });
      } else {
        setShowFullscreenModal(true);
      }
    } else {
      const doc = document as any;
      const exitFS = doc.exitFullscreen || 
                     doc.webkitExitFullscreen || 
                     doc.mozCancelFullScreen || 
                     doc.msExitFullscreen;
      if (exitFS) {
        exitFS.call(doc);
        setIsFullscreen(false);
      }
    }
  };

  const [isWideHud, setIsWideHud] = useState(() => {
    const local = localStorage.getItem("f5_wide_hud");
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
  const [levelUpModal, setLevelUpModal] = useState<{ oldLevel: number; newLevel: number } | null>(null);

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

  // Flash5tudy Lobby real-time states
  const [joinedRoomId, setJoinedRoomId] = useState<string | null>(() => {
    return localStorage.getItem("f5_joined_room_id");
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
    const isStudyingVal = localStorage.getItem("study_is_studying") === "true";
    const sessionType = localStorage.getItem("study_active_timer_type") || localStorage.getItem("study_timer_type") || "stopwatch";
    if (isStudyingVal && (sessionType === "stopwatch" || sessionType === "custom")) {
      const rawStartTime = localStorage.getItem("study_start_time_ms");
      const rawBaseline = localStorage.getItem("study_seconds_baseline");
      if (rawStartTime) {
        const startTimeMs = parseInt(rawStartTime, 10);
        const baselineSecs = rawBaseline ? parseInt(rawBaseline, 10) : 0;
        const elapsed = Math.floor((Date.now() - startTimeMs) / 1000);
        return baselineSecs + elapsed;
      }
    }
    const s = localStorage.getItem("study_active_seconds_user");
    return s ? parseInt(s, 10) : 0;
  });

  // Precise background-resilient timestamp tracking state
  const activeTimerTypeRef = useRef<"stopwatch" | "pomodoro" | "custom" | null>(null);

  const [studyStartTime, setStudyStartTime] = useState<number | null>(() => {
    const isStudyingVal = localStorage.getItem("study_is_studying") === "true";
    if (isNewDayOnStart || !isStudyingVal) {
      localStorage.removeItem("study_start_time_ms");
      localStorage.removeItem("study_seconds_baseline");
      localStorage.removeItem("study_active_timer_type");
      return null;
    }
    const val = localStorage.getItem("study_start_time_ms");
    return val ? parseInt(val, 10) : null;
  });

  const [studySecondsBaseline, setStudySecondsBaseline] = useState<number>(() => {
    const isStudyingVal = localStorage.getItem("study_is_studying") === "true";
    if (isNewDayOnStart || !isStudyingVal) {
      localStorage.removeItem("study_start_time_ms");
      localStorage.removeItem("study_seconds_baseline");
      localStorage.removeItem("study_active_timer_type");
      return 0;
    }
    const val = localStorage.getItem("study_seconds_baseline");
    return val ? parseInt(val, 10) : 0;
  });

  // Root Study Timer / Pomodoro configurations
  const [timerType, setTimerType] = useState<"stopwatch" | "pomodoro" | "custom">(() => {
    return (localStorage.getItem("study_timer_type") as "stopwatch" | "pomodoro" | "custom") || "stopwatch";
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
    const isStudyingVal = localStorage.getItem("study_is_studying") === "true";
    const sessionType = localStorage.getItem("study_active_timer_type") || localStorage.getItem("study_timer_type") || "stopwatch";
    if (isStudyingVal && sessionType === "pomodoro") {
      const rawStartTime = localStorage.getItem("study_start_time_ms");
      const rawBaseline = localStorage.getItem("study_seconds_baseline");
      if (rawStartTime) {
        const startTimeMs = parseInt(rawStartTime, 10);
        const baselineSecs = rawBaseline ? parseInt(rawBaseline, 10) : 25 * 60;
        const elapsed = Math.floor((Date.now() - startTimeMs) / 1000);
        return Math.max(0, baselineSecs - elapsed);
      }
    }
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

  // Sync Master Config adjustments to cloud only once upon authentic adjustments
  useEffect(() => {
    if (currentUser) {
      setDoc(doc(db, "users", currentUser.uid), {
        timerType,
        pomoFocusDuration,
        pomoShortBreakDuration,
        pomoLongBreakDuration
      }, { merge: true })
        .catch(e => console.warn("Failed syncing timer configuration to cloud:", e));
    }
  }, [timerType, pomoFocusDuration, pomoShortBreakDuration, pomoLongBreakDuration, currentUser]);

  // AI coach advice sharing state (retrieved from dynamic coach executions)
  const [aiCoachAdvice, setAiCoachAdvice] = useState<{ quote: string; rating: string; scheduleTip: string } | null>(() => {
    const local = secureStorage.getItem("study_ai_advice");
    if (local) {
      try {
        return JSON.parse(local);
      } catch (e) {
        console.warn("AI coach advice parsing error", e);
        secureStorage.setItem("study_ai_advice", "null");
      }
    }
    return null;
  });

  // 1. Core Reactive States loaded with local storage and mock seeds
  const [subjects, setSubjects] = useState<Subject[]>(() => {
    const local = secureStorage.getItem("study_subjects");
    let currentSubs: Subject[] = INITIAL_SUBJECTS;
    if (local) {
      try {
        currentSubs = JSON.parse(local);
      } catch (e) {
        console.warn("Subjects parsing error", e);
        secureStorage.setItem("study_subjects", JSON.stringify(INITIAL_SUBJECTS));
      }
    }
    if (isNewDayOnStart) {
      const resetSubs = currentSubs.map((s) => ({ ...s, totalMinutes: 0 }));
      secureStorage.setItem("study_subjects", JSON.stringify(resetSubs));
      return resetSubs;
    }
    return currentSubs;
  });

  const [tasks, setTasks] = useState<Task[]>(() => {
    if (isNewDayOnStart) {
      const local = secureStorage.getItem("study_tasks");
      let allTasks: Task[] = [];
      if (local) {
        try {
          allTasks = JSON.parse(local);
        } catch (e) {
          secureStorage.setItem("study_tasks", "[]");
        }
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
        secureStorage.setItem("study_tasks", "[]");
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
        secureStorage.setItem("study_logs", "[]");
      }
    }
    return [];
  });

  const [activeSubjectId, setActiveSubjectId] = useState<string>(() => {
    const saved = localStorage.getItem("study_active_subject_id") || secureStorage.getItem("study_active_subject_id");
    return saved || "";
  });

  useEffect(() => {
    if (activeSubjectId) {
      secureStorage.setItem("study_active_subject_id", activeSubjectId);
      localStorage.setItem("study_active_subject_id", activeSubjectId);
    } else {
      secureStorage.removeItem("study_active_subject_id");
      localStorage.removeItem("study_active_subject_id");
    }
  }, [activeSubjectId]);

  const [dailyTargetMinutes, setDailyTargetMinutes] = useState<number>(() => {
    const local = secureStorage.getItem("study_daily_target");
    return local ? parseInt(local) : 240; // 4 hours goal
  });

  // ==================== REWARD SYSTEMS STATS & CONFIGS ====================
  const [studentName, setStudentName] = useState<string>(() => {
    return secureStorage.getItem("study_student_name") || "Scholar";
  });
  const [studentClass, setStudentClass] = useState<string>(() => {
    return secureStorage.getItem("study_student_class") || "Class 12";
  });
  const [studentPrepTarget, setStudentPrepTarget] = useState<string>(() => {
    return secureStorage.getItem("study_student_prep") || "JEE";
  });

  const [userXp, setUserXp] = useState<number>(() => {
    const local = secureStorage.getItem("study_user_xp");
    return local ? parseInt(local, 10) : 0;
  });

  const studentLevelInfo = useMemo(() => {
    return calculateStudentLevel(userXp);
  }, [userXp]);

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
        secureStorage.setItem("study_quests", JSON.stringify(INITIAL_QUESTS));
      }
    }
    return INITIAL_QUESTS;
  });

  const [rewards, setRewards] = useState<GiftReward[]>(() => {
    const local = secureStorage.getItem("study_rewards");
    const defaults: GiftReward[] = [];
    if (local) {
      try {
        const parsed = JSON.parse(local) as GiftReward[];
        return parsed.filter(item => !item.id.startsWith("def-"));
      } catch (e) {
        console.warn("Rewards parsing error", e);
        secureStorage.setItem("study_rewards", JSON.stringify(defaults));
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
        secureStorage.setItem("study_xp_logs", JSON.stringify([]));
      }
    }
    return [];
  });

  const [initSyncComplete, setInitSyncComplete] = useState(false);
  const lastLevelRef = useRef<number | null>(null);
  const hasBootedRef = useRef<boolean>(false);
  const levelMonitorActiveRef = useRef<boolean>(false);

  // Buffer and stabilize level notifications for 4 seconds on initialization sync settle-down
  useEffect(() => {
    if (initSyncComplete) {
      const timer = setTimeout(() => {
        levelMonitorActiveRef.current = true;
      }, 4000);
      return () => clearTimeout(timer);
    } else {
      levelMonitorActiveRef.current = false;
    }
  }, [initSyncComplete, currentUser]);

  // Synchronous registry of completed/claiming quests to prevent double claim click race conditions
  const completedQuestsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const completedSet = new Set<string>();
    quests.forEach(q => {
      if (q.isCompleted) {
        completedSet.add(q.id);
      }
    });
    completedQuestsRef.current = completedSet;
  }, [quests]);

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
            minsToSave = state.activeSecondsUser / 60;
          } else if (state.timerType === "pomodoro" && state.pomoState === "focus") {
            const elapsedFocusSeconds = (state.pomoFocusDuration * 60) - state.pomoSecondsLeft;
            minsToSave = elapsedFocusSeconds / 60;
          }

          if (minsToSave > 0 && state.activeSubjectId) {
            handleAddStudyMinutes(state.activeSubjectId, minsToSave, lastDay).catch(() => {});
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

  // -------------- ORGANIC STUDENT LEVEL UP MONITOR --------------
  useEffect(() => {
    const currentLvl = calculateStudentLevel(userXp).level;
    
    // Persistent user-aware notified level keys prevent duplication across login sessions and page-loads
    const localKey = currentUser ? `study_last_notified_level_${currentUser.uid}` : "study_last_notified_level_guest";

    // During settlement phase or initial load, keep the states aligned silently
    if (!initSyncComplete || !levelMonitorActiveRef.current) {
      lastLevelRef.current = currentLvl;
      hasBootedRef.current = false;
      if (lastNotifiedLevel === null && currentLvl > 0) {
        setLastNotifiedLevel(currentLvl);
        localStorage.setItem(localKey, String(currentLvl));
        if (currentUser) {
          setDoc(doc(db, "users", currentUser.uid), { lastNotifiedLevel: currentLvl }, { merge: true }).catch(() => {});
        }
      }
      return;
    }

    if (!hasBootedRef.current) {
      lastLevelRef.current = currentLvl;
      hasBootedRef.current = true;
      if (lastNotifiedLevel === null || lastNotifiedLevel < currentLvl) {
        setLastNotifiedLevel(currentLvl);
        localStorage.setItem(localKey, String(currentLvl));
        if (currentUser) {
          setDoc(doc(db, "users", currentUser.uid), { lastNotifiedLevel: currentLvl }, { merge: true }).catch(() => {});
        }
      }
      return;
    }

    if (lastLevelRef.current === null) {
      lastLevelRef.current = currentLvl;
      if (lastNotifiedLevel === null) {
        setLastNotifiedLevel(currentLvl);
        localStorage.setItem(localKey, String(currentLvl));
        if (currentUser) {
          setDoc(doc(db, "users", currentUser.uid), { lastNotifiedLevel: currentLvl }, { merge: true }).catch(() => {});
        }
      }
      return;
    }

    if (currentLvl > lastLevelRef.current) {
      const oldLvl = lastLevelRef.current;
      lastLevelRef.current = currentLvl;

      // Only notify if actually higher than the peak notified level in persistence
      if (lastNotifiedLevel !== null && currentLvl <= lastNotifiedLevel) {
        return;
      }

      // Commit the peak level to local persistence
      setLastNotifiedLevel(currentLvl);
      localStorage.setItem(localKey, String(currentLvl));
      if (currentUser) {
        setDoc(doc(db, "users", currentUser.uid), { lastNotifiedLevel: currentLvl }, { merge: true }).catch(err => {
          handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}`);
        });
      }

      // LevelUp notification settings check
      if (notificationSettings.notifyOnLevelUp) {
        const title = `🏆 Level Up: Level ${currentLvl}!`;
        const text = `Outstanding focus! You have been promoted from Level ${oldLvl} to Level ${currentLvl}. High performance sparks and premium themes are now unlocked! Keep up this beautiful effort! ✨`;

        // Bar / Toast modal
        setFiredNotification(`${title} — ${text}`);

        // Visual celebration modal
        setLevelUpModal({ oldLevel: oldLvl, newLevel: currentLvl });

        // Push Alert
        showSystemNotification(title, text);

        // Sound effect
        if (notificationSettings.enableSoundEffects) {
          try {
            playChime("success");
          } catch (e) {}
          try {
            // Mixkit level up / coin reward sound block
            const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2019/2019-2019.wav");
            audio.volume = 0.45;
            audio.play().catch(() => {});
          } catch (e) {}
        }
      }
    } else if (currentLvl < lastLevelRef.current) {
      // Allow manual level reduction configs inside profile update or resets
      lastLevelRef.current = currentLvl;
      setLastNotifiedLevel(currentLvl);
      localStorage.setItem(localKey, String(currentLvl));
      if (currentUser) {
        setDoc(doc(db, "users", currentUser.uid), { lastNotifiedLevel: currentLvl }, { merge: true }).catch(() => {});
      }
    }
  }, [userXp, notificationSettings, initSyncComplete, currentUser, lastNotifiedLevel]);
  // ----------------------------------------------------------------

  // 0. Connection Test (Pillar Requirements)
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, "test", "connection"));
        setIsFirebaseConnected(true);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        const isPermissionError = errorMsg.toLowerCase().includes("permission") || 
                                  errorMsg.toLowerCase().includes("insufficient") ||
                                  errorMsg.toLowerCase().includes("denied");
        
        if (error instanceof Error && error.message.includes("offline")) {
          console.warn("Please check your Firebase configuration (client is currently offline).");
          setIsFirebaseConnected(false);
          setIsOfflineMode(true);
        } else if (isPermissionError) {
          console.info("Firebase Connection check: Online! Successfully connected to Firestore. (Authentication / Rules will unlock complete storage namespaces).");
          setIsFirebaseConnected(true);
        } else {
          console.error("Firebase connection check error:", error);
          setIsFirebaseConnected(false);
        }
      }
    }
    testConnection();
  }, []);

  // Listen to Google Sign-In persistence and load/sync with Firestore
  useEffect(() => {
    let activeUnsubs: (() => void) | null = null;

    const cleanupListeners = () => {
      if (activeUnsubs) {
        try {
          activeUnsubs();
        } catch (e) {
          console.warn("Error cleaning up real-time onSnapshot listeners:", e);
        }
        activeUnsubs = null;
      }
    };

    const unsubscribe = initAuth(
      async (user) => {
        setInitSyncComplete(false);
        hasBootedRef.current = false;
        // Stop any old snapshot listeners first
        cleanupListeners();

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
            if (userData.studentName) {
              setStudentName(userData.studentName);
              secureStorage.setItem("study_student_name", userData.studentName);
            }
            if (userData.studentClass) {
              setStudentClass(userData.studentClass);
              secureStorage.setItem("study_student_class", userData.studentClass);
            }
            if (userData.studentPrepTarget) {
              setStudentPrepTarget(userData.studentPrepTarget);
              secureStorage.setItem("study_student_prep", userData.studentPrepTarget);
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
            if (userData.lastNotifiedLevel !== undefined) {
              setLastNotifiedLevel(userData.lastNotifiedLevel);
              localStorage.setItem(`study_last_notified_level_${user.uid}`, String(userData.lastNotifiedLevel));
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
              studentName: studentName || user.displayName || "Scholar",
              studentClass: studentClass,
              studentPrepTarget: studentPrepTarget,
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
          rewardsSnap.forEach(d => {
            const r = d.data() as GiftReward;
            if (!r.id.startsWith("def-")) {
              loadedRewards.push(r);
            }
          });
          questsSnap.forEach(d => loadedQuests.push(d.data() as QuestChallenge));
          xpLogsSnap.forEach(d => loadedXpLogs.push(d.data() as XpGainLog));
          remindersSnap.forEach(d => loadedReminders.push(d.data() as Reminder));

          // Self-healing daily totalMinutes calculations based entirely on matching today's actual study logs!
          const finalSubs = loadedSubs.map(sub => {
            const todayMins = loadedLogs
              .filter(log => log.subjectId === sub.id && log.date === todayStr)
              .reduce((sum, log) => sum + log.durationMinutes, 0);
            return { ...sub, totalMinutes: todayMins };
          });

          // Reset daily quests if date changed
          const finalQuests = loadedQuests.map(q => {
            if ((cloudDayRolloverTriggered || q.isCompleted === undefined) && q.category === "daily") {
              return { ...q, isCompleted: false };
            }
            return q;
          });

          // Onboarding cloud sync (if brand new cloud account - write current offline state OR defaults in background)
          if (!userSnap.exists() && loadedSubs.length === 0) {
            // Load user B's own namespaced storage
            const localSubs = secureStorage.getItem("study_subjects");
            const localTasks = secureStorage.getItem("study_tasks");
            const localLogs = secureStorage.getItem("study_logs");
            const localXp = secureStorage.getItem("study_user_xp");
            const localRewards = secureStorage.getItem("study_rewards");
            const localQuests = secureStorage.getItem("study_quests");
            const localXpLogs = secureStorage.getItem("study_xp_logs");
            const localReminders = secureStorage.getItem("study_reminders");

            let parsedSubs: Subject[] = INITIAL_SUBJECTS;
            if (localSubs) {
              try { parsedSubs = JSON.parse(localSubs); } catch (e) {}
            }
            let parsedTasks: Task[] = [];
            if (localTasks) {
              try { parsedTasks = JSON.parse(localTasks); } catch (e) {}
            }
            let parsedLogs: StudyLog[] = [];
            if (localLogs) {
              try { parsedLogs = JSON.parse(localLogs); } catch (e) {}
            }
            let parsedRewards: GiftReward[] = [];
            if (localRewards) {
              try { parsedRewards = JSON.parse(localRewards); } catch (e) {}
            }
            let parsedQuests: QuestChallenge[] = INITIAL_QUESTS;
            if (localQuests) {
              try { parsedQuests = JSON.parse(localQuests); } catch (e) {}
            }
            let parsedXpLogs: XpGainLog[] = [];
            if (localXpLogs) {
              try { parsedXpLogs = JSON.parse(localXpLogs); } catch (e) {}
            }
            let parsedReminders: Reminder[] = [];
            if (localReminders) {
              try { parsedReminders = JSON.parse(localReminders); } catch (e) {}
            }
            const finalXp = localXp ? parseInt(localXp, 10) : 0;

            // Set states
            setSubjects(parsedSubs);
            setTasks(parsedTasks);
            setStudyLogs(parsedLogs);
            setRewards(parsedRewards);
            setQuests(parsedQuests);
            setXpLogs(parsedXpLogs);
            setUserXp(finalXp);
            if (parsedReminders.length > 0) setReminders(parsedReminders);

            // Sync these specific parsed pieces to cloud
            parsedSubs.forEach((sub) => {
              setDoc(doc(db, "users", user.uid, "subjects", sub.id), sub).catch(() => {});
            });
            parsedTasks.forEach((tsk) => {
              setDoc(doc(db, "users", user.uid, "tasks", tsk.id), tsk).catch(() => {});
            });
            parsedLogs.slice(0, 50).forEach((lg) => {
              setDoc(doc(db, "users", user.uid, "studyLogs", lg.id), lg).catch(() => {});
            });
            parsedRewards.forEach((r) => {
              setDoc(doc(db, "users", user.uid, "rewards", r.id), r).catch(() => {});
            });
            parsedQuests.forEach((q) => {
              setDoc(doc(db, "users", user.uid, "quests", q.id), q).catch(() => {});
            });
            parsedXpLogs.slice(0, 30).forEach((xlg) => {
              setDoc(doc(db, "users", user.uid, "xpLogs", xlg.id), xlg).catch(() => {});
            });
            if (parsedReminders.length > 0) {
              parsedReminders.forEach((rem) => {
                setDoc(doc(db, "users", user.uid, "reminders", rem.id), rem).catch(() => {});
              });
            }
          } else {
            // Apply loaded cloud profile (with reset/daily self-healing totals applied)
            setSubjects(finalSubs);
            setTasks(loadedTasks);
            setStudyLogs(loadedLogs);
            setRewards(loadedRewards);
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

          // --- ACTIVATE DYNAMIC REAL-TIME ON-SNAPSHOT LISTENERS ---
          // This keeps 3-4 open application tabs in perfect seamless synchronization!
          const unsubUser = onSnapshot(userDocRef, (snap) => {
            if (snap.exists()) {
              const userData = snap.data();
              if (userData.dailyTargetMinutes !== undefined) {
                setDailyTargetMinutes(userData.dailyTargetMinutes);
                secureStorage.setItem("study_daily_target", String(userData.dailyTargetMinutes));
              }
              if (userData.xp !== undefined) {
                setUserXp(userData.xp);
                secureStorage.setItem("study_user_xp", String(userData.xp));
              }
              if (userData.studentName !== undefined) {
                setStudentName(userData.studentName);
                secureStorage.setItem("study_student_name", userData.studentName);
              }
              if (userData.studentClass !== undefined) {
                setStudentClass(userData.studentClass);
                secureStorage.setItem("study_student_class", userData.studentClass);
              }
              if (userData.studentPrepTarget !== undefined) {
                setStudentPrepTarget(userData.studentPrepTarget);
                secureStorage.setItem("study_student_prep", userData.studentPrepTarget);
              }
              if (userData.themePreset !== undefined) {
                setThemePreset(userData.themePreset);
              }
              if (userData.themeMode !== undefined) {
                setThemeMode(userData.themeMode);
              }
              if (userData.timerType !== undefined) {
                setTimerType(userData.timerType);
              }
              if (userData.pomoFocusDuration !== undefined) {
                setPomoFocusDuration(userData.pomoFocusDuration);
              }
              if (userData.pomoShortBreakDuration !== undefined) {
                setPomoShortBreakDuration(userData.pomoShortBreakDuration);
              }
              if (userData.pomoLongBreakDuration !== undefined) {
                setPomoLongBreakDuration(userData.pomoLongBreakDuration);
              }
            }
          }, err => console.warn("User profile live syncer: encountered error", err));

          const unsubSubs = onSnapshot(subCol, (snap) => {
            const loadedSubs: Subject[] = [];
            snap.forEach(d => {
              loadedSubs.push(d.data() as Subject);
            });
            if (loadedSubs.length > 0) {
              setSubjects(loadedSubs);
              secureStorage.setItem("study_subjects", JSON.stringify(loadedSubs));
            }
          }, err => console.warn("Subjects live syncer: encountered error", err));

          const unsubTasks = onSnapshot(taskCol, (snap) => {
            const loadedTasks: Task[] = [];
            snap.forEach(d => {
              loadedTasks.push(d.data() as Task);
            });
            setTasks(loadedTasks);
            secureStorage.setItem("study_tasks", JSON.stringify(loadedTasks));
          }, err => console.warn("Tasks live syncer: encountered error", err));

          const unsubLogs = onSnapshot(logCol, (snap) => {
            const loadedLogs: StudyLog[] = [];
            snap.forEach(d => {
              loadedLogs.push(d.data() as StudyLog);
            });
            setStudyLogs(loadedLogs);
            secureStorage.setItem("study_logs", JSON.stringify(loadedLogs));
          }, err => console.warn("Logs live syncer: encountered error", err));

          const unsubRewards = onSnapshot(rewardsCol, (snap) => {
            const loadedRewards: GiftReward[] = [];
            snap.forEach(d => {
              const r = d.data() as GiftReward;
              if (!r.id.startsWith("def-")) {
                loadedRewards.push(r);
              }
            });
            if (loadedRewards.length > 0) {
              setRewards(loadedRewards);
              secureStorage.setItem("study_rewards", JSON.stringify(loadedRewards));
            } else {
              setRewards([]);
              secureStorage.setItem("study_rewards", JSON.stringify([]));
            }
          }, err => console.warn("Rewards live syncer: encountered error", err));

          const unsubQuests = onSnapshot(questsCol, (snap) => {
            const loadedQuests: QuestChallenge[] = [];
            snap.forEach(d => {
              loadedQuests.push(d.data() as QuestChallenge);
            });
            if (loadedQuests.length > 0) {
              setQuests(loadedQuests);
              secureStorage.setItem("study_quests", JSON.stringify(loadedQuests));
            }
          }, err => console.warn("Quests live syncer: encountered error", err));

          const unsubXpLogs = onSnapshot(xpLogsCol, (snap) => {
            const loadedXpLogs: XpGainLog[] = [];
            snap.forEach(d => {
              loadedXpLogs.push(d.data() as XpGainLog);
            });
            if (loadedXpLogs.length > 0) {
              setXpLogs(loadedXpLogs);
              secureStorage.setItem("study_xp_logs", JSON.stringify(loadedXpLogs));
            }
          }, err => console.warn("XP Logs live syncer: encountered error", err));

          const unsubReminders = onSnapshot(remindersCol, (snap) => {
            const loadedReminders: Reminder[] = [];
            snap.forEach(d => {
              loadedReminders.push(d.data() as Reminder);
            });
            if (loadedReminders.length > 0) {
              setReminders(loadedReminders);
              secureStorage.setItem("study_reminders", JSON.stringify(loadedReminders));
            }
          }, err => console.warn("Reminders live syncer: encountered error", err));

          activeUnsubs = () => {
            unsubUser();
            unsubSubs();
            unsubTasks();
            unsubLogs();
            unsubRewards();
            unsubQuests();
            unsubXpLogs();
            unsubReminders();
          };

          setInitSyncComplete(true);
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
          const localName = secureStorage.getItem("study_student_name");
          const localClass = secureStorage.getItem("study_student_class");
          const localPrep = secureStorage.getItem("study_student_prep");

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
            return { ...sub, totalMinutes: todayMins };
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

          if (localName) setStudentName(localName);
          if (localClass) setStudentClass(localClass);
          if (localPrep) setStudentPrepTarget(localPrep);

          try {
            handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
          } catch (e) {
            console.warn("Cleanly caught Firestore permission/connection error on initialization:", e);
          }
          setInitSyncComplete(true);
        }
      },
      () => {
        setInitSyncComplete(false);
        hasBootedRef.current = false;
        cleanupListeners();
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
          return { ...sub, totalMinutes: todayMins };
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
        setInitSyncComplete(true);
      }
    );
    return () => {
      cleanupListeners();
      unsubscribe();
    };
  }, []);

  // Listen to cross-tab storage changes to prevent multi-tab bypass/double-claim issues in real-time
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (!e.key) return;
      const key = e.key;
      
      if (key.startsWith("study_quests")) {
        const fresh = secureStorage.getItem("study_quests");
        if (fresh) {
          try { setQuests(JSON.parse(fresh)); } catch (err) {}
        }
      } else if (key.startsWith("study_user_xp")) {
        const fresh = secureStorage.getItem("study_user_xp");
        if (fresh) {
          const val = parseInt(fresh, 10);
          if (!isNaN(val)) setUserXp(val);
        }
      } else if (key.startsWith("study_xp_logs")) {
        const fresh = secureStorage.getItem("study_xp_logs");
        if (fresh) {
          try { setXpLogs(JSON.parse(fresh)); } catch (err) {}
        }
      } else if (key.startsWith("study_rewards")) {
        const fresh = secureStorage.getItem("study_rewards");
        if (fresh) {
          try { setRewards(JSON.parse(fresh)); } catch (err) {}
        }
      } else if (key.startsWith("study_subjects")) {
        const fresh = secureStorage.getItem("study_subjects");
        if (fresh) {
          try { setSubjects(JSON.parse(fresh)); } catch (err) {}
        }
      } else if (key.startsWith("study_tasks")) {
        const fresh = secureStorage.getItem("study_tasks");
        if (fresh) {
          try { setTasks(JSON.parse(fresh)); } catch (err) {}
        }
      } else if (key.startsWith("study_logs")) {
        const fresh = secureStorage.getItem("study_logs");
        if (fresh) {
          try { setStudyLogs(JSON.parse(fresh)); } catch (err) {}
        }
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
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
    const studiedToday = studyLogs.some(l => l.date === todayStr && l.durationMinutes > 0) || isActivelyFocusing;
    if (studiedToday) {
      uniqueDatesSet.add(todayStr);
    }

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
    localStorage.setItem("f5_theme_preset", themePreset);
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
      localStorage.setItem("f5_joined_room_id", joinedRoomId);
    } else {
      localStorage.removeItem("f5_joined_room_id");
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
    // Append log to centralized localStorage notification history list
    try {
      if (typeof window !== "undefined") {
        const rawHist = localStorage.getItem("study_notification_history");
        const arr = rawHist ? JSON.parse(rawHist) : [];
        const newLog = {
          id: `history-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          title: title,
          body: body,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          type: title.toLowerCase().includes("pomodoro") ? "pomo" : "rem"
        };
        localStorage.setItem("study_notification_history", JSON.stringify([newLog, ...arr].slice(0, 50)));
      }
    } catch (logErr) {
      console.warn("Logging notification history failure:", logErr);
    }

    if (!notificationSettings.enableDesktopBanners) return;
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      try {
        if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
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
        console.warn("System notification presentation failed, trying direct fallback:", err);
        try {
          new Notification(title, { body, icon: "/favicon.ico" });
        } catch (innerErr) {
          console.error("All notification pathways failed:", innerErr);
        }
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
  const playPomoChime = (overridePreset?: "chime" | "success" | "break") => {
    if (!notificationSettings.enableSoundEffects) return;
    try {
      playChime(overridePreset || notificationSettings.activeSoundPreset);
    } catch (e) {
      console.warn("Web audio playback bypassed due to environment constraints: ", e);
    }
  };

  // Sync activeTimerTypeRef on mount
  useEffect(() => {
    const isStudyingVal = localStorage.getItem("study_is_studying") === "true";
    if (isStudyingVal) {
      activeTimerTypeRef.current = (localStorage.getItem("study_active_timer_type") as any) || "stopwatch";
    }
  }, []);

  // Synchronize study start time and baseline when isStudyingUser toggles
  const isRecoveringRef = useRef<boolean>(false);

  // Recovery function to catch up on study sessions when returning from offline/closed tab state
  const verifyAndRecoverOfflineStudyProgress = async () => {
    if (isRecoveringRef.current) return;
    
    const isStudyingVal = localStorage.getItem("study_is_studying") === "true";
    if (!isStudyingVal) return;

    const rawStartTime = localStorage.getItem("study_start_time_ms");
    if (!rawStartTime) return;
    const startTimeMs = parseInt(rawStartTime, 10);

    const rawBaseline = localStorage.getItem("study_seconds_baseline");
    const baselineSecs = rawBaseline ? parseInt(rawBaseline, 10) : 0;

    const activeSubId = localStorage.getItem("study_active_subject_id") || secureStorage.getItem("study_active_subject_id") || activeSubjectId;
    if (!activeSubId) return;

    const rawSubs = localStorage.getItem("study_subjects") || secureStorage.getItem("study_subjects");
    let currentSubs = subjects;
    if (rawSubs) {
      try {
        currentSubs = JSON.parse(rawSubs);
      } catch (e) {}
    }
    const targetSub = currentSubs.find(s => s.id === activeSubId);
    if (!targetSub) return;

    const sessionType = localStorage.getItem("study_active_timer_type") || activeTimerTypeRef.current || timerType;
    const now = Date.now();
    const elapsedSecs = Math.floor((now - startTimeMs) / 1000);

    if (sessionType === "pomodoro") {
      isRecoveringRef.current = true;
      let tempElapsed = elapsedSecs;
      let tempPomoState = pomoState;
      let tempPomoRound = pomoRound;
      let tempSecondsLeft = baselineSecs;

      let completedFocusSessions = 0;
      let totalMinutesAdded = 0;

      while (tempElapsed >= tempSecondsLeft && tempSecondsLeft > 0) {
        tempElapsed -= tempSecondsLeft;

        if (tempPomoState === "focus") {
          completedFocusSessions++;
          totalMinutesAdded += pomoFocusDuration;
          
          if (tempPomoRound >= 4) {
            tempPomoState = "longBreak";
            tempSecondsLeft = pomoLongBreakDuration * 60;
            tempPomoRound = 1;
          } else {
            tempPomoState = "shortBreak";
            tempSecondsLeft = pomoShortBreakDuration * 60;
            tempPomoRound += 1;
          }
        } else {
          tempPomoState = "focus";
          tempSecondsLeft = pomoFocusDuration * 60;
        }
      }

      if (completedFocusSessions > 0) {
        const finalSecondsLeft = tempSecondsLeft - tempElapsed;
        
        setIsStudyingUser(false);
        localStorage.setItem("study_is_studying", "false");

        try {
          await handleAddStudyMinutes(activeSubId, totalMinutesAdded);
          
          setPomoState(tempPomoState);
          setPomoRound(tempPomoRound);
          setPomoSecondsLeft(finalSecondsLeft);
          
          const nextStartTime = Date.now();
          setStudyStartTime(nextStartTime);
          setStudySecondsBaseline(finalSecondsLeft);
          localStorage.setItem("study_start_time_ms", nextStartTime.toString());
          localStorage.setItem("study_seconds_baseline", finalSecondsLeft.toString());
          setIsStudyingUser(true);
          localStorage.setItem("study_is_studying", "true");

          const welcomeTitle = `🍅 Welcome Back! Progress Auto-Saved`;
          const welcomeBody = `While you were offline/minimized, you successfully completed ${completedFocusSessions} Pomodoro focus cycles (+${totalMinutesAdded} minutes saved under folder "${targetSub.name}")! +${Math.round(totalMinutesAdded * 10)} XP gained. Keeping you focused! 🚀`;
          
          setFiredNotification(`${welcomeTitle} ${welcomeBody}`);
          showSystemNotification(welcomeTitle, welcomeBody);

          if (notificationSettings.enableSoundEffects) {
            playPomoChime("success");
          }
        } catch (e) {
          console.error("Failed to recover offline pomodoro study logs:", e);
        }
      }
      isRecoveringRef.current = false;
    } else if (sessionType === "custom") {
      isRecoveringRef.current = true;
      const rawCustomMins = localStorage.getItem("study_custom_target_minutes");
      const customTargetMins = rawCustomMins ? parseInt(rawCustomMins, 10) : 45;
      
      const targetSecsToComplete = (customTargetMins * 60) - baselineSecs;
      if (elapsedSecs >= targetSecsToComplete) {
        setIsStudyingUser(false);
        localStorage.setItem("study_is_studying", "false");

        try {
          await handleAddStudyMinutes(activeSubId, customTargetMins);
          
          handleResetStudyTimer();

          const alertTitle = `🏆 Custom Countdown Goal Achieved!`;
          const alertBody = `While away, you successfully hit your ${customTargetMins} mins study target for your folder: ${targetSub.name}! +${customTargetMins * 10} XP earned!`;
          
          setFiredNotification(`${alertTitle} ${alertBody}`);
          showSystemNotification(alertTitle, alertBody);

          if (notificationSettings.enableSoundEffects) {
            playPomoChime("success");
          }
        } catch (e) {
          console.error("Failed to recover offline custom countdown session:", e);
        }
      }
      isRecoveringRef.current = false;
    }
  };

  // Run auto-recovery check once upon startup/mounting delay
  useEffect(() => {
    const delayCheck = setTimeout(() => {
      verifyAndRecoverOfflineStudyProgress();
    }, 1500);
    return () => clearTimeout(delayCheck);
  }, [subjects]);

  // 1. Synchronize study start time and baseline when isStudyingUser toggles
  useEffect(() => {
    if (isStudyingUser) {
      if (studyStartTime === null) {
        const now = Date.now();
        const baseline = (timerType === "stopwatch" || timerType === "custom") ? activeSecondsUser : pomoSecondsLeft;
        setStudyStartTime(now);
        setStudySecondsBaseline(baseline);
        localStorage.setItem("study_start_time_ms", now.toString());
        localStorage.setItem("study_seconds_baseline", baseline.toString());
        activeTimerTypeRef.current = timerType;
        localStorage.setItem("study_active_timer_type", timerType);
      }
    } else {
      if (studyStartTime !== null) {
        const elapsed = Math.floor((Date.now() - studyStartTime) / 1000);
        const sessionType = localStorage.getItem("study_active_timer_type") || activeTimerTypeRef.current || timerType;
        if (sessionType === "stopwatch" || sessionType === "custom") {
          setActiveSecondsUser(studySecondsBaseline + elapsed);
        } else if (sessionType === "pomodoro") {
          setPomoSecondsLeft(Math.max(0, studySecondsBaseline - elapsed));
        }
      }
      setStudyStartTime(null);
      setStudySecondsBaseline(0);
      activeTimerTypeRef.current = null;
      localStorage.removeItem("study_start_time_ms");
      localStorage.removeItem("study_seconds_baseline");
      localStorage.removeItem("study_active_timer_type");
    }
  }, [isStudyingUser]);

  // 2. Sync timer immediately when browser tab status changes or Chrome minimizes/restores
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (isStudyingUser && studyStartTime !== null) {
          verifyAndRecoverOfflineStudyProgress();
          
          const elapsed = Math.floor((Date.now() - studyStartTime) / 1000);
          const sessionType = localStorage.getItem("study_active_timer_type") || activeTimerTypeRef.current || timerType;
          if (sessionType === "stopwatch" || sessionType === "custom") {
            setActiveSecondsUser(studySecondsBaseline + elapsed);
          } else if (sessionType === "pomodoro") {
            setPomoSecondsLeft(Math.max(0, studySecondsBaseline - elapsed));
          }
        } else {
          verifyAndRecoverOfflineStudyProgress();
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isStudyingUser, studyStartTime, studySecondsBaseline, timerType, pomoState, pomoRound, pomoFocusDuration, pomoShortBreakDuration, pomoLongBreakDuration, activeSubjectId, subjects, notificationSettings]);

  // 3. Root Study Ticking loop that uses actual timestamps & Web Workers to be completely resilient against background throttling
  useEffect(() => {
    let worker: Worker | null = null;
    let fallbackInterval: NodeJS.Timeout | null = null;
    
    if (isStudyingUser && studyStartTime !== null) {
      const sessionType = localStorage.getItem("study_active_timer_type") || activeTimerTypeRef.current || timerType;
      
      const tick = () => {
        const elapsedSecs = Math.floor((Date.now() - studyStartTime) / 1000);
        if (sessionType === "stopwatch" || sessionType === "custom") {
          setActiveSecondsUser(studySecondsBaseline + elapsedSecs);
        } else if (sessionType === "pomodoro") {
          setPomoSecondsLeft(Math.max(0, studySecondsBaseline - elapsedSecs));
        }
      };
      
      tick();

      try {
        const code = `
          let timerId = null;
          self.onmessage = function(e) {
            if (e.data === "start") {
              if (timerId) clearInterval(timerId);
              timerId = setInterval(() => {
                self.postMessage("tick");
              }, 500);
            } else if (e.data === "stop") {
              if (timerId) {
                clearInterval(timerId);
                timerId = null;
              }
            }
          };
        `;
        const blob = new Blob([code], { type: "application/javascript" });
        worker = new Worker(URL.createObjectURL(blob));
        worker.onmessage = (e) => {
          if (e.data === "tick") {
            tick();
          }
        };
        worker.postMessage("start");
      } catch (err) {
        console.warn("Web Worker background ticking generation failed, fallback to standard main thread loop:", err);
        fallbackInterval = setInterval(tick, 250);
      }
    }
    
    return () => {
      if (worker) {
        worker.postMessage("stop");
        worker.terminate();
      }
      if (fallbackInterval) {
        clearInterval(fallbackInterval);
      }
    };
  }, [isStudyingUser, studyStartTime, studySecondsBaseline, timerType]);

  // Pomodoro Completion Listener
  useEffect(() => {
    if (isStudyingUser && timerType === "pomodoro" && pomoSecondsLeft === 0) {
      setIsStudyingUser(false);
      
      if (pomoState === "focus") {
        playPomoChime("success");
        const minsToSave = pomoFocusDuration;
        handleAddStudyMinutes(activeSubjectId, minsToSave).catch(e => {
          setFiredNotification(`Academic Limit Warning: ${e.message}`);
        });
        
        const completionMsg = `🍅 Pomodoro Complete! You studied for ${minsToSave} minutes. +${minsToSave * 10} XP gained!`;
        setFiredNotification("You did it! Study session completed!");
        
        showSystemNotification("You did it! Study session completed!", completionMsg);
        
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
        playPomoChime("break");
        const breakLabel = pomoState === "shortBreak" ? "Short break" : "Long break";
        const breakEndMsg = `💪 ${breakLabel} ended! Excellent job resting, you are ready to focus!`;
        setFiredNotification(breakEndMsg);

        showSystemNotification("Flash5tudy Focus Alert", breakEndMsg);

        setPomoState("focus");
        setPomoSecondsLeft(pomoFocusDuration * 60);
      }
    }
  }, [pomoSecondsLeft, isStudyingUser, timerType, pomoState, pomoRound, pomoFocusDuration, pomoShortBreakDuration, pomoLongBreakDuration, activeSubjectId]);

  const handleUpdateSubjectGoal = async (subjectId: string, newGoalMinutes: number) => {
    setSubjects(prev => {
      const next = prev.map(s => (s.id === subjectId ? { ...s, goalMinutes: newGoalMinutes } : s));
      secureStorage.setItem("study_subjects", JSON.stringify(next));
      
      if (currentUser) {
        const targetSubject = next.find(s => s.id === subjectId);
        if (targetSubject) {
          const subRef = doc(db, "users", currentUser.uid, "subjects", subjectId);
          setDoc(subRef, targetSubject, { merge: true })
            .catch(err => handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}/subjects/${subjectId}`));
        }
      }
      return next;
    });
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
      } catch (err: any) {
        const errStr = String(err?.message || err);
        if (errStr.includes("popup-closed-by-user") || errStr.includes("Pending promise")) {
          console.warn("Popup authentication was closed or cancelled:", err);
        } else {
          console.error("Popup authentication failed:", err);
        }
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

    const newLog: XpGainLog = {
      id: `xp-log-${Date.now()}`,
      reason,
      amount,
      timestamp: new Date().toISOString()
    };

    setUserXp(prevXp => {
      const nextXp = Math.max(0, prevXp + amount);

      // Local instant persistence
      secureStorage.setItem("study_user_xp", String(nextXp));

      // Also auto-unlock/lock items in state based on new XP
      setRewards(prevRewards => {
        const nextRewards = prevRewards.map(r => {
          const shouldBeUnlocked = nextXp >= r.costXp;
          if (r.isUnlocked !== shouldBeUnlocked) {
            return { ...r, isUnlocked: shouldBeUnlocked };
          }
          return r;
        });
        secureStorage.setItem("study_rewards", JSON.stringify(nextRewards));
        return nextRewards;
      });

      // Sync to Cloud asynchronously in background
      if (currentUser) {
        Promise.all([
          setDoc(doc(db, "users", currentUser.uid), { xp: nextXp }, { merge: true }),
          setDoc(doc(db, "users", currentUser.uid, "xpLogs", newLog.id), newLog)
        ]).catch((err) => {
          console.warn("Failed saving XP to cloud background (running offline mode):", err);
          handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}`);
        });
      }

      return nextXp;
    });

    setXpLogs(prev => {
      const nextLogs = [newLog, ...prev];
      secureStorage.setItem("study_xp_logs", JSON.stringify(nextLogs));
      return nextLogs;
    });
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
    if (!target || target.isClaimed) return;

    // Double-check raw secureStorage to prevent concurrent multi-tab bypassing!
    try {
      const local = secureStorage.getItem("study_rewards");
      if (local) {
        const parsed = JSON.parse(local) as GiftReward[];
        const latestR = parsed.find(r => r.id === rewardId);
        if (latestR && latestR.isClaimed) {
          setRewards(parsed);
          return;
        }
      }
    } catch (e) {}

    const transactionLog: XpGainLog = {
      id: `xp-log-${Date.now()}`,
      reason: `Claimed reward: ${target.title} 🛍️`,
      amount: -target.costXp,
      timestamp: new Date().toISOString()
    };

    setUserXp(prevXp => {
      if (prevXp < target.costXp) {
        console.warn("⚠️ User does not have enough XP to claim this reward.");
        return prevXp;
      }
      const nextXp = Math.max(0, prevXp - target.costXp);

      // Save to secure storage right away
      secureStorage.setItem("study_user_xp", String(nextXp));

      const nextRewards = rewards.map(r => r.id === rewardId ? { ...r, isClaimed: true } : r);
      setRewards(nextRewards);
      secureStorage.setItem("study_rewards", JSON.stringify(nextRewards));

      // Trigger app notifications and sound
      setFiredNotification(`🛍️ Reward Claimed! You successfully claimed: "${target.title}"! Enjoy your reward.`);
      showSystemNotification(`🛍️ Reward Claimed!`, `You claimed: "${target.title}"! Enjoy your academic reward!`);
      if (notificationSettings.enableSoundEffects) {
        playChime("success");
      }

      setXpLogs(prev => {
        const nextXpLogs = [transactionLog, ...prev];
        secureStorage.setItem("study_xp_logs", JSON.stringify(nextXpLogs));
        return nextXpLogs;
      });

      if (currentUser) {
        Promise.all([
          setDoc(doc(db, "users", currentUser.uid), { xp: nextXp }, { merge: true }),
          setDoc(doc(db, "users", currentUser.uid, "rewards", rewardId), { ...target, isClaimed: true }, { merge: true }),
          setDoc(doc(db, "users", currentUser.uid, "xpLogs", transactionLog.id), transactionLog)
        ]).catch(e => handleFirestoreError(e, OperationType.UPDATE, `users/${currentUser.uid}/rewards/${rewardId}`));
      }

      return nextXp;
    });
  };

  const handleCompleteQuest = async (questId: string) => {
    // 1. Mem-lock to prevent rapid clicks double-submitting in memory
    if (completedQuestsRef.current.has(questId)) {
      console.warn("Quest already claimed/processing in memory:", questId);
      return;
    }
    completedQuestsRef.current.add(questId);

    // 2. LocalStorage lock to prevent double claim on multi-rendering/snapshot updates
    const todayStr = getLocalDateString();
    const lockKey = `study_claimed_quest_${todayStr}_${questId}`;
    if (localStorage.getItem(lockKey) === "true") {
      console.warn("Quest already claimed on tracker store today:", questId);
      return;
    }
    localStorage.setItem(lockKey, "true");

    const targetQ = quests.find(q => q.id === questId);
    if (!targetQ || targetQ.isCompleted) return;

    // Double-check raw secureStorage to prevent concurrent multi-tab bypassing!
    try {
      const local = secureStorage.getItem("study_quests");
      if (local) {
        const parsed = JSON.parse(local) as QuestChallenge[];
        const latestQ = parsed.find(q => q.id === questId);
        if (latestQ && latestQ.isCompleted) {
          setQuests(parsed);
          return;
        }
      }
    } catch (e) {}

    setQuests(prev => {
      const nextQuests = prev.map(q => q.id === questId ? { ...q, isCompleted: true } : q);
      secureStorage.setItem("study_quests", JSON.stringify(nextQuests));
      return nextQuests;
    });

    // Do NOT await, execute synchronously in memory
    handleAddXp(`Completed quest: ${targetQ.title}`, targetQ.xpReward);

    setFiredNotification(`⚡ Quest Completed! Outstanding job completing: "${targetQ.title}". (+${targetQ.xpReward} XP claimed!)`);
    showSystemNotification(`⚡ Quest Completed!`, `Completed: ${targetQ.title} (+${targetQ.xpReward} XP)`);
    if (notificationSettings.enableSoundEffects) {
      playChime("success");
    }

    if (currentUser) {
      setDoc(doc(db, "users", currentUser.uid, "quests", questId), { ...targetQ, isCompleted: true })
        .catch(e => handleFirestoreError(e, OperationType.UPDATE, `users/${currentUser.uid}/quests/${questId}`));
    }
  };

  const handleResetStudyTimer = () => {
    setIsStudyingUser(false);
    setActiveSecondsUser(0);
    setStudyStartTime(null);
    setStudySecondsBaseline(0);
    localStorage.removeItem("study_start_time_ms");
    localStorage.removeItem("study_seconds_baseline");
  };

  const handleAddStudyMinutes = async (subjectId: string, minutes: number, customDate?: string) => {
    const todayStr = customDate || getLocalDateString();
    const targetSubject = subjects.find(s => s.id === subjectId);
    if (!targetSubject) return;

    // Calculate existing minutes logged on this date to verify goal achievements
    const existingMinsForDate = studyLogs
      .filter(l => l.date === todayStr)
      .reduce((sum, l) => sum + l.durationMinutes, 0);

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
      const nextSubjects = prev.map(s => (s.id === subjectId ? { ...s, totalMinutes: s.totalMinutes + minutes } : s));
      secureStorage.setItem("study_subjects", JSON.stringify(nextSubjects));
      return nextSubjects;
    });

    // Earn XP per minute studied based on level: Lvl 1-4 is 5 XP/min, Lvl 5+ is 10 XP/min
    const currentLevel = calculateStudentLevel(userXp).level;
    const currentRate = getXpRateForLevel(currentLevel);
    
    // Exact rounded XP value (minimum 1 XP for any study session done)
    const earnedXp = Math.max(1, Math.round(minutes * currentRate));
    handleAddXp(`Studied ${targetSubject.name} for ${formatStudyTimeExact(minutes)} (+${earnedXp} XP ⏱️)`, earnedXp);

    // Check if the subject's daily goal is newly met!
    const previouslyCompleted = targetSubject.totalMinutes >= targetSubject.goalMinutes;
    const newlyCompleted = (targetSubject.totalMinutes + minutes) >= targetSubject.goalMinutes;
    if (!previouslyCompleted && newlyCompleted) {
      const bonusXp = 150;
      setTimeout(() => {
        handleAddXp(`🎉 Daily Goal Met: ${targetSubject.name}!`, bonusXp);
        setFiredNotification(`🎯 Subject Goal Completed! You completed your daily study goal of ${targetSubject.goalMinutes} minutes for ${targetSubject.name}. Outstanding persistent effort! (+${bonusXp} XP Bonus)`);
        
        if (notificationSettings.notifyOnDailyGoalMet) {
          showSystemNotification(
            `🎯 Subject Goal Completed: ${targetSubject.name}!`,
            `Congratulations! You finished your daily study goal of ${targetSubject.goalMinutes} minutes for ${targetSubject.name}. (+${bonusXp} XP)`
          );
        }
        if (notificationSettings.enableSoundEffects) {
          playChime("success");
        }
      }, 800);
    }

    // Check if the overall daily focus goal (set by me) is newly met!
    const previouslyOverallMet = existingMinsForDate >= dailyTargetMinutes;
    const newlyOverallMet = (existingMinsForDate + minutes) >= dailyTargetMinutes;
    if (!previouslyOverallMet && newlyOverallMet) {
      const bonusXp = 300;
      setTimeout(() => {
        handleAddXp(`🏆 Daily Focus Goal Met (${dailyTargetMinutes}m)!`, bonusXp);
        setFiredNotification(`🙌 Daily focus goal of ${dailyTargetMinutes} minutes met! Excellent academic persistence. (+${bonusXp} XP Reward!)`);
        
        if (notificationSettings.notifyOnDailyGoalMet) {
          showSystemNotification("Daily Focus Goal Met!", `Congratulations! You have completed your overall daily study goal of ${dailyTargetMinutes} minutes today! (+${bonusXp} XP)`);
        }
        if (notificationSettings.enableSoundEffects) {
          playChime("success");
        }
      }, 1500);
    }

    // Sync to Cloud asynchronously in the background
    if (currentUser) {
      const subRef = doc(db, "users", currentUser.uid, "subjects", subjectId);
      const logRef = doc(db, "users", currentUser.uid, "studyLogs", newLog.id);
      const updatedSubject = { ...targetSubject, totalMinutes: targetSubject.totalMinutes + minutes };

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
    return logMinsToday + liveMins;
  }, [studyLogs, isStudyingUser, activeSecondsUser, timerType, pomoState, pomoFocusDuration, pomoSecondsLeft]);

  // Dynamically synchronized subjects with exact visual minute calculation matching study logs
  const synchronizedSubjects = useMemo(() => {
    const todayStr = getLocalDateString();
    return subjects.map(sub => {
      const todayMins = studyLogs
        .filter(log => log.subjectId === sub.id && log.date === todayStr)
        .reduce((sum, log) => sum + log.durationMinutes, 0);
      return { ...sub, totalMinutes: todayMins };
    });
  }, [subjects, studyLogs]);

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
    localStorage.removeItem("f5_joined_room_id");
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

  const handleUpdateProfile = async (updates: { name: string; class: string; preparation: string; level: number }) => {
    setStudentName(updates.name);
    setStudentClass(updates.class);
    setStudentPrepTarget(updates.preparation);

    secureStorage.setItem("study_student_name", updates.name);
    secureStorage.setItem("study_student_class", updates.class);
    secureStorage.setItem("study_student_prep", updates.preparation);

    // Update level / XP:
    // If level changed, we will set XP to the matching level minimum XP requirement
    const calculatedLvl = calculateStudentLevel(userXp).level;
    if (updates.level !== calculatedLvl) {
      const selectedLvlIdx = Math.max(1, Math.min(35, updates.level)) - 1;
      const targetXp = ALL_STUDENT_LEVELS[selectedLvlIdx].xpRequired;
      setUserXp(targetXp);
      secureStorage.setItem("study_user_xp", String(targetXp));

      // Create a nice XP log for manually setting current level
      const logId = `xp-log-${Date.now()}`;
      const reason = `Profile Level configured to Level ${updates.level} 🏆`;
      const newLog = {
        id: logId,
        reason,
        amount: 0,
        timestamp: new Date().toISOString()
      };
      setXpLogs(prev => {
        const nextLogs = [newLog, ...prev];
        secureStorage.setItem("study_xp_logs", JSON.stringify(nextLogs));
        return nextLogs;
      });

      if (currentUser) {
        setDoc(doc(db, "users", currentUser.uid, "xpLogs", logId), newLog).catch(err => {
          handleFirestoreError(err, OperationType.CREATE, `users/${currentUser.uid}/xpLogs/${logId}`);
        });
        setDoc(doc(db, "users", currentUser.uid), { xp: targetXp }, { merge: true }).catch(err => {
          handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}`);
        });
      }
    }

    if (currentUser) {
      const userRef = doc(db, "users", currentUser.uid);
      setDoc(userRef, {
        studentName: updates.name,
        studentClass: updates.class,
        studentPrepTarget: updates.preparation,
        displayName: updates.name
      }, { merge: true }).catch((err) => {
        console.warn("Background cloud sync for profile updates deferred (offline/database-not-provisioned). Stored locally!", err);
        handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}`);
      });
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
            themePreset === "cosmic" ? "bg-[#f5f3f9] text-[#2e1065]" :
            themePreset === "cyberpunk" ? "bg-[#faf5fa] text-[#581c87]" :
            themePreset === "nordic" ? "bg-[#f0f4f8] text-[#0f2d4a]" :
            "bg-[#f8fafc] text-slate-900"
          )
        : (
            themePreset === "amoled" ? "bg-black text-white" :
            themePreset === "forest" ? "bg-[#05100c] text-[#d1e7dd]" :
            themePreset === "crimson" ? "bg-[#120102] text-[#f8d7da]" :
            themePreset === "honey" ? "bg-[#160e02] text-[#fbebd4]" :
            themePreset === "cosmic" ? "bg-[#070512] text-[#e9d5ff]" :
            themePreset === "cyberpunk" ? "bg-[#09050d] text-[#f7b7f9]" :
            themePreset === "nordic" ? "bg-[#0b1016] text-[#e0f2fe]" :
            "bg-[#08080c] text-white"
          )
    }`} id="f5-immersive-viewport-root">
      
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
                  {timerType === "custom" ? "Custom Target Countdown" : timerType === "stopwatch" ? "Stopwatch Mode" : `Pomodoro (${pomoState})`}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="text-left font-mono font-black text-xl text-white">
                  {timerType === "custom" ? (
                    (() => {
                      const customTargetMins = parseInt(localStorage.getItem("study_custom_target_minutes") || "45", 10);
                      const remSecs = Math.max(0, (customTargetMins * 60) - activeSecondsUser);
                      const h = Math.floor(remSecs / 3600);
                      const m = Math.floor((remSecs % 3600) / 60);
                      const s = remSecs % 60;
                      return `${h > 0 ? String(h).padStart(2, "0") + ':' : ''}${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
                    })()
                  ) : timerType === "stopwatch" ? (
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
                      if (timerType === "stopwatch" || timerType === "custom") {
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
 
              {/* Dynamic visual miniature progress bar for custom or Pomodoro */}
              {(timerType === "pomodoro" || timerType === "custom") && (
                <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${timerType === "custom" ? "bg-emerald-500" : "bg-indigo-500"}`}
                    style={{ 
                      width: `${
                        timerType === "custom" ? (
                          (() => {
                            const customTargetMins = parseInt(localStorage.getItem("study_custom_target_minutes") || "45", 10);
                            return Math.min(100, Math.round((activeSecondsUser / (customTargetMins * 60)) * 100));
                          })()
                        ) : (
                          (pomoSecondsLeft / (
                            (pomoState === "focus" ? pomoFocusDuration : pomoState === "shortBreak" ? pomoShortBreakDuration : pomoLongBreakDuration) * 60
                          )) * 100
                        )
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
              themePreset === "cosmic" ? "bg-[#f5f3f9]/85 border-[#e9e3f3]" :
              themePreset === "cyberpunk" ? "bg-[#faf5fa]/85 border-[#f1e4f3]" :
              themePreset === "nordic" ? "bg-[#f0f4f8]/85 border-[#d0dbe5]" :
              "bg-white/75 border-slate-200/60"
            )
          : (
              themePreset === "amoled" ? "bg-black/90 border-slate-900" :
              themePreset === "forest" ? "bg-[#05100c]/90 border-emerald-950/40" :
              themePreset === "crimson" ? "bg-[#120102]/90 border-rose-950/40" :
              themePreset === "honey" ? "bg-[#160e02]/90 border-amber-950/40" :
              themePreset === "cosmic" ? "bg-[#070512]/90 border-[#3b0764]/40" :
              themePreset === "cyberpunk" ? "bg-[#09050d]/90 border-[#4a044e]/40" :
              themePreset === "nordic" ? "bg-[#0b1016]/90 border-[#1e293b]/40" :
              "bg-[#08080c]/85 border-slate-900/40"
            )
      }`}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 relative z-10">
          
          {/* Logo brand & streak info */}
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-2xl ${currentThemeStyle.accentBg} ${currentThemeStyle.glowClass} flex items-center justify-center text-white cursor-pointer hover:rotate-12 active:scale-90 transition-all duration-300`} onClick={() => setActiveTab("focus")}>
              <Clock className="w-5.5 h-5.5 font-bold" />
            </div>
            <div className="text-left">
              <h1 className={`text-base font-black tracking-widest uppercase leading-none ${currentThemeStyle.gradientText}`}>Flash5tudy</h1>
              <div className="flex items-center gap-1.5 mt-1" title="Daily study streak indicator">
                <Flame className="w-3.5 h-3.5 text-orange-500 animate-pulse shrink-0" />
                <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">{activeStreakCount} days streak</span>
              </div>
            </div>
          </div>

          {/* Quick Stats Summary badges */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className={`hidden sm:flex items-center gap-1.5 bg-white/45 dark:bg-[#171717]/80 px-3.5 py-1.5 rounded-full border ${currentThemeStyle.accentBorder} font-mono text-[11px] text-slate-700 dark:text-slate-300 shadow-xs backdrop-blur-md transition-all duration-300`}>
              <span className="text-[9px] text-slate-450 dark:text-slate-550 uppercase font-black tracking-wider">Studied Today:</span>
              <span className={`font-bold ${currentThemeStyle.accentText} ${currentThemeStyle.glowText}`}>
                {formatStudyTimeExact(totalStudiedTodayMins)}
              </span>
            </div>

            {/* cinema HUD layout toggle */}
            <button
              onClick={() => {
                const updated = !isWideHud;
                setIsWideHud(updated);
                localStorage.setItem("f5_wide_hud", String(updated));
              }}
              className={`p-2 rounded-full cursor-pointer border transition-all bg-white/45 hover:bg-white/70 text-slate-600 ${currentThemeStyle.accentBorder} dark:bg-[#171717] dark:hover:bg-[#202020] dark:text-slate-400 dark:hover:text-white shadow-xs backdrop-blur-md flex items-center justify-center`}
              title={isWideHud ? "Compact panel layout" : "Immersive widescreen HUD"}
            >
              {isWideHud ? (
                <Minimize2 className="w-4 h-4 text-rose-500" />
              ) : (
                <Maximize2 className={`w-4 h-4 ${currentThemeStyle.accentText}`} />
              )}
            </button>

            {/* Chrome Fullscreen Toggle Button */}
            <button
              id="chrome-fullscreen-trigger-btn"
              onClick={handleToggleFullscreen}
              className={`p-2 rounded-full cursor-pointer border transition-all shadow-xs backdrop-blur-md flex items-center justify-center ${
                isFullscreen 
                  ? `${currentThemeStyle.accentBg} text-white border-transparent ${currentThemeStyle.glowClass}` 
                  : `bg-white/45 hover:bg-white/70 text-slate-600 border-slate-200 dark:bg-[#171717] dark:hover:bg-[#202020] dark:border-slate-900 dark:text-slate-400 dark:hover:text-amber-400`
              }`}
              title={isFullscreen ? "Exit Chrome Fullscreen" : "Enter Chrome Fullscreen Mode"}
            >
              {isFullscreen ? (
                <Shrink className="w-4 h-4 text-white" />
              ) : (
                <Expand className="w-4 h-4" />
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
                    ? "font-black shadow-xs"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-450 dark:hover:text-white"
                }`}
                style={themeMode === "system" ? { backgroundColor: `${currentThemeStyle.primary}18`, color: currentThemeStyle.primary } : {}}
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
                  ? `${currentThemeStyle.accentBg} border-transparent text-white ${currentThemeStyle.glowClass}`
                  : `bg-white/45 border-slate-200 text-slate-500 hover:text-slate-800 dark:bg-[#171717] dark:border-[#1e293b]/50 dark:text-slate-400 dark:hover:text-white dark:hover:border-[#1e293b]`
              } shadow-xs backdrop-blur-md`}
              title="Study Focus Alarms & Reminders"
            >
              <Bell className="w-4 h-4" />
              {reminders.some(r => r.isActive && !r.isCompleted) && (
                <span className={`absolute top-1 right-1 w-2 h-2 ${currentThemeStyle.accentBg} rounded-full animate-ping`}></span>
              )}
            </button>

            {/* Google Authentication Section */}
            {currentUser ? (
              <div className={`flex items-center gap-2.5 bg-slate-50/70 dark:bg-[#121214] p-1 pr-3 rounded-full border ${currentThemeStyle.accentBorder} hover:opacity-90 transition-all duration-300`}>
                {currentUser.photoURL ? (
                  <img 
                    referrerPolicy="no-referrer" 
                    src={currentUser.photoURL} 
                    alt={currentUser.displayName || "User"} 
                    className="w-7 h-7 rounded-full border border-slate-350 dark:border-slate-700/50" 
                  />
                ) : (
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] ${currentThemeStyle.accentText} font-black uppercase font-mono ${currentThemeStyle.badge}`}>
                    {(studentName || currentUser.displayName || currentUser.email || "S")[0].toUpperCase()}
                  </div>
                )}
                <div className="hidden md:block text-left leading-none max-w-[100px] truncate">
                  <p className="text-xs font-black truncate text-slate-800 dark:text-slate-100 leading-none">
                    {studentName || currentUser.displayName || "Scholar"}
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
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -z-10 pointer-events-none"></div>
                  
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
          
          <AnimatePresence mode="wait">
            {activeTab === "focus" && (
              <motion.div
                key="focus"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
              >
                <TimelineView
                  subjects={synchronizedSubjects}
                  studyLogs={studyLogs}
                  setSubjects={setSubjects}
                  onAddStudyMinutes={handleAddStudyMinutes}
                  onAddSubject={handleAddSubject}
                  onRemoveSubject={handleRemoveSubject}
                  activeSubjectId={activeSubjectId}
                  setActiveSubjectId={setActiveSubjectId}
                  isStudying={isStudyingUser}
                  setIsStudying={setIsStudyingUser}
                  activeSeconds={activeSecondsUser}
                  setActiveSeconds={setActiveSecondsUser}
                  onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                  onResetTimer={handleResetStudyTimer}
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
                  onThemeSelect={(themeId) => setThemePreset(themeId)}
                  userXp={userXp}
                  onAddXp={handleAddXp}
                  onChangeTab={setActiveTab}
                  showSystemNotification={showSystemNotification}
                  setFiredNotification={setFiredNotification}
                  notificationSettings={notificationSettings}
                />
              </motion.div>
            )}

            {activeTab === "planner" && (
              <motion.div
                key="planner"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
              >
                <PlannerHub
                  subjects={synchronizedSubjects}
                  tasks={tasks}
                  onAddTask={handleAddTask}
                  onToggleTask={handleToggleTask}
                  onRemoveTask={handleRemoveTask}
                />
              </motion.div>
            )}

            {activeTab === "calendar" && (
              <motion.div
                key="calendar"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
              >
                <CalendarView 
                  studyLogs={studyLogs} 
                  subjects={synchronizedSubjects}
                  onAddStudyMinutes={handleAddStudyMinutes}
                  userXp={userXp}
                />
              </motion.div>
            )}

            {activeTab === "rewards" && (
              <motion.div
                key="rewards"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="liquid-glass p-0 rounded-3xl shadow-xl transition-all duration-300 relative z-10 overflow-hidden text-left"
              >
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
                  studyLogs={studyLogs}
                />
              </motion.div>
            )}

            {activeTab === "target-suite" && (
              <motion.div
                key="target-suite"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
              >
                <TargetRoadmap 
                  subjects={synchronizedSubjects}
                  userXp={userXp}
                  onAddXp={handleAddXp}
                  themePreset={themePreset}
                  currentUser={currentUser}
                />
              </motion.div>
            )}

            {activeTab === "analytics" && (
              <motion.div
                key="analytics"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="liquid-glass p-6 rounded-3xl shadow-xl transition-all duration-300 relative z-10"
              >
                <AnalyticsDashboard
                  subjects={synchronizedSubjects}
                  studyLogs={studyLogs}
                  streak={activeStreakCount}
                  dailyTargetMinutes={dailyTargetMinutes}
                  totalMinutesToday={totalStudiedTodayMins}
                />
              </motion.div>
            )}

            {activeTab === "ai-coach" && (
              <motion.div
                key="ai-coach"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="liquid-glass p-6 rounded-3xl shadow-xl transition-all duration-300 relative z-10"
              >
                <AICoachCard
                  subjects={synchronizedSubjects}
                  streak={activeStreakCount}
                  dailyTargetMinutes={dailyTargetMinutes}
                />
              </motion.div>
            )}

            {activeTab === "workspace" && (
              <motion.div
                key="workspace"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="liquid-glass p-6 rounded-3xl shadow-xl transition-all duration-300 relative z-10"
              >
                <WorkspaceHub
                  streak={activeStreakCount}
                  aiCoachAdvice={aiCoachAdvice}
                  globalCurrentUser={currentUser}
                  onGlobalLogin={handleHeaderLogin}
                  onGlobalLogout={handleHeaderLogout}
                />
              </motion.div>
            )}

            {activeTab === "reminders" && (
              <motion.div
                key="reminders"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="liquid-glass p-6 rounded-3xl shadow-xl transition-all duration-300 relative z-10"
              >
                <RemindersHub
                  subjects={synchronizedSubjects}
                  reminders={reminders}
                  onAddReminder={handleAddReminder}
                  onToggleReminder={handleToggleReminder}
                  onRemoveReminder={handleRemoveReminder}
                  notificationPermission={notificationPermission}
                  audioAutoplayApproved={audioAutoplayApproved}
                  onGrantPermissions={handleGrantAllPermissions}
                  notificationSettings={notificationSettings}
                  onUpdateNotificationSettings={setNotificationSettings}
                  currentUser={currentUser}
                />
              </motion.div>
            )}
          </AnimatePresence>

            </div>

            {/* The Ultimate Widescreen/Tablet Landscape Focus Sidepanel HUD */}
            {isWideHud && (
              <div className="hidden lg:flex lg:col-span-4 flex-col gap-5 sticky top-22 w-full pb-4">
                
                {/* 1. Exam Targets & GPA Radar Widget */}
                <div id="target_roadmap_sidebar_widget" className="liquid-glass p-5 rounded-3xl border border-slate-205/50 dark:border-slate-900/60 text-left space-y-4 shadow-md backdrop-blur-xl bg-white/40 dark:bg-[#121212]/30">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] uppercase font-mono font-black tracking-widest flex items-center gap-1.5 bg-transparent" style={{ color: currentThemeStyle.primary }}>
                      <Target className="w-4 h-4" style={{ color: currentThemeStyle.primary }} />
                      Academic Radar
                    </span>
                    <span className="text-[9.5px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-black/40 px-2.5 py-0.5 rounded-full font-bold">
                      Goal Roadmaps
                    </span>
                  </div>

                  {(() => {
                    let sideExams = [];
                    try {
                      const data = localStorage.getItem("study_target_exams");
                      if (data) sideExams = JSON.parse(data);
                    } catch(e) {}
                    
                    if (sideExams.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center py-6 px-4 bg-slate-50/50 dark:bg-black/10 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center gap-2">
                           <Target className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">No active exam roadmaps yet</p>
                          <p className="text-[9px] text-slate-450 dark:text-slate-550 max-w-[180px]">Add your academic test dates and preparation list in the Targets tab!</p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-3">
                        {sideExams.slice(0, 3).map((ex, idx) => {
                          const examDateObj = new Date(ex.examDate + "T23:59:59");
                          const today = new Date();
                          today.setHours(0,0,0,0);
                          examDateObj.setHours(0,0,0,0);
                          const daysLeft = Math.max(0, Math.ceil((examDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
                          
                          return (
                            <div 
                              key={ex.id || idx} 
                              onClick={() => setActiveTab("target-suite")}
                              className="flex flex-col gap-2 bg-white/40 dark:bg-black/15 p-3 rounded-2xl border border-slate-150/60 dark:border-slate-900/55 shadow-[0_1px_3px_0_rgba(0,0,0,0.02)] hover:bg-slate-50/20 dark:hover:bg-slate-900/20 transition-all cursor-pointer group text-left"
                              style={{ borderWidth: '1px' }}
                            >
                              <div className="flex items-start justify-between gap-1.5 min-w-0">
                                <div className="min-w-0">
                                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 truncate group-hover:opacity-90 transition-colors font-sans" style={{ color: currentThemeStyle.primary }}>
                                    {ex.title}
                                  </h4>
                                  <p className="text-[9.5px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                                    Target grade: <span className="font-bold" style={{ color: currentThemeStyle.primary }}>{ex.targetGrade}</span>
                                  </p>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="text-[10px] font-mono font-black px-1.5 py-0.5 rounded-lg" style={{ color: currentThemeStyle.primary, backgroundColor: `${currentThemeStyle.primary}18` }}>
                                    {daysLeft}d left
                                  </span>
                                </div>
                              </div>

                              <div className="space-y-1">
                                <div className="flex justify-between text-[8px] font-mono text-slate-450 font-semibold">
                                  <span>Preparation level</span>
                                  <span>{ex.preparationLevel}%</span>
                                </div>
                                <div className="w-full h-1 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full rounded-full transition-all duration-500" 
                                    style={{ 
                                      width: `${ex.preparationLevel}%`,
                                      backgroundImage: `linear-gradient(to right, ${currentThemeStyle.primary}, ${currentThemeStyle.primary}bf)`
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        <button 
                          onClick={() => setActiveTab("target-suite")}
                          className="w-full text-center py-2 border rounded-xl text-[10.5px] font-black tracking-wide hover:opacity-90 transition-all cursor-pointer uppercase font-mono"
                          style={{
                            backgroundColor: `${currentThemeStyle.primary}18`,
                            borderColor: `${currentThemeStyle.primary}33`,
                            color: currentThemeStyle.primary
                          }}
                        >
                          Open Target Suite
                        </button>
                      </div>
                    );
                  })()}
                </div>

                {/* 2. Topic Goals Distribution micro widget */}
                <div className="liquid-glass p-5 rounded-3xl border border-slate-200/50 dark:border-slate-900/60 text-left space-y-3.5 shadow-md backdrop-blur-xl bg-white/40 dark:bg-[#121212]/30">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] uppercase font-mono text-slate-400 dark:text-slate-500 font-black tracking-widest">
                      Distributions
                    </span>
                    <span className="text-[10.5px] font-mono font-black animate-pulse" style={{ color: currentThemeStyle.primary }}>
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
                            <span className="font-mono font-extrabold" style={{ color: currentThemeStyle.primary }}>{percent}%</span>
                          </div>
                          <div className="w-full h-1 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all duration-500" 
                              style={{ 
                                width: `${percent}%`,
                                backgroundImage: `linear-gradient(to right, ${currentThemeStyle.primary}, ${currentThemeStyle.primary}bf)`
                              }}
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
                    <div className="w-16 h-16 rounded-full absolute animate-ping duration-3000" style={{ animationDuration: '4s', backgroundColor: `${currentThemeStyle.primary}1a` }} />
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white relative shadow-lg" style={{ backgroundColor: currentThemeStyle.primary, boxShadow: `0 4px 12px ${currentThemeStyle.primary}40` }}>
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
        currentUser={currentUser}
        studentName={studentName}
        studentClass={studentClass}
        studentPrepTarget={studentPrepTarget}
        onUpdateProfile={handleUpdateProfile}
        isFirebaseConnected={isFirebaseConnected}
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
            { id: "target-suite", label: "Targets", icon: Target }
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
                    ? "font-black scale-105" 
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
                style={isSelected ? { color: currentThemeStyle.primary } : {}}
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
            if (activeTab === "focus" || activeTab === "planner" || activeTab === "calendar" || activeTab === "target-suite" || activeTab === "reminders" || activeTab === "rewards") {
              setIsSidebarOpen(!isSidebarOpen);
            }
          }}
          className="w-11 h-11 sm:w-13 sm:h-13 bg-white/85 dark:bg-[#18181c]/90 active:scale-95 rounded-full flex items-center justify-center shadow-xl border border-slate-200/90 dark:border-slate-800/80 cursor-pointer hover:scale-105 transition-all backdrop-blur-md shrink-0"
          style={{ color: currentThemeStyle.primary }}
          title="Flash5tudy Menu & Settings"
        >
          {activeTab === "focus" && <Layers className="w-5 h-5 animate-pulse" style={{ color: currentThemeStyle.primary }} />}
          {activeTab === "planner" && <Sparkles className="w-5 h-5 text-pink-500" />}
          {activeTab === "rewards" && <Award className="w-5 h-5 text-amber-500 animate-bounce" />}
          {activeTab === "calendar" && <TrendingUp className="w-5 h-5 text-emerald-500" />}
          {activeTab === "target-suite" && <Target className="w-5 h-5" style={{ color: currentThemeStyle.primary }} />}
          {activeTab === "reminders" && <Bell className="w-5 h-5 text-violet-500 animate-pulse" />}
          {!["focus", "planner", "rewards", "calendar", "target-suite", "reminders"].includes(activeTab) && <Sparkles className="w-5 h-5 text-indigo-500 animate-spin-slow" />}
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
                <span style={{ color: currentThemeStyle.primary }}>F</span>
                <span className="text-[#4285F4]">l</span>
                <span className="text-[#EA4335]">a</span>
                <span className="text-[#FBBC05]">s</span>
                <span className="text-[#34A853]">h</span>
                <span style={{ color: currentThemeStyle.primary }}>5</span>
                <span className="text-slate-800 dark:text-slate-100 font-extrabold">tudy</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-md font-bold tracking-wider uppercase ml-2 border" style={{ color: currentThemeStyle.primary, backgroundColor: `${currentThemeStyle.primary}18`, borderColor: `${currentThemeStyle.primary}33` }}>Cloud Synchronized</span>
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
                      ? "First-time here? Create your free study profile in Flash5tudy to sync exam targets, focus stats, and your AI study logs!" 
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
                      const errStr = String(err?.message || err);
                      if (errStr.includes("popup-closed-by-user") || errStr.includes("Pending promise")) {
                        console.warn("Google authentication warning (popup closed or cancelled):", err);
                      } else {
                        console.error("Google authentication error:", err);
                      }
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
                      const errStr = String(err?.message || err);
                      if (errStr.includes("popup-closed-by-user") || errStr.includes("Pending promise")) {
                        console.warn("Google authentication warning (popup closed or cancelled):", err);
                      } else {
                        console.error("Google authentication error:", err);
                      }
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

      {/* Chrome Fullscreen Advisor Modal */}
      {showFullscreenModal && (
        <div className="fixed inset-0 bg-slate-900/80 dark:bg-black/85 backdrop-blur-md flex items-center justify-center z-[100] p-4 text-left">
          <div className="bg-white dark:bg-[#121213] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md overflow-hidden flex flex-col p-6 shadow-2xl relative text-slate-850 dark:text-neutral-100">
            
            {/* Close Button */}
            <button 
              onClick={() => setShowFullscreenModal(false)}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-650 dark:hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Icon */}
            <div className="mx-auto w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: `${currentThemeStyle.primary}18` }}>
              <Expand className="w-6 h-6 animate-pulse" style={{ color: currentThemeStyle.primary }} />
            </div>

            {/* Topic Headings */}
            <h3 className="text-lg font-black text-center text-slate-900 dark:text-white leading-tight font-sans">
              Chrome Fullscreen Guide
            </h3>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-2 leading-relaxed">
              To use <strong>Flash5tudy</strong> in pristine, borderless Fullscreen on Chrome:
            </p>

            {/* Onboarding info points */}
            <div className="my-5 space-y-3">
              <div className="flex gap-3 bg-slate-50 dark:bg-slate-950/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-900">
                <span className="text-xs font-mono font-black w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ color: currentThemeStyle.primary, backgroundColor: `${currentThemeStyle.primary}18` }}>1</span>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-normal">
                  Standard Fullscreen might be blocked because you are running the app inside Google AI Studio's preview iframe window.
                </p>
              </div>

              <div className="flex gap-3 bg-slate-50 dark:bg-slate-950/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-900">
                <span className="text-xs font-mono font-black text-blue-500 bg-blue-500/10 w-5 h-5 rounded-full flex items-center justify-center shrink-0">2</span>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-normal">
                  Open the app directly in a <strong>new tab</strong> to bypass iframe restrictions. Chrome will then support 100% borderless Fullscreen flawlessly.
                </p>
              </div>

              <div className="flex gap-3 bg-slate-50 dark:bg-slate-950/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-900">
                <span className="text-xs font-mono font-black text-emerald-500 bg-emerald-500/10 w-5 h-5 rounded-full flex items-center justify-center shrink-0">3</span>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-normal">
                  Pressing <strong>F11</strong> on Windows/Chromebook, or <strong>Control + Command + F</strong> on Mac, is also a direct standard shortcut!
                </p>
              </div>
            </div>

            {/* Direct buttons */}
            <div className="flex flex-col sm:flex-row gap-2">
              <a 
                href={window.location.href}
                target="_blank" 
                rel="noopener noreferrer"
                className={`flex-1 ${currentThemeStyle.accentBg} text-white font-extrabold py-2.5 px-4 rounded-xl text-xs flex justify-center items-center gap-1.5 cursor-pointer shadow-lg active:scale-98 transition-all hover:brightness-110`}
                style={{ boxShadow: `0 4px 14px -4px ${currentThemeStyle.primary}60` }}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in New Tab</span>
              </a>
              <button
                onClick={() => {
                  setShowFullscreenModal(false);
                  const docEl = document.documentElement as any;
                  const requestFS = docEl.requestFullscreen || 
                                    docEl.webkitRequestFullscreen || 
                                    docEl.mozRequestFullScreen || 
                                    docEl.msRequestFullscreen;
                  if (requestFS) {
                    requestFS.call(docEl);
                  }
                }}
                className="flex-1 bg-slate-100 dark:bg-[#1a1a1c] hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 font-bold py-2.5 px-4 rounded-xl text-xs text-center cursor-pointer transition-all active:scale-98"
              >
                Try Fullscreen Anyway
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Level Up Celebration Premium Interactive Modal */}
      {levelUpModal && (() => {
        const tier = ALL_STUDENT_LEVELS[Math.max(1, Math.min(35, levelUpModal.newLevel)) - 1];
        return (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-xl flex items-center justify-center z-[110] p-4 text-left animate-fade-in">
            <div className="bg-gradient-to-b from-slate-900 via-[#0e1015] to-[#0a0a0c] border border-amber-500/35 rounded-3xl w-full max-w-md p-6 shadow-2xl relative text-slate-100 overflow-hidden">
              {/* Pulsing decorative background glows */}
              <div className="absolute top-[-50px] left-[-50px] w-48 h-48 rounded-full filter blur-[60px] opacity-35 bg-amber-500 animate-pulse"></div>
              <div className="absolute bottom-[-50px] right-[-50px] w-48 h-48 rounded-full filter blur-[60px] opacity-25 bg-[#f26419] animate-pulse"></div>
              
              {/* Animated Floating Sparkles celebrating the milestone */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                <span className="absolute top-12 left-10 text-lg animate-bounce duration-500">✨</span>
                <span className="absolute top-28 right-8 text-xl animate-pulse">⭐</span>
                <span className="absolute bottom-20 left-16 text-lg animate-bounce duration-700">✨</span>
                <span className="absolute bottom-12 right-12 text-sm animate-ping">✨</span>
                <span className="absolute top-1/2 left-4 text-xs opacity-40 animate-pulse">🌟</span>
                <span className="absolute top-1/3 right-1/4 text-lg animate-bounce">✨</span>
              </div>

              {/* Top Banner Trophy Badge */}
              <div className="relative text-center pt-4">
                <div className="inline-flex relative">
                  <div className="absolute inset-0 bg-amber-500/20 rounded-full filter blur-xl scale-125 animate-ping"></div>
                  <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-400 to-[#f26419] flex items-center justify-center text-4xl shadow-2xl relative border-2 border-amber-300">
                    {tier.badge}
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#f26419] font-mono">CONGRATULATIONS!</p>
                  <h3 className="text-2xl font-black text-white mt-1 leading-tight font-sans tracking-tight">
                    LEVEL UP ACHIEVED!
                  </h3>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-xs font-mono font-bold text-amber-400 mt-2.5">
                    Level {levelUpModal.oldLevel} ➔ Level {levelUpModal.newLevel}
                  </div>
                </div>
              </div>

              {/* Rank and Reward Showcase Card */}
              <div className="bg-slate-950/90 border border-slate-900/80 rounded-2xl p-4 my-5 space-y-3 relative z-10">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">🏆</span>
                  <div>
                    <span className="text-[9px] text-[#f26419] font-black uppercase tracking-wider block">New Earned Title</span>
                    <h4 className="text-sm font-black text-slate-100 uppercase">{tier.rank}</h4>
                  </div>
                </div>
                
                <div className="pt-2.5 border-t border-slate-900/60">
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Unlocked Perk Feature</span>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed font-medium block">
                    {tier.perk}
                  </p>
                </div>
              </div>

              {/* Dynamic Action Buttons */}
              <div className="space-y-2.5 relative z-10">
                <button
                  onClick={() => {
                    setLevelUpModal(null);
                    setActiveTab("rewards");
                  }}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-[#f26419] hover:from-amber-400 hover:to-[#df5214] text-white font-extrabold rounded-2xl text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  🎁 Claim Unlocked Rewards or Perks
                </button>
                <button
                  onClick={() => setLevelUpModal(null)}
                  className="w-full py-2.5 bg-slate-950 hover:bg-slate-900/80 text-xs font-bold text-slate-400 hover:text-slate-200 rounded-xl active:scale-98 transition-all cursor-pointer text-center"
                >
                  Dismiss with Pride
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
