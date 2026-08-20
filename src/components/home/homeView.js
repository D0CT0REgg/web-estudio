function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 20) return "Buenas tardes";
  return "Buenas noches";
}

function getTodayLabel() {
  const formatted = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

/**
 * Vista Inicio. El resumen del día (minutos, pomodoros, objetivo, tareas) sigue con
 * datos de marcador (--); la conexión con Supabase para calcular esos valores reales
 * llega en un paso posterior.
 */
export function renderHomeView(contentEl, { onStartSession } = {}) {
  contentEl.innerHTML = `
    <section class="view-inicio fx-fade-in" aria-labelledby="inicio-title">
      <header class="inicio-header">
        <p class="inicio-date">${getTodayLabel()}</p>
        <h1 id="inicio-title">${getGreeting()} 👋</h1>
      </header>

      <div class="summary-cards">
        <div class="summary-card">
          <span class="summary-icon" aria-hidden="true">⏱️</span>
          <span class="summary-value" id="minutes-today">--</span>
          <span class="summary-label">Minutos estudiados hoy</span>
        </div>
        <div class="summary-card">
          <span class="summary-icon" aria-hidden="true">🍅</span>
          <span class="summary-value" id="pomodoros-today">--</span>
          <span class="summary-label">Pomodoros completados hoy</span>
        </div>
      </div>

      <div class="today-goal">
        <p class="goal-text" id="goal-text">Sin objetivo definido para hoy.</p>
        <div class="tasks-progress">
          <div class="tasks-progress-bar">
            <div class="tasks-progress-fill" id="tasks-progress-fill" style="width: 0%"></div>
          </div>
          <p class="tasks-counter" id="tasks-counter">-- de -- tareas hechas</p>
        </div>
      </div>

      <button type="button" class="btn-hero" id="start-session-btn">
        <span class="btn-hero-icon" aria-hidden="true">⏱️</span>
        Empezar sesión
      </button>
    </section>
  `;

  contentEl.querySelector("#start-session-btn").addEventListener("click", () => {
    onStartSession?.();
  });
}
