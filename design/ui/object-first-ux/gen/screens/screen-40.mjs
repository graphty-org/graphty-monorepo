// Screen 40: remove nodes from the data (round-3/data-editing.md, "Remove
// from data"). Karate Club with Connections, Bridges and Communities. The
// reader drew a box around three nodes (the several-elements inspector
// shows them, with its two data verbs "Remove from data..." and "Merge into
// one node...") and pressed Delete. A confirmation names what goes (the
// nodes and their edges, drawn dashed on the canvas), which objects re-run at
// once and which turn stale, and offers Hide instead, the non-destructive
// verb the reader may have meant. Every count is computed from karate.mjs.
import { EDGES, COMMUNITIES } from "../karate.mjs";
import { OKABE_4 } from "../palettes.mjs";

const SEL = [6, 7, 17];
const gone = EDGES.filter(([a, b]) => SEL.includes(a) || SEL.includes(b));
const inside = gone.filter(([a, b]) => SEL.includes(a) && SEL.includes(b)).length;
const groupOf = {};
for (const [g, ids] of Object.entries(COMMUNITIES)) for (const id of ids) groupOf[id] = Number(g);
const groups = [...new Set(SEL.map((id) => groupOf[id]))].sort();

const byId = {};
for (const [g, ids] of Object.entries(COMMUNITIES)) for (const id of ids) byId[id] = { fill: OKABE_4[Number(g) - 1] };
for (const id of SEL) byId[id] = { ...byId[id], halo: true, label: true };
const byPair = {};
for (const [a, b] of gone) byPair[`${Math.min(a, b)}-${Math.max(a, b)}`] = { stroke: "#d55e00", width: 2, dash: "4 3" };

export default {
  id: 40,
  title: "Remove nodes from the data",
  theme: "light",
  file: "Karate Club",
  left: {
    views: { rows: [{ name: "Overview", current: true }] },
    objects: { rows: [
      { kind: "dataset", name: "Karate Club", nodes: 34, edges: 78, locked: true, chip: { type: "locked" }, expanded: true, children: [
        { kind: "measure", name: "Connections (Degree)", values: 34, chip: { type: "size" } },
        { kind: "measure", name: "Bridges (Betweenness)", values: 34 },
        { kind: "grouping", name: "Communities (Louvain)", groups: 4, expanded: false, childSelected: true, chip: { type: "strip", colors: OKABE_4 } },
      ] },
    ] },
  },
  canvas: {
    nodes: { sizeBy: "degree", byId },
    edges: { default: { width: 1 }, byPair },
    overlays: {
      dock: { open: false },
      dialog: {
        title: `Remove ${SEL.length} nodes from the data?`,
        rows: [
          { type: "keyValue", pairs: [{ label: "Nodes", value: SEL.join(", ") }, { label: "Edges", value: String(gone.length) }] },
          { type: "text", text: `Their ${gone.length} edges go with them (dashed on the canvas).` },
          { type: "keyValue", pairs: [{ label: "Member of", value: groups.map((g) => `Group ${g}`).join(", ") + " of Communities", wide: true }] },
          { type: "text", text: "Re-run at once: Connections, Communities (instant)." },
          { type: "text", text: "Turn stale: Bridges (about 2 s); Re-run is in its row." },
          { type: "text", text: "One undo step. The file on disk is not changed." },
        ],
        footer: [{ label: "Hide instead" }, { label: "Cancel" }, { label: "Remove", primary: true, danger: true }],
      },
    },
  },
  toolbar: { active: "select", mode: "2D" },
  inspector: {
    kind: "Selection", name: `${SEL.length} nodes`,
    actions: [{ icon: "locate", title: "Locate" }, { icon: "more" }],
    summary: `${SEL.length} nodes  ${inside} edges between them`,
    reading: null,
    tabs: [], tab: null,
    rows: [
      { type: "button", buttons: [{ label: "Make a set  Ctrl+G" }] },
      { type: "select", label: "Add to", value: "Choose a set" },
      { type: "keyValue", pairs: [{ label: "Communities", value: groups.length > 1 ? "Mixed" : `Group ${groups[0]}`, wide: true }] },
      { type: "keyValue", pairs: [{ label: "Connections", value: "2 to 4", wide: true }] },
      { type: "section", title: "Data" },
      { type: "link", text: "Remove from data...  Delete", chevron: false },
      { type: "link", text: "Merge into one node...", chevron: false },
      { type: "link", text: "Hide these", chevron: false },
    ],
  },
  status: { counts: { nodes: 34, edges: 78 }, layout: "Spread out: settled", selection: `${SEL.length} selected`, zoom: "100%" },
  caption: {
    title: "Screen 40: remove nodes from the data.",
    text: `Karate Club with three results; the reader selected nodes ${SEL.join(", ")} and pressed Delete (the several-elements inspector behind the dialog lists the same verb as \"Remove from data...  Delete\", beside \"Merge into one node...\", screen 41). Look at: the nodes and the ${gone.length} edges that go with them, those edges drawn dashed on the canvas; which Groups lose members; which objects re-run at once and which turn stale; one undo step, the file untouched; Hide instead, the verb the reader may have meant; Remove as the one filled button, red because it removes data. On a tree row, Delete removes the object, not data; on the canvas and in the table it removes data, and always asks.`,
  },
};
