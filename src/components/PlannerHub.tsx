import { useState } from "react";
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
  // Lock dates for Week indicator matching mockup (May 18 to May 24, 2026, centering Wed 20)
  const [selectedDay, setSelectedDay] = useState("2026-05-20");
  
  const weekDays = [
    { num: 18, label: "Mon", dateStr: "2026-05-18" },
    { num: 19, label: "Tue", dateStr: "2026-05-19" },
    { num: 20, label: "Wed", dateStr: "2026-05-20" },
    { num: 21, label: "Thu", dateStr: "2026-05-21" },
    { num: 22, label: "Fri", dateStr: "2026-05-22" },
    { num: 23, label: "Sat", dateStr: "2026-05-23" },
    { num: 24, label: "Sun", dateStr: "2026-05-24" },
  ];

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
    <div className="relative text-white font-sans bg-[#0d0d0d] flex flex-col h-full rounded-3xl overflow-hidden border border-slate-900/50 p-6" id="ypt-planner-canvas">
      
      {/* Header Month Day Title */}
      <div className="flex items-center justify-between pb-4">
        <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white mb-1">
          Wed, 5/20
        </h2>
        <span className="text-[10px] font-mono bg-slate-800/80 text-slate-400 px-2 py-0.5 rounded border border-slate-700/50">
          Chekoff Log
        </span>
      </div>

      {/* Weekday columns indicator slider (Image 4) */}
      <div className="grid grid-cols-7 gap-1 pb-4 border-b border-slate-900/30 text-center select-none mb-6">
        {weekDays.map((wd) => {
          const isSelected = selectedDay === wd.dateStr;
          // Calculate tasks checklist percentage if any tasks mapped, default inline indicator `-`
          return (
            <div 
              key={wd.dateStr}
              onClick={() => setSelectedDay(wd.dateStr)}
              className="flex flex-col items-center cursor-pointer group"
            >
              <span className="text-[10px] text-slate-500 font-medium font-mono">
                {wd.num}.{wd.label}
              </span>
              <button 
                className={`w-7 h-7 rounded-lg mt-1 text-[11px] font-black leading-none flex items-center justify-center transition-all ${
                  isSelected 
                    ? "bg-white text-slate-950 scale-105" 
                    : "bg-[#161616]/70 hover:bg-[#1a1a1a] text-slate-400"
                }`}
              >
                -
              </button>
              {isSelected && (
                <div className="w-5 h-0.5 bg-white rounded-full mt-1.5 animate-pulse"></div>
              )}
            </div>
          );
        })}
      </div>

      {/* Categories task accordion lists stack (Image 4) */}
      <div className="space-y-4 overflow-y-auto no-scrollbar max-h-[460px] flex-1 pr-1">
        {subjects.map((sub) => {
          const isOpened = openedSubjectIds[sub.id] ?? true;
          const isAdding = addingTaskSubjectId === sub.id;
          const accentBorder = getAccentBorder(sub.color);
          const subTasks = tasks.filter(t => t.subjectId === sub.id || (sub.id === "cs" && t.subjectId === "general"));

          return (
            <div 
              key={sub.id} 
              className={`bg-[#121212]/95 border-l-4 ${accentBorder.split(" ")[0]} rounded-r-2xl overflow-hidden border border-slate-900/40 shadow-sm`}
            >
              {/* Category trigger title banner bar */}
              <div 
                className="flex justify-between items-center p-4 cursor-pointer hover:bg-[#161616]/40 select-none"
                onClick={() => handleToggleAccordion(sub.id)}
              >
                <div className="flex items-center gap-2.5">
                  <span className={`text-sm font-bold text-slate-100`}>
                    {sub.name}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-2 py-0.5 rounded-full font-semibold">
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
                    className="w-5 h-5 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-xs text-slate-300 font-bold hover:scale-105 transition-all cursor-pointer cursor-and-touch"
                    title="Add inline task item"
                  >
                    +
                  </button>
                  {isOpened ? (
                    <ChevronUp className="w-4 h-4 text-slate-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  )}
                </div>
              </div>

              {/* Accordion List Body */}
              {isOpened && (
                <div className="p-4 pt-0 border-t border-slate-900/20 space-y-3.5">
                  
                  {/* Inline quick append Drawer */}
                  {isAdding && (
                    <div className="flex gap-2.5 pt-3 border-b border-slate-900/40 pb-3" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="text" 
                        placeholder="Register new task..."
                        value={newInlineTaskText}
                        onChange={(e) => setNewInlineTaskText(e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-505"
                      />
                      <button 
                        onClick={() => submitInlineTask(sub.id)}
                        className="bg-white text-slate-950 hover:bg-slate-100 text-xs px-3.5 py-1.5 font-bold rounded-xl cursor-pointer"
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
                        className="flex items-center justify-between bg-[#171717]/60 p-2.5 rounded-xl border border-slate-900/30 hover:bg-[#1a1a1a]/40 cursor-pointer"
                        onClick={() => onToggleTask(task.id)}
                      >
                        <div className="flex items-center gap-3">
                          {/* Circular customized checkbox block indicator */}
                          <div 
                            className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                              task.isCompleted 
                                ? "bg-white border-white text-slate-950" 
                                : "border-slate-800 hover:border-slate-500"
                            }`}
                          >
                            {task.isCompleted && <Check className="w-3.5 h-3.5 stroke-[3.5]" />}
                          </div>
                          
                          <span className={`text-xs ${
                            task.isCompleted 
                              ? "line-through text-slate-500" 
                              : "text-slate-205 font-medium"
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
                          className="text-slate-500 hover:text-rose-400 p-1 rounded-md hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    {subTasks.length === 0 && !isAdding && (
                      <p className="text-[11px] text-slate-500 text-center py-2 italic">Nothing added. Press plus [+] above to list objectives</p>
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
