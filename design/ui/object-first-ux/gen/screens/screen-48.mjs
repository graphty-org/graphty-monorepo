// Screen 48: a tool that finds nothing (round-3/history-errors.md, "Empty
// results"). Karate Club focused on the Set "Degree 2 or less" (the twelve
// nodes with one or two links, none of them linked to each other). The Path
// tool is armed; the reader picked 15 then 16. Inside what is showing there
// is no route, so the bar says so and offers to search the whole graph;
// nothing is added to the tree and the tool stays armed. The inset lists the
// same rule in the other tools.
import { NODES, EDGES, DEGREE } from "../karate.mjs";

const SHOWN = new Set(NODES.map((n) => n.id).filter((id) => DEGREE[id] <= 2));
const byId = {};
for (const n of NODES) byId[n.id] = SHOWN.has(n.id) ? {} : { hidden: true };
byId[15] = { halo: true, label: true };
byId[16] = { halo: true, label: true };

export default {
  id: 48,
  title: "Empty results",
  theme: "light",
  file: "Karate Club",
  left: {
    views: { rows: [{ name: "Overview", current: true }] },
    objects: { rows: [
      { kind: "dataset", name: "Karate Club", nodes: 34, edges: 78, locked: true, chip: { type: "locked" }, expanded: true, children: [
        { kind: "set", name: "Degree 2 or less", nodes: SHOWN.size, chip: { type: "ring", color: "ink" } },
        { kind: "measure", name: "Connections (Degree)", values: 34, chip: { type: "size" } },
      ] },
    ] },
  },
  canvas: {
    nodes: { default: {}, byId },
    edges: { default: { width: 1 } },
    overlays: {
      dock: { open: false },
    },
  },
  toolbar: {
    active: "select", armed: "path", mode: "2D",
    secondary: {
      parts: ["No route from 15 to 16 among what is showing, 12 nodes", { button: "Search everything" }, { cancel: true }],
    },
  },
  insets: [{
    tag: "The same rule in the other tools", left: 256, top: 16, width: 272,
    title: "When a tool finds nothing",
    rows: [
      { type: "section", title: "Path, whole graph" },
      { type: "note", text: "\"No route from 12 to 40: they are in different parts.\" [Show both parts] [Cancel]" },
      { type: "section", title: "Filter" },
      { type: "note", text: "\"Matches 0 nodes: the highest Connections is 17.\" Create is disabled; Options stays open." },
      { type: "section", title: "Neighbours" },
      { type: "note", text: "\"Node 12 has no neighbours in that direction.\" [All directions] [Cancel]" },
      { type: "text", text: "Nothing is added to the tree; the tool stays armed." },
    ],
  }],
  inspector: {
    kind: "Set", name: "Degree 2 or less",
    actions: [{ icon: "eye", on: true }, { icon: "unlock", on: false }, { icon: "more" }],
    chip: { type: "ring", color: "ink" }, summary: { nodes: SHOWN.size, edges: 0 },
    reading: "12 nodes with one or two links; none links to another.",
    tabs: ["Define", "Members", "Style", "Record"], tab: "Members",
    framing: "100%",
    rows: [
      { type: "keyValue", pairs: [{ label: "Focus", value: "On", action: "Exit" }] },
      { type: "keyValue", pairs: [{ label: "Nodes", value: String(SHOWN.size) }, { label: "Edges", value: "0" }] },
      { type: "keyValue", pairs: [{ label: "Parts", value: String(SHOWN.size) }, { label: "Cut edges", value: String([...SHOWN].reduce((t, id) => t + DEGREE[id], 0)) }] },
    ],
  },
  status: { counts: { nodes: 34, edges: 78 }, mask: { text: `Focused on Degree 2 or less: ${SHOWN.size} of 34`, exit: true }, tool: "Path: Shortest route", selection: "2 picked", zoom: "100%" },
  caption: {
    title: "Screen 48: a tool that finds nothing.",
    text: "Karate Club focused on its twelve least-linked nodes; the Path tool is armed and the reader picked 15 and 16. Look at: the secondary bar saying there is no route among what is showing, with Search everything (runs the same route on the whole graph and says it went outside the focus) and Cancel; both picked nodes still haloed; no new row in the tree; the tool still armed (Path in the status bar) so another pick can follow; the Focus mask and its Exit. The inset lists the same rule for a Path across separate parts, a Filter that matches nothing, and Neighbours of an isolated node.",
  },
};
