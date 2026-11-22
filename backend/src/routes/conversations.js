import { Router } from "express";
import mongoose from "mongoose";
import Conversation from "../models/Conversation.js";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";
import { ApiError, asyncHandler } from "../utils/api-error.js";

const router = Router();
function memberQuery(id) { return { participants: id }; }
router.get("/", requireAuth, asyncHandler(async (req, res) => { const conversations = await Conversation.find(memberQuery(req.user._id)).sort({ lastMessageAt: -1 }).populate("participants", "name username userId avatar bio isOnline lastSeen"); res.json({ success: true, message: "Conversations loaded", data: { conversations } }); }));
router.post("/", requireAuth, asyncHandler(async (req, res) => {
  const person = await User.findOne({ userId: String(req.body.userId || "").toUpperCase() });
  if (!person || person._id.equals(req.user._id)) throw new ApiError(404, "That person could not be found");
  let conversation = await Conversation.findOne({ type: "private", participants: { $all: [req.user._id, person._id] }, $expr: { $eq: [{ $size: "$participants" }, 2] } });
  if (!conversation) conversation = await Conversation.create({ participants: [req.user._id, person._id] });
  await conversation.populate("participants", "name username userId avatar bio isOnline lastSeen");
  res.status(201).json({ success: true, message: "Conversation ready", data: { conversation } });
}));
router.get("/:conversationId", requireAuth, asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.conversationId)) throw new ApiError(400, "Invalid conversation ID");
  const conversation = await Conversation.findOne({ _id: req.params.conversationId, ...memberQuery(req.user._id) }).populate("participants", "name username userId avatar bio isOnline lastSeen");
  if (!conversation) throw new ApiError(404, "Conversation not found");
  res.json({ success: true, message: "Conversation loaded", data: { conversation } });
}));
router.delete("/:conversationId", requireAuth, asyncHandler(async (req, res) => { const conversation = await Conversation.findOneAndUpdate({ _id: req.params.conversationId, ...memberQuery(req.user._id) }, { $addToSet: { archivedBy: req.user._id } }, { new: true }); if (!conversation) throw new ApiError(404, "Conversation not found"); res.json({ success: true, message: "Conversation archived", data: {} }); }));
export default router;
