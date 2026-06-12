import React, { useState } from "react";
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
  Check
} from "lucide-react";
import { GiftReward, XpGainLog, QuestChallenge } from "../types";

// Levels and ranks engine
export const calculateStudentLevel = (xp: number) => {
  const level = Math.floor(xp / 500) + 1;
  const xpInCurrentLevel = xp % 500;
  const percent = Math.min(100, Math.round((xpInCurrentLevel / 500) * 100));
  
  let rank = "Bronze Scholar 🥉";
  let color = "from-amber-600 to-amber-800 text-amber-500";
  if (level >= 20) {
    rank = "Grandmaster Mindful 🏆";
    color = "from-amber-400 via-rose-500 to-indigo-600 text-amber-400 animate-pulse";
  } else if (level >= 15) {
    rank = "Platinum Flow Alchemist 💎";
    color = "from-cyan-400 to-blue-600 text-cyan-400";
  } else if (level >= 10) {
    rank = "Gold Polymath 🥇";
    color = "from-yellow-400 to-amber-500 text-yellow-500";
  } else if (level >= 5) {
    rank = "Silver Deep Worker 🥈";
    color = "from-slate-350 to-slate-500 text-slate-300";
  }
  
  return { level, xpInCurrentLevel, percent, rank, color };
};

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
  completedTasksCountToday
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

  const levelInfo = calculateStudentLevel(userXp);

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
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-505 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center relative z-10">
          
          {/* Circular level wheel widget */}
          <div className="md:col-span-4 flex flex-col items-center justify-center relative">
            <div className="relative w-32 h-32 flex items-center justify-center">
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
                  className="stroke-amber-500 transition-all duration-1000 ease-out" 
                  strokeWidth="8" 
                  fill="none" 
                  strokeDasharray="351.8"
                  strokeDashoffset={351.8 - (351.8 * levelInfo.percent) / 100}
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Level</span>
                <span className="text-3xl font-black font-display text-white">{levelInfo.level}</span>
                <span className="text-[10px] font-mono text-amber-400 font-bold">{userXp % 500} / 500 XP</span>
              </div>
            </div>
            
            <div className={`mt-3 px-3.5 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-xs font-black tracking-tight text-center ${levelInfo.color.split(" ")[levelInfo.color.split(" ").length-1]}`}>
              {levelInfo.rank}
            </div>
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
                className={`flex flex-col justify-between p-4 rounded-2xl border transition-all ${
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
              className="mt-5 bg-indigo-650 bg-indigo-600 hover:bg-indigo-500 font-bold text-xs px-5 py-2.5 text-white rounded-2xl cursor-pointer active:scale-95 transition-transform"
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
                  className={`bg-white/95 dark:bg-[#121212]/95 border rounded-3xl p-5 flex flex-col justify-between shadow-lg relative transition-all group overflow-hidden ${
                    r.isClaimed
                      ? "border-slate-200/60 dark:border-slate-900/60 opacity-60"
                      : hasEnough 
                      ? "border-amber-500 dark:border-amber-500/35 ring-1 ring-amber-500/10" 
                      : "border-slate-200 dark:border-slate-900/60 hover:border-slate-350 dark:hover:border-slate-800"
                  }`}
                >
                  {/* Category Accent Stripe Badge */}
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-amber-500 to-[#f26419]" />
                  
                  {/* Upper details */}
                  <div className="space-y-3 pt-2">
                    
                    {/* Header meta badge */}
                    <div className="flex justify-between items-center">
                      <span className="text-[8.5px] uppercase font-bold tracking-wider font-mono text-slate-400 bg-slate-100 dark:bg-slate-900 px-2.5 py-0.5 rounded-full">
                        {r.category}
                      </span>
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
                      <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 group-hover:text-[#f26419] transition-colors">{r.title}</h4>
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
                            className={`h-full transition-all duration-500 ${hasEnough ? 'bg-gradient-to-r from-amber-400 to-amber-600 animate-pulse' : 'bg-[#f26419]'}`} 
                            style={{ width: `${percent}%` }}
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

      {/* 4. XP Earnings Logs / Ledger History feed */}
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
                  <div className="w-2 h-2 rounded-full bg-[#f26419]" />
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-200">{log.reason}</p>
                    <p className="text-[10px] text-slate-500">
                      {new Date(log.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <span className="font-mono font-black text-amber-500">+{log.amount} XP</span>
              </div>
            ))
          )}
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

    </div>
  );
}
