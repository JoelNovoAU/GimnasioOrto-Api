import "dotenv/config";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!TOKEN) throw new Error("Falta TELEGRAM_BOT_TOKEN en .env");
if (!CHAT_ID) throw new Error("Falta TELEGRAM_CHAT_ID en .env");

export async function enviarTelegram(texto) {
  const url = `https://api.telegram.org/bot${TOKEN}/sendMessage`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text: texto,
      disable_web_page_preview: true,
    }),
  });

  const data = await res.json();
  if (!data.ok) throw new Error(`Telegram error: ${data.description || "desconocido"}`);
  return data.result;
}
