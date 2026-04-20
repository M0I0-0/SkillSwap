const days = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];
const times = ["09:00", "11:00", "13:00", "15:00", "17:00", "19:00"];
const selected = new Set();
const currentUserEmail = localStorage.getItem("skillswapCurrentUserEmail");

function initialsFromName(name) {
  return String(name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "SS";
}

function normalizeInterests(interests) {
  return String(interests || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function ensureCareerOption(value) {
  const select = document.getElementById("p-career");
  if (!select || !value) {
    return;
  }

  const exists = Array.from(select.options).some((option) => option.value === value);
  if (exists) {
    return;
  }

  const option = document.createElement("option");
  option.value = value;
  option.textContent = value;
  select.appendChild(option);
}

function getInterestsFromUi() {
  return Array.from(document.querySelectorAll("#tags-wrap .p-tag"))
    .map((tag) => tag.childNodes[0]?.textContent?.trim() || "")
    .filter(Boolean);
}

function showMessage(message, isError = false) {
  const messageBox = document.getElementById("p-profile-message");
  if (!messageBox) {
    return;
  }

  messageBox.textContent = message;
  messageBox.style.display = "block";
  messageBox.style.color = isError ? "#B91C1C" : "#0F766E";
}

function renderInterests(interests) {
  const wrap = document.getElementById("tags-wrap");
  if (!wrap) {
    return;
  }

  const addButton = wrap.querySelector(".p-tag-add");
  wrap.querySelectorAll(".p-tag").forEach((tag) => tag.remove());

  interests.forEach((interest) => {
    const tag = document.createElement("span");
    tag.className = "p-tag";
    tag.innerHTML = `${interest} <span class="p-tag-remove" onclick="removeTag(this)">x</span>`;
    wrap.insertBefore(tag, addButton);
  });
}

function buildSched() {
  const grid = document.getElementById("sched");
  if (!grid) return;

  grid.innerHTML = "";
  const corner = document.createElement("div");
  corner.className = "p-sch-cell header";
  grid.appendChild(corner);

  days.forEach((day) => {
    const header = document.createElement("div");
    header.className = "p-sch-cell header";
    header.textContent = day;
    grid.appendChild(header);
  });

  times.forEach((time, timeIndex) => {
    const timeCell = document.createElement("div");
    timeCell.className = "p-sch-cell time";
    timeCell.textContent = time;
    grid.appendChild(timeCell);

    days.forEach((_, dayIndex) => {
      const key = `${dayIndex}-${timeIndex}`;
      const cell = document.createElement("div");
      cell.className = `p-sch-cell${selected.has(key) ? " selected" : ""}`;
      cell.onclick = () => {
        if (selected.has(key)) {
          selected.delete(key);
          cell.classList.remove("selected");
        } else {
          selected.add(key);
          cell.classList.add("selected");
        }
      };
      grid.appendChild(cell);
    });
  });
}

function loadAvailability(availability) {
  selected.clear();
  const normalized = String(availability || "").trim();

  if (normalized === "Matutino") {
    ["0-0", "1-0", "2-0", "3-0", "4-0", "0-1", "1-1", "2-1", "3-1", "4-1"].forEach((item) => selected.add(item));
  } else if (normalized === "Vespertino") {
    ["0-3", "1-3", "2-3", "3-3", "4-3", "0-4", "1-4", "2-4", "3-4", "4-4"].forEach((item) => selected.add(item));
  }

  buildSched();
}

function detectAvailability() {
  const morningHits = Array.from(selected).filter((slot) => ["0", "1", "2"].includes(slot.split("-")[1])).length;
  const eveningHits = Array.from(selected).filter((slot) => ["3", "4", "5"].includes(slot.split("-")[1])).length;

  if (morningHits === 0 && eveningHits === 0) {
    return "";
  }

  return morningHits >= eveningHits ? "Matutino" : "Vespertino";
}

function toggleMe(el) {
  el.classList.toggle("on");
}

function removeTag(btn) {
  btn.parentElement.remove();
}

function addTag() {
  const name = prompt("Nuevo interés:");
  if (!name || !name.trim()) return;

  const wrap = document.getElementById("tags-wrap");
  const addBtn = wrap.querySelector(".p-tag-add");
  const tag = document.createElement("span");
  tag.className = "p-tag";
  tag.innerHTML = `${name.trim()} <span class="p-tag-remove" onclick="removeTag(this)">x</span>`;
  wrap.insertBefore(tag, addBtn);
}

function setLevel(el, type) {
  const pills = el.parentElement.querySelectorAll(".p-level-pill");
  pills.forEach((pill) => {
    pill.className = "p-level-pill";
  });

  if (type === "b") el.className = "p-level-pill sel-b";
  else if (type === "i") el.className = "p-level-pill sel-i";
  else el.className = "p-level-pill sel-a";
}

async function loadProfile() {
  if (!currentUserEmail) {
    showMessage("No hay una sesión activa. Inicia sesión para cargar tu perfil.", true);
    return;
  }

  try {
    const response = await fetch(`/api/users/me?email=${encodeURIComponent(currentUserEmail)}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "No se pudo cargar el perfil");
    }

    const user = data.user;
    const initials = initialsFromName(user.fullName);

    document.getElementById("p-nav-avatar").textContent = initials;
    document.getElementById("p-avatar-lg").textContent = initials;
    document.getElementById("p-avatar-name").textContent = user.fullName || "Usuario SkillSwap";
    document.getElementById("p-avatar-email").textContent = user.email || "";
    document.getElementById("p-full-name").value = user.fullName || "";
    ensureCareerOption(user.career || "");
    document.getElementById("p-career").value = user.career || "";
    document.getElementById("p-phone").value = user.phone || "";
    document.getElementById("p-semester").value = user.semester || "";
    document.getElementById("p-email").value = user.email || "";

    renderInterests(normalizeInterests(user.interests));
    loadAvailability(user.availability);
  } catch (error) {
    console.error(error);
    showMessage(error.message || "No se pudo cargar tu perfil.", true);
  }
}

async function saveProfile() {
  if (!currentUserEmail) {
    showMessage("No hay una sesión activa.", true);
    return;
  }

  const payload = {
    email: currentUserEmail,
    fullName: document.getElementById("p-full-name").value,
    career: document.getElementById("p-career").value,
    phone: document.getElementById("p-phone").value,
    semester: document.getElementById("p-semester").value,
    interests: getInterestsFromUi().join(", "),
    availability: detectAvailability()
  };

  try {
    const response = await fetch("/api/users/me", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "No se pudo guardar el perfil");
    }

    const updatedUser = data.user;
    document.getElementById("p-avatar-name").textContent = updatedUser.fullName || "Usuario SkillSwap";
    document.getElementById("p-nav-avatar").textContent = initialsFromName(updatedUser.fullName);
    document.getElementById("p-avatar-lg").textContent = initialsFromName(updatedUser.fullName);
    showMessage("Perfil guardado correctamente.");
  } catch (error) {
    console.error(error);
    showMessage(error.message || "No se pudo guardar el perfil.", true);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  buildSched();
  loadProfile();

  const savePersonalButton = document.getElementById("p-save-personal-btn");
  const saveInterestsButton = document.getElementById("p-save-interests-btn");
  const saveAvailabilityButton = document.getElementById("p-save-availability-btn");

  if (savePersonalButton) savePersonalButton.addEventListener("click", saveProfile);
  if (saveInterestsButton) saveInterestsButton.addEventListener("click", saveProfile);
  if (saveAvailabilityButton) saveAvailabilityButton.addEventListener("click", saveProfile);

  window.toggleMe = toggleMe;
  window.removeTag = removeTag;
  window.addTag = addTag;
  window.setLevel = setLevel;
});
