import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function BookGroup() {
  const router = useRouter();
  const { slug } = router.query;

  const [group, setGroup] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState(null); // { date, time, id }
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/public/groups/${slug}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Link non valido");
        }
        return res.json();
      })
      .then(setGroup)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    if (!selectedSlot) return setFormError("Seleziona prima uno slot");
    if (!name.trim() || !email.trim()) return setFormError("Compila nome e email");

    setSubmitting(true);
    const res = await fetch(`/api/public/groups/${slug}/book`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slotId: selectedSlot.id, patientName: name.trim(), patientEmail: email.trim() }),
    });
    const data = await res.json();
    setSubmitting(false);

    if (res.ok) {
      setDone(true);
    } else {
      setFormError(data.error || "Errore durante la prenotazione");
      if (res.status === 409) {
        // lo slot non è più libero, ricarica
        fetch(`/api/public/groups/${slug}`).then((r) => r.json()).then(setGroup);
        setSelectedSlot(null);
      }
    }
  }

  if (loading) return <Centered>Caricamento...</Centered>;
  if (error) return <Centered><p style={{ color: "#c44" }}>{error}</p></Centered>;

  if (done) {
    return (
      <Centered>
        <div style={{ textAlign: "center", maxWidth: 380 }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>✅</div>
          <h2 style={{ fontSize: 22, marginBottom: 10 }}>Prenotazione confermata!</h2>
          <p style={{ color: "#5b6878", fontSize: 14.5 }}>
            Riceverai una email di conferma a <strong>{email}</strong> con i dettagli dell'appuntamento
            del <strong>{selectedSlot.date}</strong> alle <strong>{selectedSlot.time}</strong>.
          </p>
        </div>
      </Centered>
    );
  }

  const dates = Object.keys(group.slotsByDate).sort();

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper-soft)", padding: "48px 20px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <p style={{ color: "var(--navy)", fontSize: 22, fontWeight: 800 }}>NutriPEM</p>
          <p style={{ color: "#5b6878", fontSize: 15, marginTop: 6 }}>Prenota il tuo appuntamento — {group.name}</p>
        </div>

        {!selectedSlot ? (
          <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 18, padding: 28 }}>
            <h3 style={{ fontSize: 17, marginBottom: 18 }}>Scegli giorno e orario</h3>
            {dates.length === 0 && <p style={{ color: "#8a96a6" }}>Nessuno slot disponibile al momento, contatta lo studio.</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {dates.map((date) => (
                <div key={date}>
                  <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 8 }}>{formatDate(date)}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {group.slotsByDate[date].map((slot) => (
                      <button
                        key={slot.id}
                        onClick={() => setSelectedSlot({ ...slot, date })}
                        className="btn btn-outline"
                        style={{ padding: "9px 16px" }}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 18, padding: 28 }}>
            <div style={{
              background: "var(--paper-soft)", borderRadius: 12, padding: "14px 18px", marginBottom: 22,
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div>
                <div style={{ fontWeight: 700 }}>{formatDate(selectedSlot.date)}</div>
                <div style={{ color: "#5b6878", fontSize: 13.5 }}>ore {selectedSlot.time}</div>
              </div>
              <button type="button" onClick={() => setSelectedSlot(null)} style={{ background: "none", border: "none", color: "#5b6878", fontSize: 13, fontWeight: 700 }}>
                Cambia
              </button>
            </div>

            <Field label="Nome e cognome">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Il tuo nome" style={fieldStyle} required />
            </Field>
            <Field label="Email">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@esempio.it" style={fieldStyle} required />
            </Field>

            {formError && <p style={{ color: "#c44", fontSize: 13.5, marginBottom: 14 }}>{formError}</p>}

            <button type="submit" disabled={submitting} className="btn btn-navy" style={{ width: "100%", justifyContent: "center" }}>
              {submitting ? "Invio in corso..." : "Confirma prenotazione"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 7 }}>{label}</label>
      {children}
    </div>
  );
}

const fieldStyle = { width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid var(--line)", fontSize: 14.5 };

function Centered({ children }) {
  return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>{children}</div>;
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
}
