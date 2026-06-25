export interface Subject {
  id: string;
  name: string;
  color: string; // Tailwind color class or hex code
  icon: string;  // lucide icon name
  totalMinutes: number; // accumulated total for today
  goalMinutes: number;  // daily target goal for this subject
}

export interface Task {
  id: string;
  title: string;
  isCompleted: boolean;
  subjectId: string; // maps to a Subject id, or "general"
}

export interface StudyLog {
  id: string;
  date: string; // YYYY-MM-DD format
  subjectId: string;
  subjectName: string;
  durationMinutes: number;
  timestamp: string; // ISO String
}

export interface Classmate {
  id: string;
  name: string;
  avatarSeed: string; // seed for profile colors
  isStudying: boolean; 
  activeSubjectName: string;
  studyDurationTodayMinutes: number; // total study time accumulated today
  activeSeconds: number; // simulated current ticking session
}

export interface RoomMember {
  id: string; // matches user's UID
  name: string; // displayName
  avatarSeed: string;
  isStudying: boolean;
  activeSubjectName: string;
  studyDurationTodayMinutes: number;
  activeSeconds: number;
  updatedAt?: string;
}

export interface RoomChat {
  id: string;
  userId: string;
  userName: string;
  userAvatarSeed: string;
  text: string;
  timestamp: string; // ISO String or UTC
}

export interface StudyRoom {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  currentUsersCount: number;
  creatorId?: string;
}

export interface AICoachAdvice {
  quote: string;
  rating: string;
  insights: string[];
  strategies: string[];
  scheduleTip: string;
}

export interface Reminder {
  id: string;
  title: string;
  time: string; // Time of day ("hh:mm") or duration minutes for relative timers
  type: "daily" | "one-shot" | "timer";
  durationMinutes?: number; // for countdown timers
  triggeredAt?: string; // ISO string when it was last fired
  isActive: boolean;
  isCompleted: boolean;
  subjectId?: string; // Optional linked subject
}

export interface GiftReward {
  id: string;
  title: string;
  costXp: number;
  purchaseUrl: string; // Amazon link or other product path
  category: "Tech Gadget" | "Desk Setup" | "Daily Treats" | "Books & Supplies" | "Custom Reward";
  isUnlocked: boolean;
  isClaimed: boolean;
  notes?: string;
  createdAt: string; // ISO date string
}

export interface XpGainLog {
  id: string;
  reason: string;
  amount: number;
  timestamp: string; // ISO String
}

export interface QuestChallenge {
  id: string;
  title: string;
  condition: string;
  xpReward: number;
  isCompleted: boolean;
  category: "daily" | "weekly" | "milestone";
}

export interface NotificationSettings {
  enableDesktopBanners: boolean;
  enableSoundEffects: boolean;
  notifyOnTimerAlerts: boolean;
  notifyOnReminderDue: boolean;
  notifyOnDailyGoalMet: boolean;
  notifyOnLevelUp: boolean;
  activeSoundPreset: "chime" | "success" | "break";
}

export interface StudentLevelConfig {
  level: number;
  xpRequired: number;
  rank: string;
  badge: string;
  color: string;
  perk: string;
  category: "Bronze" | "Silver" | "Gold" | "Platinum" | "Grandmaster";
}

