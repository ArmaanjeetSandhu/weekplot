import { $, dialogOpen, esc } from "./dom.js";

const CAN_POPOVER =
  typeof HTMLElement !== "undefined" && "popover" in HTMLElement.prototype;

let toastT, toastHideT;

function isOpen(el) {
  if (!CAN_POPOVER) return false;
  try {
    return el.matches(":popover-open");
  } catch (err) {
    return false;
  }
}

function setPopover(el, open) {
  if (!CAN_POPOVER) return;
  try {
    if (open) el.showPopover();
    else el.hidePopover();
  } catch (err) {
    console.warn("Couldn't toggle the toast popover:", err);
  }
}

function showToast() {
  const el = $("toast");
  clearTimeout(toastHideT);
  el.classList.toggle("top", dialogOpen());
  if (CAN_POPOVER && !isOpen(el)) {
    setPopover(el, true);
    el.getBoundingClientRect();
  }
  el.classList.add("show");
  return el;
}

function hideToast() {
  const el = $("toast");
  el.classList.remove("show");
  el.style.pointerEvents = "none";
  clearTimeout(toastHideT);
  toastHideT = setTimeout(() => {
    if (isOpen(el)) setPopover(el, false);
  }, 250);
}

export function raiseToast() {
  const el = $("toast");
  if (!el.classList.contains("show")) return;
  el.classList.toggle("top", dialogOpen());
  if (isOpen(el)) {
    setPopover(el, false);
    setPopover(el, true);
  }
}

export function toast(msg) {
  const el = $("toast");
  el.textContent = msg;
  el.style.pointerEvents = "none";
  showToast();
  clearTimeout(toastT);
  toastT = setTimeout(hideToast, 2400);
}

export function undoable(msg, fn) {
  const el = $("toast");
  el.innerHTML =
    esc(msg) +
    ` <button style="margin-left:10px;border:0;background:transparent;color:inherit;text-decoration:underline;font-weight:700;pointer-events:auto" id="undoBtn">Undo</button>`;
  el.style.pointerEvents = "auto";
  showToast();
  clearTimeout(toastT);
  $("undoBtn").onclick = () => {
    fn();
    hideToast();
  };
  toastT = setTimeout(hideToast, 5000);
}
