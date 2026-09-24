export function segmentsFor(events, d) {
  const out = [],
    prev = (d + 6) % 7;
  events.forEach((ev) => {
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

export function visibleDays(settings) {
  let order =
    settings.weekStart === "sun"
      ? [6, 0, 1, 2, 3, 4, 5]
      : [0, 1, 2, 3, 4, 5, 6];
  if (!settings.weekends) order = order.filter((d) => d < 5);
  return order;
}

export function layoutDay(items) {
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
