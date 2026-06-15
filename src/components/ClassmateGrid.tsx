import React, { useState, useEffect, useRef } from "react";
import { Users, Search, Compass, Award, Plus, LogIn, LogOut, Send, MessageSquare, Coffee, Library, Moon, Sparkles, AlertCircle, Sparkle, Flame, ThumbsUp } from "lucide-react";
import { RoomMember, RoomChat, StudyRoom } from "../types";
import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  deleteDoc, 
  getDocs, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  serverTimestamp 
} from "firebase/firestore";
import { db } from "../lib/googleApi";
import { User } from "firebase/auth";

interface ClassmateGridProps {
  currentUser: User | null;
  joinedRoomId: string | null;
  setJoinedRoomId: (id: string | null) => void;
  isStudying: boolean;
  activeSeconds: number;
  activeSubjectName: string;
  totalStudiedTodayMins: number;
}

// Global Avatar Seed Generator helper to ensure consistent profile branding
const getAvatarSeed = (email?: string | null) => {
  if (!email) return "bg-emerald-500";
  const colors = [
    "bg-teal-500", 
    "bg-rose-500", 
    "bg-indigo-500", 
    "bg-amber-500", 
    "bg-pink-500", 
    "bg-purple-500", 
    "bg-blue-500", 
    "bg-emerald-500"
  ];
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export default function ClassmateGrid({
  currentUser,
  joinedRoomId,
  setJoinedRoomId,
  isStudying,
  activeSeconds,
  activeSubjectName,
  totalStudiedTodayMins
}: ClassmateGridProps) {
  // 1. Rooms state (Firestore real-time or fallbacks)
  const [rooms, setRooms] = useState<StudyRoom[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  // 2. Active room members (real-time from Firestore)
  const [roomMembers, setRoomMembers] = useState<RoomMember[]>([]);
  
  // 3. Active room chats (real-time from Firestore)
  const [chats, setChats] = useState<RoomChat[]>([]);
  const [newMessage, setNewMessage] = useState("");

  // 4. Create room modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomDesc, setNewRoomDesc] = useState("");
  const [newRoomCategory, setNewRoomCategory] = useState("STEM");
  const [newRoomIcon, setNewRoomIcon] = useState("Coffee");

  // 5. Search filtering state
  const [searchQuery, setSearchQuery] = useState("");
  const [showNotification, setShowNotification] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  const [sandboxGuestName, setSandboxGuestName] = useState<string>(() => {
    return localStorage.getItem("study_sandbox_guest_name") || "Pioneer Student";
  });

  // Simulated AI bots for empty rooms to demonstrate YPT desk floors
  const [simulatedMates, setSimulatedMates] = useState<RoomMember[]>([
    { id: "bot-1", name: "Jun-Woo Kim", avatarSeed: "bg-teal-500", isStudying: true, activeSubjectName: "Computer Science", studyDurationTodayMinutes: 245, activeSeconds: 1432 },
    { id: "bot-2", name: "Chloe Dupont", avatarSeed: "bg-pink-500", isStudying: true, activeSubjectName: "Spanish Language", studyDurationTodayMinutes: 110, activeSeconds: 432 },
    { id: "bot-3", name: "Aisha Rahman", avatarSeed: "bg-amber-500", isStudying: true, activeSubjectName: "Advanced Mathematics", studyDurationTodayMinutes: 310, activeSeconds: 2840 },
    { id: "bot-4", name: "Liam Miller", avatarSeed: "bg-indigo-500", isStudying: false, activeSubjectName: "Resting", studyDurationTodayMinutes: 180, activeSeconds: 0 },
    { id: "bot-5", name: "Sofia de Luca", avatarSeed: "bg-rose-500", isStudying: true, activeSubjectName: "Organic Chemistry", studyDurationTodayMinutes: 85, activeSeconds: 712 }
  ]);

  const triggerNotify = (text: string, type: "success" | "error" | "info" = "success") => {
    setShowNotification({ text, type });
    setTimeout(() => setShowNotification(null), 4000);
  };

  // Floating peer-motivation reactions state
  const [reactions, setReactions] = useState<Record<string, { id: string; emoji: string }[]>>({});

  const handleSendReaction = (mateId: string, name: string, emoji: string, verb: string) => {
    const lines = [
      `You ${verb} ${name}! 🚀 Keep the peer energy high!`,
      `Motivational ${emoji} beam successfully transmitted to ${name}!`,
      `Study buddies rock! You sent ${name} a motivation spark! ${emoji}`
    ];
    triggerNotify(lines[Math.floor(Math.random() * lines.length)], "success");

    const reactionId = `react-${Date.now()}-${Math.random()}`;
    setReactions(prev => ({
      ...prev,
      [mateId]: [...(prev[mateId] || []), { id: reactionId, emoji }]
    }));

    setTimeout(() => {
      setReactions(prev => {
        const list = prev[mateId] || [];
        return {
          ...prev,
          [mateId]: list.filter(r => r.id !== reactionId)
        };
      });
    }, 1500);
  };

  // Bot ticking simulation to showcase ticking study floors (ticks every second)
  useEffect(() => {
    const interval = setInterval(() => {
      setSimulatedMates(prev => 
        prev.map(mate => {
          if (!mate.isStudying) {
            // 5% chance to start studying
            if (Math.random() < 0.05) {
              const subjects = ["Computer Science", "Advanced Mathematics", "Organic Chemistry", "Spanish Language", "World Literature"];
              return {
                ...mate,
                isStudying: true,
                activeSubjectName: subjects[Math.floor(Math.random() * subjects.length)],
                activeSeconds: 1
              };
            }
            return mate;
          } else {
            let nextSecs = mate.activeSeconds + 1;
            let nextMins = mate.studyDurationTodayMinutes;
            if (nextSecs >= 60) {
              nextSecs = 0;
              nextMins += 1;
            }
            // 2% chance to take a break
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
        })
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sync rooms directory in Real-time from Firestore
  useEffect(() => {
    setLoadingRooms(true);

    const defaultFallbacks: StudyRoom[] = [
      { id: "global-cafe", name: "Global Tech Cafe ✨", category: "STEM", description: "Learn computer science, math & algorithms synchronously with peers.", icon: "Coffee", currentUsersCount: 12 },
      { id: "quiet-lib", name: "Virtual Main Library 📚", category: "Silent Reading", description: "Strictly quiet study desks. Perfect for exam revisions.", icon: "Library", currentUsersCount: 18 },
      { id: "night-owls", name: "Night Owls Study Den 🌙", category: "Unisex", description: "Late-night grinding under gentle ambient moonbeams.", icon: "Moon", currentUsersCount: 6 }
    ];

    if (!currentUser) {
      const savedSandboxRooms = localStorage.getItem("sandbox_study_rooms");
      if (savedSandboxRooms) {
        setRooms(JSON.parse(savedSandboxRooms));
      } else {
        setRooms(defaultFallbacks);
        localStorage.setItem("sandbox_study_rooms", JSON.stringify(defaultFallbacks));
      }
      setLoadingRooms(false);
      return;
    }

    const roomsCol = collection(db, "studyRooms");
    
    // Subscribe to rooms snapshot
    const unsubscribe = onSnapshot(roomsCol, (snapshot) => {
      const loaded: StudyRoom[] = [];
      snapshot.forEach(doc => {
        loaded.push(doc.data() as StudyRoom);
      });

      // Default backup rooms to seed directory if database is currently empty
      if (loaded.length === 0) {
        // Write defaults to Firestore for multi-user sync on first boot if signed in
        defaultFallbacks.forEach(async (f) => {
          try {
            await setDoc(doc(db, "studyRooms", f.id), f);
          } catch (err) {
            console.warn("Could not seed study room: ", f.id, err);
          }
        });
        setRooms(defaultFallbacks);
      } else {
        setRooms(loaded);
      }
      setLoadingRooms(false);
    }, (err) => {
      console.error("Failed load public rooms from database:", err);
      setLoadingRooms(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Sync joined Room Members block in Realwork snapshot
  useEffect(() => {
    if (!joinedRoomId) {
      setRoomMembers([]);
      setChats([]);
      return;
    }

    if (!currentUser) {
      // Local sandbox virtual guest join setup
      const localGuest: RoomMember = {
        id: "local-sandbox-guest-id",
        name: sandboxGuestName,
        avatarSeed: "bg-indigo-600",
        isStudying,
        activeSubjectName: isStudying ? activeSubjectName : "Resting",
        studyDurationTodayMinutes: totalStudiedTodayMins,
        activeSeconds,
        updatedAt: new Date().toISOString()
      };
      setRoomMembers([localGuest]);

      const localKeyChats = `sandbox_chat_room_${joinedRoomId}`;
      const savedChats = localStorage.getItem(localKeyChats);
      setChats(savedChats ? JSON.parse(savedChats) : [
        {
          id: "welcome-chat",
          userId: "bot-1",
          userName: "Jun-Woo Kim",
          userAvatarSeed: "bg-teal-500",
          text: `Welcome to the multi-study desk! Let's hit our focus targets today. 💪`,
          timestamp: new Date(Date.now() - 60000).toISOString()
        }
      ]);
      return;
    }

    // A. Subscribe to live members list
    const membersCol = collection(db, "studyRooms", joinedRoomId, "members");
    const unsubscribeMembers = onSnapshot(membersCol, (snapshot) => {
      const list: RoomMember[] = [];
      snapshot.forEach(d => {
        list.push(d.data() as RoomMember);
      });
      setRoomMembers(list);
    }, (err) => {
      console.error("Real-time room members subscription broken:", err);
    });

    // B. Subscribe to live room chats logic
    const chatsCol = collection(db, "studyRooms", joinedRoomId, "chats");
    const chatsQuery = query(chatsCol, orderBy("timestamp", "asc"), limit(40));
    const unsubscribeChats = onSnapshot(chatsQuery, (snapshot) => {
      const loadedChats: RoomChat[] = [];
      snapshot.forEach(d => {
        loadedChats.push(d.data() as RoomChat);
      });
      setChats(loadedChats);
    }, (err) => {
      console.error("Live room chat system disabled (Typical on rules config update. Attempting recover):", err);
    });

    return () => {
      unsubscribeMembers();
      unsubscribeChats();
    };
  }, [joinedRoomId, currentUser, sandboxGuestName]);

  // Synchronize dynamic ticking active stopwatch elements when isStudying or values update
  useEffect(() => {
    if (!joinedRoomId) return;

    if (!currentUser) {
      setRoomMembers(prev => prev.map(m => {
        if (m.id === "local-sandbox-guest-id") {
          return {
            ...m,
            name: sandboxGuestName,
            isStudying,
            activeSubjectName: isStudying ? activeSubjectName : "Resting",
            studyDurationTodayMinutes: totalStudiedTodayMins,
            activeSeconds,
            updatedAt: new Date().toISOString()
          };
        }
        return m;
      }));
      return;
    }

    const syncOurStatusToRoom = async () => {
      const myRef = doc(db, "studyRooms", joinedRoomId, "members", currentUser.uid);
      const memberPayload: RoomMember = {
        id: currentUser.uid,
        name: currentUser.displayName || currentUser.email || "Anonymous Student",
        avatarSeed: getAvatarSeed(currentUser.email),
        isStudying,
        activeSubjectName: isStudying ? activeSubjectName : "Resting",
        studyDurationTodayMinutes: totalStudiedTodayMins,
        activeSeconds,
        updatedAt: new Date().toISOString()
      };
      
      try {
        await setDoc(myRef, memberPayload);
      } catch (err) {
        console.warn("Could not publish live telemetry stats:", err);
      }
    };

    // Debounce status synchronization or run on tick
    syncOurStatusToRoom();

  }, [currentUser, joinedRoomId, isStudying, activeSeconds, activeSubjectName, totalStudiedTodayMins, sandboxGuestName]);

  // Join selected study room
  const handleJoinRoom = async (roomId: string) => {
    try {
      // 1. If currently inside previous room, remove our desk first
      if (joinedRoomId) {
        await handleLeaveRoom(false);
      }

      // 2. Set active state
      setJoinedRoomId(roomId);

      if (!currentUser) {
        // sandbox guest join
        triggerNotify(`Welcome to sandbox study desk! Enjoy co-studying at desk floor!`);
        return;
      }

      // 3. Increment room count safely
      const roomRef = doc(db, "studyRooms", roomId);
      const targetRoom = rooms.find(r => r.id === roomId);
      if (targetRoom) {
        await setDoc(roomRef, {
          ...targetRoom,
          currentUsersCount: (targetRoom.currentUsersCount || 0) + 1
        }, { merge: true });
      }

      // 4. Create member entry
      const memberRef = doc(db, "studyRooms", roomId, "members", currentUser.uid);
      const myPayload: RoomMember = {
        id: currentUser.uid,
        name: currentUser.displayName || currentUser.email || "Anonymous Student",
        avatarSeed: getAvatarSeed(currentUser.email),
        isStudying,
        activeSubjectName: isStudying ? activeSubjectName : "Resting",
        studyDurationTodayMinutes: totalStudiedTodayMins,
        activeSeconds,
        updatedAt: new Date().toISOString()
      };
      await setDoc(memberRef, myPayload);

      triggerNotify(`You joined the virtual study floor of "${targetRoom?.name.slice(0, -2) || roomId}" successfully!`);
    } catch (err) {
      console.error(err);
      triggerNotify("Could not register on virtual campus desk.", "error");
    }
  };

  // Leave active study room
  const handleLeaveRoom = async (triggerNotification = true) => {
    if (!joinedRoomId) return;

    const roomIdToLeave = joinedRoomId;
    setJoinedRoomId(null);

    if (!currentUser) {
      setRoomMembers([]);
      setChats([]);
      if (triggerNotification) {
        triggerNotify("Returned back to private focus cabin.");
      }
      return;
    }

    try {
      // 1. Delete member document
      await deleteDoc(doc(db, "studyRooms", roomIdToLeave, "members", currentUser.uid));

      // 2. Decrement room count
      const roomRef = doc(db, "studyRooms", roomIdToLeave);
      const targetRoom = rooms.find(r => r.id === roomIdToLeave);
      if (targetRoom) {
        await setDoc(roomRef, {
          ...targetRoom,
          currentUsersCount: Math.max(0, (targetRoom.currentUsersCount || 1) - 1)
        }, { merge: true });
      }

      if (triggerNotification) {
        triggerNotify("Returned back to private focus cabin.");
      }
    } catch (err) {
      console.error("Leave room failed:", err);
    }
  };

  // Post live motivation chat to the room board
  const handleSendChatMsg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinedRoomId || !newMessage.trim()) return;

    const myName = currentUser ? (currentUser.displayName || currentUser.email || "Anonymous Student") : sandboxGuestName;
    const mySeed = currentUser ? getAvatarSeed(currentUser.email) : "bg-indigo-600";
    const myId = currentUser ? currentUser.uid : "local-sandbox-guest-id";

    const msgPayload: RoomChat = {
      id: `chat-${Date.now()}`,
      userId: myId,
      userName: myName,
      userAvatarSeed: mySeed,
      text: newMessage.trim(),
      timestamp: new Date().toISOString()
    };

    if (!currentUser) {
      const nextChats = [...chats, msgPayload];
      setChats(nextChats);
      const localKeyChats = `sandbox_chat_room_${joinedRoomId}`;
      localStorage.setItem(localKeyChats, JSON.stringify(nextChats));
      setNewMessage("");

      // Trigger interactive classmate bot reply simulation
      setTimeout(() => {
        const activeBots = simulatedMates.filter(b => b.isStudying);
        if (activeBots.length === 0) return;
        const randomBot = activeBots[Math.floor(Math.random() * activeBots.length)];
        const comments = [
          "Nice focus! Keep grinding!",
          "Let's put in another solid Pomodoro round.",
          "Awesome work. Consistency is everything.",
          "We got this, stay in the zone!",
          "Yes! Checking off study items is so rewarding today."
        ];
        const botReply: RoomChat = {
          id: `chat-bot-${Date.now()}`,
          userId: randomBot.id,
          userName: randomBot.name,
          userAvatarSeed: randomBot.avatarSeed,
          text: comments[Math.floor(Math.random() * comments.length)],
          timestamp: new Date().toISOString()
        };
        setChats(curr => {
          const loaded = [...curr, botReply];
          localStorage.setItem(localKeyChats, JSON.stringify(loaded));
          return loaded;
        });
      }, 1000);
      return;
    }

    try {
      await setDoc(doc(db, "studyRooms", joinedRoomId, "chats", msgPayload.id), msgPayload);
      setNewMessage("");
    } catch (err) {
      console.error("Chat push failed:", err);
      triggerNotify("Failed publishing message.", "error");
    }
  };

  // Create a brand new customized study group like YPT style
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim() || !newRoomDesc.trim()) {
      triggerNotify("Please supply room name and target theme description.", "error");
      return;
    }

    const newId = `room-${Date.now()}`;
    const newRoom: StudyRoom = {
      id: newId,
      name: `${newRoomName.trim()} 🌟`,
      category: newRoomCategory,
      description: newRoomDesc.trim(),
      icon: newRoomIcon,
      currentUsersCount: 1,
      creatorId: currentUser ? currentUser.uid : "local-sandbox-guest-id"
    };

    if (!currentUser) {
      const savedSandboxRooms = localStorage.getItem("sandbox_study_rooms");
      const currentRooms = savedSandboxRooms ? JSON.parse(savedSandboxRooms) : rooms;
      const updatedRooms = [...currentRooms, newRoom];
      setRooms(updatedRooms);
      localStorage.setItem("sandbox_study_rooms", JSON.stringify(updatedRooms));

      setNewRoomName("");
      setNewRoomDesc("");
      setIsCreateOpen(false);

      // Join the newly hosted room
      setJoinedRoomId(newId);
      triggerNotify(`Congratulations! Room "${newRoomName}" is created in your guest workspace!`);
      return;
    }

    try {
      await setDoc(doc(db, "studyRooms", newId), newRoom);
      triggerNotify(`Congratulations! Room "${newRoomName}" is live on the public browser!`);
      
      // Reset variables
      setNewRoomName("");
      setNewRoomDesc("");
      setIsCreateOpen(false);

      // Join the newly hosted room as desk #1
      await handleJoinRoom(newId);
    } catch (err) {
      console.error(err);
      triggerNotify("Could not provision room on Firebase. Check credentials.", "error");
    }
  };

  // Compile unique desks - combination of Firestore real room members + helpful automated classmate bots
  const displayMembers = [...roomMembers];
  // Add bots if there are no other users or to fill space to showcase ticking desks, ensuring unique displays
  simulatedMates.forEach(bot => {
    if (!displayMembers.some(m => m.id === bot.id) && displayMembers.length < 9) {
      displayMembers.push(bot);
    }
  });

  // Sort unified floor list for Daily Live Group Leaderboard
  const leaderBoardList = [...displayMembers].sort((a, b) => b.studyDurationTodayMinutes - a.studyDurationTodayMinutes);

  const formatTimerValue = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const formatTotalHours = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  // Render icons dynamically
  const getRoomIcon = (iconName: string) => {
    switch (iconName) {
      case "Coffee": return <Coffee className="w-5 h-5 text-amber-500" />;
      case "Library": return <Library className="w-5 h-5 text-sky-500" />;
      case "Moon": return <Moon className="w-5 h-5 text-indigo-500" />;
      default: return <Coffee className="w-5 h-5 text-amber-500" />;
    }
  };

  // Search filtered rooms
  const filteredRooms = rooms.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">

      {/* Floating Status Notification Alerts */}
      {showNotification && (
        <div className={`fixed top-20 right-6 z-50 p-4 rounded-2xl flex items-center gap-3 shadow-xl border animate-fade-in ${
          showNotification.type === "error" 
            ? "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/80 dark:border-rose-900 dark:text-rose-200"
            : showNotification.type === "info"
            ? "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/80 dark:border-blue-900 dark:text-blue-200"
            : "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/80 dark:border-emerald-900 dark:text-emerald-200"
        }`}>
          <AlertCircle className="w-5 h-5 inline-block shrink-0" />
          <p className="text-xs font-semibold leading-relaxed font-sans pr-2">{showNotification.text}</p>
        </div>
      )}

      {/* 1. Browse Rooms Carousel & Create Control */}
      {!joinedRoomId && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xs border border-slate-100 dark:border-slate-800 space-y-4">
          
          {/* Mock guest Identity Banner if not authenticated */}
          {!currentUser && (
            <div className="p-4 bg-indigo-500/10 border border-indigo-500/15 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
              <div className="flex items-center gap-3">
                <span className="shrink-0 text-xl bg-indigo-500/10 p-2.5 rounded-xl">🎓</span>
                <div className="space-y-0.5">
                  <p className="font-semibold text-xs text-indigo-900 dark:text-indigo-400">Sandbox Student Card Issued</p>
                  <p className="text-[11px] text-slate-500">Edit your card's custom nickname to join desk floors and interact with classmate bots below!</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="text"
                  value={sandboxGuestName}
                  onChange={(e) => {
                    const nextVal = e.target.value.substring(0, 18);
                    setSandboxGuestName(nextVal);
                    localStorage.setItem("study_sandbox_guest_name", nextVal);
                  }}
                  className="bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 text-xs px-3 py-1.5 rounded-xl font-medium w-full sm:max-w-[155px]"
                />
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-tr from-emerald-500 to-teal-600 text-white rounded-2xl shadow-sm">
                <Compass className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h3 className="font-display font-semibold text-base text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  Yeolpumta (YPT) Multiperson campus
                  <span className="text-[9px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">Live</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Select, create, or enter peer-to-peer virtual campuses. Desks tick synchronized using online data channels.
                </p>
              </div>
            </div>

            {/* Actions row */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:max-w-[200px]">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter rooms..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-xl focus:outline-hidden"
                />
              </div>

              <button
                onClick={() => setIsCreateOpen(true)}
                className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 hover:bg-slate-800 font-semibold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Create Room
              </button>
            </div>
          </div>

          {/* Rooms Directory Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {filteredRooms.map(room => (
              <div
                key={room.id}
                className="bg-slate-50/50 dark:bg-slate-950/40 p-5 rounded-2xl border border-slate-150 dark:border-slate-850 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="p-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl">
                      {getRoomIcon(room.icon)}
                    </div>
                    <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                      {room.category}
                    </span>
                  </div>

                  <div className="text-left">
                    <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-100">
                      {room.name}
                    </h4>
                    <p className="text-xs text-slate-450 leading-relaxed line-clamp-2 mt-1">
                      {room.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-850">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
                    <span>{room.currentUsersCount || 0} active</span>
                  </div>

                  <button
                    onClick={() => handleJoinRoom(room.id)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shadow-emerald-600/5 active:scale-95"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    Enter Room
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Room Creaton Overlay Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 max-w-md w-full space-y-6 animate-fade-in text-left">
            <div className="space-y-1">
              <h3 className="font-display font-semibold text-base text-slate-800 dark:text-slate-100">
                Host New Study Room
              </h3>
              <p className="text-xs text-slate-400">
                Setup your proprietary study lobby on the live directory, where others can study synchronously.
              </p>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono tracking-widest text-slate-400">Lobby Title Name</label>
                <input
                  type="text"
                  placeholder="e.g. MCAT Grinders, Computer Science Elite"
                  value={newRoomName}
                  onChange={e => setNewRoomName(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800 rounded-xl"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono tracking-widest text-slate-400">Target Segment Description</label>
                <textarea
                  placeholder="Define study schedules or guidelines to gather people with similar agendas..."
                  rows={3}
                  value={newRoomDesc}
                  onChange={e => setNewRoomDesc(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800 rounded-xl leading-relaxed resize-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono tracking-widest text-slate-400">Category Tag</label>
                  <select
                    value={newRoomCategory}
                    onChange={e => setNewRoomCategory(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800 rounded-xl"
                  >
                    <option value="STEM">Science & STEM</option>
                    <option value="Languages">Languages</option>
                    <option value="Silent reading">Silent Reading</option>
                    <option value="Humanities">Humanities</option>
                    <option value="Exams">Standardized Tests</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono tracking-widest text-slate-400">Theme Icon</label>
                  <select
                    value={newRoomIcon}
                    onChange={e => setNewRoomIcon(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800 rounded-xl"
                  >
                    <option value="Coffee">☕ Espresso Cafe</option>
                    <option value="Library">📚 Silent Library</option>
                    <option value="Moon">🌙 Cozy Twilight Den</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2.5 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="flex-1 border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 py-2.5 rounded-xl text-xs font-semibold text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs flex justify-center items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  Deploy Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Deep-Focus YPT Group Desk Floor Sheet */}
      {joinedRoomId && (
        <div className="space-y-6">
          
          {/* Active room status widget */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-850 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-left">
              <div className="h-11 w-11 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-2xl flex items-center justify-center">
                <Users className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-base flex items-center gap-2">
                  {rooms.find(r => r.id === joinedRoomId)?.name || "Academic Lounge"}
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full uppercase font-mono">Live Sync</span>
                </h3>
                <p className="text-xs text-slate-400 max-w-md">
                  You are at desk #{(roomMembers.findIndex(m => m.id === currentUser?.uid) + 1) || 1}. Live stopwatches are ticking in real-time. Start studying under the focus tab to tick together!
                </p>
              </div>
            </div>

            <button
              onClick={() => handleLeaveRoom(true)}
              className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-bold text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              <LogOut className="w-3.5 h-3.5" />
              Exit study group
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* A. Dynamic real-time ticking campus desk floor */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-850 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
                  <h4 className="font-display font-semibold text-sm text-slate-800 dark:text-slate-100">
                    Live Study Desk Floor
                  </h4>
                </div>
                <span className="text-[10px] font-mono uppercase bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 px-2.5 py-1 rounded-full text-slate-400">
                  {displayMembers.filter(m => m.isStudying).length} studying right now
                </span>
              </div>

              {/* Classmate Desks lists */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {displayMembers.map(mate => {
                  const isCurrentMock = mate.id === currentUser?.uid;
                  return (
                    <div
                      key={mate.id}
                      className={`p-4 rounded-2xl border flex flex-col justify-between transition-all relative ${
                        mate.isStudying
                          ? "bg-emerald-500/5 border-emerald-500/35 ring-1 ring-emerald-500/10 shadow-lg shadow-emerald-500/5"
                          : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800"
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        {/* Custom visual avatar sphere */}
                        <div className={`w-8 h-8 rounded-full ${mate.avatarSeed} flex items-center justify-center text-white text-xs font-black shrink-0 relative`}>
                          {mate.name.charAt(0).toUpperCase()}
                          {mate.isStudying && (
                            <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                            </span>
                          )}
                        </div>

                        <div className="overflow-hidden text-left">
                          <h5 className="font-semibold text-xs text-slate-750 dark:text-slate-250 truncate" title={mate.name}>
                            {mate.name} {isCurrentMock && "(You)"}
                          </h5>
                          <span className={`inline-block text-[9px] font-mono uppercase mt-0.5 px-1.5 py-0.5 rounded-md ${
                            mate.isStudying
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold"
                              : "bg-slate-100 dark:bg-slate-950 text-slate-400"
                          }`}>
                            {mate.activeSubjectName}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-850 space-y-1">
                        <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
                          <span>STOPWATCH</span>
                          <span className={`font-bold ${mate.isStudying ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
                            {mate.isStudying ? formatTimerValue(mate.activeSeconds) : "PAUSED"}
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
                          <span>ACCUMULATED</span>
                          <span className="font-bold text-slate-600 dark:text-slate-350">{formatTotalHours(mate.studyDurationTodayMinutes)}</span>
                        </div>

                        {/* Interactive Co-Study Motivation features */}
                        {!isCurrentMock && (
                          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-850/80 flex items-center justify-between gap-1.5 leading-none">
                            <span className="text-[8px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">NUDGE MATE:</span>
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => handleSendReaction(mate.id, mate.name, "🔥", "poked with study motivation flame")}
                                className="p-1 hover:bg-orange-500/10 dark:hover:bg-orange-500/20 text-orange-500 rounded-lg transition-all scale-95 hover:scale-110 active:scale-95 cursor-pointer"
                                title="Send Study Flame 🔥"
                              >
                                <Flame className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSendReaction(mate.id, mate.name, "☕", "sent a fresh co-study espresso cup")}
                                className="p-1 hover:bg-amber-600/10 dark:hover:bg-amber-600/20 text-amber-500 rounded-lg transition-all scale-95 hover:scale-110 active:scale-95 cursor-pointer"
                                title="Virtual Coffee Break ☕"
                              >
                                <Coffee className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSendReaction(mate.id, mate.name, "✨", "sent motivational stars")}
                                className="p-1 hover:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-500 rounded-lg transition-all scale-95 hover:scale-110 active:scale-95 cursor-pointer"
                                title="Shaped Sparkles Encourage ✨"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSendReaction(mate.id, mate.name, "👍", "gave a giant virtual thumb's up")}
                                className="p-1 hover:bg-teal-500/10 dark:hover:bg-teal-500/20 text-teal-505 text-teal-500 rounded-lg transition-all scale-95 hover:scale-110 active:scale-95 cursor-pointer"
                                title="Thumbs Up Support 👍"
                              >
                                <ThumbsUp className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Emitter Container for Visual Sparks */}
                      <div className="absolute right-3.5 top-3.5 pointer-events-none z-30 overflow-visible">
                        {(reactions[mate.id] || []).map(r => (
                          <span 
                            key={r.id} 
                            className="absolute bottom-0 right-0 text-lg select-none filter drop-shadow animate-bounce"
                            style={{
                              animation: "floatUpReaction 1.2s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards",
                            }}
                          >
                            {r.emoji}
                          </span>
                        ))}
                      </div>

                      {/* Embed keyframes inside the component specifically for flawless reactivity */}
                      <style>{`
                        @keyframes floatUpReaction {
                          0% { transform: translateY(0) scale(0.6); opacity: 0; }
                          15% { opacity: 1; }
                          100% { transform: translateY(-45px) scale(1.2); opacity: 0; }
                        }
                      `}</style>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* B. Daily Room Leaderboard panel */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 space-y-4">
              <div className="flex items-center gap-2 pb-1 border-b border-slate-50 dark:border-slate-850 pb-3 text-left">
                <Award className="w-5 h-5 text-amber-500 fill-amber-500/10" />
                <h4 className="font-display font-semibold text-sm text-slate-800 dark:text-slate-150">
                  Lobby Productivity Leaderboard
                </h4>
              </div>

              <div className="space-y-2 max-h-[360px] overflow-y-auto no-scrollbar pr-1">
                {leaderBoardList.map((mate, idx) => {
                  const rank = idx + 1;
                  const isCurrent = mate.id === currentUser?.uid;
                  return (
                    <div
                      key={mate.id}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                        isCurrent 
                          ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950 border-slate-950 dark:border-slate-100 shadow-md"
                          : "bg-slate-50/50 dark:bg-slate-950/40 border-slate-100/30 dark:border-slate-850/10"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        {/* Rank tag */}
                        <div className={`w-5 h-5 flex items-center justify-center rounded-lg text-[10px] font-mono font-bold shrink-0 ${
                          rank === 1
                            ? "bg-amber-100 text-amber-700"
                            : rank === 2
                            ? "bg-slate-200 text-slate-700"
                            : rank === 3
                            ? "bg-orange-100 text-orange-700"
                            : "text-slate-400 bg-slate-100 dark:bg-slate-800"
                        }`}>
                          {rank}
                        </div>

                        <div className="text-left overflow-hidden">
                          <p className={`text-xs font-semibold truncate ${isCurrent ? "" : "text-slate-800 dark:text-slate-200"}`}>
                            {mate.name} {isCurrent && "(You)"}
                          </p>
                          <p className={`text-[10px] truncate ${isCurrent ? "text-slate-350" : "text-slate-400"}`}>
                            {mate.activeSubjectName}
                          </p>
                        </div>
                      </div>

                      <span className={`text-xs font-mono font-bold ${isCurrent ? "text-emerald-400 dark:text-emerald-500" : "text-slate-700 dark:text-slate-300"}`}>
                        {formatTotalHours(mate.studyDurationTodayMinutes)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* C. Interactive accountability group chatboard */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-xs max-w-3xl mx-auto space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-50 dark:border-slate-850 pb-3 text-left">
              <MessageSquare className="w-5 h-5 text-blue-500" />
              <h4 className="font-display font-semibold text-sm text-slate-800 dark:text-slate-100">
                Accountability Group Chatboard
              </h4>
            </div>

            {/* Chat message listings */}
            <div className="space-y-3 h-[240px] overflow-y-auto no-scrollbar p-1.5 border border-slate-50 dark:border-slate-850 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20">
              {chats.map(cht => {
                const isOurPost = cht.userId === currentUser?.uid;
                return (
                  <div key={cht.id} className={`flex gap-2 text-left ${isOurPost ? "flex-row-reverse" : "flex-row"}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-white text-[10px] font-black ${cht.userAvatarSeed || "bg-indigo-500"}`}>
                      {cht.userName.charAt(0).toUpperCase()}
                    </div>
                    
                    <div className="space-y-0.5 max-w-[70%]">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold text-slate-500">{cht.userName}</span>
                        <span className="text-[9px] text-slate-400 font-mono">
                          {new Date(cht.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      
                      <div className={`p-2.5 rounded-2xl text-xs font-sans leading-relaxed ${
                        isOurPost
                          ? "bg-slate-900 text-white rounded-tr-none dark:bg-slate-100 dark:text-slate-950"
                          : "bg-slate-100 text-slate-750 dark:bg-slate-800 dark:text-slate-300 rounded-tl-none"
                      }`}>
                        {cht.text}
                      </div>
                    </div>
                  </div>
                );
              })}

              {chats.length === 0 && (
                <p className="text-xs text-slate-400 italic text-center py-12">
                  No notifications or messages recorded. Type a warm encouragement to build the continuous study chain!
                </p>
              )}
            </div>

            {/* Input action toolbar */}
            <form onSubmit={handleSendChatMsg} className="flex gap-2">
              <input
                type="text"
                placeholder="Post a study win or status notice..."
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                className="flex-1 text-xs p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-xl focus:outline-hidden"
              />
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white p-3 rounded-xl flex justify-center items-center transition-all cursor-pointer scale-98 active:scale-95"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

        </div>
      )}

    </div>
  );
}
