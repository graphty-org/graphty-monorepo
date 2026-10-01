// Screen 27: a load that fails entirely (round-3/import.md, "A load that
// fails"). Nothing is loaded. The reader dropped email.xlsx on the Welcome
// sheet. The failure is said where the load started: an error block in the
// Welcome sheet, in the drop zone's place, with the two ways on and the
// error's details. The inset is the other failure shape, inside the Import
// dialog: a file that reads but has no column the element can use as a
// target. The status bar's red chip is the failure's record.
import { EMPTY_LEFT } from "./screen-14.mjs";

export default {
  id: 27,
  title: "A load that fails: said where it started, nothing half-built",
  theme: "light",
  file: null,
  left: EMPTY_LEFT,
  canvas: {
    graph: false,
    overlays: {
      welcome: {
        samples: [
          { name: "Karate Club", nodes: 34, edges: 78 },
          { name: "Cat social network", nodes: 20, edges: 29 },
          { name: "College football", nodes: 115, edges: 613 },
          { name: "Email network", nodes: 1204, edges: 5830, note: "over time" },
        ],
        recent: [{ name: "Karate Club", note: "autosave 14:32" }, { name: "College football", note: "autosave, Sep 15" }],
        error: {
          title: "Could not open email.xlsx",
          text: "It is an Excel workbook, which graphty does not read. Save the sheet as CSV and open that. graphty reads CSV, TSV, JSON, GraphML, GEXF, GML, DOT and Pajek.",
          details: [["Code", "E_UNKNOWN_FORMAT  (Copy)"], ["Read", "first 4 KB, a zip archive"]],
          buttons: [{ label: "Pick the format..." }, { label: "Choose another file", primary: true }],
        },
      },
      dock: { open: false, disabled: true },
    },
  },
  insets: [{
    tag: "The other failure: no target column", left: 256, top: 40, width: 264,
    title: "Import mail-log.csv",
    rows: [
      { type: "select", label: "Source", value: "sender" },
      { type: "field", label: "Target", value: "Pick one...", error: "No column looks like a target. The columns are sender, sent, subject." },
    ],
    footer: [{ label: "Cancel" }, { label: "Load", primary: true, disabled: true }],
  }],
  toolbar: { active: "select", disabled: true, mode: "2D" },
  inspector: { empty: "Nothing loaded" },
  status: { error: { text: "Load failed: not a graph format", links: ["Details"] }, zoom: "100%" },
  caption: {
    title: "Screen 27: a load that fails entirely.",
    text: "email.xlsx dropped on the Welcome sheet. Look at: the error in the Welcome sheet where the drop zone was, in plain words, with what the app does read and what to do; Pick the format... and Choose another file (a read or network error offers Try again instead); the error code with Copy; nothing half-built (the samples and Recent below are unchanged; with a graph open, the graph is). Inset: the other failure, inside the Import dialog, when no column can be the target: the error under the Target field, Load disabled. Status bar: the red \"Load failed: <reason> [Details]\" stays until the next load.",
  },
};
