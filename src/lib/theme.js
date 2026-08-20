const STORAGE_KEY = "web-estudio-theme"; // valores guardados: "light" | "dark". Ausente = seguir al sistema.

function getStoredTheme() {
  return localStorage.getItem(STORAGE_KEY);
}

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === "light" || theme === "dark") {
    root.setAttribute("data-theme", theme);
  } else {
    root.removeAttribute("data-theme");
  }
}

/** Debe llamarse una vez al arrancar la app, antes de renderizar, para evitar parpadeos de tema. */
export function initTheme() {
  applyTheme(getStoredTheme());
}

export function isDarkActive() {
  const stored = getStoredTheme();
  if (stored === "dark") return true;
  if (stored === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function toggleTheme() {
  const nextTheme = isDarkActive() ? "light" : "dark";
  localStorage.setItem(STORAGE_KEY, nextTheme);
  applyTheme(nextTheme);
  return nextTheme;
}
