import React, { useState } from "react";
import { Filter, Calendar, Sparkles, AlertCircle, ChevronLeft, ChevronRight, Check, X, Plus, Clock } from "lucide-react";
import { StudyLog, Subject, calculateStudentLevel, getXpRateForLevel } from "../types";

interface CalendarViewProps {
  studyLogs: StudyLog[];
  subjects?: Subject[];
  onAddStudyMinutes?: (subjectId: string, minutes: number, customDate?: string) => Promise<void>;
  userXp: number;
}

interface CalendarEventItem {
  id: string;
  day: number;
  title: string;
  color: string; // Tailwind class
}

export default function CalendarView({ studyLogs, subjects = [], onAddStudyMinutes, userXp }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date()); // Dynamic current date to support current month (June)
  const [selectedLogsDate, setSelectedLogsDate] = useState<string | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "high" | "low">("all");

  // Form states for adding manual backdated study hours
  const [submittingLog, setSubmittingLog] = useState(false);
  const [manualSubjectId, setManualSubjectId] = useState(subjects[0]?.id || "");
  const [manualMinutes, setManualMinutes] = useState(45);
  const [logSuccessText, setLogSuccessText] = useState<string | null>(null);

  // Calculate consecutive active study days from actual log history
  const consecutiveStreak = React.useMemo(() => {
    if (!studyLogs || studyLogs.length === 0) return 0;
    
    // Sort study logs by date string (YYYY-MM-DD) descending
    const uniqueDates = Array.from(new Set(
      studyLogs
        .filter(l => l.durationMinutes > 0)
        .map(l => l.date)
    )).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    
    if (uniqueDates.length === 0) return 0;
    
    const getFormattedDateStr = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    const todayStr = getFormattedDateStr(new Date());
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getFormattedDateStr(yesterday);
    
    // Streak continues if student has at least 1 study min today or yesterday
    const hasToday = uniqueDates.includes(todayStr);
    const hasYesterday = uniqueDates.includes(yesterdayStr);
    
    if (!hasToday && !hasYesterday) {
      return 0; // broken
    }
    
    let currentCheckDate = hasToday ? new Date() : yesterday;
    let streakCount = 0;
    
    // Subtract dates iteratively to build a bulletproof streak count
    while (true) {
      const checkStr = getFormattedDateStr(currentCheckDate);
      if (uniqueDates.includes(checkStr)) {
        streakCount++;
        currentCheckDate.setDate(currentCheckDate.getDate() - 1);
      } else {
        break;
      }
    }
    
    return streakCount;
  }, [studyLogs]);

  // Mini contribution heatmap data for the past 14 days
  const miniHeatmapData = React.useMemo(() => {
    const today = new Date();
    const data = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      const dayMinutes = studyLogs
        .filter(l => l.date === dateStr)
        .reduce((sum, l) => sum + l.durationMinutes, 0);
        
      data.push({
        dateStr,
        dayNum: d.getDate(),
        monthShort: d.toLocaleString("default", { month: "short" }),
        minutes: dayMinutes
      });
    }
    return data;
  }, [studyLogs]);


  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Hardcoded mockup holidays / other YPT events from the user images:
  // Buddha Purnima on Fri 1st, Birthday of Rabindranath, Google I/O event, etc.
  const presetEvents: CalendarEventItem[] = [
    { id: "e1-1", day: 1, title: "Buddha Purnima", color: "bg-emerald-950/40 text-emerald-500 font-medium" },
    { id: "e1-2", day: 1, title: "Buddha Purnima", color: "bg-emerald-950/40 text-emerald-500 font-medium" },
    { id: "e1-3", day: 1, title: "Buddha Purnima", color: "bg-emerald-950/40 text-emerald-500 font-medium" },
    { id: "e1-4", day: 1, title: "Buddha Purnima", color: "bg-emerald-950/40 text-emerald-500 font-medium" },
    { id: "e9-1", day: 9, title: "Birthday of Rabindranath", color: "bg-emerald-950/40 text-emerald-500 font-medium" },
    { id: "e9-2", day: 9, title: "Birthday of Rabindranath", color: "bg-emerald-950/40 text-emerald-500 font-medium" },
    { id: "e9-3", day: 9, title: "Birthday of Rabindranath", color: "bg-slate-100 dark:bg-[#181818]/80 text-[#1abb9c] font-medium" },
    { id: "e11-1", day: 11, title: "Study only maths lecture 4", color: "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300" },
    { id: "e19-1", day: 19, title: "Google I/O event", color: "bg-cyan-100 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-400 font-bold" },
    { id: "e20-1", day: 20, title: "Diary 📓 Fill", color: "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300" },
    { id: "e27-1", day: 27, title: "Bakrid (tentative)", color: "bg-emerald-950/40 text-emerald-500 font-medium" },
    { id: "e27-2", day: 27, title: "Bakrid (tentative)", color: "bg-emerald-950/40 text-emerald-500 font-medium" },
    { id: "e27-3", day: 27, title: "Bakrid (tentative)", color: "bg-emerald-950/40 text-emerald-500 font-medium" },
    { id: "e27-4", day: 27, title: "Bakrid (tentative)", color: "bg-emerald-950/40 text-emerald-500 font-medium" },
  ];

  // Hardcoded mockup study block label records to populate the calendar (matching user mockups)
  const presetStudyLabels: Record<number, string> = {
    29: "0:08",
    30: "2:45",
    1: "0:56",
  };

  // Generate complete calendar grid array
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // First day of selected month: e.g. May 2026 starts on Friday
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sun, 1 is Mon...
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Preceding month filler calculation to snap matching week labels
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const adjustedFirstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1; // Align to Mon-first grid

  const gridCells = [];

  // 1. Previous Month days fillers
  for (let i = adjustedFirstDayIndex - 1; i >= 0; i--) {
    gridCells.push({
      day: daysInPrevMonth - i,
      month: "prev",
      dateStr: `${year}-${String(month).padStart(2, "0")}-${String(daysInPrevMonth - i).padStart(2, "0")}`
    });
  }

  // 2. Active Month days
  for (let i = 1; i <= daysInMonth; i++) {
    const formattedDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
    gridCells.push({
      day: i,
      month: "current",
      dateStr: formattedDate
    });
  }

  // 3. Next month days fillers to format perfect balanced 42 layout boxes
  const remainingCells = 42 - gridCells.length;
  for (let i = 1; i <= remainingCells; i++) {
    gridCells.push({
      day: i,
      month: "next",
      dateStr: `${year}-${String(month + 2).padStart(2, "0")}-${String(i).padStart(2, "0")}`
    });
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleOpenDayModal = (dateStr: string) => {
    setSelectedLogsDate(dateStr);
    setLogSuccessText(null);
    // Auto-select first subject if currently selected is not in active list or empty
    const exists = subjects.some(s => s.id === manualSubjectId);
    if ((!exists || !manualSubjectId) && subjects.length > 0) {
      setManualSubjectId(subjects[0].id);
    }
  };

  const submitManualStudyLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLogsDate || !onAddStudyMinutes) return;
    const targetSubId = manualSubjectId || subjects[0]?.id;
    if (!targetSubId) {
      alert("Please create at least one Subject in the custom Planner or Study workspace tab first.");
      return;
    }

    // Enforce 6-hour (360 mins) max check before submission
    const existingMinsForDate = studyLogs
      .filter(l => l.date === selectedLogsDate)
      .reduce((sum, l) => sum + l.durationMinutes, 0);

    if (existingMinsForDate + manualMinutes > 360) {
      alert(`⚠️ Academic Integrity Rule: Daily logged study time is capped at a maximum of 6 hours (360 minutes). This selected date already has ${existingMinsForDate} minutes logged. Adding ${manualMinutes} minutes would exceed the 6-hour daily maximum.`);
      return;
    }

    setSubmittingLog(true);
    try {
      await onAddStudyMinutes(targetSubId, manualMinutes, selectedLogsDate);
      const chosenSubject = subjects.find(s => s.id === targetSubId);
      const currentLevel = calculateStudentLevel(userXp).level;
      const currentRate = getXpRateForLevel(currentLevel);
      setLogSuccessText(`Successfully logged ${manualMinutes}m in ${chosenSubject?.name || "Subject"} for ${selectedLogsDate}! You gained +${manualMinutes * currentRate} XP. 🚀`);
      setTimeout(() => {
        setLogSuccessText(null);
      }, 5000);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingLog(false);
    }
  };

  return (
    <div className="relative text-slate-800 dark:text-white font-sans bg-white dark:bg-[#0d0d0d] flex flex-col h-full rounded-x3l rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-900/50" id="ypt-calendar-canvas">
      
      {/* Upper Month Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-slate-100 dark:border-slate-900/10">
        <div className="flex items-center gap-2.5">
          <Calendar className="w-5 h-5 text-[#f26419]" />
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {months[month]} <span className="text-xs text-slate-400 dark:text-slate-500 font-mono font-normal">({year})</span>
          </h2>
        </div>
        
        <div className="flex items-center gap-2">
          <p className="text-[11px] text-slate-400 dark:text-slate-500 hidden sm:block">Click any calendar cell to backdate or view logs!</p>
          <div className="flex gap-1 bg-slate-100 dark:bg-[#151515] p-1 rounded-xl border border-slate-200 dark:border-slate-900">
            <button onClick={handlePrevMonth} className="p-1 px-2 rounded-lg bg-white dark:bg-slate-800/20 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800/80 transition-colors cursor-pointer">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={handleNextMonth} className="p-1 px-2 rounded-lg bg-white dark:bg-slate-800/20 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800/80 transition-colors cursor-pointer">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Week Header Index Row */}
      <div className="grid grid-cols-7 border-b border-slate-150 dark:border-slate-900/20 text-center py-2 bg-slate-50 dark:bg-[#090909]">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((dayName) => (
          <div key={dayName} className="text-xs font-semibold text-slate-400 dark:text-slate-500 font-mono">
            {dayName}
          </div>
        ))}
      </div>

      {/* Streak Fire Banner & Heatmap Panel */}
      <div className="bg-slate-50 dark:bg-[#0c0c0c] border-b border-slate-150 dark:border-slate-900/50 p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Streak Flame Container */}
        <div className="flex items-center gap-3">
          <div className="bg-orange-500/10 border border-orange-500/30 p-2.5 rounded-2xl animate-pulse text-orange-500">
            <span className="text-2xl">🔥</span>
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <span>Habit Streak Flame</span>
              <span className="bg-orange-500 text-white text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full">LIVE</span>
            </h4>
            <p className="text-lg font-mono font-black text-orange-500 leading-snug">
              {consecutiveStreak} Consecutive Days!
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              Keep checking in daily to maintain combustion.
            </p>
          </div>
        </div>

        {/* Miniature Interactive Contribution Heatmap Tracker */}
        <div className="bg-white dark:bg-black/40 border border-slate-100 dark:border-slate-800/80 p-3 rounded-2xl space-y-1.5 self-stretch flex flex-col justify-center">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span className="uppercase tracking-wider">Mini Streak-Heatmap Tracker (Past 14 Days)</span>
            <span>{miniHeatmapData.filter(d => d.minutes >= 1).length} / 14 Studied</span>
          </div>

          <div className="flex items-center gap-1.5">
            {miniHeatmapData.map((block, i) => {
              const m = block.minutes;
              let bg = "bg-slate-100 dark:bg-slate-800";
              if (m >= 120) bg = "bg-emerald-750 shadow-sm border border-emerald-500/10";
              else if (m >= 60) bg = "bg-emerald-500";
              else if (m >= 30) bg = "bg-emerald-300";
              else if (m > 0) bg = "bg-emerald-100";

              return (
                <div
                  key={i}
                  className={`h-6 w-6 rounded-lg flex items-center justify-center font-mono text-[9px] font-bold shrink-0 relative group ${bg} ${m > 0 ? "text-emerald-950" : "text-slate-450"}`}
                >
                  {block.dayNum}
                  
                  {/* micro tooltip */}
                  <div className="absolute bottom-8 scale-0 group-hover:scale-100 transition-all z-10 bg-slate-900 text-white text-[9px] p-1.5 rounded-md font-mono whitespace-nowrap shadow-md pointer-events-none">
                    {block.monthShort} {block.dayNum}: {block.minutes} mins studied
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>


      {/* Calendar Grid Area */}
      <div className="grid grid-cols-7 flex-1 border-b border-slate-150 dark:border-slate-900/20 min-h-[380px]">
        {gridCells.map((cell, idx) => {
          const isCurrentMonth = cell.month === "current";
          
          // Pull list study logs mapped to this date
          const dateLogs = studyLogs.filter((log) => log.date === cell.dateStr);
          const activeHoursMins = dateLogs.length > 0;
          const matchedTotalMinutes = dateLogs.reduce((acc, current) => acc + current.durationMinutes, 0);

          // Format total hours
          const formatTotalStudyShort = (totalMinutes: number) => {
            const h = Math.floor(totalMinutes / 60);
            const m = Math.floor(totalMinutes % 60);
            return `${h}:${String(m).padStart(2, "0")}`;
          };

          // Preset simulated events mapped
          const dayEvents = presetEvents.filter((item) => {
            if (isCurrentMonth) {
              return item.day === cell.day;
            } else if (cell.month === "prev" && cell.day >= 27) {
              // Map prev overflowing events to match layout exactly (Buddha Purnima is May 1st, 29th is April 29th, etc.)
              if (cell.day === 29) return item.day === 29;
            }
            return false;
          });

          // Check if preset study duration exists (matches user image layout exactly)
          const customStudyLabel = isCurrentMonth 
            ? presetStudyLabels[cell.day] 
            : (cell.month === "prev" && cell.day === 29 ? presetStudyLabels[29] : (cell.month === "prev" && cell.day === 30 ? presetStudyLabels[30] : null));

          // Apply special visual highlights to current 20th numerical day as shown in images
          const isSpecialDay = isCurrentMonth && cell.day === 20;

          return (
            <div 
              key={idx} 
              onClick={() => handleOpenDayModal(cell.dateStr)}
              className={`p-1.5 border-r border-b border-slate-150 dark:border-slate-900/25 flex flex-col items-stretch space-y-1 hover:bg-slate-100/70 dark:hover:bg-[#151515]/80 cursor-pointer min-h-[90px] transition-all relative ${
                isCurrentMonth ? "text-slate-800 dark:text-slate-100 bg-white dark:bg-[#0d0d0d]" : "text-slate-300 dark:text-slate-700 bg-slate-50/50 dark:bg-black/40 opacity-40"
              }`}
            >
              {/* Day Number Header */}
              <div className="flex justify-between items-center px-1">
                {isSpecialDay ? (
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-black text-[10px] flex items-center justify-center font-mono leading-none shadow-sm pb-0.5">
                    {cell.day}
                  </span>
                ) : (
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500">{cell.day}</span>
                    {matchedTotalMinutes >= 30 && (
                      <span className="text-xs animate-bounce" title="30+ Minute Daily Focus Streak 🔥">🔥</span>
                    )}
                  </div>
                )}

                {/* Study block pills (e.g., 2:45, 0:56) */}
                {(customStudyLabel || activeHoursMins) && (
                  <span className={`text-[9px] font-mono leading-none px-1 py-0.5 rounded-sm font-bold ${
                    activeHoursMins 
                      ? "bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/50" 
                      : customStudyLabel === "0:56" 
                        ? "bg-amber-100 dark:bg-amber-650/35 text-amber-700 dark:text-amber-300 font-bold" 
                        : "bg-slate-100 dark:bg-slate-800/80 text-emerald-600 dark:text-emerald-400 font-bold"
                  }`}>
                    {activeHoursMins ? formatTotalStudyShort(matchedTotalMinutes) : customStudyLabel}
                  </span>
                )}
              </div>

              {/* Day plot events stack */}
              <div className="flex-1 overflow-y-auto no-scrollbar space-y-0.5">
                {/* Dynamically added study logs as tiny tags */}
                {dateLogs.map((lg) => (
                  <div key={lg.id} className="text-[8px] bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-700 dark:text-slate-350 border border-indigo-100 dark:border-indigo-900/20 rounded px-1 text-left truncate">
                    ⏱️ {lg.subjectName} ({lg.durationMinutes}m)
                  </div>
                ))}
                
                {dayEvents.slice(0, 3).map((evt) => (
                  <div 
                    key={evt.id} 
                    className={`text-[8.5px] truncate px-1 py-0.5 rounded leading-tight w-full font-bold select-none tracking-tight ${evt.color}`}
                  >
                    {evt.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Companion Filter Button inside bottom-right */}
      <div className="absolute bottom-[20px] right-[24px] z-20">
        <button
          onClick={() => setShowFilterModal(true)}
          className="w-13 h-13 rounded-full bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-850 flex items-center justify-center text-slate-800 dark:text-white hover:scale-105 active:scale-95 transition-all shadow-lg cursor-pointer cursor-and-touch"
          title="Filter Calendar Plots"
        >
          <Filter className="w-5 h-5 text-slate-600 dark:text-slate-200" />
        </button>
      </div>

      {/* Dynamic Drawer / Dialog Overlay for selected date */}
      {selectedLogsDate && (
        <div className="absolute inset-0 bg-slate-900/60 dark:bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-30 animate-fade-in">
          <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-slate-900 rounded-3xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl relative text-slate-850 dark:text-slate-100">
            
            {/* Header */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-900 flex justify-between items-center">
              <div>
                <p className="text-[10px] uppercase font-mono tracking-wider text-indigo-500 dark:text-indigo-400 font-bold">Study Insights & Manual log</p>
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1.5 mt-0.5">
                  <Calendar className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  Logs for {new Date(selectedLogsDate + "T00:00:00").toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </h4>
              </div>
              <button 
                onClick={() => setSelectedLogsDate(null)}
                className="p-1 px-2.5 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:dark:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Inner scrollable area */}
            <div className="p-6 overflow-y-auto no-scrollbar space-y-6">

              {/* Success Notification */}
              {logSuccessText && (
                <div className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs py-3 px-4 rounded-xl border border-emerald-200 dark:border-emerald-900/40 flex items-center gap-2 animate-pulse">
                  <Sparkles className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <p>{logSuccessText}</p>
                </div>
              )}

              {/* 1. Mapped study logs list for this specific date */}
              <div className="space-y-2.5 text-left">
                <h5 className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Recorded Study Blocks ({studyLogs.filter(l => l.date === selectedLogsDate).length})</h5>
                {studyLogs.filter(l => l.date === selectedLogsDate).length === 0 ? (
                  <p className="text-slate-500 text-xs italic bg-slate-50 dark:bg-slate-950/30 p-4 rounded-xl text-center border border-slate-100 dark:border-transparent">
                    No active study sessions logged for this calendar date. Set focus goals on the Dashboard tab to earn points, or backdate them manually!
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1 no-scrollbar">
                    {studyLogs.filter(l => l.date === selectedLogsDate).map((log) => (
                      <div key={log.id} className="p-2.5 bg-slate-50 dark:bg-slate-950/50 hover:bg-slate-100 dark:hover:bg-[#1a1a1a] border border-slate-150 dark:border-slate-900 rounded-xl flex justify-between items-center text-xs transition-colors">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-indigo-500"></div>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{log.subjectName}</span>
                        </div>
                        <span className="font-mono text-slate-600 dark:text-slate-400 font-bold bg-white dark:bg-[#141414] px-2 py-0.5 rounded-md border border-slate-150 dark:border-slate-900">
                          {log.durationMinutes} Minutes studied
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-slate-150 dark:border-slate-cd bg-slate-900"></div>

              {/* 2. Manual backdating entry form */}
              <form onSubmit={submitManualStudyLog} className="space-y-4 text-left">
                <div className="flex items-center justify-between">
                  <h5 className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5 text-[#f26419]" />
                    Backdate Manual Study Work
                  </h5>
                  <span className="text-[9px] font-mono bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/40 text-indigo-600 dark:text-indigo-300 rounded px-1.5 py-0.5">{getXpRateForLevel(calculateStudentLevel(userXp).level)} XP per minute</span>
                </div>

                {subjects.length === 0 ? (
                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-xs text-yellow-500 dark:text-yellow-450 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <div>
                      <p className="font-bold">No Subjects created yet</p>
                      <p className="opacity-90">Please first add subject folders (e.g. "Maths", "Chemistry") in your Planner or Focus clock tab before creating backdated logs.</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Subject dropdown selection */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">Target Subject</label>
                      <select 
                        required
                        value={manualSubjectId}
                        onChange={(e) => setManualSubjectId(e.target.value)}
                        className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-900 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-700 dark:text-slate-200 focus:outline-none"
                      >
                        {subjects.map((sub) => (
                          <option key={sub.id} value={sub.id} className="text-slate-800 dark:text-slate-205">
                            📂 {sub.name} (Goal: {sub.goalMinutes % 60 === 0 ? `${sub.goalMinutes/60}h` : `${sub.goalMinutes}m`})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Study duration picker selection */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">Study Duration</label>
                        <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">{manualMinutes} minutes</span>
                      </div>
                      
                      <input 
                        type="range" 
                        min={5} 
                        max={480} 
                        step={5}
                        value={manualMinutes}
                        onChange={(e) => setManualMinutes(parseInt(e.target.value))}
                        className="w-full justify-center text-indigo-500" 
                      />

                      <div className="flex justify-between gap-1 mt-1 font-mono">
                        {[15, 30, 45, 60, 120, 180].map((mins) => (
                          <button 
                            key={mins}
                            type="button"
                            onClick={() => setManualMinutes(mins)}
                            className={`flex-1 text-[10px] py-1 rounded bg-slate-50 dark:bg-slate-950 border hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-800 dark:hover:text-white cursor-pointer ${manualMinutes === mins ? "border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/20 font-bold" : "border-slate-200 dark:border-slate-900 text-slate-450 dark:text-slate-500"}`}
                          >
                            {mins >= 60 ? `${mins/60}h` : `${mins}m`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Action button */}
                    <button
                      type="submit"
                      disabled={submittingLog}
                      className="w-full bg-[#f26419] hover:bg-[#d6510d] disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-extrabold py-3 px-4 rounded-xl text-xs flex justify-center items-center gap-2 cursor-pointer cursor-and-touch transition-all shadow-lg active:scale-[0.98]"
                    >
                      {submittingLog ? "Writing study index..." : `Log Study Session & Claim +${manualMinutes * getXpRateForLevel(calculateStudentLevel(userXp).level)} XP!`}
                    </button>
                  </>
                )}
              </form>
            </div>
            
            {/* Modal Footer block */}
            <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-900 text-center">
              <button 
                onClick={() => setSelectedLogsDate(null)}
                className="w-full bg-slate-200 hover:bg-slate-300 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold py-2 rounded-xl text-xs cursor-pointer border border-slate-300 dark:border-slate-900"
              >
                Done viewing
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Floating Filter dialog modal popup */}
      {showFilterModal && (
        <div className="absolute inset-0 bg-slate-900/60 dark:bg-black/85 backdrop-blur-sm flex items-center justify-center p-5 z-40 animate-fade-in">
          <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-sm overflow-hidden flex flex-col p-6 shadow-xl text-slate-805 dark:text-slate-200">
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 mb-3.5">Filter Logs</h3>
            <p className="text-xs text-slate-450 dark:text-slate-400 mb-4 font-sans leading-relaxed">Filter the logs plotted inside the calendar days depending on active criteria:</p>
            
            <div className="space-y-2.5">
              {[
                { id: "all", label: "Show all logs and holidays" },
                { id: "high", label: "Show high consistency study hours" },
                { id: "low", label: "Only show all-day events" }
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    setFilterType(opt.id as any);
                    setShowFilterModal(false);
                  }}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-xs font-semibold flex items-center justify-between cursor-pointer transition-all ${
                    filterType === opt.id 
                      ? "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold" 
                      : "bg-slate-50 dark:bg-[#181818] border-slate-150 dark:border-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <span>{opt.label}</span>
                  {filterType === opt.id && <Check className="w-4 h-4 text-emerald-500" />}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowFilterModal(false)}
              className="mt-5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800 font-bold py-2.5 rounded-xl text-xs text-slate-600 dark:text-slate-300 cursor-pointer"
            >
              Close Menu
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
