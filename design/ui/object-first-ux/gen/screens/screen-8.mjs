// Screen 8: two Paths layered as edge styles, with the legend (round-2/screens.md).
//
// The two routes are plausible, not computed: 12 -> 30 runs 12-1-3-33-24-30 (5 hops) and
// 1 -> 34 runs 1-2-3-33-34 (4 hops), so they share exactly one edge, 3-33. Karate Club node
// 12's only neighbour is 1, so node 1 is on both routes as well as 3 and 33.
import { COMMUNITIES } from "../karate.mjs";
import { OKABE_4, HIGHLIGHT } from "../palettes.mjs";

const PURPLE = HIGHLIGHT.purple; // Path: 12 -> 30
const MAGENTA = HIGHLIGHT.magenta; // Path: 1 -> 34
const PURPLE_NODES = [12, 1, 3, 33, 24, 30];
const MAGENTA_NODES = [1, 2, 3, 33, 34];

const byId = {};
for (const [g, ids] of Object.entries(COMMUNITIES)) for (const id of ids) byId[id] = { fill: OKABE_4[g - 1] };
for (const id of MAGENTA_NODES) byId[id].outline = [{ color: MAGENTA, width: 2 }];
for (const id of PURPLE_NODES) {
  // Outlines are listed innermost first; on a node both routes visit, purple sits outside.
  byId[id].outline = [...(byId[id].outline || []), { color: PURPLE, width: 2 }];
  byId[id].halo = true; // the six members of the selected Path
}

const magentaEdge = { stroke: MAGENTA, width: 5, arrow: true };
const purpleEdge = { stroke: PURPLE, width: 3, dash: "6 4" };
const byPair = {
  "1-2": magentaEdge, "2-3": magentaEdge, "33-34": magentaEdge,
  "1-12": purpleEdge, "1-3": purpleEdge, "24-33": purpleEdge, "24-30": purpleEdge,
  // The shared edge: the higher row (12 -> 30) wins Colour, Width and Pattern; it writes no
  // Arrows, so the lower row's arrowhead still shows, drawn in the winning colour.
  "3-33": { ...purpleEdge, arrow: true },
};

const purpleChip = { type: "line", color: PURPLE, width: 3, dash: "3 2" };
const magentaChip = { type: "line", color: MAGENTA, width: 5 };

export default {
  id: 8,
  title: "Two Paths layered as edge styles",
  theme: "light",
  file: "Karate Club",
  left: {
    views: { rows: [{ name: "Overview", current: true }] },
    objects: { rows: [
      { kind: "dataset", name: "Karate Club", nodes: 34, edges: 78, locked: true, chip: { type: "locked" }, expanded: true, children: [
        { kind: "path", name: "Path: 12 -> 30", edges: 5, chip: purpleChip, selected: true },
        { kind: "path", name: "Path: 1 -> 34", edges: 4, chip: magentaChip },
        { kind: "grouping", name: "Communities (Louvain)", groups: 4, expanded: false, chip: { type: "strip", colors: OKABE_4 } },
      ] },
    ] },
  },
  canvas: {
    nodes: { default: {}, byId },
    edges: { default: { width: 1 }, byPair },
    labels: [12, 30, 1, 34],
    overlays: {
      legend: { blocks: [
        { title: "Communities", rows: [
          { chip: { type: "swatch", color: OKABE_4[0] }, label: "Group 1", count: "12" },
          { chip: { type: "swatch", color: OKABE_4[1] }, label: "Group 2", count: "11" },
          { chip: { type: "swatch", color: OKABE_4[2] }, label: "Group 3", count: "6" },
          { chip: { type: "swatch", color: OKABE_4[3] }, label: "Group 4", count: "5" },
        ] },
        { title: "Paths", rows: [
          { line: { color: PURPLE, width: 3, dash: "4 3" }, label: "12 -> 30" },
          { line: { color: MAGENTA, width: 5 }, label: "1 -> 34" },
        ] },
      ] },
      dock: { open: false },
    },
  },
  toolbar: { active: "select", mode: "2D" },
  inspector: {
    kind: "Set", name: "Path: 12 -> 30",
    chip: purpleChip, summary: { nodes: 6, edges: 5 },
    reading: "The shortest route from 12 to 30 has 5 hops.",
    tabs: ["Define", "Members", "Style", "Record"], tab: "Style",
    framing: "100%",
    rows: [
      { type: "section", title: "Nodes", plus: true },
      { type: "swatchHex", label: "Outline", color: PURPLE, value: "2 px", actions: ["eye", "minus"] },
      { type: "section", title: "Edges", plus: true },
      { type: "swatchHex", label: "Colour", color: PURPLE, hex: "7B3294", opacity: "100", actions: ["eye", "minus"] },
      { type: "number", label: "Width", fields: [{ value: "3" }], actions: ["eye", "minus"] },
      { type: "select", label: "Pattern", value: "Dash", actions: ["eye", "minus"] },
      { type: "note", text: "Shares 1 edge with Path: 1 -> 34; this path wins Colour, Width and Pattern on it" },
    ],
  },
  status: { counts: { nodes: 34, edges: 78 }, layout: "Spread out: settled", selection: "6 selected", zoom: "100%" },
  caption: {
    title: "Screen 8 of 15: two Paths layered as edge styles, with the legend.",
    text: "Look at: two Path rows in the tree at once (the path icon, the edge count an edge Set carries, a line chip each; the summary row has both counts), each an edge style layer; every node keeps its community colour because a path outlines rather than fills; route 1 -> 34 is 5 px solid magenta with arrowheads that stop at the node's edge, route 12 -> 30 is 3 px dashed purple with the gold selection halo; on the shared edge 3-33 the higher row wins Colour, Width and Pattern while the lower row's arrowhead still shows (drawn purple here to make the per-channel rule visible); nodes 1, 3 and 33 carry both rings, purple outside; the legend lists Communities then a Paths block with both line swatches; the Style tab has NODES (Outline 2 px) and EDGES (Colour, Width, Pattern, each with eye and minus) and a wrapped note about the shared edge.",
  },
};
