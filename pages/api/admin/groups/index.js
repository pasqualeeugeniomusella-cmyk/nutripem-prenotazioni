import { prisma } from "../../../../lib/prisma";
import { isAdminRequest } from "../../../../lib/session";

function slugify(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default async function handler(req, res) {
  if (!isAdminRequest(req)) return res.status(401).json({ error: "Non autorizzato" });

  if (req.method === "GET") {
    const groups = await prisma.group.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        slots: {
          include: { booking: true },
          orderBy: [{ date: "asc" }, { time: "asc" }],
        },
      },
    });
    return res.status(200).json(groups);
  }

  if (req.method === "POST") {
    const { name } = req.body || {};
    if (!name || !name.trim()) return res.status(400).json({ error: "Nome gruppo richiesto" });

    let slug = slugify(name);
    let suffix = 0;
    while (await prisma.group.findUnique({ where: { slug: suffix ? `${slug}-${suffix}` : slug } })) {
      suffix += 1;
    }
    if (suffix) slug = `${slug}-${suffix}`;

    const group = await prisma.group.create({ data: { name: name.trim(), slug } });
    return res.status(201).json(group);
  }

  return res.status(405).end();
}
