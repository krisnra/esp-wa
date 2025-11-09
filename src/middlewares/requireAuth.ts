import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

export type JwtUser = {
  id: number;
  email: string;
  role?: "ADMIN" | "USER";
} & JwtPayload;

declare global {
  namespace Express {
    interface Request {
      user?: JwtUser;
      token?: string;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || "changeme";

function getTokenFromRequest(req: Request): string | undefined {
  const auth = req.headers.authorization || "";
  if (auth && auth.startsWith("Bearer ")) return auth.slice(7).trim();
  const cookieToken = (req as any).cookies?.token as string | undefined;
  return cookieToken;
}

function normalizePayload(p: any): JwtUser | null {
  if (!p || typeof p !== "object") return null;

  const id =
    typeof p.id === "number"
      ? p.id
      : typeof p.uid === "number"
      ? p.uid
      : undefined;

  const email = typeof p.email === "string" ? p.email : undefined;

  if (!id || !email) return null;

  const role =
    typeof p.role === "string"
      ? p.role === "ADMIN"
        ? "ADMIN"
        : p.role === "USER"
        ? "USER"
        : undefined
      : undefined;

  const { iat, exp } = p as JwtPayload;
  return { id, email, role, iat, exp };
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = getTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({ ok: false, error: "unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = normalizePayload(decoded);
    if (!user) {
      return res.status(401).json({ ok: false, error: "unauthorized" });
    }
    req.user = user;
    req.token = token;
    return next();
  } catch {
    return res.status(401).json({ ok: false, error: "unauthorized" });
  }
}
