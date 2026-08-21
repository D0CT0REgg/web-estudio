import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const MIN_SCALE = 0.4;
const MAX_SCALE = 4;
const SCALE_STEP = 0.25;
const WHEEL_SCALE_STEP = 0.1;

/**
 * Monta un visor de PDF simple (scroll continuo de páginas + zoom) dentro de `container`.
 * Devuelve `{ destroy }` para liberar el documento cuando se desmonte la vista.
 */
export async function mountPdfViewer(container, pdfUrl) {
  container.innerHTML = `
    <div class="pdf-viewer">
      <div class="pdf-viewer-toolbar">
        <button type="button" class="ft-icon-btn" data-action="zoom-out" aria-label="Alejar">−</button>
        <span class="pdf-viewer-zoom-label" data-role="zoom-label">100%</span>
        <button type="button" class="ft-icon-btn" data-action="zoom-in" aria-label="Acercar">+</button>
        <button type="button" class="ft-icon-btn" data-action="zoom-reset" aria-label="Restablecer zoom">⟲</button>
      </div>
      <div class="pdf-viewer-pages" data-role="pages"></div>
    </div>
  `;

  const pagesEl = container.querySelector('[data-role="pages"]');
  const zoomLabelEl = container.querySelector('[data-role="zoom-label"]');

  pagesEl.innerHTML = `<p class="pdf-viewer-status">Cargando PDF…</p>`;

  let scale = 1;
  let pdfDoc = null;
  let destroyed = false;
  let renderQueued = false;

  async function renderAllPages() {
    if (destroyed || !pdfDoc) return;
    zoomLabelEl.textContent = `${Math.round(scale * 100)}%`;
    pagesEl.innerHTML = "";

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.className = "pdf-viewer-page";
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      pagesEl.appendChild(canvas);
      await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
    }
  }

  function setScale(newScale) {
    scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScale));
    renderAllPages();
  }

  container.querySelector('[data-action="zoom-in"]').addEventListener("click", () => setScale(scale + SCALE_STEP));
  container.querySelector('[data-action="zoom-out"]').addEventListener("click", () => setScale(scale - SCALE_STEP));
  container.querySelector('[data-action="zoom-reset"]').addEventListener("click", () => setScale(1));

  // Ctrl/Cmd + rueda del ratón para hacer zoom libremente, como en cualquier visor de PDF.
  pagesEl.addEventListener(
    "wheel",
    (event) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      if (renderQueued) return;
      renderQueued = true;
      requestAnimationFrame(() => {
        setScale(scale + (event.deltaY < 0 ? WHEEL_SCALE_STEP : -WHEEL_SCALE_STEP));
        renderQueued = false;
      });
    },
    { passive: false }
  );

  try {
    if (!pdfUrl) throw new Error("No hay URL de PDF para cargar (falta la ruta del archivo).");
    pdfDoc = await pdfjsLib.getDocument({ url: pdfUrl }).promise;
    await renderAllPages();
  } catch (err) {
    if (!destroyed) {
      pagesEl.innerHTML = `<p class="pdf-viewer-status">No se pudo cargar el PDF: ${err.message || err}</p>`;
    }
    console.error(err);
  }

  return {
    destroy() {
      destroyed = true;
      pdfDoc?.destroy();
    },
  };
}
