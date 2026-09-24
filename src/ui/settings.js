import { clearEvents, replaceWeek } from "../actions.js";
import { SAMPLE_FILE } from "../constants.js";
import { loadSample, save, state } from "../core/store.js";
import { $ } from "./dom.js";
import { fmtHour, midnightLabel } from "./format.js";
import { render } from "./grid.js";
import { closeModal, openModal } from "./modal.js";
import { toast } from "./toast.js";
import { getTheme, onThemeChange, setTheme } from "./theme.js";

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

async function loadSampleWeek() {
  let ex;
  try {
    ex = await loadSample();
  } catch (err) {
    toast(
      "Couldn't load the sample week. Check that " + SAMPLE_FILE + " is there.",
    );
    return;
  }
  ex.settings = state.settings;
  closeModal("setDlg");
  replaceWeek(ex, "Loaded the sample week");
}

export function initSettings() {
  onThemeChange(paintSettings);

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
    closeModal("setDlg");
    clearEvents();
  });
  $("sSample").addEventListener("click", loadSampleWeek);

  $("thAuto").addEventListener("click", () => setTheme("auto"));
  $("thLight").addEventListener("click", () => setTheme("light"));
  $("thDark").addEventListener("click", () => setTheme("dark"));
}
