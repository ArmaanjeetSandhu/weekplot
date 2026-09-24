import { DAYS, MAXDUR } from "../constants.js";
import { save, state } from "../core/store.js";
import { $ } from "./dom.js";
import { newAt, openEditor } from "./editor.js";
import { fmt, rangeOf } from "./format.js";
import { hourHeight, render } from "./grid.js";
import { toast } from "./toast.js";

let drag = null;
let suppressUntil = 0;

export const isDragging = () => !!drag;

const snapM = (m) => {
  const s = state.settings.snap;
  return Math.round(m / s) * s;
};

function minutesAt(col, clientY) {
  const r = col.getBoundingClientRect();
  return (
    state.settings.startHour * 60 + ((clientY - r.top) / hourHeight()) * 60
  );
}

function findEvent(el) {
  return state.events.find((x) => x.id === el.dataset.id);
}

function startCreate(e, col) {
  const S = state.settings,
    m0 = Math.floor(minutesAt(col, e.clientY) / S.snap) * S.snap;
  drag = {
    type: "create",
    col,
    day: +col.dataset.day,
    m0,
    m1: m0 + S.snap,
    y0: e.clientY,
    moved: false,
    sel: null,
  };
  e.preventDefault();
}

function startMove(e, evEl) {
  const ev = findEvent(evEl);
  if (!ev) return;
  const off = +evEl.dataset.off || 0;
  drag = {
    type: "move",
    ev,
    el: evEl,
    origDay: off ? (+evEl.dataset.day + 6) % 7 : +evEl.dataset.day,
    day: +evEl.dataset.day,
    x0: e.clientX,
    y0: e.clientY,
    cs: ev.start - off,
    dur: ev.end - ev.start,
    dm: 0,
    moved: false,
    ghost: null,
  };
}

function startResize(e, evEl, col) {
  const ev = findEvent(evEl);
  if (!ev) return;
  const off = +evEl.dataset.off || 0;
  drag = {
    type: "resize",
    ev,
    el: evEl,
    col,
    off,
    y0: e.clientY,
    end: ev.end - off,
    moved: false,
  };
}

function startResizeTop(e, evEl, col) {
  const ev = findEvent(evEl);
  if (!ev) return;
  drag = {
    type: "resizeTop",
    ev,
    el: evEl,
    col,
    y0: e.clientY,
    start: ev.start,
    moved: false,
  };
}

function onPointerDown(e) {
  if (e.button !== 0) return;
  const rz = e.target.closest(".rz"),
    evEl = e.target.closest(".ev"),
    col = e.target.closest(".col");
  if (!col) return;
  if (rz && evEl) {
    e.preventDefault();
    if (rz.classList.contains("rz-top")) startResizeTop(e, evEl, col);
    else startResize(e, evEl, col);
    return;
  }
  if (evEl) {
    if (e.pointerType === "touch") return;
    startMove(e, evEl);
    return;
  }
  if (e.pointerType === "touch") return;
  startCreate(e, col);
}

function moveCreate(e, H, base, maxM) {
  const S = state.settings;
  if (!drag.moved && Math.abs(e.clientY - drag.y0) < 5) return;
  drag.moved = true;
  let m = snapM(minutesAt(drag.col, e.clientY));
  m = Math.max(base, Math.min(maxM, m));
  const a = Math.min(drag.m0, m),
    b = Math.max(drag.m0 + S.snap, m);
  drag.a = a;
  drag.b = Math.max(b, a + S.snap);
  if (!drag.sel) {
    drag.sel = document.createElement("div");
    drag.sel.className = "sel";
    drag.col.appendChild(drag.sel);
  }
  drag.sel.style.top = ((drag.a - base) / 60) * H + "px";
  drag.sel.style.height = ((drag.b - drag.a) / 60) * H + "px";
  drag.sel.textContent = fmt(drag.a) + " – " + fmt(drag.b);
}

function moveEvent(e, H, base, maxM) {
  if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 5)
    return;
  if (!drag.moved) {
    drag.moved = true;
    drag.el.classList.add("dragging-src");
    const g = drag.el.cloneNode(true);
    g.classList.add("ghost");
    g.classList.remove("dragging-src");
    delete g.dataset.id;
    g.classList.remove("cont-in", "cont-out");
    drag.ghost = g;
    drag.el.parentNode.appendChild(g);
    document.body.style.cursor = "grabbing";
  }
  const dur = drag.dur;
  const dm = Math.round((((e.clientY - drag.y0) / H) * 60) / 15) * 15;
  const ns = Math.max(Math.min(0, 15 - dur), Math.min(1440 - 15, drag.cs + dm));
  drag.dm = ns - drag.cs;
  const under = document.elementFromPoint(e.clientX, e.clientY),
    tcol = under?.closest(".col");
  if (tcol && +tcol.dataset.day !== drag.day) {
    drag.day = +tcol.dataset.day;
    tcol.appendChild(drag.ghost);
    drag.ghost.style.left = "3px";
    drag.ghost.style.width = "calc(100% - 6px)";
  }
  const gs = Math.max(ns, base),
    ge = Math.min(ns + dur, 1440, maxM);
  drag.ghost.style.top = ((gs - base) / 60) * H + 1 + "px";
  drag.ghost.style.height = Math.max(18, ((ge - gs) / 60) * H - 2) + "px";
  const rs = ns < 0 ? ns + 1440 : ns;
  drag.ghost.querySelector(".h").textContent = rangeOf(rs, rs + dur);
}

