// Screen 75: choosing what part of the graph a run covers (round-3/
// analysis-results.md, "Run on a Set or the selection"). Karate Club. An
// earlier run, Connections scoped to Group 2, paints only Group 2's eleven
// members (the rest keep their plain grey: no Focus, nothing hidden); its
// Record tab says so. Rank is armed again and the scope select "on [Group 2]"
// in the secondary bar is open above the bar. The within-group connection
// counts are computed from karate.mjs.

import { EDGES, COMMUNITIES } from "../karate.mjs";
import { OKABE_4, VIRIDIS } from "../palettes.mjs";

const G2 = new Set(COMMUNITIES[2]);
const inside = {};
for (const id of G2) inside[id] = 0;
for (const [a, b] of EDGES) if (G2.has(a) && G2.has(b)) { inside[a]++; inside[b]++; }
const lo = Math.min(...Object.values(inside)), hi = Math.max(...Object.values(inside));
const top = [...G2].sort((a, b) => inside[b] - inside[a])[0];
const rampChip = { type: "ramp", colors: VIRIDIS };

export default {
  id: 75,
  title: "Choosing what part of the graph a run covers",
  theme: "light",
  file: "Karate Club",
  left: {
    views: { rows: [{ name: "Overview", current: true }] },
    objects: { rows: [
      { kind: "dataset", name: "Karate Club", nodes: 34, edges: 78, locked: true, chip: { type: "locked" }, expanded: true, children: [
        { kind: "measure", name: "Connections (Group 2)", tech: "Degree, within Group 2", values: 11, chip: rampChip, selected: true },
        { kind: "set", name: "Degree > 8", nodes: 5, chip: { type: "ring", color: "ink" }, eye: false },
        { kind: "grouping", name: "Communities (Louvain)", groups: 4, eye: false, expanded: true, chip: { type: "strip", colors: OKABE_4 }, children:
          [1, 2, 3, 4].map((g) => ({ kind: "group", name: `Group ${g}`, members: COMMUNITIES[g].length, chip: { type: "swatch", color: OKABE_4[g - 1] } })) },
      ] },
    ] },
  },
  canvas: {
    nodes: { default: {}, colorBy: { values: inside, colors: VIRIDIS }, byId: Object.fromEntries(Object.keys(COMMUNITIES).filter((g) => g !== "2").flatMap((g) => COMMUNITIES[g].map((id) => [id, { fill: "var(--k-canvas-node)" }]))) },
    edges: { default: { width: 1 } },
    labels: [top],
    overlays: {
      popover: {
        title: "Run on", left: 150, bottom: 128, caret: "bottom", caretAt: 228,
        rows: [
          { type: "table", columns: ["1fr", "64px"], rows: [
            ["Everything", "34 nodes"],
            ["What is showing", "34"],
            ["The selection", "none"],
            ["Degree > 8", "5"],
            ["Group 1", "12"],
            ["Group 2", "11"],
            ["Group 3", "6"],
            ["Group 4", "5"],
          ], selected: 5 },
          { type: "note", text: "Runs inside these nodes only; nothing outside is hidden or painted." },
        ],
      },
      dock: { open: false },
    },
  },
  toolbar: {
    active: "select", armed: "rank", mode: "2D",
    faces: { rank: "Bridges" },
    secondary: { tool: "rank", variant: "Bridges", scope: "Group 2", scopeSelect: true, count: "11", cost: "instant" },
  },
  inspector: {
    kind: "Measure", name: "Connections (Group 2)", tech: "Degree, within Group 2",
    chip: rampChip, summary: "11 values, within Group 2",
    reading: `Node ${top} has the most links inside Group 2.`,
    tabs: ["Values", "Define", "Style", "Record"], tab: "Record",
    rows: [
      { type: "section", title: "Made by" },
      { type: "keyValue", pairs: [{ label: "Method", value: "Connections (Degree)", wide: true }] },
      { type: "keyValue", pairs: [{ label: "Scope", value: "Within Group 2, 11 nodes", wide: true }] },
      { type: "note", text: "Counts only edges between members of Group 2. Nodes outside it have no value and are not painted." },
      { type: "keyValue", pairs: [{ label: "Engine", value: "algorithms 2.0.1, CPU", wide: true }] },
      { type: "keyValue", pairs: [{ label: "Time", value: "1 ms", wide: true }] },
      { type: "disclosure", title: "Caveats", summary: "none" },
      { type: "button", buttons: [{ label: "Copy methods" }, { label: "Copy command" }] },
      { type: "select", label: "Export", value: "Ranked list, CSV" },
      { type: "section", title: "Notes", plus: true },
    ],
  },
  status: { counts: { nodes: 34, edges: 78 }, layout: "Spread out: settled", tool: "Rank: Bridges", zoom: "100%" },
  caption: {
    title: "Screen 75: choosing what part of the graph a run covers.",
    text: `Look at: the secondary bar reading "Rank by [Bridges] on Group 2, 11 nodes, instant", its scope list open above it (Everything, What is showing, The selection, then every Set and Group with its size, Group 2 chosen); the earlier run "Connections (Group 2)" in the tree, painting only Group 2's eleven members from ${lo} to ${hi} links inside the group while every other node keeps its plain grey (no Focus, nothing hidden, "34 nodes 78 edges" still showing); its Record tab with "Scope: Within Group 2, 11 nodes" and a sentence saying what that means. The name says the scope until renamed.`,
  },
};
