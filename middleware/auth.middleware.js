const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/dotenv");
const User = require("../models/User");

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ msg: "No token provided, access denied" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Fetch user and attach to request
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ msg: "User no longer exists" });
    }

    // 🛡️ SCHOLAR GUARD: Check if the user is banned
    if (user.isBanned) {
      return res.status(403).json({ 
        msg: "Your account is permanently banned for violating Scholar rules (War/Sex/Rude)." 
      });
    }

    // Attach user object to the request
    req.user = user;
    next();
  } catch (err) {
    console.error("Auth Middleware Error:", err.name);
    
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ msg: "Session expired, please login again" });
    }
    
    return res.status(401).json({ msg: "Authentication failed" });
  }
};

module.exports = authMiddleware;