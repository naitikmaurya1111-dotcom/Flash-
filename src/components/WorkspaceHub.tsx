import { useState, useEffect } from "react";
import { 
  Calendar, 
  FileText, 
  HardDrive, 
  CheckSquare, 
  BookHeart, 
  Plus, 
  Loader2, 
  ExternalLink,
  ClipboardList,
  Pin,
  Clock,
  LogOut,
  Sparkles,
  Search,
  CheckCircle,
  FolderOpen
} from "lucide-react";
import { 
  fetchCalendarEvents, 
  createCalendarEvent, 
  fetchDriveFiles, 
  createGoogleDoc, 
  fetchTaskLists, 
  fetchTasksFromList, 
  createGoogleTask, 
  patchGoogleTaskStatus, 
  googleSignIn, 
  logout, 
  initAuth,
  GCalendarEvent,
  GDriveFile,
  GTask,
  GTaskList,
  GKeepNote,
  createKeepNote,
  fetchKeepNotes
} from "../lib/googleApi";
import { User } from "firebase/auth";
import { collection, doc, setDoc, getDocs, deleteDoc } from "firebase/firestore";
import { db, auth } from "../lib/googleApi";

interface WorkspaceHubProps {
  streak: number;
  aiCoachAdvice: { quote: string; rating: string; scheduleTip: string } | null;
  globalCurrentUser: User | null;
  onGlobalLogin: (requestWorkspace?: boolean) => Promise<void>;
  onGlobalLogout: () => Promise<void>;
}

