import React, { useState, useEffect, useRef } from "react";
import { 
  Bell, 
  BellOff, 
  Volume2, 
  Plus, 
  Trash, 
  Check, 
  Clock, 
  Sparkles, 
  ShieldCheck, 
  Dumbbell, 
  BookOpen, 
  ChevronDown, 
  ChevronUp, 
  Play, 
  HelpCircle, 
  Info, 
  Lock, 
  AlertTriangle, 
  Sliders, 
  Music, 
  Activity, 
  Trash2, 
  ListFilter 
} from "lucide-react";
import { Subject, Reminder, NotificationSettings } from "../types";
import { db, handleFirestoreError, OperationType } from "../lib/googleApi";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { User } from "firebase/auth";

// Synthesis of high-quality ambient sound wave chimes natively using the Web Audio API
export const playChime = (preset: "chime" | "success" | "break" = "chime") => {
  try {
    // 1. Trigger robust physical haptic engine alarms on mobile devices if supported (Android/Safari support)
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      if (preset === "chime") {
        // Rhythmic alert vibration: pulse-pause-pulse-pause-longer pulse
        navigator.vibrate([350, 100, 350, 100, 600]);
      } else if (preset === "success") {
        // Fast dual success pulse
        navigator.vibrate([180, 80, 180]);
      } else {
        // Deep warning hum vibration
        navigator.vibrate([500, 150, 500]);
      }
    }

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // Check if the user has customized synthesizer overrides in localStorage
    const isCustomSynth = localStorage.getItem("custom_synth_enabled") === "true";
    if (isCustomSynth && preset === "chime") {
      const customWave = (localStorage.getItem("custom_synth_wave") || "sine") as OscillatorType;
      const customPitch = Number(localStorage.getItem("custom_synth_pitch") || "523.25");
      const customDecay = Number(localStorage.getItem("custom_synth_duration") || "1.2");
      const customGainPct = Number(localStorage.getItem("custom_synth_gain") || "85") / 100;
      
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.type = customWave;
      osc.frequency.setValueAtTime(customPitch, ctx.currentTime);
      
      // Warm frequency pitch glide for richer acoustic chime
      osc.frequency.exponentialRampToValueAtTime(customPitch * 1.08, ctx.currentTime + customDecay);
      
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(customGainPct, ctx.currentTime + 0.08);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + customDecay);
      
      osc.start();
      osc.stop(ctx.currentTime + customDecay + 0.15);
      return;
    }
    
    if (preset === "chime") {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc1.type = "sine";
      osc2.type = "triangle";
      
      osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5 frequency
      osc1.frequency.exponentialRampToValueAtTime(587.33, ctx.currentTime + 1.0); // Pitch drift
      osc2.frequency.setValueAtTime(659.25, ctx.currentTime); // E5 major
      
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.85, ctx.currentTime + 0.08); 
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.25);
      
      osc1.start();
      osc2.start();
      
      setTimeout(() => {
        const osc3 = ctx.createOscillator();
        const gain3 = ctx.createGain();
        osc3.connect(gain3);
        gain3.connect(ctx.destination);
        osc3.type = "sine";
        osc3.frequency.setValueAtTime(783.99, ctx.currentTime); // G5 ascending pitch
        gain3.gain.setValueAtTime(0, ctx.currentTime);
        gain3.gain.linearRampToValueAtTime(0.75, ctx.currentTime + 0.05); 
        gain3.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.9);
        osc3.start();
        osc3.stop(ctx.currentTime + 1.0);
      }, 150);
      
      osc1.stop(ctx.currentTime + 1.4);
      osc2.stop(ctx.currentTime + 1.4);
    } else if (preset === "success") {
      // Arpeggio chimes indicating successful completion
      const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
        gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.1);
        gain.gain.linearRampToValueAtTime(0.72, ctx.currentTime + idx * 0.1 + 0.05); 
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + idx * 0.1 + 0.6);
        osc.start(ctx.currentTime + idx * 0.1);
        osc.stop(ctx.currentTime + idx * 0.1 + 0.7);
      });
    } else {
      // Relaxing low pitch hum for long rest reminders
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(293.66, ctx.currentTime); // D4 code base
      osc.frequency.exponentialRampToValueAtTime(329.63, ctx.currentTime + 0.6);
      
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.90, ctx.currentTime + 0.08); 
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 2.0);
      osc.start();
      osc.stop(ctx.currentTime + 2.2);
    }
  } catch (err) {
    console.warn("Dynamic Audio Chime Synthesizer warning:", err);
  }
};

interface NotificationHistoryItem {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  type: string; // 'pomo' | 'rem' | 'test'
}

interface RemindersHubProps {
  subjects: Subject[];
  reminders: Reminder[];
  onAddReminder: (reminder: Omit<Reminder, "id" | "isCompleted" | "triggeredAt">) => void;
  onToggleReminder: (reminderId: string) => void;
  onRemoveReminder: (reminderId: string) => void;
  notificationPermission?: NotificationPermission;
  audioAutoplayApproved?: boolean;
  onGrantPermissions?: () => void;
  notificationSettings?: NotificationSettings;
  onUpdateNotificationSettings?: (settings: NotificationSettings) => void;
  currentUser?: User | null;
}

