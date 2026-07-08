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
import BeastHub from "./components/BeastHub";
import PremiumBackdrop from "./components/PremiumBackdrop";


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
export const LIGHT_THEME_PRESET_STYLES: Record<string, {
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
    name: "🌿 Dewy Forest & Sweet Mint",
    primary: "#059669",
    gradientText: "bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 bg-clip-text text-transparent",
    accentBg: "bg-emerald-500",
    accentText: "text-emerald-700",
    accentBorder: "border-emerald-250/70",
    badge: "bg-emerald-100/80 text-emerald-800 border-emerald-300/40",
    glowClass: "shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20",
    glowText: "text-emerald-600 [text-shadow:0_0_12px_rgba(16,185,129,0.3)]",
    gradient: "from-emerald-400 via-teal-300 to-green-500",
    sideBg: "bg-[#edf7f4]",
    panelGlass: "backdrop-blur-3xl border-white/80 bg-white/35 shadow-xl shadow-emerald-500/5",
    interactiveBg: "hover:bg-emerald-50/55",
    auraRing: "ring-2 ring-emerald-500/35 ring-offset-2 ring-offset-white"
  },
  "crimson": {
    name: "🌸 Watermelon Spark & Peach Rose",
    primary: "#db2777",
    gradientText: "bg-gradient-to-r from-rose-600 via-pink-600 to-red-500 bg-clip-text text-transparent",
    accentBg: "bg-rose-500",
    accentText: "text-rose-700",
    accentBorder: "border-rose-250/70",
    badge: "bg-rose-100/80 text-rose-800 border-rose-300/40",
    glowClass: "shadow-lg shadow-rose-500/10 hover:shadow-rose-500/20",
    glowText: "text-rose-600 [text-shadow:0_0_12px_rgba(244,63,94,0.3)]",
    gradient: "from-rose-400 via-pink-300 to-red-400",
    sideBg: "bg-[#fdf4f5]",
    panelGlass: "backdrop-blur-3xl border-white/80 bg-white/35 shadow-xl shadow-rose-500/5",
    interactiveBg: "hover:bg-rose-50/55",
    auraRing: "ring-2 ring-rose-500/35 ring-offset-2 ring-offset-white"
  },
  "honey": {
    name: "🍯 Glazed Amber Honey & Orange Nectar",
    primary: "#ea580c",
    gradientText: "bg-gradient-to-r from-amber-600 via-orange-600 to-yellow-600 bg-clip-text text-transparent",
    accentBg: "bg-amber-500",
    accentText: "text-amber-700",
    accentBorder: "border-amber-250/70",
    badge: "bg-amber-100/80 text-amber-800 border-amber-300/40",
    glowClass: "shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20",
    glowText: "text-amber-600 [text-shadow:0_0_12px_rgba(245,158,11,0.3)]",
    gradient: "from-amber-400 via-orange-300 to-yellow-500",
    sideBg: "bg-[#faf5ec]",
    panelGlass: "backdrop-blur-3xl border-white/80 bg-white/35 shadow-xl shadow-amber-500/5",
    interactiveBg: "hover:bg-amber-50/55",
    auraRing: "ring-2 ring-amber-500/35 ring-offset-2 ring-offset-white"
  },
  "amoled": {
    name: "💎 Crystal Blue Sky & Sapphire",
    primary: "#2563eb",
    gradientText: "bg-gradient-to-r from-blue-600 via-sky-600 to-indigo-600 bg-clip-text text-transparent",
    accentBg: "bg-blue-500",
    accentText: "text-blue-700",
    accentBorder: "border-blue-250/70",
    badge: "bg-blue-100/80 text-blue-800 border-blue-300/40",
    glowClass: "shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20",
    glowText: "text-blue-600 [text-shadow:0_0_12px_rgba(37,99,235,0.3)]",
    gradient: "from-blue-400 via-sky-300 to-indigo-400",
    sideBg: "bg-[#f0f5fc]",
    panelGlass: "backdrop-blur-3xl border-white/80 bg-white/35 shadow-xl shadow-blue-500/5",
    interactiveBg: "hover:bg-blue-50/55",
    auraRing: "ring-2 ring-blue-500/35 ring-offset-2 ring-offset-white"
  },
  "cosmic": {
    name: "🌌 Lilac Orchid Mist & Radiant Violet",
    primary: "#7c3aed",
    gradientText: "bg-gradient-to-r from-violet-600 via-fuchsia-600 to-purple-600 bg-clip-text text-transparent",
    accentBg: "bg-violet-500",
    accentText: "text-violet-700",
    accentBorder: "border-violet-250/70",
    badge: "bg-violet-100/80 text-violet-800 border-violet-300/40",
    glowClass: "shadow-lg shadow-violet-500/10 hover:shadow-violet-500/20",
    glowText: "text-violet-600 [text-shadow:0_0_12px_rgba(124,58,237,0.3)]",
    gradient: "from-violet-400 via-fuchsia-300 to-purple-500",
    sideBg: "bg-[#f5f1fa]",
    panelGlass: "backdrop-blur-3xl border-white/80 bg-white/35 shadow-xl shadow-violet-500/5",
    interactiveBg: "hover:bg-violet-50/55",
    auraRing: "ring-2 ring-violet-500/35 ring-offset-2 ring-offset-white"
  },
  "cyberpunk": {
    name: "🍭 Cotton Candy Pop & Bright Teal",
    primary: "#ec4899",
    gradientText: "bg-gradient-to-r from-pink-600 via-purple-505 to-cyan-505 bg-clip-text text-transparent",
    accentBg: "bg-pink-500",
    accentText: "text-pink-700",
    accentBorder: "border-pink-250/70",
    badge: "bg-pink-100/80 text-pink-800 border-pink-300/40",
    glowClass: "shadow-lg shadow-pink-500/10 hover:shadow-pink-500/20",
    glowText: "text-pink-600 [text-shadow:0_0_12px_rgba(236,72,153,0.3)]",
    gradient: "from-pink-400 via-purple-300 to-cyan-400",
    sideBg: "bg-[#fdf2f7]",
    panelGlass: "backdrop-blur-3xl border-white/80 bg-white/35 shadow-xl shadow-pink-500/5",
    interactiveBg: "hover:bg-pink-50/55",
    auraRing: "ring-2 ring-pink-500/35 ring-offset-2 ring-offset-white"
  },
  "nordic": {
    name: "❄️ Glacier Ice & Mint Aurora",
    primary: "#0284c7",
    gradientText: "bg-gradient-to-r from-sky-600 via-cyan-600 to-teal-600 bg-clip-text text-transparent",
    accentBg: "bg-sky-500",
    accentText: "text-sky-700",
    accentBorder: "border-sky-250/70",
    badge: "bg-sky-100/80 text-sky-800 border-sky-300/40",
    glowClass: "shadow-lg shadow-sky-500/10 hover:shadow-sky-500/20",
    glowText: "text-sky-600 [text-shadow:0_0_12px_rgba(2,132,199,0.3)]",
    gradient: "from-sky-400 via-cyan-300 to-teal-400",
    sideBg: "bg-[#f0f7f9]",
    panelGlass: "backdrop-blur-3xl border-white/80 bg-white/35 shadow-xl shadow-sky-500/5",
    interactiveBg: "hover:bg-sky-50/55",
    auraRing: "ring-2 ring-sky-500/35 ring-offset-2 ring-offset-white"
  },
  "dark-classic": {
    name: "🍊 Luminous Amber & Sweet Peach",
    primary: "#ea580c",
    gradientText: "bg-gradient-to-r from-orange-600 via-red-500 to-amber-500 bg-clip-text text-transparent",
    accentBg: "bg-orange-500",
    accentText: "text-orange-700",
    accentBorder: "border-orange-250/70",
    badge: "bg-orange-100/80 text-orange-800 border-orange-300/40",
    glowClass: "shadow-lg shadow-orange-500/10 hover:shadow-orange-500/20",
    glowText: "text-orange-600 [text-shadow:0_0_12px_rgba(234,88,12,0.3)]",
    gradient: "from-orange-400 via-amber-300 to-red-400",
    sideBg: "bg-[#faf3ee]",
    panelGlass: "backdrop-blur-3xl border-white/80 bg-white/35 shadow-xl shadow-orange-500/5",
    interactiveBg: "hover:bg-orange-50/55",
    auraRing: "ring-2 ring-orange-500/35 ring-offset-2 ring-offset-white"
  }
};

