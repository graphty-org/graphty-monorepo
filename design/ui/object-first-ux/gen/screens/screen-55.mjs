// Screen 55: box selection and the several-elements inspector
// (round-3/navigate-select.md, "Selecting many", "Select all, none, invert"
// and "Hide and show"). Karate Club with screen 3's objects, no row
// selected. Node 34 was Shift+clicked, then the reader drags a box on empty
// canvas with Shift held: the nodes inside preview as selected while the
// drag lasts. Three nodes were hidden earlier (Hide these), so they are
// absent, the tree shows the "Hidden by hand" row, and the status bar says
// "3 hidden" with Show all.
import { STATE } from "./screen-3.mjs";
import { EDGES, DEGREE } from "../karate.mjs";
import { nodesIn } from "../render.mjs";

const HIDDEN = [12, 13, 17];
const spec = { canvas: { graph: "karate", overlays: {} } };
const BOX = { x: 292, y: 252, w: 256, h: 238 };
const SEL = [...nodesIn(spec, BOX).filter((id) => !HIDDEN.includes(id)), 34];
const inside = EDGES.filter(([a, b]) => SEL.includes(a) && SEL.includes(b)).length;
const cut = EDGES.filter(([a, b]) => SEL.includes(a) !== SEL.includes(b)).length;
const degs = SEL.map((id) => DEGREE[id]);

const byId = {};
for (const [id, v] of Object.entries(STATE.canvas.nodes.byId)) byId[id] = { ...v, halo: SEL.includes(Number(id)) };
for (const id of HIDDEN) byId[id] = { ...byId[id], hidden: true };

const rows = STATE.left.objects.rows.map((r) => ({
  ...r,
  children: [
    { kind: "set", name: "Hidden by hand", nodes: 3, system: true, eye: false },
    ...r.children.map((c) => (c.children ? { ...c, childSelected: true, children: c.children.map((g) => ({ ...g, selected: false, childSelected: g.name !== "Group 4" })) } : { ...c, childSelected: c.kind === "set" })),
  ],
}));

export default {
  id: 55,
  title: "Box selection and the several-elements inspector",
  theme: "light",
  file: "Karate Club",
  left: { views: STATE.left.views, objects: { rows } },
  canvas: {
    nodes: { sizeBy: "degree", byId },
    edges: { default: { width: 1 } },
    labels: [34, 1, 33, 3, 2, 9],
    overlays: {
      marquee: BOX,
      cursor: { x: BOX.x + BOX.w - 4, y: BOX.y + BOX.h - 4, icon: "cursor" },
      dock: { open: false },
    },
  },
  toolbar: { active: "select", mode: "2D" },
  inspector: {
    kind: "Selection", name: `${SEL.length} nodes`,
    actions: [{ icon: "locate", title: "Zoom to selection (Shift+2)" }, { icon: "more" }],
    summary: { nodes: SEL.length, text: `${inside} edges between them` },
    reading: `${SEL.length - 1} by box, 1 by Shift+click. Shift adds, Alt removes.`,
    tabs: [], tab: null,
    framing: "100%",
    rows: [
      { type: "section", title: "Select" },
      { type: "table", columns: ["1fr", "auto"], rows: [
        [{ link: "Select all shown" }, { text: "Ctrl+A", secondary: true }],
        [{ link: "Select none" }, { text: "Esc", secondary: true }],
        [{ link: "Invert" }, { text: "Ctrl+I", secondary: true }],
        [{ link: "Add edges between" }, { text: "Ctrl+Shift+A", secondary: true }],
        [{ link: "Hide these" }, { text: "Ctrl+Shift+H", secondary: true }],
      ] },
      { type: "button", buttons: [{ label: "Make a set  (Ctrl+G)", primary: true }] },
      { type: "select", label: "Add to", value: "Degree > 8" },
      { type: "disclosure", title: "Statistics", summary: `${inside} inside, ${cut} cut` },
      { type: "disclosure", title: "Values", summary: `Connections ${Math.min(...degs)} to ${Math.max(...degs)}` },
      { type: "chips", title: "Member of", chips: [{ chip: { type: "ring", color: "ink" }, label: "Degree > 8" }] },
      { type: "link", text: "Style these..." },
      { type: "link", text: "Merge into one node..." },
    ],
  },
  status: { counts: { nodes: 34, edges: 78 }, mask: { text: "3 hidden", link: "Show all" }, layout: "Spread out: settled", selection: `${SEL.length} selected`, zoom: "100%" },
  caption: {
    title: "Screen 55: a Shift+drag box adding to a Shift+click, and the several-elements inspector.",
    text: `Look at: the box mid-drag with the nodes inside haloed live (release keeps them); \"${SEL.length} selected\" in the status bar; the inspector's Select verbs with their keys, Make a set, Add to, Statistics, Values, Member of, Style these, Merge; three nodes hidden earlier, absent from the canvas, listed as the system row \"Hidden by hand\" (secondary italic, its eye off) and counted in the status bar with Show all. Over the element's 5,000 cap the status reads \"5,000 selected (capped)\".`,
  },
};
