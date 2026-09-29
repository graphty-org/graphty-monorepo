// Screen 34: the Import options sheet (round-3/data-editing.md, "Import
// options"). The Email network of screen 10, with its three objects. The
// reader opened the Dataset's "..." > Import options... (also reached from
// the Import report's "Import options..." button, screen 33) and changed
// Repeated edges from "Keep each" to "Sum into one": 5,830 email records
// between 2,412 distinct pairs become 2,412 weighted edges. The sheet's live
// line says so before anything reloads, and the objects are kept and re-run,
// exactly as the reload dialog of screen 15.
import S10 from "./screen-10.mjs";

export default {
  id: 34,
  title: "Import options after a load",
  theme: "light",
  file: "Email network",
  left: S10.left,
  canvas: {
    graph: "email",
    nodes: S10.canvas.nodes,
    edges: S10.canvas.edges,
    overlays: {
      dock: { open: false },
      dialog: {
        title: "Import options: email.csv",
        rows: [
          { type: "select", label: "Repeats", value: "Sum into one", note: "was Keep each" },
          { type: "select", label: "Missing end", value: "Create the node", note: "0 in this file" },
          { type: "segmented", label: "Self-loops", options: ["Keep", "Drop"], value: "Keep" },
          { type: "select", label: "Node ids", value: "7 and \"7\" are one" },
          { type: "select", label: "Endpoints", value: "from, to", note: "detected" },
          { type: "number", label: "Scale", fields: [{ value: "1.0", suffix: "x" }] },
          { type: "disclosure", title: "CSV options", summary: "comma, header row, UTF-8" },
          { type: "text", text: "Will keep 2,412 edges and 1,204 nodes (now 5,830 edges).", secondary: false },
          { type: "segmented", label: "Objects", options: ["Keep and re-run", "Remove"], value: "Keep and re-run" },
          { type: "text", text: "Re-runs Active senders, Connections, Communities: about 5 s." },
          { type: "text", text: "One undo step. Each kept edge's weight is the sum of its repeats." },
        ],
        footer: [{ label: "Cancel" }, { label: "Apply and reload", primary: true }],
      },
    },
  },
  toolbar: { active: "select", mode: "2D" },
  inspector: {
    kind: "Dataset", name: "Email network",
    actions: [{ icon: "plus", title: "Add data" }, { icon: "more", title: "Close dataset, Reload, Re-run all stale, Import options..." }],
    chip: { type: "locked" }, summary: "email.csv, CSV",
    reading: "1,204 people joined by 5,830 emails over 12 months, in 3 parts.",
    tabs: ["Overview", "Layout", "Canvas", "Data"], tab: "Overview",
    rows: [
      { type: "keyValue", pairs: [{ label: "Nodes", value: "1,204" }, { label: "Edges", value: "5,830" }] },
      { type: "keyValue", pairs: [{ label: "Direction", value: "Directed (file)", action: "Change..." }] },
      { type: "keyValue", pairs: [{ label: "Density", value: "0.004" }, { label: "Mean links", value: "9.7" }] },
      { type: "keyValue", pairs: [{ label: "Parts", value: "3" }, { label: "Weighted", value: "No" }] },
      { type: "disclosure", title: "Import report", summary: "kept all 5,830" },
      { type: "emptyPlus", title: "Findings" },
      { type: "emptyPlus", title: "Notes" },
    ],
  },
  status: { counts: { nodes: 1204, edges: 5830 }, layout: "Spread out: settled", zoom: "100%" },
  caption: {
    title: "Screen 34: Import options after a load.",
    text: "Email network with the objects of screen 10; Dataset \"...\" > Import options... opened this 480 px sheet. Look at: one row per load rule the element has (repeated edges, edges whose end is not a node, self-loops, how ids are compared, which columns are the endpoints, position scale), each a select with the old value beside a changed one; the format's own options in one collapsed disclosure; the live line \"Will keep 2,412 edges\" computed by a dry run before anything reloads; Objects [Keep and re-run | Remove] and the re-run list with its cost, as the reload dialog of screen 15; Apply and reload as the one filled button.",
  },
};
