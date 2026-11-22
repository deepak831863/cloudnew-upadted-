import { randomInt } from "node:crypto";
import User from "../models/User.js";

export async function generateUserId() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = `CN-${randomInt(100000, 1000000)}`;
    if (!(await User.exists({ userId: candidate }))) return candidate;
  }
  throw new Error("Unable to generate a unique Connectify ID");
}
