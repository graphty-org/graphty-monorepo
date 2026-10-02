// Screen 9: a node selected, with the data table drawer open
// (round-2/screens.md), on College football with the objects of screen 5
// finished: Top 10 by Bridges (a Set linked to the Measure), Bridges
// (Betweenness) sized 0.8x to 2.4x, Conference coloured. The selected node is
// BrighamYoung (id 0), clicked in the table: rank 2 by the real betweenness
// of football.gml, 12 neighbours, in the top-ten Set. (screens.md names
// FloridaState, which the real values put at rank 25, outside the Set.)

import { NODES, BETWEENNESS, DEGREE } from "../football.mjs";
import { CONF_OF, DATASET_ROW, CONF_STRIP, conferenceFills } from "../football-state.mjs";

const byLabel = {};
for (const nd of NODES) byLabel[nd.label] = nd;
const ranked = NODES.map((x) => x.id).sort((a, b) => BETWEENNESS[b] - BETWEENNESS[a]);
const TOP10 = ranked.slice(0, 10);
const SELECTED = byLabel.BrighamYoung.id;
const SEL = NODES.find((x) => x.id === SELECTED);
const NEIGHBOURS = DEGREE[SELECTED];
const rank = ranked.indexOf(SELECTED) + 1;

const byId = conferenceFills();
for (const nd of NODES) {
  if (TOP10.includes(nd.id)) byId[nd.id].outline = { color: "ink", width: 2 };
  if (nd.id === SELECTED) { byId[nd.id].halo = true; byId[nd.id].label = true; }
}

// The table, sorted by label, scrolled so the selected node is in view: eight
// 32 px rows fit under the dock's two 32 px header rows in 320 px.
const sorted = [...NODES].sort((a, b) => a.label.localeCompare(b.label));
const at = sorted.findIndex((x) => x.id === SELECTED);
const page = sorted.slice(at - 4, at + 4);
const fmt = (v) => v.toFixed(3);
const tableRows = page.map((nd) => [nd.label, String(CONF_OF[nd.id]), String(nd.id), fmt(BETWEENNESS[nd.id]), String(CONF_OF[nd.id]), TOP10.includes(nd.id) ? "yes" : "-"]);

export default {
  id: 9,
  title: "A node selected, with the data table open",
  theme: "light",
  file: "College football",
  left: {
    views: { rows: [{ name: "Overview", current: true }] },
    objects: { rows: [
      { ...DATASET_ROW, children: [
        // The selected node is a member, so the Set row and the Grouping row carry the child-of-selected fill.
        { kind: "set", name: "Top 10 by Bridges", nodes: 10, chip: { type: "ring", color: "ink" }, childSelected: true },
        { kind: "measure", name: "Bridges (Betweenness)", values: 115, chip: { type: "size" } },
        { kind: "grouping", name: "Conference", groups: 12, expanded: false, childSelected: true, chip: CONF_STRIP },
      ] },
    ] },
  },
  canvas: {
    graph: "football",
    nodes: { default: {}, byId, sizeBy: { values: BETWEENNESS, from: 0.8, to: 2.4 } },
    edges: { default: { width: 1 } },
    overlays: {
      dock: {
        open: true, tab: "Table", height: 320,
        table: {
          tabs: [{ label: "Nodes 115", selected: true }, { label: "Edges 613" }],
          showing: "Everything",
          columns: [
            { label: "label", width: "128px", sorted: true },
            { label: "value", width: "56px" },
            { label: "id", width: "48px" },
            { label: "Bridges", width: "112px", chip: { type: "size" } },
            { label: "Conference", width: "128px", chip: CONF_STRIP },
            { label: "Top 10 by Bridges", width: "1fr", chip: { type: "ring", color: "ink" } },
          ],
          rows: tableRows,
          selectedRow: 4,
          scrolled: at / sorted.length,
        },
      },
    },
  },
  toolbar: { active: "select", mode: "2D" },
  inspector: {
    kind: "Node", sub: `id ${SELECTED}`, name: SEL.label,
    actions: [{ icon: "locate", title: "Locate" }, { icon: "pin", on: false, title: "Pin" }, { icon: "more" }],
    summary: `${NEIGHBOURS} neighbours`,
    reading: null,
    tabs: ["About", "Attributes", "Links"], tab: "About",
    framing: "100%",
    rows: [
      { type: "keyValue", pairs: [{ label: "label", value: SEL.label, wide: true }] },
      { type: "keyValue", pairs: [{ label: "value", value: String(CONF_OF[SELECTED]) }, { label: "id", value: String(SELECTED) }] },
      { type: "link", text: "All 3 attributes" },
      { type: "link", text: `Connected to ${NEIGHBOURS} nodes` },
      { type: "section", title: "Values" },
      { type: "keyValue", pairs: [{ label: "Bridges", value: fmt(BETWEENNESS[SELECTED]), note: `rank ${rank} of 115`, chevron: true }] },
      { type: "keyValue", pairs: [{ label: "Conference", value: String(CONF_OF[SELECTED]), chevron: true }] },
      { type: "chips", title: "Member of", chips: [{ chip: { type: "ring", color: "ink" }, label: "Top 10 by Bridges" }] },
      // screens.md's summary ("Colour from Conference, Size from Bridges, Outline from Top 10
      // by Bridges") is about 400 px of 11 px text in a 216 px row, so the collapsed row names
      // the three painted channels; opening it shows one row per channel with its source.
      { type: "disclosure", title: "Look", summary: "Colour, Size, Outline" },
      { type: "emptyPlus", title: "Notes" },
    ],
  },
  status: { counts: { nodes: 115, edges: 613 }, layout: "Spread out: settled", selection: "1 selected", zoom: "100%" },
  caption: {
    title: "Screen 9 of 15: a node selected, with the data table open.",
    text: "BrighamYoung was clicked in the table. Look at: the dock open on Table with its row tinted and a scrollbar thumb, the label column sorted, the attribute columns (label, value, id) then the object columns (Bridges, Conference, Top 10 by Bridges), each object column headed by its Style chip; the Set and Grouping rows in the tree carry the paler child-of-selected fill because BrighamYoung is a member; the canvas coloured by conference, sized by betweenness, the top ten outlined, BrighamYoung haloed with its label, no legend, the drawing re-fitted to the shorter stage; the inspector reads the node first (label, value, id, its attributes, its 12 links) and its objects second (Values with a rank and a chevron, Member of, Look, Notes), with Attributes and Links as tabs rather than a scroll.",
  },
};
