import { save, setState, snapshot, state } from "./core/store.js";
import { render } from "./ui/grid.js";
import { undoable } from "./ui/toast.js";

export function deleteEvent(ev, afterRender) {
  const i = state.events.indexOf(ev);
  if (i < 0) return;
  state.events.splice(i, 1);
  save();
  render();
  afterRender?.();
  undoable(`Deleted ${ev.title}`, () => {
    state.events.splice(i, 0, ev);
    save();
    render();
  });
}

export function clearEvents() {
  const prev = state.events;
  state.events = [];
  save();
  render();
  undoable(`Cleared ${prev.length} events`, () => {
    state.events = prev;
    save();
    render();
  });
}

export function replaceWeek(next, message) {
  const prev = snapshot();
  setState(next);
  save();
  render();
  undoable(message, () => {
    setState(prev);
    save();
    render();
  });
}
