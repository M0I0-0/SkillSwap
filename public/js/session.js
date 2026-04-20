const SESSION_EMAIL_KEY = "skillswapCurrentUserEmail";

function getCurrentUserEmail() {
  return localStorage.getItem(SESSION_EMAIL_KEY);
}

function setCurrentUserEmail(email) {
  if (!email) {
    return;
  }

  localStorage.setItem(SESSION_EMAIL_KEY, String(email).trim().toLowerCase());
}

function clearCurrentUserEmail() {
  localStorage.removeItem(SESSION_EMAIL_KEY);
}

function getInitials(name) {
  return String(name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "SS";
}

async function fetchCurrentUserProfile() {
  const email = getCurrentUserEmail();

  if (!email) {
    return null;
  }

  const response = await fetch(`/api/users/me?email=${encodeURIComponent(email)}`);

  if (response.status === 404) {
    clearCurrentUserEmail();
    return null;
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "No se pudo cargar la sesión actual.");
  }

  const data = await response.json();
  return data.user;
}

function redirectToLogin() {
  window.location.href = "/";
}
