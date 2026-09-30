// Notifications par email au cabinet, via l'API Resend (resend.com).
// Si RESEND_API_KEY n'est pas définie, l'envoi est simplement ignoré
// (utile en local, pour ne pas dépendre d'un service externe).

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.RESEND_FROM_EMAIL || "Cabinet Dentaire <onboarding@resend.dev>";

async function envoyerNotification(destinataire, sujet, texte) {
  if (!RESEND_API_KEY) {
    console.warn(`RESEND_API_KEY non définie : email "${sujet}" non envoyé.`);
    return;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: FROM,
        to: [destinataire],
        subject: sujet,
        text: texte
      })
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error(`Échec de l'envoi d'email (${res.status}) :`, detail);
    }
  } catch (erreur) {
    console.error("Erreur lors de l'envoi de l'email :", erreur);
  }
}

module.exports = { envoyerNotification };
