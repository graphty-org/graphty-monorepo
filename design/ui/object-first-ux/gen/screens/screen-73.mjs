// Screen 73: the Record tab and its Export row (round-3/analysis-results.md,
// "Record tab" and "Export one result"). Path: 1 -> 34 on Karate Club, a
// real shortest route (1-9-34; three other two-hop routes tie, which is the
// caveat). The Export select is open, its list the dark menu beside the row;
// the inset is the same tab on a Measure.

import { EDGES, COMMUNITIES } from "../karate.mjs";
import { OKABE_4, HIGHLIGHT } from "../palettes.mjs";

const ROUTE = [1, 9, 34];
const adj = {};
for (const [a, b] of EDGES) { (adj[a] ||= new Set()).add(b); (adj[b] ||= new Set()).add(a); }
const TIES = [...adj[1]].filter((x) => adj[34].has(x)); // every middle node of a two-hop route
const byId = {};
for (const [g, ids] of Object.entries(COMMUNITIES)) for (const id of ids) byId[id] = { fill: OKABE_4[g - 1] };
for (const id of ROUTE) byId[id] = { ...byId[id], outline: { color: HIGHLIGHT.magenta, width: 2 }, halo: true };
const edge = { stroke: HIGHLIGHT.magenta, width: 5, arrow: true };
const chip = { type: "line", color: HIGHLIGHT.magenta, width: 5 };

export default {
  id: 73,
  title: "The Record tab and its Export row",
  theme: "light",
  file: "Karate Club",
  left: {
    views: { rows: [{ name: "Overview", current: true }] },
    objects: { rows: [
      { kind: "dataset", name: "Karate Club", nodes: 34, edges: 78, locked: true, chip: { type: "locked" }, expanded: true, children: [
        { kind: "path", name: "Path: 1 -> 34", edges: 2, chip, selected: true },
        { kind: "grouping", name: "Communities (Louvain)", groups: 4, expanded: false, chip: { type: "strip", colors: OKABE_4 } },
      ] },
    ] },
  },
  canvas: {
    nodes: { default: {}, byId },
    edges: { default: { width: 1 }, byPair: { "1-9": edge, "9-34": edge } },
    labels: ROUTE,
    overlays: {
      legend: { blocks: [{ title: "Paths", rows: [{ line: { color: HIGHLIGHT.magenta, width: 5 }, label: "1 -> 34" }] }] },
      dock: { open: false },
    },
  },
  menus: [{
    anchor: { inspectorRow: 9, side: "left", align: "start", dx: -8, dy: -8 },
    width: 232,
    rows: [
      { label: "Members, CSV", checked: true, highlighted: true },
      { label: "Subgraph, GraphML", checked: false },
      { label: "Framed image, PNG", checked: false },
      { divider: true },
      { heading: "Members: one row per node and edge, in route order, with every attribute" },
    ],
  }],
  insets: [{
    tag: "The same tab on a Measure", left: 256, top: 16, width: 248,
    title: "Measure  Influence (PageRank)",
    rows: [
      { type: "keyValue", pairs: [{ label: "Method", value: "PageRank", info: true, wide: true }] },
      { type: "disclosure", title: "Parameters", summary: "damping 0.85" },
      { type: "disclosure", title: "Caveats", summary: "none" },
      { type: "select", label: "Export", value: "Ranked list, CSV" },
    ],
  }],
  toolbar: { active: "select", mode: "2D" },
  inspector: {
    kind: "Set", name: "Path: 1 -> 34", tech: "Shortest route",
    chip, summary: { nodes: 3, edges: 2 },
    reading: "The shortest route from 1 to 34 has 2 hops.",
    tabs: ["Define", "Members", "Style", "Record"], tab: "Record",
    rows: [
      { type: "section", title: "Made by" },
      { type: "keyValue", pairs: [{ label: "Method", value: "Shortest route (Dijkstra)", info: true, wide: true }] },
      { type: "disclosure", title: "Parameters", summary: "unweighted, both directions" },
      { type: "keyValue", pairs: [{ label: "Scope", value: "What was showing, 34 nodes", wide: true }] },
      { type: "keyValue", pairs: [{ label: "Engine", value: "algorithms 2.0.1, CPU", wide: true }] },
      { type: "keyValue", pairs: [{ label: "Time", value: "2 ms, 2026-09-25 14:02", wide: true }] },
      { type: "disclosure", title: "Caveats", summary: "1", open: true },
      { type: "note", text: `${TIES.length} routes of 2 hops tie (through ${TIES.join(", ")}); this is the first found.` },
      { type: "button", buttons: [{ label: "Copy methods" }, { label: "Copy command" }] },
      { type: "select", label: "Export", value: "Members, CSV", gear: false },
      { type: "button", buttons: [{ label: "Export", primary: true }] },
      { type: "section", title: "Notes", count: "0", plus: true },
    ],
  },
  status: { counts: { nodes: 34, edges: 78 }, layout: "Spread out: settled", selection: "3 selected", zoom: "100%" },
  caption: {
    title: "Screen 73: the Record tab and its Export row.",
    text: `Path: 1 -> 34 selected, on Record. Look at: MADE BY with Method (its (i) explains Dijkstra), Parameters collapsed to its summary, Scope, Engine, Time; Caveats open with the one caveat this run really has (${TIES.length} two-hop routes tie); "Copy methods" (the methods text: a sentence for a paper) and "Copy command" (the JSON that reproduces it); the Export row, its list open as a dark menu with the three exports a path offers and what the chosen one holds; NOTES with its "+". A run made by the assistant or a recipe adds one row, "Assistant: <the request>" or "Recipe: <name>, step 3", under Time. The inset is a Measure's Record: the same shape, its list reading Ranked list, CSV.`,
  },
};
