import { fetchTodayTasks, createTask, setTaskDone } from "../../lib/tasksApi.js";
import { renderTaskFormFields } from "../tasks/taskFormFields.js";
import {
  startSession,
  togglePause,
  skipPhase,
  subscribe as subscribeSession,
  getState as getSessionState,
} from "../../lib/sessionStore.js";
import { finishSession, switchSessionTask } from "../../lib/sessionLifecycle.js";
import { escapeHtml } from "../../lib/escapeHtml.js";
import { setFloatingTimerSuppressed } from "../timer/floatingTimer.js";

const MODES = [
  { key: "pomodoro", label: "Pomodoro", icon: "🍅", desc: "25/5 min (personalizable)" },
  { key: "52-17", label: "52-17", icon: "⏳", desc: "52/17 min (personalizable)" },
  { key: "flowtime", label: "Flowtime", icon: "🌊", desc: "Cronómetro libre, decides cuándo parar" },
  { key: "stopwatch", label: "Cronómetro", icon: "⏱️", desc: "Cronómetro simple de estudio libre" },
];

const CHECKLIST_ITEMS = [
  "Agua a mano",
  "Móvil en silencio (o en otra habitación)",
  "He ido al baño",
  "Tengo el material que necesito a mano",
  "Modo no molestar activado en Discord",
  "Estado de Discord puesto en \"Estudiando...\"",
];

const MODE_LABELS = {
  pomodoro: "Pomodoro",
  "52-17": "52-17",
  flowtime: "Flowtime",
  stopwatch: "Cronómetro",
};

const BREAK_ENDING_SOON_SECONDS = 30;

