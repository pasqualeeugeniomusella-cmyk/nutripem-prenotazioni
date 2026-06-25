import { useEffect, useState, useMemo } from "react";
import { isAdminRequest } from "../../lib/session";

export async function getServerSideProps({ req }) {
  if (!isAdminRequest(req)) {
    return { redirect: { destination: "/admin/login", permanent: false } };
  }
  return { props: {} };
}

const monthNames = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
const weekdays = ["Dom","Lun","Mar","Mer","Gio","Ven","Sab"];

function pad(n){ return n.toString().padStart(2,"0"); }
function toDateKey(y,m,d){ return `${y}-${pad(m+1)}-${pad(d)}`; }

export default function AdminDashboard() {
  const [view, setView] = useState("groups"); // groups | calendar
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [toast, setToast] = useState("");

  // calendar bulk-create state
  const [viewDate, setViewDate] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [selectedDays, setSelectedDays] = useState(new Set());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("13:00");
  const [interval, setIntervalMin] = useState(30);
  const [generating, setGenerating] = useState(false);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  function showToast(msg){
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  async function loadGroups(){
    setLoading(true);
    const res = await fetch("/api/admin/groups");
    if (res.ok) setGroups(await res.json());
    setLoading(false);
  }

  useEffect(() => { loadGroups(); }, []);

  const selectedGroup = groups.find(g => g.id === selectedGroupId) || null;

  async function handleCreateGroup(e){
    e.preventDefault();
    if (!newGroupName.trim()) return;
    const res = await fetch("/api/admin/groups", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newGroupName.trim() }),
    });
    if (res.ok){
      setNewGroupName("");
      await loadGroups();
      showToast("Gruppo creato");
    }
  }

  async function handleDeleteGroup(id){
    if (!confirm("Eliminare questo gruppo e tutti i suoi slot/prenotazioni?")) return;
    await fetch(`/api/admin/groups/${id}`, { method: "DELETE" });
    if (selectedGroupId === id) setSelectedGroupId(null);
    await loadGroups();
    showToast("Gruppo eliminato");
  }

  function copyLink(slug){
    const link = `${baseUrl}/book/${slug}`;
    navigator.clipboard.writeText(link).then(() => showToast("Link copiato negli appunti"));
  }

  function openCalendarFor(groupId){
    setSelectedGroupId(groupId);
    setView("calendar");
    setSelectedDays(new Set());
  }

  function toggleDay(key){
    setSelectedDays(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  async function handleGenerateSlots(){
    if (!selectedGroup) return;
    if (selectedDays.size === 0) return showToast("Seleziona almeno un giorno");
    setGenerating(true);
    const res = await fetch(`/api/admin/groups/${selectedGroup.id}/slots`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dates: Array.from(selectedDays),
        startTime, endTime, intervalMinutes: interval,
      }),
    });
    setGenerating(false);
    const data = await res.json();
    if (res.ok){
      showToast(`${data.created} slot creati${data.skipped ? `, ${data.skipped} già esistenti` : ""}`);
      setSelectedDays(new Set());
      await loadGroups();
    } else {
      showToast(data.error || "Errore nella generazione");
    }
  }

  async function handleCancelBooking(bookingId){
    if (!confirm("Annullare questa prenotazione? Verrà inviata una email al paziente.")) return;
    const res = await fetch(`/api/admin/bookings/${bookingId}/cancel`, { method: "POST" });
    if (res.ok){
      showToast("Prenotazione annullata, email inviata al paziente");
      await loadGroups();
    } else {
      showToast("Errore durante l'annullamento");
    }
  }

  async function handleDeleteSlot(slotId){
    const res = await fetch(`/api/admin/slots/${slotId}`, { method: "DELETE" });
    const data = await res.json();
    if (res.ok){ await loadGroups(); } else { showToast(data.error || "Errore"); }
  }

  // build calendar grid for viewDate
  const calendarDays = useMemo(() => {
    const y = viewDate.getFullYear(), m = viewDate.getMonth();
    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m+1, 0).getDate();
    const cells = [];
    for (let i=0;i<firstDay;i++) cells.push(null);
    for (let d=1; d<=daysInMonth; d++) cells.push(d);
    return cells;
  }, [viewDate]);

  const slotsByDate = useMemo(() => {
    if (!selectedGroup) return {};
    const map = {};
    for (const slot of selectedGroup.slots) {
      if (!map[slot.date]) map[slot.date] = [];
      map[slot.date].push(slot);
    }
    return map;
  }, [selectedGroup]);

  async function handleLogout(){
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* SIDEBAR */}
      <aside style={{
        width: 260, background: "var(--navy)", display: "flex", flexDirection: "column",
        borderRight: "1px solid rgba(255,255,255,0.1)", flexShrink: 0,
      }}>
        <div style={{ padding: "26px 24px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <p style={{ color: "#fff", fontSize: 18, fontWeight: 800 }}>NutriPEM</p>
          <p style={{ color: "var(--lime)", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", marginTop: 4 }}>Gestione Prenotazioni</p>
        </div>
        <nav style={{ flex: 1, padding: "18px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
          <SideButton active={view === "calendar"} onClick={() => setView("calendar")} label="Calendario & Slot" icon="📅" />
          <SideButton active={view === "groups"} onClick={() => setView("groups")} label="Gruppi & Link" icon="👥" />
        </nav>
        <div style={{ padding: "16px 24px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <button onClick={handleLogout} style={{
            background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 12.5, fontWeight: 600,
          }}>← Esci</button>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, padding: "40px 48px" }}>
        {view === "groups" && (
          <GroupsView
            groups={groups}
            loading={loading}
            newGroupName={newGroupName}
            setNewGroupName={setNewGroupName}
            onCreate={handleCreateGroup}
            onDelete={handleDeleteGroup}
            onCopyLink={copyLink}
            onManageSlots={openCalendarFor}
            baseUrl={baseUrl}
          />
        )}

        {view === "calendar" && (
          <CalendarView
            groups={groups}
            selectedGroup={selectedGroup}
            selectedGroupId={selectedGroupId}
            setSelectedGroupId={setSelectedGroupId}
            viewDate={viewDate}
            setViewDate={setViewDate}
            calendarDays={calendarDays}
            selectedDays={selectedDays}
            toggleDay={toggleDay}
            startTime={startTime} setStartTime={setStartTime}
            endTime={endTime} setEndTime={setEndTime}
            interval={interval} setIntervalMin={setIntervalMin}
            onGenerate={handleGenerateSlots}
            generating={generating}
            slotsByDate={slotsByDate}
            onCancelBooking={handleCancelBooking}
            onDeleteSlot={handleDeleteSlot}
          />
        )}
      </main>

      {toast && (
        <div style={{
          position: "fixed", bottom: 28, right: 28, background: "var(--navy)", color: "#fff",
          padding: "14px 22px", borderRadius: 12, fontSize: 14, fontWeight: 600,
          boxShadow: "0 10px 30px -8px rgba(0,0,0,0.3)",
        }}>{toast}</div>
      )}
    </div>
  );
}

function SideButton({ active, onClick, label, icon }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "12px 16px",
      borderRadius: 12, border: "none", background: active ? "var(--lime)" : "none",
      color: active ? "var(--navy)" : "rgba(255,255,255,0.6)", fontWeight: 600, fontSize: 14.5, textAlign: "left",
    }}>
      <span>{icon}</span>{label}
    </button>
  );
}

