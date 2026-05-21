import { useState } from "react";
import { Filter, Calendar, Sparkles, AlertCircle, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { StudyLog } from "../types";

interface CalendarViewProps {
  studyLogs: StudyLog[];
}

interface CalendarEventItem {
  id: string;
  day: number;
  title: string;
  color: string; // Tailwind class
}

export default function CalendarView({ studyLogs }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date("2026-05-20")); // Lock date to match user mockup matching May 2026
  const [selectedLogsDate, setSelectedLogsDate] = useState<string | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "high" | "low">("all");

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Hardcoded mockup holidays / other YPT events from the user images:
  // Buddha Purnima on Fri 1st, Birthday of Rabindranath, Google I/O event, etc.
  const presetEvents: CalendarEventItem[] = [
    { id: "e1-1", day: 1, title: "Buddha Purnima", color: "bg-emerald-950/40 text-emerald-400 font-medium" },
    { id: "e1-2", day: 1, title: "Buddha Purnima", color: "bg-emerald-950/40 text-emerald-400 font-medium" },
    { id: "e1-3", day: 1, title: "Buddha Purnima", color: "bg-emerald-950/40 text-emerald-400 font-medium" },
    { id: "e1-4", day: 1, title: "Buddha Purnima", color: "bg-emerald-950/40 text-emerald-400 font-medium" },
    { id: "e9-1", day: 9, title: "Birthday of Rabindranath", color: "bg-emerald-950/40 text-emerald-400 font-medium" },
    { id: "e9-2", day: 9, title: "Birthday of Rabindranath", color: "bg-emerald-950/40 text-emerald-400 font-medium" },
    { id: "e9-3", day: 9, title: "Birthday of Rabindranath", color: "bg-[#181818]/80 text-[#1abb9c] font-medium" },
    { id: "e9-4", day: 9, title: "Birthday of Rabindranath", color: "bg-emerald-950/40 text-[#16a085] font-medium" },
    { id: "e11-1", day: 11, title: "Study only maths lecture 4", color: "bg-slate-800 text-slate-300" },
    { id: "e19-1", day: 19, title: "Google I/O event", color: "bg-cyan-950/50 text-cyan-400 font-bold" },
    { id: "e20-1", day: 20, title: "Diary 📓 Fill", color: "bg-slate-800 text-slate-300" },
    { id: "e27-1", day: 27, title: "Bakrid (tentative)", color: "bg-emerald-950/40 text-emerald-400 font-medium" },
    { id: "e27-2", day: 27, title: "Bakrid (tentative)", color: "bg-emerald-950/40 text-emerald-400 font-medium" },
    { id: "e27-3", day: 27, title: "Bakrid (tentative)", color: "bg-emerald-950/40 text-emerald-400 font-medium" },
    { id: "e27-4", day: 27, title: "Bakrid (tentative)", color: "bg-emerald-950/40 text-emerald-400 font-medium" },
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

  return (
    <div className="relative text-white font-sans bg-[#0d0d0d] flex flex-col h-full rounded-3xl overflow-hidden border border-slate-900/50" id="ypt-calendar-canvas">
      
      {/* Upper Month Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-3">
        <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">{months[month]}</h2>
        <div className="flex gap-2">
          <button onClick={handlePrevMonth} className="p-1 px-2.5 rounded-lg bg-slate-800/40 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={handleNextMonth} className="p-1 px-2.5 rounded-lg bg-slate-800/40 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Week Header Index Row */}
      <div className="grid grid-cols-7 border-b border-slate-900/20 text-center py-2 bg-[#0d0d0d]">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((dayName) => (
          <div key={dayName} className="text-xs font-semibold text-slate-500 font-mono">
            {dayName}
          </div>
        ))}
      </div>

      {/* Calendar Grid Area */}
      <div className="grid grid-cols-7 flex-1 border-b border-slate-900/20 min-h-[350px]">
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
              onClick={() => setSelectedLogsDate(cell.dateStr)}
              className={`p-1.5 border-r border-b border-slate-900/20 flex flex-col items-stretch space-y-1 hover:bg-[#161616]/40 cursor-pointer min-h-[85px] transition-all relative ${
                isCurrentMonth ? "text-slate-100" : "text-slate-650 opacity-30"
              }`}
            >
              {/* Day Number Header */}
              <div className="flex justify-between items-center px-1">
                {isSpecialDay ? (
                  <span className="w-5 h-5 rounded-full bg-white text-slate-950 font-black text-[10px] flex items-center justify-center font-mono leading-none shadow-sm">
                    {cell.day}
                  </span>
                ) : (
                  <span className="text-[10px] font-mono font-bold">{cell.day}</span>
                )}

                {/* Study block pills (e.g., 2:45, 0:56) */}
                {(customStudyLabel || activeHoursMins) && (
                  <span className={`text-[9.5px] font-mono leading-none px-1.5 py-0.5 rounded-sm ${
                    customStudyLabel === "0:56" ? "bg-amber-600/35 text-amber-300 font-bold" : "bg-slate-800/80 text-slate-350"
                  }`}>
                    {customStudyLabel || formatTotalStudyShort(matchedTotalMinutes)}
                  </span>
                )}
              </div>

              {/* Day plot events stack */}
              <div className="flex-1 overflow-y-auto no-scrollbar space-y-0.5">
                {dayEvents.slice(0, 4).map((evt) => (
                  <div 
                    key={evt.id} 
                    className={`text-[8.5px] truncate px-1 py-0.5 rounded-xs leading-tight w-full font-bold select-none tracking-tight ${evt.color}`}
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
      <div className="absolute bottom-[20px] right-[24px] z-30">
        <button
          onClick={() => setShowFilterModal(true)}
          className="w-13 h-13 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-all shadow-lg cursor-pointer cursor-and-touch"
          title="Filter Calendar Plots"
        >
          <Filter className="w-5 h-5 text-slate-200" />
        </button>
      </div>

      {/* Floating Filter dialog modal popup */}
      {showFilterModal && (
        <div className="absolute inset-0 bg-[#0a0a0a]/85 backdrop-blur-sm flex items-center justify-center p-5 z-40 animate-fade-in">
          <div className="bg-[#121212] border border-slate-800 rounded-3xl w-full max-w-sm overflow-hidden flex flex-col p-6 shadow-xl">
            <h3 className="font-bold text-base text-slate-100 mb-3.5">Filter Logs</h3>
            <p className="text-xs text-slate-400 mb-4 font-sans lead-relaxed">Filter the logs plotted inside the calendar days depending on active criteria:</p>
            
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
                      ? "bg-slate-800 border-slate-700 text-white" 
                      : "bg-[#181818] border-slate-900 text-slate-400 hover:bg-slate-800/50"
                  }`}
                >
                  <span>{opt.label}</span>
                  {filterType === opt.id && <Check className="w-4 h-4 text-emerald-500" />}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowFilterModal(false)}
              className="mt-5 bg-slate-900 border border-slate-800 hover:bg-slate-800 font-bold py-2.5 rounded-xl text-xs text-slate-300 cursor-pointer"
            >
              Close Menu
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
