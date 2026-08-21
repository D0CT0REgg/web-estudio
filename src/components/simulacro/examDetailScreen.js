import { fetchExamSimulation, fetchExamErrors, getSignedPdfUrl } from "../../lib/examApi.js";
import { mountPdfViewer } from "../../lib/pdfViewer.js";
import { getGradeComment } from "../../lib/examStatsCalc.js";
import { escapeHtml } from "../../lib/escapeHtml.js";

export async function renderExamDetailScreen(container, nav, examId) {
  container.innerHTML = `<p class="stats-loading">Cargando…</p>`;

  let exam;
  let errors;
  try {
    [exam, errors] = await Promise.all([fetchExamSimulation(examId), fetchExamErrors(examId)]);
  } catch (err) {
    console.error(err);
    container.innerHTML = `<p class="task-list-empty">No se pudo cargar el simulacro.</p>`;
    return;
  }

  const state = { activeTab: "correccion" };

  render();

  function render() {
    container.innerHTML = `
      <section class="view-simulacro fx-fade-in" aria-labelledby="exam-detail-title">
        <h1 id="exam-detail-title">${escapeHtml(exam.title)}</h1>

        <div class="setup-block">
          <div class="exam-detail-grade">${
            exam.final_grade ?? "—"
          }${exam.final_grade != null ? `<span class="exam-detail-grade-outof">/${exam.grade_out_of ?? 20}</span>` : ""}</div>
          ${
            exam.final_grade != null
              ? `<p class="exam-grade-comment" style="text-align:center">${escapeHtml(getGradeComment(exam.final_grade, exam.grade_out_of ?? 20))}</p>`
              : ""
          }
          <p class="stats-subtitle" style="margin-top:0; text-align:center">
            ${exam.subject_tag ? escapeHtml(exam.subject_tag) + " · " : ""}${
      exam.ended_at ? new Date(exam.ended_at).toLocaleDateString("es-ES") : ""
    }
          </p>
        </div>

        <div class="pdf-tabs">
          <button type="button" class="range-btn ${state.activeTab === "correccion" ? "active" : ""}" data-tab="correccion">Corrección</button>
          <button type="button" class="range-btn ${state.activeTab === "enunciado" ? "active" : ""}" data-tab="enunciado">Enunciado</button>
        </div>
        <div class="exam-correction-pdf" id="exam-detail-pdf"></div>

        <div class="setup-block">
          <h2>Errores registrados (${errors.length})</h2>
          ${
            errors.length === 0
              ? `<p class="task-list-empty">No se registró ningún error.</p>`
              : `<div class="exam-error-list-readonly">
                  ${errors
                    .map(
                      (e) => `
                        <div class="exam-error-readonly-row">
                          <span class="exam-error-readonly-topic">${escapeHtml(e.topic || "Sin tema")}</span>
                          <span class="tag-pill tag-pill-muted">${escapeHtml(e.error_type || "Sin tipo")}</span>
                          ${e.comment ? `<span class="exam-error-readonly-comment">${escapeHtml(e.comment)}</span>` : ""}
                        </div>
                      `
                    )
                    .join("")}
                </div>`
          }
        </div>

        <button type="button" class="ft-btn" id="exam-detail-back-btn">Volver a la lista</button>
      </section>
    `;

    container.querySelectorAll("[data-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.activeTab = btn.dataset.tab;
        render();
      });
    });

    container.querySelector("#exam-detail-back-btn").addEventListener("click", () => nav.goTo("list"));

    loadPdf();
  }

  async function loadPdf() {
    const path = state.activeTab === "correccion" ? exam.correction_pdf_storage_path : exam.pdf_storage_path;
    const pdfContainer = container.querySelector("#exam-detail-pdf");
    if (!path) {
      pdfContainer.innerHTML = `<p class="pdf-viewer-status">No hay PDF disponible.</p>`;
      return;
    }
    try {
      const url = await getSignedPdfUrl(path);
      await mountPdfViewer(pdfContainer, url);
    } catch (err) {
      console.error(err);
      pdfContainer.innerHTML = `<p class="pdf-viewer-status">No se pudo cargar el PDF: ${err.message || err}</p>`;
    }
  }
}
