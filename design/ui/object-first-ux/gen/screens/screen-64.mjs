// Screen 64: the Neighbours tool armed (round-3/filters-sets.md, "Neighbours tool").
// College football. The reader selected BrighamYoung and pressed E (or the "Neighbours" button
// on its Links tab), so the tool is armed and seeded with the selection. The secondary bar
// reads the whole sentence with the live size; its Options popover is open above the
// Neighbours button with the per-step size table. The canvas previews the neighbourhood: the
// 13 members at full strength, the edges among them dark, the rest faded. Counts are the real
// ones from football.mjs.
import { NODES, EDGES } from "../football.mjs";
import { DATASET_ROW, conferenceFills, conferenceTreeRow } from "../football-state.mjs";

const byLabel = Object.fromEntries(NODES.map((n) => [n.label, n.id]));
const SEED = byLabel.BrighamYoung;
const adj = {};
for (const [a, b] of EDGES) { (adj[a] ??= new Set()).add(b); (adj[b] ??= new Set()).add(a); }
const step1 = new Set([SEED, ...adj[SEED]]);
const step2 = new Set(step1);
for (const x of step1) for (const y of adj[x]) step2.add(y);
const inside = (S) => EDGES.filter(([a, b]) => S.has(a) && S.has(b)).length;

const byId = conferenceFills();
for (const nd of NODES) if (!step1.has(nd.id)) byId[nd.id].opacity = 0.25;
byId[SEED].halo = true;
byId[SEED].label = true;
const byPair = {};
for (const [a, b] of EDGES) if (step1.has(a) && step1.has(b)) byPair[`${Math.min(a, b)}-${Math.max(a, b)}`] = { stroke: "ink", width: 1.5, opacity: 1 };
const nbrs = [...adj[SEED]].map((i) => NODES[i].label).sort();

export default {
  id: 64,
  title: "Neighbours tool armed",
  theme: "light",
  file: "College football",
  left: {
    views: { rows: [{ name: "Overview", current: true }] },
    objects: { rows: [{ ...DATASET_ROW, children: [conferenceTreeRow({ childSelected: true })] }] },
  },
  canvas: {
    graph: "football",
    nodes: { default: {}, byId },
    edges: { default: { width: 1, opacity: 0.25 }, byPair },
    overlays: {
      popover: {
        title: "Neighbours options",
        left: 84, bottom: 124, caret: "bottom", caretAt: 230,
        rows: [
          { type: "text", text: "Around BrighamYoung, in what is showing" },
          { type: "select", label: "Steps", value: "1" },
          { type: "select", label: "Direction", value: "All (undirected data)", disabled: true },
          { type: "select", label: "Edges", value: "All types" },
          { type: "segmented", label: "Keep edges", options: ["Among all", "To centre"], value: "Among all" },
          { type: "table", columns: ["1fr", "56px", "56px"], head: ["Within", "Nodes", "Edges"], rows: [["1 step", String(step1.size), String(inside(step1))], ["2 steps", String(step2.size), String(inside(step2))]], selected: 0 },
        ],
        footer: [{ label: "Select" }, { label: "Create", primary: true }],
        carriesPrimary: true,
      },
      dock: { open: false },
    },
  },
  toolbar: {
    active: "select", armed: "filter", faces: { filter: "Around a node" }, mode: "2D",
    secondary: { parts: ["Around", { chip: "BrighamYoung", removable: true }, "within", { select: "1" }, "step,", { select: "All types" }, { count: `${step1.size} nodes  ${inside(step1)} edges` }, { ghost: "Options" }, { ghost: "Select" }, { button: "Create" }, { ghost: "Create and focus" }, { cancel: true }] },
  },
  inspector: {
    kind: "Node", sub: `id ${SEED}`, name: "BrighamYoung",
    actions: [{ icon: "locate", title: "Locate" }, { icon: "pin", on: false, title: "Pin" }, { icon: "more" }],
    summary: `${adj[SEED].size} neighbours`,
    reading: null,
    tabs: ["About", "Attributes", "Links"], tab: "Links",
    framing: "100%",
    rows: [
      { type: "button", label: `${adj[SEED].size} links`, buttons: [{ label: "Select", ghost: true }, { label: "Neighbours (E)", focus: true }] },
      { type: "table", columns: ["1fr", "64px"], rows: nbrs.slice(0, 10).map((n) => [n, "game"]) },
      { type: "link", text: `See all ${adj[SEED].size} in table` },
    ],
  },
  status: { counts: { nodes: 115, edges: 613 }, layout: "Spread out: settled", tool: "Neighbours of BrighamYoung", selection: "1 selected", zoom: "100%" },
  caption: {
    title: "Screen 64: the Neighbours tool armed, seeded with the selected node.",
    text: `Look at: Neighbours armed, seeded from the selection (BrighamYoung, haloed and labelled); the bar's sentence names the centre as a removable chip, the steps and the edge types (the direction select appears only on directed data), then the live size "${step1.size} nodes  ${inside(step1)} edges" and Options, Select, Create, Create and focus, Cancel; the Options popover with the same fields plus "Keep edges" (all edges among the members, or only those to the centre) and a table of the size at 1 and 2 steps so the reader sees the jump before choosing; the canvas preview; the node's Links tab, whose "Neighbours (E)" button is the second door. Clicking another node re-seeds; Enter creates the Set "Around BrighamYoung".`,
  },
};
