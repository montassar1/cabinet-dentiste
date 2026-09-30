# Déployer le site sur Railway

Ce guide explique comment mettre le site en ligne sur [Railway](https://railway.com),
avec un stockage persistant pour que les rendez-vous et messages de contact
ne soient jamais perdus.

## Pourquoi Railway et pas l'hébergement web classique (EasyHost, etc.) ?

Ce site n'est pas un site statique : chaque page (menu, pied de page, infos
de contact...) va chercher ses données via une API Node.js/Express au
chargement, et la prise de RDV/le formulaire de contact en dépendent
entièrement. Les hébergements mutualisés classiques (type "hébergement web"
chez EasyHost, à partir de 2,47 €/mois) ne font tourner que du PHP/MySQL, pas
de processus Node.js en continu. Railway est fait pour ça, et permet de
garder le code du site tel quel.

## Étape 1 — Créer un compte Railway

Aller sur [railway.com](https://railway.com) et créer un compte (possible
avec GitHub). Passer sur le plan **Hobby** (~5 $/mois, inclut un crédit
d'utilisation) pour que le site reste en ligne en continu, sans mise en
veille.

## Étape 2 — Déployer le code

Deux façons de faire, au choix :

**Option A — Depuis GitHub (recommandé)**
1. Mettre ce projet sur un dépôt GitHub (le `.gitignore` fourni exclut déjà
   `node_modules/`, `.env` et les données locales).
2. Dans Railway : *New Project* → *Deploy from GitHub repo* → sélectionner
   le dépôt.
3. Railway détecte automatiquement le `package.json` et lance `npm install`
   puis `npm start`.

**Option B — Directement depuis cet ordinateur (sans GitHub)**
1. Installer la CLI Railway : `npm install -g @railway/cli`
2. Depuis le dossier du projet : `railway login` puis `railway init`
3. Déployer : `railway up`

## Étape 3 — Ajouter un volume persistant (essentiel)

Sans cette étape, les rendez-vous et messages seraient perdus à chaque
redéploiement.

1. Dans le service Railway du site, aller dans l'onglet **Volumes**.
2. Créer un volume et le monter sur le chemin `/data`.
3. Aller dans l'onglet **Variables** du service et ajouter :
   - `DATA_DIR` = `/data`

Le code lit déjà cette variable (`backend/db.js`) : si elle est définie, les
données sont stockées dans le volume persistant ; sinon (en local), elles
restent dans `backend/data/db.json` comme avant. Aucune autre modification
n'est nécessaire.

## Étape 4 — Définir les identifiants de l'espace admin

Toujours dans l'onglet **Variables** du service, ajouter :

- `ADMIN_EMAIL` — l'adresse email de connexion à l'espace admin
- `ADMIN_PASSWORD_HASH` — le hash du mot de passe (jamais le mot de passe
  en clair)

Le hash se génère en local avec :

```bash
node backend/hash-motdepasse.js "votre-mot-de-passe"
```

Ces valeurs se trouvent aussi dans le fichier `.env` local (non versionné).
Sans ces deux variables, l'espace admin refuse toute connexion.

Ajouter également `NODE_ENV` = `production` : le cookie de session est
alors marqué `Secure` (transmis uniquement en HTTPS).

## Étape 5 — Activer les notifications par email

Sans cette étape, un nouveau rendez-vous ou message de contact n'est
visible que dans l'espace admin — aucun email n'est envoyé.

1. Créer un compte gratuit sur [resend.com](https://resend.com) (jusqu'à
   3000 emails/mois gratuits).
2. Dans Resend : **API Keys** → créer une clé.
3. Dans Railway, onglet **Variables** du service, ajouter :
   - `RESEND_API_KEY` = la clé copiée depuis Resend

Chaque nouveau rendez-vous ou message de contact envoie alors
automatiquement un email à l'adresse définie dans `backend/config.js`
(`cabinet.email`).

Par défaut, les emails partent depuis `onboarding@resend.dev` (adresse de
test Resend, sans configuration DNS nécessaire — suffisant puisque ces
emails sont à destination du cabinet, pas des patients). Pour envoyer
depuis une adresse `@dentaliege.be`, il faut vérifier le domaine dans
Resend (ajout d'enregistrements DNS chez le registrar) puis définir
`RESEND_FROM_EMAIL` dans Railway.

## Étape 6 — Vérifier le déploiement

Railway attribue une URL du type `https://tonsite.up.railway.app`. Vérifier
que :
- Le site s'affiche (`/`, `/rdv.html`, etc.)
- La prise de rendez-vous fonctionne (`/rdv.html`)
- La connexion à l'espace admin fonctionne (`/admin.html`)

## Étape 7 — Brancher le nom de domaine (dentaliege.be)

1. Dans Railway, sur le service du site : onglet **Settings** → **Domains**
   → *Custom Domain* → entrer `www.dentaliege.be`.
2. Railway indique un enregistrement DNS (type `CNAME`, cible fournie par
   Railway) à ajouter.
3. Chez le registrar du domaine (EasyHost si le domaine y a été acheté, ou
   un autre bureau d'enregistrement) : aller dans la gestion DNS du domaine
   et ajouter cet enregistrement `CNAME`.
4. Pour que `dentaliege.be` (sans le `www`) fonctionne aussi,
   répéter l'opération ou ajouter une redirection selon ce que propose le
   registrar.
5. Propagation DNS : peut prendre de quelques minutes à quelques heures.

Si le domaine n'est pas encore acheté, ce sera à faire chez un registrar
(EasyHost, ou un autre comme OVH, Combell...) avant cette étape — dites-le
moi et je peux détailler ce point le moment venu.

## Avant l'ouverture : les points de sécurité encore à traiter

Ces points restent valables (voir aussi le README) et sont d'autant plus
importants qu'il s'agit maintenant d'un vrai cabinet avec de vraies données
patients :

1. **RGPD** : ajouter une mention de confidentialité sur le formulaire de
   RDV et de contact, puisque des données de patients sont collectées.
2. Envisager un email de confirmation automatique au patient après chaque
   réservation (le cabinet reçoit déjà une notification, voir étape 5).

Les routes `/api/admin/*` sont désormais protégées par email + mot de passe
(voir l'étape 4).
