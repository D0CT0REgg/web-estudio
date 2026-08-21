import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  countCorrectedExams,
  computeOverallAverage,
  computeAverageBySubject,
  filterByDateRange,
  computeRunningAverageSeries,
  getGradeComment,
  findCurrentTrimester,
} from "./examStatsCalc.js";

function exam(overrides = {}) {
  return {
    status: "corrected",
    final_grade: 16,
    grade_out_of: 20,
    subject_tag: "Mates",
    corrected_at: "2026-03-01T10:00:00",
    ...overrides,
  };
}

describe("countCorrectedExams", () => {
  it("cuenta solo los exámenes corregidos", () => {
    const exams = [exam({ status: "corrected" }), exam({ status: "scheduled" }), exam({ status: "corrected" })];
    expect(countCorrectedExams(exams)).toBe(2);
  });
});

describe("computeOverallAverage", () => {
  it("normaliza notas de distintas escalas a /20 antes de promediar", () => {
    // 16/20 = 80% ; 30/40 = 75% -> medias en /20: 16 y 15 -> media 15.5
    const exams = [exam({ final_grade: 16, grade_out_of: 20 }), exam({ final_grade: 30, grade_out_of: 40 })];
    expect(computeOverallAverage(exams)).toBeCloseTo(15.5);
  });

  it("ignora exámenes no corregidos o sin nota", () => {
    const exams = [exam({ status: "scheduled" }), exam({ final_grade: null })];
    expect(computeOverallAverage(exams)).toBeNull();
  });

  it("devuelve null sin exámenes", () => {
    expect(computeOverallAverage([])).toBeNull();
  });
});

describe("computeAverageBySubject", () => {
  it("agrupa por asignatura, promedia y ordena de mayor a menor nota", () => {
    const exams = [
      exam({ subject_tag: "Mates", final_grade: 10, grade_out_of: 20 }),
      exam({ subject_tag: "Mates", final_grade: 14, grade_out_of: 20 }),
      exam({ subject_tag: "Física", final_grade: 18, grade_out_of: 20 }),
    ];
    const result = computeAverageBySubject(exams);
    expect(result[0]).toEqual({ subject: "Física", average: 18, count: 1 });
    expect(result[1]).toEqual({ subject: "Mates", average: 12, count: 2 });
  });
});

describe("filterByDateRange", () => {
  it("incluye exámenes en el límite exacto de inicio y fin", () => {
    const exams = [
      exam({ corrected_at: "2026-03-01T00:00:00" }),
      exam({ corrected_at: "2026-03-31T23:59:59" }),
      exam({ corrected_at: "2026-04-01T00:00:01" }),
    ];
    const result = filterByDateRange(exams, "2026-03-01", "2026-03-31");
    expect(result).toHaveLength(2);
  });

  it("usa ended_at si no hay corrected_at", () => {
    const exams = [exam({ corrected_at: null, ended_at: "2026-03-15T10:00:00" })];
    expect(filterByDateRange(exams, "2026-03-01", "2026-03-31")).toHaveLength(1);
  });

  it("descarta exámenes sin ninguna fecha", () => {
    const exams = [exam({ corrected_at: null, ended_at: null })];
    expect(filterByDateRange(exams, "2026-03-01", "2026-03-31")).toHaveLength(0);
  });
});

describe("computeRunningAverageSeries", () => {
  it("calcula la media acumulada en orden cronológico", () => {
    const exams = [
      exam({ corrected_at: "2026-03-02T00:00:00", final_grade: 10, grade_out_of: 20 }),
      exam({ corrected_at: "2026-03-01T00:00:00", final_grade: 20, grade_out_of: 20 }),
    ];
    const series = computeRunningAverageSeries(exams);
    expect(series.map((p) => p.date)).toEqual(["2026-03-01T00:00:00", "2026-03-02T00:00:00"]);
    expect(series[0].average).toBe(20);
    expect(series[1].average).toBe(15);
  });
});

describe("getGradeComment", () => {
  it.each([
    [19, 20, "¡Excelente! Dominas este tema. 🎉"],
    [15, 20, "Muy buen resultado, sigue así."],
    [12, 20, "Aprobado con margen, pero repasa los puntos que fallaste."],
    [10, 20, "Justito. Conviene reforzar antes del examen real."],
    [7, 20, "Resultado bajo — dedica tiempo extra a repasar esto."],
    [2, 20, "Este tema necesita un repaso serio. No te desanimes, para eso está el simulacro."],
  ])("porcentaje de %i/%i da el comentario correcto", (grade, outOf, expected) => {
    expect(getGradeComment(grade, outOf)).toBe(expected);
  });

  it("devuelve cadena vacía sin nota o sin escala", () => {
    expect(getGradeComment(null, 20)).toBe("");
    expect(getGradeComment(10, 0)).toBe("");
  });
});

describe("findCurrentTrimester", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-15T12:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("encuentra el trimestre cuyo rango incluye hoy", () => {
    const trimesters = [
      { start_date: "2026-01-01", end_date: "2026-02-28" },
      { start_date: "2026-03-01", end_date: "2026-03-31" },
    ];
    expect(findCurrentTrimester(trimesters)).toEqual(trimesters[1]);
  });

  it("devuelve null si ningún trimestre cubre hoy", () => {
    const trimesters = [{ start_date: "2026-01-01", end_date: "2026-02-28" }];
    expect(findCurrentTrimester(trimesters)).toBeNull();
  });
});
