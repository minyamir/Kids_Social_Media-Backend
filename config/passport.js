const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const generateOTP = require("../utils/generateOTP"); // Import your OTP utility
const { sendWelcomeEmail } = require("../services/email.service"); // Import your email service

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
          // Link googleId if it's an existing email user logging in via Google for the first time
          if (!user.googleId) {
            user.googleId = profile.id;
            await user.save();
          }
          return done(null, user);
        }

        // 2. Create a NEW UNVERIFIED user
        const baseUsername = profile.displayName.replace(/\s+/g, '').toLowerCase();
        const uniqueUsername = `${baseUsername}${Math.floor(1000 + Math.random() * 9000)}`;
        const otp = generateOTP(); // Generate the OTP for this new Google user

        user = await User.create({
          googleId: profile.id,
          username: uniqueUsername,
          email: userEmail,
          avatarUrl: profile.photos[0].value,
          isVerified: false, // 🚨 Set to FALSE to force OTP check
          otp: otp,          // 🚨 Store the OTP
          passwordHash: "google_oauth_" + Math.random().toString(36).slice(-10),
        });

        // 3. Send the OTP to their email
        await sendWelcomeEmail(userEmail, uniqueUsername, otp);

        return done(null, user);
      } catch (err) {
        console.error("❌ Error in Google Strategy:", err);
        return done(err, null);
      }
    }
  )
);
// ... keep serialize/deserialize as is ...
// Passport requires these, though JWT doesn't use sessions
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