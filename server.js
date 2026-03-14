import express from "express";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import cors from "cors";

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());

let activeUsers = new Set();

// Track connected users
io.on("connection", (socket) => {
  activeUsers.add(socket.id);
  const count = activeUsers.size;

  console.log(`✓ User connected: ${socket.id} (Total: ${count})`);

  // Broadcast new count to all clients
  io.emit("userCount", count);

  socket.on("disconnect", () => {
    activeUsers.delete(socket.id);
    const newCount = activeUsers.size;
    console.log(`✗ User disconnected: ${socket.id} (Total: ${newCount})`);
    io.emit("userCount", newCount);
  });
});

// REST endpoint for initial count
app.get("/api/user-count", (req, res) => {
  res.json({ count: activeUsers.size });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`\n🚀 Session server running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket ready for clients\n`);
});
