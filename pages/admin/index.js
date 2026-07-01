import { useState, useEffect, useCallback } from "react";
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

// ---- helper date ----
function dayLabelLong(iso) {
  return new Date(iso).toLocaleDateString("it-IT", {
    timeZone: "Europe/Rome", weekday: "long", day: "2-digit", month: "long",
  });
}
function timeLabel(iso) {
  return new Date(iso).toLocaleTimeString("it-IT", {
    timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit",
  });
}
function ymd(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export default function Admin() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      await api("/api/admin/groups");
      setAuthed(true);
    } catch {
      setAuthed(false);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  if (checking) return <div className="center"><p>Caricamento…</p></div>;
  if (!authed) return <Login onSuccess={() => setAuthed(true)} />;
  return <Dashboard onLogout={() => setAuthed(false)} />;
}

// ---------- LOGIN ----------
function Login({ onSuccess }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api("/api/admin/login", { method: "POST", body: JSON.stringify({ password }) });
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head><title>Accesso admin — NutriPEM</title><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
      <div className="center">
        <div className="card" style={{ width: 380 }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 26, fontWeight: 800 }}>NutriPEM</div>
            <div style={{ color: "var(--lime-dark)", fontSize: 12, fontWeight: 700, letterSpacing: 1.5 }}>
              GESTIONE PRENOTAZIONI
            </div>
          </div>
          <h2>Accesso amministratore</h2>
          <p className="hint">Inserisci la password per gestire le prenotazioni.</p>
          <form onSubmit={submit}>
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
            {error && <div className="msg error">{error}</div>}
            <button style={{ marginTop: 18, width: "100%" }} disabled={loading}>
              {loading ? "Verifica…" : "Entra"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

// ---------- DASHBOARD ----------
const TABS = {
  today:    { label: "Oggi", icon: "☀️", title: "Appuntamenti di oggi", subtitle: "Tutti gli appuntamenti previsti per oggi, in ordine di orario." },
  upcoming: { label: "Prossimi", icon: "📋", title: "Prossimi appuntamenti", subtitle: "Tutti gli appuntamenti futuri." },
  calendar: { label: "Calendario & Slot", icon: "🗓", title: "Calendario & Slot", subtitle: "Seleziona i giorni, imposta gli orari e genera gli slot prenotabili." },
  groups:   { label: "Gruppi & Link", icon: "👥", title: "Gruppi & Link", subtitle: "Crea link di prenotazione dedicati per squadre, gruppi o singoli clienti." },
  closures: { label: "Ferie / Chiusure", icon: "🏖", title: "Ferie / Chiusure", subtitle: "Blocca i giorni in cui non ricevi: i clienti non potranno prenotare." },
};

function Dashboard({ onLogout }) {
  const [tab, setTab] = useState("today");

  async function logout() {
    await api("/api/admin/logout", { method: "POST" });
    onLogout();
  }

  const t = TABS[tab];

  return (
    <>
      <Head><title>Pannello admin — NutriPEM</title><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
      <div className="layout">
        <aside className="sidebar">
          <div>
            <div className="logo">NutriPEM</div>
            <div className="subtitle">Gestione Prenotazioni</div>
          </div>
          <nav>
            {Object.entries(TABS).map(([key, val]) => (
              <button key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}>
                <span>{val.icon}</span> {val.label}
              </button>
            ))}
          </nav>
          <div className="spacer" />
          <button className="logout" onClick={logout}>← Esci</button>
        </aside>

        <main className="main">
          <h1>{t.title}</h1>
          <p className="subtitle">{t.subtitle}</p>

          {tab === "today" && <BookingsView scope="today" />}
          {tab === "upcoming" && <BookingsView scope="upcoming" />}
          {tab === "calendar" && <CalendarView />}
          {tab === "groups" && <GroupsView />}
          {tab === "closures" && <ClosuresView />}
        </main>
      </div>
    </>
  );
}

