import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";
import { secureStorage } from "./crypto";

// Initialize Firebase App instance once
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
// @ts-ignore
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);
export const auth = getAuth(app);

// Configure Google OAuth provider with standard scopes only by default
// This guarantees that standard login is instantly verified with no "app hasn't been verified" screens.
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

// Token and SignIn states caches
let isSigningIn = false;
let cachedAccessToken: string | null = typeof window !== "undefined" ? secureStorage.getItem("google_oauth_access_token") : null;

// Initialize Google/Firebase auth listner
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  // If we already have a cached token, notify immediately
  if (auth.currentUser && cachedAccessToken) {
    if (onAuthSuccess) onAuthSuccess(auth.currentUser, cachedAccessToken);
  }

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      // Restore from secureStorage if null in memory
      if (!cachedAccessToken && typeof window !== "undefined") {
        cachedAccessToken = secureStorage.getItem("google_oauth_access_token");
      }
      
      // If there's an active token in cache, success
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        // Standard Firebase-only Google login is active (no Google API scopes token yet)
        if (onAuthSuccess) onAuthSuccess(user, "");
      }
    } else {
      cachedAccessToken = null;
      if (typeof window !== "undefined") {
        secureStorage.removeItem("google_oauth_access_token");
      }
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Google Sign In trigger
export const googleSignIn = async (requestWorkspaceScopes: boolean = false): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    
    // Create new provider instance to dynamically set scopes and avoid caching scopes globally across login streams
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    
    if (requestWorkspaceScopes) {
      provider.addScope("https://www.googleapis.com/auth/calendar");
      provider.addScope("https://www.googleapis.com/auth/documents");
      provider.addScope("https://www.googleapis.com/auth/drive");
      provider.addScope("https://www.googleapis.com/auth/tasks");
    }
    
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    
    let token = "";
    if (requestWorkspaceScopes) {
      if (!credential?.accessToken) {
        throw new Error("Failed to get Google OAuth access token for workspace integrations.");
      }
      token = credential.accessToken;
      cachedAccessToken = token;
      if (typeof window !== "undefined") {
        secureStorage.setItem("google_oauth_access_token", token);
      }
    } else {
      // Standard login - clear cached workspace credentials to force fresh connection on explicit integration click
      cachedAccessToken = null;
      if (typeof window !== "undefined") {
        secureStorage.removeItem("google_oauth_access_token");
      }
    }
    
    return { user: result.user, accessToken: token };
  } catch (error) {
    console.error("Popup Sign in failed:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
  if (typeof window !== "undefined") {
    secureStorage.removeItem("google_oauth_access_token");
  }
};

export const emailPasswordSignUp = async (email: string, password: string, displayName: string): Promise<User> => {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName) {
    await updateProfile(result.user, { displayName });
  }
  return result.user;
};

export const emailPasswordSignIn = async (email: string, password: string): Promise<User> => {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
};

export const resetUserPassword = async (email: string): Promise<void> => {
  await sendPasswordResetEmail(auth, email);
};

export const verifyUserEmail = async (): Promise<void> => {
  if (auth.currentUser) {
    await sendEmailVerification(auth.currentUser);
  }
};

// ==================== WORKSPACE API WRAPPERS ====================

// 1. Google Tasks wrappers
export interface GTaskList {
  id: string;
  title: string;
}

export interface GTask {
  id: string;
  title: string;
  status: "needsAction" | "completed";
  due?: string;
  notes?: string;
}

export const fetchTaskLists = async (token: string): Promise<GTaskList[]> => {
  const res = await fetch("https://tasks.googleapis.com/tasks/v1/users/@me/lists", {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Failed to load Google Task Lists");
  const data = await res.json();
  return data.items || [];
};

export const fetchTasksFromList = async (token: string, listId: string = "@default"): Promise<GTask[]> => {
  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Failed to fetch Google Tasks");
  const data = await res.json();
  return data.items || [];
};

export const createGoogleTask = async (
  token: string, 
  title: string, 
  listId: string = "@default",
  notes?: string
): Promise<GTask> => {
  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ title, notes })
  });
  if (!res.ok) throw new Error("Failed to create Google Task");
  return res.json();
};

export const patchGoogleTaskStatus = async (
  token: string,
  listId: string,
  taskId: string,
  isCompleted: boolean
): Promise<any> => {
  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks/${taskId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      status: isCompleted ? "completed" : "needsAction"
    })
  });
  if (!res.ok) throw new Error("Failed to update Google Task");
  return res.json();
};

// 2. Google Calendar wrappers
export interface GCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone?: string };
  end: { dateTime: string; timeZone?: string };
}

