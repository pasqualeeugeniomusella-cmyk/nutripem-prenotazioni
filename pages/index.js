import Head from "next/head";

export default function Home() {
  return (
    <>
      <Head>
        <title>NutriPEM — Prenotazioni</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="public-wrap">
        <div className="public-top">
          <div className="logo">NutriPEM</div>
          <div className="subtitle">Prenotazioni</div>
        </div>
        <div className="card">
          <h2>Sistema di prenotazione</h2>
          <p className="hint">Per prenotare un appuntamento usa il link che ti è stato fornito.</p>
          <p style={{ fontSize: 14, color: "var(--gray-500)" }}>
            Sei l'amministratore? <a href="/admin" style={{ fontWeight: 700 }}>Accedi al pannello</a>.
          </p>
        </div>
      </div>
    </>
  );
}