export default function RemindersHub({
  subjects,
  reminders,
  onAddReminder,
  onToggleReminder,
  onRemoveReminder,
  notificationPermission,
  audioAutoplayApproved,
  onGrantPermissions,
  notificationSettings = {
    enableDesktopBanners: true,
    enableSoundEffects: true,
    notifyOnTimerAlerts: true,
    notifyOnReminderDue: true,
    notifyOnDailyGoalMet: true,
    notifyOnLevelUp: true,
    activeSoundPreset: "chime"
  },
  onUpdateNotificationSettings = () => {},
  currentUser = null
}: RemindersHubProps) {
  const [localPermissionStatus, setLocalPermissionStatus] = useState<NotificationPermission>("default");
  const [localAudioAutoplayApproved, setLocalAudioAutoplayApproved] = useState<boolean>(() => {
    return localStorage.getItem("audio_autoplay_approved") === "true";
  });
  
  const isIframe = typeof window !== "undefined" && window.self !== window.top;
  
  const handleOpenNewTab = () => {
    if (typeof window !== "undefined") {
      window.open(window.location.href, "_blank");
    }
  };
  
  // Custom states
  const [remText, setRemText] = useState("");
  const [remType, setRemType] = useState<"daily" | "one-shot" | "timer">("daily");
  const [remTime, setRemTime] = useState("18:00");
  const [remTimerMins, setRemTimerMins] = useState(30);
  const [selectedSubId, setSelectedSubId] = useState("");
  
  // Chrome test sandbox states
  const [testCountdown, setTestCountdown] = useState<number | null>(null);
  const [selectedTestTone, setSelectedTestTone] = useState<"chime" | "success" | "break">("chime");
  const [isChromeGuideOpen, setIsChromeGuideOpen] = useState(false);
  const [customTestTitle, setCustomTestTitle] = useState("You did it! Study session completed!");
  const [customTestBody, setCustomTestBody] = useState("🍅 Great job! Keep maintaining your hyperfocused study streak!");

  // Synthesizer Customizer States
  const [synthEnabled, setSynthEnabled] = useState(() => localStorage.getItem("custom_synth_enabled") === "true");
  const [synthWave, setSynthWave] = useState<OscillatorType>(() => (localStorage.getItem("custom_synth_wave") as OscillatorType) || "sine");
  const [synthPitch, setSynthPitch] = useState(() => Number(localStorage.getItem("custom_synth_pitch") || "523.25"));
  const [synthDuration, setSynthDuration] = useState(() => Number(localStorage.getItem("custom_synth_duration") || "1.2"));
  const [synthGain, setSynthGain] = useState(() => Number(localStorage.getItem("custom_synth_gain") || "85"));

  // Audit Logs / History trace states
  const [historyLogs, setHistoryLogs] = useState<NotificationHistoryItem[]>(() => {
    const saved = localStorage.getItem("study_notification_history");
    return saved ? JSON.parse(saved) : [];
  });
  const [historyFilter, setHistoryFilter] = useState<"all" | "pomo" | "rem" | "test">("all");

  // Live Timer Countdown ticking state
  const [tickerTime, setTickerTime] = useState(Date.now());

  // Canvas visualizer reference
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 1. Fetch from Firestore if user is logged in (Pillar compliance)
  useEffect(() => {
    if (!currentUser) return;
    const fetchCloudSettings = async () => {
      try {
        const docSnap = await getDoc(doc(db, "users", currentUser.uid, "settings", "synth"));
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.synthEnabled !== undefined) setSynthEnabled(data.synthEnabled);
          if (data.synthWave !== undefined) setSynthWave(data.synthWave as OscillatorType);
          if (data.synthPitch !== undefined) setSynthPitch(data.synthPitch);
          if (data.synthDuration !== undefined) setSynthDuration(data.synthDuration);
          if (data.synthGain !== undefined) setSynthGain(data.synthGain);
        }

        const histSnap = await getDoc(doc(db, "users", currentUser.uid, "settings", "history"));
        if (histSnap.exists()) {
          const data = histSnap.data();
          if (data.historyLogs !== undefined) setHistoryLogs(data.historyLogs);
        }
      } catch (err) {
        console.warn("Failed loading custom synthesizer settings from cloud profile:", err);
      }
    };
    fetchCloudSettings();
  }, [currentUser]);

  // Sync synthesizer configurations to localStorage and Firestore
  useEffect(() => {
    localStorage.setItem("custom_synth_enabled", String(synthEnabled));
    localStorage.setItem("custom_synth_wave", synthWave);
    localStorage.setItem("custom_synth_pitch", String(synthPitch));
    localStorage.setItem("custom_synth_duration", String(synthDuration));
    localStorage.setItem("custom_synth_gain", String(synthGain));

    if (currentUser) {
      setDoc(doc(db, "users", currentUser.uid, "settings", "synth"), {
        synthEnabled,
        synthWave,
        synthPitch,
        synthDuration,
        synthGain
      }, { merge: true }).catch(err => {
        handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.uid}/settings/synth`);
      });
    }
  }, [synthEnabled, synthWave, synthPitch, synthDuration, synthGain, currentUser]);

  // Sync history/audit logs to Firestore for secure backups
  useEffect(() => {
    localStorage.setItem("study_notification_history", JSON.stringify(historyLogs));
    if (currentUser) {
      setDoc(doc(db, "users", currentUser.uid, "settings", "history"), {
        historyLogs
      }, { merge: true }).catch(err => {
        handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.uid}/settings/history`);
      });
    }
  }, [historyLogs, currentUser]);

  // Read study notification logs from localStorage periodically to handle cross-system changes
  useEffect(() => {
    const syncLogs = () => {
      const saved = localStorage.getItem("study_notification_history");
      if (saved) {
        try {
          setHistoryLogs(JSON.parse(saved));
        } catch (err) {
          console.warn("Sync logs parse failure:", err);
        }
      }
    };

    window.addEventListener("storage", syncLogs);
    const logInterval = setInterval(syncLogs, 1500);

    return () => {
      window.removeEventListener("storage", syncLogs);
      clearInterval(logInterval);
    };
  }, []);

  // Set up live countdown ticker
  useEffect(() => {
    const tick = setInterval(() => {
      setTickerTime(Date.now());
    }, 15000); // refresh every 15s for visual countdowns

    return () => clearInterval(tick);
  }, []);

  // Animates a clean Oscilloscope wave shape on user-action chime play matches
  const triggerCanvasWaveform = (waveTypeStr: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = 0;
    const maxFrames = 50;

    const render = () => {
      if (frame >= maxFrames) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Beautiful gradient strike matching custom color ranges
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
      gradient.addColorStop(0, "rgba(99, 102, 241, 0.95)"); // Indigo
      gradient.addColorStop(0.5, "rgba(242, 100, 25, 0.95)"); // Focal Orange
      gradient.addColorStop(1, "rgba(168, 85, 247, 0.95)"); // Purple

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 3;
      ctx.shadowBlur = 4;
      ctx.shadowColor = "rgba(99, 102, 241, 0.4)";
      ctx.beginPath();

      const width = canvas.width;
      const height = canvas.height;
      const midY = height / 2;
      const amplitude = (1 - frame / maxFrames) * (height * 0.38);

      for (let x = 0; x < width; x++) {
        const progress = x / width;
        let y = midY;

        // Custom mathematical models indicating audio physics waveforms
        if (waveTypeStr === "sine") {
          y = midY + Math.sin(progress * Math.PI * 6.5 + frame * 0.4) * amplitude;
        } else if (waveTypeStr === "triangle") {
          const formula = (progress * 7 + frame * 0.25) % 2;
          y = midY + (Math.abs(formula - 1) * 2 - 1) * amplitude;
        } else if (waveTypeStr === "square") {
          const val = Math.sin(progress * Math.PI * 5.5 + frame * 0.3);
          y = midY + (val >= 0 ? amplitude : -amplitude);
        } else if (waveTypeStr === "sawtooth") {
          const formula = (progress * 8.5 + frame * 0.32) % 1;
          y = midY + (formula - 0.5) * 2 * amplitude;
        }

        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      ctx.stroke();
      frame++;
      requestAnimationFrame(render);
    };

    render();
  };

  const sendRobustDeviceNotification = (title: string, body: string) => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    try {
      // Record this newly pushed notification directly in the status log
      const rawHist = localStorage.getItem("study_notification_history");
      const arr = rawHist ? JSON.parse(rawHist) : [];
      const newLog: NotificationHistoryItem = {
        id: `history-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        title,
        body,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        type: "test"
      };
      const updated = [newLog, ...arr].slice(0, 50);
      localStorage.setItem("study_notification_history", JSON.stringify(updated));
      setHistoryLogs(updated);

      if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification(title, {
            body: body,
            icon: "/favicon.ico",
            badge: "/favicon.ico",
            vibrate: [300, 100, 300],
            tag: "study-alarm-test",
            requireInteraction: true
          } as any);
        }).catch((err) => {
          console.warn("ServiceWorker showNotification failed, trying fallback:", err);
          try {
            new Notification(title, { body, icon: "/favicon.ico" });
          } catch (fallbackErr) {
            console.error("Direct Notification constructor failed:", fallbackErr);
          }
        });
      } else {
        try {
          new Notification(title, { body, icon: "/favicon.ico" });
        } catch (err) {
          console.warn("Direct Notification constructor failed in fallback path:", err);
        }
      }
    } catch (err) {
      console.warn("Notification presentation failed:", err);
    }
  };

  useEffect(() => {
    if (testCountdown === null) return;
    if (testCountdown <= 0) {
      const isCustom = localStorage.getItem("custom_synth_enabled") === "true";
      const actualWave = isCustom ? (localStorage.getItem("custom_synth_wave") || "sine") : selectedTestTone;
      
      playChime(selectedTestTone);
      triggerCanvasWaveform(actualWave);
      sendRobustDeviceNotification(customTestTitle, customTestBody);
      setTestCountdown(null);
      return;
    }

    const timer = setTimeout(() => {
      setTestCountdown(prev => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [testCountdown, selectedTestTone, customTestTitle, customTestBody]);

  const handleImmediatePushTest = () => {
    const isCustom = synthEnabled;
    const actualWave = isCustom ? synthWave : selectedTestTone;

    playChime(selectedTestTone);
    triggerCanvasWaveform(actualWave);
    
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission !== "granted") {
        handleRequestPermission();
        return;
      }
      sendRobustDeviceNotification(customTestTitle, customTestBody);
    }
  };

  const handleStartDelayedTest = () => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission().then(() => {
        setTestCountdown(5);
      });
    } else {
      setTestCountdown(5);
    }
  };
  
  const permissionStatus = notificationPermission !== undefined ? notificationPermission : localPermissionStatus;
  const isAudioApproved = audioAutoplayApproved !== undefined ? audioAutoplayApproved : localAudioAutoplayApproved;

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setLocalPermissionStatus(Notification.permission);
    }
  }, []);

  const handleRequestPermission = async () => {
    if (onGrantPermissions) {
      onGrantPermissions();
    } else {
      if (!("Notification" in window)) return;
      try {
        const outcome = await Notification.requestPermission();
        setLocalPermissionStatus(outcome);
        playChime("success");
        triggerCanvasWaveform("sine");
        localStorage.setItem("audio_autoplay_approved", "true");
        setLocalAudioAutoplayApproved(true);
      } catch (err) {
        console.error("OS notification request fail:", err);
      }
    }
  };

  const handleTestChimeOnly = () => {
    playChime("success");
    triggerCanvasWaveform(synthEnabled ? synthWave : "sine");
    localStorage.setItem("audio_autoplay_approved", "true");
    setLocalAudioAutoplayApproved(true);
  };

  const submitReminderForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!remText.trim()) return;

    onAddReminder({
      title: remText.trim(),
      type: remType,
      time: remType === "timer" ? String(remTimerMins) : remTime,
      durationMinutes: remType === "timer" ? remTimerMins : undefined,
      isActive: true,
      subjectId: selectedSubId || undefined,
    });

    setRemText("");
    setSelectedSubId("");
    
    playChime("chime");
    triggerCanvasWaveform(synthEnabled ? synthWave : "sine");
  };

  const handleSeedPreset = (title: string, type: "daily" | "timer", timeOrMins: string | number) => {
    onAddReminder({
      title,
      type,
      time: String(timeOrMins),
      durationMinutes: type === "timer" ? Number(timeOrMins) : undefined,
      isActive: true,
    });
    
    playChime("success");
    triggerCanvasWaveform(synthEnabled ? synthWave : "sine");
  };

  // Helper: Live Countdown calculator for Daily/Once Off scheduled reminders
  const getRemainingTimeStr = (remTimeStr: string, typeStr: "daily" | "one-shot" | "timer") => {
    if (typeStr === "timer") {
      return "Linked to active focus sessions";
    }
    
    try {
      const [hh, mm] = remTimeStr.split(":").map(Number);
      const now = new Date(tickerTime);
      const alarmDate = new Date(tickerTime);
      alarmDate.setHours(hh, mm, 0, 0);
      
      if (alarmDate.getTime() <= now.getTime()) {
        if (typeStr === "daily") {
          alarmDate.setDate(alarmDate.getDate() + 1);
        } else {
          return "Expired / trigger completed";
        }
      }
      
      const diffMs = alarmDate.getTime() - now.getTime();
      const diffMins = Math.ceil(diffMs / 60000);
      
      if (diffMins <= 0) return "Fires momentarily!";
      if (diffMins < 60) {
        return `Triggers in ${diffMins}m`;
      }
      const hrs = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return `Triggers in ${hrs}h ${mins}m`;
    } catch (err) {
      return "";
    }
  };

  const handleClearSingleHistory = (id: string) => {
    const updated = historyLogs.filter(log => log.id !== id);
    setHistoryLogs(updated);
    localStorage.setItem("study_notification_history", JSON.stringify(updated));
  };

  const handleClearAllHistory = () => {
    setHistoryLogs([]);
    localStorage.setItem("study_notification_history", JSON.stringify([]));
  };

  const filteredHistory = historyLogs.filter(log => {
    if (historyFilter === "all") return true;
    return log.type === historyFilter;
  });

  return (
    <div className="space-y-6 pt-1 text-slate-800 dark:text-slate-100" id="f5-reminders-canvas">
      
      {/* 1. Bento Dashboard Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Metric A: Security Channel State */}
        <div className="p-4 rounded-3xl bg-slate-50 dark:bg-[#141414] border border-slate-200/50 dark:border-slate-900/50 flex flex-col justify-between text-left relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <ShieldCheck className="w-16 h-16 text-indigo-500" />
          </div>
          <div>
            <span className="block text-[9.5px] uppercase font-black tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Authorized Channels Status
            </span>
            <div className="flex gap-2 items-center mt-1">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                permissionStatus === "granted" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-500"
              }`}>
                OS Banner: {permissionStatus}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                isAudioApproved ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-500"
              }`}>
                Audio: {isAudioApproved ? "Unlocked" : "Blocked"}
              </span>
            </div>
          </div>
          <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-2">
            Status checks for background push security and native synthesizer alarms.
          </p>
        </div>

        {/* Metric B: Reminders Count */}
        <div className="p-4 rounded-3xl bg-slate-50 dark:bg-[#141414] border border-slate-200/50 dark:border-slate-900/50 flex flex-col justify-between text-left relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <Clock className="w-16 h-16 text-[#f26419]" />
          </div>
          <div>
            <span className="block text-[9.5px] uppercase font-black tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Active Reminder Slots
            </span>
            <h4 className="text-2xl font-black text-slate-800 dark:text-white leading-none">
              {reminders.filter(r => r.isActive).length} <span className="text-xs font-semibold text-slate-550">Active</span> 
              <span className="text-slate-400 mx-1.5">/</span> 
              {reminders.length} <span className="text-xs font-semibold text-slate-550 font-sans">Total</span>
            </h4>
          </div>
          <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-2">
            Configured daily cron clocks, timers, and specialized water or posture cycles.
          </p>
        </div>

        {/* Metric C: Fired Notification Count */}
        <div className="p-4 rounded-3xl bg-slate-50 dark:bg-[#141414] border border-slate-200/50 dark:border-slate-900/50 flex flex-col justify-between text-left relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <Activity className="w-16 h-16 text-emerald-500" />
          </div>
          <div>
            <span className="block text-[9.5px] uppercase font-black tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Dispatched Alerts History
            </span>
            <h4 className="text-2xl font-black text-slate-800 dark:text-white leading-none">
              {historyLogs.length} <span className="text-xs font-semibold text-slate-550">Dispatched Triggers</span>
            </h4>
          </div>
          <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-2">
            Historical audit log of all system alarms and device tests fired since setup.
          </p>
        </div>
      </div>

      {/* 2. Minimalist Notification Settings Control Panel */}
      <div className="liquid-glass p-5 sm:p-6 rounded-3xl shadow-xl space-y-5 text-left border">
        {/* Header with Title & Permission Trigger */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl shrink-0">
              <Bell className="w-4.5 h-4.5" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold tracking-tight text-slate-800 dark:text-slate-100">Notification Settings</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">Configure alert preferences and sound presets.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {permissionStatus === "granted" && isAudioApproved ? (
              <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/20 inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Active
              </span>
            ) : (
              <button
                type="button"
                onClick={handleRequestPermission}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-[10px] font-bold text-white uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm"
              >
                Grant Permissions
              </button>
            )}
          </div>
        </div>

        {/* Iframe Hint */}
        {isIframe && (
          <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-3.5 text-xs text-slate-600 dark:text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="leading-relaxed flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>OS notifications and audio may be restricted inside preview frames.</span>
            </p>
            <button
              type="button"
              onClick={handleOpenNewTab}
              className="text-[10px] font-bold text-[#f26419] hover:underline shrink-0 cursor-pointer"
            >
              Open New Tab 🚀
            </button>
          </div>
        )}

        {/* Toggles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
          {/* Channel Preferences */}
          <div className="space-y-4">
            <span className="block text-[10px] uppercase font-black tracking-widest text-slate-400">Delivery Channels</span>
            
            <div className="flex items-center justify-between gap-4">
              <div className="text-left">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Deliver System Banner Popups</label>
                <span className="text-[10px] text-slate-500">Show local OS toast notifications when alerts fire.</span>
              </div>
              <button
                type="button"
                onClick={() => onUpdateNotificationSettings({ ...notificationSettings, enableDesktopBanners: !notificationSettings.enableDesktopBanners })}
                className={`w-9 h-5 rounded-full transition-colors relative flex items-center shrink-0 cursor-pointer ${notificationSettings.enableDesktopBanners ? "bg-[#f26419]" : "bg-slate-300 dark:bg-slate-800"}`}
              >
                <span className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform absolute ${notificationSettings.enableDesktopBanners ? "translate-x-4.5" : "translate-x-0.5"}`} />
              </button>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="text-left">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Play Resonant Synth Sounds</label>
                <span className="text-[10px] text-slate-500">Enable chime and bell audio alerts on events.</span>
              </div>
              <button
                type="button"
                onClick={() => onUpdateNotificationSettings({ ...notificationSettings, enableSoundEffects: !notificationSettings.enableSoundEffects })}
                className={`w-9 h-5 rounded-full transition-colors relative flex items-center shrink-0 cursor-pointer ${notificationSettings.enableSoundEffects ? "bg-[#f26419]" : "bg-slate-300 dark:bg-slate-800"}`}
              >
                <span className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform absolute ${notificationSettings.enableSoundEffects ? "translate-x-4.5" : "translate-x-0.5"}`} />
              </button>
            </div>

            {/* Sound Preset Selector */}
            <div className="pt-1.5">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-[10px] uppercase font-black text-slate-400">Alert Audio Tone</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 font-bold">Custom Wave</span>
                  <button
                    type="button"
                    onClick={() => setSynthEnabled(!synthEnabled)}
                    className={`w-7 h-3.5 rounded-full transition-colors relative flex items-center shrink-0 cursor-pointer ${synthEnabled ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-800"}`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full bg-white shadow-sm transition-transform absolute ${synthEnabled ? "translate-x-3.5" : "translate-x-0.5"}`} />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/50 dark:border-slate-900/60">
                {(["chime", "success", "break"] as const).map((tone) => (
                  <button
                    key={tone}
                    type="button"
                    onClick={() => {
                      onUpdateNotificationSettings({ ...notificationSettings, activeSoundPreset: tone });
                      playChime(tone);
                    }}
                    className={`py-1.5 rounded-lg text-center text-[10px] font-bold cursor-pointer transition-colors ${
                      notificationSettings.activeSoundPreset === tone
                        ? "bg-[#f26419] text-white shadow-sm"
                        : "text-slate-550 hover:text-slate-850 dark:text-slate-400 dark:hover:text-slate-200"
                    }`}
                  >
                    {tone === "chime" ? "Classic Bell" : tone === "success" ? "Ascent Arp" : "Chill Hum"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Alarm Subscription Prefs */}
          <div className="space-y-4 md:border-l border-slate-150 dark:border-slate-900 md:pl-5">
            <span className="block text-[10px] uppercase font-black tracking-widest text-slate-400">Mute / Unmute Alarms</span>

            <div className="flex items-center justify-between gap-4">
              <div className="text-left">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Focus Session Finished</label>
                <span className="text-[10px] text-slate-555 dark:text-slate-500">Ring sound when Pomodoro/focus timer reaches zero.</span>
              </div>
              <button
                type="button"
                onClick={() => onUpdateNotificationSettings({ ...notificationSettings, notifyOnTimerAlerts: !notificationSettings.notifyOnTimerAlerts })}
                className={`w-9 h-5 rounded-full transition-colors relative flex items-center shrink-0 cursor-pointer ${notificationSettings.notifyOnTimerAlerts ? "bg-[#f26419]" : "bg-slate-300 dark:bg-slate-800"}`}
              >
                <span className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform absolute ${notificationSettings.notifyOnTimerAlerts ? "translate-x-4.5" : "translate-x-0.5"}`} />
              </button>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="text-left">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Schedule & Reminder Alarms</label>
                <span className="text-[10px] text-slate-555 dark:text-slate-500">Alert when scheduled reminders or task due-times arrive.</span>
              </div>
              <button
                type="button"
                onClick={() => onUpdateNotificationSettings({ ...notificationSettings, notifyOnReminderDue: !notificationSettings.notifyOnReminderDue })}
                className={`w-9 h-5 rounded-full transition-colors relative flex items-center shrink-0 cursor-pointer ${notificationSettings.notifyOnReminderDue ? "bg-[#f26419]" : "bg-slate-300 dark:bg-slate-800"}`}
              >
                <span className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform absolute ${notificationSettings.notifyOnReminderDue ? "translate-x-4.5" : "translate-x-0.5"}`} />
              </button>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="text-left">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Daily Study Goal Completed</label>
                <span className="text-[10px] text-slate-555 dark:text-slate-500">Trigger notification and celebration sound upon target completion.</span>
              </div>
              <button
                type="button"
                onClick={() => onUpdateNotificationSettings({ ...notificationSettings, notifyOnDailyGoalMet: !notificationSettings.notifyOnDailyGoalMet })}
                className={`w-9 h-5 rounded-full transition-colors relative flex items-center shrink-0 cursor-pointer ${notificationSettings.notifyOnDailyGoalMet ? "bg-[#f26419]" : "bg-slate-300 dark:bg-slate-800"}`}
              >
                <span className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform absolute ${notificationSettings.notifyOnDailyGoalMet ? "translate-x-4.5" : "translate-x-0.5"}`} />
              </button>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="text-left">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">XP Levels & Milestones</label>
                <span className="text-[10px] text-slate-555 dark:text-slate-500">Celebrate with ascending chimes when upgrading levels.</span>
              </div>
              <button
                type="button"
                onClick={() => onUpdateNotificationSettings({ ...notificationSettings, notifyOnLevelUp: !notificationSettings.notifyOnLevelUp })}
                className={`w-9 h-5 rounded-full transition-colors relative flex items-center shrink-0 cursor-pointer ${notificationSettings.notifyOnLevelUp ? "bg-[#f26419]" : "bg-slate-300 dark:bg-slate-800"}`}
              >
                <span className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform absolute ${notificationSettings.notifyOnLevelUp ? "translate-x-4.5" : "translate-x-0.5"}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Quick Test Trigger Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-900/60 text-xs text-slate-500">
          <span>Test your notification system to verify system banner popups and audio ringtones.</span>
          <button
            type="button"
            onClick={() => {
              playChime(notificationSettings.activeSoundPreset || "chime");
              if (typeof window !== "undefined" && "Notification" in window) {
                if (Notification.permission === "granted") {
                  try {
                    new Notification("Study Alert Checked! 🚀", {
                      body: "Your Flatudy notification settings are fully functional and working perfectly!",
                      icon: "/favicon.ico"
                    });
                  } catch (err) {
                    console.warn("Direct Notification constructor failed:", err);
                    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
                      navigator.serviceWorker.ready.then((reg) => {
                        reg.showNotification("Study Alert Checked! 🚀", {
                          body: "Your Flatudy notification settings are fully functional and working perfectly!",
                          icon: "/favicon.ico"
                        });
                      }).catch((swErr) => console.error("SW notification test failed:", swErr));
                    }
                  }
                } else {
                  handleRequestPermission();
                }
              }
            }}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-[10.5px] font-extrabold uppercase rounded-xl transition-all active:scale-[0.98] cursor-pointer inline-flex items-center gap-1.5 shadow-xs shrink-0 self-start sm:self-center"
          >
            <Bell className="w-3.5 h-3.5 text-indigo-500" />
            Send Test Alert
          </button>
        </div>
      </div>

      {/* 5. Pre-packaged Study Templates */}
      <div>
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-[#f26419]" /> Quick productivity alert templates
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {[
            {
              title: "💧 Water Hydration Check",
              desc: "Cyclic - Every 45 minutes of focus",
              type: "timer" as const,
              val: 45,
            },
            {
              title: "🧘 Posture Stretch break",
              desc: "Cyclic - Every 60 minutes of focus",
              type: "timer" as const,
              val: 60,
            },
            {
              title: "🎯 Late Night Study wrap up",
              desc: "Daily - Automatically triggers at 9:30 PM",
              type: "daily" as const,
              val: "21:30",
            }
          ].map((preset, idx) => (
            <button
              key={idx}
              onClick={() => handleSeedPreset(preset.title, preset.type, preset.val)}
              className="bg-slate-50 hover:bg-slate-100 dark:bg-[#121212] border border-slate-200 dark:border-slate-900 hover:border-slate-300 dark:hover:border-slate-800 p-3.5 rounded-2xl flex flex-col justify-start text-left cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              <div className="flex justify-between items-center w-full mb-1">
                <span className="text-xs font-bold text-slate-805 dark:text-slate-100">{preset.title}</span>
                <span className="text-[8.5px] uppercase font-black text-[#f26419]">Add Preset</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-500 leading-normal">{preset.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* 6. Form Creator vs Active Queue Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 sm:gap-6">
        
        {/* Form panel for custom creations */}
        <div className="md:col-span-2 liquid-glass p-4 sm:p-5 rounded-2xl sm:rounded-3xl space-y-3 sm:space-y-4 flex flex-col justify-between border">
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-900 pb-2 flex items-center gap-1">
              <Plus className="w-4 h-4 text-[#f26419]" /> Configure Custom Alert
            </h4>

            <form onSubmit={submitReminderForm} className="space-y-3.5 mt-3">
              <div>
                <label className="block text-[10px] uppercase font-black tracking-widest text-slate-500 mb-1.5 text-left">
                  Reminder Clock Name
                </label>
                <input
                  type="text"
                  required
                  value={remText}
                  onChange={(e) => setRemText(e.target.value)}
                  placeholder="e.g. Core Algorithm Drill alarm"
                  className="w-full bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-black tracking-widest text-slate-500 mb-1.5 text-left">
                  Schedule Alarm Type
                </label>
                <div className="grid grid-cols-3 gap-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl">
                  {[
                    { id: "daily", name: "Daily Clock" },
                    { id: "one-shot", name: "Once Off" },
                    { id: "timer", name: "Cyclic Timer" }
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setRemType(t.id as any)}
                      className={`py-1.5 rounded-lg text-center text-[10.5px] font-bold cursor-pointer transition-all ${
                        remType === t.id 
                          ? "bg-[#f26419] text-white shadow-sm font-black" 
                          : "text-slate-500 hover:text-slate-850 dark:hover:text-slate-200"
                      }`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>

              {remType === "timer" ? (
                <div>
                  <label className="block text-[10px] uppercase font-black tracking-widest text-slate-500 mb-1.5 text-left">
                    Countdown Interval
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={360}
                      value={remTimerMins}
                      onChange={(e) => setRemTimerMins(Number(e.target.value))}
                      className="flex-1 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">Minutes</span>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-[10px] uppercase font-black tracking-widest text-slate-500 mb-1.5 text-left">
                    Scheduled Alarm Hour
                  </label>
                  <input
                    type="time"
                    required
                    value={remTime}
                    onChange={(e) => setRemTime(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-xs text-slate-805 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono font-medium"
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] uppercase font-black tracking-widest text-slate-500 mb-1.5 text-left">
                  Associate with Subject (Optional)
                </label>
                <select
                  value={selectedSubId}
                  onChange={(e) => setSelectedSubId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-xs text-slate-705 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
                >
                  <option value="">-- No Association --</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-indigo-700 to-indigo-600 hover:opacity-95 active:scale-[0.98] py-2.5 rounded-xl text-xs font-black text-white tracking-wider cursor-pointer mt-4 shadow-sm transition-all"
              >
                Enroll Alert Channel 🚀
              </button>
            </form>
          </div>

          {/* Verification buzzer footer */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-900/60 flex justify-between items-center text-xs text-slate-500">
            <span>Fine-tune synthesis audio:</span>
            <button
              type="button"
              onClick={() => {
                playChime("chime");
                triggerCanvasWaveform(synthEnabled ? synthWave : "sine");
              }}
              className="flex items-center gap-1.5 hover:text-[#f26419] dark:hover:text-white transition-colors cursor-pointer bg-slate-100 dark:bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-900 active:scale-95 text-slate-700 dark:text-slate-300"
            >
              <Volume2 className="w-3.5 h-3.5" /> Test Synths
            </button>
          </div>
        </div>

        {/* Reminders List Queue Status list */}
        <div className="md:col-span-3 liquid-glass p-4 sm:p-5 rounded-2xl sm:rounded-3xl flex flex-col justify-start border">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-900 pb-2 mb-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Clock className="w-4 h-4 text-indigo-550" /> Reminders Queue ({reminders.length})
            </h4>
            <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest animate-pulse">
              ● Active Cron Engine
            </span>
          </div>

          <div className="space-y-2.5 overflow-y-auto no-scrollbar max-h-[410px] flex-1">
            {reminders.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-200 dark:border-slate-900 rounded-2xl min-h-[300px]">
                <Bell className="w-8 h-8 text-indigo-500/30 dark:text-indigo-900/30 mb-2 animate-bounce" />
                <p className="text-xs text-slate-700 dark:text-slate-400 font-bold">No active reminders configured yet</p>
                <p className="text-[10px] text-slate-550 dark:text-slate-500 mt-1 max-w-xs leading-relaxed">
                  Seed some water, stretch, or log presets above, or configure custom clocks to trigger device popups.
                </p>
              </div>
            ) : (
              reminders.map((rem) => {
                const linkedSubject = subjects.find((s) => s.id === rem.subjectId);
                const remainingStr = getRemainingTimeStr(rem.time, rem.type);
                
                return (
                  <div
                    key={rem.id}
                    className={`bg-slate-50/70 dark:bg-slate-950/40 hover:bg-slate-100/60 dark:hover:bg-slate-950/80 p-4 rounded-2xl border border-slate-200/55 dark:border-slate-900 flex justify-between items-center gap-3 transition-all ${
                      !rem.isActive ? "opacity-45" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3 text-left">
                      {/* Toggle button check */}
                      <button
                        onClick={() => {
                          onToggleReminder(rem.id);
                          playChime("success");
                        }}
                        className={`mt-0.5 w-4 h-4 rounded-md border flex items-center justify-center transition-colors cursor-pointer ${
                          rem.isActive 
                            ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-950/30" 
                            : "border-slate-350 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/40 text-transparent"
                        }`}
                      >
                        {rem.isActive && <Check className="w-3 h-3 stroke-[3]" />}
                      </button>

                      <div>
                        <span className="block text-xs font-bold font-sans text-slate-800 dark:text-slate-150">{rem.title}</span>
                        
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase ${
                            rem.type === "timer" 
                              ? "bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-200/20 dark:border-purple-500/20" 
                              : rem.type === "daily" 
                              ? "bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200/20 dark:border-blue-500/20" 
                              : "bg-teal-100 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-200/20 dark:border-teal-500/20"
                          }`}>
                            {rem.type} {rem.type === "timer" ? `(${rem.time}m)` : `@ ${rem.time}`}
                          </span>

                          {linkedSubject && (
                            <span className="text-[9px] text-slate-600 dark:text-slate-400 flex items-center gap-1 font-semibold">
                              <span className={`w-1.5 h-1.5 rounded-full ${linkedSubject.color}`}></span>
                              {linkedSubject.name}
                            </span>
                          )}

                          {rem.isActive && remainingStr && (
                            <span className="text-[9px] text-indigo-500 dark:text-indigo-400 font-bold font-mono">
                              {remainingStr}
                            </span>
                          )}

                          {rem.triggeredAt && (
                            <span className="text-[8.5px] font-mono text-emerald-600 dark:text-emerald-500">
                              Lately Fired: {new Date(rem.triggeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        onRemoveReminder(rem.id);
                        playChime("break");
                      }}
                      className="p-1.5 hover:bg-rose-500/10 dark:hover:bg-rose-955/20 text-slate-400 hover:text-rose-600 dark:hover:text-rose-450 rounded-lg shrink-0 transition-colors cursor-pointer"
                      title="Remove reminder item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 7. Comprehensive Dispatched Notification History Logs */}
      <div className="liquid-glass p-5 rounded-3xl space-y-4 text-left border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-950 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-pink-500/10 text-pink-500 rounded-xl">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-150">
                Dispatched Alerts Ticker Archive
              </h4>
              <p className="text-[10px] text-slate-500 leading-normal">
                Continuous historical list of study timers and device checks deployed in the session.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter buttons */}
            <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-205/10 dark:border-slate-900/40">
              {[
                { id: "all", label: "All Logs" },
                { id: "pomo", label: "Pomo Only" },
                { id: "rem", label: "Custom Only" },
                { id: "test", label: "Test Drills" }
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setHistoryFilter(f.id as any)}
                  className={`px-2 py-1 rounded-lg text-[9.5px] font-bold cursor-pointer transition-colors ${
                    historyFilter === f.id 
                      ? "bg-slate-300 dark:bg-slate-800 text-slate-850 dark:text-slate-100" 
                      : "text-slate-450 hover:text-slate-800 dark:hover:text-slate-300"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {historyLogs.length > 0 && (
              <button
                type="button"
                onClick={handleClearAllHistory}
                className="p-1 px-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase rounded-lg cursor-pointer flex items-center gap-1 transition-colors"
                title="Flush historic audits"
              >
                <Trash2 className="w-3.5 h-3.5" /> Flush All
              </button>
            )}
          </div>
        </div>

        {/* Audit traces queue list */}
        <div className="space-y-2 max-h-[280px] overflow-y-auto no-scrollbar pr-0.5">
          {filteredHistory.length === 0 ? (
            <div className="py-12 border border-dashed border-slate-200 dark:border-slate-900 text-center rounded-2xl bg-slate-50/20 dark:bg-black/10">
              <ListFilter className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto opacity-35 mb-2 animate-pulse" />
              <p className="text-xs text-slate-650 dark:text-slate-400 font-bold">No historical matches in archive</p>
              <p className="text-[10px] text-slate-500 mt-0.5 max-w-xs mx-auto leading-relaxed">
                Matches are compiled as soon as alarms trigger or test alerts are deployed in this tab.
              </p>
            </div>
          ) : (
            filteredHistory.map((log) => (
              <div 
                key={log.id} 
                className="p-3 rounded-2xl bg-slate-50/50 dark:bg-slate-950/25 hover:bg-slate-100/30 dark:hover:bg-slate-950/50 border border-slate-200/40 dark:border-slate-900 flex justify-between items-start gap-4 transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className={`p-1.5 rounded-lg text-slate-100 font-bold flex items-center justify-center shrink-0 mt-0.5 text-[8px] uppercase tracking-wider ${
                    log.type === "pomo" 
                      ? "bg-purple-600 dark:bg-purple-550 shadow-sm" 
                      : log.type === "rem" 
                      ? "bg-blue-600 dark:bg-blue-550 shadow-sm"
                      : "bg-amber-600 dark:bg-amber-550 shadow-sm"
                  }`}>
                    {log.type}
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-800 dark:text-slate-150">{log.title}</h5>
                    <p className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">{log.body}</p>
                    <span className="block text-[8.5px] font-mono font-bold text-slate-400 mt-1">
                      Triggered Epoch Clock: {log.timestamp}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleClearSingleHistory(log.id)}
                  className="p-1 hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 rounded-md shrink-0 cursor-pointer"
                  title="Dismiss log row"
                >
                  <Trash className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
