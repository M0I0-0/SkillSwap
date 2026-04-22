const courseCategoryConfig = {
  math: { imageClass: "ss-card-img-math", icon: "∑" },
  programming: { imageClass: "ss-card-img-programming", icon: "</>" },
  programacion: { imageClass: "ss-card-img-programming", icon: "</>" },
  physics: { imageClass: "ss-card-img-physics", icon: "λ" },
  language: { imageClass: "ss-card-img-language", icon: "A" },
  writing: { imageClass: "ss-card-img-writing", icon: "✎" },
  chemistry: { imageClass: "ss-card-img-chemistry", icon: "⚗" },
  general: { imageClass: "ss-card-img-language", icon: "•" },
};

const userColorConfig = { blue: "blue", purple: "purple", teal: "teal" };

const dashboardState = {
  recommendedMatches: [],
  scheduleMatches: [],
  userMatches: [],
  filters: { search: "", category: "all", type: "all", level: "all", minCompatibility: 0 },
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function normalizeLevel(level) {
  const n = String(level || "").trim().toLowerCase();
  if (n.startsWith("avan")) return { text: "Avanzado", className: "ss-level-adv" };
  if (n.startsWith("inter")) return { text: "Intermedio", className: "ss-level-inter" };
  return { text: "Básico", className: "ss-level-basic" };
}

function ratingStars(rating) {
  const r = Math.max(0, Math.min(5, Number(rating) || 0));
  const filled = Math.round(r);
  return `${"★".repeat(filled)}${"☆".repeat(5 - filled)} ${r.toFixed(1)}`;
}

function splitInterests(interests) {
  return String(interests || "").split(",").map((i) => i.trim()).filter(Boolean);
}

function normalizeText(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function normalizeLevelValue(level) {
  const n = normalizeText(level);
  if (n.startsWith("avan")) return "avanzado";
  if (n.startsWith("inter")) return "intermedio";
  return "basico";
}

function courseMatchesSearch(match, search) {
  if (!search) return true;
  const hay = normalizeText([match.title, match.instructor, match.reason, match.category, match.schedule, match.level].join(" "));
  return hay.includes(search);
}

function userMatchesSearch(user, search) {
  if (!search) return true;
  const hay = normalizeText([user.name, user.career, user.teaches, user.learns, user.tag_primary, user.tag_secondary].join(" "));
  return hay.includes(search);
}

function courseMatchesCategory(match, category) {
  if (category === "all") return true;
  return normalizeText(match.category) === normalizeText(category);
}

function userMatchesCategory(user, category) {
  if (category === "all") return true;
  const hay = normalizeText([user.career, user.teaches, user.learns, user.tag_primary, user.tag_secondary].join(" "));
  const map = { programming: "programacion", math: "matematicas", language: "idiomas", physics: "fisica", chemistry: "quimica", writing: "redaccion" };
  return hay.includes(normalizeText(map[category] || category));
}

function updateSectionVisibility() {
  const type = dashboardState.filters.type;
  document.getElementById("ss-recommended-section")?.classList.toggle("ss-section-hidden", type === "users");
  document.getElementById("ss-schedule-section")?.classList.toggle("ss-section-hidden", type === "users");
  document.getElementById("ss-user-section")?.classList.toggle("ss-section-hidden", type === "courses");
}

async function loadCurrentUser() {
  try {
    const user = await fetchCurrentUserProfile();
    if (!user) { redirectToLogin(); return; }

    const initials = getInitials(user.fullName);
    const interests = splitInterests(user.interests);

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set("ss-nav-avatar", initials);
    set("ss-profile-avatar", initials);
    set("ss-profile-name", user.fullName || "Usuario SkillSwap");
    set("ss-profile-career", user.career || "Carrera no disponible");
    set("ss-welcome-text", `¡Bienvenido de vuelta, ${user.nombres || user.fullName || "estudiante"}!`);

    const tagsEl = document.getElementById("ss-profile-tags");
    if (tagsEl) {
      tagsEl.innerHTML = interests.length
        ? interests.map((i) => `<span class="ss-tag">${escapeHtml(i)}</span>`).join("")
        : `<span class="ss-tag">Sin intereses registrados</span>`;
    }
  } catch (err) {
    console.error(err);
    redirectToLogin();
  }
}

function renderEmptyState(msg) {
  return `<div class="ss-empty-state">
    <div class="ss-empty-state-title">Sin resultados por ahora</div>
    <div class="ss-empty-state-text">${escapeHtml(msg)}</div>
  </div>`;
}

function renderCourseCard(match) {
  const catKey = String(match.category || "general").toLowerCase();
  const cfg = courseCategoryConfig[catKey] || courseCategoryConfig.general;
  const level = normalizeLevel(match.level);
  const icon = escapeHtml(match.icon || cfg.icon);
  const pct = Math.max(0, Math.min(100, Number(match.match_percent) || 0));

  return `<div class="ss-course-card">
    <div class="ss-card-img ${cfg.imageClass}">
      <span>${icon}</span>
      ${pct ? `<div class="ss-match-badge">${pct}% match</div>` : ""}
    </div>
    <div class="ss-card-body">
      <div class="ss-card-name">${escapeHtml(match.title)}</div>
      <div class="ss-card-instructor">Por: ${escapeHtml(match.instructor)}</div>
      <div class="ss-match-reason">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="4" fill="#7C3AED"/></svg>
        ${escapeHtml(match.reason || "Match generado")}
      </div>
      <div class="ss-card-meta">
        <span class="ss-card-stars">${ratingStars(match.rating)}</span>
        <span>· ${Number(match.students_count) || 0} alumnos</span>
        <span class="ss-level-pill ${level.className}">${level.text}</span>
      </div>
      <div class="ss-card-schedule">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="4" stroke="currentColor" stroke-width="1"/><path d="M5 3v2l1.5 1.5" stroke="currentColor" stroke-width="1" stroke-linecap="round"/></svg>
        ${escapeHtml(match.schedule || "Horario por confirmar")}
      </div>
      <div class="ss-card-action">
        <button class="ss-card-btn" type="button" onclick="inscribirse(${match.id}, this)">Inscribirse</button>
      </div>
    </div>
  </div>`;
}

function renderUserCard(user) {
  const color = userColorConfig[String(user.color || "").toLowerCase()] || "blue";
  const compat = Math.max(0, Math.min(100, Number(user.compatibility) || 0));
  const tags = [user.tag_primary, user.tag_secondary].filter(Boolean);

  return `<div class="ss-user-card">
    <div class="ss-user-card-header ss-user-card-header-${color}">
      <div class="ss-user-avatar ss-user-avatar-${color}">${escapeHtml(getInitials(user.name))}</div>
      <div class="ss-user-card-header-info">
        <div class="ss-user-card-header-name">${escapeHtml(user.name)}</div>
        <div class="ss-user-card-header-career">${escapeHtml(user.career || "Carrera no especificada")}</div>
      </div>
    </div>
    <div class="ss-card-body">
      <div class="ss-user-skills">
        <div class="ss-user-skill-row">
          <span class="ss-user-skill-label">Enseña</span>
          <span class="ss-user-skill-pill ss-pill-teaches">${escapeHtml(user.teaches || "Sin definir")}</span>
        </div>
        <div class="ss-user-skill-row">
          <span class="ss-user-skill-label">Aprende</span>
          <span class="ss-user-skill-pill ss-pill-learns">${escapeHtml(user.learns || "Sin definir")}</span>
        </div>
      </div>
      <div class="ss-user-compat">
        <span class="ss-user-compat-label">Compatibilidad</span>
        <div class="ss-user-compat-bar">
          <div class="ss-user-compat-fill ss-compat-${color}" style="width:${compat}%"></div>
        </div>
        <span class="ss-user-compat-pct">${compat}%</span>
      </div>
      <div class="ss-user-tags">
        ${tags.map((t) => `<span class="ss-user-tag">${escapeHtml(t)}</span>`).join("")}
      </div>
      <div class="ss-card-action">
        <div class="ss-user-btn-row">
          <button class="ss-card-btn" type="button"
            onclick="enviarSolicitud('${escapeHtml(user.name)}', ${user.id})">
            Enviar solicitud
          </button>
        </div>
      </div>
    </div>
  </div>`;
}

function renderGrid(gridId, items, renderer, emptyMsg) {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  grid.innerHTML = !Array.isArray(items) || !items.length
    ? renderEmptyState(emptyMsg)
    : items.map(renderer).join("");
}

function updateSummary(summary) {
  const sub = document.getElementById("ss-welcome-sub");
  const num = document.getElementById("ss-welcome-stat-num");
  if (sub) sub.textContent = `Tienes ${Number(summary?.newMatches) || 0} nuevos matches compatibles con tu horario`;
  if (num) num.textContent = `${Number(summary?.averageCompatibility) || 0}%`;
}

function applyFilters() {
  const { search, category, type, level, minCompatibility } = dashboardState.filters;
  const s = normalizeText(search);

  const filtRec = dashboardState.recommendedMatches.filter(
    (m) => courseMatchesSearch(m, s) && courseMatchesCategory(m, category) &&
      (level === "all" || normalizeLevelValue(m.level) === level) &&
      (Number(m.match_percent) || 0) >= minCompatibility
  );
  const filtSch = dashboardState.scheduleMatches.filter(
    (m) => courseMatchesSearch(m, s) && courseMatchesCategory(m, category) &&
      (level === "all" || normalizeLevelValue(m.level) === level) &&
      (Number(m.match_percent) || 0) >= minCompatibility
  );
  const filtUsr = dashboardState.userMatches.filter(
    (u) => userMatchesSearch(u, s) && userMatchesCategory(u, category) &&
      (Number(u.compatibility) || 0) >= minCompatibility
  );

  const allPct = [
    ...(type !== "users" ? filtRec.map((m) => Number(m.match_percent) || 0) : []),
    ...(type !== "users" ? filtSch.map((m) => Number(m.match_percent) || 0) : []),
    ...(type !== "courses" ? filtUsr.map((u) => Number(u.compatibility) || 0) : []),
  ].filter(Boolean);
  const avg = allPct.length
    ? Math.round(allPct.reduce((a, b) => a + b, 0) / allPct.length) : 0;

  updateSummary({ newMatches: filtRec.length, averageCompatibility: avg });
  renderGrid("ss-recommended-grid", filtRec, renderCourseCard, "No hay matches recomendados con los filtros actuales.");
  renderGrid("ss-schedule-grid", filtSch, renderCourseCard, "No hay matches por horario con los filtros actuales.");
  renderGrid("ss-user-grid", filtUsr, renderUserCard, "No hay usuarios sugeridos con los filtros actuales.");
  updateSectionVisibility();
}

function setActiveCategory(category) {
  dashboardState.filters.category = category;
  document.querySelectorAll(".ss-cat-item[data-category]").forEach((el) => {
    el.classList.toggle("active", el.dataset.category === category);
  });
  applyFilters();
}

// ── Inscribirse a una habilidad ───────────────────────────────────
async function inscribirse(habilidadId, btn) {
  if (btn.disabled) return;
  const email = getCurrentUserEmail();
  if (!email) { alert("Debes iniciar sesión."); return; }

  btn.disabled = true;
  btn.textContent = "Inscribiendo...";
  try {
    const res = await fetch("/api/inscripciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, habilidad_id: habilidadId }),
    });
    const data = await res.json();
    if (res.ok) {
      btn.textContent = "✓ Inscrito";
    } else {
      btn.disabled = false;
      btn.textContent = "Inscribirse";
      alert(data.message || "Error al inscribirse.");
    }
  } catch {
    btn.disabled = false;
    btn.textContent = "Inscribirse";
    alert("Error de conexión.");
  }
}

// ── Enviar solicitud de intercambio ───────────────────────────────
async function enviarSolicitud(nombre, usuarioMatchId) {
  const email = getCurrentUserEmail();
  if (!email) { alert("Debes iniciar sesión."); return; }

  // Obtener el email del usuario destino
  // (No lo tenemos en el card, así que usamos el id para buscarlo)
  // Por simplicidad usamos un mensaje genérico
  alert(`Solicitud enviada a ${nombre}. Funcionalidad en desarrollo.`);
}

// ── Bind controles ────────────────────────────────────────────────
function bindDashboardControls() {
  const searchInput = document.getElementById("ss-search-input");
  const filterBtn = document.getElementById("ss-filter-btn");
  const filterPanel = document.getElementById("ss-filter-panel");
  const filterType = document.getElementById("ss-filter-type");
  const filterLevel = document.getElementById("ss-filter-level");
  const filterCompat = document.getElementById("ss-filter-compatibility");
  const filterReset = document.getElementById("ss-filter-reset");

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      dashboardState.filters.search = e.target.value;
      applyFilters();
    });
  }

  document.querySelectorAll(".ss-cat-item[data-category]").forEach((el) => {
    el.addEventListener("click", () => setActiveCategory(el.dataset.category));
  });

  if (filterBtn && filterPanel) {
    filterBtn.addEventListener("click", () => filterPanel.classList.toggle("hidden"));
    document.addEventListener("click", (e) => {
      if (!filterPanel.classList.contains("hidden") &&
          !filterPanel.contains(e.target) && !filterBtn.contains(e.target)) {
        filterPanel.classList.add("hidden");
      }
    });
  }

  if (filterType) filterType.addEventListener("change", (e) => { dashboardState.filters.type = e.target.value; applyFilters(); });
  if (filterLevel) filterLevel.addEventListener("change", (e) => { dashboardState.filters.level = e.target.value; applyFilters(); });
  if (filterCompat) filterCompat.addEventListener("change", (e) => { dashboardState.filters.minCompatibility = Number(e.target.value) || 0; applyFilters(); });

  if (filterReset) {
    filterReset.addEventListener("click", () => {
      dashboardState.filters = { search: "", category: "all", type: "all", level: "all", minCompatibility: 0 };
      if (searchInput) searchInput.value = "";
      if (filterType) filterType.value = "all";
      if (filterLevel) filterLevel.value = "all";
      if (filterCompat) filterCompat.value = "0";
      setActiveCategory("all");
      filterPanel?.classList.add("hidden");
    });
  }
}

