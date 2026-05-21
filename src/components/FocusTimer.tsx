import { useState, useEffect, useRef } from "react";
import { Play, Pause, Square, Volume2, VolumeX, Sparkles, AlertCircle, CheckCircle } from "lucide-react";
import { Subject } from "../types";

interface FocusTimerProps {
  subjects: Subject[];
  onAddStudyMinutes: (subjectId: string, minutes: number) => void;
  activeSubjectId: string;
  setActiveSubjectId: (id: string) => void;
  onStateChange?: (isRunning: boolean, elapsedSeconds: number) => void;
}

export default function FocusTimer({
  subjects,
  onAddStudyMinutes,
  activeSubjectId,
  setActiveSubjectId,
  onStateChange
}: FocusTimerProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Notify parent state of ticks and starts (for YPT Real-time groups sync)
  useEffect(() => {
    if (onStateChange) {
      onStateChange(isRunning, elapsedSeconds);
    }
  }, [isRunning, elapsedSeconds, onStateChange]);

  // Sound generator states
  const [ambientSound, setAmbientSound] = useState<"none" | "brown" | "rain" | "waves">("none");
  const [volume, setVolume] = useState(0.15);

  // Sound audio context references
  const audioCtxRef = useRef<AudioContext | null>(null);
  const noiseSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const filterNodeRef = useRef<BiquadFilterNode | null>(null);

  // Timer interval reference
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Automatically select first subject if none active
  useEffect(() => {
    if (!activeSubjectId && subjects.length > 0) {
      setActiveSubjectId(subjects[0].id);
    }
  }, [subjects, activeSubjectId, setActiveSubjectId]);

  // Master ticking loop
  useEffect(() => {
    if (isRunning) {
      timerIntervalRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isRunning]);

  // Handle ambient noise synthesis based on state
  useEffect(() => {
    // Stop any existing noise first
    stopAmbientSynth();

    if (ambientSound !== "none" && isRunning) {
      startAmbientSynth(ambientSound);
    }

    return () => {
      stopAmbientSynth();
    };
  }, [ambientSound, isRunning]);

  // Handle live volume updates
  useEffect(() => {
    if (gainNodeRef.current && audioCtxRef.current) {
      gainNodeRef.current.gain.setValueAtTime(volume, audioCtxRef.current.currentTime);
    }
  }, [volume]);

  // Stop sound if timer paused
  useEffect(() => {
    if (!isRunning && ambientSound !== "none") {
      stopAmbientSynth();
    } else if (isRunning && ambientSound !== "none") {
      startAmbientSynth(ambientSound);
    }
  }, [isRunning]);

  const startAmbientSynth = (type: "brown" | "rain" | "waves") => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const bufferSize = 2 * ctx.sampleRate;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);

      if (type === "brown") {
        // Brownian noise (deeper rumble)
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          output[i] = (lastOut + (0.02 * white)) / 1.02;
          lastOut = output[i];
          output[i] *= 3.5; // volume compensation
        }
      } else if (type === "waves") {
        // Ocean swell simulation (white noise with dynamic low filter overlay)
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }
      } else {
        // Rain simulation (crackling clicks combined with faint white noise)
        for (let i = 0; i < bufferSize; i++) {
          let val = Math.random() * 2 - 1;
          if (Math.random() < 0.1) {
            val += (Math.random() * 2 - 1) * 0.5;
          }
          output[i] = val * 0.35;
        }
      }

      const source = ctx.createBufferSource();
      source.buffer = noiseBuffer;
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      
      if (type === "brown") {
        filter.frequency.setValueAtTime(350, ctx.currentTime);
      } else if (type === "waves") {
        filter.frequency.setValueAtTime(450, ctx.currentTime);
        // Start waving filter frequency
        modulateFilterWaves(filter);
      } else {
        // Rain is brighter
        filter.frequency.setValueAtTime(850, ctx.currentTime);
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
      console.error("Failed to start speech or ambient noise simulator:", e);
    }
  };

  // Swell lowpass frequency up and down for ocean wave feel
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
        const nextFreq = isUp ? 650 : 250;
        filter.frequency.exponentialRampToValueAtTime(nextFreq, ctx.currentTime + 2.5);
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
    } catch (err) {
      // already stopped safely
    }
  };

  const activeSubject = subjects.find(s => s.id === activeSubjectId) || subjects[0];

  const toggleTimer = () => {
    if (!isRunning) {
      setIsRunning(true);
      setIsFocusMode(true);
    } else {
      setIsRunning(false);
    }
  };

  // complete session and accumulate minutes
  const stopAndSave = () => {
    setIsRunning(false);
    setIsFocusMode(false);
    stopAmbientSynth();

    const roundedMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
    if (activeSubjectId && elapsedSeconds > 0) {
      onAddStudyMinutes(activeSubjectId, roundedMinutes);
    }
    setElapsedSeconds(0);
  };

  // discard current progress
  const cancelSession = () => {
    if (!showDiscardConfirm) {
      setShowDiscardConfirm(true);
      // Automatically reset confirmation after 4 seconds of inactivity
      setTimeout(() => setShowDiscardConfirm(false), 4000);
      return;
    }
    setIsRunning(false);
    setIsFocusMode(false);
    stopAmbientSynth();
    setElapsedSeconds(0);
    setShowDiscardConfirm(false);
  };

  const formatTime = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return [
      hrs > 0 ? String(hrs).padStart(2, "0") : null,
      String(mins).padStart(2, "0"),
      String(secs).padStart(2, "0")
    ].filter(Boolean).join(":");
  };

  return (
    <div id="focus-section" className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xs border border-slate-100 dark:border-slate-800">
      
      {/* Subject Selector panel */}
      {!isFocusMode && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-semibold text-lg text-slate-800 dark:text-slate-200">
              Select Your Focus Topic
            </h3>
            <span className="text-xs font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
              {subjects.length} active categories
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {subjects.map(sub => {
              const isActive = sub.id === activeSubjectId;
              return (
                <button
                  key={sub.id}
                  id={`btn-subject-${sub.id}`}
                  onClick={() => setActiveSubjectId(sub.id)}
                  className={`relative p-3.5 rounded-2xl border text-left transition-all overflow-hidden ${
                    isActive 
                      ? "border-emerald-500 bg-emerald-50/70 text-emerald-950 dark:bg-slate-800 dark:text-emerald-400 font-medium"
                      : "border-slate-100 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50 text-slate-600 dark:text-slate-400 dark:border-slate-800 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <div className="flex flex-col gap-1 z-10 relative">
                    <span className="text-xs uppercase font-mono tracking-wider text-slate-400 dark:text-slate-500">
                      Category
                    </span>
                    <span className="font-sans text-sm truncate pr-2">{sub.name}</span>
                    <span className="text-xs font-mono text-slate-400 dark:text-slate-500 mt-1">
                      {sub.totalMinutes}m done today
                    </span>
                  </div>

                  {isActive && (
                    <span className="absolute bottom-2 right-2 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick instructions */}
          {activeSubject && (
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 flex gap-3 text-slate-500 text-sm mt-2 items-start border border-slate-100/50 dark:border-slate-800/10">
              <Sparkles className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                Selected: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{activeSubject.name}</strong>. Ready to enter deep focus? We will synthesize real white noise locally in your headphones. Start the timer to begin.
              </div>
            </div>
          )}

          {/* Large play triggers */}
          <div className="pt-4 flex justify-center">
            <button
              id="start-focus-btn"
              onClick={toggleTimer}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-8 py-4 rounded-2xl flex items-center gap-3 transition-transform hover:scale-103 shadow-lg shadow-emerald-600/15 cursor-pointer cursor-and-touch text-base"
            >
              <Play className="w-5 h-5 fill-current" />
              Start Study Stopwatch
            </button>
          </div>
        </div>
      )}

      {/* FULL FOCUS MODE OVERLAY (Immersive concentration capsule) */}
      {isFocusMode && activeSubject && (
        <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-between p-6 sm:p-12 z-50 animate-fade-in text-white no-scrollbar overflow-y-auto">
          
          {/* Header information */}
          <div className="w-full max-w-md flex items-center justify-between pt-4">
            <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 px-4 py-2 rounded-full">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-mono text-slate-300 uppercase tracking-widest">
                Deep Focus active
              </span>
            </div>

            <span className="text-xs font-heading font-semibold px-3 py-1 bg-emerald-950 border border-emerald-900/50 text-emerald-400 rounded-full">
              {activeSubject.name}
            </span>
          </div>

          {/* Centered stopwatch indicator */}
          <div className="flex flex-col items-center my-auto py-8">
            <div className="relative w-72 h-72 flex items-center justify-center">
              {/* Outer circular pulsing svg */}
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle 
                  cx="144" 
                  cy="144" 
                  r="132" 
                  stroke="rgba(30, 41, 59, 1)" 
                  strokeWidth="8" 
                  fill="none" 
                />
                <circle 
                  cx="144" 
                  cy="144" 
                  r="132" 
                  stroke="rgba(16, 185, 129, 0.85)" 
                  strokeWidth="8" 
                  fill="none" 
                  strokeDasharray="830"
                  strokeDashoffset={830 - (830 * Math.min(elapsedSeconds, activeSubject.goalMinutes * 60)) / (activeSubject.goalMinutes * 60 || 3600)}
                  className="transition-all duration-1000 ease-linear text-glow"
                />
              </svg>

              <div className="flex flex-col items-center z-10 text-center px-4">
                <span className="text-xs tracking-wider uppercase font-mono text-slate-400">
                  Focus Timer
                </span>
                <span className="text-5xl sm:text-6xl font-mono font-bold font-display text-white tracking-tighter text-glow my-3">
                  {formatTime(elapsedSeconds)}
                </span>
                <span className="text-xs text-slate-400 font-sans">
                  Rounded: {Math.max(1, Math.round(elapsedSeconds / 60))}m
                </span>
                <span className="text-xs text-emerald-400/80 font-mono mt-1">
                  Target Goal: {activeSubject.goalMinutes}m
                </span>
              </div>
            </div>

            <p className="text-sm text-slate-400 text-center max-w-xs mt-8">
              "Focus is a muscle. Keep pushing. Your future self is thanking you."
            </p>
          </div>

          {/* Sound simulation and controls footer */}
          <div className="w-full max-w-md bg-slate-900/90 border border-slate-800/80 p-5 rounded-3xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-mono text-slate-400 tracking-wider">
                Concentration Ambient Synth
              </span>
              <div className="flex items-center gap-1">
                {ambientSound !== "none" ? (
                  <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
                ) : (
                  <VolumeX className="w-4 h-4 text-slate-500" />
                )}
                <span className="text-xs font-mono text-slate-300 capitalize">{ambientSound} Noise</span>
              </div>
            </div>

            {/* Quick trigger tiles */}
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: "none", label: "Silent" },
                { id: "brown", label: "Brownian" },
                { id: "rain", label: "Cozy Rain" },
                { id: "waves", label: "Waves Swell" }
              ].map(noiseSetting => {
                const isCurrent = ambientSound === noiseSetting.id;
                return (
                  <button
                    key={noiseSetting.id}
                    id={`sound-noise-${noiseSetting.id}`}
                    onClick={() => setAmbientSound(noiseSetting.id as any)}
                    className={`p-2 rounded-xl text-center text-xs font-sans transition-all truncate border cursor-pointer border-solid ${
                      isCurrent
                        ? "bg-emerald-950/70 border-emerald-500 text-emerald-400"
                        : "bg-slate-800/30 border-slate-800 text-slate-400 hover:bg-slate-800/60"
                    }`}
                  >
                    {noiseSetting.label}
                  </button>
                );
              })}
            </div>

            {/* Volume slider */}
            {ambientSound !== "none" && (
              <div className="flex items-center gap-3 pt-1">
                <span className="text-xs text-slate-500 uppercase font-mono">Vol</span>
                <input
                  type="range"
                  min="0"
                  max="0.5"
                  step="0.01"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <span className="text-xs font-mono text-slate-400 w-8 text-right">
                  {Math.round(volume * 200)}%
                </span>
              </div>
            )}

            {/* Action panel */}
            <div className="flex items-center gap-2.5 pt-3">
              <button
                id="toggle-active-timer-btn"
                onClick={toggleTimer}
                className={`flex-1 py-3.5 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer text-sm ${
                  isRunning
                    ? "bg-slate-800 text-slate-200 hover:bg-slate-700"
                    : "bg-emerald-600 text-white hover:bg-emerald-500"
                }`}
              >
                {isRunning ? (
                  <>
                    <Pause className="w-4 h-4 fill-current" />
                    Pause study
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    Resume focus
                  </>
                )}
              </button>

              <button
                id="stop-save-timer-btn"
                onClick={stopAndSave}
                disabled={elapsedSeconds === 0}
                className={`py-3.5 px-5 rounded-2xl font-semibold flex items-center gap-1.5 transition-all cursor-pointer text-sm ${
                  elapsedSeconds > 0
                    ? "bg-emerald-600 text-white hover:bg-emerald-500"
                    : "bg-slate-800 text-slate-600 cursor-not-allowed"
                }`}
                title="Complete focus sessions and save minutes code blocks studied"
              >
                <CheckCircle className="w-4 h-4" />
                Finish ({Math.max(1, Math.round(elapsedSeconds / 60))}m)
              </button>

              <button
                id="cancel-timer-btn"
                onClick={cancelSession}
                className={`py-3.5 px-4 rounded-2xl transition-all cursor-pointer border text-xs font-semibold flex items-center gap-1 shrink-0 ${
                  showDiscardConfirm 
                    ? "bg-rose-600 border-rose-500 text-white animate-pulse" 
                    : "bg-slate-900 border-slate-800 text-rose-500 hover:bg-rose-950/20"
                }`}
                title="Discard study minutes"
              >
                {showDiscardConfirm ? "Confirm Discard?" : <Square className="w-4 h-4 fill-current" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
