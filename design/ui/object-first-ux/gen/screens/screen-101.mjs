// Screen 101: a file dragged over a loaded graph, before it is dropped
// (round-3/import.md, "Drop a file onto a loaded graph"). Karate Club with
// the tree of screen 3, nothing selected. While the file is over the stage,
// the stage takes a dashed brand outline and one line says what a drop will
// do; nothing loads on drop: the Import dialog opens (screen 26).
import { STATE } from "./screen-3.mjs";

const deselect = (r) => ({ ...r, selected: false, childSelected: false, children: r.children?.map(deselect) });

export default {
  id: 101,
  title: "A file dragged over a loaded graph",
  theme: "light",
  file: STATE.file,
  left: { ...STATE.left, objects: { rows: STATE.left.objects.rows.map(deselect) } },
  canvas: {
    ...STATE.canvas,
    nodes: { ...STATE.canvas.nodes, byId: Object.fromEntries(Object.entries(STATE.canvas.nodes.byId).map(([id, v]) => [id, { ...v, halo: false }])) },
    overlays: {
      dock: { open: false },
      drop: { text: "Drop karate-2020.graphml to import it: you choose Replace, Add, Join or Open beside next" },
      cursor: { x: 560, y: 470, icon: "data" },
    },
  },
  toolbar: STATE.toolbar,
  inspector: {
    kind: "Dataset", name: "Karate Club",
    actions: [{ icon: "plus", title: "Add data" }, { icon: "more" }],
    chip: { type: "locked" }, summary: "karate.gml, GML",
    reading: "34 nodes joined by 78 edges in one connected part",
    tabs: ["Overview", "Layout", "Canvas", "Data"], tab: "Overview",
    rows: [
      { type: "keyValue", pairs: [{ label: "Nodes", value: "34" }, { label: "Edges", value: "78" }] },
      { type: "keyValue", pairs: [{ label: "Direction", value: "Undirected (file)", action: "Change..." }] },
      { type: "disclosure", title: "Import report", summary: "read 80, kept 78" },
    ],
  },
  status: { counts: { nodes: 34, edges: 78 }, layout: "Spread out: settled", zoom: "100%" },
  caption: {
    title: "Screen 101: a file dragged over a loaded graph.",
    text: "karate-2020.graphml is being dragged over the Karate Club canvas. Look at: the whole stage outlined in dashed brand blue with one line that says the drop will not replace anything by itself; the graph, the tree and the inspector unchanged underneath. Letting go opens the Import dialog with its Into choice (screen 26); Esc or dragging away cancels. The same outline appears over the Welcome sheet before anything is loaded, where a drop opens the dialog of screen 14.",
  },
};
