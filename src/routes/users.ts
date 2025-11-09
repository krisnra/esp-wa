import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const r = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SELECT_USER = {
  id: true,
  email: true,
  name: true,
  role: true,
  createdAt: true,
} as const;

function parseLimit(v: any, def = 200, max = 1000) {
  const n = Number.parseInt(String(v ?? ""), 10);
  if (!Number.isFinite(n) || n <= 0) return def;
  return Math.min(n, max);
}
function isEmail(s: string) {
  return EMAIL_RE.test(s);
}
function isRole(s: string): s is "ADMIN" | "USER" {
  return s === "ADMIN" || s === "USER";
}
function getAuthUserId(req: any): number | null {
  const u = (req as any).user;
  return typeof u?.id === "number"
    ? u.id
    : typeof u?.uid === "number"
    ? u.uid
    : null;
}

async function verifyAdminPassword(req: any): Promise<boolean> {
  const adminPassword = String(req.body?.adminPassword ?? "");
  if (!adminPassword) return false;
  const adminId = getAuthUserId(req);
  if (!adminId) return false;

  const admin = await prisma.user.findUnique({
    where: { id: adminId },
    select: { password: true },
  });
  if (!admin) return false;

  return bcrypt.compare(adminPassword, admin.password);
}

async function ensureNotLastAdminDemotion(
  targetUserId: number,
  nextRole?: "ADMIN" | "USER"
) {
  if (nextRole === "USER") {
    const current = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { role: true },
    });
    if (current?.role === "ADMIN") {
      const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
      if (adminCount <= 1) {
        return false;
      }
    }
  }
  return true;
}
async function ensureNotDeletingLastAdmin(targetUserId: number) {
  const current = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { role: true },
  });
  if (current?.role === "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) return false;
  }
  return true;
}

r.get("/", async (req, res) => {
  try {
    const limit = parseLimit(req.query.limit, 200, 1000);
    const rows = await prisma.user.findMany({
      orderBy: [{ createdAt: "desc" }],
      take: limit,
      select: SELECT_USER,
    });
    res.json({ ok: true, rows });
  } catch (e) {
    console.error("[users] list error:", e);
    res.status(500).json({ ok: false, error: "failed_list" });
  }
});

r.post("/", async (req, res) => {
  try {
    if (!(await verifyAdminPassword(req))) {
      return res
        .status(403)
        .json({ ok: false, error: "admin_password_invalid" });
    }

    const email = String(req.body?.email ?? "")
      .trim()
      .toLowerCase();
    const name = (String(req.body?.name ?? "").trim() || null) as string | null;
    const password = String(req.body?.password ?? "");
    const roleRaw = String(req.body?.role ?? "")
      .trim()
      .toUpperCase();
    const role: "ADMIN" | "USER" = isRole(roleRaw) ? roleRaw : "USER";

    if (!isEmail(email))
      return res.status(400).json({ ok: false, error: "invalid_email" });
    if (password.length < 6)
      return res.status(400).json({ ok: false, error: "weak_password" });

    const hash = await bcrypt.hash(password, 10);

    const row = await prisma.user.create({
      data: { email, name, password: hash, role },
      select: SELECT_USER,
    });

    res.json({ ok: true, row });
  } catch (e: unknown) {
    if (e instanceof PrismaClientKnownRequestError && e.code === "P2002") {
      return res.status(409).json({ ok: false, error: "email_unique" });
    }
    console.error("[users] create error:", e);
    res.status(500).json({ ok: false, error: "failed_create" });
  }
});

r.put("/:id", async (req, res) => {
  try {
    if (!(await verifyAdminPassword(req))) {
      return res
        .status(403)
        .json({ ok: false, error: "admin_password_invalid" });
    }

    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ ok: false, error: "invalid_id" });
    }

    const data: Record<string, any> = {};

    if (req.body?.email !== undefined) {
      const email = String(req.body?.email ?? "")
        .trim()
        .toLowerCase();
      if (!isEmail(email))
        return res.status(400).json({ ok: false, error: "invalid_email" });
      data.email = email;
    }

    if (req.body?.name !== undefined) {
      const name = String(req.body?.name ?? "").trim();
      data.name = name || null;
    }

    if (req.body?.password !== undefined) {
      const password = String(req.body?.password ?? "");
      if (password.length > 0) {
        data.password = await bcrypt.hash(password, 10);
      }
    }

    let nextRole: "ADMIN" | "USER" | undefined = undefined;
    if (req.body?.role !== undefined) {
      const roleRaw = String(req.body?.role ?? "")
        .trim()
        .toUpperCase();
      if (!isRole(roleRaw))
        return res.status(400).json({ ok: false, error: "invalid_role" });
      nextRole = roleRaw;
      // guard admin terakhir
      const ok = await ensureNotLastAdminDemotion(id, nextRole);
      if (!ok)
        return res
          .status(400)
          .json({ ok: false, error: "cannot_demote_last_admin" });
      data.role = nextRole;
    }

    const row = await prisma.user.update({
      where: { id },
      data,
      select: SELECT_USER,
    });

    res.json({ ok: true, row });
  } catch (e: unknown) {
    if (e instanceof PrismaClientKnownRequestError) {
      if (e.code === "P2002") {
        return res.status(409).json({ ok: false, error: "email_unique" });
      }
      if (e.code === "P2025") {
        return res.status(404).json({ ok: false, error: "not_found" });
      }
    }
    console.error("[users] update error:", e);
    res.status(500).json({ ok: false, error: "failed_update" });
  }
});

r.delete("/:id", async (req, res) => {
  try {
    if (!(await verifyAdminPassword(req))) {
      return res
        .status(403)
        .json({ ok: false, error: "admin_password_invalid" });
    }

    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ ok: false, error: "invalid_id" });
    }

    const me = getAuthUserId(req);
    if (me && me === id) {
      return res.status(400).json({ ok: false, error: "cannot_delete_self" });
    }

    const ok = await ensureNotDeletingLastAdmin(id);
    if (!ok)
      return res
        .status(400)
        .json({ ok: false, error: "cannot_delete_last_admin" });

    await prisma.user.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e: unknown) {
    if (e instanceof PrismaClientKnownRequestError && e.code === "P2025") {
      return res.status(404).json({ ok: false, error: "not_found" });
    }
    console.error("[users] delete error:", e);
    res.status(500).json({ ok: false, error: "failed_delete" });
  }
});

export default r;
