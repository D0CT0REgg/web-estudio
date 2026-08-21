import { toPng } from "html-to-image";
import { skeletonCard, skeletonLines } from "../../lib/skeleton.js";
import { fetchAllSessions } from "../../lib/statsApi.js";
import { fetchExamSimulations } from "../../lib/examApi.js";
import { fetchTrimesters } from "../../lib/trimestersApi.js";
import {
  countCorrectedExams,
  computeOverallAverage,
  computeAverageBySubject,
  computeRunningAverageSeries,
  filterByDateRange,
  findCurrentTrimester,
} from "../../lib/examStatsCalc.js";
import {
  filterByRange,
  filterBySubject,
  getDistinctSubjects,
  sumMinutes,
  countCompletedPomodoros,
  computeCurrentStreak,
  computeLongestStreak,
  computeRangeComparison,
  buildHeatmapDays,
  buildHeatmapMonthLabels,
  buildEvolutionBuckets,
  buildSubjectDistribution,
  buildModeDistribution,
  buildHourHistogram,
} from "../../lib/statsCalc.js";
import { escapeHtml } from "../../lib/escapeHtml.js";

const RANGES = [
  { key: "7d", label: "7 días" },
  { key: "30d", label: "30 días" },
  { key: "all", label: "Histórico" },
];

const MODE_LABELS = {
  pomodoro: "Pomodoro",
  "52-17": "52-17",
  flowtime: "Flowtime",
  stopwatch: "Cronómetro",
};

const EVOLUTION_SUBTITLES = {
  "7d": "Pomodoros completados cada día de los últimos 7 días.",
  "30d": "Pomodoros completados por semana, en los últimos 30 días.",
  all: "Pomodoros completados por mes, en todo el histórico.",
};

const WEEKDAY_LABEL_ROWS = [
  { row: 2, text: "L" },
  { row: 4, text: "X" },
  { row: 6, text: "V" },
];

function heatmapLevel(minutes) {
  if (minutes <= 0) return 0;
  if (minutes < 20) return 1;
  if (minutes < 45) return 2;
  if (minutes < 90) return 3;
  return 4;
}

function formatHours(minutes) {
  return (minutes / 60).toFixed(1).replace(".0", "");
}

