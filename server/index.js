import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import { pool } from "./db.js";

// ✅ Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);

// ✅ CORS Origin (for frontend)
const FRONTEND_ORIGIN = process.env.CORS_ORIGIN || "https://your-frontend.netlify.app";

// ✅ Socket.IO Setup
const io = new Server(server, {
  cors: {
    origin: FRONTEND_ORIGIN,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// ✅ Middlewares
app.use(helmet());
app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    methods: ["GET", "POST"],
    credentials: true,
  })
);
app.use(express.json());

// ✅ Routes
app.use("/auth", authRoutes);

// --- GLOBAL VARIABLES ---
let onlineUsers = {};
let socketUserMap = {};
let waitingUsers = [];
let activeChats = {};

// ✅ Helper: Broadcast total online users
const broadcastOnlineCount = () => {
  const count = Object.keys(onlineUsers).length;
  io.emit("onlineUsersCount", count);
};

// ✅ Helper: Cleanup active chat when one user leaves
const cleanupActiveChat = (socketId) => {
  const partnerSocketId = activeChats[socketId];
  if (partnerSocketId) {
    io.to(partnerSocketId).emit("chatEnded");
    delete activeChats[partnerSocketId];
    delete activeChats[socketId];
  }
};

// ✅ Matching Logic
const findPartnerFor = async (currentUser) => {
  console.log(`[Match] ${currentUser.userId} looking for partner. Preference: ${currentUser.preference}`);

  const partnerIndex = waitingUsers.findIndex((waitingUser) => {
    const isDifferentUser = currentUser.userId !== waitingUser.userId;
    const theyWantMyGender =
      waitingUser.preference === "any" || waitingUser.preference === currentUser.gender;
    const iWantTheirGender =
      currentUser.preference === "any" || currentUser.preference === waitingUser.gender;
    return isDifferentUser && theyWantMyGender && iWantTheirGender;
  });

  if (partnerIndex > -1) {
    const matchedUser = waitingUsers.splice(partnerIndex, 1)[0];
    const socket1 = onlineUsers[currentUser.userId];
    const socket2 = onlineUsers[matchedUser.userId];

    if (socket1 && socket2) {
      try {
        const user1Data = await pool.query("SELECT username FROM users WHERE google_uid = $1", [
          currentUser.userId,
        ]);
        const user2Data = await pool.query("SELECT username FROM users WHERE google_uid = $1", [
          matchedUser.userId,
        ]);

        const user1Username = user1Data.rows[0]?.username || "Stranger";
        const user2Username = user2Data.rows[0]?.username || "Stranger";

        activeChats[socket1] = socket2;
        activeChats[socket2] = socket1;

        console.log(`[MATCH SUCCESS] ${user1Username} ↔ ${user2Username}`);

        io.to(socket1).emit("matchFound", { partnerUsername: user2Username });
        io.to(socket2).emit("matchFound", { partnerUsername: user1Username });
      } catch (err) {
        console.error("DB error during match:", err);
      }
    }
  } else {
    // No partner available yet → Add to waiting queue
    waitingUsers = waitingUsers.filter((u) => u.userId !== currentUser.userId);
    waitingUsers.push(currentUser);
    console.log("Waiting list updated:", waitingUsers.length);
  }
};

// ✅ Socket.io Events
io.on("connection", (socket) => {
  console.log("✅ New user connected:", socket.id);

  // When user comes online
  socket.on("userOnline", (userId) => {
    onlineUsers[userId] = socket.id;
    socketUserMap[socket.id] = userId;
    broadcastOnlineCount();
  });

  // Match request
  socket.on("findMatch", (userData) => {
    findPartnerFor(userData);
  });

  // Next partner request
  socket.on("requestNextPartner", (userData) => {
    cleanupActiveChat(socket.id);
    findPartnerFor(userData);
  });

  // Stop chat manually
  socket.on("stopChat", () => {
    cleanupActiveChat(socket.id);
    socket.emit("chatEnded");
  });

  // Messaging between matched users
  socket.on("sendMessage", ({ message }) => {
    const receiverSocketId = activeChats[socket.id];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("receiveMessage", { message });
    }
  });

  // Disconnect handler
  socket.on("disconnect", () => {
    const disconnectedUserId = socketUserMap[socket.id];
    cleanupActiveChat(socket.id);

    if (disconnectedUserId) {
      if (onlineUsers[disconnectedUserId] === socket.id) {
        delete onlineUsers[disconnectedUserId];
        broadcastOnlineCount();
      }
      delete socketUserMap[socket.id];
      waitingUsers = waitingUsers.filter((u) => u.userId !== disconnectedUserId);
    }

    console.log("❌ User disconnected:", socket.id);
  });

  // Socket-level error handling
  socket.on("error", (err) => {
    console.error("Socket error:", err);
  });
});

// ✅ Global Error Handler
app.use((err, req, res, next) => {
  console.error("Server Error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

// ✅ Start Server (Render compatible)
const PORT = process.env.PORT || 4000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || "development"} mode`);
});
