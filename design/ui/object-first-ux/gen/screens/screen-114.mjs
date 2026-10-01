// Screen 114: the Time button, the visible way into time mode
// (round-4/revision-round-4.md section 5). Email network just loaded, with
// no objects yet and no time role set: the toolbar shows the Time button
// (clock, not pressed) because graphty-element reports a time-typed column,
// and its tooltip is open. The Dataset's Overview carries the other door, the
// finding "Time column: sent ... [Show over time]", which is drawn only while
// a time column has no role. An inset shows the second state of the button:
// with two time columns and no role it has a chevron and a menu. Pressing it
// (or Show over time) leads to screen 10.
//
// The drawing is email.mjs, which holds only the in-window slice (412 nodes);
// the counts are the whole file's.

export default {
  id: 114,
  title: "The Time button: the visible way into time mode",
  theme: "light",
  file: "Email network",
  left: {
    objects: { rows: [
      { kind: "dataset", name: "Email network", nodes: 1204, edges: 5830, locked: true, chip: { type: "locked" }, expanded: true, children: [
        { kind: "suggestion", name: "Find groups", key: "G", icon: "group" },
        { kind: "suggestion", name: "Rank by connections", key: "R", icon: "rank" },
        { kind: "suggestion", name: "Find a path", key: "P", icon: "path" },
      ] },
    ] },
  },
  canvas: {
    graph: "email",
    nodes: { default: {} },
    edges: { default: { width: 1 } },
    overlays: { dock: { open: false } },
  },
  toolbar: {
    active: "select", mode: "2D",
    time: { on: false, say: "play the data over sent (2019-01 to 2019-12)" },
    tip: "time",
  },
  // The second state: another file with two time columns and no role. The
  // button gains a chevron; its menu asks which column to play over.
  menus: [{
    tag: "Another file, two time columns and no role: Time gets a chevron and this menu",
    left: 256, top: 40, width: 232,
    rows: [
      { heading: "Play over" },
      { label: "sent", note: "2019-01 to 2019-12", highlighted: true },
      { label: "received", note: "2019-01 to 2020-01" },
      { divider: true },
      { label: "Columns and roles" },
    ],
  }],
  inspector: {
    kind: "Dataset", name: "Email network",
    actions: [{ icon: "plus", title: "Add data" }, { icon: "more" }],
    chip: { type: "locked" }, summary: "email.csv, CSV",
    reading: "1,204 people joined by 5,830 emails over 12 months, in 3 parts.",
    tabs: ["Overview", "Layout"], tab: "Overview",
    framing: "100%",
    rows: [
      { type: "keyValue", pairs: [{ label: "Nodes", value: "1,204" }, { label: "Edges", value: "5,830" }] },
      { type: "keyValue", pairs: [{ label: "Direction", value: "Directed (file)", action: "Change..." }] },
      { type: "keyValue", pairs: [{ label: "Density", value: "0.004" }, { label: "Mean links", value: "9.7" }] },
      { type: "keyValue", pairs: [{ label: "Parts", value: "3" }, { label: "Weighted", value: "No" }] },
      { type: "disclosure", title: "Import report", summary: "12 rejected" },
      { type: "link", text: "Columns and roles", chevron: true },
      { type: "link", text: "Look and labels", chevron: true },
      { type: "section", title: "Findings", count: "1", plus: true },
      { type: "keyValue", pairs: [{ label: "Time column", value: "sent, 2019-01 to 2019-12", wide: true }] },
      { type: "button", buttons: [{ label: "Show over time" }] },
      { type: "emptyPlus", title: "Notes" },
    ],
  },
  status: {
    counts: { nodes: 1204, edges: 5830 },
    layout: "Spread out: settled",
    zoom: "100%",
  },
  caption: {
    title: "Screen 114: the Time button, the visible way into time mode.",
    text: "Email network, just loaded, no time role set. Look at: the clock before Actions on the toolbar, drawn only because the data has a time column, with its tooltip naming the column and range; the Dataset's Findings row \"Time column\" with Show over time, the same action from the inspector; the menu (another file, two time columns) that asks which column to play over. Pressing Time or Show over time sets sent as the time role, sets the window to the whole year and shows the transport bar: screen 10. Static data never shows the button.",
  },
};
