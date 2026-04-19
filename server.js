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
const User = require("./models/User");

const app = express();

// --- SOCKET.IO CONFIGURATION ---
const server = http.createServer(app); 
const io = new Server(server, {
  cors: {
    // 🔥 FIX: Removed trailing slash for production stability
    origin: ["http://localhost:5173", "https://kids-scoial-media.vercel.app"],
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ["websocket", "polling"]
});

app.set("socketio", io);

io.on("connection", (socket) => {
  console.log("⚡ New Connection:", socket.id);

  // --- 1. PRIVATE CHAT ROOMS ---
  socket.on("join_chat", (userId) => {
    socket.join(userId);
    socket.userId = userId; 
    console.log(`👤 User joined private room: ${userId}`);
  });

  // --- 2. LIVE VIDEO ROOM (The Stadium) ---
  socket.on("start_live", (userId) => {
    socket.join(`live_${userId}`);
    console.log(`🎥 Scholar ${userId} started a Live Stream`);
  });

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

  socket.on("join_live_room", (streamerId) => { 
    socket.join(`live_${streamerId}`);
    console.log(`👁️ Viewer joined room: live_${streamerId}`);
  });

  socket.on("send_live_comment", (data) => {
    const roomName = `live_${data.streamerId}`;
    const comment = {
      text: data.text,
      username: data.username,
      avatarUrl: data.avatarUrl,
      createdAt: new Date()
    };
    io.to(roomName).emit("new_live_comment", comment);
  });

  socket.on("stream_signal", (data) => {
    io.to(data.to).emit("receive_signal", {
      signal: data.signal,
      from: socket.id
    });
  });

  socket.on("disconnect", async () => {
    console.log("👋 User disconnected:", socket.id);
    if (socket.userId) {
        try {
            await User.findByIdAndUpdate(socket.userId, { isLive: false });
            io.to(`live_${socket.userId}`).emit("stream_ended");
            console.log(`📉 Scholar ${socket.userId} is now offline.`);
        } catch (err) {
            console.error("Error updating status:", err);
        }
    }
  });
});

// --- GLOBAL MIDDLEWARE ---
app.use(cors({
  origin: ["http://localhost:5173", "https://kids-scoial-media.vercel.app"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"] // 👈 Make sure this is here!
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// --- ROUTES ---
const authRoutes = require("./routes/auth.routes");
const interactionRoutes = require("./routes/interaction.routes");
const videoRoutes = require("./routes/video.routes");

app.use("/api/auth", authRoutes);
app.use("/api/interaction", interactionRoutes);
app.use("/api/videos", videoRoutes);

app.get("/", (req, res) => {
  res.send("Ethio-Scholar Academy Backend is running 🚀");
});

// --- DATABASE & SERVER START ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch(err => console.error("❌ MongoDB connection error:", err));