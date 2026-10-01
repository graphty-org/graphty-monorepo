// Screen 42: expand a node from its server, then add a node by hand and
// connect it (round-3/data-editing.md, "Expand from a server" and "Add a node
// or an edge by hand"). An invented server-backed dataset, "Club contacts",
// read from a graph database query and drawn with Karate Club's positions.
// The reader double-clicked node 34 (on a server-backed dataset a double-click
// expands; elsewhere it selects the neighbours): the element fetched six
// neighbours the graph did not hold, drawn here as new nodes 35 to 40 with an
// ink outline. The reader then right-clicked empty canvas, chose "Add node
// here..." (the second inset), created "Coach", and chose Connect to... from
// its menu: a dashed line runs from Coach to the pointer, and the bar asks
// for the other end. Counts come from the added nodes below.
import { COMMUNITIES } from "../karate.mjs";
import { OKABE_4 } from "../palettes.mjs";
import { nodeAt } from "../render.mjs";

const NEW = [
  { id: 35, x: 230, y: 110, links: [34, 36] },
  { id: 36, x: 175, y: 190, links: [34] },
  { id: 37, x: 220, y: 260, links: [34, 29] },
  { id: 38, x: 380, y: 110, links: [34, 39] },
  { id: 39, x: 380, y: 215, links: [34] },
  { id: 40, x: 250, y: 40, links: [34] },
];
const COACH = { id: 41, x: 880, y: 170, links: [], label: "Coach" };
const newEdges = NEW.reduce((t, x) => t + x.links.length, 0);

const byId = {};
for (const [g, ids] of Object.entries(COMMUNITIES)) for (const id of ids) byId[id] = { fill: OKABE_4[Number(g) - 1] };
for (const x of NEW) byId[x.id] = { outline: { color: "ink", width: 2 } };
byId[COACH.id] = { halo: true, pin: true, label: "Coach" };

const spec = {
  id: 42,
  title: "Expand a node from its server, then add and connect a node by hand",
  theme: "light",
  file: "Club contacts",
  fileState: { unsaved: true },
  left: {
    views: { rows: [{ name: "Overview", current: true }] },
    objects: { rows: [
      { kind: "dataset", name: "Club contacts", locked: true, chip: { type: "locked" }, expanded: true, children: [
        { kind: "measure", name: "Connections (Degree)", values: 41, chip: { type: "size" } },
        { kind: "measure", name: "Bridges (Betweenness)", values: 34, state: "stale" },
        { kind: "grouping", name: "Communities (Louvain)", groups: 4, expanded: false, state: "stale", chip: { type: "strip", colors: OKABE_4 } },
      ] },
    ] },
  },
  canvas: {
    extraNodes: [...NEW, COACH],
    nodes: { byId },
    edges: { default: { width: 1 } },
    labels: [34, 35, 36, 37, 38, 39, 40],
    overlays: { dock: { open: false } },
  },
  toolbar: {
    active: "select", mode: "2D",
    secondary: { parts: ["Connect Coach to", { text: "click a node, or type a name", secondary: true }, { field: "", caret: true, width: 120 }, { cancel: true }] },
  },
  insets: [
    {
      tag: "Before: double-click on 34 (server-backed)", left: 256, top: 16, width: 248,
      title: "Node 34",
      rows: [
        { type: "keyValue", pairs: [{ label: "Server", value: `${NEW.length} added just now`, action: "Undo" }] },
        { type: "button", buttons: [{ label: "Expand again" }, { label: "Select new" }] },
        { type: "text", text: `Added ${NEW.length} nodes  ${newEdges} edges from server [Undo]`, tone: "success" },
        { type: "note", text: "Connections re-ran (instant); Bridges and Communities turned stale." },
      ],
    },
    {
      tag: "Then: right-click empty canvas > Add node here...", left: 256, top: 262, width: 248,
      title: "Add node here",
      rows: [
        { type: "field", label: "Id", value: "41", note: "next free" },
        { type: "field", label: "Label", value: "Coach", caret: true, focus: true },
        { type: "field", label: "club", value: "Mr. Hi" },
        { type: "note", text: "Placed where you clicked and pinned." },
      ],
      footer: [{ label: "Cancel" }, { label: "Create", primary: true }],
    },
  ],
  inspector: {
    kind: "Node", sub: "id 41", name: "Coach",
    actions: [{ icon: "locate", title: "Locate" }, { icon: "pin", on: true, title: "Unpin" }, { icon: "more", title: "Connect to..., Expand from server, Remove from data..." }],
    summary: "0 neighbours, pinned",
    reading: "Added by hand; the file on the server does not have it.",
    tabs: ["About", "Attributes", "Links"], tab: "About",
    rows: [
      { type: "keyValue", pairs: [{ label: "club", value: "Mr. Hi" }, { label: "id", value: "41" }] },
      { type: "keyValue", pairs: [{ label: "Made", value: "by hand, 14:20", action: "Undo" }] },
      { type: "button", buttons: [{ label: "Connect to...", focus: true }] },
      { type: "section", title: "Values" },
      { type: "keyValue", pairs: [{ label: "Connections", value: "0", note: "rank 41 of 41", chevron: true }] },
      { type: "emptyPlus", title: "Notes" },
    ],
  },
  status: {
    counts: { nodes: 41, edges: 78 + newEdges },
    notice: { text: "Added node Coach", links: ["Undo"], tone: "success" },
    stale: "2 stale",
    layout: "Spread out: settling",
    selection: "1 selected",
    zoom: "100%",
  },
  caption: {
    title: "Screen 42: expand a node from its server, then add and connect a node by hand.",
    text: `An invented server-backed dataset drawn with Karate Club's positions. Look at: the ${NEW.length} nodes the server returned when the reader double-clicked 34 (35 to 40, outlined in ink), and the first inset with that moment's report, Undo, Expand again and Select new; Connections re-ran, Bridges and Communities stale in the tree; the second inset, Add node here (the next free id offered, a label, the dataset's columns); the new node Coach placed where the click was, pinned (the pin mark) and selected; Connect to... pressed on its About tab, a dashed line from Coach to the pointer, and the bar asking for the other end by click or name; the status bar's green "Added node Coach [Undo]"; the unsaved dot in the header.`,
  },
};

const from = nodeAt(spec, COACH.id), to = nodeAt(spec, 22);
spec.canvas.overlays.rubberBand = { from, to: { x: to.x + 14, y: to.y - 10 } };
spec.canvas.overlays.cursor = { x: to.x + 14, y: to.y - 10, icon: "cursor" };
export default spec;
