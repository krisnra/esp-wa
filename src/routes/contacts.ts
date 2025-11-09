import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

const prisma = new PrismaClient();
const r = Router();

function toInt(v: any, def = 200, max = 1000) {
  const n = Number.parseInt(String(v ?? ""), 10);
  if (Number.isNaN(n) || n <= 0) return def;
  return Math.min(n, max);
}
function cleanPhone(p: any): string {
  return String(p ?? "").replace(/[^\d]/g, "");
}
function boolish(v: any, def = true): boolean {
  if (typeof v === "boolean") return v;
  if (v === "true" || v === "1") return true;
  if (v === "false" || v === "0") return false;
  return def;
}

r.get("/", async (req, res) => {
  try {
    const limit = toInt(req.query.limit, 200, 1000);
    const q = String(req.query.q ?? "").trim();

    const rows = await prisma.contact.findMany({
      where: q
        ? {
            OR: [
              { phone: { contains: q } },
              { name: { contains: q, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: [{ createdAt: "desc" }],
      take: limit,
      select: {
        id: true,
        phone: true,
        name: true,
        allowed: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({ ok: true, rows });
  } catch (e: unknown) {
    console.error("[contacts] list error:", e);
    res.status(500).json({ ok: false, error: "failed_list" });
  }
});

r.post("/", async (req, res) => {
  try {
    const phone = cleanPhone(req.body?.phone);
    const name = (req.body?.name ?? "").toString().trim() || null;
    const allowed = boolish(req.body?.allowed, true);

    if (!phone || phone.length < 6) {
      return res.status(400).json({ ok: false, error: "invalid_phone" });
    }

    const row = await prisma.contact.create({
      data: { phone, name, allowed },
      select: {
        id: true,
        phone: true,
        name: true,
        allowed: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({ ok: true, row });
  } catch (e: unknown) {
    if (e instanceof PrismaClientKnownRequestError && e.code === "P2002") {
      return res.status(409).json({ ok: false, error: "phone_unique" });
    }
    console.error("[contacts] create error:", e);
    res.status(500).json({ ok: false, error: "failed_create" });
  }
});

r.delete("/:id", async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ ok: false, error: "invalid_id" });
    }
    await prisma.contact.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e: unknown) {
    if (e instanceof PrismaClientKnownRequestError && e.code === "P2025") {
      return res.status(404).json({ ok: false, error: "not_found" });
    }
    console.error("[contacts] delete error:", e);
    res.status(500).json({ ok: false, error: "failed_delete" });
  }
});

r.put("/:id", async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ ok: false, error: "invalid_id" });
    }

    const data: Record<string, any> = {};
    if (req.body?.phone !== undefined) {
      const phone = cleanPhone(req.body?.phone);
      if (!phone || phone.length < 6) {
        return res.status(400).json({ ok: false, error: "invalid_phone" });
      }
      data.phone = phone;
    }
    if (req.body?.name !== undefined) {
      const name = (req.body?.name ?? "").toString().trim();
      data.name = name || null;
    }
    if (req.body?.allowed !== undefined) {
      data.allowed = boolish(req.body?.allowed, true);
    }

    const row = await prisma.contact.update({
      where: { id },
      data,
      select: {
        id: true,
        phone: true,
        name: true,
        allowed: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({ ok: true, row });
  } catch (e: unknown) {
    if (e instanceof PrismaClientKnownRequestError) {
      if (e.code === "P2002") {
        return res.status(409).json({ ok: false, error: "phone_unique" });
      }
      if (e.code === "P2025") {
        return res.status(404).json({ ok: false, error: "not_found" });
      }
    }
    console.error("[contacts] update error:", e);
    res.status(500).json({ ok: false, error: "failed_update" });
  }
});

export default r;