// 35 custom progression levels matching a perfect balanced "medium-easy" progression curve
export const ALL_STUDENT_LEVELS: StudentLevelConfig[] = [
  { level: 1, xpRequired: 0, rank: "Novice Neophyte", badge: "🌱", color: "from-amber-600 to-amber-800 text-amber-500", perk: "Basic Chimes & Breathing anchors unlocked.", category: "Bronze" },
  { level: 2, xpRequired: 300, rank: "Focus Novice", badge: "🥉", color: "from-amber-600 to-amber-800 text-amber-500", perk: "Rollover Simulator diagnostics unlocked.", category: "Bronze" },
  { level: 3, xpRequired: 750, rank: "Persistent Padawan", badge: "🥉", color: "from-amber-600 to-amber-700 text-amber-500", perk: "Unlocks Matcha Forest Theme (+10% Task XP Speed).", category: "Bronze" },
  { level: 4, xpRequired: 1350, rank: "Cognitive Crawler", badge: "🥉", color: "from-amber-600 to-amber-800 text-amber-500", perk: "Unlocks relative clock timers configuration.", category: "Bronze" },
  { level: 5, xpRequired: 2100, rank: "Deep Worker Initiate", badge: "🥈", color: "from-slate-400 to-slate-600 text-slate-300", perk: "Active study alarm custom descriptions.", category: "Silver" },
  { level: 6, xpRequired: 3000, rank: "Mindful Scholar", badge: "🥈", color: "from-slate-400 to-slate-600 text-slate-300", perk: "Unlocks beautiful Sunset Crimson Theme.", category: "Silver" },
  { level: 7, xpRequired: 4050, rank: "Habit Sculptor", badge: "🥈", color: "from-slate-400 to-slate-600 text-slate-300", perk: "+5% faster study XP during Focus Rounds.", category: "Silver" },
  { level: 8, xpRequired: 5250, rank: "Attention Architect", badge: "🥈", color: "from-slate-400 to-slate-600 text-slate-300", perk: "Unlocks customizable relative buzzer options.", category: "Silver" },
  { level: 9, xpRequired: 6600, rank: "Zen Navigator", badge: "🥈", color: "from-slate-400 to-slate-600 text-slate-300", perk: "Ambient drift blobs modern style layouts.", category: "Silver" },
  { level: 10, xpRequired: 8100, rank: "Gold Polymath", badge: "🥇", color: "from-yellow-500 to-amber-600 text-yellow-500", perk: "Unlocks Amber Honey Theme (+Daily Sync Recovery).", category: "Gold" },
  { level: 11, xpRequired: 9750, rank: "Flow State Explorer", badge: "🥇", color: "from-yellow-500 to-amber-600 text-yellow-500", perk: "+10% study XP multiplier on all daily quests.", category: "Gold" },
  { level: 12, xpRequired: 11550, rank: "Cognitive Athlete", badge: "🥇", color: "from-yellow-500 to-amber-600 text-yellow-500", perk: "Unlocks Wishlist Custom Rewards category tags.", category: "Gold" },
  { level: 13, xpRequired: 13500, rank: "Focus Vanguard", badge: "🥇", color: "from-yellow-500 to-amber-600 text-yellow-500", perk: "Unlocks custom buzzer overlay tags.", category: "Gold" },
  { level: 14, xpRequired: 15600, rank: "Sovereign of Silence", badge: "🥇", color: "from-yellow-500 to-amber-650 text-yellow-500", perk: "Focus Shield Aura glowing particle path animation.", category: "Gold" },
  { level: 15, xpRequired: 17850, rank: "Flow Alchemist", badge: "💎", color: "from-cyan-400 to-blue-600 text-cyan-400", perk: "Unlocks OLED Black Theme (+Streak auto-healing duration).", category: "Platinum" },
  { level: 16, xpRequired: 20250, rank: "Clarity Alchemist", badge: "💎", color: "from-cyan-400 to-blue-600 text-cyan-400", perk: "Unlocks visual borders layout customization.", category: "Platinum" },
  { level: 17, xpRequired: 22800, rank: "Transcendent Thinker", badge: "💎", color: "from-cyan-400 to-blue-600 text-cyan-400", perk: "+15% XP yields across checklist task completions.", category: "Platinum" },
  { level: 18, xpRequired: 25500, rank: "Master of Focus", badge: "💎", color: "from-cyan-400 to-blue-600 text-cyan-400", perk: "Unlocks Ascent Arp chime sound engine multiplier.", category: "Platinum" },
  { level: 19, xpRequired: 28350, rank: "Elysian Flow Sage", badge: "💎", color: "from-cyan-400 to-blue-600 text-cyan-400", perk: "Premium cosmic ambient drifting color filters.", category: "Platinum" },
  { level: 20, xpRequired: 31350, rank: "Grandmaster Mindful", badge: "🏆", color: "from-amber-400 via-rose-500 to-indigo-600 text-amber-500 animate-pulse", perk: "Pinnacle Level status badge, custom glowing page profiles.", category: "Grandmaster" },
  { level: 21, xpRequired: 34500, rank: "Astral Scholar", badge: "🌌", color: "from-purple-500 via-pink-500 to-red-550 text-pink-500 animate-pulse", perk: "Unlocks Astral visual study overlays & custom clock sounds.", category: "Grandmaster" },
  { level: 22, xpRequired: 37800, rank: "Hyperfocus Hybrid", badge: "🚀", color: "from-purple-500 via-pink-500 to-red-550 text-pink-500 animate-pulse", perk: "Deep Focus Ambient soundscapes and custom clock sound filters.", category: "Grandmaster" },
  { level: 23, xpRequired: 41250, rank: "Chamber Connoisseur", badge: "🪐", color: "from-indigo-500 via-purple-500 to-pink-500 text-purple-400 animate-pulse", perk: "+10% task completions bonus multiplier & custom sound wave effects.", category: "Grandmaster" },
  { level: 24, xpRequired: 44850, rank: "Quantum Scholar", badge: "🔬", color: "from-indigo-500 via-purple-500 to-pink-500 text-purple-400 animate-pulse", perk: "Prestige aura layout and special glassmorphism settings.", category: "Grandmaster" },
  { level: 25, xpRequired: 48600, rank: "Tokyo Neo Runner", badge: "🌆", color: "from-pink-500 via-purple-500 to-cyan-500 text-cyan-400 animate-pulse", perk: "Unlocks Tokyo Cyberpunk Theme! Cozy neon lasers.", category: "Grandmaster" },
  { level: 26, xpRequired: 52500, rank: "Starlight Sentinel", badge: "⚔️", color: "from-pink-500 via-purple-500 to-cyan-500 text-cyan-400 animate-pulse", perk: "Fires double decorative particle clouds upon round finish.", category: "Grandmaster" },
  { level: 27, xpRequired: 56550, rank: "Nebula Navigator", badge: "🛸", color: "from-indigo-600 via-blue-500 to-emerald-500 text-emerald-400 animate-pulse", perk: "Cosmic stellar sound filters on pomodoro buzzers.", category: "Grandmaster" },
  { level: 28, xpRequired: 60800, rank: "Zenith Master", badge: "💮", perk: "Unlocks beautiful cherry blossom active backdrop filters.", color: "from-indigo-600 via-blue-500 to-emerald-500 text-emerald-400 animate-pulse", category: "Grandmaster" },
  { level: 29, xpRequired: 65200, rank: "Subzero Sage", badge: "❄️", perk: "Unlocks polar frost visual study frame elements.", color: "from-sky-500 via-teal-500 to-indigo-600 text-sky-400 animate-pulse", category: "Grandmaster" },
  { level: 30, xpRequired: 69800, rank: "Aurora Archon", badge: "👑", perk: "Unlocks Nordic Frost & Aurora Blue Theme! Prestige status.", color: "from-sky-500 via-teal-500 to-indigo-600 text-sky-400 animate-pulse", category: "Grandmaster" },
  { level: 31, xpRequired: 74600, rank: "Polar Architect", badge: "🏰", perk: "Subzero ambient sound synthesizer frequency boosts.", color: "from-sky-400 via-cyan-400 to-blue-500 text-cyan-300 animate-pulse", category: "Grandmaster" },
  { level: 32, xpRequired: 79600, rank: "Cosmic Overlord", badge: "☄️", perk: "Prestige badge on chatrooms, dual concurrent timers tracking.", color: "from-violet-600 via-pink-500 to-cyan-400 text-pink-300 animate-pulse", category: "Grandmaster" },
  { level: 33, xpRequired: 84800, rank: "Eclipse Vanguard", badge: "🌑", perk: "Ambient eclipse shadow screen dark-out during Pomodoro rounds.", color: "from-violet-600 via-pink-500 to-cyan-400 text-pink-300 animate-pulse", category: "Grandmaster" },
  { level: 34, xpRequired: 90200, rank: "Eternal Flow Sovereign", badge: "💫", perk: "Special auto-saving slots & golden glow overlay status.", color: "from-amber-450 via-rose-550 to-violet-650 text-amber-400 animate-pulse", category: "Grandmaster" },
  { level: 35, xpRequired: 95800, rank: "Pinnacle Grandmaster Academic", badge: "🏆", perk: "Pinnacle level badge design, fully customizable outer profile halos.", color: "from-amber-450 via-rose-550 to-violet-650 text-amber-400 animate-pulse", category: "Grandmaster" }
];

