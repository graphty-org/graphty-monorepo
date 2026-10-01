// Screen 26: a file dropped on a loaded graph (round-3/import.md, "Drop a file
// onto a loaded graph" and "Add data: the same-id rule"). Karate Club is open
// with the tree of screen 3. The reader dragged karate-2020.graphml over the
// canvas (screen 101 draws the drop overlay) and let go; the Import dialog
// opens with Into, the four things a second file can do. Add is chosen: a dry run counts the ids that already
// exist and the same-id rule is open. The primary button names the choice.
import { STATE } from "./screen-3.mjs";

const deselect = (r) => ({ ...r, selected: false, childSelected: false, children: r.children?.map(deselect) });

export default {
  id: 26,
  title: "A file dropped on a loaded graph: replace, add, join or open beside",
  theme: "light",
  file: STATE.file,
  left: { ...STATE.left, objects: { rows: STATE.left.objects.rows.map(deselect) } },
  canvas: {
    ...STATE.canvas,
    nodes: { ...STATE.canvas.nodes, byId: Object.fromEntries(Object.entries(STATE.canvas.nodes.byId).map(([id, v]) => [id, { ...v, halo: false }])) },
    overlays: {
      dock: { open: false },
      dialog: {
        title: "Import karate-2020.graphml",
        rows: [
          { type: "select", label: "Format", value: "GraphML, detected", note: "60 nodes, 140 edges" },
          { type: "radio", label: "Into", items: [{ label: "Replace Karate Club" }, { label: "Add to current graph", checked: true }, { label: "Add attributes to its nodes", note: "join, screen 37" }, { label: "Open beside to compare", note: "screen 21" }] },
          { type: "section", title: "Add" },
          { type: "note", text: "Dry run: 34 of the 60 node ids and 78 of the 140 edges are already in Karate Club." },
          { type: "select", label: "Same id", value: "Skip", note: "keep Karate Club's values" },
          { type: "note", text: "Skip keeps what is there. Replace takes the new record whole. Update fields writes only the fields the new file has." },
          { type: "text", text: "Will add 26 nodes and 62 edges. One undo step." },
          { type: "note", text: "The 3 objects in the tree go stale and say so; nothing re-runs by itself." },
        ],
        footer: [{ label: "Cancel" }, { label: "Add 26 nodes and 62 edges", primary: true }],
      },
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
    title: "Screen 26: a file dropped on a loaded graph.",
    text: "Look at: Into, the four things a second file can do (Replace Karate Club, Add to current graph, Add attributes to its nodes, Open beside to compare), Add chosen; the dry run's two counts; Same id [Skip v] with what Skip means and the other two rules; one undo step; the stale rule; the button names the choice (Replace, Add ..., Join ..., Open beside). Screen 101 draws the drop overlay that comes before this; the Dataset \"+\" (Add data), File > Add data... and File > Open... (Ctrl+O) open the same dialog, Add data with Add chosen and Open with Replace. Add attributes continues in the join design; Open beside in the two-graphs design.",
  },
};
