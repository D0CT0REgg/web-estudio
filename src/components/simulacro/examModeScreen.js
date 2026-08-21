import { fetchExamSimulation, getSignedPdfUrl, startExam, finishExam } from "../../lib/examApi.js";
import { mountPdfViewer } from "../../lib/pdfViewer.js";
import { setNavLocked } from "../../lib/navLock.js";
import { escapeHtml } from "../../lib/escapeHtml.js";

function formatTime(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export async function renderExamModeScreen(container, nav, examId) {
  container.innerHTML = `<p class="stats-loading">Cargando examen…</p>`;

  let exam;
  try {
    exam = await fetchExamSimulation(examId);
  } catch (err) {
    console.error(err);
    container.innerHTML = `<p class="task-list-empty">No se pudo cargar el simulacro.</p>`;
    return;
  }

  renderIntro(exam);

  // Pantalla de confirmación: necesaria para que el clic cuente como gesto de usuario
  // y el navegador permita activar pantalla completa (no funciona tras un await previo).
  function renderIntro(exam) {
    container.innerHTML = `
      <section class="view-simulacro fx-fade-in">
        <h1>${escapeHtml(exam.title)}</h1>
        <div class="setup-block">
          <p>
            Vas a entrar en <strong>modo examen</strong>: pantalla completa,
            ${exam.duration_min ? `${exam.duration_min} minutos` : "sin límite de tiempo"}, navegación bloqueada
            hasta que termines.
          </p>
          ${exam.rules_text ? `<h2>Reglas</h2><p class="exam-rules-text">${escapeHtml(exam.rules_text)}</p>` : ""}
          ${
            exam.needed_items?.length
              ? `<h2>Cosas necesarias</h2><ul class="exam-needed-list">${exam.needed_items
                  .map((i) => `<li>${escapeHtml(i)}</li>`)
                  .join("")}</ul>`
              : ""
          }
        </div>
        <div class="quick-add-actions">
          <button type="button" class="ft-btn" id="exam-intro-cancel">Cancelar</button>
          <button type="button" class="btn-hero" id="exam-intro-start">
            <span class="btn-hero-icon" aria-hidden="true">🎯</span>
            Entrar en modo examen
          </button>
        </div>
      </section>
    `;

    container.querySelector("#exam-intro-cancel").addEventListener("click", () => nav.goTo("list"));
    container.querySelector("#exam-intro-start").addEventListener("click", () => enterExamMode(exam));
  }

  async function enterExamMode(exam) {
    try {
      await container.requestFullscreen?.();
    } catch (err) {
      console.warn("No se pudo activar pantalla completa:", err);
    }

    if (exam.status === "scheduled") {
      try {
        await startExam(exam.id);
      } catch (err) {
        console.error(err);
      }
    }

    setNavLocked(true);
    renderRunning(exam);
  }

  async function renderRunning(exam) {
    container.innerHTML = `
      <div class="exam-mode-screen" id="exam-mode-screen">
        <div class="exam-mode-topbar" id="exam-mode-topbar">
          <div class="exam-mode-info">
            <span class="exam-mode-title">${escapeHtml(exam.title)}</span>
            <span class="exam-mode-phase" id="exam-timer-phase">Tiempo restante</span>
          </div>
          <span class="exam-mode-time" id="exam-timer-time">--:--</span>
          <div class="exam-mode-actions">
            <button type="button" class="ft-btn" id="exam-fullscreen-btn" hidden>⛶ Pantalla completa</button>
            <button type="button" class="ft-btn" id="exam-pause-btn">⏸️ Pausa de emergencia</button>
            <button type="button" class="ft-btn ft-btn-end" id="exam-finish-btn">Terminar examen</button>
          </div>
        </div>
        <div class="exam-mode-pdf-area">
          <button type="button" class="ft-icon-btn exam-mode-maximize-btn" id="exam-maximize-btn" aria-label="Agrandar vista del PDF">⤢</button>
          <div class="exam-mode-pdf" id="exam-mode-pdf"></div>
        </div>
      </div>
    `;

    const els = {
      screen: container.querySelector("#exam-mode-screen"),
      time: container.querySelector("#exam-timer-time"),
      phase: container.querySelector("#exam-timer-phase"),
      pauseBtn: container.querySelector("#exam-pause-btn"),
      finishBtn: container.querySelector("#exam-finish-btn"),
      maximizeBtn: container.querySelector("#exam-maximize-btn"),
      fullscreenBtn: container.querySelector("#exam-fullscreen-btn"),
      pdfContainer: container.querySelector("#exam-mode-pdf"),
    };

    // Si sales de pantalla completa con Esc, el timer sigue corriendo (decisión ya
    // tomada), pero mostramos un botón para volver a entrar cuando quieras.
    function updateFullscreenButton() {
      els.fullscreenBtn.hidden = Boolean(document.fullscreenElement);
    }
    updateFullscreenButton();
    document.addEventListener("fullscreenchange", updateFullscreenButton);

    els.fullscreenBtn.addEventListener("click", async () => {
      try {
        await els.screen.requestFullscreen();
      } catch (err) {
        console.warn("No se pudo volver a pantalla completa:", err);
      }
    });

    els.maximizeBtn.addEventListener("click", () => {
      const maximized = els.screen.classList.toggle("exam-mode-screen-maximized");
      els.maximizeBtn.textContent = maximized ? "⤡" : "⤢";
      els.maximizeBtn.setAttribute("aria-label", maximized ? "Restaurar vista" : "Agrandar vista del PDF");
    });

    let remainingSeconds = exam.duration_min ? exam.duration_min * 60 : null;
    let paused = false;
    let intervalId = null;

    function tick() {
      if (paused || remainingSeconds === null) return;
      remainingSeconds -= 1;
      els.time.textContent = formatTime(remainingSeconds);
      if (remainingSeconds <= 0) {
        els.phase.textContent = "Tiempo agotado";
        clearInterval(intervalId);
      }
    }

    if (remainingSeconds !== null) {
      els.time.textContent = formatTime(remainingSeconds);
      intervalId = setInterval(tick, 1000);
    } else {
      els.time.textContent = "Sin límite";
    }

    els.pauseBtn.addEventListener("click", () => {
      paused = !paused;
      els.pauseBtn.textContent = paused ? "▶️ Reanudar" : "⏸️ Pausa de emergencia";
      els.phase.textContent = paused ? "En pausa — el tiempo no corre" : "Tiempo restante";
      els.screen.classList.toggle("exam-mode-screen-paused", paused);
    });

    async function exitExamMode() {
      setNavLocked(false);
      if (document.fullscreenElement) {
        try {
          await document.exitFullscreen();
        } catch {
          // no-op: puede que ya no estuviéramos en pantalla completa
        }
      }
    }

    els.finishBtn.addEventListener("click", async () => {
      if (!window.confirm("¿Terminar el examen? Pasará a pendiente de corregir.")) return;
      clearInterval(intervalId);
      document.removeEventListener("fullscreenchange", updateFullscreenButton);
      await exitExamMode();
      try {
        await finishExam(exam.id);
      } catch (err) {
        console.error(err);
      }
      nav.goTo("list");
    });

    if (exam.pdf_storage_path) {
      try {
        const url = await getSignedPdfUrl(exam.pdf_storage_path);
        await mountPdfViewer(els.pdfContainer, url);
      } catch (err) {
        console.error(err);
        els.pdfContainer.innerHTML = `<p class="pdf-viewer-status">No se pudo cargar el PDF del enunciado: ${err.message || err}</p>`;
      }
    } else {
      els.pdfContainer.innerHTML = `<p class="pdf-viewer-status">Este simulacro no tiene un PDF de enunciado guardado. Bórralo y créalo de nuevo.</p>`;
    }
  }
}
