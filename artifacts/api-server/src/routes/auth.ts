import { Router } from "express";
import { db } from "@workspace/db";
import { users, refreshTokens } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || "edubee-camp-secret-key-change-in-production";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "edubee-camp-refresh-secret-change-in-production";
const ACCESS_TOKEN_EXPIRY = "8h";
const REFRESH_TOKEN_EXPIRY = "7d";

function generateTokens(user: { id: string; email: string; role: string; fullName: string }) {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role, fullName: user.fullName },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
  const refreshToken = jwt.sign(
    { id: user.id },
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
  return { accessToken, refreshToken };
}

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Bad Request", message: "Email and password required" });
    }

    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized", message: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Unauthorized", message: "Invalid credentials" });
    }

    if (user.status === "inactive") {
      return res.status(403).json({ error: "Forbidden", message: "Account is inactive" });
    }

    const { accessToken, refreshToken } = generateTokens(user);

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await db.insert(refreshTokens).values({ userId: user.id, token: refreshToken, expiresAt });

    // Update last login
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

    const { passwordHash: _, ...userWithoutPassword } = user;
    return res.json({ accessToken, refreshToken, user: userWithoutPassword });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: "Bad Request", message: "Refresh token required" });
    }

    let decoded: { id: string };
    try {
      decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { id: string };
    } catch {
      return res.status(401).json({ error: "Unauthorized", message: "Invalid refresh token" });
    }

    const [storedToken] = await db.select().from(refreshTokens)
      .where(eq(refreshTokens.token, refreshToken)).limit(1);
    if (!storedToken || storedToken.expiresAt < new Date()) {
      return res.status(401).json({ error: "Unauthorized", message: "Refresh token expired" });
    }

    const [user] = await db.select().from(users).where(eq(users.id, decoded.id)).limit(1);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized", message: "User not found" });
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

    // Replace old refresh token
    await db.delete(refreshTokens).where(eq(refreshTokens.token, refreshToken));
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await db.insert(refreshTokens).values({ userId: user.id, token: newRefreshToken, expiresAt });

    const { passwordHash: _, ...userWithoutPassword } = user;
    return res.json({ accessToken, refreshToken: newRefreshToken, user: userWithoutPassword });
  } catch (err) {
    console.error("Refresh error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/logout", authenticate, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await db.delete(refreshTokens).where(eq(refreshTokens.token, refreshToken));
    }
    return res.json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    console.error("Logout error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/me", authenticate, async (req, res) => {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.user!.id)).limit(1);
    if (!user) {
      return res.status(404).json({ error: "Not Found" });
    }
    const { passwordHash: _, ...userWithoutPassword } = user;
    return res.json(userWithoutPassword);
  } catch (err) {
    console.error("Get me error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
