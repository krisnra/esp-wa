import fetch from "node-fetch";
import { log } from "./logger";

function maskPhone(phone: string) {
  if (!phone) return "";
  const tail = phone.slice(-4);
  return `****${tail}`;
}

export const sendMessage = async (phone: string, message: string) => {
  const url = `${process.env.WPP_URL}/api/${process.env.WPP_SESSION}/send-message`;

  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Accept: "application/json",
      Authorization: `Bearer ${process.env.WPP_BEARER}`,
    },
    body: JSON.stringify({ phone, message }),
  });

  if (!r.ok) {
    const txt = await r.text().catch(() => "<no body>");
    log.error(
      "WPP:OUT",
      `Failed send to ${maskPhone(phone)}: ${r.status} ${
        r.statusText
      } | body: ${txt}`
    );

    throw new Error("send-message failed");
  }
  const json = await r.json().catch(() => ({}));
  log.info("WPP:OUT", `Message sent to ${maskPhone(phone)}`);

  return json;
};
