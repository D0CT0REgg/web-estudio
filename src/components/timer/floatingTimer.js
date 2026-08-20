import { subscribe, togglePause } from "../../lib/sessionStore.js";
import { finishSession } from "../../lib/sessionLifecycle.js";

const MODE_LABELS = {
  pomodoro: "Pomodoro",
  "52-17": "52-17",
  flowtime: "Flowtime",
  stopwatch: "Cronómetro",
};

let widgetEl = null;
let els = {};
let minimized = false;
let dragState = null;
let resizeState = null;

function formatTime(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function buildWidget() {
  const el = document.createElement("div");
  el.id = "floating-timer";
  el.className = "floating-timer fx-fade-in";
  el.innerHTML = `
    <div class="ft-header" id="ft-header">
      <span class="ft-mode" id="ft-mode"></span>
      <button type="button" class="ft-icon-btn" id="ft-minimize" aria-label="Minimizar">–</button>
    </div>
    <div class="ft-body" id="ft-body">
      <p class="ft-task" id="ft-task"></p>
      <p class="ft-phase" id="ft-phase"></p>
      <p class="ft-time" id="ft-time">00:00</p>
      <div class="ft-controls">
        <button type="button" class="ft-btn" id="ft-pause">Pausar</button>
        <button type="button" class="ft-btn ft-btn-end" id="ft-end">Terminar</button>
      </div>
    </div>
    <div class="ft-resize-handle" id="ft-resize" aria-hidden="true"></div>
  `;
  document.body.appendChild(el);

  els = {
    root: el,
    header: el.querySelector("#ft-header"),
    mode: el.querySelector("#ft-mode"),
    task: el.querySelector("#ft-task"),
    phase: el.querySelector("#ft-phase"),
    time: el.querySelector("#ft-time"),
    pauseBtn: el.querySelector("#ft-pause"),
    endBtn: el.querySelector("#ft-end"),
    minimizeBtn: el.querySelector("#ft-minimize"),
    resizeHandle: el.querySelector("#ft-resize"),
  };

  el.style.left = `${window.innerWidth - 304}px`;
  el.style.top = `${window.innerHeight - 260}px`;
  el.style.width = "280px";

  setupDrag();
  setupResize();

  els.pauseBtn.addEventListener("click", () => togglePause());
  els.minimizeBtn.addEventListener("click", toggleMinimize);
  els.endBtn.addEventListener("click", finishSession);

  return el;
}

function setupDrag() {
  const header = els.header;
  let activePointerId = null;

  function onPointerMove(event) {
    if (event.pointerId !== activePointerId || !dragState) return;
    const dx = event.clientX - dragState.startX;
    const dy = event.clientY - dragState.startY;
    const newLeft = clamp(dragState.startLeft + dx, 0, window.innerWidth - els.root.offsetWidth);
    const newTop = clamp(dragState.startTop + dy, 0, window.innerHeight - els.root.offsetHeight);
    els.root.style.left = `${newLeft}px`;
    els.root.style.top = `${newTop}px`;
  }

  function stopDrag(event) {
    if (event.pointerId !== activePointerId) return;
    activePointerId = null;
    dragState = null;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", stopDrag);
    window.removeEventListener("pointercancel", stopDrag);
    try {
      header.releasePointerCapture(event.pointerId);
    } catch {
      // no-op: puede que el puntero ya no esté capturado
    }
  }

  header.addEventListener("pointerdown", (event) => {
    if (event.target.closest(".ft-icon-btn")) return;
    event.preventDefault();
    const rect = els.root.getBoundingClientRect();
    dragState = { startX: event.clientX, startY: event.clientY, startLeft: rect.left, startTop: rect.top };
    activePointerId = event.pointerId;
    try {
      header.setPointerCapture(event.pointerId);
    } catch {
      // no-op
    }
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopDrag);
    window.addEventListener("pointercancel", stopDrag);
  });
}

function setupResize() {
  const handle = els.resizeHandle;
  let activePointerId = null;

  function onPointerMove(event) {
    if (event.pointerId !== activePointerId || !resizeState) return;
    const dx = event.clientX - resizeState.startX;
    const dy = event.clientY - resizeState.startY;
    els.root.style.width = `${clamp(resizeState.startWidth + dx, 240, 480)}px`;
    els.root.style.height = `${clamp(resizeState.startHeight + dy, 170, 520)}px`;
  }

  function stopResize(event) {
    if (event.pointerId !== activePointerId) return;
    activePointerId = null;
    resizeState = null;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", stopResize);
    window.removeEventListener("pointercancel", stopResize);
    try {
      handle.releasePointerCapture(event.pointerId);
    } catch {
      // no-op
    }
  }

  handle.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const rect = els.root.getBoundingClientRect();
    resizeState = { startX: event.clientX, startY: event.clientY, startWidth: rect.width, startHeight: rect.height };
    activePointerId = event.pointerId;
    try {
      handle.setPointerCapture(event.pointerId);
    } catch {
      // no-op
    }
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopResize);
    window.addEventListener("pointercancel", stopResize);
  });
}

function toggleMinimize() {
  minimized = !minimized;
  els.root.classList.toggle("minimized", minimized);
  els.minimizeBtn.textContent = minimized ? "▢" : "–";
  els.minimizeBtn.setAttribute("aria-label", minimized ? "Restaurar" : "Minimizar");
}

let suppressed = false;
let lastState = { status: "idle" };

function render(state) {
  lastState = state;
  applyRender();
}

function applyRender() {
  const state = lastState;

  if (state.status === "idle" || suppressed) {
    if (widgetEl) {
      widgetEl.remove();
      widgetEl = null;
      minimized = false;
    }
    return;
  }

  if (!widgetEl) {
    widgetEl = buildWidget();
  }

  els.mode.textContent = MODE_LABELS[state.mode] || state.mode;
  els.task.textContent = state.task?.title || "Sin tarea";

  if (state.status === "paused") {
    els.phase.textContent = "Pausado";
  } else if (state.status === "break") {
    els.phase.textContent = "Descanso";
  } else if (state.mode === "flowtime" || state.mode === "stopwatch") {
    els.phase.textContent = "Estudiando";
  } else {
    els.phase.textContent = "Trabajo";
  }

  const seconds = state.phaseEndAt !== null ? state.phaseRemainingSeconds : state.phaseElapsedSeconds;
  els.time.textContent = formatTime(seconds);
  els.pauseBtn.textContent = state.status === "paused" ? "Reanudar" : "Pausar";
  widgetEl.classList.toggle("ft-break", state.status === "break");
}

/** Debe llamarse una vez al arrancar la app; el widget se muestra solo mientras haya sesión activa. */
export function initFloatingTimer() {
  subscribe(render);
}

/** Oculta el widget flotante mientras la vista de Sesión muestra su propio display maximizado. */
export function setFloatingTimerSuppressed(value) {
  suppressed = value;
  applyRender();
}