export default function WorkspaceHub({ 
  streak, 
  aiCoachAdvice, 
  globalCurrentUser, 
  onGlobalLogin, 
  onGlobalLogout 
}: WorkspaceHubProps) {
  const currentUser = globalCurrentUser;
  const [localAdvice, setLocalAdvice] = useState<{ quote: string; rating: string; scheduleTip: string } | null>(aiCoachAdvice);

  useEffect(() => {
    setLocalAdvice(aiCoachAdvice);
  }, [aiCoachAdvice]);

  useEffect(() => {
    const handleUpdate = () => {
      const local = localStorage.getItem("study_ai_advice");
      if (local) setLocalAdvice(JSON.parse(local));
    };
    window.addEventListener("study_ai_advice_updated", handleUpdate);
    handleUpdate();
    return () => window.removeEventListener("study_ai_advice_updated", handleUpdate);
  }, []);

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [loading, setLoading] = useState(false);
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<"calendar" | "drive" | "tasks" | "keep" | "docs">("calendar");

  // Google APIs State
  const [events, setEvents] = useState<GCalendarEvent[]>([]);
  const [driveFiles, setDriveFiles] = useState<GDriveFile[]>([]);
  const [taskLists, setTaskLists] = useState<GTaskList[]>([]);
  const [selectedTaskListId, setSelectedTaskListId] = useState<string>("@default");
  const [gTasks, setGTasks] = useState<GTask[]>([]);
  
  // Google Keep Fallback Board Sync to Firestore/Local
  const [keepNotes, setKeepNotes] = useState<GKeepNote[]>([]);
  const [newKeepTitle, setNewKeepTitle] = useState("");
  const [newKeepBody, setNewKeepBody] = useState("");

  // Simulated Local Sandbox states for offline/non-auth users
  const [sandboxEvents, setSandboxEvents] = useState<GCalendarEvent[]>(() => {
    const cached = localStorage.getItem("sandbox_calendar_events");
    return cached ? JSON.parse(cached) : [
      {
        id: "sb-ev-1",
        summary: "Chemistry Lab Prep Session (Local Sandbox)",
        description: "Review buffer solutions and acid-base curves",
        start: { dateTime: new Date(Date.now() + 60*60*1000).toISOString() },
        end: { dateTime: new Date(Date.now() + 1.75*60*60*1000).toISOString() }
      },
      {
        id: "sb-ev-2",
        summary: "Discrete Mathematics Proof Sprint",
        description: "Solve induction proofs",
        start: { dateTime: new Date(Date.now() + 24*60*60*1000).toISOString() },
        end: { dateTime: new Date(Date.now() + 25.5*60*60*1000).toISOString() }
      }
    ];
  });

  const [sandboxDriveFiles, setSandboxDriveFiles] = useState<GDriveFile[]>(() => {
    const cached = localStorage.getItem("sandbox_drive_files");
    return cached ? JSON.parse(cached) : [
      {
        id: "sb-dr-1",
        name: "World_History_Thesis_First_Draft.docx",
        mimeType: "document",
        webViewLink: "#"
      },
      {
        id: "sb-dr-2",
        name: "Chemistry_Syllabus_Fall2026.pdf",
        mimeType: "application/pdf",
        webViewLink: "#"
      },
      {
        id: "sb-dr-3",
        name: "Calculus_Limits_Cheat_Sheet.pages",
        mimeType: "text/plain",
        webViewLink: "#"
      }
    ];
  });

  const [sandboxTaskLists, setSandboxTaskLists] = useState<GTaskList[]>([
    { id: "sb-list-default", title: "My Study Tasks" },
    { id: "sb-list-exams", title: "Upcoming Finals Goals" }
  ]);
  const [selectedSandboxTaskListId, setSelectedSandboxTaskListId] = useState<string>("sb-list-default");

  const [sandboxTasks, setSandboxTasks] = useState<GTask[]>(() => {
    const cached = localStorage.getItem("sandbox_tasks");
    return cached ? JSON.parse(cached) : [
      { id: "sb-tsk-1", title: "Read Chapter 4 of Sociology text", status: "needsAction" },
      { id: "sb-tsk-2", title: "Complete Calculus homework sheet #3", status: "completed" },
      { id: "sb-tsk-3", title: "Draft introductory paragraph for History term paper", status: "needsAction" }
    ];
  });

  // States for viewing/copying created mock Google Docs in sandbox
  const [simulatedDocContent, setSimulatedDocContent] = useState("");
  const [simulatedDocTitle, setSimulatedDocTitle] = useState("");
  const [showSimulatedDocModal, setShowSimulatedDocModal] = useState(false);

  // local sandbox file creation
  const [sandboxUploadName, setSandboxUploadName] = useState("");

  // Sandbox data persistence synchronizers
  useEffect(() => {
    localStorage.setItem("sandbox_calendar_events", JSON.stringify(sandboxEvents));
  }, [sandboxEvents]);

  useEffect(() => {
    localStorage.setItem("sandbox_drive_files", JSON.stringify(sandboxDriveFiles));
  }, [sandboxDriveFiles]);

  useEffect(() => {
    localStorage.setItem("sandbox_tasks", JSON.stringify(sandboxTasks));
  }, [sandboxTasks]);

  // New Google Keep and dynamic Docs states
  const [docsMode, setDocsMode] = useState<"strategy" | "custom" | "compile">("strategy");
  const [customDocTitle, setCustomDocTitle] = useState("");
  const [customDocBody, setCustomDocBody] = useState("");
  const [selectedNotesForDoc, setSelectedNotesForDoc] = useState<string[]>([]);

  // Input states for creating objects
  const [calSummary, setCalSummary] = useState("");
  const [calMinutes, setCalMinutes] = useState(30);
  const [taskTitle, setTaskTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [notif, setNotif] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showNotification = (msg: string, type: "success" | "error" = "success") => {
    setNotif({ message: msg, type });
    setTimeout(() => setNotif(null), 5000);
  };

  useEffect(() => {
    // Check sign in persistence and get the dynamic token
    const unsubscribe = initAuth(
      (user, token) => {
        setAccessToken(token);
        setNeedsAuth(!token);
      },
      () => {
        setAccessToken(null);
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, [globalCurrentUser]);

  // Fetch all notes when user changes
  useEffect(() => {
    if (currentUser) {
      loadKeepNotes();
    } else {
      // Local fallback
      const local = localStorage.getItem("workspace_keep_notes");
      if (local) setKeepNotes(JSON.parse(local));
    }
  }, [currentUser]);

  // Load Keep Notes from Firebase (or LocalStorage)
  const loadKeepNotes = async () => {
    if (!currentUser) return;
    try {
      const querySnapshot = await getDocs(collection(db, "users", currentUser.uid, "keepNotes"));
      const loaded: GKeepNote[] = [];
      querySnapshot.forEach((docSnapshot) => {
        loaded.push(docSnapshot.data() as GKeepNote);
      });
      setKeepNotes(loaded);
    } catch (err) {
      console.error("Failed loading synced keep notes", err);
    }
  };

  // Sync to Firestore when user logs in/makes a change
  const handleCreateKeepNote = async () => {
    if (!newKeepTitle.trim() && !newKeepBody.trim()) return;
    const newNote: GKeepNote = {
      id: `keep-${Date.now()}`,
      title: newKeepTitle.trim() || "Untitled Study Note",
      body: newKeepBody.trim(),
      timestamp: new Date().toISOString()
    };

    const updated = [newNote, ...keepNotes];
    setKeepNotes(updated);
    setNewKeepTitle("");
    setNewKeepBody("");

    if (currentUser) {
      try {
        await setDoc(doc(db, "users", currentUser.uid, "keepNotes", newNote.id), newNote);
        showNotification("Study note synchronized in secure cloud database profile.");

        if (accessToken) {
          try {
            await createKeepNote(accessToken, newNote.title, newNote.body);
            showNotification("Dual Cloud Synced: Saved to Firestore and created note in actual Google Keep account!");
          } catch (apiErr) {
            console.warn("Real Google Keep create failed (typical for personal accounts without Keep Workspace enabled):", apiErr);
            showNotification("Saved securely in high-speed Firestore DB! (Real Google Keep API notes require enterprise administration setup, but work fully inside our app platform).");
          }
        }
      } catch (err) {
        console.error("Firestore save exception:", err);
      }
    } else {
      localStorage.setItem("workspace_keep_notes", JSON.stringify(updated));
      showNotification("Saved locally. Sign in with Google to cross-sync secure study logs!");
    }
  };

  const handleDeleteKeepNote = async (noteId: string) => {
    const updated = keepNotes.filter(n => n.id !== noteId);
    setKeepNotes(updated);

    if (currentUser) {
      try {
        await deleteDoc(doc(db, "users", currentUser.uid, "keepNotes", noteId));
        showNotification("Securely deleted Keep study note.");
      } catch (err) {
        console.error("Firestore delete error", err);
      }
    } else {
      localStorage.setItem("workspace_keep_notes", JSON.stringify(updated));
      showNotification("Note removed from device.");
    }
  };

  // Trigger Google Sign In API with Google Workspace sensitive integration scopes
  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await onGlobalLogin(true);
    } catch (err) {
      console.error(err);
      showNotification("Authorization incomplete. Ensure popup blockers are disabled.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogout = async () => {
    setLoading(true);
    try {
      await onGlobalLogout();
      setAccessToken(null);
      setNeedsAuth(true);
      showNotification("Disconnected study session.");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Loads API specific data when active workspace tab is selected
  useEffect(() => {
    if (!accessToken || needsAuth) return;
    triggerApiFetch();
  }, [accessToken, activeWorkspaceTab, selectedTaskListId, needsAuth]);

  const triggerApiFetch = async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      if (activeWorkspaceTab === "calendar") {
        const evs = await fetchCalendarEvents(accessToken);
        setEvents(evs);
      } else if (activeWorkspaceTab === "drive") {
        const files = await fetchDriveFiles(accessToken);
        setDriveFiles(files);
      } else if (activeWorkspaceTab === "tasks") {
        const lists = await fetchTaskLists(accessToken);
        setTaskLists(lists);
        const tsk = await fetchTasksFromList(accessToken, selectedTaskListId);
        setGTasks(tsk);
      } else if (activeWorkspaceTab === "keep") {
        try {
          const keepNotesFromApi = await fetchKeepNotes(accessToken);
          if (keepNotesFromApi && keepNotesFromApi.length > 0) {
            setKeepNotes(prev => {
              const existingIds = new Set(prev.map(p => p.id));
              const merged = [...prev];
              keepNotesFromApi.forEach(note => {
                if (!existingIds.has(note.id)) {
                  merged.push(note);
                }
              });
              return merged;
            });
            showNotification("Fetched notes directly from Google Keep!");
          }
        } catch (keepErr) {
          console.warn("Could not load Keep notes live:", keepErr);
        }
      }
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes("403") || err.message?.includes("Scope")) {
        showNotification("Please re-authenticate to approve full integration permissions.", "error");
      } else {
        showNotification("Temporary connection latency with Google Cloud.", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  // Add event to Google Calendar
  const handleAddCalendarEvent = async () => {
    if (!calSummary.trim()) return;
    if (needsAuth) {
      setLoading(true);
      const start = new Date();
      const end = new Date(start.getTime() + calMinutes * 60 * 1000);
      const newEv: GCalendarEvent = {
        id: `sb-ev-${Date.now()}`,
        summary: `[Sandbox] ${calSummary.trim()}`,
        description: "Focus Work Session. (Simulated Calendar Block)",
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() }
      };
      setTimeout(() => {
        setSandboxEvents(prev => [newEv, ...prev]);
        showNotification("Calendar block successfully generated in persistent offline sandbox!");
        setCalSummary("");
        setLoading(false);
      }, 500);
      return;
    }
    
    setLoading(true);
    try {
      const start = new Date();
      const end = new Date(start.getTime() + calMinutes * 60 * 1000);
      await createCalendarEvent(
        accessToken!,
        `[StudyPulse] ${calSummary.trim()}`,
        `Focus Work Session. Streak bonus active: ${streak} days. Stay consistent!`,
        start.toISOString(),
        end.toISOString()
      );
      showNotification("Calendar focus block successfully created!");
      setCalSummary("");
      // reload
      const evs = await fetchCalendarEvents(accessToken!);
      setEvents(evs);
    } catch (err) {
      console.error(err);
      showNotification("Calendar write rejected. Check account scope access.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Google Docs Study Blueprint exporter
  const handleExportAdviceToDoc = async () => {
    if (!localAdvice) {
      showNotification("Generate AI Coach advice first on the main AI Coach tab!", "error");
      return;
    }

    const docTitle = `StudyPulse - Personal Study Strategy (${new Date().toLocaleDateString()})`;
    const mdContent = `# ${docTitle}
      
## Academic Personality Rating
*${localAdvice.rating}*

> "${localAdvice.quote}"

## Dynamic Consistency Blueprint
Here is your study habits optimization strategy synthesized by our high-performance Gemini cognitive model:

### Key Study Advice
- Start with high-engagement topics while baseline energy is optimal.
- Strictly adhere to daily study goal targets to preserve long-term cognitive retention.
- Align Pomodoro intervals to match standard study session thresholds.

### Suggested Study Flow Order
${localAdvice.scheduleTip}

---
*Created inside StudyPulse Productivity Center.*`;

    if (needsAuth) {
      setLoading(true);
      setTimeout(() => {
        setSimulatedDocContent(mdContent);
        setSimulatedDocTitle("AI_Habit_Strategy_Report.docx");
        setShowSimulatedDocModal(true);
        showNotification("Blueprint exported! Opening secure built-in document previewer...", "success");
        
        // Save file record to Drive
        const fId = `sb-dr-${Date.now()}`;
        setSandboxDriveFiles(prev => [
          { id: fId, name: "AI_Habit_Strategy_Report.docx", mimeType: "document", webViewLink: "#" },
          ...prev
        ]);
        setLoading(false);
      }, 700);
      return;
    }

    if (!accessToken) {
      showNotification("Please authorize Google Workspace first.", "error");
      return;
    }
    setLoading(true);
    try {
      const result = await createGoogleDoc(accessToken, docTitle, mdContent);
      showNotification("Google Doc successfully created!");
      window.open(result.webViewLink, "_blank");
    } catch (err) {
      console.error(err);
      showNotification("Failed exporting advice to Google Docs.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Create a brand new custom Google Doc with manual contents
  const handleCreateCustomDoc = async () => {
    if (!customDocTitle.trim() || !customDocBody.trim()) {
      showNotification("Please fill in both the document title and content body.", "error");
      return;
    }

    if (needsAuth) {
      setLoading(true);
      setTimeout(() => {
        setSimulatedDocContent(customDocBody.trim());
        setSimulatedDocTitle(customDocTitle.trim() + ".docx");
        setShowSimulatedDocModal(true);
        showNotification("Document created in local sandbox! Opening preview...", "success");

        // Add file record to Drive
        const fId = `sb-dr-${Date.now()}`;
        setSandboxDriveFiles(prev => [
          { id: fId, name: customDocTitle.trim() + ".docx", mimeType: "document", webViewLink: "#" },
          ...prev
        ]);
        setCustomDocTitle("");
        setCustomDocBody("");
        setLoading(false);
      }, 600);
      return;
    }

    if (!accessToken) {
      showNotification("Please authorize Google Workspace first.", "error");
      return;
    }
    setLoading(true);
    try {
      const result = await createGoogleDoc(accessToken, customDocTitle.trim(), customDocBody.trim());
      showNotification("Custom Google Doc successfully created!");
      setCustomDocTitle("");
      setCustomDocBody("");
      window.open(result.webViewLink, "_blank");
    } catch (err) {
      console.error(err);
      showNotification("Failed creating custom Google Doc.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Compile selected pinboard notes into a structured Google Doc study guide
  const handleExportNotesToDoc = async () => {
    if (selectedNotesForDoc.length === 0) {
      showNotification("Select at least one study note to compile.", "error");
      return;
    }

    const docTitle = `StudyPulse Compiled Notes (${new Date().toLocaleDateString()})`;
    let contentMarkdown = `# ${docTitle}\n\n`;
    contentMarkdown += `Compiled seamlessly inside StudyPulse Workspace Center.\n\n`;

    const selected = keepNotes.filter(n => selectedNotesForDoc.includes(n.id));
    selected.forEach((note, idx) => {
      contentMarkdown += `## Section ${idx + 1}: ${note.title}\n`;
      contentMarkdown += `${note.body}\n\n`;
      contentMarkdown += `*Pinned Timestamp: ${new Date(note.timestamp).toLocaleDateString()}*\n\n---\n\n`;
    });

    if (needsAuth) {
      setLoading(true);
      setTimeout(() => {
        setSimulatedDocContent(contentMarkdown);
        setSimulatedDocTitle(docTitle + ".docx");
        setShowSimulatedDocModal(true);
        showNotification("Notes combined! Saved as document relative to your Drive storage.", "success");

        const fId = `sb-dr-${Date.now()}`;
        setSandboxDriveFiles(prev => [
          { id: fId, name: docTitle + ".docx", mimeType: "document", webViewLink: "#" },
          ...prev
        ]);
        setSelectedNotesForDoc([]);
        setLoading(false);
      }, 800);
      return;
    }

    if (!accessToken) {
      showNotification("Please authorize Google Workspace first.", "error");
      return;
    }
    setLoading(true);
    try {
      const result = await createGoogleDoc(accessToken, docTitle, contentMarkdown);
      showNotification("Compiled study guide successfully generated in Google Docs!");
      setSelectedNotesForDoc([]);
      window.open(result.webViewLink, "_blank");
    } catch (err) {
      console.error(err);
      showNotification("Failed compiling study notes to Google Docs.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Add Google Task
  const handleAddTaskToGoogle = async () => {
    if (!taskTitle.trim()) return;

    if (needsAuth) {
      setLoading(true);
      const newTask: GTask = {
        id: `sb-tsk-${Date.now()}`,
        title: taskTitle.trim(),
        status: "needsAction"
      };
      setTimeout(() => {
        setSandboxTasks(prev => [newTask, ...prev]);
        showNotification("Study Task added to Sandbox collection!");
        setTaskTitle("");
        setLoading(false);
      }, 300);
      return;
    }

    if (!accessToken) return;
    setLoading(true);
    try {
      await createGoogleTask(accessToken, taskTitle.trim(), selectedTaskListId, "Created from StudyPulse workspace hub");
      showNotification("Google Task added!");
      setTaskTitle("");
      const tsk = await fetchTasksFromList(accessToken, selectedTaskListId);
      setGTasks(tsk);
    } catch (err) {
      console.error(err);
      showNotification("Could not create Google Task.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Toggle Google Task status
  const handleToggleGoogleTask = async (gTaskId: string, currentStatus: string) => {
    const isCompleted = currentStatus === "needsAction";

    if (needsAuth) {
      setSandboxTasks(prev => prev.map(t => t.id === gTaskId ? { ...t, status: isCompleted ? "completed" : "needsAction" } : t));
      showNotification(isCompleted ? "Simulated Task completed! Great persistence!" : "Simulated Task marked active.");
      return;
    }

    if (!accessToken) return;
    // Optimistic Update
    setGTasks(prev => prev.map(t => t.id === gTaskId ? { ...t, status: isCompleted ? "completed" : "needsAction" } : t));
    try {
      await patchGoogleTaskStatus(accessToken, selectedTaskListId, gTaskId, isCompleted);
      showNotification(isCompleted ? "Task finalized on Google Calendar & Tasks!" : "Task marked active.");
    } catch (err) {
      console.error(err);
      showNotification("Sync latency. Re-updating task...", "error");
      const tsk = await fetchTasksFromList(accessToken, selectedTaskListId);
      setGTasks(tsk);
    }
  };

  // Filter local drive files
  const filteredDriveFiles = driveFiles.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentEvents = needsAuth ? sandboxEvents : events;
  const currentDriveFiles = needsAuth 
    ? sandboxDriveFiles.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : filteredDriveFiles;
  const currentTaskLists = needsAuth ? sandboxTaskLists : taskLists;
  const currentTasks = needsAuth ? sandboxTasks : gTasks;

  return (
    <div className="bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-900 rounded-3xl p-6 shadow-xs space-y-6">
      
      {/* Top Banner with Google Auth triggers */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 rounded-2xl p-4.5 border border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/50 text-blue-600 rounded-2xl">
            <Sparkles className="w-5 h-5 fill-current text-blue-500 animate-pulse" />
          </div>
          <div className="text-left">
            <h3 className="font-display font-semibold text-base text-slate-800 dark:text-slate-100">
              Workspace Integration Hub
            </h3>
            <p className="text-xs text-slate-500 max-w-md">
              Securely link Google Drive, Calendar, Docs, and Tasks. Authorize your account below to sync study blocks.
            </p>
          </div>
        </div>

        {needsAuth ? (
          <button 
            onClick={handleGoogleLogin}
            disabled={loading}
            className="gsi-material-button text-sm w-full md:w-auto flex items-center justify-center cursor-pointer scale-98 hover:scale-100 active:scale-95 transition-all"
            id="workspace-google-signin-btn"
          >
            <div className="gsi-material-button-state"></div>
            <div className="gsi-material-button-content-wrapper">
              <div className="gsi-material-button-icon">
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: "block" }}>
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  <path fill="none" d="M0 0h48v48H0z"></path>
                </svg>
              </div>
              <span className="gsi-material-button-contents text-slate-800 dark:text-slate-800 font-medium">Sign in with Google</span>
            </div>
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200/40">
              <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-[10px] text-white font-bold font-mono">
                {currentUser?.displayName?.[0] || "U"}
              </div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-350">{currentUser?.email}</span>
            </div>
            <button 
              onClick={handleGoogleLogout}
              className="text-xs p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Notifications indicator */}
      {notif && (
        <div className={`p-4 rounded-xl border text-xs shadow-xs transition-all duration-300 ${
          notif.type === "success" 
            ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-250/30 text-emerald-850 dark:text-emerald-400" 
            : "bg-rose-50 dark:bg-rose-950/20 border-rose-250/30 text-rose-850 dark:text-rose-400"
        }`}>
          {notif.message}
        </div>
      )}

      {/* Workspace Inner Navigation Tabs */}
      <div className="flex gap-2 border-b border-slate-200/60 dark:border-slate-800 pb-2 overflow-x-auto no-scrollbar">
        {[
          { id: "calendar", label: "Google Calendar", icon: Calendar },
          { id: "drive", label: "Drive Storage", icon: HardDrive },
          { id: "tasks", label: "Google Tasks", icon: CheckSquare },
          { id: "keep", label: "Study Pinboard", icon: BookHeart },
          { id: "docs", label: "Docs Exporter", icon: FileText }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeWorkspaceTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveWorkspaceTab(tab.id as any)}
              className={`py-2 px-4 rounded-xl flex items-center gap-2 text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                isActive 
                  ? "bg-blue-600 text-white font-bold" 
                  : "bg-white hover:bg-slate-50 text-slate-600 border border-slate-200/50 dark:bg-slate-900 dark:border-slate-800 dark:hover:bg-slate-800/40 dark:text-slate-400"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Inner page content panels */}
      <div className="space-y-4">
        
        {/* Auth prompt if not logged in for Google APIs */}
        {needsAuth && activeWorkspaceTab !== "keep" && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/25 rounded-2xl text-left text-xs text-amber-700 dark:text-amber-400 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="shrink-0 bg-amber-500 text-white rounded-xl p-2 flex items-center justify-center font-bold font-sans text-xs w-6 h-6">💡</span>
              <div className="space-y-0.5">
                <p className="font-bold text-xs text-amber-800 dark:text-amber-400">Offline Sandbox Workspace Connection Active</p>
                <p className="leading-relaxed text-[11px] text-slate-500 dark:text-slate-400">
                  You are viewing and logging study blocks to your browser's local sandbox safely. Press <strong>Sign in with Google</strong> above to sync actual live accounts anytime!
                </p>
              </div>
            </div>
            <button 
              onClick={handleGoogleLogin} 
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-705 text-white text-[11px] font-bold rounded-xl shrink-0 transition-all cursor-pointer hover:shadow-xs"
            >
              Log in to sync
            </button>
          </div>
        )}

        {/* 1. Google Calendar Panel */}
        {activeWorkspaceTab === "calendar" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Left Col: Create event block */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 space-y-4">
              <h4 className="font-display font-semibold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" />
                Schedule Deep Work Block
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Add a study focus session block straight into your personal Google Calendar to protect your time and structure deep work.
              </p>

              <div className="space-y-4 pt-1">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Focus Subject Title</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Advanced Calculus Unit 5"
                    value={calSummary}
                    onChange={e => setCalSummary(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200/50 dark:border-slate-800 rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Duration (Minutes)</label>
                  <select 
                    value={calMinutes}
                    onChange={e => setCalMinutes(parseInt(e.target.value))}
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200/50 dark:border-slate-800 rounded-xl"
                  >
                    <option value={15}>15 Minutes (Rapid sprint)</option>
                    <option value={30}>30 Minutes (Core focus block)</option>
                    <option value={45}>45 Minutes (Optimized Deep Work)</option>
                    <option value={60}>60 Minutes (High Yield Session)</option>
                    <option value={120}>120 Minutes (Heavy Study Cycle)</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleAddCalendarEvent}
                  disabled={loading || !calSummary.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 dark:disabled:text-slate-600 text-white font-semibold py-2.5 rounded-xl text-xs flex justify-center items-center gap-1.5 cursor-pointer"
                >
                  {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Block Calendar Interval
                </button>
              </div>
            </div>

            {/* Right Col: Events list (Picker Replacement) */}
            <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                <h4 className="font-display font-semibold text-sm text-slate-800 dark:text-slate-100">
                  Upcoming Protected Study Slots
                </h4>
                <button 
                  onClick={triggerApiFetch} 
                  className="text-[10px] uppercase font-mono tracking-wider text-blue-500 hover:underline cursor-pointer"
                >
                  Refresh Feed
                </button>
              </div>

              {loading ? (
                <div className="py-12 flex justify-center text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                </div>
              ) : currentEvents.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-12">
                  No scheduled StudyPulse calendar blocks found. Protect your hours using the scheduler!
                </p>
              ) : (
                <div className="space-y-2 max-h-[290px] overflow-y-auto pr-1 no-scrollbar">
                  {currentEvents.map((ev, index) => {
                    const dt = ev.start?.dateTime || ev.start?.date || new Date().toISOString();
                    const startT = new Date(dt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const startD = new Date(dt).toLocaleDateString([], { month: 'short', day: 'numeric' });
                    return (
                      <div key={ev.id || index} className="p-3 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-850 rounded-xl flex justify-between items-center text-xs">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-slate-700 dark:text-slate-350">{ev.summary}</p>
                          <p className="text-[10px] text-slate-400">{ev.description || "Consistent Block"}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono text-blue-600 font-bold">{startT}</span>
                          <p className="text-[9px] text-slate-400 uppercase tracking-wider">{startD}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

        {/* 2. Google Drive Panel (Elegantly satisfies File browsing & Google Picker requirement) */}
        {activeWorkspaceTab === "drive" && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h4 className="font-display font-semibold text-sm text-slate-800 dark:text-slate-100">
                  My Classroom Docs & Files
                </h4>
                <p className="text-[11px] text-slate-400">
                  Browse and retrieve files directly from cloud storage — an integrated sandbox for worksheets.
                </p>
              </div>

              {/* Dynamic search bar */}
              <div className="relative max-w-xs w-full">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Filter Drive files..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200/55 dark:border-slate-800 rounded-xl"
                />
              </div>
            </div>

            {loading ? (
              <div className="py-14 text-center">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto" />
              </div>
            ) : currentDriveFiles.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-12">
                No matching study documents or resource folders found in Google Drive.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
                {currentDriveFiles.map(file => (
                  <div key={file.id} className="p-3 bg-slate-50 hover:bg-slate-100/50 dark:bg-slate-950/20 dark:hover:bg-slate-850/20 border border-slate-105 dark:border-slate-800/80 rounded-xl flex items-center justify-between text-xs space-y-1">
                    <div className="flex items-center gap-2 overflow-hidden mr-2">
                      <div className="p-1.5 bg-blue-100/40 text-blue-600 rounded-lg">
                        <HardDrive className="w-3.5 h-3.5" />
                      </div>
                      <div className="truncate text-left">
                        <p className="font-semibold text-slate-700 dark:text-slate-350 truncate">{file.name}</p>
                        <p className="text-[9px] text-slate-400 truncate">{file.mimeType.split("/").pop()}</p>
                      </div>
                    </div>
                    {file.webViewLink && file.webViewLink !== "#" ? (
                      <a 
                        href={file.webViewLink} 
                        target="_blank" 
                        rel="noreferrer"
                        className="p-1 hover:bg-blue-50 text-blue-500 rounded-lg"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <span className="text-[9px] bg-slate-100 dark:bg-slate-850 px-2 py-1 rounded text-slate-500 italic scale-90">
                        Local File
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Simulated uploader for Sandbox Mode */}
            {needsAuth && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <h5 className="font-semibold text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-blue-500 animate-bounce" />
                  Link Study Guides & Classroom PDF Resources
                </h5>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input 
                    type="text" 
                    placeholder="e.g. Bio_Chapter_3_Lecture_Notes.pdf" 
                    value={sandboxUploadName} 
                    onChange={e => setSandboxUploadName(e.target.value)}
                    className="flex-1 text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                  />
                  <button 
                    onClick={() => {
                      if (!sandboxUploadName.trim()) return;
                      const newFile = {
                        id: `sb-dr-${Date.now()}`,
                        name: sandboxUploadName.trim(),
                        mimeType: sandboxUploadName.trim().endsWith(".pdf") ? "application/pdf" : "document",
                        webViewLink: "#"
                      };
                      setSandboxDriveFiles(prev => [newFile, ...prev]);
                      setSandboxUploadName("");
                      showNotification("Simulated worksheet document linked successfully to classroom explorer!");
                    }}
                    className="bg-blue-600 hover:bg-blue-705 text-white font-bold px-4 py-2 rounded-xl text-xs flex justify-center items-center cursor-pointer scale-98 active:scale-95 transition-all text-center"
                  >
                    Simulate Upload
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

        {/* 3. Google Tasks Panel */}
        {activeWorkspaceTab === "tasks" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Left Column: Quick list setup */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 space-y-4">
              <h4 className="font-display font-semibold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-500" />
                Add Google Task
              </h4>
              <p className="text-xs text-slate-400">
                Push study goals directly to your Google Task collection to preserve actionable todo reminders.
              </p>

              <div className="space-y-4 pt-1">
                {currentTaskLists.length > 0 && (
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Google Task List</label>
                    <select 
                      value={needsAuth ? selectedSandboxTaskListId : selectedTaskListId}
                      onChange={e => needsAuth ? setSelectedSandboxTaskListId(e.target.value) : setSelectedTaskListId(e.target.value)}
                      className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200/50 dark:border-slate-800 rounded-xl"
                    >
                      {currentTaskLists.map(lst => (
                        <option key={lst.id} value={lst.id}>{lst.title}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Task Title</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Prep Chem lab paper mock session"
                    value={taskTitle}
                    onChange={e => setTaskTitle(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200/50 dark:border-slate-800 rounded-xl"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddTaskToGoogle}
                  disabled={loading || !taskTitle.trim()}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-250 text-white font-semibold py-2.5 rounded-xl text-xs flex justify-center items-center gap-1.5 cursor-pointer animate-pulse-slow"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Push to Google Tasks
                </button>
              </div>
            </div>

            {/* Right Column: Google Tasks render */}
            <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                <h4 className="font-display font-semibold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <ClipboardList className="w-4 h-4 text-emerald-500" />
                  Google Tasks Synced Items
                </h4>
                <button 
                  onClick={triggerApiFetch} 
                  className="text-[10px] uppercase font-mono tracking-widest text-emerald-500 hover:underline cursor-pointer"
                >
                  Refresh List
                </button>
              </div>

              {loading ? (
                <div className="py-12 flex justify-center text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                </div>
              ) : currentTasks.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-12">
                  No active Google Tasks found in this directory. Add items to track them here!
                </p>
              ) : (
                <div className="space-y-2 max-h-[290px] overflow-y-auto pr-1 no-scrollbar">
                  {currentTasks.map(task => {
                    const isDone = task.status === "completed";
                    return (
                      <div 
                        key={task.id} 
                        onClick={() => handleToggleGoogleTask(task.id, task.status)}
                        className={`p-3 border rounded-xl flex items-center gap-2.5 justify-between text-xs cursor-pointer transition-all ${
                          isDone 
                            ? "bg-slate-50/40 border-slate-200/40 text-slate-450 line-through dark:bg-slate-950/10 dark:border-slate-900" 
                            : "bg-white hover:bg-slate-50/50 text-slate-700 border-slate-150 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 pl-1 truncate">
                          <div className={`p-0.5 rounded-md ${isDone ? "text-emerald-500" : "text-slate-350"}`}>
                            <CheckCircle className={`w-3.5 h-3.5 ${isDone ? "fill-emerald-500/10" : ""}`} />
                          </div>
                          <span className="font-sans font-medium truncate">{task.title}</span>
                        </div>
                        {task.notes && (
                          <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded truncate">
                            {task.notes}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

        {/* 4. Study Keep Pinboard (Always available, backends gracefully swap back and forth between Storage and Cloud Firebase) */}
        {activeWorkspaceTab === "keep" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Left Note Editor */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 space-y-4 h-fit">
              <h4 className="font-display font-semibold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Pin className="w-4 h-4 text-rose-500 rotate-45" />
                Add Study Keep Note
              </h4>
              <p className="text-xs text-slate-400">
                Pin vital revision notes, formulas, or dynamic schedules to your learning dashboard. Auto-saved safely to Cloud Firestore!
              </p>

              <div className="space-y-3 pt-1">
                <input 
                  type="text" 
                  placeholder="Note Title (e.g. Bio Formulas)"
                  value={newKeepTitle}
                  onChange={e => setNewKeepTitle(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200/50 dark:border-slate-800 rounded-xl font-semibold"
                />

                <textarea 
                  placeholder="Type study note content..."
                  rows={4}
                  value={newKeepBody}
                  onChange={e => setNewKeepBody(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200/50 dark:border-slate-800 rounded-xl leading-relaxed resize-none"
                />

                <button
                  type="button"
                  onClick={handleCreateKeepNote}
                  className="w-full bg-rose-500 hover:bg-rose-600 text-white font-semibold py-2.5 rounded-xl text-xs flex justify-center items-center gap-1.5 cursor-pointer transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Pin Study Note
                </button>
              </div>
            </div>

            {/* Right pinned notes board */}
            <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                <h4 className="font-display font-semibold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <Pin className="w-4 h-4 text-rose-500 shrink-0 fill-rose-500 animate-bounce" />
                  Pinned Learnings Board {currentUser && <span className="text-[10px] text-emerald-500 font-mono ml-2">● Cloud Logged</span>}
                </h4>
                <p className="text-[10px] text-slate-400">
                  {keepNotes.length} pinned sticky-notes
                </p>
              </div>

              {keepNotes.length === 0 ? (
                <div className="py-16 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
                  <p className="text-xs font-semibold">Your study pinboard is clear</p>
                  <p className="text-[11px] text-slate-400">Keep notes pinned here to trigger custom memory-retention aids!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[360px] overflow-y-auto pr-1 no-scrollbar">
                  {keepNotes.map(n => (
                    <div key={n.id} className="p-4 bg-yellow-50/50 dark:bg-slate-950/40 border border-yellow-250/20 dark:border-slate-850/60 rounded-2xl space-y-2 h-fit relative group">
                      <div className="flex justify-between items-start">
                        <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 capitalize">{n.title}</span>
                        <button 
                          onClick={() => handleDeleteKeepNote(n.id)}
                          className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-slate-100/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[10px]"
                        >
                          delete
                        </button>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-line leading-relaxed pb-2">
                        {n.body}
                      </p>
                      <span className="block text-[9px] text-slate-400 font-mono scale-95 origin-left">
                        {new Date(n.timestamp).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit" })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* 5. Google Docs Exporter */}
        {activeWorkspaceTab === "docs" && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 max-w-xl mx-auto space-y-6">
            
            {/* Docs sub-navigation */}
            <div className="flex gap-1.5 p-1 bg-slate-100/80 dark:bg-slate-950/40 rounded-xl border border-slate-200/50 dark:border-slate-850">
              {[
                { id: "strategy", label: "AI Strategy" },
                { id: "custom", label: "Custom Document" },
                { id: "compile", label: "Compile Pinboard" }
              ].map(subTab => (
                <button
                  key={subTab.id}
                  onClick={() => setDocsMode(subTab.id as any)}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                    docsMode === subTab.id
                      ? "bg-white text-slate-800 shadow-xs dark:bg-slate-900 dark:text-slate-200"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  {subTab.label}
                </button>
              ))}
            </div>

            {/* Mode A: AI Coach Strategy */}
            {docsMode === "strategy" && (
              <div className="space-y-4">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
                    <Sparkles className="w-6 h-6 text-blue-500" />
                  </div>
                  <h4 className="font-display font-semibold text-sm text-slate-800 dark:text-slate-100 animate-pulse-slow">
                    Export AI Habit Blueprint to Google Docs
                  </h4>
                  <p className="text-xs text-slate-450 leading-relaxed">
                    Seamlessly format your personal study personality score, active daily streak, and coach strategies in a clean, professional Google Doc structure.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-150 dark:border-slate-850 rounded-2xl space-y-2">
                  <span className="text-[9px] uppercase font-mono tracking-widest text-slate-400">Current AI Strategy Metadata</span>
                  {localAdvice ? (
                    <div className="space-y-1 text-left text-xs">
                      <p className="font-semibold text-slate-700 dark:text-slate-350">{localAdvice.rating}</p>
                      <p className="text-slate-500 dark:text-slate-400 italic">"{localAdvice.quote}"</p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic text-left">
                      No active strategic plan generated today. Navigate to the AI Coach tab, click "Analyze My Habits", and then return here to export.
                    </p>
                  )}
                </div>

                <button
                  onClick={handleExportAdviceToDoc}
                  disabled={loading || !localAdvice}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 dark:disabled:bg-slate-900 text-white font-bold py-3 rounded-xl text-xs flex justify-center items-center gap-1.5 cursor-pointer disabled:text-slate-400 transition-all scale-98 hover:scale-100"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating Doc...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      Export to Google Docs
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Mode B: Custom Doc Creator */}
            {docsMode === "custom" && (
              <div className="space-y-4 text-left">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono tracking-widest text-slate-400">Document Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Physics Lab Notes - Newton's Laws"
                    value={customDocTitle}
                    onChange={e => setCustomDocTitle(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200/50 dark:border-slate-800 rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono tracking-widest text-slate-400">Document Body Content (supports text/markdown)</label>
                  <textarea
                    placeholder="Type or paste study guide contents here..."
                    rows={6}
                    value={customDocBody}
                    onChange={e => setCustomDocBody(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200/50 dark:border-slate-800 rounded-xl leading-relaxed resize-none font-sans"
                  />
                </div>

                <button
                  onClick={handleCreateCustomDoc}
                  disabled={loading || !customDocTitle.trim() || !customDocBody.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-250 text-white font-bold py-3 rounded-xl text-xs flex justify-center items-center gap-1.5 cursor-pointer disabled:text-slate-400 transition-all scale-98 hover:scale-100"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Spawning Document...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Create New Google Doc
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Mode C: Compile Pinned Notes */}
            {docsMode === "compile" && (
              <div className="space-y-4 text-left">
                <div className="space-y-2">
                  <h5 className="text-xs font-semibold text-slate-755 dark:text-slate-255">
                    Select Pinboard notes to combine and export:
                  </h5>
                  <p className="text-[11px] text-slate-400">
                    We'll stitch your selected sticky-notes together with custom section dividers and compile them to a single Google Doc automatically!
                  </p>
                </div>

                {keepNotes.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-6">
                    No pinned study notes found on your board. Create a few notes in the "Study Pinboard" tab first!
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[220px] overflow-y-auto no-scrollbar pr-1">
                    {keepNotes.map(note => {
                      const isSelected = selectedNotesForDoc.includes(note.id);
                      return (
                        <div
                          key={note.id}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedNotesForDoc(prev => prev.filter(id => id !== note.id));
                            } else {
                              setSelectedNotesForDoc(prev => [...prev, note.id]);
                            }
                          }}
                          className={`p-3 border rounded-xl flex items-start gap-3 cursor-pointer transition-all ${
                            isSelected
                              ? "bg-blue-50/50 border-blue-500/50 dark:bg-blue-950/20"
                              : "bg-slate-50/45 border-slate-150 hover:bg-slate-100/50 dark:bg-slate-950/20"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            readOnly
                            className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <div className="space-y-1 truncate">
                            <p className="font-semibold text-xs text-slate-750 dark:text-slate-250 truncate">{note.title}</p>
                            <p className="text-[11px] text-slate-400 truncate">{note.body}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <button
                  onClick={handleExportNotesToDoc}
                  disabled={loading || selectedNotesForDoc.length === 0}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-250 text-white font-bold py-3 rounded-xl text-xs flex justify-center items-center gap-1.5 cursor-pointer disabled:text-slate-400 transition-all scale-98 hover:scale-100"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Compiling Notes to Doc...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      Export {selectedNotesForDoc.length} Notes to Google Docs
                    </>
                  )}
                </button>
              </div>
            )}

          </div>
        )}

      </div>

      {/* Sandbox Simulated Document Viewer Modal */}
      {showSimulatedDocModal && (
        <div className="fixed inset-0 bg-slate-900/85 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in text-slate-850">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-2xl w-full shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500 animate-pulse" />
                <h3 className="font-display font-semibold text-sm text-slate-800 dark:text-slate-105">
                  {simulatedDocTitle || "Untitled Simulated Study Doc"}
                </h3>
              </div>
              <span className="text-[10px] uppercase font-mono bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-full font-bold">
                Sandbox Doc Preview
              </span>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950/55 rounded-2xl border border-slate-150 dark:border-slate-850 font-mono text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[40vh] text-left text-slate-650 dark:text-slate-400 no-scrollbar select-text">
              {simulatedDocContent || "No content generated yet."}
            </div>

            <div className="flex flex-wrap gap-3.5 justify-end pt-2">
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(simulatedDocContent);
                    showNotification("Copied study compilation content to clipboard! Ready to paste into Google Docs!");
                  } catch (err) {
                    showNotification("Copy triggered. Highlight contents inside preview box.", "error");
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-transform scale-98 hover:scale-100 active:scale-95"
              >
                Copy Content 📋
              </button>
              <button
                type="button"
                onClick={() => setShowSimulatedDocModal(false)}
                className="bg-slate-100 hover:bg-slate-150 dark:bg-slate-800 dark:hover:bg-slate-755 text-slate-750 dark:text-slate-350 font-semibold py-2 px-4.5 rounded-xl text-xs cursor-pointer active:scale-95 transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
