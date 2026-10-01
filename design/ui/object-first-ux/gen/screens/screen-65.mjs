// Screen 65: combining two Sets (round-3/filters-sets.md, "Combine Sets").
// Karate Club with the Path 12 -> 30 (the route of screen 8) and the Communities grouping.
// The reader Ctrl+clicked the Path row and the Group 2 row, so the inspector is the
// several-objects inspector: the four combine verbs with the size each result would have,
// the order rule for Subtract with Swap, Compare, Focus on these, the shared Style rows, and
// the bulk verbs. Both objects' members are haloed. Sizes are derived from karate.mjs.
import { COMMUNITIES } from "../karate.mjs";
import { OKABE_4, HIGHLIGHT } from "../palettes.mjs";

const PATH = [12, 1, 3, 33, 24, 30];
const G2 = COMMUNITIES[2];
const both = PATH.filter((x) => G2.includes(x));
const union = new Set([...PATH, ...G2]).size;
const pathMinus = PATH.filter((x) => !G2.includes(x)).length;
const groupMinus = G2.filter((x) => !PATH.includes(x)).length;

const P = HIGHLIGHT.purple;
const commOf = {};
for (const [g, m] of Object.entries(COMMUNITIES)) for (const id of m) commOf[id] = Number(g);
const byId = {};
for (const [id, g] of Object.entries(commOf)) byId[id] = { fill: OKABE_4[g - 1] };
for (const id of PATH) byId[id].outline = { color: P, width: 2 };
for (const id of new Set([...PATH, ...G2])) byId[id].halo = true;
const e = { stroke: P, width: 3, dash: "6 4" };
const byPair = { "1-12": e, "1-3": e, "3-33": e, "24-33": e, "24-30": e };

export default {
  id: 65,
  title: "Combining two Sets",
  theme: "light",
  file: "Karate Club",
  left: {
    views: { rows: [{ name: "Overview", current: true }] },
    objects: { rows: [
      { kind: "dataset", name: "Karate Club", nodes: 34, edges: 78, locked: true, chip: { type: "locked" }, expanded: true, children: [
        { kind: "path", name: "Path: 12 -> 30", edges: 5, chip: { type: "line", color: P, width: 3, dash: "3 2" }, selected: true },
        { kind: "grouping", name: "Communities (Louvain)", groups: 4, chip: { type: "strip", colors: OKABE_4 }, expanded: true, childSelected: true, children: [
          { kind: "group", name: "Group 1", members: 12, chip: { type: "swatch", color: OKABE_4[0] } },
          { kind: "group", name: "Group 2", members: 11, chip: { type: "swatch", color: OKABE_4[1] }, selected: true },
          { kind: "group", name: "Group 3", members: 6, chip: { type: "swatch", color: OKABE_4[2] } },
          { kind: "group", name: "Group 4", members: 5, chip: { type: "swatch", color: OKABE_4[3] } },
        ] },
      ] },
    ] },
  },
  canvas: {
    nodes: { byId },
    edges: { default: { width: 1 }, byPair },
    labels: PATH,
    overlays: { dock: { open: false } },
  },
  insets: [
    {
      tag: "After Intersect: the new linked Set", left: 256, top: 16, width: 248,
      title: "Set  Path and Group 2",
      rows: [
        { type: "keyValue", pairs: [{ label: "Tree", value: "Path and Group 2", note: `${both.length} nodes`, wide: true }] },
        { type: "keyValue", pairs: [{ label: "Made by", value: "Intersect, linked", wide: true }] },
        { type: "text", text: "Stale when either input changes" },
      ],
    },
    {
      tag: "With a Measure in the selection", left: 256, top: 196, width: 248,
      title: "3 objects",
      rows: [
        { type: "button", buttons: [{ label: "Union", disabled: true }, { label: "Intersect", disabled: true }, { label: "Subtract", disabled: true }] },
        { type: "text", text: "Combine needs Sets or Groups" },
      ],
    },
  ],
  toolbar: { active: "select", mode: "2D" },
  inspector: {
    kind: "Several objects", name: "2 objects",
    actions: [{ icon: "eye", on: true, title: "Hide all" }, { icon: "unlock", title: "Lock all" }, { icon: "more" }],
    summary: "Path: 12 -> 30 and Group 2",
    reading: `${both.length} nodes are in both (${both.join(", ")}).`,
    tabs: [],
    framing: "100%",
    rows: [
      { type: "section", title: "Combine" },
      { type: "table", columns: ["1fr", "80px", "60px"], head: ["Verb", "Key", "Result"], rows: [
        ["Union", "Ctrl+Alt+U", `${union} nodes`],
        ["Intersect", "Ctrl+Alt+I", `${both.length} nodes`],
        ["Subtract", "Ctrl+Alt+S", `${pathMinus} nodes`],
        ["Exclude", "Ctrl+Alt+X", `${pathMinus + groupMinus} nodes`],
      ], selected: 1 },
      { type: "keyValue", pairs: [{ label: "Subtract", value: "Path minus Group 2", action: "Swap" }] },
      { type: "note", text: "The result is a new linked Set above both rows; it turns stale when either input changes and frozen if one is deleted." },
      { type: "switch", label: "Compare", on: false, wide: true },
      { type: "button", buttons: [{ label: "Focus on these" }] },
      { type: "section", title: "Style" },
      { type: "swatchHex", label: "Outline", color: P, value: "Mixed" },
      { type: "button", buttons: [{ label: "Hide all", ghost: true }, { label: "Lock all", ghost: true }, { label: "Delete (2)", ghost: true }] },
    ],
  },
  status: { counts: { nodes: 34, edges: 78 }, layout: "Spread out: settled", selection: "2 objects", zoom: "100%" },
  caption: {
    title: "Screen 65: combining two Sets from the several-objects inspector.",
    text: `Look at: two tree rows selected with Ctrl+click (the Path and Group 2) and every member of both haloed; the inspector's one tab: COMBINE lists the four verbs with their keys and the size each result would have (Union ${union}, Intersect ${both.length}, Subtract ${pathMinus}, Exclude ${pathMinus + groupMinus}), so the reader picks by outcome; Subtract states its order in words ("Path minus Group 2") with Swap, rather than depending silently on row order; the note that the result is a linked Set; Compare, Focus on these, the shared Style row reading "Mixed", and Hide all, Lock all, Delete (2). Insets: the new linked Set after Intersect, and the verbs disabled with the reason when a Measure or a Grouping is in the selection.`,
  },
};
