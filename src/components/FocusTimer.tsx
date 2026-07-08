import { useState, useEffect, useRef } from "react";
import { Play, Pause, Square, Volume2, VolumeX, Sparkles, AlertCircle, CheckCircle } from "lucide-react";
import { Subject, formatStudyTimeExact } from "../types";

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

  // Notify parent state of ticks and starts (for Flash5tudy Real-time groups sync)
  useEffect(() => {
    if (onStateChange) {
      onStateChange(isRunning, elapsedSeconds);
    }
  }, [isRunning, elapsedSeconds, onStateChange]);

  const [volume, setVolume] = useState(0.4); // master volume multiplier
  const [localTargetMinutes, setLocalTargetMinutes] = useState<number>(60);

  // Synthesizer tracks structure
  interface SynthTrack {
    id: string;
    name: string;
    emoji: string;
    volume: number; // 0 to 1
    isPlaying: boolean;
  }

  const [synthTracks, setSynthTracks] = useState<SynthTrack[]>([
    { id: "rain", name: "Cozy Café Rain", emoji: "🌧️", volume: 0.4, isPlaying: true },
    { id: "waves", name: "Ocean Swell", emoji: "🌊", volume: 0.0, isPlaying: false },
    { id: "brown", name: "Deepspace Noise", emoji: "🌌", volume: 0.0, isPlaying: false },
    { id: "campfire", name: "Campfire Crackles", emoji: "🔥", volume: 0.0, isPlaying: false },
    { id: "keyboard", name: "ASMR Keyboard", emoji: "⌨️", volume: 0.0, isPlaying: false },
    { id: "binaural", name: "Binaural Focus Beat", emoji: "🧘", volume: 0.0, isPlaying: false },
    { id: "forest", name: "Rainforest River", emoji: "🍃", volume: 0.0, isPlaying: false }
  ]);

  // Audio Context and track-based active sources ref
  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeSourcesRef = useRef<Record<string, { source: AudioNode, gainNode: GainNode, filterNode?: BiquadFilterNode, oscillators?: OscillatorNode[] }>>({});

  // Timer interval reference
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Automatically select first subject if none active
  useEffect(() => {
    if (!activeSubjectId && subjects.length > 0) {
      setActiveSubjectId(subjects[0].id);
    }
  }, [subjects, activeSubjectId, setActiveSubjectId]);

  const activeSubject = subjects.find(s => s.id === activeSubjectId) || subjects[0];

  // Set default local goal from active subject goals
  useEffect(() => {
    if (activeSubject) {
      setLocalTargetMinutes(activeSubject.goalMinutes || 60);
    }
  }, [activeSubject]);

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

  // Start or stop a specific synth track
  const startTrackSynth = (trackId: string, trackVol: number) => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      // If already playing, stop first
      if (activeSourcesRef.current[trackId]) {
        stopTrackSynth(trackId);
      }

      if (trackId === "binaural") {
        const oscL = ctx.createOscillator();
        const oscR = ctx.createOscillator();
        oscL.type = "sine";
        oscR.type = "sine";
        oscL.frequency.setValueAtTime(110, ctx.currentTime);
        oscR.frequency.setValueAtTime(114, ctx.currentTime);

        const merger = ctx.createChannelMerger(2);
        oscL.connect(merger, 0, 0);
        oscR.connect(merger, 0, 1);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(trackVol * volume, ctx.currentTime);

        merger.connect(gain);
        gain.connect(ctx.destination);

        oscL.start();
        oscR.start();

        activeSourcesRef.current[trackId] = {
          source: merger,
          gainNode: gain,
          oscillators: [oscL, oscR]
        };
        return;
      }

      const bufferSize = 2 * ctx.sampleRate;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);

      if (trackId === "brown") {
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          output[i] = (lastOut + (0.02 * white)) / 1.02;
          lastOut = output[i];
          output[i] *= 3.5;
        }
      } else if (trackId === "waves") {
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }
      } else if (trackId === "rain") {
        for (let i = 0; i < bufferSize; i++) {
          let val = Math.random() * 2 - 1;
          if (Math.random() < 0.1) {
            val += (Math.random() * 2 - 1) * 0.5;
          }
          output[i] = val * 0.35;
        }
      } else if (trackId === "campfire") {
        for (let i = 0; i < bufferSize; i++) {
          let val = Math.random() * 2 - 1;
          if (Math.random() < 0.005) {
            val += (Math.random() > 0.5 ? 1 : -1) * 2.5;
          }
          output[i] = val * 0.15;
        }
      } else if (trackId === "keyboard") {
        for (let i = 0; i < bufferSize; i++) {
          let val = 0;
          if (Math.random() < 0.002) {
            val = Math.sin(i * 0.05) * Math.exp(-0.01 * (i % 1000));
          }
          output[i] = val * 0.2;
        }
      } else if (trackId === "forest") {
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          const brown = (lastOut + (0.015 * white)) / 1.015;
          lastOut = brown;
          let waterDrop = 0;
          if (Math.random() < 0.0004) {
            waterDrop = Math.sin(i * 0.02) * Math.exp(-0.004 * (i % 600));
          }
          output[i] = brown * 2.2 + waterDrop * 0.55;
        }
      }

      const source = ctx.createBufferSource();
      source.buffer = noiseBuffer;
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";

      if (trackId === "brown") {
        filter.frequency.setValueAtTime(320, ctx.currentTime);
      } else if (trackId === "waves") {
        filter.frequency.setValueAtTime(450, ctx.currentTime);
        modulateFilterWaves(filter, source);
      } else if (trackId === "rain") {
        filter.frequency.setValueAtTime(800, ctx.currentTime);
      } else if (trackId === "campfire") {
        filter.frequency.setValueAtTime(600, ctx.currentTime);
      } else if (trackId === "keyboard") {
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(1050, ctx.currentTime);
        filter.Q.setValueAtTime(6, ctx.currentTime);
      } else if (trackId === "forest") {
        filter.frequency.setValueAtTime(550, ctx.currentTime);
      }

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(trackVol * volume, ctx.currentTime);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      source.start();

      activeSourcesRef.current[trackId] = {
        source,
        gainNode: gain,
        filterNode: filter
      };
    } catch (e) {
      console.error("Failed to start speech or ambient noise simulator:", e);
    }
  };

  const stopTrackSynth = (trackId: string) => {
    try {
      const active = activeSourcesRef.current[trackId];
      if (active) {
        if (active.oscillators) {
          active.oscillators.forEach(osc => {
            try { osc.stop(); } catch(e){}
            try { osc.disconnect(); } catch(e){}
          });
        } else {
          try { (active.source as any).stop(); } catch(e){}
        }
        try { active.source.disconnect(); } catch(e){}
        try { active.gainNode.disconnect(); } catch(e){}
        if (active.filterNode) {
          try { active.filterNode.disconnect(); } catch(e){}
        }
        delete activeSourcesRef.current[trackId];
      }
    } catch (err) {
      // already stopped safely
    }
  };

  // Swell lowpass frequency up and down for ocean wave feel
  const modulateFilterWaves = (filter: BiquadFilterNode, sourceNode: AudioBufferSourceNode) => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    
    let isUp = true;
    const interval = setInterval(() => {
      // If the source node is disconnected or deleted, or stop has been triggered, wipe this loop
      const activeTrack = activeSourcesRef.current["waves"];
      if (!activeTrack || activeTrack.source !== sourceNode) {
        clearInterval(interval);
        return;
      }
      try {
        const nextFreq = isUp ? 650 : 220;
        filter.frequency.exponentialRampToValueAtTime(nextFreq, ctx.currentTime + 2.5);
        isUp = !isUp;
      } catch (e) {
        clearInterval(interval);
      }
    }, 3000);
  };

  // Turn on/off active channels based on isRunning & toggles
  const startAmbientSynthMixer = () => {
    synthTracks.forEach(track => {
      if (track.isPlaying && track.volume > 0) {
        startTrackSynth(track.id, track.volume);
      }
    });
  };

  const stopAmbientSynthMixer = () => {
    Object.keys(activeSourcesRef.current).forEach(trackId => {
      stopTrackSynth(trackId);
    });
  };

  // Handle live volume updates dynamically without buffer recreation
  useEffect(() => {
    if (isRunning && isFocusMode) {
      synthTracks.forEach(track => {
        const activeNode = activeSourcesRef.current[track.id];
        if (activeNode) {
          if (track.isPlaying && track.volume > 0) {
            if (audioCtxRef.current) {
              activeNode.gainNode.gain.setValueAtTime(track.volume * volume, audioCtxRef.current.currentTime);
            }
          } else {
            stopTrackSynth(track.id);
          }
        } else {
          if (track.isPlaying && track.volume > 0) {
            startTrackSynth(track.id, track.volume);
          }
        }
      });
    } else {
      stopAmbientSynthMixer();
    }
  }, [synthTracks, volume, isRunning, isFocusMode]);

  // Clean-up synthesis on unmount
  useEffect(() => {
    return () => {
      stopAmbientSynthMixer();
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(err => console.warn("Failed to close AudioContext on unmount:", err));
        audioCtxRef.current = null;
      }
    };
  }, []);


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
    stopAmbientSynthMixer();

    const roundedMinutes = elapsedSeconds / 60;
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
    stopAmbientSynthMixer();
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
    <div id="focus-section" className="liquid-glass rounded-3xl p-6 shadow-xs border">
      
      {/* Subject Selector panel */}
      {!isFocusMode && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-semibold text-lg text-slate-800 dark:text-slate-200">
              Select Your Focus Topic
            </h3>
            <span className="text-xs font-mono text-slate-500 bg-slate-100/60 dark:bg-black/25 px-2.5 py-1 rounded-full border border-slate-200/30 dark:border-white/5">
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
                  className={`relative p-3.5 rounded-2xl border text-left transition-all duration-300 overflow-hidden cursor-pointer active:scale-95 ${
                    isActive 
                      ? "border-emerald-500 bg-emerald-50/70 text-emerald-950 dark:bg-[#122c1e]/60 dark:text-emerald-400 font-bold shadow-md"
                      : "border-slate-200/30 dark:border-white/5 bg-white/45 dark:bg-white/[0.03] hover:bg-white/85 dark:hover:bg-white/[0.08] text-slate-650 dark:text-slate-400"
                  }`}
                >
                  <div className="flex flex-col gap-1 z-10 relative">
                    <span className="text-xs uppercase font-mono tracking-wider text-slate-400 dark:text-slate-500">
                      Category
                    </span>
                    <span className="font-sans text-sm truncate pr-2">{sub.name}</span>
                    <span className="text-xs font-mono text-slate-400 dark:text-slate-500 mt-1">
                      {formatStudyTimeExact(sub.totalMinutes)} done today
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

          {/* Pomodoro Quick Presets tool */}
          <div className="space-y-2 pt-2">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Session Focus Presets
            </span>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "15m Short Session ⚡", value: 15 },
                { label: "25m Standard Pomodoro 🛠️", value: 25 },
                { label: "50m Deep Work ⚡", value: 50 },
                { label: "90m Scholarly Sprint 🌌", value: 90 }
              ].map((p, idx) => {
                const isActive = localTargetMinutes === p.value;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setLocalTargetMinutes(p.value)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all duration-300 cursor-pointer active:scale-95 ${
                      isActive
                        ? "bg-emerald-605 border-emerald-600 text-white shadow-md scale-[1.02]"
                        : "bg-white/40 dark:bg-white/[0.03] border-slate-200/40 dark:border-white/5 hover:border-slate-300 text-slate-605 dark:text-slate-350"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick instructions */}
          {activeSubject && (
            <div className="bg-white/35 dark:bg-black/10 backdrop-blur-md rounded-2xl p-4 flex gap-3 text-slate-500 text-sm mt-1 items-start border border-slate-200/40 dark:border-white/5 shadow-inner">
              <Sparkles className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                Selected: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{activeSubject.name}</strong> • Target: <strong className="text-emerald-650 dark:text-emerald-400 font-bold">{localTargetMinutes} minutes</strong>. Ready to enter deep focus? We will synthesize real physical white noise waves locally. Start the timer to begin.
              </div>
            </div>
          )}

          {/* Large play triggers */}
          <div className="pt-4 flex justify-center">
            <button
              id="start-focus-btn"
              onClick={toggleTimer}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-8 py-4 rounded-2xl flex items-center gap-3 transition-transform hover:scale-103 shadow-lg shadow-emerald-600/15 cursor-pointer cursor-and-touch text-base active:scale-95 duration-300"
            >
              <Play className="w-5 h-5 fill-current" />
              Start Study Stopwatch
            </button>
          </div>
        </div>
      )}

      {/* FULL FOCUS MODE OVERLAY (Immersive concentration capsule) */}
      {isFocusMode && activeSubject && (() => {
        const secondCycle = elapsedSeconds % 16;
        let breathText = "Breathe In";
        let breathScale = 1;
        if (secondCycle < 4) {
          breathText = "Inhale 🌬️";
          breathScale = 1 + (secondCycle / 4) * 0.12;
        } else if (secondCycle < 8) {
          breathText = "Hold 🧘";
          breathScale = 1.12;
        } else if (secondCycle < 12) {
          breathText = "Exhale 🍃";
          breathScale = 1.12 - ((secondCycle - 8) / 4) * 0.12;
        } else {
          breathText = "Hold 🌸";
          breathScale = 1.0;
        }

        return (
          <div className="fixed inset-0 bg-slate-950 bg-[radial-gradient(circle_at_center,_rgba(16,185,129,0.12)_0%,_rgba(6,9,20,1)_75%)] flex flex-col items-center justify-between p-6 sm:p-12 z-50 animate-fade-in text-white no-scrollbar overflow-y-auto">
            {/* Background technical digital glass grid */}
            <div className="absolute inset-0 glass-grid opacity-[0.2] pointer-events-none z-0"></div>

            {/* Header information */}
            <div className="w-full max-w-md flex items-center justify-between pt-4 z-10">
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
            <div className="flex flex-col items-center my-auto py-8 z-10">
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
                    strokeDashoffset={830 - (830 * Math.min(elapsedSeconds, localTargetMinutes * 60)) / (localTargetMinutes * 60 || 3600)}
                    className="transition-all duration-1000 ease-linear text-glow"
                  />
                </svg>

                <div 
                  className="flex flex-col items-center z-10 text-center px-4 transition-transform duration-1000 ease-in-out"
                  style={{ transform: `scale(${breathScale})` }}
                >
                  <span className="text-xs tracking-wider uppercase font-mono text-emerald-400 font-extrabold animate-pulse">
                    {breathText}
                  </span>
                  <span className="text-5xl sm:text-6xl font-mono font-bold font-display text-white tracking-tighter text-glow my-3">
                    {formatTime(elapsedSeconds)}
                  </span>
                  <span className="text-xs text-slate-400 font-sans">
                    Earned: {formatStudyTimeExact(elapsedSeconds / 60)}
                  </span>
                  <span className="text-xs text-emerald-400/80 font-mono mt-1">
                    Target Goal: {localTargetMinutes}m
                  </span>
                </div>
              </div>

              <p className="text-sm text-slate-400 text-center max-w-xs mt-8">
                "Focus is a muscle. Keep pushing. Your future self is thanking you."
              </p>
            </div>

            {/* Sound simulation and controls footer */}
            <div className="w-full max-w-md bg-slate-900/90 border border-slate-800/80 p-5 rounded-3xl space-y-4 z-10 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-mono text-slate-400 tracking-wider">
                  Multi-channel Ambience Mixing Board
                </span>
                <div className="flex items-center gap-1.5 bg-emerald-950/80 border border-emerald-900/40 px-2.5 py-1 rounded-full text-emerald-400">
                  <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                  <span className="text-[11px] font-mono font-semibold uppercase">Soundboard Live</span>
                </div>
              </div>

              {/* Mixer Channels List */}
              <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1 no-scrollbar">
                {synthTracks.map((track) => {
                  return (
                    <div key={track.id} className="bg-slate-900/40 border border-slate-800/40 p-2.5 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{track.emoji}</span>
                          <span className="text-xs font-medium text-slate-200">{track.name}</span>
                        </div>
                        <button
                          onClick={() => {
                            setSynthTracks(prev =>
                              prev.map(t => t.id === track.id ? { ...t, isPlaying: !t.isPlaying } : t)
                            );
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                            track.isPlaying
                              ? "bg-emerald-900/50 border border-emerald-800 text-emerald-400"
                              : "bg-slate-800 border border-slate-700 text-slate-500"
                          }`}
                        >
                          {track.isPlaying ? "ON" : "OFF"}
                        </button>
                      </div>

                      {track.isPlaying && (
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={track.volume}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              setSynthTracks(prev =>
                                prev.map(t => t.id === track.id ? { ...t, volume: val } : t)
                              );
                            }}
                            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                          />
                          <span className="text-[10px] font-mono text-slate-500 w-8 text-right shrink-0">
                            {Math.round(track.volume * 100)}%
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Master Volume Slider */}
              <div className="pt-2 border-t border-slate-800/50 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 uppercase">
                  <span>Master Scale Multiplier</span>
                  <span>Vol: {Math.round(volume * 100)}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <VolumeX className="w-3.5 h-3.5 text-slate-600" />
                  <input
                    type="range"
                    min="0"
                    max="1.5"
                    step="0.05"
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <Volume2 className="w-3.5 h-3.5 text-emerald-500" />
                </div>
              </div>

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
                  Finish ({formatStudyTimeExact(elapsedSeconds / 60)})
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
        );
      })()}
    </div>
  );
}
