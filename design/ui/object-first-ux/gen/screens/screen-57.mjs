// Screen 57: Focus on a group (round-3/navigate-select.md, "Focus"). Screen
// 3's Karate Club with Group 2 focused: only its 11 members and the 20 edges
// between them are drawn, the status bar names the focus with Exit, the
// Group's Members tab carries Exit focus where Focus was, and the Rank tool,
// armed, says it will run on Group 2 only. The camera re-fits to the
// members (canvas.camera), and Group 2's row carries the Focus glyph.
import { STATE } from "./screen-3.mjs";
import { NODES, EDGES, COMMUNITIES, DEGREE } from "../karate.mjs";
import { OVERRIDE } from "../palettes.mjs";

const G2 = COMMUNITIES[2];
const byId = {};
for (const [id, v] of Object.entries(STATE.canvas.nodes.byId)) byId[id] = G2.includes(Number(id)) ? { ...v, halo: false } : { ...v, hidden: true };
let inside = 0, cut = 0;
for (const [a, b] of EDGES) {
  const ia = G2.includes(a), ib = G2.includes(b);
  if (ia && ib) inside++; else if (ia || ib) cut++;
}
// The camera re-fitted to the members: their centre, zoomed so their extent fills the stage.
const pts = NODES.filter((n) => G2.includes(n.id));
const xs = pts.map((n) => n.x), ys = pts.map((n) => n.y);
const CENTER = { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
const ZOOM = Math.min(1000 / (Math.max(...xs) - Math.min(...xs) + 120), 760 / (Math.max(...ys) - Math.min(...ys) + 120));
const top = [...G2].sort((a, b) => DEGREE[b] - DEGREE[a]).slice(0, 5);

export default {
  id: 57,
  title: "Focus on a group",
  theme: "light",
  ...STATE,
  left: {
    ...STATE.left,
    objects: { rows: STATE.left.objects.rows.map((r) => ({ ...r, children: r.children.map((c) => (c.children ? { ...c, children: c.children.map((g) => (g.name === "Group 2" ? { ...g, glyph: "focus", glyphTitle: "Focused" } : g)) } : c)) })) },
  },
  canvas: {
    ...STATE.canvas,
    camera: { center: CENTER, zoom: ZOOM },
    nodes: { sizeBy: "degree", byId },
    edges: { default: { width: 1 } },
    labels: [1, 2, 3],
    overlays: {
      legend: { blocks: [
        { title: "Communities", note: "showing 1 of 4 groups", rows: [{ chip: { type: "swatch", color: OVERRIDE }, label: "Group 2", count: "11" }] },
        { title: "Connections", size: { from: "2", to: "16" } },
      ] },
      dock: { open: false },
    },
  },
  toolbar: {
    active: "select", armed: "rank", mode: "2D",
    secondary: { tool: "rank", variant: "Connections", scope: "Group 2 (focused)", count: "11", cost: "instant" },
  },
  inspector: {
    ...STATE.inspector,
    tab: "Members",
    rows: [
      { type: "keyValue", pairs: [{ label: "Nodes", value: "11" }, { label: "Edges", value: String(inside) }] },
      { type: "keyValue", pairs: [{ label: "Inside", value: String(inside) }, { label: "Cut", value: String(cut) }] },
      ...top.map((id) => ({ type: "keyValue", pairs: [{ label: `node ${id}`, value: `${DEGREE[id]} links`, wide: true }] })),
      { type: "link", text: "See all 11 in table" },
      { type: "button", buttons: [{ label: "Select" }, { label: "Exit focus", primary: true }, { label: "Locate" }] },
      { type: "note", text: "Focus on another Set or Group replaces this one. To look at the overlap of two, Combine them first (Intersect) and focus on the result." },
    ],
  },
  status: { counts: { nodes: 34, edges: 78 }, mask: { text: "Focused on Group 2: 11 of 34", exit: true }, layout: "Spread out: settled", tool: "Rank: Connections", zoom: "100%" },
  caption: {
    title: "Screen 57: Focus on Group 2, with the Rank tool armed inside it.",
    text: `Look at: only Group 2's 11 nodes and the ${inside} edges inside it drawn, the camera re-fitted to them; the Focus glyph on Group 2's row; \"Focused on Group 2: 11 of 34 [Exit]\" in the status bar; Group 2's row still painting (its eye on) and its Members tab offering Exit focus; the Rank bar reading \"on Group 2 (focused), 11 nodes\"; the legend counting only what shows. Focus starts from the row's hover glyph, its \"...\" menu, this tab, Filter's Create and focus, or a selection's menu; Esc as the last rung or Exit ends it.`,
  },
};
