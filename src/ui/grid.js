import { COLORS, DAYS, IS_APPLE } from "../constants.js";
import { layoutDay, segmentsFor, visibleDays } from "../core/layout.js";
import { state } from "../core/store.js";
import { todayIdx } from "../core/time.js";
import { $, esc } from "./dom.js";
import { fmt, fmtHour, range } from "./format.js";

export function hourHeight() {
  return (
    Number.parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--hh"),
    ) || 52
  );
}

export function evSelector(k) {
  return `.ev[data-id="${CSS.escape(k.id)}"][data-day="${k.day}"][data-off="${k.off}"]`;
}

export function evKey(el) {
  return { id: el.dataset.id, day: el.dataset.day, off: el.dataset.off };
}

export function focusedEv() {
  const a = document.activeElement;
  return a?.matches?.("#grid .ev[data-id]") ? a : null;
}

export function render() {
  const f = focusedEv(),
    keep = f ? evKey(f) : null;
  renderGrid();
  if (keep) $("grid").querySelector(evSelector(keep))?.focus();
}

function renderGrid() {
  const S = state.settings,
    grid = $("grid"),
    board = $("board");
  const days = S.view === "day" ? [S.focusDay] : visibleDays(S);
  if (S.view === "day" && !visibleDays(S).includes(S.focusDay))
    S.focusDay = visibleDays(S)[0];
  const shown = S.view === "day" ? [S.focusDay] : days;
  const hours = S.endHour - S.startHour;
  board.classList.toggle("dayview", S.view === "day");
  $("vWeek").setAttribute("aria-pressed", S.view === "week");
  $("vDay").setAttribute("aria-pressed", S.view === "day");
  $("titleIn").value = state.title;

  $("daytabs").innerHTML = visibleDays(S)
    .map(
      (d) =>
        `<button data-d="${d}" aria-pressed="${d === S.focusDay}">${DAYS[d]}</button>`,
    )
    .join("");

  grid.style.setProperty("--hours", hours);
  grid.style.gridTemplateColumns = `60px repeat(${shown.length}, minmax(${S.view === "day" ? 200 : 112}px, 1fr))`;
  const t = todayIdx();
  let html = `<div class="corner"></div>`;
  for (const d of shown) {
    html += `<div class="dayhead${d === t ? " today" : ""}"><b>${DAYS[d]}</b></div>`;
  }
  html += `<div class="times" aria-hidden="true">`;
  for (let h = S.startHour; h < S.endHour; h++)
    html += `<span style="top:${((h - S.startHour) * 100) / hours}%">${fmtHour(h)}</span>`;
  html += `</div>`;
  const H = hourHeight(),
    base = S.startHour * 60,
    maxM = S.endHour * 60;
  for (const d of shown) {
    const items = segmentsFor(state.events, d).filter(
      (it) => it.end > base && it.start < maxM,
    );
    layoutDay(items);
    html += `<div class="col${d === t ? " today" : ""}" data-day="${d}" aria-label="${DAYS[d]}">`;
    for (const it of items) html += eventHTML(it, d, base, maxM, H);
    if (d === t) {
      const n = new Date(),
        nm = n.getHours() * 60 + n.getMinutes();
      if (nm >= base && nm <= maxM)
        html += `<div class="nowline" style="top:${((nm - base) / 60) * H}px"></div>`;
    }
    html += `</div>`;
  }
  grid.innerHTML = html;
}

function eventHTML(it, d, base, maxM, H) {
  const ev = it.ev,
    s = Math.max(it.start, base),
    e = Math.min(it.end, maxM);
  const top = ((s - base) / 60) * H,
    height = Math.max(18, ((e - s) / 60) * H - 2);
  const w = 100 / it.ncol,
    left = it.col * w;
  const short = height < 40;
  const cls =
    (short ? " short" : "") +
    (it.contOut ? " cont-out" : "") +
    (it.contIn ? " cont-in" : "");
  const shortTime = it.contIn ? "until " + fmt(ev.end) : fmt(ev.start);
  const style =
    `--c:${COLORS[ev.color]};top:${top + 1}px;height:${height}px;` +
    `left:calc(${left}% + 3px);width:calc(${w}% - 6px)`;
  const noteLabel = ev.note ? ", " + esc(ev.note) : "";
  const label = `${esc(ev.title)}, ${DAYS[it.anchor]} ${range(ev)}${noteLabel}. Edit`;
  const icon = ev.icon ? ev.icon + " " : "";
  const time = short ? shortTime : range(ev);
  const note =
    !short && ev.note && height > 70
      ? `<span class="n">${esc(ev.note)}</span>`
      : "";
  const resize = it.contOut
    ? ""
    : '<span class="rz" aria-hidden="true"></span>';
  const resizeTop =
    it.contIn || it.start < base
      ? ""
      : '<span class="rz rz-top" aria-hidden="true"></span>';
  return (
    `<button class="ev${cls}" data-id="${esc(ev.id)}" data-day="${d}" data-off="${it.off}" style="${style}" aria-label="${label}" aria-keyshortcuts="${IS_APPLE ? "Backspace Delete" : "Delete"}">` +
    resizeTop +
    `<span class="t">${icon}${esc(ev.title)}</span>` +
    `<span class="h">${time}</span>` +
    note +
    resize +
    "</button>"
  );
}
