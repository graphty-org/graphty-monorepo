// Screen 66: a Path's Members tab (round-3/filters-sets.md, "Set, Group or Path Members tab").
// The same two routes and paint as screen 8 (copied here so screen 8 can change on its own);
// Path 12 -> 30 has just been created, so it is selected and the inspector opens on Members
// (revision.md 2.5: a tool finishing opens Members). Inside and cut edges and density are
// derived from karate.mjs.
//
// The two routes are plausible, not computed: 12 -> 30 runs 12-1-3-33-24-30 (5 hops) and
// 1 -> 34 runs 1-2-3-33-34 (4 hops), so they share exactly one edge, 3-33. Karate Club node
// 12's only neighbour is 1, so node 1 is on both routes as well as 3 and 33.
import { COMMUNITIES, EDGES } from "../karate.mjs";
import { OKABE_4, HIGHLIGHT } from "../palettes.mjs";

const PURPLE = HIGHLIGHT.purple; // Path: 12 -> 30
const MAGENTA = HIGHLIGHT.magenta; // Path: 1 -> 34
const PURPLE_NODES = [12, 1, 3, 33, 24, 30];
const MAGENTA_NODES = [1, 2, 3, 33, 34];

const byId = {};
for (const [g, ids] of Object.entries(COMMUNITIES)) for (const id of ids) byId[id] = { fill: OKABE_4[g - 1] };
for (const id of MAGENTA_NODES) byId[id].outline = [{ color: MAGENTA, width: 2 }];
for (const id of PURPLE_NODES) {
  // Outlines are listed innermost first; on a node both routes visit, purple sits outside.
  byId[id].outline = [...(byId[id].outline || []), { color: PURPLE, width: 2 }];
  byId[id].halo = true; // the six members of the selected Path
}

const magentaEdge = { stroke: MAGENTA, width: 5, arrow: true };
const purpleEdge = { stroke: PURPLE, width: 3, dash: "6 4" };
const byPair = {
  "1-2": magentaEdge, "2-3": magentaEdge, "33-34": magentaEdge,
  "1-12": purpleEdge, "1-3": purpleEdge, "24-33": purpleEdge, "24-30": purpleEdge,
  // The shared edge: the higher row (12 -> 30) wins Colour, Width and Pattern; it writes no
  // Arrows, so the lower row's arrowhead still shows, drawn in the winning colour.
  "3-33": { ...purpleEdge, arrow: true },
};

const purpleChip = { type: "line", color: PURPLE, width: 3, dash: "3 2" };
const magentaChip = { type: "line", color: MAGENTA, width: 5 };
const INSIDE = EDGES.filter(([a, b]) => PURPLE_NODES.includes(a) && PURPLE_NODES.includes(b)).length;
const CUT = EDGES.filter(([a, b]) => PURPLE_NODES.includes(a) !== PURPLE_NODES.includes(b)).length;

export default {
  id: 66,
  title: "A path's Members tab",
  theme: "light",
  file: "Karate Club",
  left: {
    views: { rows: [{ name: "Overview", current: true }] },
    objects: { rows: [
      { kind: "dataset", name: "Karate Club", nodes: 34, edges: 78, locked: true, chip: { type: "locked" }, expanded: true, children: [
        { kind: "path", name: "Path: 12 -> 30", edges: 5, chip: purpleChip, selected: true },
        { kind: "path", name: "Path: 1 -> 34", edges: 4, chip: magentaChip },
        { kind: "grouping", name: "Communities (Louvain)", groups: 4, expanded: false, chip: { type: "strip", colors: OKABE_4 } },
      ] },
    ] },
  },
  canvas: {
    nodes: { default: {}, byId },
    edges: { default: { width: 1 }, byPair },
    labels: [12, 30, 1, 3, 33, 24],
    overlays: { dock: { open: false } },
  },
  insets: [{
    tag: "Profile open (the same on a Group's Members tab)", left: 256, top: 16, width: 256,
    title: "Profile",
    rows: [
      { type: "text", text: "How the 6 members split:" },
      { type: "table", columns: ["1fr", "40px", "56px"], head: ["Communities", "", "Share"], rows: [
        [{ chip: { type: "swatch", color: OKABE_4[1] }, text: "Group 2" }, "3", "50%"],
        [{ chip: { type: "swatch", color: OKABE_4[0] }, text: "Group 1" }, "2", "33%"],
        [{ chip: { type: "swatch", color: OKABE_4[2] }, text: "Group 3" }, "1", "17%"],
      ] },
      { type: "link", text: "Make a set of the Group 2 members" },
    ],
  }],
  toolbar: { active: "select", mode: "2D" },
  inspector: {
    kind: "Set", name: "Path: 12 -> 30",
    chip: purpleChip, summary: { nodes: 6, edges: 5 },
    reading: "The shortest route from 12 to 30 has 5 hops.",
    tabs: ["Define", "Members", "Style", "Record"], tab: "Members",
    framing: "100%",
    rows: [
      { type: "button", buttons: [{ label: "Select", ghost: true }, { label: "Focus", ghost: true }, { label: "Locate", ghost: true }] },
      { type: "keyValue", pairs: [{ label: "Nodes", value: "6" }, { label: "Edges", value: "5" }] },
      { type: "keyValue", pairs: [{ label: "Inside", value: String(INSIDE), info: true }, { label: "Cut", value: String(CUT), info: true }] },
      { type: "keyValue", pairs: [{ label: "Density", value: (INSIDE / 15).toFixed(2) }, { label: "Weighted", value: "No" }] },
      { type: "keyValue", pairs: [{ label: "Hops", value: "5" }, { label: "Cost", value: "5.0" }] },
      { type: "table", columns: ["40px", "1fr", "56px"], head: ["Hop", "Node", "Cost"], rows: PURPLE_NODES.map((id, i) => [String(i), String(id), (i * 1.0).toFixed(1)]), selected: 0 },
      { type: "link", text: "Open all 6 in table" },
      { type: "disclosure", title: "Profile", summary: "Mostly Group 2 (3 of 6)" },
    ],
  },
  status: { counts: { nodes: 34, edges: 78 }, layout: "Spread out: settled", selection: "6 selected", zoom: "100%" },
  caption: {
    title: "Screen 66: a Path's Members tab, the tab a new Set opens on.",
    text: `Look at: Path 12 -> 30 just created and selected, the inspector on Members: Select, Focus and Locate as the tab's first row; Nodes 6 | Edges 5; Inside ${INSIDE} | Cut ${CUT} (edges among the members, and edges leaving them, each with an (i) that defines it); Density; Hops 5 | Cost 5.0 (a path only); the members in hop order with the running cost, the start row tinted because Tab steps from it; "Open all 6 in table"; Profile collapsed with its summary, and open in the inset: how the members split over a Grouping, with a count and share per group (a Group's Members tab carries the same disclosure). The canvas keeps screen 8's paint; the six members are haloed.`,
  },
};
