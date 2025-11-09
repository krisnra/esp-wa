import { Router, Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { PrismaClient } from "@prisma/client";
import { sendMessage } from "../utils/sendMessage";
import { isMailerReady, sendToAlertList } from "../utils/mailer";

const prisma = new PrismaClient();
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

async function writeLog(category: string, level: string, message: string) {
  try {
    await prisma.log.create({
      data: { category, level, message },
    });
  } catch (e) {
    console.error("[LOG] write failed:", e);
  }
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
  const lvl = String(level).toUpperCase();
  const msg = String(message);

  await writeLog(category, "INFO", `RX ${device}/${lvl}: ${msg}`);

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
        await writeLog(
          category,
          "INFO",
          `EMAIL_NOTIFY done: accepted=${accepted.length}, rejected=${rejected.length}`
        );
        if (rejected.length) {
          await writeLog(
            category,
            "WARN",
            `EMAIL_NOTIFY rejected -> ${rejected.join(", ")}`
          );
        }
      } else {
        await writeLog(category, "INFO", "Email disabled/not configured.");
      }
    } catch (e: any) {
      await writeLog(category, "ERROR", `EMAIL_NOTIFY failed: ${String(e)}`);
    }
  }

  const subs: SubWithPhone[] = await prisma.waSubscriber.findMany({
    where: { topic, enabled: true, contact: { allowed: true } },
    select: { contact: { select: { phone: true } } },
  });

  if (subs.length === 0) {
    await writeLog(category, "INFO", "No active subscribers, skipping notify.");
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

  await writeLog(
    category,
    "INFO",
    `Notify done: ok=${okCount}, fail=${subs.length - okCount}`
  );
  if (perSendLogs.length) {
    try {
      await prisma.log.createMany({ data: perSendLogs });
    } catch (e) {
      console.error("[LOG] createMany failed:", e);
    }
  }

  return res.json({ ok: true, notified: okCount });
});

export default r;
