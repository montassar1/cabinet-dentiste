# Site du Cabinet Dentaire — avec prise de rendez-vous en ligne

Site vitrine + module de prise de rendez-vous avec calendrier de créneaux
en temps réel, développé en Node.js / Express, sans base de données externe
à installer (stockage dans un simple fichier JSON local).

## Stack technique

- **Backend** : Node.js + Express (API REST)
- **Stockage** : fichier `backend/data/db.json` (créé automatiquement au
  premier lancement) — suffisant pour tester en local. Pour une vraie mise
  en production, il faudra le remplacer par une base de données
  (PostgreSQL, MySQL...) : toute la logique de lecture/écriture est isolée
  dans `backend/db.js`, donc c'est le seul fichier à réécrire.
- **Frontend** : HTML / CSS / JavaScript natif (aucun framework, aucune
  étape de build nécessaire)

## Installation

Prérequis : [Node.js](https://nodejs.org) version 18 ou plus récente.

```bash
cd cabinet-dentaire
npm install
```

## Lancer le site en local

```bash
npm start
```

Puis ouvrir dans le navigateur :

- **Site public** : http://localhost:3000
- **Prise de rendez-vous** : http://localhost:3000/rdv.html
- **Espace admin** (gestion des RDV) : http://localhost:3000/admin.html

Pour le développement (redémarrage automatique du serveur à chaque
modification) :

```bash
npm run dev
```

## Pages du site

Le site public compte désormais 9 pages, reliées par un même menu (chargé
depuis `public/partials/nav.html` sur chaque page) :

- `index.html` — Accueil
- `cabinet.html` — Le Cabinet (présentation, valeurs, équipements, galerie, accès)
- `equipe.html` — L'Équipe (praticiens injectés depuis `config.js`, reste de l'équipe)
- `soins.html` — Vue d'ensemble des soins, avec liens vers les pages dédiées
- `implantologie.html`, `esthetique.html`, `orthodontie.html` — pages détaillées par spécialité (étapes du traitement, FAQ)
- `urgence.html` — Numéro d'urgence en avant, conseils en attendant le RDV
- `contact.html` — Coordonnées + formulaire de contact fonctionnel
- `rdv.html` — Prise de rendez-vous avec calendrier de créneaux
- `admin.html` — Espace de gestion interne (RDV, jours fermés, messages de contact)

Toutes les photos affichées sont des **placeholders** (icône + légende sur
fond dégradé) à remplacer par de vraies photos du cabinet — voir la classe
CSS `.photo-placeholder` dans `public/css/style.css`.

## Comment ça marche

- Les horaires d'ouverture, la durée des créneaux et les informations du
  cabinet (nom, adresse, praticiens...) se configurent dans
  `backend/config.js` — c'est le premier fichier à modifier pour
  personnaliser le site avec les vraies informations du cabinet. Ces infos
  sont injectées automatiquement dans toutes les pages par
  `public/js/layout.js` (logo, pied de page, page équipe, page contact...).
- Le menu et le pied de page sont communs à toutes les pages : ils vivent
  dans `public/partials/nav.html` et `public/partials/footer.html`, chargés
  par `public/js/layout.js`. Pour ajouter/renommer un onglet, il suffit de
  modifier `nav.html` une seule fois.
- Quand un patient choisit une date sur `rdv.html`, le site interroge
  `GET /api/slots?date=...` qui calcule les créneaux encore libres (horaires
  d'ouverture moins les RDV déjà pris, les jours fermés et les créneaux
  bloqués manuellement).
- La réservation (`POST /api/appointments`) revérifie côté serveur que le
  créneau est toujours libre au moment de l'envoi, pour éviter que deux
  patients réservent le même créneau en même temps.
- Le formulaire de `contact.html` envoie les messages à
  `POST /api/contact-messages`, visibles ensuite dans l'espace admin.
- L'espace admin (`admin.html`) permet de voir tous les rendez-vous, d'en
  annuler, de fermer des jours entiers (vacances, jours fériés), et de
  consulter/marquer comme lus les messages de contact.

## Étapes recommandées avant une vraie mise en ligne

Ce projet est pensé pour être testé en local et compris facilement. Avant
de le publier pour de vrais patients, prévoir :

1. **Protéger `admin.html` et les routes `/api/admin/*`** par une
   authentification (mot de passe, ou connexion avec compte). Actuellement
   n'importe qui connaissant l'URL peut voir/annuler les rendez-vous.
2. **Remplacer le stockage JSON par une vraie base de données** si le
   cabinet gère un volume important de rendez-vous ou plusieurs
   praticiens en parallèle (le fichier JSON n'est pas conçu pour des accès
   concurrents intensifs).
3. **Envoyer un email de confirmation** au patient et au cabinet après
   chaque réservation (par ex. avec un service comme Resend, SendGrid ou
   Brevo).
4. **Ajouter un nom de domaine et un hébergement** (ex. Render, Railway,
   VPS...) — dites-le moi le moment venu, je peux vous accompagner sur le
   choix et la mise en ligne.
5. **RGPD** : ajouter une mention de confidentialité sur le formulaire de
   RDV, puisque des données de santé/contact de patients sont collectées.

## Structure du projet

```
cabinet-dentaire/
├── backend/
│   ├── server.js            # Serveur Express + toutes les routes API
│   ├── config.js             # Infos du cabinet + horaires (à personnaliser)
│   ├── db.js                  # Accès aux données (fichier JSON)
│   ├── slots.js                # Calcul des créneaux disponibles
│   └── data/db.json             # Données (créé automatiquement)
├── public/
│   ├── index.html, cabinet.html, equipe.html, soins.html,
│   │   implantologie.html, esthetique.html, orthodontie.html,
│   │   urgence.html, contact.html, rdv.html, admin.html
│   ├── partials/
│   │   ├── nav.html          # Menu commun à toutes les pages
│   │   └── footer.html        # Pied de page commun
│   ├── css/style.css
│   └── js/
│       ├── layout.js          # Charge menu/pied de page + infos du cabinet
│       ├── booking.js           # Logique de la page de réservation
│       ├── contact.js            # Logique du formulaire de contact
│       └── admin.js               # Logique de l'espace admin
├── package.json
└── README.md
```
