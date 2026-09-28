// Génère le hash à mettre dans ADMIN_PASSWORD_HASH.
// Usage : node backend/hash-motdepasse.js "le-mot-de-passe"

const { creerHash } = require("./auth");

const motDePasse = process.argv[2];

if (!motDePasse) {
  console.error('Usage : node backend/hash-motdepasse.js "le-mot-de-passe"');
  process.exit(1);
}

console.log(creerHash(motDePasse));
