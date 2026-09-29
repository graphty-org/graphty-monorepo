// Screen 52: the minimap (round-3/navigate-select.md, "Minimap"). The Email
// network, 2D, zoomed to 400 percent on one region (canvas.camera), the
// minimap switched on from Dataset > Canvas (or M). The card at the bottom
// left draws the whole graph as dots in their painted colours with the part
// the canvas shows as a blue box.
import { DEGREE, COMMUNITIES } from "../email.mjs";
import { OKABE_8, OTHER } from "../palettes.mjs";

const groupColor = (g) => OKABE_8[g - 1] || OTHER;
const byId = {};
for (const [g, members] of Object.entries(COMMUNITIES)) for (const id of members) byId[id] = { fill: groupColor(Number(g)) };
const CENTER = { x: 330, y: 300 }, ZOOM = 4;

export default {
  id: 52,
  title: "Minimap",
  theme: "light",
  file: "Email network",
  left: {
    views: { rows: [{ name: "Overview", current: false, drift: false }] },
    objects: { rows: [
      { kind: "dataset", name: "Email network", nodes: 1204, edges: 5830, locked: true, chip: { type: "locked" }, expanded: true, children: [
        { kind: "measure", name: "Connections (Degree)", values: 1204, chip: { type: "size" } },
        { kind: "grouping", name: "Communities (Louvain)", groups: 9, expanded: false, chip: { type: "strip", colors: OKABE_8 } },
      ] },
    ] },
  },
  canvas: {
    graph: "email",
    camera: { zoom: ZOOM, center: CENTER },
    nodes: { default: {}, byId, sizeBy: { values: DEGREE, from: 0.6, to: 2.0 } },
    edges: { default: { width: 1 } },
    overlays: {
      // The viewport box: the 959 x 844 stage in box units at this zoom (fit
      // scale 0.839 x 4), placed as fitOf centres the camera.
      minimap: { zoom: "400%", viewport: { x: CENTER.x - 143, y: CENTER.y - 111, w: 286, h: 252 } },
      dock: { open: false },
    },
  },
  toolbar: { active: "select", mode: "2D" },
  inspector: {
    kind: "Dataset", name: "Email network",
    actions: [{ icon: "plus", title: "Add data" }, { icon: "more" }],
    chip: { type: "locked" }, summary: "email.csv, CSV",
    reading: "1,204 people joined by 5,830 emails in 3 parts",
    tabs: ["Overview", "Layout", "Canvas", "Data"], tab: "Canvas",
    framing: "400%",
    rows: [
      { type: "select", label: "Background", value: "Follow theme" },
      { type: "select", label: "Look", value: "Default" },
      { type: "select", label: "Labels", value: "Top 6 by Connections", gear: true },
      { type: "select", label: "Edge labels", value: "none" },
      { type: "select", label: "Tooltip", value: "Label + 3 attributes", gear: true },
      { type: "switch", label: "Legend  (L)", on: false, second: { label: "Minimap  (M)", on: true } },
      { type: "switch", label: "Note markers", on: true, second: { label: "Hidden faintly", on: false } },
      { type: "note", text: "The minimap is 2D only: in 3D its switch is disabled with the reason \"a flat overview of an orbiting camera would mislead; use Zoom to fit (Shift+1)\"." },
    ],
  },
  status: { counts: { nodes: 1204, edges: 5830 }, layout: "Spread out: settled", zoom: "400%" },
  caption: {
    title: "Screen 52: the minimap, switched on from Dataset > Canvas or with M.",
    text: "Look at: the canvas zoomed to 400% on one region of the Email network; the 160 x 120 minimap at the bottom left, above the toolbar's left end, drawing every node as a dot in its painted colour and the part the canvas shows as a blue box (drag the box to pan, click to jump, the wheel over it zooms), with the zoom in its header and a close x that turns the switch off; the Legend | Minimap switch row on the Canvas tab with its key; the pill and status bar at 400%.",
  },
};
