import { Router } from "express";
import bcrypt from "bcryptjs";
import { body, validationResult } from "express-validator";
import User from "../models/User.js";
import { asyncHandler, ApiError } from "../utils/api-error.js";
import { generateUserId } from "../utils/user-id.js";
import { requireAuth, signToken } from "../middleware/auth.js";

const router = Router();
const validate = (req, _res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw new ApiError(400, errors.array()[0].msg);
  next();
};
const credentials = [
  body("name").optional().trim().isLength({ min: 2, max: 80 }).withMessage("Name must be 2-80 characters"),
  body("username").trim().matches(/^[a-zA-Z0-9_]{3,30}$/).withMessage("Username must be 3-30 letters, numbers, or underscores"),
  body("password").isLength({ min: 8, max: 128 }).withMessage("Password must be 8-128 characters")
];
function setCookie(res, token) {
  res.cookie("connectify_token", token, { httpOnly: true, sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", secure: process.env.NODE_ENV === "production", maxAge: 7 * 24 * 60 * 60 * 1000 });
}

router.post("/register", credentials.concat([body("confirmPassword").custom((value, { req }) => value === req.body.password).withMessage("Passwords do not match")]), validate, asyncHandler(async (req, res) => {
  const existing = await User.exists({ username: req.body.username.toLowerCase() });
  if (existing) throw new ApiError(409, "Username is already taken");
  const user = await User.create({ name: req.body.name, username: req.body.username, userId: await generateUserId(), password: await bcrypt.hash(req.body.password, 12) });
  const token = signToken(user._id.toString());
  setCookie(res, token);
  res.status(201).json({ success: true, message: "Account created", data: { user: user.publicProfile(), token } });
}));

router.post("/login", [body("userId").matches(/^CN-\d{6}$/i).withMessage("Enter a valid Connectify ID"), body("password").notEmpty().withMessage("Password is required")], validate, asyncHandler(async (req, res) => {
  const user = await User.findOne({ userId: req.body.userId.toUpperCase() }).select("+password");
  if (!user || !(await bcrypt.compare(req.body.password, user.password))) throw new ApiError(401, "Invalid Connectify ID or password");
  user.isOnline = true; await user.save();
  const token = signToken(user._id.toString());
  setCookie(res, token);
  res.json({ success: true, message: "Signed in", data: { user: user.publicProfile(), token } });
}));

router.post("/logout", requireAuth, asyncHandler(async (req, res) => { req.user.isOnline = false; req.user.lastSeen = new Date(); await req.user.save(); res.clearCookie("connectify_token"); res.json({ success: true, message: "Signed out", data: {} }); }));
router.get("/me", requireAuth, (req, res) => res.json({ success: true, message: "Session restored", data: { user: req.user.publicProfile() } }));
router.put("/profile", requireAuth, [body("name").optional().trim().isLength({ min: 2, max: 80 }), body("bio").optional().trim().isLength({ max: 240 })], validate, asyncHandler(async (req, res) => { if (req.body.name !== undefined) req.user.name = req.body.name; if (req.body.bio !== undefined) req.user.bio = req.body.bio; await req.user.save(); res.json({ success: true, message: "Profile updated", data: { user: req.user.publicProfile() } }); }));
router.put("/change-password", requireAuth, [body("currentPassword").notEmpty(), body("newPassword").isLength({ min: 8, max: 128 })], validate, asyncHandler(async (req, res) => { const user = await User.findById(req.user._id).select("+password"); if (!(await bcrypt.compare(req.body.currentPassword, user.password))) throw new ApiError(400, "Current password is incorrect"); user.password = await bcrypt.hash(req.body.newPassword, 12); await user.save(); res.json({ success: true, message: "Password changed", data: {} }); }));
export default router;
