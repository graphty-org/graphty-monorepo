// Screen 3: the tree after two runs and a filter, Group 2 selected, its Style
// tab (round-2/screens.md). The canvas paint is derived from karate.mjs so the
// member lists are never typed twice. Outlines and the Set's ring chip are
// "ink" (the theme's outline colour), so screen 12 is this spec in the dark
// theme.

import { COMMUNITIES, DEGREE } from "../karate.mjs";
import { OKABE_4, OVERRIDE } from "../palettes.mjs";

// Group 2's inherited colour is OKABE_4[1] (sky blue), overridden to vermillion.
const GROUP_COLOR = (g) => (g === 2 ? OVERRIDE : OKABE_4[g - 1]);
const OUTLINE = { color: "ink", width: 2 }; // the "Degree > 8" Set's style

const byId = {};
for (const [g, members] of Object.entries(COMMUNITIES)) {
  for (const id of members) byId[id] = { fill: GROUP_COLOR(Number(g)), halo: g === "2" };
}
for (const id of Object.keys(DEGREE)) {
  if (DEGREE[id] > 8) byId[id] = { ...byId[id], outline: OUTLINE };
}

export const STATE = {
  file: "Karate Club",
  left: {
    views: { rows: [{ name: "Overview", current: true }] },
    objects: { rows: [
      { kind: "dataset", name: "Karate Club", nodes: 34, edges: 78, locked: true, chip: { type: "locked" }, expanded: true, children: [
        { kind: "set", name: "Degree > 8", nodes: 5, chip: { type: "ring", color: "ink" } },
        { kind: "measure", name: "Connections (Degree)", values: 34, chip: { type: "size" } },
        { kind: "grouping", name: "Communities (Louvain)", groups: 4, chip: { type: "strip", colors: [1, 2, 3, 4].map(GROUP_COLOR) }, expanded: true, children: [
          { kind: "group", name: "Group 1", members: 12, chip: { type: "swatch", color: GROUP_COLOR(1) } },
          { kind: "group", name: "Group 2", members: 11, chip: { type: "swatch", color: GROUP_COLOR(2), override: true }, selected: true },
          { kind: "group", name: "Group 3", members: 6, chip: { type: "swatch", color: GROUP_COLOR(3) } },
          { kind: "group", name: "Group 4", members: 5, chip: { type: "swatch", color: GROUP_COLOR(4) } },
        ] },
      ] },
    ] },
  },
  canvas: {
    nodes: { sizeBy: "degree", byId },
    edges: { default: { width: 1 } },
    labels: [34, 1, 33, 3, 2, 9], // the label budget "Top 6 by Connections"
    overlays: {
      legend: { blocks: [
        { title: "Communities", rows: [
          { chip: { type: "swatch", color: GROUP_COLOR(1) }, label: "Group 1", count: "12" },
          { chip: { type: "swatch", color: GROUP_COLOR(2) }, label: "Group 2", count: "11" },
          { chip: { type: "swatch", color: GROUP_COLOR(3) }, label: "Group 3", count: "6" },
          { chip: { type: "swatch", color: GROUP_COLOR(4) }, label: "Group 4", count: "5" },
        ] },
        { title: "Connections", size: { from: "1", to: "17" } },
      ] },
      dock: { open: false },
    },
  },
  toolbar: { active: "select", mode: "2D" },
  inspector: {
    kind: "Group", name: "Group 2",
    actions: [{ icon: "eye", on: true }, { icon: "unlock", on: false }, { icon: "more", title: "Select members, Focus on this, Locate" }],
    chip: { type: "swatch", color: OVERRIDE, override: true }, summary: "11 nodes, 32% of the scope",
    reading: "Group 2 of 4 in Communities.",
    tabs: ["Define", "Members", "Style", "Record"], tab: "Style",
    framing: "100%",
    rows: [
      { type: "section", title: "Nodes", plus: true },
      { type: "swatchHex", label: "Colour", color: OVERRIDE, hex: "D55E00", opacity: "100", override: true, actions: ["eye", "minus"] },
      { type: "swatchHex", label: "Colour", color: OKABE_4[1], inherited: "Communities", lock: true },
      { type: "section", title: "Edges", plus: true },
      { type: "keyValue", pairs: [{ label: "Inside edges", value: "20", secondary: true, wide: true }] },
      { type: "text", text: "Covered by nothing" },
    ],
  },
  status: { counts: { nodes: 34, edges: 78 }, layout: "Spread out: settled", selection: "11 selected", zoom: "100%" },
};

export default {
  id: 3,
  title: "Group 2 selected, its Style tab",
  theme: "light",
  ...STATE,
  caption: {
    title: "Screen 3 of 15: the tree after two runs and a filter, Group 2 selected, its Style tab.",
    text: "Look at: three objects under the root (a Set with a ring chip, a Measure with a size chip, a Grouping with a four-colour strip) and the Grouping's four Group rows; Group 2 selected with its override dot (the eye and the lock appear on hover and in the inspector header); its eleven members orange with the gold halo, sizes by degree, the five high-degree nodes outlined, six labels; the legend's two blocks; the Style tab's override row above the inherited row (\"From Communities\"), the EDGES section, and \"Covered by nothing\"; \"11 selected\" in the status bar.",
  },
};
