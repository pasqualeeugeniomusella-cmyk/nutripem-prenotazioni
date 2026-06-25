export default function Home() {
  return (
    <div style={{
      minHeight: "100vh", background: "var(--navy)", color: "#fff",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 24,
    }}>
      <h1 style={{ fontSize: 32, marginBottom: 10 }}>NutriPEM</h1>
      <p style={{ color: "var(--muted)", marginBottom: 28 }}>Intervention on your performance</p>
      <a href="/admin" className="btn btn-lime">Vai all'area Admin</a>
    </div>
  );
}
