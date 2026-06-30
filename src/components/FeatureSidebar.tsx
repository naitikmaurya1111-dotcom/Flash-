import React, { useState, useRef, useEffect } from "react";
import { 
  BarChart2, Trophy, Clock, ShieldCheck, Dumbbell, BookOpen, Music, 
  Sparkles, Palette, Store, HelpCircle, Settings, LogIn, Moon, CloudOff, Cloud,
  Map, Eye, VolumeX, Shuffle, ArrowRight, Grid, Bell,
  Trash, Plus, Upload, Play, Pause, Volume2, ChevronRight, Lock, User, Target,
  PenTool, Layers, FileText, Zap, Crown
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
  isFirebaseConnected?: boolean | null;
  themePreset: string;
  currentThemeStyle: any;
  isTrialActive?: boolean;
  trialDaysRemaining?: number;
  isPermanentlyUnlocked?: boolean;
  onResetTrial?: () => void;
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
  onUpdateProfile,
  isFirebaseConnected = null,
  themePreset,
  currentThemeStyle,
  isTrialActive = false,
  trialDaysRemaining = 0,
  isPermanentlyUnlocked = false,
  onResetTrial
}: FeatureSidebarProps) {
  const [activeSubView, setActiveSubView] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [pomoPreset, setPomoPreset] = useState("classic");

  // ==========================================
  // --- STUDENT BEAST UTILITY CENTER STATES ---
  // ==========================================
  const [beastTab, setBeastTab] = useState<"acoustics" | "planners" | "analytics" | "quick">("acoustics");

  // 2. Flashcards state (Spaced Repetition)
  const [flashcards, setFlashcards] = useState<any[]>(() => {
    const saved = localStorage.getItem("f5_beast_flashcards");
    return saved ? JSON.parse(saved) : [
      { id: "1", question: "What is the formula of Photosynthesis?", answer: "6CO₂ + 6H₂O + Light → C₆H₁₂O₆ + 6O₂", recall: "Medium" },
      { id: "2", question: "State Newton's Second Law of Motion", answer: "Force equals mass times acceleration (F = ma)", recall: "Easy" }
    ];
  });
  const [newFcQ, setNewFcQ] = useState("");
  const [newFcA, setNewFcA] = useState("");
  const [currentFcIdx, setCurrentFcIdx] = useState(0);
  const [fcFlipped, setFcFlipped] = useState(false);

  // 3. Syllabus Tracker state
  const [syllabusItems, setSyllabusItems] = useState<any[]>(() => {
    const saved = localStorage.getItem("f5_beast_syllabus");
    return saved ? JSON.parse(saved) : [
      { id: "1", subject: "Physics", topic: "Rotational Dynamics", done: false },
      { id: "2", subject: "Chemistry", topic: "Chemical Bonding", done: true },
      { id: "3", subject: "Mathematics", topic: "Integral Calculus", done: false }
    ];
  });
  const [newSySub, setNewSySub] = useState("Physics");
  const [newSyTopic, setNewSyTopic] = useState("");

  // 4. Eisenhower Priority Matrix state
  const [matrixItems, setMatrixItems] = useState<any[]>(() => {
    const saved = localStorage.getItem("f5_beast_matrix");
    return saved ? JSON.parse(saved) : [
      { id: "1", text: "Complete Physics Homework", quadrant: 1, done: false },
      { id: "2", text: "Register for JEE Exam", quadrant: 2, done: false },
      { id: "3", text: "Organize desk setup", quadrant: 4, done: true }
    ];
  });
  const [newMatrixText, setNewMatrixText] = useState("");
  const [newMatrixQuad, setNewMatrixQuad] = useState<number>(1);

  // 5. Soundboard & Binaural Waves synth refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const binLeftOscRef = useRef<OscillatorNode | null>(null);
  const binRightOscRef = useRef<OscillatorNode | null>(null);
  const binGainRef = useRef<GainNode | null>(null);
  const [binauralActive, setBinauralActive] = useState(false);
  const [binCarrier, setBinCarrier] = useState(200); // 200 Hz
  const [binBeat, setBinBeat] = useState(10); // 10 Hz (Alpha waves)
  const [ambientVolume, setAmbientVolume] = useState({
    binaural: 0.3,
    campFire: 0.0,
    oceanRain: 0.0,
    keyboardSimulator: 0.5
  });
  const [filterActive, setFilterActive] = useState(false);

  // 6. GPA & Marks state
  const [gpaClasses, setGpaClasses] = useState<any[]>(() => {
    const saved = localStorage.getItem("f5_beast_gpaclasses");
    return saved ? JSON.parse(saved) : [
      { id: "1", name: "Physics", weight: 30, currentScore: 85 },
      { id: "2", name: "Chemistry", weight: 30, currentScore: 90 },
      { id: "3", name: "Mathematics", weight: 40, currentScore: 80 }
    ];
  });
  const [newGpaName, setNewGpaName] = useState("");
  const [newGpaWeight, setNewGpaWeight] = useState(33);
  const [newGpaScore, setNewGpaScore] = useState(85);
  const [gpaTarget, setGpaTarget] = useState(90);

  // 7. Cycle Estimator state
  const [pageCount, setPageCount] = useState(120);
  const [readSpeed, setReadSpeed] = useState(3); // 3 mins per page
  const [focusEff, setFocusEff] = useState(80); // 80%

  // 8. Stretching / Breathing state
  const [breathPattern, setBreathPattern] = useState<"box" | "pranayama" | "calm">("box");
  const [breathState, setBreathState] = useState<"Inhale" | "Hold" | "Exhale" | "Rest">("Inhale");
  const [breathSeconds, setBreathSeconds] = useState(4);
  const [breathingActive, setBreathingActive] = useState(false);
  const stretchCards = [
    "Stretch your hands overhead and hold for 15 seconds.",
    "Roll your neck slowly clockwise, then counter-clockwise.",
    "Look away 20 feet for 20 seconds and blink rapidly 10 times.",
    "Do 5 deep shoulder rolls backward.",
    "Extend your wrists backward and stretch your fingers."
  ];
  const [currentStretch, setCurrentStretch] = useState(stretchCards[0]);

  // 9. Sticker Collection state
  const [studyCoins, setStudyCoins] = useState(() => {
    const saved = localStorage.getItem("f5_beast_coins");
    return saved ? parseInt(saved, 10) : 120;
  });
  const [ownedStickers, setOwnedStickers] = useState<string[]>(() => {
    const saved = localStorage.getItem("f5_beast_stickers");
    return saved ? JSON.parse(saved) : ["🔥 Cozy Flame"];
  });
  const [pinnedStickers, setPinnedStickers] = useState<string[]>(() => {
    const saved = localStorage.getItem("f5_beast_pinned_stickers");
    return saved ? JSON.parse(saved) : [];
  });
  const stickerStore = [
    { name: "🔥 Cozy Flame", price: 20 },
    { name: "👑 Crown of Focus", price: 40 },
    { name: "💡 Wise Owl", price: 60 },
    { name: "🚀 Cosmic Rocket", price: 80 },
    { name: "🧠 Super Brain", price: 100 },
    { name: "☕ Midnight Coffee", price: 120 },
    { name: "♾️ Infinite Flow", price: 150 }
  ];

  // 2. Hydration state
  const [waterCups, setWaterCups] = useState(() => {
    const saved = localStorage.getItem("f5_beast_water");
    return saved ? parseInt(saved, 10) : 3;
  });

  // 3. Exam countdown state
  const [examName, setExamName] = useState("JEE Entrance Exam");
  const [examDate, setExamDate] = useState("2026-09-15T09:00");
  const [countdownText, setCountdownText] = useState("");

  // 5. Eye strain countdown
  const [eyeStrainSeconds, setEyeStrainSeconds] = useState(1200); // 20 minutes

  // 8. Brain math sprint state
  const [mathNum1, setMathNum1] = useState(7);
  const [mathNum2, setMathNum2] = useState(6);
  const [mathAnswer, setMathAnswer] = useState("");
  const [mathScore, setMathScore] = useState(0);
  const [mathActive, setMathActive] = useState(false);
  const [mathTimeLeft, setMathTimeLeft] = useState(10);

  // 9. Focus energy levels
  const [focusEnergy, setFocusEnergy] = useState(75);

  // 11. Scratchpad Notes state
  const [scratchpadText, setScratchpadText] = useState(() => {
    return localStorage.getItem("f5_beast_scratchpad") || "Write down your quick formulas, target chapters, or notes here...";
  });

  // 12. Expense tracker
  const [expenses, setExpenses] = useState<any[]>(() => {
    const saved = localStorage.getItem("f5_beast_expenses");
    return saved ? JSON.parse(saved) : [
      { id: "1", item: "Physics Textbook Vol 1", cost: 450 },
      { id: "2", item: "UPSC Test Series Registration", cost: 1200 }
    ];
  });
  const [expenseItem, setExpenseItem] = useState("");
  const [expenseCost, setExpenseCost] = useState(0);

  // Sync Flashcards
  useEffect(() => {
    localStorage.setItem("f5_beast_flashcards", JSON.stringify(flashcards));
  }, [flashcards]);

  // Sync Syllabus
  useEffect(() => {
    localStorage.setItem("f5_beast_syllabus", JSON.stringify(syllabusItems));
  }, [syllabusItems]);

  // Sync Matrix
  useEffect(() => {
    localStorage.setItem("f5_beast_matrix", JSON.stringify(matrixItems));
  }, [matrixItems]);

  // Sync GPA
  useEffect(() => {
    localStorage.setItem("f5_beast_gpaclasses", JSON.stringify(gpaClasses));
  }, [gpaClasses]);

  // Sync Coins
  useEffect(() => {
    localStorage.setItem("f5_beast_coins", studyCoins.toString());
    window.dispatchEvent(new CustomEvent("f5_coins_updated", { detail: studyCoins }));
  }, [studyCoins]);

  useEffect(() => {
    const handleCoinsSync = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail !== undefined && customEvent.detail !== studyCoins) {
        setStudyCoins(customEvent.detail);
      }
    };
    window.addEventListener("f5_coins_updated", handleCoinsSync);
    return () => window.removeEventListener("f5_coins_updated", handleCoinsSync);
  }, [studyCoins]);

  // Sync Stickers
  useEffect(() => {
    localStorage.setItem("f5_beast_stickers", JSON.stringify(ownedStickers));
  }, [ownedStickers]);
  useEffect(() => {
    localStorage.setItem("f5_beast_pinned_stickers", JSON.stringify(pinnedStickers));
  }, [pinnedStickers]);

  // Sync Water
  useEffect(() => {
    localStorage.setItem("f5_beast_water", waterCups.toString());
    window.dispatchEvent(new CustomEvent("f5_water_updated", { detail: waterCups }));
  }, [waterCups]);

  useEffect(() => {
    const handleWaterSync = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail !== undefined && customEvent.detail !== waterCups) {
        setWaterCups(customEvent.detail);
      }
    };
    window.addEventListener("f5_water_updated", handleWaterSync);
    return () => window.removeEventListener("f5_water_updated", handleWaterSync);
  }, [waterCups]);

  // Sync Scratchpad
  useEffect(() => {
    localStorage.setItem("f5_beast_scratchpad", scratchpadText);
  }, [scratchpadText]);

  // Sync Expenses
  useEffect(() => {
    localStorage.setItem("f5_beast_expenses", JSON.stringify(expenses));
  }, [expenses]);

  // Keyboard clack player
  const playKeyboardClack = () => {
    if (ambientVolume.keyboardSimulator === 0) return;
    try {
      const ctx = audioCtxRef.current || new (window.AudioContext || (window as any).webkitAudioContext)();
      if (!audioCtxRef.current) audioCtxRef.current = ctx;
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = "sine";
      // random realistic key clack frequency
      osc.frequency.setValueAtTime(150 + Math.random() * 80, ctx.currentTime);
      
      gain.gain.setValueAtTime(ambientVolume.keyboardSimulator * 0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {
      // safe fallback
    }
  };

  const toggleBinauralBeats = () => {
    try {
      const ctx = audioCtxRef.current || new (window.AudioContext || (window as any).webkitAudioContext)();
      if (!audioCtxRef.current) audioCtxRef.current = ctx;

      if (binauralActive) {
        if (binLeftOscRef.current) {
          binLeftOscRef.current.stop();
          binLeftOscRef.current.disconnect();
          binLeftOscRef.current = null;
        }
        if (binRightOscRef.current) {
          binRightOscRef.current.stop();
          binRightOscRef.current.disconnect();
          binRightOscRef.current = null;
        }
        if (binGainRef.current) {
          binGainRef.current.disconnect();
          binGainRef.current = null;
        }
        setBinauralActive(false);
        triggerStatus("💤 Binaural beat synthesizer stopped.");
      } else {
        if (ctx.state === "suspended") {
          ctx.resume();
        }

        const oscL = ctx.createOscillator();
        oscL.type = "sine";
        oscL.frequency.setValueAtTime(binCarrier, ctx.currentTime);
        
        const panL = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        if (panL) {
          panL.pan.setValueAtTime(-1, ctx.currentTime);
          oscL.connect(panL);
        }

        const oscR = ctx.createOscillator();
        oscR.type = "sine";
        oscR.frequency.setValueAtTime(binCarrier + binBeat, ctx.currentTime);
        
        const panR = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        if (panR) {
          panR.pan.setValueAtTime(1, ctx.currentTime);
          oscR.connect(panR);
        }

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(ambientVolume.binaural * 0.05, ctx.currentTime);

        if (panL && panR) {
          panL.connect(gainNode);
          panR.connect(gainNode);
        } else {
          oscL.connect(gainNode);
          oscR.connect(gainNode);
        }

        gainNode.connect(ctx.destination);

        oscL.start();
        oscR.start();

        binLeftOscRef.current = oscL;
        binRightOscRef.current = oscR;
        binGainRef.current = gainNode;
        setBinauralActive(true);
        triggerStatus(`🧠 Synthesized Binaural Wave active: ${binBeat}Hz (${binBeat >= 8 && binBeat <= 12 ? 'Alpha/Focus' : binBeat < 4 ? 'Delta/Deep Sleep' : 'Theta/Meditation'})`);
      }
    } catch (e) {
      triggerStatus("🔇 Could not initialize audio synthesizer.");
    }
  };

  // Sync Binaural synthesizer parameters in real time!
  useEffect(() => {
    if (binauralActive && binLeftOscRef.current && binRightOscRef.current && binGainRef.current) {
      try {
        const ctx = audioCtxRef.current;
        if (ctx) {
          binLeftOscRef.current.frequency.setValueAtTime(binCarrier, ctx.currentTime);
          binRightOscRef.current.frequency.setValueAtTime(binCarrier + binBeat, ctx.currentTime);
          binGainRef.current.gain.setValueAtTime(ambientVolume.binaural * 0.05, ctx.currentTime);
        }
      } catch (e) {
        // safe
      }
    }
  }, [binCarrier, binBeat, ambientVolume.binaural, binauralActive]);

  // Breathing animation ticks
  useEffect(() => {
    let interval: any = null;
    if (breathingActive) {
      interval = setInterval(() => {
        setBreathSeconds((prev) => {
          if (prev <= 1) {
            setBreathState((curr) => {
              if (breathPattern === "box") {
                if (curr === "Inhale") { setBreathSeconds(4); return "Hold"; }
                if (curr === "Hold") { setBreathSeconds(4); return "Exhale"; }
                if (curr === "Exhale") { setBreathSeconds(4); return "Rest"; }
                setBreathSeconds(4); return "Inhale";
              } else if (breathPattern === "pranayama") {
                if (curr === "Inhale") { setBreathSeconds(16); return "Hold"; }
                if (curr === "Hold") { setBreathSeconds(8); return "Exhale"; }
                setBreathSeconds(4); return "Inhale";
              } else {
                if (curr === "Inhale") { setBreathSeconds(7); return "Hold"; }
                if (curr === "Hold") { setBreathSeconds(8); return "Exhale"; }
                setBreathSeconds(4); return "Inhale";
              }
            });
            return 4;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [breathingActive, breathPattern]);

  const generateNewMath = () => {
    const num1 = Math.floor(2 + Math.random() * 11);
    const num2 = Math.floor(2 + Math.random() * 11);
    setMathNum1(num1);
    setMathNum2(num2);
    setMathAnswer("");
  };

  useEffect(() => {
    let interval: any = null;
    if (mathActive && mathTimeLeft > 0) {
      interval = setInterval(() => {
        setMathTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (mathActive && mathTimeLeft === 0) {
      setMathActive(false);
      triggerStatus(`🎮 Brain workout finished! Hashed score: ${mathScore}`);
    }
    return () => clearInterval(interval);
  }, [mathActive, mathTimeLeft]);

  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const target = new Date(examDate).getTime();
      const distance = target - now;

      if (distance < 0) {
        setCountdownText("Exam day is here! Good Luck!");
      } else {
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const mins = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((distance % (1000 * 60)) / 1000);
        setCountdownText(`${days}d ${hours}h ${mins}m ${secs}s`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [examDate, isOpen]);

  useEffect(() => {
    let interval: any = null;
    if (isOpen) {
      interval = setInterval(() => {
        setEyeStrainSeconds((prev) => {
          if (prev <= 1) {
            triggerStatus("👀 Look Away Alert! Focus on something 20 feet away for 20 seconds.");
            return 1200; // Reset
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isOpen]);
  // ------------------------------------------

  const playTestAlarm = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // high A note
      gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.8);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.8);
      triggerStatus("🔔 High-fidelity Gong sound tested!");
    } catch (e) {
      triggerStatus("🔈 Notification sound tested!");
    }
  };

  // Profile Form state
  const [editFormName, setEditFormName] = useState(studentName);
  const [editFormClass, setEditFormClass] = useState(studentClass);
  const [editFormPrep, setEditFormPrep] = useState(studentPrepTarget);
  const [editFormLevel, setEditFormLevel] = useState(1);
  const [editFormPersona, setEditFormPersona] = useState(() => localStorage.getItem("f5_student_persona") || "Balanced Scholar");
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
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | null>(null);
  const [sleepTimerSecondsLeft, setSleepTimerSecondsLeft] = useState<number>(0);

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

  // Sleep timer implementation
  useEffect(() => {
    let timerId: any = null;
    if (isPlayingAud && sleepTimerMinutes !== null) {
      if (sleepTimerSecondsLeft > 0) {
        timerId = setTimeout(() => {
          setSleepTimerSecondsLeft(prev => prev - 1);
        }, 1000);
      } else {
        setIsPlayingAud(false);
        setSleepTimerMinutes(null);
        triggerStatus("💤 Focus music sleep timer completed!");
      }
    }
    return () => clearTimeout(timerId);
  }, [isPlayingAud, sleepTimerMinutes, sleepTimerSecondsLeft]);

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
    <div 
      className={`fixed sm:absolute right-0 top-16 bottom-0 w-full sm:w-[385px] liquid-glass border-l-2 z-50 flex flex-col justify-between overflow-y-auto no-scrollbar sm:rounded-l-[32px] p-6 text-slate-800 dark:text-slate-100 transition-all duration-500 ease-in-out ${
        isOpen ? "translate-x-0 opacity-100 scale-100" : "translate-x-full opacity-0 scale-95 pointer-events-none"
      }`}
      style={{
        borderLeftColor: (currentThemeStyle?.primary || '#f26419') + '25',
        boxShadow: isOpen 
          ? `0 30px 70px -15px rgba(0, 0, 0, 0.45), 0 0 40px 0 ${(currentThemeStyle?.primary || '#f26419')}0d, inset 0 2px 2px 0 rgba(255, 255, 255, 0.15)`
          : 'none'
      }}
    >
      {/* Dynamic Ambient Aura Glow (Inspired by ColorOS 16 Liquid Glass) */}
      <div 
        className="absolute -top-12 -right-12 w-64 h-64 rounded-full filter blur-[95px] opacity-[0.24] dark:opacity-[0.28] mix-blend-screen pointer-events-none transition-all duration-1000 animate-pulse"
        style={{ backgroundColor: currentThemeStyle?.primary || '#f26419' }}
      />
      <div 
        className="absolute bottom-20 -left-12 w-48 h-48 rounded-full filter blur-[80px] opacity-[0.14] dark:opacity-[0.18] mix-blend-screen pointer-events-none transition-all duration-1000"
        style={{ backgroundColor: currentThemeStyle?.primary || '#f26419' }}
      />
      
      {activeSubView === null ? (
        <div className="space-y-6 relative z-10">
          
          {/* Main Title Row */}
          <div className="flex items-center justify-between pb-2 border-b border-white/20 dark:border-white/5">
            <span className={`text-sm font-black tracking-widest uppercase ${currentThemeStyle?.gradientText || 'text-[#f26419]'}`}>Flash5tudy Functions</span>
            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Section: Student Profile Card */}
          <div className="bg-white/40 dark:bg-black/30 backdrop-blur-xl p-4 rounded-3xl border border-white/40 dark:border-white/10 shadow-lg relative overflow-hidden group">
            <div 
              className="absolute top-0 right-0 w-32 h-32 rounded-full filter blur-xl transition-all duration-500 group-hover:scale-110 opacity-20"
              style={{ backgroundColor: currentThemeStyle?.primary || '#f26419' }}
            ></div>
            <div className="flex items-start gap-3 relative z-10">
              <div 
                className={`w-10 h-10 rounded-full text-white font-black flex items-center justify-center text-base shadow-md transition-all duration-300 ${currentThemeStyle?.accentBg || 'bg-[#f26419]'} ${currentThemeStyle?.glowClass || 'shadow-orange-500/20'}`}
              >
                {studentName?.[0]?.toUpperCase() || "S"}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between gap-1">
                  <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">{studentName}</h4>
                  <span 
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded font-mono shrink-0"
                    style={{ 
                      backgroundColor: (currentThemeStyle?.primary || '#f26419') + '20', 
                      color: currentThemeStyle?.primary || '#f26419' 
                    }}
                  >
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

            {/* Visual Level Progress Bar */}
            {(() => {
              const levelInfo = calculateStudentLevel(userXp);
              return (
                <div className="mt-3 pt-3 border-t border-white/20 dark:border-white/5 text-left relative z-10">
                  <div className="flex justify-between items-center text-[9px] text-slate-500 dark:text-slate-400 font-mono mb-1">
                    <span className="font-bold">XP Progress • {levelInfo.percent}%</span>
                    <span>{levelInfo.xpInCurrentLevel} / {levelInfo.xpSegmentTotal} XP</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200/50 dark:bg-white/5 rounded-full overflow-hidden border border-white/10">
                    <div 
                      className={`h-full bg-gradient-to-r ${currentThemeStyle?.gradient || 'from-[#f26419] to-amber-500'} transition-all duration-500 ease-out`} 
                      style={{ width: `${levelInfo.percent}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[8.2px] text-slate-450 dark:text-zinc-500 font-medium mt-1">
                    <span>Total: {userXp.toLocaleString()} XP</span>
                    <span>Next level in {levelInfo.nextLevelXpRemaining.toLocaleString()} XP</span>
                  </div>
                </div>
              );
            })()}

            <button 
              onClick={() => handleSubViewSelect("profile")}
              className="w-full mt-3.5 bg-white/50 hover:bg-white/75 dark:bg-white/5 dark:hover:bg-white/10 border border-white/60 dark:border-white/10 text-[10px] font-black py-2 rounded-xl cursor-pointer transition-all duration-300 text-center block shadow-xs active:scale-98"
              style={{ color: currentThemeStyle?.primary || '#f26419' }}
            >
              Configure Student Profile
            </button>
          </div>

          {/* Section 1: Main Features */}
          <div className="space-y-3.5">
            <p className="text-[10px] uppercase font-black tracking-widest text-slate-500/80">Main Features</p>
            <div className="grid grid-cols-2 gap-2.5">
              <button 
                onClick={() => handleActionClick("analytics")}
                className="flex items-center gap-2.5 bg-white/40 dark:bg-[#12121e]/35 backdrop-blur-md border border-white/50 dark:border-white/5 hover:bg-white/65 dark:hover:bg-[#181826]/50 hover:border-slate-350 dark:hover:border-white/15 p-2.5 px-3 rounded-2xl hover:scale-[1.03] active:scale-[0.97] transition-all duration-300 text-left cursor-pointer shadow-xs"
              >
                <BarChart2 className="w-4 h-4 text-emerald-550 dark:text-emerald-450" />
                <span className="text-xs font-bold text-slate-750 dark:text-slate-200">Statistics</span>
              </button>
              
              <button 
                onClick={() => handleActionClick("target-suite")}
                className="flex items-center gap-2.5 bg-white/40 dark:bg-[#12121e]/35 backdrop-blur-md border border-white/50 dark:border-white/5 hover:bg-white/65 dark:hover:bg-[#181826]/50 hover:border-slate-350 dark:hover:border-white/15 p-2.5 px-3 rounded-2xl hover:scale-[1.03] active:scale-[0.97] transition-all duration-300 text-left cursor-pointer shadow-xs"
              >
                <Target className="w-4 h-4" style={{ color: currentThemeStyle?.primary || '#f26419' }} />
                <span className="text-xs font-bold text-slate-750 dark:text-slate-200">Target Suite</span>
              </button>

              <button 
                onClick={() => handleSubViewSelect("pomodoro")}
                className="flex items-center gap-2.5 bg-white/40 dark:bg-[#12121e]/35 backdrop-blur-md border border-white/50 dark:border-white/5 hover:bg-white/65 dark:hover:bg-[#181826]/50 hover:border-slate-350 dark:hover:border-white/15 p-2.5 px-3 rounded-2xl hover:scale-[1.03] active:scale-[0.97] transition-all duration-300 text-left cursor-pointer shadow-xs"
              >
                <Clock className="w-4 h-4" style={{ color: currentThemeStyle?.primary || '#f26419' }} />
                <span className="text-xs font-bold text-slate-750 dark:text-slate-200">Pomodoro</span>
              </button>

              <button 
                onClick={() => handleSubViewSelect("editlog")}
                className="flex items-center gap-2.5 bg-white/40 dark:bg-[#12121e]/35 backdrop-blur-md border border-white/50 dark:border-white/5 hover:bg-white/65 dark:hover:bg-[#181826]/50 hover:border-slate-350 dark:hover:border-white/15 p-2.5 px-3 rounded-2xl hover:scale-[1.03] active:scale-[0.97] transition-all duration-300 text-left cursor-pointer shadow-xs"
              >
                <BookOpen className="w-4 h-4 text-pink-500 dark:text-pink-400" />
                <span className="text-xs font-bold text-slate-750 dark:text-slate-200">Edit log</span>
              </button>

              <button 
                onClick={() => {
                  setActiveTab("reminders");
                  onClose();
                }}
                className="flex items-center gap-2.5 bg-white/40 dark:bg-[#12121e]/35 backdrop-blur-md border border-white/50 dark:border-white/5 hover:bg-white/65 dark:hover:bg-[#181826]/50 hover:border-slate-350 dark:hover:border-white/15 p-2.5 px-3 rounded-2xl hover:scale-[1.03] active:scale-[0.97] transition-all duration-300 text-left cursor-pointer shadow-xs"
              >
                <Bell className="w-4 h-4 text-amber-500 animate-pulse" />
                <span className="text-xs font-bold text-slate-750 dark:text-slate-200">Reminders</span>
              </button>

              <button 
                onClick={() => setIsOfflineMode(!isOfflineMode)}
                className={`flex items-center gap-2.5 p-2.5 px-3 rounded-2xl hover:scale-[1.03] active:scale-[0.97] transition-all duration-300 text-left cursor-pointer border backdrop-blur-md ${
                  isOfflineMode 
                    ? "bg-rose-950/40 border-rose-800 text-rose-300 shadow-md shadow-rose-950/30" 
                    : "bg-white/40 dark:bg-[#12121e]/35 border-white/50 dark:border-white/5 hover:bg-white/65 dark:hover:bg-[#181826]/50 hover:border-slate-350 dark:hover:border-white/15 text-slate-750 dark:text-slate-200"
                }`}
              >
                <CloudOff className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span className="text-xs font-bold">{isOfflineMode ? "Offline" : "Offline Mode"}</span>
              </button>

              <div className="col-span-2 py-2 px-3.5 rounded-2xl flex items-center justify-between text-[11px] font-mono border border-white/30 dark:border-white/5 bg-white/20 dark:bg-black/20 backdrop-blur-md">
                <span className="text-slate-450 dark:text-slate-500 flex items-center gap-1">
                  <Cloud className="w-3 h-3 text-sky-400" />
                  Cloud Sync:
                </span>
                <span className="flex items-center gap-1.5">
                  <span className={`inline-block w-2 h-2 rounded-full ${
                    isFirebaseConnected === true 
                      ? "bg-emerald-500 animate-pulse" 
                      : isFirebaseConnected === false 
                        ? "bg-rose-500 animate-pulse" 
                        : "bg-amber-400 animate-pulse"
                  }`} />
                  <span className={
                    isFirebaseConnected === true 
                      ? "text-emerald-500 font-extrabold" 
                      : isFirebaseConnected === false 
                        ? "text-rose-450 font-extrabold" 
                        : "text-amber-450 font-extrabold"
                  }>
                    {isFirebaseConnected === true 
                      ? "CONNECTED" 
                      : isFirebaseConnected === false 
                        ? "DISCONNECTED" 
                        : "VALIDATING..."}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Extra Features */}
          <div className="space-y-3.5">
            <p className="text-[10px] uppercase font-black tracking-widest text-slate-500/80">Extra Features</p>
            <div className="grid grid-cols-2 gap-2.5">
              <button 
                onClick={() => handleSubViewSelect("challenge")}
                className="flex items-center gap-2.5 bg-white/40 dark:bg-[#12121e]/35 backdrop-blur-md border border-white/50 dark:border-white/5 hover:bg-white/65 dark:hover:bg-[#181826]/50 hover:border-slate-350 dark:hover:border-white/15 p-2.5 px-3 rounded-2xl hover:scale-[1.03] active:scale-[0.97] transition-all duration-300 text-left cursor-pointer shadow-xs"
              >
                <Dumbbell className="w-4 h-4 text-violet-500 dark:text-violet-400" />
                <span className="text-xs font-bold text-slate-750 dark:text-slate-200">Challenge</span>
              </button>

              <button 
                onClick={() => handleSubViewSelect("music")}
                className="flex items-center gap-2.5 bg-white/40 dark:bg-[#12121e]/35 backdrop-blur-md border border-white/50 dark:border-white/5 hover:bg-white/65 dark:hover:bg-[#181826]/50 hover:border-slate-350 dark:hover:border-white/15 p-2.5 px-3 rounded-2xl hover:scale-[1.03] active:scale-[0.97] transition-all duration-300 text-left cursor-pointer shadow-xs"
              >
                <Music className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                <span className="text-xs font-bold text-slate-750 dark:text-slate-200">Music Player</span>
              </button>

              <button 
                onClick={() => handleActionClick("workspace")}
                className="col-span-2 flex items-center justify-center gap-2.5 bg-white/40 dark:bg-[#12121e]/35 backdrop-blur-md border border-white/50 dark:border-white/5 hover:bg-white/65 dark:hover:bg-[#181826]/50 hover:border-slate-350 dark:hover:border-white/15 p-2.5 px-3 rounded-2xl hover:scale-[1.03] active:scale-[0.97] transition-all duration-300 text-center cursor-pointer shadow-xs"
              >
                <Sparkles className="w-4 h-4 text-yellow-500 dark:text-yellow-400" />
                <span className="text-xs font-bold text-slate-750 dark:text-slate-200">Google Hub Integration</span>
              </button>
            </div>
          </div>

          {/* Section 3: Customize */}
          <div className="space-y-3.5">
            <p className="text-[10px] uppercase font-black tracking-widest text-slate-500/80">Customize Mode</p>
            <div className="grid grid-cols-2 gap-2.5">
              <button 
                onClick={() => handleSubViewSelect("themes")}
                className="flex items-center gap-2.5 bg-white/40 dark:bg-[#12121e]/35 backdrop-blur-md border border-white/50 dark:border-white/5 hover:bg-white/65 dark:hover:bg-[#181826]/50 p-2.5 px-3 rounded-2xl hover:scale-[1.03] active:scale-[0.97] transition-all duration-300 text-left cursor-pointer shadow-xs"
                style={{ 
                  borderColor: (currentThemeStyle?.primary || '#f26419') + '35'
                }}
              >
                <Palette className="w-4 h-4 text-teal-500 dark:text-teal-400" />
                <span className="text-xs font-bold text-slate-750 dark:text-slate-200">Themes Colors</span>
              </button>

              <button 
                onClick={() => handleActionClick("rewards")}
                className="flex items-center gap-2.5 bg-white/40 dark:bg-[#12121e]/35 backdrop-blur-md border border-white/50 dark:border-white/5 hover:bg-white/65 dark:hover:bg-[#181826]/50 p-2.5 px-3 rounded-2xl hover:scale-[1.03] active:scale-[0.97] transition-all duration-300 text-left cursor-pointer shadow-xs"
                style={{ 
                  borderColor: (currentThemeStyle?.primary || '#f26419') + '35'
                }}
              >
                <Trophy className="w-4 h-4 text-amber-500 animate-pulse" />
                <span className="text-xs font-black" style={{ color: currentThemeStyle?.primary || '#f26419' }}>Wishlist Store</span>
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
                  <span className="font-semibold text-slate-705 dark:text-slate-300">Flash5tudy Help Desk</span>
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

            {/* Sub-view: Student Beast Utilities */}
            {activeSubView === "beast_utility" && (
              <div className="space-y-4">
                <div className="text-center">
                  <h4 className="font-extrabold text-sm text-[#f26419] uppercase tracking-wider flex items-center justify-center gap-1">
                    <Sparkles className="w-4 h-4 animate-spin text-amber-500" />
                    Apex Focus Citadel
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">30+ ultra-advanced client utilities to supercharge your study sessions</p>
                </div>

                {/* Categories Scrollable Bar with Premium Liquid Glass Inset */}
                <div className="liquid-glass-inset p-1.5 rounded-2xl flex gap-1 overflow-x-auto scrollbar-none no-scrollbar">
                  {[
                    { id: "acoustics", label: "🎛️ sound", icon: Volume2 },
                    { id: "planners", label: "🃏 study", icon: Layers },
                    { id: "analytics", label: "📈 target", icon: BarChart2 },
                    { id: "quick", label: "⚡ quick", icon: Sparkles }
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const isSelected = beastTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setBeastTab(tab.id as any);
                          playKeyboardClack();
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black shrink-0 transition-all duration-300 cursor-pointer ${
                          isSelected
                            ? "text-white scale-102 font-black shadow-md border"
                            : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/30 dark:hover:bg-white/5 border border-transparent"
                        }`}
                        style={isSelected ? { 
                          backgroundColor: currentThemeStyle?.primary || '#f26419', 
                          borderColor: (currentThemeStyle?.primary || '#f26419') + '80', 
                          boxShadow: `0 4px 12px ${(currentThemeStyle?.primary || '#f26419')}30` 
                        } : {}}
                      >
                        <Icon className="w-3 h-3" />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {/* Sub-tab: 🎛️ sound */}
                {beastTab === "acoustics" && (
                  <div className="space-y-4 text-left">
                    {/* Big Feature 5: Binaural beats Mixer */}
                    <div className="bg-slate-50 dark:bg-[#161616] p-3 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
                          <Volume2 className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                          High-Fi Binaural beats synthesizer
                        </span>
                        <button
                          onClick={toggleBinauralBeats}
                          className={`px-3 py-1 rounded-xl text-[10px] font-black transition-all cursor-pointer ${
                            binauralActive
                              ? "bg-rose-500 text-white shadow-md shadow-rose-500/20"
                              : "bg-[#f26419] text-white"
                          }`}
                        >
                          {binauralActive ? "⏹️ STOP" : "▶️ PLAY SYNTH"}
                        </button>
                      </div>

                      <div className="space-y-2">
                        {/* Carrier Freq */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                            <span>Carrier base: {binCarrier} Hz</span>
                            <span>Focus Tuning</span>
                          </div>
                          <input 
                            type="range"
                            min="150"
                            max="450"
                            value={binCarrier}
                            onChange={(e) => setBinCarrier(parseInt(e.target.value))}
                            className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded appearance-none cursor-pointer"
                            style={{ accentColor: "#f26419" }}
                          />
                        </div>

                        {/* Beat Freq */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                            <span>Binaural delta frequency: {binBeat} Hz</span>
                            <span className="font-bold text-indigo-500">
                              {binBeat >= 8 && binBeat <= 12 ? "Alpha 🧘 (Focus)" : binBeat >= 4 && binBeat <= 7 ? "Theta 💤 (Relax)" : "Delta 🛌 (Sleep)"}
                            </span>
                          </div>
                          <input 
                            type="range"
                            min="1"
                            max="25"
                            value={binBeat}
                            onChange={(e) => setBinBeat(parseInt(e.target.value))}
                            className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded appearance-none cursor-pointer"
                            style={{ accentColor: "#6366f1" }}
                          />
                        </div>

                        {/* Volume */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                            <span>Synth volume: {Math.round(ambientVolume.binaural * 100)}%</span>
                          </div>
                          <input 
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={ambientVolume.binaural}
                            onChange={(e) => setAmbientVolume(prev => ({ ...prev, binaural: parseFloat(e.target.value) }))}
                            className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded appearance-none cursor-pointer"
                            style={{ accentColor: "#10b981" }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Big Feature 8: Deep Breathing & Stretching Coach */}
                    <div className="bg-slate-50 dark:bg-[#161616] p-3 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
                          🧘 Breathing Coach & Rhythm
                        </span>
                        <button
                          onClick={() => {
                            setBreathingActive(!breathingActive);
                            playKeyboardClack();
                          }}
                          className={`px-2 py-0.5 rounded text-[9px] font-black cursor-pointer ${
                            breathingActive ? "bg-amber-500 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-350"
                          }`}
                        >
                          {breathingActive ? "Pause" : "Start"}
                        </button>
                      </div>

                      <div className="flex gap-1">
                        {["box", "pranayama", "calm"].map((pat) => (
                          <button
                            key={pat}
                            onClick={() => {
                              setBreathPattern(pat as any);
                              setBreathState("Inhale");
                              setBreathSeconds(4);
                              playKeyboardClack();
                            }}
                            className={`flex-1 text-[8.5px] py-1 rounded-lg font-bold uppercase transition-all cursor-pointer ${
                              breathPattern === pat
                                ? "bg-indigo-600 text-white"
                                : "bg-slate-100 dark:bg-slate-900 text-slate-400 hover:bg-slate-200"
                            }`}
                          >
                            {pat}
                          </button>
                        ))}
                      </div>

                      {breathingActive && (
                        <div className="flex flex-col items-center justify-center py-2 space-y-2 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200/50 dark:border-slate-900/40">
                          {/* Pulsing breathing bubble circle */}
                          <div 
                            className={`w-14 h-14 rounded-full flex items-center justify-center font-black text-xs text-white bg-gradient-to-tr from-teal-400 to-indigo-500 transition-all duration-1000 ${
                              breathState === "Inhale" ? "scale-125 opacity-100 shadow-lg shadow-teal-500/30" : breathState === "Hold" ? "scale-125 opacity-80" : "scale-75 opacity-60"
                            }`}
                          >
                            {breathSeconds}s
                          </div>
                          <span className="text-[10.5px] font-black uppercase text-indigo-500 dark:text-indigo-400 tracking-widest">{breathState}!</span>
                        </div>
                      )}

                      {/* Random micro break generator stretch card */}
                      <div className="bg-white dark:bg-slate-950 p-2 rounded-xl border border-slate-150 dark:border-slate-900 text-left space-y-1">
                        <span className="text-[8.5px] bg-[#f26419]/10 text-[#f26419] px-1.5 py-0.5 rounded font-black uppercase inline-block">Micro-Break Stretch Roller</span>
                        <p className="text-[10px] font-medium text-slate-700 dark:text-slate-300 leading-tight">{currentStretch}</p>
                        <button
                          onClick={() => {
                            const idx = Math.floor(Math.random() * stretchCards.length);
                            setCurrentStretch(stretchCards[idx]);
                            playKeyboardClack();
                          }}
                          className="text-[8.5px] font-black text-indigo-500 dark:text-indigo-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                        >
                          🔄 Roll Another Activity
                        </button>
                      </div>
                    </div>

                    {/* Small Feature 13: Synthesized Alarm Chime Sound Selector */}
                    <div className="bg-slate-50 dark:bg-[#161616] p-3 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div className="text-left">
                        <span className="text-[10px] font-black uppercase text-slate-400 block">Custom Alarm Synth Selector</span>
                        <span className="text-[9px] text-slate-500">Pick offline high-fidelity timer chimes</span>
                      </div>
                      <select 
                        onChange={(e) => {
                          const type = e.target.value;
                          triggerStatus(`Alarm sound modified to: ${type}`);
                          playTestAlarm();
                        }}
                        className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded px-2 py-1 text-[10px] border border-slate-200 dark:border-slate-800 focus:outline-none font-sans"
                      >
                        <option value="gong">Gong</option>
                        <option value="melodic">Piano</option>
                        <option value="retro">8-Bit</option>
                      </select>
                    </div>

                    {/* Small Feature 18: Sound Filter Sweep Switch */}
                    <div className="bg-slate-50 dark:bg-[#161616] p-3 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div className="text-left">
                        <span className="text-[10px] font-black uppercase text-slate-400 block">Ambient Acoustic Filter</span>
                        <span className="text-[9px] text-slate-500">Apply Low-Pass filter to smooth tones</span>
                      </div>
                      <button
                        onClick={() => {
                          setFilterActive(!filterActive);
                          triggerStatus(`Low-Pass filter ${!filterActive ? 'applied' : 'removed'} on workspace ambiance!`);
                          playKeyboardClack();
                        }}
                        className={`px-3 py-1 rounded-xl text-[10px] font-black transition-all cursor-pointer ${
                          filterActive ? "bg-emerald-500 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {filterActive ? "ON" : "OFF"}
                      </button>
                    </div>

                    {/* Small Feature 17: Acoustic Auto-Off Sleep Presets */}
                    <div className="bg-slate-50 dark:bg-[#161616] p-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-left space-y-1.5">
                      <span className="text-[10px] font-black uppercase text-slate-400 block">Synth Sleep Timer</span>
                      <div className="flex gap-1">
                        {[5, 10, 20, 30].map((t) => (
                          <button
                            key={t}
                            onClick={() => {
                              triggerStatus(`Acoustic synthesizer auto-shutdown scheduled in ${t}m.`);
                              setTimeout(() => {
                                if (binauralActive) toggleBinauralBeats();
                              }, t * 60 * 1000);
                            }}
                            className="flex-1 bg-slate-200 dark:bg-[#202020] hover:bg-[#f26419]/25 text-slate-700 dark:text-slate-350 text-[9px] py-1 rounded font-bold cursor-pointer transition-all"
                          >
                            {t}m
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Sub-tab: 🃏 study */}
                {beastTab === "planners" && (
                  <div className="space-y-4 text-left">
                    {/* Big Feature 3: Syllabus Progression Checker */}
                    <div className="bg-slate-50 dark:bg-[#161616] p-3 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                      <span className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
                        📑 Syllabus & Curriculum Progress
                      </span>

                      {/* Add Item form */}
                      <div className="flex gap-1.5">
                        <select
                          value={newSySub}
                          onChange={(e) => setNewSySub(e.target.value)}
                          className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-xl px-2 py-1 text-[10px] border border-slate-200 dark:border-slate-800 font-sans focus:outline-none"
                        >
                          <option value="Physics">Physics</option>
                          <option value="Chemistry">Chemistry</option>
                          <option value="Mathematics">Maths</option>
                          <option value="Other">Other</option>
                        </select>
                        <input 
                          type="text"
                          value={newSyTopic}
                          onChange={(e) => setNewSyTopic(e.target.value)}
                          placeholder="Chapter name..."
                          className="flex-1 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 px-2 py-1 rounded-xl text-[10px] border border-slate-200 dark:border-slate-800 focus:outline-none font-sans"
                        />
                        <button
                          onClick={() => {
                            if (!newSyTopic.trim()) return;
                            const newItem = { id: Date.now().toString(), subject: newSySub, topic: newSyTopic, done: false };
                            setSyllabusItems(prev => [...prev, newItem]);
                            setNewSyTopic("");
                            triggerStatus(`Chapter added to syllabus tracker!`);
                            playKeyboardClack();
                          }}
                          className="bg-[#f26419] hover:bg-orange-600 text-white px-2 py-1 rounded-xl text-[10px] font-black cursor-pointer"
                        >
                          +
                        </button>
                      </div>

                      {/* List */}
                      <div className="space-y-1.5 max-h-[140px] overflow-y-auto no-scrollbar pr-1 scrollbar-none">
                        {syllabusItems.map((item) => (
                          <div key={item.id} className="flex justify-between items-center bg-white dark:bg-[#0a0a0a] p-1.5 px-2 rounded-xl border border-slate-150 dark:border-slate-900">
                            <div className="flex items-center gap-2 min-w-0">
                              <input 
                                type="checkbox"
                                checked={item.done}
                                onChange={() => {
                                  setSyllabusItems(prev => prev.map(s => s.id === item.id ? { ...s, done: !s.done } : s));
                                  playKeyboardClack();
                                }}
                                className="w-3.5 h-3.5 rounded text-[#f26419] cursor-pointer"
                              />
                              <div className="truncate text-left">
                                <span className="text-[8px] uppercase font-bold text-slate-400 block leading-none">{item.subject}</span>
                                <span className={`text-[10px] font-bold ${item.done ? "line-through text-slate-450" : "text-slate-700 dark:text-slate-200"}`}>{item.topic}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setSyllabusItems(prev => prev.filter(s => s.id !== item.id));
                                playKeyboardClack();
                              }}
                              className="text-slate-400 hover:text-rose-500 text-[9px] font-bold p-1 cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Progress Bar */}
                      {(() => {
                        const total = syllabusItems.length;
                        const completed = syllabusItems.filter(s => s.done).length;
                        const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
                        return (
                          <div className="pt-2 border-t border-slate-250/50 dark:border-slate-800 text-left">
                            <div className="flex justify-between items-center text-[9px] text-slate-400 font-mono">
                              <span>Curriculum coverage: {completed}/{total} Completed</span>
                              <span>{pct}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden mt-1">
                              <div className="h-full bg-gradient-to-r from-teal-400 to-indigo-500 transition-all duration-300" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Big Feature 2: Flashcards Study Deck with recall buttons */}
                    <div className="bg-slate-50 dark:bg-[#161616] p-3 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                      <span className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
                        🃏 Spaced Repetition Flashcards Deck
                      </span>

                      {flashcards.length > 0 ? (
                        <div className="space-y-2">
                          {/* Flashcard item display */}
                          <div 
                            onClick={() => {
                              setFcFlipped(!fcFlipped);
                              playKeyboardClack();
                            }}
                            className="bg-white dark:bg-slate-950 p-4 min-h-[90px] rounded-xl border border-slate-200 dark:border-slate-850 flex flex-col justify-between items-center text-center cursor-pointer hover:border-indigo-450 transition-all"
                          >
                            <span className="text-[8px] bg-slate-100 dark:bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded font-black uppercase">
                              {fcFlipped ? "Answer" : "Question"} ({currentFcIdx + 1}/{flashcards.length})
                            </span>
                            <p className="text-[11.5px] font-bold text-slate-700 dark:text-slate-100 my-2">
                              {fcFlipped ? flashcards[currentFcIdx]?.answer : flashcards[currentFcIdx]?.question}
                            </p>
                            <span className="text-[8px] text-slate-400">Click to flip card</span>
                          </div>

                          {/* Controls & rate recall */}
                          <div className="flex gap-1.5">
                            {["Easy", "Medium", "Hard"].map((lvl) => (
                              <button
                                key={lvl}
                                onClick={() => {
                                  setFlashcards(prev => prev.map((f, i) => i === currentFcIdx ? { ...f, recall: lvl } : f));
                                  setCurrentFcIdx((prev) => (prev + 1) % flashcards.length);
                                  setFcFlipped(false);
                                  triggerStatus(`Card recall rated: ${lvl}`);
                                  playKeyboardClack();
                                }}
                                className={`flex-1 text-[8.5px] font-black py-1 rounded-lg transition-all cursor-pointer ${
                                  lvl === "Easy" ? "bg-emerald-500 text-white" : lvl === "Medium" ? "bg-amber-500 text-white" : "bg-rose-500 text-white"
                                }`}
                              >
                                {lvl}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-400 text-center">No flashcards created yet.</p>
                      )}

                      {/* Add Flashcard Form */}
                      <div className="bg-white dark:bg-slate-950 p-2.5 rounded-xl border border-slate-150 dark:border-slate-900 text-left space-y-1.5">
                        <span className="text-[8.5px] bg-[#f26419]/10 text-[#f26419] px-1.5 py-0.5 rounded font-black uppercase inline-block">Create New card</span>
                        <input 
                          type="text"
                          value={newFcQ}
                          onChange={(e) => setNewFcQ(e.target.value)}
                          placeholder="Enter Question..."
                          className="w-full bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 p-1.5 rounded-lg text-[9.5px] border border-slate-200 dark:border-slate-800 focus:outline-none"
                        />
                        <input 
                          type="text"
                          value={newFcA}
                          onChange={(e) => setNewFcA(e.target.value)}
                          placeholder="Enter Answer..."
                          className="w-full bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 p-1.5 rounded-lg text-[9.5px] border border-slate-200 dark:border-slate-800 focus:outline-none"
                        />
                        <button
                          onClick={() => {
                            if (!newFcQ.trim() || !newFcA.trim()) return;
                            const newCard = { id: Date.now().toString(), question: newFcQ, answer: newFcA, recall: "Medium" };
                            setFlashcards(prev => [...prev, newCard]);
                            setNewFcQ("");
                            setNewFcA("");
                            triggerStatus("Flashcard added to active deck!");
                            playKeyboardClack();
                          }}
                          className="w-full bg-[#f26419] hover:bg-orange-600 text-white text-[9px] py-1.5 rounded-lg font-black transition-all cursor-pointer"
                        >
                          Create Card
                        </button>
                      </div>
                    </div>

                    {/* Big Feature 4: Eisenhower quadrant board */}
                    <div className="bg-slate-50 dark:bg-[#161616] p-3 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                      <span className="text-[10px] font-black uppercase text-slate-400 block">
                        📊 Interactive Eisenhower quadrant board
                      </span>

                      {/* Add matrix item form */}
                      <div className="flex gap-1">
                        <input 
                          type="text"
                          value={newMatrixText}
                          onChange={(e) => setNewMatrixText(e.target.value)}
                          placeholder="Add priority task..."
                          className="flex-1 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 px-2 py-1 rounded-xl text-[10px] border border-slate-200 dark:border-slate-800 focus:outline-none"
                        />
                        <select
                          value={newMatrixQuad}
                          onChange={(e) => setNewMatrixQuad(parseInt(e.target.value))}
                          className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded px-1.5 py-0.5 text-[9px] border border-slate-200 dark:border-slate-800 font-sans focus:outline-none"
                        >
                          <option value="1">Urg/Imp</option>
                          <option value="2">Imp/Not</option>
                          <option value="3">Urg/Not</option>
                          <option value="4">Not/Not</option>
                        </select>
                        <button
                          onClick={() => {
                            if (!newMatrixText.trim()) return;
                            const newItem = { id: Date.now().toString(), text: newMatrixText, quadrant: newMatrixQuad, done: false };
                            setMatrixItems(prev => [...prev, newItem]);
                            setNewMatrixText("");
                            triggerStatus("Quadrant task pinned!");
                            playKeyboardClack();
                          }}
                          className="bg-[#f26419] hover:bg-orange-600 text-white px-2 py-1 rounded-xl text-[10px] font-black cursor-pointer"
                        >
                          +
                        </button>
                      </div>

                      {/* Quadrant display cards */}
                      <div className="grid grid-cols-2 gap-1.5 pt-1">
                        {[1, 2, 3, 4].map((q) => {
                          const items = matrixItems.filter(m => m.quadrant === q);
                          return (
                            <div key={q} className="bg-white dark:bg-slate-950 p-2 rounded-xl border border-slate-150 dark:border-slate-900 text-left min-h-[70px] max-h-[110px] overflow-y-auto no-scrollbar scrollbar-none">
                              <span className="text-[7.5px] uppercase font-black text-indigo-500 tracking-wider block mb-1">
                                {q === 1 ? "🔥 Do First" : q === 2 ? "📅 Schedule" : q === 3 ? "🤝 Delegate" : "🗑️ Eliminate"}
                              </span>
                              <div className="space-y-1">
                                {items.map((it) => (
                                  <div key={it.id} className="flex items-center justify-between gap-1">
                                    <span 
                                      onClick={() => {
                                        setMatrixItems(prev => prev.map(m => m.id === it.id ? { ...m, done: !m.done } : m));
                                        playKeyboardClack();
                                      }}
                                      className={`text-[9.2px] font-medium leading-tight cursor-pointer truncate flex-1 ${it.done ? "line-through text-slate-400" : "text-slate-700 dark:text-slate-300"}`}
                                      title={it.text}
                                    >
                                      {it.text}
                                    </span>
                                    <button 
                                      onClick={() => {
                                        setMatrixItems(prev => prev.filter(m => m.id !== it.id));
                                        playKeyboardClack();
                                      }}
                                      className="text-rose-400 hover:text-rose-600 text-[8px] p-0.5 cursor-pointer"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Small Feature 16: Task Priority Score Calculator */}
                    <div className="bg-slate-50 dark:bg-[#161616] p-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-left space-y-1.5">
                      <span className="text-[10px] font-black uppercase text-slate-400 block">Task Priority Coefficient Score</span>
                      <div className="flex gap-3 justify-between items-center text-xs font-mono">
                        <span className="text-slate-500">Score (Urgency x Weight):</span>
                        <span className="font-extrabold text-[#f26419]">
                          {matrixItems.filter(m => !m.done && m.quadrant === 1).length * 10 + matrixItems.filter(m => !m.done && m.quadrant === 2).length * 5} pts
                        </span>
                      </div>
                    </div>

                    {/* Small Feature 15: Syllabus Progress Gauge */}
                    <div className="bg-slate-50 dark:bg-[#161616] p-3 rounded-2xl border border-slate-200 dark:border-slate-800 flex justify-between items-center text-left">
                      <div>
                        <span className="text-[10px] font-black uppercase text-slate-400 block">Syllabus Progress gauge</span>
                        <span className="text-[9px] text-slate-500">Continuous study plan health</span>
                      </div>
                      <span className="text-xs font-bold text-indigo-500 px-2 py-0.5 rounded-lg bg-indigo-500/10 border border-indigo-500/10">Stable</span>
                    </div>
                  </div>
                )}

                {/* Sub-tab: 📈 target */}
                {beastTab === "analytics" && (
                  <div className="space-y-4 text-left">
                    {/* Big Feature 6: GPA & Marks Target Calculator */}
                    <div className="bg-slate-50 dark:bg-[#161616] p-3 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                      <span className="text-[10px] font-black uppercase text-slate-400 block">
                        📈 Target Exam Grade Calculator
                      </span>

                      {/* List weights */}
                      <div className="space-y-1.5 max-h-[100px] overflow-y-auto no-scrollbar scrollbar-none">
                        {gpaClasses.map((it) => (
                          <div key={it.id} className="flex justify-between items-center text-[10.5px] bg-white dark:bg-[#0a0a0a] p-1.5 px-2 rounded-xl border border-slate-150 dark:border-slate-900">
                            <span className="font-bold text-slate-700 dark:text-slate-200 truncate">{it.name}</span>
                            <div className="flex gap-2 font-mono text-[9.5px]">
                              <span>Weight: {it.weight}%</span>
                              <span className="font-bold text-indigo-500">Score: {it.currentScore}%</span>
                            </div>
                            <button
                              onClick={() => {
                                setGpaClasses(prev => prev.filter(c => c.id !== it.id));
                                playKeyboardClack();
                              }}
                              className="text-rose-400 hover:text-rose-600 text-[9px] font-bold px-1 cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Add class score form */}
                      <div className="flex gap-1">
                        <input 
                          type="text"
                          value={newGpaName}
                          onChange={(e) => setNewGpaName(e.target.value)}
                          placeholder="Subject..."
                          className="flex-1 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 px-2 py-1 rounded-xl text-[10px] border border-slate-200 dark:border-slate-800 focus:outline-none"
                        />
                        <input 
                          type="number"
                          value={newGpaWeight}
                          onChange={(e) => setNewGpaWeight(parseInt(e.target.value) || 0)}
                          placeholder="W%"
                          className="w-10 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 px-1 py-1 rounded-xl text-[10px] border border-slate-200 dark:border-slate-800 focus:outline-none text-center font-mono"
                        />
                        <input 
                          type="number"
                          value={newGpaScore}
                          onChange={(e) => setNewGpaScore(parseInt(e.target.value) || 0)}
                          placeholder="Score"
                          className="w-12 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 px-1 py-1 rounded-xl text-[10px] border border-slate-200 dark:border-slate-800 focus:outline-none text-center font-mono"
                        />
                        <button
                          onClick={() => {
                            if (!newGpaName.trim()) return;
                            const newCl = { id: Date.now().toString(), name: newGpaName, weight: newGpaWeight, currentScore: newGpaScore };
                            setGpaClasses(prev => [...prev, newCl]);
                            setNewGpaName("");
                            triggerStatus("Academic weight pinned to GPA targeter!");
                            playKeyboardClack();
                          }}
                          className="bg-[#f26419] hover:bg-orange-600 text-white px-2 py-1 rounded-xl text-[10px] font-black cursor-pointer"
                        >
                          +
                        </button>
                      </div>

                      {/* Output Prediction */}
                      {(() => {
                        const totalWeight = gpaClasses.reduce((sum, c) => sum + c.weight, 0);
                        const weightedScore = gpaClasses.reduce((sum, c) => sum + (c.currentScore * c.weight / 100), 0);
                        const weightLeft = 100 - totalWeight;
                        const reqFinalScore = weightLeft > 0 ? Math.round(((gpaTarget - weightedScore) / weightLeft) * 100) : null;
                        return (
                          <div className="bg-white dark:bg-slate-950 p-2.5 rounded-xl border border-slate-150 dark:border-slate-900 text-left space-y-1.5">
                            <div className="flex justify-between items-center text-[10px] font-mono text-slate-500">
                              <span>Target Grade: {gpaTarget}%</span>
                              <input 
                                type="number"
                                value={gpaTarget}
                                onChange={(e) => setGpaTarget(parseInt(e.target.value) || 90)}
                                className="w-10 bg-slate-100 dark:bg-slate-900 text-center rounded border border-slate-200 focus:outline-none"
                              />
                            </div>
                            <div className="flex justify-between text-[10px]">
                              <span className="text-slate-500">Current Weighted score:</span>
                              <span className="font-bold text-slate-700 dark:text-slate-200">{weightedScore.toFixed(1)}% / {totalWeight}%</span>
                            </div>
                            {reqFinalScore !== null && weightLeft > 0 ? (
                              <p className="text-[10px] font-bold text-indigo-500 leading-normal">
                                💡 Required final grade in remaining {weightLeft}% weight syllabus exam: <span className="text-[#f26419] text-xs underline font-extrabold">{Math.max(0, reqFinalScore)}%</span>
                              </p>
                            ) : (
                              <p className="text-[9.5px] text-emerald-500 font-bold">🎯 Syllabus complete! Weighted score reached {weightedScore.toFixed(1)}%</p>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Big Feature 7: Page-Count & Session Study Cycles Estimator */}
                    <div className="bg-slate-50 dark:bg-[#161616] p-3 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                      <span className="text-[10px] font-black uppercase text-slate-400 block">
                        📚 Book & Syllabus Reading Estimator
                      </span>

                      <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
                        <div>
                          <label className="text-slate-400 block font-bold mb-1">Pages</label>
                          <input 
                            type="number"
                            value={pageCount}
                            onChange={(e) => setPageCount(parseInt(e.target.value) || 1)}
                            className="w-full bg-white dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-none text-center font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-slate-400 block font-bold mb-1">Mins/Pg</label>
                          <input 
                            type="number"
                            value={readSpeed}
                            onChange={(e) => setReadSpeed(parseInt(e.target.value) || 1)}
                            className="w-full bg-white dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-none text-center font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-slate-400 block font-bold mb-1">Eff%</label>
                          <input 
                            type="number"
                            value={focusEff}
                            onChange={(e) => setFocusEff(parseInt(e.target.value) || 1)}
                            className="w-full bg-white dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-none text-center font-mono"
                          />
                        </div>
                      </div>

                      {(() => {
                        const baseHours = (pageCount * readSpeed) / 60;
                        const realHours = baseHours / (focusEff / 100);
                        const cycles = Math.ceil((realHours * 60) / 25);
                        return (
                          <div className="bg-white dark:bg-slate-950 p-2 rounded-xl border border-slate-150 dark:border-slate-900 text-left font-mono text-[9px] text-slate-500 space-y-1">
                            <div>Estimated Active Focus time: <span className="font-bold text-slate-700 dark:text-slate-200">{realHours.toFixed(1)} hrs</span></div>
                            <div>Required 25m Pomodoro Study Cycles: <span className="font-bold text-[#f26419]">{cycles} sessions</span></div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Small Feature 2: Water Intake Tracker */}
                    <div className="bg-slate-50 dark:bg-[#161616] p-3 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div className="text-left">
                        <span className="text-[10px] font-black uppercase text-slate-400 block">Daily Water Hydration Tracker</span>
                        <div className="flex gap-1.5 items-center mt-1">
                          {Array.from({ length: 8 }).map((_, idx) => (
                            <span 
                              key={idx} 
                              className={`w-2.5 h-4 rounded transition-all ${idx < waterCups ? "bg-[#3b82f6] scale-105 shadow-sm shadow-[#3b82f6]/20" : "bg-slate-200 dark:bg-slate-800"}`}
                              title={`${waterCups} cups logged`}
                            />
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setWaterCups(prev => Math.min(8, prev + 1));
                          triggerStatus("💧 Water logged! Hydration score upgraded.");
                          playKeyboardClack();
                        }}
                        className="bg-sky-400 hover:bg-sky-500 text-white px-2.5 py-1 rounded-xl text-[10px] font-black cursor-pointer shadow-md shadow-sky-500/10"
                      >
                        + Log Cup
                      </button>
                    </div>

                    {/* Small Feature 3: Live Exam Countdown Clock */}
                    <div className="bg-slate-50 dark:bg-[#161616] p-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-left space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase text-slate-400 block">Dynamic Exam countdown</span>
                        <input 
                          type="datetime-local"
                          value={examDate}
                          onChange={(e) => setExamDate(e.target.value)}
                          className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded text-[8.5px] border border-slate-200 p-0.5"
                        />
                      </div>
                      <p className="text-[11px] font-black font-mono text-[#f26419] leading-none animate-pulse">{countdownText || "Calculating countdown..."}</p>
                    </div>

                    {/* Small Feature 9: Mindset focus energy logs */}
                    <div className="bg-slate-50 dark:bg-[#161616] p-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-left space-y-1.5">
                      <div className="flex justify-between text-[10px]">
                        <span className="font-black uppercase text-slate-400">Mental Energy state Slider</span>
                        <span className="font-mono text-indigo-500 font-extrabold">{focusEnergy}%</span>
                      </div>
                      <input 
                        type="range"
                        min="10"
                        max="100"
                        value={focusEnergy}
                        onChange={(e) => setFocusEnergy(parseInt(e.target.value))}
                        className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded appearance-none cursor-pointer"
                        style={{ accentColor: "#6366f1" }}
                      />
                      <p className="text-[9px] text-slate-400 leading-relaxed font-medium">
                        {focusEnergy < 40 
                          ? "⚠️ Mental exhaust detected. Recommended: launch a 5m Box breathing break session now." 
                          : "🚀 Peak alertness zone! Perfect time to start your hardest chapter study log."}
                      </p>
                    </div>

                    {/* Small Feature 12: Study Materials Expense tracker */}
                    <div className="bg-slate-50 dark:bg-[#161616] p-3 rounded-2xl border border-[#f26419]/25 text-left space-y-2">
                      <span className="text-[10px] font-black uppercase text-[#f26419] block">Student Budget Material tracker</span>
                      <div className="space-y-1 text-[9.5px] font-mono text-slate-500 max-h-[80px] overflow-y-auto no-scrollbar scrollbar-none">
                        {expenses.map((ex) => (
                          <div key={ex.id} className="flex justify-between items-center">
                            <span className="truncate flex-1">{ex.item}</span>
                            <span>₹{ex.cost}</span>
                            <button onClick={() => {
                              setExpenses(prev => prev.filter(e => e.id !== ex.id));
                              playKeyboardClack();
                            }} className="text-rose-400 px-1 ml-1 cursor-pointer">✕</button>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-1">
                        <input 
                          type="text"
                          value={expenseItem}
                          onChange={(e) => setExpenseItem(e.target.value)}
                          placeholder="Log purchase..."
                          className="flex-1 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 px-2 py-1 rounded-lg text-[9.5px] border border-slate-200 dark:border-slate-800 focus:outline-none"
                        />
                        <input 
                          type="number"
                          value={expenseCost}
                          onChange={(e) => setExpenseCost(parseInt(e.target.value) || 0)}
                          placeholder="Cost"
                          className="w-12 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 px-1 py-1 rounded-lg text-[9.5px] border border-slate-200 dark:border-slate-800 focus:outline-none"
                        />
                        <button
                          onClick={() => {
                            if (!expenseItem.trim()) return;
                            const newEx = { id: Date.now().toString(), item: expenseItem, cost: expenseCost };
                            setExpenses(prev => [...prev, newEx]);
                            setExpenseItem("");
                            setExpenseCost(0);
                            triggerStatus("Expense cataloged!");
                            playKeyboardClack();
                          }}
                          className="bg-[#f26419] hover:bg-orange-600 text-white px-2 rounded-lg text-[9px] font-black cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sub-tab: ⚡ quick */}
                {beastTab === "quick" && (
                  <div className="space-y-4 text-left font-sans">
                    {/* Big Feature 9: Study Coin Rewards Store & Pinning Board */}
                    <div className="bg-slate-50 dark:bg-[#161616] p-3 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[10px] font-black uppercase text-slate-400 block">✨ Sticker Shop & Pin Board</span>
                        <span className="text-[10px] bg-amber-500/10 text-amber-500 font-bold px-2 py-0.5 rounded font-mono">
                          🪙 {studyCoins} Coins
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {stickerStore.map((st) => {
                          const isOwned = ownedStickers.includes(st.name);
                          const isPinned = pinnedStickers.includes(st.name);
                          return (
                            <div key={st.name} className="bg-white dark:bg-slate-950 p-2 rounded-xl border border-slate-150 dark:border-slate-900 flex flex-col justify-between items-center text-center">
                              <span className="text-xs mb-1 font-bold">{st.name}</span>
                              {isOwned ? (
                                <button
                                  onClick={() => {
                                    if (isPinned) {
                                      setPinnedStickers(prev => prev.filter(p => p !== st.name));
                                      triggerStatus("Sticker unpinned from study board.");
                                    } else {
                                      setPinnedStickers(prev => [...prev, st.name]);
                                      triggerStatus("Sticker pinned to active study board!");
                                    }
                                    playKeyboardClack();
                                  }}
                                  className={`text-[8.5px] font-black px-1.5 py-0.5 rounded-lg transition-all w-full cursor-pointer ${
                                    isPinned ? "bg-indigo-600 text-white" : "bg-slate-100 dark:bg-slate-900 text-slate-500 hover:bg-slate-200"
                                  }`}
                                >
                                  {isPinned ? "📌 Pinned" : "📌 Pin"}
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    if (studyCoins < st.price) {
                                      triggerStatus("❌ Insufficient Focus Coins! Keep studying.");
                                      return;
                                    }
                                    setStudyCoins(prev => prev - st.price);
                                    setOwnedStickers(prev => [...prev, st.name]);
                                    triggerStatus(`🎉 Unlocked premium sticker: ${st.name}!`);
                                    playKeyboardClack();
                                  }}
                                  className="text-[8.5px] font-black bg-[#f26419]/10 text-[#f26419] px-1.5 py-0.5 rounded-lg border border-[#f26419]/25 hover:bg-[#f26419] hover:text-white transition-all w-full cursor-pointer"
                                >
                                  Buy: {st.price}🪙
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* virtual board display */}
                      {pinnedStickers.length > 0 && (
                        <div className="bg-white dark:bg-slate-950 p-2 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
                          <span className="text-[7.5px] uppercase font-black text-slate-400 block mb-1">Active Study Board stickers</span>
                          <div className="flex gap-2 justify-center flex-wrap">
                            {pinnedStickers.map((st) => (
                              <span key={st} className="text-lg animate-bounce" title={st}>
                                {st.split(" ")[0]}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Big Feature 10: Study Logs Hub & CSV Exporter */}
                    <div className="bg-slate-50 dark:bg-[#161616] p-3 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 font-sans">
                      <span className="text-[10px] font-black uppercase text-slate-400 block">Focus Log Data hub</span>
                      <button
                        onClick={() => {
                          const csvContent = "data:text/csv;charset=utf-8,ID,Subject,Topic,Status\n" + 
                            syllabusItems.map(item => `"${item.id}","${item.subject}","${item.topic}","${item.done ? 'Finished' : 'Pending'}"`).join("\n");
                          const encodedUri = encodeURI(csvContent);
                          const link = document.createElement("a");
                          link.setAttribute("href", encodedUri);
                          link.setAttribute("download", "flash5tudy-syllabus-and-logs.csv");
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          triggerStatus("📊 Study spreadsheet CSV downloaded!");
                          playKeyboardClack();
                        }}
                        className="w-full bg-[#f26419] hover:opacity-95 text-white py-1.5 rounded-xl text-[10px] font-black cursor-pointer text-center block"
                      >
                        Download Syllabus CSV
                      </button>
                    </div>

                    {/* Small Feature 1: Study Streak multiplier */}
                    <div className="bg-slate-50 dark:bg-[#161616] p-3 rounded-2xl border border-slate-200 dark:border-slate-800 flex justify-between items-center text-left">
                      <div>
                        <span className="text-[10px] font-black uppercase text-slate-400 block">Streak multiplier coefficient</span>
                        <span className="text-[9px] text-slate-500">Boost focus cycle gains</span>
                      </div>
                      <span className="text-xs font-black text-emerald-500 bg-emerald-500/10 border border-emerald-500/10 px-2 py-0.5 rounded-lg">1.5x Boost</span>
                    </div>

                    {/* Small Feature 5: Digital Eye Strain 20-20-20 alert timer */}
                    <div className="bg-slate-50 dark:bg-[#161616] p-3 rounded-2xl border border-slate-200 dark:border-slate-800 flex justify-between items-center text-left">
                      <div>
                        <span className="text-[10px] font-black uppercase text-slate-400 block">Eye-Strain 20-20-20 rules</span>
                        <span className="text-[9px] text-slate-500">Rest eye tissues periodically</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-indigo-500">
                        {Math.floor(eyeStrainSeconds / 60)}m {eyeStrainSeconds % 60}s
                      </span>
                    </div>

                    {/* Small Feature 6: Page to Focus Cycle converter */}
                    <div className="bg-slate-50 dark:bg-[#161616] p-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-left space-y-1">
                      <span className="text-[10px] font-black uppercase text-slate-400 block">Focus Cycle converter</span>
                      <div className="flex gap-2 text-[10px] items-center">
                        <span className="text-slate-500">100 Pages ≈</span>
                        <span className="font-extrabold text-indigo-500">12 Pomodoro Blocks</span>
                      </div>
                    </div>

                    {/* Small Feature 7: Motivational Quotes shuffling */}
                    <div className="bg-slate-50 dark:bg-[#161616] p-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-left space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black uppercase text-slate-400">Zen quotes Deck</span>
                        <button 
                          onClick={() => {
                            const quotes = [
                              "Focus on the process, not the outcome. 📖",
                              "One focus cycle at a time can build mountains. ⛰️",
                              "Quiet the mind, and the soul will speak. 🧘",
                              "Deep work is the superpower of the 21st century. ⚡",
                              "Consistency outperforms raw talent daily. 👑"
                            ];
                            const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
                            triggerStatus(`💡 Inspired: "${randomQuote}"`);
                            playKeyboardClack();
                          }}
                          className="text-[8px] font-bold text-indigo-500 hover:underline cursor-pointer"
                        >
                          Shuffle
                        </button>
                      </div>
                      <p className="text-[9.5px] italic text-slate-600 dark:text-slate-350">"Consistency outperforms raw talent daily. 👑"</p>
                    </div>

                    {/* Small Feature 8: Brain Math Speed workout sprint */}
                    <div className="bg-slate-50 dark:bg-[#161616] p-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-left space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase text-slate-400">10s Mental Arithmetic workout</span>
                        {mathActive ? (
                          <span className="text-[10px] text-rose-500 font-mono font-bold animate-pulse">{mathTimeLeft}s</span>
                        ) : (
                          <button
                            onClick={() => {
                              setMathActive(true);
                              setMathTimeLeft(10);
                              setMathScore(0);
                              generateNewMath();
                              triggerStatus("🎮 10-Second Brain math sprint started!");
                              playKeyboardClack();
                            }}
                            className="text-[9px] font-black text-indigo-500 hover:underline cursor-pointer"
                          >
                            Play workout
                          </button>
                        )}
                      </div>

                      {mathActive && (
                        <div className="flex gap-2 items-center bg-white dark:bg-slate-950 p-1.5 rounded-xl border border-slate-200 dark:border-slate-850">
                          <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-200">{mathNum1} × {mathNum2} =</span>
                          <input 
                            type="number"
                            value={mathAnswer}
                            onChange={(e) => {
                              const val = e.target.value;
                              setMathAnswer(val);
                              if (parseInt(val) === mathNum1 * mathNum2) {
                                setMathScore(prev => prev + 1);
                                setStudyCoins(prev => prev + 2); // Earn study coins!
                                generateNewMath();
                                triggerStatus("⚡ Correct! Earned 2 Study Coins!");
                                playKeyboardClack();
                              }
                            }}
                            className="w-14 bg-slate-100 dark:bg-slate-900 text-center font-mono rounded font-bold text-xs p-0.5 focus:outline-none"
                            placeholder="?"
                          />
                        </div>
                      )}
                      <p className="text-[8.5px] text-slate-400">Stimulates left-hemisphere logic before focused text sessions.</p>
                    </div>

                    {/* Small Feature 10: Break activity rolls */}
                    <div className="bg-slate-50 dark:bg-[#161616] p-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-left space-y-1">
                      <span className="text-[10px] font-black uppercase text-slate-400 block">Random Break activity rolls</span>
                      <p className="text-[9.5px] font-medium text-indigo-500">"Drink 100ml water & roll wrists."</p>
                    </div>

                    {/* Small Feature 19: Focus level badges card */}
                    <div className="bg-slate-50 dark:bg-[#161616] p-3 rounded-2xl border border-slate-200 dark:border-slate-800 flex justify-between items-center text-left">
                      <div>
                        <span className="text-[10px] font-black uppercase text-slate-400 block">Focus Rank badge card</span>
                        <span className="text-[9px] text-slate-500">Unlocks custom profile aesthetics</span>
                      </div>
                      <span className="text-[9.5px] font-black uppercase text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/25">Scholar</span>
                    </div>

                    {/* Small Feature 20: Storage JSON Configuration Backup */}
                    <div className="bg-slate-50 dark:bg-[#161616] p-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-left space-y-1.5">
                      <span className="text-[10px] font-black uppercase text-slate-400 block">Database Backup & Storage Config</span>
                      <button
                        onClick={() => {
                          const backup = {
                            flashcards,
                            syllabusItems,
                            matrixItems,
                            gpaClasses,
                            ownedStickers,
                            pinnedStickers,
                            waterCups,
                            expenses,
                            scratchpadText,
                            studyCoins
                          };
                          const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement("a");
                          link.href = url;
                          link.download = `flash5tudy-beast-utilities-backup.json`;
                          link.click();
                          triggerStatus("💾 Flash5tudy configuration JSON backup created!");
                        }}
                        className="w-full bg-slate-200 hover:bg-slate-300 dark:bg-[#202020] dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350 text-[9.5px] py-1.5 rounded-lg font-black cursor-pointer transition-all text-center block"
                      >
                        Backup Configuration JSON
                      </button>
                    </div>
                  </div>
                )}
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
                    <label className="block text-[10px] uppercase font-bold text-slate-450 tracking-wider">Focus Persona Target</label>
                    <select
                      value={editFormPersona}
                      onChange={(e) => setEditFormPersona(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-[#f26419] font-sans"
                    >
                      <option value="Quiet Monk">🧘‍♂️ The Quiet Monk (Target: 180 min)</option>
                      <option value="Pomodoro Sprint Master">⚡ Pomodoro Sprint Master (Target: 120 min)</option>
                      <option value="Balanced Scholar">📖 Balanced Scholar (Target: 60 min)</option>
                      <option value="Casual Explorer">🌱 Casual Explorer (Target: 30 min)</option>
                    </select>
                    <p className="text-[9px] text-slate-450 mt-1">Prefers specific intervals based on your custom persona setting.</p>
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
                        localStorage.setItem("f5_student_persona", editFormPersona);
                        triggerStatus(`Profile saved! Activated persona: ${editFormPersona}`);
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

                    {/* Sleep Timer */}
                    <div className="bg-slate-100 dark:bg-slate-900/50 px-2.5 py-2 rounded-xl text-xs space-y-1 text-left">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-500 font-mono uppercase font-black">Music Sleep Timer</span>
                        {sleepTimerMinutes !== null && (
                          <span className="text-[10px] text-amber-500 font-mono font-bold animate-pulse">
                            {Math.floor(sleepTimerSecondsLeft / 60)}m {sleepTimerSecondsLeft % 60}s left
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1.5 pt-1">
                        {[null, 15, 30, 45, 60].map((mins) => {
                          const isActive = sleepTimerMinutes === mins;
                          return (
                            <button
                              key={mins || 'off'}
                              onClick={() => {
                                setSleepTimerMinutes(mins);
                                if (mins !== null) {
                                  setSleepTimerSecondsLeft(mins * 60);
                                  triggerStatus(`Sleep timer scheduled for ${mins} minutes`);
                                } else {
                                  triggerStatus("Sleep timer deactivated");
                                }
                              }}
                              className={`flex-1 text-[9px] py-1 rounded-md cursor-pointer transition-all font-semibold ${
                                isActive
                                  ? "bg-[#f26419] text-white"
                                  : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700"
                              }`}
                            >
                              {mins ? `${mins}m` : 'Off'}
                            </button>
                          );
                        })}
                      </div>
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
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Match the visual interface to fit your current study vibe:
                </p>

                {/* Dynamic Trial & Unlock Status Info Cards */}
                {isPermanentlyUnlocked ? (
                  <div className="p-3 bg-indigo-500/10 border border-indigo-500/15 rounded-2xl flex items-center gap-2.5">
                    <Crown className="w-4 h-4 text-indigo-400 shrink-0" />
                    <div className="text-left">
                      <h4 className="text-[10px] font-bold text-indigo-300 leading-none">Permanent Theme Unlock Active 👑</h4>
                      <p className="text-[9px] text-indigo-400/80 mt-1">This account has permanent access to all premium visual workspaces.</p>
                    </div>
                  </div>
                ) : isTrialActive ? (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/15 rounded-2xl flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse" />
                      <div className="text-left min-w-0">
                        <h4 className="text-[10px] font-bold text-emerald-300 leading-none">7-Day Free Theme Trial Active 🔓</h4>
                        <p className="text-[9px] text-emerald-400/80 mt-1 truncate">Enjoy access to any workspace style during your initial trial period.</p>
                      </div>
                    </div>
                    <span className="text-[8.5px] font-mono bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-lg font-black shrink-0">
                      {trialDaysRemaining} DAYS LEFT
                    </span>
                  </div>
                ) : (
                  <div className="p-3.5 bg-amber-500/15 border border-amber-500/25 rounded-2xl space-y-2.5">
                    <div className="flex items-center gap-2.5">
                      <Lock className="w-4 h-4 text-amber-500 shrink-0" />
                      <div className="text-left">
                        <h4 className="text-[10px] font-bold text-amber-400 leading-none">Premium Themes Locked 🔒</h4>
                        <p className="text-[9px] text-amber-500/80 mt-1">Free trial period finished. Increase your study level to unlock them forever!</p>
                      </div>
                    </div>
                    {onResetTrial && (
                      <button
                        onClick={onResetTrial}
                        className="w-full text-center py-2 px-3 bg-amber-500 hover:bg-amber-600 active:scale-98 text-white rounded-xl text-[10px] font-mono font-black transition-all cursor-pointer shadow-xs"
                      >
                        ⚡ ACTIVATE FREE 7-DAY THEME TRIAL
                      </button>
                    )}
                  </div>
                )}
                
                <div className="grid grid-cols-1 gap-2.5 pt-2">
                  {(() => {
                    const currentPresetId = localStorage.getItem("f5_theme_preset") || "dark-classic";
                    const userLevel = calculateStudentLevel(userXp || 0).level;
 
                    return [
                      { id: "dark-classic", name: "Classic Steel & Amber", bg: "bg-gradient-to-tr from-[#f26419] to-[#ff9f43]", desc: "The signature steel & orange colorway", reqLevel: 1, textHex: "#f26419" },
                      { id: "forest", name: "Matcha Forest & Mint", bg: "bg-gradient-to-tr from-[#10b981] to-[#6ee7b7]", desc: "Cozy forest green vibes & matcha styling", reqLevel: 3, textHex: "#10b981" },
                      { id: "crimson", name: "Sunset Crimson & Cherry", bg: "bg-gradient-to-tr from-[#e11d48] to-[#fda4af]", desc: "Deep crimson and red cherry study warmth", reqLevel: 6, textHex: "#e11d48" },
                      { id: "honey", name: "Amber Honey & Vanilla", bg: "bg-gradient-to-tr from-[#d97706] to-[#fcd34d]", desc: "Golden hour coziness & warm ambient rays", reqLevel: 10, textHex: "#d97706" },
                      { id: "amoled", name: "Modern High Contrast / OLED", bg: "bg-gradient-to-tr from-slate-400 via-zinc-650 to-black", desc: "Super clean high contrast and OLED absolute blacks", reqLevel: 15, textHex: "#6366f1" },
                      { id: "cosmic", name: "Cosmic Nebula & Obsidian", bg: "bg-gradient-to-tr from-[#8b5cf6] via-[#d946ef] to-[#6366f1]", desc: "Starry purple nebula nights & high level aura", reqLevel: 20, textHex: "#8b5cf6" },
                      { id: "cyberpunk", name: "Tokyo Cyberpunk Neon & Grid", bg: "bg-gradient-to-tr from-[#ec4899] via-[#8b5cf6] to-[#06b6d4]", desc: "Vivid Tokyolights & magenta laser grids", reqLevel: 25, textHex: "#ec4899" },
                      { id: "nordic", name: "Nordic Frost & Aurora Blue", bg: "bg-gradient-to-tr from-[#0284c7] via-[#22d3ee] to-[#34d399]", desc: "Frosted polar blue aura and subzero minimalism", reqLevel: 30, textHex: "#0284c7" }
                    ].map((preset) => {
                      const isLocked = !isPermanentlyUnlocked && !isTrialActive && userLevel < preset.reqLevel;
                      const isActive = currentPresetId === preset.id;

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
                          className={`group flex items-center justify-between p-3.5 rounded-2xl border transition-all text-left w-full relative overflow-hidden backdrop-blur-md ${
                            isLocked 
                              ? "opacity-50 bg-slate-100/50 dark:bg-black/15 border-dashed border-slate-350 dark:border-zinc-800 cursor-not-allowed" 
                              : isActive
                                ? "bg-white/80 dark:bg-[#151522]/65 shadow-md scale-[1.01]"
                                : "bg-white/30 hover:bg-white/60 dark:bg-black/25 dark:hover:bg-[#12121e]/45 border-white/40 dark:border-white/5 cursor-pointer hover:scale-[1.01]"
                          }`}
                          style={
                            !isLocked && isActive 
                              ? { borderColor: preset.textHex, boxShadow: `0 8px 24px -6px ${preset.textHex}55` } 
                              : {}
                          }
                        >
                          {/* Animated Theme Aura particle */}
                          {!isLocked && (
                            <div 
                              className={`absolute -right-6 -bottom-6 w-16 h-16 rounded-full filter blur-[20px] transition-all duration-700 opacity-[0.22] group-hover:opacity-[0.40] group-hover:scale-125 pointer-events-none`}
                              style={{ backgroundColor: preset.textHex }}
                            />
                          )}

                          <div className="flex items-center gap-3 relative z-10">
                            <span 
                              className={`w-6 h-6 rounded-xl border border-white/30 shadow-xs shrink-0 transition-transform duration-500 group-hover:scale-110 ${preset.bg}`} 
                              style={isActive ? { boxShadow: `0 0 12px ${preset.textHex}99` } : {}}
                            />
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`text-xs font-black block leading-none ${isLocked ? "text-slate-450 dark:text-zinc-500" : "text-slate-800 dark:text-slate-100"}`}>
                                  {preset.name}
                                </span>
                                {isLocked && (
                                  <span className="text-[8.2px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded font-mono font-black shrink-0">Lvl {preset.reqLevel} Required</span>
                                )}
                              </div>
                              <span className="text-[9.2px] text-slate-450 dark:text-slate-500 font-mono mt-1 block leading-none">{preset.desc}</span>
                            </div>
                          </div>
                          
                          <div className="relative z-10 shrink-0">
                            {isLocked ? (
                              <span className="text-[8.5px] text-zinc-550 dark:text-zinc-550 font-black uppercase tracking-wider flex items-center gap-1">
                                <Lock className="w-2.5 h-2.5" /> Locked
                              </span>
                            ) : isActive ? (
                              <span 
                                className="text-[8.5px] font-black uppercase tracking-widest px-2.5 py-1 rounded-xl shadow-sm transition-all duration-300"
                                style={{ color: '#fff', backgroundColor: preset.textHex, boxShadow: `0 4px 10px ${preset.textHex}66` }}
                              >
                                Active
                              </span>
                            ) : (
                              <span 
                                className="text-[9.5px] font-black uppercase tracking-wider text-slate-400 group-hover:opacity-100 opacity-0 transition-opacity duration-350"
                                style={{ color: preset.textHex }}
                              >
                                Apply
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>
            )}

            {/* Sub-view: Pomodoro Intervals */}
            {activeSubView === "pomodoro" && (
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">Pomodoro Intervals</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-sans leading-relaxed">Customize ticking structures to trigger smart study intervals:</p>
                
                {/* Preset switcher tabs */}
                <div className="flex gap-1.5 bg-slate-100 dark:bg-slate-900/50 p-1 rounded-xl">
                  {[
                    { id: "classic", label: "Classic 25/5" },
                    { id: "ultradian", label: "Ultradian 50/10" },
                    { id: "deep", label: "Deep Work 90/15" }
                  ].map((preset) => {
                    const isActive = pomoPreset === preset.id;
                    return (
                      <button
                        key={preset.id}
                        onClick={() => {
                          setPomoPreset(preset.id);
                          triggerStatus(`Switched to ${preset.label} Pomodoro mode`);
                        }}
                        className={`flex-1 text-[10px] font-black py-1.5 rounded-lg transition-all cursor-pointer ${
                          isActive
                            ? "bg-[#f26419] text-white shadow-xs"
                            : "text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-3.5 pt-2 bg-slate-50 dark:bg-[#161616] p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Focus Period</span>
                    <span className="font-bold font-mono text-[#f26419] dark:text-[#f26419]">
                      {pomoPreset === "classic" ? "25 minutes" : pomoPreset === "ultradian" ? "50 minutes" : "90 minutes"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Short Break</span>
                    <span className="font-bold font-mono text-slate-800 dark:text-slate-100">
                      {pomoPreset === "classic" ? "5 minutes" : pomoPreset === "ultradian" ? "10 minutes" : "15 minutes"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Long Break</span>
                    <span className="font-bold font-mono text-slate-800 dark:text-slate-100">
                      {pomoPreset === "classic" ? "15 minutes" : pomoPreset === "ultradian" ? "20 minutes" : "30 minutes"}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800/50 flex flex-col gap-2">
                    <button 
                      onClick={playTestAlarm}
                      className="w-full bg-slate-200 hover:bg-slate-300 dark:bg-slate-850 dark:hover:bg-slate-800 py-1.5 rounded-xl text-[10px] font-black text-slate-700 dark:text-slate-200 cursor-pointer transition-all flex items-center justify-center gap-1.5"
                    >
                      <span>🔊 Test Alarm Alarm Chime</span>
                    </button>

                    <button 
                      onClick={() => {
                        const focusMins = pomoPreset === "classic" ? 25 : pomoPreset === "ultradian" ? 50 : 90;
                        triggerStatus(`🚀 Active Pomodoro configured to ${focusMins}m focus structure!`);
                      }}
                      className="w-full bg-[#f26419] hover:opacity-95 py-2 rounded-xl text-xs font-black text-white cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-98"
                    >
                      Launch Pomodoro Interval
                    </button>
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
