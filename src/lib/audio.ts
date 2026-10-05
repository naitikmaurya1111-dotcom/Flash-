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
