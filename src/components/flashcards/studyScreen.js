import { fetchDeck, fetchCards, reviewCard } from "../../lib/flashcardsApi.js";
import { filterDueCards, shuffle } from "../../lib/flashcardsCalc.js";
import { escapeHtml } from "../../lib/escapeHtml.js";
import { skeletonCard } from "../../lib/skeleton.js";

export async function renderStudyScreen(container, nav, deckId) {
  container.innerHTML = `
    <section class="view-simulacro fx-fade-in" aria-labelledby="study-title">
      <h1 id="study-title">Estudiando…</h1>
      ${skeletonCard({ lines: 5 })}
    </section>
  `;

  let deck;
  let allCards;
  try {
    [deck, allCards] = await Promise.all([fetchDeck(deckId), fetchCards(deckId)]);
  } catch (err) {
    console.error(err);
    container.innerHTML = `<p class="task-list-empty">No se pudo cargar el mazo.</p>`;
    return;
  }

  const dueCards = filterDueCards(allCards);

  function startSession(cardsForSession) {
    const state = {
      queue: shuffle(cardsForSession),
      index: 0,
      revealed: false,
      known: 0,
      unknown: 0,
    };

    container.innerHTML = `
      <section class="view-simulacro fx-fade-in" aria-labelledby="study-title">
        <h1 id="study-title">${escapeHtml(deck.title)}</h1>
        <p class="flashcard-progress" id="study-progress"></p>

        <div class="flashcard-stage" id="flashcard-stage" role="button" tabindex="0"></div>
        <p class="flashcard-hint" id="flashcard-hint">Toca la tarjeta para ver la respuesta</p>

        <div class="flashcard-review-actions" id="flashcard-actions" hidden>
          <button type="button" class="ft-btn ft-btn-end" id="btn-dont-know">😵 No lo sé</button>
          <button type="button" class="btn-primary" id="btn-know">✅ Lo sé</button>
        </div>

        <div class="quick-add-actions">
          <button type="button" class="ft-btn" id="study-exit-btn">← Volver a mazos</button>
        </div>
      </section>
    `;

    const els = {
      progress: container.querySelector("#study-progress"),
      stage: container.querySelector("#flashcard-stage"),
      hint: container.querySelector("#flashcard-hint"),
      actions: container.querySelector("#flashcard-actions"),
      dontKnowBtn: container.querySelector("#btn-dont-know"),
      knowBtn: container.querySelector("#btn-know"),
      exitBtn: container.querySelector("#study-exit-btn"),
    };

    els.exitBtn.addEventListener("click", () => nav.goTo("list"));

    function renderSummary() {
      container.innerHTML = `
        <section class="view-simulacro fx-fade-in" aria-labelledby="study-title">
          <h1 id="study-title">¡Sesión completada! 🎉</h1>
          <div class="setup-block">
            <p>Has repasado ${state.queue.length} tarjeta${state.queue.length === 1 ? "" : "s"} de "${escapeHtml(deck.title)}".</p>
            <p>✅ Sabidas: ${state.known} &nbsp;·&nbsp; 😵 A repasar: ${state.unknown}</p>
          </div>
          <div class="quick-add-actions">
            <button type="button" class="ft-btn" id="summary-back-btn">← Volver a mazos</button>
            <button type="button" class="btn-primary" id="summary-again-btn">Repasar de nuevo</button>
          </div>
        </section>
      `;
      container.querySelector("#summary-back-btn").addEventListener("click", () => nav.goTo("list"));
      container.querySelector("#summary-again-btn").addEventListener("click", () => nav.goTo("study", deckId));
    }

    function renderCard() {
      if (state.index >= state.queue.length) {
        renderSummary();
        return;
      }
      const card = state.queue[state.index];
      state.revealed = false;
      els.progress.textContent = `${state.index + 1} / ${state.queue.length}`;
      els.stage.textContent = card.front;
      els.stage.classList.remove("revealed");
      els.hint.textContent = "Toca la tarjeta para ver la respuesta";
      els.actions.hidden = true;
    }

    function revealCard() {
      if (state.revealed || state.index >= state.queue.length) return;
      const card = state.queue[state.index];
      state.revealed = true;
      els.stage.textContent = card.back;
      els.stage.classList.add("revealed");
      els.hint.textContent = "";
      els.actions.hidden = false;
    }

    async function answer(remembered) {
      const card = state.queue[state.index];
      if (remembered) state.known += 1;
      else state.unknown += 1;

      els.dontKnowBtn.disabled = true;
      els.knowBtn.disabled = true;
      try {
        await reviewCard(card, remembered);
      } catch (err) {
        console.error("No se pudo guardar el repaso:", err);
      }
      els.dontKnowBtn.disabled = false;
      els.knowBtn.disabled = false;

      state.index += 1;
      renderCard();
    }

    els.stage.addEventListener("click", revealCard);
    els.stage.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        revealCard();
      }
    });
    els.dontKnowBtn.addEventListener("click", () => answer(false));
    els.knowBtn.addEventListener("click", () => answer(true));

    renderCard();
  }

  if (allCards.length === 0) {
    container.innerHTML = `
      <section class="view-simulacro fx-fade-in" aria-labelledby="study-title">
        <h1 id="study-title">${escapeHtml(deck.title)}</h1>
        <p class="task-list-empty">Este mazo todavía no tiene tarjetas. Añade alguna antes de estudiar.</p>
        <div class="quick-add-actions">
          <button type="button" class="ft-btn" id="study-back-btn">← Volver a mazos</button>
          <button type="button" class="btn-primary" id="study-edit-btn">Añadir tarjetas</button>
        </div>
      </section>
    `;
    container.querySelector("#study-back-btn").addEventListener("click", () => nav.goTo("list"));
    container.querySelector("#study-edit-btn").addEventListener("click", () => nav.goTo("edit", deckId));
    return;
  }

  if (dueCards.length === 0) {
    container.innerHTML = `
      <section class="view-simulacro fx-fade-in" aria-labelledby="study-title">
        <h1 id="study-title">${escapeHtml(deck.title)}</h1>
        <p class="task-list-empty">No hay tarjetas pendientes de repaso hoy en este mazo. ¡Buen trabajo!</p>
        <div class="quick-add-actions">
          <button type="button" class="ft-btn" id="study-back-btn">← Volver a mazos</button>
          <button type="button" class="btn-primary" id="study-force-btn">Estudiar todas de todas formas</button>
        </div>
      </section>
    `;
    container.querySelector("#study-back-btn").addEventListener("click", () => nav.goTo("list"));
    container.querySelector("#study-force-btn").addEventListener("click", () => startSession(allCards));
    return;
  }

  startSession(dueCards);
}
