// Motor del reproductor de Ambiente: un único <audio> persistente en memoria (no
// depende de ninguna vista montada), igual que sessionStore.js para el timer de estudio.
// Así la música sigue sonando aunque navegues a otra sección.

const SONG_BASE = `${import.meta.env.BASE_URL}song/`;

export const TRACKS = [
  { id: "rain", label: "Lluvia", icon: "🌧️", file: `${SONG_BASE}rain.mp3` },
  { id: "forest", label: "Bosque", icon: "🌲", file: `${SONG_BASE}forest.mp3` },
  { id: "white_noise1", label: "Ruido marrón", icon: "📻", file: `${SONG_BASE}white_noise1.mp3` },
  { id: "white_noise2", label: "Ruido blanco", icon: "📻", file: `${SONG_BASE}white_noise2.mp3` },
  { id: "lofi_music", label: "Lo-fi", icon: "🎵", file: `${SONG_BASE}lofi_music.mp3` },
  { id: "chill_music1", label: "Chill 1", icon: "🎶", file: `${SONG_BASE}chill_music1.mp3` },
  { id: "chill_music2", label: "Chill 2", icon: "🎶", file: `${SONG_BASE}chill_music2.mp3` },
];

const listeners = new Set();
let audio = null;
let state = {
  trackId: null,
  playing: false,
  loop: true,
  volume: 0.6,
};

function notify() {
  listeners.forEach((fn) => fn(state));
}

function ensureAudio() {
  if (!audio) {
    audio = new Audio();
    audio.loop = state.loop;
    audio.volume = state.volume;
    audio.addEventListener("ended", () => {
      state.playing = false;
      notify();
    });
    audio.addEventListener("error", () => {
      state.playing = false;
      notify();
    });
  }
  return audio;
}

export function subscribe(fn) {
  listeners.add(fn);
  fn(state);
  return () => listeners.delete(fn);
}

export function getState() {
  return state;
}

export function playTrack(track) {
  const el = ensureAudio();
  if (state.trackId !== track.id) {
    el.src = track.file;
    state.trackId = track.id;
  }
  el.loop = state.loop;
  el.volume = state.volume;
  state.playing = true;
  notify();

  el.play().catch((err) => {
    console.error("No se pudo reproducir el sonido:", err);
    state.playing = false;
    notify();
  });
}

export function togglePlayPause() {
  if (!state.trackId) return;
  if (state.playing) {
    audio?.pause();
    state.playing = false;
    notify();
  } else {
    playTrack(TRACKS.find((t) => t.id === state.trackId));
  }
}

export function toggleLoop() {
  state.loop = !state.loop;
  if (audio) audio.loop = state.loop;
  notify();
}

export function setVolume(volume) {
  state.volume = volume;
  if (audio) audio.volume = volume;
  notify();
}
