// Notificaciones del sistema para avisos de fin de fase (trabajo/descanso) aunque
// la pestaña esté en segundo plano. No hace nada si el navegador no las soporta o
// el usuario no ha dado permiso.

export function isNotificationSupported() {
  return typeof Notification !== "undefined";
}

export function getNotificationPermission() {
  return isNotificationSupported() ? Notification.permission : "unsupported";
}

/** Pide permiso solo si aún no se ha decidido; no vuelve a preguntar si ya se concedió o denegó. */
export async function requestNotificationPermission() {
  if (!isNotificationSupported()) return "unsupported";
  if (Notification.permission !== "default") return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export function notify(title, options) {
  if (!isNotificationSupported() || Notification.permission !== "granted") return;
  try {
    new Notification(title, options);
  } catch (err) {
    console.error("No se pudo mostrar la notificación:", err);
  }
}
