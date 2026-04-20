// =============================================
// CONFIGURACIÓN DEL USUARIO ACTUAL
// Cambia "CA" por las iniciales del usuario logueado
// =============================================
const CURRENT_USER = "CA";

// =============================================
// DATOS: CURSOS RECOMENDADOS
// =============================================
const cursosRecomendados = [
  {
    icon: "∑",
    imgClass: "ss-card-img-math",
    badge: "98% match",
    nombre: "Álgebra Lineal para Ingeniería",
    instructor: "Por: María González",
    razon: "Interés compartido · Horario compatible",
    estrellas: "★★★★★ 4.9",
    alumnos: "24 alumnos",
    nivel: "Intermedio",
    nivelClass: "ss-level-inter",
    horario: "Lun y Mié · 14:00-15:30"
  },
  {
    icon: "</> ",
    imgClass: "ss-card-img-programming",
    badge: null,
    nombre: "Python para análisis de datos",
    instructor: "Por: Andrés Ruiz",
    razon: "Horario compatible · Nivel similar",
    estrellas: "★★★★☆ 4.5",
    alumnos: "18 alumnos",
    nivel: "Intermedio",
    nivelClass: "ss-level-inter",
    horario: "Mar y Jue · 16:00-17:30"
  },
  {
    icon: "λ",
    imgClass: "ss-card-img-physics",
    badge: null,
    nombre: "Física II: Electromagnetismo",
    instructor: "Por: Sofía Medina",
    razon: "Recomendado por usuarios",
    estrellas: "★★★★★ 4.8",
    alumnos: "31 alumnos",
    nivel: "Avanzado",
    nivelClass: "ss-level-adv",
    horario: "Vie · 10:00-12:00"
  }
];

// =============================================
// DATOS: CURSOS POR HORARIO
// =============================================
const cursosHorario = [
  {
    icon: "A",
    imgClass: "ss-card-img-language",
    badge: null,
    nombre: "Inglés Conversacional B2",
    instructor: "Por: Lucía Torres",
    razon: "Sin choque de horario",
    estrellas: "★★★★☆ 4.3",
    alumnos: "12 alumnos",
    nivel: "Intermedio",
    nivelClass: "ss-level-inter",
    horario: "Mié · 09:00-10:30"
  },
  {
    icon: "✎",
    imgClass: "ss-card-img-writing",
    badge: null,
    nombre: "Redacción de Tesis y Ensayos",
    instructor: "Por: Omar Pérez",
    razon: "Nivel adecuado a ti",
    estrellas: "★★★★★ 4.7",
    alumnos: "9 alumnos",
    nivel: "Básico",
    nivelClass: "ss-level-basic",
    horario: "Jue · 11:00-12:30"
  },
  {
    icon: "⚗",
    imgClass: "ss-card-img-chemistry",
    badge: null,
    nombre: "Química Orgánica Básica",
    instructor: "Por: Daniela Vega",
    razon: "Nivel compatible",
    estrellas: "★★★★☆ 4.1",
    alumnos: "15 alumnos",
    nivel: "Básico",
    nivelClass: "ss-level-basic",
    horario: "Lun · 08:00-09:30"
  }
];

// =============================================
// DATOS: USUARIOS PARA INTERCAMBIO
// =============================================
const usuarios = [
  {
    iniciales: "MG", nombre: "María González", carrera: "Ing. Matemáticas",
    colorClass: "blue", ensena: "Álgebra Lineal", aprende: "Programación",
    compat: 98, compatClass: "blue", tags: ["Matemáticas", "Lun–Mié"]
  },
  {
    iniciales: "AR", nombre: "Andrés Ruiz", carrera: "Ing. en Sistemas",
    colorClass: "purple", ensena: "Python / Data", aprende: "Física",
    compat: 91, compatClass: "purple", tags: ["Programación", "Mar–Jue"]
  },
  {
    iniciales: "SM", nombre: "Sofía Medina", carrera: "Física experimental",
    colorClass: "teal", ensena: "Electromagnetismo", aprende: "Redacción",
    compat: 85, compatClass: "teal", tags: ["Física", "Viernes"]
  },
  {
    iniciales: "LT", nombre: "Lucía Torres", carrera: "Letras Hispánicas",
    colorClass: "blue", ensena: "Redacción", aprende: "Matemáticas",
    compat: 79, compatClass: "blue", tags: ["Escritura", "Lun–Vie"]
  },
  {
    iniciales: "OP", nombre: "Omar Pérez", carrera: "Ing. Industrial",
    colorClass: "purple", ensena: "Estadística", aprende: "Programación",
    compat: 76, compatClass: "purple", tags: ["Estadística", "Mar–Jue"]
  },
  {
    iniciales: "DV", nombre: "Daniela Vega", carrera: "Química",
    colorClass: "teal", ensena: "Química Orgánica", aprende: "Física",
    compat: 72, compatClass: "teal", tags: ["Química", "Miércoles"]
  },
  {
    iniciales: "JR", nombre: "Jorge Ramírez", carrera: "Ing. en Computación",
    colorClass: "blue", ensena: "Algoritmos", aprende: "Inglés",
    compat: 88, compatClass: "blue", tags: ["Programación", "Vie"]
  },
  {
    iniciales: "PG", nombre: "Paola García", carrera: "Matemáticas Aplicadas",
    colorClass: "purple", ensena: "Cálculo", aprende: "Estadística",
    compat: 83, compatClass: "purple", tags: ["Matemáticas", "Lun–Mié"]
  }
];

