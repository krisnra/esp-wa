import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import rateLimit from "express-rate-limit";

const prisma = new PrismaClient();
const r = Router();
const JWT_SECRET = process.env.JWT_SECRET || "changeme";

const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 menit
  max: 5,
  message: {
    ok: false,
    error: "Terlalu banyak percobaan login. Coba lagi nanti.",
  },
});

r.post("/login", loginLimiter, async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password)
    return res.status(400).json({ ok: false, error: "Missing" });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ ok: false, error: "Invalid" });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ ok: false, error: "Invalid" });

  const token = jwt.sign({ uid: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: "7d",
  });
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 7 * 24 * 3600 * 1000,
  });
  res.json({
    ok: true,
    user: { id: user.id, email: user.email, name: user.name },
  });
});

r.get("/me", (req, res) => {
  const hdr = req.headers.authorization || "";
  const raw = hdr.startsWith("Bearer ")
    ? hdr.slice(7)
    : req.cookies?.token || "";
  try {
    const payload = jwt.verify(raw, JWT_SECRET) as any;
    res.json({ ok: true, me: { uid: payload.uid, email: payload.email } });
  } catch {
    res.status(401).json({ ok: false });
  }
});

export default r;
