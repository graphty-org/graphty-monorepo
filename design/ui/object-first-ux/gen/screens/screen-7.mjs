// Screen 7: a Grouping selected, the group palette with one override
// (round-2/screens.md), on College football. "Conference" groups by the
// `value` attribute: 12 groups named by the raw value ("Names from" is
// none), sizes from football.mjs (13, 12, 12, 11, 10, 10, 10, 9, 8, 8, 7,
// 5). The palette is the element's "Nine Soft Colours" (tol-muted, capacity
// 9) and "Show the largest" is 8, so the four smallest conferences (1, 7,
// 10, 5: 28 teams) fall to Other; conference 4 (Conference USA, 10 teams) is
// overridden to vermillion and carries the dot in the tree, the legend and
// the Style tab.
import { CONF_IDS, CONF_SIZE, CONF_OF, DATASET_ROW } from "../football-state.mjs";
import { TOL_MUTED, OVERRIDE, OTHER } from "../palettes.mjs";

const ORDER = [...CONF_IDS].sort((a, b) => CONF_SIZE[b] - CONF_SIZE[a] || a - b); // by size, then value
const SHOWN = ORDER.slice(0, 8), REST = ORDER.slice(8);
const OVERRIDDEN = 4;
const colorOf = {};
SHOWN.forEach((v, i) => { colorOf[v] = v === OVERRIDDEN ? OVERRIDE : TOL_MUTED[i]; });
for (const v of REST) colorOf[v] = OTHER;
const chip = (v) => ({ type: "swatch", color: colorOf[v], override: v === OVERRIDDEN });
const restCount = REST.reduce((t, v) => t + CONF_SIZE[v], 0);

const byId = {};
for (const [id, v] of Object.entries(CONF_OF)) byId[id] = { fill: colorOf[v] };

const strip = { type: "strip", colors: SHOWN.map((v) => colorOf[v]) };

export default {
  id: 7,
  title: "A Grouping selected, the group palette with one override",
  theme: "light",
  file: "College football",
  left: {
    views: { rows: [{ name: "Overview", current: true }] },
    objects: { rows: [
      { ...DATASET_ROW, children: [
        { kind: "grouping", name: "Conference", groups: 12, chip: strip, selected: true, expanded: true, children: [
          ...SHOWN.map((v) => ({ kind: "group", name: String(v), members: CONF_SIZE[v], chip: chip(v) })),
          { kind: "more", name: "Other", tech: "4 more", members: restCount, chip: { type: "swatch", color: OTHER } },
        ] },
      ] },
    ] },
  },
  canvas: {
    graph: "football",
    nodes: { default: {}, byId },
    edges: { default: { width: 1 } },
    overlays: {
      legend: { blocks: [
        { title: "Conference", rows: [
          ...SHOWN.map((v) => ({ chip: chip(v), label: String(v), count: CONF_SIZE[v] })),
          { chip: { type: "swatch", color: OTHER }, label: "Other (4 more)", count: restCount },
        ] },
      ] },
      dock: { open: false },
    },
  },
  toolbar: { active: "select", mode: "2D" },
  inspector: {
    kind: "Grouping", name: "Conference",
    chip: strip, summary: "12 groups",
    reading: "12 conferences; the largest has 13 teams.",
    tabs: ["Groups", "Define", "Style", "Record"], tab: "Style",
    framing: "100%",
    rows: [
      { type: "section", title: "Nodes", plus: true },
      { type: "block", label: "Colour", chip: strip, open: true },
      { type: "select", label: "Palette", value: "Nine Soft Colours", strip: TOL_MUTED, note: "9 colours" },
      ...SHOWN.slice(0, 5).map((v) => ({ type: "groupSwatch", name: String(v), count: CONF_SIZE[v], color: colorOf[v], override: v === OVERRIDDEN })),
      { type: "text", text: "and 3 more" },
      { type: "swatchHex", label: "Other", color: OTHER },
      { type: "select", label: "Overflow", value: "Other" },
      { type: "select", label: "Largest", value: "8", note: "rest as Other" },
      { type: "section", title: "Edges", plus: true },
    ],
  },
  status: { counts: { nodes: 115, edges: 613 }, layout: "Spread out: settled", zoom: "100%" },
  caption: {
    title: "Screen 7 of 15: a Grouping selected, the group palette with one override.",
    text: "College football grouped by conference: 12 groups named by the raw value. Look at: the Grouping row selected with eight Group rows and one collapsed \"Other\" row under it (the legend says \"Other (4 more)\", one spelling of the overflow); conference 4 overridden to D55E00 with the override dot on its tree chip, its legend swatch and its Style row; the four smallest conferences grey because \"Show the largest\" is 8; the Style tab's Colour block with the palette select showing the nine soft colours themselves, five swatch rows led by their chits, \"and 3 more\", Other, Overflow and \"Largest 8, rest as Other\" on the same 68 px label grid as every other row, then an empty EDGES section; Select active.",
  },
};
