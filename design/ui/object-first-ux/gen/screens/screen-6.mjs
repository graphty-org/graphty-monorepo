// Screen 6: a Measure selected, continuous encoding (colour scale plus size)
// (round-2/screens.md). Influence (PageRank) paints every node on the viridis
// ramp and sizes it by the same value; Communities beneath is fully covered
// on Colour, so its chip is faded and its legend block is gone. The values
// are karate.mjs's PAGERANK (node 12 at 0.010, node 34 at 0.101).

import { NODES, PAGERANK } from "../karate.mjs";
import { OKABE_4, VIRIDIS, OTHER } from "../palettes.mjs";

const top6 = NODES.map((x) => x.id).sort((a, b) => PAGERANK[b] - PAGERANK[a]).slice(0, 6);
const rampChip = { type: "ramp", colors: VIRIDIS };

export default {
  id: 6,
  title: "A Measure selected, continuous encoding",
  theme: "light",
  file: "Karate Club",
  left: {
    views: { rows: [{ name: "Overview", current: true }] },
    objects: { rows: [
      { kind: "dataset", name: "Karate Club", nodes: 34, edges: 78, locked: true, chip: { type: "locked" }, expanded: true, children: [
        { kind: "measure", name: "Influence (PageRank)", values: 34, chip: rampChip, selected: true },
        // Fully covered on Colour by Influence above it: the strip chip at 50 percent.
        { kind: "grouping", name: "Communities (Louvain)", groups: 4, expanded: false, chip: { type: "strip", colors: OKABE_4, faded: true } },
      ] },
    ] },
  },
  canvas: {
    nodes: { default: {}, colorBy: { values: PAGERANK, colors: VIRIDIS }, sizeBy: { values: PAGERANK, from: 0.8, to: 2.2 } },
    edges: { default: { width: 1 } },
    labels: top6, // the label budget "Top 6 by Influence": 34, 1, 33, 3, 2, 32
    overlays: {
      legend: { blocks: [
        { title: "Influence", ramp: { colors: VIRIDIS, from: "0.010", to: "0.101" }, size: { from: "0.8x", to: "2.2x" } },
      ] },
      dock: { open: false },
    },
  },
  toolbar: { active: "select", mode: "2D" },
  inspector: {
    kind: "Measure", name: "Influence (PageRank)",
    chip: rampChip, summary: "34 values",
    reading: "Node 34 has the most influence; the top three hold a third of it.",
    tabs: ["Values", "Define", "Style", "Record"], tab: "Style",
    rows: [
      { type: "section", title: "Nodes", plus: true },
      { type: "block", label: "Colour", chip: rampChip, open: true },
      { type: "select", label: "Scale", value: "Even steps" },
      { type: "select", label: "Palette", value: "Viridis", ramp: VIRIDIS },
      { type: "number", fields: [{ caption: "Values from", value: "0.010" }, { caption: "to", value: "0.101" }] },
      { type: "checkbox", items: [{ label: "Clamp outliers", checked: false }, { label: "Reverse", checked: false }], button: "Reset" },
      { type: "swatchHex", label: "Missing", color: OTHER },
      { type: "legend", label: "Legend", colors: VIRIDIS, from: "0.010", to: "0.101" },
      { type: "block", label: "Size", summary: "0.8x to 2.2x", open: false },
      { type: "section", title: "Edges", plus: true },
    ],
  },
  status: { counts: { nodes: 34, edges: 78 }, layout: "Spread out: settled", zoom: "100%" },
  caption: {
    title: "Screen 6 of 15: a Measure selected, continuous encoding.",
    text: "Influence (PageRank) selected on its Style tab. Look at: every node on the viridis ramp and sized by the same value, 34 and 1 largest and yellowest, six labels; the Communities row's strip chip at 50 percent because Influence covers its Colour, and no Communities block in the legend; NODES with the Colour block open (scale, the palette select showing the ramp itself, values from and to as one captioned row, clamp and reverse with Reset, the Missing chit, the legend preview) and Size collapsed to its header; EDGES empty with its \"+\"; the tab strip promising Values, Define and Record.",
  },
};
