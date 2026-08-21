import { fetchTrimesters, saveTrimester } from "../../lib/trimestersApi.js";
import { fetchUserSettings, saveUserSettings, resetAllStudyData } from "../../lib/settingsApi.js";
import { escapeHtml } from "../../lib/escapeHtml.js";

const TRIMESTER_LABELS = { 1: "1er trimestre", 2: "2º trimestre", 3: "3er trimestre" };
const RESET_CONFIRM_WORD = "BORRAR";

function currentAcademicYearGuess() {
  const now = new Date();
  const year = now.getFullYear();
  // De agosto en adelante se considera que empieza el curso siguiente.
  const startYear = now.getMonth() >= 7 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
}

export function renderSettingsView(container) {
  const state = {
    academicYear: currentAcademicYearGuess(),
    trimesters: { 1: { start: "", end: "" }, 2: { start: "", end: "" }, 3: { start: "", end: "" } },
    checklistItems: [],
  };

  container.innerHTML = `
    <section class="view-ajustes fx-fade-in" aria-labelledby="ajustes-title">
      <h1 id="ajustes-title">Ajustes</h1>

      <div class="setup-block">
        <h2>Trimestres del curso</h2>
        <label class="ajustes-field">
          Curso académico
          <input type="text" id="academic-year-input" placeholder="2025-2026" />
        </label>
        <div class="trimester-rows" id="trimester-rows"></div>
        <p class="goal-save-status" id="trimesters-status"></p>
      </div>

      <div class="setup-block">
        <h2>Modos de estudio por defecto</h2>
        <div class="mode-config-row">
          <label>
            Pomodoro trabajo (min)
            <input type="number" min="1" max="180" id="pomodoro-work-input" />
          </label>
          <label>
            Pomodoro descanso (min)
            <input type="number" min="1" max="60" id="pomodoro-break-input" />
          </label>
        </div>
        <div class="mode-config-row">
          <label>
            52-17 trabajo (min)
            <input type="number" min="1" max="180" id="c5217-work-input" />
          </label>
          <label>
            52-17 descanso (min)
            <input type="number" min="1" max="60" id="c5217-break-input" />
          </label>
        </div>
        <p class="goal-save-status" id="modes-status"></p>
      </div>

      <div class="setup-block">
        <h2>Checklist de "Antes de empezar"</h2>
        <ul class="settings-checklist-list" id="checklist-editor"></ul>
        <div class="checklist-add-row">
          <input type="text" id="new-checklist-item" placeholder="Nuevo ítem…" />
          <button type="button" class="ft-btn" id="add-checklist-item-btn">+ Añadir</button>
        </div>
        <p class="goal-save-status" id="checklist-status"></p>
      </div>

      <div class="setup-block setup-block-danger">
        <h2>Zona de peligro</h2>
        <p class="danger-zone-desc">
          Borra permanentemente todas tus sesiones de estudio, tareas del día, objetivos diarios, simulacros de
          examen y la firma del contrato (vuelve a quedar sin firmar). No afecta a estos ajustes. Esta acción no se
          puede deshacer.
        </p>
        <button type="button" class="ft-btn ft-btn-end" id="open-reset-modal-btn">
          Borrar todos los datos de estadísticas
        </button>
      </div>

      <div class="modal-overlay" id="reset-modal" hidden>
        <div class="modal-backdrop" id="reset-modal-backdrop"></div>
        <div class="modal-content confirm-modal-content" role="dialog" aria-modal="true" aria-labelledby="reset-title">
          <h2 id="reset-title">¿Borrar todos los datos?</h2>
          <p>
            Esto elimina para siempre todas tus sesiones de estudio, tareas, objetivos del día, simulacros de
            examen y la firma del contrato. <strong>No se puede deshacer.</strong>
          </p>
          <p>
            Escribe <strong>${RESET_CONFIRM_WORD}</strong> para confirmar.
          </p>
          <input type="text" id="reset-confirm-input" class="goal-input" placeholder="${RESET_CONFIRM_WORD}" />
          <p class="quick-add-error" id="reset-error" hidden>No se pudo borrar. Inténtalo de nuevo.</p>
          <div class="quick-add-actions">
            <button type="button" class="ft-btn" id="reset-cancel-btn">Cancelar</button>
            <button type="button" class="ft-btn ft-btn-end" id="reset-confirm-btn" disabled>Borrar definitivamente</button>
          </div>
        </div>
      </div>
    </section>
  `;

  const els = {
    academicYearInput: container.querySelector("#academic-year-input"),
    trimesterRows: container.querySelector("#trimester-rows"),
    trimestersStatus: container.querySelector("#trimesters-status"),
    pomodoroWork: container.querySelector("#pomodoro-work-input"),
    pomodoroBreak: container.querySelector("#pomodoro-break-input"),
    c5217Work: container.querySelector("#c5217-work-input"),
    c5217Break: container.querySelector("#c5217-break-input"),
    modesStatus: container.querySelector("#modes-status"),
    checklistEditor: container.querySelector("#checklist-editor"),
    newChecklistItem: container.querySelector("#new-checklist-item"),
    addChecklistBtn: container.querySelector("#add-checklist-item-btn"),
    checklistStatus: container.querySelector("#checklist-status"),
    openResetBtn: container.querySelector("#open-reset-modal-btn"),
    resetModal: container.querySelector("#reset-modal"),
    resetBackdrop: container.querySelector("#reset-modal-backdrop"),
    resetInput: container.querySelector("#reset-confirm-input"),
    resetConfirmBtn: container.querySelector("#reset-confirm-btn"),
    resetCancelBtn: container.querySelector("#reset-cancel-btn"),
    resetError: container.querySelector("#reset-error"),
  };

  // ---- Trimestres ----
  function renderTrimesterRows() {
    els.trimesterRows.innerHTML = [1, 2, 3]
      .map(
        (n) => `
          <div class="trimester-row">
            <span class="trimester-row-label">${TRIMESTER_LABELS[n]}</span>
            <label>
              Inicio
              <input type="date" data-trimester="${n}" data-field="start" value="${state.trimesters[n].start}" />
            </label>
            <label>
              Fin
              <input type="date" data-trimester="${n}" data-field="end" value="${state.trimesters[n].end}" />
            </label>
          </div>
        `
      )
      .join("");

    els.trimesterRows.querySelectorAll("input[type=date]").forEach((input) => {
      input.addEventListener("change", () => {
        const n = Number(input.dataset.trimester);
        state.trimesters[n][input.dataset.field] = input.value;
        saveTrimesterRow(n);
      });
    });
  }

  let trimesterSaveTimeout = null;
  function saveTrimesterRow(n) {
    const row = state.trimesters[n];
    if (!row.start || !row.end || !state.academicYear.trim()) return;
    els.trimestersStatus.textContent = "Guardando…";
    clearTimeout(trimesterSaveTimeout);
    trimesterSaveTimeout = setTimeout(async () => {
      try {
        await saveTrimester({
          trimesterNumber: n,
          academicYear: state.academicYear.trim(),
          startDate: row.start,
          endDate: row.end,
        });
        els.trimestersStatus.textContent = "Guardado";
        setTimeout(() => {
          if (els.trimestersStatus.textContent === "Guardado") els.trimestersStatus.textContent = "";
        }, 1500);
      } catch (err) {
        els.trimestersStatus.textContent = "No se pudo guardar";
        console.error(err);
      }
    }, 500);
  }

  els.academicYearInput.addEventListener("change", () => {
    state.academicYear = els.academicYearInput.value;
    [1, 2, 3].forEach((n) => saveTrimesterRow(n));
  });

  // ---- Modos de estudio por defecto ----
  let modesSaveTimeout = null;
  function scheduleModesSave() {
    els.modesStatus.textContent = "Guardando…";
    clearTimeout(modesSaveTimeout);
    modesSaveTimeout = setTimeout(async () => {
      try {
        await saveUserSettings({
          default_pomodoro_work_min: Number(els.pomodoroWork.value) || 25,
          default_pomodoro_break_min: Number(els.pomodoroBreak.value) || 5,
          default_5217_work_min: Number(els.c5217Work.value) || 52,
          default_5217_break_min: Number(els.c5217Break.value) || 17,
        });
        els.modesStatus.textContent = "Guardado";
        setTimeout(() => {
          if (els.modesStatus.textContent === "Guardado") els.modesStatus.textContent = "";
        }, 1500);
      } catch (err) {
        els.modesStatus.textContent = "No se pudo guardar";
        console.error(err);
      }
    }, 600);
  }

  [els.pomodoroWork, els.pomodoroBreak, els.c5217Work, els.c5217Break].forEach((input) => {
    input.addEventListener("input", scheduleModesSave);
  });

  // ---- Checklist personalizable ----
  function renderChecklistEditor() {
    if (state.checklistItems.length === 0) {
      els.checklistEditor.innerHTML = `<li class="task-list-empty">No hay ítems. Añade uno abajo.</li>`;
      return;
    }
    els.checklistEditor.innerHTML = state.checklistItems
      .map(
        (item, i) => `
          <li class="settings-checklist-row" data-index="${i}">
            <span>${escapeHtml(item)}</span>
            <button type="button" class="ft-icon-btn" data-action="remove-checklist-item" aria-label="Eliminar ítem">🗑️</button>
          </li>
        `
      )
      .join("");

    els.checklistEditor.querySelectorAll('[data-action="remove-checklist-item"]').forEach((btn) => {
      btn.addEventListener("click", () => {
        const i = Number(btn.closest("[data-index]").dataset.index);
        state.checklistItems.splice(i, 1);
        renderChecklistEditor();
        saveChecklist();
      });
    });
  }

  async function saveChecklist() {
    els.checklistStatus.textContent = "Guardando…";
    try {
      await saveUserSettings({ checklist_items: state.checklistItems });
      els.checklistStatus.textContent = "Guardado";
      setTimeout(() => {
        if (els.checklistStatus.textContent === "Guardado") els.checklistStatus.textContent = "";
      }, 1500);
    } catch (err) {
      els.checklistStatus.textContent = "No se pudo guardar";
      console.error(err);
    }
  }

  function addChecklistItem() {
    const value = els.newChecklistItem.value.trim();
    if (!value) return;
    state.checklistItems.push(value);
    els.newChecklistItem.value = "";
    renderChecklistEditor();
    saveChecklist();
  }

  els.addChecklistBtn.addEventListener("click", addChecklistItem);
  els.newChecklistItem.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addChecklistItem();
    }
  });

  // ---- Zona de peligro ----
  function openResetModal() {
    els.resetInput.value = "";
    els.resetConfirmBtn.disabled = true;
    els.resetError.hidden = true;
    els.resetModal.hidden = false;
  }

  function closeResetModal() {
    els.resetModal.hidden = true;
  }

  els.openResetBtn.addEventListener("click", openResetModal);
  els.resetCancelBtn.addEventListener("click", closeResetModal);
  els.resetBackdrop.addEventListener("click", closeResetModal);

  els.resetInput.addEventListener("input", () => {
    els.resetConfirmBtn.disabled = els.resetInput.value !== RESET_CONFIRM_WORD;
  });

  els.resetConfirmBtn.addEventListener("click", async () => {
    els.resetConfirmBtn.disabled = true;
    els.resetError.hidden = true;
    try {
      await resetAllStudyData();
      closeResetModal();
    } catch (err) {
      els.resetError.hidden = false;
      els.resetConfirmBtn.disabled = false;
      console.error(err);
    }
  });

  // ---- Carga inicial ----
  renderTrimesterRows();
  renderChecklistEditor();
  els.academicYearInput.value = state.academicYear;

  fetchTrimesters()
    .then((rows) => {
      let year = state.academicYear;
      const latest = rows[rows.length - 1];
      if (latest) year = latest.academic_year;
      const rowsForYear = rows.filter((r) => r.academic_year === year);
      rowsForYear.forEach((r) => {
        state.trimesters[r.trimester_number] = { start: r.start_date, end: r.end_date };
      });
      if (rowsForYear.length > 0) state.academicYear = year;
      els.academicYearInput.value = state.academicYear;
      renderTrimesterRows();
    })
    .catch((err) => console.error(err));

  fetchUserSettings()
    .then((settings) => {
      els.pomodoroWork.value = settings.default_pomodoro_work_min;
      els.pomodoroBreak.value = settings.default_pomodoro_break_min;
      els.c5217Work.value = settings.default_5217_work_min;
      els.c5217Break.value = settings.default_5217_break_min;
      state.checklistItems = [...settings.checklist_items];
      renderChecklistEditor();
    })
    .catch((err) => console.error(err));
}