function GroupsView({ groups, loading, newGroupName, setNewGroupName, onCreate, onDelete, onCopyLink, onManageSlots, baseUrl }) {
  return (
    <div>
      <h1 style={{ fontSize: 34 }}>Gruppi & Link</h1>
      <p style={{ color: "#5b6878", fontSize: 14.5, marginTop: 6, marginBottom: 28 }}>
        Crea link di prenotazione dedicati per squadre, gruppi o singoli clienti.
      </p>
      <form onSubmit={onCreate} style={{ display: "flex", gap: 10, marginBottom: 28, flexWrap: "wrap" }}>
        <input
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          placeholder="Nome gruppo (es. Squadra Under 17)"
          style={{ flex: 1, minWidth: 220, padding: "12px 16px", borderRadius: 10, border: "1.5px solid var(--line)", fontSize: 14.5 }}
        />
        <button type="submit" className="btn btn-lime">+ Crea gruppo</button>
      </form>

      {loading ? <p>Caricamento...</p> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {groups.length === 0 && <p style={{ color: "#8a96a6" }}>Nessun gruppo creato ancora.</p>}
          {groups.map(g => {
            const totalSlots = g.slots.length;
            const booked = g.slots.filter(s => s.booking).length;
            return (
              <div key={g.id} style={{
                background: "#fff", border: "1px solid var(--line)", borderRadius: 16, padding: "20px 24px",
                display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14,
              }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>{g.name}</div>
                  <div style={{ color: "#5b6878", fontSize: 13, marginTop: 4, wordBreak: "break-all" }}>
                    {baseUrl}/book/{g.slug}
                  </div>
                  <div style={{ color: "#8a96a6", fontSize: 12.5, marginTop: 6 }}>
                    {totalSlots} slot totali · {booked} prenotati
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={() => onManageSlots(g.id)} className="btn btn-outline">Gestisci slot</button>
                  <button onClick={() => onCopyLink(g.slug)} className="btn btn-outline" style={{ borderColor: "var(--lime-dim)", color: "#5b8400" }}>Copia link</button>
                  <button onClick={() => onDelete(g.id)} className="btn btn-outline" style={{ borderColor: "#f0c9c9", color: "#c44" }}>Elimina</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CalendarView({
  groups, selectedGroup, selectedGroupId, setSelectedGroupId,
  viewDate, setViewDate, calendarDays, selectedDays, toggleDay,
  startTime, setStartTime, endTime, setEndTime, interval, setIntervalMin,
  onGenerate, generating, slotsByDate, onCancelBooking, onDeleteSlot,
}) {
  const y = viewDate.getFullYear(), m = viewDate.getMonth();
  const today = new Date();

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 18, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 34 }}>Calendario & Slot</h1>
          <p style={{ color: "#5b6878", fontSize: 14.5, marginTop: 6 }}>Seleziona un gruppo, poi i giorni e l'orario per generare gli slot in blocco.</p>
        </div>
        <select
          value={selectedGroupId || ""}
          onChange={(e) => setSelectedGroupId(e.target.value || null)}
          style={{ padding: "10px 16px", borderRadius: 10, border: "1.5px solid var(--line)", fontSize: 14.5, minWidth: 220 }}
        >
          <option value="">Seleziona gruppo...</option>
          {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>

      {!selectedGroup ? (
        <p style={{ color: "#8a96a6" }}>Seleziona un gruppo per gestirne il calendario e gli slot.</p>
      ) : (
        <>
          <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 18, padding: 26, marginBottom: 26 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <strong>{monthNames[m]} {y}</strong>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setViewDate(new Date(y, m-1, 1))} className="btn btn-outline" style={{ padding: "6px 12px" }}>‹</button>
                <button onClick={() => setViewDate(new Date(today.getFullYear(), today.getMonth(), 1))} className="btn btn-outline" style={{ padding: "6px 12px" }}>Oggi</button>
                <button onClick={() => setViewDate(new Date(y, m+1, 1))} className="btn btn-outline" style={{ padding: "6px 12px" }}>›</button>
              </div>
            </div>
            <p style={{ fontSize: 13, color: "#5b6878", marginBottom: 10 }}>Clicca sui giorni che vuoi rendere disponibili (puoi selezionarne più di uno):</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6, marginBottom: 6 }}>
              {weekdays.map(w => <span key={w} style={{ textAlign: "center", fontSize: 12, fontWeight: 700, color: "#8a96a6" }}>{w}</span>)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6 }}>
              {calendarDays.map((d, idx) => {
                if (d === null) return <div key={idx} />;
                const key = toDateKey(y, m, d);
                const isSelected = selectedDays.has(key);
                const isToday = key === toDateKey(today.getFullYear(), today.getMonth(), today.getDate());
                const hasSlots = !!slotsByDate[key];
                return (
                  <div
                    key={idx}
                    onClick={() => toggleDay(key)}
                    style={{
                      aspectRatio: "1", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14, fontWeight: 600, cursor: "pointer", position: "relative",
                      background: isSelected ? "var(--navy)" : (isToday ? "#f4ffd9" : "var(--paper-soft)"),
                      color: isSelected ? "#fff" : "var(--navy)",
                      border: isToday && !isSelected ? "1.5px solid var(--lime)" : "1.5px solid transparent",
                    }}
                  >
                    {d}
                    {hasSlots && <span style={{ position: "absolute", bottom: 5, width: 4, height: 4, borderRadius: "50%", background: isSelected ? "var(--lime)" : "var(--lime-dim)" }} />}
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end", marginTop: 20, paddingTop: 20, borderTop: "1px solid var(--line)" }}>
              <Field label="Dalle">
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Alle">
                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Ogni (minuti)">
                <input type="number" min="5" step="5" value={interval} onChange={(e) => setIntervalMin(e.target.value)} style={{ ...inputStyle, width: 90 }} />
              </Field>
              <button onClick={onGenerate} disabled={generating} className="btn btn-lime">
                {generating ? "Generazione..." : `+ Genera slot (${selectedDays.size} giorni selezionati)`}
              </button>
            </div>
          </div>

          <SlotsList slotsByDate={slotsByDate} onCancelBooking={onCancelBooking} onDeleteSlot={onDeleteSlot} />
        </>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, marginBottom: 6, color: "#5b6878" }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = { padding: "10px 12px", borderRadius: 8, border: "1.5px solid var(--line)", fontSize: 14 };

function SlotsList({ slotsByDate, onCancelBooking, onDeleteSlot }) {
  const dates = Object.keys(slotsByDate).sort();
  if (dates.length === 0) return <p style={{ color: "#8a96a6" }}>Nessuno slot generato per questo gruppo ancora.</p>;

  return (
    <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 18, padding: 26 }}>
      <h3 style={{ fontSize: 18, marginBottom: 16 }}>Slot generati</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {dates.map(date => (
          <div key={date}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>{date}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {slotsByDate[date].sort((a,b) => a.time.localeCompare(b.time)).map(slot => (
                <div key={slot.id} style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 10,
                  background: slot.booking ? "#fdf0e0" : "var(--paper-soft)",
                  border: slot.booking ? "1px solid #eec98a" : "1px solid transparent",
                }}>
                  <span style={{ fontWeight: 700, fontSize: 13.5 }}>{slot.time}</span>
                  {slot.booking ? (
                    <>
                      <span style={{ fontSize: 12, color: "#7a5a1a" }}>· {slot.booking.patientName}</span>
                      <button onClick={() => onCancelBooking(slot.booking.id)} style={{
                        background: "none", border: "none", color: "#c44", fontSize: 12, fontWeight: 700,
                      }}>Annulla</button>
                    </>
                  ) : (
                    <button onClick={() => onDeleteSlot(slot.id)} style={{
                      background: "none", border: "none", color: "#8a96a6", fontSize: 12, fontWeight: 700,
                    }}>✕</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
