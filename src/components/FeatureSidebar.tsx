import { useState } from "react";
import { 
  BarChart2, Trophy, Clock, ShieldCheck, Dumbbell, BookOpen, Music, 
  Sparkles, Palette, Store, HelpCircle, Settings, LogIn, Moon, CloudOff, 
  Map, Eye, VolumeX, Shuffle, ArrowRight, Grid, Bell
} from "lucide-react";

interface FeatureSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  onThemeSelect: (themePreset: string) => void;
  isOfflineMode: boolean;
  setIsOfflineMode: (val: boolean) => void;
  onResetAllData: () => void;
}

export default function FeatureSidebar({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  onThemeSelect,
  isOfflineMode,
  setIsOfflineMode,
  onResetAllData,
}: FeatureSidebarProps) {
  const [activeSubView, setActiveSubView] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  
  const triggerStatus = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 3000);
  };
  
  // Audio state
  const [currentTracksIdx, setCurrentTracksIdx] = useState(0);
  const [isPlayingAud, setIsPlayingAud] = useState(false);
  const [allowedApps, setAllowedApps] = useState([
    { name: "Google Calendar", allowed: true },
    { name: "Gmail Email Client", allowed: true },
    { name: "StudyPulse Coach", allowed: true },
    { name: "Slack / Teams Chat", allowed: false },
    { name: "Silly Social Feed", allowed: false }
  ]);

  const soundPresets = [
    { name: "Dreamy Lofi Beats", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
    { name: "Midnight Rain drops", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
    { name: "Cozy Study Waves", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" }
  ];

  if (!isOpen) return null;

  const handleSubViewSelect = (viewName: string) => {
    setActiveSubView(viewName);
  };

  const handleActionClick = (targetTab: string) => {
    setActiveTab(targetTab);
    onClose();
  };

  return (
    <div className="absolute right-0 top-16 bottom-0 w-full sm:w-[380px] bg-white/80 dark:bg-[#121212]/80 backdrop-blur-xl border-l border-slate-200/50 dark:border-slate-900/60 z-50 flex flex-col hover:shadow-2xl animate-slide-in justify-between shadow-2xl overflow-y-auto no-scrollbar sm:rounded-l-3xl p-6 text-slate-800 dark:text-slate-100">
      
      {activeSubView === null ? (
        <div className="space-y-6">
          
          {/* Main Title Row */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-900/40">
            <span className="text-sm font-black tracking-widest text-[#f26419] uppercase">YPT Functions</span>
            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Section 1: Main Features */}
          <div className="space-y-3.5">
            <p className="text-[10px] uppercase font-black tracking-widest text-slate-500">Main Features</p>
            <div className="grid grid-cols-2 gap-2.5">
              <button 
                onClick={() => handleActionClick("analytics")}
                className="flex items-center gap-2.5 bg-slate-100/70 hover:bg-slate-200/80 dark:bg-[#171717]/90 dark:hover:bg-[#1a1a1a] p-2 px-3 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all text-left cursor-pointer border border-slate-200/45 dark:border-transparent"
              >
                <BarChart2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                <span className="text-xs font-semibold">Statistics</span>
              </button>
              
              <button 
                onClick={() => handleActionClick("rooms")}
                className="flex items-center gap-2.5 bg-slate-100/70 hover:bg-slate-200/80 dark:bg-[#171717]/90 dark:hover:bg-[#1a1a1a] p-2 px-3 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all text-left cursor-pointer border border-slate-200/45 dark:border-transparent"
              >
                <Trophy className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-semibold">Rankings</span>
              </button>

              <button 
                onClick={() => handleSubViewSelect("pomodoro")}
                className="flex items-center gap-2.5 bg-slate-100/70 hover:bg-slate-200/80 dark:bg-[#171717]/90 dark:hover:bg-[#1a1a1a] p-2 px-3 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all text-left cursor-pointer border border-slate-200/45 dark:border-transparent"
              >
                <Clock className="w-4 h-4 text-[#f26419]" />
                <span className="text-xs font-semibold">Pomodoro</span>
              </button>

              <button 
                onClick={() => handleSubViewSelect("allowed")}
                className="flex items-center gap-2.5 bg-slate-100/70 hover:bg-slate-200/80 dark:bg-[#171717]/90 dark:hover:bg-[#1a1a1a] p-2 px-3 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all text-left cursor-pointer border border-slate-200/45 dark:border-transparent"
              >
                <ShieldCheck className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
                <span className="text-xs font-semibold">Allowed Apps</span>
              </button>

              <button 
                onClick={() => handleSubViewSelect("editlog")}
                className="flex items-center gap-2.5 bg-slate-100/70 hover:bg-slate-200/80 dark:bg-[#171717]/90 dark:hover:bg-[#1a1a1a] p-2 px-3 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all text-left cursor-pointer border border-slate-200/45 dark:border-transparent"
              >
                <BookOpen className="w-4 h-4 text-pink-500 dark:text-pink-400" />
                <span className="text-xs font-semibold">Edit log</span>
              </button>

              <button 
                onClick={() => {
                  setActiveTab("reminders");
                  onClose();
                }}
                className="flex items-center gap-2.5 bg-slate-100/70 hover:bg-slate-200/80 dark:bg-[#171717]/90 dark:hover:bg-[#1a1a1a] p-2 px-3 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all text-left cursor-pointer border border-slate-200/45 dark:border-transparent"
              >
                <Bell className="w-4 h-4 text-amber-500 animate-pulse" />
                <span className="text-xs font-semibold">Study Reminders</span>
              </button>

              <button 
                onClick={() => setIsOfflineMode(!isOfflineMode)}
                className={`flex items-center gap-2.5 p-2 px-3 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all text-left cursor-pointer border ${
                  isOfflineMode 
                    ? "bg-rose-950/45 border-rose-800 text-rose-300" 
                    : "bg-slate-100/70 hover:bg-slate-200/80 dark:bg-[#171717]/90 dark:hover:bg-[#1a1a1a] text-slate-800 dark:text-slate-100 border-slate-200/45 dark:border-transparent"
                }`}
              >
                <CloudOff className="w-4 h-4" />
                <span className="text-xs font-semibold">{isOfflineMode ? "Offline" : "Offline Mode"}</span>
              </button>
            </div>
          </div>

          {/* Section 2: Extra Features */}
          <div className="space-y-3.5">
            <p className="text-[10px] uppercase font-black tracking-widest text-slate-500">Extra Features</p>
            <div className="grid grid-cols-2 gap-2.5">
              <button 
                onClick={() => handleSubViewSelect("books")}
                className="flex items-center gap-2.5 bg-slate-100/70 hover:bg-slate-200/80 dark:bg-[#171717]/90 dark:hover:bg-[#1a1a1a] p-2 px-3 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all text-left cursor-pointer border border-slate-200/45 dark:border-transparent"
              >
                <BookOpen className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                <span className="text-xs font-semibold">Books</span>
              </button>

              <button 
                onClick={() => handleSubViewSelect("challenge")}
                className="flex items-center gap-2.5 bg-slate-100/70 hover:bg-slate-200/80 dark:bg-[#171717]/90 dark:hover:bg-[#1a1a1a] p-2 px-3 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all text-left cursor-pointer border border-slate-200/45 dark:border-transparent"
              >
                <Dumbbell className="w-4 h-4 text-violet-500 dark:text-violet-400" />
                <span className="text-xs font-semibold">Challenge</span>
              </button>

              <button 
                onClick={() => handleSubViewSelect("music")}
                className="flex items-center gap-2.5 bg-slate-100/70 hover:bg-slate-200/80 dark:bg-[#171717]/90 dark:hover:bg-[#1a1a1a] p-2 px-3 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all text-left cursor-pointer border border-slate-200/45 dark:border-transparent"
              >
                <Music className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                <span className="text-xs font-semibold">Music Player</span>
              </button>

              <button 
                onClick={() => handleActionClick("workspace")}
                className="flex items-center gap-2.5 bg-slate-100/70 hover:bg-slate-200/80 dark:bg-[#171717]/90 dark:hover:bg-[#1a1a1a] p-2 px-3 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all text-left cursor-pointer border border-slate-200/45 dark:border-transparent"
              >
                <Sparkles className="w-4 h-4 text-yellow-500 dark:text-yellow-400" />
                <span className="text-xs font-semibold">Google Hub</span>
              </button>
            </div>
          </div>

          {/* Section 3: Customize */}
          <div className="space-y-3.5">
            <p className="text-[10px] uppercase font-black tracking-widest text-slate-500">Customize Mode</p>
            <div className="grid grid-cols-2 gap-2.5">
              <button 
                onClick={() => handleSubViewSelect("themes")}
                className="flex items-center gap-2.5 bg-slate-100/70 hover:bg-slate-200/80 dark:bg-[#171717]/90 dark:hover:bg-[#1a1a1a] p-2 px-3 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all text-left cursor-pointer border border-slate-200/45 dark:border-transparent hover:border-indigo-400/40"
              >
                <Palette className="w-4 h-4 text-teal-500 dark:text-teal-400" />
                <span className="text-xs font-semibold">Themes Colors</span>
              </button>

              <button 
                onClick={() => handleSubViewSelect("store")}
                className="flex items-center gap-2.5 bg-slate-100/70 hover:bg-slate-200/80 dark:bg-[#171717]/90 dark:hover:bg-[#1a1a1a] p-2 px-3 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all text-left cursor-pointer border border-slate-200/45 dark:border-transparent"
              >
                <Store className="w-4 h-4 text-sky-500 dark:text-sky-400" />
                <span className="text-xs font-semibold">Stickers Store</span>
              </button>
            </div>
          </div>

          {/* Section 4: More Info */}
          <div className="space-y-3.5 pt-2">
            <p className="text-[10px] uppercase font-black tracking-widest text-slate-500">More Tools</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-900/40 text-xs">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span className="font-semibold text-slate-705 dark:text-slate-300">Target daily hours goal</span>
                </div>
                <span className="font-mono bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-md text-slate-700 dark:text-slate-200">240m</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-900/40 text-xs">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-slate-400" />
                  <span className="font-semibold text-slate-705 dark:text-slate-300">YPT Help Desk</span>
                </div>
                <span className="text-[10px] bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-md text-slate-750 dark:text-slate-300">Active</span>
              </div>
            </div>
          </div>

          {/* Reset All Data Control */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-900/40 space-y-2">
            {!showResetConfirm ? (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="w-full bg-rose-500/10 hover:bg-rose-950/20 text-rose-500 dark:text-rose-400 border border-rose-500/10 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer text-center"
              >
                Reset All Study Data
              </button>
            ) : (
              <div className="bg-rose-50 dark:bg-[#1a1113] border border-rose-200 dark:border-rose-550/20 p-3.5 rounded-2xl text-center space-y-3">
                <p className="text-[11px] text-rose-600 dark:text-rose-300 font-medium leading-relaxed">
                  ⚠️ Deleting all study logs, custom subjects, and metrics is permanent.
                </p>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => {
                      onResetAllData();
                      setShowResetConfirm(false);
                      onClose();
                    }}
                    className="bg-rose-600 hover:bg-rose-550 text-white px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-md shadow-rose-600/10"
                  >
                    Confirm Reset
                  </button>
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-350 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      ) : (
        /* Sub-View panels switcher */
        <div className="space-y-6 flex-1 flex flex-col justify-between">
          <div>
            {/* Back indicator button */}
            <button 
              onClick={() => {
                setActiveSubView(null);
                setStatusMsg(null);
              }}
              className="text-xs hover:text-[#f26419] mb-4 flex items-center gap-1 bg-[#1a1a1a] px-3 py-1.5 rounded-full text-slate-400 cursor-pointer self-start transition-colors"
            >
              ← Back to Features
            </button>

            {statusMsg && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3 rounded-2xl text-xs font-semibold animate-pulse mb-4">
                ✨ {statusMsg}
              </div>
            )}

            {/* Sub-view: Lofi Music Player */}
            {activeSubView === "music" && (
              <div className="space-y-5">
                <div className="text-center">
                  <Music className="w-12 h-12 text-[#f26419] mx-auto animate-pulse mb-2" />
                  <h4 className="font-bold text-sm text-slate-100">Study Sound Player</h4>
                  <p className="text-[10px] text-slate-500">Relaxing background tracks for deep focus sessions</p>
                </div>

                <div className="bg-[#171717] rounded-2xl p-4 border border-slate-800/80 space-y-3.5">
                  <div className="flex justify-between items-center bg-slate-950 p-3 rounded-xl">
                    <span className="text-xs truncate font-bold">{soundPresets[currentTracksIdx].name}</span>
                    <span className="text-[9px] bg-indigo-505/25 text-[#f26419] px-2 py-0.5 rounded-md uppercase font-black">lo-fi</span>
                  </div>

                  <div className="flex justify-center gap-4 py-1.5">
                    <button 
                      onClick={() => setCurrentTracksIdx(prev => (prev - 1 + soundPresets.length) % soundPresets.length)}
                      className="p-2 hover:bg-slate-800 rounded-full text-slate-300 cursor-pointer"
                    >
                      ⏮
                    </button>
                    <button 
                      onClick={() => setIsPlayingAud(!isPlayingAud)}
                      className="p-3 bg-[#f26419] w-12 h-12 flex items-center justify-center rounded-full text-white cursor-pointer hover:scale-105"
                    >
                      {isPlayingAud ? "⏸" : "▶"}
                    </button>
                    <button 
                      onClick={() => setCurrentTracksIdx(prev => (prev + 1) % soundPresets.length)}
                      className="p-2 hover:bg-slate-800 rounded-full text-slate-300 cursor-pointer"
                    >
                      ⏭
                    </button>
                  </div>
                </div>

                {isPlayingAud && (
                  <div className="flex items-center gap-2 bg-rose-500/10 border border-current text-rose-300 p-2.5 rounded-xl text-[10.5px]">
                    <span className="animate-ping block w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                    <p>Playing local browser music stream securely</p>
                  </div>
                )}
              </div>
            )}

            {/* Sub-view: Theme Picker */}
            {activeSubView === "themes" && (
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-slate-100">Color Themes Preset</h4>
                <p className="text-xs text-slate-400">Match the visual interface to fit your current study vibe:</p>
                
                <div className="grid grid-cols-1 gap-2.5 pt-2">
                  {[
                    { id: "dark-classic", name: "YPT Slate Black", bg: "bg-[#0a0a0a]" },
                    { id: "amoled", name: "Pitch Black OLED", bg: "bg-black" },
                    { id: "forest", name: "Cozy Forest Matcha", bg: "bg-[#0b1c15]" },
                    { id: "crimson", name: "Crimson Red Sunset", bg: "bg-[#210206]" }
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => {
                        onThemeSelect(preset.id);
                        onClose();
                      }}
                      className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-800 hover:border-slate-700 bg-[#161616] cursor-pointer hover:scale-[1.01] transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-4 h-4 rounded-full border border-slate-700 ${preset.bg}`}></span>
                        <span className="text-xs font-semibold">{preset.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-500">Apply</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sub-view: Allowed Apps blacklist */}
            {activeSubView === "allowed" && (
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-slate-100">Permitted App Whitelist</h4>
                <p className="text-xs text-slate-400">YPT blocking emulator. Permit only focus apps during active logs:</p>
                
                <div className="space-y-2 pt-2">
                  {allowedApps.map((app, index) => (
                    <div key={app.name} className="flex items-center justify-between bg-[#161616] p-3 rounded-2xl border border-slate-800">
                      <span className="text-xs font-semibold text-slate-205">{app.name}</span>
                      <button
                        onClick={() => {
                          const updated = [...allowedApps];
                          updated[index].allowed = !updated[index].allowed;
                          setAllowedApps(updated);
                        }}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-lg cursor-pointer ${
                          app.allowed 
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                            : "bg-slate-800 text-slate-500"
                        }`}
                      >
                        {app.allowed ? "Allowed" : "Blocked"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sub-view: Pomodoro Intervals */}
            {activeSubView === "pomodoro" && (
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-slate-100">Pomodoro Intervals</h4>
                <p className="text-xs text-slate-400 font-sans leading-relaxed">Customize ticking structures to trigger smart study intervals:</p>
                
                <div className="space-y-3.5 pt-2 bg-[#161616] p-4 rounded-2xl border border-slate-800/80">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Focus Period</span>
                    <span className="font-bold font-mono">25 minutes</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Short Break</span>
                    <span className="font-bold font-mono">5 minutes</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Long Break</span>
                    <span className="font-bold font-mono">15 minutes</span>
                  </div>

                  <button 
                    onClick={() => {
                      triggerStatus("Pomodoro sound alarm enabled! Ticks will trigger notifications.");
                    }}
                    className="w-full bg-[#f26419] hover:opacity-90 py-2 rounded-xl text-xs font-black text-white cursor-pointer mt-4"
                  >
                    Launch Pomodoro Interval
                  </button>
                </div>
              </div>
            )}

            {/* Sub-view: Books Goals */}
            {activeSubView === "books" && (
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-slate-100">Study books sessions</h4>
                <p className="text-xs text-slate-400 leading-relaxed">Plot and log goals per curriculum textbooks:</p>
                
                <div className="bg-[#161616] p-4 rounded-2xl border border-slate-800 space-y-3">
                  <div className="border bg-slate-900 border-slate-800 p-3 rounded-xl flex justify-between items-center text-xs">
                    <div>
                      <span className="block font-bold">Algorithms (CLRS)</span>
                      <span className="text-[10px] text-slate-500">Page 120 of 840</span>
                    </div>
                    <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded-md text-[#f26419] font-bold">14% Done</span>
                  </div>
                </div>
              </div>
            )}

            {/* Sub-view: Store Sticker shop */}
            {activeSubView === "store" && (
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-slate-100">Stickers & Themes shop</h4>
                <p className="text-xs text-slate-400 leading-relaxed">Exchange your daily accumulated consistency coins for stickers:</p>
                
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { style: "🔥 Cozy Flame", price: "20 Coins" },
                    { style: "🎓 Golden Cap", price: "35 Coins" },
                    { style: "✏️ Tiny Notebook", price: "40 Coins" },
                    { style: "👾 Retro Pixel", price: "50 Coins" }
                  ].map((sticker) => (
                    <div key={sticker.style} className="bg-[#161616] p-3 rounded-2xl border border-slate-850 flex flex-col items-center justify-between text-center">
                      <span className="text-base mb-1">{sticker.style}</span>
                      <button className="text-[9px] font-black bg-[#f26419]/10 text-[#f26419] px-2 py-1 rounded-lg border border-[#f26419]/25 hover:bg-[#f26419] hover:text-white transition-all cursor-pointer">
                        Get: {sticker.price}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Edit Study Logs List */}
            {activeSubView === "editlog" && (
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-slate-100">Log Entry Modifier</h4>
                <p className="text-xs text-slate-400 leading-relaxed">Manually adjust your recorded focus cycles:</p>
                <div className="bg-[#161616] p-4 rounded-2xl border border-slate-800 space-y-2.5">
                  <span className="text-[10px] text-slate-400 font-black block uppercase">Enter Manual hours</span>
                  <input 
                    type="number" 
                    placeholder="Duration (Minutes)"
                    className="w-full bg-slate-950 px-3 py-2 rounded-xl text-xs border border-slate-850 focus:outline-none"
                  />
                  <button 
                    onClick={() => {
                      triggerStatus("Manual logged minutes updated. Will plot on analytics.");
                    }}
                    className="w-full bg-indigo-600 hover:opacity-90 py-2 rounded-xl text-xs font-bold text-white cursor-pointer"
                  >
                    Submit manual duration
                  </button>
                </div>
              </div>
            )}

            {/* Empty Challenge */}
            {activeSubView === "challenge" && (
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-slate-100">Study Challenges</h4>
                <div className="bg-[#161616] p-4 rounded-2xl border border-slate-800 text-center text-xs text-slate-400 space-y-2.5">
                  <p>Daily focus challenge is live!</p>
                  <p className="font-bold text-slate-200">✨ Standard 4-hour Study Streak Challenge</p>
                  <span className="inline-block text-[9px] bg-emerald-500/10 px-2 py-0.5 rounded-full text-emerald-400 border border-emerald-500/20 font-bold">Participating</span>
                </div>
              </div>
            )}

          </div>
          
          <p className="text-[9px] text-center text-slate-550 select-none pt-4">© Yeolpumta Replica Workspace Edition</p>
        </div>
      )}

    </div>
  );
}
