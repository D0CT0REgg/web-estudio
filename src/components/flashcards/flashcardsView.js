import { renderDeckListScreen } from "./deckListScreen.js";
import { renderDeckEditScreen } from "./deckEditScreen.js";
import { renderStudyScreen } from "./studyScreen.js";

/**
 * Punto de entrada de la sección Tarjetas. Gestiona su propia navegación interna
 * entre lista de mazos / edición / estudio, igual que simulacroView.js.
 */
export function renderFlashcardsView(container) {
  function goTo(screen, deckId = null) {
    container.innerHTML = "";
    const nav = { goTo };
    if (screen === "edit") renderDeckEditScreen(container, nav, deckId);
    else if (screen === "study") renderStudyScreen(container, nav, deckId);
    else renderDeckListScreen(container, nav);
  }

  goTo("list");
}
