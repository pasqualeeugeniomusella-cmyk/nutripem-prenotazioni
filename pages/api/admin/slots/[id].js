import { prisma } from "../../../../lib/prisma";
import { isAdminRequest } from "../../../../lib/session";

export default async function handler(req, res) {
  if (!isAdminRequest(req)) return res.status(401).json({ error: "Non autorizzato" });
  const { id } = req.query;

  if (req.method === "DELETE") {
    const slot = await prisma.slot.findUnique({ where: { id }, include: { booking: true } });
    if (!slot) return res.status(404).json({ error: "Slot non trovato" });
    if (slot.booking) return res.status(400).json({ error: "Non puoi eliminare uno slot già prenotato, annulla prima la prenotazione" });
    await prisma.slot.delete({ where: { id } });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).end();
}
