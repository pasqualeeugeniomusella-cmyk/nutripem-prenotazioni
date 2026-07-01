import { prisma } from "../../../lib/prisma.js";
import { italianDayKey } from "../../../lib/time.js";

// GET /api/public/slots?slug=nome-gruppo
// Ritorna gli slot LIBERI e FUTURI del gruppo, esclusi i giorni di chiusura.
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  const { slug } = req.query;
  if (!slug) return res.status(400).json({ error: "slug mancante" });

  const group = await prisma.group.findUnique({ where: { slug } });
  if (!group) return res.status(404).json({ error: "Gruppo non trovato." });

  const now = new Date();

  // Chiusure che valgono per questo gruppo (globali o specifiche)
  const closures = await prisma.closure.findMany({
    where: { OR: [{ groupId: null }, { groupId: group.id }] },
  });
  const closedDays = new Set(closures.map((c) => italianDayKey(c.day)));

  // Slot liberi futuri
  const slots = await prisma.slot.findMany({
    where: {
      groupId: group.id,
      startAt: { gte: now },
      booking: null, // solo quelli non ancora prenotati
    },
    orderBy: { startAt: "asc" },
  });

  const available = slots
    .filter((s) => !closedDays.has(italianDayKey(s.startAt)))
    .map((s) => ({ id: s.id, startAt: s.startAt, durationMin: s.durationMin }));

  return res.status(200).json({ groupName: group.name, slots: available });
}
