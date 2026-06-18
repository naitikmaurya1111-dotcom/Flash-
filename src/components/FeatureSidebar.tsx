import React, { useState, useRef, useEffect } from "react";
import { 
  BarChart2, Trophy, Clock, ShieldCheck, Dumbbell, BookOpen, Music, 
  Sparkles, Palette, Store, HelpCircle, Settings, LogIn, Moon, CloudOff, 
  Map, Eye, VolumeX, Shuffle, ArrowRight, Grid, Bell,
  Trash, Plus, Upload, Play, Pause, Volume2, ChevronRight, Lock, User, Target
} from "lucide-react";
import { ALL_STUDENT_LEVELS, calculateStudentLevel } from "../types";

interface FeatureSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  onThemeSelect: (themePreset: string) => void;
  isOfflineMode: boolean;
  setIsOfflineMode: (val: boolean) => void;
  onResetAllData: () => void;
  onSimulateNewDay?: () => void;
  userXp?: number;
  currentUser?: any;
  studentName: string;
  studentClass: string;
  studentPrepTarget: string;
  onUpdateProfile: (updates: { name: string; class: string; preparation: string; level: number }) => Promise<void>;
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
  onSimulateNewDay,
  userXp = 0,
  currentUser,
  studentName,
  studentClass,
  studentPrepTarget,
  onUpdateProfile
}: FeatureSidebarProps) {
  const [activeSubView, setActiveSubView] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Profile Form state
  const [editFormName, setEditFormName] = useState(studentName);
  const [editFormClass, setEditFormClass] = useState(studentClass);
  const [editFormPrep, setEditFormPrep] = useState(studentPrepTarget);
  const [editFormLevel, setEditFormLevel] = useState(1);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    setEditFormName(studentName);
  }, [studentName]);

  useEffect(() => {
    setEditFormClass(studentClass);
  }, [studentClass]);

  useEffect(() => {
    setEditFormPrep(studentPrepTarget);
  }, [studentPrepTarget]);

  useEffect(() => {
    const currentLvl = calculateStudentLevel(userXp).level;
    setEditFormLevel(currentLvl);
  }, [userXp]);
  
  const triggerStatus = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 3000);
  };
  
  // Audio state
  interface CustomTrack {
    name: string;
    url: string;
    isCustom?: boolean;
  }

  const [customTracks, setCustomTracks] = useState<CustomTrack[]>([]);
  const [trackCurrentTime, setTrackCurrentTime] = useState(0);
  const [trackDuration, setTrackDuration] = useState(0);
  const [audioVolume, setAudioVolume] = useState(0.8);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [currentTracksIdx, setCurrentTracksIdx] = useState(0);
  const [isPlayingAud, setIsPlayingAud] = useState(false);
  const [allowedApps, setAllowedApps] = useState([
    { name: "Google Calendar", allowed: true },
    { name: "Gmail Email Client", allowed: true },
    { name: "Flash5tudy AI", allowed: true },
    { name: "Slack / Teams Chat", allowed: false },
    { name: "Silly Social Feed", allowed: false }
  ]);

  const soundPresets = [
    { name: "Dreamy Lofi Beats", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
    { name: "Midnight Rain drops", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
    { name: "Cozy Study Waves", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" }
  ];

  const playlist = [...soundPresets, ...customTracks];

  // Sync volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = audioVolume;
    }
  }, [audioVolume]);

  // Load and play track
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }

    const audio = audioRef.current;
    const currentTrack = playlist[currentTracksIdx];

    if (currentTrack) {
      // Create comparison URL that works with browser href mapping
      const isSameSource = audio.src === currentTrack.url || audio.src.endsWith(currentTrack.url);
      if (!isSameSource) {
        audio.src = currentTrack.url;
        audio.load();
      }

      if (isPlayingAud) {
        audio.play().catch((err) => {
          console.warn("Audio play blocked by browser:", err);
          setIsPlayingAud(false);
        });
      } else {
        audio.pause();
      }
    } else {
      audio.pause();
      setIsPlayingAud(false);
    }
  }, [currentTracksIdx, isPlayingAud, customTracks]);

  // Sync progress and handle metadata
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      setTrackCurrentTime(audio.currentTime);
    };

    const onLoadedMetadata = () => {
      setTrackDuration(audio.duration || 0);
    };

    const onEnded = () => {
      if (playlist.length > 0) {
        setCurrentTracksIdx((prev) => (prev + 1) % playlist.length);
      } else {
        setIsPlayingAud(false);
      }
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
    };
  }, [playlist.length]);

  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const loaded: CustomTrack[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith("audio/") || file.name.endsWith(".mp3") || file.name.endsWith(".flac") || file.name.endsWith(".wav") || file.name.endsWith(".m4a") || file.name.endsWith(".aac")) {
        const url = URL.createObjectURL(file);
        loaded.push({
          name: file.name.replace(/\.[^/.]+$/, ""),
          url,
          isCustom: true
        });
      }
    }

    if (loaded.length > 0) {
      setCustomTracks((prev) => {
        const nextCustom = [...prev, ...loaded];
        triggerStatus(`Successfully loaded ${loaded.length} private audio tracks!`);
        return nextCustom;
      });
    } else {
      triggerStatus("No valid audio files found.");
    }
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const loaded: CustomTrack[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const url = URL.createObjectURL(file);
      loaded.push({
        name: file.name.replace(/\.[^/.]+$/, ""),
        url,
        isCustom: true
      });
    }

    setCustomTracks((prev) => {
      const nextCustom = [...prev, ...loaded];
      triggerStatus(`Successfully loaded ${loaded.length} private audio tracks!`);
      return nextCustom;
    });
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const handleSubViewSelect = (viewName: string) => {
    setActiveSubView(viewName);
  };

  const handleActionClick = (targetTab: string) => {
    setActiveTab(targetTab);
    onClose();
  };

  return (
    <div className={`fixed sm:absolute right-0 top-16 bottom-0 w-full sm:w-[380px] bg-white/80 dark:bg-[#121212]/85 backdrop-blur-xl border-l border-slate-250 dark:border-slate-800/85 z-50 flex flex-col hover:shadow-2xl justify-between shadow-2xl overflow-y-auto no-scrollbar sm:rounded-l-3xl p-6 text-slate-800 dark:text-slate-100 transition-all duration-300 ease-in-out ${
      isOpen ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 pointer-events-none"
    }`}>
      
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

          {/* Section: Student Profile Card */}
          <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-[#151515] dark:to-[#1a1a1a] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#f26419]/5 rounded-full filter blur-xl transition-all duration-300 group-hover:bg-[#f26419]/10"></div>
            
            <div className="flex items-start gap-3 relative z-10">
              <div className="w-10 h-10 rounded-full bg-[#f26419] text-white font-black flex items-center justify-center text-base shadow-md shadow-orange-500/20">
                {studentName?.[0]?.toUpperCase() || "S"}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between gap-1">
                  <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">{studentName}</h4>
                  <span className="text-[9px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold px-1.5 py-0.5 rounded font-mono shrink-0">
                    Lvl {calculateStudentLevel(userXp).level}
                  </span>
                </div>
                
                <p className="text-[10px] text-slate-550 dark:text-slate-400 font-black truncate mt-0.5">
                  🎓 {studentClass} • {studentPrepTarget}
                </p>
                <p className="text-[9.5px] font-mono text-slate-450 dark:text-zinc-500 truncate mt-0.5 leading-none">
                  Badge: {calculateStudentLevel(userXp).rank}
                </p>
              </div>
            </div>

            <button 
              onClick={() => handleSubViewSelect("profile")}
              className="w-full mt-3 bg-white hover:bg-slate-50 dark:bg-[#1f1f1f] dark:hover:bg-[#252525] border border-slate-200 dark:border-slate-800 text-[10px] font-black py-1.5 rounded-xl cursor-pointer transition-all text-center block text-[#f26419] shadow-sm active:scale-98"
            >
              Configure Student Profile
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
                onClick={() => handleActionClick("target-suite")}
                className="flex items-center gap-2.5 bg-slate-100/70 hover:bg-slate-200/80 dark:bg-[#171717]/90 dark:hover:bg-[#1a1a1a] p-2 px-3 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all text-left cursor-pointer border border-slate-200/45 dark:border-transparent"
              >
                <Target className="w-4 h-4 text-[#f26419]" />
                <span className="text-xs font-semibold">Target Suite</span>
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
                onClick={() => handleActionClick("rewards")}
                className="flex items-center gap-2.5 bg-slate-100/70 hover:bg-slate-200/80 dark:bg-[#171717]/90 dark:hover:bg-[#1a1a1a] p-2 px-3 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all text-left cursor-pointer border border-[#f26419]/25 hover:border-[#f26419]"
              >
                <Trophy className="w-4 h-4 text-[#f26419] animate-pulse" />
                <span className="text-xs font-black">Wishlist Store</span>
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
            {onSimulateNewDay && (
              <button
                onClick={() => {
                  onSimulateNewDay();
                  onClose();
                }}
                className="w-full bg-[#f26419]/10 hover:bg-[#f26419]/25 text-[#f26419] dark:text-[#f26419] border border-[#f26419]/20 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer text-center flex items-center justify-center gap-2 mb-1"
                title="Manually simulate date change rollover to verify resets"
              >
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                Simulate New Day Reset
              </button>
            )}
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

            {/* Sub-view: Edit Profile Panel */}
            {activeSubView === "profile" && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto rounded-full bg-[#f26419]/15 text-[#f26419] flex items-center justify-center font-black text-xl mb-1.5 border border-[#f26419]/20 shadow-inner">
                    {editFormName?.[0]?.toUpperCase() || "S"}
                  </div>
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">Student Study Profile</h4>
                  <p className="text-[10px] text-slate-500">Configure your exams target, class & level</p>
                </div>

                <div className="space-y-3.5 pt-2 text-left">
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-bold text-slate-450 tracking-wider">Full Name</label>
                    <input 
                      type="text" 
                      value={editFormName}
                      onChange={(e) => setEditFormName(e.target.value)}
                      placeholder="My Name"
                      className="w-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-[#f26419] focus:ring-1 focus:ring-[#f26419]/20"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-bold text-slate-450 tracking-wider">Academic Class</label>
                    <select
                      value={editFormClass}
                      onChange={(e) => setEditFormClass(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-[#f26419] font-sans"
                    >
                      <option value="Class 10">Class 10 (Secondary)</option>
                      <option value="Class 11">Class 11 (High School)</option>
                      <option value="Class 12">Class 12 (Prep Year)</option>
                      <option value="Dropper">Dropper (JEE/NEET Repeater)</option>
                      <option value="College/Other">College / Professional / Other</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-bold text-slate-450 tracking-wider">Exam Preparation Focus</label>
                    <select
                      value={editFormPrep}
                      onChange={(e) => setEditFormPrep(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-[#f26419] font-sans"
                    >
                      <option value="JEE">JEE Main & Advanced Exam</option>
                      <option value="NEET">NEET Medical Exam</option>
                      <option value="CBSE Boards">CBSE Board Exam</option>
                      <option value="ICSE Boards">ICSE Board Exam</option>
                      <option value="IAS/UPSC">IAS / UPSC Civil Services</option>
                      <option value="Other">Other Competitive / Board Exam</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-bold text-slate-450 tracking-wider">Student Academic Rank</label>
                    <div className="bg-slate-100/50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 px-3 py-2.5 rounded-xl text-xs border border-slate-205 dark:border-slate-850 flex items-center justify-between">
                      <span className="font-extrabold text-[#f26419]">Level {calculateStudentLevel(userXp || 0).level}</span>
                      <span className="text-[10px] font-mono text-slate-500 font-bold uppercase">{calculateStudentLevel(userXp || 0).rank}</span>
                    </div>
                    <p className="text-[9px] text-slate-450 mt-1">Changing levels manually is disabled. Rank upgrades dynamically through study focus XP.</p>
                  </div>

                  <button 
                    onClick={async () => {
                      setIsSavingProfile(true);
                      try {
                        await onUpdateProfile({
                          name: editFormName,
                          class: editFormClass,
                          preparation: editFormPrep,
                          level: calculateStudentLevel(userXp || 0).level
                        });
                        triggerStatus("Student study profile updated!");
                        setActiveSubView(null);
                      } catch (err) {
                        console.error(err);
                      } finally {
                        setIsSavingProfile(false);
                      }
                    }}
                    disabled={isSavingProfile}
                    className="w-full bg-[#f26419] hover:bg-[#d85311] py-2.5 rounded-xl text-xs font-black text-white cursor-pointer transition-all active:scale-98 disabled:opacity-50 mt-2 flex items-center justify-center gap-1.5"
                  >
                    {isSavingProfile ? "Saving Profile..." : "Save Profile Details"}
                  </button>
                </div>
              </div>
            )}

            {/* Sub-view: Lofi Music Player */}
            {activeSubView === "music" && (
              <div className="space-y-4" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
                <div className="text-center">
                  <Music className="w-10 h-10 text-[#f26419] mx-auto animate-pulse mb-1.5" />
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">Acoustic Study Player</h4>
                  <p className="text-[10px] text-slate-500">Play local high-quality FLAC, MP3 files securely</p>
                </div>

                {/* Current Track Display Card */}
                {playlist[currentTracksIdx] ? (
                  <div className="bg-slate-50 dark:bg-[#161616] rounded-2xl p-4 border border-slate-200 dark:border-slate-800/60 space-y-3">
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-[10px] uppercase tracking-widest font-mono text-slate-450">
                          {playlist[currentTracksIdx].isCustom ? "My Private Track" : "Lofi Preset"}
                        </p>
                        <h5 className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate mt-0.5" title={playlist[currentTracksIdx].name}>
                          {playlist[currentTracksIdx].name}
                        </h5>
                      </div>
                      <span className="text-[9px] bg-[#f26419]/10 text-[#f26419] px-2 py-0.5 rounded uppercase font-black shrink-0">
                        {playlist[currentTracksIdx].isCustom ? "Imported" : "Lofi"}
                      </span>
                    </div>

                    {/* Animated Equalizer Waves */}
                    {isPlayingAud && (
                      <div className="flex items-end justify-center gap-1 h-6 py-0.5">
                        <div className="w-1 bg-[#f26419] rounded-full animate-[bounce_0.8s_infinite_0.1s] h-3"></div>
                        <div className="w-1 bg-[#f26419] rounded-full animate-[bounce_0.6s_infinite_0.3s] h-5"></div>
                        <div className="w-1 bg-[#f26419] rounded-full animate-[bounce_0.9s_infinite_0.2s] h-2"></div>
                        <div className="w-1 bg-[#f26419] rounded-full animate-[bounce_0.7s_infinite_0.4s] h-4"></div>
                        <div className="w-1 bg-[#f26419] rounded-full animate-[bounce_0.5s_infinite_0.1s] h-3"></div>
                      </div>
                    )}

                    {/* Progress slider and labels */}
                    <div className="space-y-1">
                      <input 
                        type="range"
                        min="0"
                        max={trackDuration || 100}
                        value={trackCurrentTime}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (audioRef.current) {
                            audioRef.current.currentTime = val;
                            setTrackCurrentTime(val);
                          }
                        }}
                        className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
                        style={{ accentColor: "#f26419" }}
                      />
                      <div className="flex justify-between items-center text-[9px] font-mono text-slate-400">
                        <span>{formatTime(trackCurrentTime)}</span>
                        <span>{formatTime(trackDuration)}</span>
                      </div>
                    </div>

                    {/* Volume control */}
                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900/50 px-2.5 py-1.5 rounded-xl">
                      <button 
                        onClick={() => setAudioVolume(prev => (prev === 0 ? 0.8 : 0))}
                        className="text-slate-400 hover:text-[#f26419]"
                      >
                        {audioVolume === 0 ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                      </button>
                      <input 
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={audioVolume}
                        onChange={(e) => setAudioVolume(Number(e.target.value))}
                        className="flex-1 h-1 bg-slate-300 dark:bg-slate-700 rounded appearance-none cursor-pointer"
                        style={{ accentColor: "#6366f1" }}
                      />
                    </div>

                    {/* Buttons block */}
                    <div className="flex justify-center items-center gap-4 pt-1">
                      <button 
                        onClick={() => setCurrentTracksIdx(prev => (prev - 1 + playlist.length) % playlist.length)}
                        className="p-2 hover:bg-slate-200 dark:hover:bg-slate-805 rounded-full text-slate-600 dark:text-slate-300 cursor-pointer"
                        title="Previous Track"
                      >
                        ⏮
                      </button>
                      <button 
                        onClick={() => setIsPlayingAud(!isPlayingAud)}
                        className="p-3 bg-[#f26419] w-12 h-12 flex items-center justify-center rounded-full text-white cursor-pointer hover:scale-105 transition-transform"
                      >
                        {isPlayingAud ? <Pause className="w-5 h-5 fill-current text-white stroke-none" /> : <Play className="w-5 h-5 fill-current text-white stroke-none ml-0.5" />}
                      </button>
                      <button 
                        onClick={() => setCurrentTracksIdx(prev => (prev + 1) % playlist.length)}
                        className="p-2 hover:bg-slate-200 dark:hover:bg-slate-805 rounded-full text-slate-600 dark:text-slate-300 cursor-pointer"
                        title="Next Track"
                      >
                        ⏭
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-center text-slate-500">No tracks loaded inside player</p>
                )}

                {/* Import private music selection panel */}
                <div className={`border-2 border-dashed rounded-2xl p-4 text-center transition-all ${
                  isDragging ? "border-[#f26419] bg-[#f26419]/5" : "border-slate-300 dark:border-slate-800 hover:border-[#f26419]/70"
                }`}>
                  <input 
                    id="audio-upload"
                    type="file"
                    multiple
                    accept=".mp3,.flac,.wav,.aac,.m4a,audio/*"
                    className="hidden"
                    onChange={handleAudioUpload}
                  />
                  <Upload className="w-7 h-7 mx-auto text-slate-400 mb-1 animate-bounce" />
                  <p className="text-[11px] font-bold text-slate-750 dark:text-slate-200">Drag & Drop Private Music</p>
                  <p className="text-[9px] text-slate-500 mb-2">Supports high fidelity FLAC, MP3, etc. securely</p>
                  <label 
                    htmlFor="audio-upload"
                    className="inline-block bg-[#f26419] hover:opacity-90 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg cursor-pointer transition-all"
                  >
                    Select Multiple Files
                  </label>
                </div>

                {/* Playlist list view */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[11px] font-bold text-slate-450 font-mono uppercase">Study Tracklist ({playlist.length})</span>
                    {customTracks.length > 0 && (
                      <button 
                        onClick={() => {
                          setCustomTracks([]);
                          setCurrentTracksIdx(0);
                          triggerStatus("Cleared custom uploaded tracks list.");
                        }}
                        className="text-[9px] text-rose-500 hover:underline cursor-pointer"
                      >
                        Clear Custom
                      </button>
                    )}
                  </div>
                  
                  <div className="max-h-[160px] overflow-y-auto space-y-1.5 pr-1 no-scrollbar text-left font-sans">
                    {playlist.map((track, idx) => {
                      const isActive = idx === currentTracksIdx;
                      return (
                        <div 
                          key={idx} 
                          onClick={() => {
                            setCurrentTracksIdx(idx);
                            setIsPlayingAud(true);
                          }}
                          className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer text-left ${
                            isActive 
                              ? "bg-slate-100 dark:bg-slate-900 border-[#f26419]" 
                              : "bg-slate-55/40 dark:bg-[#141414]/40 border-slate-200 dark:border-slate-800/40 hover:bg-slate-100/60 dark:hover:bg-slate-800/60"
                          }`}
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {isActive && isPlayingAud ? (
                              <span className="flex gap-0.5 items-end justify-center h-3.5 w-3.5 shrink-0">
                                <span className="w-0.5 bg-[#f26419] rounded-full animate-[bounce_0.6s_infinite_0.1s] h-1.5"></span>
                                <span className="w-0.5 bg-[#f26419] rounded-full animate-[bounce_0.5s_infinite_0.3s] h-2.5"></span>
                                <span className="w-0.5 bg-[#f26419] rounded-full animate-[bounce_0.7s_infinite_0.2s] h-1"></span>
                              </span>
                            ) : (
                              <Music className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-[#f26419]" : "text-slate-400"}`} />
                            )}
                            <span className={`text-[11px] truncate ${isActive ? "font-bold text-[#f26419]" : "text-slate-700 dark:text-slate-300"}`}>
                              {track.name}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1.5 pl-2">
                            <span className={`text-[8px] font-sans px-1.5 py-0.5 rounded uppercase font-bold shrink-0 ${
                              track.isCustom ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/10" : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-400"
                            }`}>
                              {track.isCustom ? "Mine" : "Lofi"}
                            </span>
                            
                            {track.isCustom && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCustomTracks(prev => {
                                    const nextTracklist = prev.filter(t => t.url !== track.url);
                                    if (isActive) {
                                      setCurrentTracksIdx(0);
                                    } else if (idx < currentTracksIdx) {
                                      setCurrentTracksIdx(currentTracksIdx - 1);
                                    }
                                    return nextTracklist;
                                  });
                                  triggerStatus("Private track deleted.");
                                }}
                                className="text-slate-400 hover:text-rose-500 p-0.5 rounded cursor-pointer shrink-0"
                              >
                                <Trash className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

             {/* Sub-view: Theme Picker */}
            {activeSubView === "themes" && (
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">Color Themes Preset</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Match the visual interface to fit your current study vibe:</p>
                
                <div className="grid grid-cols-1 gap-2.5 pt-2">
                  {[
                    { id: "dark-classic", name: "Default Theme (No Accent Preset)", bg: "bg-slate-350 dark:bg-slate-600", desc: "No custom color presets or overlays applied", reqLevel: 1 },
                    { id: "forest", name: "Matcha Forest & Mint", bg: "bg-[#0b1c15]", desc: "Cozy focus greens", reqLevel: 3 },
                    { id: "crimson", name: "Sunset Crimson & Cherry", bg: "bg-[#210206]", desc: "Deep study warmth", reqLevel: 6 },
                    { id: "honey", name: "Amber Honey & Vanilla", bg: "bg-[#fca311]", desc: "Golden hour coziness", reqLevel: 10 },
                    { id: "amoled", name: "Modern High Contrast / OLED", bg: "bg-black", desc: "Pitch black or vivid white", reqLevel: 15 }
                  ].map((preset) => {
                    const userLevel = Math.floor(userXp / 500) + 1;
                    const isLocked = userLevel < preset.reqLevel;
                    return (
                      <button
                        key={preset.id}
                        disabled={isLocked}
                        onClick={() => {
                          if (!isLocked) {
                            onThemeSelect(preset.id);
                            onClose();
                          }
                        }}
                        className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all text-left w-full ${
                          isLocked 
                            ? "opacity-55 bg-slate-100 dark:bg-[#1b1b1b] border-dashed border-slate-300 dark:border-zinc-800 cursor-not-allowed" 
                            : "border-slate-200/65 dark:border-slate-800 hover:border-[#f26419]/50 dark:hover:border-slate-700 bg-[#fbfbfc]/85 dark:bg-[#161616]/80 cursor-pointer hover:scale-[1.01]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-4 h-4 rounded-full border border-slate-300 dark:border-slate-700 shrink-0 ${preset.bg}`}></span>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-xs font-black block leading-none ${isLocked ? "text-slate-450 dark:text-zinc-500" : "text-slate-800 dark:text-slate-100"}`}>{preset.name}</span>
                              {isLocked && (
                                <span className="text-[8.5px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded font-mono font-black shrink-0">Lvl {preset.reqLevel}</span>
                              )}
                            </div>
                            <span className="text-[9.5px] text-slate-450 dark:text-slate-505 font-mono mt-1 block leading-none">{preset.desc}</span>
                          </div>
                        </div>
                        {isLocked ? (
                          <span className="text-[8.5px] text-zinc-550 dark:text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1 shrink-0">
                            <Lock className="w-2.5 h-2.5" /> Locked
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#f26419] font-black uppercase tracking-wider">Apply</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sub-view: Allowed Apps blacklist */}
            {activeSubView === "allowed" && (
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">Permitted App Whitelist</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">YPT blocking emulator. Permit only focus apps during active logs:</p>
                
                <div className="space-y-2 pt-2">
                  {allowedApps.map((app, index) => (
                    <div key={app.name} className="flex items-center justify-between bg-slate-50 dark:bg-[#161616] p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{app.name}</span>
                      <button
                        onClick={() => {
                          const updated = [...allowedApps];
                          updated[index].allowed = !updated[index].allowed;
                          setAllowedApps(updated);
                        }}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-lg cursor-pointer ${
                          app.allowed 
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" 
                            : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
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
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">Pomodoro Intervals</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-sans leading-relaxed">Customize ticking structures to trigger smart study intervals:</p>
                
                <div className="space-y-3.5 pt-2 bg-slate-50 dark:bg-[#161616] p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Focus Period</span>
                    <span className="font-bold font-mono text-slate-800 dark:text-slate-100">25 minutes</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Short Break</span>
                    <span className="font-bold font-mono text-slate-800 dark:text-slate-100">5 minutes</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Long Break</span>
                    <span className="font-bold font-mono text-slate-800 dark:text-slate-100">15 minutes</span>
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
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">Study books sessions</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">Plot and log goals per curriculum textbooks:</p>
                
                <div className="bg-slate-50 dark:bg-[#161616] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-3 rounded-xl flex justify-between items-center text-xs">
                    <div>
                      <span className="block font-bold text-slate-800 dark:text-slate-100">Algorithms (CLRS)</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">Page 120 of 840</span>
                    </div>
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-[#f26419] font-bold">14% Done</span>
                  </div>
                </div>
              </div>
            )}

            {/* Sub-view: Store Sticker shop */}
            {activeSubView === "store" && (
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">Stickers & Themes shop</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">Exchange your daily accumulated consistency coins for stickers:</p>
                
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { style: "🔥 Cozy Flame", price: "20 Coins" },
                    { style: "🎓 Golden Cap", price: "35 Coins" },
                    { style: "✏️ Tiny Notebook", price: "40 Coins" },
                    { style: "👾 Retro Pixel", price: "50 Coins" }
                  ].map((sticker) => (
                    <div key={sticker.style} className="bg-slate-50 dark:bg-[#161616] p-3 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-between text-center">
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
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">Log Entry Modifier</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">Manually adjust your recorded focus cycles:</p>
                <div className="bg-slate-50 dark:bg-[#161616] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-black block uppercase">Enter Manual hours</span>
                  <input 
                    type="number" 
                    placeholder="Duration (Minutes)"
                    className="w-full bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-805 focus:outline-none"
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
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">Study Challenges</h4>
                <div className="bg-slate-50 dark:bg-[#161616] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2.5">
                  <p>Daily focus challenge is live!</p>
                  <p className="font-bold text-slate-700 dark:text-slate-200">✨ Standard 4-hour Study Streak Challenge</p>
                  <span className="inline-block text-[9px] bg-emerald-500/10 px-2 py-0.5 rounded-full text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold">Participating</span>
                </div>
              </div>
            )}

          </div>
          
          <p className="text-[9px] text-center text-slate-550 select-none pt-4">© Flash5tudy Workspace Edition</p>
        </div>
      )}

    </div>
  );
}
