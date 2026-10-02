// Notifications par email au cabinet, via l'API Resend (resend.com).
// Si RESEND_API_KEY n'est pas définie, l'envoi est simplement ignoré
// (utile en local, pour ne pas dépendre d'un service externe).
//
// Chaque email part en HTML (mis en forme aux couleurs du site) avec une
// version texte brut de secours pour les clients mail qui n'affichent pas
// le HTML.

const config = require("./config");

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.RESEND_FROM_EMAIL || "Dentaliège <onboarding@resend.dev>";

const SITE_URL = "https://www.dentaliege.be";
const ADMIN_URL = `${SITE_URL}/admin.html`;
const LOGO_URL = `${SITE_URL}/img/logo-dentaliege.png`;
const MAPS_URL = "https://maps.app.goo.gl/cEtCxNdmS7gAaNwC6";

const COULEURS = {
  teal: "#0f766e",
  tealDark: "#0b5a54",
  tealLight: "#e6f4f3",
  ink: "#1f2937",
  muted: "#6b7280",
  bg: "#fdf9f2",
  border: "#e5e7eb"
};

function destinataireCabinet() {
  return config.cabinet.emailNotifications || config.cabinet.email;
}

async function envoyerNotification({ destinataire, sujet, texte, html, repondreA, piecesJointes }) {
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
        text: texte,
        html,
        // Adresse utilisée quand le destinataire clique sur « Répondre »
        ...(repondreA ? { reply_to: repondreA } : {}),
        ...(piecesJointes ? { attachments: piecesJointes } : {})
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

// --- Mise en forme -------------------------------------------------------

// Les champs viennent des formulaires publics : on échappe tout avant de
// l'insérer dans le HTML.
function echapper(valeur) {
  return String(valeur ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// "2026-10-14" -> "mardi 14 octobre 2026"
function dateLisible(dateIso) {
  const [a, m, j] = String(dateIso).split("-").map(Number);
  if (!a || !m || !j) return String(dateIso);
  const date = new Date(Date.UTC(a, m - 1, j));
  return date.toLocaleDateString("fr-BE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  });
}

// "10:30" -> "10h30"
function heureLisible(heure) {
  return String(heure).replace(":", "h");
}

function lienTel(telephone) {
  const numero = String(telephone).replace(/[^\d+]/g, "");
  return `<a href="tel:${echapper(numero)}" style="color:${COULEURS.teal};text-decoration:none;white-space:nowrap;">${echapper(telephone)}</a>`;
}

function lienMail(email) {
  return `<a href="mailto:${echapper(email)}" style="color:${COULEURS.teal};text-decoration:none;">${echapper(email)}</a>`;
}

// Une ligne "libellé / valeur" du tableau récapitulatif. `valeurHtml` est
// déjà échappée par l'appelant.
function ligne(libelle, valeurHtml) {
  return `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid ${COULEURS.border};color:${COULEURS.muted};font-size:14px;width:120px;vertical-align:top;">${libelle}</td>
      <td style="padding:10px 0;border-bottom:1px solid ${COULEURS.border};color:${COULEURS.ink};font-size:15px;font-weight:600;vertical-align:top;">${valeurHtml}</td>
    </tr>`;
}

function blocTexte(titre, contenu) {
  return `
    <p style="margin:24px 0 8px;color:${COULEURS.muted};font-size:14px;">${titre}</p>
    <div style="background:${COULEURS.bg};border-left:4px solid ${COULEURS.teal};border-radius:6px;padding:14px 16px;color:${COULEURS.ink};font-size:15px;line-height:1.55;white-space:pre-wrap;">${echapper(contenu)}</div>`;
}

// Gabarit commun : en-tête avec logo, bandeau titre, contenu, bouton, pied.
// Mise en page en tableaux + styles en ligne, seule méthode fiable pour
// Gmail / Outlook.
function gabarit({
  preheader,
  badge,
  titre,
  sousTitre,
  contenu,
  bouton,
  pied = `Notification automatique envoyée par le site ${echapper(SITE_URL.replace("https://", ""))}.`
}) {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${echapper(titre)}</title>
</head>
<body style="margin:0;padding:0;background:${COULEURS.bg};font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${echapper(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COULEURS.bg};">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
          <tr>
            <td align="center" style="padding:8px 0 20px;">
              <img src="${LOGO_URL}" alt="${echapper(config.cabinet.nom)}" width="223" height="64" style="display:block;border:0;height:64px;width:auto;" />
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;border:1px solid ${COULEURS.border};border-radius:12px;overflow:hidden;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:${COULEURS.teal};padding:22px 28px;">
                    <span style="display:inline-block;background:${COULEURS.tealLight};color:${COULEURS.tealDark};font-size:12px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;padding:4px 10px;border-radius:999px;">${badge}</span>
                    <h1 style="margin:12px 0 4px;color:#ffffff;font-size:22px;line-height:1.3;">${titre}</h1>
                    <p style="margin:0;color:${COULEURS.tealLight};font-size:15px;">${sousTitre}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 28px 28px;">
                    ${contenu}
                    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:28px;">
                      <tr>
                        <td style="background:${COULEURS.teal};border-radius:999px;">
                          <a href="${bouton.url}" style="display:inline-block;padding:12px 24px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">${bouton.libelle}</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:18px 12px;color:${COULEURS.muted};font-size:12px;line-height:1.5;">
              ${pied}<br />
              ${echapper(config.cabinet.adresse)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// --- Emails envoyés au cabinet ----------------------------------------------

function notifierNouveauRendezVous({ date, heure, nom, email, telephone, motif }) {
  const quand = `${dateLisible(date)} à ${heureLisible(heure)}`;

  const html = gabarit({
    preheader: `${nom} — ${quand}`,
    badge: "Nouveau rendez-vous",
    titre: echapper(nom),
    sousTitre: echapper(quand.charAt(0).toUpperCase() + quand.slice(1)),
    contenu: `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${ligne("Date", echapper(dateLisible(date)))}
        ${ligne("Heure", echapper(heureLisible(heure)))}
        ${ligne("Patient", echapper(nom))}
        ${ligne("Téléphone", lienTel(telephone))}
        ${ligne("Email", lienMail(email))}
      </table>
      ${blocTexte("Motif de la consultation", motif || "Non précisé")}`,
    bouton: { url: ADMIN_URL, libelle: "Voir dans l'espace admin" }
  });

  const texte =
    `NOUVEAU RENDEZ-VOUS\n` +
    `===================\n\n` +
    `Date      : ${dateLisible(date)}\n` +
    `Heure     : ${heureLisible(heure)}\n` +
    `Patient   : ${nom}\n` +
    `Téléphone : ${telephone}\n` +
    `Email     : ${email}\n\n` +
    `Motif :\n${motif || "Non précisé"}\n\n` +
    `Gérer ce rendez-vous : ${ADMIN_URL}`;

  return envoyerNotification({
    destinataire: destinataireCabinet(),
    sujet: `🦷 Nouveau RDV — ${nom}, ${quand}`,
    texte,
    html,
    repondreA: email
  });
}

function notifierNouveauMessage({ nom, email, telephone, message }) {
  const html = gabarit({
    preheader: `${nom} : ${String(message).slice(0, 90)}`,
    badge: "Nouveau message",
    titre: echapper(nom),
    sousTitre: "a écrit via le formulaire de contact",
    contenu: `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${ligne("Nom", echapper(nom))}
        ${ligne("Email", lienMail(email))}
        ${ligne("Téléphone", telephone ? lienTel(telephone) : "Non renseigné")}
      </table>
      ${blocTexte("Message", message)}
      <p style="margin:16px 0 0;color:${COULEURS.muted};font-size:13px;">Astuce : cliquez sur « Répondre » pour écrire directement à ${echapper(nom)}.</p>`,
    bouton: { url: ADMIN_URL, libelle: "Voir dans l'espace admin" }
  });

  const texte =
    `NOUVEAU MESSAGE DE CONTACT\n` +
    `==========================\n\n` +
    `Nom       : ${nom}\n` +
    `Email     : ${email}\n` +
    `Téléphone : ${telephone || "Non renseigné"}\n\n` +
    `Message :\n${message}\n\n` +
    `(Répondez directement à cet email pour écrire à ${nom}.)\n\n` +
    `Gérer ce message : ${ADMIN_URL}`;

  return envoyerNotification({
    destinataire: destinataireCabinet(),
    sujet: `✉️ Nouveau message — ${nom}`,
    texte,
    html,
    repondreA: email
  });
}

// --- Email envoyé au patient -------------------------------------------------

// Fichier .ics joint à la confirmation, pour ajouter le RDV à son agenda
// en un clic. Heure "flottante" (sans fuseau) : interprétée à l'heure
// locale du patient, c'est-à-dire l'heure de Liège.
function fichierAgenda({ id, date, heure }) {
  const [a, m, j] = String(date).split("-").map(Number);
  const [h, min] = String(heure).split(":").map(Number);
  const debut = new Date(Date.UTC(a, m - 1, j, h, min));
  const fin = new Date(debut.getTime() + config.dureeCreneauMinutes * 60000);
  const format = (d) => d.toISOString().replace(/[-:]/g, "").slice(0, 15);
  const echapperIcs = (v) => String(v).replace(/[\\;,]/g, (c) => "\\" + c);

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Dentaliege//Rendez-vous//FR",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:rdv-${id}-${date}@dentaliege.be`,
    `DTSTAMP:${format(new Date())}Z`,
    `DTSTART:${format(debut)}`,
    `DTEND:${format(fin)}`,
    `SUMMARY:${echapperIcs("Rendez-vous chez le dentiste")}`,
    `LOCATION:${echapperIcs(config.cabinet.adresse)}`,
    `DESCRIPTION:${echapperIcs(`Pour modifier ou annuler : ${config.cabinet.telephone}`)}`,
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");

  return {
    filename: "rendez-vous-dentaliege.ics",
    content: Buffer.from(ics, "utf8").toString("base64")
  };
}

function confirmerRendezVousAuPatient({ id, date, heure, nom, email, motif }) {
  const quand = `${dateLisible(date)} à ${heureLisible(heure)}`;
  const tel = config.cabinet.telephone;

  const html = gabarit({
    preheader: `Votre rendez-vous du ${quand} est confirmé.`,
    badge: "Rendez-vous confirmé",
    titre: "Votre rendez-vous est confirmé",
    sousTitre: echapper(quand.charAt(0).toUpperCase() + quand.slice(1)),
    contenu: `
      <p style="margin:4px 0 16px;color:${COULEURS.ink};font-size:15px;line-height:1.55;">
        Bonjour ${echapper(nom)},<br /><br />
        Nous avons bien enregistré votre rendez-vous et nous nous réjouissons de vous accueillir.
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${ligne("Date", echapper(dateLisible(date)))}
        ${ligne("Heure", echapper(heureLisible(heure)))}
        ${ligne("Adresse", echapper(config.cabinet.adresse))}
        ${motif ? ligne("Motif", echapper(motif)) : ""}
      </table>
      <div style="margin-top:24px;background:${COULEURS.tealLight};border-radius:8px;padding:14px 16px;color:${COULEURS.tealDark};font-size:14px;line-height:1.55;">
        <strong>Un empêchement ?</strong> Merci de nous prévenir dès que possible au
        ${lienTel(tel)} ou en répondant simplement à cet email.
      </div>
      <p style="margin:16px 0 0;color:${COULEURS.muted};font-size:13px;">
        Le fichier joint vous permet d'ajouter ce rendez-vous à votre agenda.
      </p>`,
    bouton: { url: MAPS_URL, libelle: "Voir l'itinéraire" },
    pied: `Vous recevez cet email suite à votre réservation sur ${echapper(SITE_URL.replace("https://", ""))}.`
  });

  const texte =
    `Bonjour ${nom},\n\n` +
    `Votre rendez-vous est confirmé.\n\n` +
    `Date    : ${dateLisible(date)}\n` +
    `Heure   : ${heureLisible(heure)}\n` +
    `Adresse : ${config.cabinet.adresse}\n` +
    (motif ? `Motif   : ${motif}\n` : "") +
    `\nItinéraire : ${MAPS_URL}\n\n` +
    `Un empêchement ? Merci de nous prévenir dès que possible au ${tel} ` +
    `ou en répondant à cet email.\n\n` +
    `À bientôt,\nVotre cabinet dentaire`;

  return envoyerNotification({
    destinataire: email,
    sujet: `Votre rendez-vous du ${quand} est confirmé`,
    texte,
    html,
    repondreA: destinataireCabinet(),
    piecesJointes: [fichierAgenda({ id, date, heure })]
  });
}

module.exports = {
  envoyerNotification,
  notifierNouveauRendezVous,
  confirmerRendezVousAuPatient,
  notifierNouveauMessage
};
