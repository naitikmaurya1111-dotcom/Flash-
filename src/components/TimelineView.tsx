import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, Columns, Grid, Check, HelpCircle, Edit } from "lucide-react";
import { Subject } from "../types";

interface TimelineViewProps {
  subjects: Subject[];
  setSubjects: React.Dispatch<React.SetStateAction<Subject[]>>;
  onAddStudyMinutes: (subjectId: string, minutes: number) => Promise<void>;
  activeSubjectId: string;
  setActiveSubjectId: (id: string) => void;
  isStudying: boolean;
  setIsStudying: (val: boolean) => void;
  activeSeconds: number;
  setActiveSeconds: React.Dispatch<React.SetStateAction<number>>;
  onToggleSidebar: () => void;
}

export default function TimelineView({
  subjects,
  setSubjects,
  onAddStudyMinutes,
  activeSubjectId,
  setActiveSubjectId,
  isStudying,
  setIsStudying,
  activeSeconds,
  setActiveSeconds,
  onToggleSidebar,
}: TimelineViewProps) {
  const [showSubjectsModal, setShowSubjectsModal] = useState(false);
  const [activeTabSub, setActiveTabSub] = useState<string | null>(null);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [allDayEvents, setAllDayEvents] = useState<string[]>(["Google I/O event", "Diary 📓 Fill"]);
  const [isEditingSubjectsList, setIsEditingSubjectsList] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectColor, setNewSubjectColor] = useState("bg-emerald-500");

  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get current date representation like "Wed, 5/20"
  const [currentDateString, setCurrentDateString] = useState("");
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const formatOptions: Intl.DateTimeFormatOptions = { weekday: "short", month: "numeric", day: "numeric" };
      setCurrentDateString(now.toLocaleDateString("en-US", formatOptions));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Compute live current time positioning
  const [currentTimeOffset, setCurrentTimeOffset] = useState(0); // in pixels
  const [currentTimeLabel, setCurrentTimeLabel] = useState("");
  const HOUR_HEIGHT = 60; // 60px per hour

  useEffect(() => {
    const calculateOffset = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const totalMinutes = hours * 60 + minutes;
      setCurrentTimeOffset(totalMinutes * (HOUR_HEIGHT / 60));
      setCurrentTimeLabel(`${now.getHours() % 12 || 12}:${String(now.getMinutes()).padStart(2, "0")}`);
    };

    calculateOffset();
    const interval = setInterval(calculateOffset, 10000); // update every 10s
    return () => clearInterval(interval);
  }, []);

  // Scroll to active timeline offset on mount
  useEffect(() => {
    if (timelineContainerRef.current) {
      const container = timelineContainerRef.current;
      const targetScroll = Math.max(0, currentTimeOffset - 200);
      container.scrollTop = targetScroll;
    }
  }, [currentTimeOffset]);

  // Handle study interval stopwatch ticking
  useEffect(() => {
    if (isStudying) {
      timerIntervalRef.current = setInterval(() => {
        setActiveSeconds((prev) => prev + 1);
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
  }, [isStudying]);

  // Format Elapsed ticking seconds to format: "0:00:00"
  const formatTickingTime = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Format subject today elapsed study minutes to "0:00:00"
  const formatSubjectMinutes = (totalMins: number) => {
    const hrs = Math.floor(totalMins / 60);
    const mins = Math.floor(totalMins % 60);
    const secs = Math.floor((totalMins * 60) % 60);
    return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const handleStartStudy = (subjectId: string) => {
    if (isStudying && activeSubjectId === subjectId) {
      // Pause
      setIsStudying(false);
    } else {
      // Start/Switch subject
      setActiveSubjectId(subjectId);
      setIsStudying(true);
    }
  };

  const handleStopAndSave = async () => {
    if (activeSeconds > 0 && activeSubjectId) {
      const roundedMinutes = Math.max(1, Math.round(activeSeconds / 60));
      await onAddStudyMinutes(activeSubjectId, roundedMinutes);
      // Synchronize back
      setActiveSeconds(0);
      setIsStudying(false);
      setShowSubjectsModal(false);
    }
  };

  const colorOptions = [
    { bg: "bg-emerald-500", fromTo: "from-emerald-500 to-teal-600" },
    { bg: "bg-blue-500", fromTo: "from-blue-500 to-indigo-600" },
    { bg: "bg-orange-500", fromTo: "from-orange-500 to-amber-600" },
    { bg: "bg-purple-500", fromTo: "from-purple-500 to-pink-600" },
    { bg: "bg-pink-500", fromTo: "from-pink-500 to-rose-600" },
    { bg: "bg-violet-600", fromTo: "from-violet-600 to-indigo-750" },
    { bg: "bg-teal-500", fromTo: "from-teal-500 to-emerald-600" },
    { bg: "bg-red-500", fromTo: "from-red-500 to-rose-600" },
  ];

  const handleCreateSubject = () => {
    if (!newSubjectName.trim()) return;
    const matchedColor = colorOptions.find(c => c.bg === newSubjectColor) || colorOptions[0];
    const newSub: Subject = {
      id: "subject-" + Date.now(),
      name: newSubjectName,
      color: matchedColor.fromTo,
      icon: "BookOpen",
      totalMinutes: 0,
      goalMinutes: 120
    };
    setSubjects(prev => [...prev, newSub]);
    setNewSubjectName("");
    setIsEditingSubjectsList(false);
  };

  const handleDeleteSubject = (id: string) => {
    setSubjects(prev => prev.filter(s => s.id !== id));
  };

  // Helper arrays for hours display
  const hoursArray = Array.from({ length: 24 }, (_, i) => {
    const period = i >= 12 ? "PM" : "AM";
    const hr = i % 12 || 12;
    return { hourVal: i, label: `${hr} ${period}` };
  });

  return (
    <div className="relative text-white font-sans bg-white/45 dark:bg-[#0d0d0d]/40 backdrop-blur-lg flex flex-col h-full rounded-3xl overflow-hidden border border-slate-200/50 dark:border-slate-900/50" id="ypt-timeline-wrapper">
      
      {/* Header section */}
      <div className="flex items-center justify-between px-6 pt-5 pb-3 bg-transparent">
        <div className="flex items-center gap-3">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-800 dark:text-white">{currentDateString || "Wed, 5/20"}</h1>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-slate-205 dark:bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-300 dark:border-slate-700/55 text-slate-600 dark:text-slate-350">
            D-Day
          </span>
        </div>
        <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400">
          <button className="hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer" title="Split Panel View">
            <Columns className="w-5 h-5 stroke-[1.8]" />
          </button>
          <button onClick={onToggleSidebar} className="hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer" title="Switch Features Panel">
            <Grid className="w-5 h-5 stroke-[1.8]" id="grid-dashboard-toggle-btn" />
          </button>
        </div>
      </div>

      {/* All day Events subheader */}
      <div className="px-6 pb-4 flex items-center gap-2 bg-transparent border-b border-slate-200 dark:border-slate-900/40">
        <span className="text-xs text-slate-500 font-mono">All day</span>
        <div className="flex gap-2.5 overflow-x-auto no-scrollbar py-0.5">
          {allDayEvents.map((evt, idx) => (
            <div key={idx} className="flex items-center gap-1.5 bg-slate-100 dark:bg-[#171717] px-3 py-1 rounded-full border border-slate-200 dark:border-slate-800/40">
              <span className="w-2 h-2 rounded-full bg-cyan-500 inline-block"></span>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{evt}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main timeline canvas */}
      <div 
        ref={timelineContainerRef}
        className="flex-1 overflow-y-auto relative no-scrollbar bg-transparent py-4"
        style={{ height: "450px" }}
      >
        <div className="relative w-full" style={{ height: `${24 * HOUR_HEIGHT}px` }}>
          {/* Subtle dotted gridlines background */}
          {hoursArray.map(({ hourVal, label }) => (
            <div 
              key={hourVal} 
              className="absolute w-full flex items-center" 
              style={{ top: `${hourVal * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
            >
              {/* Hour identifier */}
              <div className="w-16 pl-6 text-[10px] font-mono text-slate-500 select-none">
                {label}
              </div>
              {/* Dashed line */}
              <div className="flex-1 border-t border-dashed border-slate-200 dark:border-slate-800/50 mr-6"></div>
            </div>
          ))}

          {/* Current Live Time indicator line overlay */}
          <div 
            className="absolute left-0 right-0 flex items-center z-20 pointer-events-none transition-all duration-1000"
            style={{ top: `${currentTimeOffset}px` }}
          >
            {/* Custom Orange Indicator Marker Badge */}
            <div className="w-16 flex justify-start pl-6">
              <span className="bg-[#f26419] text-white font-mono text-[9px] font-black leading-none px-1.5 py-0.5 rounded-sm shadow-sm">
                {currentTimeLabel}
              </span>
            </div>
            {/* Dynamic visual slider bar */}
            <div className="flex-1 h-0.5 bg-[#f26419] mr-6"></div>
          </div>
        </div>
      </div>

      {/* Centered Ticking play readout */}
      <div className="absolute bottom-[20px] left-0 right-0 flex justify-center z-30">
        <button
          onClick={() => setShowSubjectsModal(true)}
          className="flex items-center gap-3.5 bg-white/95 hover:bg-white text-[#0a0a0a] shadow-lg rounded-full py-3.5 px-7 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer border border-white/20 select-none font-bold tracking-tight text-sm"
        >
          {isStudying ? (
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
          ) : (
            <Play className="w-4 h-4 fill-current stroke-none text-[#0d0d0d]" />
          )}
          <span className="font-mono text-lg font-black tracking-tight">{formatTickingTime(activeSeconds)}</span>
        </button>
      </div>

      {/* Floating Subjects List Dialog Popover Modal */}
      {showSubjectsModal && (
        <div className="absolute inset-0 bg-white/75 dark:bg-[#0a0a0a]/90 backdrop-blur-md flex items-center justify-center p-5 z-40 animate-fade-in">
          <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-slate-800/90 rounded-3xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90%] shadow-xl">
            {/* Modal header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800/15">
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-150">Subjects</h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsEditingSubjectsList(!isEditingSubjectsList)}
                  className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors bg-slate-100 dark:bg-slate-800/40 hover:bg-slate-200 dark:hover:bg-slate-800 px-3 py-1 rounded-full cursor-pointer"
                >
                  <Edit className="w-3 h-3" />
                  {isEditingSubjectsList ? "Done" : "Edit subject"}
                </button>
                <button 
                  onClick={() => {
                    setShowSubjectsModal(false);
                    setIsEditingSubjectsList(false);
                  }}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                >
                  <span className="font-sans font-semibold text-sm">✕</span>
                </button>
              </div>
            </div>

            {/* Modal List Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3.5 max-h-[300px]">
              
              {isEditingSubjectsList && (
                <div className="bg-slate-100 dark:bg-[#1a1a1a] rounded-2xl p-4 border border-slate-200 dark:border-slate-800 space-y-3">
                  <p className="text-xs text-slate-550 dark:text-slate-400 font-semibold uppercase">Add New subject</p>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="e.g., Organic chemistry" 
                      value={newSubjectName}
                      onChange={(e) => setNewSubjectName(e.target.value)}
                      className="flex-1 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-505 text-slate-800 dark:text-slate-100"
                    />
                    <button 
                      onClick={handleCreateSubject}
                      className="bg-[#f26419] px-4 py-2 rounded-xl text-xs font-black text-white hover:opacity-90 cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {colorOptions.map((c) => (
                      <button
                        key={c.bg}
                        onClick={() => setNewSubjectColor(c.bg)}
                        className={`w-6 h-6 rounded-full ${c.bg} flex items-center justify-center cursor-pointer border ${newSubjectColor === c.bg ? 'border-white' : 'border-transparent'}`}
                      >
                        {newSubjectColor === c.bg && <Check className="w-3 h-3 text-white" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {subjects.map((sub) => {
                const isCurrentActive = activeSubjectId === sub.id;
                const liveMins = sub.totalMinutes + (isCurrentActive && isStudying ? activeSeconds / 60 : 0);
                const matchesColor = colorOptions.find(c => sub.color.includes(c.bg)) || colorOptions[0];
                return (
                  <div key={sub.id} className="flex items-center justify-between bg-slate-50 dark:bg-[#161616] p-3 rounded-2xl border border-slate-200 dark:border-slate-800/40">
                    <div className="flex items-center gap-3">
                      {/* Play Circle Trigger */}
                      <button
                        onClick={() => handleStartStudy(sub.id)}
                        className={`w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-all ${matchesColor.bg} text-white hover:scale-105 active:scale-95`}
                      >
                        {isStudying && isCurrentActive ? (
                          <Pause className="w-4 h-4 fill-current stroke-none" />
                        ) : (
                          <Play className="w-4 h-4 fill-current stroke-none ml-0.5" />
                        )}
                      </button>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{sub.name}</p>
                        <p className="text-[10px] font-mono text-slate-400">Ticking session status</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono font-bold text-slate-700 dark:text-slate-350">{formatSubjectMinutes(liveMins)}</span>
                      {isEditingSubjectsList && (
                        <button 
                          onClick={() => handleDeleteSubject(sub.id)}
                          className="bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/10 hover:bg-rose-500 hover:text-white transition-all text-[9px] font-black px-2 py-1 rounded-md cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Bottom Session Controls */}
            <div className="p-5 border-t border-slate-200 dark:border-slate-800/20 bg-slate-50 dark:bg-[#121212]/50 flex items-center justify-between">
              {isStudying ? (
                <div className="flex flex-col text-left">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-rose-600 dark:text-rose-400">Timer is active</span>
                  <span className="text-sm font-semibold truncate max-w-[130px] text-slate-800 dark:text-slate-100">{subjects.find(s => s.id === activeSubjectId)?.name}</span>
                </div>
              ) : (
                <span className="text-xs text-slate-500">No active studies</span>
              )}

              <div className="flex gap-2">
                {activeSeconds > 0 && (
                  <button 
                    onClick={handleStopAndSave}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer shadow-md"
                  >
                    Finish Session ({Math.round(activeSeconds / 60)}m)
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
