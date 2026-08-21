import "./styles/global.css";
import { supabase } from "./supabaseClient.js";
import { initTheme } from "./lib/theme.js";
import { startTimeTintWatcher } from "./lib/timeTint.js";
import { initParticles } from "./lib/particles.js";
import { initFloatingTimer } from "./components/timer/floatingTimer.js";
import { renderLogin } from "./components/auth/authView.js";
import { renderAppShell } from "./components/layout/appShell.js";
import { renderHomeView } from "./components/home/homeView.js";
import { renderSessionView } from "./components/session/sessionView.js";
import { renderTasksView } from "./components/tasks/tasksView.js";
import { renderDescansoView } from "./components/descanso/descansoView.js";
import { renderSettingsView } from "./components/settings/settingsView.js";
import { renderEstadisticasView } from "./components/estadisticas/estadisticasView.js";
import { renderContratoView } from "./components/contrato/contratoView.js";
import { renderAmbienteView } from "./components/ambiente/ambienteView.js";

initTheme();
startTimeTintWatcher();
initParticles();
initFloatingTimer();

const app = document.querySelector("#app");

const VIEWS = {
  inicio: (contentEl, navigate) => renderHomeView(contentEl, { onStartSession: () => navigate("sesion") }),
  sesion: (contentEl) => renderSessionView(contentEl),
  tareas: (contentEl) => renderTasksView(contentEl),
  descanso: (contentEl) => renderDescansoView(contentEl),
  ajustes: (contentEl) => renderSettingsView(contentEl),
  estadisticas: (contentEl) => renderEstadisticasView(contentEl),
  contrato: (contentEl) => renderContratoView(contentEl),
  ambiente: (contentEl) => renderAmbienteView(contentEl),
  // pdfjs-dist pesa ~700KB: se carga solo al entrar en esta sección, no en el bundle inicial.
  simulacro: (contentEl) => {
    contentEl.innerHTML = `<p class="stats-loading">Cargando…</p>`;
    import("./components/simulacro/simulacroView.js").then(({ renderSimulacroView }) =>
      renderSimulacroView(contentEl)
    );
  },
};

function showLogin() {
  renderLogin(app, { onLoggedIn: (session) => showApp(session) });
}

function showApp(session) {
  let activeKey = "inicio";

  function navigate(key) {
    activeKey = key;
    mountShell();
  }

  function mountShell() {
    const contentEl = renderAppShell(app, {
      activeKey,
      userEmail: session.user.email,
      onLogout: async () => {
        await supabase.auth.signOut();
        showLogin();
      },
      onNavigate: navigate,
    });
    VIEWS[activeKey](contentEl, navigate);
  }

  mountShell();
}

async function start() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    showApp(session);
  } else {
    showLogin();
  }
}

start();
