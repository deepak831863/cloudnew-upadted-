import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";

export function registerSocketHandlers(io) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Authentication required"));
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(payload.sub);
      if (!user) return next(new Error("User not found"));
      socket.user = user;
      next();
    } catch { next(new Error("Invalid socket session")); }
  });
  io.on("connection", (socket) => {
    socket.join(`user:${socket.user._id}`);
    socket.user.isOnline = true; socket.user.save();
    socket.on("join_conversation", async (conversationId, callback = () => {}) => {
      const conversation = await Conversation.findOne({ _id: conversationId, participants: socket.user._id });
      if (!conversation) return callback({ success: false, message: "Not a conversation member" });
      socket.join(`conversation:${conversationId}`); callback({ success: true });
    });
    socket.on("send_message", async ({ conversationId, content }, callback = () => {}) => {
      const conversation = await Conversation.findOne({ _id: conversationId, participants: socket.user._id });
      const text = String(content || "").trim();
      if (!conversation || !text || text.length > 4000) return callback({ success: false, message: "Message could not be sent" });
      const message = await Message.create({ conversationId, sender: socket.user._id, content: text, deliveredTo: [socket.user._id] });
      conversation.lastMessage = text; conversation.lastMessageAt = message.createdAt; await conversation.save();
      await message.populate("sender", "name username userId avatar");
      io.to(`conversation:${conversationId}`).emit("receive_message", message);
      callback({ success: true, message });
    });
    socket.on("typing", ({ conversationId }) => socket.to(`conversation:${conversationId}`).emit("user_typing", { userId: socket.user._id }));
    socket.on("stop_typing", ({ conversationId }) => socket.to(`conversation:${conversationId}`).emit("user_stop_typing", { userId: socket.user._id }));
    socket.on("disconnect", async () => { socket.user.isOnline = false; socket.user.lastSeen = new Date(); await socket.user.save(); });
  });
}