function moveResize(e, H, base, maxM) {
  const S = state.settings;
  drag.moved = true;
  const cStart = drag.ev.start - drag.off;
  let ne = snapM(drag.end + ((e.clientY - drag.y0) / H) * 60);
  ne = Math.max(cStart + S.snap, Math.min(1440, cStart + MAXDUR, ne));
  drag.newEnd = ne + drag.off;
  const s = Math.max(cStart, 0, base);
  drag.el.style.height =
    Math.max(18, ((Math.min(ne, maxM) - s) / 60) * H - 2) + "px";
  const h = drag.el.querySelector(".h");
  if (h) h.textContent = rangeOf(drag.ev.start, drag.newEnd);
}

function moveResizeTop(e, H, base, maxM) {
  const S = state.settings;
  drag.moved = true;
  const end = drag.ev.end;
  let ns = snapM(drag.start + ((e.clientY - drag.y0) / H) * 60);
  ns = Math.max(0, end - MAXDUR, base, ns);
  ns = Math.min(end - S.snap, 1440 - S.snap, ns);
  drag.newStart = ns;
  const segEnd = Math.min(end, 1440, maxM);
  drag.el.style.top = ((ns - base) / 60) * H + 1 + "px";
  drag.el.style.height = Math.max(18, ((segEnd - ns) / 60) * H - 2) + "px";
  const h = drag.el.querySelector(".h");
  if (h) h.textContent = rangeOf(ns, end);
}

function onPointerMove(e) {
  if (!drag) return;
  const S = state.settings,
    H = hourHeight(),
    base = S.startHour * 60,
    maxM = S.endHour * 60;
  if (drag.type === "create") moveCreate(e, H, base, maxM);
  else if (drag.type === "move") moveEvent(e, H, base, maxM);
  else if (drag.type === "resize") moveResize(e, H, base, maxM);
  else if (drag.type === "resizeTop") moveResizeTop(e, H, base, maxM);
}

function dropCreate(d) {
  if (d.sel) d.sel.remove();
  if (!d.moved) return;
  suppressUntil = performance.now() + 350;
  openEditor(null, { day: d.day, start: d.a, end: d.b });
}

function dropMove(d) {
  if (!d.moved) return;
  suppressUntil = performance.now() + 350;
  const ev = d.ev,
    ncs = d.cs + d.dm;
  const newDay = ncs < 0 ? (d.day + 6) % 7 : d.day;
  ev.start = ncs < 0 ? ncs + 1440 : ncs;
  ev.end = ev.start + d.dur;
  if (newDay !== d.origDay && !ev.days.includes(newDay)) {
    ev.days = ev.days
      .map((x) => (x === d.origDay ? newDay : x))
      .sort((a, b) => a - b);
  } else if (newDay !== d.origDay)
    toast(`${ev.title} already happens on ${DAYS[newDay]}`);
  save();
  render();
}

function onPointerUp() {
  if (!drag) return;
  const d = drag;
  drag = null;
  document.body.style.cursor = "";
  if (d.type === "create") {
    dropCreate(d);
  } else if (d.type === "move") {
    dropMove(d);
  } else if (d.type === "resize") {
    suppressUntil = performance.now() + 350;
    if (d.newEnd) {
      d.ev.end = d.newEnd;
      save();
    }
    render();
  } else if (d.type === "resizeTop") {
    suppressUntil = performance.now() + 350;
    if (d.newStart != null && d.newStart !== d.ev.start) {
      d.ev.start = d.newStart;
      save();
    }
    render();
  }
}

export function initInteractions() {
  const grid = $("grid");
  grid.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", () => {
    if (drag) {
      if (drag.sel) drag.sel.remove();
      drag = null;
      render();
    }
  });

  grid.addEventListener("click", (e) => {
    if (performance.now() < suppressUntil) return;
    if (e.target.closest(".rz")) return;
    const evEl = e.target.closest(".ev");
    if (!evEl) return;
    const ev = findEvent(evEl);
    if (ev) openEditor(ev, { day: +evEl.dataset.day });
  });

  grid.addEventListener("dblclick", (e) => {
    if (performance.now() < suppressUntil) return;
    if (e.target.closest(".ev")) return;
    const col = e.target.closest(".col");
    if (!col) return;
    const S = state.settings;
    newAt(
      +col.dataset.day,
      Math.floor(minutesAt(col, e.clientY) / S.snap) * S.snap,
    );
  });
}
