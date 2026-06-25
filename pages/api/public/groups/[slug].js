import { prisma } from "../../../../lib/prisma";

export default async function handler(req, res) {
  const { slug } = req.query;
  if (req.method !== "GET") return res.status(405).end();

  const group = await prisma.group.findUnique({
    where: { slug },
    include: {
      slots: {
        where: { status: "free" },
        orderBy: [{ date: "asc" }, { time: "asc" }],
      },
    },
  });

  if (!group) return res.status(404).json({ error: "Link non valido" });

  // Raggruppa gli slot liberi per giorno, comodo per il frontend
  const byDate = {};
  for (const slot of group.slots) {
    if (!byDate[slot.date]) byDate[slot.date] = [];
    byDate[slot.date].push({ id: slot.id, time: slot.time });
  }

  return res.status(200).json({
    id: group.id,
    name: group.name,
    slug: group.slug,
    slotsByDate: byDate,
  });
}
