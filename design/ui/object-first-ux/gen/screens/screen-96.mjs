// Screen 96: the Export sheet's Data tab, on screen 3's state with Group 2's
// members focused (the mask: 11 of 34 showing) so the two scopes differ. The
// Format select is open: the formats the element can write (through
// graph-io's exporters), each saying what it can hold. A row the chosen
// format cannot hold is drawn disabled with the reason.
import { KARATE, menuItems } from "./screen-83.mjs";
import { EXPORT_SHEET } from "./screen-95.mjs";
import { COMMUNITIES, EDGES } from "../karate.mjs";

const IN = new Set(COMMUNITIES[2]);
const inside = EDGES.filter(([a, b]) => IN.has(a) && IN.has(b)).length;
const byId = {};
for (const [id, v] of Object.entries(KARATE.canvas.nodes.byId)) if (IN.has(Number(id))) byId[id] = v; else byId[id] = { ...v, outline: undefined, opacity: 0 };
const byPair = {};
for (const [a, b] of EDGES) if (!IN.has(a) || !IN.has(b)) byPair[`${Math.min(a, b)}-${Math.max(a, b)}`] = { opacity: 0 };

export default {
  id: 96,
  title: "Export data",
  theme: "light",
  ...KARATE,
  canvas: {
    ...KARATE.canvas,
    nodes: { ...KARATE.canvas.nodes, byId },
    edges: { default: { width: 1 }, byPair },
    labels: [1, 3, 2],
    overlays: { ...KARATE.canvas.overlays },
  },
  menus: [{
    anchor: { inspectorRow: 0, side: "left", align: "start", dx: -8, dy: -8 },
    width: 256,
    rows: menuItems([
        { label: "GraphML", note: "columns, positions", chosen: true },
        { label: "GEXF", note: "columns, time" },
        { label: "GML", note: "columns" },
        { label: "JSON", note: "columns, positions" },
        { label: "CSV, two files", note: "nodes and edges" },
        { label: "DOT", note: "labels only" },
        { label: "Pajek", note: "no columns" },
        "-",
        { head: "The project file keeps everything: Ctrl+S" },
      ]),
  }],
  inspector: {
    ...EXPORT_SHEET, name: "Data", tab: "Data", footer: [{ label: "Export", primary: true }], footerNote: "about 6 KB",
    summary: `11 nodes  ${inside} edges, about 6 KB`,
    reading: "What is showing: Group 2's members and the edges among them.",
    rows: [
      { type: "select", label: "Format", value: "GraphML" },
      { type: "segmented", label: "Scope", options: ["Everything", "Showing"], value: "Showing" },
      { type: "keyValue", pairs: [{ label: "Everything", value: "34 nodes  78 edges", secondary: true, wide: true }] },
      { type: "switch", label: "Include positions", on: true, wide: true },
      { type: "switch", label: "Include object columns", on: true, wide: true },
      { type: "checkbox", items: [{ label: "Degree > 8", checked: true }, { label: "Connections", checked: true }] },
      { type: "checkbox", items: [{ label: "Communities", checked: true }] },
      { type: "link", text: "Include styles  (GraphML cannot hold them)", secondary: true, chevron: false },
      { type: "note", text: "An object column is one value per node: Connections as a number, Communities as the group's name, Degree > 8 as true or false." },
    ],
  },
  status: { counts: { nodes: 34, edges: 78 }, mask: { text: "Focused on Group 2: 11 of 34", exit: true }, layout: "Spread out: settled", zoom: "100%" },
  caption: {
    title: "Screen 96: export data.",
    text: `Export > "Export data..." opened the sheet on its Data tab. Look at: the Format list open, only formats the element can write, each saying what it holds (GraphML columns and positions; DOT labels only; Pajek no columns), and the reminder that the project file keeps everything; Scope [Everything | Showing] with the other scope's counts under it; Include positions; Include object columns with one tick per object in tree order; "Include styles" disabled with the reason, because GraphML has no place for them; the summary row with the counts and the size of the file (11 nodes  ${inside} edges, about 6 KB); one Export button in the sheet's footer. Picking Pajek greys the object columns with "Pajek holds no columns: pick CSV".`,
  },
};