export const fetchCalendarEvents = async (token: string): Promise<GCalendarEvent[]> => {
  const nowStr = new Date().toISOString();
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${nowStr}&maxResults=15&singleEvents=true&orderBy=startTime`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Failed to load Google Calendar events");
  const data = await res.json();
  return data.items || [];
};

export const createCalendarEvent = async (
  token: string,
  summary: string,
  description: string,
  startIso: string,
  endIso: string
): Promise<GCalendarEvent> => {
  const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      summary,
      description,
      start: { dateTime: startIso, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
      end: { dateTime: endIso, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }
    })
  });
  if (!res.ok) throw new Error("Failed to write event to Google Calendar");
  return res.json();
};

// 3. Google Drive / Picker replacement wrappers
export interface GDriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  thumbnailLink?: string;
}

export const fetchDriveFiles = async (token: string, mimeTypes?: string[]): Promise<GDriveFile[]> => {
  let query = "trashed = false";
  if (mimeTypes && mimeTypes.length > 0) {
    const mimeQuery = mimeTypes.map(t => `mimeType = '${t}'`).join(" or ");
    query += ` and (${mimeQuery})`;
  }
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,webViewLink,thumbnailLink)&pageSize=30`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Failed to fetch Google Drive files");
  const data = await res.json();
  return data.files || [];
};

// 4. Google Docs wrappers
export const createGoogleDoc = async (
  token: string,
  title: string,
  contentMarkdown: string
): Promise<any> => {
  // First create an empty file in Drive with Docs mime type
  const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: title,
      mimeType: "application/vnd.google-apps.document"
    })
  });
  if (!createRes.ok) throw new Error("Failed to create Google Doc shell");
  const docFile = await createRes.json();
  const documentId = docFile.id;

  // Insert content into Google Doc
  // For simplicity, we write paragraph structures
  const lines = contentMarkdown.split("\n").filter(l => l.trim().length > 0);
  const requests = [];
  let indexCounter = 1; // Docs indexing starts at 1

  for (const line of lines) {
    const cleanLine = line.replace(/[#*`_-]/g, "").trim() + "\n";
    requests.push({
      insertText: {
        text: cleanLine,
        location: { index: indexCounter }
      }
    });
    // Add format style if header
    if (line.startsWith("#")) {
      requests.push({
        updateParagraphStyle: {
          paragraphStyle: { namedStyleType: "HEADING_1" },
          fields: "namedStyleType",
          range: { startIndex: indexCounter, endIndex: indexCounter + cleanLine.length }
        }
      });
    } else if (line.startsWith("-") || line.startsWith("*")) {
      requests.push({
        createParagraphBullets: {
          bulletPreset: "BULLET_DISC_CIRCLE_SQUARE",
          range: { startIndex: indexCounter, endIndex: indexCounter + cleanLine.length }
        }
      });
    }
    indexCounter += cleanLine.length;
  }

  if (requests.length > 0) {
    const updateRes = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ requests })
    });
    if (!updateRes.ok) {
      console.warn("Failed to write rich structural lines, leaving doc clean.");
    }
  }

  return { documentId, webViewLink: `https://docs.google.com/document/d/${documentId}/edit` };
};

// 5. Keep Note Wrapper (Since Consumer Keep is often Forbidden, we store notes both in Firebase Firestore for sync AND try Keep API)
export interface GKeepNote {
  id: string;
  title: string;
  body: string;
  timestamp: string;
}

export const fetchKeepNotes = async (token: string): Promise<GKeepNote[]> => {
  // Try calling real API
  try {
    const res = await fetch("https://keep.googleapis.com/v1/notes", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      return (data.notes || []).map((n: any) => ({
        id: n.name || n.id,
        title: n.title || "",
        body: n.body?.text?.text || "",
        timestamp: n.updateTime || new Date().toISOString()
      }));
    }
  } catch (err) {
    console.warn("Keep note corporate lookup blocked, initializing local workspace board fallback.");
  }
  return [];
};

export const createKeepNote = async (
  token: string,
  title: string,
  body: string
): Promise<GKeepNote> => {
  const res = await fetch("https://keep.googleapis.com/v1/notes", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      title,
      body: {
        text: {
          text: body
        }
      }
    })
  });
  if (!res.ok) {
    throw new Error(`Google Keep API returned status ${res.status}`);
  }
  const data = await res.json();
  return {
    id: data.name || data.id || `keep-${Date.now()}`,
    title: data.title || title,
    body: data.body?.text?.text || body,
    timestamp: data.updateTime || new Date().toISOString()
  };
};
