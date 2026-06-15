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

// 20 custom progression levels matching advanced progressive XP requirements to push toward hard work
export const ALL_STUDENT_LEVELS: StudentLevelConfig[] = [
  { level: 1, xpRequired: 0, rank: "Novice Neophyte", badge: "🌱", color: "from-amber-600 to-amber-800 text-amber-500", perk: "Basic Chimes & Breathing anchors unlocked.", category: "Bronze" },
  { level: 2, xpRequired: 400, rank: "Focus Novice", badge: "🥉", color: "from-amber-600 to-amber-800 text-amber-500", perk: "Rollover Simulator diagnostics unlocked.", category: "Bronze" },
  { level: 3, xpRequired: 1000, rank: "Persistent Padawan", badge: "🥉", color: "from-amber-600 to-amber-805 text-amber-500", perk: "Unlocks Matcha Forest Theme (+10% Task XP Speed).", category: "Bronze" },
  { level: 4, xpRequired: 1800, rank: "Cognitive Crawler", badge: "🥉", color: "from-amber-600 to-amber-808 text-amber-500", perk: "Unlocks relative clock timers configuration.", category: "Bronze" },
  { level: 5, xpRequired: 3000, rank: "Deep Worker Initiate", badge: "🥈", color: "from-slate-350 to-slate-505 text-slate-300", perk: "Active study alarm custom descriptions.", category: "Silver" },
  { level: 6, xpRequired: 4500, rank: "Mindful Scholar", badge: "🥈", color: "from-slate-355 to-slate-510 text-slate-300", perk: "Unlocks beautiful Sunset Crimson Theme.", category: "Silver" },
  { level: 7, xpRequired: 6300, rank: "Habit Sculptor", badge: "🥈", color: "from-slate-360 to-slate-515 text-slate-300", perk: "+5% faster study XP during Focus Rounds.", category: "Silver" },
  { level: 8, xpRequired: 8400, rank: "Attention Architect", badge: "🥈", color: "from-slate-350 to-slate-500 text-slate-300", perk: "Unlocks customizable relative buzzer options.", category: "Silver" },
  { level: 9, xpRequired: 10800, rank: "Zen Navigator", badge: "🥈", color: "from-slate-350 to-slate-500 text-slate-300", perk: "Ambient drift blobs modern style layouts.", category: "Silver" },
  { level: 10, xpRequired: 13500, rank: "Gold Polymath", badge: "🥇", color: "from-yellow-450 to-amber-505 text-yellow-500", perk: "Unlocks Amber Honey Theme (+Daily Sync Recovery).", category: "Gold" },
  { level: 11, xpRequired: 16600, rank: "Flow State Explorer", badge: "🥇", color: "from-yellow-450 to-amber-505 text-yellow-500", perk: "+10% study XP multiplier on all daily quests.", category: "Gold" },
  { level: 12, xpRequired: 20100, rank: "Cognitive Athlete", badge: "🥇", color: "from-yellow-450 to-amber-505 text-yellow-500", perk: "Unlocks Wishlist Custom Rewards category tags.", category: "Gold" },
  { level: 13, xpRequired: 24000, rank: "Focus Vanguard", badge: "🥇", color: "from-yellow-450 to-amber-505 text-yellow-500", perk: "Unlocks custom buzzer overlay tags.", category: "Gold" },
  { level: 14, xpRequired: 28305, rank: "Sovereign of Silence", badge: "🥇", color: "from-yellow-450 to-amber-550 text-yellow-500", perk: "Focus Shield Aura glowing particle path animation.", category: "Gold" },
  { level: 15, xpRequired: 33100, rank: "Flow Alchemist", badge: "💎", color: "from-cyan-405 to-blue-605 text-cyan-400", perk: "Unlocks OLED Black Theme (+Streak auto-healing duration).", category: "Platinum" },
  { level: 16, xpRequired: 38450, rank: "Clarity Alchemist", badge: "💎", color: "from-cyan-405 to-blue-605 text-cyan-400", perk: "Unlocks visual borders layout customization.", category: "Platinum" },
  { level: 17, xpRequired: 44200, rank: "Transcendent Thinker", badge: "💎", color: "from-cyan-405 to-blue-605 text-cyan-400", perk: "+15% XP yields across checklist task completions.", category: "Platinum" },
  { level: 18, xpRequired: 50500, rank: "Master of Focus", badge: "💎", color: "from-cyan-405 to-blue-605 text-cyan-400", perk: "Unlocks Ascent Arp chime sound engine multiplier.", category: "Platinum" },
  { level: 19, xpRequired: 57300, rank: "Elysian Flow Sage", badge: "💎", color: "from-cyan-405 to-blue-605 text-cyan-400", perk: "Premium cosmic ambient drifting color filters.", category: "Platinum" },
  { level: 20, xpRequired: 65000, rank: "Grandmaster Mindful", badge: "🏆", color: "from-amber-400 via-rose-500 to-indigo-600 text-amber-400 animate-pulse", perk: "Pinnacle Level status badge, custom glowing page profiles.", category: "Grandmaster" }
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
    // Exceeded Level 20 max config limit, keep advancing on custom intervals
    const extraXp = safeXp - matchedLevel.xpRequired;
    const interval = 10000; // 10000 XP per level in prestige ranks
    const extraLevels = Math.floor(extraXp / interval);
    const finalLevel = 20 + extraLevels;
    
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



