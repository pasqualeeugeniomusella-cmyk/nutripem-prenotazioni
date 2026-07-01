import { getSession } from "../../../lib/session.js";

// POST /api/admin/login  { password }
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  const { password } = req.body || {};
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected) {
    return res.status(500).json({ error: "ADMIN_PASSWORD non configurata sul server." });
  }

  // Confronto semplice. La password non è mai esposta al client.
  if (!password || password !== expected) {
    // Piccolo ritardo per rendere meno comodo il tentativo a forza bruta.
    await new Promise((r) => setTimeout(r, 500));
    return res.status(401).json({ error: "Password errata." });
  }

  const session = await getSession(req, res);
  session.isAdmin = true;
  await session.save();
  return res.status(200).json({ ok: true });
}
