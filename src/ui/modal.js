import { $ } from "./dom.js";
import { raiseToast } from "./toast.js";

const closing = new Map();

function cancelClose(d) {
  if (!closing.has(d)) return;
  clearTimeout(closing.get(d));
  closing.delete(d);
  d.classList.remove("closing");
}

function finishClose(d) {
  cancelClose(d);
  if (d.open) d.close();
}

function animateClose(d) {
  if (!d.open || closing.has(d)) return;
  d.classList.add("closing");
  const cs = getComputedStyle(d);
  const ms =
    cs.animationName === "none"
      ? 0
      : (Number.parseFloat(cs.animationDuration) || 0) * 1000;
  if (!ms) {
    finishClose(d);
    return;
  }
  closing.set(
    d,
    setTimeout(() => finishClose(d), ms),
  );
}

export function openModal(id) {
  const d = $(id);
  cancelClose(d);
  if (!d.open) d.showModal();
  raiseToast();
}

export function closeModal(id) {
  animateClose($(id));
}

export function initModals() {
  document.querySelectorAll("dialog.modal").forEach((d) => {
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
      animateClose(d);
    });
    d.addEventListener("cancel", (e) => {
      if (!e.cancelable) return;
      e.preventDefault();
      animateClose(d);
    });
    d.addEventListener("close", () => cancelClose(d));
  });
}