// Levels and ranks engine - dynamic, progressive nonlinear calculation
export const calculateStudentLevel = (xp: number) => {
  const safeXp = Math.max(0, xp);
  
  // Find matched level from highest down
  const sortedLevels = [...ALL_STUDENT_LEVELS].sort((a, b) => b.level - a.level);
  const matchedLevel = sortedLevels.find(l => safeXp >= l.xpRequired) || ALL_STUDENT_LEVELS[0];
  const level = matchedLevel.level;
  
  const rank = `${matchedLevel.rank} ${matchedLevel.badge}`;
  const color = matchedLevel.color;
  const perk = matchedLevel.perk;
  const category = matchedLevel.category;

  let xpInCurrentLevel = 0;
  let xpSegmentTotal = 400;
  let percent = 0;
  let nextLevelXpRemaining = 400;
  let xpRequiredNext = 400;

  const nextLevel = ALL_STUDENT_LEVELS.find(l => l.level === level + 1);
  if (nextLevel) {
    xpSegmentTotal = nextLevel.xpRequired - matchedLevel.xpRequired;
    xpInCurrentLevel = safeXp - matchedLevel.xpRequired;
    xpRequiredNext = nextLevel.xpRequired;
    percent = Math.min(100, Math.round((xpInCurrentLevel / xpSegmentTotal) * 100));
    nextLevelXpRemaining = nextLevel.xpRequired - safeXp;
  } else {
    // Exceeded Level 35 max config limit, keep advancing on custom intervals
    const extraXp = safeXp - matchedLevel.xpRequired;
    const interval = 15000; // 15000 XP per level in prestige ranks above 35
    const extraLevels = Math.floor(extraXp / interval);
    const finalLevel = 35 + extraLevels;
    
    xpInCurrentLevel = extraXp % interval;
    xpSegmentTotal = interval;
    xpRequiredNext = matchedLevel.xpRequired + (extraLevels + 1) * interval;
    percent = Math.min(100, Math.round((xpInCurrentLevel / interval) * 100));
    nextLevelXpRemaining = interval - xpInCurrentLevel;
    
    return {
      level: finalLevel,
      xpInCurrentLevel,
      xpSegmentTotal,
      percent,
      rank: `Grandmaster Prestige 🏆`,
      color: "from-amber-450 via-rose-550 to-violet-650 text-amber-400 animate-pulse",
      perk: "Prestige Grandmaster tier status. Elite scholar.",
      category: "Grandmaster" as const,
      xpRequiredNext,
      nextLevelXpRemaining
    };
  }

  return {
    level,
    xpInCurrentLevel,
    xpSegmentTotal,
    percent,
    rank,
    color,
    perk,
    category,
    xpRequiredNext,
    nextLevelXpRemaining
  };
};

