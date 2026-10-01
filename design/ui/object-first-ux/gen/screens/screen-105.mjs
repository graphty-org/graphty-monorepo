// Screen 105: the Data panel on a dataset loaded from a URL
// (round-4/revision-round-4.md section 2.4). College football, read from
// Mark Newman's network data page; nothing computed yet. The reader clicked
// the node column "value" (the team's conference number), which expanded in
// place: its type, how many distinct values, how many are missing, and a
// histogram of the values (the real conference sizes, 0 to 11). The reader
// then pressed the dataset's "..." (it shows on hover beside Reload), and
// its menu is open: Replace..., Reload, Import options..., Show source,
// Close dataset.
//
// ASSUMPTION the owner may correct: the owner's "data should ..." was cut
// off; this panel is the reading recorded in section 2.4.
import { CONF_IDS, CONF_SIZE } from "../football-state.mjs";
import { datasetInspector } from "../football-state.mjs";

const biggest = Math.max(...CONF_IDS.map((v) => CONF_SIZE[v]));
const ins = datasetInspector("Overview");

export default {
  id: 105,
  title: "The Data panel: a URL source, a column expanded, the dataset menu",
  theme: "light",
  file: "College football",
  left: {
    panel: "data",
    data: {
      rows: [
        { type: "section", title: "Datasets" },
        { type: "dataset", name: "College football", source: "umich.edu, fetched 09:15", nodes: 115, edges: 613, menuOpen: true },
        { type: "section", title: "Roles" },
        { type: "select", label: "Id", value: "id" },
        { type: "select", label: "Label", value: "label" },
        { type: "select", label: "Weight", value: "none" },
        { type: "select", label: "Time", value: "none" },
        { type: "select", label: "Type", value: "none" },
        { type: "section", title: "Attributes", plus: true },
        { type: "disclosure", title: "On nodes", summary: "2 columns", open: true },
        { type: "attribute", dtype: "text", name: "label", role: "label", complete: 100 },
        { type: "attribute", dtype: "number", name: "value", complete: 100, hover: true },
        { type: "keyValue", pairs: [{ label: "Type", value: "Number" }, { label: "Distinct", value: "12" }] },
        { type: "keyValue", pairs: [{ label: "Missing", value: "0" }, { label: "Range", value: "0 to 11" }] },
        { type: "histogram", bars: CONF_IDS.map((v) => CONF_SIZE[v] / biggest), scale: "linear", ends: ["0", "11"] },
        { type: "disclosure", title: "On edges", summary: "none" },
        { type: "section", title: "Import report" },
        { type: "keyValue", pairs: [{ label: "Kept", value: "613 of 613 edges", wide: true }] },
        { type: "emptyPlus", title: "Joins" },
      ],
      foot: [{ label: "Open table", key: "Shift+T" }],
    },
  },
  menus: [{
    anchor: { el: "datasetMore", side: "right", align: "start", dx: 8 },
    width: 200,
    rows: [
      { label: "Replace..." },
      { label: "Reload", highlighted: true },
      { label: "Import options..." },
      { label: "Show source" },
      { divider: true },
      { label: "Close dataset" },
    ],
  }],
  canvas: {
    graph: "football",
    nodes: { default: {} },
    edges: { default: { width: 1 } },
    overlays: { dock: { open: false } },
  },
  toolbar: { active: "select", mode: "2D" },
  inspector: {
    ...ins,
    summary: "football.gml, GML, from a URL",
    tabs: ["Overview", "Layout"],
    framing: "100%",
    rows: [
      ...ins.rows.filter((r) => r.type === "keyValue").map((r) => ({ ...r, pairs: r.pairs.map(({ action, ...p }) => (action ? { ...p, wide: true } : p)) })),
      { type: "link", text: "Columns and roles" },
      { type: "link", text: "Look and labels" },
      { type: "emptyPlus", title: "Findings" },
      { type: "emptyPlus", title: "Notes" },
    ],
  },
  status: { counts: { nodes: 115, edges: 613 }, layout: "Spread out: settled", zoom: "100%" },
  caption: {
    title: "Screen 105: the Data panel on a URL source, a column expanded, the dataset's menu open.",
    text: "College football read from a URL. ASSUMPTION the owner may correct: the cut-off \"data should ...\" is read as round-4 section 2.4. Look at: the source line naming the host and when it was fetched; Roles for a node-and-edge file (Id and Label); the column value expanded in place by a click (its type, 12 distinct values, none missing, its range, a histogram of the values); the dataset's \"...\" pressed with its dark menu beside it: Replace... (the Import dialog set to Replace), Reload (re-fetch, keeping objects, screen 15), Import options... (screen 34), Show source, Close dataset (asks first when there is unsaved work).",
  },
};
