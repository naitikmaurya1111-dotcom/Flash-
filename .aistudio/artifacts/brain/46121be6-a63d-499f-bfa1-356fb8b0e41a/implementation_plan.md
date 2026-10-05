# Core Productivity Engine: Timer, Planner, Habits & Tasks

A major upgrade focused strictly on the four essential tools students and deep-workers use every single day: the **Focus Timer**, **Daily Planner**, **Habit Tracker**, and **Task Management System**. All AI features, chatbot widgets, and audio players are removed or de-emphasized to deliver a lightning-fast, distraction-free execution environment.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> **Key Decisions Revised per Your Directives:**
> - **100% Core Tools Focus**: Concentration solely on the primary productivity pillars: **Timer**, **Planner**, **Habits**, and **Tasks**.
> - **Zero AI Features**: Remove and hide AI coaching cards, AI suggestions, and LLM chat interfaces from the primary user flow. All systems run on fast, local, deterministic state.
> - **Zero Audio Clutter**: Ambient sound generators, background audio bars, and soundscape selectors are removed from the workspace so the view is clean and focused.
> - **Seamless Interconnection**: Each pillar feeds into the others: Planner tasks launch directly into Timer sessions; completed sessions automatically update Subject progress, Habit streaks, and Task checklists.

---

### 1. Overview & Core Concept

- **What It Does**: Unifies the four primary daily productivity pillars into one cohesive, distraction-free study system:
  1. **Focus Timer**: A high-ergonomic study clock (Stopwatch, Countdown, Pomodoro) with 1-click cognitive duration presets (5m Micro-Start, 25m Classic, 50m Deep Flow, 90m Synthesis), live task objective anchoring, quick brain dump notes, and physical recovery breaks.
  2. **Planner**: Visual daily agenda and subject block scheduler. Tasks can be arranged by urgency and priority, with a direct **"⚡ Focus Now"** button that sends any task straight to the timer.
  3. **Habit Tracker**: Daily study routines and discipline trackers with streak counters, weekly consistency grids, streak protection shields, and 1-click completion directly from the main cockpit.
  4. **Task System**: Robust task lists with subtask checklists, deadlines, priority flags (High/Med/Low), subject color-coding, and instant status syncing across all views.
- **Target Audience**: Students, competitive exam candidates, and deep-work professionals who need reliable, fast, and tactile productivity tools without gimmicks.
- **Key Value**: Replaces scattered apps with a single, synchronized hub where planning a task, executing it with a timer, and marking habit consistency happens in one fluid loop.

---

### 2. User Experience & Visual Design

#### The 4-Pillar Unified Workspace

```
┌────────────────────────────────────────────────────────────────────────┐
│                        MAIN TOP NAVIGATION                             │
│  [ Brand ]        [ ⏱ Timer ]  [ 📅 Planner ]  [ ⚡ Habits ]  [ ✅ Tasks ]│
└────────────────────────────────────────────────────────────────────────┘
                                     │
      ┌──────────────────────────────┼──────────────────────────────┐
      ▼                              ▼                              ▼
┌───────────────┐              ┌───────────────┐              ┌───────────────┐
│ 1. TIMER VIEW │              │  2. PLANNER   │              │3. HABITS &    │
│               │ ◄──────────  │               │ ──────────►  │   TASKS       │
│ • Chrono Orb  │  Focus Now   │ • Day/Week    │  Task Sync   │ • Streak Grid │
│ • Pinned Task │              │   Agenda      │              │ • Subtasks    │
│ • Presets     │              │ • Time Blocks │              │ • Priority    │
│ • Brain Dump  │              │ • Task Cards  │              │ • Fast Add    │
└───────────────┘              └───────────────┘              └───────────────┘
```

#### Detailed View Workflows

1. **Timer Cockpit (`TimelineView` / `FocusTimer`)**:
   - **Pinned Session Objective**: Displays the active task prominently at the top of the timer with a completion checkbox and subtask tally.
   - **Cognitive Duration Presets**:
     - *5 min (Micro-Start)*: Low-friction kickoff to beat procrastination.
     - *25 min (Classic Pomodoro)*: Focused burst with structured 5 min rest.
     - *50 min (Deep Flow)*: Sustained block for difficult problem sets or writing.
     - *90 min (Extended Block)*: Ultradian focus cycle.
   - **Working-Memory Brain Dump**: Quick 1-click modal to offload intrusive thoughts without abandoning the timer; items can be converted into planner tasks later.
   - **Physical Rest Station**: When rest mode triggers, provides non-distracting visual pacing: 20-20-20 eye relaxation, posture check, and box breathing guide.
   - **No Audio Bloat**: No ambient sound widgets or audio noise generators cluttering the screen.

2. **Planner Hub (`PlannerHub` & `CalendarView`)**:
   - **Subject-Organized Agenda**: Schedule study blocks by subject with color-coded badges and time estimates.
   - **"⚡ Focus Now" Action**: Every planned block and task has an immediate 1-click launch button that sets the active subject, loads the goal text, and navigates straight into the timer.
   - **Daily Progress Bar**: Shows planned minutes vs. actual logged minutes completed today.

3. **Habit Engine (`TargetRoadmap` / Habit Section)**:
   - **Daily Consistency Matrix**: Visual 7-day and 30-day streak heatmaps showing consistent study days.
   - **Core Study Habits**: Track daily essential rituals (e.g., Problem Practice, Flashcard Review, Syllabus Revision, Active Recall).
   - **Streak Shields & Grace Days**: Clear streak protection visual indicators to maintain long-term motivation without frustration.
   - **Inline Habit Check**: Toggle habits with one click directly from the planner or dashboard without opening deep sub-menus.

