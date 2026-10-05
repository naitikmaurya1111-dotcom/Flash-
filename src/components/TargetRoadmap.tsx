import React, { useState, useEffect, useMemo } from "react";
import { 
  Target, Calculator, Calendar, AlertCircle, Plus, Trash2, CheckCircle2, 
  Sparkles, Award, TrendingUp, HelpCircle, BookOpen, Clock, RefreshCw, ChevronRight, Check,
  Zap, Flame, Shield, ShieldCheck, Heart, Dumbbell, Circle
} from "lucide-react";
import { Subject, ExamTarget, GpaCourse, Habit, DEFAULT_HABITS } from "../types";
import { User } from "firebase/auth";
import { db, handleFirestoreError, OperationType } from "../lib/googleApi";
import { collection, doc, getDocs, setDoc, deleteDoc } from "firebase/firestore";

interface TargetRoadmapProps {
  subjects: Subject[];
  userXp: number;
  onAddXp: (reason: string, amount: number) => Promise<void>;
  themePreset?: string;
  currentUser?: User | null;
  habits?: Habit[];
  onToggleHabit?: (habitId: string, dateStr?: string) => void;
  onAddHabit?: (title: string, category: "study" | "health" | "review" | "discipline", icon?: string) => void;
  onRemoveHabit?: (habitId: string) => void;
}

