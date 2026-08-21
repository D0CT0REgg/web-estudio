import { describe, it, expect } from "vitest";
import { computeReviewOutcome, filterDueCards, shuffle, LEITNER_BOX_COUNT } from "./flashcardsCalc.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-08-21T12:00:00").getTime();

describe("computeReviewOutcome", () => {
  it("al acertar, sube de caja y programa el repaso más lejos", () => {
    const result = computeReviewOutcome(1, true, NOW);
    expect(result.boxLevel).toBe(2);
    expect(new Date(result.nextReviewAt).getTime()).toBe(NOW + 2 * DAY_MS);
  });

  it("no sube más allá de la última caja", () => {
    const result = computeReviewOutcome(LEITNER_BOX_COUNT, true, NOW);
    expect(result.boxLevel).toBe(LEITNER_BOX_COUNT);
  });

  it("al fallar, vuelve siempre a la caja 1 sin importar de dónde venga", () => {
    const result = computeReviewOutcome(4, false, NOW);
    expect(result.boxLevel).toBe(1);
    expect(new Date(result.nextReviewAt).getTime()).toBe(NOW + 1 * DAY_MS);
  });

  it("cajas más altas dan intervalos más largos", () => {
    const r2 = computeReviewOutcome(1, true, NOW);
    const r3 = computeReviewOutcome(2, true, NOW);
    const r4 = computeReviewOutcome(3, true, NOW);
    expect(new Date(r2.nextReviewAt).getTime()).toBeLessThan(new Date(r3.nextReviewAt).getTime());
    expect(new Date(r3.nextReviewAt).getTime()).toBeLessThan(new Date(r4.nextReviewAt).getTime());
  });
});

describe("filterDueCards", () => {
  it("incluye tarjetas sin next_review_at (nuevas)", () => {
    const cards = [{ id: 1, next_review_at: null }];
    expect(filterDueCards(cards, NOW)).toHaveLength(1);
  });

  it("incluye tarjetas cuya fecha de repaso ya pasó", () => {
    const cards = [{ id: 1, next_review_at: new Date(NOW - DAY_MS).toISOString() }];
    expect(filterDueCards(cards, NOW)).toHaveLength(1);
  });

  it("excluye tarjetas programadas para el futuro", () => {
    const cards = [{ id: 1, next_review_at: new Date(NOW + DAY_MS).toISOString() }];
    expect(filterDueCards(cards, NOW)).toHaveLength(0);
  });

  it("incluye tarjetas cuya fecha de repaso es exactamente ahora", () => {
    const cards = [{ id: 1, next_review_at: new Date(NOW).toISOString() }];
    expect(filterDueCards(cards, NOW)).toHaveLength(1);
  });
});

describe("shuffle", () => {
  it("conserva todos los elementos (misma longitud y contenido)", () => {
    const items = [1, 2, 3, 4, 5];
    const result = shuffle(items);
    expect(result).toHaveLength(items.length);
    expect([...result].sort()).toEqual(items);
  });

  it("no muta el array original", () => {
    const items = [1, 2, 3];
    const copy = [...items];
    shuffle(items);
    expect(items).toEqual(copy);
  });

  it("es determinista para un rng dado (Fisher-Yates)", () => {
    const items = [1, 2, 3, 4];
    // rng constante en 0 -> cada paso intercambia arr[i] con arr[0]
    const result = shuffle(items, () => 0);
    expect(result).toEqual([2, 3, 4, 1]);
  });
});
