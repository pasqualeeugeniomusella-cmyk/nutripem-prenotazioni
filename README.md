# NutriPEM — Sistema prenotazioni (v2)

Sistema completo di prenotazione con database, gruppi/link, generazione slot in blocco,
email automatiche di conferma/annullamento, **promemoria automatico 24h prima**,
e **gestione ferie/chiusure**.

## Cosa fa

**Tu (admin)** accedi a `/admin` con la tua password. Da lì puoi:
- **Vedere gli appuntamenti di oggi** in ordine di orario (schermata "Oggi"), comoda ogni mattina
- Vedere tutti i **prossimi appuntamenti**
- Creare **gruppi** (es. "Squadra Under 17", "Clienti privati") → ognuno genera un link da inviare
- **Generare slot in blocco**: selezioni più giorni + un intervallo orario (es. 09:00–13:00 ogni 30 min) e con un click crei tutti gli slot (i duplicati vengono saltati automaticamente)
- **Cancellare** una prenotazione (il paziente riceve un'email di annullamento)
- Impostare **giorni di ferie/chiusura**: in quei giorni nessuno può prenotare

**I pazienti** aprono il link del loro gruppo (es. `.../book/clienti-privati`), vedono solo gli
orari liberi, scelgono uno slot, inseriscono nome ed email → ricevono subito conferma via email.
Nella conferma il cliente trova data e ora dell'appuntamento. Per disdire o spostare, contatta te.

## Novità e miglioramenti rispetto alla v1

- 🔒 **Sicurezza**: login con sessione cifrata (iron-session); **tutte** le API admin sono protette, non solo la pagina.
- 🛡️ **Niente doppie prenotazioni**: vincolo a livello di database, due persone non possono prendere lo stesso orario.
- 🕐 **Fuso orario Europe/Rome** gestito correttamente (nessuno slot sfasato tra ora legale e solare).
- 📧 **Promemoria automatico** 24h prima (Vercel Cron).
- 🏖️ **Ferie/chiusure** globali o per singolo gruppo.
- ✅ Validazione email e dati lato server.

## Installazione in locale

```bash
npm install
cp .env.example .env        # poi modifica i valori dentro .env
npx prisma migrate dev      # crea le tabelle
npm run dev
```

Apri http://localhost:3000/admin — la password è quella in `.env` (`ADMIN_PASSWORD`).

> Per il test locale rapido puoi usare SQLite: in `prisma/schema.prisma` metti
> `provider = "sqlite"` e in `.env` `DATABASE_URL="file:./dev.db"`. Per la produzione
> su Vercel serve Postgres (vedi sotto).

## Variabili d'ambiente (`.env`)

| Variabile | Cosa è |
| --- | --- |
| `DATABASE_URL` | Stringa di connessione Postgres (Neon/Supabase) in produzione. |
| `ADMIN_PASSWORD` | La password con cui accedi tu a `/admin`. Usane una lunga. |
| `SESSION_SECRET` | Stringa segreta ≥32 caratteri per cifrare il login. `openssl rand -base64 32` |
| `RESEND_API_KEY` | API key di [resend.com](https://resend.com) per inviare le email. |
| `EMAIL_FROM` | Indirizzo mittente. In test: `onboarding@resend.dev`. |
| `ADMIN_EMAIL` | La tua email, per la notifica ad ogni nuova prenotazione. |
| `NEXT_PUBLIC_BASE_URL` | L'indirizzo pubblico del sito (per i link nelle email). |
| `CRON_SECRET` | Stringa a caso che protegge l'endpoint dei promemoria. |

Senza `RESEND_API_KEY` il sito funziona lo stesso (le prenotazioni si salvano), ma le email
vengono solo scritte nei log del server.

## Pubblicare online su Vercel

1. Fai il push di questi file su un repository GitHub.
2. Crea un database Postgres gratuito su [neon.tech](https://neon.tech) o [supabase.com](https://supabase.com) e copia la connection string.
3. Su [vercel.com](https://vercel.com) → **New Project** → importa il repository.
4. In **Settings → Environment Variables** inserisci tutte le variabili della tabella sopra.
5. **Deploy.** Alla prima build Prisma genera il client; poi esegui la migrazione una volta:
   - dal tuo computer, con `DATABASE_URL` di produzione impostata: `npx prisma migrate deploy`
   - (in alternativa puoi lanciarla dalla console del provider del database)
6. I **promemoria** partono da soli: `vercel.json` registra un cron giornaliero alle 9:00
   che chiama `/api/cron/reminders`.

## Sicurezza (importante)

- Solo chi conosce `ADMIN_PASSWORD` accede a `/admin` e alle API admin.
- I clienti dal link pubblico possono **solo** vedere gli slot liberi e prenotarne uno.
  La cancellazione delle prenotazioni è riservata a te dall'area admin.
- Scegli una `ADMIN_PASSWORD` lunga e un `SESSION_SECRET` casuale.
- Attiva i **backup automatici** del database dal pannello di Neon/Supabase.

## Struttura

```
lib/           prisma, sessione, email, gestione fuso orario
pages/
  admin/       pannello amministratore
  book/[slug]  pagina pubblica di prenotazione

  api/
    admin/     login, gruppi, slot, chiusure, prenotazioni (protette)
    public/    slot liberi, prenota, disdici
    cron/      promemoria giornaliero
prisma/        schema e migrazione
styles/        foglio di stile
```
