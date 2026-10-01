// Screen 22: the Import dialog on its URL tab (round-3/import.md, "Load a graph
// from a URL"). Nothing is loaded; the reader pressed "From a URL..." on the
// Welcome sheet's left panel. The dialog is mid-download: the address, the
// format detected from it, the progress line with Cancel; the preview and the
// roles fill in when the peek has read enough. The inset at the left is the
// same tab after a failed fetch: the error under the Address field and the
// three plain-language failures, each with its way out.
import { EMPTY_LEFT } from "./screen-14.mjs";

export default {
  id: 22,
  title: "Import from a URL: fetching, and the three ways a fetch fails",
  theme: "light",
  file: null,
  left: EMPTY_LEFT,
  canvas: {
    graph: false,
    overlays: {
      dialog: {
        title: "Import from a URL",
        tabs: ["File", "URL", "Paste", "A source"], tab: "URL",
        rows: [
          { type: "field", label: "Address", value: "https://data.example.org/email.csv", icon: "search" },
          { type: "select", label: "Format", value: "Detect from address", note: "CSV, from .csv" },
          { type: "button", label: "Fetches the file, then shows a preview", buttons: [{ label: "Fetch" }] },
          { type: "progress", label: "1.2 of 3.4 MB", value: 35, cancel: true },
          { type: "text", text: "The preview and the column roles appear when enough is read." },
          { type: "section", title: "Columns" },
          { type: "select", label: "Source", value: "waiting for preview" },
          { type: "select", label: "Target", value: "waiting for preview" },
        ],
        note: "Load waits for the preview",
        footer: [{ label: "Cancel" }, { label: "Load", primary: true, disabled: true }],
      },
      dock: { open: false, disabled: true },
    },
  },
  insets: [{
    tag: "If the fetch fails", left: 256, top: 40, width: 264,
    title: "Import from a URL",
    rows: [
      { type: "field", label: "Address", value: "https://data.example.org/email.csv", error: "Probably blocked: this site does not let other sites read the file." },
      { type: "button", buttons: [{ label: "Use the File tab" }, { label: "Retry" }] },
      { type: "note", text: "The other two failures, in the same place:" },
      { type: "text", text: "Not found (404), or you are offline", tone: "error" },
      { type: "button", buttons: [{ label: "Edit address" }, { label: "Retry" }] },
      { type: "text", text: "Not graph data: the address is a web page", tone: "error" },
      { type: "select", label: "Format", value: "Pick..." },
    ],
    footer: [{ label: "Cancel" }, { label: "Load", primary: true, disabled: true }],
  }],
  toolbar: { active: "select", disabled: true, mode: "2D" },
  inspector: { empty: "Nothing loaded" },
  status: { computing: { text: "Fetching email.csv 35%", cancel: "Cancel" }, zoom: "100%" },
  caption: {
    title: "Screen 22: import from a URL.",
    text: "\"From a URL...\" opened the Import dialog on its URL tab. Look at: the Address field; Format \"Detect from address\" with what it detected; Fetch; the download line \"1.2 of 3.4 MB\" with Cancel, mirrored in the status bar; the roles waiting for the preview; Load disabled until the preview, and the footer says why. Inset: the same tab after a failed fetch, the error under the Address field in red, and the three failures in plain words (blocked by the site, not found or offline, not graph data), each with its way out. Enter in the Address field is Fetch; Esc cancels the download, then closes.",
  },
};
