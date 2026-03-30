// backend/services/ai.service.js
const axios = require('axios');

exports.checkScholarGuidelines = async (videoUrl, caption) => {
  // In a real app, you send the videoUrl to an AI API here.
  // Let's simulate what the AI tells us:
  
  const forbiddenWarWords = ["war", "tank", "gun", "kill", "army"];
  const forbiddenSexualWords = ["sexy", "nude", "love", "kiss"];
  const scholarPillars = ["science", "math", "business", "physics", "national", "study"];

  const text = caption.toLowerCase();

  // 1. Check for BAN offenses (War / Sex)
  const containsWar = forbiddenWarWords.some(word => text.includes(word));
  const containsSexual = forbiddenSexualWords.some(word => text.includes(word));

  if (containsWar || containsSexual) return "BAN";

  // 2. Check for PILLAR match (Is it actually educational?)
  const isEducational = scholarPillars.some(word => text.includes(word));
  if (isEducational) return "ALLOW";

  // 3. Otherwise, it's just "junk" (like love songs or random vlogs)
  return "REJECT";
};