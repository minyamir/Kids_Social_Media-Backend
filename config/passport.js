const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "https://kids-social-media-backend.onrender.com/api/auth/google/callback",
      passReqToCallback: true
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        const userEmail = profile.emails[0].value;
        let user = await User.findOne({ 
          $or: [{ googleId: profile.id }, { email: userEmail }] 
        });

        if (user) {
          // Returning user: Just update and move on
          user.googleId = profile.id;
          user.isVerified = true; 
          await user.save();
          return done(null, user);
        }

        // --- NEW USER ROBUST USERNAME LOGIC ---
        // 1. Try DisplayName, fallback to email prefix, fallback to 'scholar'
        const rawName = profile.displayName || userEmail.split('@')[0] || 'scholar';
        
        // 2. Remove all non-alphanumeric characters to avoid empty strings
        const baseUsername = rawName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'scholar';
        
        // 3. Append random digits to satisfy the "unique" and "required" constraints
        const uniqueUsername = `${baseUsername}${Math.floor(1000 + Math.random() * 9000)}`;

        user = await User.create({
          googleId: profile.id,
          username: uniqueUsername,
          email: userEmail,
          avatarUrl: profile.photos && profile.photos[0] ? profile.photos[0].value : "",
          isVerified: true,
        });

        // 🚀 Send email only for the NEW user
        try {
            const { sendWelcomeEmail } = require('../services/email.service');
            // We don't await this so the user isn't stuck waiting for the email to send
            sendWelcomeEmail(userEmail, uniqueUsername, "GOOGLE_AUTH");
        } catch (emailErr) {
            console.error("Email failed but user was created:", emailErr.message);
        }

        return done(null, user);
      } catch (err) {
        console.error("Critical Google Strategy Error:", err);
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;