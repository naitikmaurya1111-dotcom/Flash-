import React, { useState, useEffect } from "react";
import { Bell, BellOff, Volume2, Plus, Trash, Check, Clock, Sparkles, ShieldCheck, Dumbbell, BookOpen } from "lucide-react";
import { Subject, Reminder } from "../types";

// Synthesis of high-quality ambient sound wave chimes natively using the Web Audio API
export const playChime = (preset: "chime" | "success" | "break" = "chime") => {
  try {
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
      osc2.frequency.setValueAtTime(659.25, ctx.currentTime); // E5 major
      
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.08);
      gainNode.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 1.0);
      
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
        gain3.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.05);
        gain3.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.7);
        osc3.start();
        osc3.stop(ctx.currentTime + 0.8);
      }, 150);
      
      osc1.stop(ctx.currentTime + 1.2);
      osc2.stop(ctx.currentTime + 1.2);
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
        gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + idx * 0.1 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + idx * 0.1 + 0.5);
        osc.start(ctx.currentTime + idx * 0.1);
        osc.stop(ctx.currentTime + idx * 0.1 + 0.6);
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
      gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 1.8);
      osc.start();
      osc.stop(ctx.currentTime + 2.0);
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
}

export default function RemindersHub({
  subjects,
  reminders,
  onAddReminder,
  onToggleReminder,
  onRemoveReminder,
}: RemindersHubProps) {
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>("default");
  
  // Custom states
  const [remText, setRemText] = useState("");
  const [remType, setRemType] = useState<"daily" | "one-shot" | "timer">("daily");
  const [remTime, setRemTime] = useState("18:00");
  const [remTimerMins, setRemTimerMins] = useState(30);
  const [selectedSubId, setSelectedSubId] = useState("");
  
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermissionStatus(Notification.permission);
    }
  }, []);

  const handleRequestPermission = async () => {
    if (!("Notification" in window)) return;
    try {
      const outcome = await Notification.requestPermission();
      setPermissionStatus(outcome);
      playChime("success");
    } catch (err) {
      console.error("OS notification request fail:", err);
    }
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
      
      {/* OS Notifications Authorization Info Banner */}
      <div className="bg-slate-100/60 dark:bg-[#161616]/60 p-4 rounded-3xl border border-slate-200/65 dark:border-slate-900/60 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-3.5 bg-indigo-500/10 dark:bg-indigo-950/45 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-200 dark:border-indigo-900/30">
            {permissionStatus === "granted" ? (
              <Bell className="w-5 h-5 text-indigo-500 dark:text-indigo-400 animate-wiggle" />
            ) : (
              <BellOff className="w-5 h-5 text-slate-500" />
            )}
          </div>
          <div className="text-left">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">Push Alarms Mode</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm">
              Allow study alerts to deliver sound notifications even while working inside background sheets or other tabs.
            </p>
          </div>
        </div>

        {permissionStatus !== "granted" ? (
          <button
            onClick={handleRequestPermission}
            className="px-4 py-2 bg-[#f26419] hover:opacity-90 active:scale-95 text-xs text-white uppercase tracking-wider font-extrabold rounded-full transition-all self-start md:self-center cursor-pointer cursor-and-touch shadow-md shadow-[#f26419]/10"
          >
            Enable Audio Push Alerts
          </button>
        ) : (
          <span className="text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold uppercase px-3 py-1.5 border border-emerald-550/20 rounded-full flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-550 dark:text-emerald-400 animate-pulse" /> Allowed OS Reminders
          </span>
        )}
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
