import { fetchExamSimulation, getSignedPdfUrl, uploadCorrectionPdf, saveCorrection } from "../../lib/examApi.js";
import { mountPdfViewer } from "../../lib/pdfViewer.js";
import { getGradeComment } from "../../lib/examStatsCalc.js";
import { escapeHtml } from "../../lib/escapeHtml.js";

const ERROR_TYPES = [
  "No sabía la teoría",
  "Error de cálculo",
  "Despiste",
  "Falta de tiempo",
  "No entendí el enunciado",
  "Confundí conceptos similares",
  "Nervios / estrés",
  "No repasé la respuesta",
  "Dejé la pregunta en blanco",
  "Otro",
];

export async function renderExamCorrectionScreen(container, nav, examId) {
  container.innerHTML = `<p class="stats-loading">Cargando…</p>`;

  let exam;
  try {
    exam = await fetchExamSimulation(examId);
  } catch (err) {
    console.error(err);
    container.innerHTML = `<p class="task-list-empty">No se pudo cargar el simulacro.</p>`;
    return;
  }

  const state = {
    errors: [],
    activeTab: "correccion",
    pdfViewerHandle: null,
  };

  render();

  function render() {
    const hasCorrectionPdf = Boolean(exam.correction_pdf_storage_path);

    container.innerHTML = `
      <section class="view-simulacro fx-fade-in" aria-labelledby="exam-correction-title">
        <h1 id="exam-correction-title">Corregir: ${escapeHtml(exam.title)}</h1>

        ${
          !hasCorrectionPdf
            ? `
          <div class="setup-block">
            <h2>PDF de corrección</h2>
            <p class="stats-subtitle" style="margin-top:0">Súbelo para poder consultar la corrección mientras registras los errores.</p>
            <input type="file" id="correction-pdf-input" accept="application/pdf" />
            <p class="quick-add-error" id="correction-upload-error" hidden></p>
          </div>
        `
            : `
          <div class="pdf-tabs">
            <button type="button" class="range-btn ${state.activeTab === "correccion" ? "active" : ""}" data-tab="correccion">Corrección</button>
            <button type="button" class="range-btn ${state.activeTab === "enunciado" ? "active" : ""}" data-tab="enunciado">Enunciado</button>
          </div>
          <div class="exam-correction-pdf" id="exam-correction-pdf"></div>

          <div class="setup-block">
            <h2>Errores registrados</h2>
            <p class="stats-subtitle" style="margin-top:0">Uno por cada pregunta o bloque fallado o parcial.</p>
            <div id="errors-editor"></div>
            <button type="button" class="ft-btn" id="add-error-btn">+ Añadir error</button>
          </div>

          <div class="setup-block">
            <h2>Nota final</h2>
            <div class="exam-grade-row">
              <input type="number" min="0" step="0.01" id="final-grade-input" class="exam-grade-input" placeholder="Nota" />
              <span class="exam-grade-slash">/</span>
              <input type="number" min="1" step="0.01" id="grade-out-of-input" class="exam-grade-input" value="20" />
            </div>
            <p class="exam-grade-comment" id="grade-comment"></p>
          </div>

          <p class="quick-add-error" id="save-correction-error" hidden></p>
          <div class="quick-add-actions">
            <button type="button" class="ft-btn" id="correction-cancel-btn">Volver a la lista</button>
            <button type="button" class="btn-primary" id="save-correction-btn">Guardar corrección</button>
          </div>
        `
        }
      </section>
    `;

    if (!hasCorrectionPdf) {
      wireUploadStep();
    } else {
      wireCorrectionStep();
    }
  }

  function wireUploadStep() {
    const input = container.querySelector("#correction-pdf-input");
    const errorEl = container.querySelector("#correction-upload-error");
    input.addEventListener("change", async () => {
      const file = input.files[0];
      if (!file) return;
      try {
        const path = await uploadCorrectionPdf(exam.id, file);
        exam.correction_pdf_storage_path = path;
        render();
      } catch (err) {
        console.error(err);
        errorEl.textContent = "No se pudo subir el PDF. Inténtalo de nuevo.";
        errorEl.hidden = false;
      }
    });
  }

  async function wireCorrectionStep() {
    container.querySelectorAll("[data-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.activeTab = btn.dataset.tab;
        render();
      });
    });

    container.querySelector("#correction-cancel-btn").addEventListener("click", () => nav.goTo("list"));

    const gradeInputEl = container.querySelector("#final-grade-input");
    const gradeOutOfInputEl = container.querySelector("#grade-out-of-input");
    const gradeCommentEl = container.querySelector("#grade-comment");

    function updateGradeComment() {
      const finalGrade = gradeInputEl.value === "" ? null : Number(gradeInputEl.value);
      const gradeOutOf = gradeOutOfInputEl.value === "" ? null : Number(gradeOutOfInputEl.value);
      gradeCommentEl.textContent = getGradeComment(finalGrade, gradeOutOf);
    }

    gradeInputEl.addEventListener("input", updateGradeComment);
    gradeOutOfInputEl.addEventListener("input", updateGradeComment);
    updateGradeComment();

    renderErrorsEditor();
    container.querySelector("#add-error-btn").addEventListener("click", () => {
      state.errors.push({ topic: "", errorType: ERROR_TYPES[0], comment: "" });
      renderErrorsEditor();
    });

    container.querySelector("#save-correction-btn").addEventListener("click", async () => {
      const gradeInput = container.querySelector("#final-grade-input");
      const gradeOutOfInput = container.querySelector("#grade-out-of-input");
      const errorEl = container.querySelector("#save-correction-error");
      const finalGrade = gradeInput.value === "" ? null : Number(gradeInput.value);
      const gradeOutOf = gradeOutOfInput.value === "" ? null : Number(gradeOutOfInput.value);
      errorEl.hidden = true;

      if (finalGrade === null || Number.isNaN(finalGrade)) {
        errorEl.textContent = "Introduce la nota final.";
        errorEl.hidden = false;
        return;
      }
      if (gradeOutOf === null || Number.isNaN(gradeOutOf) || gradeOutOf <= 0) {
        errorEl.textContent = "Introduce sobre cuánto se puntúa (ej. 20, 40, 5).";
        errorEl.hidden = false;
        return;
      }

      try {
        await saveCorrection(exam.id, { finalGrade, gradeOutOf, errors: state.errors });
        nav.goTo("detail", exam.id);
      } catch (err) {
        console.error(err);
        errorEl.textContent = "No se pudo guardar la corrección. Inténtalo de nuevo.";
        errorEl.hidden = false;
      }
    });

    const pdfPath = state.activeTab === "correccion" ? exam.correction_pdf_storage_path : exam.pdf_storage_path;
    const pdfContainer = container.querySelector("#exam-correction-pdf");
    if (!pdfPath) {
      pdfContainer.innerHTML = `<p class="pdf-viewer-status">No hay PDF disponible en esta pestaña.</p>`;
      return;
    }
    try {
      const url = await getSignedPdfUrl(pdfPath);
      await mountPdfViewer(pdfContainer, url);
    } catch (err) {
      console.error(err);
      pdfContainer.innerHTML = `<p class="pdf-viewer-status">No se pudo cargar el PDF: ${err.message || err}</p>`;
    }
  }

  function renderErrorsEditor() {
    const editor = container.querySelector("#errors-editor");
    if (state.errors.length === 0) {
      editor.innerHTML = `<p class="task-list-empty">Sin errores registrados. Añade uno si hiciste falta.</p>`;
      return;
    }

    editor.innerHTML = state.errors
      .map(
        (e, i) => `
          <div class="exam-error-row" data-index="${i}">
            <input type="text" class="exam-error-topic" placeholder="Tema/pregunta" value="${escapeHtml(e.topic)}" />
            <select class="exam-error-type">
              ${ERROR_TYPES.map((t) => `<option value="${t}" ${e.errorType === t ? "selected" : ""}>${t}</option>`).join("")}
            </select>
            <input type="text" class="exam-error-comment" placeholder="Comentario (opcional)" value="${escapeHtml(e.comment)}" />
            <button type="button" class="ft-icon-btn" data-action="remove-error" aria-label="Eliminar error">🗑️</button>
          </div>
        `
      )
      .join("");

    editor.querySelectorAll(".exam-error-row").forEach((row) => {
      const i = Number(row.dataset.index);
      row.querySelector(".exam-error-topic").addEventListener("input", (e) => {
        state.errors[i].topic = e.target.value;
      });
      row.querySelector(".exam-error-type").addEventListener("change", (e) => {
        state.errors[i].errorType = e.target.value;
      });
      row.querySelector(".exam-error-comment").addEventListener("input", (e) => {
        state.errors[i].comment = e.target.value;
      });
      row.querySelector('[data-action="remove-error"]').addEventListener("click", () => {
        state.errors.splice(i, 1);
        renderErrorsEditor();
      });
    });
  }
}
