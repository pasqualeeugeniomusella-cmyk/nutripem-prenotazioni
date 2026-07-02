import { prisma } from "../../../lib/prisma.js";
import { requireAdmin } from "../../../lib/session.js";
import { localDateTimeToUtc } from "../../../lib/time.js";

// POST /api/admin/slots
//   genera slot in blocco
//   body: { groupId, days: ["2025-03-15", ...], startTime: "09:00",
//           endTime: "13:00", durationMin: 30 }
// DELETE /api/admin/slots  { id }  -> elimina un singolo slot (solo se libero)
export default async function handler(req, res) {
  if (!(await requireAdmin(req, res))) return;

  // Elenco slot di un gruppo (per la sezione "Slot generati")
  if (req.method === "GET") {
    const { groupId } = req.query;
    if (!groupId) return res.status(400).json({ error: "groupId mancante" });
    const slots = await prisma.slot.findMany({
      where: { groupId },
      include: { booking: { select: { id: true } } },
      orderBy: { startAt: "asc" },
    });
    const data = slots.map((s) => ({
      id: s.id,
      startAt: s.startAt,
      durationMin: s.durationMin,
      booked: !!s.booking,
    }));
    return res.status(200).json({ slots: data });
  }

  if (req.method === "POST") {
    const { groupId, days, startTime, endTime, durationMin } = req.body || {};

    if (!groupId || !Array.isArray(days) || days.length === 0) {
      return res.status(400).json({ error: "Seleziona il gruppo e almeno un giorno." });
    }
    if (!startTime || !endTime) {
      return res.status(400).json({ error: "Indica orario di inizio e fine." });
    }
    const dur = Number(durationMin) || 30;
    if (dur < 5 || dur > 480) {
      return res.status(400).json({ error: "Durata non valida." });
    }

    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) return res.status(404).json({ error: "Gruppo non trovato." });

    // Costruisce tutti gli istanti di inizio
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const startMinutes = sh * 60 + sm;
    const endMinutes = eh * 60 + em;
    if (endMinutes <= startMinutes) {
      return res.status(400).json({ error: "L'orario di fine deve essere dopo l'inizio." });
    }

    const toCreate = [];
    for (const day of days) {
      for (let m = startMinutes; m + dur <= endMinutes + 0.0001; m += dur) {
        const hh = String(Math.floor(m / 60)).padStart(2, "0");
        const mm = String(m % 60).padStart(2, "0");
        const startAt = localDateTimeToUtc(day, `${hh}:${mm}`);
        toCreate.push({ groupId, startAt, durationMin: dur });
      }
    }

    // createMany con skipDuplicates: gli slot già esistenti (stesso gruppo+istante)
    // vengono ignorati grazie al vincolo @@unique([groupId, startAt]).
    const result = await prisma.slot.createMany({
      data: toCreate,
      skipDuplicates: true,
    });

    return res.status(201).json({
      created: result.count,
      requested: toCreate.length,
      skipped: toCreate.length - result.count,
    });
  }

  if (req.method === "DELETE") {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: "id mancante" });
    const slot = await prisma.slot.findUnique({
      where: { id },
      include: { booking: true },
    });
    if (!slot) return res.status(404).json({ error: "Slot non trovato." });
    if (slot.booking) {
      return res.status(400).json({
        error: "Lo slot è prenotato. Cancella prima la prenotazione.",
      });
    }
    await prisma.slot.delete({ where: { id } });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Metodo non consentito" });
}
