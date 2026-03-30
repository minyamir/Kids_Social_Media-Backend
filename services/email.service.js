const transporter = require("../config/email");
const { EMAIL_USER, ADMIN_EMAIL } = require("../config/dotenv");

// Send Welcome Email to User and Notify Admin
const sendWelcomeEmail = async (userEmail, username, otp) => {
  try {
    // Email for the user
    const htmlUser = `
      <div style="font-family:Arial,sans-serif;color:#333;">
        <h2>🎉 Welcome to Mini Social!</h2>
        <p>Hello <strong>${username}</strong>,</p>
        <p>Thank you for joining our community! Your OTP is: <strong>${otp}</strong></p>
        <p>Enjoy sharing culture, patriotism, and hard work content! 💪</p>
        <img src="https://i.ibb.co/ykF4z6x/culture.png" alt="culture" style="width:300px;"/>
      </div>
    `;

    await transporter.sendMail({
      from: EMAIL_USER,
      to: userEmail,
      subject: "Welcome to Mini Social 🌟",
      html: htmlUser,
    });

    // Notify admin about new user
    const htmlAdmin = `
      <h3>New User Registered!</h3>
      <p>Name: ${username}</p>
      <p>Email: ${userEmail}</p>
    `;

    await transporter.sendMail({
      from: EMAIL_USER,
      to: ADMIN_EMAIL,
      subject: "🚀 New User Registered",
      html: htmlAdmin,
    });

  } catch (err) {
    console.error("Error sending welcome email:", err);
    throw err;
  }
};

// Send Password Reset Email ONLY to User
const sendResetPasswordEmail = async (userEmail, username, resetLink) => {
  try {
    const html = `
      <div style="font-family:Arial,sans-serif;color:#333;">
        <h2>🔒 Password Reset Request</h2>
        <p>Hello <strong>${username}</strong>,</p>
        <p>Click the link below to reset your password:</p>
        <a href="${resetLink}" style="display:inline-block;padding:10px 20px;background:#4CAF50;color:white;border-radius:5px;text-decoration:none;">Reset Password</a>
        <p>If you didn’t request this, ignore this email.</p>
      </div>
    `;

    await transporter.sendMail({
      from: EMAIL_USER,
      to: userEmail,
      subject: "🔒 Reset Your Password",
      html,
    });
  } catch (err) {
    console.error("Error sending reset password email:", err);
    throw err;
  }
};
const sendNotificationEmail = async (
  toEmail,
  actionUserName,
  actionType,
  videoCaption,
  extraText = null // <-- comment text or extra message
) => {
  try {
    const html = `
      <div style="font-family:Arial,sans-serif;color:#333;">
        <h3>📢 New activity on your video</h3>

        <p>
          <strong>${actionUserName}</strong> ${actionType} your video.
        </p>

        ${
          extraText
            ? `<p><strong>Message:</strong> "${extraText}"</p>`
            : ""
        }

        <p><strong>Video:</strong> "${videoCaption}"</p>
      </div>
    `;

    await transporter.sendMail({
      from: EMAIL_USER,
      to: toEmail,
      subject: "New interaction on your video",
      html,
    });
  } catch (err) {
    console.error("Error sending notification email:", err);
  }
};


module.exports = { sendWelcomeEmail, sendResetPasswordEmail, sendNotificationEmail };
