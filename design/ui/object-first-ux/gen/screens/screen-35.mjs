// Screen 35: a column's "..." menu drawn open (round-3/data-editing.md,
// "The column menu"). The Email network of screen 10, nothing selected, the
// Dataset inspector on its Data tab. The Data tab now lists node columns and
// edge columns under two small labels, because a column's menu offers the
// channels of what it belongs to (a node column sizes nodes; an edge column
// sets edge width). The reader pressed "..." on the node column "messages"
// (a number); the menu opens to the left of the panel, its caret on the row.
// Items that cannot apply are drawn disabled with the reason in the row.
//
// The menu is Figma's dark menu (design/ui/figma/components.md section 32),
// anchored to the row's "...", which is drawn pressed; the four groups are
// headings.
import S10 from "./screen-10.mjs";


export default {
  id: 35,
  title: "A column's menu drawn open",
  theme: "light",
  file: "Email network",
  left: S10.left,
  canvas: {
    graph: "email",
    nodes: S10.canvas.nodes,
    edges: S10.canvas.edges,
    overlays: {
      dock: { open: false },
    },
  },
  menus: [{
    anchor: { sel: '[data-attr="messages"] .k-icon-btn', side: "left", align: "start", dy: -40 },
    width: 272,
    rows: [
      { heading: "messages: number, on nodes" },
      { heading: "Show" },
      { label: "Colour by" },
      { label: "Size by", highlighted: true },
      { label: "Shape by", disabled: true, reason: "needs 12 values or fewer" },
      { label: "Label by" },
      { divider: true },
      { heading: "Pick out" },
      { label: "Filter by range..." },
      { label: "Group by ranges..." },
      { divider: true },
      { heading: "Role" },
      { label: "Set as weight", disabled: true, reason: "weights are on edges" },
      { label: "Set as time", disabled: true, reason: "not a date" },
      { label: "Set as type", note: "reloads the file" },
      { divider: true },
      { heading: "Edit" },
      { label: "Rename...", key: "F2" },
      { label: "Change type..." },
      { label: "Fill 36 empty values..." },
      { label: "Find and replace..." },
      { label: "Split column", disabled: true, reason: "text columns only" },
      { label: "Delete column...", danger: true },
    ],
  }],
  toolbar: { active: "select", mode: "2D" },
  inspector: {
    kind: "Dataset", name: "Email network",
    actions: [{ icon: "plus", title: "Add data" }, { icon: "more" }],
    chip: { type: "locked" }, summary: "email.csv, CSV",
    reading: "1,204 people joined by 5,830 emails over 12 months, in 3 parts.",
    tabs: ["Overview", "Layout", "Canvas", "Data"], tab: "Data",
    framing: "100%",
    rows: [
      { type: "section", title: "Attributes", plus: true },
      { type: "text", text: "On nodes" },
      { type: "attribute", dtype: "text", name: "dept", filled: "100%" },
      { type: "attribute", dtype: "text", name: "joined", filled: "100%" },
      { type: "attribute", dtype: "number", name: "messages", filled: "97%", pressed: true },
      { type: "text", text: "On edges" },
      { type: "attribute", dtype: "text", name: "from", filled: "100%" },
      { type: "attribute", dtype: "text", name: "to", filled: "100%" },
      { type: "attribute", dtype: "time", name: "sent", filled: "100%", role: "time" },
      { type: "attribute", dtype: "text", name: "subject", filled: "94%" },
      { type: "attribute", dtype: "number", name: "size", filled: "100%" },
      { type: "select", label: "Time", value: "sent" },
      { type: "disclosure", title: "Made by", summary: "email.csv, 3 fetches" },
    ],
  },
  status: { counts: { nodes: 1204, edges: 5830 }, layout: "Spread out: settled", zoom: "100%" },
  caption: {
    title: "Screen 35: a column's menu drawn open.",
    text: "Email network, nothing selected, Dataset > Data; the reader pressed \"...\" on the node column messages. Look at: the Data tab now separating node columns from edge columns; the menu in four groups: Show (Colour by, Size by, Label by; each makes a Measure or a Grouping row in the tree, as the Rank tool does), Pick out (Filter by range..., Group by ranges...), Role (the load-time roles; a role that reloads the file says so), Edit (the column operations of screen 36); items that cannot apply stay in place, disabled, with the reason in the row. The same menu opens from the table's column header and from a right-click on the row. Size by lands as screen 6 does: a new Measure row, selected, sizing every node.",
  },
};
