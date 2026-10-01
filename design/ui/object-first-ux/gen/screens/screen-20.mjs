// Screen 20: run a recipe on a newly loaded file (round-3/file-project.md,
// "Recipes"). Next week's club-week-39.gml has just been opened (the drawing
// is Karate Club's; the values are plausible, not computed); File > Run a
// recipe... picked karate-analysis.recipe.json and this dialog checks every
// step against the new data before anything runs. The Export recipe dialog
// that wrote the file last week is the inset at the left; the file-menu row
// that opens this dialog is drawn on screen 16.
export default {
  id: 20,
  title: "Run a recipe on a new file",
  theme: "light",
  file: "club-week-39",
  left: {
    views: { rows: [{ name: "Overview", current: true }] },
    objects: { rows: [
      { kind: "dataset", name: "club-week-39", nodes: 34, edges: 80, locked: true, chip: { type: "locked" }, expanded: true, children: [
        { kind: "suggestion", name: "Find groups", key: "G", icon: "group" },
        { kind: "suggestion", name: "Rank by connections", key: "R", icon: "rank" },
        { kind: "suggestion", name: "Find a path", key: "P", icon: "path" },
      ] },
    ] },
  },
  canvas: {
    nodes: { default: {} },
    edges: { default: { width: 1 } },
    overlays: {
      dock: { open: false },
      dialog: {
        title: "Run recipe: karate-analysis",
        rows: [
          { type: "note", text: "Made on Karate Club (34 nodes) on Sep 18. Runs on club-week-39 (34 nodes, 80 edges; member 34 left, 35 joined). Every step is checked against this data first:" },
          { type: "table", columns: ["16px", "1fr", "112px"], head: ["", "Step", "On this data"], rows: [
            ["1", "Degree > 8", "fits"],
            ["2", "Connections", "fits"],
            ["3", "Communities", "fits"],
            ["4", "Bridges, weighted by weight", "column not found"],
            ["5", "Path: 1 -> 34", "no node 34: skip"],
          ].map((r) => (r[2] === "fits" ? [r[0], r[1], { text: "fits", tone: "success" }] : r[2].startsWith("no node") ? [r[0], r[1], { text: r[2], secondary: true }] : [r[0], r[1], { text: r[2], tone: "error" }])), selected: 3 },
          { type: "select", label: "weight is", value: "strength", note: "number column" },
          { type: "radio", label: "Objects", items: [{ label: "Add to what is in the tree", checked: true }, { label: "Replace what is in the tree" }] },
          { type: "text", text: "Runs 4 of 5 steps, about 3 s. Step 5 is skipped." },
        ],
        footer: [{ label: "Cancel" }, { label: "Run", primary: true }],
      },
    },
  },
  insets: [{
    tag: "Last week: Export > Export recipe...", left: 256, top: 56, width: 248,
    title: "Export recipe",
    rows: [
      { type: "note", text: "On Karate Club, which objects become steps:" },
      { type: "checkbox", items: [{ label: "Degree > 8", checked: true }, { label: "Connections", checked: true }] },
      { type: "checkbox", items: [{ label: "Communities", checked: true }, { label: "Bridges", checked: true }] },
      { type: "checkbox", items: [{ label: "Path: 1 -> 34", checked: true }] },
      { type: "segmented", label: "Keep", options: ["Steps", "Styles only"], value: "Steps" },
      { type: "switch", label: "Include layout", on: true, wide: true },
    ],
    footer: [{ label: "Export", primary: true }],
  }],
  toolbar: { active: "select", mode: "2D" },
  inspector: {
    kind: "Dataset", name: "club-week-39",
    actions: [{ icon: "plus", title: "Add data" }, { icon: "more" }],
    chip: { type: "locked" }, summary: "club-week-39.gml, GML",
    reading: "34 nodes joined by 80 edges in one connected part",
    tabs: ["Overview", "Layout", "Canvas", "Data"], tab: "Overview",
    rows: [
      { type: "keyValue", pairs: [{ label: "Project", value: "Not saved", action: "Save...", wide: true }] },
      { type: "keyValue", pairs: [{ label: "Nodes", value: "34" }, { label: "Edges", value: "80" }] },
      { type: "keyValue", pairs: [{ label: "Direction", value: "Undirected (file)", action: "Change..." }] },
      { type: "keyValue", pairs: [{ label: "Density", value: "0.143" }, { label: "Mean links", value: "4.7" }] },
      { type: "keyValue", pairs: [{ label: "Parts", value: "1" }, { label: "Weighted", value: "Yes" }] },
      { type: "disclosure", title: "Import report", summary: "read 80, kept 80" },
      { type: "emptyPlus", title: "Findings" },
      { type: "emptyPlus", title: "Notes" },
    ],
  },
  status: { counts: { nodes: 34, edges: 80 }, layout: "Spread out: settled", zoom: "100%" },
  caption: {
    title: "Screen 20: run a recipe on a new file.",
    text: "Next week's club-week-39.gml is open; File > Run a recipe... chose last week's karate-analysis. Before anything runs, every step is checked against the new data: three fit, step 4 names a column this file lacks and offers a mapping (weight is [strength]), step 5 names a node that is missing and will be skipped. Add to or replace what is in the tree, the total cost, Run. Inset: the Export recipe dialog that wrote the file: which objects, Steps or Styles only, Include layout.",
  },
};
