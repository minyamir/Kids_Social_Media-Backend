const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:5000/api/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const userEmail = profile.emails[0].value;
        
        // 1. Check if user already exists
        let user = await User.findOne({ 
          $or: [{ googleId: profile.id }, { email: userEmail }] 
        });

        if (user) {
          // ✅ Link googleId if missing and FORCE verify
          user.googleId = profile.id;
          user.isVerified = true; 
          await user.save();
          return done(null, user);
        }

        // 2. Create a NEW user who is ALREADY VERIFIED
        const baseUsername = profile.displayName.replace(/\s+/g, '').toLowerCase();
        const uniqueUsername = `${baseUsername}${Math.floor(1000 + Math.random() * 9000)}`;

        user = await User.create({
          googleId: profile.id,
          username: uniqueUsername,
          email: userEmail,
          avatarUrl: profile.photos[0].value,
          isVerified: true,  // 🚀 Set to TRUE - no OTP needed
          status: "active",  // Ensure they are active
          // No OTP needed here
        });

        // 3. Optional: Send a Welcome Email (without an OTP)
        // await sendNormalWelcomeEmail(userEmail, uniqueUsername);

        return done(null, user);
      } catch (err) {
        console.error("❌ Error in Google Strategy:", err);
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