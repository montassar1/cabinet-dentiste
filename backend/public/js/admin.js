const rdvTbody = document.getElementById("rdv-tbody");
const rdvAlert = document.getElementById("rdv-alert");
const closedDaysList = document.getElementById("closed-days-list");
const closedDayForm = document.getElementById("closed-day-form");

const loginSection = document.getElementById("login-section");
const loginForm = document.getElementById("login-form");
const loginAlert = document.getElementById("login-alert");
const logoutLink = document.getElementById("logout-link");
const adminContent = document.getElementById("admin-content");

function afficherAlerte(zone, message, type) {
  zone.innerHTML = `<div class="alert ${type}">${message}</div>`;
}

// Toute réponse 401 signifie que la session a expiré : on renvoie au login.
async function api(url, options) {
  const res = await fetch(url, options);
  if (res.status === 401) {
    afficherLogin();
    throw new Error("Session expirée");
  }
  return res;
}

function afficherLogin() {
  loginSection.hidden = false;
  adminContent.hidden = true;
  logoutLink.hidden = true;
}

function afficherAdmin() {
  loginSection.hidden = true;
  adminContent.hidden = false;
  logoutLink.hidden = false;
  chargerRendezVous();
  chargerJoursFermes();
  chargerMessages();
}

async function chargerRendezVous() {
  const res = await api("/api/admin/appointments");
  const data = await res.json();

  if (!data.rendezVous || data.rendezVous.length === 0) {
    rdvTbody.innerHTML = `<tr><td colspan="7">Aucun rendez-vous pour le moment.</td></tr>`;
    return;
  }

  rdvTbody.innerHTML = data.rendezVous
    .map(
      (r) => `
    <tr>
      <td>${r.date}</td>
      <td>${r.heure}</td>
      <td>${r.nom}</td>
      <td>${r.email}<br/>${r.telephone}</td>
      <td>${r.motif || "—"}</td>
      <td><span class="status-badge ${r.status}">${r.status === "confirme" ? "Confirmé" : "Annulé"}</span></td>
      <td>${
        r.status === "confirme"
          ? `<button class="link-danger" data-id="${r.id}">Annuler</button>`
          : ""
      }</td>
    </tr>`
    )
    .join("");

  rdvTbody.querySelectorAll(".link-danger").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      const res = await api(`/api/admin/appointments/${id}/annuler`, { method: "PATCH" });
      const data = await res.json();
      if (res.ok) {
        afficherAlerte(rdvAlert, "Rendez-vous annulé.", "success");
        chargerRendezVous();
      } else {
        afficherAlerte(rdvAlert, data.erreur || "Erreur.", "error");
      }
    });
  });
}

async function chargerJoursFermes() {
  const res = await api("/api/admin/closed-days");
  const data = await res.json();

  if (!data.joursFermes || data.joursFermes.length === 0) {
    closedDaysList.innerHTML = `<li>Aucun jour fermé pour le moment.</li>`;
    return;
  }

  closedDaysList.innerHTML = data.joursFermes
    .sort()
    .map(
      (date) => `
    <li>${date}
      <button class="link-danger" data-date="${date}">Rouvrir</button>
    </li>`
    )
    .join("");

  closedDaysList.querySelectorAll(".link-danger").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const date = btn.getAttribute("data-date");
      await api(`/api/admin/closed-days/${date}`, { method: "DELETE" });
      chargerJoursFermes();
    });
  });
}

closedDayForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const date = document.getElementById("closed-date").value;
  if (!date) return;

  await api("/api/admin/closed-days", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date })
  });
  closedDayForm.reset();
  chargerJoursFermes();
});

const messagesTbody = document.getElementById("messages-tbody");
const messagesAlert = document.getElementById("messages-alert");

async function chargerMessages() {
  const res = await api("/api/admin/contact-messages");
  const data = await res.json();

  if (!data.messages || data.messages.length === 0) {
    messagesTbody.innerHTML = `<tr><td colspan="6">Aucun message pour le moment.</td></tr>`;
    return;
  }

  messagesTbody.innerHTML = data.messages
    .map(
      (m) => `
    <tr>
      <td>${new Date(m.creeLe).toLocaleString("fr-FR")}</td>
      <td>${m.nom}</td>
      <td>${m.email}${m.telephone ? "<br/>" + m.telephone : ""}</td>
      <td>${m.message}</td>
      <td><span class="status-badge ${m.lu ? "confirme" : "annule"}">${m.lu ? "Lu" : "Non lu"}</span></td>
      <td>${
        m.lu
          ? ""
          : `<button class="link-danger" data-id="${m.id}">Marquer comme lu</button>`
      }</td>
    </tr>`
    )
    .join("");

  messagesTbody.querySelectorAll(".link-danger").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      const res = await api(`/api/admin/contact-messages/${id}/lu`, { method: "PATCH" });
      if (res.ok) {
        chargerMessages();
      } else {
        afficherAlerte(messagesAlert, "Erreur lors de la mise à jour.", "error");
      }
    });
  });
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginAlert.innerHTML = "";

  const res = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: document.getElementById("login-email").value,
      motDePasse: document.getElementById("login-password").value
    })
  });
  const data = await res.json();

  if (res.ok) {
    loginForm.reset();
    afficherAdmin();
  } else {
    afficherAlerte(loginAlert, data.erreur || "Connexion impossible.", "error");
  }
});

logoutLink.addEventListener("click", async (e) => {
  e.preventDefault();
  await fetch("/api/admin/logout", { method: "POST" });
  afficherLogin();
});

(async function init() {
  const res = await fetch("/api/admin/session");
  const data = await res.json();
  if (data.authentifie) {
    afficherAdmin();
  } else {
    afficherLogin();
    if (!data.authConfiguree) {
      afficherAlerte(
        loginAlert,
        "Authentification non configurée sur le serveur (ADMIN_EMAIL / ADMIN_PASSWORD_HASH).",
        "error"
      );
    }
  }
})();
