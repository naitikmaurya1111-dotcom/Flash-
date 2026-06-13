import React, { useState, useEffect, useRef } from "react";
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
import { Subject, StudyLog } from "../types";

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
  timerType: "stopwatch" | "pomodoro";
  setTimerType: (type: "stopwatch" | "pomodoro") => void;
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
}: TimelineViewProps) {
  // Navigation inside the Focus subtab
  const [subView, setSubView] = useState<"stopwatch" | "timeline">("stopwatch");
  const [showSubjectsModal, setShowSubjectsModal] = useState(false);
  const [isEditingSubjectsList, setIsEditingSubjectsList] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectColor, setNewSubjectColor] = useState("bg-emerald-500");
  const [allDayEvents, setAllDayEvents] = useState<string[]>(["Google I/O event", "Diary 📓 Fill"]);

  // Audio ambient synthesizers states
  const [ambientSound, setAmbientSound] = useState<"none" | "brown" | "rain" | "waves" | "fire" | "binaural">("none");
  const [volume, setVolume] = useState(0.18);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

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

  // Focus guard tab auto-pause listener
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (focusGuard && document.hidden && isStudying) {
        setIsStudying(false);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [focusGuard, isStudying, setIsStudying]);

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

  // Set default subject if none is active
  useEffect(() => {
    if (!activeSubjectId && subjects.length > 0) {
      setActiveSubjectId(subjects[0].id);
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
    const hrs = Math.floor(totalMins / 60);
    const mins = Math.floor(totalMins % 60);
    return `${hrs}h ${mins}m`;
  };

  const handleStartStudy = (subjectId: string) => {
    if (isStudying && activeSubjectId === subjectId) {
      setIsStudying(false);
    } else {
      setActiveSubjectId(subjectId);
      setIsStudying(true);
    }
  };

  const handleStopAndSave = async () => {
    if (activeSeconds > 0 && activeSubjectId) {
      const roundedMinutes = Math.max(1, Math.round(activeSeconds / 60));
      await onAddStudyMinutes(activeSubjectId, roundedMinutes);
      setActiveSeconds(0);
      setIsStudying(false);
      setShowDiscardConfirm(false);
    }
  };

  const handleDiscardProgress = () => {
    if (!showDiscardConfirm) {
      setShowDiscardConfirm(true);
      setTimeout(() => setShowDiscardConfirm(false), 5000);
      return;
    }
    setActiveSeconds(0);
    setIsStudying(false);
    setShowDiscardConfirm(false);
  };

  // Pomodoro custom helper controls & adjusters
  const formatPomoTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const handleSkipPomo = () => {
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

  const handleCreateSubject = () => {
    if (!newSubjectName.trim()) return;
    const matchedColor = colorOptions.find(c => c.bg === newSubjectColor) || colorOptions[0];
    const newSub: Subject = {
      id: "subject-" + Date.now(),
      name: newSubjectName,
      color: matchedColor.fromTo,
      icon: "BookOpen",
      totalMinutes: 0,
      goalMinutes: 120
    };
    setSubjects(prev => [...prev, newSub]);
    setActiveSubjectId(newSub.id);
    setNewSubjectName("");
    setIsEditingSubjectsList(false);
  };

  const handleDeleteSubject = (id: string) => {
    setSubjects(prev => prev.filter(s => s.id !== id));
  };

  const hoursArray = Array.from({ length: 24 }, (_, i) => {
    const period = i >= 12 ? "PM" : "AM";
    const hr = i % 12 || 12;
    return { hourVal: i, label: `${hr} ${period}` };
  });

  const activeSubject = subjects.find(s => s.id === activeSubjectId) || subjects[0];

  // Percent calculation for the aesthetic ticking progress ring
  const getProgressRingPercent = () => {
    if (!activeSubject) return 0;
    const activeGoalSeconds = activeSubject.goalMinutes * 60 || 3600;
    const liveSecondsToday = (activeSubject.totalMinutes * 60) + (isStudying ? activeSeconds : 0);
    return Math.min(100, Math.round((liveSecondsToday / activeGoalSeconds) * 100));
  };

  return (
    <div id="ypt-active-focus-pane" className="relative flex flex-col h-full rounded-3xl overflow-hidden border border-slate-200/50 dark:border-slate-900/50 bg-white/75 dark:bg-[#0c0d10]/90 backdrop-blur-md">
          {/* Dynamic layout tabs control bar */}
      <div className="flex items-center justify-between px-6 pt-5 pb-3.5 border-b border-slate-100 dark:border-slate-900/50">
        <div className="flex items-center gap-1.5 font-sans bg-slate-100 dark:bg-slate-950 p-1 rounded-xl">
          <button 
            onClick={() => setSubView("timer")}
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              subView === "timer" 
                ? "bg-white dark:bg-[#121212] text-[#f26419] shadow-sm font-black" 
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-205"
            }`}
          >
            <Clock className="w-3.5 h-3.5" /> Study Timer
          </button>
          <button 
            onClick={() => setSubView("timeline")}
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              subView === "timeline" 
                ? "bg-white dark:bg-[#121212] text-[#f26419] shadow-sm font-black" 
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-205"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" /> Hour Timeline
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-[10px] font-mono font-black uppercase text-slate-500 bg-slate-100 dark:bg-slate-950 px-2.5 py-1 rounded-md">
            {currentDateString || "Today"}
          </span>
          <button onClick={onToggleSidebar} className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-850 rounded-xl text-slate-500 dark:text-slate-400 cursor-pointer" title="Switch features">
            <Grid className="w-4 h-4 stroke-[2]" />
          </button>
        </div>
      </div>

      {subView === "timer" ? (
        /* ==================== SCREEN A: PREMIUM STUDY CHROMOPHORE TIMER & POMODORO ==================== */
        <div className="flex-1 p-6 md:p-8 space-y-6 flex flex-col justify-between overflow-y-auto no-scrollbar relative">
          
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

          {/* Stopwatch vs Pomodoro Segmented Controls */}
          <div className="flex justify-center mb-1">
            <div className="bg-slate-100/80 dark:bg-slate-950 p-1 rounded-2xl flex items-center gap-1 border border-slate-200/40 dark:border-slate-800">
              <button
                onClick={() => {
                  setTimerType("stopwatch");
                  setIsStudying(false); // Pause studying safely on flip
                }}
                className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                  timerType === "stopwatch"
                    ? "bg-white dark:bg-[#15161b] text-[#f26419] shadow-sm font-extrabold"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                <Clock className="w-3.5 h-3.5" /> Stopwatch Mode
              </button>
              <button
                onClick={() => {
                  setTimerType("pomodoro");
                  setIsStudying(false); // Pause safely on flip
                }}
                className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                  timerType === "pomodoro"
                    ? "bg-white dark:bg-[#15161b] text-[#f26419] shadow-sm font-extrabold"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-rose-500 fill-rose-500/10" /> Pomodoro Mode
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center flex-1">
            
            {/* Left side: Premium Circular progress ring (customizes based on stopwatch vs pomodoro) */}
            <div className="lg:col-span-6 flex flex-col items-center justify-center p-2 relative">
              <div className="relative w-64 h-64 flex items-center justify-center">
                
                {/* Multi-layered Pulsing Halo Outer Rings */}
                {isStudying && (
                  <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#f26419]/20 animate-spin" style={{ animationDuration: '30s' }} />
                )}
                {isStudying && (
                  <div className="absolute -inset-1.5 rounded-full border border-solid border-[#f26419]/10 animate-ping opacity-40 duration-2000" style={{ animationDuration: '3s' }} />
                )}

                {/* Mindful Breathing Animated Anchor Overlays */}
                {showBreathingCoach && isStudying && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none rounded-full z-0 overflow-hidden">
                    <div 
                      className={`absolute rounded-full border border-[#f26419]/20 bg-[#f26419]/5 transition-all duration-[4000ms] ease-in-out ${
                        breathState === "inhale" ? "inset-2 opacity-75 scale-110"
                        : breathState === "hold" ? "inset-1.5 opacity-90 blur-[1px] scale-115 animate-pulse"
                        : "inset-6 opacity-30 scale-95"
                      }`}
                    />
                  </div>
                )}

                <svg className="w-full h-full transform" style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}>
                  <defs>
                    <linearGradient id="timerSunsetGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#f26419" />
                      <stop offset="50%" stopColor="#f34825" />
                      <stop offset="100%" stopColor="#ff9f43" />
                    </linearGradient>
                    <radialGradient id="ringBackground" cx="50%" cy="50%" r="50%">
                      <stop offset="70%" stopColor="transparent" />
                      <stop offset="100%" stopColor="rgba(242, 100, 25, 0.03)" />
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
                <div className="absolute flex flex-col items-center justify-center text-center px-6 z-10">
                  {activeSubject ? (
                    <div className="flex flex-col items-center max-w-[190px] mb-1">
                      <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block truncate max-w-[150px]">
                        {activeSubject.name}
                      </span>
                      <div className="flex items-center gap-1 text-[9px] text-[#f26419] font-mono font-black mt-0.5">
                        <span>Goal: {activeSubject.goalMinutes}m</span>
                        <span className="opacity-40">•</span>
                        <span>
                          {timerType === "stopwatch" ? `${getProgressRingPercent()}%` : (
                            () => {
                              const maxSecs = pomoState === "focus" ? pomoFocusDuration * 60 :
                                               pomoState === "shortBreak" ? pomoShortBreakDuration * 60 :
                                               pomoLongBreakDuration * 60;
                              return `${Math.round(((maxSecs - pomoSecondsLeft) / maxSecs) * 100)}%`;
                            }
                          )()}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">Study Focus</span>
                  )}

                  <span className="text-4xl md:text-5xl font-mono font-black tracking-tighter text-slate-800 dark:text-neutral-50 my-1 antialiased tabular-nums leading-none">
                    {timerType === "stopwatch" ? formatTickingTime(activeSeconds) : formatPomoTime(pomoSecondsLeft)}
                  </span>

                  <div className="mt-2.5 flex flex-col items-center gap-1.5">
                    <div className={`text-[9px] uppercase tracking-wider font-mono px-3 py-1 rounded-full border transition-all duration-300 font-extrabold ${
                      isStudying 
                        ? pomoState === "focus" || timerType === "stopwatch"
                          ? "bg-[#f26419]/10 border-[#f26419]/30 text-[#f26419] animate-pulse" 
                          : "bg-emerald-500/10 border-emerald-500/30 text-emerald-500 animate-pulse"
                        : "bg-slate-100 dark:bg-slate-950 border-transparent text-slate-500"
                    }`}>
                      {timerType === "stopwatch" ? (
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
                      <div className="flex items-center justify-center gap-1 bg-[#f26419]/5 dark:bg-[#f26419]/15 border border-[#f26419]/20 px-2.5 py-0.5 rounded-full animate-pulse">
                        <span className="w-1 h-1 rounded-full bg-[#f26419]" />
                        <span className="text-[7.5px] font-mono font-black uppercase text-[#f26419] tracking-widest leading-none">
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
                {timerType === "stopwatch" ? (
                  activeSeconds > 0 && (
                    <>
                      <button
                        onClick={handleStopAndSave}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-5 py-3 rounded-2xl transition-all cursor-pointer shadow-md flex items-center gap-1.5 hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <Check className="w-4 h-4 stroke-[2.5]" /> Save Session
                      </button>
                      <button
                        onClick={handleDiscardProgress}
                        className={`text-slate-500 font-bold text-xs p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                          showDiscardConfirm 
                            ? "bg-rose-600 border-rose-500 text-white hover:bg-rose-500 animate-pulse" 
                            : "bg-slate-50 hover:bg-slate-100 border-slate-200 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900"
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

            {/* Right side: Study setup and adjustments */}
            <div className="lg:col-span-6 space-y-4 text-left">
              
              {/* Category section select grids */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Categories of study
                  </h3>
                  <span className="text-[10px] font-mono font-bold text-slate-550 dark:text-slate-400 bg-slate-105 dark:bg-slate-950 px-2.5 py-0.5 rounded-full">
                    {subjects.length} active
                  </span>
                </div>
                
                {/* Subject selection container */}
                <div className="grid grid-cols-2 gap-2.5 max-h-[140px] overflow-y-auto no-scrollbar pr-1">
                  {subjects.map((sub) => {
                    const isSelected = activeSubjectId === sub.id;
                    const liveMinutes = sub.totalMinutes + (isSelected && isStudying && timerType === "stopwatch" ? activeSeconds / 60 : 0);
                    const percentComplete = Math.min(100, Math.round((liveMinutes / (sub.goalMinutes || 120)) * 100));

                    return (
                      <button
                        key={sub.id}
                        onClick={() => handleStartStudy(sub.id)}
                        className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all select-none relative overflow-hidden interactive-card ${
                          isSelected 
                            ? "border-[#f26419] bg-[#f26419]/5 dark:bg-[#f26419]/10 text-slate-800 dark:text-slate-100" 
                            : "border-slate-200/70 dark:border-slate-900/60 bg-white dark:bg-[#121215]/50 hover:bg-slate-50/50 dark:hover:bg-[#15151a] text-slate-600 dark:text-slate-350"
                        }`}
                      >
                        <div className="text-left w-full">
                          <p className={`text-[9px] font-mono uppercase font-black tracking-wider ${isSelected ? 'text-[#f26419]' : 'text-slate-400 dark:text-slate-500'}`}>
                            {isSelected ? 'Active Study' : 'Topic'}
                          </p>
                          <h4 className="text-xs font-black truncate mt-0.5 max-w-[125px]">{sub.name}</h4>
                        </div>

                        {/* Progress goal bar */}
                        <div className="w-full mt-2 space-y-1">
                          <div className="flex justify-between items-center text-[9px] font-mono">
                            <span className="text-[#f26419] font-extrabold">{formatSubjectMinutes(liveMinutes)}</span>
                            <span className="text-slate-400 font-bold">{percentComplete}%</span>
                          </div>
                          <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-[#f26419] to-orange-400 transition-all duration-500 rounded-full" 
                              style={{ width: `${percentComplete}%` }}
                            />
                          </div>
                        </div>

                        {isSelected && isStudying && (
                          <span className="absolute top-2 right-2 flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                        )}
                      </button>
                    );
                  })}
                  
                  {/* Create Class trigger */}
                  <button
                    onClick={() => {
                      setShowSubjectsModal(true);
                      setIsEditingSubjectsList(true);
                    }}
                    className="border border-dashed border-slate-300 dark:border-slate-850 p-2.5 rounded-2xl hover:bg-slate-50/50 dark:hover:bg-[#121215] text-slate-400 hover:text-[#f26419] flex flex-col justify-center items-center text-center transition-all cursor-pointer h-[78px]"
                  >
                    <Plus className="w-4 h-4 mb-0.5" />
                    <span className="text-[9px] font-black uppercase tracking-wider">New Class</span>
                  </button>
                </div>
              </div>

              {/* Daily Goal Adjuster Module */}
              <div className="bg-slate-50/70 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-900 space-y-3 mt-1 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-mono text-slate-400 dark:text-slate-500 font-black tracking-wider">
                    Subject Daily Goal Adjuster
                  </span>
                  <span className="text-[10px] font-mono font-bold bg-[#f26419]/10 text-[#f26419] px-2.5 py-0.5 rounded-full">
                    {(activeSubject?.goalMinutes) || 120} mins daily
                  </span>
                </div>
                
                <div className="flex items-center justify-between bg-white dark:bg-[#121215]/50 p-2.5 rounded-xl border border-slate-150 dark:border-slate-800">
                  <div className="min-w-0">
                    <p className="text-[8px] font-mono uppercase text-slate-400">Selected Topic</p>
                    <h4 className="text-xs font-black truncate max-w-[140px] text-slate-700 dark:text-slate-200">
                      {activeSubject?.name || "No subject selected"}
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
                      onClick={() => setAmbientSound(s.id as any)}
                      className={`p-2 rounded-xl text-center text-[10px] font-bold uppercase tracking-wider border transition-all cursor-pointer truncate ${
                        ambientSound === s.id 
                          ? "bg-slate-900 border-[#f26419]/40 text-[#f26419] dark:bg-slate-950 shadow-xs" 
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

            </div>
          </div>

          {/* Master bottom play/pause active focus trigger bar */}
          <div className="pt-5 border-t border-slate-100 dark:border-slate-900/50 flex gap-4">
            <button
              onClick={() => {
                if (activeSubject) {
                  setIsStudying(!isStudying);
                }
              }}
              className={`flex-1 py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-wider select-none transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg active:scale-98 ${
                isStudying 
                  ? "bg-slate-900 hover:bg-slate-800 text-slate-105 border border-slate-850 dark:bg-[#16171d]/90 dark:text-neutral-200"
                  : "bg-[#f26419] hover:bg-[#d6510d] text-white hover:shadow-[#f26419]/20 hover:scale-[1.01]"
              }`}
            >
              {isStudying ? (
                <>
                  <Pause className="w-4 h-4 fill-current stroke-[3] text-[#f26419]" /> Pause Focus Flow
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current stroke-[3] text-white" /> Begin focus session
                </>
              )}
            </button>
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
                  <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{evt}</span>
                </div>
              ))}
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
                    const todayStr = new Date().toISOString().split("T")[0];
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
                      title={`${log.subjectName}: ${log.durationMinutes}m studied`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="font-sans font-extrabold text-[11px] text-slate-800 dark:text-slate-200 truncate flex items-center gap-1.5">
                          <span className={`w-2.5 h-2.5 rounded-full ${colorBg.startsWith("bg-") ? colorBg : `bg-gradient-to-r ${colorBg}`}`}></span>
                          {log.subjectName}
                        </span>
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 border border-slate-205 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                          {log.durationMinutes}m
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
                    Finish Session ({Math.round(activeSeconds / 60)}m)
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
