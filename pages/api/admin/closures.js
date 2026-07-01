import { prisma } from "../../../lib/prisma.js";
import { requireAdmin } from "../../../lib/session.js";
import { localDayToUtc } from "../../../lib/time.js";

export default async function handler(req, res) {
  if (!(await requireAdmin(req, res))) return;

  if (req.method === "GET") {
    const closures = await prisma.closure.findMany({
      orderBy: { day: "asc" },
      include: { group: { select: { name: true } } },
    });
    return res.status(200).json({ closures });
  }

  if (req.method === "POST") {
    const { day, groupId, reason } = req.body || {};
    if (!day) return res.status(400).json({ error: "Indica il giorno da chiudere." });
    const closure = await prisma.closure.create({
      data: { day: localDayToUtc(day), groupId: groupId || null, reason: reason || null },
    });
    return res.status(201).json({ closure });
  }

  if (req.method === "DELETE") {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: "id mancante" });
    await prisma.closure.delete({ where: { id } });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Metodo non consentito" });
}
