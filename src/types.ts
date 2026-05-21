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


