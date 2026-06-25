import { prisma } from "../../../../../lib/prisma";
import { isAdminRequest } from "../../../../../lib/session";

function timeToMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function minutesToTime(mins) {
  const h = Math.floor(mins / 60).toString().padStart(2, "0");
  const m = (mins % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

export default async function handler(req, res) {
  if (!isAdminRequest(req)) return res.status(401).json({ error: "Non autorizzato" });
  const { id } = req.query;

  const group = await prisma.group.findUnique({ where: { id } });
  if (!group) return res.status(404).json({ error: "Gruppo non trovato" });

  if (req.method === "POST") {
    // dates: array di "YYYY-MM-DD"
    // startTime/endTime: "HH:MM", intervalMinutes: numero (es. 30)
    const { dates, startTime, endTime, intervalMinutes } = req.body || {};

    if (!Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({ error: "Seleziona almeno un giorno" });
    }
    if (!startTime || !endTime || !intervalMinutes) {
      return res.status(400).json({ error: "Indica orario inizio, fine e intervallo" });
    }

    const startMin = timeToMinutes(startTime);
    const endMin = timeToMinutes(endTime);
    const interval = parseInt(intervalMinutes, 10);

    if (interval <= 0 || endMin <= startMin) {
      return res.status(400).json({ error: "Intervallo orario non valido" });
    }

    const timesToCreate = [];
    for (let t = startMin; t < endMin; t += interval) {
      timesToCreate.push(minutesToTime(t));
    }

    const existing = await prisma.slot.findMany({
      where: { groupId: id, date: { in: dates } },
      select: { date: true, time: true },
    });
    const existingSet = new Set(existing.map((s) => `${s.date}_${s.time}`));

    const toCreate = [];
    for (const date of dates) {
      for (const time of timesToCreate) {
        const key = `${date}_${time}`;
        if (!existingSet.has(key)) {
          toCreate.push({ groupId: id, date, time, status: "free" });
        }
      }
    }

    if (toCreate.length > 0) {
      await prisma.slot.createMany({ data: toCreate });
    }

    return res.status(201).json({ created: toCreate.length, skipped: timesToCreate.length * dates.length - toCreate.length });
  }

  return res.status(405).end();
}
