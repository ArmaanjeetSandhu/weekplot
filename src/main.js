import { getLoadProblem, initStore } from "./core/store.js";
import { dialogOpen } from "./ui/dom.js";
import { initEditor } from "./ui/editor.js";
import { render } from "./ui/grid.js";
import { initInteractions, isDragging } from "./ui/interactions.js";
import { initModals } from "./ui/modal.js";
import { initSettings } from "./ui/settings.js";
import { initShortcuts } from "./ui/shortcuts.js";
import { initTheme } from "./ui/theme.js";
import { toast } from "./ui/toast.js";
import { initToolbar } from "./ui/toolbar.js";

function initRefresh() {
  setInterval(() => {
    if (!isDragging() && !dialogOpen()) render();
  }, 60000);
  window.addEventListener("resize", () => {
    if (!isDragging()) render();
  });
}

await initStore();

initTheme();
initModals();
initToolbar();
initEditor();
initSettings();
initInteractions();
initShortcuts();
initRefresh();

render();

const loadProblem = getLoadProblem();
if (loadProblem) {
  toast(
    loadProblem.backupKey
      ? `Your saved schedule couldn't be read, so a fresh week is showing instead. A copy was kept in browser storage as "${loadProblem.backupKey}".`
      : "Your saved schedule couldn't be read, so a fresh week is showing instead. Changes won't be saved, so the original stays untouched.",
    10000,
  );
}
