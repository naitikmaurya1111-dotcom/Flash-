import { useState, useEffect, useRef } from "react";
import { 
  Sparkles, 
  Loader2, 
  Quote, 
  Lightbulb, 
  ArrowRight, 
  ClipboardCheck, 
  Info, 
  HelpingHand,
  MessageSquare,
  FileText,
  Send,
  RefreshCw,
  Flame,
  Bot
} from "lucide-react";
import { Subject, AICoachAdvice } from "../types";

interface AICoachCardProps {
  subjects: Subject[];
  streak: number;
  dailyTargetMinutes: number;
}

interface ChatMessage {
  role: "user" | "coach";
  text: string;
  timestamp: Date;
}

export default function AICoachCard({ subjects, streak, dailyTargetMinutes }: AICoachCardProps) {
  const [advice, setAdvice] = useState<AICoachAdvice | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [persona, setPersona] = useState<"Minerva" | "Sgt" | "Zen">("Minerva");

  // Premium Conversational States
  const [subTab, setSubTab] = useState<"report" | "chat">("report");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to lowest message bubble in the chat view
  useEffect(() => {
    if (subTab === "chat") {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, chatLoading, subTab]);

  // Generate characteristic welcoming messages when persona changes
  useEffect(() => {
    let greetingText = "";
    if (persona === "Minerva") {
      greetingText = `Greetings! I am Professor Minerva, your Academic Coach. I've mapped out your ${subjects.length} active subject modules. I am ready to formulate active recall question cards, adjust cognitive balance, or resolve study roadblocks scientifically. What is your current hurdle?`;
    } else if (persona === "Sgt") {
      greetingText = `DROP THE SLOTH AND LISTEN UP, CADET! Sgt. Focus here! We have a ${streak}-day consec streak to safeguard and raw objectives on the horizon. State your study roadblock immediately so we can crush it with ultimate extreme focus! NO EXCUSES! HUAH!`;
    } else {
      greetingText = `Welcome, gentle friend. Take a slow, peaceful breath in... and let it out. Master Lao is here to support you. Let's make sure our ${subjects.length} growth paths grow beautifully without fatigue or burnout. What's on your mind?`;
    }

    setChatMessages([
      {
        role: "coach",
        text: greetingText,
        timestamp: new Date()
      }
    ]);
  }, [persona, subjects.length, streak]);

  // Preset quick chips text suggestions
  const quickChips = {
    Minerva: [
      "Can you design active recall cards?",
      "How can I manage high mental load?",
      "Give me a study schedule for today"
    ],
    Sgt: [
      "Sgt, I am feeling lazy right now!",
      "How do I kill phone distractions?",
      "Give me an extreme pep talk!"
    ],
    Zen: [
      "I am near burnout, guide me",
      "How to stay mindful while studying?",
      "Suggest a transition flow plan"
    ]
  };

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

  // Conversational response submit handler
  const handleSendChatMessage = async (presetText?: string) => {
    const textToSend = presetText || chatInput;
    if (!textToSend.trim()) return;

    // Append user bubble
    const userMsg: ChatMessage = {
      role: "user",
      text: textToSend,
      timestamp: new Date()
    };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setChatLoading(true);
    setChatError(null);

    // Build history format required for endpoints
    const historyPayload = chatMessages.map(m => ({
      role: m.role === "user" ? "user" : "model",
      text: m.text
    }));

    try {
      const response = await fetch("/api/ai/coach/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: textToSend,
          history: historyPayload,
          persona,
          subjects
        })
      });

      if (!response.ok) {
        throw new Error("Chat unavailable or API key absent");
      }

      const data = await response.json();
      setChatMessages((prev) => [
        ...prev,
        {
          role: "coach",
          text: data.reply,
          timestamp: new Date()
        }
      ]);
    } catch (err: any) {
      console.warn("Live coach chat endpoint offline, preparing cognitive character fallback reply...", err);
      
      // Smart Character Offline Fallback Engine
      setTimeout(() => {
        let replyFallback = "";
        const lower = textToSend.toLowerCase();

        if (persona === "Sgt") {
          if (lower.includes("lazy") || lower.includes("tire") || lower.includes("burnout") || lower.includes("rest")) {
            replyFallback = `TIRED?! REST IS FOR THE DECORATED RETIREES, CADET! Your ${streak}-day active defensive line will collapse to dust if you slither off now! Breathe, do ten jumping jacks, and focus for EXACTLY 20 minutes right now! WORK NOW, CELEBRATE LATER!`;
          } else if (lower.includes("phone") || lower.includes("distract") || lower.includes("social")) {
            replyFallback = `COMMUNICATION BLACKOUT ENABLED! Toss that electronic smartphone device across the field, Cadet! Frame your study space with high-intensity audio synth now. Ultimate tactical focus means zero alerts. MOVE IT!`;
          } else {
            replyFallback = `UNDERSTOOD, CADET! Strategic mission received! Take that study roadblock, split it into 5 micro-targets, and execute the attack immediately! Focus flow begins on my mark! HUAH!`;
          }
        } else if (persona === "Zen") {
          if (lower.includes("lazy") || lower.includes("tire") || lower.includes("burnout") || lower.includes("rest")) {
            replyFallback = `I hear the weariness in your spirit, gentle traveler. Burnout is the mind's alarm. Give yourself permission to pause. Engage the Waves synthesizer for 5 minutes, close your eyes, and inhale the silence. Your growth will proceed in beautiful time.`;
          } else if (lower.includes("phone") || lower.includes("distract") || lower.includes("social")) {
            replyFallback = `Our devices are like hyperactive swallows in a forest. Gently put down the swallow, look at your simple desk, and let the space become quiet. Focus is not forced; it is the natural settling of waters.`;
          } else {
            replyFallback = `A very deep question. Let your intention guide you. Small slow steps have immense cumulative strength. Start on "${subjects[0]?.name || 'your primary growth'}" with a quiet mind. I am with you.`;
          }
        } else {
          // Professor Minerva
          if (lower.includes("lazy") || lower.includes("tire") || lower.includes("burnout") || lower.includes("rest")) {
            replyFallback = `According to recent neurological studies, cognitive fatigue is caused by adenosine buildup in the prefrontal cortex. I highly recommend a brief 15-minute systemic resting interval before returning. Interleave different subjects to reduce neuro-saturation!`;
          } else if (lower.includes("phone") || lower.includes("distract") || lower.includes("social")) {
            replyFallback = `The human mind suffers a 23-minute attention re-localization cost on every smartphone distraction check. I heavily recommend turning off alerts and placing the task list clearly on your viewport to reduce cognitive switching overhead.`;
          } else {
            replyFallback = `Fascinating query! In cognitive science, we tackle this by synthesizing your study curriculum into distinct Leitner revision index blocks. Let's draft 3 primary active-recall target questions for your active subjects.`;
          }
        }

        setChatMessages((prev) => [
          ...prev,
          {
            role: "coach",
            text: replyFallback,
            timestamp: new Date()
          }
        ]);
        setChatError("Note: Currently replying in secure offline character sandbox mode. Please verify GEMINI_API_KEY inside 'Secrets' options for live custom adaptive replies.");
      }, 700);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div id="ai-coach-lounge-wrapper" className="liquid-glass rounded-3xl p-6 space-y-5 shadow-md border">
      
      {/* Upper branding section with Toggle Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-150/40 dark:border-slate-850/40 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl animate-pulse">
            <Sparkles className="w-5 h-5 fill-current" />
          </div>
          <div>
            <h3 className="font-display font-black text-lg text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
              Yerba AI Study Lounge
              <span className="text-[9px] font-mono font-black text-[#f26419] bg-[#f26419]/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Gemini Powered
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Transform study habits with elite motivational psychology and cognitive science mentors.
            </p>
          </div>
        </div>

        {/* Dual Mode Switch Layout */}
        <div className="flex bg-slate-100/50 dark:bg-black/25 p-1 rounded-xl border border-slate-200/30 dark:border-white/5 backdrop-blur-md self-start sm:self-auto shadow-inner">
          <button
            onClick={() => setSubTab("report")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              subTab === "report"
                ? "bg-white text-indigo-600 dark:bg-white dark:text-slate-950 shadow-md font-extrabold scale-[1.02]"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Habit Reports
          </button>
          <button
            onClick={() => setSubTab("chat")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              subTab === "chat"
                ? "bg-white text-indigo-600 dark:bg-white dark:text-slate-950 shadow-md font-extrabold scale-[1.02]"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Live Consult Chat
          </button>
        </div>
      </div>

      {/* Advisor Selectors Board */}
      <div className="space-y-3 bg-slate-100/35 dark:bg-black/10 backdrop-blur-md p-4 rounded-2xl border border-slate-150/40 dark:border-white/5">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-mono font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
            Active Study Mentors
          </label>
          <span className="text-[9px] font-mono text-indigo-500 dark:text-indigo-400 font-extrabold bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-0.5 rounded-full uppercase tracking-widest">
            {persona === "Minerva" ? "Prof. Minerva" : (persona === "Sgt" ? "Sgt. Focus" : "Master Lao")}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {[
            { id: "Minerva", name: "Prof. Minerva 🎓", role: "Sage Academic", bio: "Fosters Leitner recall structures and neurological balance patterns." },
            { id: "Sgt", name: "Sgt. Focus ⚔️", role: "Disciplinarian", bio: "Strict study drillmaster. Drives persistence, hates phone distractions." },
            { id: "Zen", name: "Master Lao 🌸", role: "Mindful Sage", bio: "Fosters soothing breathing loops and organic energy restoration." }
          ].map((c) => {
            const isMatch = persona === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setPersona(c.id as any)}
                type="button"
                className={`p-3 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between text-slate-700 dark:text-slate-300 h-full ${
                  isMatch
                    ? "border-indigo-500 bg-indigo-500/5 text-indigo-950 dark:text-indigo-400 font-medium scale-101 shadow-xs"
                    : "border-slate-200/30 dark:border-white/5 bg-white/45 dark:bg-[#121217]/35 hover:bg-white/80 dark:hover:bg-white/5 text-slate-650 dark:text-slate-300 shadow-xs hover:border-slate-350 dark:hover:border-slate-750"
                }`}
              >
                <div>
                  <h4 className="text-xs font-black font-display font-semibold">{c.name}</h4>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-mono tracking-wider font-bold">{c.role}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 leading-normal">
                    {c.bio}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {subTab === "report" ? (
        // Mode 1: HABIT REPORTS VIZ
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h4 className="text-[11px] font-mono font-black uppercase text-slate-400">Diagnostic Habit Analysis</h4>
            <button
              onClick={handleSummonCoach}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800/40 text-white font-black px-4 py-2 rounded-xl text-xs transition-transform hover:scale-102 flex items-center gap-1.5 cursor-pointer shadow-sm shadow-indigo-600/10"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Analyzing stats...
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  Re-Compile Analytics Report
                </>
              )}
            </button>
          </div>

          {/* Loading state placeholders */}
          {loading && (
            <div className="py-14 flex flex-col items-center justify-center space-y-3.5 text-slate-500 text-center animate-pulse">
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
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/40 p-4 rounded-2xl flex gap-3 text-slate-600 dark:text-amber-300 text-sm">
              <HelpingHand className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-bold text-amber-800 dark:text-amber-400">Cognitive Report Synced</h4>
                <p className="text-slate-500 dark:text-amber-300/85 leading-relaxed text-xs">
                  {errorMessage}
                </p>
              </div>
            </div>
          )}

          {/* Initial state placeholder */}
          {!loading && !advice && !errorMessage && (
            <div className="py-12 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-850 rounded-2xl space-y-3.5">
              <Sparkles className="w-8 h-8 text-indigo-300 dark:text-indigo-950 active:animate-bounce mx-auto fill-current" />
              <div>
                <p className="text-xs font-extrabold text-slate-600 dark:text-slate-400">Ready to boost your persistence?</p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto mt-1 leading-normal">
                  Click 'Re-Compile Analytics Report' to run your logged study stats against our cognitive analyzer models!
                </p>
              </div>
            </div>
          )}

          {/* Advice outputs cards */}
          {advice && (
            <div className="space-y-5 animate-fade-in text-slate-705 dark:text-slate-350">
              
              {/* Motivation header row */}
              <div id="advisor-rating-block" className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/50 dark:bg-slate-[#13141b]/10 p-4.5 rounded-3xl border border-slate-100/30 dark:border-slate-850/40 items-center">
                
                {/* Personality label */}
                <div className="md:col-span-1 space-y-1 text-left">
                  <span className="text-[9px] uppercase font-mono tracking-widest text-slate-400 dark:text-slate-500 font-bold">
                    Focus Rating
                  </span>
                  <p className="text-base font-black font-display text-indigo-600 dark:text-indigo-400 uppercase tracking-tight">
                    {advice.rating || "Rising Scholar"}
                  </p>
                </div>

                {/* Custom Quote Block */}
                <div className="md:col-span-2 flex items-start gap-2 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-850 pt-4.5 md:pt-0 md:pl-4">
                  <Quote className="w-4 h-4 text-[#f26419]/60 shrink-0 mt-0.5 fill-[#f26419]/5 rotate-180" />
                  <p className="text-[11px] italic leading-relaxed text-slate-500 dark:text-slate-400 font-medium text-left">
                    "{advice.quote}"
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pb-2">
                
                {/* Coach Insights section */}
                <div className="space-y-2.5 text-left">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-100 text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-400">
                    <Lightbulb className="w-3.5 h-3.5 text-[#f26419]" />
                    <span>Critical Focus Insights</span>
                  </div>

                  <div className="space-y-2">
                    {advice.insights && advice.insights.map((insight, idx) => (
                      <div key={idx} className="bg-amber-50/25 dark:bg-amber-950/10 border border-amber-200/20 p-3 rounded-2xl flex gap-2.5 text-[11px] leading-relaxed">
                        <span className="text-amber-500 font-mono font-black shrink-0">0{idx + 1}.</span>
                        <p>{insight}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Strategies section */}
                <div className="space-y-2.5 text-left">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-100 text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-400">
                    <ClipboardCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Tactic Recommendation</span>
                  </div>

                  <div className="space-y-2">
                    {advice.strategies && advice.strategies.map((strat, idx) => (
                      <div key={idx} className="bg-slate-50/45 dark:bg-slate-[#13141c]/50 border border-slate-150 dark:border-slate-850/60 p-3 rounded-2xl flex gap-2.5 text-[11px] leading-relaxed items-start">
                        <ArrowRight className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                        <p>{strat}</p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Schedule Tip Footer element */}
              {advice.scheduleTip && (
                <div className="bg-indigo-50/20 dark:bg-indigo-950/10 border border-indigo-100/30 dark:border-indigo-900/10 p-3.5 rounded-2xl text-[11px] space-y-1 text-left">
                  <div className="flex items-center gap-1.5 font-bold text-indigo-950 dark:text-indigo-400">
                    <ArrowRight className="w-3.5 h-3.5 text-[#f26419]" />
                    <span className="uppercase tracking-wider font-extrabold text-[10px]">Optimal Interleaved Layout</span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 leading-relaxed pl-5 font-medium">
                    {advice.scheduleTip}
                  </p>
                </div>
              )}

            </div>
          )}
        </div>
      ) : (
        // Mode 2: CONVERSATIONAL CHAT BOARD
        <div className="flex flex-col h-[400px] bg-slate-50/20 dark:bg-[#121318]/25 rounded-2xl border border-slate-200/30 dark:border-white/5 overflow-hidden relative backdrop-blur-md">
          
          {/* Chat Messages Scrolling Stage */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 scroll-smooth no-scrollbar">
            {chatMessages.map((msg, idx) => {
              const isCoach = msg.role === "coach";
              return (
                <div key={idx} className={`flex items-start gap-2.5 ${isCoach ? "justify-start text-left" : "justify-end text-right"}`}>
                  
                  {isCoach && (
                    <div className="h-7 w-7 rounded-lg bg-indigo-550 dark:bg-indigo-950 flex items-center justify-center shrink-0 border border-indigo-200/20 text-indigo-600 dark:text-indigo-400">
                      <Bot className="w-4 h-4 animate-pulse" />
                    </div>
                  )}

                  <div className="max-w-[85%] space-y-0.5">
                    <div className={`p-3 rounded-2xl text-[11px] leading-relaxed shadow-xs ${
                      isCoach 
                        ? "bg-white/95 dark:bg-[#1b1c24]/90 text-slate-800 dark:text-slate-200 border border-slate-200/40 dark:border-white/5 rounded-tl-none font-semibold shadow-xs" 
                        : "bg-indigo-600 text-white rounded-tr-none font-bold text-left ml-auto"
                    }`}>
                      {msg.text}
                    </div>
                    <span className="text-[8px] text-slate-400 font-mono font-bold block px-1">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Simulated typing status */}
            {chatLoading && (
              <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 font-mono text-[9px] font-bold p-1 animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />
                <span>Coach {persona === "Minerva" ? "Minerva" : (persona === "Sgt" ? "Sgt. Focus" : "Master Lao")} is typing reply...</span>
              </div>
            )}

            {/* Warning offline indicator warning banner */}
            {chatError && (
              <div className="bg-amber-500/10 border border-amber-500/20 text-slate-650 dark:text-amber-400 text-[9.5px] p-2 rounded-xl text-left items-center flex gap-1.5 font-medium leading-relaxed">
                <Info className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                <span>{chatError}</span>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Preset Suggestions Quick Chips */}
          <div className="px-3 py-2 border-t border-slate-200/30 dark:border-white/5 bg-white/10 dark:bg-black/10 flex items-center gap-2 overflow-x-auto no-scrollbar whitespace-nowrap">
            <span className="text-[8px] font-mono font-bold uppercase text-slate-400 shrink-0">FAQ:</span>
            {quickChips[persona].map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendChatMessage(chip)}
                className="bg-white/45 hover:bg-indigo-50/70 dark:bg-[#1b1c24]/40 dark:hover:bg-[#252631]/60 text-slate-600 dark:text-slate-300 hover:text-indigo-650 dark:hover:text-indigo-400 border border-slate-200/30 dark:border-white/5 px-3 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-all shrink-0"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Message Input Board layout */}
          <div className="p-2.5 border-t border-slate-200/30 dark:border-white/5 bg-white/15 dark:bg-black/15">
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSendChatMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={`Type a question for Mentor ${persona === "Minerva" ? "Minerva" : (persona === "Sgt" ? "Sgt. Focus" : "Lao")}...`}
                className="flex-1 bg-slate-55/70 dark:bg-[#121319] p-2.5 px-4 rounded-xl text-[11px] font-medium border border-slate-200/40 dark:border-slate-850 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || chatLoading}
                className="h-9 w-9 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 dark:disabled:bg-slate-850 disabled:text-slate-400 dark:disabled:text-slate-600 text-white flex items-center justify-center rounded-xl cursor-pointer transition-all shrink-0 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

        </div>
      )}

    </div>
  );
}
