/**
 * Renderiza un grupo de "chips" seleccionables dentro de targetEl.
 * getOptions/getSelected/setSelected son funciones para no acoplar este helper
 * a ninguna forma concreta de estado. Devuelve una función `render` por si hay
 * que refrescar el grupo desde fuera (p.ej. al cambiar la lista de opciones).
 */
export function makeChipGroup(targetEl, getOptions, getSelected, setSelected, { toggleOff = false } = {}) {
  function render() {
    const options = getOptions();
    const selected = getSelected();
    targetEl.innerHTML = options
      .map(
        (opt) =>
          `<button type="button" class="chip ${selected === opt ? "active" : ""}" data-value="${opt}">${opt}</button>`
      )
      .join("");
    targetEl.querySelectorAll(".chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        const value = chip.dataset.value;
        const current = getSelected();
        setSelected(toggleOff && current === value ? null : value);
        render();
      });
    });
  }
  render();
  return render;
}
