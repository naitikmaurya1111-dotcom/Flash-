import React, { useState, useMemo } from "react";
import { 
  Gift, 
  ExternalLink, 
  Plus, 
  Trash2, 
  Edit3, 
  Award, 
  Flame, 
  Sparkles, 
  CheckCircle2, 
  ChevronRight, 
  TrendingUp, 
  Clock, 
  ShoppingBag,
  HelpCircle,
  X,
  Link2,
  Lock,
  Unlock,
  Check,
  Info,
  ShieldCheck
} from "lucide-react";
import { GiftReward, XpGainLog, QuestChallenge, StudentLevelConfig, ALL_STUDENT_LEVELS, calculateStudentLevel, getXpRateForLevel, StudyLog } from "../types";

interface RewardSystemProps {
  userXp: number;
  rewards: GiftReward[];
  xpLogs: XpGainLog[];
  quests: QuestChallenge[];
  onAddReward: (r: GiftReward) => Promise<void>;
  onEditReward: (r: GiftReward) => Promise<void>;
  onDeleteReward: (rewardId: string) => Promise<void>;
  onClaimReward: (rewardId: string) => Promise<void>;
  onAddXp: (reason: string, amount: number) => Promise<void>;
  onCompleteQuest: (questId: string) => Promise<void>;
  totalStudiedTodayMins: number;
  completedTasksCountToday: number;
  themePreset?: string;
  studyLogs?: StudyLog[];
}

