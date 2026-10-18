import { update } from "../actions.js";
import { doExport, importFromFile } from "../export/file.js";
import { state } from "../core/store.js";
import { todayIdx } from "../core/time.js";
import { $ } from "./dom.js";
import { newAt } from "./editor.js";

function closeMenu() {
  $("exportMenu").classList.remove("open");
  $("exportBtn").setAttribute("aria-expanded", "false");
}

function initTitle() {
  $("titleIn").addEventListener("input", () => {
    update(
      (s) => {
        s.title = $("titleIn").value;
      },
      { redraw: false },
    );
  });
  $("titleIn").addEventListener("blur", () => {
    if (state.title.trim()) return;
    update((s) => {
      s.title = "My week";
    });
  });
}

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

function softly(apply) {
  if (reduceMotion.matches) {
    apply();
    return;
  }
  if (document.startViewTransition) {
    document.startViewTransition(apply);
    return;
  }
  apply();
  const board = $("board");
  board.classList.remove("swap");
  board.getBoundingClientRect();
  board.classList.add("swap");
}

function setLayout(changes) {
  const S = state.settings;
  if (Object.entries(changes).every(([k, v]) => S[k] === v)) return;
  softly(() => update((s) => Object.assign(s.settings, changes)));
}

function initView() {
  $("addBtn").addEventListener("click", () => {
    const S = state.settings;
    newAt(
      S.view === "day" ? S.focusDay : todayIdx(),
      Math.max(S.startHour * 60, 9 * 60),
    );
  });
  $("vWeek").addEventListener("click", () => setLayout({ view: "week" }));
  $("vDay").addEventListener("click", () => setLayout({ view: "day" }));
  $("daytabs").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    setLayout({ focusDay: +b.dataset.d });
  });
  $("board").addEventListener("animationend", (e) => {
    if (e.target.parentElement === e.currentTarget)
      e.currentTarget.classList.remove("swap");
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
