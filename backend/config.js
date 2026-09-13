// Configuration du cabinet et des horaires d'ouverture.
// -> À personnaliser avec les vraies informations du cabinet.

module.exports = {
  cabinet: {
    nom: "Cabinet Dentaire Sourire & Santé",

    adresse: "Rue Sainte-Walburge 359, 4000 Liège, Belgique",
    telephone: "0465 46 90 72",
    email: "contact@cabinet-dentaire-exemple.fr",
    praticiens: [
      { nom: "Dr. Hamed Benzina", specialite: "Chirurgien-dentiste" },
      { nom: "Dr. Salma Benzina", specialite: "Orthodontiste" }
    ]
  },

  // Jours ouvrés : 1 = lundi ... 7 = dimanche
  joursOuverts: [1, 2, 3, 4, 5],

  // Plages horaires travaillées chaque jour ouvré
  plagesHoraires: [
    { debut: "09:00", fin: "12:30" },
    { debut: "14:00", fin: "18:30" }
  ],

  // Durée d'un créneau de rendez-vous, en minutes
  dureeCreneauMinutes: 30,

  // Nombre de jours à l'avance que les patients peuvent réserver
  fenetreReservationJours: 60
};
