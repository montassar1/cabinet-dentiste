const express = require("express");
const cors = require("cors");
const path = require("path");

const config = require("./config");
const db = require("./db");
const { creneauxDisponibles, estDateValide } = require("./slots");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

// --- API publique ---------------------------------------------------

app.get("/api/config", (req, res) => {
  res.json({
    cabinet: config.cabinet,
    dureeCreneauMinutes: config.dureeCreneauMinutes,
    fenetreReservationJours: config.fenetreReservationJours
  });
});

app.get("/api/slots", (req, res) => {
  const { date } = req.query;
  if (!date) {
    return res.status(400).json({ erreur: "Le paramètre 'date' est requis (YYYY-MM-DD)." });
  }
  if (!estDateValide(date)) {
    return res.status(400).json({ erreur: "Date invalide ou hors de la fenêtre de réservation." });
  }
  res.json({ date, creneaux: creneauxDisponibles(date) });
});

app.post("/api/appointments", (req, res) => {
  const { date, heure, nom, email, telephone, motif } = req.body || {};

  if (!date || !heure || !nom || !email || !telephone) {
    return res.status(400).json({
      erreur: "Champs requis manquants : date, heure, nom, email, telephone."
    });
  }
  if (!estDateValide(date)) {
    return res.status(400).json({ erreur: "Date invalide." });
  }

  // On revérifie côté serveur que le créneau est toujours libre
  // (empêche deux patients de réserver le même créneau en même temps)
  const disponibles = creneauxDisponibles(date);
  if (!disponibles.includes(heure)) {
    return res.status(409).json({
      erreur: "Ce créneau vient d'être pris ou n'est plus disponible. Merci d'en choisir un autre."
    });
  }

  const rdv = db.creerRendezVous({ date, heure, nom, email, telephone, motif });
  res.status(201).json({ message: "Rendez-vous confirmé.", rendezVous: rdv });
});

// --- API admin (à protéger par une authentification avant mise en ligne réelle) ---

app.get("/api/admin/appointments", (req, res) => {
  const rdvs = db
    .listerRendezVous()
    .sort((a, b) => (a.date + a.heure).localeCompare(b.date + b.heure));
  res.json({ rendezVous: rdvs });
});

app.patch("/api/admin/appointments/:id/annuler", (req, res) => {
  const rdv = db.annulerRendezVous(req.params.id);
  if (!rdv) return res.status(404).json({ erreur: "Rendez-vous introuvable." });
  res.json({ message: "Rendez-vous annulé.", rendezVous: rdv });
});

app.get("/api/admin/closed-days", (req, res) => {
  res.json({ joursFermes: db.listerJoursFermes() });
});

app.post("/api/admin/closed-days", (req, res) => {
  const { date } = req.body || {};
  if (!date) return res.status(400).json({ erreur: "Le champ 'date' est requis." });
  res.json({ joursFermes: db.fermerJour(date) });
});

app.delete("/api/admin/closed-days/:date", (req, res) => {
  res.json({ joursFermes: db.reouvrirJour(req.params.date) });
});

app.get("/api/admin/closed-slots", (req, res) => {
  res.json({ creneauxBloques: db.listerCreneauxBloques() });
});

app.post("/api/admin/closed-slots", (req, res) => {
  const { date, heure } = req.body || {};
  if (!date || !heure) {
    return res.status(400).json({ erreur: "Les champs 'date' et 'heure' sont requis." });
  }
  res.json({ creneauxBloques: db.bloquerCreneau(date, heure) });
});

app.delete("/api/admin/closed-slots", (req, res) => {
  const { date, heure } = req.body || {};
  res.json({ creneauxBloques: db.debloquerCreneau(date, heure) });
});

// --- Formulaire de contact ---------------------------------------------

app.post("/api/contact-messages", (req, res) => {
  const { nom, email, telephone, message } = req.body || {};
  if (!nom || !email || !message) {
    return res.status(400).json({
      erreur: "Champs requis manquants : nom, email, message."
    });
  }
  const msg = db.creerMessage({ nom, email, telephone, message });
  res.status(201).json({ message: "Message envoyé.", contactMessage: msg });
});

app.get("/api/admin/contact-messages", (req, res) => {
  const messages = db
    .listerMessages()
    .sort((a, b) => b.creeLe.localeCompare(a.creeLe));
  res.json({ messages });
});

app.patch("/api/admin/contact-messages/:id/lu", (req, res) => {
  const msg = db.marquerMessageLu(req.params.id);
  if (!msg) return res.status(404).json({ erreur: "Message introuvable." });
  res.json({ message: "Message marqué comme lu.", contactMessage: msg });
});

app.listen(PORT, () => {
  console.log(`Site du cabinet dentaire lancé : http://localhost:${PORT}`);
  console.log(`Espace admin : http://localhost:${PORT}/admin.html`);
});
