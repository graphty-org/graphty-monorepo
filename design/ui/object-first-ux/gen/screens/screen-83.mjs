// Screen 83: the Dataset's Layout tab, with the Layout select open
// (round-3/visualization-export.md, "Choosing and controlling the layout").
// Karate Club in the state of screen 3 with nothing selected, the simulation
// still settling. The select's list is the element's layout catalogue
// (`catalog.layouts()`), plain names, with the recommendation first and the
// layouts that need an input saying which.
//
// This file also exports what the other screens of this cluster (84 to 100)
// share, so nothing is typed twice:
//   menuItems() the rows of a dark menu (spec.menus) from a short list
//   KARATE      screen 3's state with nothing selected
//   DATASET     the Dataset inspector's header

import { STATE } from "./screen-3.mjs";

// ------------------------------------------------------------ shared helpers

// The rows of a dark menu from a short list: "-" (a divider), { head } (a
// heading), or { label, key, note, chosen (highlighted), disabled, reason,
// sub (a submenu chevron) }.
export const menuItems = (items) => items.map((it) => (it === "-" ? { divider: true } : it.head ? { heading: it.head } : { label: it.label, key: it.key, note: it.note, highlighted: it.chosen, disabled: it.disabled, reason: it.reason, sub: it.sub, danger: it.danger }));

// Screen 3's karate state with nothing selected: the tree, the paint, the
// legend, the Dataset in the inspector.
const unselect = (rows) => rows.map((r) => ({ ...r, selected: false, childSelected: false, ...(r.children ? { children: unselect(r.children) } : {}) }));
const byId = {};
for (const [id, v] of Object.entries(STATE.canvas.nodes.byId)) byId[id] = { ...v, halo: false };
export const KARATE = {
  file: "Karate Club",
  left: { views: STATE.left.views, objects: { rows: unselect(STATE.left.objects.rows) } },
  canvas: { ...STATE.canvas, nodes: { ...STATE.canvas.nodes, byId } },
  toolbar: { active: "select", mode: "2D" },
};
export const DATASET = {
  kind: "Dataset", name: "Karate Club",
  actions: [{ icon: "plus", title: "Add data" }, { icon: "more" }],
  chip: { type: "locked" }, summary: "karate.gml, GML",
  reading: "34 nodes joined by 78 edges in one connected part",
  tabs: ["Overview", "Layout", "Canvas", "Data"],
  framing: "100%",
};

// ------------------------------------------------------------ screen 83

export default {
  id: 83,
  title: "The Dataset's Layout tab, with the layout list open",
  theme: "light",
  ...KARATE,
  canvas: {
    ...KARATE.canvas,
    overlays: { ...KARATE.canvas.overlays },
  },
  menus: [{
    anchor: { inspectorRow: 0, side: "left", align: "start", dx: -8, dy: -40 },
    width: 260,
    rows: menuItems([
        { label: "Recommended", note: "Spread out" },
        { head: "34 nodes in one part: any layout is quick" },
        "-",
        { label: "Spread out", note: "moving", chosen: true },
        { label: "Spread out, flat" },
        { label: "Natural grouping" },
        { label: "No crossings" },
        "-",
        { label: "Ring" },
        { label: "Concentric rings", note: "needs groups" },
        { label: "Spiral" },
        { label: "Scattered" },
        "-",
        { label: "Tree", note: "needs a root" },
        { label: "Two columns", note: "needs a Set" },
        { label: "Columns by group", note: "needs groups" },
        "-",
        { label: "Keep positions", disabled: true, reason: "file has none" },
      ]),
  }],
  inspector: {
    ...DATASET, tab: "Layout",
    rows: [
      { type: "select", label: "Layout", value: "Spread out", gear: true },
      { type: "button", label: "Settling 62%", buttons: [{ label: "Pause" }, { label: "Step" }] },
      { type: "button", label: "Re-run", buttons: [{ label: "Same seed" }, { label: "New seed" }] },
      { type: "select", label: "Apply to", value: "Whole graph" },
      { type: "keyValue", pairs: [{ label: "Dimensions", value: "2D, follows the view", wide: true }] },
      { type: "keyValue", pairs: [{ label: "Runs on", value: "CPU (GPU above 5,000)", wide: true, secondary: true }] },
    ],
  },
  status: { counts: { nodes: 34, edges: 78 }, layout: "Spread out: settling 62%", zoom: "100%" },
  caption: {
    title: "Screen 83: the Dataset's Layout tab, with the layout list open.",
    text: "Nothing selected, so the inspector shows the Dataset; the Layout tab was opened from its tab or from the status bar's \"Spread out: settling 62%\" chip. Look at: the Layout select with its gear (engine, forces, pace, seed); the transport rows (Pause, Step, and Re-run with the same or a new seed) with the progress word; Apply to (Whole graph, or a Set or Group: screen 85); Dimensions and the line saying where it runs. The open list is the element's layout catalogue in plain names: the recommendation first with its reason, the current layout tinted, the layouts that need an input saying which (screen 84), and Keep positions greyed because karate.gml carries no coordinates.",
  },
};
