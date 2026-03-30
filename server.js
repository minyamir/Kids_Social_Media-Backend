const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
const dotenv = require("dotenv");
const passport = require("passport");
const http = require("http"); 
const { Server } = require("socket.io"); 

dotenv.config();
require("./config/passport"); 

const app = express();

// --- SOCKET.IO CONFIGURATION ---
const server = http.createServer(app); 
const io = require("socket.io")(server, {
  cors: {
    origin: "http://localhost:5173", // Your frontend URL
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ["websocket", "polling"] // Allow fallback to polling if WS fails
});

app.set("socketio", io);

io.on("connection", (socket) => {
  console.log("⚡ New Connection:", socket.id);

  // --- 1. PRIVATE CHAT ROOMS ---
  socket.on("join_chat", (userId) => {
    socket.join(userId);
    // Keep track of which user owns this socket for disconnect logic
    socket.userId = userId; 
    console.log(`👤 User joined private room: ${userId}`);
  });

  // --- 2. LIVE VIDEO ROOM (The Stadium) ---
  socket.on("start_live", (userId) => {
    socket.join(`live_${userId}`);
    console.log(`🎥 Scholar ${userId} started a Live Stream`);
  });

// server.js
socket.on("sending_signal", payload => {
    io.to(`live_${payload.streamerId}`).emit('user_joined', { 
        signal: payload.signal, 
        callerId: payload.callerId 
    });
});

socket.on("returning_signal", payload => {
    io.to(payload.callerId).emit('receiving_returned_signal', { 
        signal: payload.signal, 
        id: socket.id 
    });
});
  socket.on("disconnect", async () => {
    console.log("👋 User disconnected:", socket.id);
    
    if (socket.userId) {
        try {
            // This updates the DB so the Scholar disappears from the Live Stadium
            await User.findByIdAndUpdate(socket.userId, { isLive: false });
            console.log(`📉 Scholar ${socket.userId} is now offline.`);
            
            // Notify viewers so their screen can show "Stream Ended"
            io.to(`live_${socket.userId}`).emit("stream_ended");
        } catch (err) {
            console.error("Error updating live status on disconnect:", err);
        }
    }
});

 // Inside io.on("connection", (socket) => { ...

// Change "join_live_stream" to "join_live_room"
// Change this in server.js to match your frontend emit
socket.on("join_live_room", (streamerId) => { 
  socket.join(`live_${streamerId}`);
  console.log(`👁️ Viewer joined room: live_${streamerId}`);
});

socket.on("send_live_comment", (data) => {
  const roomName = `live_${data.streamerId}`; // MUST match start_live/join_live_room
  
  const comment = {
    text: data.text,
    username: data.username,
    avatarUrl: data.avatarUrl,
    createdAt: new Date()
  };
  
  console.log(`💬 Broadcasting to ${roomName}: ${data.text}`);
  
  // Use io.to() to send to EVERYONE in the room including the sender
  io.to(roomName).emit("new_live_comment", comment);
});
  // This is how the streamer sends their camera data to the viewers
  socket.on("stream_signal", (data) => {
    // data.to is the target viewer, data.signal is the video data
    io.to(data.to).emit("receive_signal", {
      signal: data.signal,
      from: socket.id
    });
  });

  socket.on("disconnect", async () => {
    console.log("👋 User disconnected");
    // Optionally update DB to say user is no longer live/online
  });
});
// --- GLOBAL MIDDLEWARE ---
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));
app.use(express.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// --- 6. ROUTE IMPORTS (THIS WAS THE MISSING PART) ---
const authRoutes = require("./routes/auth.routes");
const interactionRoutes = require("./routes/interaction.routes");
const videoRoutes = require("./routes/video.routes");

// --- 7. ROUTE DECLARATIONS ---
app.use("/api/auth", authRoutes);
app.use("/api/interaction", interactionRoutes);
app.use("/api/videos", videoRoutes);

// --- HEALTH CHECK ---
app.get("/", (req, res) => {
  res.send("Mini Social Backend is running 🚀");
});

// --- DATABASE & SERVER START ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch(err => console.error("❌ MongoDB connection error:", err));