export const $ = (id) => document.getElementById(id);

export const esc = (s) =>
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

export const dialogOpen = () =>
  !!document.querySelector("dialog[open]:not(.closing)");