// ---------- PRENOTAZIONI (Oggi / Prossimi) ----------
function BookingsView({ scope }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api(`/api/admin/bookings?scope=${scope}`);
      setBookings(data.bookings);
    } catch (err) {
      setMsg(err.message);
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => { load(); }, [load]);

  async function cancel(id) {
    if (!confirm("Cancellare questa prenotazione? Il cliente riceverà un'email di avviso.")) return;
    try {
      await api("/api/admin/bookings", { method: "DELETE", body: JSON.stringify({ id }) });
      load();
    } catch (err) {
      setMsg(err.message);
    }
  }

  const byDay = {};
  for (const b of bookings) {
    const key = dayLabelLong(b.startAt);
    (byDay[key] = byDay[key] || []).push(b);
  }

  return (
    <div className="card">
      {msg && <div className="msg error">{msg}</div>}
      {loading ? <p>Caricamento…</p> : bookings.length === 0 ? (
        <div className="empty">Nessun appuntamento.</div>
      ) : (
        Object.entries(byDay).map(([day, items]) => (
          <div key={day} className="day-block">
            <h4 style={{ textTransform: "capitalize" }}>{day}</h4>
            {items.map((b) => (
              <div key={b.id} className="list-item">
                <div>
                  <b style={{ fontSize: 17 }}>{timeLabel(b.startAt)}</b> — {b.patientName}
                  <div className="meta">{b.patientEmail} · <span className="pill">{b.groupName}</span></div>
                </div>
                <div className="actions">
                  <button className="ghost-red" onClick={() => cancel(b.id)}>Cancella</button>
                </div>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}

// ---------- CALENDARIO & SLOT ----------
function CalendarView() {
  const [groups, setGroups] = useState([]);
  const [groupId, setGroupId] = useState("");

  const loadGroups = useCallback(async () => {
    const data = await api("/api/admin/groups");
    setGroups(data.groups);
    if (data.groups.length && !groupId) setGroupId(data.groups[0].id);
  }, [groupId]);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  if (groups.length === 0) {
    return <div className="card"><div className="empty">Crea prima un gruppo nella sezione "Gruppi & Link".</div></div>;
  }

  return (
    <>
      <div className="card">
        <label>Gruppo</label>
        <select value={groupId} onChange={(e) => setGroupId(e.target.value)}>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>
      {groupId && <SlotManager groupId={groupId} />}
    </>
  );
}

function SlotManager({ groupId }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDays, setSelectedDays] = useState([]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("13:00");
  const [durationMin, setDurationMin] = useState(30);
  const [slots, setSlots] = useState([]);
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadSlots = useCallback(async () => {
    try {
      const data = await api(`/api/admin/slots?groupId=${groupId}`);
      setSlots(data.slots);
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    }
  }, [groupId]);

  useEffect(() => { loadSlots(); setSelectedDays([]); }, [loadSlots]);

  const monthName = new Date(year, month, 1).toLocaleDateString("it-IT", { month: "long", year: "numeric" });
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // lun=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = ymd(today.getFullYear(), today.getMonth(), today.getDate());

  function toggleDay(d) {
    const key = ymd(year, month, d);
    if (key < todayKey) return;
    setSelectedDays((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
  }
  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(year - 1); } else setMonth(month - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(year + 1); } else setMonth(month + 1);
  }

  async function generate() {
    if (selectedDays.length === 0) { setMsg({ type: "error", text: "Seleziona almeno un giorno." }); return; }
    setLoading(true); setMsg(null);
    try {
      const data = await api("/api/admin/slots", {
        method: "POST",
        body: JSON.stringify({ groupId, days: selectedDays, startTime, endTime, durationMin: Number(durationMin) }),
      });
      setMsg({ type: "success", text: `Creati ${data.created} slot${data.skipped ? ` (${data.skipped} già esistenti, saltati)` : ""}.` });
      setSelectedDays([]);
      loadSlots();
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  }

  async function removeSlot(id) {
    try {
      await api("/api/admin/slots", { method: "DELETE", body: JSON.stringify({ id }) });
      loadSlots();
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    }
  }

  // Raggruppa slot per data (yyyy-MM-dd italiano)
  const byDay = {};
  for (const s of slots) {
    const key = new Date(s.startAt).toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" }); // yyyy-MM-dd
    (byDay[key] = byDay[key] || []).push(s);
  }

  const weekdays = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

  return (
    <>
      <div className="card">
        <div className="cal-header">
          <h3>{monthName}</h3>
          <div className="cal-nav">
            <button className="ghost" onClick={prevMonth}>←</button>
            <button className="ghost" onClick={nextMonth}>→</button>
          </div>
        </div>

        <div className="cal-weekdays">
          {weekdays.map((w) => <span key={w}>{w}</span>)}
        </div>
        <div className="cal-grid">
          {Array.from({ length: firstWeekday }).map((_, i) => <div key={"e" + i} className="cal-cell empty" />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const d = i + 1;
            const key = ymd(year, month, d);
            const isPast = key < todayKey;
            const selected = selectedDays.includes(key);
            return (
              <button
                key={d}
                className={`cal-cell${selected ? " selected" : ""}${isPast ? " past" : ""}`}
                onClick={() => toggleDay(d)}
                disabled={isPast}
              >
                {d}
              </button>
            );
          })}
        </div>

        <div style={{ borderTop: "1px solid var(--gray-100)", margin: "24px 0" }} />

        <div className="row">
          <div style={{ maxWidth: 130 }}>
            <label>Dalle</label>
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </div>
          <div style={{ maxWidth: 130 }}>
            <label>Alle</label>
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </div>
          <div style={{ maxWidth: 130 }}>
            <label>Ogni (minuti)</label>
            <input type="number" min="5" step="5" value={durationMin} onChange={(e) => setDurationMin(e.target.value)} />
          </div>
          <button onClick={generate} disabled={loading} style={{ flex: 2 }}>
            {loading ? "Genero…" : `+ Genera slot (${selectedDays.length} giorni selezionati)`}
          </button>
        </div>
        {msg && <div className={`msg ${msg.type}`}>{msg.text}</div>}
      </div>

      <div className="card">
        <h2>Slot generati</h2>
        {slots.length === 0 ? (
          <div className="empty">Nessuno slot ancora generato per questo gruppo.</div>
        ) : (
          Object.entries(byDay).map(([day, items]) => (
            <div key={day} className="day-block">
              <h4>{day}</h4>
              <div className="slot-tags">
                {items.map((s) => (
                  <span key={s.id} className="slot-tag">
                    {timeLabel(s.startAt)}
                    {s.booked ? <span className="pill" style={{ marginLeft: 4 }}>prenotato</span>
                      : <button onClick={() => removeSlot(s.id)} title="Elimina">×</button>}
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}

// ---------- GRUPPI & LINK ----------
function GroupsView() {
  const [groups, setGroups] = useState([]);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState(null);
  const [baseUrl, setBaseUrl] = useState("");

  useEffect(() => { setBaseUrl(window.location.origin); }, []);

  const load = useCallback(async () => {
    try {
      const data = await api("/api/admin/groups");
      setGroups(data.groups);
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function createGroup(e) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await api("/api/admin/groups", { method: "POST", body: JSON.stringify({ name }) });
      setName("");
      load();
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    }
  }

  async function deleteGroup(id) {
    if (!confirm("Eliminare il gruppo con TUTTI i suoi slot e prenotazioni?")) return;
    try {
      await api("/api/admin/groups", { method: "DELETE", body: JSON.stringify({ id }) });
      load();
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    }
  }

  function copy(link) { navigator.clipboard?.writeText(link); }

  return (
    <>
      <div className="card">
        <form onSubmit={createGroup} className="row">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome gruppo (es. Squadra Under 17)" style={{ flex: 4 }} />
          <button style={{ flex: 1, minWidth: 150 }}>+ Crea gruppo</button>
        </form>
        {msg && <div className={`msg ${msg.type}`}>{msg.text}</div>}
      </div>

      {groups.map((g) => {
        const link = `${baseUrl}/book/${g.slug}`;
        return (
          <div key={g.id} className="card">
            <div className="list-item">
              <div>
                <h2>{g.name}</h2>
                <div className="link-mono" style={{ margin: "6px 0" }}>{link}</div>
                <div className="meta">{g.slotCount} slot totali · {g.bookedCount} prenotati</div>
              </div>
              <div className="actions">
                <button className="ghost-lime" onClick={() => copy(link)}>Copia link</button>
                <button className="ghost-red" onClick={() => deleteGroup(g.id)}>Elimina</button>
              </div>
            </div>
          </div>
        );
      })}
      {groups.length === 0 && <div className="empty">Nessun gruppo ancora creato.</div>}
    </>
  );
}

// ---------- FERIE / CHIUSURE ----------
function ClosuresView() {
  const [closures, setClosures] = useState([]);
  const [groups, setGroups] = useState([]);
  const [day, setDay] = useState("");
  const [groupId, setGroupId] = useState("");
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    try {
      const [c, g] = await Promise.all([api("/api/admin/closures"), api("/api/admin/groups")]);
      setClosures(c.closures);
      setGroups(g.groups);
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function add(e) {
    e.preventDefault();
    if (!day) { setMsg({ type: "error", text: "Scegli un giorno." }); return; }
    try {
      await api("/api/admin/closures", { method: "POST", body: JSON.stringify({ day, groupId: groupId || null, reason }) });
      setDay(""); setReason("");
      setMsg({ type: "success", text: "Giorno di chiusura aggiunto." });
      load();
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    }
  }

  async function remove(id) {
    try {
      await api("/api/admin/closures", { method: "DELETE", body: JSON.stringify({ id }) });
      load();
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    }
  }

  return (
    <>
      <div className="card">
        <form onSubmit={add}>
          <div className="row">
            <div><label>Giorno</label><input type="date" value={day} onChange={(e) => setDay(e.target.value)} /></div>
            <div>
              <label>Gruppo</label>
              <select value={groupId} onChange={(e) => setGroupId(e.target.value)}>
                <option value="">Tutti i gruppi</option>
                {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
          </div>
          <label>Motivo (facoltativo)</label>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Es. Ferie estive" />
          <button style={{ marginTop: 16 }}>+ Aggiungi chiusura</button>
        </form>
        {msg && <div className={`msg ${msg.type}`}>{msg.text}</div>}
      </div>

      <div className="card">
        <h2>Chiusure programmate</h2>
        {closures.length === 0 ? <div className="empty">Nessuna chiusura.</div> : (
          closures.map((c) => (
            <div key={c.id} className="list-item">
              <div>
                <b>{new Date(c.day).toLocaleDateString("it-IT", { timeZone: "Europe/Rome", weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</b>
                <div className="meta">{c.group ? c.group.name : "Tutti i gruppi"}{c.reason ? ` · ${c.reason}` : ""}</div>
              </div>
              <div className="actions"><button className="ghost" onClick={() => remove(c.id)}>Rimuovi</button></div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
