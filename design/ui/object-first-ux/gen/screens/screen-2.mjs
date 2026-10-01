// Screen 2: loaded, nothing selected, the Dataset inspector with its tabs
// (round-2/screens.md).
export default {
  id: 2,
  title: "Loaded, nothing selected",
  theme: "light",
  file: "Karate Club",
  left: {
    views: { rows: [{ name: "Overview", current: true }] },
    objects: { rows: [
      { kind: "dataset", name: "Karate Club", nodes: 34, edges: 78, locked: true, chip: { type: "locked" }, expanded: true, children: [
        { kind: "suggestion", name: "Find groups", key: "G", icon: "group" },
        { kind: "suggestion", name: "Rank by connections", key: "R", icon: "rank" },
        { kind: "suggestion", name: "Find a path", key: "P", icon: "path" },
      ] },
    ] },
  },
  canvas: {
    nodes: { default: {} },
    edges: { default: { width: 1 } },
    overlays: { dock: { open: false } },
  },
  toolbar: { active: "select", mode: "2D" },
  inspector: {
    kind: "Dataset", name: "Karate Club",
    actions: [{ icon: "plus", title: "Add data" }, { icon: "more" }],
    chip: { type: "locked" }, summary: "karate.gml, GML",
    reading: "34 nodes joined by 78 edges in one connected part",
    tabs: ["Overview", "Layout", "Canvas", "Data"], tab: "Overview",
    rows: [
      { type: "keyValue", pairs: [{ label: "Nodes", value: "34" }, { label: "Edges", value: "78" }] },
      // "Undirected, from file" plus "Change..." is 225px of 11px text in a 216px row, so the source is bracketed.
      { type: "keyValue", pairs: [{ label: "Direction", value: "Undirected (file)", action: "Change..." }] },
      { type: "keyValue", pairs: [{ label: "Density", value: "0.139" }, { label: "Mean links", value: "4.6" }] },
      { type: "keyValue", pairs: [{ label: "Parts", value: "1" }, { label: "Weighted", value: "No" }] },
      { type: "disclosure", title: "Import report", summary: "read 80, kept 78" },
      { type: "emptyPlus", title: "Findings" },
      { type: "emptyPlus", title: "Notes" },
    ],
  },
  status: { counts: { nodes: 34, edges: 78 }, layout: "Spread out: settled", zoom: "100%" },
  caption: {
    title: "Screen 2 of 15: loaded, nothing selected.",
    text: "Karate Club just opened. Look at: one tree row with three suggestion rows carrying their keys; the Dataset inspector's fixed header block (kind, name, the locked chip, the reading with its \"?\") and the tab strip promising Layout, Canvas and Data without drawing them; seven Overview rows then white space; every node the default grey because nothing was computed unasked; Select active; Export the only filled button.",
  },
};
