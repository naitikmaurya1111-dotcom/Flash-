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

      const { subjects, streak, dailyTargetMinutes } = req.body;

      const subListText = Array.isArray(subjects) 
        ? subjects.map((sub: any) => `- ${sub.name}: ${sub.totalMinutes || 0} minutes studied today (Daily Goal: ${sub.goalMinutes || 60} mins)`).join("\n")
        : "No subjects studied yet.";

      const prompt = `You are an elite academic habits coach inspired by modern productivity systems like Yeolpumta, Atomic Habits, and Focus Deep Work. 
Analyze the student's daily study profile and deliver custom habit coaching and actionable insights.

Student Study Profile:
- Current Streak: ${streak || 0} days studied consistently
- Overall Daily Target Focus: ${dailyTargetMinutes || 240} minutes
- Breakdown of Current Subject Progress:
${subListText}

Please generate a premium, highly encouraging structured advice coach response matching exact JSON format:
{
  "quote": "Highly motivating micro-quote about study consistency",
  "rating": "An encouraging study personality rating (e.g., 'Ascending Scholar', 'Deep Focus Titan', 'Steady Habit builder')",
  "insights": ["Specific insight 1 on study balance or streak milestone", "Specific insight 2 on subject pacing"],
  "strategies": ["High-yield habit routine advice to hit daily goals", "Actionable tactic to maintain energy/focus"],
  "scheduleTip": "Suggested study flow order (e.g. starting with difficult topics first, Pomodoro configuration recommendation)"
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
