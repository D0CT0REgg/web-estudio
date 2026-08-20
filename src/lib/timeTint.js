// Tono del overlay de fondo según la hora del día. Cambios sutiles (misma oscuridad
// aproximada, matiz cálido/frío distinto) para que se note sin resultar exagerado.
const BANDS = [
  { maxHour: 12, tint: "rgba(18, 26, 17, 0.5)" }, // mañana: verde fresco
  { maxHour: 20, tint: "rgba(42, 30, 14, 0.52)" }, // tarde: dorado cálido
  { maxHour: 24, tint: "rgba(10, 16, 14, 0.62)" }, // noche: verde-azulado oscuro
];

function getTintForHour(hour) {
  return BANDS.find((band) => hour < band.maxHour).tint;
}

function applyTimeTint() {
  document.documentElement.style.setProperty("--overlay-tint", getTintForHour(new Date().getHours()));
}

/** Aplica el tono ahora mismo y lo refresca cada 5 minutos por si la pestaña queda abierta. */
export function startTimeTintWatcher() {
  applyTimeTint();
  setInterval(applyTimeTint, 5 * 60 * 1000);
}
