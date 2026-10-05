import React, { useState, useMemo } from "react";
import { 
  Plus, Trash, Check, ChevronDown, ChevronUp, Play, Flame, 
  CheckCircle2, Circle, AlertCircle, Filter, ListPlus, Calendar as CalendarIcon, Zap
} from "lucide-react";
import { Subject, Task, Habit, TaskSubtask } from "../types";

interface PlannerHubProps {
  subjects: Subject[];
  tasks: Task[];
  habits?: Habit[];
  onAddTask: (title: string, subjectId: string, priority?: "high" | "medium" | "low", dueDate?: string) => void;
  onToggleTask: (taskId: string) => void;
  onRemoveTask: (taskId: string) => void;
  onToggleSubtask?: (taskId: string, subtaskId: string) => void;
  onAddSubtask?: (taskId: string, text: string) => void;
  onStartTaskFocus?: (task: Task) => void;
  onToggleHabit?: (habitId: string) => void;
}

export default function PlannerHub({
  subjects,
  tasks,
  habits = [],
  onAddTask,
  onToggleTask,
  onRemoveTask,
  onToggleSubtask,
  onAddSubtask,
  onStartTaskFocus,
  onToggleHabit,
}: PlannerHubProps) {
  // Helper to format Date objects as 'YYYY-MM-DD'
  const getLocalDateString = (d: Date = new Date()): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayLocalStr = getLocalDateString();
  const [selectedDay, setSelectedDay] = useState(todayLocalStr);
  const [filterMode, setFilterMode] = useState<"all" | "high" | "pending" | "completed">("all");

  // Fast task quick-add bar states
  const [quickTitle, setQuickTitle] = useState("");
  const [quickSubjectId, setQuickSubjectId] = useState(subjects[0]?.id || "general");
  const [quickPriority, setQuickPriority] = useState<"high" | "medium" | "low">("medium");

  // Subtask expansion states
  const [expandedTaskIds, setExpandedTaskIds] = useState<Record<string, boolean>>({});
  const [newSubtaskInputs, setNewSubtaskInputs] = useState<Record<string, string>>({});

  // Dynamic week calendar days
  const weekDays = useMemo(() => {
    const today = new Date();
    const days = [];
    const currentDay = today.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
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

  const formattedSelectedDay = useMemo(() => {
    const d = new Date(selectedDay + "T00:00:00");
    if (isNaN(d.getTime())) return "Today";
    const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return `${labels[d.getDay()]} ${d.getMonth() + 1}/${d.getDate()}`;
  }, [selectedDay]);

  const getAccentBorder = (colorStyle: string) => {
    if (colorStyle.includes("blue")) return "border-blue-500 text-blue-400";
    if (colorStyle.includes("emerald") || colorStyle.includes("green")) return "border-emerald-500 text-emerald-400";
    if (colorStyle.includes("orange")) return "border-orange-500 text-orange-400";
    if (colorStyle.includes("purple") || colorStyle.includes("violet")) return "border-purple-500 text-purple-400";
    if (colorStyle.includes("pink")) return "border-pink-500 text-pink-400";
    if (colorStyle.includes("rose") || colorStyle.includes("red")) return "border-rose-500 text-rose-400";
    return "border-slate-500 text-slate-350";
  };

  const [openedSubjectIds, setOpenedSubjectIds] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    subjects.forEach(s => {
      initial[s.id] = true;
    });
    return initial;
  });

  const handleToggleAccordion = (subId: string) => {
    setOpenedSubjectIds(prev => ({
      ...prev,
      [subId]: !prev[subId]
    }));
  };

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    onAddTask(quickTitle.trim(), quickSubjectId, quickPriority, selectedDay);
    setQuickTitle("");
  };

  const toggleTaskExpanded = (taskId: string) => {
    setExpandedTaskIds(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  const submitSubtask = (taskId: string) => {
    const text = newSubtaskInputs[taskId]?.trim();
    if (!text || !onAddSubtask) return;
    onAddSubtask(taskId, text);
    setNewSubtaskInputs(prev => ({ ...prev, [taskId]: "" }));
  };

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (filterMode === "high") return t.priority === "high";
      if (filterMode === "pending") return !t.isCompleted;
      if (filterMode === "completed") return t.isCompleted;
      return true;
    });
  }, [tasks, filterMode]);

  const totalTasksCount = tasks.length;
  const completedTasksCount = tasks.filter(t => t.isCompleted).length;
  const taskProgressPct = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  return (
    <div className="liquid-glass relative font-sans flex flex-col h-full rounded-2xl sm:rounded-3xl overflow-hidden text-slate-850 dark:text-neutral-100 p-4 sm:p-5 md:p-6 shadow-lg sm:shadow-xl hover:shadow-2xl transition-all duration-350 border text-left" id="f5-planner-canvas">
      
      {/* 1. Header with Selected Day & Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 sm:pb-4 gap-3 border-b border-slate-200/60 dark:border-slate-800/60">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-800 dark:text-white">
              {formattedSelectedDay}
            </h2>
            <span className="text-[10px] font-mono font-bold bg-[#f26419]/10 text-[#f26419] dark:text-orange-400 px-2 py-0.5 rounded-md border border-[#f26419]/20">
              {completedTasksCount}/{totalTasksCount} Done
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Plan your syllabus blocks, check off daily habits, and launch deep work timers with 1 click.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800 self-start sm:self-auto">
          {[
            { id: "all", label: "All" },
            { id: "pending", label: "Pending" },
            { id: "high", label: "🔥 Priority" },
            { id: "completed", label: "Completed" }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterMode(f.id as any)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                filterMode === f.id
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Today's Core Habits Quick Strip */}
      {habits.length > 0 && (
        <div className="py-3 border-b border-slate-150 dark:border-slate-800/60">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              Daily Study Habits ({habits.filter(h => h.completedDates.includes(todayLocalStr)).length}/{habits.length} completed today)
            </span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {habits.map(h => {
              const isDone = h.completedDates.includes(todayLocalStr);
              return (
                <button
                  key={h.id}
                  onClick={() => onToggleHabit && onToggleHabit(h.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all border cursor-pointer active:scale-95 ${
                    isDone
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                      : "bg-slate-100/80 dark:bg-slate-900/60 border-slate-200/60 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                  title={isDone ? "Completed today! Click to uncheck" : "Click to mark completed today"}
                >
                  <span className="text-sm">{h.icon}</span>
                  <span className="truncate max-w-[140px]">{h.title}</span>
                  <span className="flex items-center gap-0.5 text-[10px] font-mono text-amber-500 font-bold ml-1">
                    <Flame className="w-3 h-3 fill-current" />
                    {h.streak}
                  </span>
                  {isDone ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  ) : (
                    <Circle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Weekday columns indicator slider */}
      <div className="grid grid-cols-7 gap-1 py-3 border-b border-slate-150 dark:border-slate-800/60 text-center select-none">
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
                className={`w-8 h-8 rounded-xl mt-1 text-[10px] font-mono font-bold leading-none flex items-center justify-center transition-all cursor-pointer active:scale-90 ${
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

      {/* 4. Quick Task Capture Bar */}
      <form onSubmit={handleQuickAdd} className="py-3 flex flex-wrap sm:flex-nowrap items-center gap-2 border-b border-slate-150 dark:border-slate-800/60">
        <input 
          type="text"
          placeholder="⚡ Quick capture new study task (press Enter)..."
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          className="flex-1 min-w-[200px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#f26419] focus:ring-1 focus:ring-[#f26419]"
        />

        <select
          value={quickSubjectId}
          onChange={(e) => setQuickSubjectId(e.target.value)}
          aria-label="Select subject"
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
        >
          {subjects.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
          <option value="general">General</option>
        </select>

        <select
          value={quickPriority}
          onChange={(e) => setQuickPriority(e.target.value as any)}
          aria-label="Select priority"
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
        >
          <option value="high">🔥 High</option>
          <option value="medium">⚡ Med</option>
          <option value="low">💤 Low</option>
        </select>

        <button
          type="submit"
          disabled={!quickTitle.trim()}
          className="bg-[#f26419] hover:bg-[#e05612] disabled:opacity-40 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add</span>
        </button>
      </form>

      {/* 5. Subject Accordion Task Stack */}
      <div className="space-y-4 overflow-y-auto no-scrollbar max-h-[500px] flex-1 pr-1 text-left mt-3">
        {subjects.map((sub) => {
          const isOpened = openedSubjectIds[sub.id] ?? true;
          const accentBorder = getAccentBorder(sub.color);
          const subTasks = filteredTasks.filter(t => t.subjectId === sub.id || (sub.id === "cs" && t.subjectId === "general"));

          return (
            <div 
              key={sub.id} 
              className={`bg-slate-50/50 dark:bg-[#121212]/90 border-l-4 ${accentBorder.split(" ")[0]} rounded-r-2xl overflow-hidden border border-slate-200/50 dark:border-slate-900/40 shadow-xs`}
            >
              {/* Category banner */}
              <div 
                className="flex justify-between items-center p-3.5 cursor-pointer hover:bg-slate-100/80 dark:hover:bg-[#161616]/40 select-none"
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

                <div className="flex items-center gap-2">
                  {isOpened ? (
                    <ChevronUp className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  )}
                </div>
              </div>

              {/* Accordion List Body */}
              {isOpened && (
                <div className="p-3.5 pt-0 border-t border-slate-150 dark:border-slate-900/40 space-y-2.5">
                  {subTasks.length === 0 ? (
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center py-2.5 italic">
                      No tasks matching filter. Use the quick capture bar above to add an objective.
                    </p>
                  ) : (
                    subTasks.map((task) => {
                      const isExpanded = expandedTaskIds[task.id] || false;
                      const subtaskCount = task.subtasks?.length || 0;
                      const subtaskDoneCount = task.subtasks?.filter(st => st.isCompleted).length || 0;

                      return (
                        <div 
                          key={task.id}
                          className="bg-white dark:bg-[#171717]/80 rounded-xl border border-slate-200/60 dark:border-slate-800/60 p-2.5 space-y-2 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div 
                              className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                              onClick={() => onToggleTask(task.id)}
                            >
                              <div 
                                className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all shrink-0 ${
                                  task.isCompleted 
                                    ? "bg-emerald-500 border-emerald-500 text-white" 
                                    : "border-slate-300 dark:border-slate-700 hover:border-[#f26419]"
                                }`}
                              >
                                {task.isCompleted && <Check className="w-3.5 h-3.5 stroke-[3.5]" />}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className={`text-xs ${
                                    task.isCompleted 
                                      ? "line-through text-slate-400 dark:text-slate-500" 
                                      : "text-slate-800 dark:text-slate-100 font-semibold"
                                  }`}>
                                    {task.title}
                                  </span>

                                  {/* Priority indicator */}
                                  {task.priority === "high" && (
                                    <span className="text-[9px] font-mono font-bold text-rose-500 bg-rose-500/10 px-1.5 py-0.2 rounded border border-rose-500/20">
                                      High
                                    </span>
                                  )}
                                  {task.priority === "low" && (
                                    <span className="text-[9px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded">
                                      Low
                                    </span>
                                  )}
                                </div>

                                {/* Subtasks progress indicator */}
                                {subtaskCount > 0 && (
                                  <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                                    <span className="font-mono">{subtaskDoneCount}/{subtaskCount} subtasks</span>
                                    <div className="w-16 h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-emerald-500 rounded-full" 
                                        style={{ width: `${Math.round((subtaskDoneCount / subtaskCount) * 100)}%` }}
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Actions Right */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              {/* Subtasks dropdown toggle */}
                              <button
                                onClick={() => toggleTaskExpanded(task.id)}
                                className={`text-[10px] font-mono px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                                  isExpanded 
                                    ? "bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-white border-transparent" 
                                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 border-slate-200 dark:border-slate-800"
                                }`}
                                title="Toggle subtask checklist"
                              >
                                {subtaskCount > 0 ? `${subtaskDoneCount}/${subtaskCount} Subtasks` : "+ Subtasks"}
                              </button>

                              {/* Focus Now Bridge to Timer */}
                              {!task.isCompleted && onStartTaskFocus && (
                                <button
                                  onClick={() => onStartTaskFocus(task)}
                                  className="flex items-center gap-1 px-2.5 py-1 bg-[#f26419]/10 hover:bg-[#f26419]/20 text-[#f26419] dark:text-orange-400 border border-[#f26419]/25 rounded-lg text-[10px] font-mono font-bold tracking-tight transition-all active:scale-95 cursor-pointer"
                                  title="Start timer focus session for this task"
                                >
                                  <Play className="w-2.5 h-2.5 fill-current" />
                                  <span>Focus Now</span>
                                </button>
                              )}

                              {/* Delete button */}
                              <button
                                onClick={() => onRemoveTask(task.id)}
                                className="text-slate-400 hover:text-rose-500 p-1 rounded-md hover:bg-rose-500/10 transition-colors cursor-pointer"
                                title="Delete task"
                              >
                                <Trash className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Subtasks Expanded Drawer */}
                          {isExpanded && (
                            <div className="pl-7 pt-2 border-t border-slate-100 dark:border-slate-800/50 space-y-1.5">
                              {task.subtasks && task.subtasks.length > 0 && (
                                <div className="space-y-1">
                                  {task.subtasks.map(st => (
                                    <div 
                                      key={st.id}
                                      onClick={() => onToggleSubtask && onToggleSubtask(task.id, st.id)}
                                      className="flex items-center gap-2 py-1 text-xs cursor-pointer group"
                                    >
                                      <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${
                                        st.isCompleted 
                                          ? "bg-emerald-500 border-emerald-500 text-white" 
                                          : "border-slate-300 dark:border-slate-700 group-hover:border-[#f26419]"
                                      }`}>
                                        {st.isCompleted && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                      </div>
                                      <span className={`text-[11px] ${
                                        st.isCompleted ? "line-through text-slate-400" : "text-slate-700 dark:text-slate-300"
                                      }`}>
                                        {st.text}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Add subtask inline input */}
                              <div className="flex items-center gap-1.5 pt-1">
                                <input 
                                  type="text"
                                  placeholder="Add subtask step..."
                                  value={newSubtaskInputs[task.id] || ""}
                                  onChange={(e) => setNewSubtaskInputs(prev => ({ ...prev, [task.id]: e.target.value }))}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      submitSubtask(task.id);
                                    }
                                  }}
                                  className="flex-1 bg-slate-100/80 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-[11px] text-slate-800 dark:text-white focus:outline-none focus:border-[#f26419]"
                                />
                                <button
                                  type="button"
                                  onClick={() => submitSubtask(task.id)}
                                  className="text-[11px] font-bold px-2 py-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}
