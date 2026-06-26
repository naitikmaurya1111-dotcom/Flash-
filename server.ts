import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize Gemini lazily to avoid crashing on startup if key is missing
  let ai: GoogleGenAI | null = null;
  function getGeminiClient() {
    if (!ai) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.warn("GEMINI_API_KEY environment variable is not defined.");
        return null;
      }
      ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
    return ai;
  }

  // API endpoints
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  app.post("/api/ai/coach", async (req, res) => {
    try {
      const client = getGeminiClient();
      if (!client) {
        return res.status(503).json({
          error: "Gemini AI client is not configured. Please map GEMINI_API_KEY in the Secrets panel."
        });
      }

      const { subjects, streak, dailyTargetMinutes, persona = "Minerva" } = req.body;

      const subListText = Array.isArray(subjects) 
        ? subjects.map((sub: any) => `- ${sub.name}: ${sub.totalMinutes || 0} minutes studied today (Daily Goal: ${sub.goalMinutes || 60} mins)`).join("\n")
        : "No subjects studied yet.";

      const personaLabel = persona === "Sgt" 
        ? "Sgt. Focus (Military Drill Instructor - Strict, intense, yelling, demands ultimate focus, uses military cadet slang)" 
        : persona === "Zen"
          ? "Zen Master Lao (Mindful sage - Peaceful, calming, encourages smooth pacing, breathing exercises, focus zen and avoidance of burnout)"
          : "Professor Minerva (Eminent Academic Mentor - Wise, analytical, cites scientific memory, active recall, spaced repetition, elite brain theory)";

      const prompt = `You are an elite academic habits coach acting in the character style of: ${personaLabel}. 
Analyze the student's daily study profile and deliver custom habit coaching and actionable insights. IMPORTANT: Make your entire response style, wording, and vocabulary match this persona's tone very strongly!

Student Study Profile:
- Current Streak: ${streak || 0} days studied consistently
- Overall Daily Target Focus: ${dailyTargetMinutes || 240} minutes
- Breakdown of Current Subject Progress:
${subListText}

Please generate a premium, highly encouraging structured advice coach response matching exact JSON format:
{
  "quote": "Highly motivating micro-quote in the EXACT character voice of this coach",
  "rating": "An encouraging study personality rating matching the persona's style (e.g., 'CADET OF TRUE GRIT' or 'Lotus Bloom')",
  "insights": ["Specific character insight 1 on study balance or streak milestone", "Specific character insight 2 on subject pacing"],
  "strategies": ["High-yield habit routine advice mimicking the coach's personality", "Actionable tactic to maintain energy/focus"],
  "scheduleTip": "Suggested study flow order written in the character's unique manner"
}`;

      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              quote: { type: Type.STRING },
              rating: { type: Type.STRING },
              insights: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              strategies: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              scheduleTip: { type: Type.STRING }
            },
            required: ["quote", "rating", "insights", "strategies", "scheduleTip"]
          }
        }
      });

      const responseText = response.text || "{}";
      const parsedData = JSON.parse(responseText.trim());
      res.json(parsedData);
    } catch (error: any) {
      console.error("Gemini Coach API error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  app.post("/api/ai/coach/chat", async (req, res) => {
    try {
      const client = getGeminiClient();
      if (!client) {
        return res.status(503).json({
          error: "Gemini AI client is not configured. Please map GEMINI_API_KEY in the Secrets panel."
        });
      }

      const { message, history = [], persona = "Minerva", subjects = [] } = req.body;

      const personaLabel = persona === "Sgt" 
        ? "Sgt. Focus (Military Drill Instructor - Strict, intense, demanding, counts seconds, uses yelling punctuation and tactical terminology)" 
        : persona === "Zen"
          ? "Zen Master Lao (Tranquil Sage - Calming, supportive, values deep breathing, peaceful organic slow steps to counter burnout)"
          : "Professor Minerva (Eminent Brain Scientist & Academic Mentor - Brilliant, analytical, suggests spaced repetition, active recall cards, and cognitive load management)";

      const subjectsDetails = subjects.length > 0 
        ? "The student is currently active on these subject modules:\n" + subjects.map((s: any) => `- ${s.name}: ${s.totalMinutes || 0} minutes studied today`).join("\n")
        : "No subject sessions started yet.";

      const structuredHistory = history.map((h: any) => {
        return {
          role: h.role === "user" ? "user" : "model",
          parts: [{ text: h.text || h.content || "" }]
        };
      });

      const systemInstruction = `You are a personalized elite academic tutor and productivity counselor acting strictly as: ${personaLabel}.
${subjectsDetails}

Your goal: Help the user overcome procrastination, plan revision cards, structure focus schedules, or cheer them up.
IMPORTANT GUIDELINES:
1. Speak STRONGLY and completely in your chosen character's voice, accent, vocabulary, and punctuation style.
2. Provide concrete, super-actionable micro study hacks (e.g. active recall questions, micro breaks, pomodoro divisions).
3. Do not break character. Keep your reply highly relevant, engaging, and under 150 words.`;

      // Use gemini-3.5-flash for incredibly snappy latency and optimal instructions matching
      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          ...structuredHistory,
          { role: "user", parts: [{ text: message }] }
        ],
        config: {
          systemInstruction,
          maxOutputTokens: 350,
          temperature: 0.8
        }
      });

      const replyText = response.text || "I am currently meditating on your focus flow. Ask again in a short moment.";
      res.json({ reply: replyText });
    } catch (error: any) {
      console.error("Gemini Chat Coach API error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