export const DARK_THEME_PRESET_STYLES: Record<string, {
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
    gradientText: "bg-gradient-to-r from-emerald-400 via-teal-350 to-green-400 bg-clip-text text-transparent",
    accentBg: "bg-[#10b981]",
    accentText: "text-[#10b981]",
    accentBorder: "border-[#10b981]/50",
    badge: "bg-[#10b981]/20 text-[#10b981] border-[#10b981]/40",
    glowClass: "shadow-lg shadow-[#10b981]/15 hover:shadow-[#10b981]/25",
    glowText: "text-[#10b981] [text-shadow:0_0_10px_rgba(16,185,129,0.5)]",
    gradient: "from-emerald-500 via-teal-400 to-green-600",
    sideBg: "bg-[#040c09]",
    panelGlass: "backdrop-blur-3xl border-[#10b981]/25 bg-emerald-950/15 shadow-2xl shadow-emerald-950/40",
    interactiveBg: "hover:bg-emerald-950/30",
    auraRing: "ring-2 ring-emerald-500/40 ring-offset-2 ring-offset-[#040c09]"
  },
  "crimson": {
    name: "Sunset Crimson & Cherry",
    primary: "#e11d48",
    gradientText: "bg-gradient-to-r from-rose-400 via-red-400 to-pink-400 bg-clip-text text-transparent",
    accentBg: "bg-[#e11d48]",
    accentText: "text-[#e11d48]",
    accentBorder: "border-[#e11d48]/50",
    badge: "bg-[#e11d48]/20 text-[#e11d48] border-[#e11d48]/40",
    glowClass: "shadow-lg shadow-[#e11d48]/15 hover:shadow-[#e11d48]/25",
    glowText: "text-rose-450 [text-shadow:0_0_10px_rgba(225,29,72,0.5)]",
    gradient: "from-rose-500 via-red-400 to-pink-600",
    sideBg: "bg-[#0c0101]",
    panelGlass: "backdrop-blur-3xl border-[#e11d48]/25 bg-rose-950/15 shadow-2xl shadow-rose-950/40",
    interactiveBg: "hover:bg-rose-950/30",
    auraRing: "ring-2 ring-rose-500/40 ring-offset-2 ring-offset-[#0c0101]"
  },
  "honey": {
    name: "Amber Honey & Vanilla",
    primary: "#d97706",
    gradientText: "bg-gradient-to-r from-amber-400 via-yellow-450 to-orange-400 bg-clip-text text-transparent",
    accentBg: "bg-[#d97706]",
    accentText: "text-[#d97706]",
    accentBorder: "border-[#d97706]/50",
    badge: "bg-[#d97706]/20 text-[#d97706] border-[#d97706]/40",
    glowClass: "shadow-lg shadow-[#d97706]/15 hover:shadow-[#d97706]/25",
    glowText: "text-amber-400 [text-shadow:0_0_10px_rgba(217,119,6,0.5)]",
    gradient: "from-amber-500 via-yellow-405 to-orange-600",
    sideBg: "bg-[#0f0a01]",
    panelGlass: "backdrop-blur-3xl border-[#d97706]/25 bg-amber-950/15 shadow-2xl shadow-amber-950/40",
    interactiveBg: "hover:bg-amber-950/30",
    auraRing: "ring-2 ring-amber-500/40 ring-offset-2 ring-offset-[#0f0a01]"
  },
  "amoled": {
    name: "Modern High Contrast / OLED",
    primary: "#6366f1",
    gradientText: "bg-gradient-to-r from-blue-400 via-indigo-400 to-violet-400 bg-clip-text text-transparent",
    accentBg: "bg-[#6366f1]",
    accentText: "text-[#6366f1]",
    accentBorder: "border-slate-800/90",
    badge: "bg-[#6366f1]/20 text-[#6366f1] border-slate-700/80",
    glowClass: "shadow-lg shadow-[#6366f1]/15 hover:shadow-[#6366f1]/25",
    glowText: "text-indigo-400 [text-shadow:0_0_10px_rgba(99,102,241,0.5)]",
    gradient: "from-blue-600 via-indigo-500 to-violet-650",
    sideBg: "bg-black",
    panelGlass: "backdrop-blur-3xl border-slate-900 bg-[#020202]/90 shadow-2xl shadow-black",
    interactiveBg: "hover:bg-slate-950",
    auraRing: "ring-2 ring-indigo-500/45 ring-offset-2 ring-offset-black"
  },
  "cosmic": {
    name: "Cosmic Nebula & Obsidian",
    primary: "#8b5cf6",
    gradientText: "bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-405 bg-clip-text text-transparent",
    accentBg: "bg-[#8b5cf6]",
    accentText: "text-[#8b5cf6]",
    accentBorder: "border-[#8b5cf6]/50",
    badge: "bg-[#8b5cf6]/20 text-[#8b5cf6] border-[#8b5cf6]/40",
    glowClass: "shadow-lg shadow-[#8b5cf6]/20 hover:shadow-[#8b5cf6]/30",
    glowText: "text-violet-350 [text-shadow:0_0_12px_rgba(139,92,246,0.6)]",
    gradient: "from-violet-505 via-fuchsia-500 to-indigo-605",
    sideBg: "bg-[#04030a]",
    panelGlass: "backdrop-blur-3xl border-[#8b5cf6]/25 bg-purple-950/15 shadow-2xl shadow-[#04030a]",
    interactiveBg: "hover:bg-[#3b0764]/35",
    auraRing: "ring-2 ring-violet-500/45 ring-offset-2 ring-offset-[#04030a]"
  },
  "cyberpunk": {
    name: "Tokyo Cyberpunk Neon & Grid",
    primary: "#ec4899",
    gradientText: "bg-gradient-to-r from-pink-400 dark:via-purple-400 dark:to-cyan-400 bg-clip-text text-transparent",
    accentBg: "bg-[#ec4899]",
    accentText: "text-[#ec4899]",
    accentBorder: "border-[#ec4899]/50",
    badge: "bg-[#ec4899]/20 text-[#ec4899] border-[#ec4899]/40",
    glowClass: "shadow-lg shadow-[#ec4899]/25 hover:shadow-[#ec4899]/35",
    glowText: "text-pink-350 [text-shadow:0_0_14px_rgba(236,72,153,0.7)]",
    gradient: "from-pink-500 via-purple-500 to-cyan-500",
    sideBg: "bg-[#050308]",
    panelGlass: "backdrop-blur-3xl border-[#ec4899]/25 bg-pink-950/15 shadow-2xl shadow-black",
    interactiveBg: "hover:bg-[#4a044e]/35",
    auraRing: "ring-2 ring-pink-500/50 ring-offset-2 ring-offset-[#050308]"
  },
  "nordic": {
    name: "Nordic Frost & Aurora Blue",
    primary: "#0284c7",
    gradientText: "bg-gradient-to-r from-[#38bdf8] via-cyan-400 to-emerald-400 bg-clip-text text-transparent",
    accentBg: "bg-[#0284c7]",
    accentText: "text-[#0284c7]",
    accentBorder: "border-[#0284c7]/50",
    badge: "bg-[#0284c7]/20 text-[#0284c7] border-[#0284c7]/40",
    glowClass: "shadow-lg shadow-[#0284c7]/15 hover:shadow-[#0284c7]/25",
    glowText: "text-sky-350 [text-shadow:0_0_10px_rgba(2,132,199,0.5)]",
    gradient: "from-[#0284c7] via-cyan-400 to-emerald-500",
    sideBg: "bg-[#070b0f]",
    panelGlass: "backdrop-blur-3xl border-[#0284c7]/25 bg-sky-950/15 shadow-2xl shadow-black",
    interactiveBg: "hover:bg-slate-900/50",
    auraRing: "ring-2 ring-[#0284c7]/40 ring-offset-2 ring-offset-[#070b0f]"
  },
  "dark-classic": {
    name: "Classic Steel & Amber",
    primary: "#f26419",
    gradientText: "bg-gradient-to-r from-[#ff7a2e] via-[#f34825] to-[#ffb26b] bg-clip-text text-transparent",
    accentBg: "bg-[#f26419]",
    accentText: "text-[#f26419]",
    accentBorder: "border-[#f26419]/50",
    badge: "bg-[#f26419]/20 text-[#f26419] border-[#f26419]/40",
    glowClass: "shadow-lg shadow-[#f26419]/15 hover:shadow-[#f26419]/25",
    glowText: "text-[#ff7a2e] [text-shadow:0_0_10px_rgba(242,100,25,0.5)]",
    gradient: "from-[#f26419] via-[#f34825] to-[#ff9f43]",
    sideBg: "bg-[#040406]",
    panelGlass: "backdrop-blur-3xl border-[#f26419]/25 bg-[#0c0d10]/95 shadow-2xl shadow-[#040406]",
    interactiveBg: "hover:bg-slate-900/50",
    auraRing: "ring-2 ring-[#f26419]/40 ring-offset-2 ring-offset-[#040406]"
  }
};

