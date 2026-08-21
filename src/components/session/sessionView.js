import { fetchTodayTasks, createTask, setTaskDone } from "../../lib/tasksApi.js";
import { fetchTodayGoal, saveTodayGoal } from "../../lib/tasksApi.js";
import { fetchUserSettings, DEFAULT_USER_SETTINGS } from "../../lib/settingsApi.js";
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

const MODE_LABELS = {
  pomodoro: "Pomodoro",
  "52-17": "52-17",
  flowtime: "Flowtime",
  stopwatch: "Cronómetro",
};

const WORK_TIPS = [
  "Una tarea a la vez. Vas bien.",
  "Respira hondo y vuelve al foco.",
  "Cada minuto cuenta, sigue así.",
  "Elimina distracciones, tu yo futuro lo agradecerá.",
  "Si te bloqueas, sigue con el punto más pequeño de la tarea.",
];

const BREAK_TIPS = [
  "Estírate un poco y bebe agua.",
  "Regla 20-20-20: mira algo a 6 metros durante 20 segundos.",
  "Levántate, camina un poco y respira profundo.",
  "Aprovecha para ir al baño o rellenar la botella de agua.",
  "Aparta la vista de las pantallas un momento.",
];

const BREAK_ENDING_SOON_SECONDS = 30;

