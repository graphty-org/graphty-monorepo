// Screen 70: two Measures plotted against each other (round-3/
// analysis-results.md, "Scatter plot of two Measures"). Influence (PageRank)
// and Bridges (Betweenness) are both selected in the tree; the several-objects
// inspector offers "Plot against each other"; the plot opens as a floating
// 480 px panel over the canvas: one dot per node in the Communities colours,
// Bridges on a log scale, and a dragged rectangle whose nodes (high on
// Bridges, modest on Influence) halo on the canvas. Computed from karate.mjs.

import { NODES, PAGERANK, BETWEENNESS, COMMUNITIES } from "../karate.mjs";
import { OKABE_4, VIRIDIS } from "../palettes.mjs";

const ids = NODES.map((x) => x.id);
const rank = (m) => { const r = {}; [...ids].sort((a, b) => m[a] - m[b]).forEach((id, i) => { r[id] = i; }); return r; };
const rp = rank(PAGERANK), rb = rank(BETWEENNESS);
const n = ids.length;
const d2 = ids.reduce((t, id) => t + (rp[id] - rb[id]) ** 2, 0);
const spearman = 1 - (6 * d2) / (n * (n * n - 1)); // ties ignored: a mock readout
// The brush: Bridges above 0.05 while Influence is below 0.06.
const BRUSHED = ids.filter((id) => BETWEENNESS[id] > 0.05 && PAGERANK[id] < 0.06);

const byId = {};
for (const [g, members] of Object.entries(COMMUNITIES)) for (const id of members) byId[id] = { fill: OKABE_4[g - 1] };
// The plot: x = Influence (linear), y = Bridges (log of value + 0.001).
const px = Object.values(PAGERANK), xlo = Math.min(...px), xhi = Math.max(...px);
const ly = (v) => Math.log10(v + 0.001), yv = Object.values(BETWEENNESS).map(ly), ylo = Math.min(...yv), yhi = Math.max(...yv);
const X = (v) => (v - xlo) / (xhi - xlo), Y = (v) => (ly(v) - ylo) / (yhi - ylo);
const colorOf = {};
for (const [g, members] of Object.entries(COMMUNITIES)) for (const id of members) colorOf[id] = OKABE_4[g - 1];
const POINTS = ids.map((id) => ({ x: X(PAGERANK[id]), y: Y(BETWEENNESS[id]), color: colorOf[id], hl: BETWEENNESS[id] > 0.05 && PAGERANK[id] < 0.06 }));
for (const id of BRUSHED) byId[id] = { ...byId[id], halo: true, label: true };

export default {
  id: 70,
  title: "Two Measures plotted against each other",
  theme: "light",
  file: "Karate Club",
  left: {
    views: { rows: [{ name: "Overview", current: true }] },
    objects: { rows: [
      { kind: "dataset", name: "Karate Club", nodes: 34, edges: 78, locked: true, chip: { type: "locked" }, expanded: true, children: [
        { kind: "measure", name: "Influence (PageRank)", values: 34, chip: { type: "ramp", colors: VIRIDIS }, eye: false, selected: true },
        { kind: "measure", name: "Bridges (Betweenness)", values: 34, chip: { type: "size" }, selected: true },
        { kind: "grouping", name: "Communities (Louvain)", groups: 4, expanded: false, chip: { type: "strip", colors: OKABE_4 } },
      ] },
    ] },
  },
  canvas: {
    nodes: { default: {}, byId, sizeBy: { values: BETWEENNESS, from: 0.8, to: 2.4 } },
    edges: { default: { width: 1 } },
    overlays: {
      popover: {
        title: "Influence against Bridges", left: 24, top: 16, width: 480,
        rows: [
          { type: "select", label: "Across (X)", value: "Influence" },
          { type: "select", label: "Up (Y)", value: "Bridges" },
          { type: "checkbox", items: [{ label: "Log X", checked: false }, { label: "Log Y", checked: true }], button: "Swap" },
          { type: "select", label: "Colour", value: "Communities" },
          { type: "scatter", points: POINTS, xLabel: "Influence (PageRank)", yLabel: "Bridges, log", xEnds: [xlo.toFixed(3), xhi.toFixed(3)], yEnds: ["0", Math.max(...Object.values(BETWEENNESS)).toFixed(2)], brush: { x0: -0.01, x1: X(0.06), y0: Y(0.05), y1: 1.02 }, w: 448, h: 220 },
          { type: "keyValue", pairs: [{ label: "Rank correlation", value: spearman.toFixed(2), info: true, wide: true }] },
          { type: "text", text: `${BRUSHED.length} nodes selected (nodes ${BRUSHED.join(", ")})` },
        ],
        footer: [{ label: "Make a Set", primary: true }, { label: "Combine into a score" }],
      },
      dock: { open: false },
    },
  },
  toolbar: { active: "select", mode: "2D" },
  inspector: {
    kind: "2 objects", name: "Influence, Bridges",
    actions: [{ icon: "eye", on: true }, { icon: "unlock" }, { icon: "more" }],
    summary: "2 Measures, 34 values each",
    reading: null,
    tabs: [],
    rows: [
      { type: "button", label: "Combine", buttons: [{ label: "Union", ghost: true }, { label: "Intersect", ghost: true }] },
      { type: "text", text: "Combine takes Sets and Groups; these are Measures" },
      { type: "button", buttons: [{ label: "Plot against each other", primary: true, focus: true }] },
      { type: "switch", label: "Compare", on: false },
      { type: "button", buttons: [{ label: "Difference" }, { label: "Combine into a score..." }] },
      { type: "section", title: "Style", count: "Mixed" },
      { type: "button", buttons: [{ label: "Hide all", ghost: true }, { label: "Lock all", ghost: true }, { label: "Delete 2", ghost: true }] },
    ],
  },
  status: { counts: { nodes: 34, edges: 78 }, layout: "Spread out: settled", selection: `${BRUSHED.length} selected`, zoom: "100%" },
  caption: {
    title: "Screen 70: two Measures plotted against each other.",
    text: `Influence and Bridges selected together (Ctrl+click) in the tree. Look at: the several-objects inspector with "Plot against each other" as its primary button, Combine explained as not applying to Measures, Compare, Difference and "Combine into a score..."; the plot panel at the canvas's top left with its X and Y pickers, log switches, colour-by select, the rank correlation (${spearman.toFixed(2)}), and the brushed selection read back as "${BRUSHED.length} nodes selected" with Make a Set; the same ${BRUSHED.length} nodes haloed and labelled on the canvas and "${BRUSHED.length} selected" in the status bar. The dots are the real values; the dashed rectangle is the brush.`,
  },
};
