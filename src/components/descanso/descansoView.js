const DURATIONS = [5, 10, 15];

const BREAK_TIPS = [
  "Estírate un poco y bebe agua.",
  "Regla 20-20-20: mira algo a 6 metros durante 20 segundos.",
  "Levántate, camina un poco y respira profundo.",
  "Aprovecha para ir al baño o rellenar la botella de agua.",
  "Aparta la vista de las pantallas un momento.",
];

const ACTIVITIES = [
  { icon: "🧘", title: "Estírate", desc: "De pie o sentado, estira brazos, cuello y espalda.", seconds: 30 },
  {
    icon: "👀",
    title: "Regla 20-20-20",
    desc: "Mira algo a 6 metros (20 pies) durante 20 segundos para descansar la vista.",
    seconds: 20,
  },
  { icon: "🌬️", title: "Respira", desc: "Respiraciones lentas y profundas, inhalando por la nariz.", seconds: 30 },
  { icon: "💧", title: "Hidrátate", desc: "Bebe un vaso de agua entero antes de volver a sentarte.", seconds: null },
  { icon: "🚶", title: "Camina un poco", desc: "Levántate y da una vuelta corta, aunque sea por la habitación.", seconds: 60 },
];

function formatTime(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function renderDescansoView(container) {
  const state = {
    selectedMinutes: 5,
  };

  let breakIntervalId = null;

  container.innerHTML = `
    <section class="view-descanso fx-fade-in" aria-labelledby="descanso-title">
      <h1 id="descanso-title">Descanso</h1>

      <div class="setup-block">
        <h2>Descanso rápido</h2>
        <div id="manual-break-setup">
          <div class="duration-grid" id="duration-grid"></div>
          <button type="button" class="btn-hero" id="start-break-btn">
            <span class="btn-hero-icon" aria-hidden="true">🌿</span>
            Empezar descanso
          </button>
        </div>
        <div class="descanso-active" id="manual-break-active" hidden>
          <p class="sap-time" id="break-time">00:00</p>
          <p class="sap-tip" id="break-tip"></p>
          <div class="sap-controls">
            <button type="button" class="ft-btn ft-btn-end" id="end-break-btn">Terminar</button>
          </div>
        </div>
      </div>

      <div class="setup-block">
        <h2>Actividades activas</h2>
        <div class="activity-grid" id="activity-grid"></div>
      </div>
    </section>
  `;

  const els = {
    durationGrid: container.querySelector("#duration-grid"),
    setup: container.querySelector("#manual-break-setup"),
    active: container.querySelector("#manual-break-active"),
    startBtn: container.querySelector("#start-break-btn"),
    endBtn: container.querySelector("#end-break-btn"),
    time: container.querySelector("#break-time"),
    tip: container.querySelector("#break-tip"),
    activityGrid: container.querySelector("#activity-grid"),
  };

  // ---- Descanso rápido manual ----
  function renderDurationGrid() {
    els.durationGrid.innerHTML = DURATIONS.map(
      (min) => `
        <button type="button" class="duration-card ${state.selectedMinutes === min ? "active" : ""}" data-minutes="${min}">
          ${min} min
        </button>
      `
    ).join("");

    els.durationGrid.querySelectorAll(".duration-card").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.selectedMinutes = Number(btn.dataset.minutes);
        renderDurationGrid();
      });
    });
  }

  function tickBreak(remainingSeconds) {
    const next = remainingSeconds - 1;
    if (next <= 0) {
      finishBreak();
      return;
    }
    els.time.textContent = formatTime(next);
    breakIntervalId = setTimeout(() => tickBreak(next), 1000);
  }

  function startBreak() {
    const totalSeconds = state.selectedMinutes * 60;
    els.tip.textContent = BREAK_TIPS[Math.floor(Math.random() * BREAK_TIPS.length)];
    els.time.textContent = formatTime(totalSeconds);
    els.setup.hidden = true;
    els.active.hidden = false;
    clearTimeout(breakIntervalId);
    breakIntervalId = setTimeout(() => tickBreak(totalSeconds), 1000);
  }

  function finishBreak() {
    clearTimeout(breakIntervalId);
    breakIntervalId = null;
    els.setup.hidden = false;
    els.active.hidden = true;
  }

  els.startBtn.addEventListener("click", startBreak);
  els.endBtn.addEventListener("click", finishBreak);

  renderDurationGrid();

  // ---- Biblioteca de actividades activas ----
  function renderActivities() {
    els.activityGrid.innerHTML = ACTIVITIES.map(
      (a, i) => `
        <div class="activity-card">
          <span class="activity-card-title">${a.icon} ${a.title}</span>
          <p class="activity-card-desc">${a.desc}</p>
          ${
            a.seconds
              ? `<button type="button" class="ft-btn" data-activity-index="${i}">Empezar (${a.seconds}s)</button>`
              : ""
          }
        </div>
      `
    ).join("");

    els.activityGrid.querySelectorAll("[data-activity-index]").forEach((btn) => {
      const activity = ACTIVITIES[Number(btn.dataset.activityIndex)];
      btn.addEventListener("click", () => startActivityTimer(btn, activity));
    });
  }

  function startActivityTimer(btn, activity) {
    if (btn.disabled) return;
    let remaining = activity.seconds;
    btn.disabled = true;
    btn.textContent = `${remaining}s…`;

    const tick = () => {
      remaining -= 1;
      if (remaining <= 0) {
        btn.textContent = "¡Hecho! ✅";
        setTimeout(() => {
          btn.textContent = `Empezar (${activity.seconds}s)`;
          btn.disabled = false;
        }, 1500);
        return;
      }
      btn.textContent = `${remaining}s…`;
      setTimeout(tick, 1000);
    };

    setTimeout(tick, 1000);
  }

  renderActivities();
}
