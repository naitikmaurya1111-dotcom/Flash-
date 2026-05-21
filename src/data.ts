import { Subject, Classmate, StudyRoom } from "./types";

export const INITIAL_SUBJECTS: Subject[] = [
  { id: "cs", name: "Computer Science", color: "from-blue-500 to-indigo-600", icon: "Code", totalMinutes: 0, goalMinutes: 180 },
  { id: "math", name: "Advanced Mathematics", color: "from-emerald-500 to-teal-600", icon: "Calculator", totalMinutes: 0, goalMinutes: 90 },
  { id: "sci", name: "Organic Chemistry", color: "from-amber-500 to-orange-600", icon: "FlaskConical", totalMinutes: 0, goalMinutes: 60 },
  { id: "lang", name: "Spanish Language", color: "from-purple-500 to-pink-600", icon: "Globe", totalMinutes: 0, goalMinutes: 45 },
  { id: "lit", name: "World Literature", color: "from-rose-500 to-red-600", icon: "BookOpen", totalMinutes: 0, goalMinutes: 30 }
];

export const STUDY_ROOMS: StudyRoom[] = [
  { 
    id: "global-cafe", 
    name: "Global Tech Cafe ☕", 
    category: "Coding & Math", 
    description: "Focus on build logs, algorithms, and technical prep with students worldwide.",
    icon: "Coffee",
    currentUsersCount: 142
  },
  { 
    id: "stem-lab", 
    name: "STEM Olympiad Prep 🔬", 
    category: "Science", 
    description: "Intense studying for physics, chem, and math. Strict deep focus room.",
    icon: "FlaskConical",
    currentUsersCount: 88
  },
  { 
    id: "quiet-lib", 
    name: "Early Birds Virtual Library 📚", 
    category: "Silent Reading", 
    description: "Silent study room for high concentration. No distractions allowed.",
    icon: "Library",
    currentUsersCount: 204
  },
  { 
    id: "night-owls", 
    name: "Night Owls Study Den 🌙", 
    category: "All Subjects", 
    description: "Late-night grinders staying focused through midnight. Stay alert!",
    icon: "Moon",
    currentUsersCount: 115
  }
];

export const INITIAL_CLASSMATES: Classmate[] = [
  { id: "mate-1", name: "Jun-Woo Kim", avatarSeed: "bg-teal-500", isStudying: true, activeSubjectName: "Computer Science", studyDurationTodayMinutes: 245, activeSeconds: 1432 },
  { id: "mate-2", name: "Chloe Dupont", avatarSeed: "bg-pink-500", isStudying: true, activeSubjectName: "Spanish Language", studyDurationTodayMinutes: 110, activeSeconds: 432 },
  { id: "mate-3", name: "Aisha Rahman", avatarSeed: "bg-amber-500", isStudying: true, activeSubjectName: "Advanced Mathematics", studyDurationTodayMinutes: 310, activeSeconds: 2840 },
  { id: "mate-4", name: "Liam Miller", avatarSeed: "bg-indigo-500", isStudying: false, activeSubjectName: "Resting", studyDurationTodayMinutes: 180, activeSeconds: 0 },
  { id: "mate-5", name: "Sofia de Luca", avatarSeed: "bg-rose-500", isStudying: true, activeSubjectName: "Organic Chemistry", studyDurationTodayMinutes: 85, activeSeconds: 712 },
  { id: "mate-6", name: "Emma Smith", avatarSeed: "bg-purple-500", isStudying: false, activeSubjectName: "Resting", studyDurationTodayMinutes: 50, activeSeconds: 0 },
  { id: "mate-7", name: "Yuki Sato", avatarSeed: "bg-emerald-500", isStudying: true, activeSubjectName: "Computer Science", studyDurationTodayMinutes: 195, activeSeconds: 3120 }
];

// Helper to simulated classmate tick updates
export function simulateClassmateTicks(classmates: Classmate[]): Classmate[] {
  return classmates.map(mate => {
    if (!mate.isStudying) {
      // 10% chance to start studying
      if (Math.random() < 0.05) {
        const randomSubjects = ["Computer Science", "Advanced Mathematics", "Organic Chemistry", "Spanish Language", "World Literature"];
        const nextSubName = randomSubjects[Math.floor(Math.random() * randomSubjects.length)];
        return {
          ...mate,
          isStudying: true,
          activeSubjectName: nextSubName,
          activeSeconds: 1,
        };
      }
      return mate;
    } else {
      // Ticking studies: increment seconds
      let nextSecs = mate.activeSeconds + 1;
      let nextMins = mate.studyDurationTodayMinutes;

      if (nextSecs >= 60) {
        nextSecs = 0;
        nextMins += 1;
      }

      // 5% chance to go on break
      if (Math.random() < 0.01 && mate.activeSeconds > 300) {
        return {
          ...mate,
          isStudying: false,
          activeSubjectName: "Resting",
          activeSeconds: 0,
          studyDurationTodayMinutes: nextMins
        };
      }

      return {
        ...mate,
        activeSeconds: nextSecs,
        studyDurationTodayMinutes: nextMins
      };
    }
  });
}
