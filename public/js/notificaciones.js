// ── Notificaciones con backend ────────────────────────────────────

async function obtenerNotificaciones() {
  const email = getCurrentUserEmail();
  if (!email) return [];
  try {
    const res = await fetch(`/api/notificaciones?email=${encodeURIComponent(email)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.notificaciones || [];
  } catch {
    return [];
  }
}

async function marcarTodasLeidas() {
  const email = getCurrentUserEmail();
  if (!email) return;
  try {
    await fetch("/api/notificaciones/leer", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
  } catch { /* silencioso */ }
}

async function contarNoLeidas() {
  const notifs = await obtenerNotificaciones();
  return notifs.filter((n) => !n.leida).length;
}

async function actualizarBadge() {
  const count = await contarNoLeidas();
  const dot = document.querySelector(".notif-dot");
  const badge = document.getElementById("notif-badge");
  if (dot) dot.style.display = count > 0 ? "block" : "none";
  if (badge) {
    badge.textContent = count > 9 ? "9+" : count;
    badge.style.display = count > 0 ? "flex" : "none";
  }
}

async function renderizarPanel() {
  const notifs = await obtenerNotificaciones();
  const lista = document.getElementById("notif-lista");
  if (!lista) return;

  if (!notifs.length) {
    lista.innerHTML = `<div class="notif-empty"><span>🔔</span><p>Sin notificaciones por ahora</p></div>`;
    return;
  }

  lista.innerHTML = notifs.map((n) => `
    <div class="notif-item ${n.leida ? "" : "notif-item-unread"}" data-id="${n.id}">
      <div class="notif-item-top">
        <div class="notif-avatar notif-avatar-blue">
          ${n.tipo === "solicitud" ? "📨" : n.tipo === "match" ? "🔗" : "🔔"}
        </div>
        <div class="notif-content">
          <p class="notif-msg">${escapeHtml ? escapeHtml(n.mensaje) : n.mensaje}</p>
          <span class="notif-time">${formatFecha(n.creado_en)}</span>
        </div>
      </div>
    </div>
  `).join("");
}

function formatFecha(fechaStr) {
  if (!fechaStr) return "";
  try {
    const d = new Date(fechaStr);
    const ahora = new Date();
    const diff = Math.floor((ahora - d) / 1000);
    if (diff < 60) return "Ahora mismo";
    if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
    return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
  } catch {
    return fechaStr;
  }
}

function escapeHtml(str) {
  return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function togglePanel() {
  const panel = document.getElementById("notif-panel");
  if (!panel) return;
  const abierto = panel.classList.toggle("notif-panel-open");
  if (abierto) {
    await renderizarPanel();
    setTimeout(async () => {
      await marcarTodasLeidas();
      actualizarBadge();
    }, 1000);
  }
}

// Cerrar panel al hacer clic fuera
document.addEventListener("click", (e) => {
  const panel = document.getElementById("notif-panel");
  const btn = document.getElementById("notif-btn");
  if (panel && btn && !panel.contains(e.target) && !btn.contains(e.target)) {
    panel.classList.remove("notif-panel-open");
  }
});

// Polling ligero: revisar notificaciones nuevas cada 30 segundos
setInterval(actualizarBadge, 30000);

// ── Init ──────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  actualizarBadge();
});