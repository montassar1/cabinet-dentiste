const dateInput = document.getElementById("date-input");
const slotsContainer = document.getElementById("slots-container");
const bookingForm = document.getElementById("booking-form");
const submitBtn = document.getElementById("submit-btn");
const alertZone = document.getElementById("alert-zone");

let creneauSelectionne = null;

// Bornes du sélecteur de date : de demain à +60 jours (mis à jour depuis /api/config)
function formatDateISO(d) {
  return d.toISOString().slice(0, 10);
}

function initDateInput(fenetreJours) {
  const demain = new Date();
  demain.setDate(demain.getDate() + 1);
  const limite = new Date();
  limite.setDate(limite.getDate() + fenetreJours);

  dateInput.min = formatDateISO(new Date());
  dateInput.max = formatDateISO(limite);
}

function afficherAlerte(message, type) {
  alertZone.innerHTML = `<div class="alert ${type}">${message}</div>`;
  alertZone.scrollIntoView({ behavior: "smooth", block: "start" });
}

function viderAlerte() {
  alertZone.innerHTML = "";
}

async function chargerCreneaux(date) {
  creneauSelectionne = null;
  submitBtn.disabled = true;
  slotsContainer.innerHTML = `<p class="info-msg">Chargement des créneaux...</p>`;

  try {
    const res = await fetch(`/api/slots?date=${encodeURIComponent(date)}`);
    const data = await res.json();

    if (!res.ok) {
      slotsContainer.innerHTML = `<p class="empty-msg">${data.erreur || "Erreur de chargement."}</p>`;
      return;
    }

    if (!data.creneaux || data.creneaux.length === 0) {
      slotsContainer.innerHTML = `<p class="empty-msg">Aucun créneau disponible ce jour-là. Essayez une autre date.</p>`;
      return;
    }

    slotsContainer.innerHTML = "";
    const grid = document.createElement("div");
    grid.className = "slots-grid";

    data.creneaux.forEach((heure) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "slot-btn";
      btn.textContent = heure;
      btn.addEventListener("click", () => {
        document
          .querySelectorAll(".slot-btn.selected")
          .forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        creneauSelectionne = heure;
        submitBtn.disabled = false;
      });
      grid.appendChild(btn);
    });

    slotsContainer.appendChild(grid);
  } catch (e) {
    slotsContainer.innerHTML = `<p class="empty-msg">Impossible de charger les créneaux pour le moment.</p>`;
  }
}

dateInput.addEventListener("change", () => {
  viderAlerte();
  if (dateInput.value) {
    chargerCreneaux(dateInput.value);
  }
});

bookingForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  viderAlerte();

  if (!dateInput.value || !creneauSelectionne) {
    afficherAlerte("Merci de choisir une date et un créneau.", "error");
    return;
  }

  const payload = {
    date: dateInput.value,
    heure: creneauSelectionne,
    nom: document.getElementById("nom").value.trim(),
    email: document.getElementById("email").value.trim(),
    telephone: document.getElementById("telephone").value.trim(),
    motif: document.getElementById("motif").value.trim()
  };

  submitBtn.disabled = true;
  submitBtn.textContent = "Envoi en cours...";

  try {
    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (!res.ok) {
      afficherAlerte(data.erreur || "Une erreur est survenue.", "error");
      submitBtn.disabled = false;
      submitBtn.textContent = "Confirmer le rendez-vous";
      // Le créneau a peut-être été pris entre-temps : on rafraîchit la liste
      chargerCreneaux(dateInput.value);
      return;
    }

    afficherAlerte(
      `Rendez-vous confirmé le ${data.rendezVous.date} à ${data.rendezVous.heure}. Un email de confirmation vous sera envoyé.`,
      "success"
    );
    bookingForm.reset();
    submitBtn.textContent = "Confirmer le rendez-vous";
    chargerCreneaux(dateInput.value);
  } catch (err) {
    afficherAlerte("Impossible de contacter le serveur. Réessayez.", "error");
    submitBtn.disabled = false;
    submitBtn.textContent = "Confirmer le rendez-vous";
  }
});

// Initialisation
fetch("/api/config")
  .then((r) => r.json())
  .then((data) => initDateInput(data.fenetreReservationJours || 60))
  .catch(() => initDateInput(60));
