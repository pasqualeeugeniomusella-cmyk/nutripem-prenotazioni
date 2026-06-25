import { clearAdminCookie } from "../../../lib/session";

export default function handler(req, res) {
  res.setHeader("Set-Cookie", clearAdminCookie());
  res.status(200).json({ ok: true });
}