function formatTime(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function renderSessionView(container) {
  const state = {
    mode: "pomodoro",
    workMinutes: 25,
    breakMinutes: 5,
    tasks: [],
    tasksLoading: true,
    selectedTaskId: null,
    quickAddOpen: false,
    checked: new Set(),
  };

  container.innerHTML = `
    <section class="view-sesion fx-fade-in" aria-labelledby="sesion-title">
      <h1 id="sesion-title">Sesión de estudio</h1>

      <div class="session-active-panel" id="session-active-panel" hidden>
        <div class="sap-timer-block">
          <p class="sap-mode" id="sap-mode"></p>
          <p class="sap-task" id="sap-task"></p>
          <p class="sap-phase" id="sap-phase"></p>
          <p class="sap-time" id="sap-time">00:00</p>
          <div class="sap-controls">
            <button type="button" class="ft-btn" id="sap-pause">Pausar</button>
            <button type="button" class="ft-btn" id="sap-skip">Saltar fase ⏭️</button>
            <button type="button" class="ft-btn ft-btn-end" id="sap-end">Terminar</button>
          </div>
        </div>

        <div class="sap-tasks-block">
          <h2>Tareas de hoy</h2>
          <p class="sap-tasks-hint">Pulsa una tarea para hacerla la activa (el cronómetro sigue corriendo).</p>
          <div class="task-full-list" id="sap-task-list"></div>
        </div>
      </div>

      <div class="session-setup" id="session-setup">
        <div class="setup-block">
          <h2>Modo</h2>
          <div class="mode-grid" id="mode-grid"></div>
          <div class="mode-config" id="mode-config"></div>
        </div>

        <div class="setup-block">
          <h2>Tarea</h2>
          <div class="task-list" id="task-list"></div>
          <button type="button" class="task-add-toggle" id="task-add-toggle">+ Nueva tarea rápida</button>
          <div class="task-quick-add" id="task-quick-add" hidden></div>
        </div>

        <div class="setup-block">
          <h2>Antes de empezar</h2>
          <ul class="checklist" id="checklist"></ul>
        </div>

        <button type="button" class="btn-hero" id="start-session-btn" disabled>
          <span class="btn-hero-icon" aria-hidden="true">▶️</span>
          Empezar sesión
        </button>
      </div>
    </section>
  `;

  const els = {
    panel: container.querySelector("#session-active-panel"),
    panelMode: container.querySelector("#sap-mode"),
    panelTask: container.querySelector("#sap-task"),
    panelPhase: container.querySelector("#sap-phase"),
    panelTime: container.querySelector("#sap-time"),
    panelPauseBtn: container.querySelector("#sap-pause"),
    panelSkipBtn: container.querySelector("#sap-skip"),
    panelEndBtn: container.querySelector("#sap-end"),
    panelTaskList: container.querySelector("#sap-task-list"),
    setup: container.querySelector("#session-setup"),
    modeGrid: container.querySelector("#mode-grid"),
    modeConfig: container.querySelector("#mode-config"),
    taskList: container.querySelector("#task-list"),
    taskAddToggle: container.querySelector("#task-add-toggle"),
    quickAdd: container.querySelector("#task-quick-add"),
    checklist: container.querySelector("#checklist"),
    startBtn: container.querySelector("#start-session-btn"),
  };

  function updateStartButtonState() {
    els.startBtn.disabled = !state.selectedTaskId;
  }

  function renderModeGrid() {
    els.modeGrid.innerHTML = MODES.map(
      (m) => `
        <button type="button" class="mode-card ${state.mode === m.key ? "active" : ""}" data-mode="${m.key}">
          <span class="mode-icon" aria-hidden="true">${m.icon}</span>
          <span class="mode-label">${m.label}</span>
          <span class="mode-desc">${m.desc}</span>
        </button>
      `
    ).join("");

    els.modeGrid.querySelectorAll(".mode-card").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.mode = btn.dataset.mode;
        if (state.mode === "pomodoro") {
          state.workMinutes = 25;
          state.breakMinutes = 5;
        } else if (state.mode === "52-17") {
          state.workMinutes = 52;
          state.breakMinutes = 17;
        }
        renderModeGrid();
        renderModeConfig();
      });
    });
  }

  function renderModeConfig() {
    const isCountdown = state.mode === "pomodoro" || state.mode === "52-17";
    if (!isCountdown) {
      const desc =
        state.mode === "flowtime"
          ? "Cronómetro libre: decides tú cuándo parar, sin bloques de descanso automáticos."
          : "Cronómetro simple: cuenta el tiempo estudiado, sin bloques de descanso automáticos.";
      els.modeConfig.innerHTML = `<p class="mode-config-note">${desc}</p>`;
      return;
    }

    els.modeConfig.innerHTML = `
      <div class="mode-config-row">
        <label>
          Trabajo (min)
          <input type="number" min="1" max="180" id="work-minutes-input" value="${state.workMinutes}" />
        </label>
        <label>
          Descanso (min)
          <input type="number" min="1" max="60" id="break-minutes-input" value="${state.breakMinutes}" />
        </label>
      </div>
    `;

    els.modeConfig.querySelector("#work-minutes-input").addEventListener("input", (e) => {
      const v = parseInt(e.target.value, 10);
      if (Number.isFinite(v) && v > 0) state.workMinutes = v;
    });
    els.modeConfig.querySelector("#break-minutes-input").addEventListener("input", (e) => {
      const v = parseInt(e.target.value, 10);
      if (Number.isFinite(v) && v > 0) state.breakMinutes = v;
    });
  }

  function renderTaskList() {
    if (state.tasksLoading) {
      els.taskList.innerHTML = `<p class="task-list-empty">Cargando tareas de hoy…</p>`;
      return;
    }
    if (state.tasks.length === 0) {
      els.taskList.innerHTML = `<p class="task-list-empty">Todavía no tienes tareas para hoy. Crea una abajo.</p>`;
      return;
    }
    els.taskList.innerHTML = state.tasks
      .map(
        (t) => `
          <div class="task-full-row clickable ${state.selectedTaskId === t.id ? "active" : ""}" data-task-id="${t.id}">
            <input type="checkbox" class="task-done-checkbox" ${t.done ? "checked" : ""} aria-label="Marcar tarea hecha" />
            <div class="task-full-info">
              <span class="task-row-title ${t.done ? "task-row-title-done" : ""}">${escapeHtml(t.title)}</span>
              <span class="task-row-tags">
                <span class="tag-pill">${escapeHtml(t.subject_tag)}</span>
                <span class="tag-pill tag-pill-muted">${escapeHtml(t.task_type_tag)}</span>
              </span>
            </div>
          </div>
        `
      )
      .join("");

    els.taskList.querySelectorAll(".task-full-row").forEach((row) => {
      const taskId = row.dataset.taskId;
      const task = state.tasks.find((t) => t.id === taskId);
      const checkbox = row.querySelector(".task-done-checkbox");

      checkbox.addEventListener("click", (e) => e.stopPropagation());
      checkbox.addEventListener("change", async (e) => {
        const done = e.target.checked;
        try {
          await setTaskDone(taskId, done);
          task.done = done;
          renderTaskList();
        } catch (err) {
          e.target.checked = !done;
          console.error(err);
        }
      });

      row.addEventListener("click", () => {
        state.selectedTaskId = taskId;
        renderTaskList();
        updateStartButtonState();
      });
    });
  }

  function renderQuickAdd() {
    if (!state.quickAddOpen) {
      els.quickAdd.hidden = true;
      els.quickAdd.innerHTML = "";
      return;
    }

    els.quickAdd.hidden = false;
    els.quickAdd.innerHTML = `
      <input type="text" id="quick-task-title" placeholder="¿Qué vas a hacer?" />
      <div id="quick-task-fields"></div>
      <textarea id="quick-task-notes" class="task-notes-input" rows="2" placeholder="Nota o detalles (opcional)"></textarea>
      <p class="quick-add-error" id="quick-add-error" hidden></p>
      <div class="quick-add-actions">
        <button type="button" class="ft-btn" id="quick-add-cancel">Cancelar</button>
        <button type="button" class="btn-primary" id="quick-add-submit">Crear y seleccionar</button>
      </div>
    `;

    const fields = renderTaskFormFields(els.quickAdd.querySelector("#quick-task-fields"));

    els.quickAdd.querySelector("#quick-add-cancel").addEventListener("click", () => {
      state.quickAddOpen = false;
      renderQuickAdd();
    });

    els.quickAdd.querySelector("#quick-add-submit").addEventListener("click", async () => {
      const title = els.quickAdd.querySelector("#quick-task-title").value.trim();
      const notes = els.quickAdd.querySelector("#quick-task-notes").value.trim();
      const { subjectTag, taskTypeTag, priorityTag } = fields.getValues();
      const errorEl = els.quickAdd.querySelector("#quick-add-error");
      errorEl.hidden = true;

      if (!title || !subjectTag || !taskTypeTag || !priorityTag) {
        errorEl.textContent = "Escribe un título y elige asignatura, tipo y prioridad.";
        errorEl.hidden = false;
        return;
      }

      try {
        const newTask = await createTask({
          title,
          subjectTag,
          taskTypeTag,
          priorityTag,
          notes,
          position: state.tasks.length,
        });
        state.tasks = [...state.tasks, newTask];
        state.selectedTaskId = newTask.id;
        state.quickAddOpen = false;
        renderTaskList();
        renderQuickAdd();
        updateStartButtonState();
      } catch (err) {
        errorEl.textContent = "No se pudo crear la tarea. Inténtalo de nuevo.";
        errorEl.hidden = false;
        console.error(err);
      }
    });
  }

  function renderChecklist() {
    els.checklist.innerHTML = CHECKLIST_ITEMS.map(
      (item, i) => `
        <li>
          <label class="checklist-item">
            <input type="checkbox" data-index="${i}" ${state.checked.has(i) ? "checked" : ""} />
            ${item}
          </label>
        </li>
      `
    ).join("");

    els.checklist.querySelectorAll("input[type=checkbox]").forEach((cb) => {
      cb.addEventListener("change", (e) => {
        const idx = Number(e.target.dataset.index);
        if (e.target.checked) state.checked.add(idx);
        else state.checked.delete(idx);
      });
    });
  }

  function renderPanel(sessionState) {
    els.panelMode.textContent = MODE_LABELS[sessionState.mode] || sessionState.mode;
    els.panelTask.textContent = sessionState.task?.title || "Sin tarea";

    const isFreeMode = sessionState.mode === "flowtime" || sessionState.mode === "stopwatch";
    const seconds =
      sessionState.phaseEndAt !== null ? sessionState.phaseRemainingSeconds : sessionState.phaseElapsedSeconds;

    let colorState = "work";
    if (sessionState.status === "paused") {
      els.panelPhase.textContent = "Pausado";
      colorState = "paused";
    } else if (sessionState.status === "break") {
      const endingSoon = (seconds ?? 0) <= BREAK_ENDING_SOON_SECONDS;
      els.panelPhase.textContent = endingSoon ? "Descanso — vuelve la concentración enseguida" : "Descanso";
      colorState = endingSoon ? "break-ending" : "break";
    } else {
      els.panelPhase.textContent = isFreeMode ? "Estudiando" : "Trabajo";
      colorState = "work";
    }

    els.panelTime.textContent = formatTime(seconds);
    els.panelPauseBtn.textContent = sessionState.status === "paused" ? "Reanudar" : "Pausar";
    els.panelSkipBtn.hidden = isFreeMode;
    els.panelSkipBtn.disabled = sessionState.status === "paused";

    els.panel.classList.remove("sap-work", "sap-break", "sap-break-ending", "sap-paused");
    els.panel.classList.add(`sap-${colorState}`);
  }

  function renderPanelTaskList() {
    if (state.tasks.length === 0) {
      els.panelTaskList.innerHTML = `<p class="task-list-empty">No tienes tareas para hoy.</p>`;
      return;
    }

    const activeTaskId = getSessionState().task?.id;

    els.panelTaskList.innerHTML = state.tasks
      .map(
        (t) => `
          <div class="task-full-row clickable ${t.id === activeTaskId ? "active" : ""}" data-task-id="${t.id}">
            <input type="checkbox" class="task-done-checkbox" ${t.done ? "checked" : ""} aria-label="Marcar tarea hecha" />
            <div class="task-full-info">
              <span class="task-row-title ${t.done ? "task-row-title-done" : ""}">${escapeHtml(t.title)}</span>
              <span class="task-row-tags">
                <span class="tag-pill">${escapeHtml(t.subject_tag)}</span>
                <span class="tag-pill tag-pill-muted">${escapeHtml(t.task_type_tag)}</span>
              </span>
            </div>
          </div>
        `
      )
      .join("");

    els.panelTaskList.querySelectorAll(".task-full-row").forEach((row) => {
      const taskId = row.dataset.taskId;
      const task = state.tasks.find((t) => t.id === taskId);
      const checkbox = row.querySelector(".task-done-checkbox");

      checkbox.addEventListener("click", (e) => e.stopPropagation());
      checkbox.addEventListener("change", async (e) => {
        const done = e.target.checked;
        try {
          await setTaskDone(taskId, done);
          task.done = done;
          renderPanelTaskList();
        } catch (err) {
          e.target.checked = !done;
          console.error(err);
        }
      });

      row.addEventListener("click", async () => {
        await switchSessionTask(task);
        renderPanelTaskList();
      });
    });
  }

  function renderActiveState(sessionState) {
    if (!els.panel.isConnected) {
      unsubscribe();
      setFloatingTimerSuppressed(false);
      return;
    }

    const active = sessionState.status !== "idle";
    const wasActive = !els.panel.hidden;
    els.panel.hidden = !active;
    els.setup.hidden = active;
    setFloatingTimerSuppressed(active);

    if (active) {
      renderPanel(sessionState);
      if (!wasActive) renderPanelTaskList();
    }
  }

  els.panelPauseBtn.addEventListener("click", () => togglePause());
  els.panelSkipBtn.addEventListener("click", () => skipPhase());
  els.panelEndBtn.addEventListener("click", () => finishSession());

  els.taskAddToggle.addEventListener("click", () => {
    state.quickAddOpen = !state.quickAddOpen;
    renderQuickAdd();
  });

  els.startBtn.addEventListener("click", () => {
    const task = state.tasks.find((t) => t.id === state.selectedTaskId);
    if (!task) return;
    startSession({
      mode: state.mode,
      task,
      workMinutes: state.workMinutes,
      breakMinutes: state.breakMinutes,
    });
    renderActiveState(getSessionState());
  });

  renderModeGrid();
  renderModeConfig();
  renderTaskList();
  renderQuickAdd();
  renderChecklist();
  updateStartButtonState();

  const unsubscribe = subscribeSession(renderActiveState);

  fetchTodayTasks()
    .then((tasks) => {
      state.tasks = tasks;
      state.tasksLoading = false;
      renderTaskList();
      if (getSessionState().status !== "idle") renderPanelTaskList();
    })
    .catch((err) => {
      console.error(err);
      state.tasksLoading = false;
      els.taskList.innerHTML = `<p class="task-list-empty">No se pudieron cargar las tareas.</p>`;
    });
}
