// Screen 79: an over-time result and the biggest movers (round-3/
// analysis-results.md, "Over-time results"). The Email network with the
// window on 2019-03 to 2019-05 (screen 10's state). The transport gear is
// open, scrolled to its bottom: OVER TIME now holds "Connections, 12 steps",
// and CHANGES is expanded to its per-month bar chart. The Table dock is open
// on Findings showing the series, one row per month, with the window's months
// highlighted, under a line chart of the series with the window shaded.
// Monthly figures are invented, shaped to screen 10's two change peaks
// (April and September).

import { NODES, DEGREE, COMMUNITIES } from "../email.mjs";
import { OKABE_8, OTHER } from "../palettes.mjs";

const groupColor = (g) => OKABE_8[g - 1] || OTHER;
const byId = {};
for (const [g, members] of Object.entries(COMMUNITIES)) for (const id of members) byId[id] = { fill: groupColor(Number(g)) };
const month = (m) => (m - 1) / 11;
const MONTHS = ["2019-01", "2019-02", "2019-03", "2019-04", "2019-05", "2019-06", "2019-07", "2019-08", "2019-09", "2019-10", "2019-11", "2019-12"];
const ACTIVE = [380, 391, 402, 455, 412, 398, 350, 372, 470, 440, 410, 390];
const MEAN = [3.1, 3.2, 3.3, 4.1, 3.6, 3.4, 2.9, 3.0, 4.4, 3.9, 3.5, 3.3];
const CHANGED = [0, 40, 38, 160, 70, 44, 60, 52, 175, 66, 48, 41]; // edges that appear or vanish at each step
const MOVER = ["-", "node 88", "node 12", "node 301", "node 301", "node 17", "node 240", "node 88", "node 5", "node 5", "node 77", "node 12"];
const rows = MONTHS.map((m, i) => [m, String(ACTIVE[i]), MEAN[i].toFixed(1), i ? `${CHANGED[i]}` : "-", MOVER[i], "Go to this time"]);

export default {
  id: 79,
  title: "An over-time result and the biggest movers",
  theme: "light",
  file: "Email network",
  left: {
    views: { rows: [{ name: "Overview", current: true }] },
    objects: { rows: [
      { kind: "dataset", name: "Email network", nodes: 1204, edges: 5830, locked: true, chip: { type: "locked" }, expanded: true, children: [
        { kind: "measure", name: "Connections (Degree)", values: 412, chip: { type: "size" } },
        { kind: "grouping", name: "Communities (Louvain)", groups: 9, expanded: false, chip: { type: "strip", colors: OKABE_8 } },
      ] },
    ] },
  },
  canvas: {
    graph: "email",
    nodes: { default: {}, byId, sizeBy: { values: DEGREE, from: 0.6, to: 2.0 } },
    edges: { default: { width: 1 } },
    overlays: {
      transport: {
        window: "2019-03 to 2019-05", playing: false, speed: "1x", from: "2019-01", to: "2019-12",
        ticks: MONTHS.map((_, i) => month(i + 1)), changes: [month(4), month(9)], band: [month(3), month(5)],
        counts: ["412 of 1,204 nodes", "1,910 of 5,830 edges"], gearPressed: true,
      },
      popover: {
        title: "Time", right: 12, bottom: 8, caret: "bottom", caretAt: 200,
        rows: [
          { type: "text", text: "Time attribute, window, mode, step: above" },
          { type: "disclosure", title: "Changes", summary: "per month", open: true },
          { type: "histogram", bars: CHANGED.map((c) => c / Math.max(...CHANGED)), scale: "linear" },
          { type: "keyValue", pairs: [{ label: "Peak", value: "2019-09, 175 edges", action: "Go to", wide: true }] },
          { type: "section", title: "Over time", plus: true },
          { type: "keyValue", pairs: [{ label: "Connections", value: "12 steps", action: "Open in table", wide: true }] },
        ],
      },
      dock: {
        open: true, tab: "Table", height: 300,
        chart: { type: "line", title: "Mean connections per month; the window shaded", labels: MONTHS.map((m) => m.slice(5)), series: [{ values: MEAN, color: "var(--k-bg-brand)", hiLabel: "4.4", loLabel: "2.9" }], window: [2, 4], height: 92 },
        table: {
          tabs: [{ label: "Nodes 1,204" }, { label: "Edges 5,830" }, { label: "Findings 1", selected: true }],
          showing: "Over time: Connections, 12 steps",
          columns: [
            { label: "Month", width: "88px", sorted: true },
            { label: "Active nodes", width: "104px" },
            { label: "Mean connections", width: "136px" },
            { label: "Edges changed", width: "112px" },
            { label: "Biggest mover", width: "112px" },
            { label: "", width: "1fr" },
          ],
          rows: rows.slice(1, 6).map((r) => [...r.slice(0, 5), { buttons: ["Go to this time"] }]),
          selectedRow: 2,
          scrolled: 0.15,
        },
      },
    },
  },
  toolbar: { active: "select", mode: "2D" },
  inspector: {
    kind: "Dataset", name: "Email network",
    actions: [{ icon: "plus", title: "Add data" }, { icon: "more" }],
    chip: { type: "locked" }, summary: "email.csv, CSV",
    reading: "1,204 people joined by 5,830 emails over 12 months, in 3 parts.",
    tabs: ["Overview", "Layout", "Canvas", "Data"], tab: "Overview",
    rows: [
      { type: "keyValue", pairs: [{ label: "Nodes", value: "1,204" }, { label: "Edges", value: "5,830" }] },
      { type: "keyValue", pairs: [{ label: "Density", value: "0.008" }, { label: "Mean links", value: "9.7" }] },
      { type: "keyValue", pairs: [{ label: "Parts", value: "3" }, { label: "Weighted", value: "No" }] },
      { type: "section", title: "Findings", count: "1", plus: true },
      { type: "keyValue", pairs: [{ label: "Over time", value: "Connections, 12 steps", wide: true }] },
      { type: "section", title: "Biggest movers", count: "2019-03 to 05" },
      { type: "table", columns: ["1fr", "56px", "56px"], head: ["Node", "Before", "After"], rows: [["node 301", "4", "31"], ["node 12", "22", "6"], ["node 88", "3", "17"]] },
      { type: "button", buttons: [{ label: "Make a Measure" }] },
      { type: "section", title: "Notes", plus: true },
    ],
  },
  status: { counts: { nodes: 1204, edges: 5830 }, mask: { text: "2019-03 to 2019-05: 412 of 1,204" }, layout: "Spread out: settled", zoom: "100%" },
  caption: {
    title: "Screen 79: an over-time result and the biggest movers.",
    text: "The window is on March to May. Look at: the transport gear open and scrolled to its end: CHANGES expanded to a bar per month (edges that appear or vanish) with its peak and \"Go to\", and OVER TIME holding the Connections series with \"Open in table\" (its \"+\" lists every Measure and Grouping with its cost times the number of steps); the Table dock on its Findings tab with one row per month (active nodes, mean connections, edges changed, the node that moved most, \"Go to this time\"), the window's April row highlighted; the Dataset's FINDINGS row for the series and its BIGGEST MOVERS list for the current window with \"Make a Measure\" (a Measure of each node's change, which paints like any other). One home for the chart: the dock's Findings tab draws the series as a line with the window shaded above the rows; the gear only starts it.",
  },
};
