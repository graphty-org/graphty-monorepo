// Screen 85: arranging only one group. The reader chose "Arrange only
// these..." on Group 2's menu; the Dataset's Layout tab opened with Apply to
// [Group 2] and the Ring arrangement, and the eleven members were placed on a
// ring around where they were, while the other 23 nodes stayed put. The ring
// is computed here from karate.mjs's positions (centre = the members'
// centroid). The row's menu is drawn beside its row, tagged as the moment
// before, with the chosen row highlighted.
import { NODES, COMMUNITIES } from "../karate.mjs";
import { KARATE, DATASET, menuItems } from "./screen-83.mjs";

const MEMBERS = [...COMMUNITIES[2]].sort((a, b) => a - b);
const pos = Object.fromEntries(NODES.map((n) => [n.id, n]));
const cx = MEMBERS.reduce((t, id) => t + pos[id].x, 0) / MEMBERS.length;
const cy = MEMBERS.reduce((t, id) => t + pos[id].y, 0) / MEMBERS.length;
const moved = {};
MEMBERS.forEach((id, i) => {
  const a = -Math.PI / 2 + (2 * Math.PI * i) / MEMBERS.length;
  moved[id] = { x: Math.round(cx + 150 * Math.cos(a)), y: Math.round(cy + 150 * Math.sin(a)) };
});

const byId = {};
for (const [id, v] of Object.entries(KARATE.canvas.nodes.byId)) byId[id] = { ...v, halo: MEMBERS.includes(Number(id)) };

const tree = KARATE.left.objects.rows.map((r) => ({ ...r, selected: true, children: r.children.map((c) => (c.children ? { ...c, children: c.children.map((g) => (g.name === "Group 2" ? { ...g, hover: true } : g)) } : c)) }));

export default {
  id: 85,
  title: "Arranging only one group",
  theme: "light",
  ...KARATE,
  left: { ...KARATE.left, objects: { rows: tree } },
  canvas: {
    ...KARATE.canvas,
    positions: moved,
    nodes: { ...KARATE.canvas.nodes, byId },
    overlays: { ...KARATE.canvas.overlays },
  },
  menus: [{
    tag: "A moment before: Group 2's row menu",
    anchor: { row: "Group 2", side: "right", align: "start", dx: -12, dy: -30 },
    width: 220,
    rows: menuItems([
        { label: "Select members" },
        { label: "Focus on this" },
        { label: "Locate" },
        "-",
        { label: "Arrange only these...", chosen: true },
        { label: "Style..." },
        { label: "Make a set from these" },
        "-",
        { label: "Hide" },
        { label: "Lock" },
      ]),
  }],
  inspector: {
    ...DATASET, tab: "Layout",
    rows: [
      { type: "select", label: "Apply to", value: "Group 2" },
      { type: "select", label: "Layout", value: "Ring", gear: true },
      { type: "select", label: "Order by", value: "Load order" },
      { type: "button", label: "Placed 11 of 34", buttons: [{ label: "Re-run" }] },
      { type: "keyValue", pairs: [{ label: "The rest", value: "Spread out, kept", secondary: true, wide: true }] },
      { type: "button", label: "", buttons: [{ label: "Back to whole graph" }] },
      { type: "keyValue", pairs: [{ label: "Dimensions", value: "2D, follows the view", wide: true }] },
      { type: "note", text: "Only Group 2 moved; the other 23 nodes kept their places, and the members' edges to them stretch. One undo step (Ctrl+Z) puts the eleven back." },
    ],
  },
  status: { counts: { nodes: 34, edges: 78 }, layout: "Ring on Group 2", selection: "11 selected", zoom: "100%" },
  caption: {
    title: "Screen 85: arranging only one group.",
    text: "Group 2's row menu is drawn beside its row, tagged as the moment before, with \"Arrange only these...\" highlighted (the same row is on a Set's menu, the several-elements inspector and the canvas right-click). Look at: the eleven members on a ring around where they were, haloed because they are selected, while the other 23 nodes stayed put; the Dataset's Layout tab with Apply to [Group 2] first, then Layout [Ring] and Order by; \"Placed 11 of 34\" with Re-run; the rest's layout named and kept; [Back to whole graph]; the status bar's layout chip \"Ring on Group 2\". The step is one entry in History, undone by Ctrl+Z.",
  },
};
