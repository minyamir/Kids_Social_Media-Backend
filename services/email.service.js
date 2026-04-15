const axios = require("axios");

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL;

exports.sendWelcomeEmail = async (toEmail, username, otp) => {
  if (!BREVO_API_KEY) return console.error("❌ BREVO_API_KEY missing.");

  const isGoogleUser = otp === "GOOGLE_AUTH";
  const subject = isGoogleUser ? "Welcome to the Stadium! 🏟️" : "Unlock Your 3D Scholar Pass 🔑";

  // --- 3D Dynamic Content ---
  const verificationUI = isGoogleUser
    ? `<div style="background: linear-gradient(135deg, #00f2fe 0%, #4facfe 100%); color: #fff; padding: 15px 30px; border-radius: 50px; display: inline-block; font-weight: 900; font-size: 16px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 8px 20px rgba(79, 172, 254, 0.5); border: 2px solid #fff;">
         Verified via Google ⚡
       </div>`
    : `<div style="background: #ffffff; color: #0f172a; padding: 25px; border-radius: 20px; border: 5px solid #eab308; display: inline-block; box-shadow: 0 15px 0px #b48906, 0 15px 25px rgba(0,0,0,0.5);">
         <span style="font-size: 42px; font-weight: 900; letter-spacing: 15px; font-family: 'Courier New', monospace; text-shadow: 2px 2px 0px #ddd;">${otp}</span>
       </div>`;

  try {
    await axios.post("https://api.brevo.com/v3/smtp/email", {
      sender: { name: "Ethio-Excellence Academy", email: BREVO_SENDER_EMAIL },
      to: [{ email: toEmail, name: username }],
      subject: subject,
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #020617; font-family: 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="padding: 40px 10px;">
            <tr>
              <td align="center">
                
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background: #0f172a; border-radius: 40px; overflow: hidden; box-shadow: 0 30px 60px -12px rgba(0,0,0,0.7); border: 1px solid #1e293b;">
                  
                  <tr>
                    <td align="center" style="padding: 60px 40px; background: linear-gradient(160deg, #1e293b 0%, #0f172a 100%); border-bottom: 5px solid #eab308;">
                      
                      <div style="background: rgba(234, 179, 8, 0.1); color: #eab308; padding: 8px 20px; border-radius: 30px; font-size: 11px; font-weight: 800; letter-spacing: 3px; margin-bottom: 20px; display: inline-block; border: 1px solid rgba(234, 179, 8, 0.3);">OFFICIAL SCHOLAR ID</div>
                      
                      <h1 style="color: #ffffff; font-size: 38px; margin: 0; letter-spacing: -2px; font-weight: 900; text-shadow: 0 4px 10px rgba(0,0,0,0.5);">Ethio-Excellence</h1>
                      <p style="color: #eab308; font-weight: 700; font-size: 16px; margin-top: 5px; text-transform: uppercase; letter-spacing: 2px;">The Scholar Stadium 🏟️</p>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding: 50px 40px; background: #ffffff; text-align: center; border-radius: 40px 40px 0 0;">
                      <h2 style="color: #0f172a; font-size: 28px; margin-top: 0; font-weight: 800;">Yo, Scholar ${username}! 🇪🇹</h2>
                      <p style="color: #475569; font-size: 17px; line-height: 1.7; margin-bottom: 40px;">Welcome to the only safe space built for Ethiopian patriots. Level up your mind, learn our history, and build your future.</p>
                      
                      <div style="margin-bottom: 50px;">
                        ${verificationUI}
                      </div>

                      <hr style="border: 0; border-top: 2px solid #f1f5f9; margin: 40px 0;">

                      <div style="text-align: left;">
                        <p style="color: #94a3b8; font-weight: 800; font-size: 13px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 20px; text-align: center;">Unlock These Levels:</p>
                        
                        <div style="background: #f8fafc; padding: 25px; border-radius: 20px; margin-bottom: 15px; border: 1px solid #e2e8f0; box-shadow: 0 10px 0px #e2e8f0, 0 10px 20px rgba(0,0,0,0.05);">
                          <table width="100%" border="0" cellspacing="0" cellpadding="0">
                            <tr>
                              <td width="60" style="font-size: 40px;">🤖</td>
                              <td>
                                <h4 style="margin: 0 0 5px; color: #0f172a; font-size: 18px; font-weight: 800;">AI Strategist</h4>
                                <p style="margin: 0; font-size: 14px; color: #64748b; line-height: 1.5;">Master subjects in Amharic & Afan Oromo. Pure brainpower.</p>
                              </td>
                            </tr>
                          </table>
                        </div>

                        <div style="background: #f8fafc; padding: 25px; border-radius: 20px; margin-bottom: 15px; border: 1px solid #e2e8f0; box-shadow: 0 10px 0px #e2e8f0, 0 10px 20px rgba(0,0,0,0.05);">
                          <table width="100%" border="0" cellspacing="0" cellpadding="0">
                            <tr>
                              <td width="60" style="font-size: 40px;">🏛️</td>
                              <td>
                                <h4 style="margin: 0 0 5px; color: #0f172a; font-size: 18px; font-weight: 800;">Legacy & Pride</h4>
                                <p style="margin: 0; font-size: 14px; color: #64748b; line-height: 1.5;">Explore our 3,000-year history. No violence, just greatness.</p>
                              </td>
                            </tr>
                          </table>
                        </div>

                        <div style="background: #ecfdf5; padding: 15px; border-radius: 15px; border: 2px solid #10b981; margin-top: 25px; text-align: center;">
                           <p style="margin: 0; color: #065f46; font-size: 13px; font-weight: 700;">🛡️ ZERO TOLERANCE: Weapons, war, and bad vibes are instantly blocked.</p>
                        </div>
                      </div>

                      <div style="margin-top: 60px; margin-bottom: 20px;">
                        <a href="http://localhost:5173" style="background: #eab308; color: #000000; padding: 20px 50px; text-decoration: none; font-weight: 900; border-radius: 20px; display: inline-block; font-size: 18px; text-transform: uppercase; letter-spacing: 2px; box-shadow: 0 10px 0px #b48906, 0 10px 30px rgba(234, 179, 8, 0.5); border: 2px solid #fff;">Enter Stadium 🚀</a>
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding: 40px; background: #020617; text-align: center; color: #475569; font-size: 12px; border-top: 1px solid #1e293b;">
                      <p style="margin: 0 0 10px; font-weight: bold; color: #64748b;">Ethio-Excellence Academy © 2026</p>
                      <p style="margin: 0; line-height: 1.6;">Build your mind. Build your country.<br>Addis Ababa, Ethiopia</p>
                    </td>
                  </tr>
                </table>

              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    }, { headers: { "api-key": BREVO_API_KEY, "Content-Type": "application/json" } });
    console.log(`✨ 3D Deep-Dive email sent to: ${toEmail}`);
  } catch (err) { console.error("Email Error:", err.message); }
};

