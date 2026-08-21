import { fetchTodaySessions } from "../../lib/sessionsApi.js";
import { fetchTodayTasks, fetchTodayGoal } from "../../lib/tasksApi.js";
import { sumMinutes, countCompletedPomodoros } from "../../lib/statsCalc.js";
import { skeletonInline } from "../../lib/skeleton.js";

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
          <span class="summary-value" id="minutes-today">${skeletonInline({ width: "2.4rem" })}</span>
          <span class="summary-label">Minutos estudiados hoy</span>
        </div>
        <div class="summary-card">
          <span class="summary-icon" aria-hidden="true">🍅</span>
          <span class="summary-value" id="pomodoros-today">${skeletonInline({ width: "1.6rem" })}</span>
          <span class="summary-label">Pomodoros completados hoy</span>
        </div>
      </div>

      <div class="today-goal">
        <p class="goal-text" id="goal-text">${skeletonInline({ width: "70%" })}</p>
        <div class="tasks-progress">
          <div class="tasks-progress-bar">
            <div class="tasks-progress-fill" id="tasks-progress-fill" style="width: 0%"></div>
          </div>
          <p class="tasks-counter" id="tasks-counter">${skeletonInline({ width: "45%" })}</p>
        </div>
      </div>

      <button type="button" class="btn-hero" id="start-session-btn">
        <span class="btn-hero-icon" aria-hidden="true">⏱️</span>
        Empezar sesión
      </button>
    </section>
  `;

  const els = {
    minutesToday: contentEl.querySelector("#minutes-today"),
    pomodorosToday: contentEl.querySelector("#pomodoros-today"),
    goalText: contentEl.querySelector("#goal-text"),
    progressFill: contentEl.querySelector("#tasks-progress-fill"),
    tasksCounter: contentEl.querySelector("#tasks-counter"),
  };

  contentEl.querySelector("#start-session-btn").addEventListener("click", () => {
    onStartSession?.();
  });

  Promise.all([fetchTodaySessions(), fetchTodayTasks(), fetchTodayGoal()])
    .then(([sessions, tasks, goal]) => {
      els.minutesToday.textContent = sumMinutes(sessions);
      els.pomodorosToday.textContent = countCompletedPomodoros(sessions);

      els.goalText.textContent = goal?.goal_text?.trim() ? goal.goal_text : "Sin objetivo definido para hoy.";

      const doneCount = tasks.filter((t) => t.done).length;
      const total = tasks.length;
      const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
      els.progressFill.style.width = `${pct}%`;
      els.tasksCounter.textContent = total > 0 ? `${doneCount} de ${total} tareas hechas` : "Sin tareas para hoy.";
    })
    .catch((err) => {
      console.error(err);
      els.minutesToday.textContent = "—";
      els.pomodorosToday.textContent = "—";
      els.goalText.textContent = "No se pudieron cargar los datos.";
      els.tasksCounter.textContent = "";
    });
}
