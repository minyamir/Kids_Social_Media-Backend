import axios from "axios";

export const sendWelcomeEmail = async ({ toEmail, fullName }) => {
  console.log("Sending Academic Welcome to:", toEmail);

  if (!process.env.BREVO_API_KEY) {
    console.error("BREVO_API_KEY is missing!");
    return null;
  }

  try {
    const response = await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {
          name: process.env.BREVO_SENDER_NAME || "Ethio-Excellence",
          email: process.env.BREVO_SENDER_EMAIL
        },
        to: [{ email: toEmail, name: fullName }],
        subject: "Welcome to the Academy of Excellence 🎓",
        htmlContent: `
          <div style="margin:0;padding:24px;background:#000000;font-family:sans-serif;color:#ffffff;">
            <div style="max-width:600px;margin:0 auto;background:#121212;border-radius:16px;overflow:hidden;border:1px solid #333;">
              
              <div style="background:linear-gradient(135deg,#eab308 0%, #a855f7 100%);padding:40px;text-align:center;">
                <h1 style="margin:0;font-size:32px;letter-spacing:2px;color:#000;">EXCELLENCE</h1>
              </div>

              <div style="padding:40px; text-align:center;">
                <h2 style="color:#eab308;">Greetings, Scholar ${fullName}!</h2>
                <p style="font-size:16px;color:#ccc;line-height:1.6;">
                  Your journey towards academic excellence has officially begun. You now have access to our community of scholars and exclusive video content.
                </p>
                
                <div style="margin:30px 0; padding:20px; background:#1a1a1a; border-radius:12px; border:1px dashed #eab308;">
                  <p style="margin:0; color:#eab308; font-weight:bold;">Your Next Steps:</p>
                  <p style="color:#888; font-size:14px; margin-top:10px;">
                    • Complete your Scholar Profile<br>
                    • Share your first insight (Comment)<br>
                    • Upload your learning journey
                  </p>
                </div>
              </div>

              <div style="padding:20px;background:#0a0a0a;text-align:center;font-size:12px;color:#555;">
                Ethio-Excellence Academy • Connecting Scholars
              </div>
            </div>
          </div>
        `
      },
      {
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "Content-Type": "application/json"
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error("Brevo Error:", error.response?.data || error.message);
    return null;
  }
};