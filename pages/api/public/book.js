import { prisma } from "../../../lib/prisma.js";
import { italianDayKey } from "../../../lib/time.js";
import { sendBookingConfirmation, sendAdminNotification } from "../../../lib/email.js";

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Metodo non consentito" });

  const { slotId, patientName, patientEmail } = req.body || {};
  if (!slotId || !patientName || !patientEmail) return res.status(400).json({ error: "Compila nome, email e scegli uno slot." });
  if (!patientName.trim() || patientName.trim().length < 2) return res.status(400).json({ error: "Inserisci un nome valido." });
  if (!isValidEmail(patientEmail)) return res.status(400).json({ error: "Inserisci un'email valida." });

  const slot = await prisma.slot.findUnique({ where: { id: slotId }, include: { group: true } });
  if (!slot) return res.status(404).json({ error: "Slot non trovato." });
  if (slot.startAt < new Date()) return res.status(400).json({ error: "Questo orario è già passato." });

  const closures = await prisma.closure.findMany({ where: { OR: [{ groupId: null }, { groupId: slot.groupId }] } });
  const closedDays = new Set(closures.map((c) => italianDayKey(c.day)));
  if (closedDays.has(italianDayKey(slot.startAt))) return res.status(400).json({ error: "Questo giorno non è disponibile." });

  let booking;
  try {
    booking = await prisma.booking.create({
      data: { slotId, patientName: patientName.trim(), patientEmail: patientEmail.trim() },
    });
  } catch (err) {
    if (err.code === "P2002") return res.status(409).json({ error: "Spiacenti, questo orario è appena stato prenotato. Scegline un altro." });
    console.error(err);
    return res.status(500).json({ error: "Errore durante la prenotazione." });
  }

  try {
    await sendBookingConfirmation(booking, slot);
    await sendAdminNotification(booking, slot, slot.group.name);
  } catch (e) {
    console.error("Errore invio email:", e);
  }

  return res.status(201).json({ ok: true });
}
