// Screen 77: what breaks if a node is removed (round-3/analysis-results.md,
// "What breaks if a node is removed"). Karate Club, node 1 selected, "What
// breaks if removed" chosen from its "..." menu (or the canvas right-click
// menu). The preview ghosts node 1, dashes its edges, tints what breaks off,
// and a result card sits beside the node. Nothing is removed. Pieces, the
// cut-off nodes and the route lengths are computed from karate.mjs.

import { NODES, EDGES, COMMUNITIES } from "../karate.mjs";
import { OKABE_4, OVERRIDE } from "../palettes.mjs";

const REMOVED = 1;
const adjOf = (skip) => {
  const adj = {};
  for (const nd of NODES) if (nd.id !== skip) adj[nd.id] = [];
  for (const [a, b] of EDGES) if (a !== skip && b !== skip) { adj[a].push(b); adj[b].push(a); }
  return adj;
};
const bfs = (adj, s) => { const d = { [s]: 0 }, q = [s]; while (q.length) { const u = q.shift(); for (const v of adj[u]) if (d[v] == null) { d[v] = d[u] + 1; q.push(v); } } return d; };
const pieces = (adj) => { const seen = new Set(), out = []; for (const id of Object.keys(adj).map(Number)) { if (seen.has(id)) continue; const c = Object.keys(bfs(adj, id)).map(Number); c.forEach((x) => seen.add(x)); out.push(c); } return out.sort((a, b) => b.length - a.length); };
const stats = (adj, part) => { let max = 0, sum = 0, n = 0; for (const s of part) { const d = bfs(adj, s); for (const t of part) if (t !== s) { max = Math.max(max, d[t]); sum += d[t]; n++; } } return { max, mean: sum / n }; };
const before = adjOf(null), after = adjOf(REMOVED);
const bp = pieces(before), ap = pieces(after);
const B = stats(before, bp[0]), A = stats(after, ap[0]);
const CUT = ap.slice(1).flat();

const byId = {};
for (const [g, members] of Object.entries(COMMUNITIES)) for (const id of members) byId[id] = { fill: OKABE_4[g - 1] };
byId[REMOVED] = { ...byId[REMOVED], opacity: 0.25, outline: { color: "ink", width: 1 }, halo: true };
for (const id of CUT) byId[id] = { fill: OVERRIDE, outline: { color: OVERRIDE, width: 3 }, label: true };
const byPair = {};
for (const [a, b] of EDGES) if (a === REMOVED || b === REMOVED) byPair[`${Math.min(a, b)}-${Math.max(a, b)}`] = { dash: "3 3", opacity: 0.5 };

export default {
  id: 77,
  title: "What breaks if a node is removed",
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
    edges: { default: { width: 1 }, byPair },
    labels: [REMOVED],
    overlays: {
      popover: {
        title: `Without node ${REMOVED}`, left: 16, top: 420,
        rows: [
          { type: "keyValue", pairs: [{ label: "Pieces", value: String(ap.length), note: `was ${bp.length}`, wide: true }] },
          { type: "keyValue", pairs: [{ label: "Cut off", value: `${CUT.length} node${CUT.length === 1 ? "" : "s"}`, note: `node ${CUT.join(", ")}`, wide: true }] },
          { type: "keyValue", pairs: [{ label: "Largest piece", value: `${ap[0].length} nodes`, note: `was ${bp[0].length}`, wide: true }] },
          { type: "keyValue", pairs: [{ label: "Longest route", value: `${A.max} hops`, note: `was ${B.max}`, wide: true }] },
          { type: "keyValue", pairs: [{ label: "Mean route", value: A.mean.toFixed(2), note: `was ${B.mean.toFixed(2)}`, wide: true }] },
          { type: "note", text: `Node ${REMOVED}'s ${EDGES.filter(([a, b]) => a === REMOVED || b === REMOVED).length} edges are dashed; what breaks off is tinted. Nothing has been removed.` },
        ],
        footer: [{ label: "Keep as set" }, { label: "Remove..." }, { label: "Close" }],
      },
      dock: { open: false },
    },
  },
  menus: [{
    tag: "A moment before: node 1's \"...\"",
    anchor: { el: "inspectorMore", side: "below", align: "end" },
    width: 232,
    rows: [
      { label: "Style this node..." },
      { label: "Add to Set", sub: true },
      { label: "Copy id", key: "Ctrl+C" },
      { label: "Follow" },
      { divider: true },
      { label: "What breaks if removed", highlighted: true },
      { divider: true },
      { label: "Remove from data...", key: "Del", danger: true },
    ],
  }],
  toolbar: { active: "select", mode: "2D" },
  inspector: {
    kind: "Node", sub: `id ${REMOVED}`, name: `node ${REMOVED}`,
    actions: [{ icon: "locate", title: "Locate" }, { icon: "pin", on: false, title: "Pin" }, { icon: "more", title: "Style its group..., Add to, Copy id, Follow, What breaks if removed, Remove from data..." }],
    summary: `${before[REMOVED].length} neighbours`,
    reading: null,
    tabs: ["About", "Attributes", "Links"], tab: "About",
    rows: [
      { type: "keyValue", pairs: [{ label: "club", value: "Mr. Hi", wide: true }] },
      { type: "link", text: "All 2 attributes" },
      { type: "link", text: `Connected to ${before[REMOVED].length} nodes` },
      { type: "section", title: "Values" },
      { type: "keyValue", pairs: [{ label: "Communities", value: "Group 2", chevron: true }] },
      { type: "section", title: "What breaks if removed" },
      { type: "keyValue", pairs: [{ label: "Previewing", value: `${ap.length} pieces, ${CUT.length} cut off`, wide: true }] },
      { type: "chips", title: "Member of", chips: [] },
      { type: "section", title: "Notes", plus: true },
    ],
  },
  status: { counts: { nodes: 34, edges: 78 }, mask: { text: `Previewing removal of node ${REMOVED}`, exit: true }, layout: "Spread out: settled", selection: "1 selected", zoom: "100%" },
  caption: {
    title: "Screen 77: what breaks if a node is removed.",
    text: `Node ${REMOVED} selected, then "What breaks if removed" from its "..." menu (the same row is on the canvas right-click menu). Look at: node ${REMOVED} ghosted with its ${EDGES.filter(([a, b]) => a === REMOVED || b === REMOVED).length} edges dashed; node ${CUT.join(", ")}, which only connects through it, tinted as a piece that breaks off; the result card: ${ap.length} pieces (was ${bp.length}), ${CUT.length} cut off, the largest piece, the longest route ${A.max} hops (was ${B.max}) and the mean route ${A.mean.toFixed(2)} (was ${B.mean.toFixed(2)}); its three buttons (Keep as set makes a Set of what breaks off; Remove... opens the one data-removal confirmation; Close ends the preview); the status bar's "Previewing removal of node ${REMOVED} [Exit]"; the node's About tab carrying the same line. Nothing in the data changed.`,
  },
};
