import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  filterByRange,
  sumMinutes,
  countCompletedPomodoros,
  computeCurrentStreak,
  computeLongestStreak,
  getDistinctSubjects,
  filterBySubject,
  buildSubjectDistribution,
  buildHourHistogram,
  computeRangeComparison,
  buildModeDistribution,
} from "./statsCalc.js";

const NOW = new Date("2026-08-21T12:00:00");

function daysAgo(n, hour = 10) {
  const d = new Date(NOW);
  d.setDate(d.getDate() - n);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

function session(overrides = {}) {
  return {
    started_at: daysAgo(0),
    actual_duration_min: 25,
    mode: "pomodoro",
    completed: true,
    ...overrides,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("filterByRange", () => {
  it("devuelve todo con range 'all'", () => {
    const sessions = [session({ started_at: daysAgo(400) })];
    expect(filterByRange(sessions, "all")).toHaveLength(1);
  });

  it("excluye sesiones fuera de los últimos 7 días", () => {
    const sessions = [session({ started_at: daysAgo(3) }), session({ started_at: daysAgo(10) })];
    expect(filterByRange(sessions, "7d")).toHaveLength(1);
  });

  it("excluye sesiones fuera de los últimos 30 días", () => {
    const sessions = [session({ started_at: daysAgo(20) }), session({ started_at: daysAgo(40) })];
    expect(filterByRange(sessions, "30d")).toHaveLength(1);
  });
});

describe("sumMinutes", () => {
  it("suma actual_duration_min, tratando ausencias como 0", () => {
    const sessions = [session({ actual_duration_min: 25 }), session({ actual_duration_min: null }), session({ actual_duration_min: 10 })];
    expect(sumMinutes(sessions)).toBe(35);
  });

  it("devuelve 0 con lista vacía", () => {
    expect(sumMinutes([])).toBe(0);
  });
});

describe("countCompletedPomodoros", () => {
  it("cuenta solo pomodoro + completed", () => {
    const sessions = [
      session({ mode: "pomodoro", completed: true }),
      session({ mode: "pomodoro", completed: false }),
      session({ mode: "52-17", completed: true }),
    ];
    expect(countCompletedPomodoros(sessions)).toBe(1);
  });
});

describe("computeCurrentStreak", () => {
  it("cuenta días consecutivos hasta hoy inclusive", () => {
    const sessions = [session({ started_at: daysAgo(0) }), session({ started_at: daysAgo(1) }), session({ started_at: daysAgo(2) })];
    expect(computeCurrentStreak(sessions)).toBe(3);
  });

  it("sigue contando hasta ayer si hoy aún no se ha estudiado", () => {
    const sessions = [session({ started_at: daysAgo(1) }), session({ started_at: daysAgo(2) })];
    expect(computeCurrentStreak(sessions)).toBe(2);
  });

  it("se corta al primer hueco", () => {
    const sessions = [session({ started_at: daysAgo(0) }), session({ started_at: daysAgo(2) })];
    expect(computeCurrentStreak(sessions)).toBe(1);
  });

  it("devuelve 0 sin sesiones", () => {
    expect(computeCurrentStreak([])).toBe(0);
  });

  it("ignora sesiones con 0 minutos", () => {
    const sessions = [session({ started_at: daysAgo(0), actual_duration_min: 0 })];
    expect(computeCurrentStreak(sessions)).toBe(0);
  });
});

describe("computeLongestStreak", () => {
  it("encuentra la racha más larga aunque no sea la actual", () => {
    const sessions = [
      session({ started_at: daysAgo(0) }),
      session({ started_at: daysAgo(10) }),
      session({ started_at: daysAgo(11) }),
      session({ started_at: daysAgo(12) }),
      session({ started_at: daysAgo(13) }),
    ];
    expect(computeLongestStreak(sessions)).toBe(4);
  });

  it("devuelve 0 sin sesiones", () => {
    expect(computeLongestStreak([])).toBe(0);
  });
});

describe("getDistinctSubjects / filterBySubject", () => {
  it("deduplica, ordena y descarta vacíos", () => {
    const sessions = [{ subject_tag: "Mates" }, { subject_tag: "Física" }, { subject_tag: "Mates" }, { subject_tag: null }];
    expect(getDistinctSubjects(sessions)).toEqual(["Física", "Mates"]);
  });

  it("filterBySubject('all') devuelve todo", () => {
    const sessions = [{ subject_tag: "Mates" }];
    expect(filterBySubject(sessions, "all")).toBe(sessions);
  });

  it("filterBySubject filtra por asignatura exacta", () => {
    const sessions = [{ subject_tag: "Mates" }, { subject_tag: "Física" }];
    expect(filterBySubject(sessions, "Mates")).toEqual([{ subject_tag: "Mates" }]);
  });
});

describe("buildSubjectDistribution", () => {
  it("agrupa minutos por asignatura y ordena de mayor a menor", () => {
    const sessions = [
      session({ subject_tag: "Mates", actual_duration_min: 10 }),
      session({ subject_tag: "Física", actual_duration_min: 30 }),
      session({ subject_tag: "Mates", actual_duration_min: 15 }),
    ];
    expect(buildSubjectDistribution(sessions)).toEqual([
      { subject: "Física", minutes: 30 },
      { subject: "Mates", minutes: 25 },
    ]);
  });

  it("agrupa sesiones sin asignatura bajo 'Sin asignatura'", () => {
    const sessions = [session({ subject_tag: undefined, actual_duration_min: 5 })];
    expect(buildSubjectDistribution(sessions)).toEqual([{ subject: "Sin asignatura", minutes: 5 }]);
  });
});

describe("buildHourHistogram", () => {
  it("detecta la hora pico y marca hasData", () => {
    const sessions = [session({ started_at: daysAgo(0, 9) }), session({ started_at: daysAgo(1, 9) }), session({ started_at: daysAgo(0, 20) })];
    const { counts, peakHour, hasData } = buildHourHistogram(sessions);
    expect(peakHour).toBe(9);
    expect(counts[9]).toBe(2);
    expect(hasData).toBe(true);
  });

  it("hasData es false sin sesiones", () => {
    expect(buildHourHistogram([]).hasData).toBe(false);
  });
});

describe("computeRangeComparison", () => {
  it("devuelve null para range 'all'", () => {
    expect(computeRangeComparison([], "all")).toBeNull();
  });

  it("calcula el % de cambio frente al periodo anterior equivalente", () => {
    const sessions = [
      session({ started_at: daysAgo(1), actual_duration_min: 100 }), // periodo actual (7d)
      session({ started_at: daysAgo(10), actual_duration_min: 50 }), // periodo anterior (7-14d)
    ];
    const result = computeRangeComparison(sessions, "7d");
    expect(result.currentMinutes).toBe(100);
    expect(result.previousMinutes).toBe(50);
    expect(result.percentChange).toBe(100);
  });

  it("percentChange es null si el periodo anterior no tuvo minutos", () => {
    const sessions = [session({ started_at: daysAgo(1), actual_duration_min: 100 })];
    expect(computeRangeComparison(sessions, "7d").percentChange).toBeNull();
  });
});

describe("buildModeDistribution", () => {
  it("suma minutos por modo y calcula la desviación media solo con duración planeada", () => {
    const sessions = [
      { mode: "pomodoro", actual_duration_min: 30, planned_duration_min: 25 },
      { mode: "pomodoro", actual_duration_min: 20, planned_duration_min: 25 },
      { mode: "flowtime", actual_duration_min: 40 },
    ];
    const result = buildModeDistribution(sessions);
    const pomodoro = result.find((r) => r.mode === "pomodoro");
    const flowtime = result.find((r) => r.mode === "flowtime");
    expect(pomodoro.minutes).toBe(50);
    expect(pomodoro.avgDeviationMin).toBe(0); // (+5, -5) / 2
    expect(flowtime.avgDeviationMin).toBeNull();
  });
});
