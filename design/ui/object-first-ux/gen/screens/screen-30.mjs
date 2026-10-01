// Screen 30: a large graph drawn over the render ceiling (round-3/import.md,
// "Large-graph state"). The reader chose "Everything" on screen 29: all
// 350,000 hosts of flows.csv are loaded and analysable, 200,000 are drawn.
// The drawing is the Email network's slice standing in for the host graph (the
// generator has no 200,000-node drawing; the point is the chrome). The state
// is said in three places: the status bar's amber limit chip, the Overview
// section with its two ways out, and what Performance mode turns off; the VR
// segment is greyed with its reason in its tooltip.
import { DEGREE } from "../email.mjs";

export default {
  id: 30,
  title: "Large graph: drawing 200,000 of 350,000, and what that turns off",
  theme: "light",
  file: "flows.csv",
  left: {
    views: { rows: [{ name: "Overview", current: true }] },
    objects: { rows: [
      { kind: "dataset", name: "flows.csv", locked: true, chip: { type: "locked" }, expanded: true, children: [] },
    ] },
  },
  canvas: {
    graph: "email",
    nodes: { default: {}, sizeBy: { values: DEGREE, from: 0.5, to: 1.6 } },
    edges: { default: { width: 0.5, opacity: 0.35 } },
    labels: [],
    overlays: { dock: { open: false } },
  },
  toolbar: { active: "select", mode: "2D", modeMenu: true, disabledTools: { VR: "takes up to 10,000 nodes" } },
  tooltips: [{ lines: ["VR is off for this graph", "It takes up to 10,000 nodes.", "Focus on a smaller set first."], anchor: { el: "mode-VR", side: "left", align: "center", dx: -8 } }],
  inspector: {
    kind: "Dataset", name: "flows.csv",
    actions: [{ icon: "plus", title: "Add data" }, { icon: "more" }],
    chip: { type: "locked" }, summary: "flows.csv, CSV",
    reading: "350,000 hosts, 4,100,000 flows, 212 parts",
    tabs: ["Overview", "Layout", "Canvas", "Data"], tab: "Overview",
    rows: [
      { type: "keyValue", pairs: [{ label: "Nodes", value: "350,000", wide: true }] },
      { type: "keyValue", pairs: [{ label: "Edges", value: "4,100,000", wide: true }] },
      { type: "section", title: "Drawing 200,000 of 350,000" },
      { type: "note", text: "All 350,000 are loaded: measures, filters and the table use every node. The canvas draws the 200,000 busiest." },
      { type: "button", buttons: [{ label: "Focus on a smaller set..." }] },
      { type: "link", text: "Change ceiling... (Settings > Performance)" },
      { type: "switch", label: "Performance mode", on: true, wide: true, caption: "On by itself above 100,000 nodes: labels capped, no hover highlight, edges drawn as thin lines." },
      { type: "keyValue", pairs: [{ label: "Labels", value: "top 500 by degree", wide: true }] },
      { type: "keyValue", pairs: [{ label: "Hover", value: "highlight off; the tooltip stays", wide: true }] },
      { type: "keyValue", pairs: [{ label: "VR", value: "off: takes up to 10,000 nodes", wide: true }] },
      { type: "disclosure", title: "Import report", summary: "read 4,100,012, kept 4,100,000" },
    ],
  },
  status: { counts: { nodes: 350000, edges: 4100000 }, limit: { text: "Drawing 200,000 of 350,000", links: ["Why"] }, layout: "Spread out: settled", zoom: "100%" },
  caption: {
    title: "Screen 30: a large graph drawn over the ceiling.",
    text: "Everything was loaded from screen 29 (the drawing stands in for 350,000 hosts). Look at: the status bar's amber limit chip \"Drawing 200,000 of 350,000 [Why]\"; the Overview section saying what is loaded versus drawn, with Focus on a smaller set and Change ceiling; Performance mode on by itself, and what it turns off (labels capped at 500, hover highlight, VR); the view-mode menu open with its VR row dimmed and the reason in its tooltip.",
  },
};
