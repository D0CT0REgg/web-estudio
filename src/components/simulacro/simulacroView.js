import { renderExamListScreen } from "./examListScreen.js";
import { renderExamConfigScreen } from "./examConfigScreen.js";
import { renderExamModeScreen } from "./examModeScreen.js";
import { renderExamCorrectionScreen } from "./examCorrectionScreen.js";
import { renderExamDetailScreen } from "./examDetailScreen.js";

/**
 * Punto de entrada de la sección Simulacro de examen. Gestiona su propia navegación
 * interna entre lista / configuración / modo examen / corrección / detalle, sin tocar
 * el router de nivel superior (main.js) — cada pantalla recibe `nav.goTo(screen, examId)`.
 */
export function renderSimulacroView(container) {
  function goTo(screen, examId = null) {
    container.innerHTML = "";
    const nav = { goTo };
    if (screen === "config") renderExamConfigScreen(container, nav, examId);
    else if (screen === "mode") renderExamModeScreen(container, nav, examId);
    else if (screen === "correction") renderExamCorrectionScreen(container, nav, examId);
    else if (screen === "detail") renderExamDetailScreen(container, nav, examId);
    else renderExamListScreen(container, nav);
  }

  goTo("list");
}