let nextUserIndex = 3;

// =============================================
// RENDER: TARJETA DE CURSO
// =============================================
function htmlCurso(c) {
  return `
    <div class="ss-course-card">
      <div class="ss-card-img ${c.imgClass}">
        <span>${c.icon}</span>
        ${c.badge ? `<div class="ss-match-badge">${c.badge}</div>` : ""}
      </div>
      <div class="ss-card-body">
        <div class="ss-card-name">${c.nombre}</div>
        <div class="ss-card-instructor">${c.instructor}</div>
        <div class="ss-match-reason">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <circle cx="5" cy="5" r="4" fill="#7C3AED"/>
          </svg>
          ${c.razon}
        </div>
        <div class="ss-card-meta">
          <span class="ss-card-stars">${c.estrellas}</span>
          <span>· ${c.alumnos}</span>
          <span class="ss-level-pill ${c.nivelClass}">${c.nivel}</span>
        </div>
        <div class="ss-card-schedule">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <circle cx="5" cy="5" r="4" stroke="currentColor" stroke-width="1"/>
            <path d="M5 3v2l1.5 1.5" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>
          </svg>
          ${c.horario}
        </div>
        <div class="ss-card-action">
          <button class="ss-card-btn">Inscribirse</button>
        </div>
      </div>
    </div>
  `;
}

// =============================================
// RENDER: TARJETA DE USUARIO
// =============================================
function htmlUsuario(u, slotIndex) {
  return `
    <div class="ss-user-card-header ss-user-card-header-${u.colorClass}">
      <div class="ss-user-avatar ss-user-avatar-${u.colorClass}">${u.iniciales}</div>
      <div class="ss-user-card-header-info">
        <div class="ss-user-card-header-name">${u.nombre}</div>
        <div class="ss-user-card-header-career">${u.carrera}</div>
      </div>
    </div>
    <div class="ss-card-body">
      <div class="ss-user-skills">
        <div class="ss-user-skill-row">
          <span class="ss-user-skill-label">Enseña</span>
          <span class="ss-user-skill-pill ss-pill-teaches">${u.ensena}</span>
        </div>
        <div class="ss-user-skill-row">
          <span class="ss-user-skill-label">Aprende</span>
          <span class="ss-user-skill-pill ss-pill-learns">${u.aprende}</span>
        </div>
      </div>
      <div class="ss-user-compat">
        <span class="ss-user-compat-label">Compatibilidad</span>
        <div class="ss-user-compat-bar">
          <div class="ss-user-compat-fill ss-compat-${u.compatClass}" style="width:${u.compat}%"></div>
        </div>
        <span class="ss-user-compat-pct">${u.compat}%</span>
      </div>
      <div class="ss-user-tags">
        ${u.tags.map(t => `<span class="ss-user-tag">${t}</span>`).join("")}
      </div>
      <div class="ss-card-action">
        <div class="ss-user-btn-row">
          <button class="ss-card-btn"
            onclick="solicitarIntercambio(event, '${u.iniciales}', '${u.nombre}', '${u.colorClass}')">
            Enviar solicitud
          </button>
          <button class="ss-user-btn-reject" onclick="rechazarUsuario(${slotIndex})">✕</button>
        </div>
      </div>
    </div>
  `;
}

