const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

// 1. Setup Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
  model: "gemini-3-flash-preview",
  // 🛡️ API Level Safety Blocks
  safetySettings: [
    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_LOW_AND_ABOVE" },
    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_LOW_AND_ABOVE" },
    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_LOW_AND_ABOVE" },
    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_LOW_AND_ABOVE" }
  ]
});

const wait = (ms) => new Promise(res => setTimeout(res, ms));

/**
 * Moderates video from either a Local Path or a Cloudinary URL
 */
exports.analyzeVideoContent = async (videoSource, caption) => {
  try {
    let videoData;

    // 🌐 Step 1: Get Video Data (Detect if URL or Local Path)
    if (videoSource.startsWith('http')) {
      console.log("🌐 Fetching remote video from Cloudinary:", videoSource);
      const response = await axios.get(videoSource, { responseType: 'arraybuffer' });
      videoData = Buffer.from(response.data).toString("base64");
    } else {
      const absolutePath = path.resolve(videoSource);
      console.log("📂 Reading local file:", absolutePath);
      if (!fs.existsSync(absolutePath)) {
        return { action: "REJECT", reason: "Local file not found." };
      }
      videoData = fs.readFileSync(absolutePath).toString("base64");
    }

    let attempts = 0;
    const maxAttempts = 3;

    // 🤖 Step 2: AI Moderation Loop
    while (attempts < maxAttempts) {
      try {
        const result = await model.generateContent([
          { 
            inlineData: { 
              mimeType: "video/mp4", 
              data: videoData 
            } 
          },
          { 
            text: `
              SYSTEM ROLE: specialized Talent & Education Filter for Children (Ethio-Kids Platform).
              
              YOUR MISSION: 
              Identify if the video showcases a child's skill, educational growth, or talent. 
              We want to encourage learning and practice for all users.

              1. ALLOWED & ENCOURAGED (APPROVE):
                 - Football/Sports Skill: Dribbling, juggling, scoring, or training drills.
                 - Art & Creativity: Painting, drawing, crafting, or showing a finished artwork.
                 - Coding & Tech: Showing code on a screen, building robots, or explaining a project.
                 - Speech & Communication: Poetry, storytelling, reciting a speech (no hate speech).
                 - Education: Science, History, Math, Business, or Technology lessons.

              2. STRICTLY PROHIBITED (BAN):
                 - Sexual imagery, nudity, or suggestive behavior.
                 - Violence: War, realistic guns/weapons, explosions, or fighting.
                 - Audio/Speech: Insults, swearing (e.g., "fuck"), bullying, or hate speech.
                 - Discrimination: Content attacking race, religion, or nationality.

              3. UNRELATED CONTENT (REJECT):
                 - Random memes, trending dances without skill, or jokes with no educational value.

              CAPTION: "${caption}"
              OUTPUT: One word only (BAN, APPROVE, or REJECT).`
          }
        ]);

        const response = await result.response;
        const text = response.text();

        if (!text) {
          console.warn("🛡️ API Blocked response due to safety violation.");
          return { action: "BAN", reason: "Auto-detected restricted content." };
        }

        const verdict = text.toUpperCase().trim();
        console.log(`🤖 AI Verdict for ${path.basename(videoSource)}:`, verdict);

        if (verdict.includes("BAN")) return { action: "BAN", reason: "Safety Violation detected." };
        if (verdict.includes("APPROVE")) return { action: "APPROVE", category: "Skill/Education" };
        
        return { action: "REJECT", reason: "Content does not meet educational or skill criteria." };

      } catch (error) {
        // Handle Rate Limits (429) or Server Overload (503)
        if (error.message.includes("503") || error.message.includes("429")) {
          attempts++;
          const delay = Math.pow(2, attempts) * 1000;
          console.warn(`⚠️ Google API Busy. Retry ${attempts}/${maxAttempts}...`);
          await wait(delay);
          continue;
        }

        // Handle direct Safety Errors from the SDK
        if (error.message.includes("SAFETY")) {
          return { action: "BAN", reason: "Explicit content detected by system." };
        }

        throw error;
      }
    }
  } catch (globalError) {
    console.error("🚨 Moderation Service Error:", globalError.message);
    return { action: "REJECT", reason: "Internal moderation error." };
  }

  return { action: "REJECT", reason: "System busy. Please try again." };
};