// Anime légèrement l'apparition des images et des textes au défilement
// (fondu + léger glissement), sans dépendance externe.

const SELECTEURS_ANIMES = [
  ".page-hero h1",
  ".page-hero p",
  ".hero-content > *",
  ".hero-visual",
  "section h2",
  ".booking-layout > div > p",
  ".card",
  ".value-card",
  ".photo-placeholder",
  ".staff-card",
  ".faq-item",
  ".timeline li"
];

function marquerElementsAnimes(racine) {
  SELECTEURS_ANIMES.forEach((selecteur) => {
    racine.querySelectorAll(selecteur).forEach((el) => el.classList.add("reveal"));
  });
}

function observerElementsAnimes(racine) {
  const elements = racine.querySelectorAll(".reveal:not(.reveal-observe)");
  if (!("IntersectionObserver" in window)) {
    elements.forEach((el) => el.classList.add("visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entrees) => {
      entrees.forEach((entree) => {
        if (entree.isIntersecting) {
          entree.target.classList.add("visible");
          observer.unobserve(entree.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
  );

  elements.forEach((el) => {
    el.classList.add("reveal-observe");
    observer.observe(el);
  });
}

function initAnimations(racine = document) {
  marquerElementsAnimes(racine);
  // Laisse le navigateur peindre l'état caché (opacity:0) avant de démarrer
  // l'observation : sinon, pour les éléments déjà visibles au chargement
  // (ex: "Notre histoire", au-dessus de la ligne de flottaison), la classe
  // "visible" est ajoutée avant le premier rendu et la transition ne se joue jamais.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => observerElementsAnimes(racine));
  });
}

document.addEventListener("DOMContentLoaded", () => initAnimations());
document.addEventListener("layout:ready", () => initAnimations());
