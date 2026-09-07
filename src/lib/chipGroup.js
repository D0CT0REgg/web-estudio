/**
 * Renderiza un grupo de "chips" seleccionables dentro de targetEl.
 * getOptions/getSelected/setSelected son funciones para no acoplar este helper
 * a ninguna forma concreta de estado. Devuelve una función `render` por si hay
 * que refrescar el grupo desde fuera (p.ej. al cambiar la lista de opciones).
 *
 * Con `multi: true`, getSelected/setSelected trabajan con un array en vez de un único
 * valor, y como mucho se pueden tener `max` chips activas a la vez (las demás quedan
 * deshabilitadas visualmente hasta que se libere hueco quitando alguna).
 */
export function makeChipGroup(
  targetEl,
  getOptions,
  getSelected,
  setSelected,
  { toggleOff = false, multi = false, max = Infinity } = {}
) {
  function render() {
    const options = getOptions();
    const selected = getSelected();
    const selectedList = multi ? selected || [] : [];
    const atMax = multi && selectedList.length >= max;

    targetEl.innerHTML = options
      .map((opt) => {
        const isActive = multi ? selectedList.includes(opt) : selected === opt;
        const isDisabled = multi && atMax && !isActive;
        return `<button
            type="button"
            class="chip ${isActive ? "active" : ""} ${isDisabled ? "chip-disabled" : ""}"
            data-value="${opt}"
            ${isDisabled ? "aria-disabled=\"true\"" : ""}
          >${opt}</button>`;
      })
      .join("");

    targetEl.querySelectorAll(".chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        const value = chip.dataset.value;

        if (multi) {
          const current = getSelected() || [];
          if (current.includes(value)) {
            setSelected(current.filter((v) => v !== value));
          } else if (current.length < max) {
            setSelected([...current, value]);
          } else {
            return; // ya se llegó al máximo: ignorar el clic en una chip no seleccionada
          }
        } else {
          const current = getSelected();
          setSelected(toggleOff && current === value ? null : value);
        }
        render();
      });
    });
  }
  render();
  return render;
}
