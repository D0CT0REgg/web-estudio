import { fetchExamSimulations, deleteExamSimulation } from "../../lib/examApi.js";
import { escapeHtml } from "../../lib/escapeHtml.js";
import { skeletonList } from "../../lib/skeleton.js";

const STATUS_GROUPS = [
  { status: "pending_correction", title: "Pendientes de corregir" },
  { status: "in_progress", title: "En curso" },
  { status: "scheduled", title: "Programados" },
  { status: "corrected", title: "Corregidos" },
];

function formatDate(value) {
  if (!value) return "Sin fecha programada";
  return new Date(value).toLocaleString("es-ES", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function renderExamListScreen(container, nav) {
  const state = { exams: [], loading: true };

  container.innerHTML = `
    <section class="view-simulacro fx-fade-in" aria-labelledby="simulacro-title">
      <h1 id="simulacro-title">Simulacro de examen</h1>

      <button type="button" class="btn-hero" id="new-exam-btn">
        <span class="btn-hero-icon" aria-hidden="true">🎯</span>
        Nuevo simulacro
      </button>

      <div id="exam-groups"></div>
    </section>
  `;

  const els = {
    newExamBtn: container.querySelector("#new-exam-btn"),
    groups: container.querySelector("#exam-groups"),
  };

  els.newExamBtn.addEventListener("click", () => nav.goTo("config"));

  function examCardHtml(exam) {
    const grade =
      exam.final_grade !== null && exam.final_grade !== undefined
        ? `<span class="exam-card-grade">${exam.final_grade}/${exam.grade_out_of ?? 20}</span>`
        : "";
    return `
      <div class="exam-card" data-exam-id="${exam.id}">
        <div class="exam-card-info">
          <span class="exam-card-title">${escapeHtml(exam.title)}</span>
          <span class="exam-card-meta">
            ${exam.subject_tag ? `<span class="tag-pill">${escapeHtml(exam.subject_tag)}</span>` : ""}
            <span class="exam-card-date">${formatDate(exam.scheduled_at)}</span>
          </span>
        </div>
        ${grade}
        <div class="exam-card-actions" data-actions></div>
      </div>
    `;
  }

  function actionsForExam(exam) {
    if (exam.status === "scheduled") {
      return `
        <button type="button" class="btn-primary" data-action="start">Empezar</button>
        <button type="button" class="ft-icon-btn" data-action="edit" aria-label="Editar">✏️</button>
        <button type="button" class="ft-icon-btn" data-action="delete" aria-label="Eliminar">🗑️</button>
      `;
    }
    if (exam.status === "in_progress") {
      return `
        <button type="button" class="btn-primary" data-action="resume">Continuar</button>
        <button type="button" class="ft-icon-btn" data-action="delete" aria-label="Eliminar">🗑️</button>
      `;
    }
    if (exam.status === "pending_correction") {
      return `
        <button type="button" class="btn-primary" data-action="correct">Corregir</button>
        <button type="button" class="ft-icon-btn" data-action="delete" aria-label="Eliminar">🗑️</button>
      `;
    }
    return `
      <button type="button" class="ft-btn" data-action="detail">Ver detalle</button>
      <button type="button" class="ft-icon-btn" data-action="delete" aria-label="Eliminar">🗑️</button>
    `;
  }

  function wireCard(card, exam) {
    card.querySelector("[data-actions]").innerHTML = actionsForExam(exam);

    const startBtn = card.querySelector('[data-action="start"], [data-action="resume"]');
    startBtn?.addEventListener("click", () => nav.goTo("mode", exam.id));

    card.querySelector('[data-action="edit"]')?.addEventListener("click", () => nav.goTo("config", exam.id));
    card.querySelector('[data-action="correct"]')?.addEventListener("click", () => nav.goTo("correction", exam.id));
    card.querySelector('[data-action="detail"]')?.addEventListener("click", () => nav.goTo("detail", exam.id));

    card.querySelector('[data-action="delete"]')?.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (!window.confirm(`¿Eliminar el simulacro "${exam.title}"? Esto borra también sus PDFs.`)) return;
      try {
        await deleteExamSimulation(exam);
        state.exams = state.exams.filter((x) => x.id !== exam.id);
        renderGroups();
      } catch (err) {
        console.error(err);
        window.alert("No se pudo eliminar el simulacro.");
      }
    });
  }

  function renderGroups() {
    if (state.loading) {
      els.groups.innerHTML = skeletonList({ rows: 4 });
      return;
    }
    if (state.exams.length === 0) {
      els.groups.innerHTML = `<p class="task-list-empty">Todavía no tienes ningún simulacro. Crea el primero arriba.</p>`;
      return;
    }

    els.groups.innerHTML = STATUS_GROUPS.map((g) => {
      const examsInGroup = state.exams.filter((e) => e.status === g.status);
      if (examsInGroup.length === 0) return "";
      return `
        <div class="setup-block">
          <h2>${g.title} <span class="exam-group-count">(${examsInGroup.length})</span></h2>
          <div class="exam-card-list" data-group="${g.status}"></div>
        </div>
      `;
    }).join("");

    STATUS_GROUPS.forEach((g) => {
      const examsInGroup = state.exams.filter((e) => e.status === g.status);
      if (examsInGroup.length === 0) return;
      const groupEl = els.groups.querySelector(`[data-group="${g.status}"]`);
      groupEl.innerHTML = examsInGroup.map(examCardHtml).join("");
      examsInGroup.forEach((exam) => {
        wireCard(groupEl.querySelector(`[data-exam-id="${exam.id}"]`), exam);
      });
    });
  }

  renderGroups();

  fetchExamSimulations()
    .then((exams) => {
      state.exams = exams;
      state.loading = false;
      renderGroups();
    })
    .catch((err) => {
      console.error(err);
      state.loading = false;
      els.groups.innerHTML = `<p class="task-list-empty">No se pudieron cargar los simulacros.</p>`;
    });
}
