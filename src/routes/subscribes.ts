import { Router, type Request, type Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const r = Router();

type OutRow = {
  phone: string;
  name: string | null;
  topic: "ALARM" | "BRANKAS";
  enabled: boolean;
};

r.get("/", async (req: Request, res: Response) => {
  try {
    const topicQ = (req.query.topic as string | undefined)?.toUpperCase();
    const topic =
      topicQ === "ALARM" || topicQ === "BRANKAS" ? topicQ : undefined;

    type RowSel = {
      enabled: boolean;
      topic: "ALARM" | "BRANKAS" | string;
      contact: { phone: string; name: string | null };
    };

    const rows: RowSel[] = await prisma.waSubscriber.findMany({
      where: {
        enabled: true,
        ...(topic ? { topic } : {}),
        contact: { allowed: true },
      },
      select: {
        enabled: true,
        topic: true,
        contact: { select: { phone: true, name: true } },
      },
      orderBy: [{ topic: "asc" }, { contact: { phone: "asc" } }],
    });

    const out: OutRow[] = rows.map((row) => ({
      phone: row.contact.phone,
      name: row.contact.name ?? null,
      topic: row.topic as "ALARM" | "BRANKAS",
      enabled: row.enabled,
    }));

    res.json({ ok: true, rows: out });
  } catch (e) {
    console.error("[subscribes] list error:", e);
    res.status(500).json({ ok: false });
  }
});

export default r;
