const courseCategoryConfig = {
  math: { imageClass: "ss-card-img-math", icon: "∑" },
  programming: { imageClass: "ss-card-img-programming", icon: "</>" },
  physics: { imageClass: "ss-card-img-physics", icon: "λ" },
  language: { imageClass: "ss-card-img-language", icon: "A" },
  writing: { imageClass: "ss-card-img-writing", icon: "✎" },
  chemistry: { imageClass: "ss-card-img-chemistry", icon: "⚗" },
  general: { imageClass: "ss-card-img-language", icon: "•" }
};

const userColorConfig = {
  blue: "blue",
  purple: "purple",
  teal: "teal"
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeLevel(level) {
  const normalized = String(level || "").trim().toLowerCase();

  if (normalized.startsWith("avan")) {
    return { text: "Avanzado", className: "ss-level-adv" };
  }

  if (normalized.startsWith("inter")) {
    return { text: "Intermedio", className: "ss-level-inter" };
  }

  return { text: "Básico", className: "ss-level-basic" };
}

function ratingStars(rating) {
  const safeRating = Math.max(0, Math.min(5, Number(rating) || 0));
  const filled = Math.round(safeRating);
  return `${"★".repeat(filled)}${"☆".repeat(5 - filled)} ${safeRating.toFixed(1)}`;
}

function initialsFromName(name) {
  return String(name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "SS";
}

function renderEmptyState(message) {
  return `
    <div class="ss-empty-state">
      <div class="ss-empty-state-title">Sin resultados por ahora</div>
      <div class="ss-empty-state-text">${escapeHtml(message)}</div>
    </div>
  `;
}

function renderCourseCard(match) {
  const categoryKey = String(match.category || "general").toLowerCase();
  const categoryConfig = courseCategoryConfig[categoryKey] || courseCategoryConfig.general;
  const level = normalizeLevel(match.level);
  const icon = escapeHtml(match.icon || categoryConfig.icon);
  const percent = Math.max(0, Math.min(100, Number(match.match_percent) || 0));

  return `
    <div class="ss-course-card">
      <div class="ss-card-img ${categoryConfig.imageClass}">
        <span>${icon}</span>
        ${percent ? `<div class="ss-match-badge">${percent}% match</div>` : ""}
      </div>
      <div class="ss-card-body">
        <div class="ss-card-name">${escapeHtml(match.title)}</div>
        <div class="ss-card-instructor">Por: ${escapeHtml(match.instructor)}</div>
        <div class="ss-match-reason">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="4" fill="#7C3AED"></circle></svg>
          ${escapeHtml(match.reason || "Match generado desde tu base de datos")}
        </div>
        <div class="ss-card-meta">
          <span class="ss-card-stars">${ratingStars(match.rating)}</span>
          <span class="ss-card-enroll">· ${Number(match.students_count) || 0} alumnos</span>
          <span class="ss-level-pill ${level.className}">${level.text}</span>
        </div>
        <div class="ss-card-schedule">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="4" stroke="currentColor" stroke-width="1"></circle><path d="M5 3v2l1.5 1.5" stroke="currentColor" stroke-width="1" stroke-linecap="round"></path></svg>
          ${escapeHtml(match.schedule || "Horario por confirmar")}
        </div>
        <div class="ss-card-action">
          <button class="ss-card-btn" type="button">Inscribirse</button>
        </div>
      </div>
    </div>
  `;
}

function renderUserCard(user) {
  const color = userColorConfig[String(user.color || "").toLowerCase()] || "blue";
  const compatibility = Math.max(0, Math.min(100, Number(user.compatibility) || 0));
  const tags = [user.tag_primary, user.tag_secondary].filter(Boolean);

  return `
    <div class="ss-user-card">
      <div class="ss-user-card-header ss-user-card-header-${color}">
        <div class="ss-user-avatar ss-user-avatar-${color}">${escapeHtml(initialsFromName(user.name))}</div>
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
            <div class="ss-user-compat-fill ss-compat-${color}" style="width:${compatibility}%"></div>
          </div>
          <span class="ss-user-compat-pct">${compatibility}%</span>
        </div>
        <div class="ss-user-tags">
          ${tags.map((tag) => `<span class="ss-user-tag">${escapeHtml(tag)}</span>`).join("")}
        </div>
        <div class="ss-card-action">
          <div class="ss-user-btn-row">
            <button class="ss-card-btn" type="button">Enviar solicitud</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderGrid(gridId, items, renderer, emptyMessage) {
  const grid = document.getElementById(gridId);
  if (!grid) {
    return;
  }

  if (!Array.isArray(items) || items.length === 0) {
    grid.innerHTML = renderEmptyState(emptyMessage);
    return;
  }

  grid.innerHTML = items.map(renderer).join("");
}

function updateSummary(summary) {
  const welcomeSub = document.getElementById("ss-welcome-sub");
  const welcomeStatNum = document.getElementById("ss-welcome-stat-num");
  const newMatches = Number(summary?.newMatches) || 0;
  const averageCompatibility = Number(summary?.averageCompatibility) || 0;

  if (welcomeSub) {
    welcomeSub.textContent = `Tienes ${newMatches} nuevos matches compatibles con tu horario`;
  }

  if (welcomeStatNum) {
    welcomeStatNum.textContent = `${averageCompatibility}%`;
  }
}

async function loadDashboard() {
  renderGrid("ss-recommended-grid", [], renderCourseCard, "Todavía no hay matches recomendados guardados.");
  renderGrid("ss-schedule-grid", [], renderCourseCard, "Todavía no hay matches ajustados a horario.");
  renderGrid("ss-user-grid", [], renderUserCard, "Todavía no hay usuarios sugeridos.");

  try {
    const response = await fetch("/api/dashboard");
    if (!response.ok) {
      throw new Error("No fue posible cargar el dashboard");
    }

    const data = await response.json();

    updateSummary(data.summary);
    renderGrid(
      "ss-recommended-grid",
      data.recommendedMatches,
      renderCourseCard,
      "Todavía no hay matches recomendados guardados."
    );
    renderGrid(
      "ss-schedule-grid",
      data.scheduleMatches,
      renderCourseCard,
      "Todavía no hay matches ajustados a horario."
    );
    renderGrid(
      "ss-user-grid",
      data.userMatches,
      renderUserCard,
      "Todavía no hay usuarios sugeridos."
    );
  } catch (error) {
    updateSummary({ newMatches: 0, averageCompatibility: 0 });
    renderGrid("ss-recommended-grid", [], renderCourseCard, "No se pudieron cargar los matches recomendados.");
    renderGrid("ss-schedule-grid", [], renderCourseCard, "No se pudieron cargar los matches por horario.");
    renderGrid("ss-user-grid", [], renderUserCard, "No se pudieron cargar los usuarios sugeridos.");
    console.error(error);
  }
}

document.addEventListener("DOMContentLoaded", loadDashboard);
