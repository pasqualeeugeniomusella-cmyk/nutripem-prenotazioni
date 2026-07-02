import { prisma } from "../../../lib/prisma.js";
import { sendReminderEmail } from "../../../lib/email.js";

// GET /api/cron/reminders
// Chiamata automaticamente da Vercel Cron una volta al giorno.
// Invia il promemoria alle prenotazioni che iniziano tra ~24 e ~48 ore
// e che non hanno ancora ricevuto il promemoria.
//
// Protezione: Vercel Cron invia l'header "Authorization: Bearer <CRON_SECRET>".
export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.authorization || "";
  if (secret && auth !== `Bearer ${secret}`) {
    return res.status(401).json({ error: "Non autorizzato" });
  }

  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const bookings = await prisma.booking.findMany({
    where: {
      reminderSent: false,
      slot: { startAt: { gte: in24h, lte: in48h } },
    },
    include: { slot: true },
  });

  let sent = 0;
  for (const b of bookings) {
    await sendReminderEmail(b, b.slot);
    await prisma.booking.update({
      where: { id: b.id },
      data: { reminderSent: true },
    });
    sent++;
  }

  return res.status(200).json({ ok: true, sent });
}
