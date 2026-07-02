import { prisma } from "../../../lib/prisma.js";
import { requireAdmin } from "../../../lib/session.js";

// GET /api/admin/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD
// Restituisce tutti gli slot di TUTTI i gruppi in un intervallo di date,
// con l'eventuale prenotazione e l'indice-colore del gruppo.
export default async function handler(req, res) {
  if (!(await requireAdmin(req, res))) return;
  if (req.method !== "GET") return res.status(405).json({ error: "Metodo non consentito" });

  const { from, to } = req.query;

  // Se non passo un intervallo, prendo tutto il futuro + ultimi 60 giorni
  const now = new Date();
  const start = from ? new Date(from + "T00:00:00Z") : new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const end = to ? new Date(to + "T23:59:59Z") : new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);

  // Tutti i gruppi, con un indice stabile per assegnare i colori lato client
  const groups = await prisma.group.findMany({ orderBy: { createdAt: "asc" } });
  const groupIndex = {};
  groups.forEach((g, i) => { groupIndex[g.id] = i; });

  const slots = await prisma.slot.findMany({
    where: { startAt: { gte: start, lte: end } },
    include: {
      group: { select: { id: true, name: true } },
      booking: { select: { id: true, patientName: true, patientEmail: true } },
    },
    orderBy: { startAt: "asc" },
  });

  const data = slots.map((s) => ({
    id: s.id,
    startAt: s.startAt,
    durationMin: s.durationMin,
    groupId: s.group.id,
    groupName: s.group.name,
    colorIndex: groupIndex[s.group.id] ?? 0,
    booked: !!s.booking,
    bookingId: s.booking ? s.booking.id : null,
    patientName: s.booking ? s.booking.patientName : null,
    patientEmail: s.booking ? s.booking.patientEmail : null,
  }));

  const groupList = groups.map((g, i) => ({ id: g.id, name: g.name, colorIndex: i }));

  return res.status(200).json({ slots: data, groups: groupList });
}
