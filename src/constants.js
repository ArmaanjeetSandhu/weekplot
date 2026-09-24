export const STORAGE_KEY = "weekplot:v1";
export const THEME_KEY = "weekplot:theme";

export const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
export const SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const COLORS = {
  sky: "#3B7BF5",
  mint: "#1F9D68",
  lemon: "#D9A200",
  coral: "#EE5A36",
  lilac: "#8A5CF6",
  rose: "#DB3F76",
  sand: "#A07A4E",
  slate: "#64748B",
};

export const ICONS = [
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

export const MAXDUR = 1440 - 5;

export const SNAP_STEPS = [5, 15, 30, 60];
export const CLICK_LENGTHS = [30, 60, 90, 120];

export const SAMPLE_FILE = "sample-week.json";
export const SAMPLE_URL = new URL(`../${SAMPLE_FILE}`, import.meta.url).href;

export const IS_APPLE = /Mac|iPhone|iPad|iPod/i.test(
  navigator.userAgentData?.platform ||
    navigator.platform ||
    navigator.userAgent,
);
