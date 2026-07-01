import { Resend } from "resend";
import { formatItalian } from "./time.js";

// Se manca la chiave, il sito funziona lo stesso ma le email vengono solo
// stampate nei log (utile in fase di test).
const resendKey = process.env.RESEND_API_KEY;
const resend = resendKey ? new Resend(resendKey) : null;

const FROM = process.env.EMAIL_FROM || "onboarding@resend.dev";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";

async function send({ to, subject, html }) {
  if (!resend) {
    console.log(`[EMAIL non inviata - manca RESEND_API_KEY] a: ${to} | ${subject}`);
    return { skipped: true };
  }
  try {
    const result = await resend.emails.send({ from: FROM, to, subject, html });
    return result;
  } catch (err) {
    console.error("Errore invio email:", err);
    return { error: true };
  }
}

function layout(inner) {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#1f2937">
    <div style="background:#0f1729;color:#fff;padding:16px 20px;border-radius:8px 8px 0 0;font-size:18px;font-weight:bold">NutriPEM</div>
    <div style="border:1px solid #e5e7eb;border-top:none;padding:20px;border-radius:0 0 8px 8px">${inner}</div>
  </div>`;
}

// Al paziente: conferma prenotazione (senza link di disdetta)
export async function sendBookingConfirmation(booking, slot) {
  const when = formatItalian(slot.startAt, "EEEE dd/MM/yyyy 'alle' HH:mm");
  const html = layout(`
    <p>Ciao ${booking.patientName},</p>
    <p>la tua prenotazione è <b>confermata</b> per:</p>
    <p style="font-size:18px;background:#f7fee7;padding:12px;border-radius:6px">📅 ${when}</p>
    <p>Se non puoi più venire, contattaci per disdire o spostare l'appuntamento.</p>
    <p style="color:#6b7280;font-size:13px">Se non hai richiesto tu questa prenotazione, ignora questa email.</p>
  `);
  return send({ to: booking.patientEmail, subject: "Prenotazione confermata — NutriPEM", html });
}

// A te (admin): notifica di nuova prenotazione
export async function sendAdminNotification(booking, slot, groupName) {
  if (!ADMIN_EMAIL) return { skipped: true };
  const when = formatItalian(slot.startAt, "dd/MM/yyyy HH:mm");
  const html = layout(`
    <p><b>Nuova prenotazione</b></p>
    <p>Gruppo: ${groupName}<br/>
    Quando: ${when}<br/>
    Paziente: ${booking.patientName}<br/>
    Email: ${booking.patientEmail}</p>
  `);
  return send({ to: ADMIN_EMAIL, subject: `Nuova prenotazione: ${booking.patientName} — ${when}`, html });
}

// Al paziente: conferma di annullamento (inviata quando l'admin cancella)
export async function sendCancellationEmail(booking, slot) {
  const when = formatItalian(slot.startAt, "EEEE dd/MM/yyyy 'alle' HH:mm");
  const html = layout(`
    <p>Ciao ${booking.patientName},</p>
    <p>la tua prenotazione del <b>${when}</b> è stata <b>annullata</b>.</p>
    <p>Per fissare un nuovo appuntamento contattaci o usa il link di prenotazione.</p>
  `);
  return send({ to: booking.patientEmail, subject: "Prenotazione annullata — NutriPEM", html });
}

// Al paziente: promemoria 24h prima (senza link di disdetta)
export async function sendReminderEmail(booking, slot) {
  const when = formatItalian(slot.startAt, "EEEE dd/MM/yyyy 'alle' HH:mm");
  const html = layout(`
    <p>Ciao ${booking.patientName},</p>
    <p>ti ricordiamo il tuo appuntamento di <b>domani</b>:</p>
    <p style="font-size:18px;background:#f7fee7;padding:12px;border-radius:6px">📅 ${when}</p>
    <p>Se non puoi venire, contattaci il prima possibile.</p>
  `);
  return send({ to: booking.patientEmail, subject: "Promemoria appuntamento di domani — NutriPEM", html });
}
