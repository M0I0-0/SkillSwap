async function obtenerNotificaciones() {
  const email = getCurrentUserEmail();
  if (!email) return [];

  try {
    const res = await fetch(`/api/notificaciones?email=${encodeURIComponent(email)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.notificaciones) ? data.notificaciones : [];
  } catch {
    return [];
  }
}

async function marcarTodasLeidas() {
  const email = getCurrentUserEmail();
  if (!email) return false;

  try {
    const res = await fetch("/api/notificaciones/leer", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

    return d.toLocaleDateString("es-MX", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return fechaStr;
  }
}

function iconoPorTipo(tipo) {
  if (tipo === "solicitud") return "📨";
  if (tipo === "match") return "🔗";
  if (tipo === "calificacion") return "⭐";
  return "🔔";
}

function claseAvatarPorTipo(tipo) {
  if (tipo === "solicitud") return "notif-avatar-blue";
  if (tipo === "match") return "notif-avatar-purple";
  if (tipo === "calificacion") return "notif-avatar-green";
  return "notif-avatar-teal";
}

function renderNotificacionesHtml(notifs) {
  if (!notifs.length) {
    return `
      <div class="notif-empty">
        <span>🔔</span>
        <p>Sin notificaciones por ahora</p>
      </div>
    `;
  }

  return notifs.map((n) => `
    <article class="notif-row ${n.leida ? "" : "notif-row-unread"}" data-id="${n.id}">
      <div class="notif-row-main">
        <div class="notif-avatar ${claseAvatarPorTipo(n.tipo)}">
          ${iconoPorTipo(n.tipo)}
        </div>
        <div class="notif-row-copy">
          <p>${escapeHtml(n.mensaje)}</p>
          <span>${escapeHtml(n.tipo || "notificacion")}</span>
        </div>
      </div>
      <div class="notif-row-meta">
        <span>${formatFecha(n.creado_en)}</span>
      </div>
    </article>
  `).join("");
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
    badge.textContent = count > 9 ? "9+" : String(count);
    badge.style.display = count > 0 ? "flex" : "none";
  }
}

async function renderizarPanel() {
  const lista = document.getElementById("notif-lista");
  if (!lista) return;

  const notifs = await obtenerNotificaciones();
  lista.innerHTML = renderNotificacionesHtml(notifs);
}

async function renderizarPaginaNotificaciones() {
  const lista = document.getElementById("notif-full-list");
  if (!lista) return;

  const notifs = await obtenerNotificaciones();
  const total = notifs.length;
  const noLeidas = notifs.filter((n) => !n.leida).length;

  lista.innerHTML = renderNotificacionesHtml(notifs);

  const totalEl = document.getElementById("notif-total-count");
  const unreadEl = document.getElementById("notif-unread-count");
  if (totalEl) totalEl.textContent = String(total);
  if (unreadEl) unreadEl.textContent = String(noLeidas);
}

async function marcarTodasLeidasDesdeUI() {
  const ok = await marcarTodasLeidas();
  if (!ok) return;

  await Promise.all([
    renderizarPanel(),
    renderizarPaginaNotificaciones(),
    actualizarBadge(),
  ]);
}

async function cargarUsuarioActualEnNotificaciones() {
  try {
    const user = await fetchCurrentUserProfile();
    if (!user) {
      redirectToLogin();
      return;
    }

    const initials = getInitials(user.fullName);
    const setText = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    };

    setText("ss-nav-avatar", initials);
    setText("ss-profile-avatar", initials);
    setText("ss-profile-name", user.fullName || "Usuario SkillSwap");
    setText("ss-profile-career", user.career || "Carrera no disponible");
  } catch (error) {
    console.error(error);
    redirectToLogin();
  }
}

async function togglePanel() {
  const panel = document.getElementById("notif-panel");
  if (!panel) return;

  const abierto = panel.classList.toggle("notif-panel-open");
  if (abierto) {
    await renderizarPanel();
    setTimeout(() => {
      marcarTodasLeidasDesdeUI();
    }, 1000);
  }
}

document.addEventListener("click", (e) => {
  const panel = document.getElementById("notif-panel");
  const btn = document.getElementById("notif-btn");

  if (panel && btn && !panel.contains(e.target) && !btn.contains(e.target)) {
    panel.classList.remove("notif-panel-open");
  }
});

setInterval(async () => {
  await actualizarBadge();
  await renderizarPaginaNotificaciones();
}, 30000);

document.addEventListener("DOMContentLoaded", async () => {
  const markReadBtn = document.getElementById("notif-mark-read-btn");
  if (markReadBtn) {
    markReadBtn.addEventListener("click", marcarTodasLeidasDesdeUI);
  }

  await cargarUsuarioActualEnNotificaciones();
  await Promise.all([
    actualizarBadge(),
    renderizarPanel(),
    renderizarPaginaNotificaciones(),
  ]);
});
