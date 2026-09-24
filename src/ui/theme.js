import { IS_APPLE, THEME_KEY } from "../constants.js";
import { $ } from "./dom.js";
import { toast } from "./toast.js";

const listeners = new Set();

export function onThemeChange(fn) {
  listeners.add(fn);
}

export function getTheme() {
  try {
    return localStorage.getItem(THEME_KEY) || "auto";
  } catch (e) {
    return "auto";
  }
}

function applyTheme(t) {
  if (t === "auto") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = t;
}

export function setTheme(t) {
  try {
    localStorage.setItem(THEME_KEY, t);
  } catch (e) {}
  applyTheme(t);
  listeners.forEach((fn) => fn(t));
}

function effectiveTheme() {
  const t = getTheme();
  if (t !== "auto") return t;
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function toggleTheme() {
  const next = effectiveTheme() === "dark" ? "light" : "dark";
  setTheme(next);
  toast(next === "dark" ? "Dark mode" : "Light mode");
}

export function initTheme() {
  applyTheme(getTheme());
  $("thD").textContent =
    String.raw`Press ${IS_APPLE ? "⌘" : "Ctrl +"} \ to switch`;
}
