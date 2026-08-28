// Charge le header/footer communs (partials/nav.html, partials/footer.html),
// met en évidence l'onglet actif, gère le menu mobile, et injecte les
// informations du cabinet (nom, adresse, téléphone...) partout où elles
// sont référencées via des id="..." dans la page.

async function chargerFragment(url, montageId) {
  const mount = document.getElementById(montageId);
  if (!mount) return;
  try {
    const res = await fetch(url);
    mount.innerHTML = await res.text();
  } catch (e) {
    console.error(`Impossible de charger ${url}`, e);
  }
}

function activerOngletCourant() {
  const page = document.body.dataset.page;
  if (!page) return;
  document
    .querySelectorAll(`.site-nav a[data-page="${page}"]`)
    .forEach((a) => a.classList.add("active"));
}

function activerMenuMobile() {
  const toggle = document.getElementById("nav-toggle");
  const nav = document.getElementById("site-nav");
  if (!toggle || !nav) return;
  toggle.addEventListener("click", () => nav.classList.toggle("open"));
}

async function injecterInfosCabinet() {
  try {
    const res = await fetch("/api/config");
    const data = await res.json();
    const c = data.cabinet;

    const setText = (id, valeur) => {
      const el = document.getElementById(id);
      if (el) el.textContent = valeur;
    };

    setText("logo-nom", "🦷 " + c.nom);
    setText("footer-nom", c.nom);
    setText("footer-adresse", c.adresse);
    setText("footer-tel", c.telephone);
    setText("footer-email", c.email);
    setText("contact-adresse", c.adresse);
    setText("contact-tel", c.telephone);
    setText("contact-email", c.email);
    setText("urgence-tel", c.telephone);

    const equipeEl = document.getElementById("equipe-liste");
    if (equipeEl && Array.isArray(c.praticiens)) {
      const photosParticiens = [
        "https://plus.unsplash.com/premium_photo-1681996428751-93e0294fe98d?fm=jpg&q=80&w=300&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1756699277286-5166560ecd40?fm=jpg&q=80&w=300&auto=format&fit=crop"
      ];
      equipeEl.innerHTML = c.praticiens
        .map(
          (p, i) => `
        <div class="card staff-card">
          <div class="photo-placeholder photo-placeholder--round">
            <img src="${photosParticiens[i % photosParticiens.length]}" alt="${p.nom}" />
          </div>
          <h3>${p.nom}</h3>
          <p class="staff-specialite">${p.specialite}</p>
          <p>Membre de l'équipe du cabinet, à l'écoute des patients à chaque étape du soin.</p>
        </div>`
        )
        .join("");
    }
  } catch (e) {
    console.error("Impossible de charger les infos du cabinet :", e);
  }
}

async function initLayout() {
  await Promise.all([
    chargerFragment("/partials/nav.html", "layout-header"),
    chargerFragment("/partials/footer.html", "layout-footer")
  ]);
  activerOngletCourant();
  activerMenuMobile();
  await injecterInfosCabinet();
  document.dispatchEvent(new CustomEvent("layout:ready"));
}

initLayout();
