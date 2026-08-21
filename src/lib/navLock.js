// Bloquea la navegación por el sidebar (y el cierre/recarga de pestaña) mientras
// hay un examen de Simulacro en curso. appShell.js consulta isNavLocked() antes
// de dejar navegar o cerrar sesión; examModeScreen activa/desactiva el bloqueo.

let locked = false;

function beforeUnloadHandler(event) {
  event.preventDefault();
  event.returnValue = "";
}

export function isNavLocked() {
  return locked;
}

export function setNavLocked(value) {
  locked = value;
  if (value) {
    window.addEventListener("beforeunload", beforeUnloadHandler);
  } else {
    window.removeEventListener("beforeunload", beforeUnloadHandler);
  }
}
