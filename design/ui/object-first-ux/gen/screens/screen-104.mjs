// Screen 104: the Data rail panel (round-4/revision-round-4.md section 2.4).
// The Email network of screen 10, nothing selected, time mode off. The Data
// rail item is active, so the left panel shows what is loaded and what each
// column means: the dataset and its source, the roles (Time set to sent),
// the columns with completeness bars, the import report, the one join
// (contacts.csv), and the pinned Open table button. Because the Time role
// is set, the toolbar carries the Time button (off). The Dataset inspector
// keeps its two tabs, Overview and Layout.
//
// ASSUMPTION the owner may correct: the owner's "data should ..." was cut
// off; this panel is the reading recorded in section 2.4.
import S10 from "./screen-10.mjs";

export default {
  id: 104,
  title: "The Data panel",
  theme: "light",
  file: "Email network",
  left: {
    panel: "data",
    data: {
      rows: [
        { type: "section", title: "Datasets" },
        { type: "dataset", name: "Email network", source: "email.csv, CSV, loaded 10:42", nodes: 1204, edges: 5830 },
        { type: "section", title: "Roles" },
        { type: "select", label: "Source", value: "from" },
        { type: "select", label: "Target", value: "to" },
        { type: "select", label: "Weight", value: "none" },
        { type: "select", label: "Time", value: "sent" },
        { type: "note", text: "Changing a role reloads and keeps your objects" },
        { type: "section", title: "Attributes", plus: true },
        { type: "disclosure", title: "On nodes", summary: "3 columns" },
        { type: "disclosure", title: "On edges", summary: "5 columns", open: true },
        { type: "attribute", dtype: "text", name: "from", role: "source", complete: 100 },
        { type: "attribute", dtype: "text", name: "to", role: "target", complete: 100 },
        { type: "attribute", dtype: "time", name: "sent", role: "time", complete: 100 },
        { type: "attribute", dtype: "text", name: "subject", complete: 94 },
        { type: "attribute", dtype: "number", name: "size", complete: 100 },
        { type: "section", title: "Import report" },
        { type: "keyValue", pairs: [{ label: "Kept", value: "5,830 of 5,842", action: "12 rejected" }] },
        { type: "section", title: "Joins", plus: true },
        { type: "keyValue", pairs: [{ label: "contacts.csv", value: "1,180 of 1,204 matched", wide: true }] },
      ],
      foot: [{ label: "Open table", key: "Shift+T" }],
    },
  },
  canvas: {
    graph: "email",
    nodes: S10.canvas.nodes,
    edges: S10.canvas.edges,
    overlays: { dock: { open: false } },
  },
  toolbar: { active: "select", mode: "2D", time: true },
  inspector: {
    kind: "Dataset", name: "Email network",
    actions: [{ icon: "plus", title: "Add data" }, { icon: "more" }],
    chip: { type: "locked" }, summary: "email.csv, CSV",
    reading: "1,204 people joined by 5,830 emails over 12 months, in 3 parts.",
    tabs: ["Overview", "Layout"], tab: "Overview",
    framing: "100%",
    rows: [
      { type: "keyValue", pairs: [{ label: "Nodes", value: "1,204" }, { label: "Edges", value: "5,830" }] },
      { type: "keyValue", pairs: [{ label: "Direction", value: "Directed (file)", wide: true }] },
      { type: "keyValue", pairs: [{ label: "Parts", value: "3" }, { label: "Weighted", value: "No" }] },
      { type: "link", text: "Columns and roles" },
      { type: "link", text: "Look and labels" },
      { type: "emptyPlus", title: "Findings" },
      { type: "emptyPlus", title: "Notes" },
    ],
  },
  status: { counts: { nodes: 1204, edges: 5830 }, layout: "Spread out: settled", zoom: "100%" },
  caption: {
    title: "Screen 104: the Data panel (Data on the rail, Alt+2).",
    text: "Email network, nothing selected. ASSUMPTION the owner may correct: the cut-off \"data should ...\" is read as round-4 section 2.4. Look at: Data active on the rail; the dataset with its count and source (Reload and \"...\" on hover, screen 105); Roles as selects of real columns, Time set to sent, which is why the Time button (clock) is on the toolbar (the fifth role, Type, is left out for height); columns split into nodes and edges, each with type glyph, role chip and completeness bar; the import report in one line (\"12 rejected\" opens the table's Rejected tab); the contacts.csv join; Open table pinned at the foot.",
  },
};
