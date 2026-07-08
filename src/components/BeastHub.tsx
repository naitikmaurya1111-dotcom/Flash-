import React, { useState, useRef, useEffect, useMemo } from "react";
import { 
  PenTool, Volume2, Sparkles, Layers, BarChart2, BookOpen, Clock, 
  Plus, Trash2, CheckCircle, Flame, Dumbbell, Zap, DollarSign, 
  RotateCcw, Calendar, VolumeX, Eye, HelpCircle, Save, Award, ChevronRight, Play, Pause, Square,
  Maximize2, Minimize2, Wind, RefreshCw, ShoppingBag, Trophy, Coffee, Check, HelpCircle as HelpIcon, ArrowUpRight,
  Undo2, Redo2, Type, Circle as CircleIcon, ArrowRight, Download, Palette, Eraser, Highlighter, Hand
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface BeastHubProps {
  themePreset: string;
  userXp: number;
  onAddXp: (reason: string, amount: number) => void;
}

function BeastHub({ themePreset, userXp, onAddXp }: BeastHubProps) {
  const [activeBeastTab, setActiveBeastTab] = useState<"acoustics" | "planners" | "analytics" | "quick">("acoustics");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const [focusAura, setFocusAura] = useState<"hyper" | "zen" | "scholar">(() => {
    return (localStorage.getItem("f5_apex_focus_aura") as "hyper" | "zen" | "scholar") || "hyper";
  });

  const triggerStatus = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const changeFocusAura = (aura: "hyper" | "zen" | "scholar") => {
    setFocusAura(aura);
    localStorage.setItem("f5_apex_focus_aura", aura);
    playKeyboardClack();
    if (aura === "hyper") {
      setNoiseType("brown");
      setBinauralActive(true);
      setBinBeat(14); // Beta wave for high focus
      triggerStatus("Apex Grind Mode Engaged: High-Intensity focus active.");
    } else if (aura === "zen") {
      setNoiseType("pink");
      setBinauralActive(true);
      setBinBeat(8); // Theta wave for flow/calm
      triggerStatus("Zen Mind Mode Engaged: Flow state active.");
    } else {
      setNoiseType("white");
      setBinauralActive(true);
      setBinBeat(10); // Alpha wave for cognitive planning
      triggerStatus("Scholastic Intellect Engaged: Strategic study active.");
    }
  };

  // ==========================================
  // --- ACOUSTICS & LIVE SYNTH ENGINE ---
  // ==========================================
  const audioCtxRef = useRef<AudioContext | null>(null);
  const binLeftOscRef = useRef<OscillatorNode | null>(null);
  const binRightOscRef = useRef<OscillatorNode | null>(null);
  const binGainRef = useRef<GainNode | null>(null);
  const noiseSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const noiseGainRef = useRef<GainNode | null>(null);
  
  const [noiseType, setNoiseType] = useState<"none" | "white" | "pink" | "brown">("none");
  const [binauralActive, setBinauralActive] = useState(false);
  const [binCarrier, setBinCarrier] = useState(200); // base pitch
  const [binBeat, setBinBeat] = useState(10); // Alpha wave
  const [ambientVolume, setAmbientVolume] = useState({ binaural: 0.2, keyboard: 0.3 });
  const [filterActive, setFilterActive] = useState(true);
  const [keyboardPreset, setKeyboardPreset] = useState<"blue" | "brown" | "linear" | "buckling">("brown");
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | null>(null);
  const [sleepTimerSecondsLeft, setSleepTimerSecondsLeft] = useState<number>(0);

  // Live wave visualization
  const visCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // ==========================================
  // --- 3. PLATINUM STUDY PLANNER STATES ---
  // ==========================================
  const [syllabusItems, setSyllabusItems] = useState<any[]>(() => {
    const saved = localStorage.getItem("f5_beast_syllabus");
    return saved ? JSON.parse(saved) : [
      { id: "s1", subject: "Mathematics", topic: "Integration by Parts", done: false, difficulty: "hard" },
      { id: "s2", subject: "Physics", topic: "Angular Momentum Theory", done: false, difficulty: "medium" },
      { id: "s3", subject: "Chemistry", topic: "Organic Synthesis Paths", done: true, difficulty: "easy" }
    ];
  });
  const [newSySub, setNewSySub] = useState("Mathematics");
  const [newSyTopic, setNewSyTopic] = useState("");
  const [newSyDifficulty, setNewSyDifficulty] = useState<"easy" | "medium" | "hard">("medium");

  const [matrixItems, setMatrixItems] = useState<any[]>(() => {
    const saved = localStorage.getItem("f5_beast_matrix");
    return saved ? JSON.parse(saved) : [
      { id: "m1", text: "Submit Calculus mock paper", quadrant: 1, done: false },
      { id: "m2", text: "Research University applications", quadrant: 2, done: false },
      { id: "m3", text: "Answer student study mail", quadrant: 3, done: true }
    ];
  });
  const [newMatrixText, setNewMatrixText] = useState("");
  const [newMatrixQuad, setNewMatrixQuad] = useState<number>(1);

  // ==========================================
  // --- 4. 3D SPACED REPETITION FLASHCARDS ---
  // ==========================================
  const [flashcards, setFlashcards] = useState<any[]>(() => {
    const saved = localStorage.getItem("f5_beast_flashcards");
    return saved ? JSON.parse(saved) : [
      { id: "f1", question: "What is Euler's Polyhedron Formula?", answer: "V - E + F = 2 (Vertices, Edges, Faces)", box: 1 },
      { id: "f2", question: "State Planck's Quantum Theory equation", answer: "E = hν (Energy equals Planck's constant times frequency)", box: 2 },
      { id: "f3", question: "What is the Krebs Cycle main output?", answer: "ATP, NADH, FADH2, and CO2 via cellular respiration", box: 4 }
    ];
  });
  const [newFcQ, setNewFcQ] = useState("");
  const [newFcA, setNewFcA] = useState("");
  const [currentFcIdx, setCurrentFcIdx] = useState(0);
  const [fcFlipped, setFcFlipped] = useState(false);
  const [bulkFcText, setBulkFcText] = useState("");
  const [showBulkModal, setShowBulkModal] = useState(false);

  // ==========================================
  // --- 5. INTERACTIVE GPA & READING CALCULATOR ---
  // ==========================================
  const [gpaClasses, setGpaClasses] = useState<any[]>(() => {
    const saved = localStorage.getItem("f5_beast_gpaclasses");
    return saved ? JSON.parse(saved) : [
      { id: "g1", name: "Theoretical Physics", weight: 40, currentScore: 88 },
      { id: "g2", name: "Mathematical Methods", weight: 30, currentScore: 92 },
      { id: "g3", name: "Experimental Labs", weight: 30, currentScore: 84 }
    ];
  });
  const [newGpaName, setNewGpaName] = useState("");
  const [newGpaWeight, setNewGpaWeight] = useState(30);
  const [newGpaScore, setNewGpaScore] = useState(85);
  const [gpaTarget, setGpaTarget] = useState(90);

  const [pageCount, setPageCount] = useState(45);
  const [readSpeed, setReadSpeed] = useState(3); // min/page
  const [focusEff, setFocusEff] = useState(85);
  const [difficultyRating, setDifficultyRating] = useState<"easy" | "medium" | "hard">("medium");
  const [activeRecallCycles, setActiveRecallCycles] = useState(false);

  // ==========================================
  // --- 6. ULTIMATE GAMIFIED MICRO-UTILITIES ---
  // ==========================================
  const [breathingActive, setBreathingActive] = useState(false);
  const [breathPattern, setBreathPattern] = useState<"box" | "pranayama" | "calm">("box");
  const [breathState, setBreathState] = useState<"Inhale" | "Hold" | "Exhale" | "Rest">("Inhale");
  const [breathSeconds, setBreathSeconds] = useState(4);
  const [enableVoiceGuide, setEnableVoiceGuide] = useState(false);

  const stretchCards = [
    "Interlace fingers overhead and stretch upward for 15 seconds.",
    "Look away 20 feet for 20 seconds and blink rapidly 10 times.",
    "Slowly roll your neck clockwise 5 times, then flip.",
    "Do 5 deep shoulder shrugs backward to release tension.",
    "Stand up, place hands on your lower back, and gently bend backward."
  ];
  const [currentStretch, setCurrentStretch] = useState(stretchCards[0]);

  const [studyCoins, setStudyCoins] = useState(() => {
    return parseInt(localStorage.getItem("f5_beast_coins") || "150", 10);
  });
  const [waterCups, setWaterCups] = useState(() => {
    return parseInt(localStorage.getItem("f5_beast_water") || "4", 10);
  });
  const [ownedStickers, setOwnedStickers] = useState<string[]>(() => {
    return JSON.parse(localStorage.getItem("f5_beast_stickers") || '["🔥 Cozy Flame"]');
  });
  const [pinnedStickers, setPinnedStickers] = useState<any[]>(() => {
    return JSON.parse(localStorage.getItem("f5_beast_pinned_stickers") || "[]");
  });

  // --- Real-time Coins and Water Synchronization across components ---
  useEffect(() => {
    localStorage.setItem("f5_beast_coins", studyCoins.toString());
    window.dispatchEvent(new CustomEvent("f5_coins_updated", { detail: studyCoins }));
  }, [studyCoins]);

  useEffect(() => {
    localStorage.setItem("f5_beast_water", waterCups.toString());
    window.dispatchEvent(new CustomEvent("f5_water_updated", { detail: waterCups }));
  }, [waterCups]);

  useEffect(() => {
    const handleCoinsSync = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail !== undefined && customEvent.detail !== studyCoins) {
        setStudyCoins(customEvent.detail);
      }
    };
    const handleWaterSync = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail !== undefined && customEvent.detail !== waterCups) {
        setWaterCups(customEvent.detail);
      }
    };
    window.addEventListener("f5_coins_updated", handleCoinsSync);
    window.addEventListener("f5_water_updated", handleWaterSync);
    return () => {
      window.removeEventListener("f5_coins_updated", handleCoinsSync);
      window.removeEventListener("f5_water_updated", handleWaterSync);
    };
  }, [studyCoins, waterCups]);

  // --- Gamified Sound Synthesizer Engine ---
  const playGameSound = (type: "coin" | "bubble" | "powerup" | "success" | "click" | "error") => {
    try {
      const ctx = audioCtxRef.current || new (window.AudioContext || (window as any).webkitAudioContext)();
      if (!audioCtxRef.current) audioCtxRef.current = ctx;
      if (ctx.state === "suspended") ctx.resume();

      const time = ctx.currentTime;
      if (type === "coin") {
        // High double-beep sound like Mario coin
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.08, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);

        osc.frequency.setValueAtTime(987.77, time); // B5
        osc.frequency.setValueAtTime(1318.51, time + 0.08); // E6

        osc.start(time);
        osc.stop(time + 0.3);
      } else if (type === "bubble") {
        // Water pouring bubble slosh
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.05, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

        osc.frequency.setValueAtTime(180, time);
        osc.frequency.exponentialRampToValueAtTime(850, time + 0.12);

        osc.start(time);
        osc.stop(time + 0.15);
      } else if (type === "powerup") {
        // Fast ascending RPG arpeggio scale
        const frequencies = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
        frequencies.forEach((f, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.connect(gain);
          gain.connect(ctx.destination);
          gain.gain.setValueAtTime(0.03, time + i * 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, time + i * 0.04 + 0.1);
          osc.frequency.setValueAtTime(f, time + i * 0.04);
          osc.start(time + i * 0.04);
          osc.stop(time + i * 0.04 + 0.1);
        });
      } else if (type === "success") {
        // Full happy chord
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((f) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.connect(gain);
          gain.connect(ctx.destination);
          gain.gain.setValueAtTime(0.03, time);
          gain.gain.exponentialRampToValueAtTime(0.001, time + 0.45);
          osc.frequency.setValueAtTime(f, time);
          osc.start(time);
          osc.stop(time + 0.45);
        });
      } else if (type === "click") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.02, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
        osc.frequency.setValueAtTime(120, time);
        osc.start(time);
        osc.stop(time + 0.04);
      } else if (type === "error") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.06, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
        osc.frequency.setValueAtTime(110, time);
        osc.start(time);
        osc.stop(time + 0.2);
      }
    } catch (e) {}
  };

  // Game Arena States
  const [mathNum1, setMathNum1] = useState(6);
  const [mathNum2, setMathNum2] = useState(7);
  const [mathOp, setMathOp] = useState<"+" | "-" | "*">("*");
  const [mathAnswer, setMathAnswer] = useState("");
  const [mathScore, setMathScore] = useState(0);
  const [mathStreak, setMathStreak] = useState(0);
  const [mathHighScore, setMathHighScore] = useState(() => {
    return parseInt(localStorage.getItem("f5_beast_math_highscore") || "0", 10);
  });
  const [mathActive, setMathActive] = useState(false);
  const [mathTimeLeft, setMathTimeLeft] = useState(15);

  const [examName, setExamName] = useState(() => localStorage.getItem("f5_beast_exam_name") || "Final Term Exam");
  const [examDate, setExamDate] = useState(() => localStorage.getItem("f5_beast_exam_date") || "2026-09-25T09:00");
  const [countdownText, setCountdownText] = useState("");

  const [expenses, setExpenses] = useState<any[]>(() => {
    return JSON.parse(localStorage.getItem("f5_beast_expenses") || '[{"id":"e1","item":"Ergonomic cushion","cost":650,"category":"Setup"}]');
  });
  const [expenseItem, setExpenseItem] = useState("");
  const [expenseCost, setExpenseCost] = useState(0);
  const [expenseCategory, setExpenseCategory] = useState("Books");
  const [budgetLimit, setBudgetLimit] = useState(3000);

  // --- Quest System persistent claims ---
  const [claimedQuests, setClaimedQuests] = useState<string[]>(() => {
    return JSON.parse(localStorage.getItem("f5_claimed_quests") || "[]");
  });

  useEffect(() => {
    localStorage.setItem("f5_claimed_quests", JSON.stringify(claimedQuests));
  }, [claimedQuests]);

  const questsList = useMemo(() => [
    {
      id: "q_aqua",
      title: "💧 Ooze Hydration Scholar",
      desc: "Drink 8 or more cups of water to lubricate thinking pathways.",
      target: 8,
      current: waterCups,
      isMet: waterCups >= 8,
      rewardCoins: 50,
      rewardXp: 100
    },
    {
      id: "q_speed",
      title: "🧠 Agility Math Master",
      desc: "Score 5 or more correct answers in the mental speed sprint.",
      target: 5,
      current: mathHighScore,
      isMet: mathHighScore >= 5,
      rewardCoins: 60,
      rewardXp: 120
    },
    {
      id: "q_matrix",
      title: "🎯 Priority Goal Smasher",
      desc: "Mark at least 2 urgent items as completed in Eisenhower Grid.",
      target: 2,
      current: matrixItems.filter((i: any) => i.done).length,
      isMet: matrixItems.filter((i: any) => i.done).length >= 2,
      rewardCoins: 40,
      rewardXp: 80
    },
    {
      id: "q_syllabus",
      title: "🦁 Chapter Master Lion",
      desc: "Master and check off at least 1 course chapter syllabus topic.",
      target: 1,
      current: syllabusItems.filter((i: any) => i.done).length,
      isMet: syllabusItems.filter((i: any) => i.done).length >= 1,
      rewardCoins: 50,
      rewardXp: 100
    },
    {
      id: "q_flash",
      title: "📦 Leitner Deckbuilder",
      desc: "Compile a study deck of 5 or more active flashcards.",
      target: 5,
      current: flashcards.length,
      isMet: flashcards.length >= 5,
      rewardCoins: 30,
      rewardXp: 60
    }
  ], [waterCups, mathHighScore, matrixItems, syllabusItems, flashcards]);

  const handleClaimQuest = (qId: string, rewardCoins: number, rewardXp: number, title: string) => {
    if (claimedQuests.includes(qId)) return;
    setClaimedQuests(prev => [...prev, qId]);
    setStudyCoins(c => c + rewardCoins);
    onAddXp(`Achievement: ${title}`, rewardXp);
    playGameSound("powerup");
    triggerStatus(`🏆 Quest Claimed: ${title}! Earned 🪙 ${rewardCoins} Study Coins & +${rewardXp} XP!`);
  };

  const stickerStore = [
    { name: "🔥 Cozy Flame", price: 20, emoji: "🔥" },
    { name: "👑 Focus Crown", price: 40, emoji: "👑" },
    { name: "💡 Wise Owl", price: 60, emoji: "💡" },
    { name: "🚀 Cosmic Voyager", price: 80, emoji: "🚀" },
    { name: "🧠 Super Brain", price: 100, emoji: "🧠" },
    { name: "☕ Midnight Brew", price: 120, emoji: "☕" },
    { name: "🦁 Alpha Lion", price: 150, emoji: "🦁" }
  ];

  // ==========================================
  // --- SAVING AND INITIAL SYNC SYSTEM ---
  // ==========================================
  useEffect(() => {
    localStorage.setItem("f5_beast_syllabus", JSON.stringify(syllabusItems));
  }, [syllabusItems]);

  useEffect(() => {
    localStorage.setItem("f5_beast_matrix", JSON.stringify(matrixItems));
  }, [matrixItems]);

  useEffect(() => {
    localStorage.setItem("f5_beast_flashcards", JSON.stringify(flashcards));
  }, [flashcards]);

  useEffect(() => {
    localStorage.setItem("f5_beast_gpaclasses", JSON.stringify(gpaClasses));
  }, [gpaClasses]);

  useEffect(() => {
    localStorage.setItem("f5_beast_coins", studyCoins.toString());
  }, [studyCoins]);

  useEffect(() => {
    localStorage.setItem("f5_beast_water", waterCups.toString());
  }, [waterCups]);

  useEffect(() => {
    localStorage.setItem("f5_beast_stickers", JSON.stringify(ownedStickers));
  }, [ownedStickers]);

  useEffect(() => {
    localStorage.setItem("f5_beast_pinned_stickers", JSON.stringify(pinnedStickers));
  }, [pinnedStickers]);

  useEffect(() => {
    localStorage.setItem("f5_beast_exam_name", examName);
    localStorage.setItem("f5_beast_exam_date", examDate);
  }, [examName, examDate]);

  useEffect(() => {
    localStorage.setItem("f5_beast_expenses", JSON.stringify(expenses));
  }, [expenses]);

  // ==========================================
  // --- MECHANICAL KEYBOARD SIM SOUNDS ---
  // ==========================================
  const playKeyboardClack = () => {
    if (ambientVolume.keyboard === 0) return;
    try {
      const ctx = audioCtxRef.current || new (window.AudioContext || (window as any).webkitAudioContext)();
      if (!audioCtxRef.current) audioCtxRef.current = ctx;
      if (ctx.state === "suspended") ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const biquad = ctx.createBiquadFilter();

      osc.connect(biquad);
      biquad.connect(gain);
      gain.connect(ctx.destination);

      // Distinct mechanical switch sound profiles
      if (keyboardPreset === "blue") {
        // High clicky pitch
        osc.type = "sine";
        osc.frequency.setValueAtTime(450 + Math.random() * 200, ctx.currentTime);
        biquad.type = "highpass";
        biquad.frequency.setValueAtTime(1000, ctx.currentTime);
        gain.gain.setValueAtTime(ambientVolume.keyboard * 0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
        osc.start();
        osc.stop(ctx.currentTime + 0.04);
      } else if (keyboardPreset === "buckling") {
        // Metallic thud + rattle
        osc.type = "triangle";
        osc.frequency.setValueAtTime(120 + Math.random() * 80, ctx.currentTime);
        biquad.type = "bandpass";
        biquad.frequency.setValueAtTime(300, ctx.currentTime);
        gain.gain.setValueAtTime(ambientVolume.keyboard * 0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      } else if (keyboardPreset === "linear") {
        // Silenced soft thock
        osc.type = "sine";
        osc.frequency.setValueAtTime(80 + Math.random() * 40, ctx.currentTime);
        biquad.type = "lowpass";
        biquad.frequency.setValueAtTime(200, ctx.currentTime);
        gain.gain.setValueAtTime(ambientVolume.keyboard * 0.35, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } else {
        // Brown Switch: Medium bump
        osc.type = "triangle";
        osc.frequency.setValueAtTime(180 + Math.random() * 70, ctx.currentTime);
        biquad.type = "lowpass";
        biquad.frequency.setValueAtTime(500, ctx.currentTime);
        gain.gain.setValueAtTime(ambientVolume.keyboard * 0.22, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);
        osc.start();
        osc.stop(ctx.currentTime + 0.07);
      }
    } catch (e) {}
  };

  // ==========================================
  // --- BINAURAL SYNTH & WHITE NOISE ---
  // ==========================================
  const toggleBinauralBeats = () => {
    try {
      const ctx = audioCtxRef.current || new (window.AudioContext || (window as any).webkitAudioContext)();
      if (!audioCtxRef.current) audioCtxRef.current = ctx;

      if (binauralActive) {
        if (binLeftOscRef.current) { binLeftOscRef.current.stop(); binLeftOscRef.current.disconnect(); binLeftOscRef.current = null; }
        if (binRightOscRef.current) { binRightOscRef.current.stop(); binRightOscRef.current.disconnect(); binRightOscRef.current = null; }
        if (binGainRef.current) { binGainRef.current.disconnect(); binGainRef.current = null; }
        setBinauralActive(false);
        triggerStatus("Acoustic wave synth stopped.");
      } else {
        if (ctx.state === "suspended") ctx.resume();

        const oscL = ctx.createOscillator();
        oscL.type = "sine";
        oscL.frequency.setValueAtTime(binCarrier, ctx.currentTime);
        
        const panL = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        if (panL) { panL.pan.setValueAtTime(-1, ctx.currentTime); oscL.connect(panL); }

        const oscR = ctx.createOscillator();
        oscR.type = "sine";
        oscR.frequency.setValueAtTime(binCarrier + binBeat, ctx.currentTime);
        
        const panR = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        if (panR) { panR.pan.setValueAtTime(1, ctx.currentTime); oscR.connect(panR); }

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(ambientVolume.binaural * 0.08, ctx.currentTime);

        const targetNode = filterActive ? ctx.createBiquadFilter() : gainNode;
        if (filterActive && targetNode instanceof BiquadFilterNode) {
          targetNode.type = "lowpass";
          targetNode.frequency.setValueAtTime(300, ctx.currentTime);
          targetNode.connect(gainNode);
        }

        if (panL && panR) {
          panL.connect(targetNode);
          panR.connect(targetNode);
        } else {
          oscL.connect(targetNode);
          oscR.connect(targetNode);
        }

        gainNode.connect(ctx.destination);
        oscL.start();
        oscR.start();

        binLeftOscRef.current = oscL;
        binRightOscRef.current = oscR;
        binGainRef.current = gainNode;
        setBinauralActive(true);
        triggerStatus(`Binaural wave active: ${binBeat}Hz brainwave delta.`);
      }
    } catch (e) {
      triggerStatus("Web Audio blocked or un-supported.");
    }
  };

  useEffect(() => {
    if (binauralActive && binLeftOscRef.current && binRightOscRef.current && binGainRef.current && audioCtxRef.current) {
      try {
        const ctx = audioCtxRef.current;
        binLeftOscRef.current.frequency.setValueAtTime(binCarrier, ctx.currentTime);
        binRightOscRef.current.frequency.setValueAtTime(binCarrier + binBeat, ctx.currentTime);
        binGainRef.current.gain.setValueAtTime(ambientVolume.binaural * 0.08, ctx.currentTime);
      } catch (e) {}
    }
  }, [binCarrier, binBeat, ambientVolume.binaural, binauralActive]);

  // Audio Oscilloscope live rendering
  useEffect(() => {
    const canvas = visCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let offset = 0;
    const drawWave = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = binauralActive ? "#f26419" : "#6366f1";

      const frequency = binauralActive ? (binCarrier / 100) : 1.5;
      const beatRate = binauralActive ? binBeat : 1;

      for (let x = 0; x < canvas.width; x++) {
        const y = canvas.height / 2 + 
          Math.sin(x * 0.015 * frequency + offset) * 16 * Math.sin(x * 0.003 * beatRate) +
          Math.cos(x * 0.008 + offset * 1.5) * 4;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      offset += binauralActive ? 0.04 : 0.015;
      animFrameRef.current = requestAnimationFrame(drawWave);
    };

    drawWave();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [binauralActive, binCarrier, binBeat]);

  const createNoiseBuffer = (ctx: AudioContext, type: "white" | "pink" | "brown") => {
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    if (type === "white") {
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    } else if (type === "pink") {
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        data[i] *= 0.11;
        b6 = white * 0.115926;
      }
    } else {
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + (0.025 * white)) / 1.025;
        lastOut = data[i];
        data[i] *= 3.5;
      }
    }
    return buffer;
  };

  const stopNoise = () => {
    if (noiseSourceRef.current) {
      try { noiseSourceRef.current.stop(); } catch (e) {}
      noiseSourceRef.current.disconnect();
      noiseSourceRef.current = null;
    }
    setNoiseType("none");
  };

  const playNoise = (type: "white" | "pink" | "brown") => {
    try {
      stopNoise();
      const ctx = audioCtxRef.current || new (window.AudioContext || (window as any).webkitAudioContext)();
      if (!audioCtxRef.current) audioCtxRef.current = ctx;
      if (ctx.state === "suspended") ctx.resume();

      const buffer = createNoiseBuffer(ctx, type);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(ambientVolume.binaural * 0.1, ctx.currentTime);

      source.connect(gain);
      gain.connect(ctx.destination);
      source.start();

      noiseSourceRef.current = source;
      noiseGainRef.current = gain;
      setNoiseType(type);
      triggerStatus(`Active Focus Noise: ${type.toUpperCase()}`);
    } catch (e) {}
  };

  useEffect(() => {
    if (noiseGainRef.current && audioCtxRef.current) {
      try {
        noiseGainRef.current.gain.setValueAtTime(ambientVolume.binaural * 0.1, audioCtxRef.current.currentTime);
      } catch (e) {}
    }
  }, [ambientVolume.binaural]);

  // Sleep Timer Thread
  useEffect(() => {
    let timerId: any = null;
    if (sleepTimerMinutes !== null && sleepTimerSecondsLeft > 0) {
      timerId = setInterval(() => {
        setSleepTimerSecondsLeft((prev) => {
          if (prev <= 1) {
            if (binauralActive) toggleBinauralBeats();
            stopNoise();
            setSleepTimerMinutes(null);
            triggerStatus("Sleep timer shutdown focus waves.");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerId);
  }, [sleepTimerMinutes, sleepTimerSecondsLeft, binauralActive]);

  // Clean-up all synthesis and close AudioContext on unmount
  useEffect(() => {
    return () => {
      if (binLeftOscRef.current) { try { binLeftOscRef.current.stop(); } catch (e) {} binLeftOscRef.current.disconnect(); binLeftOscRef.current = null; }
      if (binRightOscRef.current) { try { binRightOscRef.current.stop(); } catch (e) {} binRightOscRef.current.disconnect(); binRightOscRef.current = null; }
      if (binGainRef.current) { binGainRef.current.disconnect(); binGainRef.current = null; }
      if (noiseSourceRef.current) { try { noiseSourceRef.current.stop(); } catch (e) {} noiseSourceRef.current.disconnect(); noiseSourceRef.current = null; }
      if (noiseGainRef.current) { noiseGainRef.current.disconnect(); noiseGainRef.current = null; }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(err => console.warn("Failed to close AudioContext in BeastHub on unmount:", err));
        audioCtxRef.current = null;
      }
    };
  }, []);

  const startSleepTimer = (minutes: number) => {
    setSleepTimerMinutes(minutes);
    setSleepTimerSecondsLeft(minutes * 60);
    triggerStatus(`Synthesizer shutdown set in ${minutes}m`);
  };

  // ==========================================
  // --- DEEP BREATHING COACH ---
  // ==========================================
  const speakText = (text: string) => {
    if (!enableVoiceGuide || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (e) {}
  };

  useEffect(() => {
    let interval: any = null;
    if (breathingActive) {
      interval = setInterval(() => {
        setBreathSeconds((prev) => {
          if (prev <= 1) {
            let nextState: "Inhale" | "Hold" | "Exhale" | "Rest" = "Inhale";
            let nextSecs = 4;
            setBreathState((curr) => {
              if (breathPattern === "box") {
                if (curr === "Inhale") { nextState = "Hold"; nextSecs = 4; }
                else if (curr === "Hold") { nextState = "Exhale"; nextSecs = 4; }
                else if (curr === "Exhale") { nextState = "Rest"; nextSecs = 4; }
                else { nextState = "Inhale"; nextSecs = 4; }
              } else if (breathPattern === "pranayama") {
                if (curr === "Inhale") { nextState = "Hold"; nextSecs = 12; }
                else if (curr === "Hold") { nextState = "Exhale"; nextSecs = 6; }
                else { nextState = "Inhale"; nextSecs = 4; }
              } else {
                // 4-7-8 Calm
                if (curr === "Inhale") { nextState = "Hold"; nextSecs = 7; }
                else if (curr === "Hold") { nextState = "Exhale"; nextSecs = 8; }
                else { nextState = "Inhale"; nextSecs = 4; }
              }
              speakText(nextState);
              return nextState;
            });
            return nextSecs;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [breathingActive, breathPattern, enableVoiceGuide]);

  // ==========================================
  // --- ARITHMETIC Warmup SPEED SPRINT ---
  // ==========================================
  const generateNewMath = () => {
    const ops = ["+", "-", "*"] as const;
    const op = ops[Math.floor(Math.random() * ops.length)];
    setMathOp(op);
    if (op === "+") {
      setMathNum1(Math.floor(10 + Math.random() * 80));
      setMathNum2(Math.floor(10 + Math.random() * 80));
    } else if (op === "-") {
      const n1 = Math.floor(25 + Math.random() * 70);
      setMathNum1(n1);
      setMathNum2(Math.floor(5 + Math.random() * (n1 - 3)));
    } else {
      setMathNum1(Math.floor(3 + Math.random() * 10));
      setMathNum2(Math.floor(3 + Math.random() * 10));
    }
    setMathAnswer("");
  };

  const startMathSprint = () => {
    setMathScore(0);
    setMathStreak(0);
    setMathTimeLeft(15);
    setMathActive(true);
    generateNewMath();
    triggerStatus("Warmup speed sprint active!");
  };

  const handleMathSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mathActive) return;
    const ans = parseInt(mathAnswer);
    if (isNaN(ans)) return;

    let isCorrect = false;
    if (mathOp === "+") isCorrect = (ans === mathNum1 + mathNum2);
    else if (mathOp === "-") isCorrect = (ans === mathNum1 - mathNum2);
    else isCorrect = (ans === mathNum1 * mathNum2);

    if (isCorrect) {
      setMathScore((prev) => prev + 1);
      setMathStreak((prev) => prev + 1);
      // Play a happy synthesized beep
      try {
        const ctx = audioCtxRef.current || new AudioContext();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.setValueAtTime(800 + Math.min(mathStreak * 50, 400), ctx.currentTime);
        g.gain.setValueAtTime(0.06, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        o.connect(g); g.connect(ctx.destination);
        o.start(); o.stop(ctx.currentTime + 0.1);
      } catch (err) {}
      generateNewMath();
    } else {
      setMathStreak(0);
      // Error buzz sound
      try {
        const ctx = audioCtxRef.current || new AudioContext();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.setValueAtTime(140, ctx.currentTime);
        g.gain.setValueAtTime(0.12, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        o.connect(g); g.connect(ctx.destination);
        o.start(); o.stop(ctx.currentTime + 0.15);
      } catch (err) {}
      triggerStatus("Incorrect calculation!");
    }
  };

  useEffect(() => {
    let interval: any = null;
    if (mathActive && mathTimeLeft > 0) {
      interval = setInterval(() => setMathTimeLeft((prev) => prev - 1), 1000);
    } else if (mathActive && mathTimeLeft === 0) {
      setMathActive(false);
      const coinReward = mathScore * 5;
      const xpReward = mathScore * 10;
      setStudyCoins((prev) => prev + coinReward);
      onAddXp("Mental agility sprint", xpReward);
      if (mathScore > mathHighScore) {
        setMathHighScore(mathScore);
        localStorage.setItem("f5_beast_math_highscore", mathScore.toString());
        triggerStatus(`🔥 NEW HIGHSCORE: ${mathScore}! Earned 🪙 ${coinReward} coins & +${xpReward} XP!`);
      } else {
        triggerStatus(`Speed warmup finished! Score: ${mathScore}. Earned +${xpReward} XP.`);
      }
    }
    return () => clearInterval(interval);
  }, [mathActive, mathTimeLeft]);

  // ==========================================
  // --- ESTIMATED READING CALCULATOR ---
  // ==========================================
  const estimatedReadingTimeMins = useMemo(() => {
    let baseMins = pageCount * readSpeed;
    if (difficultyRating === "easy") baseMins *= 0.8;
    else if (difficultyRating === "hard") baseMins *= 1.35;
    if (activeRecallCycles) baseMins *= 1.25; // 25% recall buffer
    return Math.round(baseMins / (focusEff / 100));
  }, [pageCount, readSpeed, focusEff, difficultyRating, activeRecallCycles]);

  // ==========================================
  // --- EXAM COUNTDOWN TICKER ---
  // ==========================================
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const target = new Date(examDate).getTime();
      const dist = target - now;
      if (dist < 0) setCountdownText("Exam day has arrived!");
      else {
        const d = Math.floor(dist / (1000 * 60 * 60 * 24));
        const h = Math.floor((dist % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((dist % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((dist % (1000 * 60)) / 1000);
        setCountdownText(`${d}d ${h}h ${m}m ${s}s`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [examDate]);

  // ==========================================
  // --- WEIGHTED GRADE TARGET CALCS ---
  // ==========================================
  const overallCurrentScore = useMemo(() => {
    let totalWeight = 0, productSum = 0;
    gpaClasses.forEach((c) => { totalWeight += c.weight; productSum += c.currentScore * c.weight; });
    if (totalWeight === 0) return 0;
    return Math.round((productSum / totalWeight) * 10) / 10;
  }, [gpaClasses]);

  const requiredFinalScore = useMemo(() => {
    let totalWeight = 0;
    gpaClasses.forEach((c) => totalWeight += c.weight);
    const remainingWeight = 100 - totalWeight;
    if (remainingWeight <= 0) return 0;
    const currentWeightedSum = gpaClasses.reduce((acc, c) => acc + c.currentScore * c.weight, 0);
    const needed = (gpaTarget * 100) - currentWeightedSum;
    return Math.round((needed / remainingWeight) * 10) / 10;
  }, [gpaClasses, gpaTarget]);

  // ==========================================
  // --- BULK FLASHCARDS IMPORTER ---
  // ==========================================
  const handleBulkImport = () => {
    if (!bulkFcText.trim()) return;
    const lines = bulkFcText.split("\n");
    let addedCount = 0;
    const newCards: any[] = [];
    lines.forEach((line) => {
      const parts = line.split(/[=?]/);
      if (parts.length >= 2) {
        newCards.push({
          id: `fc-${Date.now()}-${Math.random()}`,
          question: parts[0].trim() + "?",
          answer: parts[1].trim(),
          box: 1
        });
        addedCount++;
      }
    });
    if (newCards.length > 0) {
      setFlashcards((prev) => [...prev, ...newCards]);
      onAddXp("Bulk compiled flashcards", addedCount * 3);
      triggerStatus(`Imported ${addedCount} cards. +${addedCount * 3} XP.`);
    }
    setBulkFcText("");
    setShowBulkModal(false);
  };

  return (
    <div className="w-full text-slate-800 dark:text-slate-100 flex flex-col space-y-6 select-none font-sans antialiased">
      
      {/* 🚀 APEX FOCUS CITADEL HEADER */}
      <div className="liquid-glass relative p-6 sm:p-7 rounded-3xl flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5 overflow-hidden">
        {/* Dynamic aura glowing backgrounds */}
        {focusAura === "hyper" && (
          <div className="absolute top-0 right-0 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl transition-all duration-700 pointer-events-none animate-pulse" />
        )}
        {focusAura === "zen" && (
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl transition-all duration-700 pointer-events-none animate-pulse" />
        )}
        {focusAura === "scholar" && (
          <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl transition-all duration-700 pointer-events-none animate-pulse" />
        )}
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 text-left relative z-10">
          <div className={`p-3 text-white rounded-2xl shadow-md transition-all duration-500 shrink-0 ${
            focusAura === "hyper" 
              ? "bg-gradient-to-tr from-orange-500 to-amber-500 shadow-orange-500/20" 
              : focusAura === "zen"
                ? "bg-gradient-to-tr from-emerald-500 to-teal-400 shadow-emerald-500/20"
                : "bg-gradient-to-tr from-indigo-500 to-purple-500 shadow-indigo-500/20"
          }`}>
            <Zap className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display font-black text-xl tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                Apex Focus Citadel
              </h1>
              <span className={`text-[9px] uppercase font-mono font-black tracking-widest px-2 py-0.5 rounded-full border transition-all duration-500 ${
                focusAura === "hyper"
                  ? "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/10"
                  : focusAura === "zen"
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/10"
                    : "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/10"
              }`}>
                {focusAura === "hyper" ? "APEX GRIND MODE" : focusAura === "zen" ? "ZEN STATE FLOW" : "SCHOLASTIC HUB"}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
              {focusAura === "hyper" && "Hyper-Focus active: latency-minimized digital canvas, brown noise waves, and cognitive speed metrics engaged."}
              {focusAura === "zen" && "Zen Vibe active: low-alpha binaural synth, responsive writing canvas, hydration metrics, and breath guides."}
              {focusAura === "scholar" && "Scholastic Vibe active: strategic academic planning, syllabus trackers, flashcard repetitions, and active recall."}
            </p>
          </div>
        </div>

        {/* Dynamic Focus Aura Selector */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 relative z-10 shrink-0">
          <div className="bg-slate-50 dark:bg-[#18181b] p-1 rounded-2xl border border-slate-150 dark:border-slate-800 flex gap-1">
            <button
              onClick={() => changeFocusAura("hyper")}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                focusAura === "hyper"
                  ? "bg-orange-500 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Flame className="w-3.5 h-3.5" /> Apex Grind
            </button>
            <button
              onClick={() => changeFocusAura("zen")}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                focusAura === "zen"
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Wind className="w-3.5 h-3.5" /> Zen Mind
            </button>
            <button
              onClick={() => changeFocusAura("scholar")}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                focusAura === "scholar"
                  ? "bg-indigo-500 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Award className="w-3.5 h-3.5" /> Scholar
            </button>
          </div>

          {/* Currencies */}
          <div className="flex items-center gap-2">
            <div className="bg-amber-500/10 border border-amber-500/15 px-3 py-1 rounded-xl text-left min-w-[65px]">
              <span className="text-[8px] font-mono uppercase text-amber-600 dark:text-amber-400 block font-black">Coins</span>
              <span className="text-xs font-black font-mono text-amber-500 flex items-center gap-1">
                🪙 {studyCoins}
              </span>
            </div>
            <div className="bg-indigo-500/10 border border-indigo-500/15 px-3 py-1 rounded-xl text-left min-w-[65px]">
              <span className="text-[8px] font-mono uppercase text-indigo-600 dark:text-indigo-400 block font-black">Water</span>
              <span className="text-xs font-black font-mono text-indigo-500 flex items-center gap-1">
                💧 {waterCups}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* TABS SELECTOR */}
      <div className="liquid-glass p-1.5 rounded-2xl flex gap-1.5 overflow-x-auto no-scrollbar font-sans shrink-0 border shadow-sm">
        {[
          { id: "acoustics", label: "Sound Synth", icon: Volume2, color: "text-rose-500" },
          { id: "planners", label: "Study Planner", icon: Layers, color: "text-indigo-500" },
          { id: "analytics", label: "Grade Target", icon: BarChart2, color: "text-emerald-500" },
          { id: "quick", label: "Vision & Game", icon: Sparkles, color: "text-amber-500" }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeBeastTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveBeastTab(tab.id as any); playKeyboardClack(); }}
              className={`py-2.5 px-5 rounded-xl flex items-center gap-2.5 text-xs font-bold transition-all duration-300 shrink-0 cursor-pointer active:scale-95 ${
                isActive 
                  ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950 shadow-md font-black scale-[1.02]" 
                  : "hover:bg-slate-550/10 text-slate-600 dark:text-slate-400 dark:hover:bg-white/5"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 transition-transform duration-300 ${isActive ? "scale-110" : ""} ${tab.color}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Banner Status */}
      <AnimatePresence>
        {statusMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold rounded-xl text-left"
          >
            ✦ {statusMsg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-6">

        {/* TAB 1: SOUND SYNTH */}
        {activeBeastTab === "acoustics" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Binaural Generator */}
            <div className="liquid-glass p-5.5 rounded-3xl border shadow-sm space-y-3.5 text-left">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold uppercase text-rose-500 block">Neuroacoustic waves</span>
                  <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-1.5">
                    <Volume2 className="w-4.5 h-4.5 text-rose-500" /> Binaural Wave Mixer
                  </h3>
                </div>
                <button
                  onClick={toggleBinauralBeats}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-bold cursor-pointer transition-all ${binauralActive ? "bg-rose-500 text-white" : "bg-orange-500 text-white"}`}
                >
                  {binauralActive ? "⏹ STOP SYNTH" : "▶ START SYNTH"}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">Streams offsets to Left/Right stereos for brainwave synchronization. Headphones needed.</p>

              <div className="space-y-3 pt-1 text-xs">
                <div>
                  <div className="flex justify-between font-mono text-[10px] text-slate-400">
                    <span>Base Carrier: {binCarrier}Hz</span>
                    <span>Pitch</span>
                  </div>
                  <input type="range" min="120" max="400" value={binCarrier} onChange={(e) => setBinCarrier(parseInt(e.target.value))} className="w-full" />
                </div>
                <div>
                  <div className="flex justify-between font-mono text-[10px] text-slate-400">
                    <span>Beat Frequency: {binBeat}Hz</span>
                    <span className="text-indigo-500 font-bold">
                      {binBeat >= 13 ? "Beta ⚡ (Active)" : binBeat >= 8 ? "Alpha 🧘 (Focus)" : "Theta 💤 (Relax)"}
                    </span>
                  </div>
                  <input type="range" min="2" max="25" value={binBeat} onChange={(e) => setBinBeat(parseInt(e.target.value))} className="w-full" />
                </div>
                <div className="flex gap-1">
                  {[[10, "Alpha Focus"], [6, "Theta Calm"], [15, "Beta Sharp"]].map(([val, label]: any) => (
                    <button key={val} onClick={() => { setBinBeat(val); playKeyboardClack(); }} className="flex-1 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-800/80 rounded text-[9px] font-bold">{label}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* Acoustic Masking */}
            <div className="liquid-glass p-5.5 rounded-3xl border shadow-sm space-y-3 text-left">
              <div>
                <span className="text-[10px] font-bold uppercase text-indigo-500 block">Sound Masking</span>
                <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-1.5">
                  <Wind className="w-4.5 h-4.5 text-indigo-500" /> Focus Noise Streamer
                </h3>
              </div>
              <p className="text-[11px] text-slate-400">Mask environmental distractions offline using real-time audio sample arrays.</p>

              <div className="grid grid-cols-3 gap-1.5 pt-1">
                {[
                  { id: "white", label: "White", desc: "Crisp/sharp" },
                  { id: "pink", label: "Pink", desc: "Warm breeze" },
                  { id: "brown", label: "Brown", desc: "Deep rumble" }
                ].map((n) => (
                  <button
                    key={n.id}
                    onClick={() => { if (noiseType === n.id) stopNoise(); else playNoise(n.id as any); playKeyboardClack(); }}
                    className={`p-2 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer border text-xs ${
                      noiseType === n.id ? "bg-indigo-600 text-white border-indigo-600" : "bg-slate-50 dark:bg-slate-800/60 border-slate-200/50 dark:border-slate-800 hover:bg-slate-100"
                    }`}
                  >
                    <span className="font-bold text-[11px]">{n.label}</span>
                    <span className="text-[8px] opacity-70 mt-0.5">{n.desc}</span>
                  </button>
                ))}
              </div>
              {noiseType !== "none" && (
                <button onClick={stopNoise} className="w-full py-1.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[10px] font-bold rounded-lg mt-1">⏹ STOP NOISE STREAM</button>
              )}
            </div>

            {/* Live Visual Oscilloscope & Sleep countdown */}
            <div className="liquid-glass p-5.5 rounded-3xl border shadow-sm space-y-3.5 text-left flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Synth Oscilloscope</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px]">Harmonic Filter</span>
                    <input type="checkbox" checked={filterActive} onChange={() => setFilterActive(!filterActive)} className="rounded accent-emerald-500" />
                  </div>
                </div>
                {/* Canvas visualizer */}
                <div className="h-14 w-full bg-slate-50 dark:bg-[#0d0d11] rounded-xl border border-slate-200/50 dark:border-slate-800/50 overflow-hidden relative">
                  <canvas ref={visCanvasRef} width="350" height="60" className="w-full h-full opacity-80" />
                  <span className="absolute bottom-1 right-2 text-[8px] font-mono text-slate-400 uppercase">Live pitch monitor</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-150 dark:border-slate-800/60 space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span>Auto-Off Timer</span>
                  {sleepTimerMinutes !== null && <span className="text-rose-500 font-mono animate-pulse">{Math.floor(sleepTimerSecondsLeft/60)}:{(sleepTimerSecondsLeft%60).toString().padStart(2,'0')} left</span>}
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {[5, 15, 30, 45].map((t) => (
                    <button key={t} onClick={() => startSleepTimer(t)} className={`py-1 rounded bg-slate-50 dark:bg-slate-800 border text-[10px] font-bold ${sleepTimerMinutes === t ? "bg-orange-500 text-white border-orange-500" : ""}`}>{t}m</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PLATINUM PLANNER */}
        {activeBeastTab === "planners" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Eisenhower Quad Priority Grid */}
            <div className="lg:col-span-2 liquid-glass p-5.5 rounded-3xl border shadow-sm space-y-4 text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-2">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">Priority Engine</span>
                  <h3 className="font-bold text-sm text-slate-800 dark:text-white">Eisenhower 4-Quadrant Priority Matrix</h3>
                </div>
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!newMatrixText.trim()) return;
                    const item = { id: `m-${Date.now()}`, text: newMatrixText.trim(), quadrant: newMatrixQuad, done: false };
                    setMatrixItems(p => [item, ...p]);
                    setNewMatrixText("");
                    onAddXp("Added priority goal", 5);
                    triggerStatus("Prioritized task added!");
                  }}
                  className="flex items-center gap-1.5 flex-wrap"
                >
                  <input type="text" placeholder="Add urgent work..." value={newMatrixText} onChange={(e) => setNewMatrixText(e.target.value)} className="p-1 px-2 text-xs bg-slate-50 dark:bg-slate-800 border rounded-lg" required />
                  <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px]">
                    {[
                      { v: 1, l: "Q1" },
                      { v: 2, l: "Q2" },
                      { v: 3, l: "Q3" },
                      { v: 4, l: "Q4" }
                    ].map((quad) => (
                      <button
                        key={quad.v}
                        type="button"
                        onClick={() => { setNewMatrixQuad(quad.v); playGameSound("click"); }}
                        className={`px-2 py-0.5 font-bold rounded transition-all ${newMatrixQuad === quad.v ? "bg-white dark:bg-slate-900 text-orange-500 shadow-sm" : "text-slate-500 dark:text-slate-400"}`}
                      >
                        {quad.l}
                      </button>
                    ))}
                  </div>
                  <button type="submit" className="p-1 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold">Add</button>
                </form>
              </div>
 
              {/* 4 Quadrants */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {[
                  { q: 1, title: "🔴 Q1: Do First", bg: "bg-red-500/[0.03] border-red-500/15 text-red-600" },
                  { q: 2, title: "🟠 Q2: Plan/Schedule", bg: "bg-orange-500/[0.03] border-orange-500/15 text-orange-600" },
                  { q: 3, title: "🔵 Q3: Delegate", bg: "bg-blue-500/[0.03] border-blue-500/15 text-blue-600" },
                  { q: 4, title: "⚪ Q4: Postpone/Eliminate", bg: "bg-slate-500/[0.03] border-slate-500/15 text-slate-600" }
                ].map((quad) => (
                  <div key={quad.q} className={`p-3 rounded-2xl border ${quad.bg}`}>
                    <h4 className="text-[11px] font-black uppercase mb-2">{quad.title}</h4>
                    <div className="space-y-1.5 max-h-[120px] overflow-y-auto no-scrollbar">
                      {matrixItems.filter(item => item.quadrant === quad.q).map((item) => (
                        <div key={item.id} className="flex items-center justify-between bg-white dark:bg-[#161619] p-1.5 px-2 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                          <label className="flex items-center gap-2 cursor-pointer flex-1">
                            <input
                              type="checkbox"
                              checked={item.done}
                              onChange={() => {
                                setMatrixItems(prev => prev.map(m => m.id === item.id ? { ...m, done: !m.done } : m));
                                if (!item.done) {
                                  onAddXp("Completed priority item", 8);
                                  setStudyCoins(c => c + 15);
                                  playGameSound("coin");
                                  triggerStatus("🎯 Goal completed! Earned 🪙 15 Study Coins!");
                                }
                              }}
                              className="rounded accent-orange-500 cursor-pointer"
                            />
                            <span className={`truncate text-slate-700 dark:text-slate-200 ${item.done ? "line-through text-slate-400 opacity-60" : "font-semibold"}`}>{item.text}</span>
                          </label>
                          <button onClick={() => setMatrixItems(p => p.filter(m => m.id !== item.id))} className="text-slate-400 hover:text-red-500 ml-1 cursor-pointer">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      {matrixItems.filter(item => item.quadrant === quad.q).length === 0 && <span className="text-[9px] text-slate-400 block text-center py-2 font-mono">No tasks queued.</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3D Spaced Repetition Flashcard */}
            <div className="liquid-glass p-5.5 rounded-3xl border shadow-sm text-left flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">Leitner Engine</span>
                  <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-1">
                    📖 Spaced Flashcards
                  </h3>
                </div>
                <button onClick={() => setShowBulkModal(true)} className="px-2 py-0.5 border border-indigo-500/20 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded text-[9px] font-bold">Bulk Import</button>
              </div>

              {flashcards.length > 0 ? (
                <div className="space-y-3 pt-2.5 flex-1 flex flex-col justify-center">
                  
                  {/* CSS 3D Flip Card Container */}
                  <div 
                    onClick={() => { setFcFlipped(!fcFlipped); playKeyboardClack(); }}
                    className="h-36 relative cursor-pointer"
                    style={{ perspective: "1000px" }}
                  >
                    <div 
                      className="w-full h-full rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 flex flex-col justify-between text-center relative transition-transform duration-500 select-none bg-slate-50 dark:bg-[#18181b]"
                      style={{ 
                        transformStyle: "preserve-3d", 
                        transform: fcFlipped ? "rotateY(180deg)" : "rotateY(0deg)"
                      }}
                    >
                      {/* FRONT FACE */}
                      <div className="absolute inset-0 p-4 flex flex-col justify-between backface-hidden">
                        <div className="flex justify-between items-center text-[8.5px] font-mono text-slate-400">
                          <span>📦 Box {flashcards[currentFcIdx].box || 1}</span>
                          <span>Card {currentFcIdx + 1}/{flashcards.length}</span>
                        </div>
                        <p className="text-xs font-bold text-slate-800 dark:text-neutral-100 leading-normal px-2 line-clamp-3">{flashcards[currentFcIdx].question}</p>
                        <span className="text-[8px] font-mono text-slate-400 tracking-wider">CLICK TO REVEAL</span>
                      </div>

                      {/* BACK FACE */}
                      <div 
                        className="absolute inset-0 p-4 flex flex-col justify-between backface-hidden"
                        style={{ transform: "rotateY(180deg)" }}
                      >
                        <div className="flex justify-between items-center text-[8.5px] font-mono text-slate-400">
                          <span className="text-orange-500 font-bold uppercase">Answer</span>
                          <span>Box {flashcards[currentFcIdx].box || 1}</span>
                        </div>
                        <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 leading-normal px-2 line-clamp-3">{flashcards[currentFcIdx].answer}</p>
                        <span className="text-[8px] font-mono text-slate-400 tracking-wider">CLICK TO FLIP OVER</span>
                      </div>
                    </div>
                  </div>

                  {/* Recall feedback */}
                  {fcFlipped && (
                    <div className="grid grid-cols-3 gap-1 pt-1 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setFlashcards(prev => prev.map((f, idx) => idx === currentFcIdx ? { ...f, box: 1 } : f));
                          onAddXp("Re-queued card", 2);
                          setStudyCoins(c => c + 2); // Encouragement reward
                          setFcFlipped(false);
                          playGameSound("click");
                          setCurrentFcIdx(c => (c + 1) % flashcards.length);
                          triggerStatus("Spaced card re-queued. +2🪙 effort reward!");
                        }}
                        className="text-[9px] py-1.5 bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/15 rounded-lg font-bold"
                      >
                        ❌ Forgot (+2🪙)
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const nextBox = Math.min(5, (flashcards[currentFcIdx].box || 1) + 1);
                          setFlashcards(prev => prev.map((f, idx) => idx === currentFcIdx ? { ...f, box: nextBox } : f));
                          onAddXp("Recall success", 10);
                          setStudyCoins(c => c + 10);
                          setFcFlipped(false);
                          playGameSound("coin");
                          setCurrentFcIdx(c => (c + 1) % flashcards.length);
                          triggerStatus("✔ Recall success! Earned 🪙 10 Study Coins!");
                        }}
                        className="text-[9px] py-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/15 rounded-lg font-bold"
                      >
                        ✔ Recall (+10🪙)
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const nextBox = Math.min(5, (flashcards[currentFcIdx].box || 1) + 2);
                          setFlashcards(prev => prev.map((f, idx) => idx === currentFcIdx ? { ...f, box: nextBox } : f));
                          onAddXp("Recall master", 15);
                          setStudyCoins(c => c + 15);
                          setFcFlipped(false);
                          playGameSound("success");
                          setCurrentFcIdx(c => (c + 1) % flashcards.length);
                          triggerStatus("🚀 Card mastered! Earned 🪙 15 Study Coins!");
                        }}
                        className="text-[9px] py-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/15 rounded-lg font-bold"
                      >
                        🚀 Mastered (+15🪙)
                      </button>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1">
                    <button onClick={() => { setFlashcards(p => p.filter((_, i) => i !== currentFcIdx)); setCurrentFcIdx(0); setFcFlipped(false); }} className="hover:text-red-500 flex items-center gap-0.5"><Trash2 className="w-3 h-3" /> Remove</button>
                    <div className="flex gap-1">
                      <button onClick={() => { setFcFlipped(false); setCurrentFcIdx(c => (c - 1 + flashcards.length) % flashcards.length); }} className="px-1.5 py-0.5 bg-slate-50 dark:bg-slate-800 rounded">Prev</button>
                      <button onClick={() => { setFcFlipped(false); setCurrentFcIdx(c => (c + 1) % flashcards.length); }} className="px-1.5 py-0.5 bg-slate-50 dark:bg-slate-800 rounded">Next</button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs">No flashcards saved. Add some in bulk!</div>
              )}

              {/* Add Custom single card form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newFcQ.trim() || !newFcA.trim()) return;
                  const item = { id: `fc-${Date.now()}`, question: newFcQ.trim(), answer: newFcA.trim(), box: 1 };
                  setFlashcards(p => [...p, item]);
                  setNewFcQ(""); setNewFcA("");
                  onAddXp("Added single flashcard", 5);
                  triggerStatus("Single flashcard added.");
                }}
                className="space-y-1.5 pt-3 border-t border-slate-100 dark:border-slate-800 mt-2"
              >
                <input type="text" placeholder="Concept card prompt..." value={newFcQ} onChange={(e) => setNewFcQ(e.target.value)} className="w-full text-xs p-1 px-2 bg-slate-50 dark:bg-slate-800 border rounded-lg" required />
                <input type="text" placeholder="Correct recall answer..." value={newFcA} onChange={(e) => setNewFcA(e.target.value)} className="w-full text-xs p-1 px-2 bg-slate-50 dark:bg-slate-800 border rounded-lg" required />
                <button type="submit" className="w-full py-1 bg-[#f26419] text-white rounded-lg text-xs font-bold flex justify-center items-center gap-1"><Plus className="w-3 h-3" /> Add card</button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 4: GRADE ANALYTICS */}
        {activeBeastTab === "analytics" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* GPA modeling required final exam grades */}
            <div className="liquid-glass p-5.5 rounded-3xl border shadow-sm space-y-4 text-left">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400">Target GPA Modeler</span>
                <h3 className="font-bold text-sm text-slate-800 dark:text-white">Exam Required Score Calculator</h3>
              </div>
              <p className="text-[11px] text-slate-400">Calculates weighted remaining grades required to hit target score in semesters.</p>

              <div className="p-3 bg-slate-50 dark:bg-[#18181b] rounded-2xl border border-slate-150 dark:border-slate-800 flex justify-between font-mono text-xs">
                <div>
                  <span className="text-[9px] text-slate-400 block font-mono">Current Grade</span>
                  <span className="font-bold text-indigo-500 text-sm">{overallCurrentScore}%</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block font-mono">Exam Required</span>
                  <span className={`font-bold text-sm ${requiredFinalScore > 100 ? "text-red-500 animate-pulse" : requiredFinalScore <= 60 ? "text-emerald-500" : "text-indigo-500"}`}>
                    {requiredFinalScore > 100 ? "Out of Reach" : `${requiredFinalScore}%`}
                  </span>
                </div>
              </div>

              {/* Targets weight list slider */}
              <div className="space-y-2 max-h-[140px] overflow-y-auto no-scrollbar pt-1">
                {gpaClasses.map((cl) => (
                  <div key={cl.id} className="space-y-1 bg-slate-50 dark:bg-[#161619] p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between items-center text-[10px] font-mono text-slate-500">
                      <span className="font-bold truncate text-slate-700 dark:text-slate-300">{cl.name} (w: {cl.weight}%)</span>
                      <span className="font-black">{cl.currentScore}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="range" 
                        min="40" 
                        max="100" 
                        value={cl.currentScore} 
                        onChange={(e) => setGpaClasses(prev => prev.map(c => c.id === cl.id ? { ...c, currentScore: parseInt(e.target.value) } : c))}
                        className="w-full h-1" 
                      />
                      <button onClick={() => setGpaClasses(p => p.filter(c => c.id !== cl.id))} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Interactive add course */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newGpaName.trim()) return;
                  const item = { id: `g-${Date.now()}`, name: newGpaName.trim(), weight: newGpaWeight, currentScore: newGpaScore };
                  setGpaClasses(p => [...p, item]);
                  setNewGpaName("");
                  onAddXp("Configured grade model course", 5);
                  triggerStatus("Course added to simulator.");
                }}
                className="space-y-1.5 pt-2 border-t border-slate-150 dark:border-slate-800/80"
              >
                <div className="grid grid-cols-3 gap-1.5">
                  <input type="text" placeholder="Course title" value={newGpaName} onChange={(e) => setNewGpaName(e.target.value)} className="col-span-2 text-xs p-1 bg-slate-50 dark:bg-slate-800 border rounded-lg" required />
                  <input type="number" min="5" max="90" placeholder="W%" value={newGpaWeight} onChange={(e) => setNewGpaWeight(parseInt(e.target.value))} className="text-xs p-1 bg-slate-50 dark:bg-slate-800 border rounded-lg" required />
                </div>
                <button type="submit" className="w-full py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold">Register course method</button>
              </form>
            </div>

            {/* Study Cycle & Reading Estimate */}
            <div className="liquid-glass p-5.5 rounded-3xl border shadow-sm space-y-3.5 text-left">
              <div>
                <span className="text-[10px] font-bold uppercase text-indigo-500">Resource Estimator</span>
                <h3 className="font-bold text-sm text-slate-800 dark:text-white">Study Reading Cycle Estimator</h3>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">Plans total duration blocks based on pages, difficulties, and active recall iterations.</p>

              <div className="space-y-2 pt-1 text-xs">
                <div className="flex justify-between items-center">
                  <span>Syllabus Pages: {pageCount}p</span>
                  <input type="range" min="5" max="250" step="5" value={pageCount} onChange={(e) => setPageCount(parseInt(e.target.value))} className="w-32" />
                </div>
                <div className="flex justify-between items-center">
                  <span>Reading Speed: {readSpeed} min/p</span>
                  <input type="range" min="1" max="10" value={readSpeed} onChange={(e) => setReadSpeed(parseInt(e.target.value))} className="w-32" />
                </div>
                <div className="flex justify-between items-center">
                  <span>Focus Efficiency: {focusEff}%</span>
                  <input type="range" min="40" max="100" step="5" value={focusEff} onChange={(e) => setFocusEff(parseInt(e.target.value))} className="w-32" />
                </div>
                <div className="flex justify-between items-center text-[10px] pt-1">
                  <span>Review cycles active recall?</span>
                  <input type="checkbox" checked={activeRecallCycles} onChange={() => setActiveRecallCycles(!activeRecallCycles)} className="rounded accent-emerald-500" />
                </div>
              </div>

              <div className="p-3.5 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 text-left">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-slate-500 uppercase font-mono text-[9px]">Est. Study Sessions</span>
                  <span className="font-black text-indigo-600 dark:text-indigo-400 text-sm">{estimatedReadingTimeMins} minutes</span>
                </div>
                <p className="text-[9.5px] text-slate-400 mt-1">Recommended schedule: {Math.ceil(estimatedReadingTimeMins / 25)} Pomodoro blocks of intense focused synthesis.</p>
              </div>
            </div>

            {/* Course Syllabus Checklist nested topics */}
            <div className="liquid-glass p-5.5 rounded-3xl border shadow-sm text-left flex flex-col justify-between">
              <div className="space-y-3.5">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">Chapters Master</span>
                  <h3 className="font-bold text-sm text-slate-800 dark:text-white">Syllabus Master Tracker</h3>
                </div>

                <div className="space-y-1.5 max-h-[160px] overflow-y-auto no-scrollbar">
                  {syllabusItems.map((sy) => (
                    <div key={sy.id} className="flex items-center justify-between bg-slate-50 dark:bg-[#161619] p-1.5 px-2 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                      <label className="flex items-center gap-2 cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          checked={sy.done}
                          onChange={() => {
                            setSyllabusItems(prev => prev.map(s => s.id === sy.id ? { ...s, done: !s.done } : s));
                            if (!sy.done) {
                              onAddXp("Mastered chapter chapter", 15);
                              setStudyCoins(c => c + 25);
                              playGameSound("coin");
                              triggerStatus("🦁 Chapter syllabus topic mastered! Earned 🪙 25 Coins!");
                            }
                          }}
                          className="rounded accent-emerald-500 cursor-pointer"
                        />
                        <div className="truncate text-slate-700 dark:text-slate-200">
                          <span className="text-[9px] bg-slate-200 dark:bg-slate-700 px-1 py-0.2 rounded font-black mr-1 text-slate-500 dark:text-slate-350">{sy.subject}</span>
                          <span className={sy.done ? "line-through text-slate-400" : "font-semibold"}>{sy.topic}</span>
                        </div>
                      </label>
                      <button onClick={() => setSyllabusItems(p => p.filter(s => s.id !== sy.id))} className="text-slate-400 hover:text-red-500 ml-1"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Topic */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newSyTopic.trim()) return;
                  const item = { id: `s-${Date.now()}`, subject: newSySub, topic: newSyTopic.trim(), done: false, difficulty: newSyDifficulty };
                  setSyllabusItems(p => [...p, item]);
                  setNewSyTopic("");
                  onAddXp("Mapped curriculum path topic", 5);
                  triggerStatus("Topic registered.");
                }}
                className="space-y-1.5 pt-2 border-t border-slate-150 dark:border-slate-800/80 mt-2"
              >
                <div className="flex flex-col gap-1.5">
                  <input type="text" placeholder="Chapter/topic name..." value={newSyTopic} onChange={(e) => setNewSyTopic(e.target.value)} className="text-xs p-1.5 bg-slate-50 dark:bg-slate-800 border rounded-lg w-full focus:outline-none focus:border-emerald-500" required />
                  <div className="flex flex-col gap-1 text-[10px] text-left">
                    <span className="font-bold text-[9.5px] text-slate-400">Course Subject: <span className="text-emerald-500 font-black">{newSySub}</span></span>
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 flex-wrap gap-0.5 w-full">
                      {[
                        { v: "Mathematics", l: "Math" },
                        { v: "Physics", l: "Phys" },
                        { v: "Chemistry", l: "Chem" },
                        { v: "Biology", l: "Bio" }
                      ].map((sub) => (
                        <button
                          key={sub.v}
                          type="button"
                          onClick={() => { setNewSySub(sub.v); playGameSound("click"); }}
                          className={`flex-1 py-0.5 font-bold rounded transition-all text-center ${newSySub === sub.v ? "bg-white dark:bg-slate-900 text-orange-500 shadow-sm" : "text-slate-500 dark:text-slate-400"}`}
                        >
                          {sub.l}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <button type="submit" className="w-full py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold">Map topic to checklist</button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 5: QUICK UTILITIES */}
        {activeBeastTab === "quick" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Beast Study Achievements & Quests Center */}
            <div className="bg-gradient-to-br from-[#121214] via-[#0b0a0e] to-[#0f0e13] p-5.5 rounded-3xl border border-indigo-500/20 shadow-lg text-left col-span-1 md:col-span-2 lg:col-span-3 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-indigo-500/10">
                <div>
                  <span className="text-[10px] font-black uppercase text-amber-400 tracking-widest flex items-center gap-1">
                    ✨ RPG STUDY QUESTS
                  </span>
                  <h3 className="font-bold text-base text-slate-100 flex items-center gap-1.5">
                    🏆 Beast Hub Achievement Board
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Total Claimed:</span>
                  <span className="bg-amber-500/20 text-amber-400 text-xs font-black px-2.5 py-0.5 rounded-full border border-amber-500/35">
                    {claimedQuests.length} / {questsList.length}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {questsList.map((quest) => {
                  const isClaimed = claimedQuests.includes(quest.id);
                  const progressPct = Math.round(Math.min(100, (quest.current / quest.target) * 100));
                  return (
                    <div 
                      key={quest.id} 
                      className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                        isClaimed 
                          ? "bg-slate-900/45 border-slate-800/80 text-slate-400 opacity-75"
                          : quest.isMet 
                            ? "bg-indigo-950/25 border-indigo-500/45 text-slate-100 animate-pulse"
                            : "bg-slate-950/40 border-slate-900/80 text-slate-300"
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-start gap-1">
                          <h4 className="font-bold text-[12px] tracking-tight">{quest.title}</h4>
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${isClaimed ? "bg-slate-800 text-slate-500" : quest.isMet ? "bg-indigo-500 text-white" : "bg-slate-900 text-slate-400"}`}>
                            {isClaimed ? "Claimed" : quest.isMet ? "Ready!" : "Progress"}
                          </span>
                        </div>
                        <p className="text-[10.5px] text-slate-400 leading-snug">{quest.desc}</p>
                      </div>

                      <div className="mt-4 space-y-2">
                        {/* Progress Bar */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px] font-mono text-slate-500">
                            <span>Status: {quest.current} / {quest.target}</span>
                            <span>{progressPct}%</span>
                          </div>
                          <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-500 ${isClaimed ? "bg-emerald-600/50" : quest.isMet ? "bg-indigo-500" : "bg-amber-500"}`}
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>

                        {/* Claim Button */}
                        <button
                          disabled={isClaimed || !quest.isMet}
                          onClick={() => handleClaimQuest(quest.id, quest.rewardCoins, quest.rewardXp, quest.title)}
                          className={`w-full py-1 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 ${
                            isClaimed 
                              ? "bg-slate-800/80 text-slate-500 cursor-not-allowed"
                              : quest.isMet 
                                ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black hover:scale-[1.02] cursor-pointer shadow-md shadow-yellow-500/10"
                                : "bg-slate-900 text-slate-500 border border-slate-850 cursor-not-allowed"
                          }`}
                        >
                          {isClaimed ? (
                            "Completed ✔"
                          ) : quest.isMet ? (
                            `Claim 🪙 ${quest.rewardCoins} Coins!`
                          ) : (
                            `Locked (Earn 🪙 ${quest.rewardCoins})`
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mindful Portal Breath Coach */}
            <div className="liquid-glass p-5.5 rounded-3xl border shadow-sm space-y-3.5 text-left">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">Pranayama Portal</span>
                  <h3 className="font-bold text-sm text-slate-800 dark:text-white">Deep Breathing Coach</h3>
                </div>
                <button onClick={() => { setBreathingActive(!breathingActive); speakText(breathingActive ? "Rest" : "Inhale"); }} className={`px-2.5 py-1 rounded text-[10px] font-bold ${breathingActive ? "bg-amber-500 text-white" : "bg-slate-100 dark:bg-slate-800"}`}>
                  {breathingActive ? "⏸ PAUSE" : "▶ START"}
                </button>
              </div>

              <div className="flex gap-1">
                {[["box", "Box (4-4)"], ["pranayama", "Yogi (12-6)"], ["calm", "4-7-8 Calm"]].map(([val, label]) => (
                  <button key={val} onClick={() => { setBreathPattern(val as any); setBreathState("Inhale"); setBreathSeconds(4); }} className={`flex-1 py-1 text-[9px] font-black uppercase transition-all rounded ${breathPattern === val ? "bg-indigo-600 text-white" : "bg-slate-55 dark:bg-slate-800"}`}>{label}</button>
                ))}
              </div>

              {/* Breathe Concentric Ring Visual representation */}
              <div className="flex flex-col items-center justify-center py-4 bg-slate-50 dark:bg-[#0c0d12] rounded-2xl relative overflow-hidden border border-slate-150/50 dark:border-slate-800">
                <div 
                  className={`w-20 h-20 rounded-full flex flex-col items-center justify-center font-bold text-white bg-gradient-to-tr from-teal-400 to-indigo-500 transition-all duration-1000 ${
                    breathingActive && breathState === "Inhale" ? "scale-125 shadow-lg shadow-teal-500/20" : breathingActive && breathState === "Hold" ? "scale-125 opacity-80" : "scale-75 opacity-60"
                  }`}
                >
                  <span className="text-sm font-mono font-black">{breathSeconds}s</span>
                </div>
                <span className="text-[10px] uppercase font-mono font-black text-indigo-500 mt-2.5">{breathingActive ? `${breathState}!` : "Ready to breathe"}</span>
                <div className="absolute bottom-2 left-2 flex items-center gap-1">
                  <span className="text-[9px] text-slate-400">Voice prompt</span>
                  <input type="checkbox" checked={enableVoiceGuide} onChange={() => setEnableVoiceGuide(!enableVoiceGuide)} className="rounded text-indigo-500 scale-90" />
                </div>
              </div>
            </div>

            {/* Hydration sloshing water bottle SVG */}
            <div className="liquid-glass p-5.5 rounded-3xl border shadow-sm space-y-4 text-left flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-indigo-500">Wellness Intake</span>
                <h3 className="font-bold text-sm text-slate-800 dark:text-white">Sloshing Hydration Logger</h3>
              </div>

              <div className="flex items-center gap-6 py-2">
                {/* SVG flask */}
                <div className="w-16 h-28 border-3 border-indigo-500/30 dark:border-indigo-500/50 rounded-b-2xl rounded-t-lg relative overflow-hidden shrink-0 bg-slate-50 dark:bg-[#151515]">
                  <div className="absolute top-1 left-1/2 -translate-x-1/2 w-4 h-1 border border-indigo-400" />
                  <div 
                    className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-blue-500 to-cyan-400 transition-all duration-500" 
                    style={{ height: `${Math.min(100, (waterCups / 8) * 100)}%` }}
                  >
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute -top-3 left-0 w-full h-4 text-cyan-400 fill-current animate-pulse">
                      <path d="M0,5 C30,10 70,0 100,5 L100,10 L0,10 Z" />
                    </svg>
                  </div>
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono font-black text-indigo-900 dark:text-indigo-100 mix-blend-difference">{Math.round((waterCups/8)*100)}%</span>
                </div>

                <div className="space-y-1.5 flex-1">
                  <span className="text-[11px] text-slate-400 block leading-tight">Hydration targets improve synaptic recall latency by up to 14%. Limit: 8 Cups.</span>
                  <div className="flex gap-2.5">
                    <button 
                      onClick={() => { 
                        setWaterCups(p => Math.min(12, p + 1)); 
                        setStudyCoins(c => c + 5); 
                        if (waterCups + 1 === 8) {
                          playGameSound("success");
                          triggerStatus("🏆 Hydration Target Achieved! +5🪙 Study Coins!");
                        } else {
                          playGameSound("bubble");
                        }
                      }} 
                      className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-bold"
                    >
                      +1 Cup (+5🪙)
                    </button>
                    <button onClick={() => { setWaterCups(0); playGameSound("click"); }} className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">Reset</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Cognitive math speed arcade game */}
            <div className="liquid-glass p-5.5 rounded-3xl border shadow-sm space-y-4 text-left flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400">Cognitive warm-up</span>
                <h3 className="font-bold text-sm text-slate-800 dark:text-white">Mental Agility Speed Sprints</h3>
              </div>

              {mathActive ? (
                <form onSubmit={handleMathSubmit} className="space-y-3 pt-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-mono bg-rose-500/15 text-rose-500 p-1 px-2.5 rounded-lg font-bold animate-pulse">⏳ {mathTimeLeft}s left</span>
                    <span className="font-bold text-amber-500">Combo: {mathStreak}x</span>
                  </div>

                  <div className="bg-slate-50 dark:bg-[#151515] p-3 rounded-2xl border text-center font-mono text-lg font-black tracking-widest text-indigo-600 dark:text-indigo-400">
                    {mathNum1} {mathOp} {mathNum2} = ?
                  </div>

                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      placeholder="Answer..." 
                      value={mathAnswer} 
                      onChange={(e) => setMathAnswer(e.target.value)} 
                      className="flex-1 text-xs p-2 bg-slate-100 dark:bg-slate-800 border rounded-xl" 
                      required 
                      autoFocus 
                    />
                    <button type="submit" className="px-4 bg-[#f26419] text-white font-bold rounded-xl text-xs">Check</button>
                  </div>
                </form>
              ) : (
                <div className="text-center py-2 space-y-3 flex-1 flex flex-col justify-center">
                  <div className="font-mono text-xs text-slate-400">
                    <span className="block">Arithmetic drills prime neural synapses.</span>
                    <span className="block mt-1">Highscore record: <span className="text-[#f26419] font-black">{mathHighScore} correct</span></span>
                  </div>
                  <button onClick={startMathSprint} className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs">START SPEED SPRINT (15s)</button>
                </div>
              )}
            </div>

            {/* EXPENSE STUDY BUDGET TRACKER */}
            <div className="liquid-glass p-5.5 rounded-3xl border shadow-sm space-y-4 text-left">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400">Desk Setup Budget</span>
                <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-1"><DollarSign className="w-4 h-4 text-emerald-500" /> Setup & Study Budgeting</h3>
              </div>

              {(() => {
                const totalCost = expenses.reduce((acc, e) => acc + e.cost, 0);
                const percent = Math.round((totalCost / budgetLimit) * 100);
                return (
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between items-center text-[10px] text-slate-400">
                      <span>Total: ${totalCost} / ${budgetLimit} limit</span>
                      <span className="font-bold text-[#f26419]">{percent}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full transition-all duration-300" style={{ width: `${Math.min(100, percent)}%` }} />
                    </div>

                    <div className="max-h-[90px] overflow-y-auto no-scrollbar space-y-1">
                      {expenses.map((e) => (
                        <div key={e.id} className="flex justify-between bg-slate-50 dark:bg-[#161619] p-1 rounded border text-[10.5px]">
                          <span className="truncate max-w-[130px] font-semibold">{e.item} ({e.category})</span>
                          <div className="flex items-center gap-1 font-mono">
                            <span>${e.cost}</span>
                            <button onClick={() => setExpenses(p => p.filter(ex=>ex.id!==e.id))} className="text-red-500 scale-90">✕</button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!expenseItem.trim() || expenseCost <= 0) return;
                        const item = { id: `e-${Date.now()}`, item: expenseItem.trim(), cost: expenseCost, category: expenseCategory };
                        setExpenses(p => [item, ...p]);
                        setExpenseItem(""); setExpenseCost(0);
                        onAddXp("Logged workspace layout expense", 5);
                      }}
                      className="grid grid-cols-3 gap-1 pt-1.5 border-t border-slate-100 dark:border-slate-850"
                    >
                      <input type="text" placeholder="Keycap/Book..." value={expenseItem} onChange={(e) => setExpenseItem(e.target.value)} className="text-[10px] p-1 bg-slate-50 dark:bg-slate-800 border rounded" required />
                      <input type="number" placeholder="Cost" value={expenseCost || ""} onChange={(e) => setExpenseCost(parseInt(e.target.value))} className="text-[10px] p-1 bg-slate-50 dark:bg-slate-800 border rounded" required />
                      <button type="submit" className="bg-emerald-600 text-white text-[9px] font-bold rounded">Log</button>
                    </form>
                  </div>
                );
              })()}
            </div>

            {/* MOTIVATIONAL VISION STICKER BOARD PINBOARD */}
            <div className="liquid-glass p-5.5 rounded-3xl border shadow-sm space-y-3 text-left">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400">Vision Board</span>
                <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-1"><ShoppingBag className="w-4 h-4 text-orange-500" /> Sticker Vision Pinboard</h3>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">Redeem Study Coins to purchase motivational stickers, then pin them onto the dashboard workspace!</p>

              {/* Pinboard Area */}
              <div className="h-28 w-full bg-slate-50 dark:bg-[#18181b] border border-slate-200/60 dark:border-slate-800 rounded-xl relative overflow-hidden select-none">
                <span className="absolute inset-0 flex items-center justify-center text-[8.5px] font-mono text-slate-400/50 uppercase">Sticker vision board workspace</span>
                {pinnedStickers.map((st) => (
                  <motion.div
                    key={st.id}
                    drag
                    dragConstraints={{ left: 5, right: 280, top: 5, bottom: 80 }}
                    style={{ left: st.x, top: st.y }}
                    className="absolute text-2xl cursor-move active:scale-110 select-none p-1 bg-white/20 dark:bg-black/20 rounded shadow-xs"
                    title="Drag me!"
                  >
                    {st.emoji}
                  </motion.div>
                ))}
              </div>

              {/* Store & Owned badges */}
              <div className="flex gap-1.5 pt-1 overflow-x-auto no-scrollbar">
                {stickerStore.map((st) => {
                  const owned = ownedStickers.includes(st.name);
                  return (
                    <button
                      key={st.name}
                      onClick={() => {
                        if (owned) {
                          // Pin sticker to visual board
                          const pin = { id: `st-${Date.now()}`, name: st.name, emoji: st.emoji, x: Math.floor(Math.random() * 180 + 20), y: Math.floor(Math.random()*40 + 10) };
                          setPinnedStickers(p => [...p, pin]);
                          triggerStatus(`Pinned ${st.emoji} sticker onto workspace!`);
                        } else {
                          if (studyCoins >= st.price) {
                            setStudyCoins(c => c - st.price);
                            setOwnedStickers(p => [...p, st.name]);
                            triggerStatus(`Purchased ${st.name} from emporium!`);
                          } else {
                            triggerStatus("Insufficient coins!");
                          }
                        }
                        playKeyboardClack();
                      }}
                      className={`p-2 rounded-xl text-center border text-[10px] font-bold shrink-0 cursor-pointer ${
                        owned ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "bg-slate-50 dark:bg-slate-800 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <span className="block text-base">{st.emoji}</span>
                      <span>{owned ? "Pin Sticker" : `Buy 🪙${st.price}`}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Exam Milestone tracker */}
            <div className="liquid-glass p-5.5 rounded-3xl border shadow-sm space-y-4 text-left flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400">Target Countdown</span>
                <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-1"><Calendar className="w-4 h-4 text-indigo-500" /> Milestone Target Exam</h3>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-[#161619] rounded-2xl border text-center relative overflow-hidden">
                <span className="text-[10px] uppercase font-mono font-black text-[#f26419] block">{examName}</span>
                <span className="text-sm font-black font-mono text-slate-800 dark:text-neutral-50 block mt-1 tracking-tight">{countdownText}</span>
              </div>

              <div className="space-y-1.5 text-xs pt-1.5 border-t border-slate-100 dark:border-slate-850">
                <div className="grid grid-cols-2 gap-1.5">
                  <input type="text" placeholder="Exam target title..." value={examName} onChange={(e) => setExamName(e.target.value)} className="text-[10px] p-1 bg-slate-50 dark:bg-slate-800 border rounded" />
                  <input type="datetime-local" value={examDate} onChange={(e) => setExamDate(e.target.value)} className="text-[10px] p-1 bg-slate-50 dark:bg-slate-800 border rounded font-mono" />
                </div>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Spaced Repetition Bulk Importer Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#121212] p-5 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 space-y-4 text-left shadow-2xl">
            <div className="space-y-0.5">
              <h3 className="text-sm font-black text-slate-800 dark:text-white">Bulk Compile Study Cards</h3>
              <p className="text-[11px] text-slate-400">Enter flashcards on separate lines. Standard format: question? answer</p>
            </div>
            <textarea
              value={bulkFcText}
              onChange={(e) => setBulkFcText(e.target.value)}
              placeholder="What is the equation of gravity? F = G(m1*m2)/r^2&#10;What is NaCl? Sodium Chloride / Table Salt"
              className="w-full h-40 bg-slate-50 dark:bg-slate-800/50 text-xs p-3 border rounded-2xl focus:outline-none focus:border-indigo-500 font-mono"
            />
            <div className="flex justify-end gap-2 text-xs">
              <button onClick={() => setShowBulkModal(false)} className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold">Cancel</button>
              <button onClick={handleBulkImport} className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold">Compile Cards</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default React.memo(BeastHub);

