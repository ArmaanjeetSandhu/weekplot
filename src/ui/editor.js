import { deleteEvent, update } from "../actions.js";
import { COLORS, ICONS, MAXDUR, SHORT } from "../constants.js";
import { weekOrder } from "../core/layout.js";
import { uid } from "../core/schema.js";
import { state } from "../core/store.js";
import { $ } from "./dom.js";
import { fmt, midnightLabel } from "./format.js";
import { closeModal, openModal } from "./modal.js";
import { toast } from "./toast.js";

let editing = null;
let form = {};
let lastColor = "sky";

function fillStartSelect(val) {
  const opts = [];
  for (let m = 0; m < 1440; m += 15) opts.push(m);
  if (!opts.includes(val)) {
    opts.push(val);
    opts.sort((a, b) => a - b);
  }
  $("fStart").innerHTML = opts
    .map(
      (m) =>
        `<option value="${m}"${m === val ? " selected" : ""}>${fmt(m)}</option>`,
    )
    .join("");
}

function fillEndSelect(start, val) {
  const opts = [];
  for (let m = Math.floor(start / 15) * 15 + 15; m < start + 1440; m += 15)
    opts.push(m);
  if (!opts.includes(val)) {
    opts.push(val);
    opts.sort((a, b) => a - b);
  }
  const label = (m) => {
    if (m === 1440) return midnightLabel();
    if (m > 1440) return fmt(m) + " (next day)";
    return fmt(m);
  };
  $("fEnd").innerHTML = opts
    .map(
      (m) =>
        `<option value="${m}"${m === val ? " selected" : ""}>${label(m)}</option>`,
    )
    .join("");
  $("fOvernight").hidden = val <= 1440;
}

function paintForm() {
  const order = weekOrder(state.settings.weekStart);
  $("fDays").innerHTML = order
    .map(
      (d) =>
        `<button type="button" data-d="${d}" aria-pressed="${form.days.includes(d)}">${SHORT[d]}</button>`,
    )
    .join("");
  $("fColor").innerHTML = Object.keys(COLORS)
    .map(
      (k) =>
        `<button type="button" data-c="${k}" aria-pressed="${form.color === k}" aria-label="${k}" style="--c:${COLORS[k]}"></button>`,
    )
    .join("");
  $("fIcon").innerHTML = ICONS.map(
    (i) =>
      `<button type="button" data-i="${i}" aria-pressed="${form.icon === i}" class="${i ? "" : "none"}" aria-label="${i ? "Icon " + i : "No icon"}">${i || "None"}</button>`,
  ).join("");
}

export function openEditor(ev, ctx) {
  editing = ev;
  form = ev
    ? {
        title: ev.title,
        days: [...ev.days],
        start: ev.start,
        end: ev.end,
        color: ev.color,
        icon: ev.icon,
        note: ev.note,
      }
    : {
        title: "",
        days: [ctx.day],
        start: ctx.start,
        end: ctx.end,
        color: lastColor,
        icon: "",
        note: "",
      };
  $("evH").textContent = ev ? "Edit event" : "New event";
  $("fSave").textContent = ev ? "Save changes" : "Add event";
  $("fDel").style.display = ev ? "" : "none";
  $("fDup").style.display = ev ? "" : "none";
  $("fTitle").value = form.title;
  $("fNote").value = form.note;
  $("fErr").textContent = "";
  fillStartSelect(form.start);
  fillEndSelect(form.start, form.end);
  paintForm();
  openModal("evDlg");
}

export function newAt(day, m) {
  const S = state.settings;
  m = Math.max(0, Math.min(1440 - S.snap, m));
  openEditor(null, { day, start: m, end: m + S.clickLen });
}

function commitForm() {
  form.title = $("fTitle").value.trim();
  form.note = $("fNote").value.trim();
  form.start = +$("fStart").value;
  form.end = +$("fEnd").value;
  if (!form.title) {
    $("fErr").textContent = "Give the event a name.";
    $("fTitle").focus();
    return false;
  }
  if (!form.days.length) {
    $("fErr").textContent = "Pick at least one day.";
    return false;
  }
  if (form.end <= form.start || form.end > form.start + MAXDUR) {
    $("fErr").textContent = "End time must be after the start time.";
    $("fEnd").focus();
    return false;
  }
  return true;
}

function hiddenNote(f) {
  if (f.end <= 1440) return "";
  const S = state.settings,
    base = S.startHour * 60,
    maxM = S.endHour * 60;
  const clipped = base > 0 || maxM < 1440;
  return clipped ? ". Widen the day's hours in Settings to see all of it." : "";
}

function onSave() {
  if (!commitForm()) return;
  lastColor = form.color;
  const days = [...form.days].sort((a, b) => a - b);
  const ev = editing;
  closeModal("evDlg");
  update((s) => {
    if (ev) Object.assign(ev, form, { days });
    else s.events.push({ id: uid(), ...form, days });
  });
  toast((ev ? "Changes saved" : `Added ${form.title}`) + hiddenNote(form));
}

function onDelete() {
  if (!editing) return;
  const ev = editing;
  closeModal("evDlg");
  deleteEvent(ev);
}

function onDuplicate() {
  if (!editing || !commitForm()) return;
  const copy = {
    ...form,
    id: uid(),
    title: form.title + " (copy)",
    days: [...form.days],
  };
  closeModal("evDlg");
  update((s) => {
    s.events.push(copy);
  });
  openEditor(copy, {});
}

function saveOnEnter(e) {
  if (e.isComposing || e.keyCode === 229) return;
  if (e.key === "Enter") {
    e.preventDefault();
    $("fSave").click();
  }
}

export function initEditor() {
  $("fDays").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    const d = +b.dataset.d;
    form.days = form.days.includes(d)
      ? form.days.filter((x) => x !== d)
      : [...form.days, d];
    b.setAttribute("aria-pressed", form.days.includes(d));
  });
  $("fColor").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    form.color = b.dataset.c;
    [...$("fColor").children].forEach((x) =>
      x.setAttribute("aria-pressed", x === b),
    );
  });
  $("fIcon").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    form.icon = b.dataset.i;
    [...$("fIcon").children].forEach((x) =>
      x.setAttribute("aria-pressed", x === b),
    );
  });
  $("fStart").addEventListener("change", () => {
    const s = +$("fStart").value;
    let e = +$("fEnd").value;
    if (e <= s || e > s + MAXDUR) {
      const dur = Math.min(MAXDUR, Math.max(15, form.end - form.start));
      e = s + dur;
    }
    fillEndSelect(s, e);
    form.start = s;
    form.end = e;
  });
  $("fEnd").addEventListener("change", () => {
    form.end = +$("fEnd").value;
    $("fOvernight").hidden = form.end <= 1440;
  });
  $("fSave").addEventListener("click", onSave);
  $("fDel").addEventListener("click", onDelete);
  $("fDup").addEventListener("click", onDuplicate);
  $("fCancel").addEventListener("click", () => closeModal("evDlg"));
  $("fTitle").addEventListener("keydown", saveOnEnter);
  $("fNote").addEventListener("keydown", saveOnEnter);
}
