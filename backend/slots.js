// Calcule les créneaux disponibles pour une date donnée, à partir
// des horaires d'ouverture, des RDV déjà pris et des créneaux/jours bloqués.

const config = require("./config");
const db = require("./db");

function heureEnMinutes(heure) {
  const [h, m] = heure.split(":").map(Number);
  return h * 60 + m;
}

function minutesEnHeure(minutes) {
  const h = String(Math.floor(minutes / 60)).padStart(2, "0");
  const m = String(minutes % 60).padStart(2, "0");
  return `${h}:${m}`;
}

function jourSemaineISO(dateStr) {
  // dateStr au format YYYY-MM-DD -> renvoie 1 (lundi) .. 7 (dimanche)
  const d = new Date(dateStr + "T12:00:00");
  const jour = d.getDay(); // 0 = dimanche ... 6 = samedi
  return jour === 0 ? 7 : jour;
}

function genererCreneauxTheoriques() {
  const creneaux = [];
  for (const plage of config.plagesHoraires) {
    let debut = heureEnMinutes(plage.debut);
    const fin = heureEnMinutes(plage.fin);
    while (debut + config.dureeCreneauMinutes <= fin) {
      creneaux.push(minutesEnHeure(debut));
      debut += config.dureeCreneauMinutes;
    }
  }
  return creneaux;
}

function estDateValide(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const date = new Date(dateStr + "T12:00:00");
  if (Number.isNaN(date.getTime())) return false;

  const aujourdHui = new Date();
  aujourdHui.setHours(0, 0, 0, 0);
  const limite = new Date(aujourdHui);
  limite.setDate(limite.getDate() + config.fenetreReservationJours);

  return date >= aujourdHui && date <= limite;
}

function creneauxDisponibles(dateStr) {
  if (!estDateValide(dateStr)) return [];
  if (!config.joursOuverts.includes(jourSemaineISO(dateStr))) return [];

  const joursFermes = db.listerJoursFermes();
  if (joursFermes.includes(dateStr)) return [];

  const theoriques = genererCreneauxTheoriques();
  const rdvPris = db.rendezVousPourDate(dateStr).map((r) => r.heure);
  const bloques = db
    .listerCreneauxBloques()
    .filter((c) => c.date === dateStr)
    .map((c) => c.heure);

  // Si c'est aujourd'hui, on retire aussi les créneaux déjà passés
  const maintenant = new Date();
  const estAujourdHui =
    dateStr === maintenant.toISOString().slice(0, 10);
  const minutesActuelles = maintenant.getHours() * 60 + maintenant.getMinutes();

  return theoriques.filter((heure) => {
    if (rdvPris.includes(heure)) return false;
    if (bloques.includes(heure)) return false;
    if (estAujourdHui && heureEnMinutes(heure) <= minutesActuelles) return false;
    return true;
  });
}

module.exports = { creneauxDisponibles, estDateValide, jourSemaineISO };
