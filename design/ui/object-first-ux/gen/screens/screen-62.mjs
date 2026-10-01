// Screen 62: filtering edges (round-3/filters-sets.md, "Filter edges rather than nodes").
// Karate Club loaded from the weighted file (Zachary's interaction counts, 1 to 7, as the
// edge attribute `weight`). The Filter tool is armed on By range with Target [Edges]: the
// popover lists edge attributes only, draws the edge-weight histogram, Min 4. The canvas
// previews the dry run: matching edges drawn full strength, the others faded; nodes are not
// filtered. The inspector shows the Data tab with its Edge attributes section, where the
// column "..." > Filter by is the second door. The weights are invented but plausible: ties
// inside a community are heavier. The bar says edges.
import { EDGES, COMMUNITIES } from "../karate.mjs";
import { OKABE_4 } from "../palettes.mjs";

const commOf = {};
for (const [g, m] of Object.entries(COMMUNITIES)) for (const id of m) commOf[id] = Number(g);
const weight = ([a, b]) => (commOf[a] === commOf[b] ? 2 + ((a * 7 + b * 3) % 6) : 1 + ((a + b) % 3));
const byPair = {};
let matches = 0;
const counts = Array(7).fill(0);
for (const e of EDGES) {
  const w = weight(e);
  counts[w - 1]++;
  if (w >= 4) {
    matches++;
    byPair[`${Math.min(...e)}-${Math.max(...e)}`] = { stroke: "ink", width: 2, opacity: 1 };
  }
}
const top = Math.max(...counts);
const byId = {};
for (const [id, g] of Object.entries(commOf)) byId[id] = { fill: OKABE_4[g - 1] };

export default {
  id: 62,
  title: "Filtering edges",
  theme: "light",
  file: "Karate Club",
  left: {
    views: { rows: [{ name: "Overview", current: true }] },
    objects: { rows: [
      { kind: "dataset", name: "Karate Club", nodes: 34, edges: 78, locked: true, chip: { type: "locked" }, expanded: true, children: [
        { kind: "grouping", name: "Communities (Louvain)", groups: 4, expanded: false, chip: { type: "strip", colors: OKABE_4 } },
      ] },
    ] },
  },
  canvas: {
    nodes: { byId },
    edges: { default: { width: 1, opacity: 0.2 }, byPair },
    overlays: {
      popover: {
        title: "Filter by range",
        left: 196, bottom: 124, caret: "bottom", caretAt: 54,
        rows: [
          { type: "segmented", label: "Target", options: ["Nodes", "Edges"], value: "Edges" },
          { type: "text", text: "On what is showing, 78 edges" },
          { type: "select", label: "Of", value: "weight (edges)" },
          { type: "histogram", bars: counts.map((c) => c / top), scale: "linear", band: [3 / 7, 1], ends: ["1", "7"] },
          { type: "number", fields: [{ caption: "Min", value: "4" }, { caption: "Max", value: "7" }] },
          { type: "switch", label: "Invert", on: false },
          { type: "select", label: "Their nodes", value: "Keep all nodes" },
          { type: "text", text: `Matches ${matches} of 78 edges`, secondary: false },
        ],
        footer: [{ label: "Create", primary: true }],
        carriesPrimary: true,
      },
      dock: { open: false },
    },
  },
  toolbar: {
    active: "select", armed: "filter", mode: "2D", faces: { filter: "By range" },
    secondary: { tool: "filter", variant: "By range", unit: "edges", count: String(matches), of: "78" },
  },
  insets: [{
    tag: "After Create: an edge Set in the tree", left: 928, top: 16, width: 256,
    title: "Set  weight >= 4",
    rows: [
      { type: "keyValue", pairs: [{ label: "Tree", value: "weight >= 4", note: `${matches} edges`, wide: true }] },
      { type: "keyValue", pairs: [{ label: "Chip", value: "a line, not a ring", wide: true }] },
      { type: "text", text: "Its Style tab paints EDGES rows." },
    ],
  }],
  inspector: {
    kind: "Dataset", name: "Karate Club",
    actions: [{ icon: "plus", title: "Add data" }, { icon: "more" }],
    chip: { type: "locked" }, summary: "karate-weighted.gml, GML",
    reading: "34 nodes joined by 78 edges in one connected part",
    tabs: ["Overview", "Layout", "Canvas", "Data"], tab: "Data",
    framing: "100%",
    rows: [
      { type: "section", title: "Node attributes", count: "1", plus: true },
      { type: "attribute", dtype: "number", name: "id", filled: "100%" },
      { type: "section", title: "Edge attributes", count: "1", plus: true },
      { type: "attribute", dtype: "number", name: "weight", filled: "100%" },
      { type: "note", text: "An edge column's \"...\" > Filter by opens the Filter popover with Target set to Edges." },
      { type: "select", label: "Time", value: "none" },
    ],
  },
  status: { counts: { nodes: 34, edges: 78 }, layout: "Spread out: settled", tool: "Filter edges: By range", zoom: "100%" },
  caption: {
    title: "Screen 62: filtering edges by weight.",
    text: `Look at: the Filter popover with Target switched to Edges, so the scope line counts edges and "Of" lists edge attributes only; the edge-weight histogram, Min 4 and Max 7; "Their nodes [Keep all nodes]" (or "Only their endpoints"); the live "Matches ${matches} of 78 edges"; the canvas with matching edges drawn full strength and the rest faded, nodes untouched; the bar says edges; the Data tab with a separate Edge attributes section, whose "..." is the second door. The inset is the moment after Create: an edge Set "weight >= 4" counted in edges, with a line chip, whose Style tab paints EDGES rows.`,
  },
};
