import { deleteEvent } from "../actions.js";
import { IS_APPLE } from "../constants.js";
import { state } from "../core/store.js";
import { $, dialogOpen } from "./dom.js";
import { evKey, evSelector, focusedEv } from "./grid.js";
import { isDragging } from "./interactions.js";
import { toggleTheme } from "./theme.js";

function deleteFocused(el) {
  const ev = state.events.find((x) => x.id === el.dataset.id);
  if (!ev) return;
  const all = [...$("grid").querySelectorAll(".ev[data-id]")],
    at = all.indexOf(el),
    other = (x) => x.dataset.id !== ev.id;
  const next =
    all.slice(at + 1).find(other) || all.slice(0, at).reverse().find(other);
  const nextKey = next ? evKey(next) : null;
  deleteEvent(ev, () => {
    if (nextKey) $("grid").querySelector(evSelector(nextKey))?.focus();
  });
}

export function initShortcuts() {
  document.addEventListener("keydown", (e) => {
    const themeMod = IS_APPLE
      ? e.metaKey && !e.ctrlKey
      : e.ctrlKey && !e.metaKey;
    if (themeMod && !e.altKey && (e.key === "\\" || e.code === "Backslash")) {
      e.preventDefault();
      toggleTheme();
      return;
    }
    if (
      (e.key === "Delete" || (IS_APPLE && e.key === "Backspace")) &&
      !e.ctrlKey &&
      !e.altKey &&
      !e.metaKey &&
      !isDragging() &&
      !dialogOpen()
    ) {
      const el = focusedEv();
      if (!el) return;
      e.preventDefault();
      deleteFocused(el);
    }
  });
}