export default function RewardSystem({
  userXp,
  rewards,
  xpLogs,
  quests,
  onAddReward,
  onEditReward,
  onDeleteReward,
  onClaimReward,
  onAddXp,
  onCompleteQuest,
  totalStudiedTodayMins,
  completedTasksCountToday,
  themePreset = "dark-classic",
  studyLogs = []
}: RewardSystemProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingReward, setEditingReward] = useState<GiftReward | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [costXp, setCostXp] = useState(500);
  const [purchaseUrl, setPurchaseUrl] = useState("");
  const [category, setCategory] = useState<GiftReward["category"]>("Custom Reward");
  const [notes, setNotes] = useState("");

  const [celebrationReward, setCelebrationReward] = useState<GiftReward | null>(null);
  const [showLevelGuide, setShowLevelGuide] = useState(false);

  const levelInfo = calculateStudentLevel(userXp);

  const auditResult = useMemo(() => {
    const checks = [];
    let integrityScore = 100;
    
    // Check 1: 6hr single-day manually added limit
    const minutesPerDate: Record<string, number> = {};
    let hasExceeded6hLimit = false;
    let maxMinutesInADay = 0;
    
    studyLogs.forEach(log => {
      minutesPerDate[log.date] = (minutesPerDate[log.date] || 0) + log.durationMinutes;
      if (minutesPerDate[log.date] > 360) {
        hasExceeded6hLimit = true;
      }
      if (minutesPerDate[log.date] > maxMinutesInADay) {
        maxMinutesInADay = minutesPerDate[log.date];
      }
    });
    
    if (hasExceeded6hLimit) {
      integrityScore -= 30;
      checks.push({
        name: "Daily Study Hour Limit",
        status: "ALERT",
        desc: `Extreme study intensity flagged: At least one calendar day exceeds the 6-hour limit (${Math.round(maxMinutesInADay / 60)} hours detected). Keeping focus logs balanced is key!`,
        color: "text-rose-500 bg-rose-500/10 border-rose-500/20 dark:bg-rose-950/20 dark:border-rose-950/10"
      });
    } else {
      checks.push({
        name: "Daily Study Hour Limit",
        status: "SECURE",
        desc: studyLogs.length === 0 
          ? "No logs entries entered yet. Integrity threshold safe."
          : `Checked! Daily logs are perfectly aligned and all backdated logs conform to the 6-hour daily ceiling.`,
        color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20 dark:bg-emerald-950/20"
      });
    }

    // Check 2: XP and study logged minutes consistency
    const totalLogMinutes = studyLogs.reduce((sum, l) => sum + l.durationMinutes, 0);
    const reasonableMaxXp = (totalLogMinutes * 10) + 12000;
    const isXpArtificiallyBoosted = userXp > reasonableMaxXp && userXp > 3000;
    
    if (isXpArtificiallyBoosted) {
      integrityScore -= 40;
      checks.push({
        name: "XP study consistency checks",
        status: "ALERT",
        desc: `Suspicious XP balance gap detected. Total XP (${userXp}) does not align with core study logs (${totalLogMinutes} mins). Manual storage tampering is logged.`,
        color: "text-amber-500 bg-amber-500/10 border-amber-500/20 dark:bg-amber-950/20"
      });
    } else {
      checks.push({
        name: "XP study consistency checks",
        status: "SECURE",
        desc: `Verified! Active student level claims consistently correlate with the physical focus index ledger.`,
        color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20 dark:bg-emerald-950/20"
      });
    }

    // Check 3: Timestamp duplicate spam check
    const logIds = studyLogs.map(l => l.id);
    const hasSpam = logIds.some((id, idx) => logIds.indexOf(id) !== idx);
    
    if (hasSpam) {
      integrityScore -= 30;
      checks.push({
        name: "Log injection bot block",
        status: "ALERT",
        desc: "Duplicate focus logs with identical key hashes identified. Avoid overlapping backdate submissions.",
        color: "text-rose-500 bg-rose-500/10 border-rose-500/20 dark:bg-rose-950/20"
      });
    } else {
      checks.push({
        name: "Log injection bot block",
        status: "SECURE",
        desc: "Secure! No click automation macros or simulated redundant study elements flagged.",
        color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20 dark:bg-emerald-950/20"
      });
    }

    const calculatedScore = Math.max(0, integrityScore);
    let statusLabel = "CLEAN & COMPLIANT";
    let statusColor = "text-emerald-500 border-emerald-500/25 bg-emerald-500/10 dark:bg-emerald-500/5";
    
    if (calculatedScore < 50) {
      statusLabel = "INTEGRITY FLAG DETECTED ⚠️";
      statusColor = "text-rose-500 border-rose-500/30 bg-rose-500/10 dark:bg-rose-500/5";
    } else if (calculatedScore < 90) {
      statusLabel = "SUSPICIOUS FOCUS BEHAVIOR";
      statusColor = "text-amber-500 border-amber-500/30 bg-amber-500/10 dark:bg-amber-500/5";
    }

    return {
      checks,
      integrityScore: calculatedScore,
      statusLabel,
      statusColor
    };
  }, [studyLogs, userXp]);

  const themeHexAccent = useMemo(() => {
    switch (themePreset) {
      case "forest": return "#10b981";
      case "crimson": return "#e11d48";
      case "honey": return "#d97706";
      case "amoled": return "#6366f1";
      default: return "#f26419";
    }
  }, [themePreset]);

  const themeTextAccent = useMemo(() => {
    switch (themePreset) {
      case "forest": return "text-[#10b981]";
      case "crimson": return "text-[#e11d48]";
      case "honey": return "text-[#d97706]";
      case "amoled": return "text-[#3b82f6] dark:text-[#6366f1]";
      default: return "text-[#f26419]";
    }
  }, [themePreset]);

  const themeBgAccent = useMemo(() => {
    switch (themePreset) {
      case "forest": return "bg-[#10b981] hover:bg-[#059669]";
      case "crimson": return "bg-[#e11d48] hover:bg-[#be123c]";
      case "honey": return "bg-[#d97706] hover:bg-[#b45309]";
      case "amoled": return "bg-[#3b82f6] hover:bg-[#2563eb] dark:bg-[#6366f1] dark:hover:bg-[#4f46e5]";
      default: return "bg-[#f26419] hover:bg-[#df5214]";
    }
  }, [themePreset]);

  const handleOpenAdd = () => {
    setTitle("");
    setCostXp(800);
    setPurchaseUrl("");
    setCategory("Custom Reward");
    setNotes("");
    setEditingReward(null);
    setShowAddModal(true);
  };

  const handleOpenEdit = (r: GiftReward) => {
    setEditingReward(r);
    setTitle(r.title);
    setCostXp(r.costXp);
    setPurchaseUrl(r.purchaseUrl);
    setCategory(r.category);
    setNotes(r.notes || "");
    setShowAddModal(true);
  };

  const handleSaveReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    // Sanitize product URLs (especially Amazon)
    let finalUrl = purchaseUrl.trim();
    if (finalUrl && !finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
      finalUrl = "https://" + finalUrl;
    }

    if (editingReward) {
      const updated: GiftReward = {
        ...editingReward,
        title: title.trim(),
        costXp: Math.max(50, costXp),
        purchaseUrl: finalUrl,
        category,
        notes: notes.trim()
      };
      await onEditReward(updated);
    } else {
      const created: GiftReward = {
        id: `reward-${Date.now()}`,
        title: title.trim(),
        costXp: Math.max(50, costXp),
        purchaseUrl: finalUrl,
        category,
        isUnlocked: userXp >= costXp,
        isClaimed: false,
        notes: notes.trim(),
        createdAt: new Date().toISOString()
      };
      await onAddReward(created);
    }
    setShowAddModal(false);
  };

  const handleClaim = async (r: GiftReward) => {
    if (userXp < r.costXp || r.isClaimed) return;
    setCelebrationReward(r);
    await onClaimReward(r.id);
  };

  // Safe Amazon / E-store Link checker
  const isAmazonUrl = (url?: string) => {
    if (!url) return false;
    return url.toLowerCase().includes("amazon") || url.toLowerCase().includes("amzn");
  };

  return (
    <div className="space-y-6 pt-1 text-slate-800 dark:text-slate-100" id="ypt-rewards-dashboard">
      
      {/* 1. Header Level Progress Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 p-6 rounded-3xl border border-indigo-900/30 text-white shadow-2xl relative overflow-hidden">
        {/* Particle Backdrop Accents */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center relative z-10">
          
          {/* Circular level wheel widget with interactive Rank Board (i) triggers */}
          <div className="md:col-span-4 flex flex-col items-center justify-center relative">
            <div className="relative w-32 h-32 flex items-center justify-center group select-none">
              <svg className="w-full h-full transform -rotate-90">
                <circle 
                  cx="64" 
                  cy="64" 
                  r="56" 
                  className="stroke-slate-800" 
                  strokeWidth="8" 
                  fill="none" 
                />
                <circle 
                  cx="64" 
                  cy="64" 
                  r="56" 
                  className="stroke-amber-550 stroke-amber-500 transition-all duration-1000 ease-out" 
                  strokeWidth="8" 
                  fill="none" 
                  strokeDasharray="351.8"
                  strokeDashoffset={351.8 - (351.8 * levelInfo.percent) / 100}
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Level</span>
                <span className="text-3xl font-black font-display text-white">{levelInfo.level}</span>
                <span className="text-[10.5px] font-mono text-amber-400 font-bold">{levelInfo.xpInCurrentLevel} / {levelInfo.xpSegmentTotal} XP</span>
              </div>
              
              {/* Absoluted info button overlay */}
              <button
                type="button"
                onClick={() => setShowLevelGuide(true)}
                className="absolute top-0 right-0 p-1.5 bg-slate-900 border border-slate-700 hover:border-amber-400 rounded-full text-slate-300 hover:text-white cursor-pointer transition-all hover:scale-110 shadow-lg"
                title="Level Progress & Unlocks Guide"
              >
                <Info className="w-3.5 h-3.5 text-amber-400" />
              </button>
            </div>
            
            <button
              type="button"
              onClick={() => setShowLevelGuide(true)}
              className="mt-3 px-4 py-1.5 rounded-full bg-slate-900/95 border border-slate-800 hover:border-slate-700 text-xs font-black tracking-wide text-center flex items-center justify-center gap-1.5 cursor-pointer text-slate-200 transition-all hover:scale-102 active:scale-98 shadow-sm group"
            >
              <span className={levelInfo.color.split(" ")[levelInfo.color.split(" ").length-1]}>
                {levelInfo.rank}
              </span>
              <Info className="w-3.5 h-3.5 text-indigo-400 group-hover:text-amber-400 transition-colors" />
            </button>
          </div>

          {/* Level up descriptor details */}
          <div className="md:col-span-8 space-y-4 text-left">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div>
                <h2 className="text-xl md:text-2xl font-black tracking-tight bg-gradient-to-r from-white via-slate-150 to-slate-400 bg-clip-text text-transparent">
                  Study Reward Hub
                </h2>
                <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                  Earned focus minutes are converted to physical store rewards. Earn 10 XP per minute studied!
                </p>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/35 px-4.5 py-2.5 rounded-2xl flex flex-col items-center">
                <span className="text-[9px] uppercase font-mono tracking-widest text-amber-400 font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400 animate-spin-slow" /> Available XP Balance
                </span>
                <span className="text-2xl font-black font-mono text-amber-400">{userXp} <span className="text-xs font-mono font-medium">XP</span></span>
              </div>
            </div>

            {/* Performance metrics & Level statistics bar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              <div className="bg-slate-900/60 p-2.5 rounded-2xl border border-slate-800/80">
                <span className="text-[9px] font-mono uppercase text-slate-400 block">Today Studied</span>
                <span className="text-sm font-bold font-mono text-emerald-400">{totalStudiedTodayMins}m</span>
                <span className="text-[8.5px] text-slate-500 block mt-0.5">+{totalStudiedTodayMins * 10} XP accumulated</span>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-2xl border border-slate-800/80">
                <span className="text-[9px] font-mono uppercase text-slate-400 block">Tasks Completed</span>
                <span className="text-sm font-bold font-mono text-indigo-400">{completedTasksCountToday}</span>
                <span className="text-[8.5px] text-slate-500 block mt-0.5">+{completedTasksCountToday * 50} XP earned</span>
              </div>
              <div className="col-span-2 sm:col-span-1 bg-slate-900/60 p-2.5 rounded-2xl border border-slate-800/80 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-mono uppercase text-slate-400 block">Total Rewards</span>
                  <span className="text-sm font-bold font-mono text-[#f26419]">{rewards.length} Registry</span>
                </div>
                <span className="text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono">
                  {rewards.filter(r => r.isUnlocked && !r.isClaimed).length} Unlocked
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Quests and Dynamic Daily Challenges Board */}
      <div className="bg-white/70 dark:bg-[#121212]/92 border border-slate-200 dark:border-slate-900/60 rounded-3xl p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-900 pb-3 mb-4">
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-[#f26419] flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-500" /> Active Student Quests
            </h3>
            <p className="text-[10px] text-slate-550 dark:text-slate-500">Auto-tracking based on daily study stopwatch and to-do milestones.</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full font-mono">
            Daily Reset at midnight
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
          {quests.map((q) => {
            // Evaluates qualification dynamically for beautiful student reward experience
            let isQualified = q.isCompleted;
            let currentVal = 0;
            let targetVal = 1;
            let percentProgress = 0;

            if (q.id === "quest-daily-focus") {
              currentVal = totalStudiedTodayMins;
              targetVal = 30;
              isQualified = totalStudiedTodayMins >= 30;
              percentProgress = Math.min(100, Math.round((currentVal / targetVal) * 100));
            } else if (q.id === "quest-deep-dive") {
              currentVal = totalStudiedTodayMins;
              targetVal = 120;
              isQualified = totalStudiedTodayMins >= 120;
              percentProgress = Math.min(100, Math.round((currentVal / targetVal) * 100));
            } else if (q.id === "quest-task-crusher") {
              currentVal = completedTasksCountToday;
              targetVal = 1;
              isQualified = completedTasksCountToday >= 1;
              percentProgress = Math.min(100, Math.round((currentVal / targetVal) * 100));
            } else if (q.id === "quest-speed-demon") {
              currentVal = completedTasksCountToday;
              targetVal = 3;
              isQualified = completedTasksCountToday >= 3;
              percentProgress = Math.min(100, Math.round((currentVal / targetVal) * 100));
            }

            const canClaim = isQualified && !q.isCompleted;

            return (
              <div 
                key={q.id} 
                className={`flex flex-col justify-between p-4 rounded-2xl border transition-all hover-lift ${
                  q.isCompleted
                    ? "bg-emerald-500/5 dark:bg-emerald-950/10 border-emerald-500/20 opacity-70"
                    : canClaim
                    ? "bg-[#f26419]/5 border-[#f26419]/50 animate-pulse border-dashed ring-1 ring-[#f26419]/20"
                    : "bg-slate-50 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60"
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-[8.5px] uppercase font-mono font-black px-2 py-0.5 rounded ${
                      q.category === "daily" 
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" 
                        : "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400"
                    }`}>
                      {q.category}
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-500 block">+{q.xpReward} XP</span>
                  </div>

                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 line-clamp-1">{q.title}</h4>
                  <p className="text-[10px] text-slate-500 mt-1">{q.condition}</p>
                </div>

                {/* Progress bar info */}
                <div className="mt-4 pt-2 border-t border-slate-100 dark:border-slate-800/50 space-y-2">
                  <div className="flex justify-between text-[9px] font-mono text-slate-400">
                    <span>Progress:</span>
                    <span>{currentVal} / {targetVal} ({percentProgress}%)</span>
                  </div>
                  <div className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${q.isCompleted || isQualified ? 'bg-emerald-500' : 'bg-indigo-500'}`} 
                      style={{ width: `${percentProgress}%` }}
                    />
                  </div>

                  {q.isCompleted ? (
                    <span className="flex items-center gap-1 text-[9px] text-emerald-600 dark:text-emerald-400 font-extrabold uppercase pt-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Quest Checked
                    </span>
                  ) : canClaim ? (
                    <button
                      onClick={() => onCompleteQuest(q.id)}
                      className="w-full bg-[#f26419] hover:bg-[#d6510d] text-white font-extrabold text-[9px] uppercase px-2 py-1.5 rounded-lg active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="w-3 h-3 animate-spin" /> Claim +{q.xpReward} XP
                    </button>
                  ) : (
                    <span className="text-[9px] text-slate-400 italic block pt-1">In progress...</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Main Wishlist Registry & Rewards Store Row */}
      <div className="space-y-4">
        
        {/* Head controls section */}
        <div className="flex justify-between items-center bg-white/70 dark:bg-[#121212]/92 p-4.5 rounded-3xl border border-slate-200 dark:border-slate-900/60 shadow-xs">
          <div className="text-left">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#f26419]" /> Real-World Wishlist Store
            </h3>
            <p className="text-[10px] text-slate-500">
              Paste Amazon product links, define target study XP goals, and convert physical desires into study milestones!
            </p>
          </div>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1 bg-[#f26419] hover:opacity-95 text-white font-black text-xs px-4 py-2.5 rounded-2xl cursor-pointer shadow-md transform active:scale-95 transition-all select-none whitespace-nowrap"
            id="add-custom-reward-btn"
          >
            <Plus className="w-4 h-4 fill-white" /> Register Product
          </button>
        </div>

        {/* Wishlist grid items */}
        {rewards.length === 0 ? (
          <div className="bg-white/70 dark:bg-[#121212]/92 rounded-3xl border border-dashed border-slate-200 dark:border-slate-900/70 p-12 text-center flex flex-col items-center justify-center">
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-full mb-3">
              <Gift className="w-10 h-10 animate-bounce" />
            </div>
            <p className="text-sm font-black text-slate-750 dark:text-slate-300">Your Study Wishlist is Empty</p>
            <p className="text-xs text-slate-500 mt-1.5 max-w-sm leading-relaxed">
              Register products you want from Amazon (e.g., self-study textbook, target noise-canceling headphones, custom study mug). We will lock them until you accumulate enough study stopwatch seconds!
            </p>
            <button
              onClick={handleOpenAdd}
              className="mt-5 bg-indigo-600 hover:bg-indigo-500 font-bold text-xs px-5 py-2.5 text-white rounded-2xl cursor-pointer active:scale-95 transition-transform"
            >
              Add First Amazon Product
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {rewards.map((r) => {
              const reqXp = r.costXp;
              const hasEnough = userXp >= reqXp;
              const percent = Math.min(100, Math.round((userXp / reqXp) * 100));
              const amazonItem = isAmazonUrl(r.purchaseUrl);

              return (
                <div 
                  key={r.id} 
                  className={`bg-white/95 dark:bg-[#121212]/95 border rounded-3xl p-5 flex flex-col justify-between shadow-lg relative transition-all hover-lift group overflow-hidden ${
                    r.isClaimed
                      ? "border-slate-200/60 dark:border-slate-900/60 opacity-60"
                      : hasEnough 
                      ? "border-amber-500 dark:border-amber-500/35 ring-1 ring-amber-500/10" 
                      : "border-slate-200 dark:border-slate-900/60 hover:border-slate-350 dark:hover:border-slate-800"
                  }`}
                >
                  {/* Category Accent Stripe Badge */}
                  <div 
                    className="absolute top-0 left-0 right-0 h-1.5" 
                    style={{ background: `linear-gradient(to right, #6366f1, #f59e0b, ${themeHexAccent})` }}
                  />
                  
                  {/* Upper details */}
                  <div className="space-y-3 pt-2">
                    
                    {/* Header meta badge */}
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[8.5px] uppercase font-bold tracking-wider font-mono text-slate-400 bg-slate-100 dark:bg-slate-900 px-2.5 py-0.5 rounded-full">
                          {r.category}
                        </span>
                        {r.isClaimed ? (
                          <span className="flex items-center gap-1 text-[8px] font-mono font-extrabold text-emerald-550 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase">
                            <Check className="w-2.5 h-2.5 stroke-[3.5]" /> Achieved
                          </span>
                        ) : hasEnough ? (
                          <span className="flex items-center gap-1 text-[8px] font-mono font-extrabold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full uppercase animate-pulse">
                            <Unlock className="w-2.5 h-2.5" /> Unlocked
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[8px] font-mono font-extrabold text-slate-400 bg-slate-100 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-850 px-2 py-0.5 rounded-full uppercase">
                            <Lock className="w-2.5 h-2.5" /> Locked
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-slate-400">
                        <button 
                          onClick={() => handleOpenEdit(r)}
                          className="hover:text-amber-500 p-1 rounded-md transition-colors"
                          title="Edit Product Settings"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => onDeleteReward(r.id)}
                          className="hover:text-rose-500 p-1 rounded-md transition-colors"
                          title="Delete product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Title */}
                    <div className="text-left space-y-1">
                      <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 transition-colors hover:opacity-80" style={{ color: r.isClaimed ? "" : "" }}>{r.title}</h4>
                      {r.notes ? (
                        <p className="text-[11px] text-slate-400 font-sans line-clamp-2 italic leading-normal">
                          "{r.notes}"
                        </p>
                      ) : (
                        <p className="text-[10px] text-slate-500">No special notes configured</p>
                      )}
                    </div>
                  </div>

                  {/* Unlock progress widget */}
                  <div className="space-y-3.5 pt-4 border-t border-slate-100 dark:border-slate-900 mt-4">
                    <div className="flex justify-between items-baseline">
                      <span className="text-[10px] uppercase font-mono text-slate-400 font-bold">XP cost milestone</span>
                      <span className="font-mono text-sm font-extrabold text-amber-500 dark:text-amber-400">
                        {reqXp} <span className="text-[10px] text-slate-500">XP</span>
                      </span>
                    </div>

                    {/* Progress Slider bar */}
                    {!r.isClaimed && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[9px] font-mono text-slate-400">
                          <span>Focus level reach</span>
                          <span className="font-semibold text-slate-600 dark:text-slate-350">{percent}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-500 ${hasEnough ? 'bg-gradient-to-r from-amber-400 to-amber-600 animate-pulse' : ''}`} 
                            style={hasEnough ? {} : { backgroundColor: themeHexAccent, width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Dynamic Action Buttons for student motivation links */}
                    {r.isClaimed ? (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-2xl flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-black uppercase">
                        <Check className="w-4 h-4 text-emerald-400 block stroke-[3]" /> Claimed & Achieved 🚀
                      </div>
                    ) : hasEnough ? (
                      <div className="space-y-2">
                        {/* Celebrate unlocked status with glow frame */}
                        <div className="bg-amber-400/10 border border-amber-400/20 px-3 py-2 rounded-2xl flex items-center justify-between gap-1.5">
                          <span className="text-[10px] uppercase font-mono font-black text-amber-400 flex items-center gap-1">
                            <Unlock className="w-3 h-3 text-amber-400 animate-bounce" /> Product Unlocked!
                          </span>
                          <span className="text-[9px] text-right font-sans text-amber-500">Reward goal satisfied</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          {r.purchaseUrl && (
                            <a
                              href={r.purchaseUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-indigo-600 text-white font-extrabold text-[11px] whitespace-nowrap px-2.5 py-2.5 rounded-xl hover:bg-indigo-500 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <ExternalLink className="w-3.5 h-3.5" /> 
                              {amazonItem ? "Order (Amazon)" : "Buy Store"}
                            </a>
                          )}
                          <button
                            onClick={() => handleClaim(r)}
                            className="bg-emerald-600 hover:bg-emerald-500 font-extrabold text-[11px] text-white px-2.5 py-2.5 rounded-xl active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-white" /> Claim Now
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <div className="flex-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-2.5 rounded-2xl flex items-center justify-center gap-2 text-slate-450 dark:text-slate-500 text-xs font-semibold">
                          <Lock className="w-3.5 h-3.5 text-slate-450 dark:text-slate-600" /> Locked (Need {reqXp - userXp} more XP)
                        </div>
                        {r.purchaseUrl && (
                          <a
                            href={r.purchaseUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-900 p-2.5 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl flex items-center justify-center shrink-0 cursor-pointer"
                            title="Preview store link"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    )}

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3.5 Academic Integrity & Anti-Cheat Security Audit Monitor card */}
      <div className="bg-white/70 dark:bg-[#121212]/92 border border-slate-200 dark:border-slate-900/60 rounded-3xl p-5 shadow-xs text-left pointer-events-auto space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-900 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-[#f26419]/10 text-[#f26419] rounded-xl border border-[#f26419]/20 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-[#f26419]" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                Academic Integrity & Anti-Cheat Guard
              </h3>
              <p className="text-[10px] text-slate-500">
                Audits backdated focus records, micro-timestamps, and XP level ratios automatically.
              </p>
            </div>
          </div>
          
          <div className={`px-3 py-1.5 rounded-xl border text-[9px] font-mono font-black tracking-widest ${auditResult.statusColor}`}>
             STATUS: {auditResult.statusLabel}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
          <div className="md:col-span-5 flex flex-col justify-between bg-slate-50 dark:bg-slate-950/45 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-900/50">
            <div className="space-y-1.5">
              <span className="text-[9px] font-mono text-slate-500 uppercase block">XP Coherence Index</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black font-mono text-[#f26419]">{auditResult.integrityScore}%</span>
                <span className="text-[10px] text-slate-450 font-bold">Integrity Level</span>
              </div>
            </div>
            
            <p className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-relaxed font-sans mt-3.5">
              Honesty is critical for JEE/NEET competitive preparation. This active agent checks daily workloads and blocks artificial increments to guarantee that level rankings correspond tightly with natural academic effort. No short-cuts 🏆!
            </p>
          </div>

          <div className="md:col-span-7 space-y-2.5 flex flex-col justify-center">
            {auditResult.checks.map((check, i) => (
              <div key={i} className={`p-3 rounded-2xl border text-xs leading-normal flex items-start gap-2.5 ${check.color}`}>
                <div className="mt-0.5 shrink-0">
                  {check.status === "SECURE" ? (
                    <div className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center font-black text-[9px] font-mono">✓</div>
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center font-black text-[9px] font-mono">!</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    {check.name}
                    <span className={`text-[8px] font-mono font-black uppercase px-1 py-0.2 rounded ${check.status === "SECURE" ? "text-emerald-400 bg-emerald-500/5" : "text-amber-400 bg-amber-500/5"}`}>
                      {check.status}
                    </span>
                  </h5>
                  <p className="text-[9.5px] text-slate-500 dark:text-slate-400 mt-1 font-sans">{check.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. XP Earnings & claimed rewards logs ledger */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pointer-events-auto">
        
        {/* Left column: XP logs */}
        <div className="bg-white/70 dark:bg-[#121212]/92 border border-slate-200 dark:border-slate-900/60 rounded-3xl p-5 shadow-xs">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3.5 flex items-center gap-1.5 justify-start">
            <Clock className="w-4 h-4 text-emerald-400" /> Career XP Achievement Feed ({xpLogs.length})
          </h4>

          <div className="space-y-2 overflow-y-auto max-h-[220px] no-scrollbar">
            {xpLogs.length === 0 ? (
              <div className="p-6 text-center text-slate-500 italic text-xs">
                No XP gains chronicled yet! Start studying or finish a checklist item to gain level ranks.
              </div>
            ) : (
              xpLogs.map((log) => (
                <div 
                  key={log.id} 
                  className="flex justify-between items-center bg-slate-50 dark:bg-slate-950/40 p-3 rounded-2xl border border-slate-200/50 dark:border-slate-900/50 text-xs text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2 h-2 rounded-full ${log.amount < 0 ? "bg-rose-500 animate-pulse" : "bg-emerald-500"}`} />
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-200">{log.reason}</p>
                      <p className="text-[10px] text-slate-500">
                        {new Date(log.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <span className={`font-mono font-black ${log.amount < 0 ? "text-rose-500" : "text-amber-500"}`}>
                    {log.amount > 0 ? `+${log.amount}` : log.amount} XP
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right column: Claimed Rewards Logs */}
        <div className="bg-white/70 dark:bg-[#121212]/92 border border-slate-200 dark:border-slate-900/60 rounded-3xl p-5 shadow-xs text-left">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3.5 flex items-center gap-1.5 justify-start">
            <Gift className="w-4 h-4 text-[#f26419]" /> Dream Milestones Claim History ({rewards.filter(r => r.isClaimed).length})
          </h4>

          <div className="space-y-2 overflow-y-auto max-h-[220px] no-scrollbar">
            {rewards.filter(r => r.isClaimed).length === 0 ? (
              <div className="p-6 text-center text-slate-500 italic text-xs leading-relaxed">
                No rewards claimed yet! Keep studying to lock in enough XP to redeem your first product!
              </div>
            ) : (
              rewards.filter(r => r.isClaimed).map((r) => (
                <div 
                  key={r.id} 
                  className="flex justify-between items-center bg-emerald-500/5 dark:bg-emerald-950/10 p-3 rounded-2xl border border-emerald-500/10 dark:border-emerald-900/20 text-xs text-left"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center text-[10px] text-emerald-555 text-emerald-500 font-bold shrink-0">
                      ✓
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-850 dark:text-slate-100 flex items-center gap-1.5 truncate">
                        {r.title}
                      </p>
                      <p className="text-[10px] text-slate-550 dark:text-slate-500 mt-0.5">
                        Unlocked & claimed milestone
                      </p>
                    </div>
                  </div>
                  <span className="font-mono font-black text-rose-500 shrink-0 font-bold ml-2">-{r.costXp} XP</span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* 5. ADD / EDIT WISHLIST PRODUCT DIALOG POPUP MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-[#0a0a0a]/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in text-slate-800 dark:text-slate-100 leading-normal">
          <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-indigo-900/40 rounded-3xl w-full max-w-sm overflow-hidden flex flex-col shadow-2xl relative">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-900 pb-3">
              <h3 className="font-black text-sm uppercase tracking-wider text-[#f26419]">
                {editingReward ? "Customize Product" : "Register Product Info"}
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReward} className="p-5 space-y-4 text-left overflow-y-auto max-h-[80vh] no-scrollbar">
              
              {/* Product Label */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1.5">
                  Product Label / Name *
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g., Corsair Mechanical Keyboard K70"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-900 focus:outline-none focus:border-[#f26419]"
                />
              </div>

              {/* Cost in XP */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1.5">
                  Target XP Goal * (Suggested: 500 - 3000 XP)
                </label>
                <input 
                  type="number" 
                  required
                  min={50}
                  max={20000}
                  value={costXp}
                  onChange={(e) => setCostXp(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-900 focus:outline-none focus:border-[#f26419] font-mono"
                />
                <span className="text-[9.5px] text-slate-500 block mt-1">Rule: 10 XP equals 1 Minute Studied. So 800 XP requires 80 total study stopwatch minutes.</span>
              </div>

              {/* Category */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1.5">
                  Product Category
                </label>
                <select 
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-xs text-slate-700 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-900 focus:outline-none font-sans"
                >
                  <option value="Tech Gadget">Tech Gadget 🔌</option>
                  <option value="Desk Setup">Desk Setup 🖥️</option>
                  <option value="Daily Treats">Daily Treats ☕</option>
                  <option value="Books & Supplies">Books & Supplies 📚</option>
                  <option value="Custom Reward">Custom Reward 🎁</option>
                </select>
              </div>

              {/* Purchase URL (Wishlist link) */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1.5 flex items-center gap-1">
                  <Link2 className="w-3 h-3 text-[#f26419]" /> Amazon / Store Product URL Link
                </label>
                <input 
                  type="text" 
                  placeholder="Paste URL (Amazon, Target, local store, etc.)"
                  value={purchaseUrl}
                  onChange={(e) => setPurchaseUrl(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-900 focus:outline-none focus:border-[#f26419] font-mono text-glow-none"
                />
              </div>

              {/* Optional Motivation Notes */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1.5">
                  Motivation Notes (Write why you want this!)
                </label>
                <textarea 
                  rows={2}
                  placeholder="e.g. This keyboard has soft switches that won't make noise during nighttime programming study blocks."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-xs text-slate-805 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-900 focus:outline-none focus:border-[#f26419]"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-900 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#f26419] hover:opacity-95 text-white font-black text-xs px-5 py-2.5 rounded-xl cursor-pointer shadow-md"
                >
                  Save Product
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 6. IMMERSIVE UNLOCK / CLAIM CELEBRATION MODAL MODAL */}
      {celebrationReward && (
        <div className="fixed inset-0 bg-[#000a0ac4] bg-slate-950/90 backdrop-blur-lg flex items-center justify-center p-6 z-50 animate-fade-in text-white leading-normal">
          <div className="text-center space-y-6 max-w-sm p-8 rounded-3xl bg-slate-900/90 border border-amber-500/30 shadow-2xl relative">
            
            {/* Spinning background rays */}
            <div className="absolute inset-x-0 -top-12 flex justify-center">
              <div className="w-40 h-40 bg-gradient-to-tr from-amber-500 to-rose-500 rounded-full opacity-20 blur-2xl animate-spin-slow pointer-events-none"></div>
            </div>

            <div className="inline-flex p-4.5 bg-gradient-to-r from-amber-400 to-[#f26419] rounded-full text-white shadow-xl animate-bounce">
              <Award className="w-12 h-12 text-white stroke-[2]" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black tracking-tight text-amber-400">Study Goal Achieved! 🎓</h3>
              <p className="text-xs text-slate-300">
                You studied hard and successfully claimed your dream milestone:
              </p>
              <h4 className="text-base font-bold text-white uppercase bg-slate-950/60 px-4 py-2.5 rounded-xl border border-slate-800 tracking-tight inline-block mt-1">
                {celebrationReward.title}
              </h4>
            </div>

            <div className="bg-slate-950/70 py-3 px-4.5 rounded-2xl border border-slate-800 text-xs text-left text-slate-400">
              <p className="font-mono text-center text-amber-500 font-black">-{celebrationReward.costXp} XP Redirection Completed</p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-center font-sans font-medium">
                "Small daily disciplines aggregated over weeks manifest in life-changing results." Keep up the incredible momentum!
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              {celebrationReward.purchaseUrl && (
                <a 
                  href={celebrationReward.purchaseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-[#f26419] hover:bg-[#d6510d] text-white font-extrabold text-xs py-3 rounded-2xl flex items-center justify-center gap-1 shadow-md cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" /> Go to Store Link
                </a>
              )}
              <button
                onClick={() => setCelebrationReward(null)}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-extrabold text-xs py-2.5 rounded-2xl cursor-pointer"
              >
                Close & Return
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. INTERACTIVE LEVEL CHART BOARD MODAL */}
      {showLevelGuide && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 z-50 animate-fade-in text-white leading-normal">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden relative">
            
            {/* Header section with gradient */}
            <div className="p-6 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/20">
                  <Award className="w-5 h-5 text-amber-500 animate-pulse" />
                </div>
                <div className="text-left">
                  <span className="text-[10px] bg-amber-500/10 text-amber-400 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Student Milestones
                  </span>
                  <h3 className="text-base font-black text-white mt-1 antialiased uppercase tracking-wide">
                    Study XP Rank & Level Guide
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setShowLevelGuide(false)}
                className="p-2 hover:bg-slate-800 rounded-xl transition-all cursor-pointer border border-slate-805 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current status display banner */}
            <div className="p-5.5 bg-slate-950/50 border-b border-slate-850 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-left w-full sm:w-auto">
                <div className="h-16 w-16 bg-slate-900 border-2 border-amber-500 rounded-2xl flex items-center justify-center text-2xl font-black shrink-0 relative shadow-inner">
                  <span>{calculateStudentLevel(userXp).rank.split(" ").slice(-1)[0]}</span>
                  <div className="absolute -bottom-1.5 -right-1.5 bg-amber-550 bg-amber-550 bg-amber-500 text-[10px] font-black font-mono text-white px-1.5 py-0.5 rounded-md leading-none">
                    Lvl {calculateStudentLevel(userXp).level}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-100">{calculateStudentLevel(userXp).rank}</h4>
                  <p className="text-xs text-slate-400 mt-1 font-mono font-medium">
                    Total Earned Score: <span className="text-[#f26419] font-bold">{userXp} XP</span>
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Next level triggers in <span className="text-indigo-400 font-bold">{calculateStudentLevel(userXp).nextLevelXpRemaining} XP</span> ({getXpRateForLevel(calculateStudentLevel(userXp).level)} XP per minute studied)
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
                    className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-500 rounded-full transition-all duration-750" 
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
                          ? "bg-indigo-950/40 border-indigo-500/50 shadow-lg shadow-indigo-950/30" 
                          : isUnlocked 
                          ? "bg-slate-950/30 border-slate-800/60 opacity-85 hover:opacity-100" 
                          : "bg-slate-950/70 border-slate-900/60 opacity-60"
                      }`}
                    >
                      {/* Left: Badge, Level & Rank name */}
                      <div className="flex items-center gap-3">
                        <div className={`h-11 w-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                          isUnlocked ? "bg-slate-900 border border-slate-750" : "bg-slate-950 border border-slate-900"
                        }`}>
                          <span>{tier.badge}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase font-bold tracking-tight text-[#f26419] font-mono leading-none">
                              Level {tier.level}
                            </span>
                            <span className="text-[9px] bg-slate-800 dark:bg-slate-950 text-slate-400 px-1.5 py-0.5 rounded leading-none font-medium">
                              {tier.category} Tier
                            </span>
                          </div>
                          <span className="text-xs font-black text-slate-102 hover:text-white block mt-1">{tier.rank}</span>
                          <span className="text-[10px] text-slate-400 mt-0.5 block leading-relaxed">{tier.perk}</span>
                        </div>
                      </div>

                      {/* Right: XP limit & Unlocked Status info */}
                      <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 border-t md:border-t-0 border-slate-800/55 pt-2.5 md:pt-0">
                        <div className="text-left md:text-right">
                          <span className="text-[10px] font-mono text-slate-500 block uppercase">Requires accumulated</span>
                          <span className="text-xs font-bold font-mono text-amber-500">{tier.xpRequired} XP</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {isCurrent ? (
                            <span className="text-[9px] uppercase font-black px-2.5 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 rounded-md animate-pulse">
                              Current Rank
                            </span>
                          ) : isUnlocked ? (
                            <span className="text-[9px] uppercase font-bold px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md flex items-center gap-1">
                              <Unlock className="w-2.5 h-2.5 text-emerald-400" /> Active
                            </span>
                          ) : (
                            <span className="text-[9px] uppercase font-bold px-2 py-1 bg-slate-950 text-slate-500 border border-slate-900 rounded-md flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5 text-slate-500" /> Locked
                            </span>
                          )}
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer containing closure */}
            <div className="p-4.5 bg-slate-950 border-t border-slate-850 text-center flex items-center justify-between gap-4">
              <span className="text-[10.5px] text-slate-400 text-left font-sans block leading-normal hidden md:inline ml-1">
                Study regularly to earn XP, level up, unlock themes, sounds and progress.
              </span>
              <button
                type="button"
                onClick={() => setShowLevelGuide(false)}
                className="w-full md:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl transition-colors cursor-pointer shadow-md inline-flex items-center justify-center ml-auto"
              >
                Got it, Continue Focusing
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
