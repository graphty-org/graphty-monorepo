// Screen 71: a Grouping's Groups tab (round-3/analysis-results.md, "Grouping
// Groups tab"). Communities (Louvain) on Karate Club just ran, so it opened
// on Groups. "Names from" is open (drawn as a popover beside the inspector)
// on the file's "club" column, with a preview of the names it will give; the
// tree already shows them, because the popover previews live. Modularity,
// sizes and the club shares are computed from karate.mjs and the real
// karate.gml "club" attribute (Mr. Hi's faction by 1-based id below).

import { EDGES, COMMUNITIES, DEGREE } from "../karate.mjs";
import { OKABE_4 } from "../palettes.mjs";

const MR_HI = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 17, 18, 20, 22]);
const groupOf = {};
for (const [g, ids] of Object.entries(COMMUNITIES)) for (const id of ids) groupOf[id] = Number(g);
// Modularity: the sum over groups of (inside edges / m) - (group degree / 2m)^2.
const m = EDGES.length;
let q = 0, insideAll = 0;
for (const g of Object.keys(COMMUNITIES).map(Number)) {
  const inside = EDGES.filter(([a, b]) => groupOf[a] === g && groupOf[b] === g).length;
  const deg = COMMUNITIES[g].reduce((t, id) => t + DEGREE[id], 0);
  insideAll += inside;
  q += inside / m - (deg / (2 * m)) ** 2;
}
// Names from "club": the most common value in each group; a repeat gets " 2".
const seen = {};
const NAMES = {}, SHARE = {};
for (const g of [1, 2, 3, 4]) {
  const ids = COMMUNITIES[g], hi = ids.filter((id) => MR_HI.has(id)).length;
  const top = hi * 2 >= ids.length ? "Mr. Hi" : "Officer";
  seen[top] = (seen[top] || 0) + 1;
  NAMES[g] = seen[top] > 1 ? `${top} ${seen[top]}` : top;
  SHARE[g] = Math.round(100 * Math.max(hi, ids.length - hi) / ids.length);
}
const byId = {};
for (const [g, ids] of Object.entries(COMMUNITIES)) for (const id of ids) byId[id] = { fill: OKABE_4[g - 1] };
const sizes = [1, 2, 3, 4].map((g) => COMMUNITIES[g].length);

export default {
  id: 71,
  title: "A Grouping's Groups tab, with names from a column",
  theme: "light",
  file: "Karate Club",
  left: {
    views: { rows: [{ name: "Overview", current: true }] },
    objects: { rows: [
      { kind: "dataset", name: "Karate Club", nodes: 34, edges: 78, locked: true, chip: { type: "locked" }, expanded: true, children: [
        { kind: "grouping", name: "Communities (Louvain)", groups: 4, chip: { type: "strip", colors: OKABE_4 }, selected: true, expanded: true, children:
          [1, 2, 3, 4].map((g) => ({ kind: "group", name: NAMES[g], members: COMMUNITIES[g].length, chip: { type: "swatch", color: OKABE_4[g - 1] } })) },
      ] },
    ] },
  },
  canvas: {
    nodes: { default: {}, byId, sizeBy: "degree" },
    edges: { default: { width: 1 } },
    labels: [1, 34],
    overlays: {
      legend: { blocks: [{ title: "Communities", rows: [1, 2, 3, 4].map((g) => ({ chip: { type: "swatch", color: OKABE_4[g - 1] }, label: NAMES[g], count: String(COMMUNITIES[g].length) })) }] },
      popover: {
        title: "Names from", anchor: { inspectorRow: 3, side: "left", align: "center", dx: -8 }, caret: "right",
        rows: [
          { type: "link", text: "none (Group 1, Group 2, ...)", chevron: false, secondary: true },
          { type: "link", text: "club, the most common value", chevron: false },
          { type: "link", text: "Pick a column...", chevron: true, secondary: true },
          { type: "table", columns: ["20px", "1fr", "48px"], head: ["", "Name", "Share"], rows: [1, 2, 3, 4].map((g) => [String(g), NAMES[g], `${SHARE[g]}%`]) },
          { type: "note", text: "A name that repeats gets a number. Double-click a Group row to type your own; a typed name survives a re-run when the group still matches." },
        ],
      },
      dock: { open: false },
    },
  },
  toolbar: { active: "select", mode: "2D" },
  inspector: {
    kind: "Grouping", name: "Communities (Louvain)",
    chip: { type: "strip", colors: OKABE_4 }, summary: "4 groups",
    reading: `The groups are clearly separated (modularity ${q.toFixed(2)}).`,
    tabs: ["Groups", "Define", "Style", "Record"], tab: "Groups",
    rows: [
      { type: "keyValue", pairs: [{ label: "Modularity", value: q.toFixed(2), note: "a clear split", wide: true }] },
      { type: "keyValue", pairs: [{ label: "Sizes", value: sizes.join(", "), wide: true }] },
      { type: "select", label: "Largest", value: "8", note: "rest as Other" },
      { type: "select", label: "Names from", value: "club", wideLabel: true },
      { type: "select", label: "Sort groups by", value: "Size", wideLabel: true },
      { type: "section", title: "Between groups", count: `${m - insideAll} edges cross` },
      { type: "link", text: "See which groups connect" },
      { type: "section", title: "Findings", plus: true },
    ],
  },
  status: { counts: { nodes: 34, edges: 78 }, layout: "Spread out: settled", zoom: "100%" },
  caption: {
    title: "Screen 71: a Grouping's Groups tab, with names from a column.",
    text: `Communities (Louvain) just ran and opened on Groups. Look at: Modularity ${q.toFixed(2)}, "a clear split" (the score of how cleanly the graph splits: 0 is no better than chance, above 0.3 is a clear split); the group count is the summary row, so the tab starts with the sizes; "Largest [8]  rest as Other", which lives here and only here because it decides which Group rows exist; "Names from" set to the file's club column, its choices open at the right with a preview of each name and how much of the group carries it; the tree's Group rows and the legend already renamed (Officer, Mr. Hi, Officer 2, Mr. Hi 2); "Sort groups by"; the BETWEEN GROUPS door to screen 72; FINDINGS with its "+".`,
  },
};