export const getXpRateForLevel = (level: number): number => {
  return level < 5 ? 5 : 10;
};

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  timesReviewed: number;
  correctCount: number;
  lastRating?: "easy" | "good" | "hard";
  lastReviewedAt?: string;
}

export interface FlashcardDeck {
  id: string;
  title: string;
  description: string;
  subjectId: string;
  cards: Flashcard[];
  color: string;
  createdAt: string;
  lastReviewedAt?: string;
}

export interface ExamTarget {
  id: string;
  title: string;
  subjectId: string;
  examDate: string; // YYYY-MM-DD
  targetGrade: string; // e.g. "A*", "A", "95%"
  preparationLevel: number; // 0 to 100
  checklist: { id: string; text: string; isDone: boolean }[];
  difficulty: "Easy" | "Medium" | "Hard" | "Expert";
}

export interface GpaCourse {
  id: string;
  name: string;
  creditHours: number;
  currentGradePercent: number;
  targetGradePercent: number;
  remainingWeightPercent: number; // e.g., 40% of grade left to be determined
}

/**
 * Formats precise study minutes (including fractions) into human-readable hours, minutes, and seconds.
 * Perfect for 100% accuracy, even under 5 seconds!
 */
export const formatStudyTimeExact = (minutes: number): string => {
  const totalSeconds = Math.round(minutes * 60);
  if (totalSeconds <= 0) return "0 secs";
  
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  
  const parts: string[] = [];
  if (h > 0) {
    parts.push(`${h} hr${h > 1 ? "s" : ""}`);
  }
  if (m > 0) {
    parts.push(`${m} min${m > 1 ? "s" : ""}`);
  }
  if (s > 0 || (h === 0 && m === 0)) {
    parts.push(`${s} sec${s > 1 ? "s" : ""}`);
  }
  return parts.join(" ");
};






