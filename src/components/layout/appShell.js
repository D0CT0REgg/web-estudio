import { isDarkActive, toggleTheme } from "../../lib/theme.js";

const NAV_ITEMS = [
  { key: "inicio", label: "Inicio", icon: "🏠", enabled: true },
  { key: "sesion", label: "Sesión de estudio", icon: "⏱️", enabled: true },
  { key: "descanso", label: "Descanso", icon: "🌿", enabled: false },
  { key: "tareas", label: "Tareas del día", icon: "📝", enabled: true },
  { key: "ambiente", label: "Ambiente", icon: "🎧", enabled: false },
  { key: "contrato", label: "Contrato", icon: "📜", enabled: false },
  { key: "estadisticas", label: "Estadísticas", icon: "📊", enabled: false },
  { key: "simulacro", label: "Simulacro de examen", icon: "🎯", enabled: false },
  { key: "ajustes", label: "Ajustes", icon: "⚙️", enabled: false },
];

function renderNavItem(item, activeKey) {
  const classes = ["sidebar-link"];
  if (item.key === activeKey) classes.push("active");
  if (!item.enabled) classes.push("disabled");

  const disabledAttrs = item.enabled ? "" : 'aria-disabled="true" tabindex="-1"';
  const soonBadge = item.enabled ? "" : '<span class="sidebar-soon">próximamente</span>';

  return `
    <li>
      <a href="#" class="${classes.join(" ")}" data-view="${item.key}" data-enabled="${item.enabled}" ${disabledAttrs}>
        <span class="sidebar-icon">${item.icon}</span>
        <span class="sidebar-label">${item.label}</span>
        ${soonBadge}
      </a>
    </li>
  `;
}

/**
 * Renderiza el armazón de la app (sidebar + área de contenido) dentro de `container`.
 * Devuelve el elemento donde debe montarse la vista activa.
 */
export function renderAppShell(container, { activeKey, userEmail, onLogout, onNavigate }) {
  container.innerHTML = `
    <div class="app-shell fx-fade-in">
      <nav class="sidebar" aria-label="Navegación principal">
        <div class="sidebar-brand">Web estudio</div>
        <ul class="sidebar-nav">
          ${NAV_ITEMS.map((item) => renderNavItem(item, activeKey)).join("")}
        </ul>
        <div class="sidebar-footer">
          <span class="sidebar-user">${userEmail}</span>
          <div class="sidebar-footer-row">
            <button type="button" id="sidebar-logout-btn" class="sidebar-logout">Cerrar sesión</button>
            <button type="button" id="theme-toggle-btn" class="theme-toggle-btn" aria-label="Cambiar tema claro/oscuro">
              ${isDarkActive() ? "☀️" : "🌙"}
            </button>
          </div>
        </div>
      </nav>
      <main class="app-content" id="app-content"></main>
    </div>
  `;

  container.querySelectorAll(".sidebar-link").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      if (link.dataset.enabled === "true" && link.dataset.view !== activeKey) {
        onNavigate(link.dataset.view);
      }
    });
  });

  container.querySelector("#sidebar-logout-btn").addEventListener("click", () => {
    onLogout();
  });

  const themeToggleBtn = container.querySelector("#theme-toggle-btn");
  themeToggleBtn.addEventListener("click", () => {
    toggleTheme();
    themeToggleBtn.textContent = isDarkActive() ? "☀️" : "🌙";
  });

  return container.querySelector("#app-content");
}
