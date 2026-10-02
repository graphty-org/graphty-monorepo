// Screen 58: keyboard focus on the canvas (round-3/navigate-select.md,
// "Keyboard on the canvas"). Screen 3's Karate Club with nothing selected.
// The reader pressed F6 to move into the canvas and then ] twice: node 34
// has the keyboard focus ring (blue, outside any outline, never the gold
// selection halo), the edge to the neighbour ] would go to next is drawn
// dashed blue, and the live caption above the toolbar reads the node aloud
// to a screen reader and shows it to everyone else. The inset is the canvas
// section of Help > Keyboard shortcuts.
import { STATE } from "./screen-3.mjs";
import { EDGES, DEGREE, COMMUNITIES } from "../karate.mjs";

const FOCUS = 34, NEXT = 9;
const groupOf = (id) => Object.keys(COMMUNITIES).find((g) => COMMUNITIES[g].includes(id));
const byId = {};
for (const [id, v] of Object.entries(STATE.canvas.nodes.byId)) byId[id] = { ...v, halo: false };
byId[FOCUS] = { ...byId[FOCUS], focus: true };
const pair = `${Math.min(FOCUS, NEXT)}-${Math.max(FOCUS, NEXT)}`;
const rank = Object.keys(DEGREE).map(Number).sort((a, b) => DEGREE[b] - DEGREE[a]).indexOf(FOCUS) + 1;

const rows = STATE.left.objects.rows.map((r) => ({ ...r, children: r.children.map((c) => (c.children ? { ...c, children: c.children.map((g) => ({ ...g, selected: false })) } : c)) }));

export default {
  id: 58,
  title: "Keyboard focus on the canvas",
  theme: "light",
  ...STATE,
  left: { ...STATE.left, objects: { rows } },
  canvas: {
    ...STATE.canvas,
    nodes: { sizeBy: "degree", byId },
    edges: { default: { width: 1 }, byPair: { [pair]: { stroke: "#0d99ff", width: 2, dash: "4 3" } } },
    overlays: {
      dock: { open: false },
    },
  },
  toolbar: {
    active: "select", mode: "2D",
    // The live caption: the secondary bar's slot, since a tool is not armed.
    secondary: { caption: true, parts: [{ text: `Node ${FOCUS}` }, `${DEGREE[FOCUS]} neighbours, Group ${groupOf(FOCUS)}, Connections rank ${rank} of 34.`, { text: `] goes to node ${NEXT}. Enter selects. Esc leaves.`, secondary: true }] },
  },
  insets: [{
    tag: "Help > Keyboard shortcuts, the canvas part", left: 256, top: 16, width: 248,
    title: "Keyboard on the canvas",
    rows: [
      { type: "table", columns: ["1fr", "auto"], rows: [
        ["Next panel", { text: "F6", secondary: true }],
        ["Neighbour that way", { text: "Arrows", secondary: true }],
        ["Next neighbour round", { text: "] and [", secondary: true }],
        ["Next member", { text: "Tab", secondary: true }],
        ["Select (Shift adds)", { text: "Enter", secondary: true }],
        ["Armed tool on it", { text: "Space", secondary: true }],
        ["Right-click menu", { text: "Shift+F10", secondary: true }],
        ["Leave the canvas", { text: "Esc", secondary: true }],
      ], selected: 2 },
    ],
  }],
  inspector: {
    kind: "Dataset", name: "Karate Club",
    actions: [{ icon: "plus", title: "Add data" }, { icon: "more" }],
    chip: { type: "locked" }, summary: "karate.gml, GML",
    reading: "34 nodes joined by 78 edges in one connected part",
    tabs: ["Overview", "Layout", "Canvas", "Data"], tab: "Overview",
    framing: "100%",
    rows: [
      { type: "keyValue", pairs: [{ label: "Nodes", value: "34" }, { label: "Edges", value: "78" }] },
      { type: "keyValue", pairs: [{ label: "Direction", value: "Undirected (file)", action: "Change..." }] },
      { type: "keyValue", pairs: [{ label: "Density", value: "0.139" }, { label: "Mean links", value: "4.6" }] },
      { type: "keyValue", pairs: [{ label: "Parts", value: "1" }, { label: "Weighted", value: "No" }] },
    ],
  },
  status: { counts: { nodes: 34, edges: 78 }, layout: "Spread out: settled", tool: `Keyboard: node ${FOCUS}`, zoom: "100%" },
  caption: {
    title: "Screen 58: walking the graph with the keyboard.",
    text: `Look at: the blue focus ring on node ${FOCUS}, outside its outline and distinct from the gold selection halo (nothing is selected, so the inspector still shows the Dataset); the dashed blue edge to node ${NEXT}, where ] (the next neighbour clockwise) goes; the live caption above the toolbar, which a screen reader hears through an ARIA live region; the canvas part of Help > Keyboard shortcuts in the inset. The camera pans only when the focused node would leave the screen.`,
  },
};
