import React, { useState, useEffect } from "react";
import { Bell, BellOff, Volume2, Plus, Trash, Check, Clock, Sparkles, ShieldCheck, Dumbbell, BookOpen, ChevronDown, ChevronUp, Play, HelpCircle, Info, Lock } from "lucide-react";
import { Subject, Reminder, NotificationSettings } from "../types";

// Synthesis of high-quality ambient sound wave chimes natively using the Web Audio API
export const playChime = (preset: "chime" | "success" | "break" = "chime") => {
  try {
    // 1. Trigger robust physical haptic engine alarms on mobile devices if supported (Android Chrome/Safari support)
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
    
    if (preset === "chime") {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc1.type = "sine";
      osc2.type = "triangle";
      
      osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5 code frequency
      osc1.frequency.exponentialRampToValueAtTime(587.33, ctx.currentTime + 1.0); // Pitch drift for urgency
      osc2.frequency.setValueAtTime(659.25, ctx.currentTime); // E5 major
      
      // LOUDER gain parameters for maximum projection on mobile media volume channels
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.85, ctx.currentTime + 0.08); // Boosted from 0.15
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.2);
      
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
        gain3.gain.linearRampToValueAtTime(0.75, ctx.currentTime + 0.05); // Boosted from 0.12
        gain3.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.9);
        osc3.start();
        osc3.stop(ctx.currentTime + 1.0);
      }, 150);
      
      osc1.stop(ctx.currentTime + 1.4);
      osc2.stop(ctx.currentTime + 1.4);
    } else if (preset === "success") {
      // Arpeggio chimes indicating task success complete
      const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
        gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.1);
        gain.gain.linearRampToValueAtTime(0.72, ctx.currentTime + idx * 0.1 + 0.05); // Boosted from 0.1
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + idx * 0.1 + 0.6);
        osc.start(ctx.currentTime + idx * 0.1);
        osc.stop(ctx.currentTime + idx * 0.1 + 0.7);
      });
    } else {
      // Relaxing low pitch vibration for long system break alerts
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(293.66, ctx.currentTime); // D4 base frequency
      osc.frequency.exponentialRampToValueAtTime(329.63, ctx.currentTime + 0.6);
      
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.90, ctx.currentTime + 0.08); // Boosted from 0.18 for alarm hum
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 2.0);
      osc.start();
      osc.stop(ctx.currentTime + 2.2);
    }
  } catch (err) {
    console.warn("Dynamic Audio Chime Synthesizer warning:", err);
  }
};

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

  useEffect(() => {
    if (testCountdown === null) return;
    if (testCountdown <= 0) {
      playChime(selectedTestTone);
      const title = `🚨 Chrome Alarm Push test: [${selectedTestTone.toUpperCase()}] triggered!`;
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        try {
          new Notification("Flash5tudy Chrome Test Success", {
            body: `Excellent study chimes are now fully active on your tab! Keep up the hyperfocused work.`,
            icon: "/favicon.ico"
          });
        } catch (err) {
          console.warn("Chrome quick notification test failed in background:", err);
        }
      }
      setTestCountdown(null);
      return;
    }

    const timer = setTimeout(() => {
      setTestCountdown(prev => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [testCountdown, selectedTestTone]);

  const handleImmediatePushTest = () => {
    playChime(selectedTestTone);
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission !== "granted") {
        handleRequestPermission();
        return;
      }
      try {
        new Notification("🔔 Chrome Alert Activated!", {
          body: `Testing the "${selectedTestTone}" tone trigger! Excellent, your Chrome notification pipeline is active.`,
          icon: "/favicon.ico"
        });
      } catch (err) {
        console.warn("Immediate push test failed:", err);
      }
    }
  };

  const handleStartDelayedTest = () => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission().then(perm => {
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
        localStorage.setItem("audio_autoplay_approved", "true");
        setLocalAudioAutoplayApproved(true);
      } catch (err) {
        console.error("OS notification request fail:", err);
      }
    }
  };

  const handleTestChimeOnly = () => {
    playChime("success");
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

    // Reset fields
    setRemText("");
    setSelectedSubId("");
    playChime("chime");
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
  };

  return (
    <div className="space-y-6 pt-1 text-slate-800 dark:text-slate-100" id="ypt-reminders-canvas">
      
      {/* OS Notifications & Audio Authorization Info Banner */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100/85 dark:from-[#151515] dark:to-[#111111] p-5 rounded-3xl border border-slate-200/70 dark:border-slate-900/90 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200/50 dark:border-slate-900/50 pb-4">
          <div className="flex items-start gap-4">
            <div className="p-3.5 bg-indigo-550/10 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-200/20 dark:border-indigo-900/40 animate-pulse shrink-0">
              <Bell className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            </div>
            <div className="text-left">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">Alerts & Sounds Control Center</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">
                Web browsers restrict sound playback and push notifications in background tabs. To ensure your Pomodoros and scheduled alerts actually play and notify you, authorize both channels below.
              </p>
            </div>
          </div>
          
          {permissionStatus === "granted" && isAudioApproved ? (
            <span className="text-[9.5px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold uppercase px-3.5 py-1.5 border border-emerald-555/20 rounded-full flex items-center gap-1.5 shrink-0 self-start lg:self-center">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 animate-pulse" /> Precision Alerts Authorized
            </span>
          ) : (
            <button
              onClick={handleRequestPermission}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-650 hover:opacity-90 active:scale-95 text-xs text-white uppercase tracking-widest font-black rounded-xl transition-all self-start lg:self-center cursor-pointer shadow-md shadow-indigo-600/10"
            >
              Authorize Both Channels
            </button>
          )}
        </div>

        {/* Dual check indicator panels */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Channel A: OS Push Reminders */}
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
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">OS Popup Notifications</span>
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
              <p className="text-[10px] text-slate-550 dark:text-slate-500">
                Shows interactive banners in the corner of your screen when a focus timer concludes, even in background sheets.
              </p>
              {permissionStatus !== "granted" && (
                <button
                  type="button"
                  onClick={handleRequestPermission}
                  className="mt-1 text-[10px] text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-350 font-black flex items-center gap-1 cursor-pointer"
                >
                  Request Permission ➜
                </button>
              )}
            </div>
          </div>

          {/* Channel B: Web Audio Chimes & Synthesis */}
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
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Audio Autoplay Channel</span>
                <span className={`text-[8px] uppercase font-black px-1.5 py-0.5 rounded-full ${
                  isAudioApproved 
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                    : "bg-amber-500/10 text-amber-500"
                }`}>
                  {isAudioApproved ? "unlocked" : "restricted"}
                </span>
              </div>
              <p className="text-[10px] text-slate-550 dark:text-slate-500">
                Bypasses standard browser audio restrictions. Plays premium chime synthesisers immediately upon completing study slots.
              </p>
              <button
                type="button"
                onClick={handleTestChimeOnly}
                className="mt-1 text-[10px] text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-350 font-black flex items-center gap-1 cursor-pointer"
              >
                {isAudioApproved ? "Test Sound Buzzer ♫" : "Authorize & Test Sound ♫"}
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Notification Custom Settings Board */}
        <div className="p-5 bg-white/40 dark:bg-black/25 border border-slate-200/50 dark:border-slate-900/40 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200/30 dark:border-slate-900/30 pb-2">
            <ShieldCheck className="w-4 h-4 text-indigo-500 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-350">Configure Notification Events & Choice Targets</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Column 1: Channels & Sound settings */}
            <div className="space-y-3.5">
              <div className="flex items-center justify-between gap-4">
                <div className="text-left">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Desktop Notification Banners</label>
                  <span className="text-[10px] text-slate-500 leading-normal">Trigger native operating system banner tray popups.</span>
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
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Synthesized Sound Alarm Chimes</label>
                  <span className="text-[10px] text-slate-500 leading-normal">Play high-fidelity resonant audio alarms when study timers trigger.</span>
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
                <label className="text-[10px] uppercase font-black text-slate-500 block mb-1">Alert Alarm Ringtone Preset</label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200/20 dark:border-slate-900/30">
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
                      {tone === "chime" ? "Bell Ring" : tone === "success" ? "Ascent Arp" : "Harmonic Hum"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Column 2: Event triggers */}
            <div className="space-y-3.5 border-t md:border-t-0 md:border-l border-slate-200/30 dark:border-slate-800/50 pt-3 md:pt-0 md:pl-4">
              <div className="flex items-center justify-between gap-4">
                <div className="text-left">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Focus Session Ended</label>
                  <span className="text-[10px] text-slate-500 leading-normal">Fires immediately when standard study slots or Pomodoros conclude.</span>
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
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Personal Reminders & Cycles</label>
                  <span className="text-[10px] text-slate-500 leading-normal">Buzzer fires on custom clocks, checklist tasks, and relative timers.</span>
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
                  <span className="text-[10px] text-slate-500 leading-normal">Celebrates when your customized minutes targets are finalized.</span>
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
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Student Levels & Milestone Upgrades</label>
                  <span className="text-[10px] text-slate-500 leading-normal">Alert and play chimes automatically when your XP triggers leveling up.</span>
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

      {/* Chrome Alarms & Notification Sandbox Lab */}
      <div className="bg-slate-50 dark:bg-[#141414] rounded-3xl border border-slate-200/60 dark:border-slate-900/80 p-5 space-y-5 shadow-lg text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-900/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl shrink-0">
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-150">
                Chrome Push & Alarms Validation Lab
              </h4>
              <p className="text-[10px] text-slate-500">
                Play synthesized study chords and verify background push mechanics directly in Google Chrome.
              </p>
            </div>
          </div>
          
          <button
            type="button"
            onClick={() => setIsChromeGuideOpen(!isChromeGuideOpen)}
            className="flex items-center gap-1.5 text-[10px] uppercase font-black tracking-wider text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors bg-indigo-500/5 dark:bg-indigo-950/10 px-3 py-1.5 rounded-xl border border-indigo-500/10"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            {isChromeGuideOpen ? "Close Chrome Guide" : "Chrome Blocked Guide"}
            {isChromeGuideOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* Diagnostic Handbook (Expanding) */}
        {isChromeGuideOpen && (
          <div className="bg-white dark:bg-[#111111] border border-slate-200/50 dark:border-slate-900/90 rounded-2xl p-4 space-y-3.5 animate-fade-in">
            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-bold flex items-center gap-1.5">
              <Info className="w-4 h-4 text-amber-500 shrink-0" />
              Chrome Notification Troubleshooting Handbook:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50/50 dark:bg-[#161616]/40 rounded-xl border border-slate-100 dark:border-slate-900 space-y-1">
                <span className="text-[9px] font-black uppercase text-indigo-500">1. Click Lock Icon</span>
                <p className="text-[10px] text-slate-500 leading-normal">
                  In Chrome's address bar, click the **Lock (🔒) or Tune slider** immediately to the left of the website URL.
                </p>
              </div>

              <div className="p-3 bg-slate-50/50 dark:bg-[#161616]/40 rounded-xl border border-slate-100 dark:border-slate-900 space-y-1">
                <span className="text-[9px] font-black uppercase text-emerald-500">2. Enable Notifications</span>
                <p className="text-[10px] text-slate-500 leading-normal">
                  Find **Notifications** inside the dropdown menu and set its toggle to **Allow**. Reload the tab when prompted.
                </p>
              </div>

              <div className="p-3 bg-slate-50/50 dark:bg-[#161616]/40 rounded-xl border border-slate-100 dark:border-slate-900 space-y-1">
                <span className="text-[9px] font-black uppercase text-amber-500">3. System Focus Rules</span>
                <p className="text-[10px] text-slate-500 leading-normal">
                  Ensure Windows "Focus Assist" or Mac "Do Not Disturb" is turned off, as operating systems can block Chrome from presenting popups.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Tone Selector Board */}
          <div className="bg-white dark:bg-[#121212] border border-slate-200/50 dark:border-slate-900/50 rounded-2xl p-4 space-y-3">
            <span className="block text-[10px] uppercase font-black tracking-wider text-slate-500">
              🎵 Choose Your Alarm Sound Preset
            </span>
            
            <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-950 p-1.5 rounded-xl border border-slate-200/30 dark:border-slate-900/40">
              {(["chime", "success", "break"] as const).map((tone) => (
                <button
                  key={tone}
                  type="button"
                  onClick={() => {
                    setSelectedTestTone(tone);
                    playChime(tone);
                  }}
                  className={`py-2 rounded-lg text-center text-[10.5px] font-black transition-all cursor-pointer ${
                    selectedTestTone === tone
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-350"
                  }`}
                >
                  {tone === "chime" ? "Classic Bell" : tone === "success" ? "Ascent Arp" : "Chill Hum"}
                </button>
              ))}
            </div>

            <p className="text-[10px] text-slate-450 leading-relaxed">
              *Tapping any sound preset above plays a real-time sample to bypass browser restrictions and unlock your audio stream.
            </p>
          </div>

          {/* Test Action Controllers */}
          <div className="bg-white dark:bg-[#121212] border border-slate-200/50 dark:border-slate-900/50 rounded-2xl p-4 flex flex-col justify-between gap-4">
            <div>
              <span className="block text-[10px] uppercase font-black tracking-wider text-slate-500 mb-2">
                ⚡ Interactive Background Alarm Toggles
              </span>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Test that alarm audio and Chrome notifications fire correctly. Try the 5-second countdown option, minimize Chrome or switch tabs, and verify the background push alert.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleImmediatePushTest}
                className="flex-1 min-w-[140px] px-4 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-800 text-slate-100 text-xs font-black rounded-xl transition-all active:scale-[0.98] cursor-pointer inline-flex items-center justify-center gap-1.5"
              >
                <Bell className="w-3.5 h-3.5 text-indigo-400" />
                Test Alarm (Now)
              </button>

              <button
                type="button"
                disabled={testCountdown !== null}
                onClick={handleStartDelayedTest}
                className={`flex-1 min-w-[140px] px-4 py-2.5 bg-gradient-to-r from-[#f26419] to-amber-600 text-white text-xs font-black rounded-xl transition-all active:scale-[0.98] cursor-pointer inline-flex items-center justify-center gap-1.5 ${
                  testCountdown !== null ? "opacity-60 cursor-not-allowed animate-pulse" : ""
                }`}
              >
                <Play className="w-3.5 h-3.5 text-white" />
                {testCountdown !== null ? `Triggering in ${testCountdown}s...` : "Test Alarm (5s Delay)"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Pre-packaged High Productivity presets (Interconnectivity is high here) */}
      <div>
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 animate-spin-slow" /> Quick study break alarm presets
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {[
            {
              title: "💧 Water Hydration Check",
              desc: "Timer - Every 45 min",
              type: "timer" as const,
              val: 45,
              icon: "Drop"
            },
            {
              title: "🧘 Posture Stretch Break",
              desc: "Timer - Every 60 min",
              type: "timer" as const,
              val: 60,
              icon: "Stretch"
            },
            {
              title: "🎯 Late Night Activity Log",
              desc: "Daily - 9:30 PM",
              type: "daily" as const,
              val: "21:30",
              icon: "Daily"
            }
          ].map((preset, idx) => (
            <button
              key={idx}
              onClick={() => handleSeedPreset(preset.title, preset.type, preset.val)}
              className="bg-slate-50 hover:bg-slate-100/80 dark:bg-[#121212] border border-slate-200 dark:border-slate-900 hover:border-slate-300 dark:hover:border-slate-800 p-3.5 rounded-2xl flex flex-col justify-start text-left cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] hover:bg-slate-100 dark:hover:bg-[#161616]/40"
            >
              <div className="flex justify-between items-center w-full mb-1">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{preset.title}</span>
                <span className="text-[8.5px] uppercase font-bold text-[#f26419]">Add</span>
              </div>
              <p className="text-[10px] text-slate-550 dark:text-slate-500">{preset.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* 2 Grid split layouts: Custom creator vs Active Reminders queue */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        
        {/* Form panel for custom creations */}
        <div className="md:col-span-2 bg-white/75 dark:bg-[#121212]/90 border border-slate-200 dark:border-slate-900/60 p-5 rounded-3xl space-y-4">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-900 pb-2 flex items-center gap-1">
            <Plus className="w-4 h-4 text-[#f26419]" /> Configure Custom Alert
          </h4>

          <form onSubmit={submitReminderForm} className="space-y-3.5">
            <div>
              <label className="block text-[10px] uppercase font-black tracking-widest text-slate-500 mb-1.5 self-start text-left">
                Reminder Name
              </label>
              <input
                type="text"
                required
                value={remText}
                onChange={(e) => setRemText(e.target.value)}
                placeholder="e.g. Core Algorithm Drill alarm"
                className="w-full bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-900 focus:outline-none focus:border-indigo-505"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-black tracking-widest text-slate-500 mb-1.5 text-left">
                Alarm Triggering Type
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
                    className={`py-1.5 rounded-lg text-center text-[10px] font-bold cursor-pointer transition-colors ${
                      remType === t.id 
                        ? "bg-[#f26419] text-white" 
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
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
                    className="flex-1 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-900 focus:outline-none"
                  />
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">Minutes</span>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-[10px] uppercase font-black tracking-widest text-slate-500 mb-1.5 text-left">
                  Schedule Alarm hour
                </label>
                <input
                  type="time"
                  required
                  value={remTime}
                  onChange={(e) => setRemTime(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-900 focus:outline-none font-mono"
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
                className="w-full bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-xs text-slate-705 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-900 focus:outline-none font-sans"
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
              className="w-full bg-gradient-to-r from-indigo-650 to-indigo-600 bg-indigo-600 hover:opacity-90 active:scale-[0.98] py-2.5 rounded-xl text-xs font-black text-white tracking-wider cursor-pointer mt-4"
            >
              Configure Alarm Channel
            </button>
          </form>

          {/* Synth Sound Playground test button */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-900 flex justify-between items-center text-xs text-slate-500">
            <span>Verify Audio sound:</span>
            <button
              type="button"
              onClick={() => playChime("chime")}
              className="flex items-center gap-1.5 hover:text-[#f26419] dark:hover:text-white transition-colors cursor-pointer bg-slate-100 dark:bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-900 active:scale-95 text-slate-700 dark:text-slate-300"
            >
              <Volume2 className="w-3.5 h-3.5" /> Test Synths
            </button>
          </div>
        </div>

        {/* Reminders List Queue status list */}
        <div className="md:col-span-3 bg-white/75 dark:bg-[#121212]/90 border border-slate-200 dark:border-slate-900/60 p-5 rounded-3xl flex flex-col justify-start">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-900 pb-2 mb-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Clock className="w-4 h-4 text-emerald-500 dark:text-emerald-400" /> Reminders Queue ({reminders.length})
            </h4>
            <span className="text-[9.5px] font-mono font-bold text-slate-500 uppercase">Active Engine</span>
          </div>

          <div className="space-y-2.5 overflow-y-auto no-scrollbar max-h-[380px] flex-1">
            {reminders.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-200 dark:border-slate-900 rounded-2xl">
                <Bell className="w-8 h-8 text-slate-500 dark:text-slate-700 opacity-40 mb-2 animate-bounce" />
                <p className="text-xs text-slate-650 dark:text-slate-400 font-bold">No active reminders configured yet</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-600 mt-1 max-w-xs leading-relaxed">
                  Seed some dynamic break presets above or build your custom reminders clock to enforce periodic intervals.
                </p>
              </div>
            ) : (
              reminders.map((rem) => {
                const linkedSubject = subjects.find((s) => s.id === rem.subjectId);
                return (
                  <div
                    key={rem.id}
                    className={`bg-slate-50/70 dark:bg-slate-955/70 hover:bg-slate-100 dark:hover:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-900 flex justify-between items-center gap-3 transition-colors ${
                      !rem.isActive ? "opacity-45" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3 text-left">
                      {/* Interactive toggle switch for the reminder */}
                      <button
                        onClick={() => onToggleReminder(rem.id)}
                        className={`mt-0.5 w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                          rem.isActive 
                            ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-950/30" 
                            : "border-slate-350 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/40 text-transparent"
                        }`}
                      >
                        {rem.isActive && <Check className="w-3 h-3 stroke-[3]" />}
                      </button>

                      <div>
                        {/* Alarm title */}
                        <span className="block text-xs font-bold font-sans text-slate-800 dark:text-slate-100">{rem.title}</span>
                        
                        {/* Sub headers details and countdown metadata */}
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ${
                            rem.type === "timer" 
                              ? "bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20" 
                              : rem.type === "daily" 
                              ? "bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20" 
                              : "bg-teal-100 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-500/20"
                          }`}>
                            {rem.type} {rem.type === "timer" ? `(${rem.time}m)` : `@ ${rem.time}`}
                          </span>

                          {linkedSubject && (
                            <span className="text-[9.5px] text-slate-600 dark:text-slate-405 flex items-center gap-1">
                              <span className={`w-1.5 h-1.5 rounded-full ${linkedSubject.color}`}></span>
                              {linkedSubject.name}
                            </span>
                          )}

                          {rem.triggeredAt && (
                            <span className="text-[8.5px] font-mono text-emerald-600 dark:text-emerald-500">
                              Fired: {new Date(rem.triggeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => onRemoveReminder(rem.id)}
                      className="p-1.5 hover:bg-rose-500/10 dark:hover:bg-rose-955/20 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg shrink-0 transition-colors cursor-pointer"
                      title="Remove reminder item"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
