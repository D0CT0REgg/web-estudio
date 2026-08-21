import { fetchDeck, createDeck, updateDeck, fetchCards, createCard, updateCard, deleteCard } from "../../lib/flashcardsApi.js";
import { SUBJECTS } from "../../lib/tags.js";
import { makeChipGroup } from "../../lib/chipGroup.js";
import { escapeHtml } from "../../lib/escapeHtml.js";
import { skeletonCard } from "../../lib/skeleton.js";

export async function renderDeckEditScreen(container, nav, deckId) {
  const isEdit = Boolean(deckId);

  const state = {
    deckId: deckId || null,
    title: "",
    subject: null,
    cards: [],
    editingCardId: null,
    loading: isEdit,
  };

  container.innerHTML = `
    <section class="view-simulacro fx-fade-in" aria-labelledby="deck-edit-title">
      <h1 id="deck-edit-title">${isEdit ? "Editar mazo" : "Nuevo mazo"}</h1>

      <div id="deck-edit-loading" ${isEdit ? "" : "hidden"}>${skeletonCard({ lines: 4 })}</div>

      <div id="deck-edit-form" ${isEdit ? "hidden" : ""}>
        <div class="setup-block">
          <h2>Datos del mazo</h2>
          <label class="ajustes-field" style="max-width: none">
            Nombre del mazo
            <input type="text" id="deck-title-input" placeholder="Ej. Vocabulario inglés — unidad 3" />
          </label>
          <div class="chip-grid" id="deck-subject-chips"></div>
          <p class="quick-add-error" id="deck-info-error" hidden></p>
          <div class="quick-add-actions">
            <button type="button" class="ft-btn" id="deck-back-btn">← Volver a mazos</button>
            <button type="button" class="btn-primary" id="deck-save-info-btn">
              ${isEdit ? "Guardar cambios" : "Crear mazo y añadir tarjetas"}
            </button>
          </div>
        </div>

        <div class="setup-block" id="deck-cards-block" ${isEdit ? "" : "hidden"}>
          <h2>Tarjetas</h2>
          <div class="flashcard-editor-form">
            <label class="ajustes-field" style="max-width: none">
              Pregunta / anverso
              <textarea id="card-front-input" class="goal-input" rows="2"></textarea>
            </label>
            <label class="ajustes-field" style="max-width: none">
              Respuesta / reverso
              <textarea id="card-back-input" class="goal-input" rows="2"></textarea>
            </label>
            <p class="quick-add-error" id="card-form-error" hidden></p>
            <div class="quick-add-actions">
              <button type="button" class="ft-btn" id="card-cancel-edit-btn" hidden>Cancelar edición</button>
              <button type="button" class="btn-primary" id="card-save-btn">+ Añadir tarjeta</button>
            </div>
          </div>

          <ul class="settings-checklist-list" id="card-list"></ul>
        </div>
      </div>
    </section>
  `;

  const els = {
    loading: container.querySelector("#deck-edit-loading"),
    form: container.querySelector("#deck-edit-form"),
    title: container.querySelector("#deck-title-input"),
    subjectChips: container.querySelector("#deck-subject-chips"),
    infoError: container.querySelector("#deck-info-error"),
    backBtn: container.querySelector("#deck-back-btn"),
    saveInfoBtn: container.querySelector("#deck-save-info-btn"),
    cardsBlock: container.querySelector("#deck-cards-block"),
    frontInput: container.querySelector("#card-front-input"),
    backInput: container.querySelector("#card-back-input"),
    cardFormError: container.querySelector("#card-form-error"),
    cardCancelEditBtn: container.querySelector("#card-cancel-edit-btn"),
    cardSaveBtn: container.querySelector("#card-save-btn"),
    cardList: container.querySelector("#card-list"),
  };

  const rerenderSubjectChips = makeChipGroup(
    els.subjectChips,
    () => SUBJECTS,
    () => state.subject,
    (v) => {
      state.subject = v;
    },
    { toggleOff: true }
  );

  els.backBtn.addEventListener("click", () => nav.goTo("list"));

  els.saveInfoBtn.addEventListener("click", async () => {
    const title = els.title.value.trim();
    els.infoError.hidden = true;
    if (!title) {
      els.infoError.textContent = "Ponle un nombre al mazo.";
      els.infoError.hidden = false;
      return;
    }

    els.saveInfoBtn.disabled = true;
    try {
      if (state.deckId) {
        await updateDeck(state.deckId, { title, subjectTag: state.subject });
      } else {
        const deck = await createDeck({ title, subjectTag: state.subject });
        state.deckId = deck.id;
        els.saveInfoBtn.textContent = "Guardar cambios";
        els.cardsBlock.hidden = false;
      }
    } catch (err) {
      console.error(err);
      els.infoError.textContent = "No se pudo guardar el mazo. Inténtalo de nuevo.";
      els.infoError.hidden = false;
    } finally {
      els.saveInfoBtn.disabled = false;
    }
  });

  function renderCardList() {
    if (state.cards.length === 0) {
      els.cardList.innerHTML = `<li class="task-list-empty">Sin tarjetas todavía. Añade la primera arriba.</li>`;
      return;
    }
    els.cardList.innerHTML = state.cards
      .map(
        (card) => `
          <li class="settings-checklist-row flashcard-row" data-card-id="${card.id}">
            <span class="flashcard-row-text"><strong>${escapeHtml(card.front)}</strong> — ${escapeHtml(card.back)}</span>
            <span class="flashcard-row-actions">
              <button type="button" class="ft-icon-btn" data-action="edit-card" aria-label="Editar tarjeta">✏️</button>
              <button type="button" class="ft-icon-btn" data-action="delete-card" aria-label="Eliminar tarjeta">🗑️</button>
            </span>
          </li>
        `
      )
      .join("");

    els.cardList.querySelectorAll('[data-action="edit-card"]').forEach((btn) => {
      btn.addEventListener("click", () => {
        const cardId = btn.closest("[data-card-id]").dataset.cardId;
        const card = state.cards.find((c) => c.id === cardId);
        state.editingCardId = cardId;
        els.frontInput.value = card.front;
        els.backInput.value = card.back;
        els.cardSaveBtn.textContent = "Guardar tarjeta";
        els.cardCancelEditBtn.hidden = false;
        els.frontInput.focus();
      });
    });

    els.cardList.querySelectorAll('[data-action="delete-card"]').forEach((btn) => {
      btn.addEventListener("click", async () => {
        const cardId = btn.closest("[data-card-id]").dataset.cardId;
        if (!window.confirm("¿Eliminar esta tarjeta?")) return;
        try {
          await deleteCard(cardId);
          state.cards = state.cards.filter((c) => c.id !== cardId);
          renderCardList();
        } catch (err) {
          console.error(err);
          window.alert("No se pudo eliminar la tarjeta.");
        }
      });
    });
  }

  function resetCardForm() {
    state.editingCardId = null;
    els.frontInput.value = "";
    els.backInput.value = "";
    els.cardSaveBtn.textContent = "+ Añadir tarjeta";
    els.cardCancelEditBtn.hidden = true;
  }

  els.cardCancelEditBtn.addEventListener("click", resetCardForm);

  els.cardSaveBtn.addEventListener("click", async () => {
    const front = els.frontInput.value.trim();
    const back = els.backInput.value.trim();
    els.cardFormError.hidden = true;
    if (!front || !back) {
      els.cardFormError.textContent = "Rellena el anverso y el reverso.";
      els.cardFormError.hidden = false;
      return;
    }

    els.cardSaveBtn.disabled = true;
    try {
      if (state.editingCardId) {
        const updated = await updateCard(state.editingCardId, { front, back });
        state.cards = state.cards.map((c) => (c.id === updated.id ? updated : c));
      } else {
        const created = await createCard(state.deckId, { front, back });
        state.cards.push(created);
      }
      resetCardForm();
      renderCardList();
    } catch (err) {
      console.error(err);
      els.cardFormError.textContent = "No se pudo guardar la tarjeta. Inténtalo de nuevo.";
      els.cardFormError.hidden = false;
    } finally {
      els.cardSaveBtn.disabled = false;
    }
  });

  if (isEdit) {
    try {
      const [deck, cards] = await Promise.all([fetchDeck(deckId), fetchCards(deckId)]);
      state.title = deck.title;
      state.subject = deck.subject_tag;
      state.cards = cards;

      els.title.value = state.title;
      rerenderSubjectChips();
      renderCardList();

      els.loading.hidden = true;
      els.form.hidden = false;
    } catch (err) {
      console.error(err);
      els.loading.textContent = "No se pudo cargar el mazo.";
    }
  } else {
    renderCardList();
  }
}
