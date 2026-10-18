import { save, setState, snapshot, state } from "./core/store.js";
import { render } from "./ui/grid.js";
import { undoable } from "./ui/toast.js";

export function update(mutate, { redraw = true, undo } = {}) {
  mutate(state);
  save();
  if (redraw) render();
  if (undo) undoable(undo.message, () => update(undo.revert));
}

export function deleteEvent(ev, afterRender) {
  const i = state.events.indexOf(ev);
  if (i < 0) return;
  update(
    (s) => {
      s.events.splice(s.events.indexOf(ev), 1);
    },
    {
      undo: {
        message: `Deleted ${ev.title}`,
        revert: (s) => {
          if (!s.events.includes(ev))
            s.events.splice(Math.min(i, s.events.length), 0, ev);
        },
      },
    },
  );
  afterRender?.();
}

export function clearEvents() {
  const prev = state.events;
  update(
    (s) => {
      s.events = [];
    },
    {
      undo: {
        message: `Cleared ${prev.length} events`,
        revert: (s) => {
          s.events = [...prev, ...s.events];
        },
      },
    },
  );
}

export function replaceWeek(next, message) {
  const prev = snapshot();
  const replaced = new Set(next.events);
  update(() => setState(next), {
    undo: {
      message,
      revert: (s) => {
        const added = s.events.filter((ev) => !replaced.has(ev));
        setState({ ...prev, events: [...prev.events, ...added] });
      },
    },
  });
}