export const THEME_PRESET_STYLES = DARK_THEME_PRESET_STYLES;

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

  // States for theme trial & permanent unlock
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [ownerEmail, setOwnerEmail] = useState<string>("mauryanaitik9999@gmail.com");
  const [unlockedAccounts, setUnlockedAccounts] = useState<{ email: string }[]>([]);

  useEffect(() => {
    fetch("/api/app-config")
      .then(res => res.json())
      .then(data => {
        if (data.ownerEmail) {
          setOwnerEmail(data.ownerEmail);
        }
      })
      .catch(err => console.error("Failed to load app config:", err));
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setUnlockedAccounts([]);
      return;
    }
    const unsub = onSnapshot(collection(db, "unlockedAccounts"), (snap) => {
      const list: { email: string }[] = [];
      snap.forEach(d => {
        list.push({ email: d.id });
      });
      setUnlockedAccounts(list);
    }, err => {
      console.warn("Error loading unlocked accounts:", err);
    });
    return () => unsub();
  }, [currentUser]);

  const [trialStartDate, setTrialStartDate] = useState(() => {
    const local = localStorage.getItem("f5_trial_start_time");
    if (local) return parseInt(local);
    const now = Date.now();
    localStorage.setItem("f5_trial_start_time", String(now));
    return now;
  });

  const { isTrialActive, trialDaysRemaining } = useMemo(() => {
    const elapsedMs = Date.now() - trialStartDate;
    const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);
    const remaining = Math.max(0, 7 - elapsedDays);
    return {
      isTrialActive: remaining > 0,
      trialDaysRemaining: Math.max(1, Math.ceil(remaining))
    };
  }, [trialStartDate]);

  const handleResetTrial = () => {
    const now = Date.now();
    localStorage.setItem("f5_trial_start_time", String(now));
    setTrialStartDate(now);
  };

  const isPermanentlyUnlocked = useMemo(() => {
    if (!currentUser || !currentUser.email) return false;
    const email = currentUser.email.toLowerCase();
    if (email === ownerEmail.toLowerCase()) return true;
    if (email === "mauryanaitik9999@gmail.com") return true;
    return unlockedAccounts.some(acc => acc.email.toLowerCase() === email);
  }, [currentUser, ownerEmail, unlockedAccounts]);

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
            ? "bg-gradient-to-tr from-emerald-400/40 to-teal-300/40 opacity-90"
            : "bg-gradient-to-tr from-emerald-950/30 to-teal-900/30 opacity-100",
          blob2: isLight
            ? "bg-gradient-to-br from-lime-300/40 to-emerald-400/35 opacity-90"
            : "bg-gradient-to-br from-emerald-900/25 to-zinc-900/25 opacity-100",
          blob3: isLight
            ? "bg-gradient-to-tl from-teal-300/35 to-emerald-400/40 opacity-90"
            : "bg-gradient-to-tl from-emerald-950/20 to-teal-950/20 opacity-100"
        };
      case "crimson":
        return {
          blob1: isLight
            ? "bg-gradient-to-tr from-rose-400/40 to-red-300/40 opacity-90"
            : "bg-gradient-to-tr from-red-950/25 to-rose-950/25 opacity-100",
          blob2: isLight
            ? "bg-gradient-to-br from-orange-300/35 to-rose-450/40 opacity-90"
            : "bg-gradient-to-br from-rose-950/25 to-red-950/25 opacity-100",
          blob3: isLight
            ? "bg-gradient-to-tl from-pink-300/40 to-red-400/35 opacity-90"
            : "bg-gradient-to-tl from-rose-900/20 to-orange-950/20 opacity-100"
        };
      case "honey":
        return {
          blob1: isLight
            ? "bg-gradient-to-tr from-amber-400/45 to-yellow-300/40 opacity-90"
            : "bg-gradient-to-tr from-amber-950/35 to-yellow-950/30 opacity-100",
          blob2: isLight
            ? "bg-gradient-to-br from-orange-300/40 to-amber-450/40 opacity-90"
            : "bg-gradient-to-br from-amber-950/25 to-neutral-900/25 opacity-100",
          blob3: isLight
            ? "bg-gradient-to-tl from-yellow-300/45 to-orange-400/40 opacity-90"
            : "bg-gradient-to-tl from-amber-900/25 to-stone-900/25 opacity-100"
        };
      case "amoled":
        return {
          blob1: isLight
            ? "bg-gradient-to-tr from-sky-400/45 to-indigo-300/40 opacity-95"
            : "bg-gradient-to-tr from-zinc-900/45 to-neutral-800/45 opacity-100",
          blob2: isLight
            ? "bg-gradient-to-br from-blue-400/40 to-cyan-300/40 opacity-95"
            : "bg-gradient-to-br from-neutral-950/50 to-zinc-950/50 opacity-100",
          blob3: isLight
            ? "bg-gradient-to-tl from-indigo-300/45 to-sky-400/45 opacity-95"
            : "bg-gradient-to-tl from-neutral-900/30 to-zinc-950/30 opacity-100"
        };
      case "cosmic":
        return {
          blob1: isLight
            ? "bg-gradient-to-tr from-violet-400/45 to-indigo-400/45 opacity-95"
            : "bg-gradient-to-tr from-violet-950/40 to-indigo-900/40 opacity-100",
          blob2: isLight
            ? "bg-gradient-to-br from-fuchsia-400/40 to-purple-400/45 opacity-95"
            : "bg-gradient-to-br from-fuchsia-950/25 to-indigo-950/30 opacity-100",
          blob3: isLight
            ? "bg-gradient-to-tl from-purple-400/45 to-violet-350/45 opacity-95"
            : "bg-gradient-to-tl from-[#7c3aed]/15 to-purple-950/25 opacity-100"
        };
      case "cyberpunk":
        return {
          blob1: isLight
            ? "bg-gradient-to-tr from-pink-400/45 to-cyan-300/45 opacity-95"
            : "bg-gradient-to-tr from-fuchsia-950/45 to-cyan-950/45 opacity-105",
          blob2: isLight
            ? "bg-gradient-to-br from-fuchsia-400/40 to-teal-300/40 opacity-95"
            : "bg-gradient-to-br from-purple-950/45 to-emerald-950/30 opacity-100",
          blob3: isLight
            ? "bg-gradient-to-tl from-cyan-300/45 to-pink-400/45 opacity-95"
            : "bg-gradient-to-tl from-[#e879f9]/20 to-teal-950/25 opacity-100"
        };
      case "nordic":
        return {
          blob1: isLight
            ? "bg-gradient-to-tr from-[#60a5fa]/45 to-[#22d3ee]/40 opacity-95"
            : "bg-gradient-to-tr from-[#1e3a8a]/25 to-[#155e75]/25 opacity-100",
          blob2: isLight
            ? "bg-gradient-to-br from-[#93c5fd]/45 to-sky-300/45 opacity-95"
            : "bg-gradient-to-br from-[#0f172a]/45 to-[#0e4429]/20 opacity-100",
          blob3: isLight
            ? "bg-gradient-to-tl from-cyan-300/45 to-[#60a5fa]/45 opacity-95"
            : "bg-gradient-to-tl from-[#1e40af]/15 to-[#134e5e]/25 opacity-100"
        };
      default: // dark-classic / steel secondary slate
        return {
          blob1: isLight
            ? "bg-gradient-to-tr from-orange-400/40 to-rose-450/40 opacity-95"
            : "bg-gradient-to-tr from-[#f26419]/15 to-[#e73c7e]/15 opacity-100",
          blob2: isLight
            ? "bg-gradient-to-br from-indigo-200/35 to-purple-200/35 opacity-95"
            : "bg-gradient-to-br from-indigo-950/20 to-purple-950/25 opacity-100",
          blob3: isLight
            ? "bg-gradient-to-tl from-emerald-200/40 to-teal-200/40 opacity-95"
            : "bg-gradient-to-tl from-emerald-950/15 to-teal-950/20 opacity-100"
        };
    }
  }, [themePreset, activeTheme]);

  const currentThemeStyle = useMemo(() => {
    const themeSet = activeTheme === "light" ? LIGHT_THEME_PRESET_STYLES : DARK_THEME_PRESET_STYLES;
    return themeSet[themePreset] || themeSet["dark-classic"];
  }, [themePreset, activeTheme]);

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

  const [isWideHud] = useState(true);

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

  // Sync Pomodoro/Timer Configuration (infrequently updated static settings)
  useEffect(() => {
    localStorage.setItem("study_timer_type", timerType);
    localStorage.setItem("study_pomo_state", pomoState);
    localStorage.setItem("study_pomo_round", pomoRound.toString());
    localStorage.setItem("study_pomo_focus_duration", pomoFocusDuration.toString());
    localStorage.setItem("study_pomo_short_duration", pomoShortBreakDuration.toString());
    localStorage.setItem("study_pomo_long_duration", pomoLongBreakDuration.toString());
    localStorage.setItem("study_is_studying", isStudyingUser.toString());
  }, [timerType, pomoState, pomoRound, pomoFocusDuration, pomoShortBreakDuration, pomoLongBreakDuration, isStudyingUser]);

  // Sync rapidly ticking seconds with throttled write operations (saves 80% disk access)
  useEffect(() => {
    const shouldWrite = !isStudyingUser || (activeSecondsUser % 5 === 0) || (pomoSecondsLeft % 5 === 0);
    if (shouldWrite) {
      localStorage.setItem("study_pomo_seconds_left", pomoSecondsLeft.toString());
      localStorage.setItem("study_active_seconds_user", activeSecondsUser.toString());
    }
  }, [pomoSecondsLeft, activeSecondsUser, isStudyingUser]);

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
            if (userData.createdAt) {
              setCreatedAt(userData.createdAt);
            } else {
              const nowStr = new Date().toISOString();
              setCreatedAt(nowStr);
              setDoc(userDocRef, { createdAt: nowStr }, { merge: true })
                .catch(e => console.warn("Failed to set missing createdAt:", e));
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
            if (userData.isStudyingUser !== undefined) {
              setIsStudyingUser(userData.isStudyingUser);
              localStorage.setItem("study_is_studying", userData.isStudyingUser ? "true" : "false");
            }
            if (userData.isStudyingUser && userData.activeSubjectId) {
              setActiveSubjectId(userData.activeSubjectId);
              localStorage.setItem("study_active_subject_id", userData.activeSubjectId);
              if (userData.studyStartTimeMs) {
                setStudyStartTime(userData.studyStartTimeMs);
                localStorage.setItem("study_start_time_ms", userData.studyStartTimeMs.toString());
              }
              if (userData.studySecondsBaseline !== undefined) {
                setStudySecondsBaseline(userData.studySecondsBaseline);
                localStorage.setItem("study_seconds_baseline", userData.studySecondsBaseline.toString());
              }
              if (userData.studyTimerType) {
                setTimerType(userData.studyTimerType);
                localStorage.setItem("study_active_timer_type", userData.studyTimerType);
              }
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
            const nowStr = new Date().toISOString();
            setCreatedAt(nowStr);
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
              pomoLongBreakDuration,
              createdAt: nowStr
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
              if (userData.createdAt !== undefined) {
                setCreatedAt(userData.createdAt);
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
              if (userData.isStudyingUser !== undefined) {
                const localIsStudying = localStorage.getItem("study_is_studying") === "true";
                if (userData.isStudyingUser !== localIsStudying) {
                  setIsStudyingUser(userData.isStudyingUser);
                  localStorage.setItem("study_is_studying", userData.isStudyingUser ? "true" : "false");
                }
              }
              if (userData.isStudyingUser && userData.activeSubjectId) {
                if (userData.activeSubjectId !== activeSubjectId) {
                  setActiveSubjectId(userData.activeSubjectId);
                  localStorage.setItem("study_active_subject_id", userData.activeSubjectId);
                }
                if (userData.studyStartTimeMs !== undefined && userData.studyStartTimeMs !== studyStartTime) {
                  setStudyStartTime(userData.studyStartTimeMs);
                  if (userData.studyStartTimeMs) {
                    localStorage.setItem("study_start_time_ms", userData.studyStartTimeMs.toString());
                  } else {
                    localStorage.removeItem("study_start_time_ms");
                  }
                }
                if (userData.studySecondsBaseline !== undefined && userData.studySecondsBaseline !== studySecondsBaseline) {
                  setStudySecondsBaseline(userData.studySecondsBaseline);
                  localStorage.setItem("study_seconds_baseline", userData.studySecondsBaseline.toString());
                }
                if (userData.studyTimerType !== undefined && userData.studyTimerType !== timerType) {
                  setTimerType(userData.studyTimerType);
                  localStorage.setItem("study_active_timer_type", userData.studyTimerType);
                }
              } else if (userData.isStudyingUser === false) {
                const localIsStudying = localStorage.getItem("study_is_studying") === "true";
                if (localIsStudying) {
                  setIsStudyingUser(false);
                  localStorage.setItem("study_is_studying", "false");
                  localStorage.removeItem("study_start_time_ms");
                  localStorage.removeItem("study_seconds_baseline");
                  localStorage.removeItem("study_active_timer_type");
                }
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

  // Auto-prompt unauthenticated new users to sign in with Google on entry to secure their progress
  useEffect(() => {
    if (initSyncComplete && !currentUser) {
      setShowAuthModal(true);
    }
  }, [initSyncComplete, currentUser]);

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

  // Reminders saving (local persistence only, avoiding infinite network write loops)
  useEffect(() => {
    secureStorage.setItem("study_reminders", JSON.stringify(reminders));
  }, [reminders]);

  // Alert triggers system callbacks
  const handleAddReminder = (newRem: Omit<Reminder, "id" | "isCompleted" | "triggeredAt">) => {
    const fresh: Reminder = {
      ...newRem,
      id: `rem-${Date.now()}`,
      isCompleted: false
    };
    setReminders(prev => [...prev, fresh]);
    if (currentUser) {
      setDoc(doc(db, "users", currentUser.uid, "reminders", fresh.id), fresh)
        .catch(err => handleFirestoreError(err, OperationType.CREATE, `users/${currentUser.uid}/reminders/${fresh.id}`));
    }
  };

  const handleToggleReminder = (remId: string) => {
    const rToToggle = reminders.find(rem => rem.id === remId);
    if (rToToggle) {
      const updated = { ...rToToggle, isActive: !rToToggle.isActive };
      setReminders(prev => prev.map(r => r.id === remId ? updated : r));
      if (currentUser) {
        setDoc(doc(db, "users", currentUser.uid, "reminders", remId), updated)
          .catch(err => handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}/reminders/${remId}`));
      }
    }
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
            try {
              new Notification(title, { body, icon: "/favicon.ico" });
            } catch (fallbackErr) {
              console.warn("Direct Notification constructor failed inside SW fallback:", fallbackErr);
            }
          });
        } else {
          try {
            new Notification(title, { body, icon: "/favicon.ico" });
          } catch (err) {
            console.warn("Direct Notification constructor failed in non-SW path:", err);
          }
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

  // Synchronize active study session state to Firestore
  useEffect(() => {
    if (currentUser) {
      if (isStudyingUser) {
        if (studyStartTime !== null) {
          setDoc(doc(db, "users", currentUser.uid), {
            isStudyingUser: true,
            activeSubjectId: activeSubjectId,
            studyStartTimeMs: studyStartTime,
            studySecondsBaseline: studySecondsBaseline,
            studyTimerType: timerType
          }, { merge: true }).catch(err => {
            console.warn("Failed to sync study start session to cloud:", err);
          });
        }
      } else {
        setDoc(doc(db, "users", currentUser.uid), {
          isStudyingUser: false,
          activeSubjectId: "",
          studyStartTimeMs: null,
          studySecondsBaseline: 0
        }, { merge: true }).catch(err => {
          console.warn("Failed to clear active study session from cloud:", err);
        });
      }
    }
  }, [isStudyingUser, studyStartTime, studySecondsBaseline, activeSubjectId, timerType, currentUser]);

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
              }, 1000);
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
        fallbackInterval = setInterval(tick, 1000);
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
    let resolvedSubjectId = subjectId;
    
    // Fallback: If no subject ID provided, try to find the active subject that was started but not ended yet from Firestore
    if (!resolvedSubjectId && currentUser) {
      try {
        const { doc, getDoc } = await import("firebase/firestore");
        const userDocRef = doc(db, "users", currentUser.uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          const userData = docSnap.data();
          if (userData.activeSubjectId) {
            resolvedSubjectId = userData.activeSubjectId;
          }
        }
      } catch (err) {
        console.warn("Firestore active subject lookup fallback failed:", err);
      }
    }

    // Fallback to localStorage if still empty
    if (!resolvedSubjectId) {
      resolvedSubjectId = localStorage.getItem("study_active_subject_id") || "";
    }

    // Ultimate fallback: if still empty, use the first subject available so they never lose their minutes
    if (!resolvedSubjectId && subjects.length > 0) {
      resolvedSubjectId = subjects[0].id;
    }

    const todayStr = customDate || getLocalDateString();
    const targetSubject = subjects.find(s => s.id === resolvedSubjectId);
    if (!targetSubject) return;

    // Calculate existing minutes logged on this date to verify goal achievements
    const existingMinsForDate = studyLogs
      .filter(l => l.date === todayStr)
      .reduce((sum, l) => sum + l.durationMinutes, 0);

    // Create session entry
    const newLog: StudyLog = {
      id: `log-${Date.now()}`,
      date: todayStr,
      subjectId: resolvedSubjectId,
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

  const { level: currentStudentLvl, percent: currentStudentPercent } = calculateStudentLevel(userXp);

  return (
    <div className={`min-h-screen w-full max-w-full overflow-x-hidden flex flex-col justify-between pb-24 transition-all duration-500 relative select-none ${
      activeTheme === "light"
        ? (
            themePreset === "forest" ? "bg-gradient-to-br from-[#f2faf7] via-[#e6f5ef] to-[#d4efe4] text-[#065f46]" :
            themePreset === "crimson" ? "bg-gradient-to-br from-[#fff6f7] via-[#ffecf0] to-[#ffdce2] text-[#9d174d]" :
            themePreset === "honey" ? "bg-gradient-to-br from-[#fffdf5] via-[#fdf7e3] to-[#fbf1cc] text-[#9a3412]" :
            themePreset === "amoled" ? "bg-gradient-to-br from-[#f5f9ff] via-[#e9f2ff] to-[#dae8fc] text-[#1e40af]" :
            themePreset === "cosmic" ? "bg-gradient-to-br from-[#faf8ff] via-[#f1ebff] to-[#e4daff] text-[#5b21b6]" :
            themePreset === "cyberpunk" ? "bg-gradient-to-br from-[#fff7fb] via-[#fde9f4] to-[#fcd5ec] text-[#86198f]" :
            themePreset === "nordic" ? "bg-gradient-to-br from-[#f4fafc] via-[#e6f4f7] to-[#d2edf2] text-[#115e59]" :
            "bg-gradient-to-br from-[#fafbfc] via-[#f1f4f8] to-[#e4e9f0] text-[#c2410c]"
          )
        : (
            themePreset === "amoled" ? "bg-gradient-to-b from-[#000000] via-[#020205] to-[#000000] text-[#f1f5f9]" :
            themePreset === "forest" ? "bg-gradient-to-br from-[#010704] via-[#04110b] to-[#010403] text-[#ecfdf5]" :
            themePreset === "crimson" ? "bg-gradient-to-br from-[#080102] via-[#140205] to-[#060001] text-[#fff1f2]" :
            themePreset === "honey" ? "bg-gradient-to-br from-[#060301] via-[#100802] to-[#040200] text-[#fffbeb]" :
            themePreset === "cosmic" ? "bg-gradient-to-br from-[#020108] via-[#090518] to-[#020106] text-[#faf5ff]" :
            themePreset === "cyberpunk" ? "bg-gradient-to-br from-[#04010a] via-[#0e031a] to-[#020005] text-[#fdf2f8]" :
            themePreset === "nordic" ? "bg-gradient-to-br from-[#010408] via-[#05111b] to-[#010306] text-[#f0f9ff]" :
            "bg-gradient-to-br from-[#040406] via-[#090b12] to-[#030305] text-[#f8fafc]"
          )
    }`} id="f5-immersive-viewport-root">
      
      {/* Liquid Glass Background Drifting Blobs & Textured Grids */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <PremiumBackdrop themePreset={themePreset} userXp={userXp} />
        {/* Dynamic auroral glass blobs */}
        <div className={`absolute top-[10%] left-[10%] w-72 h-72 sm:w-96 sm:h-96 rounded-full blur-[65px] sm:blur-[95px] animate-blob-1 transition-all duration-1000 ${dynamicBlobs.blob1}`}></div>
        <div className={`absolute bottom-[20%] right-[8%] w-80 h-80 sm:w-[480px] sm:h-[480px] rounded-full blur-[75px] sm:blur-[105px] animate-blob-2 transition-all duration-1000 ${dynamicBlobs.blob2}`}></div>
        <div className={`absolute top-[45%] right-[22%] w-60 h-60 sm:w-85 sm:h-85 rounded-full blur-[55px] sm:blur-[85px] animate-blob-3 transition-all duration-1000 ${dynamicBlobs.blob3}`}></div>
        
        {/* Futuristic technical digital glass grid lines */}
        <div className="absolute inset-0 glass-grid opacity-60"></div>
        
        {/* Premium analog organic frosted noise texture */}
        <div className="absolute inset-0 noise-overlay opacity-[0.4] mix-blend-overlay"></div>
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
        <div className="max-w-[1720px] xl:max-w-[1850px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 relative z-10">
          
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

            {/* Level & XP HUD Badge */}
            <div 
              onClick={() => {
                setActiveTab("rewards");
              }}
              className={`bg-white/45 dark:bg-[#171717]/85 border ${currentThemeStyle.accentBorder} px-3.5 py-1.5 rounded-full flex items-center gap-2.5 font-mono text-[10.5px] cursor-pointer hover:scale-[1.03] active:scale-95 transition-all shadow-xs backdrop-blur-md shrink-0 select-none group`}
              title="Click to view Wishlist & Student Ranks"
            >
              <div className="flex items-center gap-1">
                <span className="text-[9px] uppercase font-black tracking-wider text-slate-400">LVL</span>
                <span className="font-black text-slate-800 dark:text-slate-100 group-hover:text-indigo-500 transition-colors">{currentStudentLvl}</span>
              </div>

              {/* Progress mini bar inside HUD */}
              <div className="w-14 h-1.5 bg-slate-200 dark:bg-slate-900 rounded-full overflow-hidden shrink-0">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${currentStudentPercent}%` }}
                />
              </div>

              <span className="text-[9px] font-black uppercase text-indigo-550 dark:text-indigo-400 group-hover:translate-x-0.5 transition-transform">
                {currentStudentPercent}%
              </span>
            </div>

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
      <main className="max-w-[1720px] xl:max-w-[1850px] px-4 md:px-6 xl:px-10 w-full mx-auto flex-1 flex flex-col justify-start relative transition-all duration-300">
        <div className="flex-1 flex flex-col pt-3 py-6" style={{ minHeight: "500px" }}>
          
          <div className="w-full flex flex-col space-y-3.5">

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
                      style={{ color: "#118d1b" }}
                      className="px-3.5 py-2 bg-slate-950/60 hover:bg-slate-900/60 border border-slate-800 font-extrabold text-[10px] uppercase tracking-wider rounded-xl cursor-pointer transition-all active:scale-95"
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
                  ownerEmail={ownerEmail}
                  currentUser={currentUser}
                  isTrialActive={isTrialActive}
                  trialDaysRemaining={trialDaysRemaining}
                  isPermanentlyUnlocked={isPermanentlyUnlocked}
                  onResetTrial={handleResetTrial}
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

            {activeTab === "beast" && (
              <motion.div
                key="beast"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
              >
                <BeastHub
                  themePreset={themePreset}
                  userXp={userXp}
                  onAddXp={handleAddXp}
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
        themePreset={themePreset}
        currentThemeStyle={currentThemeStyle}
        isTrialActive={isTrialActive}
        trialDaysRemaining={trialDaysRemaining}
        isPermanentlyUnlocked={isPermanentlyUnlocked}
        onResetTrial={handleResetTrial}
      />

      {/* Floating Centered bottom navigation Dock pills + Companion Button (Image 4 & 5) */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center items-center gap-2.5 sm:gap-3 z-40 px-3 sm:px-4">
        
        {/* Navigation dock bar */}
        <div className="liquid-glass px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-full flex items-center justify-center gap-1.5 xs:gap-2.5 sm:gap-5 md:gap-6 shadow-2xl border">
          {[
            { id: "focus", label: "Home", icon: Home },
            { id: "planner", label: "To-Do", icon: ClipboardCheck },
            { id: "beast", label: "Focus Citadel", icon: Sparkles },
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
            if (activeTab === "focus" || activeTab === "planner" || activeTab === "beast" || activeTab === "calendar" || activeTab === "target-suite" || activeTab === "reminders" || activeTab === "rewards") {
              setIsSidebarOpen(!isSidebarOpen);
            }
          }}
          className="w-11 h-11 sm:w-13 sm:h-13 liquid-glass active:scale-95 rounded-full flex items-center justify-center shadow-xl cursor-pointer hover:scale-105 transition-all shrink-0 border"
          style={{ color: currentThemeStyle.primary }}
          title="Flash5tudy Menu & Settings"
        >
          {activeTab === "focus" && <Layers className="w-5 h-5 animate-pulse" style={{ color: currentThemeStyle.primary }} />}
          {activeTab === "planner" && <Sparkles className="w-5 h-5 text-pink-500" />}
          {activeTab === "beast" && <Sparkles className="w-5 h-5 text-amber-500 animate-spin-slow" />}
          {activeTab === "rewards" && <Award className="w-5 h-5 text-amber-500 animate-bounce" />}
          {activeTab === "calendar" && <TrendingUp className="w-5 h-5 text-emerald-500" />}
          {activeTab === "target-suite" && <Target className="w-5 h-5" style={{ color: currentThemeStyle.primary }} />}
          {activeTab === "reminders" && <Bell className="w-5 h-5 text-violet-500 animate-pulse" />}
          {!["focus", "planner", "beast", "rewards", "calendar", "target-suite", "reminders"].includes(activeTab) && <Sparkles className="w-5 h-5 text-indigo-500 animate-spin-slow" />}
        </button>

      </div>

      {/* Tiny descriptive brand footer */}
      <footer className="w-full text-center text-slate-650 text-[10px] select-none pb-4 font-mono opacity-50">
        <p>© 2026 Flash5tudy. Built for consistent habit builders.</p>
      </footer>

      {showAuthModal && (
        <div 
          id="auth-modal-overlay"
          className="fixed inset-0 bg-[#060814d9]/95 backdrop-blur-md flex justify-center items-start md:items-center p-3 sm:p-6 z-[100] overflow-y-auto animate-fade-in"
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
            className="w-full max-w-[380px] sm:max-w-[420px] md:max-w-[850px] liquid-glass rounded-3xl border shadow-2xl relative text-left animate-modal-zoom-in flex flex-col md:flex-row md:h-[450px] my-auto overflow-hidden max-h-[calc(100vh-2rem)] overflow-y-auto md:overflow-hidden md:max-h-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left Info Column: Feature Value List (Only shown on Desktop/Tablets) */}
            <div className="hidden md:flex md:w-[46%] bg-white/30 dark:bg-black/10 backdrop-blur-md p-6 md:p-8 flex-col justify-between border-r border-slate-200/40 dark:border-white/5 relative overflow-hidden select-none shadow-inner">
              {/* Soft decorative background glows */}
              <div className="absolute top-[-20%] left-[-20%] w-[150px] h-[150px] rounded-full bg-blue-500/5 blur-2xl pointer-events-none"></div>
              <div className="absolute bottom-[-20%] right-[-20%] w-[150px] h-[150px] rounded-full bg-orange-500/5 blur-2xl pointer-events-none"></div>

              <div>
                <div className="flex items-center gap-1.5 font-sans text-2xl font-black tracking-tight mb-4 md:mb-6">
                  <span style={{ color: currentThemeStyle.primary }}>F</span>
                  <span className="text-[#4285F4]">l</span>
                  <span className="text-[#EA4335]">a</span>
                  <span className="text-[#FBBC05]">s</span>
                  <span className="text-[#34A853]">h</span>
                  <span style={{ color: currentThemeStyle.primary }}>5</span>
                  <span className="text-slate-800 dark:text-slate-100 font-extrabold">tudy</span>
                </div>

                <div className="space-y-3 md:space-y-4">
                  <div className="flex items-start gap-2.5 p-2.5 md:p-3 rounded-2xl bg-white/50 dark:bg-white/[0.02] border border-slate-200/40 dark:border-slate-800/40 backdrop-blur-xs">
                    <div className="w-8 h-8 rounded-xl bg-orange-500/10 dark:bg-orange-500/20 flex items-center justify-center text-orange-500 shrink-0">
                      <Flame className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Study Progress &amp; Streaks</h4>
                      <p className="text-[10px] text-slate-550 dark:text-slate-400 mt-0.5 leading-normal">
                        Secure your continuous streak, study timer intervals, and custom study notes.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-2.5 md:p-3 rounded-2xl bg-white/50 dark:bg-white/[0.02] border border-slate-200/40 dark:border-slate-800/40 backdrop-blur-xs">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
                      <Award className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Ranks &amp; XP Milestones</h4>
                      <p className="text-[10px] text-slate-550 dark:text-slate-400 mt-0.5 leading-normal">
                        Protect your earned experience points, level tiers, and custom reward achievements.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-2.5 md:p-3 rounded-2xl bg-white/50 dark:bg-white/[0.02] border border-slate-200/40 dark:border-slate-800/40 backdrop-blur-xs">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center text-blue-500 shrink-0">
                      <CloudLightning className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Seamless Cloud Syncing</h4>
                      <p className="text-[10px] text-slate-550 dark:text-slate-400 mt-0.5 leading-normal">
                        Synchronize your custom tasks, study boards, and exam targets across any browser.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono tracking-tight flex items-center gap-1 mt-4 md:mt-0">
                <span>⚡</span> Powered by Google Firebase Syncing
              </div>
            </div>

            {/* Right Form Column */}
            <div className="w-full md:w-[54%] p-5 sm:p-6 md:p-8 flex flex-col justify-between relative bg-white/10 dark:bg-[#0c0e17]/40 backdrop-blur-md">
              {/* Google-Style Top Multi-Colored Accent Line (Only on mobile as visual decoration) */}
              <div className="absolute top-0 left-0 right-0 h-1 md:hidden flex overflow-hidden">
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
                }}
                disabled={authLoading}
                className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full cursor-pointer transition-colors disabled:opacity-50 z-10"
                title="Continue as Guest"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="my-auto space-y-4 md:space-y-6">
                {/* Brand Logo for Mobile only (hidden on desktop because left side has it) */}
                <div className="flex flex-col items-center text-center select-none md:hidden">
                  <div className="flex items-center gap-1 font-sans text-2xl font-black tracking-tight mb-1">
                    <span style={{ color: currentThemeStyle.primary }}>F</span>
                    <span className="text-[#4285F4]">l</span>
                    <span className="text-[#EA4335]">a</span>
                    <span className="text-[#FBBC05]">s</span>
                    <span className="text-[#34A853]">h</span>
                    <span style={{ color: currentThemeStyle.primary }}>5</span>
                    <span className="text-slate-800 dark:text-slate-100 font-extrabold">tudy</span>
                  </div>
                  <span className="text-[9px] px-2 py-0.5 rounded-full font-bold tracking-wider uppercase border border-blue-500/20 text-blue-500 bg-blue-500/5 dark:bg-blue-500/10">
                    Cloud Synced Account
                  </span>
                </div>

                {/* Main Visual Heading Panel */}
                <div className="text-center md:text-left">
                  <h3 className="text-base sm:text-lg md:text-2xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100 font-sans leading-snug">
                    Save Your Every Progress! ✨
                  </h3>
                  <p className="text-[11px] md:text-xs text-slate-550 dark:text-slate-450 mt-1 md:mt-2 leading-relaxed">
                    Connect your Google Account to automatically sync and protect your complete study dashboard across all your devices.
                  </p>
                </div>

                {/* Value Cards on mobile only for concise preview (compact list) */}
                <div className="space-y-1.5 md:hidden">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80">
                    <Flame className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                    <span className="text-[10px] font-bold text-slate-750 dark:text-slate-300">Study Progress, Streaks &amp; Notes</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80">
                    <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="text-[10px] font-bold text-slate-750 dark:text-slate-300">XP Milestones, Rewards &amp; Tasks</span>
                  </div>
                </div>

                {/* Error or Success notification overlays */}
                {authError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-2 text-rose-500 text-[10.5px]">
                    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{authError}</span>
                  </div>
                )}

                {authSuccessMsg && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-emerald-500 text-[10.5px] font-bold">
                    <Sparkles className="w-3.5 h-3.5 shrink-0 text-emerald-500 animate-pulse" />
                    <span>{authSuccessMsg}</span>
                  </div>
                )}

                {/* Google Federated Sign In Button */}
                <div className="space-y-3 pt-1">
                  <button
                    id="auth-google-auth-btn-beautiful"
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
                    className="w-full py-3.5 bg-[#4285F4] hover:bg-[#357ae8] text-white text-xs font-black rounded-2xl cursor-pointer select-none transition-all flex items-center justify-center gap-3 hover:scale-[101%] active:scale-[99%] disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-blue-500/10 dark:shadow-blue-900/10 border border-blue-400/20"
                  >
                    {authLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        <span>Connecting Securely...</span>
                      </span>
                    ) : (
                      <>
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                          <path
                            fill="currentColor"
                            d="M12.24 10.285V13.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.579-7.859-8s3.529-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l2.427-2.334C18.155 2.153 15.463 1 12.24 1c-6.075 0-11 4.925-11 11s4.925 11 11 11c6.34 0 10.564-4.437 10.564-10.75 0-.726-.077-1.282-.175-1.965H12.24Z"
                          />
                        </svg>
                        <span className="font-bold tracking-tight text-[13px]">Sign In with Google</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowAuthModal(false);
                      setAuthError(null);
                      setAuthSuccessMsg(null);
                    }}
                    className="w-full py-2.5 text-center text-xs font-semibold text-slate-550 hover:text-slate-800 dark:hover:text-slate-350 cursor-pointer transition-all hover:underline"
                  >
                    Continue as Guest (Offline Mode)
                  </button>
                </div>
              </div>

              {/* Secure badge details */}
              <div className="text-[9.5px] text-center md:text-left text-slate-400 dark:text-slate-500 font-sans mt-4">
                🔒 Google Federated authentication securely verifies identity without sharing password credentials.
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
