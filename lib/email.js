async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "NutriPEM <onboarding@resend.dev>";

  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY non impostata: email NON inviata.", { to, subject });
    return { skipped: true };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[email] Errore invio:", res.status, text);
    throw new Error("Invio email fallito");
  }

  return res.json();
}

export async function sendBookingConfirmationToPatient({ to, patientName, groupName, date, time }) {
  return sendEmail({
    to,
    subject: "Prenotazione confermata - NutriPEM",
    html: `
      <div style="font-family:sans-serif; max-width:480px; margin:0 auto;">
        <h2 style="color:#0f1d31;">Prenotazione confermata ✅</h2>
        <p>Ciao ${patientName},</p>
        <p>la tua prenotazione per <strong>${groupName}</strong> è stata confermata:</p>
        <p style="background:#f5f7fa; padding:14px 18px; border-radius:10px;">
          📅 <strong>${date}</strong><br>
          🕐 <strong>${time}</strong>
        </p>
        <p>Se hai bisogno di modificare l'appuntamento, contatta direttamente NutriPEM.</p>
        <p style="color:#888; font-size:13px; margin-top:24px;">NutriPEM — Intervention on your performance</p>
      </div>
    `,
  });
}

export async function sendBookingNotificationToAdmin({ patientName, patientEmail, groupName, date, time }) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return { skipped: true };
  return sendEmail({
    to: adminEmail,
    subject: `Nuova prenotazione: ${groupName}`,
    html: `
      <div style="font-family:sans-serif; max-width:480px; margin:0 auto;">
        <h2 style="color:#0f1d31;">Nuova prenotazione 📥</h2>
        <p><strong>${patientName}</strong> (${patientEmail}) ha prenotato:</p>
        <p style="background:#f5f7fa; padding:14px 18px; border-radius:10px;">
          Gruppo: <strong>${groupName}</strong><br>
          📅 ${date} — 🕐 ${time}
        </p>
      </div>
    `,
  });
}

export async function sendCancellationToPatient({ to, patientName, groupName, date, time }) {
  return sendEmail({
    to,
    subject: "Prenotazione annullata - NutriPEM",
    html: `
      <div style="font-family:sans-serif; max-width:480px; margin:0 auto;">
        <h2 style="color:#0f1d31;">Prenotazione annullata</h2>
        <p>Ciao ${patientName},</p>
        <p>la tua prenotazione per <strong>${groupName}</strong> del <strong>${date} alle ${time}</strong> è stata annullata dallo studio.</p>
        <p>Per riprenotare, usa nuovamente il link che ti è stato inviato.</p>
        <p style="color:#888; font-size:13px; margin-top:24px;">NutriPEM — Intervention on your performance</p>
      </div>
    `,
  });
}
