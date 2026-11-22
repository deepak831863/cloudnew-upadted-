import { Router } from "express";
import User from "../models/User.js";
import { asyncHandler, ApiError } from "../utils/api-error.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.get("/search/:userId", requireAuth, asyncHandler(async (req, res) => {
  const user = await User.findOne({ userId: req.params.userId.toUpperCase() });
  if (!user) throw new ApiError(404, "No user found. Check the Connectify ID and try again.");
  res.json({ success: true, message: "User found", data: { user: user.publicProfile() } });
}));
router.get("/profile/:userId", requireAuth, asyncHandler(async (req, res) => {
  const user = await User.findOne({ userId: req.params.userId.toUpperCase() });
  if (!user) throw new ApiError(404, "User not found");
  res.json({ success: true, message: "Profile found", data: { user: user.publicProfile() } });
}));
export default router;
