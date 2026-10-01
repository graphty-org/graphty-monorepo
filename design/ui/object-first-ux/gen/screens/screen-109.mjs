// Screen 109: the command palette (round-4/revision-round-4.md section 4),
// opened from its visible door, the Actions button on the toolbar (also
// Ctrl+K, and "Search commands..." in the Help menu at the rail's foot).
// Karate Club with Bridges (Betweenness) selected. The reader typed "bridg":
// Commands (the Rank flyout row, found by its plain and its technical name),
// Objects (tree rows by name), Nodes (none match in this file, so only the
// hand-off to Find) and the Ask row, always last. The inset is the palette as
// it opens, before typing: Recent and For the selection.

import { BETWEENNESS, COMMUNITIES } from "../karate.mjs";
import { OKABE_4 } from "../palettes.mjs";

const byId = {};
for (const [g, members] of Object.entries(COMMUNITIES)) for (const id of members) byId[id] = { fill: OKABE_4[g - 1] };

export default {
  id: 109,
  title: "The command palette from the Actions button",
  theme: "light",
  file: "Karate Club",
  left: {
    objects: { rows: [
      { kind: "dataset", name: "Karate Club", nodes: 34, edges: 78, locked: true, chip: { type: "locked" }, expanded: true, children: [
        { kind: "set", name: "Top 5 by Bridges", nodes: 5, chip: { type: "ring", color: "ink" } },
        { kind: "measure", name: "Bridges (Betweenness)", values: 34, chip: { type: "size" }, selected: true },
        { kind: "grouping", name: "Communities (Louvain)", groups: 4, expanded: false, chip: { type: "strip", colors: OKABE_4 } },
      ] },
    ] },
  },
  canvas: {
    nodes: { default: {}, byId, sizeBy: { values: BETWEENNESS, from: 0.8, to: 2.4 } },
    edges: { default: { width: 1 } },
    labels: [1, 34],
    overlays: { dock: { open: false } },
  },
  toolbar: {
    active: "select", mode: "2D",
    palette: {
      query: "bridg", scope: "All",
      sections: [
        { title: "Commands", rows: [
          { icon: "rank", label: "Rank > Bridges", note: "Betweenness centrality", key: "R", active: true },
        ] },
        { title: "Objects", rows: [
          { icon: "measure", label: "Bridges (Betweenness)", note: "34 values" },
          { icon: "set", label: "Top 5 by Bridges", note: "5 nodes" },
        ] },
        { title: "Nodes", rows: [
          { icon: "search", label: "Show all in Find", note: "no node label matches", key: "Ctrl+F" },
        ] },
        { rows: [
          { icon: "sparkle", label: "Ask: bridg", key: "Alt+5" },
        ] },
      ],
    },
  },
  insets: [{
    tag: "Before typing (as it opens)", left: 256, top: 16, width: 280,
    title: "Search commands, objects and nodes",
    rows: [
      { type: "table", columns: ["1fr", "48px"], head: ["Recent", ""], rows: [
        [{ icon: "rank", text: "Rank > Bridges" }, { text: "R", secondary: true }],
        [{ icon: "group", text: "Groups > Communities" }, { text: "G", secondary: true }],
      ], selected: 0 },
      { type: "table", columns: ["1fr", "48px"], head: ["For the selection", ""], rows: [
        [{ icon: "refresh", text: "Re-run" }, ""],
        [{ icon: "locate", text: "Focus on this" }, ""],
        [{ icon: "set", text: "Cut into a Set..." }, ""],
        [{ icon: "table", text: "Show in table" }, { text: "Shift+T", secondary: true }],
      ] },
    ],
  }],
  inspector: {
    kind: "Measure", name: "Bridges (Betweenness)",
    chip: { type: "size" }, summary: "34 values",
    reading: "Node 1 sits on the most shortest routes.",
    tabs: ["Values", "Define", "Style", "Record"], tab: "Values",
    rows: [
      { type: "histogram", bars: [1, 0.35, 0.12, 0.06, 0.03, 0.03, 0, 0.03, 0, 0.03], scale: "lin" },
      { type: "table", columns: ["1fr", "56px"], head: ["Node", "Value"], rows: [["1", "0.438"], ["34", "0.304"], ["33", "0.145"], ["3", "0.144"], ["32", "0.138"]] },
      { type: "link", text: "All 34 in the table", chevron: true },
    ],
  },
  status: { counts: { nodes: 34, edges: 78 }, layout: "Spread out: settled", selection: "Bridges selected", zoom: "100%" },
  caption: {
    title: "Screen 109: the command palette.",
    text: "The way in you can see: the Actions button on the toolbar (blue while the palette is open); also Ctrl+K and \"Search commands...\" at the top of the Help menu at the rail's foot. Look at: the query \"bridg\" and the scope tabs; Commands, where the Rank flyout row matches by its plain name and would match by \"Betweenness\" too, with its key; Objects, the tree rows by name (Enter selects the row and opens Objects); Nodes, where no label matches, so only \"Show all in Find\" hands the query to Find; and the last row, \"Ask: bridg\", which opens the AI panel with the sentence sent. The first row is highlighted; arrows move, Enter runs, Esc closes. Inset: the palette as it opens, before typing: the last commands run and the selected Measure's verbs.",
  },
};
