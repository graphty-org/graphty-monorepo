// Screen 15: the reload dialog that keeps the objects (round-2/screens.md).
// The tree of screen 3 exists (a Set, a Measure, a Grouping with four
// Groups). Nothing is selected; the Dataset's Overview tab is open and the
// reader pressed "Change..." on the Direction row. Until the element can
// re-map weight, label and direction in place, that row reloads the file;
// this dialog is what makes the reload safe: it keeps the objects and re-runs
// them (a recipe replay under the stale rule), and says the cost. "Set as
// weight" and "Set as label" on the Data tab open the same dialog with their
// own first row.
import { STATE } from "./screen-3.mjs";

const deselect = (r) => ({ ...r, selected: false, childSelected: false, children: r.children?.map(deselect) });

export default {
  id: 15,
  title: "Reload keeping the objects: a column role changed after the first runs",
  theme: "light",
  file: STATE.file,
  left: { ...STATE.left, objects: { rows: STATE.left.objects.rows.map(deselect) } },
  canvas: {
    ...STATE.canvas,
    nodes: { ...STATE.canvas.nodes, byId: Object.fromEntries(Object.entries(STATE.canvas.nodes.byId).map(([id, v]) => [id, { ...v, halo: false }])) },
    overlays: {
      ...STATE.canvas.overlays,
      dialog: {
        title: "Change direction",
        rows: [
          { type: "select", label: "Direction", value: "Directed", note: "was Undirected (file)" },
          { type: "note", text: "Reloads karate.gml with the new direction. The three objects made from it keep their rows, names and styles, and re-run under the new direction." },
          { type: "segmented", label: "Objects", options: ["Keep and re-run", "Remove"], value: "Keep and re-run" },
          { type: "keyValue", pairs: [{ label: "Re-runs", value: "Degree > 8, Connections, Communities", note: "about 2 s", wide: true }] },
          { type: "text", text: "A re-run over the gate lands waiting, with its Run button in the row." },
        ],
        footer: [{ label: "Cancel" }, { label: "Reload", primary: true }],
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
      { type: "keyValue", pairs: [{ label: "Density", value: "0.139" }, { label: "Mean links", value: "4.6" }] },
      { type: "keyValue", pairs: [{ label: "Parts", value: "1" }, { label: "Weighted", value: "No" }] },
      { type: "disclosure", title: "Import report", summary: "read 80, kept 78" },
      { type: "emptyPlus", title: "Findings" },
      { type: "emptyPlus", title: "Notes" },
    ],
  },
  status: { counts: { nodes: 34, edges: 78 }, layout: "Spread out: settled", zoom: "100%" },
  caption: {
    title: "Screen 15 of 15: reload keeping the objects.",
    text: "Karate Club with the tree of screen 3, nothing selected, Overview open; \"Change...\" on the Direction row opened this dialog. Look at: the new value and the old one beside it; the sentence that says the file reloads; \"Objects [Keep and re-run | Remove]\" with Keep chosen; the three objects that will re-run and the cost; Reload as the one filled button. The tree behind the dialog is what the reload used to destroy. \"Set as weight\" and \"Set as label\" on the Data tab open the same dialog.",
  },
};
