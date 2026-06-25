import { prisma } from "../../../../../lib/prisma";
import { isAdminRequest } from "../../../../../lib/session";
import { sendCancellationToPatient } from "../../../../../lib/email";

export default async function handler(req, res) {
  // CRITICO: solo l'admin autenticato può cancellare una prenotazione.
  if (!isAdminRequest(req)) return res.status(401).json({ error: "Non autorizzato" });
  const { id } = req.query;

  if (req.method !== "POST") return res.status(405).end();

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { slot: { include: { group: true } } },
  });
  if (!booking) return res.status(404).json({ error: "Prenotazione non trovata" });

  await prisma.$transaction([
    prisma.booking.update({ where: { id }, data: { status: "cancelled" } }),
    prisma.slot.update({ where: { id: booking.slot.id }, data: { status: "free" } }),
    prisma.booking.delete({ where: { id } }),
  ]);

  try {
    await sendCancellationToPatient({
      to: booking.patientEmail,
      patientName: booking.patientName,
      groupName: booking.slot.group.name,
      date: booking.slot.date,
      time: booking.slot.time,
    });
  } catch (e) {
    console.error("Email cancellazione non inviata:", e.message);
  }

  return res.status(200).json({ ok: true });
}