const DEFAULT_EXAMS: ExamTarget[] = [
  {
    id: "exam_default_1",
    title: "Midterm Examination 🧬",
    subjectId: "general",
    examDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    targetGrade: "A",
    preparationLevel: 45,
    difficulty: "Hard",
    checklist: [
      { id: "cli_def_1", text: "Read Chapter 5: Enzyme kinetics & active cell structure", isDone: true },
      { id: "cli_def_2", text: "Simulate practice test questions with active feedback", isDone: false },
      { id: "cli_def_3", text: "Create flash cards for carbon compound compounds", isDone: false }
    ]
  },
  {
    id: "exam_default_2",
    title: "Calculus Linear Algebra Proof Final 📐",
    subjectId: "general",
    examDate: new Date(Date.now() + 22 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    targetGrade: "A-",
    preparationLevel: 30,
    difficulty: "Expert",
    checklist: [
      { id: "cli_def_4", text: "Review matrix transformations and pivot columns", isDone: false },
      { id: "cli_def_5", text: "Complete homework list exercise set B", isDone: true }
    ]
  }
];

const DEFAULT_COURSES: GpaCourse[] = [
  {
    id: "course_default_1",
    name: "General Biochemistry 101",
    creditHours: 4,
    currentGradePercent: 88.5,
    targetGradePercent: 93.0,
    remainingWeightPercent: 35
  },
  {
    id: "course_default_2",
    name: "Linear Algebra & Matrices",
    creditHours: 3,
    currentGradePercent: 82.0,
    targetGradePercent: 90.0,
    remainingWeightPercent: 40
  },
  {
    id: "course_default_3",
    name: "Advanced English Composition",
    creditHours: 3,
    currentGradePercent: 94.0,
    targetGradePercent: 95.0,
    remainingWeightPercent: 20
  }
];

export default function TargetRoadmap({ 
  subjects, 
  userXp, 
  onAddXp, 
  themePreset = "dark-classic", 
  currentUser = null,
  habits: propHabits,
  onToggleHabit,
  onAddHabit,
  onRemoveHabit
}: TargetRoadmapProps) {
  const [viewMode, setViewMode] = useState<"habits" | "milestones" | "gpa">("habits");
  const [exams, setExams] = useState<ExamTarget[]>([]);
  const [courses, setCourses] = useState<GpaCourse[]>([]);

  // Habits local state fallback
  const [localHabits, setLocalHabits] = useState<Habit[]>(() => {
    try {
      const saved = localStorage.getItem("f5_habits_state");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_HABITS;
  });
  const habits = propHabits || localHabits;
  const [habitCategoryFilter, setHabitCategoryFilter] = useState<"all" | "study" | "health" | "review" | "discipline">("all");
  const [showAddHabitModal, setShowAddHabitModal] = useState(false);
  const [newHabitTitle, setNewHabitTitle] = useState("");
  const [newHabitCategory, setNewHabitCategory] = useState<"study" | "health" | "review" | "discipline">("study");
  const [newHabitIcon, setNewHabitIcon] = useState("⚡");
  const [newHabitTargetDays, setNewHabitTargetDays] = useState(7);

  // Inputs for adding a new Exam
  const [newExamTitle, setNewExamTitle] = useState("");
  const [newExamSubjectId, setNewExamSubjectId] = useState("");
  const [newExamDate, setNewExamDate] = useState("");
  const [newExamTargetGrade, setNewExamTargetGrade] = useState("A");
  const [newExamDifficulty, setNewExamDifficulty] = useState<"Easy" | "Medium" | "Hard" | "Expert">("Medium");
  const [showAddExamModal, setShowAddExamModal] = useState(false);

  // Inputs for adding a new Course
  const [newCourseName, setNewCourseName] = useState("");
  const [newCourseCredits, setNewCourseCredits] = useState(3);
  const [newCourseCurrent, setNewCourseCurrent] = useState(85);
  const [newCourseTarget, setNewCourseTarget] = useState(90);
  const [newCourseRemaining, setNewCourseRemaining] = useState(30);
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);

  // New Checklist item temp state map
  const [newChecklistText, setNewChecklistText] = useState<{ [examId: string]: string }>({});

  const handleHabitToggle = (habitId: string, dateStr?: string) => {
    if (onToggleHabit) {
      onToggleHabit(habitId, dateStr);
    } else {
      const targetDate = dateStr || new Date().toISOString().split("T")[0];
      setLocalHabits(prev => {
        const next = prev.map(h => {
          if (h.id !== habitId) return h;
          const isDone = h.completedDates.includes(targetDate);
          const nextDates = isDone ? h.completedDates.filter(d => d !== targetDate) : [...h.completedDates, targetDate];
          const nextStreak = isDone ? Math.max(0, h.streak - 1) : h.streak + 1;
          return {
            ...h,
            completedDates: nextDates,
            streak: nextStreak,
            bestStreak: Math.max(h.bestStreak, nextStreak)
          };
        });
        localStorage.setItem("f5_habits_state", JSON.stringify(next));
        return next;
      });
      onAddXp("Daily Habit Progress (+25 XP) 🔥", 25);
    }
  };

  const handleCreateHabit = () => {
    if (!newHabitTitle.trim()) return;
    if (onAddHabit) {
      onAddHabit(newHabitTitle.trim(), newHabitCategory, newHabitIcon);
    } else {
      const newH: Habit = {
        id: "habit_" + Date.now(),
        title: newHabitTitle.trim(),
        category: newHabitCategory,
        icon: newHabitIcon,
        streak: 1,
        bestStreak: 1,
        targetDaysPerWeek: newHabitTargetDays,
        completedDates: [new Date().toISOString().split("T")[0]],
        shieldActive: true,
        createdAt: new Date().toISOString()
      };
      setLocalHabits(prev => {
        const next = [newH, ...prev];
        localStorage.setItem("f5_habits_state", JSON.stringify(next));
        return next;
      });
      onAddXp(`New Habit Formed: ${newHabitTitle} 🌱 (+20 XP)`, 20);
    }
    setNewHabitTitle("");
    setShowAddHabitModal(false);
  };

  const handleDeleteHabit = (habitId: string) => {
    if (onRemoveHabit) {
      onRemoveHabit(habitId);
    } else {
      setLocalHabits(prev => {
        const next = prev.filter(h => h.id !== habitId);
        localStorage.setItem("f5_habits_state", JSON.stringify(next));
        return next;
      });
    }
  };

  useEffect(() => {
    const fetchRoadmapData = async () => {
      if (!currentUser) {
        // Load Exams locally
        const savedExams = localStorage.getItem("study_target_exams");
        if (savedExams) {
          try {
            setExams(JSON.parse(savedExams));
          } catch (e) {
            setExams(DEFAULT_EXAMS);
          }
        } else {
          const seeded = DEFAULT_EXAMS.map((ex, idx) => {
            if (subjects.length > idx) {
              return { ...ex, subjectId: subjects[idx].id };
            }
            return ex;
          });
          setExams(seeded);
          localStorage.setItem("study_target_exams", JSON.stringify(seeded));
        }

        // Load Courses locally
        const savedCourses = localStorage.getItem("study_target_gpa");
        if (savedCourses) {
          try {
            setCourses(JSON.parse(savedCourses));
          } catch (e) {
            setCourses(DEFAULT_COURSES);
          }
        } else {
          setCourses(DEFAULT_COURSES);
          localStorage.setItem("study_target_gpa", JSON.stringify(DEFAULT_COURSES));
        }
        return;
      }

      // If user is authenticated, retrieve/synchronize with Firestore
      try {
        const examsCol = collection(db, "users", currentUser.uid, "exams");
        const coursesCol = collection(db, "users", currentUser.uid, "gpaCourses");

        const [examsSnap, coursesSnap] = await Promise.all([
          getDocs(examsCol),
          getDocs(coursesCol)
        ]);

        const loadedExams: ExamTarget[] = [];
        examsSnap.forEach(docSnap => {
          loadedExams.push(docSnap.data() as ExamTarget);
        });

        const loadedCourses: GpaCourse[] = [];
        coursesSnap.forEach(docSnap => {
          loadedCourses.push(docSnap.data() as GpaCourse);
        });

        // Seed empty Cloud with Local/Defaults
        if (loadedExams.length === 0) {
          const localExamsRaw = localStorage.getItem("study_target_exams");
          let finalExams = DEFAULT_EXAMS.map((ex, idx) => {
            if (subjects.length > idx) {
              return { ...ex, subjectId: subjects[idx].id };
            }
            return ex;
          });
          if (localExamsRaw) {
            try { finalExams = JSON.parse(localExamsRaw); } catch (e) {}
          }
          setExams(finalExams);
          finalExams.forEach(ex => {
            setDoc(doc(db, "users", currentUser.uid, "exams", ex.id), ex).catch(() => {});
          });
        } else {
          setExams(loadedExams);
          localStorage.setItem("study_target_exams", JSON.stringify(loadedExams));
        }

        if (loadedCourses.length === 0) {
          const localCoursesRaw = localStorage.getItem("study_target_gpa");
          let finalCourses = DEFAULT_COURSES;
          if (localCoursesRaw) {
            try { finalCourses = JSON.parse(localCoursesRaw); } catch (e) {}
          }
          setCourses(finalCourses);
          finalCourses.forEach(c => {
            setDoc(doc(db, "users", currentUser.uid, "gpaCourses", c.id), c).catch(() => {});
          });
        } else {
          setCourses(loadedCourses);
          localStorage.setItem("study_target_gpa", JSON.stringify(loadedCourses));
        }
      } catch (err) {
        console.warn("Failed fetching cloud exam target datasets (falling back offline):", err);
        const savedExams = localStorage.getItem("study_target_exams");
        if (savedExams) {
          try { setExams(JSON.parse(savedExams)); } catch (e) {}
        }
        const savedCourses = localStorage.getItem("study_target_gpa");
        if (savedCourses) {
          try { setCourses(JSON.parse(savedCourses)); } catch (e) {}
        }
      }
    };

    fetchRoadmapData();
  }, [currentUser, subjects]);

  const saveExamsToStorage = (updatedExams: ExamTarget[]) => {
    setExams(updatedExams);
    localStorage.setItem("study_target_exams", JSON.stringify(updatedExams));
  };

  const saveCoursesToStorage = (updatedCourses: GpaCourse[]) => {
    setCourses(updatedCourses);
    localStorage.setItem("study_target_gpa", JSON.stringify(updatedCourses));
  };

  // Add Exam Target
  const handleAddExam = () => {
    if (!newExamTitle.trim() || !newExamDate) return;
    
    const chosenSubjectId = newExamSubjectId || (subjects[0]?.id || "general");
    const newExam: ExamTarget = {
      id: "exam_" + Date.now(),
      title: newExamTitle.trim(),
      subjectId: chosenSubjectId,
      examDate: newExamDate,
      targetGrade: newExamTargetGrade,
      preparationLevel: 10, // Initial default
      difficulty: newExamDifficulty,
      checklist: []
    };

    const updated = [newExam, ...exams];
    saveExamsToStorage(updated);
    onAddXp("Added student exam target to focus radar 🎯", 25);

    if (currentUser) {
      const targetPath = `users/${currentUser.uid}/exams/${newExam.id}`;
      setDoc(doc(db, "users", currentUser.uid, "exams", newExam.id), newExam).catch(err => {
        handleFirestoreError(err, OperationType.WRITE, targetPath);
      });
    }

    // Reset inputs
    setNewExamTitle("");
    setNewExamDate("");
    setNewExamTargetGrade("A");
    setNewExamDifficulty("Medium");
    setShowAddExamModal(false);
  };

  // Delete Exam
  const handleDeleteExam = (examId: string) => {
    const updated = exams.filter(e => e.id !== examId);
    saveExamsToStorage(updated);

    if (currentUser) {
      const targetPath = `users/${currentUser.uid}/exams/${examId}`;
      deleteDoc(doc(db, "users", currentUser.uid, "exams", examId)).catch(err => {
        handleFirestoreError(err, OperationType.DELETE, targetPath);
      });
    }
  };

  // Update Exam Prep Level
  const handleUpdatePrepLevel = (examId: string, value: number) => {
    const updated = exams.map(ex => {
      if (ex.id === examId) {
        return { ...ex, preparationLevel: Math.max(0, Math.min(100, value)) };
      }
      return ex;
    });
    saveExamsToStorage(updated);

    if (currentUser) {
      const targetEx = updated.find(e => e.id === examId);
      if (targetEx) {
        const targetPath = `users/${currentUser.uid}/exams/${examId}`;
        setDoc(doc(db, "users", currentUser.uid, "exams", examId), targetEx).catch(err => {
          handleFirestoreError(err, OperationType.WRITE, targetPath);
        });
      }
    }
  };

  // Toggle checklist item
  const handleToggleChecklistItem = (examId: string, itemId: string) => {
    const updated = exams.map(ex => {
      if (ex.id === examId) {
        const item = ex.checklist.find(i => i.id === itemId);
        const originallyDone = item?.isDone || false;
        
        const nextChecklist = ex.checklist.map(cli => {
          if (cli.id === itemId) return { ...cli, isDone: !cli.isDone };
          return cli;
        });

        // Give small XP if completing a concept
        if (!originallyDone) {
          onAddXp("Completed exam review subtopic concept! 📚", 20);
        }

        return { ...ex, checklist: nextChecklist };
      }
      return ex;
    });
    saveExamsToStorage(updated);

    if (currentUser) {
      const targetEx = updated.find(e => e.id === examId);
      if (targetEx) {
        const targetPath = `users/${currentUser.uid}/exams/${examId}`;
        setDoc(doc(db, "users", currentUser.uid, "exams", examId), targetEx).catch(err => {
          handleFirestoreError(err, OperationType.WRITE, targetPath);
        });
      }
    }
  };

  // Add item to checklist
  const handleAddChecklistItem = (examId: string) => {
    const text = newChecklistText[examId];
    if (!text || !text.trim()) return;

    const updated = exams.map(ex => {
      if (ex.id === examId) {
        return {
          ...ex,
          checklist: [
            ...ex.checklist,
            { id: "cli_" + Date.now(), text: text.trim(), isDone: false }
          ]
        };
      }
      return ex;
    });

    saveExamsToStorage(updated);
    setNewChecklistText(prev => ({ ...prev, [examId]: "" }));

    if (currentUser) {
      const targetEx = updated.find(e => e.id === examId);
      if (targetEx) {
        const targetPath = `users/${currentUser.uid}/exams/${examId}`;
        setDoc(doc(db, "users", currentUser.uid, "exams", examId), targetEx).catch(err => {
          handleFirestoreError(err, OperationType.WRITE, targetPath);
        });
      }
    }
  };

  // Delete item from checklist
  const handleDeleteChecklistItem = (examId: string, itemId: string) => {
    const updated = exams.map(ex => {
      if (ex.id === examId) {
        return {
          ...ex,
          checklist: ex.checklist.filter(cli => cli.id !== itemId)
        };
      }
      return ex;
    });
    saveExamsToStorage(updated);

    if (currentUser) {
      const targetEx = updated.find(e => e.id === examId);
      if (targetEx) {
        const targetPath = `users/${currentUser.uid}/exams/${examId}`;
        setDoc(doc(db, "users", currentUser.uid, "exams", examId), targetEx).catch(err => {
          handleFirestoreError(err, OperationType.WRITE, targetPath);
        });
      }
    }
  };

  // Add GPA Course
  const handleAddCourse = () => {
    if (!newCourseName.trim()) return;

    const safeCredits = Math.max(1, Math.min(10, Number(newCourseCredits) || 3));
    const safeCurrent = Math.max(0, Math.min(100, Number(newCourseCurrent) || 0));
    const safeTarget = Math.max(0, Math.min(100, Number(newCourseTarget) || 0));
    const safeRemaining = Math.max(1, Math.min(100, Number(newCourseRemaining) || 1));

    const newCourse: GpaCourse = {
      id: "course_" + Date.now(),
      name: newCourseName.trim(),
      creditHours: safeCredits,
      currentGradePercent: safeCurrent,
      targetGradePercent: safeTarget,
      remainingWeightPercent: safeRemaining
    };

    const updated = [newCourse, ...courses];
    saveCoursesToStorage(updated);
    onAddXp("Enrolled new coursework mapping into target GPA projections 📊", 20);

    if (currentUser) {
      const targetPath = `users/${currentUser.uid}/gpaCourses/${newCourse.id}`;
      setDoc(doc(db, "users", currentUser.uid, "gpaCourses", newCourse.id), newCourse).catch(err => {
        handleFirestoreError(err, OperationType.WRITE, targetPath);
      });
    }

    // Reset inputs
    setNewCourseName("");
    setNewCourseCredits(3);
    setNewCourseCurrent(85);
    setNewCourseTarget(90);
    setNewCourseRemaining(30);
    setShowAddCourseModal(false);
  };

  // Delete Course
  const handleDeleteCourse = (courseId: string) => {
    const updated = courses.filter(c => c.id !== courseId);
    saveCoursesToStorage(updated);

    if (currentUser) {
      const targetPath = `users/${currentUser.uid}/gpaCourses/${courseId}`;
      deleteDoc(doc(db, "users", currentUser.uid, "gpaCourses", courseId)).catch(err => {
        handleFirestoreError(err, OperationType.DELETE, targetPath);
      });
    }
  };

  // Dynamic Exam Calculations
  const calculateExamDiagnostics = (exam: ExamTarget) => {
    const examDateObj = new Date(exam.examDate + "T23:59:59");
    const today = new Date();
    // Zero out time part
    today.setHours(0, 0, 0, 0);
    examDateObj.setHours(0, 0, 0, 0);

    const timeDiff = examDateObj.getTime() - today.getTime();
    const daysRemaining = Math.max(0, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)));

    // Urgency Metric Based on Days Remaining & Current Prep Gap
    let urgency: "Low" | "Moderate" | "High" | "Critical" = "Low";
    const prepGap = 100 - exam.preparationLevel;

    if (daysRemaining <= 3) {
      urgency = prepGap > 15 ? "Critical" : "High";
    } else if (daysRemaining <= 7) {
      urgency = prepGap > 30 ? "Critical" : "High";
    } else if (daysRemaining <= 14) {
      urgency = prepGap > 45 ? "High" : "Moderate";
    } else if (daysRemaining <= 30) {
      urgency = prepGap > 60 ? "Moderate" : "Low";
    } else {
      urgency = "Low";
    }

    // Recommended daily focus minutes
    let recStudyMin = 0;
    if (daysRemaining > 0) {
      // Harder difficulty and higher prep progress gap drives higher focus weight
      const difficultyMultiplier = 
        exam.difficulty === "Expert" ? 2.5 :
        exam.difficulty === "Hard" ? 1.8 :
        exam.difficulty === "Medium" ? 1.2 : 0.7;

      recStudyMin = Math.round((prepGap * 4 * difficultyMultiplier) / (daysRemaining * 0.75));
      recStudyMin = Math.max(15, Math.min(240, recStudyMin));
    } else {
      recStudyMin = 0;
    }

    return {
      daysRemaining,
      urgency,
      recStudyMin
    };
  };

  // Dynamic GPA projection calculator logic
  const calculateCourseProjectedScore = (c: GpaCourse) => {
    // Score Needed on Remaining Work formula:
    // (TargetGrade - CurrentGrade * (1 - RemainingWeight/100)) / (RemainingWeight/100)
    if (c.remainingWeightPercent <= 0) return 0; // Guard against division by zero
    const currentWeight = 1 - (c.remainingWeightPercent / 100);
    const scoreNeeded = (c.targetGradePercent - (c.currentGradePercent * currentWeight)) / (c.remainingWeightPercent / 100);
    return Math.round(scoreNeeded * 10) / 10;
  };

  // Convert letter grade categories or scores dynamically into standard 4.0 weighted grade point averages
  const getGpaFromPercent = (pct: number): number => {
    const safePct = Math.max(0, Math.min(100, pct));
    if (safePct >= 93) return 4.0; // A
    if (safePct >= 90) return 3.7; // A-
    if (safePct >= 87) return 3.3; // B+
    if (safePct >= 83) return 3.0; // B
    if (safePct >= 80) return 2.7; // B-
    if (safePct >= 77) return 2.3; // C+
    if (safePct >= 73) return 2.0; // C
    if (safePct >= 70) return 1.7; // C-
    if (safePct >= 60) return 1.0; // D
    return 0.0; // F
  };

  // Memoized advanced calculation statistics of student targets & cumulative outcomes
  const gpaStats = useMemo(() => {
    if (courses.length === 0) return null;
    let totalCredits = 0;
    let sumCurrentWeightedPct = 0;
    let sumTargetWeightedPct = 0;
    
    let sumCurrentGpaWeighted = 0;
    let sumTargetGpaWeighted = 0;
    
    let sumMinSecuredPctWeighted = 0;
    let sumMaxAchievablePctWeighted = 0;

    courses.forEach(c => {
      const credits = Number(c.creditHours) || 0;
      totalCredits += credits;
      
      sumCurrentWeightedPct += c.currentGradePercent * credits;
      sumTargetWeightedPct += c.targetGradePercent * credits;
      
      sumCurrentGpaWeighted += getGpaFromPercent(c.currentGradePercent) * credits;
      sumTargetGpaWeighted += getGpaFromPercent(c.targetGradePercent) * credits;
      
      // Min secured: if they get 0% on remaining weights
      const minPct = c.currentGradePercent * (1 - c.remainingWeightPercent / 100);
      sumMinSecuredPctWeighted += minPct * credits;
      
      // Max achievable: if they get 100% on remaining weights
      const maxPct = (c.currentGradePercent * (1 - c.remainingWeightPercent / 100)) + c.remainingWeightPercent;
      sumMaxAchievablePctWeighted += maxPct * credits;
    });

    if (totalCredits <= 0) return null;

    const averageCurrentPct = Math.round((sumCurrentWeightedPct / totalCredits) * 10) / 10;
    const averageTargetPct = Math.round((sumTargetWeightedPct / totalCredits) * 10) / 10;
    
    const currentGpa = Math.round((sumCurrentGpaWeighted / totalCredits) * 100) / 100;
    const targetGpa = Math.round((sumTargetGpaWeighted / totalCredits) * 100) / 100;
    
    const averageMinSecuredPct = Math.round((sumMinSecuredPctWeighted / totalCredits) * 10) / 10;
    const averageMaxAchievablePct = Math.round((sumMaxAchievablePctWeighted / totalCredits) * 10) / 10;
    
    // Min vs Max GPAs (directly evaluating from calculated percentage bounds or course-level bounds)
    let sumMinGpaWeighted = 0;
    let sumMaxGpaWeighted = 0;
    courses.forEach(c => {
      const credits = Number(c.creditHours) || 0;
      const minPct = c.currentGradePercent * (1 - c.remainingWeightPercent / 100);
      const maxPct = (c.currentGradePercent * (1 - c.remainingWeightPercent / 100)) + c.remainingWeightPercent;
      sumMinGpaWeighted += getGpaFromPercent(minPct) * credits;
      sumMaxGpaWeighted += getGpaFromPercent(maxPct) * credits;
    });
    
    const minGpa = Math.round((sumMinGpaWeighted / totalCredits) * 100) / 100;
    const maxGpa = Math.round((sumMaxGpaWeighted / totalCredits) * 100) / 100;

    const leftPercentage = Math.max(0, Math.min(100, averageMinSecuredPct));
    const rightPercentage = Math.max(0, Math.min(100, 100 - averageMaxAchievablePct));

    return {
      totalCredits,
      averageCurrentPct,
      averageTargetPct,
      currentGpa,
      targetGpa,
      averageMinSecuredPct,
      averageMaxAchievablePct,
      minGpa,
      maxGpa,
      leftPercentage,
      rightPercentage
    };
  }, [courses]);

  const todayStr = new Date().toISOString().split("T")[0];

  const last7Days = useMemo(() => {
    const list = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      list.push({
        dateStr,
        dayNum: d.getDate(),
        label: dayLabels[d.getDay()],
        isToday: dateStr === todayStr
      });
    }
    return list;
  }, [todayStr]);

  const last30Days = useMemo(() => {
    const list = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      list.push(`${year}-${month}-${day}`);
    }
    return list;
  }, []);

  const filteredHabits = useMemo(() => {
    return habits.filter(h => {
      if (habitCategoryFilter === "all") return true;
      return h.category === habitCategoryFilter;
    });
  }, [habits, habitCategoryFilter]);

  const completedTodayCount = habits.filter(h => h.completedDates.includes(todayStr)).length;
  const habitCompletionPct = habits.length > 0 ? Math.round((completedTodayCount / habits.length) * 100) : 0;
  const bestOverallStreak = habits.reduce((max, h) => Math.max(max, h.streak), 0);

  const getUrgencyBadgeColor = (urgency: string) => {
    switch (urgency) {
      case "Critical":
        return "bg-rose-500/10 text-rose-500Border select-none border border-rose-500/30 font-bold px-2 py-0.5 rounded-full animate-pulse";
      case "High":
        return "bg-orange-500/10 text-orange-500 border border-orange-500/30 select-none font-bold px-2 py-0.5 rounded-full";
      case "Moderate":
        return "bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 select-none font-bold px-2 py-0.5 rounded-full";
      default:
        return "bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 select-none font-bold px-2 py-0.5 rounded-full";
    }
  };

  // Find linked subject helper
  const getSubjectObj = (subjectId: string) => {
    return subjects.find(s => s.id === subjectId) || { name: "General Option", color: "bg-slate-500" };
  };

  return (
    <div id="target_roadmap_hub_container" className="space-y-4 sm:space-y-6">
      
      {/* Visual Banner Header */}
      <div className="liquid-glass relative rounded-2xl sm:rounded-3xl overflow-hidden p-4 sm:p-6 md:p-8 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4 sm:gap-6 border">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#f26419]/5 rounded-full filter blur-3xl -z-10" />
        <div className="space-y-2 text-left shrink-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f26419]/10 text-[#f26419] text-xs font-black uppercase tracking-wider">
            <Target className="w-3.5 h-3.5" />
            Designer Grade Target Suite
            {currentUser && (
              <span className="ml-2.5 inline-flex items-center gap-1 text-[9px] text-emerald-600 dark:text-emerald-400 font-mono font-black uppercase tracking-widest bg-emerald-100/65 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Cloud Connected
              </span>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-800 dark:text-white font-sans leading-none">
            Target Roadmaps & Habits
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl">
            Build consistent daily study habits, track exam countdowns with calculated urgency, and use the Grade Projector to plan targets.
          </p>
        </div>
        
        {/* Navigation Selector inside Target Suite */}
        <div className="flex bg-slate-100/50 dark:bg-black/25 p-1 rounded-2xl border border-slate-200/30 dark:border-white/5 backdrop-blur-md shrink-0 select-none self-start md:self-center shadow-inner gap-1">
          <button
            onClick={() => setViewMode("habits")}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-black transition-all active:scale-95 cursor-pointer duration-350 ${
              viewMode === "habits"
                ? "bg-[#f26419] text-white dark:bg-white dark:text-slate-950 shadow-md font-extrabold scale-[1.02]"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            Habits & Streaks
          </button>

          <button
            onClick={() => setViewMode("milestones")}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-black transition-all active:scale-95 cursor-pointer duration-350 ${
              viewMode === "milestones"
                ? "bg-[#f26419] text-white dark:bg-white dark:text-slate-950 shadow-md font-extrabold scale-[1.02]"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Exam Milestones
          </button>
          
          <button
            onClick={() => setViewMode("gpa")}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-black transition-all active:scale-95 cursor-pointer duration-350 ${
              viewMode === "gpa"
                ? "bg-[#f26419] text-white dark:bg-white dark:text-slate-950 shadow-md font-extrabold scale-[1.02]"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            Grade Calculator
          </button>
        </div>
      </div>

      {/* 1. Habit Consistency Matrix View */}
      {viewMode === "habits" && (
        <div className="space-y-6">
          {/* Section Actions bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-left">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-400">Daily Habit Consistency Hub</h3>
              <p className="text-[11px] text-slate-450">Track discipline rituals, build unbroken streaks, and protect consistency records</p>
            </div>
            
            <button
              onClick={() => setShowAddHabitModal(true)}
              className="flex items-center gap-1.5 bg-[#f26419] hover:bg-orange-600 active:scale-95 text-white text-xs font-black px-4 py-2 rounded-xl z-10 shadow-lg shadow-orange-500/25 transition-all text-center cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              Add Custom Habit
            </button>
          </div>

          {/* Habit Metrics Dashboard Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-left">
            <div className="bg-slate-50/70 dark:bg-[#121212]/90 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-850">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Today's Discipline</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-black text-slate-800 dark:text-white font-mono">
                  {completedTodayCount}/{habits.length}
                </span>
                <span className="text-xs font-bold text-emerald-500 font-mono">{habitCompletionPct}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${habitCompletionPct}%` }} />
              </div>
            </div>

            <div className="bg-slate-50/70 dark:bg-[#121212]/90 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-850">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Best Habit Streak</span>
              <div className="flex items-center gap-1.5 mt-1">
                <Flame className="w-5 h-5 text-amber-500 fill-amber-500" />
                <span className="text-2xl font-black text-amber-500 font-mono">{bestOverallStreak} Days</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Unbroken consistency high score</span>
            </div>

            <div className="bg-slate-50/70 dark:bg-[#121212]/90 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-850 col-span-1 sm:col-span-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-500" />
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-500">Streak Shield Protection</span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold mt-1">
                🛡️ Active Shield: 1 missed day is automatically forgiven without resetting your streaks.
              </p>
              <p className="text-[10px] text-slate-450 mt-0.5">
                Maintain consistency over perfection. Rest days don't erase accumulated neural momentum.
              </p>
            </div>
          </div>

          {/* Category Filter bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-left">
            {[
              { id: "all", label: "All Habits" },
              { id: "study", label: "⚡ Study Focus" },
              { id: "review", label: "🧠 Active Recall" },
              { id: "discipline", label: "📝 Discipline" },
              { id: "health", label: "💧 Health & Rest" }
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setHabitCategoryFilter(cat.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  habitCategoryFilter === cat.id
                    ? "bg-[#f26419] text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-900 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Habits Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-left">
            {filteredHabits.map(h => {
              const isDoneToday = h.completedDates.includes(todayStr);
              return (
                <div
                  key={h.id}
                  className={`bg-white dark:bg-[#151515] p-4 sm:p-5 rounded-2xl border transition-all space-y-4 shadow-xs ${
                    isDoneToday
                      ? "border-emerald-500/30 dark:border-emerald-500/20"
                      : "border-slate-200/60 dark:border-slate-800"
                  }`}
                >
                  {/* Habit Top Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl p-2 bg-slate-100 dark:bg-slate-900 rounded-xl">{h.icon}</span>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-white leading-tight">
                          {h.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                          <span className="capitalize">{h.category}</span>
                          <span>·</span>
                          <span>Target: {h.targetDaysPerWeek}d/week</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="flex items-center gap-1 bg-amber-500/10 text-amber-500 px-2.5 py-1 rounded-lg text-xs font-mono font-bold border border-amber-500/20">
                        <Flame className="w-3.5 h-3.5 fill-current" />
                        <span>{h.streak}d streak</span>
                      </div>
                      <button
                        onClick={() => handleDeleteHabit(h.id)}
                        className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Delete habit"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* 7-Day Interactive Week Matrix */}
                  <div className="space-y-1.5 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-slate-850">
                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                      <span>7-Day Interactive History (click to toggle)</span>
                      <span>Best: {h.bestStreak}d</span>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center">
                      {last7Days.map(day => {
                        const isCompletedOnDay = h.completedDates.includes(day.dateStr);
                        return (
                          <button
                            key={day.dateStr}
                            type="button"
                            onClick={() => handleHabitToggle(h.id, day.dateStr)}
                            className={`flex flex-col items-center py-1.5 rounded-lg transition-all cursor-pointer ${
                              isCompletedOnDay
                                ? "bg-emerald-500 text-white font-bold shadow-xs scale-102"
                                : day.isToday
                                ? "bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 ring-1 ring-[#f26419]"
                                : "bg-slate-100 dark:bg-slate-900/60 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                            }`}
                            title={`${day.label} (${day.dateStr}): ${isCompletedOnDay ? "Completed" : "Not completed"}`}
                          >
                            <span className="text-[9px] uppercase font-mono">{day.label.slice(0, 2)}</span>
                            <span className="text-[11px] font-mono mt-0.5">{day.dayNum}</span>
                            {isCompletedOnDay ? (
                              <Check className="w-3 h-3 stroke-[3] mt-0.5" />
                            ) : (
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mt-1" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 30-Day Heatmap Bar */}
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400">30-Day Consistency Heatmap</span>
                    <div className="flex items-center gap-1 overflow-x-auto py-1 no-scrollbar">
                      {last30Days.map(dStr => {
                        const done = h.completedDates.includes(dStr);
                        return (
                          <div
                            key={dStr}
                            className={`w-2.5 h-2.5 rounded-xs shrink-0 ${
                              done
                                ? "bg-emerald-500"
                                : "bg-slate-200 dark:bg-slate-800"
                            }`}
                            title={`${dStr}: ${done ? "Completed" : "Missed"}`}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Primary 1-Click Action Button */}
                  <button
                    onClick={() => handleHabitToggle(h.id, todayStr)}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      isDoneToday
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
                        : "bg-[#f26419] hover:bg-[#e05612] text-white shadow-md active:scale-98"
                    }`}
                  >
                    {isDoneToday ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span>Completed Today (Click to Uncheck)</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 fill-current" />
                        <span>Mark Done Today (+25 XP)</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Exam Milestones View */}
      {viewMode === "milestones" && (
        <div className="space-y-6">
          
          {/* Section Actions bar */}
          <div className="flex items-center justify-between">
            <div className="text-left">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-400">Target Radar</h3>
              <p className="text-[11px] text-slate-450">Active Countdown timers, Checklist progress & recommended minutes</p>
            </div>
            
            <button
              onClick={() => setShowAddExamModal(true)}
              className="flex items-center gap-1.5 bg-[#f26419] hover:bg-orange-600 active:scale-95 text-white text-xs font-black px-4 py-2 rounded-xl z-10 shadow-lg shadow-orange-500/25 transition-all text-center cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Exam Target
            </button>
          </div>

          {/* Exam Cards Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-5 text-left">
            {exams.length === 0 ? (
              <div className="col-span-full py-8 sm:py-16 rounded-2xl sm:rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-6 sm:p-8 text-center space-y-4 bg-white/40 dark:bg-black/10 backdrop-blur-sm">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-orange-500/10 flex items-center justify-center text-[#f26419]">
                  <Target className="w-8 h-8 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-black text-slate-800 dark:text-slate-200">Set Your First Exam Milestone</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                    Track upcoming quizzes, midterms, or standardized tests. We'll automatically calculate preparation confidence, study urgency ratings, and recommended daily study focus hours.
                  </p>
                </div>
                <button
                  onClick={() => setShowAddExamModal(true)}
                  className="inline-flex items-center gap-1.5 bg-[#f26419] hover:bg-orange-600 active:scale-95 text-white text-xs font-black px-5 py-2.5 rounded-xl shadow-md shadow-orange-500/20 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Create Target
                </button>
              </div>
            ) : (
              exams.map((ex) => {
                const { daysRemaining, urgency, recStudyMin } = calculateExamDiagnostics(ex);
                const subObj = getSubjectObj(ex.subjectId);
                const completedItems = ex.checklist.filter(i => i.isDone).length;
                const progressPercent = ex.checklist.length > 0 
                  ? Math.round((completedItems / ex.checklist.length) * 100)
                  : 0;

                return (
                  <div key={ex.id} className="bg-white/80 dark:bg-[#121212]/80 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-900/60 p-4 sm:p-5 shadow-sm space-y-3 sm:space-y-4 hover:border-slate-300 dark:hover:border-slate-800 transition-all flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-[#f26419]" />
                    
                    <div className="space-y-3.5">
                      {/* Top Row: Labels, countdown and delete */}
                      <div className="flex items-start justify-between gap-2 pl-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono uppercase bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded text-slate-500 dark:text-slate-400 font-extrabold truncate max-w-[110px]">
                              {subObj.name}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                              Diff: {ex.difficulty}
                            </span>
                          </div>
                          <h4 className="text-sm font-black text-slate-800 dark:text-white leading-tight group-hover:text-[#f26419] transition-colors">{ex.title}</h4>
                        </div>
                        
                        <div className="flex items-center gap-1 shrink-0">
                          <div className={getUrgencyBadgeColor(urgency)}>
                            {urgency}
                          </div>
                          <button
                            onClick={() => handleDeleteExam(ex.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/80 transition-all cursor-pointer"
                            title="Remove target"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Diagnostic HUD: Recommended minutes and countdown info */}
                      <div className="grid grid-cols-2 gap-3 pl-2">
                        <div className="bg-slate-50/65 dark:bg-[#0f1118] border border-slate-200/50 dark:border-slate-900/40 p-2.5 rounded-xl text-left">
                          <span className="text-[9px] uppercase font-mono tracking-wider text-slate-400 dark:text-slate-500 font-extrabold block">Time Left</span>
                          <div className="flex items-baseline gap-1 mt-0.5">
                            <span className="text-base font-black text-slate-700 dark:text-slate-200">{daysRemaining}</span>
                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">days</span>
                          </div>
                        </div>

                        <div className="bg-slate-50/65 dark:bg-[#0f1118] border border-slate-250/50 dark:border-slate-900/40 p-2.5 rounded-xl text-left">
                          <span className="text-[9px] uppercase font-mono tracking-wider text-[#f26419] font-extrabold block">Daily Focus Dose</span>
                          <div className="flex items-baseline gap-1 mt-0.5">
                            <span className="text-base font-black text-[#f26419]">{recStudyMin}</span>
                            <span className="text-[10px] font-bold text-[#f26419]/70">mins/day</span>
                          </div>
                        </div>
                      </div>

                      {/* Preparation Slider controls */}
                      <div className="space-y-1.5 pl-2">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-bold text-slate-550 dark:text-slate-400">Preparation Confidence</span>
                          <span className="font-mono font-black text-[#f26419]">{ex.preparationLevel}%</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <input 
                            type="range"
                            min="0"
                            max="100"
                            value={ex.preparationLevel}
                            onChange={(e) => handleUpdatePrepLevel(ex.id, parseInt(e.target.value))}
                            className="w-full h-1.5 bg-slate-100 dark:bg-slate-900 rounded-lg appearance-none cursor-pointer accent-[#f26419]"
                          />
                        </div>
                      </div>

                      {/* Sub-concepts / Checklist */}
                      <div className="space-y-2 pl-2">
                        <span className="text-[9px] uppercase font-mono tracking-wider text-slate-400 font-extrabold block">Review Concepts Checklist ({progressPercent}%)</span>
                        
                        {ex.checklist.length > 0 && (
                          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 no-scrollbar">
                            {ex.checklist.map((cli) => (
                              <div key={cli.id} className="flex items-center justify-between gap-2 p-1.5 bg-slate-150/20 dark:bg-black/15 border border-slate-150/40 dark:border-slate-900/30 rounded-xl group/item">
                                <div className="flex items-center gap-2 min-w-0">
                                  <button
                                    onClick={() => handleToggleChecklistItem(ex.id, cli.id)}
                                    className={`w-4.5 h-4.5 rounded-md flex items-center justify-center border text-white transition-all cursor-pointer shrink-0 ${
                                      cli.isDone 
                                        ? "bg-emerald-500 border-emerald-600" 
                                        : "border-slate-300 dark:border-slate-700 hover:border-emerald-500"
                                    }`}
                                  >
                                    {cli.isDone && <Check className="w-3 h-3 text-white stroke-[3.5]" />}
                                  </button>
                                  <span className={`text-xs truncate min-w-0 font-sans ${cli.isDone ? 'line-through text-slate-400 dark:text-slate-550' : 'text-slate-700 dark:text-slate-200'}`}>
                                    {cli.text}
                                  </span>
                                </div>
                                <button
                                  onClick={() => handleDeleteChecklistItem(ex.id, cli.id)}
                                  className="opacity-0 group-hover/item:opacity-100 p-1 text-slate-400 hover:text-rose-500 rounded transition-all cursor-pointer"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Fast append input */}
                        <div className="flex gap-2">
                          <input 
                            placeholder="Add textbook topic or formula..."
                            className="flex-1 bg-slate-50/50 dark:bg-black/20 border border-slate-200 dark:border-slate-900 text-xs px-3 py-1.5 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#f26419]/50"
                            value={newChecklistText[ex.id] || ""}
                            onChange={(e) => setNewChecklistText(prev => ({ ...prev, [ex.id]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddChecklistItem(ex.id);
                            }}
                          />
                          <button
                            onClick={() => handleAddChecklistItem(ex.id)}
                            className="bg-slate-100 dark:bg-slate-900 hover:bg-[#f26419] hover:text-white dark:hover:bg-[#f26419] text-xs font-black px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 transition-all cursor-pointer shrink-0"
                          >
                            + Add
                          </button>
                        </div>
                      </div>

                    </div>

                    {/* Bottom row: Target level badge details */}
                    <div className="pt-3 border-t border-slate-200/50 dark:border-slate-900/40 pl-2 mt-4 flex items-center justify-between text-[10px] text-slate-450">
                      <span>Target Date: {new Date(ex.examDate).toLocaleDateString()}</span>
                      <span className="font-bold text-[#f26419]">Target: {ex.targetGrade}</span>
                    </div>

                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 3. Course Grade GPA Calculator View */}
      {viewMode === "gpa" && (
        <div className="space-y-6">
          
          <div className="flex items-center justify-between">
            <div className="text-left">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-400">Course grade projections</h3>
              <p className="text-[11px] text-slate-450">Set course parameters and project required scores on remaining examinations</p>
            </div>
            
            <button
              onClick={() => setShowAddCourseModal(true)}
              className="flex items-center gap-1.5 bg-[#f26419] hover:bg-orange-600 active:scale-95 text-white text-xs font-black px-4 py-2 rounded-xl z-10 shadow-lg shadow-orange-500/25 transition-all text-center cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Class Target
            </button>
          </div>

          {gpaStats && (
            <div className="bg-gradient-to-r from-indigo-50/70 via-white/80 to-blue-50/50 dark:from-[#0d1325]/50 dark:via-[#090b11]/80 dark:to-[#0b101f]/70 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/60 dark:border-slate-850/75 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 text-left shadow-sm hover-lift transition-all duration-300">
              
              {/* CURRENT GPA MODULE */}
              <div className="space-y-2 border-b sm:border-b-0 sm:border-r border-slate-200/50 dark:border-slate-850/60 pb-3 sm:pb-0 sm:pr-4 last:border-0">
                <span className="text-[10px] font-mono font-black uppercase tracking-wider text-slate-400 block dark:text-slate-500">Current Cumulative</span>
                <div className="flex items-baseline gap-1.5 pt-0.5">
                  <span className="text-2xl font-mono font-black text-slate-800 dark:text-neutral-100">{gpaStats.currentGpa.toFixed(2)}</span>
                  <span className="text-xs text-slate-400 font-bold">/ 4.00</span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <span>Average score:</span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{gpaStats.averageCurrentPct}%</span>
                </div>
                <span className="text-[9px] text-slate-400 block font-sans">Weighted average of {gpaStats.totalCredits} enrolled credits.</span>
              </div>

              {/* TARGET GPA MODULE */}
              <div className="space-y-2 border-b sm:border-b-0 sm:border-r border-slate-200/50 dark:border-slate-850/60 pb-3 sm:pb-0 sm:pr-4 last:border-0">
                <span className="text-[10px] font-mono font-black uppercase tracking-wider text-slate-400 block dark:text-slate-500">Target Cumulative</span>
                <div className="flex items-baseline gap-1.5 pt-0.5">
                  <span className="text-2xl font-mono font-black text-[#f26419]">{gpaStats.targetGpa.toFixed(2)}</span>
                  <span className="text-xs text-[#f26419]/60 font-bold">/ 4.00</span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <span>Goal average:</span>
                  <span className="font-mono font-bold text-[#f26419]">{gpaStats.averageTargetPct}%</span>
                </div>
                <span className="text-[9px] text-[#f26419]/70 block font-sans">Target to secure Dean's list standards.</span>
              </div>

              {/* PROJECTED GPA BOUNDS MODULE */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono font-black uppercase tracking-wider text-slate-400 block dark:text-slate-500">Projected Range Bounds</span>
                
                <div className="flex items-baseline gap-1 pt-0.5">
                  <span className="text-sm font-bold text-emerald-500 font-mono">{gpaStats.minGpa.toFixed(2)}</span>
                  <span className="text-xs text-slate-450">to</span>
                  <span className="text-sm font-bold text-indigo-500 font-mono">{gpaStats.maxGpa.toFixed(2)} GPA</span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>Min Secured: {gpaStats.averageMinSecuredPct}%</span>
                    <span>Max Possible: {gpaStats.averageMaxAchievablePct}%</span>
                  </div>
                  {/* Visual bracket line */}
                  <div className="relative w-full h-1.5 bg-slate-200 dark:bg-slate-900 rounded-full overflow-hidden">
                    <div 
                      className="absolute h-full bg-gradient-to-r from-emerald-500 to-indigo-500 rounded-full"
                      style={{ 
                        left: `${gpaStats.leftPercentage}%`, 
                        right: `${gpaStats.rightPercentage}%` 
                      }}
                    />
                  </div>
                </div>
                <span className="text-[9px] text-slate-450 dark:text-slate-550 block font-sans leading-tight">Depends on remaining grade weight components.</span>
              </div>

            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 text-left">
            {courses.length === 0 ? (
              <div className="col-span-full py-8 sm:py-16 rounded-2xl sm:rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-6 sm:p-8 text-center space-y-4 bg-white/40 dark:bg-black/10 backdrop-blur-sm">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-[#f26419]/10 flex items-center justify-center text-[#f26419]">
                  <Calculator className="w-8 h-8 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-black text-slate-800 dark:text-slate-200">Enrol Your First Class Target</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                    Configure your current class averages, remaining grade weights, and targets to dynamically calculate the precise average required on remaining finals to hit your goals.
                  </p>
                </div>
                <button
                  onClick={() => setShowAddCourseModal(true)}
                  className="inline-flex items-center gap-1.5 bg-[#f26419] hover:bg-orange-600 active:scale-95 text-white text-xs font-black px-5 py-2.5 rounded-xl shadow-md shadow-orange-500/20 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Add Class Target
                </button>
              </div>
            ) : (
              courses.map((c) => {
                const projectedScoreNeeded = calculateCourseProjectedScore(c);
                const isImpossible = projectedScoreNeeded > 100;
                const isAlreadySecured = projectedScoreNeeded <= 0;

                // Dynamic feasibility tag helper
                let feasibilityTag = "Feasible";
                let feasibilityClass = "bg-sky-500/10 text-sky-500 border border-sky-500/25";
                if (isImpossible) {
                  feasibilityTag = "Impossible";
                  feasibilityClass = "bg-rose-500/15 text-rose-500 border border-rose-500/30 animate-pulse";
                } else if (isAlreadySecured) {
                  feasibilityTag = "Secured";
                  feasibilityClass = "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 font-black";
                } else if (projectedScoreNeeded <= 70) {
                  feasibilityTag = "Highly Feasible";
                  feasibilityClass = "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20";
                } else if (projectedScoreNeeded <= 85) {
                  feasibilityTag = "Feasible";
                  feasibilityClass = "bg-blue-500/10 text-blue-500 border border-blue-500/20";
                } else {
                  feasibilityTag = "Challenging";
                  feasibilityClass = "bg-amber-500/10 text-amber-500 border border-amber-500/20";
                }

                return (
                  <div key={c.id} className="bg-white/80 dark:bg-[#121212]/80 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-900/60 p-5 shadow-sm space-y-4 hover:border-slate-350 dark:hover:border-slate-850 hover:shadow-lg hover:scale-[1.01] transition-all duration-300 flex flex-col justify-between relative group/course">
                    <div className="space-y-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9.5px] font-mono uppercase text-slate-400 dark:text-slate-500 font-extrabold select-none">
                              {c.creditHours} Credits Course
                            </span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full select-none ${feasibilityClass}`}>
                              {feasibilityTag}
                            </span>
                          </div>
                          <h4 className="text-xs sm:text-sm font-black text-slate-805 dark:text-slate-50 leading-tight truncate max-w-[170px] group-hover/course:text-[#f26419] transition-all">
                            {c.name}
                          </h4>
                        </div>

                        <button
                          onClick={() => handleDeleteCourse(c.id)}
                          className="p-1 px-1.5 text-slate-400 hover:text-rose-500 rounded hover:bg-slate-100 dark:hover:bg-slate-900/60 transition-all cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Progress meters row */}
                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1.5">
                        <div className="bg-slate-50/50 dark:bg-black/25 p-2 rounded-xl text-left border border-slate-150/40 dark:border-slate-900/45">
                          <span className="text-[9px] font-mono text-slate-450 font-black block">Current Score</span>
                          <span className="text-xs font-black text-slate-700 dark:text-slate-200">{c.currentGradePercent}%</span>
                        </div>
                        <div className="bg-slate-50/50 dark:bg-black/25 p-2 rounded-xl text-left border border-slate-150/40 dark:border-slate-900/45">
                          <span className="text-[9px] font-mono text-slate-450 font-black block">Desired Target</span>
                          <span className="text-xs font-black text-rose-500 dark:text-rose-400">{c.targetGradePercent}%</span>
                        </div>
                      </div>

                      {/* Weight information slider bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="font-bold text-slate-550 dark:text-slate-400">Remaining Weight Left</span>
                          <span className="font-mono bg-indigo-500/10 px-1.5 py-0.5 rounded text-indigo-500 dark:text-indigo-400 font-bold">{c.remainingWeightPercent}%</span>
                        </div>
                        <div className="w-full h-1 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-500 transition-all duration-300"
                            style={{ width: `${c.remainingWeightPercent}%` }}
                          />
                        </div>
                      </div>

                      {/* Resulting Output Box: High designer focus */}
                      <div className={`p-3 rounded-xl border flex flex-col justify-center text-center mt-3.5 ${
                        isImpossible 
                          ? "bg-rose-550/10 border-rose-300/20 text-rose-500" 
                          : isAlreadySecured
                          ? "bg-emerald-500/10 border-emerald-300/20 text-emerald-500"
                          : "bg-slate-50 dark:bg-[#0f1118] border-slate-200/50 dark:border-slate-900/40 text-slate-700 dark:text-slate-200"
                      }`}>
                        <span className="text-[8.5px] uppercase font-mono tracking-widest font-black text-slate-400 block mb-1">Score Needed on Remaining Work</span>
                        
                        {isImpossible ? (
                          <div className="space-y-0.5">
                            <span className="text-sm font-extrabold text-rose-500">Unachievable ({projectedScoreNeeded}%)</span>
                            <span className="text-[9.5px] text-slate-450 block">Requires score greater than 100%. Adjust grade goals.</span>
                          </div>
                        ) : isAlreadySecured ? (
                          <div className="space-y-0.5">
                            <span className="text-sm font-extrabold text-emerald-500">Secured! (0%)</span>
                            <span className="text-[9.5px] text-slate-450 block">Grade goals are practically secured. Keep normal work up!</span>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="text-base font-black text-slate-800 dark:text-white leading-none font-mono">
                              {projectedScoreNeeded}% average
                            </span>
                            <span className="text-[9.5px] text-slate-450 block">Required on final exam/materials to hit {c.targetGradePercent}%.</span>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Add Exam Target Modal Overlay */}
      {showAddExamModal && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl text-left space-y-4">
            <div>
              <h3 className="text-base font-black text-slate-850 dark:text-white">Create Exam Target</h3>
              <p className="text-xs text-slate-450">Set milestone target goals for student performance</p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">Exam Title</label>
                <input 
                  placeholder="e.g. Mathematics Midterm, SAT Physics prep"
                  className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-850 p-2.5 rounded-xl text-xs text-slate-700 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#f26419]"
                  value={newExamTitle}
                  onChange={(e) => setNewExamTitle(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">Linked Subject</label>
                <select
                  className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-850 p-2.5 rounded-xl text-xs text-slate-700 dark:text-slate-100 focus:outline-none focus:border-[#f26419]"
                  value={newExamSubjectId}
                  onChange={(e) => setNewExamSubjectId(e.target.value)}
                >
                  <option value="">Select focused category topic</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">Exam Date</label>
                  <input 
                    type="date"
                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-850 p-2.5 rounded-xl text-xs text-slate-700 dark:text-slate-100 focus:outline-none focus:border-[#f26419]"
                    value={newExamDate}
                    onChange={(e) => setNewExamDate(e.target.value)}
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">Target Grade</label>
                  <input 
                    placeholder="e.g. A*, A, 95%"
                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-850 p-2.5 rounded-xl text-xs text-slate-700 dark:text-slate-100 focus:outline-none focus:border-[#f26419]"
                    value={newExamTargetGrade}
                    onChange={(e) => setNewExamTargetGrade(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">Estimated Syllabus Difficulty</label>
                <div className="grid grid-cols-4 gap-2">
                  {(["Easy", "Medium", "Hard", "Expert"] as const).map((diff) => (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => setNewExamDifficulty(diff)}
                      className={`text-[10.5px] font-bold py-1 px-1.5 border rounded-lg text-center cursor-pointer transition-all ${
                        newExamDifficulty === diff 
                          ? "bg-[#f26419] border-[#f26419] text-white font-extrabold" 
                          : "border-slate-200 dark:border-slate-800 text-slate-500 dark:bg-[#1a1a1a] hover:border-[#f26419]/40"
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowAddExamModal(false)}
                className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs px-4 py-2.5 rounded-xl text-slate-500 dark:hover:text-slate-200 cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                onClick={handleAddExam}
                className="bg-[#f26419] hover:bg-orange-600 text-white text-xs font-black px-5 py-2.5 rounded-xl cursor-pointer text-center"
              >
                Create Target
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add GPA Course Modal Overlay */}
      {showAddCourseModal && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl text-left space-y-4">
            <div>
              <h3 className="text-base font-black text-slate-850 dark:text-white">Track Grade Projections</h3>
              <p className="text-xs text-slate-450">Set current status parameters to project needed scores</p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">Class or Course Title</label>
                <input 
                  placeholder="e.g. Advanced Calculus, World History"
                  className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-850 p-2.5 rounded-xl text-xs text-slate-700 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#f26419]"
                  value={newCourseName}
                  onChange={(e) => setNewCourseName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">Credit Hours (Weight)</label>
                  <input 
                    type="number"
                    min="1"
                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-850 p-2.5 rounded-xl text-xs text-slate-700 dark:text-slate-100 focus:outline-none focus:border-[#f26419]"
                    value={newCourseCredits}
                    onChange={(e) => setNewCourseCredits(parseInt(e.target.value))}
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">Desire Grade goal (%)</label>
                  <input 
                    type="number"
                    max="100"
                    min="1"
                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-850 p-2.5 rounded-xl text-xs text-slate-700 dark:text-slate-100 focus:outline-none focus:border-[#f26419]"
                    value={newCourseTarget}
                    onChange={(e) => setNewCourseTarget(parseInt(e.target.value))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">Current average (%)</label>
                  <input 
                    type="number"
                    max="100"
                    min="1"
                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-850 p-2.5 rounded-xl text-xs text-slate-700 dark:text-slate-100 focus:outline-none focus:border-[#f26419]"
                    value={newCourseCurrent}
                    onChange={(e) => setNewCourseCurrent(parseInt(e.target.value))}
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">Remaining Weight Left (%)</label>
                  <input 
                    type="number"
                    max="100"
                    min="1"
                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-850 p-2.5 rounded-xl text-xs text-slate-700 dark:text-slate-100 focus:outline-none focus:border-[#f26419]"
                    value={newCourseRemaining}
                    onChange={(e) => setNewCourseRemaining(parseInt(e.target.value))}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowAddCourseModal(false)}
                className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs px-4 py-2.5 rounded-xl text-slate-500 dark:hover:text-slate-200 cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCourse}
                className="bg-[#f26419] hover:bg-orange-600 text-white text-xs font-black px-5 py-2.5 rounded-xl cursor-pointer text-center"
              >
                Enrol Course
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Custom Habit Modal Overlay */}
      {showAddHabitModal && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl text-left space-y-4">
            <div>
              <h3 className="text-base font-black text-slate-850 dark:text-white">Create Daily Habit Ritual</h3>
              <p className="text-xs text-slate-400">Build automatic cognitive momentum through consistent repetition</p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">Habit Title</label>
                <input 
                  placeholder="e.g. 1 Pomodoro Deep Flow, Revise Flashcards..."
                  className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl text-xs text-slate-700 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#f26419]"
                  value={newHabitTitle}
                  onChange={(e) => setNewHabitTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCreateHabit();
                    }
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">Category</label>
                  <select
                    value={newHabitCategory}
                    onChange={(e) => setNewHabitCategory(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl text-xs text-slate-700 dark:text-slate-100 focus:outline-none focus:border-[#f26419]"
                  >
                    <option value="study">⚡ Study Focus</option>
                    <option value="review">🧠 Active Recall</option>
                    <option value="discipline">📝 Discipline</option>
                    <option value="health">💧 Health & Rest</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">Target Days/Week</label>
                  <select
                    value={newHabitTargetDays}
                    onChange={(e) => setNewHabitTargetDays(parseInt(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl text-xs text-slate-700 dark:text-slate-100 focus:outline-none focus:border-[#f26419]"
                  >
                    <option value={7}>7 Days (Every Day)</option>
                    <option value={6}>6 Days (With 1 Rest)</option>
                    <option value={5}>5 Days (Weekdays)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">Icon Badge</label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {["⚡", "🧠", "📖", "📐", "📝", "💧", "🎯", "🔬", "🧘", "🏆"].map(ic => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setNewHabitIcon(ic)}
                      className={`w-9 h-9 rounded-xl text-base flex items-center justify-center transition-all cursor-pointer ${
                        newHabitIcon === ic
                          ? "bg-[#f26419] text-white scale-110 shadow-xs"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:scale-105"
                      }`}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowAddHabitModal(false)}
                className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs px-4 py-2.5 rounded-xl text-slate-500 dark:hover:text-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateHabit}
                disabled={!newHabitTitle.trim()}
                className="bg-[#f26419] hover:bg-orange-600 disabled:opacity-40 text-white text-xs font-black px-5 py-2.5 rounded-xl cursor-pointer"
              >
                Create Habit (+20 XP)
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
