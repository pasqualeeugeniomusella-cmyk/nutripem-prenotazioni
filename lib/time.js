import { fromZonedTime, toZonedTime, format } from "date-fns-tz";

// Tutto il sito ragiona in orario italiano, ma nel database salviamo UTC.
// Queste funzioni convertono avanti e indietro in modo coerente,
// gestendo automaticamente ora legale/solare.

export const TZ = "Europe/Rome";

// Da "orario italiano scelto dall'utente" -> istante UTC da salvare nel db.
// Esempio input: date "2025-03-15", time "09:30"
export function localDateTimeToUtc(dateStr, timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  const [y, mo, d] = dateStr.split("-").map(Number);
  // Costruiamo la data "come se fosse" a Roma, poi la convertiamo in UTC reale.
  const naive = new Date(y, mo - 1, d, h, m, 0, 0);
  return fromZonedTime(naive, TZ);
}

// Mezzanotte italiana di un giorno -> UTC (per le chiusure).
export function localDayToUtc(dateStr) {
  return localDateTimeToUtc(dateStr, "00:00");
}

// Da istante UTC (db) -> stringhe leggibili in orario italiano.
export function formatItalian(utcDate, pattern = "dd/MM/yyyy HH:mm") {
  const zoned = toZonedTime(utcDate, TZ);
  return format(zoned, pattern, { timeZone: TZ });
}

// Solo il giorno, formato yyyy-MM-dd in orario italiano (per raggruppare per data).
export function italianDayKey(utcDate) {
  const zoned = toZonedTime(utcDate, TZ);
  return format(zoned, "yyyy-MM-dd", { timeZone: TZ });
}
