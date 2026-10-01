// Screen 106: the Styles panel (round-4/revision-round-4.md section 2.5) on
// Karate Club in screen 3's state with nothing selected. The panel is the
// whole-graph look, the paint order (every object that paints, top wins, a
// channel lost to a higher row struck through), labels, the legend, the
// library and the style files. A Bridges Measure has been run and holds a
// colour ramp, but Communities above it colours every node, so its Colour is
// struck (and its chip faded). Insets: the tooltip that explains the struck word, and the
// Library's Palettes list.
//
// Exports what screens 110 and 111 share: STYLES (the left panel), SHOT
// (the karate state with the Styles rail item active), DATASET2 (the
// Dataset's inspector with its two round-4 tabs).
import { KARATE } from "./screen-83.mjs";
import { OKABE_4, OVERRIDE, VIRIDIS, TOL_MUTED, OTHER } from "../palettes.mjs";

const GROUP_STRIP = [OKABE_4[0], OVERRIDE, OKABE_4[2], OKABE_4[3]];

// The Styles panel's rows. `focus` lets a screen press one of the file
// buttons (focus ring) to show which one opened its dialog.
export const stylesRows = ({ look = "Default", focus } = {}) => [
  { type: "section", title: "Look" },
  { type: "select", label: "Look", value: look },
  { type: "swatchHex", label: "Background", color: "#f5f5f5", value: "Follow theme" },
  { type: "swatchHex", label: "Nodes", color: OTHER, value: "6 px circle" },
  { type: "swatchHex", label: "Edges", color: "#c4c4c4", value: "1 px line" },
  { type: "section", title: "Paint order", count: "top wins" },
  { type: "paintOrder", kind: "set", name: "Degree > 8", channels: ["Outline"], chip: { type: "ring", color: "ink" } },
  { type: "paintOrder", kind: "grouping", name: "Communities", channels: ["Colour"], chip: { type: "strip", colors: GROUP_STRIP } },
  { type: "paintOrder", kind: "measure", name: "Connections", channels: ["Size"], chip: { type: "size" } },
  { type: "paintOrder", kind: "measure", name: "Bridges", channels: [{ name: "Colour", lost: true }], chip: { type: "ramp", colors: VIRIDIS, faded: true } },
  { type: "paintOrder", kind: "dataset", name: "Dataset defaults", channels: ["All"], locked: true, chip: { type: "locked" } },
  { type: "section", title: "Labels" },
  { type: "select", label: "Labels", value: "Top 6 by Connections", gear: true },
  { type: "select", label: "Tooltip", value: "Label and 3 values" },
  { type: "section", title: "Legend" },
  { type: "switch", label: "Legend", on: true, second: { label: "Sets", on: true } },
  { type: "select", label: "Position", value: "Bottom right" },
  { type: "disclosure", title: "Canvas", summary: "note markers" },
  { type: "disclosure", title: "Library", summary: "styles, looks, palettes" },
  { type: "section", title: "Files" },
  { type: "button", label: "", wrap: true, buttons: [
    { label: "Import styles...", focus: focus === "import" },
    { label: "Export styles...", focus: focus === "export" },
  ] },
];

export const STYLES = (o) => ({ panel: "styles", views: KARATE.left.views, objects: KARATE.left.objects, styles: { rows: stylesRows(o), plusOpen: o?.plusOpen } });

export const DATASET2 = {
  kind: "Dataset", name: "Karate Club",
  actions: [{ icon: "plus", title: "Add data" }, { icon: "more" }],
  chip: { type: "locked" }, summary: "karate.gml, GML",
  reading: "34 nodes joined by 78 edges in one connected part",
  tabs: ["Overview", "Layout"], tab: "Overview",
  framing: "100%",
  rows: [
    { type: "keyValue", pairs: [{ label: "Nodes", value: "34" }, { label: "Edges", value: "78" }] },
    { type: "keyValue", pairs: [{ label: "Direction", value: "Undirected (file)", action: "Change..." }] },
    { type: "keyValue", pairs: [{ label: "Density", value: "0.139" }, { label: "Mean links", value: "4.6" }] },
    { type: "keyValue", pairs: [{ label: "Parts", value: "1" }, { label: "Weighted", value: "No" }] },
    { type: "link", text: "Columns and roles" },
    { type: "link", text: "Look and labels" },
    { type: "emptyPlus", title: "Findings" },
    { type: "emptyPlus", title: "Notes" },
  ],
};

export const SHOT = {
  file: "Karate Club",
  rail: {},
  canvas: KARATE.canvas,
  toolbar: KARATE.toolbar,
  inspector: DATASET2,
  status: { counts: { nodes: 34, edges: 78 }, layout: "Spread out: settled", zoom: "100%" },
};

export default {
  id: 106,
  title: "The Styles panel",
  theme: "light",
  ...SHOT,
  left: STYLES(),
  tooltips: [{
    lines: ["Colour: covered by Communities on all 34 nodes", "Drag Bridges above Communities to show it"],
    anchor: { row: "Bridges", side: "right", align: "center", dx: 8 },
  }],
  insets: [{
    tag: "Library > Palettes (20)", left: 256, top: 470, width: 280,
    title: "Palettes",
    rows: [
      { type: "table", columns: ["120px", "1fr"], head: ["Palette", "Used by"], rows: [
        [{ chip: { type: "strip", colors: OKABE_4 } , text: "Okabe-Ito" }, "Communities"],
        [{ chip: { type: "ramp", colors: VIRIDIS }, text: "Viridis" }, "Bridges"],
        [{ chip: { type: "strip", colors: TOL_MUTED.slice(0, 5) }, text: "Nine soft colours" }, { text: "nothing", secondary: true }],
      ] },
      { type: "link", text: "17 more built in" },
      { type: "note", text: "Apply from any colour row's palette picker; rename or delete your own here." },
    ],
  }],
  caption: {
    title: "Screen 106: the Styles panel.",
    text: "Styles (Alt+3) is the active rail item. Look at: LOOK (the Look select, background, the default node and edge); PAINT ORDER, the tree's objects by what they paint, top wins: Bridges' Colour is struck and its chip faded because Communities above it colours every node (the tooltip says so and how to fix it; dragging a row moves it in the tree too), Dataset defaults locked at the bottom; LABELS; LEGEND (switch, key L; Sets; position); Canvas and Library folded; FILES: Import styles... and Export styles.... Inset: Library > Palettes, which object uses which. The title row's \"+\" is Save current look... (screen 111).",
  },
};
