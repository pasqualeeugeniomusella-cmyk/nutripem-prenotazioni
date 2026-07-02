import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import Head from "next/head";

async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Errore");
  return data;
}

function dayLabel(iso) {
  return new Date(iso).toLocaleDateString("it-IT", {
    timeZone: "Europe/Rome",
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}
function timeLabel(iso) {
  return new Date(iso).toLocaleTimeString("it-IT", {
    timeZone: "Europe/Rome",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function BookPage() {
  const router = useRouter();
  const { slug } = router.query;

  const [groupName, setGroupName] = useState("");
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [selected, setSelected] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const data = await api(`/api/public/slots?slug=${slug}`);
      setGroupName(data.groupName);
      setSlots(data.slots);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  async function book() {
    if (!selected) {
      setMsg({ type: "error", text: "Scegli un orario." });
      return;
    }
    setSubmitting(true);
    setMsg(null);
    try {
      await api("/api/public/book", {
        method: "POST",
        body: JSON.stringify({ slotId: selected, patientName: name, patientEmail: email }),
      });
      setDone(true);
    } catch (err) {
      setMsg({ type: "error", text: err.message });
      // Se lo slot è stato preso da un altro, ricarico la lista
      load();
      setSelected(null);
    } finally {
      setSubmitting(false);
    }
  }

  // Raggruppa slot per giorno
  const byDay = {};
  for (const s of slots) {
    const key = dayLabel(s.startAt);
    (byDay[key] = byDay[key] || []).push(s);
  }

  return (
    <>
      <Head>
        <title>Prenota — NutriPEM</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="public-wrap">
        <div className="public-top">
          <div className="logo">NutriPEM</div>
          <div className="subtitle">Prenotazioni</div>
        </div>
        {loading ? (
          <div className="card">
            <p>Caricamento…</p>
          </div>
        ) : notFound ? (
          <div className="card">
            <h2>Link non valido</h2>
            <p className="hint">
              Questo link di prenotazione non esiste. Controlla di averlo copiato per intero.
            </p>
          </div>
        ) : done ? (
          <div className="card">
            <h2>✅ Prenotazione confermata</h2>
            <p>
              Grazie {name}! Ti abbiamo inviato un'email di conferma a <b>{email}</b> con
              i dettagli dell'appuntamento. Se non potrai venire, contattaci per disdire o
              spostare.
            </p>
          </div>
        ) : (
          <>
            <div className="card">
              <h2>Prenota un appuntamento</h2>
              <p className="hint">{groupName}</p>

              {slots.length === 0 ? (
                <div className="empty">
                  Al momento non ci sono orari disponibili. Riprova più tardi.
                </div>
              ) : (
                Object.entries(byDay).map(([day, items]) => (
                  <div key={day} className="day-block">
                    <h4>{day}</h4>
                    <div className="slot-grid">
                      {items.map((s) => (
                        <button
                          key={s.id}
                          className={selected === s.id ? "selected" : ""}
                          onClick={() => setSelected(s.id)}
                        >
                          {timeLabel(s.startAt)}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            {slots.length > 0 && (
              <div className="card">
                <h2>I tuoi dati</h2>
                <label>Nome e cognome</label>
                <input value={name} onChange={(e) => setName(e.target.value)} />
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tua@email.it"
                />
                {msg && <div className={`msg ${msg.type}`}>{msg.text}</div>}
                <button
                  style={{ marginTop: 16, width: "100%" }}
                  onClick={book}
                  disabled={submitting}
                >
                  {submitting ? "Prenotazione…" : "Conferma prenotazione"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
