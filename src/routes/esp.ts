import { Router, Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { prisma } from "../db";
import { sendMessage } from "../utils/sendMessage";
import { isMailerReady, sendToAlertList } from "../utils/mailer";
import { log } from "../utils/logger";

const r = Router();

type Topic = "ALARM" | "BRANKAS";

function requireEspKey(req: Request, res: Response, next: NextFunction) {
  const key = req.header("x-esp-apikey");
  if (!key || key !== process.env.ESP_API_KEY) {
    return res.status(401).json({ ok: false, error: "invalid key" });
  }
  next();
}

const limiter = rateLimit({ windowMs: 60_000, max: 60 });

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

type SubWithPhone = { contact: { phone: string } };

r.post("/", limiter, requireEspKey, async (req: Request, res: Response) => {
  const { device, level, message } = req.body ?? {};
  if (!device || !level || !message) {
    return res.status(400).json({ ok: false, error: "missing fields" });
  }

  const topic: Topic =
    String(device).toUpperCase() === "ALARM" ? "ALARM" : "BRANKAS";
  const category = `ESP:${topic}`;
  const lvlRaw = String(level).toUpperCase();
  const lvl: "INFO" | "WARN" | "ERROR" =
    lvlRaw === "WARN" || lvlRaw === "ERROR" ? lvlRaw : "INFO";
  const msg = String(message);

  const levelMap = {
    INFO: log.info,
    WARN: log.warn,
    ERROR: log.error,
  } as const;
  levelMap[lvl](category, `RX ${device}/${lvl}: ${msg}`);

  if (topic === "BRANKAS") {
    try {
      if (isMailerReady()) {
        const subject = `[N3] Brankas Notification - ${lvl}`;
        const lines = [
          `Kategori: Brankas Status`,
          `Level   : ${lvl}`,
          `Pesan   : ${msg}`,
          `Waktu   : ${new Date().toISOString()}`,
        ];
        const text = lines.join("\n");

        const { accepted, rejected } = await sendToAlertList(subject, text);
        await log.info(
          category,
          `EMAIL_NOTIFY done: accepted=${accepted.length}, rejected=${rejected.length}`
        );
        if (rejected.length) {
          await log.warn(
            category,
            `EMAIL_NOTIFY rejected -> ${rejected.join(", ")}`
          );
        }
      } else {
        await log.info(category, "Email disabled/not configured.");
      }
    } catch (e: any) {
      await log.error(category, `EMAIL_NOTIFY failed: ${String(e)}`);
    }
  }

  const subs: SubWithPhone[] = await prisma.waSubscriber.findMany({
    where: { topic, enabled: true, contact: { allowed: true } },
    select: { contact: { select: { phone: true } } },
  });

  if (subs.length === 0) {
    await log.info(category, "No active subscribers, skipping notify.");
    return res.json({ ok: true, notified: 0 });
  }

  const text = `[${topic}] ${lvl} - ${msg}`;
  const batches = chunk(subs, 10);
  let okCount = 0;
  const perSendLogs: { category: string; level: string; message: string }[] =
    [];

  for (const group of batches) {
    const results = await Promise.allSettled(
      group.map((s) => sendMessage(s.contact.phone, text))
    );

    results.forEach((r, i) => {
      const phone = group[i].contact.phone;
      if (r.status === "fulfilled") {
        okCount++;
        perSendLogs.push({
          category,
          level: "INFO",
          message: `NOTIFY_OK -> ${phone}`,
        });
      } else {
        perSendLogs.push({
          category,
          level: "ERROR",
          message: `NOTIFY_FAIL -> ${phone}: ${String(r.reason)}`,
        });
      }
    });
  }

  await log.info(
    category,
    `Notify done: ok=${okCount}, fail=${subs.length - okCount}`
  );
  if (perSendLogs.length) {
    try {
      await prisma.log.createMany({ data: perSendLogs });
    } catch (e) {
      await log.error("APP:LOG", `CreateMany failed: ${String(e)}`);
    }
  }

  return res.json({ ok: true, notified: okCount });
});

export default r;
