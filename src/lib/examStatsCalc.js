// Agregaciones puras sobre exam_simulations/trimesters para las estadísticas de
// simulacros de examen. No sabe nada de Supabase ni de DOM.

/** Normaliza la nota a escala /20 para poder promediar exámenes con escalas distintas
 * (12/20, 30/40, 4/5...). Devuelve null si el examen no tiene nota o escala válida. */
function normalizeGrade(exam) {
  if (exam.final_grade == null || !exam.grade_out_of) return null;
  return (exam.final_grade / exam.grade_out_of) * 20;
}

function average(numbers) {
  if (numbers.length === 0) return null;
  return numbers.reduce((a, b) => a + b, 0) / numbers.length;
}

export function countCorrectedExams(exams) {
  return exams.filter((e) => e.status === "corrected").length;
}

export function computeOverallAverage(exams) {
  const grades = exams
    .filter((e) => e.status === "corrected")
    .map(normalizeGrade)
    .filter((g) => g !== null);
  return average(grades);
}

export function computeAverageBySubject(exams) {
  const bySubject = new Map();
  exams
    .filter((e) => e.status === "corrected")
    .forEach((e) => {
      const grade = normalizeGrade(e);
      if (grade === null) return;
      const subject = e.subject_tag || "Sin asignatura";
      if (!bySubject.has(subject)) bySubject.set(subject, []);
      bySubject.get(subject).push(grade);
    });

  return Array.from(bySubject.entries())
    .map(([subject, grades]) => ({ subject, average: average(grades), count: grades.length }))
    .sort((a, b) => b.average - a.average);
}

/** Exámenes corregidos cuya fecha de corrección cae dentro de [start, end] (inclusive). */
export function filterByDateRange(exams, start, end) {
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime() + (24 * 60 * 60 * 1000 - 1); // hasta el final del día
  return exams.filter((e) => {
    const dateValue = e.corrected_at || e.ended_at;
    if (!dateValue) return false;
    const t = new Date(dateValue).getTime();
    return t >= startMs && t <= endMs;
  });
}

/** Serie cronológica de la media histórica acumulada: un punto por simulacro corregido,
 * con la media de todas las notas normalizadas hasta ese momento (incluido). */
export function computeRunningAverageSeries(exams) {
  const points = exams
    .filter((e) => e.status === "corrected")
    .map((e) => ({ date: e.corrected_at || e.ended_at, grade: normalizeGrade(e) }))
    .filter((p) => p.date && p.grade !== null)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let sum = 0;
  return points.map((p, i) => {
    sum += p.grade;
    return { date: p.date, average: sum / (i + 1) };
  });
}

/** Comentario breve según el porcentaje sacado (independiente de la escala: /20, /40, /5...). */
export function getGradeComment(finalGrade, gradeOutOf) {
  if (finalGrade == null || !gradeOutOf || Number.isNaN(finalGrade)) return "";
  const percent = (finalGrade / gradeOutOf) * 100;
  if (percent >= 90) return "¡Excelente! Dominas este tema. 🎉";
  if (percent >= 75) return "Muy buen resultado, sigue así.";
  if (percent >= 60) return "Aprobado con margen, pero repasa los puntos que fallaste.";
  if (percent >= 50) return "Justito. Conviene reforzar antes del examen real.";
  if (percent >= 30) return "Resultado bajo — dedica tiempo extra a repasar esto.";
  return "Este tema necesita un repaso serio. No te desanimes, para eso está el simulacro.";
}

/** El trimestre (de cualquier curso académico) cuyo rango de fechas incluye hoy, o null
 * si no hay ninguno configurado que cubra la fecha actual. */
export function findCurrentTrimester(trimesters) {
  const now = Date.now();
  return (
    trimesters.find((t) => {
      const startMs = new Date(t.start_date).getTime();
      const endMs = new Date(t.end_date).getTime() + (24 * 60 * 60 * 1000 - 1);
      return now >= startMs && now <= endMs;
    }) || null
  );
}
