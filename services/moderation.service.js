// backend/services/moderation.service.js
const { GoogleGenAI } = require("@google/genai");
const fs = require("fs");
const path = require("path");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Sleeps for a given amount of time (used for retries)
 */
const wait = (ms) => new Promise(res => setTimeout(res, ms));

/**
 * Analyzes video for Education vs. Violation
 */
exports.analyzeVideoContent = async (videoPath, caption) => {
  const absolutePath = path.join(process.cwd(), videoPath);
  
  if (!fs.existsSync(absolutePath)) {
    return { action: "REJECT", reason: "File not found." };
  }

  const videoData = fs.readFileSync(absolutePath).toString("base64");
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      const response = await ai.models.generateContent({
        // 🔥 Using the 2026 Stable Flash model
        model: "gemini-3-flash-preview", 
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { mimeType: "video/mp4", data: videoData } },
              { text: `
                SYSTEM ROLE: Educational Content Filter.
                
                YOUR TASK:
                1. Look for: Science, National History, Business, or Technology.
                2. If the video contains: 
                   - Sexual imagery/nudity -> BAN.
                   - War, guns, gunfire sounds, or explosions -> BAN.
                   - Insults, swearing (e.g., "fuck"), or hate speech -> BAN.
                3. If the video is just entertainment (dance, music, jokes) -> REJECT.
                4. If and only if it is educational -> APPROVE.

                CAPTION: "${caption}"
                OUTPUT: One word only (BAN, APPROVE, or REJECT).` 
              }
            ]
          }
        ],
        config: {
          // 🛡️ HARD SAFETY BLOCK (Stops sexual/war content at the API level)
          safetySettings: [
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_LOW_AND_ABOVE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_LOW_AND_ABOVE" },
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_LOW_AND_ABOVE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_LOW_AND_ABOVE" }
          ],
          // 🧠 Set thinking to minimal for fastest moderation latency
          thinkingLevel: "MINIMAL" 
        }
      });

      // If response.text is missing, it means the Safety Filter killed the request
      if (!response || !response.text) {
        console.warn("🛡️ API Blocked response due to safety violation.");
        return { action: "BAN", reason: "Auto-detected restricted content." };
      }

      const verdict = response.text.toUpperCase().trim();
      console.log(`🤖 AI Verdict for ${path.basename(videoPath)}:`, verdict);

      if (verdict.includes("BAN")) return { action: "BAN", reason: "Safety Violation." };
      if (verdict.includes("APPROVE")) return { action: "APPROVE", category: "Education" };
      
      return { action: "REJECT", reason: "Not educational content." };

    } catch (error) {
      // Handle 503 (Overloaded) or 429 (Rate Limit)
      if (error.message.includes("503") || error.message.includes("429")) {
        attempts++;
        const delay = Math.pow(2, attempts) * 1000;
        console.warn(`⚠️ Google Busy. Retry ${attempts}/${maxAttempts} in ${delay}ms...`);
        await wait(delay);
        continue;
      }

      // Handle direct Safety Errors from the SDK
      if (error.message.includes("SAFETY")) {
        return { action: "BAN", reason: "Explicit content detected." };
      }

      console.error("🚨 AI Error:", error.message);
      return { action: "REJECT", reason: "Moderation system error." };
    }
  }

  return { action: "REJECT", reason: "AI Service Busy. Try again later." };
};