// Add this below your sendWelcomeEmail function in services/email.service.js
exports.sendNotificationEmail = async (toEmail, senderName, messageText) => {
  if (!BREVO_API_KEY) return;

  try {
    await axios.post("https://api.brevo.com/v3/smtp/email", {
      sender: { name: senderName, email: BREVO_SENDER_EMAIL },
      to: [{ email: toEmail }],
      subject: `new message from ${senderName}`, 
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: sans-serif; line-height: 1.5; color: #1a1a1a; padding: 20px; max-width: 500px; margin: 0 auto;">
          
          <p style="font-size: 16px; margin-bottom: 25px;">
            Hey Scholar, <strong>${senderName}</strong> sent you a message:
          </p>

          <div style="background-color: #0f172a; color: #ffffff; padding: 25px; border-radius: 15px; border-left: 5px solid #eab308; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
            <p style="margin: 0; font-style: italic; font-size: 15px; color: #cbd5e1;">
              "${messageText}"
            </p>
          </div>

          <p style="margin-top: 30px;">
            <a href="http://localhost:5173" style="background-color: #0f172a; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Reply in Stadium 🚀
            </a>
          </p>

          <footer style="margin-top: 50px; border-top: 1px solid #eee; padding-top: 15px; font-size: 11px; color: #999; text-align: center;">
            Ethio-Excellence Academy • Addis Ababa<br>
            <a href="#" style="color: #999;">Unsubscribe</a>
          </footer>

        </body>
        </html>
      `
    }, { headers: { "api-key": BREVO_API_KEY, "Content-Type": "application/json" } });
    console.log(`✅ Simple Primary notification sent to ${toEmail}`);
  } catch (err) {
    console.error("Simple Notification Error:", err.message);
  }
};