// 1. Force IPv4 (Place this at the VERY top)
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first'); 

require('dotenv').config();
const { GoogleGenAI } = require("@google/genai");

async function testConnection() {
  // 2. Initialize with a custom timeout signal
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  try {
    console.log("🔄 Connecting to Gemini 3 Flash (Forced IPv4)...");
    
    // We use AbortSignal to prevent "Fetch Failed" from hanging
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts: [{ text: "Are you online?" }] }],
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    console.log("✅ Success:", response.text);
  } catch (e) {
    console.error("❌ Connection Failed!");
    console.error("Error Detail:", e.message);
    
    if (e.message.includes("fetch failed")) {
      console.log("\n💡 ISP/NETWORK DETECTED:");
      console.log("Your local network is blocking the Google API handshake.");
      console.log("Try running this: export NODE_OPTIONS='--network-family-autoselection-attempt-timeout=500'");
    }
  }
}

testConnection();