function csvEscape(value) {
  const str = String(value ?? "");
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function downloadCsv(sessions) {
  const headers = [
    "fecha",
    "hora_inicio",
    "hora_fin",
    "modo",
    "asignatura",
    "tipo",
    "duracion_planeada_min",
    "duracion_real_min",
    "completada",
  ];
  const rows = sessions.map((s) => {
    const start = new Date(s.started_at);
    const end = s.ended_at ? new Date(s.ended_at) : null;
    return [
      start.toLocaleDateString("es-ES"),
      start.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
      end ? end.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : "",
      s.mode,
      s.subject_tag || "",
      s.task_type_tag || "",
      s.planned_duration_min ?? "",
      s.actual_duration_min ?? "",
      s.completed ? "sí" : "no",
    ]
      .map(csvEscape)
      .join(",");
  });

  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `estadisticas-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function renderEstadisticasView(container) {
  const state = {
    range: "7d",
    subject: "all",
    allSessions: [],
    visibleSessions: [],
  };

  container.innerHTML = `
    <section class="view-estadisticas fx-fade-in" aria-labelledby="stats-title">
      <h1 id="stats-title">Estadísticas</h1>

      <div class="stats-filters">
        <div class="stats-range-selector" id="range-selector"></div>
        <label class="stats-subject-filter">
          Asignatura
          <select id="subject-filter"><option value="all">Todas las asignaturas</option></select>
        </label>
        <button type="button" class="ft-btn" id="export-csv-btn">⬇️ Exportar CSV</button>
        <button type="button" class="ft-btn" id="export-image-btn">🖼️ Descargar imagen</button>
      </div>

      <div class="stats-loading" id="stats-loading">
        <div class="summary-cards">
          ${skeletonCard({ lines: 1 })}
          ${skeletonCard({ lines: 1 })}
          ${skeletonCard({ lines: 1 })}
        </div>
        <div class="setup-block">${skeletonLines(4)}</div>
      </div>

      <div id="stats-content" hidden>
        <div class="summary-cards" id="summary-cards"></div>

        <div class="setup-block">
          <h2>Actividad del último año</h2>
          <p class="stats-subtitle">
            Minutos estudiados por día. Cuanto más intenso el color del cuadro (mira la leyenda de abajo), más
            estudiaste ese día.
          </p>
          <div class="heatmap-wrap">
            <div class="heatmap-grid" id="heatmap-grid"></div>
          </div>
          <div class="heatmap-legend">
            <span>Menos</span>
            <span class="heatmap-cell heatmap-level-0"></span>
            <span class="heatmap-cell heatmap-level-1"></span>
            <span class="heatmap-cell heatmap-level-2"></span>
            <span class="heatmap-cell heatmap-level-3"></span>
            <span class="heatmap-cell heatmap-level-4"></span>
            <span>Más</span>
          </div>
        </div>

        <div class="setup-block">
          <h2>Evolución de pomodoros completados</h2>
          <p class="stats-subtitle" id="evolution-subtitle"></p>
          <div class="bar-chart" id="evolution-chart"></div>
        </div>

        <div class="setup-block">
          <h2>Distribución de tiempo por asignatura</h2>
          <p class="stats-subtitle">Minutos totales invertidos en cada asignatura, en el rango seleccionado.</p>
          <div class="subject-bars" id="subject-bars"></div>
        </div>

        <div class="setup-block">
          <h2>Distribución por modo de estudio</h2>
          <p class="stats-subtitle">
            Minutos totales usando cada modo, y cuánto te sueles desviar del tiempo planeado (solo Pomodoro/52-17).
          </p>
          <div class="subject-bars" id="mode-bars"></div>
        </div>

        <div class="setup-block">
          <h2>Mejor franja horaria de concentración</h2>
          <p class="stats-subtitle">
            Número de sesiones iniciadas en cada hora del día. La barra verde es tu franja más habitual.
          </p>
          <p class="stats-peak-label" id="peak-hour-label"></p>
          <div class="hour-histogram" id="hour-histogram"></div>
        </div>

        <div class="setup-block">
          <h2>Simulacros de examen</h2>
          <p class="stats-subtitle">
            Solo cuenta simulacros ya corregidos. Las notas se normalizan a /20 para poder promediar aunque tengan
            escalas distintas (12/20, 30/40, 4/5…).
          </p>
          <div class="summary-cards" id="exam-summary-cards"></div>

          <h3 class="exam-stats-subheading">Progreso de la media histórica</h3>
          <p class="stats-subtitle" style="margin-top:0">
            Cada punto es la media acumulada hasta ese simulacro. Las líneas verticales marcan el inicio de cada
            trimestre configurado en Ajustes.
          </p>
          <div id="exam-average-line-chart"></div>

          <h3 class="exam-stats-subheading">Media por asignatura — este trimestre</h3>
          <p class="stats-subtitle" id="exam-trimester-label" style="margin-top:0"></p>
          <div class="subject-bars" id="exam-subject-bars-trimester"></div>

          <h3 class="exam-stats-subheading">Media por asignatura — histórico</h3>
          <div class="subject-bars" id="exam-subject-bars-historic"></div>
        </div>
      </div>
    </section>
  `;

  const els = {
    rangeSelector: container.querySelector("#range-selector"),
    subjectFilter: container.querySelector("#subject-filter"),
    exportBtn: container.querySelector("#export-csv-btn"),
    exportImageBtn: container.querySelector("#export-image-btn"),
    loading: container.querySelector("#stats-loading"),
    content: container.querySelector("#stats-content"),
    summaryCards: container.querySelector("#summary-cards"),
    heatmapGrid: container.querySelector("#heatmap-grid"),
    evolutionSubtitle: container.querySelector("#evolution-subtitle"),
    evolutionChart: container.querySelector("#evolution-chart"),
    subjectBars: container.querySelector("#subject-bars"),
    modeBars: container.querySelector("#mode-bars"),
    peakHourLabel: container.querySelector("#peak-hour-label"),
    hourHistogram: container.querySelector("#hour-histogram"),
    examSummaryCards: container.querySelector("#exam-summary-cards"),
    examAverageLineChart: container.querySelector("#exam-average-line-chart"),
    examTrimesterLabel: container.querySelector("#exam-trimester-label"),
    examSubjectBarsTrimester: container.querySelector("#exam-subject-bars-trimester"),
    examSubjectBarsHistoric: container.querySelector("#exam-subject-bars-historic"),
  };

  // ---- Filtros ----
  function renderRangeSelector() {
    els.rangeSelector.innerHTML = RANGES.map(
      (r) => `
        <button type="button" class="range-btn ${state.range === r.key ? "active" : ""}" data-range="${r.key}">
          ${r.label}
        </button>
      `
    ).join("");

    els.rangeSelector.querySelectorAll(".range-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.range = btn.dataset.range;
        renderRangeSelector();
        renderAll();
      });
    });
  }

  function renderSubjectFilterOptions() {
    const subjects = getDistinctSubjects(state.allSessions);
    els.subjectFilter.innerHTML =
      `<option value="all">Todas las asignaturas</option>` +
      subjects.map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");
    els.subjectFilter.value = state.subject;
  }

  els.subjectFilter.addEventListener("change", () => {
    state.subject = els.subjectFilter.value;
    renderAll();
  });

  els.exportBtn.addEventListener("click", () => downloadCsv(state.visibleSessions));

  els.exportImageBtn.addEventListener("click", async () => {
    const section = container.querySelector(".view-estadisticas");
    els.exportImageBtn.disabled = true;
    section.classList.add("capturing");
    try {
      const bg = getComputedStyle(document.body).getPropertyValue("--bg").trim() || "#ffffff";
      const dataUrl = await toPng(section, { backgroundColor: bg, pixelRatio: 2 });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `estadisticas-${new Date().toISOString().slice(0, 10)}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error(err);
      window.alert("No se pudo generar la imagen. Inténtalo de nuevo.");
    } finally {
      section.classList.remove("capturing");
      els.exportImageBtn.disabled = false;
    }
  });

  // ---- Tarjetas resumen ----
  function renderComparisonBadge(comparison) {
    if (!comparison) return "";
    const { currentMinutes, previousMinutes, percentChange } = comparison;
    if (currentMinutes === 0 && previousMinutes === 0) return "";
    if (percentChange === null) {
      return `<span class="summary-badge summary-badge-up">Primeros datos en este rango</span>`;
    }
    const periodLabel = state.range === "7d" ? "semana anterior" : "periodo anterior";
    const sign = percentChange > 0 ? "+" : "";
    const cls =
      percentChange > 0 ? "summary-badge-up" : percentChange < 0 ? "summary-badge-down" : "summary-badge-flat";
    return `<span class="summary-badge ${cls}">${sign}${percentChange}% vs. ${periodLabel}</span>`;
  }

  function renderSummaryCards(subjectFilteredAll, rangeSessions) {
    const totalMinutes = sumMinutes(rangeSessions);
    const pomodoros = countCompletedPomodoros(rangeSessions);
    const streak = computeCurrentStreak(subjectFilteredAll);
    const longestStreak = computeLongestStreak(subjectFilteredAll);
    const comparison = computeRangeComparison(subjectFilteredAll, state.range);

    els.summaryCards.innerHTML = `
      <div class="summary-card">
        <span class="summary-icon" aria-hidden="true">⏱️</span>
        <span class="summary-value">${formatHours(totalMinutes)}h</span>
        <span class="summary-label">Horas estudiadas</span>
        ${renderComparisonBadge(comparison)}
      </div>
      <div class="summary-card">
        <span class="summary-icon" aria-hidden="true">🍅</span>
        <span class="summary-value">${pomodoros}</span>
        <span class="summary-label">Pomodoros completados</span>
      </div>
      <div class="summary-card">
        <span class="summary-icon" aria-hidden="true">🔥</span>
        <span class="summary-value">${streak}</span>
        <span class="summary-label">Racha actual (días)</span>
      </div>
      <div class="summary-card">
        <span class="summary-icon" aria-hidden="true">🏆</span>
        <span class="summary-value">${longestStreak}</span>
        <span class="summary-label">Mejor racha histórica</span>
      </div>
    `;
  }

  // ---- Heatmap (una sola grid: fila 1 = meses, columna 1 = días de la semana) ----
  function renderHeatmap(subjectFilteredAll) {
    const days = buildHeatmapDays(subjectFilteredAll);
    const monthLabels = buildHeatmapMonthLabels(days);

    const monthHtml = monthLabels
      .map(
        (m) =>
          `<span class="heatmap-month-label" style="grid-column: ${m.column + 2}">${escapeHtml(m.label)}</span>`
      )
      .join("");

    const weekdayHtml = WEEKDAY_LABEL_ROWS.map(
      (w) => `<span class="heatmap-weekday-label" style="grid-row: ${w.row}">${w.text}</span>`
    ).join("");

    const cellsHtml = days
      .map(
        (d) =>
          `<span class="heatmap-cell heatmap-level-${heatmapLevel(d.minutes)}" style="grid-row: ${d.weekday + 2}; grid-column: ${d.column + 2}" title="${d.date}: ${d.minutes} min"></span>`
      )
      .join("");

    els.heatmapGrid.innerHTML = monthHtml + weekdayHtml + cellsHtml;
  }

  // ---- Evolución de pomodoros ----
  function renderEvolutionChart(rangeSessions) {
    els.evolutionSubtitle.textContent = EVOLUTION_SUBTITLES[state.range];
    const buckets = buildEvolutionBuckets(rangeSessions, state.range);

    if (buckets.length === 0 || buckets.every((b) => b.count === 0)) {
      els.evolutionChart.innerHTML = `<p class="task-list-empty">Todavía no hay pomodoros completados en este rango.</p>`;
      return;
    }

    const max = Math.max(1, ...buckets.map((b) => b.count));
    els.evolutionChart.innerHTML = buckets
      .map(
        (b) => `
          <div class="bar-chart-col">
            <span class="bar-chart-value">${b.count}</span>
            <div class="bar-chart-track">
              <div class="bar-chart-bar" style="height: ${(b.count / max) * 100}%"></div>
            </div>
            <span class="bar-chart-label">${escapeHtml(b.label)}</span>
          </div>
        `
      )
      .join("");
  }

  // ---- Distribución por asignatura ----
  function renderSubjectBars(rangeSessions) {
    const distribution = buildSubjectDistribution(rangeSessions);
    if (distribution.length === 0) {
      els.subjectBars.innerHTML = `<p class="task-list-empty">Todavía no hay sesiones en este rango.</p>`;
      return;
    }
    const max = Math.max(1, ...distribution.map((d) => d.minutes));
    els.subjectBars.innerHTML = distribution
      .map(
        (d) => `
          <div class="subject-bar-row">
            <span class="subject-bar-label">${escapeHtml(d.subject)}</span>
            <div class="subject-bar-track">
              <div class="subject-bar-fill" style="width: ${(d.minutes / max) * 100}%"></div>
            </div>
            <span class="subject-bar-value">${formatHours(d.minutes)}h</span>
          </div>
        `
      )
      .join("");
  }

  // ---- Distribución por modo ----
  function renderModeBars(rangeSessions) {
    const distribution = buildModeDistribution(rangeSessions);
    if (distribution.length === 0) {
      els.modeBars.innerHTML = `<p class="task-list-empty">Todavía no hay sesiones en este rango.</p>`;
      return;
    }
    const max = Math.max(1, ...distribution.map((d) => d.minutes));
    els.modeBars.innerHTML = distribution
      .map((d) => {
        let deviationHtml = "";
        if (d.avgDeviationMin !== null) {
          const text =
            d.avgDeviationMin === 0
              ? "sin desviación media respecto a lo planeado"
              : `${d.avgDeviationMin > 0 ? "+" : ""}${d.avgDeviationMin} min de media vs. lo planeado`;
          deviationHtml = `<p class="subject-bar-note">${text}</p>`;
        }
        return `
          <div>
            <div class="subject-bar-row">
              <span class="subject-bar-label">${MODE_LABELS[d.mode] || d.mode}</span>
              <div class="subject-bar-track">
                <div class="subject-bar-fill" style="width: ${(d.minutes / max) * 100}%"></div>
              </div>
              <span class="subject-bar-value">${formatHours(d.minutes)}h</span>
            </div>
            ${deviationHtml}
          </div>
        `;
      })
      .join("");
  }

  // ---- Franja horaria ----
  function renderHourHistogram(rangeSessions) {
    const { counts, peakHour, hasData } = buildHourHistogram(rangeSessions);
    if (!hasData) {
      els.peakHourLabel.textContent = "Todavía no hay sesiones en este rango.";
      els.hourHistogram.innerHTML = "";
      return;
    }
    els.peakHourLabel.textContent = `Tu mejor franja: ${String(peakHour).padStart(2, "0")}:00 – ${String((peakHour + 1) % 24).padStart(2, "0")}:00`;
    const max = Math.max(1, ...counts);
    els.hourHistogram.innerHTML = counts
      .map(
        (c, h) => `
          <div class="hour-col">
            <div class="hour-track">
              <div class="hour-bar ${h === peakHour ? "hour-bar-peak" : ""}" style="height: ${(c / max) * 100}%" title="${h}:00 · ${c}"></div>
            </div>
            ${h % 2 === 0 ? `<span class="hour-label">${h}</span>` : ""}
          </div>
        `
      )
      .join("");
  }

  // ---- Simulacros de examen (independiente del rango/asignatura de arriba) ----
  function renderExamAverageLineChart(series, trimesters) {
    const el = els.examAverageLineChart;
    if (series.length < 2) {
      el.innerHTML = `<p class="task-list-empty">Corrige al menos 2 simulacros para ver la evolución de la media.</p>`;
      return;
    }

    const width = 800;
    const height = 240;
    const padding = { top: 16, right: 20, bottom: 24, left: 30 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    const dataDates = series.map((p) => new Date(p.date).getTime());
    const trimesterStarts = trimesters.map((t) => new Date(t.start_date).getTime());
    const allDates = [...dataDates, ...trimesterStarts];
    const minDate = Math.min(...allDates);
    const maxDate = Math.max(...allDates, Date.now());
    const dateSpan = Math.max(1, maxDate - minDate);

    const xScale = (t) => padding.left + ((t - minDate) / dateSpan) * plotWidth;
    const yScale = (avg) => padding.top + (1 - avg / 20) * plotHeight;

    const points = series.map((p) => ({
      x: xScale(new Date(p.date).getTime()),
      y: yScale(p.average),
      date: p.date,
      average: p.average,
    }));
    const polylinePoints = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

    const gridLines = [0, 5, 10, 15, 20]
      .map((v) => {
        const y = yScale(v);
        return `
          <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" class="line-chart-grid" />
          <text x="${padding.left - 6}" y="${y + 3}" class="line-chart-axis-label" text-anchor="end">${v}</text>
        `;
      })
      .join("");

    const dividers = trimesters
      .map((t) => {
        const x = xScale(new Date(t.start_date).getTime());
        return `
          <line x1="${x.toFixed(1)}" y1="${padding.top}" x2="${x.toFixed(1)}" y2="${height - padding.bottom}" class="line-chart-divider" />
          <text x="${x + 4}" y="${padding.top + 11}" class="line-chart-divider-label">T${t.trimester_number}</text>
        `;
      })
      .join("");

    const dots = points
      .map(
        (p) => `
          <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5" class="line-chart-dot">
            <title>${new Date(p.date).toLocaleDateString("es-ES")}: ${p.average.toFixed(1)}/20</title>
          </circle>
        `
      )
      .join("");

    el.innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" class="line-chart-svg" preserveAspectRatio="none">
        ${gridLines}
        ${dividers}
        <polyline points="${polylinePoints}" class="line-chart-line" />
        ${dots}
      </svg>
    `;
  }

  function renderExamSubjectBars(el, distribution, emptyMessage) {
    if (distribution.length === 0) {
      el.innerHTML = `<p class="task-list-empty">${emptyMessage}</p>`;
      return;
    }
    el.innerHTML = distribution
      .map(
        (d) => `
          <div class="subject-bar-row">
            <span class="subject-bar-label">${escapeHtml(d.subject)}</span>
            <div class="subject-bar-track">
              <div class="subject-bar-fill" style="width: ${Math.min(100, (d.average / 20) * 100)}%"></div>
            </div>
            <span class="subject-bar-value">${d.average.toFixed(1)}/20 (${d.count})</span>
          </div>
        `
      )
      .join("");
  }

  function loadExamStats() {
    Promise.all([fetchExamSimulations(), fetchTrimesters()])
      .then(([exams, trimesters]) => {
        const count = countCorrectedExams(exams);
        const overallHistoric = computeOverallAverage(exams);
        const bySubjectHistoric = computeAverageBySubject(exams);

        const currentTrimester = findCurrentTrimester(trimesters);
        const trimesterExams = currentTrimester
          ? filterByDateRange(exams, currentTrimester.start_date, currentTrimester.end_date)
          : [];
        const overallTrimester = computeOverallAverage(trimesterExams);
        const bySubjectTrimester = computeAverageBySubject(trimesterExams);

        els.examSummaryCards.innerHTML = `
          <div class="summary-card">
            <span class="summary-icon" aria-hidden="true">🎯</span>
            <span class="summary-value">${count}</span>
            <span class="summary-label">Simulacros corregidos</span>
          </div>
          <div class="summary-card">
            <span class="summary-icon" aria-hidden="true">📅</span>
            <span class="summary-value">${overallTrimester !== null ? overallTrimester.toFixed(1) : "—"}/20</span>
            <span class="summary-label">Media general — este trimestre</span>
          </div>
          <div class="summary-card">
            <span class="summary-icon" aria-hidden="true">📈</span>
            <span class="summary-value">${overallHistoric !== null ? overallHistoric.toFixed(1) : "—"}/20</span>
            <span class="summary-label">Media general — histórica</span>
          </div>
        `;

        renderExamAverageLineChart(computeRunningAverageSeries(exams), trimesters);

        els.examTrimesterLabel.textContent = currentTrimester
          ? `Trimestre ${currentTrimester.trimester_number} (${currentTrimester.academic_year}): ${new Date(
              currentTrimester.start_date
            ).toLocaleDateString("es-ES")} – ${new Date(currentTrimester.end_date).toLocaleDateString("es-ES")}`
          : "No tienes un trimestre configurado para la fecha de hoy (revísalo en Ajustes).";

        renderExamSubjectBars(
          els.examSubjectBarsTrimester,
          bySubjectTrimester,
          "Sin simulacros corregidos en el trimestre actual."
        );
        renderExamSubjectBars(els.examSubjectBarsHistoric, bySubjectHistoric, "Todavía no hay simulacros corregidos.");
      })
      .catch((err) => {
        console.error(err);
        els.examSummaryCards.innerHTML = `<p class="task-list-empty">No se pudieron cargar los datos de simulacros.</p>`;
      });
  }

  function renderAll() {
    const subjectFilteredAll = filterBySubject(state.allSessions, state.subject);
    const rangeSessions = filterByRange(subjectFilteredAll, state.range);
    state.visibleSessions = rangeSessions;

    renderSummaryCards(subjectFilteredAll, rangeSessions);
    renderHeatmap(subjectFilteredAll);
    renderEvolutionChart(rangeSessions);
    renderSubjectBars(rangeSessions);
    renderModeBars(rangeSessions);
    renderHourHistogram(rangeSessions);
  }

  renderRangeSelector();
  loadExamStats();

  fetchAllSessions()
    .then((sessions) => {
      state.allSessions = sessions;
      els.loading.hidden = true;
      els.content.hidden = false;
      renderSubjectFilterOptions();
      renderAll();
    })
    .catch((err) => {
      console.error(err);
      els.loading.textContent = "No se pudieron cargar las estadísticas.";
    });
}
