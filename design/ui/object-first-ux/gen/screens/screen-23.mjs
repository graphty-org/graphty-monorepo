// Screen 23: the Import dialog on its Paste tab (round-3/import.md, "Paste
// graph data"). Karate Club is open; the reader pressed Ctrl+V on the canvas
// with an edge list on the clipboard. The dialog opens on the Paste tab,
// pre-filled, and loads nothing until Add or Replace is pressed. The inset is
// the parse-error state of the same tab.
import { STATE } from "./screen-3.mjs";

const deselect = (r) => ({ ...r, selected: false, childSelected: false, children: r.children?.map(deselect) });

export default {
  id: 23,
  title: "Paste data: Ctrl+V on the canvas opens the Paste tab, pre-filled",
  theme: "light",
  file: STATE.file,
  left: { ...STATE.left, objects: { rows: STATE.left.objects.rows.map(deselect) } },
  canvas: {
    ...STATE.canvas,
    nodes: { ...STATE.canvas.nodes, byId: Object.fromEntries(Object.entries(STATE.canvas.nodes.byId).map(([id, v]) => [id, { ...v, halo: false }])) },
    overlays: {
      dock: { open: false },
      dialog: {
        title: "Paste data",
        tabs: ["File", "URL", "Paste", "A source"], tab: "Paste",
        rows: [
          { type: "radio", label: "Into", items: [{ label: "Replace Karate Club" }, { label: "Add to current graph", checked: true }, { label: "Add attributes to its nodes" }, { label: "Open beside to compare" }] },
          { type: "textarea", mono: true, lines: ["12 35 1", "35 36 2", "35 37 1", "30 38 3", "38 39 1", "..."], rows: 6 },
          { type: "note", text: "Accepts an edge list (source target [weight], one per line), CSV or TSV with a header, JSON, GraphML, GML, DOT." },
          { type: "select", label: "Format", value: "Edge list, detected", note: "10 lines, 3 fields" },
          { type: "section", title: "Columns" },
          { type: "select", label: "Source", value: "field 1" },
          { type: "select", label: "Target", value: "field 2" },
          { type: "select", label: "Weight", value: "field 3" },
          { type: "text", text: "Will add 6 nodes and 10 edges; 12, 30, 34 already exist." },
        ],
        footer: [{ label: "Cancel" }, { label: "Add 6 nodes", primary: true }],
      },
    },
  },
  insets: [{
    tag: "If a line does not parse", left: 256, top: 40, width: 256,
    title: "Paste data",
    rows: [
      { type: "textarea", mono: true, lines: ["34 40 1", "35 36 2 x", "36 12 1"], error: { line: 1, from: 8, to: 9, text: "Line 7 has 4 fields; the others have 3." } },
      { type: "button", buttons: [{ label: "Skip line 7" }] },
    ],
    footer: [{ label: "Cancel" }, { label: "Add 6 nodes", primary: true, disabled: true }],
  }],
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
    title: "Screen 23: paste data.",
    text: "Ctrl+V on the Karate Club canvas, an edge list on the clipboard. Look at: the dialog opens on Paste, pre-filled, and loads nothing by itself; the Into choice as radios (Replace, Add, Add attributes, Open beside) because a graph is open, Add chosen; the pasted text in a monospace field; the accepted forms; the detected format and counts; the same column roles as a file; the sentence naming the ids that already exist; the button says what it will do. Inset: a line that does not parse, underlined in red with the reason under the field and Skip; the button stays disabled.",
  },
};
