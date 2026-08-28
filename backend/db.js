// Petite "base de données" fichier JSON.
// Suffisant pour un usage local / démo. Pour la production, remplacer par
// une vraie base (PostgreSQL, MySQL, SQLite...) derrière la même interface.

const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "data", "db.json");

function lireBrut() {
  if (!fs.existsSync(DB_PATH)) {
    const initial = {
      appointments: [],
      closedDays: [],
      closedSlots: [],
      contactMessages: [],
      nextId: 1,
      nextMessageId: 1
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
  const contenu = fs.readFileSync(DB_PATH, "utf-8");
  const data = JSON.parse(contenu || "{}");
  // Complète les clés manquantes pour les bases créées avec une version antérieure
  if (!data.contactMessages) data.contactMessages = [];
  if (!data.nextMessageId) data.nextMessageId = 1;
  return data;
}

function ecrireBrut(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

module.exports = {
  // Rendez-vous
  listerRendezVous() {
    return lireBrut().appointments;
  },

  rendezVousPourDate(date) {
    return lireBrut().appointments.filter(
      (rdv) => rdv.date === date && rdv.status !== "annule"
    );
  },

  creerRendezVous({ date, heure, nom, email, telephone, motif }) {
    const data = lireBrut();
    const id = data.nextId;
    const rdv = {
      id,
      date,
      heure,
      nom,
      email,
      telephone,
      motif: motif || "",
      status: "confirme",
      creeLe: new Date().toISOString()
    };
    data.appointments.push(rdv);
    data.nextId += 1;
    ecrireBrut(data);
    return rdv;
  },

  annulerRendezVous(id) {
    const data = lireBrut();
    const rdv = data.appointments.find((r) => r.id === Number(id));
    if (!rdv) return null;
    rdv.status = "annule";
    ecrireBrut(data);
    return rdv;
  },

  // Jours fermés (ex: jours fériés, congés)
  listerJoursFermes() {
    return lireBrut().closedDays;
  },

  fermerJour(date) {
    const data = lireBrut();
    if (!data.closedDays.includes(date)) {
      data.closedDays.push(date);
      ecrireBrut(data);
    }
    return data.closedDays;
  },

  reouvrirJour(date) {
    const data = lireBrut();
    data.closedDays = data.closedDays.filter((d) => d !== date);
    ecrireBrut(data);
    return data.closedDays;
  },

  // Créneaux bloqués ponctuellement (ex: réunion, pause exceptionnelle)
  listerCreneauxBloques() {
    return lireBrut().closedSlots;
  },

  bloquerCreneau(date, heure) {
    const data = lireBrut();
    const existe = data.closedSlots.some((c) => c.date === date && c.heure === heure);
    if (!existe) {
      data.closedSlots.push({ date, heure });
      ecrireBrut(data);
    }
    return data.closedSlots;
  },

  debloquerCreneau(date, heure) {
    const data = lireBrut();
    data.closedSlots = data.closedSlots.filter(
      (c) => !(c.date === date && c.heure === heure)
    );
    ecrireBrut(data);
    return data.closedSlots;
  },

  // Messages de contact
  listerMessages() {
    return lireBrut().contactMessages;
  },

  creerMessage({ nom, email, telephone, message }) {
    const data = lireBrut();
    const id = data.nextMessageId;
    const msg = {
      id,
      nom,
      email,
      telephone: telephone || "",
      message,
      lu: false,
      creeLe: new Date().toISOString()
    };
    data.contactMessages.push(msg);
    data.nextMessageId += 1;
    ecrireBrut(data);
    return msg;
  },

  marquerMessageLu(id) {
    const data = lireBrut();
    const msg = data.contactMessages.find((m) => m.id === Number(id));
    if (!msg) return null;
    msg.lu = true;
    ecrireBrut(data);
    return msg;
  }
};
