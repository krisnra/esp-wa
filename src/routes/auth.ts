import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import rateLimit from "express-rate-limit";

const prisma = new PrismaClient();
const r = Router();

const JWT_SECRET = process.env.JWT_SECRET || "";

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET env variable is not set");
}

const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
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

  const user = await prisma.user.findUnique({
    where: { email: String(email).toLowerCase() },
  });
  if (!user) return res.status(401).json({ ok: false, error: "Invalid" });

  const ok = await bcrypt.compare(String(password), user.password);
  if (!ok) return res.status(401).json({ ok: false, error: "Invalid" });

  const payload = {
    id: user.id,
    uid: user.id,
    email: user.email,
    role: (user as any).role ?? "USER",
  };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });

  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 7 * 24 * 3600 * 1000,
    path: "/",
  });

  res.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: (user as any).role ?? "USER",
    },
  });
});

r.get("/me", (req, res) => {
  const hdr = req.headers.authorization || "";
  const raw = hdr.startsWith("Bearer ")
    ? hdr.slice(7)
    : (req.cookies?.token as string | undefined);
  if (!raw) return res.json({ ok: false });

  try {
    const p = jwt.verify(raw, JWT_SECRET) as {
      id?: number;
      uid?: number;
      email?: string;
      role?: string;
    };
    const id = p.id ?? p.uid;
    if (!id || !p.email) return res.json({ ok: false });

    return res.json({
      ok: true,
      user: { id, email: p.email, role: (p.role as any) ?? "USER" },
    });
  } catch {
    return res.json({ ok: false });
  }
});

export default r;
