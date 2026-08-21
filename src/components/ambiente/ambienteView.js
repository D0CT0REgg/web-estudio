import { TRACKS, subscribe, getState, playTrack, togglePlayPause, toggleLoop, setVolume } from "../../lib/ambientPlayer.js";
import { escapeHtml } from "../../lib/escapeHtml.js";

export function renderAmbienteView(container) {
  container.innerHTML = `
    <section class="view-ambiente fx-fade-in" aria-labelledby="ambiente-title">
      <h1 id="ambiente-title">Ambiente</h1>

      <div class="setup-block">
        <h2>Sonidos</h2>
        <div class="ambient-track-grid" id="ambient-track-grid"></div>
      </div>

      <div class="setup-block">
        <h2>Reproductor</h2>
        <p class="ambient-now-playing" id="ambient-now-playing"></p>
        <div class="ambient-controls-row">
          <button type="button" class="ambient-play-btn" id="ambient-play-btn" aria-label="Reproducir">▶️</button>
          <div class="ambient-volume-row">
            <span aria-hidden="true">🔉</span>
            <input type="range" id="ambient-volume" min="0" max="100" value="60" />
            <span aria-hidden="true">🔊</span>
          </div>
          <label class="ambient-loop-toggle">
            <input type="checkbox" id="ambient-loop-checkbox" />
            Repetir en bucle
          </label>
        </div>
      </div>
    </section>
  `;

  const els = {
    trackGrid: container.querySelector("#ambient-track-grid"),
    nowPlaying: container.querySelector("#ambient-now-playing"),
    playBtn: container.querySelector("#ambient-play-btn"),
    volumeInput: container.querySelector("#ambient-volume"),
    loopCheckbox: container.querySelector("#ambient-loop-checkbox"),
  };

  function renderTrackGrid(state) {
    els.trackGrid.innerHTML = TRACKS.map(
      (t) => `
        <button type="button" class="ambient-track-card ${state.trackId === t.id ? "active" : ""}" data-track="${t.id}">
          <span class="ambient-track-icon" aria-hidden="true">${t.icon}</span>
          <span class="ambient-track-label">${escapeHtml(t.label)}</span>
          ${
            state.trackId === t.id
              ? `<span class="ambient-track-status">${state.playing ? "▶ Sonando" : "⏸ En pausa"}</span>`
              : ""
          }
        </button>
      `
    ).join("");

    els.trackGrid.querySelectorAll(".ambient-track-card").forEach((btn) => {
      btn.addEventListener("click", () => {
        playTrack(TRACKS.find((t) => t.id === btn.dataset.track));
      });
    });
  }

  function render(state) {
    if (!els.trackGrid.isConnected) {
      unsubscribe();
      return;
    }

    renderTrackGrid(state);

    const current = TRACKS.find((t) => t.id === state.trackId);
    els.nowPlaying.textContent = current
      ? `${current.icon} ${current.label} — ${state.playing ? "sonando" : "en pausa"}`
      : "Elige un sonido para empezar.";

    els.playBtn.textContent = state.playing ? "⏸️" : "▶️";
    els.playBtn.disabled = !state.trackId;
    els.playBtn.setAttribute("aria-label", state.playing ? "Pausar" : "Reproducir");

    els.volumeInput.value = Math.round(state.volume * 100);
    els.loopCheckbox.checked = state.loop;
  }

  els.playBtn.addEventListener("click", togglePlayPause);
  els.volumeInput.addEventListener("input", (e) => setVolume(Number(e.target.value) / 100));
  els.loopCheckbox.addEventListener("change", toggleLoop);

  const unsubscribe = subscribe(render);
}
