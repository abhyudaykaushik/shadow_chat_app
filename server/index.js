import express from "express";
import http from "http";
import { Server } from "socket.io";
import authRoutes from "./routes/auth.js";
import { pool } from "./db.js";
import cors from "cors";

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());
app.use("/auth", authRoutes);

let onlineUsers = {};      
let socketUserMap = {};  
let waitingUsers = [];
let activeChats = {}; 

const broadcastOnlineCount = () => {
  const count = Object.keys(onlineUsers).length;
  io.emit('onlineUsersCount', count);
};

const cleanupActiveChat = (socketId) => {
    const partnerSocketId = activeChats[socketId];
    if (partnerSocketId) {
        io.to(partnerSocketId).emit("chatEnded");
        delete activeChats[partnerSocketId];
        delete activeChats[socketId];
    }
};

// --- MATCHING LOGIC POORI TARAH SE THEEK KI GAYI HAI ---
const findPartnerFor = async (currentUser) => {
    console.log(`[Match] User ${currentUser.userId} partner dhoondh raha hai. Preference: ${currentUser.preference}`);
    
    // Waiting list mein compatible partner dhoondho
    const partnerIndex = waitingUsers.findIndex(waitingUser => {
        const isDifferentUser = currentUser.userId !== waitingUser.userId;
        const theyWantMyGender = waitingUser.preference === 'any' || waitingUser.preference === currentUser.gender;
        const iWantTheirGender = currentUser.preference === 'any' || currentUser.preference === waitingUser.gender;
        return isDifferentUser && theyWantMyGender && iWantTheirGender;
    });

    if (partnerIndex > -1) {
        // Match mil gaya!
        const matchedUser = waitingUsers.splice(partnerIndex, 1)[0];
        const socket1 = onlineUsers[currentUser.userId];
        const socket2 = onlineUsers[matchedUser.userId];

        if (socket1 && socket2) {
            try {
                const user1Data = await pool.query("SELECT username FROM users WHERE google_uid = $1", [currentUser.userId]);
                const user2Data = await pool.query("SELECT username FROM users WHERE google_uid = $1", [matchedUser.userId]);
                const user1Username = user1Data.rows[0]?.username || 'Stranger';
                const user2Username = user2Data.rows[0]?.username || 'Stranger';

                activeChats[socket1] = socket2;
                activeChats[socket2] = socket1;
                
                console.log(`[MATCH SUCCESS] ${user1Username} <-> ${user2Username}`);

                io.to(socket1).emit("matchFound", { partnerUsername: user2Username });
                io.to(socket2).emit("matchFound", { partnerUsername: user1Username });
            } catch (err) { console.error("DB error on match:", err); }
        }
    } else {
        // --- YAHAN BADLAAV HUA HAI ---
        // Match nahi mila, to waiting list me add kar do (pehle purana entry hata do)
        waitingUsers = waitingUsers.filter(u => u.userId !== currentUser.userId);
        waitingUsers.push(currentUser);
        console.log("Updated Waiting list:", waitingUsers);
    }
}

io.on("connection", (socket) => {
  socket.on("userOnline", (userId) => {
    onlineUsers[userId] = socket.id;
    socketUserMap[socket.id] = userId;
    broadcastOnlineCount();
  });

  socket.on("findMatch", (userData) => {
    findPartnerFor(userData);
  });
  
  socket.on("requestNextPartner", (userData) => {
    cleanupActiveChat(socket.id);
    findPartnerFor(userData);
  });

  socket.on("stopChat", () => {
    cleanupActiveChat(socket.id);
    socket.emit("chatEnded");
  });
  
  socket.on("sendMessage", async ({ message }) => {
     const receiverSocketId = activeChats[socket.id];
     if (receiverSocketId) {
       io.to(receiverSocketId).emit("receiveMessage", { message });
     }
  });

  socket.on("disconnect", () => {
    const disconnectedUserId = socketUserMap[socket.id];
    cleanupActiveChat(socket.id);
    if (disconnectedUserId) {
        if (onlineUsers[disconnectedUserId] === socket.id) {
            delete onlineUsers[disconnectedUserId];
            broadcastOnlineCount();
        }
        delete socketUserMap[socket.id];
        waitingUsers = waitingUsers.filter(u => u.userId !== disconnectedUserId);
    }
  });
});

server.listen(4000, () => console.log("Server port 4000 par chal raha hai"));