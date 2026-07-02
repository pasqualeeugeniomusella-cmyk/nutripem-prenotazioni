import { prisma } from "../../../lib/prisma.js";
import { requireAdmin } from "../../../lib/session.js";
import { sendCancellationEmail } from "../../../lib/email.js";
import { italianDayKey } from "../../../lib/time.js";
import { deleteCalendarEvent } from "../../../lib/googleCalendar.js";

// GET /api/admin/bookings?scope=today|upcoming|all&groupId=...
//   lista prenotazioni
// DELETE { id }  -> l'admin cancella una prenotazione (paziente avvisato via email)
export default async function handler(req, res) {
  if (!(await requireAdmin(req, res))) return;

  if (req.method === "GET") {
    const { scope = "upcoming", groupId } = req.query;

    const where = { slot: {} };
    if (groupId) where.slot.groupId = groupId;

    const now = new Date();
    if (scope === "today") {
      const todayKey = italianDayKey(now);
      // Prende prenotazioni il cui slot cade oggi (confronto sul giorno italiano)
      const all = await prisma.booking.findMany({
        where,
        include: { slot: { include: { group: true } } },
        orderBy: { slot: { startAt: "asc" } },
      });
      const filtered = all.filter((b) => italianDayKey(b.slot.startAt) === todayKey);
      return res.status(200).json({ bookings: shape(filtered) });
    }

    if (scope === "upcoming") {
      where.slot.startAt = { gte: now };
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: { slot: { include: { group: true } } },
      orderBy: { slot: { startAt: "asc" } },
    });
    return res.status(200).json({ bookings: shape(bookings) });
  }

  if (req.method === "DELETE") {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: "id mancante" });

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { slot: true },
    });
    if (!booking) return res.status(404).json({ error: "Prenotazione non trovata." });

    // Cancella la prenotazione ma lascia lo slot libero e riprenotabile.
    await prisma.booking.delete({ where: { id } });

    // Rimuovi l'evento da Google Calendar (best effort)
    if (booking.googleEventId) {
      deleteCalendarEvent(booking.googleEventId).catch(() => {});
    }

    // Avvisa il paziente (best effort, non blocca se l'email fallisce)
    sendCancellationEmail(booking, booking.slot).catch(() => {});

    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Metodo non consentito" });
}

function shape(bookings) {
  return bookings.map((b) => ({
    id: b.id,
    patientName: b.patientName,
    patientEmail: b.patientEmail,
    note: b.note,
    startAt: b.slot.startAt,
    groupName: b.slot.group.name,
    createdAt: b.createdAt,
  }));
}
