import { getIronSession } from "iron-session";

// Impostazioni del cookie di sessione cifrato.
// SESSION_SECRET deve essere lungo almeno 32 caratteri.
export const sessionOptions = {
  password: process.env.SESSION_SECRET || "",
  cookieName: "nutripem_admin",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 8, // 8 ore
  },
};

// Recupera la sessione da una coppia req/res (API routes).
export async function getSession(req, res) {
  return getIronSession(req, res, sessionOptions);
}

// Da usare all'inizio di ogni API admin: blocca chi non ha fatto login.
// Ritorna true se la richiesta è autenticata, altrimenti risponde 401 e ritorna false.
export async function requireAdmin(req, res) {
  const session = await getSession(req, res);
  if (!session.isAdmin) {
    res.status(401).json({ error: "Non autorizzato. Effettua il login." });
    return false;
  }
  return true;
}
