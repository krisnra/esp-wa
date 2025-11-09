import fetch from "node-fetch";

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
    const txt = await r.text().catch(() => "");
    console.error("Failed to send message:", r.status, r.statusText, txt);
    throw new Error("send-message failed");
  }
  const json = await r.json().catch(() => ({}));
  console.log("Message sent ->", phone, JSON.stringify(json));
  return json;
};