// =============================================
// RENDER: GRIDS INICIALES
// =============================================
function renderizarCursos() {
  const recGrid = document.getElementById("ss-recommended-grid");
  const schGrid = document.getElementById("ss-schedule-grid");
  if (recGrid) recGrid.innerHTML = cursosRecomendados.map(htmlCurso).join("");
  if (schGrid) schGrid.innerHTML = cursosHorario.map(htmlCurso).join("");
}

function renderizarUsuarios() {
  const grid = document.getElementById("ss-user-grid");
  if (!grid) return;
  grid.innerHTML = usuarios.slice(0, 3).map((u, i) => {
    const card = document.createElement("div");
    card.className = "ss-user-card";
    card.innerHTML = htmlUsuario(u, i);
    return card.outerHTML;
  }).join("");
}

// =============================================
// BANNER: ESTADÍSTICAS
// =============================================
function actualizarBanner() {
  const compatPromedio = Math.round(
    cursosRecomendados.reduce((s, c) => s + (parseInt(c.badge) || 0), 0) /
    cursosRecomendados.filter(c => c.badge).length
  );
  const numEl = document.getElementById("ss-welcome-stat-num");
  const subEl = document.getElementById("ss-welcome-sub");
  if (numEl) numEl.textContent = compatPromedio + "%";
  if (subEl) subEl.textContent = `Tienes ${cursosRecomendados.length} nuevos matches compatibles con tu horario`;
}

// =============================================
// USUARIOS: RECHAZAR Y ROTAR
// =============================================
function rechazarUsuario(slotIndex) {
  const grid = document.getElementById("ss-user-grid");
  const cards = grid.querySelectorAll(".ss-user-card");
  const card = cards[slotIndex];

  if (nextUserIndex >= usuarios.length) {
    card.style.transition = "opacity 0.3s, transform 0.3s";
    card.style.opacity = "0";
    card.style.transform = "scale(0.95)";
    setTimeout(() => {
      card.innerHTML = `
        <div class="ss-card-body" style="display:flex;flex-direction:column;align-items:center;
          justify-content:center;flex:1;gap:0.5rem;text-align:center;padding:2rem 1rem;min-height:220px;">
          <span style="font-size:2rem;">🎉</span>
          <span style="font-size:0.9rem;color:var(--color-text-secondary);">
            Sin más sugerencias por ahora
          </span>
        </div>
      `;
      card.style.opacity = "1";
      card.style.transform = "scale(1)";
    }, 300);
    return;
  }

  const nuevoUsuario = usuarios[nextUserIndex];
  nextUserIndex++;

  card.style.transition = "opacity 0.25s, transform 0.25s";
  card.style.opacity = "0";
  card.style.transform = "translateY(-8px)";

  setTimeout(() => {
    card.innerHTML = htmlUsuario(nuevoUsuario, slotIndex);
    card.style.transform = "translateY(8px)";
    card.style.opacity = "0";
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        card.style.transition = "opacity 0.25s, transform 0.25s";
        card.style.opacity = "1";
        card.style.transform = "translateY(0)";
      });
    });
  }, 250);
}

// =============================================
// SOLICITUD DE INTERCAMBIO
// =============================================
function solicitarIntercambio(event, iniciales, nombre, color) {
  const btn = event.target;

  // Evitar doble envío
  if (btn.disabled) return;

  // Enviar notificación al otro usuario
  enviarNotificacion(iniciales, {
    tipo: "solicitud",
    deUsuario: CURRENT_USER,
    iniciales: CURRENT_USER,
    color: "blue",
    mensaje: `<strong>${CURRENT_USER}</strong> te envió una solicitud de intercambio de habilidades`
  });

  // Feedback visual
  btn.textContent = "✓ Solicitud enviada";
  btn.disabled = true;
}

// =============================================
// SISTEMA DE NOTIFICACIONES
// =============================================

function enviarNotificacion(paraUsuario, notif) {
  const key = `notifs_${paraUsuario}`;
  const existentes = JSON.parse(localStorage.getItem(key) || "[]");
  existentes.unshift({
    id: Date.now(),
    leida: false,
    respondida: false,
    fecha: new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }),
    ...notif
  });
  localStorage.setItem(key, JSON.stringify(existentes));
  // Dispara evento para otras pestañas abiertas
  window.dispatchEvent(new StorageEvent("storage", { key }));
}

function obtenerNotificaciones() {
  return JSON.parse(localStorage.getItem(`notifs_${CURRENT_USER}`) || "[]");
}

