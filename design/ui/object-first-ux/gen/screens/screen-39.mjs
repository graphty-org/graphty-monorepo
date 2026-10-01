// Screen 39: editing a value (round-3/data-editing.md, "Edit a value").
// Screen 9's state (College football, BrighamYoung selected, the table open).
// The reader double-clicked BrighamYoung's `value` cell (its conference) in
// the table and typed 9: the cell is in edit mode, Enter keeps and Escape
// reverts; the node's Attributes tab shows the same edit in its field. Nothing
// is committed yet, so the canvas still paints conference 7. The first inset
// is the moment after Enter (the node repainted, the file's value kept with
// Revert, the status bar's report with Undo); the second is a value of the
// wrong type, refused in place.
import S9 from "./screen-9.mjs";
import { NODES } from "../football.mjs";
import { DATASET_ROW, CONF_STRIP } from "../football-state.mjs";

const ID = NODES.find((x) => x.label === "BrighamYoung").id;
const table = S9.canvas.overlays.dock.table;
const row = table.rows.findIndex((r) => r[0] === "BrighamYoung");

export default {
  id: 39,
  title: "Editing a value",
  theme: "light",
  file: "College football",
  fileState: { unsaved: true },
  left: {
    views: { rows: [{ name: "Overview", current: true }] },
    objects: { rows: [
      { ...DATASET_ROW, children: [
        { kind: "set", name: "Top 10 by Bridges", nodes: 10, chip: { type: "ring", color: "ink" }, childSelected: true },
        { kind: "measure", name: "Bridges (Betweenness)", values: 115, chip: { type: "size" } },
        { kind: "grouping", name: "Conference", groups: 12, expanded: false, childSelected: true, chip: CONF_STRIP },
      ] },
    ] },
  },
  canvas: {
    ...S9.canvas,
    overlays: { dock: { ...S9.canvas.overlays.dock, table: { ...table, editCell: { row, col: 1, value: "9" } } } },
  },
  toolbar: { active: "select", mode: "2D" },
  insets: [
    {
      tag: "After Enter", left: 256, top: 16, width: 256,
      title: "BrighamYoung: Attributes",
      rows: [
        { type: "keyValue", pairs: [{ label: "value", was: "7", value: "9", action: "Revert" }] },
        { type: "note", text: "Conference re-ran (instant): the node moved from group 7 to group 9 and took its colour. Nothing else reads value." },
        { type: "text", text: "Status bar: Edited value of BrighamYoung: 7 -> 9 [Undo]", tone: "success" },
      ],
    },
    {
      tag: "A value of the wrong type", left: 256, top: 236, width: 256,
      title: "BrighamYoung: Attributes",
      rows: [
        { type: "field", label: "value", value: "nine", focus: true, error: "value holds numbers; \"nine\" is not one." },
        { type: "text", text: "Escape reverts to 7" },
      ],
    },
  ],
  inspector: {
    ...S9.inspector,
    tab: "Attributes",
    rows: [
      { type: "keyValue", pairs: [{ label: "label", value: "BrighamYoung", wide: true }] },
      { type: "field", label: "value", value: "9", focus: true, caret: true },
      { type: "keyValue", pairs: [{ label: "in file", value: "7", secondary: true }] },
      { type: "keyValue", pairs: [{ label: "id", value: String(ID) }] },
      { type: "text", text: "Enter keeps; Escape reverts." },
      { type: "note", text: "The same value is being edited in the table below; both show the typing." },
    ],
  },
  status: { counts: { nodes: 115, edges: 613 }, layout: "Spread out: settled", selection: "1 selected", zoom: "100%" },
  caption: {
    title: "Screen 39: editing a value.",
    text: "Screen 9 with the reader typing a new conference for BrighamYoung. Look at: the value cell in the table in edit mode (a field with the caret; Enter keeps, Escape reverts), the node's Attributes tab showing the same edit with the file's value under it; the canvas still conference 7, because nothing is kept until Enter; the header's unsaved dot. First inset, after Enter: the value with the old one struck through and Revert, the consequence line (Conference re-ran at once and moved the node; an expensive reader would turn stale instead), and the status bar's report with Undo, which is also the History step's text. Second inset: a value of the wrong type, refused under the field with the reason.",
  },
};
