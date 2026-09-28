// Authentification de l'espace admin.
// Le mot de passe n'est jamais stocké en clair : seul un hash scrypt est
// conservé, fourni via la variable d'environnement ADMIN_PASSWORD_HASH.

const crypto = require("crypto");

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const ADMIN_PASSWORD_HASH = (process.env.ADMIN_PASSWORD_HASH || "").trim();

const COOKIE_NAME = "admin_session";
const SESSION_DUREE_MS = 8 * 60 * 60 * 1000;
const MAX_TENTATIVES = 10;
const FENETRE_TENTATIVES_MS = 15 * 60 * 1000;

const sessions = new Map();
const tentatives = new Map();

const authConfiguree = Boolean(ADMIN_EMAIL && ADMIN_PASSWORD_HASH);

function creerHash(motDePasse) {
  const sel = crypto.randomBytes(16);
  const hash = crypto.scryptSync(motDePasse, sel, 64);
  return `scrypt$${sel.toString("hex")}$${hash.toString("hex")}`;
}

function hashValide(motDePasse, stocke) {
  const [algo, selHex, hashHex] = stocke.split("$");
  if (algo !== "scrypt" || !selHex || !hashHex) return false;

  const attendu = Buffer.from(hashHex, "hex");
  const calcule = crypto.scryptSync(motDePasse, Buffer.from(selHex, "hex"), attendu.length);
  return crypto.timingSafeEqual(attendu, calcule);
}

function lireCookie(req, nom) {
  const brut = req.headers.cookie;
  if (!brut) return null;
  for (const morceau of brut.split(";")) {
    const index = morceau.indexOf("=");
    if (index === -1) continue;
    if (morceau.slice(0, index).trim() === nom) {
      return decodeURIComponent(morceau.slice(index + 1).trim());
    }
  }
  return null;
}

function purgerSessions() {
  const maintenant = Date.now();
  for (const [token, expiration] of sessions) {
    if (expiration <= maintenant) sessions.delete(token);
  }
}

function sessionValide(token) {
  const expiration = sessions.get(token);
  if (!expiration) return false;
  if (expiration <= Date.now()) {
    sessions.delete(token);
    return false;
  }
  return true;
}

// Limite les tentatives par IP pour ralentir une attaque par force brute.
function tropDeTentatives(ip) {
  const entree = tentatives.get(ip);
  if (!entree) return false;
  if (Date.now() - entree.debut > FENETRE_TENTATIVES_MS) {
    tentatives.delete(ip);
    return false;
  }
  return entree.nombre >= MAX_TENTATIVES;
}

function enregistrerEchec(ip) {
  const entree = tentatives.get(ip);
  if (!entree || Date.now() - entree.debut > FENETRE_TENTATIVES_MS) {
    tentatives.set(ip, { nombre: 1, debut: Date.now() });
  } else {
    entree.nombre += 1;
  }
}

function connecter(req, res) {
  if (!authConfiguree) {
    return res.status(503).json({
      erreur: "Authentification non configurée sur le serveur (ADMIN_EMAIL / ADMIN_PASSWORD_HASH)."
    });
  }

  const ip = req.ip || "inconnue";
  if (tropDeTentatives(ip)) {
    return res.status(429).json({
      erreur: "Trop de tentatives échouées. Réessayez dans une quinzaine de minutes."
    });
  }

  const { email, motDePasse } = req.body || {};
  if (!email || !motDePasse) {
    return res.status(400).json({ erreur: "Email et mot de passe requis." });
  }

  const emailOk = String(email).trim().toLowerCase() === ADMIN_EMAIL;
  const motDePasseOk = emailOk && hashValide(String(motDePasse), ADMIN_PASSWORD_HASH);

  if (!emailOk || !motDePasseOk) {
    enregistrerEchec(ip);
    return res.status(401).json({ erreur: "Email ou mot de passe incorrect." });
  }

  tentatives.delete(ip);
  purgerSessions();

  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, Date.now() + SESSION_DUREE_MS);

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_DUREE_MS
  });
  res.json({ message: "Connecté." });
}

function deconnecter(req, res) {
  const token = lireCookie(req, COOKIE_NAME);
  if (token) sessions.delete(token);
  res.clearCookie(COOKIE_NAME);
  res.json({ message: "Déconnecté." });
}

function etatSession(req, res) {
  const token = lireCookie(req, COOKIE_NAME);
  res.json({
    authentifie: Boolean(token && sessionValide(token)),
    authConfiguree
  });
}

function exigerAuth(req, res, next) {
  if (!authConfiguree) {
    return res.status(503).json({ erreur: "Authentification non configurée sur le serveur." });
  }
  const token = lireCookie(req, COOKIE_NAME);
  if (!token || !sessionValide(token)) {
    return res.status(401).json({ erreur: "Non authentifié." });
  }
  next();
}

module.exports = {
  authConfiguree,
  creerHash,
  connecter,
  deconnecter,
  etatSession,
  exigerAuth
};
