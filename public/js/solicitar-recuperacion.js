document.addEventListener("DOMContentLoaded", () => {
  // Ajusta el ID según cómo se llame tu formulario en RecContrasena.html
  const form = document.querySelector("form");
  const emailInput = document.querySelector('input[type="email"]');

  // Si tienes un <p> para mensajes, ponle este ID, si no, usa un alert()
  const messageEl = document.getElementById("status-message");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();

    if (!email) return;

    // Deshabilitar el botón para evitar múltiples envíos
    const btn = form.querySelector("button");
    btn.disabled = true;
    btn.textContent = "Enviando...";

    try {
      const response = await fetch("/api/recuperar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      // Mostrar el mensaje al usuario
      if (messageEl) {
        messageEl.textContent = data.message;
        messageEl.style.color = "#4ade80"; // Un verde claro que combina bien con temas oscuros/grafito
      } else {
        alert(data.message);
      }

      form.reset();
    } catch (error) {
      console.error("Error:", error);
      if (messageEl) {
        messageEl.textContent = "Ocurrió un error. Intenta de nuevo más tarde.";
        messageEl.style.color = "#f87171"; // Rojo suave
      }
    } finally {
      btn.disabled = false;
      btn.textContent = "Enviar enlace";
    }
  });
});
