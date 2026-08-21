import { fetchDecks, fetchAllCardsMeta, deleteDeck } from "../../lib/flashcardsApi.js";
import { filterDueCards } from "../../lib/flashcardsCalc.js";
import { escapeHtml } from "../../lib/escapeHtml.js";
import { skeletonList } from "../../lib/skeleton.js";

export function renderDeckListScreen(container, nav) {
  const state = { decks: [], cardsMeta: [], loading: true };

  container.innerHTML = `
    <section class="view-simulacro fx-fade-in" aria-labelledby="flashcards-title">
      <h1 id="flashcards-title">Tarjetas</h1>

      <button type="button" class="btn-hero" id="new-deck-btn">
        <span class="btn-hero-icon" aria-hidden="true">🗂️</span>
        Nuevo mazo
      </button>

      <div id="deck-list"></div>
    </section>
  `;

  const els = {
    newDeckBtn: container.querySelector("#new-deck-btn"),
    list: container.querySelector("#deck-list"),
  };

  els.newDeckBtn.addEventListener("click", () => nav.goTo("edit"));

  function countsForDeck(deckId) {
    const cards = state.cardsMeta.filter((c) => c.deck_id === deckId);
    return { total: cards.length, due: filterDueCards(cards).length };
  }

  function deckCardHtml(deck) {
    const { total, due } = countsForDeck(deck.id);
    return `
      <div class="exam-card" data-deck-id="${deck.id}">
        <div class="exam-card-info">
          <span class="exam-card-title">${escapeHtml(deck.title)}</span>
          <span class="exam-card-meta">
            ${deck.subject_tag ? `<span class="tag-pill">${escapeHtml(deck.subject_tag)}</span>` : ""}
            <span class="exam-card-date">${total} tarjeta${total === 1 ? "" : "s"}</span>
          </span>
        </div>
        ${due > 0 ? `<span class="exam-card-grade">${due} pendiente${due === 1 ? "" : "s"}</span>` : ""}
        <div class="exam-card-actions">
          <button type="button" class="btn-primary" data-action="study" ${total === 0 ? "disabled" : ""}>Estudiar</button>
          <button type="button" class="ft-icon-btn" data-action="edit" aria-label="Editar mazo">✏️</button>
          <button type="button" class="ft-icon-btn" data-action="delete" aria-label="Eliminar mazo">🗑️</button>
        </div>
      </div>
    `;
  }

  function wireCard(cardEl, deck) {
    cardEl.querySelector('[data-action="study"]')?.addEventListener("click", () => nav.goTo("study", deck.id));
    cardEl.querySelector('[data-action="edit"]').addEventListener("click", () => nav.goTo("edit", deck.id));
    cardEl.querySelector('[data-action="delete"]').addEventListener("click", async (e) => {
      e.stopPropagation();
      if (!window.confirm(`¿Eliminar el mazo "${deck.title}"? Se borran también todas sus tarjetas.`)) return;
      try {
        await deleteDeck(deck.id);
        state.decks = state.decks.filter((d) => d.id !== deck.id);
        renderList();
      } catch (err) {
        console.error(err);
        window.alert("No se pudo eliminar el mazo.");
      }
    });
  }

  function renderList() {
    if (state.loading) {
      els.list.innerHTML = skeletonList({ rows: 3 });
      return;
    }
    if (state.decks.length === 0) {
      els.list.innerHTML = `<p class="task-list-empty">Todavía no tienes ningún mazo. Crea el primero arriba.</p>`;
      return;
    }
    els.list.innerHTML = `<div class="exam-card-list">${state.decks.map(deckCardHtml).join("")}</div>`;
    const listEl = els.list.querySelector(".exam-card-list");
    state.decks.forEach((deck) => wireCard(listEl.querySelector(`[data-deck-id="${deck.id}"]`), deck));
  }

  renderList();

  Promise.all([fetchDecks(), fetchAllCardsMeta()])
    .then(([decks, cardsMeta]) => {
      state.decks = decks;
      state.cardsMeta = cardsMeta;
      state.loading = false;
      renderList();
    })
    .catch((err) => {
      console.error(err);
      state.loading = false;
      els.list.innerHTML = `<p class="task-list-empty">No se pudieron cargar los mazos.</p>`;
    });
}
