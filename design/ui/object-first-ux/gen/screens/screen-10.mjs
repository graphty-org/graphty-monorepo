// Screen 10: the timeline. A temporal dataset ("Email network") with a time
// window as the mask, the transport bar under the canvas, its gear popover
// open, and the Dataset inspector on its Data tab (round-2/screens.md). The
// canvas is email.mjs: the 412 nodes and 1,910 edges inside the window,
// coloured by the nine whole-year communities (Okabe-Ito's eight, the ninth
// grey as Other), sized by in-window connections, the 58 busiest outlined.
import { NODES, DEGREE, COMMUNITIES } from "../email.mjs";
import { OKABE_8, OTHER } from "../palettes.mjs";

const groupColor = (g) => OKABE_8[g - 1] || OTHER;
const byId = {};
for (const [g, members] of Object.entries(COMMUNITIES)) for (const id of members) byId[id] = { fill: groupColor(Number(g)) };
// "Active senders": the 58 nodes with the most in-window connections.
const busiest = NODES.map((x) => x.id).sort((a, b) => DEGREE[b] - DEGREE[a]).slice(0, 58);
for (const id of busiest) byId[id].outline = { color: "ink", width: 2 };

// 12 monthly ticks, 2019-01 at 0 and 2019-12 at 1; the window is Mar to May.
const month = (m) => (m - 1) / 11;
const TICKS = Array.from({ length: 12 }, (_, i) => month(i + 1));
const SIZES = Object.fromEntries(Object.entries(COMMUNITIES).map(([g, ids]) => [g, ids.length]));

export default {
  id: 10,
  title: "The timeline: a time window, the transport bar and its gear",
  theme: "light",
  file: "Email network",
  left: {
    views: { rows: [{ name: "Overview", current: true }] },
    objects: { rows: [
      { kind: "dataset", name: "Email network", nodes: 1204, edges: 5830, locked: true, chip: { type: "locked" }, expanded: true, children: [
        { kind: "set", name: "Active senders", nodes: 58, chip: { type: "ring", color: "ink" } },
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
      legend: { blocks: [
        { title: "Communities", note: "computed on 2019-01 to 2019-12", rows: [
          ...[1, 2, 3, 4, 5, 6, 7, 8].map((g) => ({ chip: { type: "swatch", color: groupColor(g) }, label: `Group ${g}`, count: String(SIZES[g]) })),
          { more: "and 1 more" },
        ] },
        { title: "Connections", size: { from: "1", to: "37" } },
      ] },
      transport: {
        window: "2019-03 to 2019-05", playing: false, speed: "1x",
        from: "2019-01", to: "2019-12",
        ticks: TICKS, changes: [month(4), month(9)], band: [month(3), month(5)],
        counts: ["412 of 1,204 nodes", "1,910 of 5,830 edges"], gearPressed: true,
      },
      // The gear sits 52 px from the bar's right edge (8 padding, 24 close, 8
      // gap, half the 24 px gear); the popover opens upward from it.
      popover: {
        title: "Time", right: 12, bottom: 8, caret: "bottom", caretAt: 200,
        rows: [
          { type: "select", label: "Time attribute", value: "sent", note: "edges", wideLabel: true },
          { type: "select", label: "Nodes by", value: "none", wideLabel: true },
          { type: "select", label: "Unit", value: "Month", wideLabel: true },
          { type: "number", fields: [{ caption: "Window from", value: "2019-03" }, { caption: "to", value: "2019-05" }] },
          { type: "segmented", label: "Mode", options: ["Sliding", "Cumulative"], value: "Sliding" },
          { type: "select", label: "Step", value: "1 month", wideLabel: true },
          { type: "switch", label: "Re-run objects while playing", on: true, wide: true, caption: "cheap objects only; Communities (about 4 s) keeps its values" },
          { type: "switch", label: "Re-run layout per step", on: false, wide: true },
          { type: "disclosure", title: "Changes", summary: "12 steps; peaks Apr, Sep" },
          { type: "section", title: "Over time", plus: true },
        ],
      },
      dock: { open: false },
    },
  },
  toolbar: { active: "select", mode: "2D" },
  inspector: {
    kind: "Dataset", name: "Email network",
    actions: [{ icon: "plus", title: "Add data" }, { icon: "more" }],
    chip: { type: "locked" }, summary: "email.csv, CSV",
    reading: "1,204 people joined by 5,830 emails over 12 months, in 3 parts.",
    tabs: ["Overview", "Layout", "Canvas", "Data"], tab: "Data",
    framing: "100%",
    rows: [
      { type: "section", title: "Attributes", plus: true },
      { type: "attribute", dtype: "text", name: "from", filled: "100%" },
      { type: "attribute", dtype: "text", name: "to", filled: "100%" },
      { type: "attribute", dtype: "time", name: "sent", filled: "100%", role: "time" },
      { type: "attribute", dtype: "text", name: "subject", filled: "94%" },
      { type: "attribute", dtype: "number", name: "size", filled: "100%" },
      { type: "select", label: "Time", value: "sent" },
      { type: "disclosure", title: "Made by", summary: "email.csv, 3 fetches" },
    ],
  },
  status: {
    counts: { nodes: 1204, edges: 5830 },
    mask: { text: "2019-03 to 2019-05: 412 of 1,204" },
    layout: "Spread out: settled",
    zoom: "100%",
  },
  caption: {
    title: "Screen 10 of 15: the timeline, a time window as the mask.",
    text: "Email network, window 2019-03 to 2019-05, paused: the 412 in-window nodes and 1,910 edges drawn, coloured by the whole-year communities, sized by in-window connections, the 58 busiest outlined. Look at: the transport bar under the canvas (window text, step and play, speed, the month-ticked slider with the translucent brand band and its handles, the two change marks at Apr and Sep, the in-window counts, the pressed gear); its popover with the time settings that used to be a fifth tab (the two long switch labels on full-width rows, the caption under the first); the Data tab's attribute rows with sent carrying the filled time glyph; the status bar's window mask. The legend (with its \"computed on\" caveat) is hidden while the popover is open.",
  },
};
