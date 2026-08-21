// Generadores de HTML para placeholders de carga (shimmer). Estilos en global.css
// bajo ".skeleton-*". Puramente presentacional: no depende de datos reales.

export function skeletonLine({ width = "100%", height = "0.95rem" } = {}) {
  return `<div class="skeleton-block" style="width:${width};height:${height};"></div>`;
}

/** Igual que skeletonLine pero como <span> inline: seguro dentro de <p>/<span> existentes. */
export function skeletonInline({ width = "4rem", height = "1em" } = {}) {
  return `<span class="skeleton-block" style="display:inline-block;vertical-align:middle;width:${width};height:${height};"></span>`;
}

export function skeletonLines(count = 3, opts = {}) {
  const lines = Array.from({ length: count }, (_, i) =>
    skeletonLine(i === count - 1 ? { ...opts, width: opts.lastWidth ?? "60%" } : opts)
  ).join("");
  return `<div class="skeleton-stack">${lines}</div>`;
}

/** Placeholder de tarjeta con un título corto y N líneas de cuerpo. */
export function skeletonCard({ lines = 2 } = {}) {
  return `
    <div class="skeleton-card">
      ${skeletonLine({ width: "40%", height: "1.1rem" })}
      <div style="height:0.6rem;"></div>
      ${skeletonLines(lines)}
    </div>
  `;
}

/** Placeholder de lista (p.ej. tareas, simulacros): filas con un círculo/checkbox y una línea. */
export function skeletonList({ rows = 3 } = {}) {
  const rowsHtml = Array.from(
    { length: rows },
    () => `
      <div class="skeleton-row">
        ${skeletonLine({ width: "1.3rem", height: "1.3rem" })}
        ${skeletonLine({ width: `${60 + Math.floor(Math.random() * 25)}%` })}
      </div>
    `
  ).join("");
  return `<div class="skeleton-stack">${rowsHtml}</div>`;
}
