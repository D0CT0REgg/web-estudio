import { isDarkActive, toggleTheme } from "../../lib/theme.js";
import { isNavLocked } from "../../lib/navLock.js";

// Respiración de caja (4-4-4-4): inhala, mantén, exhala, mantén.
const BREATH_PHASES = [
  { key: "inhale", label: "Inhala…", seconds: 4 },
  { key: "hold1", label: "Mantén", seconds: 4 },
  { key: "exhale", label: "Exhala…", seconds: 4 },
  { key: "hold2", label: "Mantén", seconds: 4 },
];

const NAV_ITEMS = [
  { key: "inicio", label: "Inicio", icon: "🏠", enabled: true },
  { key: "sesion", label: "Sesión de estudio", icon: "⏱️", enabled: true },
  { key: "descanso", label: "Descanso", icon: "🌿", enabled: true },
  { key: "tareas", label: "Tareas del día", icon: "📝", enabled: true },
  { key: "ambiente", label: "Ambiente", icon: "🎧", enabled: true },
  { key: "contrato", label: "Contrato", icon: "📜", enabled: true },
  { key: "estadisticas", label: "Estadísticas", icon: "📊", enabled: true },
  { key: "simulacro", label: "Simulacro de examen", icon: "🎯", enabled: true },
  { key: "ajustes", label: "Ajustes", icon: "⚙️", enabled: true },
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
          <button type="button" id="emergency-pause-btn" class="emergency-pause-btn">
            🫁 Pausa de emergencia
          </button>
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

      <div class="modal-overlay" id="breathing-modal" hidden>
        <div class="modal-backdrop" id="breathing-modal-backdrop"></div>
        <div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="breathing-title">
          <button type="button" class="modal-close" id="breathing-close" aria-label="Cerrar pausa de emergencia">✕</button>
          <h2 id="breathing-title">Pausa de emergencia</h2>
          <p class="breathing-hint">Sigue el círculo. Respiración en caja (4-4-4-4). Cierra cuando quieras.</p>
          <div class="breathing-circle" id="breathing-circle"></div>
          <p class="breathing-phase" id="breathing-phase">Inhala…</p>
          <p class="breathing-cycle" id="breathing-cycle">Ciclo 1</p>
        </div>
      </div>
    </div>
  `;

  container.querySelectorAll(".sidebar-link").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      if (isNavLocked()) {
        window.alert("Termina o sal del examen en curso antes de navegar a otra sección.");
        return;
      }
      if (link.dataset.enabled === "true" && link.dataset.view !== activeKey) {
        onNavigate(link.dataset.view);
      }
    });
  });

  container.querySelector("#sidebar-logout-btn").addEventListener("click", () => {
    if (isNavLocked()) {
      window.alert("Termina o sal del examen en curso antes de cerrar sesión.");
      return;
    }
    onLogout();
  });

  const themeToggleBtn = container.querySelector("#theme-toggle-btn");
  themeToggleBtn.addEventListener("click", () => {
    toggleTheme();
    themeToggleBtn.textContent = isDarkActive() ? "☀️" : "🌙";
  });

  // ---- Pausa de emergencia: respiración guiada ----
  const breathingEls = {
    modal: container.querySelector("#breathing-modal"),
    backdrop: container.querySelector("#breathing-modal-backdrop"),
    close: container.querySelector("#breathing-close"),
    circle: container.querySelector("#breathing-circle"),
    phase: container.querySelector("#breathing-phase"),
    cycle: container.querySelector("#breathing-cycle"),
  };

  let breathingTimeoutId = null;
  let breathingPhaseIndex = 0;
  let breathingCycleCount = 1;

  function runBreathingPhase() {
    const phase = BREATH_PHASES[breathingPhaseIndex];
    breathingEls.phase.textContent = phase.label;
    breathingEls.cycle.textContent = `Ciclo ${breathingCycleCount}`;
    breathingEls.circle.className = `breathing-circle breathing-${phase.key}`;

    breathingTimeoutId = setTimeout(() => {
      breathingPhaseIndex = (breathingPhaseIndex + 1) % BREATH_PHASES.length;
      if (breathingPhaseIndex === 0) breathingCycleCount += 1;
      runBreathingPhase();
    }, phase.seconds * 1000);
  }

  function openBreathingModal() {
    breathingPhaseIndex = 0;
    breathingCycleCount = 1;
    breathingEls.modal.hidden = false;
    runBreathingPhase();
  }

  function closeBreathingModal() {
    clearTimeout(breathingTimeoutId);
    breathingTimeoutId = null;
    breathingEls.modal.hidden = true;
    breathingEls.circle.className = "breathing-circle";
  }

  container.querySelector("#emergency-pause-btn").addEventListener("click", openBreathingModal);
  breathingEls.close.addEventListener("click", closeBreathingModal);
  breathingEls.backdrop.addEventListener("click", closeBreathingModal);

  return container.querySelector("#app-content");
}
