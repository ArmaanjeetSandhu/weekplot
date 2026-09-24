import {
  CLICK_LENGTHS,
  COLORS,
  ICONS,
  MAXDUR,
  SNAP_STEPS,
} from "../constants.js";
import { FormatError, clampInt, parseHHMM, toHHMM, todayIdx } from "./time.js";

export const uid = () => Math.random().toString(36).slice(2, 10); // NOSONAR

function defaults() {
  return {
    startHour: 7,
    endHour: 21,
    h24: false,
    weekends: true,
    weekStart: "mon",
    view: window.innerWidth < 700 ? "day" : "week",
    focusDay: todayIdx(),
    snap: 15,
    clickLen: 60,
  };
}

export function blankWeek() {
  return { title: "My week", settings: defaults(), events: [] };
}

export function sanitize(o) {
  if (!o || typeof o !== "object" || !Array.isArray(o.events))
    throw new Error("bad");
  const s = Object.assign(defaults(), o.settings || {});
  s.startHour = clampInt(s.startHour, 0, 23, 7);
  s.endHour = clampInt(s.endHour, 1, 24, 21);
  if (s.endHour <= s.startHour) s.endHour = Math.min(24, s.startHour + 1);
  s.snap = SNAP_STEPS.includes(+s.snap) ? +s.snap : 15;
  s.clickLen = CLICK_LENGTHS.includes(+s.clickLen) ? +s.clickLen : 60;
  s.focusDay = clampInt(s.focusDay, 0, 6, 0);
  s.view = s.view === "day" ? "day" : "week";
  s.weekStart = s.weekStart === "sun" ? "sun" : "mon";
  s.h24 = !!s.h24;
  s.weekends = s.weekends !== false;
  const events = o.events.map((ev) => {
    const name = String(ev.title || "Untitled").slice(0, 80);
    const start = parseHHMM(ev.start, "start", name);
    let end = parseHHMM(ev.end, "end", name);
    if (end === start)
      throw new FormatError(
        `"${name}" starts and ends at ${ev.start}. Give it a different end time.`,
      );
    if (end < start) end += 1440;
    const days = Array.isArray(ev.days)
      ? [...new Set(ev.days.map(Number).filter((d) => d >= 0 && d <= 6))]
      : [];
    return {
      id: String(ev.id || uid()),
      title: name,
      days: days.length ? days : [0],
      start,
      end: Math.min(Math.max(end, start + 5), start + MAXDUR),
      color: COLORS[ev.color] ? ev.color : "sky",
      icon: ICONS.includes(ev.icon) ? ev.icon : "",
      note: String(ev.note || "").slice(0, 120),
    };
  });
  return {
    title: String(o.title || "My week").slice(0, 80),
    settings: s,
    events,
  };
}

export function serialize(week) {
  return {
    app: "weekplot",
    title: week.title,
    settings: week.settings,
    events: week.events.map((ev) => ({
      ...ev,
      start: toHHMM(ev.start),
      end: toHHMM(ev.end),
    })),
  };
}
