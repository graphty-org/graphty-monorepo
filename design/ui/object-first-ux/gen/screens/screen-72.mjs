// Screen 72: groups collapsed into a summary graph (round-3/
// analysis-results.md, "How groups connect"). Communities on Karate Club,
// "Collapse groups" chosen, then Group 2 expanded again in place: three
// collapsed groups are one large node each (sized by members, labelled with
// the name and count, at its members' centre), edges between them and to
// Group 2's members are merged into one line per pair (width by count).
// Counts are computed from karate.mjs.

import { EDGES, COMMUNITIES, DEGREE } from "../karate.mjs";
import { OKABE_4 } from "../palettes.mjs";

const groupOf = {};
for (const [g, ids] of Object.entries(COMMUNITIES)) for (const id of ids) groupOf[id] = Number(g);
const EXPANDED = 2;
const COLLAPSED = [1, 3, 4];
const key = (a, b) => `${Math.min(a, b)}-${Math.max(a, b)}`;
// Summary nodes, one per collapsed group, drawn at the members' centre.
const meta = COLLAPSED.map((g) => ({ members: COMMUNITIES[g], label: `Group ${g}  ${COMMUNITIES[g].length}`, fill: OKABE_4[g - 1], r: 8 + COMMUNITIES[g].length * 1.4 }));
const endOf = (id) => (groupOf[id] === EXPANDED ? id : `m${COLLAPSED.indexOf(groupOf[id])}`);
// Merged edges: every edge that leaves a collapsed group, one line per pair of ends.
const merged = {}, between = {};
for (const [a, b] of EDGES) {
  const ga = groupOf[a], gb = groupOf[b];
  if (ga !== gb) { const k = key(ga, gb); between[k] = (between[k] || 0) + 1; }
  if (ga === EXPANDED && gb === EXPANDED) continue;
  const A = endOf(a), B = endOf(b);
  if (A === B) continue;
  const k = [A, B].map(String).sort().join("|");
  merged[k] = (merged[k] || { from: A, to: B, n: 0 }); merged[k].n++;
}
const mergedEdges = Object.values(merged).map((m) => ({ from: m.from, to: m.to, width: Math.min(8, 1 + m.n * 1.5) }));
const byId = {};
for (const id of COMMUNITIES[EXPANDED]) byId[id] = { fill: OKABE_4[EXPANDED - 1] };
const collapsedNodes = Object.entries(COMMUNITIES).filter(([g]) => Number(g) !== EXPANDED).reduce((t, [, ids]) => t + ids.length, 0);
const pairs = Object.entries(between).sort((x, y) => y[1] - x[1]);
const CROSS = pairs.reduce((t, [, c]) => t + c, 0);

export default {
  id: 72,
  title: "Groups collapsed into a summary graph",
  theme: "light",
  file: "Karate Club",
  left: {
    views: { rows: [{ name: "Overview", current: true }, { name: "How groups connect", current: false }] },
    objects: { rows: [
      { kind: "dataset", name: "Karate Club", nodes: 34, edges: 78, locked: true, chip: { type: "locked" }, expanded: true, children: [
        { kind: "grouping", name: "Communities (Louvain)", groups: 4, chip: { type: "strip", colors: OKABE_4 }, selected: true, expanded: true, children:
          [1, 2, 3, 4].map((g) => ({ kind: "group", name: `Group ${g}`, eye: true, members: COMMUNITIES[g].length, chip: { type: "swatch", color: OKABE_4[g - 1] }, ...(COLLAPSED.includes(g) ? { glyph: "collapse", glyphTitle: "Collapsed" } : {}) })) },
      ] },
    ] },
  },
  canvas: {
    nodes: { default: {}, byId, meta },
    edges: { default: { width: 1 }, merged: mergedEdges },
    labels: [1, 3],
    overlays: {
      legend: { blocks: [
        { title: "Communities", rows: [1, 2, 3, 4].map((g) => ({ chip: { type: "swatch", color: OKABE_4[g - 1] }, label: `Group ${g}`, count: String(COMMUNITIES[g].length) })) },
        { title: "Collapsed groups", size: { from: "5 members", to: "12" } },
        { title: "Merged edges", rows: [
          { line: { color: "#8c8c8c", width: 2.5 }, label: "1 edge" },
          { line: { color: "#8c8c8c", width: 8 }, label: "5 or more" },
        ] },
      ] },
      dock: { open: false },
    },
  },
  toolbar: { active: "select", mode: "2D" },
  inspector: {
    kind: "Grouping", name: "Communities (Louvain)",
    actions: [{ icon: "eye", on: true }, { icon: "unlock" }, { icon: "more", title: "Collapse groups, Expand all, Compare with..., Communities over time..." }],
    chip: { type: "strip", colors: OKABE_4 }, summary: "4 groups, 3 collapsed",
    reading: "Group 1 and Group 2 share the most edges between them.",
    tabs: ["Groups", "Define", "Style", "Record"], tab: "Groups",
    rows: [
      { type: "keyValue", pairs: [{ label: "Modularity", value: "0.42", note: "a clear split", wide: true }] },
      { type: "keyValue", pairs: [{ label: "Sizes", value: "12, 11, 6, 5", wide: true }] },
      { type: "button", label: "3 collapsed", buttons: [{ label: "Collapse all" }, { label: "Expand all" }] },
      { type: "section", title: "Between groups", count: `${CROSS} edges cross` },
      { type: "table", columns: ["1fr", "56px", "56px"], head: ["Pair", "Edges", "Share"], rows: pairs.map(([k, c]) => [k.replace("-", " and "), String(c), `${Math.round(100 * c / CROSS)}%`]) },
      { type: "link", text: "Open the group-by-group table" },
      { type: "section", title: "Findings", plus: true },
    ],
  },
  status: { counts: { nodes: 34, edges: 78 }, mask: { text: `3 groups collapsed (${collapsedNodes} nodes)`, exit: true }, layout: "Spread out: settled", zoom: "100%" },
  caption: {
    title: "Screen 72: groups collapsed into a summary graph.",
    text: `Communities selected, "Collapse all" pressed, then Group 2 double-clicked to expand it in place. Look at: three large outlined nodes, one per collapsed group, sized by members and labelled "Group 1  12"; Group 2's eleven members drawn as usual; merged edges whose width is the number of edges they stand for; the legend's size and width blocks; the status bar's "3 groups collapsed (${collapsedNodes} nodes) [Exit]", Exit being Expand all; the Groups tab's BETWEEN GROUPS section ranking every pair of groups by the edges between them. Nothing in the data changed: collapsing is a way of drawing, saved with the Grouping and in a View ("How groups connect"). Each collapsed group sits at its members' centre.`,
  },
};
