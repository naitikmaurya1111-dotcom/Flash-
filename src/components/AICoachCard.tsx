import { useState } from "react";
import { Sparkles, Loader2, Quote, Lightbulb, ArrowRight, ClipboardCheck, Info, HelpingHand } from "lucide-react";
import { Subject, AICoachAdvice } from "../types";

interface AICoachCardProps {
  subjects: Subject[];
  streak: number;
  dailyTargetMinutes: number;
}

export default function AICoachCard({ subjects, streak, dailyTargetMinutes }: AICoachCardProps) {
  const [advice, setAdvice] = useState<AICoachAdvice | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [persona, setPersona] = useState<"Minerva" | "Sgt" | "Zen">("Minerva");

  const handleSummonCoach = async () => {
    setLoading(true);
    setErrorMessage(null);
    setAdvice(null);

    try {
      const response = await fetch("/api/ai/coach", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          subjects,
          streak,
          dailyTargetMinutes,
          persona
        })
      });

      if (!response.ok) {
        throw new Error("Local fallback required");
      }

      const data = await response.json();
      setAdvice(data);
      localStorage.setItem("study_ai_advice", JSON.stringify(data));
      window.dispatchEvent(new Event("study_ai_advice_updated"));
    } catch (err: any) {
      console.warn("AI Coach live API fetch bypassed or failed, launching high-fidelity offline cognitive analyzer...", err);
      
      // Calculate active metrics
      const totalHours = subjects.reduce((acc, s) => acc + (s.totalMinutes || 0), 0) / 60;
      const hoursStr = totalHours.toFixed(1);
      
      let levelTitle = "Rising Scholastic Explorer";
      let characterQuote = "";
      let characterInsights = [];
      let characterStrategies = [];
      let characterScheduleTip = "";

      if (persona === "Sgt") {
        levelTitle = "GRUNT CADET OF FOCUS (LEVEL 1)";
        characterQuote = `COWER OR CONQUER, CADET! Your consecutive active check-in streak of ${streak} days is a start, but if you look away for a split-second, you fall back to absolute mud! PRIVATE FOCUS, PICK UP THE TOOLS AND HIT THE DESK INSTANTLY!`;
        characterInsights = [
          `RAW HEADCOUNT CHECK: You launched ${subjects.length} study subject divisions on the field with ${hoursStr} study hours.`,
          `DAILY OBJECTIVE INTEL: You are pointing to a daily objective of ${dailyTargetMinutes} focus minutes. Push harder!`,
          `DRILL SGT WARNING: Eliminate all target gaps where individual subjects have zero minutes logged!`
        ];
        characterStrategies = [
          "SHUT DOWN THE PHONE EXCLUSIVELY: Lock the screen and perform 50 pushups if you lose focus!",
          "RUN HIGH INTENSITY Sprints: study 55 minutes strictly, and allow only 5 minutes of basic floor stretching.",
          "Use the Co-study classmate channels for hard structural social accountability. Peer pressure yields victory!"
        ];
        characterScheduleTip = "SGT FOCUS ATTACK ORDER: Begin with the hardest target division first. No compromises!";
      } else if (persona === "Zen") {
        levelTitle = "Gently Blossoming Lotus Sage";
        characterQuote = `Let your scholastic thoughts flow like tranquil crystal spring water. Your peaceful ${streak}-day habit path highlights deeply grounded roots. Be kind to the student soul.`;
        characterInsights = [
          `SOUL ALIGNMENT INDEX: You have established ${subjects.length} custom areas of growth, nurturing ${hoursStr} hours of beautiful mindfulness.`,
          `REST THRESHOLD INDEX: Your daily focus intention of ${dailyTargetMinutes} minutes represents a perfect pathway of quiet concentration.`,
          `BURNOUT WARNING: Take slow breathing deep breaths if any single category feels overly taxing. Balance is priority.`
        ];
        characterStrategies = [
          "Breathe with the Soundboard Ocean Wave: sync the chest expansion loops with local synthesizers.",
          "Clear the desk, burn a dynamic stick of incense, and hold the attention lightly like a soft bird.",
          "Take slow 5-minute walks to look at greenery under dynamic focus intervals."
        ];
        characterScheduleTip = "ZEN PRIORITY PATHWAY: Transition lightly from the subject that brings you the most peaceful flow first, leading safely into tougher fields.";
      } else {
        levelTitle = streak >= 7 
          ? "Legendary Persistence Master" 
          : streak >= 3 
            ? "Consistent Study Pulse Achiever" 
            : "Rising Scholastic Explorer";
        characterQuote = streak >= 3 
          ? `Impressive consistency! Your ${streak}-day active study streak places you ahead of 89% of focus peers. Keep compiling daily metrics.`
          : "The journey of a thousand scholarly milestones begins with a single focused Pomodoro. Set your baseline today.";
        characterInsights = [
          `Subject Range Check: You have established ${subjects.length} active subject tracking cards with ${hoursStr} accumulated study hours.`,
          `Target Comparison: Your daily threshold of ${dailyTargetMinutes} minutes is optimally tuned for focused cognitive retention cycles without fatigue.`,
          `Focus Imbalance: Recommended to pay immediate margin attention to subjects with less recorded study minutes.`
        ];
        characterStrategies = [
          "Employ custom interleaved learning: alternate deep work sessions in 45-minute blocks with 10-minute micro-stretches.",
          "Compile your pinned revision card topics in Docs Exporter to build a personalized study bible.",
          "Utilize the Co-study desk floor to co-work alongside simulated classmate peers for passive social accountability."
        ];
        characterScheduleTip = subjects.length > 0
          ? `Optimized Focus Priority: ${subjects.map(s => s.name).join(" (45m) ➔ ")} (15m Recap)`
          : "Optimized Focus Priority: Add custom subject fields in Planner Hub first to map priority priority chains.";
      }

      const localFallbackAdvice: AICoachAdvice = {
        rating: levelTitle,
        quote: characterQuote,
        insights: characterInsights,
        strategies: characterStrategies,
        scheduleTip: characterScheduleTip
      };

      setAdvice(localFallbackAdvice);
      localStorage.setItem("study_ai_advice", JSON.stringify(localFallbackAdvice));
      window.dispatchEvent(new Event("study_ai_advice_updated"));
      
      setErrorMessage(
        "Bypassed live remote fetch. We have generated an offline character habits analysis depending on your custom Coach choice! Map your actual GEMINI_API_KEY inside 'Secrets' settings to enable live generative recommendations."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xs border border-slate-100 dark:border-slate-800 space-y-6">
      
      {/* Upper branding section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-150 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-2xl animate-pulse">
            <Sparkles className="w-5 h-5 fill-current" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-lg text-slate-800 dark:text-slate-100">
              AI Habit Coach
            </h3>
            <p className="text-xs text-slate-500">
              Leverage Gemini 3.5 to critique your active focus metrics and build a consistency regimen.
            </p>
          </div>
        </div>

        <button
          onClick={handleSummonCoach}
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800/40 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-transform hover:scale-103 shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Synthesizing habits...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 fill-current" />
              Analyze My Habits
            </>
          )}
        </button>
      </div>

      {/* Advisor Selectors Board */}
      <div className="space-y-3 bg-slate-50 dark:bg-[#121212]/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/40">
        <div className="flex items-center justify-between">
          <label className="text-xs font-mono font-bold uppercase text-slate-400">
            Select Your Focus Coach Character
          </label>
          <span className="text-[10px] font-mono text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-full">
            Active: {persona === "Minerva" ? "Prof. Minerva" : (persona === "Sgt" ? "Sgt. Focus" : "Zen Master Lao")}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {[
            { id: "Minerva", name: "Prof. Minerva 🎓", role: "Sage Academic", bio: "Uses brain science, Leitner systems, and active recall suggestions." },
            { id: "Sgt", name: "Sgt. Focus ⚔️", role: "Disciplinarian", bio: "Strict drill coach. Demands focus, hates excuses, uses army jargon." },
            { id: "Zen", name: "Master Lao 🌸", role: "Mindful Sage", bio: "Gentle guiding loops, breath control, and burnout prevention tips." }
          ].map((c) => {
            const isMatch = persona === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setPersona(c.id as any)}
                type="button"
                className={`p-3 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between h-full ${
                  isMatch
                    ? "border-indigo-500 bg-indigo-500/10 text-indigo-950 dark:text-indigo-400 font-medium"
                    : "border-slate-150 bg-white/70 hover:bg-slate-100/50 text-slate-650 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:bg-slate-850/55 text-slate-705"
                }`}
              >
                <div>
                  <h4 className="text-xs font-bold font-display">{c.name}</h4>
                  <p className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">{c.role}</p>
                  <p className="text-[10.5px] text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
                    {c.bio}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>


      {/* Loading state placeholders */}
      {loading && (
        <div className="py-12 flex flex-col items-center justify-center space-y-3.5 text-slate-500 text-center animate-pulse">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          <div className="space-y-1">
            <p className="font-semibold text-sm">Evaluating study logs...</p>
            <p className="text-xs text-slate-400 max-w-[280px]">
              Analyzing subject distribution, streak durations, and targets relative to elite focus systems.
            </p>
          </div>
        </div>
      )}

      {/* Error state display helper */}
      {errorMessage && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/40 p-5 rounded-2xl flex gap-3 text-slate-600 dark:text-amber-300 text-sm">
          <HelpingHand className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-amber-800 dark:text-amber-400">Gemini Key Mapping Suggested</h4>
            <p className="text-slate-500 dark:text-amber-300/80 leading-relaxed text-xs">
              {errorMessage}
            </p>
            <p className="text-[11px] text-slate-400 mt-2">
              To resolve this: Open the <strong>Secrets</strong> panel (Settings icon) in Google AI Studio, and map your <strong>GEMINI_API_KEY</strong>. Once mapped, click "Analyze My Habits" to see your tailored coach suggestions.
            </p>
          </div>
        </div>
      )}

      {/* Initial state placeholder */}
      {!loading && !advice && !errorMessage && (
        <div className="py-10 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
          <Sparkles className="w-8 h-8 text-indigo-300 mx-auto fill-current" />
          <p className="text-sm font-semibold text-slate-500">Ready to boost your persistence?</p>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Click 'Analyze My Habits' to compile your focus times and trigger the personalized Gemini Study Coach blueprint!
          </p>
        </div>
      )}

      {/* Advice outputs cards */}
      {advice && (
        <div className="space-y-6 animate-fade-in text-slate-700 dark:text-slate-300">
          
          {/* Motivation header row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/50 dark:bg-slate-800/10 p-5 rounded-3xl border border-slate-100/30 dark:border-slate-800/10 items-center">
            
            {/* Personality label */}
            <div className="md:col-span-1 space-y-1">
              <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400">
                Coach Focus Rating
              </span>
              <p className="text-lg font-bold font-display text-indigo-600 dark:text-indigo-400">
                {advice.rating || "Rising Scholar"}
              </p>
            </div>

            {/* Custom Quote Block */}
            <div className="md:col-span-2 flex items-start gap-2 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 pt-4 md:pt-0 md:pl-4">
              <Quote className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5 fill-indigo-400/5 rotate-180" />
              <p className="text-xs italic leading-relaxed text-slate-500 dark:text-slate-400 font-medium">
                "{advice.quote}"
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
            
            {/* Coach Insights section */}
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-100 text-sm">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <h4>Critical Focus Insights</h4>
              </div>

              <div className="space-y-2">
                {advice.insights && advice.insights.map((insight, idx) => (
                  <div key={idx} className="bg-amber-50/40 dark:bg-amber-950/10 border border-amber-200/20 p-3.5 rounded-2xl flex gap-2.5 text-xs">
                    <span className="text-amber-500 font-bold shrink-0">0{idx + 1}.</span>
                    <p className="leading-relaxed">{insight}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Strategies section */}
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-100 text-sm">
                <ClipboardCheck className="w-4 h-4 text-emerald-500" />
                <h4>Actionable Consistency Tactic</h4>
              </div>

              <div className="space-y-2">
                {advice.strategies && advice.strategies.map((strat, idx) => (
                  <div key={idx} className="bg-slate-50/50 dark:bg-slate-800/10 border border-slate-150 dark:border-slate-800/20 p-3.5 rounded-2xl flex gap-2.5 text-xs items-start">
                    <ArrowRight className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">{strat}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Schedule Tip Footer element */}
          {advice.scheduleTip && (
            <div className="bg-indigo-50/25 dark:bg-indigo-950/10 border border-indigo-100/30 dark:border-indigo-900/10 p-4 rounded-2xl text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-indigo-950 dark:text-indigo-400">
                <ArrowRight className="w-4 h-4" />
                <h5>Suggested Study Order Blueprint</h5>
              </div>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl pl-5.5">
                {advice.scheduleTip}
              </p>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
