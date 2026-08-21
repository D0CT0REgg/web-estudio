// Lógica pura del sistema Leitner (repetición espaciada) para la sección de Tarjetas.
// No sabe nada de Supabase ni de DOM.

export const LEITNER_BOX_COUNT = 5;

const INTERVAL_DAYS_BY_BOX = { 1: 1, 2: 2, 3: 4, 4: 7, 5: 14 };

/** Nueva caja y próxima fecha de repaso tras evaluar una tarjeta. Si se falla, vuelve a la
 * caja 1 (se repasará pronto); si se acierta, sube de caja (máx. LEITNER_BOX_COUNT) y tarda
 * más en volver a aparecer. */
export function computeReviewOutcome(boxLevel, remembered, now = Date.now()) {
  const newBox = remembered ? Math.min(LEITNER_BOX_COUNT, boxLevel + 1) : 1;
  const intervalDays = INTERVAL_DAYS_BY_BOX[newBox];
  const nextReviewAt = new Date(now + intervalDays * 24 * 60 * 60 * 1000).toISOString();
  return { boxLevel: newBox, nextReviewAt };
}

/** Tarjetas cuyo repaso ya toca: sin fecha (nuevas) o con next_review_at en el pasado. */
export function filterDueCards(cards, now = Date.now()) {
  return cards.filter((c) => !c.next_review_at || new Date(c.next_review_at).getTime() <= now);
}

/** Fisher-Yates. `rng` es inyectable para poder testear con resultado determinista. */
export function shuffle(items, rng = Math.random) {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
