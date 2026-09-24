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

export async function initStore() {
  let week;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) week = sanitize(JSON.parse(raw));
  } catch (e) {
    console.warn("Couldn't read the saved schedule, starting fresh:", e);
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
  clearTimeout(saveT);
  saveT = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serialize(state)));
    } catch (e) {}
  }, 250);
}
