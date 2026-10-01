// Screen 69: a Measure's Values tab (round-3/analysis-results.md, "Measure
// Values tab"). Influence (PageRank) on Karate Club, just run, so it opened
// on Values: the summary numbers, the histogram with a band dragged across
// its top end, the TOP list and its "+" menu open (the dark menu, anchored to
// the section's "+"). Every number is computed from karate.mjs's PAGERANK,
// never typed.

import { NODES, PAGERANK } from "../karate.mjs";
import { OKABE_4, VIRIDIS } from "../palettes.mjs";

const ids = NODES.map((x) => x.id);
const vals = ids.map((id) => PAGERANK[id]).sort((a, b) => a - b);
const f3 = (v) => v.toFixed(3);
const min = vals[0], max = vals[vals.length - 1];
const mean = vals.reduce((t, v) => t + v, 0) / vals.length;
const median = (vals[16] + vals[17]) / 2;
// 12 equal-width bins, heights relative to the tallest.
const BINS = 12, counts = Array(BINS).fill(0);
for (const v of vals) counts[Math.min(BINS - 1, Math.floor((v - min) / (max - min) * BINS))]++;
const bars = counts.map((c) => c / Math.max(...counts));
const ranked = [...ids].sort((a, b) => PAGERANK[b] - PAGERANK[a]);
const top5 = ranked.slice(0, 5);
const rampChip = { type: "ramp", colors: VIRIDIS };

export default {
  id: 69,
  title: "A Measure's Values tab",
  theme: "light",
  file: "Karate Club",
  left: {
    views: { rows: [{ name: "Overview", current: true }] },
    objects: { rows: [
      { kind: "dataset", name: "Karate Club", nodes: 34, edges: 78, locked: true, chip: { type: "locked" }, expanded: true, children: [
        { kind: "measure", name: "Influence (PageRank)", values: 34, chip: rampChip, selected: true },
        { kind: "grouping", name: "Communities (Louvain)", groups: 4, expanded: false, chip: { type: "strip", colors: OKABE_4, faded: true } },
      ] },
    ] },
  },
  canvas: {
    nodes: { default: {}, colorBy: { values: PAGERANK, colors: VIRIDIS }, sizeBy: { values: PAGERANK, from: 0.8, to: 2.2 }, byId: Object.fromEntries(ids.filter((id) => PAGERANK[id] >= min + 0.66 * (max - min)).map((id) => [id, { halo: true }])) },
    edges: { default: { width: 1 } },
    labels: top5,
    overlays: {
      legend: { blocks: [{ title: "Influence", ramp: { colors: VIRIDIS, from: f3(min), to: f3(max) }, size: { from: "0.8x", to: "2.2x" } }] },
      dock: { open: false },
    },
  },
  menus: [{
    anchor: { inspectorRow: 6, side: "left", align: "start", dx: -8, dy: -4 },
    width: 244,
    rows: [
      { heading: "Make a set from Influence" },
      { label: "Top N set...", highlighted: true },
      { label: "Above threshold set..." },
      { label: "Bottom N set..." },
      { label: "Set from the band" },
      { divider: true },
      { heading: "Linked: re-runs when Influence does" },
    ],
  }],
  toolbar: { active: "select", mode: "2D" },
  inspector: {
    kind: "Measure", name: "Influence (PageRank)",
    chip: rampChip, summary: "34 values",
    reading: "Node 34 has the most influence; the top three hold a third of it.",
    tabs: ["Values", "Define", "Style", "Record"], tab: "Values",
    rows: [
      { type: "select", label: "Field", value: "score", disabled: true },
      { type: "keyValue", pairs: [{ label: "Min", value: f3(min) }, { label: "Max", value: f3(max) }] },
      { type: "keyValue", pairs: [{ label: "Mean", value: f3(mean) }, { label: "Median", value: f3(median) }] },
      { type: "histogram", bars, scale: "linear", band: [0.66, 1], ends: [f3(min), f3(max)] },
      { type: "text", text: `Band ${f3(min + 0.66 * (max - min))} to ${f3(max)}: ${ids.filter((id) => PAGERANK[id] >= min + 0.66 * (max - min)).length} selected`, secondary: false },
      { type: "section", title: "Top", count: "10 v", plus: true },
      { type: "table", columns: ["24px", "1fr", "56px"], rows: top5.map((id, i) => [String(i + 1), `node ${id}`, f3(PAGERANK[id])]) },
      { type: "link", text: "See all 34 in table" },
    ],
  },
  status: { counts: { nodes: 34, edges: 78 }, layout: "Spread out: settled", zoom: "100%" },
  caption: {
    title: "Screen 69: a Measure's Values tab.",
    text: "Influence (PageRank) just ran, so it opened on Values. Look at: Field (greyed: PageRank publishes one field; Connections on directed data would offer total, in and out); Min and Max, Mean and Median; the 12-bin histogram with its lin/log switch and a band dragged across its top end, which selects those nodes and says how many; the TOP header with its count select and its \"+\" open as a dark menu: Top N, Above threshold, Bottom N and Set from the band, each making a linked Set; five ranked rows (a click selects the node) and \"See all 34 in table\".",
  },
};
