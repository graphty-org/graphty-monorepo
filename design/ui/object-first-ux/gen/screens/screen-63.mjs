// Screen 63: pattern search (round-3/filters-sets.md, "Pattern search").
// Karate Club after Filter > Pattern > Triangle was created. The Set "Pattern: Triangle"
// is selected on its Define tab, which holds the same pattern editor the Filter popover
// showed (template, the slots and their constraints, Direction), so editing it re-runs the
// search. The dock is open on its Table tab with a "Matches 45" sub-tab: one row per match,
// match 3 selected, and the canvas draws every match faintly and match 3 in full. Tab and
// Shift+Tab step through the matches (the status bar says so). The 45 triangles are the real
// ones of karate.mjs.
import { EDGES, COMMUNITIES } from "../karate.mjs";
import { OKABE_4, HIGHLIGHT } from "../palettes.mjs";

const adj = {};
for (const [a, b] of EDGES) { (adj[a] ??= new Set()).add(b); (adj[b] ??= new Set()).add(a); }
const tris = [];
for (const [a, b] of EDGES) for (const c of adj[a]) if (adj[b].has(c) && c > Math.max(a, b)) tris.push([Math.min(a, b), Math.max(a, b), c]);
tris.sort((x, y) => x[0] - y[0] || x[1] - y[1] || x[2] - y[2]);
const members = new Set(tris.flat());
const CUR = 2; // match 3
const commOf = {};
for (const [g, m] of Object.entries(COMMUNITIES)) for (const id of m) commOf[id] = Number(g);

const C = HIGHLIGHT.purple;
const key = (a, b) => `${Math.min(a, b)}-${Math.max(a, b)}`;
const byPair = {};
for (const t of tris) for (const [a, b] of [[t[0], t[1]], [t[1], t[2]], [t[0], t[2]]]) byPair[key(a, b)] = { stroke: C, width: 1.5, opacity: 0.45 };
const cur = tris[CUR];
for (const [a, b] of [[cur[0], cur[1]], [cur[1], cur[2]], [cur[0], cur[2]]]) byPair[key(a, b)] = { stroke: C, width: 4, opacity: 1 };
const byId = {};
for (const [id, g] of Object.entries(commOf)) {
  byId[id] = { fill: OKABE_4[g - 1] };
  if (members.has(Number(id))) byId[id].outline = { color: C, width: 2 };
  if (cur.includes(Number(id))) { byId[id].halo = true; byId[id].label = true; }
}
const mix = (t) => (new Set(t.map((i) => commOf[i])).size === 1 ? `Group ${commOf[t[0]]}` : "mixed");
const rows = tris.slice(0, 7).map((t, i) => [String(i + 1), String(t[0]), String(t[1]), String(t[2]), mix(t)]);

export default {
  id: 63,
  title: "Pattern search and its matches",
  theme: "light",
  file: "Karate Club",
  left: {
    views: { rows: [{ name: "Overview", current: true }] },
    objects: { rows: [
      { kind: "dataset", name: "Karate Club", nodes: 34, edges: 78, locked: true, chip: { type: "locked" }, expanded: true, children: [
        { kind: "set", name: "Pattern: Triangle", nodes: members.size, chip: { type: "line", color: C, width: 2 }, selected: true },
        { kind: "grouping", name: "Communities (Louvain)", groups: 4, expanded: false, chip: { type: "strip", colors: OKABE_4 } },
      ] },
    ] },
  },
  canvas: {
    nodes: { byId },
    edges: { default: { width: 1, opacity: 0.35 }, byPair },
    overlays: {
      dock: {
        open: true, tab: "Table", height: 300,
        table: {
          tabs: [{ label: "Nodes 34" }, { label: "Edges 78" }, { label: `Matches ${tris.length}`, selected: true }],
          showing: "Pattern: Triangle",
          columns: [
            { label: "Match", width: "72px", sorted: true },
            { label: "a", width: "72px" },
            { label: "b", width: "72px" },
            { label: "c", width: "72px" },
            { label: "Communities", width: "1fr", chip: { type: "strip", colors: OKABE_4 } },
          ],
          rows,
          selectedRow: CUR,
          scrolled: 0,
        },
        footer: { link: "Previous    Next", text: `Match 3 of ${tris.length}: Tab and Shift+Tab step through the matches` },
      },
    },
  },
  toolbar: { active: "select", mode: "2D" },
  inspector: {
    kind: "Set", name: "Pattern: Triangle", sub: "subgraph match",
    chip: { type: "line", color: C, width: 2 }, summary: { text: `${tris.length} matches, ${members.size} nodes` },
    reading: `${tris.length} triangles; ${members.size} of 34 members are in at least one.`,
    tabs: ["Define", "Members", "Style", "Record"], tab: "Define",
    framing: "100%",
    rows: [
      { type: "select", label: "Template", value: "Triangle" },
      { type: "pattern", slots: [{ id: "a", x: 40, y: 54, selected: true }, { id: "b", x: 104, y: 14 }, { id: "c", x: 168, y: 54 }], edges: [["a", "b"], ["b", "c"], ["a", "c"]] },
      { type: "table", columns: ["56px", "1fr"], head: ["Slot", "Must be"], rows: [["a", "any node"], ["b, c", "any node"], ["edges", "any edge"]], selected: 0 },
      { type: "link", text: "+ Slot or edge", chevron: false },
      { type: "segmented", label: "Direction", options: ["Any", "As drawn"], value: "Any" },
      { type: "switch", label: "Invert", on: false },
      { type: "select", label: "Within", value: "Everything" },
      { type: "text", text: "Re-runs on Enter (about 20 ms)" },
    ],
  },
  status: { counts: { nodes: 34, edges: 78 }, layout: "Spread out: settled", selection: `Match 3 of ${tris.length}`, zoom: "100%" },
  caption: {
    title: "Screen 63: pattern search, the Set it makes and its matches.",
    text: `Look at: one Set "Pattern: Triangle" (the union of every match, ${members.size} nodes) rather than ${tris.length} rows; its summary counts matches and nodes; its Define tab is the pattern editor the Filter > Pattern popover showed: Template [Triangle v] (Triangle, Star of 3, Chain of 3, Square, Clique of 4, Custom), the pattern drawn as slots a, b, c and their edges (slot a picked, its constraint in the row under it; click a cell for [attribute] [is] [value]), "+ Slot or edge", Direction, Invert, Within; the dock's Table tab with a "Matches ${tris.length}" sub-tab, one row per match, match 3 selected; the canvas drawing every match faintly and the current match thick with its nodes labelled; the dock's footer "Match 3 of ${tris.length}" with Previous and Next, which Tab and Shift+Tab also step.`,
  },
};
