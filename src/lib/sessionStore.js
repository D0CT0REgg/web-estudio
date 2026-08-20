// Motor del temporizador de estudio: mantiene el estado de la sesión activa
// (si la hay) y notifica a quien esté suscrito (vista de Sesión, timer flotante).
// No sabe nada de DOM ni de Supabase — eso lo hacen los componentes que lo usan.

const MODE_DEFAULTS = {
  pomodoro: { work: 25, break: 5 },
  "52-17": { work: 52, break: 17 },
};

const listeners = new Set();
let state = { status: "idle" };
let intervalId = null;

function notify() {
  listeners.forEach((fn) => fn(state));
}

export function subscribe(fn) {
  listeners.add(fn);
  fn(state);
  return () => listeners.delete(fn);
}

export function getState() {
  return state;
}

function tick() {
  if (state.status !== "running" && state.status !== "break") return;
  const now = Date.now();

  if (state.status === "running") {
    state.workAccumulatedMs += now - state.lastTickAt;
  }
  state.lastTickAt = now;

  if (state.phaseEndAt !== null) {
    const remainingMs = state.phaseEndAt - now;
    if (remainingMs <= 0) {
      advancePhase(now);
      return;
    }
    state.phaseRemainingSeconds = Math.ceil(remainingMs / 1000);
  } else {
    state.phaseElapsedSeconds = Math.floor((now - state.phaseStartAt) / 1000);
  }

  notify();
}

function advancePhase(now) {
  if (state.status === "running") {
    state.cyclesCompleted += 1;
    state.status = "break";
    state.phaseStartAt = now;
    state.phaseEndAt = state.breakMinutes ? now + state.breakMinutes * 60000 : null;
    state.phaseRemainingSeconds = state.breakMinutes ? state.breakMinutes * 60 : 0;
  } else if (state.status === "break") {
    state.status = "running";
    state.phaseStartAt = now;
    state.phaseEndAt = state.workMinutes ? now + state.workMinutes * 60000 : null;
    state.phaseRemainingSeconds = state.workMinutes ? state.workMinutes * 60 : 0;
  }
  state.lastTickAt = now;
  notify();
}

/**
 * @param {"pomodoro"|"52-17"|"flowtime"|"stopwatch"} mode
 * @param {object} task fila de daily_tasks a la que se vincula la sesión
 * @param {number} [workMinutes] override de duración de trabajo (pomodoro/52-17)
 * @param {number} [breakMinutes] override de duración de descanso (pomodoro/52-17)
 */
export function startSession({ mode, task, workMinutes, breakMinutes }) {
  const now = Date.now();
  const isCountdown = mode === "pomodoro" || mode === "52-17";
  const defaults = MODE_DEFAULTS[mode] || {};
  const work = isCountdown ? workMinutes ?? defaults.work : null;
  const brk = isCountdown ? breakMinutes ?? defaults.break : null;

  state = {
    status: "running",
    mode,
    task,
    workMinutes: work,
    breakMinutes: brk,
    sessionStartAt: now,
    segmentStartAt: now, // se actualiza en cada cambio de tarea (switchTask)
    phaseStartAt: now,
    phaseEndAt: work ? now + work * 60000 : null,
    phaseRemainingSeconds: work ? work * 60 : 0,
    phaseElapsedSeconds: 0,
    workAccumulatedMs: 0,
    cyclesCompleted: 0,
    lastTickAt: now,
  };

  clearInterval(intervalId);
  intervalId = setInterval(tick, 1000);
  notify();
}

/** Salta manualmente a la siguiente fase (trabajo->descanso o descanso->trabajo). */
export function skipPhase() {
  if (state.status !== "running" && state.status !== "break") return;
  const now = Date.now();
  if (state.status === "running") {
    state.workAccumulatedMs += now - state.lastTickAt;
  }
  state.lastTickAt = now;
  advancePhase(now);
}

/**
 * Cambia la tarea activa sin detener el cronómetro. Devuelve una foto del
 * tramo que se estaba trabajando con la tarea anterior (para poder guardarlo
 * como su propia sesión), o null si no había nada que cambiar.
 */
export function switchTask(newTask) {
  if (state.status === "idle" || state.task?.id === newTask.id) return null;

  const now = Date.now();
  if (state.status === "running") {
    state.workAccumulatedMs += now - state.lastTickAt;
  }
  state.lastTickAt = now;

  const previousSegment = {
    task: state.task,
    mode: state.mode,
    workMinutes: state.workMinutes,
    workAccumulatedMs: state.workAccumulatedMs,
    segmentStartAt: state.segmentStartAt,
    cyclesCompleted: state.cyclesCompleted,
  };

  state.task = newTask;
  state.segmentStartAt = now;
  state.workAccumulatedMs = 0;
  state.cyclesCompleted = 0;

  notify();
  return previousSegment;
}

export function togglePause() {
  if (state.status === "idle") return;

  if (state.status === "running" || state.status === "break") {
    state.pausedFrom = state.status;
    state.status = "paused";
    notify();
    return;
  }

  if (state.status === "paused") {
    const now = Date.now();
    const pauseDurationMs = now - state.lastTickAt;
    if (state.phaseEndAt !== null) state.phaseEndAt += pauseDurationMs;
    state.phaseStartAt += pauseDurationMs;
    state.lastTickAt = now;
    state.status = state.pausedFrom;
    notify();
  }
}

/** Termina la sesión activa y devuelve una foto de su estado final (para guardarla). */
export function endSession() {
  clearInterval(intervalId);
  intervalId = null;
  const finished = state;
  state = { status: "idle" };
  notify();
  return finished;
}
