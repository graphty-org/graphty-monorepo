// Screen 44: the object menu and the one delete that confirms, on Karate Club
// (round-3/history-errors.md, "The object menu: rename, duplicate, delete,
// reorder").
// "Degree > 10" (nodes 1, 33 and 34) has two objects computed inside it
// (Communities and Bridges within those three nodes), and "Hubs in Group 1"
// is a Combine linked to it. The reader right-clicked the Degree > 10 row;
// the menu opened beside the row; the reader chose Delete..., and because
// children go with it the confirmation opened. The menu is drawn at full
// strength beside its row, tagged as the moment before; rename in place and
// drag to reorder are screen 102.
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
  id: 44,
  title: "Object menu and the delete that confirms",
  theme: "light",
  file: "Karate Club",
  left: {
    views: { rows: [{ name: "Overview", current: true }] },
    objects: { rows: [
      { kind: "dataset", name: "Karate Club", nodes: 34, edges: 78, locked: true, chip: { type: "locked" }, expanded: true, children: [
        { kind: "set", name: "Hubs in Group 1", nodes: 2, chip: { type: "swatch", color: HIGHLIGHT.magenta } },
        { kind: "path", name: "Path: 1 -> 34", edges: 4, chip: magentaChip },
        { kind: "path", name: "Path: 12 -> 30", edges: 5, chip: purpleChip },
        { kind: "set", name: "Degree > 10", nodes: 3, chip: { type: "ring", color: "ink" }, selected: true, expanded: true, children: [
          { kind: "grouping", name: "Communities (Louvain)", groups: 2, chip: { type: "strip", colors: [OKABE_4[0], OKABE_4[1]] }, expanded: false },
          { kind: "measure", name: "Bridges (Betweenness)", values: 3, chip: { type: "size", faded: true } },
        ] },
        { kind: "grouping", name: "Communities (Louvain)", groups: 4, expanded: false, chip: { type: "strip", colors: OKABE_4 } },
      ] },
    ] },
  },
  canvas: {
    nodes: { default: {}, byId },
    edges: { default: { width: 1 }, byPair: { "1-2": MAGENTA, "2-3": MAGENTA, "33-34": MAGENTA, "1-12": PURPLE, "1-3": PURPLE, "3-33": PURPLE, "24-33": PURPLE, "24-30": PURPLE } },
    labels: [1, 33, 34],
    overlays: {
      dialog: {
        title: "Delete Degree > 10?",
        size: "sm",
        rows: [
          { type: "note", text: "The 2 objects inside it go too: Communities and Bridges were computed within its 3 nodes." },
          { type: "note", text: "\"Hubs in Group 1\", linked to it, is frozen, not deleted: it keeps its 2 members." },
          { type: "text", text: "Ctrl+Z brings all three back." },
        ],
        footer: [{ label: "Cancel" }, { label: "Delete 3 objects", primary: true, danger: true }],
      },
      dock: { open: false },
    },
  },
  menus: [{
    tag: "A moment before: right-click on the row",
    anchor: { row: "Degree > 10", side: "right", align: "start", dx: -12, dy: -30 },
    width: 232,
    rows: [
      { label: "Rename", key: "F2" },
      { label: "Duplicate", key: "Ctrl+D" },
      { label: "Re-run" },
      { divider: true },
      { label: "Focus on this" },
      { label: "Select members" },
      { label: "Show in table" },
      { label: "Export..." },
      { divider: true },
      { label: "Move up", key: "Ctrl+]" },
      { label: "Move down", key: "Ctrl+[" },
      { divider: true },
      { label: "Delete...", key: "Del", danger: true, highlighted: true },
    ],
  }],
  toolbar: { active: "select", mode: "2D" },
  inspector: {
    kind: "Set", name: "Degree > 10",
    actions: [{ icon: "eye", on: true }, { icon: "unlock", on: false }, { icon: "more", title: "The same menu as a right-click on the row" }],
    chip: { type: "ring", color: "ink" }, summary: { nodes: 3, edges: 3 },
    reading: "3 nodes have more than 10 links; together they touch 30 of 34.",
    tabs: ["Define", "Members", "Style", "Record"], tab: "Define",
    framing: "100%",
    rows: [
      { type: "keyValue", pairs: [{ label: "Made by", value: "Filter by values", wide: true }] },
      { type: "keyValue", pairs: [{ label: "Rule", value: "Connections > 10", wide: true }] },
      { type: "keyValue", pairs: [{ label: "Within", value: "Everything", secondary: true, wide: true }] },
      { type: "section", title: "Inside it", count: "2" },
      { type: "text", text: "Communities, Bridges" },
      { type: "section", title: "Linked to it", count: "1" },
      { type: "text", text: "Hubs in Group 1 (Combine)" },
    ],
  },
  status: { counts: { nodes: 34, edges: 78 }, layout: "Spread out: settled", selection: "3 selected", zoom: "100%" },
  caption: {
    title: "Screen 44: the object menu, and the one delete that confirms.",
    text: "Right-click on the Degree > 10 row (or its inspector \"...\") opened the menu beside the row: Rename (F2, or double-click the name), Duplicate, Re-run, Focus on this, Select members, Show in table, Export..., Move up or down, Delete... last. Delete asks only because two objects live inside this Set; a leaf deletes at once with an Undo link in the status bar. Look at: the dark menu beside the row, Delete... last and red; the 320 px confirmation naming both children and the linked object that will be frozen rather than deleted, the red button that says the count, and Ctrl+Z as the net. A Group's menu has no Delete (hide it instead); the Dataset's has Close dataset. Rename in place and the drag insertion line are screen 102.",
  },
};
