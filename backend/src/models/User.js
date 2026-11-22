import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  username: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^[a-z0-9_]{3,30}$/ },
  userId: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true, select: false },
  avatar: { type: String, default: "" },
  bio: { type: String, default: "", maxlength: 240 },
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now }
}, { timestamps: true });

userSchema.methods.publicProfile = function publicProfile() {
  return { id: this._id, name: this.name, username: this.username, userId: this.userId, avatar: this.avatar, bio: this.bio, isOnline: this.isOnline, lastSeen: this.lastSeen, createdAt: this.createdAt };
};

export default mongoose.model("User", userSchema);