4. **Task Management**:
   - **Subtask Hierarchy**: Expand any task to see its subtask checklist with live percentage completion.
   - **Priority & Due Date Filtering**: Instant sorting by Due Date, Priority (🔥 High, ⚡ Medium, 💤 Low), or Subject.
   - **Quick Add Anywhere**: Keyboard-friendly shortcut and single-line quick-add input for capture speed.

#### Visual Identity & Clean Ergonomics
- **Zero AI & Zero Audio Distraction**: Strip away all AI recommendation cards, AI chat drawers, and audio streaming panels.
- **60-30-10 Dark Focus Theme**:
  - *60% Dark Canvas*: Rich slate black (`#0B0F17` / `#0F172A`).
  - *30% Card & Section Boundaries*: Subtle structural hairline dividers (`border-slate-800`), matte cards (`bg-slate-900/60`).
  - *10% Purposeful Accents*: Emerald for completed tasks/habits, Indigo for timer countdown, Amber for high-priority deadlines.
- **Tabular Figures & Anti-Jitter**: Enforce `font-mono tabular-nums` across all timers, counters, and streak numbers.
- **Zero-Pill Restraint**: Metadata rendered with clean unboxed text and subtle typographic dots (`·`).

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Full Removal of AI & Audio Distractions**
  - *Chosen Approach*: Hide/remove AI coaching cards (`AICoachCard`), AI analysis popups, and audio soundscape panels from the primary workflow.
  - *Why*: Directly aligns with user requirements. AI advice and background audio are secondary distractions; users need reliable, instant execution of their schedule and habits.

- **Decision 2: Direct Task-to-Timer Bridge**
  - *Chosen Approach*: Planner tasks and Habits directly pass context into the Timer. Clicking "Focus Now" sets the timer mode, anchors the goal, and logs actual completed minutes directly back to that task and subject.
  - *Why*: Eliminates the manual double-entry problem where a user marks a task in one place and manually sets a timer in another.

- **Decision 3: Integrated Habit Streaks in Daily Workflow**
  - *Chosen Approach*: Display daily habit checkboxes alongside the daily planner and dashboard rather than isolating them in a separate buried tab.
  - *Why*: Daily habits only stick when they are visible during daily planning and execution.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                                App.tsx                                 │
│  - Core State: subjects, tasks, habits, studyLogs, activeSubjectId     │
│  - Cross-Cutting Actions:                                              │
│    • handleStartTaskFocus(task)                                        │
│    • handleToggleTask(taskId)                                          │
│    • handleToggleHabit(habitId, date)                                  │
│    • handleAddStudyMinutes(subjectId, minutes, meta)                   │
└───────┬─────────────────┬───────────────────┬──────────────────┬───────┘
        │                 │                   │                  │
        ▼                 ▼                   ▼                  ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────────┐ ┌──────────────┐
│ TimelineView  │ │  PlannerHub   │ │   TargetRoadmap   │ │  Tasks Hub   │
│ (Focus Timer) │ │ (Day Planner) │ │  (Habit Tracker)  │ │ (Checklists) │
└───────────────┘ └───────────────┘ └───────────────────┘ └──────────────┘
```

#### Core Data Entities

- **Task**:
  ```typescript
  interface Task {
    id: string;
    title: string;
    subjectId: string;
    completed: boolean;
    dueDate?: string;
    priority?: 'high' | 'medium' | 'low';
    subtasks?: { id: string; text: string; done: boolean }[];
  }
  ```

- **Habit**:
  ```typescript
  interface Habit {
    id: string;
    title: string;
    category: string;
    frequency: 'daily' | 'weekdays' | 'weekly';
    targetDaysPerWeek: number;
    streak: number;
    bestStreak: number;
    completedDates: string[]; // ISO date strings (YYYY-MM-DD)
    icon?: string;
  }
  ```

- **StudyLog** (With Focus Metadata):
  ```typescript
  interface StudyLog {
    id: string;
    subjectId: string;
    minutes: number;
    date: string;
    focusQuality?: number; // 1-5 rating
    mindsetState?: CognitiveMindset;
    restMinutes?: number;
    taskId?: string;
  }
  ```

#### Implementation Steps

1. **Timer Enhancement**:
   - Integrate Pinned Task Objective card and cognitive presets (5m, 25m, 50m, 90m) in `TimelineView`.
   - Add working-memory Brain Dump drawer with 1-click conversion to tasks.
   - De-emphasize or remove audio controls from the timer viewport.
   - Streamline session debrief: 1-click rating + auto-credit study minutes + auto-complete task.

2. **Planner & Task Streamlining**:
   - Add direct **"⚡ Focus Now"** action buttons on all task cards in `PlannerHub`.
   - Implement subtask progress bars and inline subtask completion.
   - Add Priority and Due Date filtering to easily spot urgent study goals.

3. **Habit System Elevation**:
   - Elevate the Habit tracker with 7-day and 30-day visual streak heatmaps.
   - Allow 1-click habit check-offs directly from the Planner and Dashboard.
   - Link habit completions with streak calculations and XP progression.

4. **UI Cleanup**:
   - Remove/hide AI coaching cards and ambient sound sections.
   - Verify responsive desktop & tablet layouts with zero layout shifts.
   - Compile and verify end-to-end functionality.
