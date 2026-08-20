import { endSession, switchTask } from "./sessionStore.js";
import { saveSession } from "./sessionsApi.js";

const MIN_SEGMENT_MS = 30 * 1000; // tramos de menos de 30s no merece la pena guardarlos aparte

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
