import dotenv from "dotenv";
import http from "node:http";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { Server } from "socket.io";
import { connectDatabase } from "./src/utils/database.js";
import { errorHandler } from "./src/middleware/error.js";
import authRoutes from "./src/routes/auth.js";
import userRoutes from "./src/routes/users.js";
import conversationRoutes from "./src/routes/conversations.js";
import messageRoutes from "./src/routes/messages.js";
import { registerSocketHandlers } from "./src/sockets/chat.js";

dotenv.config({ path: process.env.CONNECTIFY_ENV_FILE || ".env" });

const app = express();
const server = http.createServer(app);
const configuredOrigin = process.env.CLIENT_ORIGIN || "";
const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://localhost:8080",
  "https://app-puce-six-90.vercel.app",
  "https://app-7kzbtdgo5-deepak-kushwahas-projects-eed03bde.vercel.app",
  configuredOrigin,
].filter(Boolean));
function socketOrigin(origin, callback) {
  if (!origin || allowedOrigins.has(origin) || origin.endsWith(".vercel.app")) callback(null, true);
  else callback(new Error("Origin is not allowed"));
}
const io = new Server(server, { cors: { origin: socketOrigin, credentials: true } });

app.use(helmet());
app.use(cors({
  credentials: true,
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin) || origin.endsWith(".vercel.app")) {
      callback(null, true);
    } else {
      callback(new Error("Origin is not allowed"));
    }
  },
}));
app.use(express.json({ limit: "32kb" }));
app.use(cookieParser());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: "draft-7", legacyHeaders: false }));
app.get("/health", (_req, res) => res.json({ success: true, message: "Connectify API is healthy", data: { uptime: process.uptime() } }));
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/conversations", conversationRoutes);
app.use("/api/v1/messages", messageRoutes);
app.use(errorHandler);

registerSocketHandlers(io);

const port = Number(process.env.PORT || 5000);
if (process.env.NODE_ENV !== "test") {
  connectDatabase().then(() => server.listen(port, "0.0.0.0", () => console.log(`Connectify API listening on 0.0.0.0:${port}`))).catch((error) => {
    console.error("Unable to start Connectify API:", error.message);
    process.exitCode = 1;
  });
}

export { app, server };
