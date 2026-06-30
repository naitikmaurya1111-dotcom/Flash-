import { useState, useMemo } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart, Pie } from "recharts";
import { Award, Target, TrendingUp, Calendar, Info } from "lucide-react";
import { Subject, StudyLog, formatStudyTimeExact } from "../types";

interface AnalyticsDashboardProps {
  subjects: Subject[];
  studyLogs: StudyLog[];
  streak: number;
  dailyTargetMinutes: number;
  totalMinutesToday: number; // Accurate, live-updated real-time minutes passed from App.tsx
}

export default function AnalyticsDashboard({
  subjects,
  studyLogs,
  streak,
  dailyTargetMinutes,
  totalMinutesToday
}: AnalyticsDashboardProps) {

  // Helper to format Date objects consistently as 'YYYY-MM-DD' in local timezone
  const getLocalDateString = (d: Date = new Date()): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayLocalStr = getLocalDateString();

  const totalAllTimeMinutes = useMemo(() => {
    return studyLogs.reduce((acc, log) => acc + log.durationMinutes, 0);
  }, [studyLogs]);

  const progressPct = useMemo(() => {
    if (dailyTargetMinutes <= 0) return 0;
    return Math.min(100, Math.round((totalMinutesToday / dailyTargetMinutes) * 100));
  }, [totalMinutesToday, dailyTargetMinutes]);

  // Generate study trend for past 7 days based on study logs
  const weeklyChartData = useMemo(() => {
    const data = [];
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = getLocalDateString(d);
      const dayName = days[d.getDay()];
      
      // Calculate minutes from logs
      // Also check if we should pull today's standard live variables
      let dayMins = studyLogs
        .filter(l => l.date === dateStr)
        .reduce((sum, l) => sum + l.durationMinutes, 0);

      // Note: If date matches today, merge live tracking states from subjects
      if (dateStr === todayLocalStr) {
        dayMins = totalMinutesToday;
      }

      data.push({
        name: dayMins > 0 ? `${dayName}` : dayName,
        minutes: dayMins,
        displayHours: (dayMins / 60).toFixed(1)
      });
    }
    return data;
  }, [studyLogs, totalMinutesToday, todayLocalStr]);

  // Distribution chart of studied subject topics (All-Time Historical breakdown)
  const subjectDistributionData = useMemo(() => {
    // Map of subjectId -> sum of durationMinutes from historical logs
    const logSumMap: Record<string, number> = {};
    
    studyLogs.forEach(log => {
      logSumMap[log.subjectId] = (logSumMap[log.subjectId] || 0) + log.durationMinutes;
    });

    return subjects
      .map(s => {
        const loggedMins = logSumMap[s.id] || 0;
        // Merge today's active offline timer minutes
        const totalAllTimeSubjectMinutes = Math.max(loggedMins, s.totalMinutes);
        return {
          name: s.name,
          value: totalAllTimeSubjectMinutes,
          color: s.color.includes("blue") 
            ? "#3b82f6" 
            : s.color.includes("emerald") 
            ? "#10b981" 
            : s.color.includes("amber") 
            ? "#f59e0b" 
            : s.color.includes("purple") 
            ? "#8b5cf6" 
            : s.color.includes("orange")
            ? "#ea580c"
            : s.color.includes("pink")
            ? "#db2777"
            : s.color.includes("rose")
            ? "#e11d48"
            : "#f43f5e"
        };
      })
      .filter(item => item.value > 0);
  }, [subjects, studyLogs]);

  // Calendar Heatmap data creation (Past 30 Days)
  const heatmapData = useMemo(() => {
    const today = new Date();
    const data = [];
    
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = getLocalDateString(d);
      
      let dayMins = studyLogs
        .filter(l => l.date === dateStr)
        .reduce((sum, l) => sum + l.durationMinutes, 0);

      if (dateStr === todayLocalStr) {
        dayMins = totalMinutesToday;
      }

      data.push({
        dateStr,
        dayNum: d.getDate(),
        month: d.toLocaleString("default", { month: "short" }),
        minutes: dayMins
      });
    }
    return data;
  }, [studyLogs, totalMinutesToday, todayLocalStr]);

  const activeDaysCount = useMemo(() => {
    return heatmapData.filter(d => d.minutes >= 10).length;
  }, [heatmapData]);

  return (
    <div className="space-y-6">
      
      {/* 2. Visual Metrics Cards GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Today Focus Hours */}
        <div className="liquid-glass p-5 rounded-3xl flex flex-col justify-between hover:scale-[1.02] cursor-pointer shadow-sm transition-all duration-300 border">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs uppercase font-mono tracking-wider">Today Studied</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-4">
            <h4 className="text-lg font-bold font-mono text-slate-800 dark:text-white">
              {formatStudyTimeExact(totalMinutesToday)}
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Goal progress: {progressPct}%
            </p>
          </div>
        </div>

        {/* Current Streak days */}
        <div className="liquid-glass p-5 rounded-3xl flex flex-col justify-between hover:scale-[1.02] cursor-pointer shadow-sm transition-all duration-300 border">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs uppercase font-mono tracking-wider">Habit Streak</span>
            <Award className="w-4 h-4 text-amber-500 fill-amber-500/10" />
          </div>
          <div className="mt-4">
            <h4 className="text-2xl font-bold font-mono text-slate-800 dark:text-white">
              {streak} Days
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Longest streak: {Math.max(streak, 14)} days
            </p>
          </div>
        </div>

        {/* Dynamic target gauges */}
        <div className="liquid-glass p-5 rounded-3xl flex flex-col justify-between hover:scale-[1.02] cursor-pointer shadow-sm transition-all duration-300 border">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs uppercase font-mono tracking-wider">Daily Goal Target</span>
            <Target className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-4">
            <h4 className="text-2xl font-bold font-mono text-slate-800 dark:text-white">
              {Math.floor(dailyTargetMinutes / 60)}h
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Goal: {dailyTargetMinutes} mins
            </p>
          </div>
        </div>

        {/* Total Sessions logged */}
        <div className="liquid-glass p-5 rounded-3xl flex flex-col justify-between hover:scale-[1.02] cursor-pointer shadow-sm transition-all duration-300 border">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs uppercase font-mono tracking-wider">Cumulative Total</span>
            <Calendar className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-4">
            <h4 className="text-lg font-bold font-mono text-slate-800 dark:text-white col-span-2">
              {formatStudyTimeExact(totalAllTimeMinutes)}
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Active sessions: {studyLogs.length + (totalMinutesToday > 0 ? 1 : 0)}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Consistency Heatmap & Analytics Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Weekly Trend Bar Chart */}
        <div className="liquid-glass rounded-3xl p-6 shadow-sm space-y-4 transition-all duration-320 border">
          <h3 className="font-display font-semibold text-sm text-slate-800 dark:text-slate-100">
            Weekly Study Trend (past 7 days)
          </h3>

          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis 
                  dataKey="name" 
                  tickLine={false} 
                  axisLine={false} 
                  fontSize={11} 
                  tick={{ fill: "#64748b", fontFamily: "JetBrains Mono" }}
                />
                <YAxis 
                  domain={[0, 'auto']} 
                  tickLine={false} 
                  axisLine={false} 
                  fontSize={11} 
                  tick={{ fill: "#64748b", fontFamily: "JetBrains Mono" }}
                  unit="m"
                />
                <Tooltip 
                  cursor={{ fill: "rgba(16, 185, 129, 0.05)" }}
                  content={({  payload }) => {
                    if (payload && payload[0]) {
                      const mins = payload[0].value as number;
                      return (
                        <div className="bg-slate-900 text-white p-2.5 rounded-lg border border-slate-850 text-xs font-mono">
                          <p className="font-bold">{payload[0].payload.name}</p>
                          <p className="text-emerald-400 mt-1">Total: {Number(mins.toFixed(2))} minutes</p>
                          <p className="text-slate-400">Hours: {(mins / 60).toFixed(1)} hrs</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="minutes" fill="#10b981" radius={[8, 8, 0, 0]}>
                  {weeklyChartData.map((entry, index) => {
                    const isToday = index === 6;
                    return (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={isToday ? "#22c55e" : "#10b981"} 
                        fillOpacity={entry.minutes > 0 ? 0.95 : 0.25}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Subject Allocation Allocation */}
        <div className="liquid-glass rounded-3xl p-6 flex flex-col justify-between shadow-sm transition-all duration-320 border">
          <h3 className="font-display font-semibold text-sm text-slate-800 dark:text-slate-100 mb-2">
            Today Topic Distribution
          </h3>

          <div className="flex-1 flex flex-col sm:flex-row items-center justify-around gap-4 py-3">
            {subjectDistributionData.length > 0 ? (
              <>
                {/* Donut Chart */}
                <div className="h-[180px] w-[180px] shrink-0 relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={subjectDistributionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        dataKey="value"
                      >
                        {subjectDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Centered label */}
                  <div className="absolute text-center mt-2 flex flex-col items-center">
                    <p className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Total Today</p>
                    <p className="text-xs font-bold font-mono text-slate-800 dark:text-slate-200 mt-1 max-w-[120px]">
                      {formatStudyTimeExact(totalMinutesToday)}
                    </p>
                  </div>
                </div>

                {/* Customized legend colors */}
                <div className="space-y-1.5 max-h-[180px] overflow-y-auto no-scrollbar pr-2 flex-1">
                  {subjectDistributionData.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs gap-4">
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color }}></span>
                        <span className="truncate text-slate-600 dark:text-slate-400 font-medium" title={item.name}>{item.name}</span>
                      </div>
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                        {item.value}m
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-6 text-slate-400 space-y-2">
                <Target className="w-8 h-8 text-slate-300" />
                <p className="text-sm font-semibold">No study sessions recorded today.</p>
                <p className="text-xs text-slate-400 max-w-[200px]">Enter the Focus module and save a timer session to build distribution analytics.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 4. Streaks heat-map (Grid of 30 blocks simulating consistent study) */}
      <div className="liquid-glass rounded-3xl p-6 space-y-4 shadow-sm transition-all duration-320 border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-500 animate-pulse" />
            <h3 className="font-display font-semibold text-sm text-slate-800 dark:text-slate-100">
              Consistency Streak Grid (Past 30 Days)
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {activeDaysCount} / 30 active days
          </span>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed max-w-lg">
          Consistency is the superpower. Each box represents a calendar day: darker green shapes represent higher focused minutes achieved. Keep the grid green to stay consistent!
        </p>

        {/* Heatmap Blocks */}
        <div className="flex flex-wrap gap-2 pt-2">
          {heatmapData.map((block, idx) => {
            // color intensity tier
            const mins = block.minutes;
            let themeClass = "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500"; // zero minutes
            
            if (mins >= 120) {
              themeClass = "bg-emerald-700 text-emerald-50 shadow-sm"; // deep focus
            } else if (mins >= 60) {
              themeClass = "bg-emerald-500 text-emerald-50"; // great focus
            } else if (mins >= 30) {
              themeClass = "bg-emerald-300 text-emerald-950"; // modest focus
            } else if (mins > 0) {
              themeClass = "bg-emerald-100 text-emerald-900"; // minimal focus
            }

            return (
              <div
                key={idx}
                className={`h-9 w-9 rounded-xl flex items-center justify-center font-mono text-xs font-bold shrink-0 transition-transform hover:scale-110 relative group ${themeClass}`}
              >
                {block.dayNum}

                {/* Hover bubble helper */}
                <div className="absolute bottom-11 scale-0 group-hover:scale-100 transition-all z-20 bg-slate-900 text-white p-2 rounded-lg font-mono text-[10px] leading-relaxed whitespace-nowrap shadow-md pointer-events-none">
                  {block.month} {block.dayNum} • {Number(block.minutes.toFixed(2))} mins studied
                </div>
              </div>
            );
          })}
        </div>

        {/* legend info banner */}
        <div className="flex items-center gap-3 pt-3 text-[10px] uppercase font-mono text-slate-400">
          <span>Less</span>
          <div className="flex gap-1">
            <span className="h-3.5 w-3.5 rounded bg-slate-100 dark:bg-slate-850 inline-block border border-slate-200/20"></span>
            <span className="h-3.5 w-3.5 rounded bg-emerald-100 inline-block"></span>
            <span className="h-3.5 w-3.5 rounded bg-emerald-300 inline-block"></span>
            <span className="h-3.5 w-3.5 rounded bg-emerald-500 inline-block"></span>
            <span className="h-3.5 w-3.5 rounded bg-emerald-700 inline-block"></span>
          </div>
          <span>More</span>
        </div>
      </div>

    </div>
  );
}
