import { prisma } from "../../../../../lib/prisma";
import { isAdminRequest } from "../../../../../lib/session";

export default async function handler(req, res) {
  if (!isAdminRequest(req)) return res.status(401).json({ error: "Non autorizzato" });
  const { id } = req.query;

  if (req.method === "DELETE") {
    await prisma.group.delete({ where: { id } }).catch(() => null);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).end();
}
