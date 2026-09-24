import { doExport, importFromFile } from "../export/file.js";
import { save, state } from "../core/store.js";
import { todayIdx } from "../core/time.js";
import { $ } from "./dom.js";
import { newAt } from "./editor.js";
import { render } from "./grid.js";

function closeMenu() {
  $("exportMenu").classList.remove("open");
  $("exportBtn").setAttribute("aria-expanded", "false");
}

function initTitle() {
  $("titleIn").addEventListener("input", () => {
    state.title = $("titleIn").value;
    save();
  });
  $("titleIn").addEventListener("blur", () => {
    if (!state.title.trim()) {
      state.title = "My week";
      $("titleIn").value = state.title;
      save();
    }
  });
}

function initView() {
  $("addBtn").addEventListener("click", () => {
    const S = state.settings;
    newAt(
      S.view === "day" ? S.focusDay : todayIdx(),
      Math.max(S.startHour * 60, 9 * 60),
    );
  });
  $("vWeek").addEventListener("click", () => {
    state.settings.view = "week";
    save();
    render();
  });
  $("vDay").addEventListener("click", () => {
    state.settings.view = "day";
    save();
    render();
  });
  $("daytabs").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    state.settings.focusDay = +b.dataset.d;
    save();
    render();
  });
}

function initExportMenu() {
  const menu = $("exportMenu");
  $("exportBtn").addEventListener("click", (e) => {
    e.stopPropagation();
    const open = !menu.classList.contains("open");
    menu.classList.toggle("open", open);
    $("exportBtn").setAttribute("aria-expanded", open);
    if (open) menu.querySelector("button").focus();
  });
  menu.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    closeMenu();
    doExport(b.dataset.x);
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".menu-wrap")) closeMenu();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });
}

function initImport() {
  $("importBtn").addEventListener("click", () => $("fileIn").click());
  $("fileIn").addEventListener("change", async () => {
    const f = $("fileIn").files[0];
    $("fileIn").value = "";
    if (f) await importFromFile(f);
  });
}

export function initToolbar() {
  initTitle();
  initView();
  initExportMenu();
  initImport();
}
