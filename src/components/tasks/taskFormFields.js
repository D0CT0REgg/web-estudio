import { SUBJECTS, BREVET_SUBJECTS, TASK_TYPES, PRIORITIES } from "../../lib/tags.js";
import { makeChipGroup } from "../../lib/chipGroup.js";

const MAX_TASK_TYPES = 3;

/**
 * Renderiza los campos de asignatura (con variante Brevet), tipo y prioridad dentro
 * de `container`. Compartido entre el picker de Sesión y la página Tareas del día
 * para no duplicar la lógica de selección de tags.
 *
 * @param {object} [initial] valores iniciales, p.ej. al editar una tarea existente.
 * @param {object} [options]
 * @param {string[]} [options.customTaskTypes] tipos de tarea añadidos por el usuario en Ajustes,
 *   que se muestran como chips seleccionables además de los fijos de TASK_TYPES.
 * @returns {{ getValues: () => {subjectTag, taskTypeTag: string[], priorityTag} }}
 */
export function renderTaskFormFields(container, initial = {}, { customTaskTypes = [] } = {}) {
  const allTaskTypes = [...TASK_TYPES, ...customTaskTypes];

  const state = {
    brevet: initial.subjectTag ? BREVET_SUBJECTS.includes(initial.subjectTag) : false,
    subject: initial.subjectTag ?? null,
    type: Array.isArray(initial.taskTypeTag) ? initial.taskTypeTag : initial.taskTypeTag ? [initial.taskTypeTag] : [],
    priority: initial.priorityTag ?? null,
  };

  container.innerHTML = `
    <label class="brevet-toggle">
      <input type="checkbox" id="tf-brevet-checkbox" ${state.brevet ? "checked" : ""} />
      Brevet
    </label>
    <div class="chip-grid" id="tf-subject-chips"></div>
    <p class="quick-add-label">Tipo (hasta ${MAX_TASK_TYPES})</p>
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
    () => allTaskTypes,
    () => state.type,
    (v) => {
      state.type = v;
    },
    { multi: true, max: MAX_TASK_TYPES }
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
