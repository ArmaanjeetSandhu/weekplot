const HHMM = /^([01]\d|2[0-3])[0-5]\d$/;

export class FormatError extends Error {}

export function parseHHMM(v, field, title) {
  if (typeof v !== "string" || !HHMM.test(v))
    throw new FormatError(
      `"${title}" has ${field} time ${JSON.stringify(v)}. ` +
        `Use four digits on the 24-hour clock, like "0930" or "2215".`,
    );
  return Number(v.slice(0, 2)) * 60 + Number(v.slice(2));
}

export function toHHMM(m) {
  m = ((m % 1440) + 1440) % 1440;
  return (
    String(Math.floor(m / 60)).padStart(2, "0") +
    String(m % 60).padStart(2, "0")
  );
}

export function formatMinutes(m, h24) {
  if (m > 1440) m -= 1440;
  const h = Math.floor(m / 60),
    mi = m % 60;
  if (h24)
    return String(h).padStart(2, "0") + ":" + String(mi).padStart(2, "0");
  const ap = h >= 12 && h < 24 ? "pm" : "am";
  let hh = h % 12;
  if (hh === 0) hh = 12;
  return hh + (mi ? ":" + String(mi).padStart(2, "0") : "") + " " + ap;
}

export function formatHour(h, h24) {
  if (h24) return String(h).padStart(2, "0") + ":00";
  const ap = h >= 12 && h < 24 ? "pm" : "am";
  let hh = h % 12;
  if (hh === 0) hh = 12;
  return hh + " " + ap;
}

export function clampInt(v, a, b, d) {
  v = Math.round(Number(v));
  return Number.isFinite(v) ? Math.min(b, Math.max(a, v)) : d;
}

export function todayIdx() {
  return (new Date().getDay() + 6) % 7;
}
