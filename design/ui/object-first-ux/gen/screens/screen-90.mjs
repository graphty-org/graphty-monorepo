// Screen 90: a signed value on a diverging palette centred on a midpoint.
// Karate Club with a formula Measure "Bridges per link", the log2 of a node's
// share of betweenness over its share of connections: above 0 a node bridges
// more than its links suggest, below 0 less. The values are computed here
// from karate.mjs (-4.85 to +1.51); the 12 nodes with no betweenness have no
// finite log and are drawn grey as missing. Symmetric is off, so each side
// stretches to its own end (-4.85 is full blue, +1.51 full red) and 0 is the
// white centre.
import { NODES, DEGREE, BETWEENNESS } from "../karate.mjs";
import { OTHER } from "../palettes.mjs";
import { rampAt } from "../render.mjs";
import { KARATE } from "./screen-83.mjs";

const mean = (o) => Object.values(o).reduce((a, b) => a + b, 0) / NODES.length;
const mb = mean(BETWEENNESS), md = mean(DEGREE);
const VAL = {};
for (const { id } of NODES) VAL[id] = BETWEENNESS[id] > 0 ? Math.log2((BETWEENNESS[id] / mb) / (DEGREE[id] / md)) : null;
const vals = Object.values(VAL).filter((v) => v != null);
const lo = Math.min(...vals), hi = Math.max(...vals);
const missing = Object.values(VAL).filter((v) => v == null).length;

const RED_BLUE = ["#2166ac", "#67a9cf", "#d1e5f0", "#f7f7f7", "#fddbc7", "#ef8a62", "#b2182b"];
const PURPLE_GREEN = ["#762a83", "#af8dc3", "#e7d4e8", "#f7f7f7", "#d9f0d3", "#7fbf7b", "#1b7837"];
const BLUE_ORANGE = ["#2166ac", "#92c5de", "#f7f7f7", "#fdb863", "#e66101"];
const byId = {};
for (const { id } of NODES) byId[id] = VAL[id] == null ? { fill: OTHER } : { fill: rampAt(RED_BLUE, VAL[id] < 0 ? 0.5 - 0.5 * (VAL[id] / lo) : 0.5 + 0.5 * (VAL[id] / hi)), outline: { color: "#8c8c8c", width: 0.5 } };
const f = (v) => (v > 0 ? "+" : "") + v.toFixed(2);
const chip = { type: "ramp", colors: RED_BLUE };

const [root] = KARATE.left.objects.rows;
const tree = [{ ...root, children: [
  { kind: "measure", name: "Bridges per link (formula)", values: 34 - missing, chip, selected: true },
  { kind: "measure", name: "Bridges (Betweenness)", values: 34, chip: { type: "size", faded: true } },
  { kind: "grouping", name: "Communities (Louvain)", groups: 4, expanded: false, chip: { type: "strip", colors: ["#e69f00", "#56b4e9", "#009e73", "#cc79a7"], faded: true } },
] }];

export default {
  id: 90,
  title: "A diverging palette centred on a midpoint",
  theme: "light",
  file: "Karate Club",
  left: { views: KARATE.left.views, objects: { rows: tree } },
  canvas: {
    nodes: { byId, sizeBy: "degree" },
    edges: { default: { width: 1 } },
    labels: [1, 34, 32, 3, 5, 11],
    overlays: {
      // The palette picker, open beside the Palette row (296 px down the frame); a
      // click applies at once and the picker stays open to compare.
      popover: {
        title: "Palette", anchor: { inspectorRow: 3, side: "left", align: "start", dx: -8, dy: -40 }, caret: "right", keepLegend: true,
        rows: [
          { type: "text", text: "Diverging: two sides of a midpoint" },
          { type: "legend", label: "Red-blue", colors: RED_BLUE, from: "chosen", to: "" },
          { type: "legend", label: "Purple-grn", colors: PURPLE_GREEN, from: "", to: "" },
          { type: "legend", label: "Blue-orng", colors: BLUE_ORANGE, from: "", to: "" },
          { type: "disclosure", title: "Sequential", summary: "7: Viridis, Plasma, ..." },
          { type: "disclosure", title: "Categorical", summary: "for groups, not numbers" },
          { type: "disclosure", title: "Highlight", summary: "for Sets" },
          { type: "link", text: "Add palette..." },
        ],
      },
      legend: { blocks: [{ title: "Bridges per link", note: `grey: no value (${missing})`, ramp: { colors: RED_BLUE, from: f(lo), to: f(hi), mid: "0" } }] },
      dock: { open: false },
    },
  },
  toolbar: { active: "select", mode: "2D" },
  inspector: {
    kind: "Measure", name: "Bridges per link (formula)", sub: "log2(Bridges / Connections)",
    chip, summary: `${34 - missing} values, ${missing} missing`,
    reading: "Node 1 bridges far more than its links suggest; 5 and 11 far less.",
    tabs: ["Values", "Define", "Style", "Record"], tab: "Style",
    rows: [
      { type: "section", title: "Nodes", plus: true },
      { type: "block", label: "Colour", chip, open: true },
      { type: "select", label: "Scale", value: "Even steps" },
      { type: "select", label: "Palette", value: "Red-blue", ramp: RED_BLUE },
      { type: "number", label: "Midpoint", fields: [{ value: "0" }] },
      { type: "checkbox", items: [{ label: "Symmetric", checked: false }, { label: "Reverse", checked: false }], button: "Reset" },
      { type: "number", fields: [{ caption: "Values from", value: f(lo) }, { caption: "to", value: f(hi) }] },
      { type: "swatchHex", label: "Missing", color: OTHER, value: `${missing} nodes` },
      { type: "legend", label: "Legend", colors: RED_BLUE, from: f(lo), to: f(hi) },
      { type: "block", label: "Size", summary: "from Connections", open: false },
      { type: "section", title: "Edges", plus: true },
    ],
  },
  status: { counts: { nodes: 34, edges: 78 }, layout: "Spread out: settled", zoom: "100%" },
  caption: {
    title: "Screen 90: a signed value on a diverging palette centred on a midpoint.",
    text: `A formula Measure, the log2 of each node's share of betweenness over its share of connections: ${f(lo)} to ${f(hi)}. Look at: the palette picker open beside the Palette row, grouped by kind with Diverging first because the values cross zero (Sequential, Categorical and Highlight folded; categorical is not offered for numbers); choosing Red-blue added the Midpoint row [0] and Symmetric (off here: each side stretches to its own end, so ${f(lo)} is full blue and ${f(hi)} full red; on, one scale serves both sides and ${f(hi)} would be a pale red); the ${missing} nodes with no betweenness grey as Missing; the legend's ramp with a mark and \"0\" where the midpoint sits, kept on screen while the picker is open because the picker is anchored to the panel. Node 1 is the deepest red: it bridges most for its links.`,
  },
};