async function loadDashboard() {
  renderGrid("ss-recommended-grid", [], renderCourseCard, "Cargando matches recomendados...");
  renderGrid("ss-schedule-grid", [], renderCourseCard, "Cargando matches por horario...");
  renderGrid("ss-user-grid", [], renderUserCard, "Cargando usuarios sugeridos...");

  try {
    const email = getCurrentUserEmail();
    const url = email ? `/api/dashboard?email=${encodeURIComponent(email)}` : "/api/dashboard";
    const response = await fetch(url);
    if (!response.ok) throw new Error("No fue posible cargar el dashboard");

    const data = await response.json();
    dashboardState.recommendedMatches = Array.isArray(data.recommendedMatches) ? data.recommendedMatches : [];
    dashboardState.scheduleMatches = Array.isArray(data.scheduleMatches) ? data.scheduleMatches : [];
    dashboardState.userMatches = Array.isArray(data.userMatches) ? data.userMatches : [];
    applyFilters();
  } catch (err) {
    updateSummary({ newMatches: 0, averageCompatibility: 0 });
    renderGrid("ss-recommended-grid", [], renderCourseCard, "No se pudieron cargar los matches. Publica una habilidad para empezar.");
    renderGrid("ss-schedule-grid", [], renderCourseCard, "No se pudieron cargar los matches por horario.");
    renderGrid("ss-user-grid", [], renderUserCard, "No se pudieron cargar los usuarios sugeridos.");
    console.error(err);
  }
}

document.addEventListener("DOMContentLoaded", bindDashboardControls);
document.addEventListener("DOMContentLoaded", loadDashboard);
document.addEventListener("DOMContentLoaded", loadCurrentUser);