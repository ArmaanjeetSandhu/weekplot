import { $ } from "./dom.js";
import { raiseToast } from "./toast.js";

export function openModal(id) {
  $(id).showModal();
  raiseToast();
}

export function closeModal(id) {
  $(id).close();
}

export function initModals() {
  document.querySelectorAll("dialog.modal").forEach((d) =>
    d.addEventListener("pointerdown", (e) => {
      if (e.target !== d) return;
      const r = d.getBoundingClientRect();
      const inside =
        e.clientX >= r.left &&
        e.clientX <= r.right &&
        e.clientY >= r.top &&
        e.clientY <= r.bottom;
      if (inside) return;
      e.preventDefault();
      d.close();
    }),
  );
}
