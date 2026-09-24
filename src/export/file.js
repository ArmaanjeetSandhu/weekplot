import { replaceWeek } from "../actions.js";
import { sanitize, serialize } from "../core/schema.js";
import { state } from "../core/store.js";
import { FormatError } from "../core/time.js";
import { toast } from "../ui/toast.js";
import { drawPNG } from "./png.js";

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

export async function doExport(kind) {
  if (kind === "json") {
    const txt = JSON.stringify(serialize(state), null, 2);
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

export async function importFromFile(file) {
  try {
    const data = sanitize(JSON.parse(await file.text()));
    data.settings.view = state.settings.view;
    replaceWeek(data, `Imported ${data.title} (${data.events.length} events)`);
  } catch (err) {
    console.warn("Import failed:", err);
    toast(
      err instanceof FormatError
        ? "Couldn't import: " + err.message
        : "That file isn't a Weekplot backup. Choose a .json file exported from here.",
    );
  }
}
