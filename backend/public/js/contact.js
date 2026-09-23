const contactForm = document.getElementById("contact-form");
const contactAlert = document.getElementById("contact-alert");
const contactSubmit = document.getElementById("contact-submit");

function afficherAlerteContact(message, type) {
  contactAlert.innerHTML = `<div class="alert ${type}">${message}</div>`;
}

contactForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  contactAlert.innerHTML = "";

  const payload = {
    nom: document.getElementById("nom").value.trim(),
    email: document.getElementById("email").value.trim(),
    telephone: document.getElementById("telephone").value.trim(),
    message: document.getElementById("message").value.trim()
  };

  contactSubmit.disabled = true;
  contactSubmit.textContent = "Envoi en cours...";

  try {
    const res = await fetch("/api/contact-messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (!res.ok) {
      afficherAlerteContact(data.erreur || "Une erreur est survenue.", "error");
    } else {
      afficherAlerteContact("Votre message a bien été envoyé. Nous vous répondrons rapidement.", "success");
      contactForm.reset();
    }
  } catch (err) {
    afficherAlerteContact("Impossible de contacter le serveur. Réessayez plus tard.", "error");
  } finally {
    contactSubmit.disabled = false;
    contactSubmit.textContent = "Envoyer le message";
  }
});
