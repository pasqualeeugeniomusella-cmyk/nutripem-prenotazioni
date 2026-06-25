import { useState } from "react";
import { useRouter } from "next/router";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (res.ok) {
      router.push("/admin");
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Errore di accesso");
    }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--navy)",
    }}>
      <form onSubmit={handleSubmit} style={{
        background: "#fff", borderRadius: 20, padding: "40px 36px", width: 360,
        boxShadow: "0 30px 60px -20px rgba(0,0,0,0.5)",
      }}>
        <h1 style={{ fontSize: 22, color: "var(--navy)", marginBottom: 6 }}>NutriPEM</h1>
        <p style={{ color: "#5b6878", fontSize: 14, marginBottom: 26 }}>Accesso area amministrazione</p>
        <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 8 }}>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          style={{
            width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid var(--line)",
            fontSize: 14.5, marginBottom: 18,
          }}
        />
        {error && <p style={{ color: "#c44", fontSize: 13.5, marginBottom: 14 }}>{error}</p>}
        <button type="submit" disabled={loading} className="btn btn-navy" style={{ width: "100%", justifyContent: "center" }}>
          {loading ? "Accesso in corso..." : "Accedi"}
        </button>
      </form>
    </div>
  );
}
