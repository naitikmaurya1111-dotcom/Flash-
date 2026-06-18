import { useState, useMemo } from "react";
import { Plus, Trash, Check, ClipboardList, ChevronDown, ChevronUp } from "lucide-react";
import { Subject, Task } from "../types";

interface PlannerHubProps {
  subjects: Subject[];
  tasks: Task[];
  onAddTask: (title: string, subjectId: string) => void;
  onToggleTask: (taskId: string) => void;
  onRemoveTask: (taskId: string) => void;
}

export default function PlannerHub({
  subjects,
  tasks,
  onAddTask,
  onToggleTask,
  onRemoveTask,
}: PlannerHubProps) {
  // Helper to format Date objects as 'YYYY-MM-DD'
  const getLocalDateString = (d: Date = new Date()): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayLocalStr = getLocalDateString();

  // Dynamically compute the current week's dates centering the current day
  const [selectedDay, setSelectedDay] = useState(todayLocalStr);
  
  const weekDays = useMemo(() => {
    const today = new Date();
    const days = [];
    const currentDay = today.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
    // Calculate distance to current week's Monday (1 is Monday, Sunday (0) stays as week's end)
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(today);
    monday.setDate(today.getDate() + distanceToMonday);

    const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push({
        num: d.getDate(),
        label: labels[i],
        dateStr: getLocalDateString(d)
      });
    }
    return days;
  }, []);

  // Format the selected day to text: "Wed, 5/20"
  const formattedSelectedDay = useMemo(() => {
    const d = new Date(selectedDay + "T00:00:00"); // local parsing safely
    if (isNaN(d.getTime())) return "Today";
    const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return `${labels[d.getDay()]} ${d.getMonth() + 1}/${d.getDate()}`;
  }, [selectedDay]);

  // Subject colors map for the left vertical borders
  const getAccentBorder = (colorStyle: string) => {
    if (colorStyle.includes("blue")) return "border-blue-500 text-blue-400";
    if (colorStyle.includes("emerald") || colorStyle.includes("green")) return "border-emerald-500 text-emerald-450";
    if (colorStyle.includes("orange")) return "border-orange-500 text-orange-400";
    if (colorStyle.includes("purple") || colorStyle.includes("violet")) return "border-purple-500 text-purple-400";
    if (colorStyle.includes("pink")) return "border-pink-500 text-pink-400";
    if (colorStyle.includes("rose") || colorStyle.includes("red")) return "border-rose-500 text-rose-450";
    return "border-slate-500 text-slate-350";
  };

  // Toggle accordions for each subject
  const [openedSubjectIds, setOpenedSubjectIds] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    subjects.forEach(s => {
      initial[s.id] = true; // Open on mount
    });
    return initial;
  });

  // Adding inline tasks
  const [addingTaskSubjectId, setAddingTaskSubjectId] = useState<string | null>(null);
  const [newInlineTaskText, setNewInlineTaskText] = useState("");

  const handleToggleAccordion = (subId: string) => {
    setOpenedSubjectIds(prev => ({
      ...prev,
      [subId]: !prev[subId]
    }));
  };

  const submitInlineTask = (subId: string) => {
    if (!newInlineTaskText.trim()) return;
    onAddTask(newInlineTaskText.trim(), subId);
    setNewInlineTaskText("");
    setAddingTaskSubjectId(null);
  };

  return (
    <div className="relative font-sans flex flex-col h-full rounded-3xl overflow-hidden border border-slate-200/50 dark:border-slate-800/80 bg-white/75 dark:bg-[#0c0d10]/95 text-slate-850 dark:text-neutral-100 p-6 shadow-xl hover:shadow-2xl transition-all duration-350" id="ypt-planner-canvas">
      
      {/* Header Month Day Title */}
      <div className="flex items-center justify-between pb-4">
        <h2 className="text-xl md:text-2xl font-black tracking-tight text-slate-800 dark:text-white mb-1">
          {formattedSelectedDay}
        </h2>
        <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800/80 text-slate-550 dark:text-slate-400 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700/50">
          Checkoff Log
        </span>
      </div>

      {/* Weekday columns indicator slider */}
      <div className="grid grid-cols-7 gap-1 pb-4 border-b border-slate-100 dark:border-slate-900/30 text-center select-none mb-6">
        {weekDays.map((wd) => {
          const isSelected = selectedDay === wd.dateStr;
          return (
            <div 
              key={wd.dateStr}
              onClick={() => setSelectedDay(wd.dateStr)}
              className="flex flex-col items-center cursor-pointer group"
            >
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium font-mono">
                {wd.num} {wd.label}
              </span>
              <button 
                className={`w-8 h-8 rounded-xl mt-1 text-[10px] font-mono font-bold leading-none flex items-center justify-center transition-all cursor-pointer ${
                  isSelected 
                    ? "bg-[#f26419] text-white dark:bg-white dark:text-slate-950 scale-105 shadow-sm" 
                    : "bg-slate-100/70 hover:bg-slate-200 text-slate-600 dark:bg-[#161616]/70 dark:hover:bg-[#1a1a1a] dark:text-slate-400"
                }`}
              >
                {wd.dateStr === todayLocalStr ? (
                  tasks.length > 0 ? (
                    `${tasks.filter(t => t.isCompleted).length}/${tasks.length}`
                  ) : (
                    "-"
                  )
                ) : (
                  "-"
                )}
              </button>
              {isSelected && (
                <div className="w-5 h-0.5 bg-[#f26419] dark:bg-white rounded-full mt-1.5 animate-pulse"></div>
              )}
            </div>
          );
        })}
      </div>

      {/* Categories task accordion lists stack */}
      <div className="space-y-4 overflow-y-auto no-scrollbar max-h-[460px] flex-1 pr-1 text-left">
        {subjects.map((sub) => {
          const isOpened = openedSubjectIds[sub.id] ?? true;
          const isAdding = addingTaskSubjectId === sub.id;
          const accentBorder = getAccentBorder(sub.color);
          const subTasks = tasks.filter(t => t.subjectId === sub.id || (sub.id === "cs" && t.subjectId === "general"));

          return (
            <div 
              key={sub.id} 
              className={`bg-slate-50/50 dark:bg-[#121212]/90 border-l-4 ${accentBorder.split(" ")[0]} rounded-r-2xl overflow-hidden border border-slate-200/50 dark:border-slate-900/40 shadow-xs`}
            >
              {/* Category trigger title banner bar */}
              <div 
                className="flex justify-between items-center p-4 cursor-pointer hover:bg-slate-100/80 dark:hover:bg-[#161616]/40 select-none"
                onClick={() => handleToggleAccordion(sub.id)}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {sub.name}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 bg-slate-150/80 dark:bg-slate-900 px-2 py-0.5 rounded-full font-semibold">
                    {subTasks.length} task{subTasks.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {/* Inline plus trigger to add task immediately */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setAddingTaskSubjectId(isAdding ? null : sub.id);
                    }}
                    className="w-5 h-5 rounded-full bg-slate-200 hover:bg-slate-350 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center text-xs text-slate-600 dark:text-slate-300 font-bold hover:scale-105 transition-all cursor-pointer cursor-and-touch"
                    title="Add inline task item"
                  >
                    +
                  </button>
                  {isOpened ? (
                    <ChevronUp className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  )}
                </div>
              </div>

              {/* Accordion List Body */}
              {isOpened && (
                <div className="p-4 pt-0 border-t border-slate-100 dark:border-slate-900/20 space-y-3.5">
                  
                  {/* Inline quick append Drawer */}
                  {isAdding && (
                    <div className="flex gap-2.5 pt-3 border-b border-slate-150 dark:border-slate-900/40 pb-3" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="text" 
                        placeholder="Register new task..."
                        value={newInlineTaskText}
                        onChange={(e) => setNewInlineTaskText(e.target.value)}
                        className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      />
                      <button 
                        onClick={() => submitInlineTask(sub.id)}
                        className="bg-slate-800 dark:bg-white text-white dark:text-slate-950 hover:bg-slate-700 dark:hover:bg-slate-100 text-xs px-3.5 py-1.5 font-bold rounded-xl cursor-pointer"
                      >
                        Add
                      </button>
                    </div>
                  )}

                  {/* Tasks rows */}
                  <div className="space-y-2.5 pt-3">
                    {subTasks.map((task) => (
                      <div 
                        key={task.id}
                        className="flex items-center justify-between bg-slate-100/50 dark:bg-[#171717]/60 p-2.5 rounded-xl border border-slate-200/40 dark:border-slate-900/30 hover:bg-slate-100 dark:hover:bg-[#1a1a1a]/40 cursor-pointer"
                        onClick={() => onToggleTask(task.id)}
                      >
                        <div className="flex items-center gap-3">
                          {/* Circular customized checkbox block indicator */}
                          <div 
                            className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                              task.isCompleted 
                                ? "bg-slate-800 border-slate-800 text-white dark:bg-white dark:border-white dark:text-slate-950" 
                                : "border-slate-300 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-slate-500"
                            }`}
                          >
                            {task.isCompleted && <Check className="w-3.5 h-3.5 stroke-[3.5]" />}
                          </div>
                          
                          <span className={`text-xs ${
                            task.isCompleted 
                              ? "line-through text-slate-450 dark:text-slate-500" 
                              : "text-slate-700 dark:text-slate-200 font-medium"
                          }`}>
                            {task.title}
                          </span>
                        </div>

                        {/* Removers */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveTask(task.id);
                          }}
                          className="text-slate-405 dark:text-slate-500 hover:text-rose-500 p-1 rounded-md hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    {subTasks.length === 0 && !isAdding && (
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center py-2 italic font-sans">Nothing added. Press plus [+] above to list objectives</p>
                    )}
                  </div>

                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}
