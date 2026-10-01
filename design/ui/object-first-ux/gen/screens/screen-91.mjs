// Screen 91: edge width by an edge column. The Email network as on screen 10
// (the time window 2019-03 to 2019-05 as the mask, 1,910 edges showing). The
// reader opened the "size" column's menu in the table's Edges tab (the same
// menu as the column's "..." on the Data tab) and chose "Width by": a new edge
// Measure "size" landed in the tree, its Style tab has an EDGES > Width
// block, and every edge is drawn by its size. The sizes are invented but
// fixed (a hash of the edge's endpoints), 1 KB to 2,400 KB. The column's
// menu is drawn under its header, tagged as the moment before; the legend's
// width block keys the widths.
import { EDGES, DEGREE } from "../email.mjs";
import { menuItems } from "./screen-83.mjs";

const hash = (a, b) => { let h = (a * 73856093) ^ (b * 19349663); h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const byPair = {};
for (const [a, b] of EDGES) {
  const u = hash(Math.min(a, b), Math.max(a, b)) ** 2.2; // most emails small
  byPair[`${Math.min(a, b)}-${Math.max(a, b)}`] = { width: +(0.4 + 3.6 * u).toFixed(2) };
}
const lineChip = { type: "line", color: "#5a5a5a", width: 3 };

export default {
  id: 91,
  title: "Edge width by an edge column",
  theme: "light",
  file: "Email network",
  left: {
    views: { rows: [{ name: "Overview", current: true }] },
    objects: { rows: [
      { kind: "dataset", name: "Email network", nodes: 1204, edges: 5830, locked: true, chip: { type: "locked" }, expanded: true, children: [
        { kind: "measure", name: "size (edges)", values: 1910, chip: lineChip, selected: true },
        { kind: "measure", name: "Connections (Degree)", values: 412, chip: { type: "size" } },
      ] },
    ] },
  },
  canvas: {
    graph: "email",
    nodes: { default: {}, sizeBy: { values: DEGREE, from: 0.5, to: 1.6 } },
    edges: { default: { width: 1 }, byPair },
    overlays: {
      legend: { blocks: [{ title: "size (KB)", widths: [{ width: 0.6, label: "1" }, { width: 2, label: "50" }, { width: 4, label: "2,400" }] }] },
      dock: {
        open: true, tab: "Table", height: 256,
        table: {
          tabs: [{ label: "Nodes 412" }, { label: "Edges 1,910", selected: true }],
          showing: "What is showing",
          columns: [
            { label: "from", width: "88px" },
            { label: "to", width: "88px" },
            { label: "sent", width: "96px", sorted: true },
            { label: "size", width: "96px", chip: lineChip, menuOpen: true },
            { label: "subject", width: "1fr" },
          ],
          rows: [
            ["p0412", "p0077", "2019-03-01", "4", "Re: budget"],
            ["p0077", "p0412", "2019-03-01", "6", "Re: budget"],
            ["p1160", "p0003", "2019-03-02", "1,820", "Q1 deck (final)"],
            ["p0003", "p0980", "2019-03-02", "12", "Fwd: Kickoff"],
            ["p0412", "p0980", "2019-03-04", "2", ""],
          ],
          scrolled: 0,
        },
      },
    },
  },
  menus: [{
    tag: "A moment before: the size column's menu",
    anchor: { column: "size", side: "above", align: "start", dy: -4 },
    width: 220,
    rows: menuItems([
      { label: "Width by", chosen: true },
      { label: "Colour by" },
      { label: "Opacity by" },
      { label: "Label by" },
      { label: "Filter by..." },
      "-",
      { label: "Set as weight" },
      { label: "Set as time", disabled: true, reason: "not a date" },
      "-",
      { label: "Sort" },
      { label: "Hide column" },
    ]),
  }],
  toolbar: { active: "select", mode: "2D" },
  inspector: {
    kind: "Measure", name: "size", sub: "edge column, KB",
    chip: lineChip, summary: "1,910 values",
    reading: "Most emails are under 50 KB; 38 carry over 1 MB.",
    tabs: ["Values", "Define", "Style", "Record"], tab: "Style",
    rows: [
      { type: "section", title: "Nodes", plus: true },
      { type: "section", title: "Edges", plus: true },
      { type: "block", label: "Width", chip: lineChip, open: true },
      { type: "select", label: "Scale", value: "By order of magnitude" },
      { type: "number", fields: [{ caption: "Values from", value: "1" }, { caption: "to (KB)", value: "2,400" }] },
      { type: "number", fields: [{ caption: "Widths from", value: "0.4" }, { caption: "to (px)", value: "4" }] },
      { type: "keyValue", pairs: [{ label: "Missing", value: "1 px" }, { label: "Legend", value: "3 steps" }] },
      { type: "block", label: "Colour", summary: "not set", open: false },
    ],
  },
  status: { counts: { nodes: 1204, edges: 5830 }, mask: { text: "2019-03 to 2019-05: 412 of 1,204" }, layout: "Spread out: settled", zoom: "100%" },
  caption: {
    title: "Screen 91: edge width by an edge column.",
    text: "The table's Edges tab is open; the \"size\" column's menu is drawn over its header, tagged as the moment before, with \"Width by\" highlighted. Look at: the edge verbs (Width by, Colour by, Opacity by, Label by, Filter by, Set as weight; Set as time greyed with its reason); the result, a new edge Measure \"size\" in the tree with a line chip, also heading the table column; its Style tab with the NODES section empty and EDGES > Width open (scale by order of magnitude, values 1 to 2,400 KB, widths 0.4 to 4 px, the missing width, a three-step width legend) and Colour collapsed; every edge on the canvas drawn by its size. The legend card's width block keys three widths with their values.",
  },
};
