import { google } from "googleapis";

// ==== Sincronizzazione con Google Calendar ====
// Usa un "account di servizio": il sito agisce da solo, senza login manuale.
// Serve impostare su Vercel:
//   GOOGLE_CLIENT_EMAIL   -> email dell'account di servizio
//   GOOGLE_PRIVATE_KEY    -> chiave privata (con \n al posto degli a-capo)
//   GOOGLE_CALENDAR_ID    -> id del calendario dove scrivere gli eventi
//
// Se una di queste manca, la sincronizzazione viene semplicemente saltata:
// il sito continua a funzionare, le prenotazioni si salvano comunque.

const CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID;
const TZ = "Europe/Rome";

function isConfigured() {
  return Boolean(CLIENT_EMAIL && PRIVATE_KEY && CALENDAR_ID);
}

function getCalendarClient() {
  // La chiave privata su Vercel viene salvata con \n testuali: li ripristino.
  const key = PRIVATE_KEY.replace(/\\n/g, "\n");
  const auth = new google.auth.JWT({
    email: CLIENT_EMAIL,
    key,
    scopes: ["https://www.googleapis.com/auth/calendar.events"],
  });
  return google.calendar({ version: "v3", auth });
}

// Crea un evento su Google Calendar per una prenotazione.
// Ritorna l'id dell'evento (da salvare), oppure null se non configurato/errore.
export async function createCalendarEvent({ startAt, durationMin, groupName, patientName, patientEmail }) {
  if (!isConfigured()) return null;
  try {
    const calendar = getCalendarClient();
    const start = new Date(startAt);
    const end = new Date(start.getTime() + (durationMin || 30) * 60000);
    const res = await calendar.events.insert({
      calendarId: CALENDAR_ID,
      requestBody: {
        summary: `${patientName} — ${groupName}`,
        description: `Prenotazione NutriPEM\nGruppo: ${groupName}\nCliente: ${patientName}\nEmail: ${patientEmail}`,
        start: { dateTime: start.toISOString(), timeZone: TZ },
        end: { dateTime: end.toISOString(), timeZone: TZ },
      },
    });
    return res.data.id || null;
  } catch (err) {
    console.error("Google Calendar - errore creazione evento:", err.message);
    return null;
  }
}

// Elimina l'evento da Google Calendar (quando la prenotazione viene cancellata).
export async function deleteCalendarEvent(eventId) {
  if (!isConfigured() || !eventId) return;
  try {
    const calendar = getCalendarClient();
    await calendar.events.delete({ calendarId: CALENDAR_ID, eventId });
  } catch (err) {
    console.error("Google Calendar - errore eliminazione evento:", err.message);
  }
}
