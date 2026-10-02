// Screen 76: Findings and the Findings table (round-3/analysis-results.md,
// "Whole-graph findings"). Karate Club, nothing selected, so the inspector is
// the Dataset on Overview. Its FINDINGS section holds results that have no
// members: Distances (diameter, radius, mean path: the real values for this
// graph), Likely missing links (a pair list), a stale Triangles pattern
// count. The section's "+" menu is open (the dark menu beside it); the inset
// is a node's About tab with its Unusual nodes score. The Table dock is open on Findings showing the pair list; the
// pairs and their scores are Adamic-Adar over karate.mjs, computed here.

import { EDGES, COMMUNITIES, DEGREE, NODES } from "../karate.mjs";
import { OKABE_4 } from "../palettes.mjs";

const adj = {};
for (const nd of NODES) adj[nd.id] = new Set();
for (const [a, b] of EDGES) { adj[a].add(b); adj[b].add(a); }
const ids = NODES.map((x) => x.id);
const pairs = [];
for (const a of ids) for (const b of ids) {
  if (a >= b || adj[a].has(b)) continue;
  const shared = [...adj[a]].filter((x) => adj[b].has(x));
  if (!shared.length) continue;
  pairs.push({ a, b, shared: shared.length, score: shared.reduce((t, x) => t + 1 / Math.log(DEGREE[x]), 0) });
}
pairs.sort((x, y) => y.score - x.score);
const TOP = pairs.slice(0, 25);
// Triangles: every edge's shared neighbours, each triangle counted three times.
const triangles = EDGES.reduce((t, [a, b]) => t + [...adj[a]].filter((x) => adj[b].has(x)).length, 0) / 3;

const byId = {};
for (const [g, members] of Object.entries(COMMUNITIES)) for (const id of members) byId[id] = { fill: OKABE_4[g - 1] };
const first = TOP[0];
for (const id of [first.a, first.b]) byId[id] = { ...byId[id], halo: true };
// The selected pair is drawn as a dashed candidate edge only in the design;
// the generator draws real edges only, so the two ends are haloed and labelled.

export default {
  id: 76,
  title: "Findings and the Findings table",
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
    nodes: { default: {}, byId, sizeBy: "degree" },
    edges: { default: { width: 1 } },
    labels: [first.a, first.b],
    overlays: {
      dock: {
        open: true, tab: "Table", height: 240,
        table: {
          tabs: [{ label: "Nodes 34" }, { label: "Edges 78" }, { label: "Findings 3", selected: true }],
          showing: "Likely missing links, 25 pairs",
          columns: [
            { label: "Node", width: "72px" },
            { label: "Node", width: "72px" },
            { label: "Shared neighbours", width: "136px" },
            { label: "Score", width: "80px", sorted: true },
            { label: "", width: "104px" },
            { label: "", width: "1fr" },
          ],
          rows: TOP.slice(0, 6).map((p) => [String(p.a), String(p.b), String(p.shared), p.score.toFixed(2), { buttons: ["Select both"] }, { buttons: ["Make a path"] }]),
          selectedRow: 0,
        },
      },
    },
  },
  menus: [{
    anchor: { inspectorRow: 3, side: "left", align: "start", dx: -8, dy: -4 },
    width: 236,
    rows: [
      { heading: "Add a finding" },
      { label: "Distances", key: "about 5 ms" },
      { label: "Likely missing links", key: "instant", highlighted: true },
      { label: "Pattern...", key: "instant" },
      { divider: true },
      { heading: "A finding has no members, so it lands here, not in the tree" },
    ],
  }],
  insets: [{
    tag: "Unusual nodes is a Measure: a node's About tab", left: 256, top: 16, width: 256,
    title: "node 12: About",
    rows: [
      { type: "keyValue", pairs: [{ label: "Unusual", value: "0.91", note: "rank 1 of 34", chevron: true }] },
      { type: "note", text: "Why: one link only, to the busiest node; unlike its neighbours." },
    ],
  }],
  toolbar: { active: "select", mode: "2D" },
  inspector: {
    kind: "Dataset", name: "Karate Club",
    actions: [{ icon: "plus", title: "Add data" }, { icon: "more" }],
    chip: { type: "locked" }, summary: "karate.gml, GML",
    reading: "34 nodes joined by 78 edges in one connected part",
    tabs: ["Overview", "Layout", "Canvas", "Data"], tab: "Overview",
    rows: [
      { type: "keyValue", pairs: [{ label: "Nodes", value: "34" }, { label: "Edges", value: "78" }] },
      { type: "keyValue", pairs: [{ label: "Density", value: "0.139" }, { label: "Mean links", value: "4.6" }] },
      { type: "keyValue", pairs: [{ label: "Parts", value: "1" }, { label: "Weighted", value: "No" }] },
      { type: "section", title: "Findings", count: "3", plus: true },
      { type: "keyValue", pairs: [{ label: "Diameter", value: "5" }, { label: "Radius", value: "3" }] },
      { type: "keyValue", pairs: [{ label: "Mean path", value: "2.41", wide: true }] },
      { type: "keyValue", pairs: [{ label: "Missing links", value: "25 pairs", action: "Open in table", wide: true }] },
      { type: "keyValue", pairs: [{ label: "Triangles", value: `${triangles} matches`, note: "stale, Re-run", secondary: true }] },
      { type: "section", title: "Notes", plus: true },
    ],
  },
  status: { counts: { nodes: 34, edges: 78 }, layout: "Spread out: settled", zoom: "100%" },
  caption: {
    title: "Screen 76: Findings and the Findings table.",
    text: `Nothing selected, so the inspector is the Dataset's Overview. Look at: FINDINGS with three results that have no members (Distances as two rows with this graph's real diameter 5, radius 3 and mean path 2.41; Likely missing links with "Open in table"; Triangles, stale and greyed, with Re-run); its "+" open as a dark menu (Distances, Likely missing links, Pattern..., each with its cost); the Table dock on its Findings tab listing the 25 most likely missing links by Adamic-Adar score, the top pair (${first.a} and ${first.b}, ${first.shared} shared neighbours) under the pointer so both nodes halo on the canvas (in the design a dashed line joins them), and "Select both" and "Make a path" on every row. Unusual nodes is not here: it gives every node a value, so it is a Measure under Rank, and a node's About tab shows its score and the reason (the inset; the score is illustrative).`,
  },
};
