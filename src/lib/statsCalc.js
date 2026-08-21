// Funciones puras de agregación de estadísticas a partir de filas de "sessions".
// No saben nada de Supabase ni de DOM.

function toLocalDateKey(dateInput) {
  const d = new Date(dateInput);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function filterByRange(sessions, range) {
  if (range === "all") return sessions;
  const days = range === "7d" ? 7 : 30;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return sessions.filter((s) => new Date(s.started_at).getTime() >= cutoff);
}

export function sumMinutes(sessions) {
  return sessions.reduce((acc, s) => acc + (s.actual_duration_min || 0), 0);
}

/** Sesiones de modo Pomodoro guardadas como completadas (proxy de "pomodoros completados"). */
export function countCompletedPomodoros(sessions) {
  return sessions.filter((s) => s.mode === "pomodoro" && s.completed).length;
}

/** Días consecutivos hasta hoy (o hasta ayer, si hoy todavía no se ha estudiado) con minutos > 0. */
export function computeCurrentStreak(allSessions) {
  const studiedDates = new Set(
    allSessions.filter((s) => (s.actual_duration_min || 0) > 0).map((s) => toLocalDateKey(s.started_at))
  );

  let cursor = new Date();
  if (!studiedDates.has(toLocalDateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while (studiedDates.has(toLocalDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Minutos estudiados por día en los últimos `daysBack` días (por defecto ~1 año), para el heatmap.
 * Incluye `column`, el índice de semana (lunes-domingo) relativo al primer día, para poder
 * alinear cada celda con `grid-column`/`grid-row` explícitos y así ubicar etiquetas de mes. */
export function buildHeatmapDays(allSessions, daysBack = 371) {
  const minutesByDate = new Map();
  allSessions.forEach((s) => {
    const key = toLocalDateKey(s.started_at);
    minutesByDate.set(key, (minutesByDate.get(key) || 0) + (s.actual_duration_min || 0));
  });

  const days = [];
  const today = new Date();
  const first = new Date(today);
  first.setDate(first.getDate() - (daysBack - 1));
  const firstWeekday = (first.getDay() + 6) % 7;

  for (let i = daysBack - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = toLocalDateKey(d);
    const offset = daysBack - 1 - i;
    days.push({
      date: key,
      weekday: (d.getDay() + 6) % 7,
      column: Math.floor((offset + firstWeekday) / 7),
      minutes: minutesByDate.get(key) || 0,
    });
  }
  return days;
}

/** Una etiqueta por cada mes que aparece en el heatmap, con la columna donde empieza. */
export function buildHeatmapMonthLabels(days) {
  const labels = [];
  let lastMonth = null;
  days.forEach((d) => {
    const month = d.date.slice(0, 7);
    if (month !== lastMonth) {
      labels.push({ column: d.column, label: new Date(`${d.date}T00:00:00`).toLocaleDateString("es-ES", { month: "short" }) });
      lastMonth = month;
    }
  });
  return labels;
}

function buildDailyBuckets(sessions, daysBack) {
  const counts = new Map();
  sessions.forEach((s) => {
    const key = toLocalDateKey(s.started_at);
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  const buckets = [];
  const today = new Date();
  for (let i = daysBack - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = toLocalDateKey(d);
    buckets.push({ label: d.toLocaleDateString("es-ES", { weekday: "short" }), count: counts.get(key) || 0 });
  }
  return buckets;
}

function buildWeeklyBuckets(sessions, daysBack) {
  const weeks = Math.ceil(daysBack / 7);
  const today = new Date();
  const buckets = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const end = new Date(today);
    end.setDate(end.getDate() - w * 7);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    const startMs = startOfDay(start).getTime();
    const endMs = endOfDay(end).getTime();
    const count = sessions.filter((s) => {
      const t = new Date(s.started_at).getTime();
      return t >= startMs && t <= endMs;
    }).length;
    buckets.push({ label: `${start.getDate()}/${start.getMonth() + 1}`, count });
  }
  return buckets;
}

function buildMonthlyBuckets(sessions) {
  const counts = new Map();
  sessions.forEach((s) => {
    const d = new Date(s.started_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  return Array.from(counts.keys())
    .sort()
    .map((key) => {
      const [y, m] = key.split("-");
      const label = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("es-ES", {
        month: "short",
        year: "2-digit",
      });
      return { label, count: counts.get(key) };
    });
}

/** Barras de evolución de pomodoros completados, agrupadas según el rango elegido. */
export function buildEvolutionBuckets(rangeFilteredSessions, range) {
  const pomodoroSessions = rangeFilteredSessions.filter((s) => s.mode === "pomodoro" && s.completed);
  if (range === "7d") return buildDailyBuckets(pomodoroSessions, 7);
  if (range === "30d") return buildWeeklyBuckets(pomodoroSessions, 30);
  return buildMonthlyBuckets(pomodoroSessions);
}

export function buildSubjectDistribution(sessions) {
  const minutesBySubject = new Map();
  sessions.forEach((s) => {
    const subject = s.subject_tag || "Sin asignatura";
    minutesBySubject.set(subject, (minutesBySubject.get(subject) || 0) + (s.actual_duration_min || 0));
  });
  return Array.from(minutesBySubject.entries())
    .map(([subject, minutes]) => ({ subject, minutes }))
    .sort((a, b) => b.minutes - a.minutes);
}

export function buildHourHistogram(sessions) {
  const counts = new Array(24).fill(0);
  sessions.forEach((s) => {
    const hour = new Date(s.started_at).getHours();
    counts[hour] += 1;
  });
  let peakHour = 0;
  counts.forEach((c, h) => {
    if (c > counts[peakHour]) peakHour = h;
  });
  return { counts, peakHour, hasData: counts.some((c) => c > 0) };
}

/** Minutos del rango actual vs. el mismo número de días justo antes. `null` si el rango es "all"
 * (no hay un "periodo anterior" con el que comparar todo el histórico). */
export function computeRangeComparison(allSessions, range) {
  if (range === "all") return null;
  const days = range === "7d" ? 7 : 30;
  const now = Date.now();
  const currentCutoff = now - days * 24 * 60 * 60 * 1000;
  const previousCutoff = now - days * 2 * 24 * 60 * 60 * 1000;

  const currentMinutes = sumMinutes(allSessions.filter((s) => new Date(s.started_at).getTime() >= currentCutoff));
  const previousMinutes = sumMinutes(
    allSessions.filter((s) => {
      const t = new Date(s.started_at).getTime();
      return t >= previousCutoff && t < currentCutoff;
    })
  );

  const percentChange =
    previousMinutes > 0 ? Math.round(((currentMinutes - previousMinutes) / previousMinutes) * 100) : null;

  return { currentMinutes, previousMinutes, percentChange };
}

/** Racha más larga de días consecutivos con actividad en todo el histórico (no solo la actual). */
export function computeLongestStreak(allSessions) {
  const studiedDates = Array.from(
    new Set(allSessions.filter((s) => (s.actual_duration_min || 0) > 0).map((s) => toLocalDateKey(s.started_at)))
  ).sort();
  if (studiedDates.length === 0) return 0;

  let longest = 1;
  let current = 1;
  for (let i = 1; i < studiedDates.length; i++) {
    const diffDays = Math.round(
      (new Date(`${studiedDates[i]}T00:00:00`) - new Date(`${studiedDates[i - 1]}T00:00:00`)) / (24 * 60 * 60 * 1000)
    );
    current = diffDays === 1 ? current + 1 : 1;
    longest = Math.max(longest, current);
  }
  return longest;
}

/** Minutos totales por modo de estudio, y desviación media entre duración planeada y real
 * (solo para sesiones con duración planeada, es decir Pomodoro/52-17). */
export function buildModeDistribution(sessions) {
  const byMode = new Map();
  sessions.forEach((s) => {
    if (!byMode.has(s.mode)) byMode.set(s.mode, { minutes: 0, deviationSum: 0, deviationCount: 0 });
    const entry = byMode.get(s.mode);
    entry.minutes += s.actual_duration_min || 0;
    if (s.planned_duration_min) {
      entry.deviationSum += (s.actual_duration_min || 0) - s.planned_duration_min;
      entry.deviationCount += 1;
    }
  });

  return Array.from(byMode.entries())
    .map(([mode, v]) => ({
      mode,
      minutes: v.minutes,
      avgDeviationMin: v.deviationCount > 0 ? Math.round(v.deviationSum / v.deviationCount) : null,
    }))
    .sort((a, b) => b.minutes - a.minutes);
}

export function getDistinctSubjects(allSessions) {
  return Array.from(new Set(allSessions.map((s) => s.subject_tag).filter(Boolean))).sort();
}

export function filterBySubject(sessions, subject) {
  if (!subject || subject === "all") return sessions;
  return sessions.filter((s) => s.subject_tag === subject);
}