function formatTime(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function isFreeMode(mode) {
  return mode === "flowtime" || mode === "stopwatch";
}

export function renderSessionView(container) {
  const state = {
    mode: "pomodoro",
    workMinutes: DEFAULT_USER_SETTINGS.default_pomodoro_work_min,
    breakMinutes: DEFAULT_USER_SETTINGS.default_pomodoro_break_min,
    modeDefaults: {
      pomodoro: {
        work: DEFAULT_USER_SETTINGS.default_pomodoro_work_min,
        break: DEFAULT_USER_SETTINGS.default_pomodoro_break_min,
      },
      "52-17": {
        work: DEFAULT_USER_SETTINGS.default_5217_work_min,
        break: DEFAULT_USER_SETTINGS.default_5217_break_min,
      },
    },
    tasks: [],
    tasksLoading: true,
    selectedTaskId: null,
    quickAddOpen: false,
    checked: new Set(),
    goalText: "",
    checklistItems: [...DEFAULT_USER_SETTINGS.checklist_items],
  };

  const tipCache = new Map(); // phaseStartAt -> texto de consejo elegido para esa fase

  function pickTip(list, phaseStartAt) {
    if (!tipCache.has(phaseStartAt)) {
      tipCache.set(phaseStartAt, list[Math.floor(Math.random() * list.length)]);
    }
    return tipCache.get(phaseStartAt);
  }

  container.innerHTML = `
    <section class="view-sesion fx-fade-in" aria-labelledby="sesion-title">
      <h1 id="sesion-title">Sesión de estudio</h1>

      <div class="session-active-panel sap-idle" id="session-active-panel">
        <div class="sap-timer-block">
          <p class="sap-mode" id="sap-mode"></p>
          <p class="sap-task" id="sap-task"></p>
          <p class="sap-phase" id="sap-phase"></p>
          <p class="sap-time" id="sap-time">25:00</p>
          <p class="sap-tip" id="sap-tip"></p>
          <div class="sap-controls">
            <button type="button" class="ft-btn" id="sap-pause" disabled>Pausar</button>
            <button type="button" class="ft-btn" id="sap-skip" disabled>Saltar fase ⏭️</button>
            <button type="button" class="ft-btn ft-btn-end" id="sap-end" disabled>Terminar</button>
          </div>
        </div>
      </div>

      <div class="setup-block">
        <h2>Objetivo general del día</h2>
        <textarea
          id="session-goal-input"
          class="goal-input"
          rows="2"
          placeholder="¿Cuál es tu objetivo principal hoy? (obligatorio para empezar)"
        ></textarea>
        <p class="goal-save-status" id="session-goal-status"></p>

        <h2 class="sap-tasks-heading">Tareas</h2>
        <p class="sap-tasks-hint" id="sap-tasks-hint">Pulsa una tarea para seleccionarla.</p>
        <div class="task-full-list" id="session-task-list"></div>
        <button type="button" class="task-add-toggle" id="task-add-toggle">+ Nueva tarea rápida</button>
        <div class="task-quick-add" id="task-quick-add" hidden></div>
      </div>

      <div class="session-setup" id="session-setup">
        <div class="setup-block">
          <h2>Modo</h2>
          <div class="mode-grid" id="mode-grid"></div>
          <div class="mode-config" id="mode-config"></div>
        </div>

        <div class="setup-block">
          <h2>Antes de empezar</h2>
          <ul class="checklist" id="checklist"></ul>
        </div>

        <button type="button" class="btn-hero" id="start-session-btn" disabled>
          <span class="btn-hero-icon" aria-hidden="true">▶️</span>
          Empezar sesión
        </button>
        <p class="start-session-hint" id="start-session-hint"></p>
      </div>
    </section>
  `;

  const els = {
    panel: container.querySelector("#session-active-panel"),
    panelMode: container.querySelector("#sap-mode"),
    panelTask: container.querySelector("#sap-task"),
    panelPhase: container.querySelector("#sap-phase"),
    panelTime: container.querySelector("#sap-time"),
    panelTip: container.querySelector("#sap-tip"),
    panelPauseBtn: container.querySelector("#sap-pause"),
    panelSkipBtn: container.querySelector("#sap-skip"),
    panelEndBtn: container.querySelector("#sap-end"),
    goalInput: container.querySelector("#session-goal-input"),
    goalStatus: container.querySelector("#session-goal-status"),
    taskList: container.querySelector("#session-task-list"),
    tasksHint: container.querySelector("#sap-tasks-hint"),
    setup: container.querySelector("#session-setup"),
    modeGrid: container.querySelector("#mode-grid"),
    modeConfig: container.querySelector("#mode-config"),
    taskAddToggle: container.querySelector("#task-add-toggle"),
    quickAdd: container.querySelector("#task-quick-add"),
    checklist: container.querySelector("#checklist"),
    startBtn: container.querySelector("#start-session-btn"),
    startHint: container.querySelector("#start-session-hint"),
  };

  function updateStartButtonState() {
    const missingTask = !state.selectedTaskId;
    const missingGoal = !state.goalText.trim();
    els.startBtn.disabled = missingTask || missingGoal;

    if (missingTask && missingGoal) {
      els.startHint.textContent = "Falta: elige una tarea y escribe el objetivo del día.";
    } else if (missingTask) {
      els.startHint.textContent = "Falta: elige una tarea de la lista de arriba.";
    } else if (missingGoal) {
      els.startHint.textContent = "Falta: escribe el objetivo del día, arriba del todo.";
    } else {
      els.startHint.textContent = "";
    }
  }

  // ---- Objetivo del día ----
  let goalSaveTimeout = null;
  els.goalInput.addEventListener("input", () => {
    state.goalText = els.goalInput.value;
    updateStartButtonState();
    els.goalStatus.textContent = "Guardando…";
    clearTimeout(goalSaveTimeout);
    goalSaveTimeout = setTimeout(async () => {
      try {
        await saveTodayGoal(state.goalText);
        els.goalStatus.textContent = "Guardado";
        setTimeout(() => {
          if (els.goalStatus.textContent === "Guardado") els.goalStatus.textContent = "";
        }, 1500);
      } catch (err) {
        els.goalStatus.textContent = "No se pudo guardar";
        console.error(err);
      }
    }, 800);
  });

  fetchTodayGoal()
    .then((goal) => {
      state.goalText = goal?.goal_text || "";
      els.goalInput.value = state.goalText;
      updateStartButtonState();
    })
    .catch((err) => console.error(err));

  // ---- Modo ----
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
        if (state.mode === "pomodoro" || state.mode === "52-17") {
          state.workMinutes = state.modeDefaults[state.mode].work;
          state.breakMinutes = state.modeDefaults[state.mode].break;
        }
        renderModeGrid();
        renderModeConfig();
        refreshIdleTimerDisplay();
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
      refreshIdleTimerDisplay();
    });
    els.modeConfig.querySelector("#break-minutes-input").addEventListener("input", (e) => {
      const v = parseInt(e.target.value, 10);
      if (Number.isFinite(v) && v > 0) state.breakMinutes = v;
    });
  }

  // ---- Tareas (lista única: seleccionar antes de empezar / cambiar activa en marcha) ----
  function renderTaskList() {
    if (state.tasksLoading) {
      els.taskList.innerHTML = `<p class="task-list-empty">Cargando tareas de hoy…</p>`;
      return;
    }
    if (state.tasks.length === 0) {
      els.taskList.innerHTML = `<p class="task-list-empty">Todavía no tienes tareas para hoy. Crea una abajo.</p>`;
      return;
    }

    const sessionState = getSessionState();
    const active = sessionState.status !== "idle";
    const highlightedId = active ? sessionState.task?.id : state.selectedTaskId;
    els.tasksHint.textContent = active
      ? "Pulsa una tarea para hacerla la activa (el cronómetro sigue corriendo)."
      : "Pulsa una tarea para seleccionarla.";

    els.taskList.innerHTML = state.tasks
      .map(
        (t) => `
          <div class="task-full-row clickable ${highlightedId === t.id ? "active" : ""}" data-task-id="${t.id}">
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

      row.addEventListener("click", async () => {
        if (getSessionState().status !== "idle") {
          await switchSessionTask(task);
          renderTaskList();
        } else {
          state.selectedTaskId = taskId;
          renderTaskList();
          updateStartButtonState();
        }
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
        if (getSessionState().status === "idle") state.selectedTaskId = newTask.id;
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
    els.checklist.innerHTML = state.checklistItems
      .map(
        (item, i) => `
        <li>
          <label class="checklist-item">
            <input type="checkbox" data-index="${i}" ${state.checked.has(i) ? "checked" : ""} />
            ${escapeHtml(item)}
          </label>
        </li>
      `
      )
      .join("");

    els.checklist.querySelectorAll("input[type=checkbox]").forEach((cb) => {
      cb.addEventListener("change", (e) => {
        const idx = Number(e.target.dataset.index);
        if (e.target.checked) state.checked.add(idx);
        else state.checked.delete(idx);
      });
    });
  }

  // ---- Bloque de reloj: siempre visible, en reposo (25:00, controles deshabilitados) o en marcha ----
  function renderTimerBlock(sessionState) {
    if (!els.panel.isConnected) {
      unsubscribe();
      setFloatingTimerSuppressed(false);
      return;
    }

    const active = sessionState.status !== "idle";
    setFloatingTimerSuppressed(active);
    els.setup.hidden = active;

    els.panel.classList.remove("sap-work", "sap-break", "sap-break-ending", "sap-paused", "sap-idle");

    if (!active) {
      const selectedTask = state.tasks.find((t) => t.id === state.selectedTaskId);
      els.panelMode.textContent = MODE_LABELS[state.mode] || state.mode;
      els.panelTask.textContent = selectedTask ? selectedTask.title : "Elige una tarea abajo";
      els.panelPhase.textContent = "Sin sesión activa";
      const idleSeconds = isFreeMode(state.mode) ? 0 : state.workMinutes * 60;
      els.panelTime.textContent = formatTime(idleSeconds);
      els.panelTip.textContent = "";
      els.panelPauseBtn.textContent = "Pausar";
      els.panelPauseBtn.disabled = true;
      els.panelSkipBtn.hidden = isFreeMode(state.mode);
      els.panelSkipBtn.disabled = true;
      els.panelEndBtn.disabled = true;
      els.panel.classList.add("sap-idle");
      return;
    }

    els.panelMode.textContent = MODE_LABELS[sessionState.mode] || sessionState.mode;
    els.panelTask.textContent = sessionState.task?.title || "Sin tarea";

    const freeMode = isFreeMode(sessionState.mode);
    const seconds =
      sessionState.phaseEndAt !== null ? sessionState.phaseRemainingSeconds : sessionState.phaseElapsedSeconds;

    let colorState = "work";
    if (sessionState.status === "paused") {
      els.panelPhase.textContent = "Pausado";
      els.panelTip.textContent = "";
      colorState = "paused";
    } else if (sessionState.status === "break") {
      const endingSoon = (seconds ?? 0) <= BREAK_ENDING_SOON_SECONDS;
      els.panelPhase.textContent = endingSoon ? "Descanso — vuelve la concentración enseguida" : "Descanso";
      els.panelTip.textContent = pickTip(BREAK_TIPS, sessionState.phaseStartAt);
      colorState = endingSoon ? "break-ending" : "break";
    } else {
      els.panelPhase.textContent = freeMode ? "Estudiando" : "Trabajo";
      els.panelTip.textContent = pickTip(WORK_TIPS, sessionState.phaseStartAt);
      colorState = "work";
    }

    els.panelTime.textContent = formatTime(seconds);
    els.panelPauseBtn.textContent = sessionState.status === "paused" ? "Reanudar" : "Pausar";
    els.panelPauseBtn.disabled = false;
    els.panelSkipBtn.hidden = freeMode;
    els.panelSkipBtn.disabled = sessionState.status === "paused";
    els.panelEndBtn.disabled = false;

    els.panel.classList.add(`sap-${colorState}`);
  }

  function refreshIdleTimerDisplay() {
    if (getSessionState().status === "idle") renderTimerBlock(getSessionState());
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
    renderTaskList();
  });

  renderModeGrid();
  renderModeConfig();
  renderTaskList();
  renderQuickAdd();
  renderChecklist();
  updateStartButtonState();

  const unsubscribe = subscribeSession(renderTimerBlock);

  fetchTodayTasks()
    .then((tasks) => {
      state.tasks = tasks;
      state.tasksLoading = false;
      renderTaskList();
    })
    .catch((err) => {
      console.error(err);
      state.tasksLoading = false;
      els.taskList.innerHTML = `<p class="task-list-empty">No se pudieron cargar las tareas.</p>`;
    });

  fetchUserSettings()
    .then((settings) => {
      state.modeDefaults = {
        pomodoro: { work: settings.default_pomodoro_work_min, break: settings.default_pomodoro_break_min },
        "52-17": { work: settings.default_5217_work_min, break: settings.default_5217_break_min },
      };
      state.checklistItems = [...settings.checklist_items];
      if (state.mode === "pomodoro" || state.mode === "52-17") {
        state.workMinutes = state.modeDefaults[state.mode].work;
        state.breakMinutes = state.modeDefaults[state.mode].break;
      }
      renderModeConfig();
      renderChecklist();
      refreshIdleTimerDisplay();
    })
    .catch((err) => console.error(err));
}
