import {
  todayDate,
  fetchTodayTasks,
  createTask,
  updateTask,
  setTaskDone,
  deleteTask,
  reorderTasks,
  fetchTodayGoal,
  saveTodayGoal,
} from "../../lib/tasksApi.js";
import { renderTaskFormFields } from "./taskFormFields.js";
import { escapeHtml } from "../../lib/escapeHtml.js";
import { skeletonList } from "../../lib/skeleton.js";

export function renderTasksView(container) {
  const state = {
    tasks: [],
    tasksLoading: true,
    editingTaskId: null,
    quickAddOpen: false,
  };

  container.innerHTML = `
    <section class="view-tareas fx-fade-in" aria-labelledby="tareas-title">
      <h1 id="tareas-title">Tareas del día</h1>

      <div class="setup-block">
        <h2>Objetivo de hoy</h2>
        <textarea id="goal-input" class="goal-input" rows="2" placeholder="¿Cuál es tu objetivo principal hoy?"></textarea>
        <p class="goal-save-status" id="goal-save-status"></p>
      </div>

      <div class="setup-block">
        <div class="tareas-list-header">
          <h2>Tareas</h2>
          <button type="button" class="task-add-toggle" id="task-add-toggle">+ Nueva tarea</button>
        </div>
        <div class="task-quick-add" id="task-quick-add" hidden></div>
        <div class="task-full-list" id="task-full-list"></div>
      </div>

      <div class="setup-block">
        <h2>Scratchpad</h2>
        <p class="scratchpad-hint">Notas rápidas y volátiles: no se guardan en ningún sitio. Descárgalas si quieres conservarlas.</p>
        <textarea id="scratchpad-input" class="scratchpad-input" rows="6" placeholder="Escribe aquí..."></textarea>
        <button type="button" class="ft-btn" id="scratchpad-download">Descargar como .md</button>
      </div>
    </section>
  `;

  const els = {
    goalInput: container.querySelector("#goal-input"),
    goalStatus: container.querySelector("#goal-save-status"),
    taskAddToggle: container.querySelector("#task-add-toggle"),
    quickAdd: container.querySelector("#task-quick-add"),
    fullList: container.querySelector("#task-full-list"),
    scratchpadInput: container.querySelector("#scratchpad-input"),
    scratchpadDownload: container.querySelector("#scratchpad-download"),
  };

  // ---- Objetivo del día ----
  let goalSaveTimeout = null;
  els.goalInput.addEventListener("input", () => {
    els.goalStatus.textContent = "Guardando…";
    clearTimeout(goalSaveTimeout);
    goalSaveTimeout = setTimeout(async () => {
      try {
        await saveTodayGoal(els.goalInput.value);
        els.goalStatus.textContent = "Guardado";
        setTimeout(() => {
          if (els.goalStatus.textContent === "Guardado") els.goalStatus.textContent = "";
        }, 1500);
      } catch (err) {
        els.goalStatus.textContent = "No se pudo guardar";
        console.error(err);
      }
    }, 800);
  });

  fetchTodayGoal()
    .then((goal) => {
      els.goalInput.value = goal?.goal_text || "";
    })
    .catch((err) => console.error(err));

  // ---- Scratchpad ----
  els.scratchpadDownload.addEventListener("click", () => {
    const blob = new Blob([els.scratchpadInput.value], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scratchpad-${todayDate()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  // ---- Alta rápida ----
  function renderQuickAdd() {
    if (!state.quickAddOpen) {
      els.quickAdd.hidden = true;
      els.quickAdd.innerHTML = "";
      return;
    }

    els.quickAdd.hidden = false;
    els.quickAdd.innerHTML = `
      <input type="text" id="new-task-title" placeholder="¿Qué hay que hacer?" />
      <div id="new-task-fields"></div>
      <textarea id="new-task-notes" class="task-notes-input" rows="2" placeholder="Nota o detalles (opcional)"></textarea>
      <p class="quick-add-error" id="new-task-error" hidden></p>
      <div class="quick-add-actions">
        <button type="button" class="ft-btn" id="new-task-cancel">Cancelar</button>
        <button type="button" class="btn-primary" id="new-task-submit">Crear tarea</button>
      </div>
    `;

    const fields = renderTaskFormFields(els.quickAdd.querySelector("#new-task-fields"));

    els.quickAdd.querySelector("#new-task-cancel").addEventListener("click", () => {
      state.quickAddOpen = false;
      renderQuickAdd();
    });

    els.quickAdd.querySelector("#new-task-submit").addEventListener("click", async () => {
      const title = els.quickAdd.querySelector("#new-task-title").value.trim();
      const notes = els.quickAdd.querySelector("#new-task-notes").value.trim();
      const { subjectTag, taskTypeTag, priorityTag } = fields.getValues();
      const errorEl = els.quickAdd.querySelector("#new-task-error");
      errorEl.hidden = true;

      if (!title || !subjectTag || !taskTypeTag || !priorityTag) {
        errorEl.textContent = "Escribe un título y elige asignatura, tipo y prioridad.";
        errorEl.hidden = false;
        return;
      }

      try {
        const newTask = await createTask({
          title,
          subjectTag,
          taskTypeTag,
          priorityTag,
          notes,
          position: state.tasks.length,
        });
        state.tasks = [...state.tasks, newTask];
        state.quickAddOpen = false;
        renderQuickAdd();
        renderTaskListFull();
      } catch (err) {
        errorEl.textContent = "No se pudo crear la tarea. Inténtalo de nuevo.";
        errorEl.hidden = false;
        console.error(err);
      }
    });
  }

  els.taskAddToggle.addEventListener("click", () => {
    state.quickAddOpen = !state.quickAddOpen;
    renderQuickAdd();
  });

  // ---- Lista de tareas (ver / editar / reordenar) ----
  function priorityBadge(t) {
    const priority = t.extra_tags?.priority;
    return priority ? `<span class="tag-pill tag-pill-priority">${escapeHtml(priority)}</span>` : "";
  }

  function viewRowHtml(t) {
    return `
      <div class="task-full-row" data-task-id="${t.id}">
        <span class="task-drag-handle" aria-hidden="true" title="Arrastrar para reordenar">⠿</span>
        <input type="checkbox" class="task-done-checkbox" ${t.done ? "checked" : ""} aria-label="Marcar tarea hecha" />
        <div class="task-full-info">
          <span class="task-row-title ${t.done ? "task-row-title-done" : ""}">${escapeHtml(t.title)}</span>
          <span class="task-row-tags">
            <span class="tag-pill">${escapeHtml(t.subject_tag)}</span>
            <span class="tag-pill tag-pill-muted">${escapeHtml(t.task_type_tag)}</span>
            ${priorityBadge(t)}
          </span>
          ${t.notes ? `<span class="task-row-notes">${escapeHtml(t.notes)}</span>` : ""}
        </div>
        <div class="task-row-actions">
          <button type="button" class="ft-icon-btn" data-action="edit" aria-label="Editar tarea">✏️</button>
          <button type="button" class="ft-icon-btn" data-action="delete" aria-label="Eliminar tarea">🗑️</button>
        </div>
      </div>
    `;
  }

  function editRowHtml(t) {
    return `
      <div class="task-full-row task-full-row-editing" data-task-id="${t.id}">
        <input type="text" class="task-edit-title" value="${escapeHtml(t.title)}" />
        <div class="task-edit-fields"></div>
        <textarea class="task-notes-input task-edit-notes" rows="2" placeholder="Nota o detalles (opcional)">${escapeHtml(t.notes || "")}</textarea>
        <p class="quick-add-error task-edit-error" hidden></p>
        <div class="quick-add-actions">
          <button type="button" class="ft-btn" data-action="cancel-edit">Cancelar</button>
          <button type="button" class="btn-primary" data-action="save-edit">Guardar</button>
        </div>
      </div>
    `;
  }

  function startDrag(event, taskId) {
    event.preventDefault();
    const pointerId = event.pointerId;

    function onMove(e) {
      if (e.pointerId !== pointerId) return;
      const rows = Array.from(els.fullList.querySelectorAll(".task-full-row"));
      let targetIndex = state.tasks.length - 1;
      for (let i = 0; i < rows.length; i++) {
        const rect = rows[i].getBoundingClientRect();
        if (e.clientY < rect.top + rect.height / 2) {
          targetIndex = i;
          break;
        }
      }
      const currentIndex = state.tasks.findIndex((t) => t.id === taskId);
      if (currentIndex === -1 || currentIndex === targetIndex) return;
      const [item] = state.tasks.splice(currentIndex, 1);
      state.tasks.splice(targetIndex, 0, item);
      renderTaskListFull();
      els.fullList.querySelector(`[data-task-id="${taskId}"]`)?.classList.add("dragging");
    }

    function onUp(e) {
      if (e.pointerId !== pointerId) return;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      els.fullList.querySelector(`[data-task-id="${taskId}"]`)?.classList.remove("dragging");
      reorderTasks(state.tasks).catch((err) => console.error("No se pudo guardar el orden:", err));
    }

    els.fullList.querySelector(`[data-task-id="${taskId}"]`)?.classList.add("dragging");
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  function wireViewRow(row, t) {
    row.querySelector(".task-done-checkbox").addEventListener("change", async (e) => {
      const done = e.target.checked;
      try {
        await setTaskDone(t.id, done);
        t.done = done;
        renderTaskListFull();
      } catch (err) {
        e.target.checked = !done;
        console.error(err);
      }
    });

    row.querySelector('[data-action="edit"]').addEventListener("click", () => {
      state.editingTaskId = t.id;
      renderTaskListFull();
    });

    row.querySelector('[data-action="delete"]').addEventListener("click", async () => {
      if (!window.confirm(`¿Eliminar la tarea "${t.title}"?`)) return;
      try {
        await deleteTask(t.id);
        state.tasks = state.tasks.filter((x) => x.id !== t.id);
        renderTaskListFull();
      } catch (err) {
        console.error(err);
      }
    });

    row.querySelector(".task-drag-handle").addEventListener("pointerdown", (e) => startDrag(e, t.id));
  }

  function wireEditRow(row, t) {
    const fields = renderTaskFormFields(row.querySelector(".task-edit-fields"), {
      subjectTag: t.subject_tag,
      taskTypeTag: t.task_type_tag,
      priorityTag: t.extra_tags?.priority ?? null,
    });

    row.querySelector('[data-action="cancel-edit"]').addEventListener("click", () => {
      state.editingTaskId = null;
      renderTaskListFull();
    });

    row.querySelector('[data-action="save-edit"]').addEventListener("click", async () => {
      const title = row.querySelector(".task-edit-title").value.trim();
      const notes = row.querySelector(".task-edit-notes").value.trim();
      const { subjectTag, taskTypeTag, priorityTag } = fields.getValues();
      const errorEl = row.querySelector(".task-edit-error");
      errorEl.hidden = true;

      if (!title || !subjectTag || !taskTypeTag || !priorityTag) {
        errorEl.textContent = "Escribe un título y elige asignatura, tipo y prioridad.";
        errorEl.hidden = false;
        return;
      }

      try {
        const updated = await updateTask(t.id, { title, subjectTag, taskTypeTag, priorityTag, notes });
        Object.assign(t, updated);
        state.editingTaskId = null;
        renderTaskListFull();
      } catch (err) {
        errorEl.textContent = "No se pudo guardar. Inténtalo de nuevo.";
        errorEl.hidden = false;
        console.error(err);
      }
    });
  }

  function renderTaskListFull() {
    if (state.tasksLoading) {
      els.fullList.innerHTML = skeletonList({ rows: 4 });
      return;
    }
    if (state.tasks.length === 0) {
      els.fullList.innerHTML = `<p class="task-list-empty">Todavía no tienes tareas para hoy. Crea la primera arriba.</p>`;
      return;
    }

    els.fullList.innerHTML = state.tasks
      .map((t) => (state.editingTaskId === t.id ? editRowHtml(t) : viewRowHtml(t)))
      .join("");

    state.tasks.forEach((t) => {
      const row = els.fullList.querySelector(`[data-task-id="${t.id}"]`);
      if (!row) return;
      if (state.editingTaskId === t.id) {
        wireEditRow(row, t);
      } else {
        wireViewRow(row, t);
      }
    });
  }

  renderQuickAdd();
  renderTaskListFull();

  fetchTodayTasks()
    .then((tasks) => {
      state.tasks = tasks;
      state.tasksLoading = false;
      renderTaskListFull();
    })
    .catch((err) => {
      console.error(err);
      state.tasksLoading = false;
      els.fullList.innerHTML = `<p class="task-list-empty">No se pudieron cargar las tareas.</p>`;
    });
}