function marcarTodasLeidas() {
  const key = `notifs_${CURRENT_USER}`;
  const notifs = obtenerNotificaciones().map(n => ({ ...n, leida: true }));
  localStorage.setItem(key, JSON.stringify(notifs));
}

function contarNoLeidas() {
  return obtenerNotificaciones().filter(n => !n.leida).length;
}

function actualizarBadge() {
  const count = contarNoLeidas();
  const dot = document.querySelector(".notif-dot");
  const badge = document.getElementById("notif-badge");
  if (dot) dot.style.display = count > 0 ? "block" : "none";
  if (badge) {
    badge.textContent = count > 9 ? "9+" : count;
    badge.style.display = count > 0 ? "flex" : "none";
  }
}

function renderizarPanel() {
  const notifs = obtenerNotificaciones();
  const lista = document.getElementById("notif-lista");
  if (!lista) return;

  if (notifs.length === 0) {
    lista.innerHTML = `
      <div class="notif-empty">
        <span>🔔</span>
        <p>Sin notificaciones por ahora</p>
      </div>`;
    return;
  }

  lista.innerHTML = notifs.map(n => `
    <div class="notif-item ${n.leida ? "" : "notif-item-unread"}" data-id="${n.id}">
      <div class="notif-item-top">
        <div class="notif-avatar notif-avatar-${n.color || "blue"}">${n.iniciales || "?"}</div>
        <div class="notif-content">
          <p class="notif-msg">${n.mensaje}</p>
          <span class="notif-time">${n.fecha}</span>
        </div>
      </div>
      ${n.tipo === "solicitud" && !n.respondida ? `
        <div class="notif-actions">
          <button class="notif-btn-accept"
            onclick="event.stopPropagation(); aceptarSolicitud(${n.id}, '${n.deUsuario}')">
            Aceptar
          </button>
          <button class="notif-btn-decline"
            onclick="event.stopPropagation(); rechazarSolicitud(${n.id})">
            Rechazar
          </button>
        </div>` : ""}
    </div>
  `).join("");
}

function aceptarSolicitud(id, deUsuario) {
  const key = `notifs_${CURRENT_USER}`;
  const notifs = obtenerNotificaciones().map(n =>
    n.id === id
      ? { ...n, respondida: true, leida: true, mensaje: n.mensaje + " — <strong style='color:#10b981'>Aceptada ✓</strong>" }
      : n
  );
  localStorage.setItem(key, JSON.stringify(notifs));

  // Notificar al solicitante
  enviarNotificacion(deUsuario, {
    tipo: "respuesta",
    iniciales: CURRENT_USER,
    color: "teal",
    mensaje: `<strong>${CURRENT_USER}</strong> aceptó tu solicitud de intercambio 🎉`
  });

  renderizarPanel();
  actualizarBadge();
}

function rechazarSolicitud(id) {
  const key = `notifs_${CURRENT_USER}`;
  const notifs = obtenerNotificaciones().map(n =>
    n.id === id
      ? { ...n, respondida: true, leida: true, mensaje: n.mensaje + " — <strong style='color:#ef4444'>Rechazada</strong>" }
      : n
  );
  localStorage.setItem(key, JSON.stringify(notifs));
  renderizarPanel();
  actualizarBadge();
}

function togglePanel() {
  const panel = document.getElementById("notif-panel");
  if (!panel) return;
  const abierto = panel.classList.toggle("notif-panel-open");
  if (abierto) {
    renderizarPanel();
    // Marcar como leídas después de 1 segundo
    setTimeout(() => {
      marcarTodasLeidas();
      actualizarBadge();
    }, 1000);
  }
}

// Escuchar cambios desde otras pestañas
window.addEventListener("storage", (e) => {
  if (e.key === `notifs_${CURRENT_USER}`) {
    actualizarBadge();
    const panel = document.getElementById("notif-panel");
    if (panel && panel.classList.contains("notif-panel-open")) {
      renderizarPanel();
    }
  }
});

// Cerrar panel al hacer click fuera
document.addEventListener("click", (e) => {
  const panel = document.getElementById("notif-panel");
  const btn = document.getElementById("notif-btn");
  if (panel && btn && !panel.contains(e.target) && !btn.contains(e.target)) {
    panel.classList.remove("notif-panel-open");
  }
});

// =============================================
// INIT
// =============================================
document.addEventListener("DOMContentLoaded", () => {
  renderizarCursos();
  renderizarUsuarios();
  actualizarBanner();
  actualizarBadge();
});
