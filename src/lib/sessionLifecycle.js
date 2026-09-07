import {
  endSession,
  switchTask,
  subscribe as subscribeSession,
  getState as getSessionState,
  resumeTicking,
} from "./sessionStore.js";
import { saveSession } from "./sessionsApi.js";
import { toLocalDateKey } from "./statsCalc.js";

const MIN_SEGMENT_MS = 30 * 1000; // tramos de menos de 30s no merece la pena guardarlos aparte
const AUTOSAVE_INTERVAL_MS = 60 * 1000;

function isFreeMode(mode) {
  return mode === "flowtime" || mode === "stopwatch";
}

function computeCompleted(segment) {
  return isFreeMode(segment.mode) ? true : segment.cyclesCompleted >= 1;
}

function computeActualDurationMin(segment) {
  return Math.max(1, Math.round(segment.workAccumulatedMs / 60000));
}

async function saveSegment(segment, { completed }) {
  try {
    await saveSession({
      id: segment.id,
      task: segment.task,
      mode: segment.mode,
      plannedDurationMin: segment.workMinutes || null,
      actualDurationMin: computeActualDurationMin(segment),
      startedAt: segment.segmentStartAt,
      endedAt: Date.now(),
      completed,
    });
  } catch (err) {
    console.error("No se pudo guardar la sesión:", err);
  }
}

/** Termina la sesión activa, calcula si se completó y la guarda en Supabase. */
export async function finishSession() {
  const finished = endSession();
  if (!finished.task) return;
  await saveSegment(finished, { completed: computeCompleted(finished) });
}

/**
 * Cambia la tarea activa de la sesión en curso sin detener el cronómetro:
 * guarda como sesión aparte el tiempo ya invertido en la tarea anterior
 * (si es significativo) y sigue contando desde cero para la nueva tarea.
 */
export async function switchSessionTask(newTask) {
  const previousSegment = switchTask(newTask);
  if (!previousSegment?.task) return;
  if (previousSegment.workAccumulatedMs < MIN_SEGMENT_MS) return;

  await saveSegment(previousSegment, { completed: true });
}

function snapshotActiveSegment(state) {
  return {
    id: state.segmentId,
    task: state.task,
    mode: state.mode,
    workMinutes: state.workMinutes,
    workAccumulatedMs: state.workAccumulatedMs,
    segmentStartAt: state.segmentStartAt,
    cyclesCompleted: state.cyclesCompleted,
  };
}

async function autosaveTick() {
  const state = getSessionState();
  if (state.status === "idle") return;
  if (state.workAccumulatedMs < MIN_SEGMENT_MS) return;
  // completed queda en false: el guardado final (finishSession/switchSessionTask) es quien
  // decide si el tramo se completó, esta llamada solo va subiendo el progreso mientras tanto.
  await saveSegment(snapshotActiveSegment(state), { completed: false });
}

/**
 * Se llama una vez al arrancar la app. Si sessionStore restauró una sesión desde localStorage
 * (la pestaña se cerró o recargó con una sesión en marcha), decide qué hacer con ella:
 * - Si el último tick fue hoy: reengancha el cronómetro y sigue contando donde se quedó.
 * - Si fue un día anterior (pestaña olvidada abierta, o cerrada del todo sin pulsar "Terminar"):
 *   la cierra ya mismo y la guarda tal y como quedó, en vez de dejarla "en curso" para siempre
 *   (esto es lo que evita sesiones huérfanas: al tener aquí el cyclesCompleted real gracias al
 *   estado restaurado, se puede calcular correctamente si se completó o no).
 */
export async function reconcileRestoredSession() {
  const state = getSessionState();
  if (state.status === "idle") return;

  const lastActivityAt = state.lastTickAt || state.segmentStartAt || state.sessionStartAt;
  const isFromToday = toLocalDateKey(lastActivityAt) === toLocalDateKey(Date.now());

  if (isFromToday) {
    resumeTicking();
    return;
  }

  const finished = endSession();
  if (!finished.task) return;
  await saveSegment(finished, { completed: computeCompleted(finished) });
}

let autosaveIntervalId = null;

/**
 * Arranca el autoguardado periódico de la sesión activa: cada minuto sube a Supabase el
 * progreso del tramo en curso, para no perder el tiempo estudiado si se cierra la pestaña
 * antes de terminar la sesión. Debe llamarse una vez al arrancar la app.
 */
export function initSessionAutosave() {
  subscribeSession((state) => {
    const shouldRun = state.status !== "idle";
    if (shouldRun && autosaveIntervalId === null) {
      autosaveIntervalId = setInterval(autosaveTick, AUTOSAVE_INTERVAL_MS);
    } else if (!shouldRun && autosaveIntervalId !== null) {
      clearInterval(autosaveIntervalId);
      autosaveIntervalId = null;
    }
  });
}
