import { COLORS, DAYS } from "../constants.js";
import { layoutDay, segmentsFor, visibleDays } from "../core/layout.js";
import { state } from "../core/store.js";
import { fmtHour, range } from "../ui/format.js";

function mix(hex, pct, base) {
  const p = (h) => [1, 3, 5].map((i) => Number.parseInt(h.slice(i, i + 2), 16));
  const a = p(hex),
    b = p(base || "#FFFFFF");
  return (
    "rgb(" +
    a.map((v, i) => Math.round(v * pct + b[i] * (1 - pct))).join(",") +
    ")"
  );
}

function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fitText(ctx, t, w) {
  if (ctx.measureText(t).width <= w) return t;
  while (t.length > 1 && ctx.measureText(t + "…").width > w) t = t.slice(0, -1);
  return t + "…";
}

const INK = "#16233A",
  MUTED = "#5B6B82",
  LINE = "#D3DDE9",
  SOFT = "#E8EEF5";

function drawEvent(ctx, it, geom) {
  const { gx, colW, top, hourH, base, maxM, i } = geom;
  const ev = it.ev,
    s = Math.max(it.start, base),
    e = Math.min(it.end, maxM),
    col = COLORS[ev.color];
  const w = colW / it.ncol,
    x = gx + i * colW + it.col * w + 4,
    y = top + ((s - base) / 60) * hourH + 2,
    bw = w - 8,
    bh = Math.max(20, ((e - s) / 60) * hourH - 4);
  ctx.fillStyle = mix(col, 0.16);
  rrect(ctx, x, y, bw, bh, 8);
  ctx.fill();
  ctx.save();
  rrect(ctx, x, y, bw, bh, 8);
  ctx.clip();
  ctx.fillStyle = col;
  ctx.fillRect(x, y, 5, bh);
  ctx.fillStyle = mix(col, 0.45, INK);
  const icon = ev.icon ? ev.icon + " " : "";
  if (bh < 44) {
    ctx.font = '700 14px "Atkinson Hyperlegible", system-ui, sans-serif';
    ctx.fillText(
      fitText(ctx, icon + ev.title + "  " + range(ev), bw - 16),
      x + 12,
      y + bh / 2 + 5,
    );
  } else {
    ctx.font = '700 15px "Atkinson Hyperlegible", system-ui, sans-serif';
    ctx.fillText(fitText(ctx, icon + ev.title, bw - 16), x + 12, y + 21);
    ctx.font = '400 13px "Atkinson Hyperlegible", system-ui, sans-serif';
    ctx.fillText(fitText(ctx, range(ev), bw - 16), x + 12, y + 39);
    if (ev.note && bh > 64)
      ctx.fillText(fitText(ctx, ev.note, bw - 16), x + 12, y + 57);
  }
  ctx.restore();
}

export async function drawPNG() {
  try {
    await document.fonts.ready;
  } catch (e) {}
  const S = state.settings,
    days = visibleDays(S),
    hours = S.endHour - S.startHour;
  const W = 1600,
    pad = 48,
    timeW = 84,
    titleH = 96,
    headH = 52,
    hourH = 64;
  const Hh = pad + titleH + headH + hours * hourH + pad;
  const scale = 2,
    c = document.createElement("canvas");
  c.width = W * scale;
  c.height = Hh * scale;
  const ctx = c.getContext("2d");
  ctx.scale(scale, scale);

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, W, Hh);
  ctx.fillStyle = INK;
  ctx.font = '800 40px "Bricolage Grotesque", system-ui, sans-serif';
  ctx.textBaseline = "alphabetic";
  ctx.fillText(fitText(ctx, state.title, W - pad * 2 - 300), pad, pad + 44);
  ctx.fillStyle = MUTED;
  ctx.font = '400 16px "Atkinson Hyperlegible", system-ui, sans-serif';
  ctx.textAlign = "left";

  const gx = pad + timeW,
    gy = pad + titleH,
    colW = (W - pad - gx) / days.length,
    gh = hours * hourH;

  ctx.fillStyle = INK;
  ctx.font = '700 18px "Bricolage Grotesque", system-ui, sans-serif';
  days.forEach((d, i) => ctx.fillText(DAYS[d], gx + i * colW + 12, gy + 32));

  const top = gy + headH;
  for (let h = 0; h <= hours * 2; h++) {
    const y = top + (h * hourH) / 2;
    ctx.strokeStyle = h % 2 ? SOFT : LINE;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(gx, y + 0.5);
    ctx.lineTo(W - pad, y + 0.5);
    ctx.stroke();
  }
  ctx.strokeStyle = LINE;
  ctx.beginPath();
  ctx.moveTo(pad, top - 0.5);
  ctx.lineTo(W - pad, top - 0.5);
  ctx.stroke();
  for (let i = 0; i <= days.length; i++) {
    const x = Math.round(gx + i * colW) + 0.5;
    ctx.beginPath();
    ctx.moveTo(x, gy);
    ctx.lineTo(x, top + gh);
    ctx.stroke();
  }

  ctx.fillStyle = MUTED;
  ctx.font = '400 14px "Atkinson Hyperlegible", system-ui, sans-serif';
  ctx.textAlign = "right";
  for (let h = S.startHour; h < S.endHour; h++)
    ctx.fillText(
      fmtHour(h),
      gx - 10,
      top + (h - S.startHour) * hourH + (h === S.startHour ? 16 : 5),
    );
  ctx.textAlign = "left";

  const base = S.startHour * 60,
    maxM = S.endHour * 60;
  days.forEach((d, i) => {
    const items = segmentsFor(state.events, d).filter(
      (it) => it.end > base && it.start < maxM,
    );
    layoutDay(items);
    for (const it of items)
      drawEvent(ctx, it, { gx, colW, top, hourH, base, maxM, i });
  });
  return c;
}
