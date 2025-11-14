import { Router } from "express";
import { prisma } from "../db";
import { log } from "../utils/logger";

const r = Router();

r.get("/", async (req, res) => {
  try {
    const pageRaw = Number(req.query.page ?? 1);
    const page =
      Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;

    const pageSizeRaw = Number(req.query.pageSize ?? req.query.limit ?? 50);
    const pageSizeUnclamped =
      Number.isFinite(pageSizeRaw) && pageSizeRaw > 0
        ? Math.floor(pageSizeRaw)
        : 50;

    const pageSize = Math.min(Math.max(pageSizeUnclamped, 1), 1000);

    const q = String(req.query.q ?? "").trim();
    const level = String(req.query.level ?? "")
      .trim()
      .toUpperCase();
    const category = String(req.query.category ?? "").trim();

    const device = String(req.query.device ?? "")
      .trim()
      .toUpperCase();
    const mappedCategory =
      device === "ALARM" || device === "BRANKAS" ? `ESP:${device}` : undefined;

    const startRaw = String(req.query.start ?? "").trim();
    const endRaw = String(req.query.end ?? "").trim();
    const startDate = startRaw ? new Date(startRaw) : undefined;
    const endDate = endRaw ? new Date(endRaw) : undefined;
    const hasStart = !!startDate && !Number.isNaN(startDate.getTime());
    const hasEnd = !!endDate && !Number.isNaN(endDate.getTime());

    const where: Record<string, unknown> = {};

    if (q) {
      where.OR = [
        { category: { contains: q, mode: "insensitive" as const } },
        { message: { contains: q, mode: "insensitive" as const } },
      ];
    }
    if (level === "INFO" || level === "WARN" || level === "ERROR") {
      where.level = level;
    }
    if (mappedCategory) {
      where.category = mappedCategory;
    } else if (category) {
      where.category = category;
    }
    if (hasStart || hasEnd) {
      where.ts = {
        ...(hasStart ? { gte: startDate } : {}),
        ...(hasEnd ? { lte: endDate } : {}),
      };
    }

    const skip = (page - 1) * pageSize;

    const [rows, total] = await Promise.all([
      prisma.log.findMany({
        where: where as any,
        orderBy: [{ ts: "desc" }],
        take: pageSize,
        skip,
        select: {
          id: true,
          ts: true,
          category: true,
          level: true,
          message: true,
        },
      }),
      prisma.log.count({ where: where as any }),
    ]);

    res.json({
      ok: true,
      rows,
      total,
      page,
      pageSize,
    });
  } catch (e: unknown) {
    await log.error("APP:LOGS", `List error: ${String(e)}`);
    res.status(500).json({ ok: false, error: "failed_list" });
  }
});

r.get("/categories", async (_req, res) => {
  try {
    const rows: Array<{ category: string }> = await prisma.log.findMany({
      distinct: ["category"],
      select: { category: true },
      orderBy: { category: "asc" },
      take: 1000,
    });
    res.json({ ok: true, categories: rows.map((row) => row.category) });
  } catch (e) {
    await log.error("APP:LOGS", `Categories error: ${String(e)}`);
    res.status(500).json({ ok: false, error: "failed_categories" });
  }
});

export default r;
