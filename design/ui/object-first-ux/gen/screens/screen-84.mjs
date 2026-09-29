// Screen 84: the Tree layout, which needs a root. Karate Club laid out as a
// tree from node 1 (rows by steps from the root, the element's "Tree",
// `hierarchical`, whose descriptor declares the structural input "node"); the
// reader has pressed the Root picker again to try another root, so the
// canvas pick is armed. The positions are computed here by breadth-first
// levels from node 1 over karate.mjs's edges, so the drawing is the real tree.
import { NODES, EDGES } from "../karate.mjs";
import { OKABE_4 } from "../palettes.mjs";
import { KARATE, DATASET } from "./screen-83.mjs";
import { nodeAt } from "../render.mjs";

const ROOT = 1;
const adj = {};
for (const nd of NODES) adj[nd.id] = [];
for (const [a, b] of EDGES) { adj[a].push(b); adj[b].push(a); }
const level = { [ROOT]: 0 }, parent = {}, order = [ROOT];
for (let i = 0; i < order.length; i++) {
  const u = order[i];
  for (const v of [...adj[u]].sort((a, b) => a - b)) if (level[v] == null) { level[v] = level[u] + 1; parent[v] = u; order.push(v); }
}
const rows = [];
for (const id of order) (rows[level[id]] ||= []).push(id);
const moved = {}, xOf = {};
rows.forEach((ids, L) => {
  if (L > 0) ids.sort((a, b) => xOf[parent[a]] - xOf[parent[b]] || a - b);
  ids.forEach((id, i) => { xOf[id] = 40 + (920 * (i + 0.5)) / ids.length; moved[id] = { x: Math.round(xOf[id]), y: 40 + L * 220 }; });
});

// Edges that are not parent links are the tree's cross-links, drawn faint.
const byPair = {};
let cross = 0;
for (const [a, b] of EDGES) {
  if (parent[a] === b || parent[b] === a) continue;
  cross++;
  byPair[`${Math.min(a, b)}-${Math.max(a, b)}`] = { opacity: 0.25 };
}

const byId = { ...KARATE.canvas.nodes.byId };
byId[34] = { ...byId[34], halo: true, label: true };
const spec = {
  id: 84,
  title: "The Tree layout, picking its root",
  theme: "light",
  ...KARATE,
  canvas: {
    ...KARATE.canvas,
    positions: moved,
    edges: { default: { width: 1 }, byPair },
    labels: [1, 34, 33, 3, 2, 32],
    nodes: { ...KARATE.canvas.nodes, byId },
    overlays: { ...KARATE.canvas.overlays },
  },
  toolbar: { active: "select", mode: "2D", secondary: { parts: ["Click the new root node, or type a name", { field: "node 34", caret: true, width: 96 }, { cancel: true }] } },
  inspector: {
    ...DATASET, tab: "Layout",
    rows: [
      { type: "select", label: "Layout", value: "Tree", gear: true },
      { type: "field", label: "Root", value: "node 1", focus: true },
      { type: "select", label: "Direction", value: "Down" },
      { type: "keyValue", pairs: [{ label: "Cross-links", value: String(cross), action: "Make a set" }] },
      { type: "button", label: "Settled", buttons: [{ label: "Re-run" }] },
      { type: "select", label: "Apply to", value: "Whole graph" },
      { type: "keyValue", pairs: [{ label: "Dimensions", value: "2D only, flat in 3D", wide: true }] },
      { type: "note", text: "Rows count the steps from the root. The other edges stay as faint cross-links. With a Grouping, \"Concentric rings\" and \"Columns by group\" ask for Group by [Communities] in this place instead of Root." },
    ],
  },
  status: { counts: { nodes: 34, edges: 78 }, layout: "Tree: settled", tool: "Layout: pick the root", zoom: "100%" },
  caption: {
    title: "Screen 84: the Tree layout, picking its root.",
    text: `Tree was chosen from the layout list; it needs a root, so its Root row appeared and it ran from the selected node (node 1). Look at: the rows by steps from node 1 with the ${cross} other edges drawn faint as cross-links, and "Cross-links ${cross} [Make a set]" on the tab; the Root field's pick button pressed again, which arms the canvas: the dark bar "Click the new root node, or type a name", the status bar's "Layout: pick the root", the pointer on node 34 (haloed under the pointer); Direction [Down]. A layout that needs groups shows Group by [Communities v] in the Root row's place, and one that needs an order shows Order by. Communities colours are kept: a layout never repaints.`,
  },
};

const TRY = nodeAt(spec, 34);
spec.canvas.overlays.cursor = { x: TRY.x + 4, y: TRY.y + 4, icon: "cursor" };
export default spec;
