require('dotenv').config(); // MUST be at the very top
const { sendWelcomeEmail } = require("./services/email.service");

async function runTest() {
    console.log("🛠️ Starting Standalone Test...");
    
    // Test Case 1: Simulate a Google Login (The Advertisement version)
    console.log("\n--- Testing Google Auth Flow ---");
    await sendWelcomeEmail(
        "minegobeze@gmail.com", // 👈 Change this to your real email to check inbox
        "TestUser_Google", 
        "GOOGLE_AUTH"
    );

    // Test Case 2: Simulate a Normal Registration (The OTP version)
    console.log("\n--- Testing Standard OTP Flow ---");
    await sendWelcomeEmail(
        "minegobeze@gmail.com", // 👈 Change this to your real email
        "TestUser_Normal", 
        "123456"
    );

    console.log("\n✅ Test sequence finished. Check your terminal for logs and your Email inbox.");
}

runTest();