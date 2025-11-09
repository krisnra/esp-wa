import { Request, Response, NextFunction } from "express";

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const role = (req as any)?.user?.role;
  if (role === "ADMIN") return next();
  if (!role) return res.status(401).json({ ok: false, error: "unauthorized" });
  return res.status(403).json({ ok: false, error: "forbidden" });
}
