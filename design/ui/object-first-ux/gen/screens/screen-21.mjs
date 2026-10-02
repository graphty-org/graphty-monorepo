// Screen 21: two datasets in one session (round-3/file-project.md, "Two
// graphs in one session"). A pathway measured in two conditions: tumor
// (loaded first) and normal (File > Open as a second graph..., nodes matched
// by gene_id). Both Dataset roots are selected, so the inspector compares
// them and offers Union, Intersection and Difference; the canvas previews the
// union with every edge painted by where it comes from. The drawing is
// Karate Club's and the values are plausible, not computed. The legend keys
// the three edge kinds; the import choice that made the second root is the
// inset. tumor is the active root (the graph on the canvas), marked by the
// brand bar at its left.
import { EDGES } from "../karate.mjs";

const TUMOR_ONLY = "#e69f00", NORMAL_ONLY = "#0072b2";
const byPair = {};
EDGES.forEach(([a, b], i) => {
  const key = `${Math.min(a, b)}-${Math.max(a, b)}`;
  if (i % 5 === 2) byPair[key] = { stroke: TUMOR_ONLY, width: 2 };
  else if (i % 9 === 4) byPair[key] = { stroke: NORMAL_ONLY, width: 2, dash: "5 3" };
});
const tumorOnly = Object.values(byPair).filter((e) => e.stroke === TUMOR_ONLY).length;
const normalOnly = Object.values(byPair).length - tumorOnly;
const both = EDGES.length - tumorOnly - normalOnly;

export default {
  id: 21,
  title: "Two datasets in one session",
  theme: "light",
  file: "tumor, normal",
  fileState: { unsaved: true },
  left: {
    views: { rows: [{ name: "Overview", current: true }] },
    objects: { rows: [
      { kind: "dataset", name: "tumor", nodes: 34, edges: both + tumorOnly, locked: true, chip: { type: "locked" }, selected: true, active: true, expanded: true, children: [
        { kind: "measure", name: "Connections (Degree)", values: 34, chip: { type: "size" } },
      ] },
      { kind: "dataset", name: "normal", nodes: 32, edges: both + normalOnly, locked: true, chip: { type: "locked" }, selected: true, expanded: false },
    ] },
  },
  canvas: {
    nodes: { default: {}, byId: { 17: { outline: { color: TUMOR_ONLY, width: 2 } }, 12: { outline: { color: TUMOR_ONLY, width: 2 } } } },
    edges: { default: { width: 1 }, byPair },
    overlays: {
      dock: { open: false },
      legend: { blocks: [{ title: "Edges", rows: [
        { line: { color: "#b3b3b3", width: 1 }, label: "in both", count: String(both) },
        { line: { color: TUMOR_ONLY, width: 2 }, label: "tumor only", count: String(tumorOnly) },
        { line: { color: NORMAL_ONLY, width: 2, dash: "5 3" }, label: "normal only", count: String(normalOnly) },
      ] }, { title: "Nodes", rows: [{ chip: { type: "ring", color: TUMOR_ONLY }, label: "tumor only", count: "2" }] }] },
    },
  },
  insets: [{
    tag: "Before: File > Open as a second graph...", left: 256, top: 56, width: 248,
    title: "Open normal.csv",
    rows: [
      { type: "note", text: "Or a drop on the loaded graph with Into: Open beside to compare." },
      { type: "select", label: "Open as", value: "A second graph" },
      { type: "select", label: "Match by", value: "gene_id" },
      { type: "text", text: "32 of 34 tumor nodes match", secondary: false },
      { type: "text", text: "0 nodes only in normal" },
    ],
    footer: [{ label: "Cancel" }, { label: "Open", primary: true }],
  }],
  toolbar: { active: "select", mode: "2D" },
  inspector: {
    kind: "2 graphs", name: "tumor and normal",
    actions: [{ icon: "more", title: "Rename, Close one" }],
    summary: `matched by gene_id: 32 of 34 nodes`,
    reading: `${both} edges in both, ${tumorOnly} only in tumor, ${normalOnly} only in normal`,
    tabs: ["Compare"], tab: "Compare",
    rows: [
      { type: "table", columns: ["1fr", "56px", "56px"], head: ["", "tumor", "normal"], rows: [
        ["Nodes", "34", "32"], ["Edges", String(both + tumorOnly), String(both + normalOnly)], ["Density", "0.130", "0.127"], ["Parts", "1", "2"], ["Mean links", "4.3", "3.9"],
      ] },
      { type: "section", title: "Edges on the canvas" },
      { type: "swatchHex", label: "Both", color: "#b3b3b3", value: `${both}` },
      { type: "swatchHex", label: "tumor only", color: TUMOR_ONLY, value: `${tumorOnly}` },
      { type: "swatchHex", label: "normal only", color: NORMAL_ONLY, value: `${normalOnly}, dashed` },
      { type: "section", title: "Combine into a new graph" },
      { type: "button", buttons: [{ label: "Union" }, { label: "Intersection" }, { label: "tumor - normal" }, { label: "normal - tumor" }] },
      { type: "switch", label: "Compare side by side", on: false, wide: true },
    ],
  },
  status: { counts: { nodes: 34, edges: EDGES.length }, selection: "2 graphs selected", layout: "Spread out: settled", zoom: "100%" },
  caption: {
    title: "Screen 21: two datasets in one session.",
    text: "tumor was loaded, then normal.csv opened as a second graph matched by gene_id (inset). Look at: two Dataset roots in the tree, each with its own objects, tumor marked as the one on the canvas (the brand bar); both selected; the inspector's side-by-side statistics; the canvas previewing the union with edges in both grey, tumor-only orange and normal-only blue dashed, the two tumor-only genes outlined, the legend keying all three; Union, Intersection and the two Differences (tumor - normal, normal - tumor) each add a third root made from the two; Compare side by side opens the second canvas. Clicking one root makes it the graph on the canvas.",
  },
};
