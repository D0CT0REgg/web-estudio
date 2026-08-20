/** Escapa texto de usuario antes de interpolarlo en una plantilla HTML (evita inyección). */
export function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
