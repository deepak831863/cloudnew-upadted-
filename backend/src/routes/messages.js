import { Router } from "express";
import mongoose from "mongoose";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import { requireAuth } from "../middleware/auth.js";
import { ApiError, asyncHandler } from "../utils/api-error.js";

const router = Router();
async function memberConversation(id, userId) { return Conversation.findOne({ _id: id, participants: userId }); }
router.get("/:conversationId", requireAuth, asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.conversationId)) throw new ApiError(404, "Conversation not found");
  const conversation = await memberConversation(req.params.conversationId, req.user._id);
  if (!conversation) throw new ApiError(404, "Conversation not found");
  const limit = Math.min(Number(req.query.limit) || 30, 100);
  const query = { conversationId: conversation._id };
  if (req.query.before && mongoose.isValidObjectId(req.query.before)) query._id = { $lt: req.query.before };
  const messages = await Message.find(query).sort({ createdAt: -1 }).limit(limit).populate("sender", "name username userId avatar");
  res.json({ success: true, message: "Messages loaded", data: { messages: messages.reverse() } });
}));
router.post("/:conversationId", requireAuth, asyncHandler(async (req, res) => {
  const conversation = await memberConversation(req.params.conversationId, req.user._id);
  const content = String(req.body.content || "").trim();
  if (!conversation) throw new ApiError(404, "Conversation not found");
  if (!content || content.length > 4000) throw new ApiError(400, "Message must be 1-4000 characters");
  const recipient = conversation.participants.find((id) => !id.equals(req.user._id));
  const message = await Message.create({ conversationId: conversation._id, sender: req.user._id, content, deliveredTo: [req.user._id] });
  conversation.lastMessage = content; conversation.lastMessageAt = message.createdAt; await conversation.save();
  await message.populate("sender", "name username userId avatar");
  res.status(201).json({ success: true, message: "Message sent", data: { message, recipientId: recipient } });
}));
router.delete("/:messageId", requireAuth, asyncHandler(async (req, res) => { const message = await Message.findOne({ _id: req.params.messageId, sender: req.user._id }); if (!message) throw new ApiError(404, "Message not found"); message.deletedForEveryone = true; message.content = "Message deleted"; await message.save(); res.json({ success: true, message: "Message deleted", data: { message } }); }));
export default router;
