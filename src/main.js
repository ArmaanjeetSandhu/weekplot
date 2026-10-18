import { getLoadProblem, initStore, setSaveErrorHandler } from "./core/store.js";
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
}

function saveErrorMessage(e) {
  if (e?.name === "QuotaExceededError" || e?.code === 22 || e?.code === 1014)
    return "Couldn't save: browser storage is full. Export your week to keep a copy of recent changes.";
  if (e?.name === "SecurityError")
    return "Couldn't save: this browser is blocking storage (private mode or site settings). Export your week to keep a copy.";
  return "Couldn't save your changes. Export your week to keep a copy.";
}

setSaveErrorHandler((e) => toast(saveErrorMessage(e), 10000));

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
