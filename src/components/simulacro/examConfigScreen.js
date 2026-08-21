import { SUBJECTS, BREVET_SUBJECTS, isBrevetSubject } from "../../lib/tags.js";
import { makeChipGroup } from "../../lib/chipGroup.js";
import { escapeHtml } from "../../lib/escapeHtml.js";
import {
  fetchExamSimulation,
  createExamSimulation,
  updateExamSimulation,
  replaceExamPdf,
  uploadCorrectionPdf,
} from "../../lib/examApi.js";

function toLocalDatetimeInputValue(isoString) {
  const d = new Date(isoString);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export async function renderExamConfigScreen(container, nav, examId) {
  const isEdit = Boolean(examId);

  const state = {
    title: "",
    brevet: false,
    subject: null,
    durationMin: 60,
    scheduledAtLocal: "",
    neededItems: [],
    rulesText: "",
    pdfFile: null,
    existingPdfName: null,
    correctionPdfFile: null,
    existingCorrectionPdfName: null,
    loading: isEdit,
  };

  container.innerHTML = `
    <section class="view-simulacro fx-fade-in" aria-labelledby="exam-config-title">
      <h1 id="exam-config-title">${isEdit ? "Editar simulacro" : "Nuevo simulacro"}</h1>

      <p class="stats-loading" id="exam-config-loading" ${isEdit ? "" : "hidden"}>Cargando…</p>

      <div id="exam-config-form" ${isEdit ? "hidden" : ""}>
        <div class="setup-block">
          <h2>Datos generales</h2>
          <label class="ajustes-field" style="max-width: none">
            Nombre del simulacro
            <input type="text" id="exam-title-input" placeholder="Ej. Simulacro Brevet Matemáticas #2" />
          </label>

          <label class="brevet-toggle">
            <input type="checkbox" id="exam-brevet-checkbox" />
            Brevet
          </label>
          <div class="chip-grid" id="exam-subject-chips"></div>

          <div class="mode-config-row" style="margin-top: 1.1rem">
            <label>
              Duración (min)
              <input type="number" min="1" max="600" id="exam-duration-input" value="60" />
            </label>
            <label>
              Fecha/hora programada (opcional)
              <input type="datetime-local" id="exam-scheduled-input" />
            </label>
          </div>
        </div>

        <div class="setup-block">
          <h2>Cosas necesarias</h2>
          <ul class="settings-checklist-list" id="exam-items-editor"></ul>
          <div class="checklist-add-row">
            <input type="text" id="exam-new-item-input" placeholder="Ej. Calculadora…" />
            <button type="button" class="ft-btn" id="exam-add-item-btn">+ Añadir</button>
          </div>
        </div>

        <div class="setup-block">
          <h2>Reglas del examen</h2>
          <textarea id="exam-rules-input" class="goal-input" rows="4" placeholder="Reglas, material permitido, etc. (opcional)"></textarea>
        </div>

        <div class="setup-block">
          <h2>PDF del enunciado</h2>
          <p class="stats-subtitle" id="exam-pdf-current" style="margin-top:0"></p>
          <input type="file" id="exam-pdf-input" accept="application/pdf" />
        </div>

        <div class="setup-block">
          <h2>PDF de corrección (opcional)</h2>
          <p class="stats-subtitle" style="margin-top:0">
            Si ya la tienes, súbela ahora — se guarda aparte y no se muestra durante el examen, solo al corregir.
          </p>
          <p class="stats-subtitle" id="exam-correction-pdf-current" style="margin-top:0"></p>
          <input type="file" id="exam-correction-pdf-input" accept="application/pdf" />
          <p class="quick-add-error" id="exam-config-error" hidden></p>
        </div>

        <div class="quick-add-actions">
          <button type="button" class="ft-btn" id="exam-cancel-btn">Cancelar</button>
          <button type="button" class="btn-primary" id="exam-save-btn">${isEdit ? "Guardar cambios" : "Crear simulacro"}</button>
        </div>
      </div>
    </section>
  `;

  const els = {
    loading: container.querySelector("#exam-config-loading"),
    form: container.querySelector("#exam-config-form"),
    title: container.querySelector("#exam-title-input"),
    brevetCheckbox: container.querySelector("#exam-brevet-checkbox"),
    subjectChips: container.querySelector("#exam-subject-chips"),
    duration: container.querySelector("#exam-duration-input"),
    scheduled: container.querySelector("#exam-scheduled-input"),
    itemsEditor: container.querySelector("#exam-items-editor"),
    newItemInput: container.querySelector("#exam-new-item-input"),
    addItemBtn: container.querySelector("#exam-add-item-btn"),
    rules: container.querySelector("#exam-rules-input"),
    pdfCurrent: container.querySelector("#exam-pdf-current"),
    pdfInput: container.querySelector("#exam-pdf-input"),
    correctionPdfCurrent: container.querySelector("#exam-correction-pdf-current"),
    correctionPdfInput: container.querySelector("#exam-correction-pdf-input"),
    errorEl: container.querySelector("#exam-config-error"),
    cancelBtn: container.querySelector("#exam-cancel-btn"),
    saveBtn: container.querySelector("#exam-save-btn"),
  };

  const rerenderSubjectChips = makeChipGroup(
    els.subjectChips,
    () => (state.brevet ? BREVET_SUBJECTS : SUBJECTS),
    () => state.subject,
    (v) => {
      state.subject = v;
    }
  );

  els.brevetCheckbox.addEventListener("change", (e) => {
    state.brevet = e.target.checked;
    state.subject = null;
    rerenderSubjectChips();
  });

  function renderItemsEditor() {
    if (state.neededItems.length === 0) {
      els.itemsEditor.innerHTML = `<li class="task-list-empty">Sin ítems todavía.</li>`;
      return;
    }
    els.itemsEditor.innerHTML = state.neededItems
      .map(
        (item, i) => `
          <li class="settings-checklist-row" data-index="${i}">
            <span>${escapeHtml(item)}</span>
            <button type="button" class="ft-icon-btn" data-action="remove" aria-label="Eliminar ítem">🗑️</button>
          </li>
        `
      )
      .join("");

    els.itemsEditor.querySelectorAll('[data-action="remove"]').forEach((btn) => {
      btn.addEventListener("click", () => {
        const i = Number(btn.closest("[data-index]").dataset.index);
        state.neededItems.splice(i, 1);
        renderItemsEditor();
      });
    });
  }

  function addItem() {
    const value = els.newItemInput.value.trim();
    if (!value) return;
    state.neededItems.push(value);
    els.newItemInput.value = "";
    renderItemsEditor();
  }

  els.addItemBtn.addEventListener("click", addItem);
  els.newItemInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addItem();
    }
  });

  els.pdfInput.addEventListener("change", (e) => {
    state.pdfFile = e.target.files[0] || null;
  });

  els.correctionPdfInput.addEventListener("change", (e) => {
    state.correctionPdfFile = e.target.files[0] || null;
  });

  els.cancelBtn.addEventListener("click", () => nav.goTo("list"));

  els.saveBtn.addEventListener("click", async () => {
    const title = els.title.value.trim();
    const durationMin = Number(els.duration.value) || null;
    els.errorEl.hidden = true;

    if (!title || !state.subject) {
      els.errorEl.textContent = "Escribe un nombre y elige una asignatura.";
      els.errorEl.hidden = false;
      return;
    }
    if (!isEdit && !state.pdfFile) {
      els.errorEl.textContent = "El PDF del enunciado es obligatorio para crear el simulacro.";
      els.errorEl.hidden = false;
      return;
    }

    const scheduledAt = els.scheduled.value ? new Date(els.scheduled.value).toISOString() : null;

    els.saveBtn.disabled = true;
    try {
      if (isEdit) {
        await updateExamSimulation(examId, {
          title,
          subjectTag: state.subject,
          extraTags: null,
          scheduledAt,
          durationMin,
          neededItems: state.neededItems,
          rulesText: els.rules.value.trim(),
        });
        if (state.pdfFile) await replaceExamPdf(examId, state.pdfFile);
        if (state.correctionPdfFile) await uploadCorrectionPdf(examId, state.correctionPdfFile);
      } else {
        await createExamSimulation({
          title,
          subjectTag: state.subject,
          extraTags: null,
          scheduledAt,
          durationMin,
          neededItems: state.neededItems,
          rulesText: els.rules.value.trim(),
          pdfFile: state.pdfFile,
          correctionPdfFile: state.correctionPdfFile,
        });
      }
      nav.goTo("list");
    } catch (err) {
      console.error(err);
      els.errorEl.textContent = "No se pudo guardar el simulacro. Inténtalo de nuevo.";
      els.errorEl.hidden = false;
      els.saveBtn.disabled = false;
    }
  });

  renderItemsEditor();

  if (isEdit) {
    try {
      const exam = await fetchExamSimulation(examId);
      state.title = exam.title;
      state.brevet = isBrevetSubject(exam.subject_tag);
      state.subject = exam.subject_tag;
      state.durationMin = exam.duration_min || 60;
      state.neededItems = exam.needed_items || [];
      state.existingPdfName = exam.pdf_storage_path ? exam.pdf_storage_path.split("/").pop() : null;
      state.existingCorrectionPdfName = exam.correction_pdf_storage_path
        ? exam.correction_pdf_storage_path.split("/").pop()
        : null;

      els.title.value = state.title;
      els.brevetCheckbox.checked = state.brevet;
      rerenderSubjectChips();
      els.duration.value = state.durationMin;
      if (exam.scheduled_at) els.scheduled.value = toLocalDatetimeInputValue(exam.scheduled_at);
      els.rules.value = exam.rules_text || "";
      els.pdfCurrent.textContent = state.existingPdfName
        ? `PDF actual: ${state.existingPdfName}. Sube uno nuevo solo si quieres reemplazarlo.`
        : "";
      els.correctionPdfCurrent.textContent = state.existingCorrectionPdfName
        ? `PDF actual: ${state.existingCorrectionPdfName}. Sube uno nuevo solo si quieres reemplazarlo.`
        : "";
      renderItemsEditor();

      els.loading.hidden = true;
      els.form.hidden = false;
    } catch (err) {
      console.error(err);
      els.loading.textContent = "No se pudo cargar el simulacro.";
    }
  }
}
