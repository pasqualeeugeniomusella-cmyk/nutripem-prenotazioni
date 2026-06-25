import crypto from "crypto";

const COOKIE_NAME = "nutripem_admin";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 giorni

function sign(value) {
  const secret = process.env.SESSION_SECRET || "dev-secret";
  const hmac = crypto.createHmac("sha256", secret).update(value).digest("hex");
  return `${value}.${hmac}`;
}

function verify(signed) {
  if (!signed) return false;
  const [value, hmac] = signed.split(".");
  if (!value || !hmac) return false;
  const expected = sign(value).split(".")[1];
  return hmac === expected && value === "admin-session-ok";
}

export function createAdminCookie() {
  const token = sign("admin-session-ok");
  return `${COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${MAX_AGE}; SameSite=Lax`;
}

export function clearAdminCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`;
}

export function isAdminRequest(req) {
  const cookieHeader = req.headers.cookie || "";
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE_NAME}=`));
  if (!match) return false;
  const token = match.split("=")[1];
  return verify(token);
}

export { COOKIE_NAME };
