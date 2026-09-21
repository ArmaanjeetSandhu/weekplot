(async function () {
  "use strict";
  const KEY = "weekplot:v1",
    PREF = "weekplot:theme";
  const DAYS = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  const SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const COLORS = {
    sky: "#3B7BF5",
    mint: "#1F9D68",
    lemon: "#D9A200",
    coral: "#EE5A36",
    lilac: "#8A5CF6",
    rose: "#DB3F76",
    sand: "#A07A4E",
    slate: "#64748B",
  };
  const ICONS = [
    "",
    "📚",
    "✏️",
    "🧪",
    "💻",
    "💼",
    "🏃",
    "🧘",
    "🍳",
    "☕",
    "🛒",
    "🧹",
    "👪",
    "🩺",
    "🎵",
    "🎨",
    "⚽",
    "😴",
  ];
  const $ = (id) => document.getElementById(id);
  const esc = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );

  const MAXDUR = 1440 - 5;

  const HHMM = /^([01]\d|2[0-3])[0-5]\d$/;
  class FormatError extends Error {}
  function parseHHMM(v, field, title) {
    if (typeof v !== "string" || !HHMM.test(v))
      throw new FormatError(
        `"${title}" has ${field} time ${JSON.stringify(v)}. ` +
          `Use four digits on the 24-hour clock, like "0930" or "2215".`,
      );
    return Number(v.slice(0, 2)) * 60 + Number(v.slice(2));
  }
  function toHHMM(m) {
    m = ((m % 1440) + 1440) % 1440;
    return (
      String(Math.floor(m / 60)).padStart(2, "0") +
      String(m % 60).padStart(2, "0")
    );
  }
  function serialize() {
    return {
      app: "weekplot",
      title: state.title,
      settings: state.settings,
      events: state.events.map((ev) => ({
        ...ev,
        start: toHHMM(ev.start),
        end: toHHMM(ev.end),
      })),
    };
  }
  const uid = () => Math.random().toString(36).slice(2, 10); // NOSONAR

  const SAMPLE_URL = "sample-week.json";
  let sampleRaw = null;

  async function loadSample() {
    if (!sampleRaw) {
      const res = await fetch(SAMPLE_URL, { cache: "no-cache" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      sampleRaw = await res.json();
    }
    return sanitize(structuredClone(sampleRaw));
  }

  function blankWeek() {
    return { title: "My week", settings: defaults(), events: [] };
  }
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
  function todayIdx() {
    return (new Date().getDay() + 6) % 7;
  }

  let state;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = sanitize(JSON.parse(raw));
  } catch (e) {
    console.warn("Couldn't read the saved schedule, starting fresh:", e);
  }
  if (!state) {
    try {
      state = await loadSample();
    } catch (e) {
      console.warn("Couldn't load " + SAMPLE_URL + ":", e);
      state = blankWeek();
    }
  }

  function sanitize(o) {
    if (!o || typeof o !== "object" || !Array.isArray(o.events))
      throw new Error("bad");
    const s = Object.assign(defaults(), o.settings || {});
    s.startHour = clampInt(s.startHour, 0, 23, 7);
    s.endHour = clampInt(s.endHour, 1, 24, 21);
    if (s.endHour <= s.startHour) s.endHour = Math.min(24, s.startHour + 1);
    s.snap = [5, 15, 30, 60].includes(+s.snap) ? +s.snap : 15;
    s.clickLen = [30, 60, 90, 120].includes(+s.clickLen) ? +s.clickLen : 60;
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
  function clampInt(v, a, b, d) {
    v = Math.round(Number(v));
    return Number.isFinite(v) ? Math.min(b, Math.max(a, v)) : d;
  }

  let saveT;
  function save() {
    clearTimeout(saveT);
    saveT = setTimeout(() => {
      try {
        localStorage.setItem(KEY, JSON.stringify(serialize()));
      } catch (e) {}
    }, 250);
  }

  function fmt(m) {
    const S = state.settings;
    if (m > 1440) m -= 1440;
    let h = Math.floor(m / 60),
      mi = m % 60;
    if (S.h24)
      return String(h).padStart(2, "0") + ":" + String(mi).padStart(2, "0");
    const ap = h >= 12 && h < 24 ? "pm" : "am";
    let hh = h % 12;
    if (hh === 0) hh = 12;
    return hh + (mi ? ":" + String(mi).padStart(2, "0") : "") + " " + ap;
  }
  function fmtHour(h) {
    if (state.settings.h24) return String(h).padStart(2, "0") + ":00";
    const ap = h >= 12 && h < 24 ? "pm" : "am";
    let hh = h % 12;
    if (hh === 0) hh = 12;
    return hh + " " + ap;
  }
  function rangeOf(s, e) {
    return fmt(s) + " – " + fmt(e) + (e > 1440 ? " next day" : "");
  }
  function range(ev) {
    return rangeOf(ev.start, ev.end);
  }
  function segmentsFor(d) {
    const out = [],
      prev = (d + 6) % 7;
    state.events.forEach((ev) => {
      if (ev.days.includes(d))
        out.push({
          ev,
          start: ev.start,
          end: Math.min(ev.end, 1440),
          off: 0,
          anchor: d,
          contOut: ev.end > 1440,
          contIn: false,
        });
      if (ev.end > 1440 && ev.days.includes(prev))
        out.push({
          ev,
          start: 0,
          end: ev.end - 1440,
          off: 1440,
          anchor: prev,
          contOut: false,
          contIn: true,
        });
    });
    return out;
  }
  function visibleDays() {
    const S = state.settings;
    let order =
      S.weekStart === "sun" ? [6, 0, 1, 2, 3, 4, 5] : [0, 1, 2, 3, 4, 5, 6];
    if (!S.weekends) order = order.filter((d) => d < 5);
    return order;
  }
  function layoutDay(items) {
    items.sort((a, b) => a.start - b.start || b.end - a.end);
    const clusters = [];
    let cur = [],
      curEnd = -1;
    for (const it of items) {
      if (cur.length && it.start >= curEnd) {
        clusters.push(cur);
        cur = [];
        curEnd = -1;
      }
      cur.push(it);
      curEnd = Math.max(curEnd, it.end);
    }
    if (cur.length) clusters.push(cur);
    for (const c of clusters) {
      const cols = [];
      for (const it of c) {
        let i = cols.findIndex((end) => end <= it.start);
        if (i < 0) {
          i = cols.length;
          cols.push(0);
        }
        cols[i] = it.end;
        it.col = i;
      }
      c.forEach((it) => (it.ncol = cols.length));
    }
    return items;
  }
  function hh() {
    return (
      Number.parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue("--hh"),
      ) || 52
    );
  }

  function render() {
    const S = state.settings,
      grid = $("grid"),
      board = $("board");
    const days = S.view === "day" ? [S.focusDay] : visibleDays();
    if (S.view === "day" && !visibleDays().includes(S.focusDay))
      S.focusDay = visibleDays()[0];
    const shown = S.view === "day" ? [S.focusDay] : days;
    const hours = S.endHour - S.startHour;
    board.classList.toggle("dayview", S.view === "day");
    $("vWeek").setAttribute("aria-pressed", S.view === "week");
    $("vDay").setAttribute("aria-pressed", S.view === "day");
    $("titleIn").value = state.title;

    $("daytabs").innerHTML = visibleDays()
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
    const H = hh(),
      base = S.startHour * 60,
      maxM = S.endHour * 60;
    for (const d of shown) {
      const items = segmentsFor(d).filter(
        (it) => it.end > base && it.start < maxM,
      );
      layoutDay(items);
      html += `<div class="col${d === t ? " today" : ""}" data-day="${d}" aria-label="${DAYS[d]}">`;
      for (const it of items) {
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
        html +=
          `<button class="ev${cls}" data-id="${esc(ev.id)}" data-day="${d}" data-off="${it.off}" style="${style}" aria-label="${label}">` +
          resizeTop +
          `<span class="t">${icon}${esc(ev.title)}</span>` +
          `<span class="h">${time}</span>` +
          note +
          resize +
          "</button>";
      }
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

  let toastT;
  function toast(msg) {
    const el = $("toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastT);
    toastT = setTimeout(() => el.classList.remove("show"), 2400);
  }

  let suppressUntil = 0,
    drag = null;
  const snapM = (m) => {
    const s = state.settings.snap;
    return Math.round(m / s) * s;
  };
  function minutesAt(col, clientY) {
    const r = col.getBoundingClientRect();
    return state.settings.startHour * 60 + ((clientY - r.top) / hh()) * 60;
  }

  $("grid").addEventListener("pointerdown", (e) => {
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
      startMove(e, evEl, col);
      return;
    }
    if (e.pointerType === "touch") return;
    startCreate(e, col);
  });

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
  function startMove(e, evEl, col) {
    const ev = state.events.find((x) => x.id === evEl.dataset.id);
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
    const ev = state.events.find((x) => x.id === evEl.dataset.id);
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
    const ev = state.events.find((x) => x.id === evEl.dataset.id);
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
  window.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const S = state.settings,
      H = hh(),
      base = S.startHour * 60,
      maxM = S.endHour * 60;
    if (drag.type === "create") {
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
    } else if (drag.type === "move") {
      if (
        !drag.moved &&
        Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 5
      )
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
      let dm = Math.round((((e.clientY - drag.y0) / H) * 60) / 15) * 15;
      let ns = Math.max(
        Math.min(0, 15 - dur),
        Math.min(1440 - 15, drag.cs + dm),
      );
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
    } else if (drag.type === "resize") {
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
    } else if (drag.type === "resizeTop") {
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
  });
  window.addEventListener("pointerup", (e) => {
    if (!drag) return;
    const d = drag;
    drag = null;
    document.body.style.cursor = "";
    if (d.type === "create") {
      suppressUntil = performance.now() + 350;
      if (d.sel) d.sel.remove();
      if (d.moved) openEditor(null, { day: d.day, start: d.a, end: d.b });
      else newAt(d.day, d.m0);
    } else if (d.type === "move") {
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
  });
  window.addEventListener("pointercancel", () => {
    if (drag) {
      if (drag.sel) drag.sel.remove();
      drag = null;
      render();
    }
  });

  $("grid").addEventListener("click", (e) => {
    if (performance.now() < suppressUntil) return;
    if (e.target.closest(".rz")) return;
    const evEl = e.target.closest(".ev");
    if (evEl) {
      const ev = state.events.find((x) => x.id === evEl.dataset.id);
      if (ev) openEditor(ev, { day: +evEl.dataset.day });
      return;
    }
    const col = e.target.closest(".col");
    if (col) {
      const S = state.settings;
      newAt(
        +col.dataset.day,
        Math.floor(minutesAt(col, e.clientY) / S.snap) * S.snap,
      );
    }
  });
  function newAt(day, m) {
    const S = state.settings;
    m = Math.max(0, Math.min(1440 - S.snap, m));
    openEditor(null, { day, start: m, end: m + S.clickLen });
  }

  let editing = null,
    form = {};
  const TIMES = [];
  for (let m = 0; m <= 1440; m += 5) TIMES.push(m);
  function midnightLabel() {
    return state.settings.h24 ? "24:00" : "12 am (midnight)";
  }
  function fillTimeSelect(sel, val, forEnd) {
    const opts = TIMES.filter((m) => (forEnd ? m > 0 : m < 1440));
    if (!opts.includes(val)) {
      opts.push(val);
      opts.sort((a, b) => a - b);
    }
    sel.innerHTML = opts
      .filter((m) => m % 15 === 0 || m === val)
      .map((m) => {
        const label = m === 1440 ? midnightLabel() : fmt(m);
        return `<option value="${m}"${m === val ? " selected" : ""}>${label}</option>`;
      })
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
  function openEditor(ev, ctx) {
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
    fillTimeSelect($("fStart"), form.start, false);
    fillEndSelect(form.start, form.end);
    paintForm();
    openModal("evDlg");
    setTimeout(() => $("fTitle").focus(), 30);
  }
  let lastColor = "sky";
  function paintForm() {
    const order =
      state.settings.weekStart === "sun"
        ? [6, 0, 1, 2, 3, 4, 5]
        : [0, 1, 2, 3, 4, 5, 6];
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
  $("fSave").addEventListener("click", () => {
    if (!commitForm()) return;
    lastColor = form.color;
    if (editing) {
      Object.assign(editing, form, {
        days: [...form.days].sort((a, b) => a - b),
      });
      toast(`Changes saved${hiddenNote(form)}`);
    } else {
      state.events.push({
        id: uid(),
        ...form,
        days: [...form.days].sort((a, b) => a - b),
      });
      toast(`Added ${form.title}${hiddenNote(form)}`);
    }
    closeModal("evDlg");
    save();
    render();
  });
  function hiddenNote(f) {
    if (f.end <= 1440) return "";
    const S = state.settings,
      base = S.startHour * 60,
      maxM = S.endHour * 60;
    const clipped = base > 0 || maxM < 1440;
    return clipped
      ? ". Widen the day's hours in Settings to see all of it."
      : "";
  }
  $("fTitle").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      $("fSave").click();
    }
  });
  $("fNote").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      $("fSave").click();
    }
  });
  $("fDel").addEventListener("click", () => {
    if (!editing) return;
    const i = state.events.indexOf(editing),
      removed = editing;
    state.events.splice(i, 1);
    closeModal("evDlg");
    save();
    render();
    undoable(`Deleted ${removed.title}`, () => {
      state.events.splice(i, 0, removed);
      save();
      render();
    });
  });
  $("fDup").addEventListener("click", () => {
    if (!editing || !commitForm()) return;
    const copy = {
      ...form,
      id: uid(),
      title: form.title + " (copy)",
      days: [...form.days],
    };
    state.events.push(copy);
    closeModal("evDlg");
    save();
    render();
    openEditor(copy, {});
  });
  $("fCancel").addEventListener("click", () => closeModal("evDlg"));

  function undoable(msg, fn) {
    const el = $("toast");
    el.innerHTML =
      esc(msg) +
      ` <button style="margin-left:10px;border:0;background:transparent;color:inherit;text-decoration:underline;font-weight:700;pointer-events:auto" id="undoBtn">Undo</button>`;
    el.style.pointerEvents = "auto";
    el.classList.add("show");
    clearTimeout(toastT);
    $("undoBtn").onclick = () => {
      fn();
      el.classList.remove("show");
      el.style.pointerEvents = "none";
    };
    toastT = setTimeout(() => {
      el.classList.remove("show");
      el.style.pointerEvents = "none";
    }, 5000);
  }

  function openModal(id) {
    $(id).showModal();
  }
  function closeModal(id) {
    $(id).close();
  }
  document.querySelectorAll("dialog.modal").forEach((d) =>
    d.addEventListener("pointerdown", (e) => {
      if (e.target !== d) return;
      const r = d.getBoundingClientRect();
      const inside =
        e.clientX >= r.left &&
        e.clientX <= r.right &&
        e.clientY >= r.top &&
        e.clientY <= r.bottom;
      if (inside) return;
      e.preventDefault();
      d.close();
    }),
  );
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });

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

  const menu = $("exportMenu");
  function closeMenu() {
    menu.classList.remove("open");
    $("exportBtn").setAttribute("aria-expanded", "false");
  }
  $("exportBtn").addEventListener("click", (e) => {
    e.stopPropagation();
    const o = !menu.classList.contains("open");
    menu.classList.toggle("open", o);
    $("exportBtn").setAttribute("aria-expanded", o);
    if (o) menu.querySelector("button").focus();
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".menu-wrap")) closeMenu();
  });
  menu.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    closeMenu();
    doExport(b.dataset.x);
  });

  $("importBtn").addEventListener("click", () => $("fileIn").click());
  $("fileIn").addEventListener("change", async () => {
    const f = $("fileIn").files[0];
    $("fileIn").value = "";
    if (!f) return;
    try {
      const data = sanitize(JSON.parse(await f.text()));
      const prev = structuredClone(state);
      data.settings.view = state.settings.view;
      state = data;
      save();
      render();
      undoable(
        `Imported ${state.title} (${state.events.length} events)`,
        () => {
          state = prev;
          save();
          render();
        },
      );
    } catch (err) {
      console.warn("Import failed:", err);
      toast(
        err instanceof FormatError
          ? "Couldn't import: " + err.message
          : "That file isn't a Weekplot backup. Choose a .json file exported from here.",
      );
    }
  });

  const slug = () =>
    (state.title || "schedule")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "schedule";

  function download(filename, data, type) {
    const blob = data instanceof Blob ? data : new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(`Saved ${filename}`);
  }

  async function doExport(kind) {
    if (kind === "json") {
      const txt = JSON.stringify(serialize(), null, 2);
      download(slug() + ".json", txt, "application/json");
    } else if (kind === "png") {
      toast("Drawing image…");
      const canvas = await drawPNG();
      canvas.toBlob((blob) => {
        if (blob) download(slug() + ".png", blob);
        else toast("Couldn't create the image. Please try again.");
      }, "image/png");
    }
  }

  function mix(hex, pct, base) {
    const p = (h) =>
      [1, 3, 5].map((i) => Number.parseInt(h.slice(i, i + 2), 16));
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
    while (t.length > 1 && ctx.measureText(t + "…").width > w)
      t = t.slice(0, -1);
    return t + "…";
  }
  async function drawPNG() {
    try {
      await document.fonts.ready;
    } catch (e) {}
    const S = state.settings,
      days = visibleDays(),
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
    const INK = "#16233A",
      MUTED = "#5B6B82",
      LINE = "#D3DDE9",
      SOFT = "#E8EEF5";
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, W, Hh);
    ctx.fillStyle = INK;
    ctx.font = '800 40px "Bricolage Grotesque", system-ui, sans-serif';
    ctx.textBaseline = "alphabetic";
    ctx.fillText(fitText(ctx, state.title, W - pad * 2 - 300), pad, pad + 44);
    ctx.fillStyle = MUTED;
    ctx.font = '400 16px "Atkinson Hyperlegible", system-ui, sans-serif';
    ctx.textAlign = "right";
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
    ctx.moveTo(pad, top - 0.5 + 0);
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
      const items = segmentsFor(d).filter(
        (it) => it.end > base && it.start < maxM,
      );
      layoutDay(items);
      for (const it of items) {
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
        const tc = mix(col, 0.45, INK);
        ctx.fillStyle = tc;
        if (bh < 44) {
          ctx.font = '700 14px "Atkinson Hyperlegible", system-ui, sans-serif';
          ctx.fillText(
            fitText(
              ctx,
              (ev.icon ? ev.icon + " " : "") + ev.title + "  " + range(ev),
              bw - 16,
            ),
            x + 12,
            y + bh / 2 + 5,
          );
        } else {
          ctx.font = '700 15px "Atkinson Hyperlegible", system-ui, sans-serif';
          ctx.fillText(
            fitText(ctx, (ev.icon ? ev.icon + " " : "") + ev.title, bw - 16),
            x + 12,
            y + 21,
          );
          ctx.font = '400 13px "Atkinson Hyperlegible", system-ui, sans-serif';
          ctx.fillText(fitText(ctx, range(ev), bw - 16), x + 12, y + 39);
          if (ev.note && bh > 64)
            ctx.fillText(fitText(ctx, ev.note, bw - 16), x + 12, y + 57);
        }
        ctx.restore();
      }
    });
    return c;
  }

  function paintSettings() {
    const S = state.settings;
    $("sStart").innerHTML = Array.from(
      { length: 24 },
      (_, h) =>
        `<option value="${h}"${h === S.startHour ? " selected" : ""}>${fmtHour(h)}</option>`,
    ).join("");
    $("sEnd").innerHTML = Array.from({ length: 24 }, (_, i) => i + 1)
      .map((h) => {
        const label = h === 24 ? midnightLabel() : fmtHour(h);
        return `<option value="${h}"${h === S.endHour ? " selected" : ""}>${label}</option>`;
      })
      .join("");
    $("s12").setAttribute("aria-pressed", !S.h24);
    $("s24").setAttribute("aria-pressed", S.h24);
    $("sMon").setAttribute("aria-pressed", S.weekStart === "mon");
    $("sSun").setAttribute("aria-pressed", S.weekStart === "sun");
    $("sWkOn").setAttribute("aria-pressed", S.weekends);
    $("sWkOff").setAttribute("aria-pressed", !S.weekends);
    $("sLen").value = S.clickLen;
    $("sSnap").value = S.snap;
    const th = getTheme();
    $("thAuto").setAttribute("aria-pressed", th === "auto");
    $("thLight").setAttribute("aria-pressed", th === "light");
    $("thDark").setAttribute("aria-pressed", th === "dark");
  }
  function setS(k, v) {
    state.settings[k] = v;
    save();
    render();
    paintSettings();
  }
  $("settingsBtn").addEventListener("click", () => {
    paintSettings();
    openModal("setDlg");
    setTimeout(() => $("sStart").focus(), 30);
  });
  $("sDone").addEventListener("click", () => closeModal("setDlg"));
  $("sStart").addEventListener("change", () => {
    const v = +$("sStart").value;
    if (v >= state.settings.endHour)
      state.settings.endHour = Math.min(24, v + 1);
    setS("startHour", v);
  });
  $("sEnd").addEventListener("change", () => {
    const v = +$("sEnd").value;
    if (v <= state.settings.startHour)
      state.settings.startHour = Math.max(0, v - 1);
    setS("endHour", v);
  });
  $("s12").addEventListener("click", () => setS("h24", false));
  $("s24").addEventListener("click", () => setS("h24", true));
  $("sMon").addEventListener("click", () => setS("weekStart", "mon"));
  $("sSun").addEventListener("click", () => setS("weekStart", "sun"));
  $("sWkOn").addEventListener("click", () => setS("weekends", true));
  $("sWkOff").addEventListener("click", () => setS("weekends", false));
  $("sLen").addEventListener("change", () =>
    setS("clickLen", +$("sLen").value),
  );
  $("sSnap").addEventListener("change", () => setS("snap", +$("sSnap").value));
  $("sClear").addEventListener("click", () => {
    if (!state.events.length) {
      toast("There are no events to clear.");
      return;
    }
    const prev = state.events;
    state.events = [];
    save();
    render();
    closeModal("setDlg");
    undoable(`Cleared ${prev.length} events`, () => {
      state.events = prev;
      save();
      render();
    });
  });
  $("sSample").addEventListener("click", async () => {
    const prev = structuredClone(state);
    let ex;
    try {
      ex = await loadSample();
    } catch (err) {
      toast(
        "Couldn't load the sample week. Check that " +
          SAMPLE_URL +
          " is there.",
      );
      return;
    }
    ex.settings = state.settings;
    state = ex;
    save();
    render();
    closeModal("setDlg");
    undoable("Loaded the sample week", () => {
      state = prev;
      save();
      render();
    });
  });

  function getTheme() {
    try {
      return localStorage.getItem(PREF) || "auto";
    } catch (e) {
      return "auto";
    }
  }
  function applyTheme(t) {
    if (t === "auto") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = t;
  }
  function setTheme(t) {
    try {
      localStorage.setItem(PREF, t);
    } catch (e) {}
    applyTheme(t);
    paintSettings();
  }
  $("thAuto").addEventListener("click", () => setTheme("auto"));
  $("thLight").addEventListener("click", () => setTheme("light"));
  $("thDark").addEventListener("click", () => setTheme("dark"));
  applyTheme(getTheme());

  render();
  setInterval(() => {
    if (!drag && !document.querySelector("dialog[open]")) render();
  }, 60000);
  window.addEventListener("resize", () => {
    if (!drag) render();
  });
})();
