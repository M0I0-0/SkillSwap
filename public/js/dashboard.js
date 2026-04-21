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

const dashboardState = {
  recommendedMatches: [],
  scheduleMatches: [],
  userMatches: [],
  filters: {
    search: "",
    category: "all",
    type: "all",
    level: "all",
    minCompatibility: 0
  }
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

function splitInterests(interests) {
  return String(interests || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function normalizeLevelValue(level) {
  const normalized = normalizeText(level);

  if (normalized.startsWith("avan")) return "avanzado";
  if (normalized.startsWith("inter")) return "intermedio";
  return "basico";
}

function courseMatchesSearch(match, searchValue) {
  if (!searchValue) {
    return true;
  }

  const haystack = normalizeText([
    match.title,
    match.instructor,
    match.reason,
    match.category,
    match.schedule,
    match.level
  ].join(" "));

  return haystack.includes(searchValue);
}

function userMatchesSearch(user, searchValue) {
  if (!searchValue) {
    return true;
  }

  const haystack = normalizeText([
    user.name,
    user.career,
    user.teaches,
    user.learns,
    user.tag_primary,
    user.tag_secondary
  ].join(" "));

  return haystack.includes(searchValue);
}

function courseMatchesCategory(match, category) {
  if (category === "all") {
    return true;
  }

  return normalizeText(match.category) === normalizeText(category);
}

function userMatchesCategory(user, category) {
  if (category === "all") {
    return true;
  }

  const haystack = normalizeText([
    user.career,
    user.teaches,
    user.learns,
    user.tag_primary,
    user.tag_secondary
  ].join(" "));

  const categoryLabels = {
    programming: "programacion",
    math: "matematicas",
    language: "idiomas",
    physics: "fisica",
    chemistry: "quimica",
    writing: "redaccion"
  };

  const categoryNeedle = categoryLabels[category] || category;
  return haystack.includes(normalizeText(categoryNeedle));
}

function matchCompatibility(value) {
  return Math.max(0, Number(value) || 0);
}

function updateSectionVisibility() {
  const recommendedSection = document.getElementById("ss-recommended-section");
  const scheduleSection = document.getElementById("ss-schedule-section");
  const userSection = document.getElementById("ss-user-section");
  const type = dashboardState.filters.type;

  if (recommendedSection) {
    recommendedSection.classList.toggle("ss-section-hidden", type === "users");
  }

  if (scheduleSection) {
    scheduleSection.classList.toggle("ss-section-hidden", type === "users");
  }

  if (userSection) {
    userSection.classList.toggle("ss-section-hidden", type === "courses");
  }
}

async function loadCurrentUser() {
  try {
    const user = await fetchCurrentUserProfile();
    if (!user) {
      redirectToLogin();
      return;
    }

    const initials = getInitials(user.fullName);
    const interests = splitInterests(user.interests);

    const navAvatar = document.getElementById("ss-nav-avatar");
    const profileAvatar = document.getElementById("ss-profile-avatar");
    const profileName = document.getElementById("ss-profile-name");
    const profileCareer = document.getElementById("ss-profile-career");
    const profileTags = document.getElementById("ss-profile-tags");
    const welcomeText = document.getElementById("ss-welcome-text");

    if (navAvatar) navAvatar.textContent = initials;
    if (profileAvatar) profileAvatar.textContent = initials;
    if (profileName) profileName.textContent = user.fullName || "Usuario SkillSwap";
    if (profileCareer) profileCareer.textContent = user.career || "Carrera no disponible";
    if (welcomeText) welcomeText.textContent = `¡Bienvenido de vuelta, ${user.nombres || user.fullName || "estudiante"}!`;

    if (profileTags) {
      profileTags.innerHTML = interests.length
        ? interests.map((interest) => `<span class="ss-tag">${escapeHtml(interest)}</span>`).join("")
        : `<span class="ss-tag">Sin intereses registrados</span>`;
    }
  } catch (error) {
    console.error(error);
    redirectToLogin();
  }
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

function applyFilters() {
  const { search, category, type, level, minCompatibility } = dashboardState.filters;
  const searchValue = normalizeText(search);

  const filteredRecommended = dashboardState.recommendedMatches.filter((match) =>
    courseMatchesSearch(match, searchValue) &&
    courseMatchesCategory(match, category) &&
    (level === "all" || normalizeLevelValue(match.level) === level) &&
    matchCompatibility(match.match_percent) >= minCompatibility
  );

  const filteredSchedule = dashboardState.scheduleMatches.filter((match) =>
    courseMatchesSearch(match, searchValue) &&
    courseMatchesCategory(match, category) &&
    (level === "all" || normalizeLevelValue(match.level) === level) &&
    matchCompatibility(match.match_percent) >= minCompatibility
  );

  const filteredUsers = dashboardState.userMatches.filter((user) =>
    userMatchesSearch(user, searchValue) &&
    userMatchesCategory(user, category) &&
    matchCompatibility(user.compatibility) >= minCompatibility
  );

  const visibleCompatibilities = [
    ...(type !== "users" ? filteredRecommended.map((item) => matchCompatibility(item.match_percent)) : []),
    ...(type !== "users" ? filteredSchedule.map((item) => matchCompatibility(item.match_percent)) : []),
    ...(type !== "courses" ? filteredUsers.map((item) => matchCompatibility(item.compatibility)) : [])
  ].filter((value) => value > 0);

  const averageCompatibility = visibleCompatibilities.length
    ? Math.round(visibleCompatibilities.reduce((sum, value) => sum + value, 0) / visibleCompatibilities.length)
    : 0;

  updateSummary({
    newMatches: filteredRecommended.length,
    averageCompatibility
  });

  renderGrid(
    "ss-recommended-grid",
    filteredRecommended,
    renderCourseCard,
    "No hay matches recomendados con los filtros actuales."
  );
  renderGrid(
    "ss-schedule-grid",
    filteredSchedule,
    renderCourseCard,
    "No hay matches por horario con los filtros actuales."
  );
  renderGrid(
    "ss-user-grid",
    filteredUsers,
    renderUserCard,
    "No hay usuarios sugeridos con los filtros actuales."
  );

  updateSectionVisibility();
}

function setActiveCategory(category) {
  dashboardState.filters.category = category;

  document.querySelectorAll(".ss-cat-item[data-category]").forEach((item) => {
    item.classList.toggle("active", item.dataset.category === category);
  });

  applyFilters();
}

function bindDashboardControls() {
  const searchInput = document.getElementById("ss-search-input");
  const filterButton = document.getElementById("ss-filter-btn");
  const filterPanel = document.getElementById("ss-filter-panel");
  const filterType = document.getElementById("ss-filter-type");
  const filterLevel = document.getElementById("ss-filter-level");
  const filterCompatibility = document.getElementById("ss-filter-compatibility");
  const filterReset = document.getElementById("ss-filter-reset");

  if (searchInput) {
    searchInput.addEventListener("input", (event) => {
      dashboardState.filters.search = event.target.value;
      applyFilters();
    });
  }

  document.querySelectorAll(".ss-cat-item[data-category]").forEach((item) => {
    item.addEventListener("click", () => {
      setActiveCategory(item.dataset.category);
    });
  });

  if (filterButton && filterPanel) {
    filterButton.addEventListener("click", () => {
      filterPanel.classList.toggle("hidden");
    });

    document.addEventListener("click", (event) => {
      if (!filterPanel.classList.contains("hidden") && !filterPanel.contains(event.target) && !filterButton.contains(event.target)) {
        filterPanel.classList.add("hidden");
      }
    });
  }

  if (filterType) {
    filterType.addEventListener("change", (event) => {
      dashboardState.filters.type = event.target.value;
      applyFilters();
    });
  }

  if (filterLevel) {
    filterLevel.addEventListener("change", (event) => {
      dashboardState.filters.level = event.target.value;
      applyFilters();
    });
  }

  if (filterCompatibility) {
    filterCompatibility.addEventListener("change", (event) => {
      dashboardState.filters.minCompatibility = Number(event.target.value) || 0;
      applyFilters();
    });
  }

  if (filterReset) {
    filterReset.addEventListener("click", () => {
      dashboardState.filters = {
        search: "",
        category: "all",
        type: "all",
        level: "all",
        minCompatibility: 0
      };

      if (searchInput) searchInput.value = "";
      if (filterType) filterType.value = "all";
      if (filterLevel) filterLevel.value = "all";
      if (filterCompatibility) filterCompatibility.value = "0";
      setActiveCategory("all");

      if (filterPanel) {
        filterPanel.classList.add("hidden");
      }
    });
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
    dashboardState.recommendedMatches = Array.isArray(data.recommendedMatches) ? data.recommendedMatches : [];
    dashboardState.scheduleMatches = Array.isArray(data.scheduleMatches) ? data.scheduleMatches : [];
    dashboardState.userMatches = Array.isArray(data.userMatches) ? data.userMatches : [];
    applyFilters();
  } catch (error) {
    updateSummary({ newMatches: 0, averageCompatibility: 0 });
    renderGrid("ss-recommended-grid", [], renderCourseCard, "No se pudieron cargar los matches recomendados.");
    renderGrid("ss-schedule-grid", [], renderCourseCard, "No se pudieron cargar los matches por horario.");
    renderGrid("ss-user-grid", [], renderUserCard, "No se pudieron cargar los usuarios sugeridos.");
    console.error(error);
  }
}

document.addEventListener("DOMContentLoaded", bindDashboardControls);
document.addEventListener("DOMContentLoaded", loadDashboard);
document.addEventListener("DOMContentLoaded", loadCurrentUser);
