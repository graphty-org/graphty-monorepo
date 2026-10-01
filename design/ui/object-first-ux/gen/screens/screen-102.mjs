// Screen 102: rename in place and drag to reorder (round-3/history-errors.md,
// "The object menu: rename, duplicate, delete, reorder"). Karate Club with
// the objects of screen 44. Two moments drawn on one tree: F2 on the Path
// 12 -> 30 row turned its name into a field with the text selected; and the
// Set "Degree > 10" is being dragged above "Hubs in Group 1": the dragged
// row is ghosted and a brand insertion line marks where it will land. Order
// is paint order: the row on top paints last and wins.
import { COMMUNITIES, DEGREE } from "../karate.mjs";
import { OKABE_4, HIGHLIGHT } from "../palettes.mjs";

const byId = {};
for (const [g, ids] of Object.entries(COMMUNITIES)) for (const id of ids) byId[id] = { fill: OKABE_4[g - 1] };
for (const id of Object.keys(DEGREE)) if (DEGREE[id] > 10) byId[id] = { ...byId[id], outline: { color: "ink", width: 2 } };

const magentaChip = { type: "line", color: HIGHLIGHT.magenta, width: 5 };
const purpleChip = { type: "line", color: HIGHLIGHT.purple, width: 3, dash: "3 2" };
const MAGENTA = { stroke: HIGHLIGHT.magenta, width: 5, arrow: true };
const PURPLE = { stroke: HIGHLIGHT.purple, width: 3, dash: "6 4" };

export default {
  id: 102,
  title: "Rename in place and drag to reorder",
  theme: "light",
  file: "Karate Club",
  fileState: { unsaved: true },
  left: {
    views: { rows: [{ name: "Overview", current: true }] },
    objects: { rows: [
      { kind: "dataset", name: "Karate Club", nodes: 34, edges: 78, locked: true, chip: { type: "locked" }, expanded: true, children: [
        { kind: "set", name: "Hubs in Group 1", nodes: 2, chip: { type: "swatch", color: HIGHLIGHT.magenta }, insertBefore: true },
        { kind: "path", name: "Path: 1 -> 34", edges: 4, chip: magentaChip },
        { kind: "path", name: "Path: 12 -> 30", edges: 5, chip: purpleChip, selected: true, rename: true },
        { kind: "set", name: "Degree > 10", nodes: 3, chip: { type: "ring", color: "ink" }, dragging: true },
        { kind: "grouping", name: "Communities (Louvain)", groups: 4, expanded: false, chip: { type: "strip", colors: OKABE_4 } },
      ] },
    ] },
  },
  canvas: {
    nodes: { default: {}, byId },
    edges: { default: { width: 1 }, byPair: { "1-2": MAGENTA, "2-3": MAGENTA, "33-34": MAGENTA, "1-12": PURPLE, "1-3": PURPLE, "3-33": PURPLE, "24-33": PURPLE, "24-30": PURPLE } },
    labels: [1, 33, 34, 12, 30],
    overlays: { dock: { open: false } },
  },
  toolbar: { active: "select", mode: "2D" },
  inspector: {
    kind: "Set", name: "Path: 12 -> 30", sub: "Shortest route",
    chip: purpleChip, summary: { nodes: 6, edges: 5 },
    reading: "The shortest route from 12 to 30 has 5 hops.",
    tabs: ["Define", "Members", "Style", "Record"], tab: "Define",
    rows: [
      { type: "keyValue", pairs: [{ label: "From", value: "12" }, { label: "To", value: "30" }] },
      { type: "keyValue", pairs: [{ label: "Weights", value: "none", wide: true }] },
      { type: "note", text: "The name is a label only: renaming changes nothing the object computes. Enter keeps the new name, Esc restores the old one, and the rename is one undo step." },
    ],
  },
  status: { counts: { nodes: 34, edges: 78 }, layout: "Spread out: settled", tool: "Drag: above Hubs in Group 1", selection: "6 selected", zoom: "100%" },
  caption: {
    title: "Screen 102: rename in place and drag to reorder.",
    text: "Two moments on one tree. F2 (or a double-click on the name, or Rename in the row's menu, screen 44) turned Path: 12 -> 30's name into a field with the text selected; Enter keeps, Esc restores, one undo step. Degree > 10 is being dragged: the row is ghosted and the brand insertion line above Hubs in Group 1 is where it will land; the status bar says so. Order is paint order (the top row paints last and wins), so a drag can change the picture; Ctrl+] and Ctrl+[ move the selected row without the mouse. A row cannot be dragged out of its Dataset, and Groups keep their Grouping's order.",
  },
};
