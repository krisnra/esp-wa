import { Router } from "express";
import fetch from "node-fetch";
import { prisma } from "../db";
import { sendMessage } from "../utils/sendMessage";
import { log } from "../utils/logger";

interface Message {
  id: string;
  from: string;
  body: string;
  t?: number;
  type?: string;
  [k: string]: any;
}
interface WPPResponse {
  status?: string;
  response: Message[];
}

type TopicType = "ALARM" | "BRANKAS";

const router = Router();

const STARTED_AT_MS = Date.now();

const normPhone = (jid: string) => jid?.replace("@c.us", "") ?? "";
const isOn = (s: string) => /(on)\b/i.test(s);
const isOff = (s: string) => /(off)\b/i.test(s);

async function ensureContact(phone: string) {
  return prisma.contact.upsert({
    where: { phone },
    update: {},
    create: { phone, allowed: false },
  });
}

async function setSubscription(
  phone: string,
  topic: TopicType,
  enable: boolean
) {
  const contact = await ensureContact(phone);
  if (!contact.allowed) {
    await log.warn(
      "WPP:AUTH",
      `BLOCKED ${phone} tried ${topic}=${enable ? "ON" : "OFF"}`
    );
    await sendMessage(phone, "❌ Nomor ini belum diizinkan mengakses bot.");
    return { ok: false as const };
  }
  await prisma.waSubscriber.upsert({
    where: { contactId_topic: { contactId: contact.id, topic } },
    create: { contactId: contact.id, topic, enabled: enable },
    update: { enabled: enable },
  });
  await log.info("WPP:SUB", `${phone} ${topic} -> ${enable ? "ON" : "OFF"}`);
  return { ok: true as const };
}

async function handleCommand(phone: string, text: string) {
  const cmd = text.trim().toLowerCase();

  if (cmd.startsWith("/alarm ")) {
    if (isOn(cmd)) {
      const r = await setSubscription(phone, "ALARM", true);
      if (r.ok) await sendMessage(phone, "✅ Activate Alarm Notification");
    } else if (isOff(cmd)) {
      const r = await setSubscription(phone, "ALARM", false);
      if (r.ok) await sendMessage(phone, "❎ Deactivate Alarm Notification");
    } else {
      await sendMessage(phone, "Gunakan: /alarm on | /alarm off");
    }
    return;
  }

  if (cmd.startsWith("/brankas ")) {
    if (isOn(cmd)) {
      const r = await setSubscription(phone, "BRANKAS", true);
      if (r.ok) await sendMessage(phone, "✅ Activate Brankas Notification");
    } else if (isOff(cmd)) {
      const r = await setSubscription(phone, "BRANKAS", false);
      if (r.ok) await sendMessage(phone, "❎ Deactivate Brankas Notification");
    } else {
      await sendMessage(phone, "Gunakan: /brankas on | /brankas off");
    }
    return;
  }

  if (cmd === "/help") {
    await sendMessage(phone, "Perintah:\n/alarm on|off\n/brankas on|off");
  }
}

async function checkNewMessages() {
  try {
    const url = `${process.env.WPP_URL}/api/${process.env.WPP_SESSION}/all-new-messages`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        accept: "*/*",
        Authorization: `Bearer ${process.env.WPP_BEARER}`,
      },
    });

    if (!response.ok) {
      await log.error(
        "WPP:HTTP",
        `all-new-messages ${response.status} ${response.statusText}`
      );
      return;
    }

    const data = (await response.json()) as WPPResponse;
    if (!data?.response || !Array.isArray(data.response)) return;

    for (const msg of data.response) {
      if (msg.type && msg.type !== "chat") continue;

      const seen = await prisma.waProcessed.findUnique({
        where: { id: msg.id },
      });
      if (seen) continue;

      await prisma.waProcessed.create({
        data: {
          id: msg.id,
          from: normPhone(msg.from),
          body: msg.body ?? "",
          ts: typeof msg.t === "number" ? msg.t : Math.floor(Date.now() / 1000),
        },
      });

      const phone = normPhone(msg.from);
      const content = msg.body || "";
      const msgTimeMs =
        (typeof msg.t === "number" ? msg.t : Math.floor(Date.now() / 1000)) *
        1000;

      if (msgTimeMs < STARTED_AT_MS - 2000) {
        await log.info("WPP:SKIP", `ignored old msg ${phone}: ${content}`);
        continue;
      }

      await log.info("WPP:RX", `from ${phone}: ${content}`);

      if (content.startsWith("/")) {
        try {
          await handleCommand(phone, content);
        } catch (e) {
          await log.error("WPP:CMD", `handleCommand ${phone}: ${String(e)}`);
        }
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await log.error("WPP:POLL", `poll error: ${msg}`);
  }
}

setInterval(checkNewMessages, 3000);

router.get("/receive", async (_req, res) => {
  await checkNewMessages();
  res.json({ ok: true });
});

export default router;
