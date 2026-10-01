// Screen 33: the Import report opened, and the rejected rows in the table
// (round-3/data-editing.md, "Import report"). Karate Club as screen 2, but the
// reader opened the Overview tab's Import report disclosure: 80 edge records
// read, 78 kept, 2 rejected. "See in table" opened the Table dock on its
// third tab, Rejected, one row per rejected record with the reason. The
// first rejected row is selected, so its one known endpoint (node 7) is
// located on the canvas with a halo.
export default {
  id: 33,
  title: "Import report opened, and the rejected rows",
  theme: "light",
  file: "Karate Club",
  left: {
    views: { rows: [{ name: "Overview", current: true }] },
    objects: { rows: [
      { kind: "dataset", name: "Karate Club", nodes: 34, edges: 78, locked: true, chip: { type: "locked" }, expanded: true, children: [
        { kind: "suggestion", name: "Find groups", key: "G", icon: "group" },
        { kind: "suggestion", name: "Rank by connections", key: "R", icon: "rank" },
        { kind: "suggestion", name: "Find a path", key: "P", icon: "path" },
      ] },
    ] },
  },
  canvas: {
    nodes: { default: {}, byId: { 7: { halo: true, label: true } } },
    edges: { default: { width: 1 } },
    overlays: {
      dock: {
        open: true, tab: "Table", height: 248,
        table: {
          tabs: [{ label: "Nodes 34" }, { label: "Edges 78" }, { label: "Rejected 2", selected: true }],
          showing: false, search: false,
          columns: [
            { label: "line", width: "56px" },
            { label: "source", width: "96px" },
            { label: "target", width: "96px" },
            { label: "reason", width: "240px" },
            { label: "fix", width: "1fr" },
          ],
          rows: [
            ["412", { text: "(empty)", tone: "error" }, "7", "source is empty", { text: "type a source in the cell" }],
            ["486", "12", { text: "1;4", tone: "error" }, "target \"1;4\" is two ids, not one", { link: "Split into two edges" }],
          ],
          selectedRow: 0,
        },
        footer: { link: "Add fixed rows (0 ready)", text: "A row is ready once its cells read; Import options... changes the rules." },
      },
    },
  },
  toolbar: { active: "select", mode: "2D" },
  inspector: {
    kind: "Dataset", name: "Karate Club",
    actions: [{ icon: "plus", title: "Add data" }, { icon: "more", title: "Close dataset, Reload, Re-run all stale, Import options..." }],
    chip: { type: "locked" }, summary: "karate.gml, GML",
    reading: "34 nodes joined by 78 edges in one connected part",
    tabs: ["Overview", "Layout", "Canvas", "Data"], tab: "Overview",
    rows: [
      { type: "keyValue", pairs: [{ label: "Nodes", value: "34" }, { label: "Edges", value: "78" }] },
      { type: "keyValue", pairs: [{ label: "Direction", value: "Undirected (file)", action: "Change..." }] },
      { type: "keyValue", pairs: [{ label: "Density", value: "0.139" }, { label: "Mean links", value: "4.6" }] },
      { type: "keyValue", pairs: [{ label: "Parts", value: "1" }, { label: "Weighted", value: "No" }] },
      { type: "disclosure", title: "Import report", summary: "2 rejected", open: true },
      { type: "keyValue", pairs: [{ label: "Read", value: "80 edges" }, { label: "Kept", value: "78" }] },
      { type: "keyValue", pairs: [{ label: "Rejected", value: "2", action: "See in table" }] },
      { type: "keyValue", pairs: [{ label: "Repeated", value: "0" }, { label: "Weights", value: "none" }] },
      { type: "keyValue", pairs: [{ label: "Endpoints", value: "source, target", note: "detected", wide: true }] },
      { type: "keyValue", pairs: [{ label: "line 412", value: "source is empty", wide: true, secondary: true }] },
      { type: "keyValue", pairs: [{ label: "line 486", value: "target is two ids", wide: true, secondary: true }] },
      { type: "button", buttons: [{ label: "Add fixed rows" }, { label: "Import options..." }] },
      { type: "emptyPlus", title: "Findings" },
    ],
  },
  status: { counts: { nodes: 34, edges: 78 }, layout: "Spread out: settled", zoom: "100%" },
  caption: {
    title: "Screen 33: the Import report opened, and the rejected rows.",
    text: "Karate Club just loaded; the reader opened the Overview tab's Import report and pressed See in table. Look at: the report's rows (read 80 edge records, kept 78, rejected 2 with See in table, repeats 0, weights none, the endpoint columns and that they were detected); one line per rejected record with its reason; Add fixed rows (adds the rows once their cells are corrected, no reload) and Import options... (screen 34); the Table dock opened on a third tab, Rejected 2, one row per rejected record with its file line, the raw source and target (the bad cell in red), the reason and the fix, and a footer with Add fixed rows; this tab has no Showing or Search, because it holds only the rejected records; the selected row's known endpoint, node 7, haloed on the canvas.",
  },
};
