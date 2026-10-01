// Screen 38: a new column from a formula (round-3/data-editing.md, "New
// column from a formula"). Karate Club with three results: Connections
// (Degree), Bridges (Betweenness) and Communities (Louvain). The reader
// pressed the Data tab's ATTRIBUTES "+" > New from formula... and typed a
// combined score of the two Measures. The preview is computed here from the
// baked karate values so the numbers are the real ones.
import { DEGREE, BETWEENNESS, COMMUNITIES } from "../karate.mjs";
import { OKABE_4 } from "../palettes.mjs";

const maxD = Math.max(...Object.values(DEGREE));
const maxB = Math.max(...Object.values(BETWEENNESS));
const score = (id) => DEGREE[id] / maxD + BETWEENNESS[id] / maxB;
const top = Object.keys(DEGREE).map(Number).sort((a, b) => score(b) - score(a)).slice(0, 5);
const f2 = (v) => v.toFixed(2), f3 = (v) => v.toFixed(3);

const byId = {};
for (const [g, ids] of Object.entries(COMMUNITIES)) for (const id of ids) byId[id] = { fill: OKABE_4[Number(g) - 1] };

export default {
  id: 38,
  title: "New column from a formula",
  theme: "light",
  file: "Karate Club",
  left: {
    views: { rows: [{ name: "Overview", current: true }] },
    objects: { rows: [
      { kind: "dataset", name: "Karate Club", nodes: 34, edges: 78, locked: true, chip: { type: "locked" }, expanded: true, children: [
        { kind: "measure", name: "Connections (Degree)", values: 34, chip: { type: "size" } },
        { kind: "measure", name: "Bridges (Betweenness)", values: 34 },
        { kind: "grouping", name: "Communities (Louvain)", groups: 4, expanded: false, chip: { type: "strip", colors: OKABE_4 } },
      ] },
    ] },
  },
  canvas: {
    nodes: { sizeBy: "degree", byId },
    edges: { default: { width: 1 } },
    overlays: {
      dock: { open: false },
      dialog: {
        title: "New column from a formula",
        rows: [
          { type: "field", label: "Name", value: "hub score" },
          { type: "segmented", label: "On", options: ["Nodes", "Edges"], value: "Nodes" },
          { type: "textarea", label: "Formula", mono: true, lines: ["norm([Connections]) + norm([Bridges])"], caret: true, rows: 2 },
          { type: "chips", title: "Insert", chips: [
            { chip: { type: "size" }, label: "Connections" },
            { chip: { type: "ramp", colors: ["#e8e8e8", "#1e1e1e"] }, label: "Bridges" },
            { chip: { type: "strip", colors: OKABE_4 }, label: "Communities" },
          ] },
          { type: "text", text: "Functions: norm, rank, log, abs, min, max, if. Columns: id, club." },
          { type: "table", columns: ["0.6fr", "1fr", "1fr", "1fr"], head: ["node", "Connections", "Bridges", "hub score"],
            rows: top.map((id) => [String(id), String(DEGREE[id]), f3(BETWEENNESS[id]), f2(score(id))]) },
          { type: "text", text: "Every node has both inputs; a missing input gives an empty value." },
          { type: "text", text: "Adds a number column; it re-computes when Connections or Bridges re-run." },
        ],
        footer: [{ label: "Cancel" }, { label: "Create", primary: true }],
      },
    },
  },
  insets: [{
    tag: "While typing: a name that does not exist", left: 256, top: 40, width: 264,
    title: "New column from a formula",
    rows: [
      { type: "textarea", mono: true, lines: ["norm([Connections]) + norm([Bridge"], caret: true, rows: 2, error: { line: 0, from: 27, to: 34, text: "No column or result is called Bridge." },
        suggest: [{ label: "[Bridges]", note: "Measure", highlighted: true }, { label: "[Bridges per link]", note: "formula" }] },
      { type: "text", text: "The preview keeps the last valid formula." },
    ],
    footer: [{ label: "Cancel" }, { label: "Create", primary: true, disabled: true }],
  }],
  toolbar: { active: "select", mode: "2D" },
  inspector: {
    kind: "Dataset", name: "Karate Club",
    actions: [{ icon: "plus", title: "Add data" }, { icon: "more" }],
    chip: { type: "locked" }, summary: "karate.gml, GML",
    reading: "34 nodes joined by 78 edges in one connected part",
    tabs: ["Overview", "Layout", "Canvas", "Data"], tab: "Data",
    rows: [
      { type: "section", title: "Attributes", plus: true },
      { type: "text", text: "On nodes" },
      { type: "attribute", dtype: "text", name: "id", filled: "100%" },
      { type: "attribute", dtype: "text", name: "club", filled: "100%" },
      { type: "disclosure", title: "Made by", summary: "karate.gml, GML" },
    ],
  },
  status: { counts: { nodes: 34, edges: 78 }, layout: "Spread out: settled", zoom: "100%" },
  caption: {
    title: "Screen 38: a new column from a formula.",
    text: `Karate Club with three results; Data > ATTRIBUTES "+" > New from formula.... Look at: the name, Nodes or Edges, the formula in a code field, names in brackets, the results and columns as chips that insert their name, the function list, a five-row live preview (the top five by the new score; node 34 scores ${f2(score(34))}), the missing-input rule and that the column follows its inputs (re-computed when either result re-runs); Create as the one filled button. Inset: the same field while typing a name that does not exist, underlined in red with the reason and the completion list; Create disabled. The new row lands in ATTRIBUTES with a formula glyph; its "..." has Size by, Colour by and the rest, so a hub-score Measure is one more click.`,
  },
};
