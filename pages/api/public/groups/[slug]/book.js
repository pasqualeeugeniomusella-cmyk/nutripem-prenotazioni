import { prisma } from "../../../../../lib/prisma";
import { sendBookingConfirmationToPatient, sendBookingNotificationToAdmin } from "../../../../../lib/email";

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default async function handler(req, res) {
  const { slug } = req.query;
  if (req.method !== "POST") return res.status(405).end();

  const { slotId, patientName, patientEmail } = req.body || {};
  if (!slotId || !patientName || !patientEmail) {
    return res.status(400).json({ error: "Compila tutti i campi" });
  }
  if (!isValidEmail(patientEmail)) {
    return res.status(400).json({ error: "Email non valida" });
  }

  const group = await prisma.group.findUnique({ where: { slug } });
  if (!group) return res.status(404).json({ error: "Link non valido" });

  const slot = await prisma.slot.findUnique({ where: { id: slotId }, include: { booking: true } });
  if (!slot || slot.groupId !== group.id) {
    return res.status(404).json({ error: "Slot non trovato" });
  }
  if (slot.status !== "free" || slot.booking) {
    return res.status(409).json({ error: "Questo slot è già stato prenotato da qualcun altro, scegline un altro." });
  }

  const booking = await prisma.$transaction(async (tx) => {
    const fresh = await tx.slot.findUnique({ where: { id: slotId } });
    if (fresh.status !== "free") {
      throw new Error("ALREADY_BOOKED");
    }
    await tx.slot.update({ where: { id: slotId }, data: { status: "booked" } });
    return tx.booking.create({
      data: {
        slotId,
        patientName: patientName.trim(),
        patientEmail: patientEmail.trim(),
      },
    });
  }).catch((e) => {
    if (e.message === "ALREADY_BOOKED") return null;
    throw e;
  });

  if (!booking) {
    return res.status(409).json({ error: "Questo slot è già stato prenotato da qualcun altro, scegline un altro." });
  }

  try {
    await sendBookingConfirmationToPatient({
      to: patientEmail,
      patientName,
      groupName: group.name,
      date: slot.date,
      time: slot.time,
    });
    await sendBookingNotificationToAdmin({
      patientName,
      patientEmail,
      groupName: group.name,
      date: slot.date,
      time: slot.time,
    });
  } catch (e) {
    console.error("Email non inviata:", e.message);
  }

  return res.status(201).json({ ok: true });
}
