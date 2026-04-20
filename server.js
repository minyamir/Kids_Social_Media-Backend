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
const server = http.createServer(app); 

// --- SOCKET.IO CONFIGURATION ---
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "https://kids-scoial-media.vercel.app"],
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ["websocket", "polling"]
});

app.set("socketio", io);

// --- STADIUM STATE TRACKER ---
// Stores which socket IDs are in which live room
const usersInRooms = {}; 

io.on("connection", (socket) => {
  console.log("⚡ New Connection:", socket.id);

  // --- 1. PRIVATE CHAT ROOMS ---
  socket.on("join_chat", (userId) => {
    socket.join(userId);
    socket.userId = userId; 
    console.log(`👤 User joined private room: ${userId}`);
  });

  // --- 2. LIVE STADIUM (FULL MESH VIDEO LOGIC) ---
  socket.on("join_stadium", (streamerId) => {
    const roomName = `live_${streamerId}`;
    
    // Track the user in the room
    if (usersInRooms[roomName]) {
        usersInRooms[roomName].push(socket.id);
    } else {
        usersInRooms[roomName] = [socket.id];
    }
    
    socket.join(roomName);
    console.log(`🏟️ User ${socket.id} joined stadium: ${roomName}`);

    // Get list of everyone ELSE currently in the room
    const otherUsers = usersInRooms[roomName].filter(id => id !== socket.id);
    
    // Tell the new user who they need to connect to
    socket.emit("all_users", otherUsers);
  });

  // Relay signals from Initiator to Receiver
  socket.on("sending_signal", payload => {
    io.to(payload.userToSignal).emit('user_joined_stadium', { 
        signal: payload.signal, 
        callerId: payload.callerId 
    });
  });

  // Relay signals from Receiver back to Initiator
  socket.on("returning_signal", payload => {
    io.to(payload.targetId).emit('receiving_returned_signal', { 
        signal: payload.signal, 
        id: socket.id 
    });
  });

  // --- 3. LIVE GROUP CHAT LOGIC ---
  socket.on("send_live_comment", (data) => {
    const roomName = `live_${data.streamerId}`;
    const comment = {
      text: data.text,
      username: data.username,
      avatarUrl: data.avatarUrl,
      createdAt: new Date()
    };
    // Broadcast comment to everyone in the specific live room
    io.to(roomName).emit("new_live_comment", comment);
  });

  // --- 4. DISCONNECT & CLEANUP ---
  socket.on("disconnect", async () => {
    console.log("👋 User disconnected:", socket.id);
    
    // Remove user from the stadium tracker
    for (const roomName in usersInRooms) {
      if (usersInRooms[roomName].includes(socket.id)) {
          usersInRooms[roomName] = usersInRooms[roomName].filter(id => id !== socket.id);
          // Tell others in the room to remove this user's video feed
          socket.to(roomName).emit("user_left", socket.id);
      }
    }

    // Update database if the Boss/Host disconnects
    if (socket.userId) {
        try {
            await User.findByIdAndUpdate(socket.userId, { isLive: false });
            io.to(`live_${socket.userId}`).emit("stream_ended");
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
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// --- ROUTES ---
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/interaction", require("./routes/interaction.routes"));
app.use("/api/videos", require("./routes/video.routes"));

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