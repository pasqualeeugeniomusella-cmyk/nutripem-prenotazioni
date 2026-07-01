import { prisma } from "../../../lib/prisma.js";
import { requireAdmin } from "../../../lib/session.js";

// Trasforma un nome in slug: "Squadra Under 17" -> "squadra-under-17"
function slugify(text) {
  return text
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default async function handler(req, res) {
  if (!(await requireAdmin(req, res))) return;

  // Lista gruppi con conteggio slot e prenotazioni
  if (req.method === "GET") {
    const groups = await prisma.group.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { slots: true } },
        slots: { select: { booking: { select: { id: true } } } },
      },
    });
    const data = groups.map((g) => ({
      id: g.id,
      name: g.name,
      slug: g.slug,
      slotCount: g._count.slots,
      bookedCount: g.slots.filter((s) => s.booking).length,
    }));
    return res.status(200).json({ groups: data });
  }

  // Crea gruppo
  if (req.method === "POST") {
    const { name } = req.body || {};
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Il nome del gruppo è obbligatorio." });
    }
    let base = slugify(name);
    if (!base) base = "gruppo";
    // Garantisce slug unico aggiungendo un suffisso se serve
    let slug = base;
    let i = 2;
    while (await prisma.group.findUnique({ where: { slug } })) {
      slug = `${base}-${i++}`;
    }
    const group = await prisma.group.create({ data: { name: name.trim(), slug } });
    return res.status(201).json({ group });
  }

  // Elimina gruppo (e a cascata slot/prenotazioni)
  if (req.method === "DELETE") {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: "id mancante" });
    await prisma.group.delete({ where: { id } });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Metodo non consentito" });
}
