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
  onUpdateNotificationSettings = () => {}
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

  // Sync synthesizer configurations to localStorage
  useEffect(() => {
    localStorage.setItem("custom_synth_enabled", String(synthEnabled));
    localStorage.setItem("custom_synth_wave", synthWave);
    localStorage.setItem("custom_synth_pitch", String(synthPitch));
    localStorage.setItem("custom_synth_duration", String(synthDuration));
    localStorage.setItem("custom_synth_gain", String(synthGain));
  }, [synthEnabled, synthWave, synthPitch, synthDuration, synthGain]);

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
        new Notification(title, { body, icon: "/favicon.ico" });
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
    <div className="space-y-6 pt-1 text-slate-800 dark:text-slate-100" id="ypt-reminders-canvas">
      
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

      {/* 2. OS Notifications Permission Warning Iframe Fallback */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100/85 dark:from-[#151515] dark:to-[#111111] p-5 rounded-3xl border border-slate-200/70 dark:border-slate-900/90 shadow-xl space-y-4">
        
        {isIframe && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-left flex flex-col md:flex-row md:items-center justify-between gap-3.5 animate-pulse">
            <div className="space-y-1">
              <p className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                Iframe Sandboxing Restriction Block Checked
              </p>
              <p className="text-[10.5px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Operating systems prohibit security permission requests and banner deliveries inside nested browser preview panels.
                To experience physical test alarms and desktop push cards on your local keyboard, click the primary button!
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenNewTab}
              className="px-4 py-2 bg-gradient-to-r from-[#f26419] to-amber-600 hover:opacity-90 active:scale-95 text-[10px] text-white uppercase tracking-wider font-semibold rounded-xl transition-all shrink-0 cursor-pointer shadow-md"
            >
              Open in New Tab 🚀
            </button>
          </div>
        )}

        {/* Permission Authorization Header Drawer Block */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200/50 dark:border-slate-900/50 pb-4">
          <div className="flex items-start gap-4">
            <div className="p-3.5 bg-indigo-550/10 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-200/20 dark:border-indigo-900/40 shrink-0">
              <Bell className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            </div>
            <div className="text-left">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">Alerts & Sounds Control Center</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">
                Authorize security credentials and unlock web audio buffers so you stay perfectly on schedule even when the app is minimized or performing system operations.
              </p>
            </div>
          </div>
          
          {permissionStatus === "granted" && isAudioApproved ? (
            <span className="text-[9.5px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold uppercase px-3.5 py-1.5 border border-emerald-555/20 rounded-full flex items-center gap-1.5 shrink-0 self-start lg:self-center">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Precision Alerts Active
            </span>
          ) : (
            <button
              onClick={handleRequestPermission}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-650 hover:opacity-90 active:scale-95 text-xs text-white uppercase tracking-widest font-black rounded-xl transition-all self-start lg:self-center cursor-pointer shadow-md shadow-indigo-600/10"
            >
              Request Credentials Access
            </button>
          )}
        </div>

        {/* Dual Configuration Check Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Push Banners Card */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#181818] border border-slate-200/50 dark:border-slate-900/50 flex items-start gap-3.5 text-left">
            <div className={`p-2.5 rounded-xl shrink-0 ${
              permissionStatus === "granted" 
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" 
                : "bg-slate-100 dark:bg-slate-950 text-slate-400 border border-slate-200 dark:border-slate-800"
            }`}>
              {permissionStatus === "granted" ? <Bell className="w-4.5 h-4.5" /> : <BellOff className="w-4.5 h-4.5" />}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">OS Popup Banners</span>
                <span className={`text-[8px] uppercase font-black px-1.5 py-0.5 rounded-full ${
                  permissionStatus === "granted" 
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                    : permissionStatus === "denied" 
                    ? "bg-rose-500/10 text-rose-500" 
                    : "bg-amber-500/10 text-amber-500"
                }`}>
                  {permissionStatus}
                </span>
              </div>
              <p className="text-[10px] text-slate-550 dark:text-slate-500 font-sans leading-normal">
                Deliver notification trays directly to your device desktop when focus timelines reach zero.
              </p>
              {permissionStatus !== "granted" && (
                <button
                  type="button"
                  onClick={handleRequestPermission}
                  className="mt-1 text-[10px] text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-350 font-black flex items-center gap-1 cursor-pointer"
                >
                  Prompt System Panel ➜
                </button>
              )}
            </div>
          </div>

          {/* Web Sound Card */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#181818] border border-slate-200/50 dark:border-slate-900/50 flex items-start gap-3.5 text-left">
            <div className={`p-2.5 rounded-xl shrink-0 ${
              isAudioApproved 
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" 
                : "bg-slate-100 dark:bg-slate-950 text-slate-400 border border-slate-200 dark:border-slate-800"
            }`}>
              <Volume2 className="w-4.5 h-4.5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Browser Audio Channel</span>
                <span className={`text-[8px] uppercase font-black px-1.5 py-0.5 rounded-full ${
                  isAudioApproved 
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                    : "bg-amber-500/10 text-amber-500"
                }`}>
                  {isAudioApproved ? "unlocked" : "restricted"}
                </span>
              </div>
              <p className="text-[10px] text-slate-550 dark:text-slate-500 leading-normal">
                Enable native synthesized chime chords immediately when a study slot or break starts/ends.
              </p>
              <button
                type="button"
                onClick={handleTestChimeOnly}
                className="mt-1 text-[10px] text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-350 font-black flex items-center gap-1 cursor-pointer"
              >
                {isAudioApproved ? "Play Chime Sample ♫" : "Grant Audio Authorization ♫"}
              </button>
            </div>
          </div>
        </div>

        {/* 3. Event Settings Customization Toggles */}
        <div className="p-5 bg-white/40 dark:bg-black/25 border border-slate-200/50 dark:border-slate-900/40 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200/30 dark:border-slate-900/30 pb-2">
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">Configure Event Alarm Subscriptions</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3.5">
              <div className="flex items-center justify-between gap-4">
                <div className="text-left">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Deliver System Banner Popups</label>
                  <span className="text-[10px] text-slate-500 leading-normal">Display local OS toast cards when alerts tick complete.</span>
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
                  <span className="text-[10px] text-slate-500 leading-normal">Trigger dynamic acoustic beeps on study milestones.</span>
                </div>
                <button
                  type="button"
                  onClick={() => onUpdateNotificationSettings({ ...notificationSettings, enableSoundEffects: !notificationSettings.enableSoundEffects })}
                  className={`w-9 h-5 rounded-full transition-colors relative flex items-center shrink-0 cursor-pointer ${notificationSettings.enableSoundEffects ? "bg-[#f26419]" : "bg-slate-300 dark:bg-slate-800"}`}
                >
                  <span className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform absolute ${notificationSettings.enableSoundEffects ? "translate-x-4.5" : "translate-x-0.5"}`} />
                </button>
              </div>

              <div className="pt-2">
                <label className="text-[10px] uppercase font-black text-slate-500 block mb-1">Standard Ringtone Default</label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200/20 dark:border-slate-900/30">
                  {(["chime", "success", "break"] as const).map((tone) => (
                    <button
                      key={tone}
                      type="button"
                      onClick={() => {
                        onUpdateNotificationSettings({ ...notificationSettings, activeSoundPreset: tone });
                        playChime(tone);
                        triggerCanvasWaveform(tone);
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

            <div className="space-y-3.5 border-t md:border-t-0 md:border-l border-slate-200/30 dark:border-slate-800/50 pt-3 md:pt-0 md:pl-4">
              <div className="flex items-center justify-between gap-4">
                <div className="text-left">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Focus Session Concluded</label>
                  <span className="text-[10px] text-slate-500 leading-normal">Buzzer sounds immediately on Pomodoro clock finished.</span>
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
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Schedules & Cycles Alarm</label>
                  <span className="text-[10px] text-slate-500 leading-normal">Trigger alarms on custom checklist items and hourly slots.</span>
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
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Daily Study Goal Finished</label>
                  <span className="text-[10px] text-slate-500 leading-normal">Fires with fanfare indicators when target minutes are met.</span>
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
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">XP Levels & Milestone Upgrades</label>
                  <span className="text-[10px] text-slate-500 leading-normal">Play an acoustic victory ascent whenever leveling up happens.</span>
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
        </div>
      </div>

      {/* 4. Synthesizer Hardware Console Panel & Oscilloscope */}
      <div className="bg-slate-50 dark:bg-[#141414] rounded-3xl border border-slate-200/60 dark:border-slate-900/80 p-5 space-y-5 shadow-lg text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-950 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl shrink-0">
              <Sliders className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-150">
                Acoustic Synthesizer Console Sandbox
              </h4>
              <p className="text-[10px] text-slate-500 font-sans">
                Fine-tune, synthesize, and customize the alarm sound system triggers using native oscillator wave physics.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500">Custom Wave Overrides</span>
            <button
              type="button"
              onClick={() => setSynthEnabled(!synthEnabled)}
              className={`w-8 h-4 rounded-full transition-colors relative flex items-center shrink-0 cursor-pointer ${synthEnabled ? "bg-indigo-650" : "bg-slate-300 dark:bg-slate-800"}`}
            >
              <span className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform absolute ${synthEnabled ? "translate-x-4" : "translate-x-0.5"}`} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Synthesizer sliders and inputs */}
          <div className="lg:col-span-7 bg-white dark:bg-[#111111] border border-slate-200/50 dark:border-slate-950 rounded-2xl p-4.5 space-y-4 flex flex-col justify-between">
            <div className="space-y-3.5">
              {/* Oscillator Shape Selection */}
              <div>
                <span className="block text-[9px] uppercase font-black tracking-widest text-slate-400 mb-1.5">
                  Oscillator Wave Shape
                </span>
                <div className="grid grid-cols-4 gap-1 bg-slate-550/5 dark:bg-slate-950 p-1 rounded-xl">
                  {(["sine", "triangle", "square", "sawtooth"] as const).map((wt) => (
                    <button
                      key={wt}
                      disabled={!synthEnabled}
                      type="button"
                      onClick={() => {
                        setSynthWave(wt);
                        const AudioClass = window.AudioContext || (window as any).webkitAudioContext;
                        if (AudioClass) {
                          const testCtx = new AudioClass();
                          const osc = testCtx.createOscillator();
                          const gain = testCtx.createGain();
                          osc.connect(gain);
                          gain.connect(testCtx.destination);
                          osc.type = wt;
                          osc.frequency.setValueAtTime(synthPitch, testCtx.currentTime);
                          gain.gain.setValueAtTime(0, testCtx.currentTime);
                          gain.gain.linearRampToValueAtTime(0.3, testCtx.currentTime + 0.04);
                          gain.gain.exponentialRampToValueAtTime(0.01, testCtx.currentTime + 0.3);
                          osc.start();
                          osc.stop(testCtx.currentTime + 0.35);
                          triggerCanvasWaveform(wt);
                        }
                      }}
                      className={`py-1.5 rounded-lg text-center text-[10px] font-black tracking-wider uppercase transition-all duration-150 ${
                        !synthEnabled 
                          ? "opacity-35 cursor-not-allowed text-slate-400" 
                          : synthWave === wt
                          ? "bg-indigo-650 text-white shadow-sm"
                          : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-205 cursor-pointer"
                      }`}
                    >
                      {wt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pitch Frequency Slider */}
              <div>
                <div className="flex justify-between items-center text-[9px] uppercase font-black text-slate-400 mb-1">
                  <span>Center Pitch Frequency</span>
                  <span className="text-indigo-500 font-mono font-bold text-xs">{synthPitch} Hz</span>
                </div>
                <input
                  type="range"
                  min="200"
                  max="1350"
                  step="5"
                  disabled={!synthEnabled}
                  value={synthPitch}
                  onChange={(e) => setSynthPitch(Number(e.target.value))}
                  className="w-full accent-indigo-600 disabled:opacity-35 cursor-pointer"
                />
                <div className="flex justify-between text-[8px] text-slate-400 font-bold px-0.5 mt-0.5">
                  <span>Bass Alert (200Hz)</span>
                  <span>Concert A (440Hz)</span>
                  <span>Soprano Bell (1350Hz)</span>
                </div>
              </div>

              {/* Decay Release Slider */}
              <div>
                <div className="flex justify-between items-center text-[9px] uppercase font-black text-slate-400 mb-1">
                  <span>Sustained Ring Decay Time</span>
                  <span className="text-indigo-500 font-mono font-bold text-xs">{synthDuration} Seconds</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="4.0"
                  step="0.1"
                  disabled={!synthEnabled}
                  value={synthDuration}
                  onChange={(e) => setSynthDuration(Number(e.target.value))}
                  className="w-full accent-indigo-600 disabled:opacity-35 cursor-pointer"
                />
                <div className="flex justify-between text-[8px] text-slate-400 font-bold px-0.5 mt-0.5">
                  <span>Short click (0.2s)</span>
                  <span>Echoing bell sound (4.0s)</span>
                </div>
              </div>

              {/* Gain volume capacity slider */}
              <div>
                <div className="flex justify-between items-center text-[9px] uppercase font-black text-slate-400 mb-1">
                  <span>Volume Gain Amplitude</span>
                  <span className="text-indigo-500 font-mono font-bold text-xs">{synthGain}%</span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="100"
                  step="5"
                  disabled={!synthEnabled}
                  value={synthGain}
                  onChange={(e) => setSynthGain(Number(e.target.value))}
                  className="w-full accent-indigo-600 disabled:opacity-35 cursor-pointer"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-900/60 flex items-center justify-between gap-2.5">
              <span className="text-[10px] text-slate-450 italic leading-snug">
                {synthEnabled 
                  ? "✓ Customized synth settings are now applied system-wide!" 
                  : "Using standard orchestral buzzer chime parameters."
                }
              </span>
              <button
                type="button"
                disabled={!synthEnabled}
                onClick={() => {
                  const AudioClass = window.AudioContext || (window as any).webkitAudioContext;
                  if (AudioClass) {
                    const actx = new AudioClass();
                    const osc = actx.createOscillator();
                    const gain = actx.createGain();
                    osc.connect(gain);
                    gain.connect(actx.destination);
                    osc.type = synthWave;
                    osc.frequency.setValueAtTime(synthPitch, actx.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(synthPitch * 1.08, actx.currentTime + synthDuration);
                    gain.gain.setValueAtTime(0, actx.currentTime);
                    gain.gain.linearRampToValueAtTime(synthGain / 100, actx.currentTime + 0.08);
                    gain.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + synthDuration);
                    osc.start();
                    osc.stop(actx.currentTime + synthDuration + 0.2);
                    triggerCanvasWaveform(synthWave);
                  }
                }}
                className={`px-3.5 py-1.5 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${
                  synthEnabled 
                    ? "bg-indigo-650 hover:bg-indigo-700 text-white cursor-pointer active:scale-95 shadow-sm" 
                    : "bg-slate-100 dark:bg-slate-900 text-slate-400 cursor-not-allowed"
                }`}
              >
                <Music className="w-3.5 h-3.5" /> Chime Simulator
              </button>
            </div>
          </div>

          {/* Canvas Oscilloscope Visualizer Card */}
          <div className="lg:col-span-5 bg-white dark:bg-[#111111] border border-slate-200/50 dark:border-slate-950 rounded-2xl p-4 flex flex-col justify-between text-left">
            <div>
              <span className="block text-[9px] uppercase font-black tracking-widest text-slate-400 mb-1">
                Real-Time Synthesis Oscilloscope
              </span>
              <p className="text-[10px] text-slate-500 font-sans leading-normal">
                Visualizes the audio scale compression of frequency intervals when test triggers are deployed.
              </p>
            </div>

            <div className="my-3.5 h-32 w-full bg-slate-950/95 rounded-xl border border-slate-200/10 dark:border-slate-900 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 grid grid-cols-6 grid-rows-4 opacity-[0.06] pointer-events-none">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div key={i} className="border border-slate-400" />
                ))}
              </div>
              <canvas 
                ref={canvasRef}
                id="synth-wave-canvas" 
                width="280" 
                height="120"
                className="w-full h-full block"
              />
              <span className="absolute bottom-1 right-2 text-[8px] font-mono font-bold uppercase tracking-wider text-slate-500">
                {synthEnabled ? `${synthWave} scope` : "Standard Ringtone"}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                const wt = synthEnabled ? synthWave : "sine";
                triggerCanvasWaveform(wt);
              }}
              className="w-full text-center py-2 bg-slate-105/5 hover:bg-slate-100 dark:bg-slate-950/40 dark:hover:bg-slate-950 border border-slate-200/50 dark:border-slate-900 text-slate-650 dark:text-slate-350 text-[10px] font-black uppercase rounded-lg tracking-wider cursor-pointer active:scale-95 transition-all"
            >
              Force Sweep Waveform Test
            </button>
          </div>
        </div>

        {/* Alarm Testing triggers customization box */}
        <div className="bg-white dark:bg-[#121212] border border-slate-200/50 dark:border-slate-900/50 rounded-2xl p-4 flex flex-col justify-between gap-4">
          <div>
            <span className="block text-[10px] uppercase font-black tracking-wider text-slate-500 mb-2">
              ⚡ Trigger Custom Banner Device Notification Test
            </span>
            
            <div className="space-y-2 mb-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Notification Custom Title</label>
                  <input
                    type="text"
                    value={customTestTitle}
                    onChange={(e) => setCustomTestTitle(e.target.value)}
                    placeholder="e.g. You did it! Study session completed!"
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-150 font-medium"
                  />
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Notification Custom Body</label>
                  <input
                    type="text"
                    value={customTestBody}
                    onChange={(e) => setCustomTestBody(e.target.value)}
                    placeholder="e.g. 🍅 Great job! Keep maintaining your streak!"
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-150 font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Quick Actions Shortcuts */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              <button
                type="button"
                onClick={() => {
                  setCustomTestTitle("You did it! Study session completed!");
                  setCustomTestBody("🍅 Great job! Keep maintaining your hyperfocused study streak!");
                }}
                className="px-2 py-0.5 text-[8.5px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900 rounded-md hover:bg-indigo-100 transition-colors cursor-pointer"
              >
                🎓 Study Session Complete
              </button>
              <button
                type="button"
                onClick={() => {
                  setCustomTestTitle("💧 Hydration Break!");
                  setCustomTestBody("It is time to drink water and take a quick 3-minute screen rest.");
                }}
                className="px-2 py-0.5 text-[8.5px] font-bold bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-900 rounded-md hover:bg-sky-100 transition-colors cursor-pointer"
              >
                💧 Water Break
              </button>
              <button
                type="button"
                onClick={() => {
                  setCustomTestTitle("🚨 Stretch Reminder");
                  setCustomTestBody("Correct your spine alignment, roll your shoulders, and breathe deeply.");
                }}
                className="px-2 py-0.5 text-[8.5px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900 rounded-md hover:bg-amber-100 transition-colors cursor-pointer"
              >
                🤸 Stretch Break
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 border-t border-slate-105/50 dark:border-slate-900 pt-3">
            <button
              type="button"
              onClick={handleImmediatePushTest}
              className="flex-1 min-w-[130px] px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-800 text-slate-100 text-xs font-black rounded-xl transition-all active:scale-[0.98] cursor-pointer inline-flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Bell className="w-3.5 h-3.5 text-indigo-400" />
              Test Device Banner (Now)
            </button>

            <button
              type="button"
              disabled={testCountdown !== null}
              onClick={handleStartDelayedTest}
              className={`flex-1 min-w-[130px] px-4 py-2 bg-gradient-to-r from-[#f26419] to-amber-600 text-white text-xs font-black rounded-xl transition-all active:scale-[0.98] cursor-pointer inline-flex items-center justify-center gap-1.5 shadow-md shadow-[#f26419]/10 ${
                testCountdown !== null ? "opacity-60 cursor-not-allowed animate-pulse" : ""
              }`}
            >
              <Play className="w-3.5 h-3.5 text-white" />
              {testCountdown !== null ? `Triggering in ${testCountdown}s...` : "Test Alarm (5s Delay)"}
            </button>
          </div>
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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        
        {/* Form panel for custom creations */}
        <div className="md:col-span-2 bg-white/75 dark:bg-[#121212]/90 border border-slate-200 dark:border-slate-900/60 p-5 rounded-3xl space-y-4 flex flex-col justify-between">
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
                className="w-full bg-gradient-to-r from-indigo-650 to-indigo-600 hover:opacity-95 active:scale-[0.98] py-2.5 rounded-xl text-xs font-black text-white tracking-wider cursor-pointer mt-4 shadow-sm transition-all"
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
        <div className="md:col-span-3 bg-white/75 dark:bg-[#121212]/90 border border-slate-200 dark:border-slate-900/60 p-5 rounded-3xl flex flex-col justify-start">
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
      <div className="bg-white/70 dark:bg-[#121212]/90 border border-slate-200 dark:border-slate-900/60 p-5 rounded-3xl space-y-4 text-left">
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
