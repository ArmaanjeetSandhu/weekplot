import { SAMPLE_URL, STORAGE_KEY } from "../constants.js";
import { blankWeek, sanitize, serialize } from "./schema.js";

export const state = { title: "", settings: null, events: [] };

export function setState(next) {
  state.title = next.title;
  state.settings = next.settings;
  state.events = next.events;
  return state;
}

export function snapshot() {
  return structuredClone(state);
}

let sampleRaw = null;

export async function loadSample() {
  if (!sampleRaw) {
    const res = await fetch(SAMPLE_URL, { cache: "no-cache" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    sampleRaw = await res.json();
  }
  return sanitize(structuredClone(sampleRaw));
}

const UNREADABLE_PREFIX = STORAGE_KEY + ".unreadable.";

let loadProblem = null;
let savingBlocked = false;

function preserveUnreadable(raw) {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(UNREADABLE_PREFIX) && localStorage.getItem(key) === raw)
        return key;
    }
    const key = UNREADABLE_PREFIX + new Date().toISOString();
    localStorage.setItem(key, raw);
    return key;
  } catch (e) {
    console.warn("Couldn't keep a copy of the unreadable schedule:", e);
    return null;
  }
}

export function getLoadProblem() {
  return loadProblem;
}

export async function initStore() {
  let week;
  let raw = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch (e) {
    console.warn("Couldn't access saved data:", e);
  }
  if (raw) {
    try {
      week = sanitize(JSON.parse(raw));
    } catch (e) {
      const backupKey = preserveUnreadable(raw);
      savingBlocked = !backupKey;
      loadProblem = { error: e, backupKey };
      console.warn(
        backupKey
          ? `Couldn't read the saved schedule; kept a copy under "${backupKey}":`
          : "Couldn't read the saved schedule, and couldn't back it up; saving is off:",
        e,
      );
    }
  }
  if (!week) {
    try {
      week = await loadSample();
    } catch (e) {
      console.warn("Couldn't load the sample week:", e);
      week = blankWeek();
    }
  }
  return setState(week);
}

let saveT;

export function save() {
  if (savingBlocked) return;
  clearTimeout(saveT);
  saveT = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serialize(state)));
    } catch (e) {}
  }, 250);
}
