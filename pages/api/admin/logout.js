import { getSession } from "../../../lib/session.js";

// POST /api/admin/logout
export default async function handler(req, res) {
  const session = await getSession(req, res);
  session.destroy();
  return res.status(200).json({ ok: true });
}
