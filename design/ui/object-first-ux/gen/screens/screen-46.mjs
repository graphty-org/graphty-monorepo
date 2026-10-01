// Screen 46: stale objects after Add data (round-3/history-errors.md, "Stale
// objects"). Screen 3's Karate Club with a Bridges measure and its linked
// "Top 5 by Bridges" cut, after Add data brought 6 nodes and 11 edges (34 ->
// 40 nodes). The cheap objects re-ran at once (Degree > 8, Connections); the
// ones over the one-second rule kept their old members and paint and turned
// stale: Communities (and its Groups, below it), Bridges, and Top 5 by Bridges
// through its input. The six new nodes (35 to 40) are drawn in the default
// grey: no stale object has a value for them yet.
import { COMMUNITIES, DEGREE, BETWEENNESS } from "../karate.mjs";
import { OKABE_4 } from "../palettes.mjs";

const byId = {};
for (const [g, members] of Object.entries(COMMUNITIES)) for (const id of members) byId[id] = { fill: OKABE_4[g - 1] };
for (const id of Object.keys(DEGREE)) if (DEGREE[id] > 8) byId[id] = { ...byId[id], outline: { color: "ink", width: 2 } };

const top = Object.entries(BETWEENNESS).sort((a, b) => b[1] - a[1]).slice(0, 5);

export default {
  id: 46,
  title: "Stale objects after Add data",
  theme: "light",
  file: "Karate Club",
  left: {
    views: { rows: [{ name: "Overview", current: true }] },
    objects: { rows: [
      { kind: "dataset", name: "Karate Club", nodes: 40, edges: 89, locked: true, chip: { type: "locked" }, expanded: true, children: [
        { kind: "set", name: "Top 5 by Bridges", nodes: 5, state: "stale", chip: { type: "ring", color: "#7b3294" } },
        { kind: "measure", name: "Bridges (Betweenness)", values: 34, state: "stale", chip: { type: "size", faded: true }, selected: true },
        { kind: "set", name: "Degree > 8", nodes: 5, chip: { type: "ring", color: "ink" } },
        { kind: "measure", name: "Connections (Degree)", values: 40, chip: { type: "size" } },
        { kind: "grouping", name: "Communities (Louvain)", groups: 4, state: "stale", chip: { type: "strip", colors: OKABE_4 }, expanded: true, children: [
          { kind: "group", name: "Group 1", members: 12, state: "stale", chip: { type: "swatch", color: OKABE_4[0] } },
          { kind: "group", name: "Group 2", members: 11, state: "stale", chip: { type: "swatch", color: OKABE_4[1] } },
          { kind: "group", name: "Group 3", members: 6, state: "stale", chip: { type: "swatch", color: OKABE_4[2] } },
          { kind: "group", name: "Group 4", members: 5, state: "stale", chip: { type: "swatch", color: OKABE_4[3] } },
        ] },
      ] },
    ] },
  },
  canvas: {
    extraNodes: [
      { id: 35, x: 40, y: 560, links: [25, 26] },
      { id: 36, x: 30, y: 660, links: [35] },
      { id: 37, x: 150, y: 640, links: [35, 36] },
      { id: 38, x: 960, y: 560, links: [17, 7] },
      { id: 39, x: 980, y: 660, links: [38, 17] },
      { id: 40, x: 900, y: 650, links: [38, 5] },
    ],
    nodes: { sizeBy: "degree", byId },
    edges: { default: { width: 1 } },
    labels: [34, 1, 33],
    overlays: {
      legend: { blocks: [
        { title: "Communities", note: "stale: from 34 nodes", rows: OKABE_4.map((c, i) => ({ chip: { type: "swatch", color: c }, label: `Group ${i + 1}`, count: String(COMMUNITIES[i + 1].length) })) },
        { title: "Connections", size: { from: "1", to: "17" } },
      ] },
      dock: { open: false },
    },
  },
  toolbar: { active: "select", mode: "2D" },
  inspector: {
    kind: "Measure", name: "Bridges (Betweenness)",
    chip: { type: "size", faded: true },
    summary: { text: "Stale: now 40 nodes", tone: "stale", action: "Re-run" },
    reading: "Node 1 carried the most shortest paths, before the new data.",
    tabs: ["Values", "Define", "Style", "Record"], tab: "Values",
    framing: "100%",
    rows: [
      { type: "note", text: "Old values and paint are kept until the re-run." },
      { type: "text", text: "Also stale through it: Top 5 by Bridges" },
      { type: "section", title: "Top 5, before the change" },
      { type: "table", columns: ["1fr", "72px"], head: ["Node", "Bridges"], rows: top.map(([id, v]) => [`Node ${id}`, v.toFixed(3)]) },
      { type: "text", text: "6 new nodes have no value until the re-run" },
    ],
  },
  status: { counts: { nodes: 40, edges: 89 }, stale: "3 stale", layout: "Spread out: settled", zoom: "100%" },
  caption: {
    title: "Screen 46: stale objects after Add data.",
    text: "Add data brought 6 nodes and 11 edges. Look at: the cheap objects re-ran at once and look normal (Degree > 8, Connections with 40 values); the three over the one-second rule keep their old counts and paint but carry an amber dot and a dimmed name (Communities and, below it, its four Groups; Bridges; and Top 5 by Bridges, stale because its input is); the Bridges summary row in amber saying what changed (it ran on 34 nodes; there are now 40) with Re-run as its link (about 3 s, in its tooltip); the values tab headed \"before the change\" and the line about the new nodes; the legend block marked stale; \"3 stale [Re-run all]\" in the status bar. The Dataset's Overview tab carries the same Re-run all line with the total cost (not drawn). The six new nodes, at the edges of the drawing, are grey: no stale object has painted them. (Costs are illustrative, as on screen 5.)",
  },
};
