import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { ApiError, asyncHandler } from "../utils/api-error.js";

function tokenFrom(req) {
  const header = req.headers.authorization;
  return req.cookies.connectify_token || (header?.startsWith("Bearer ") ? header.slice(7) : null);
}

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const token = tokenFrom(req);
  if (!token) throw new ApiError(401, "Authentication required");
  let payload;
  try { payload = jwt.verify(token, process.env.JWT_SECRET); } catch { throw new ApiError(401, "Session expired"); }
  const user = await User.findById(payload.sub);
  if (!user) throw new ApiError(401, "User no longer exists");
  req.user = user;
  next();
});

export function signToken(userId) {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not configured");
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
}
