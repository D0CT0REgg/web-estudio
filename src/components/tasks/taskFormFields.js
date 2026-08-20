import { SUBJECTS, BREVET_SUBJECTS, TASK_TYPES, PRIORITIES } from "../../lib/tags.js";
import { makeChipGroup } from "../../lib/chipGroup.js";

/**
 * Renderiza los campos de asignatura (con variante Brevet), tipo y prioridad dentro
 * de `container`. Compartido entre el picker de Sesión y la página Tareas del día
 * para no duplicar la lógica de selección de tags.
 *
 * @param {object} [initial] valores iniciales, p.ej. al editar una tarea existente.
 * @returns {{ getValues: () => {subjectTag, taskTypeTag, priorityTag} }}
 */
export function renderTaskFormFields(container, initial = {}) {
  const state = {
    brevet: initial.subjectTag ? BREVET_SUBJECTS.includes(initial.subjectTag) : false,
    subject: initial.subjectTag ?? null,
    type: initial.taskTypeTag ?? null,
    priority: initial.priorityTag ?? null,
  };

  container.innerHTML = `
    <label class="brevet-toggle">
      <input type="checkbox" id="tf-brevet-checkbox" ${state.brevet ? "checked" : ""} />
      Brevet
    </label>
    <div class="chip-grid" id="tf-subject-chips"></div>
    <p class="quick-add-label">Tipo</p>
    <div class="chip-grid" id="tf-type-chips"></div>
    <p class="quick-add-label">Prioridad</p>
    <div class="chip-grid" id="tf-priority-chips"></div>
  `;

  const subjectChips = container.querySelector("#tf-subject-chips");
  const typeChips = container.querySelector("#tf-type-chips");
  const priorityChips = container.querySelector("#tf-priority-chips");

  const rerenderSubjectChips = makeChipGroup(
    subjectChips,
    () => (state.brevet ? BREVET_SUBJECTS : SUBJECTS),
    () => state.subject,
    (v) => {
      state.subject = v;
    }
  );

  makeChipGroup(
    typeChips,
    () => TASK_TYPES,
    () => state.type,
    (v) => {
      state.type = v;
    }
  );

  makeChipGroup(
    priorityChips,
    () => PRIORITIES,
    () => state.priority,
    (v) => {
      state.priority = v;
    }
  );

  container.querySelector("#tf-brevet-checkbox").addEventListener("change", (e) => {
    state.brevet = e.target.checked;
    state.subject = null;
    rerenderSubjectChips();
  });

  return {
    getValues: () => ({
      subjectTag: state.subject,
      taskTypeTag: state.type,
      priorityTag: state.priority,
    }),
  };
}
