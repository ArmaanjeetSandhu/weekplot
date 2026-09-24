import { formatHour, formatMinutes } from "../core/time.js";
import { state } from "../core/store.js";

export const fmt = (m) => formatMinutes(m, state.settings.h24);
export const fmtHour = (h) => formatHour(h, state.settings.h24);

export const rangeOf = (s, e) =>
  fmt(s) + " – " + fmt(e) + (e > 1440 ? " next day" : "");

export const range = (ev) => rangeOf(ev.start, ev.end);

export const midnightLabel = () =>
  state.settings.h24 ? "24:00" : "12 am (midnight)";
