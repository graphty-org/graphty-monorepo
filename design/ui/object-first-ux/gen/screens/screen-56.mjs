// Screen 56: the Edges table and the edge inspector (round-3/navigate-select.md,
// "Edges table" and "The edge inspector"). Screen 9's state with the dock on
// its Edges tab: the reader clicked the row for the game BrighamYoung -
// Syracuse. The edge is drawn gold and thick, its two endpoints outlined; the
// inspector shows the edge, leading with its two ends.
import s9 from "./screen-9.mjs";
import { NODES, EDGES, BETWEENNESS, DEGREE } from "../football.mjs";
import { CONF_OF, CONF_STRIP, conferenceFills } from "../football-state.mjs";

const L = Object.fromEntries(NODES.map((x) => [x.id, x.label]));
const TOP10 = NODES.map((x) => x.id).sort((a, b) => BETWEENNESS[b] - BETWEENNESS[a]).slice(0, 10);
const BY = NODES.find((x) => x.label === "BrighamYoung").id;
const WY = NODES.find((x) => x.label === "Syracuse").id;
const EIDX = EDGES.findIndex(([a, b]) => (a === BY && b === WY) || (a === WY && b === BY));

const byId = conferenceFills();
for (const id of TOP10) byId[id].outline = { color: "ink", width: 2 };
for (const id of [BY, WY]) byId[id] = { ...byId[id], outline: [{ color: "ink", width: 2 }], label: true };
const pair = `${Math.min(BY, WY)}-${Math.max(BY, WY)}`;

// The edge list, sorted by source label, a page around the selected row.
const list = EDGES.map(([a, b], i) => {
  const [s, t] = L[a].localeCompare(L[b]) <= 0 ? [a, b] : [b, a];
  return { i, s, t };
}).sort((x, y) => L[x.s].localeCompare(L[y.s]) || L[x.t].localeCompare(L[y.t]));
const at = list.findIndex((x) => x.i === EIDX);
const page = list.slice(at - 4, at + 4);
const both = (x) => (TOP10.includes(x.s) && TOP10.includes(x.t) ? "yes" : "-");
const same = (x) => (CONF_OF[x.s] === CONF_OF[x.t] ? `both ${CONF_OF[x.s]}` : `${CONF_OF[x.s]} - ${CONF_OF[x.t]}`);

export default {
  ...s9,
  id: 56,
  title: "Edges table and the edge inspector",
  left: {
    ...s9.left,
    objects: { rows: s9.left.objects.rows.map((r) => ({ ...r, children: r.children.map((c) => ({ ...c, childSelected: c.kind === "set" || c.kind === "grouping" })) })) },
  },
  canvas: {
    graph: "football",
    nodes: { default: {}, byId, sizeBy: { values: BETWEENNESS, from: 0.8, to: 2.4 } },
    edges: { default: { width: 1 }, byPair: { [pair]: { stroke: "#ffb800", width: 5 } } },
    overlays: {
      dock: {
        open: true, tab: "Table", height: 320,
        table: {
          tabs: [{ label: "Nodes 115" }, { label: "Edges 613", selected: true }],
          showing: "Everything",
          columns: [
            { label: "source", width: "160px", sorted: true },
            { label: "target", width: "160px" },
            { label: "id", width: "56px" },
            { label: "Conference", width: "128px", chip: CONF_STRIP },
            { label: "Top 10 by Bridges", width: "1fr", chip: { type: "ring", color: "ink" } },
          ],
          rows: page.map((x) => [`${L[x.s]} >`, `${L[x.t]} >`, `e${x.i}`, same(x), both(x)]),
          selectedRow: 4,
          scrolled: at / list.length,
        },
      },
    },
  },
  inspector: {
    kind: "Edge", sub: `id e${EIDX}`, name: `${L[BY]} - ${L[WY]}`,
    actions: [{ icon: "locate", title: "Locate" }, { icon: "more", title: "Select both ends, Path through here, Note, Style this edge..., Hide, Copy id, Remove from data..." }],
    summary: "Undirected, unweighted",
    reading: null,
    tabs: ["About", "Attributes", "Endpoints"], tab: "About",
    framing: "100%",
    rows: [
      { type: "keyValue", pairs: [{ label: "from", value: L[BY], chevron: true }] },
      { type: "keyValue", pairs: [{ label: "to", value: L[WY], chevron: true }] },
      { type: "keyValue", pairs: [{ label: "weight", value: "none in this file", secondary: true, wide: true }] },
      { type: "link", text: "All 0 attributes" },
      { type: "section", title: "Values" },
      { type: "keyValue", pairs: [{ label: "Conference", value: same({ s: BY, t: WY }), note: "between groups", chevron: true }] },
      { type: "chips", title: "Member of", chips: [] },
      { type: "disclosure", title: "Look", summary: "Colour, Width" },
      { type: "emptyPlus", title: "Notes" },
      { type: "section", title: "Endpoints tab" },
      { type: "note", text: `Two node rows (${L[BY]}: ${DEGREE[BY]} neighbours, Conference ${CONF_OF[BY]}; ${L[WY]}: ${DEGREE[WY]} neighbours, Conference ${CONF_OF[WY]}), [Select both], "Other edges between them: 0". Click a row to open that node.` },
    ],
  },
  status: { counts: { nodes: 115, edges: 613 }, layout: "Spread out: settled", selection: "1 edge selected", zoom: "100%" },
  caption: {
    title: "Screen 56: the Edges tab of the table and the edge inspector.",
    text: "Look at: the dock on Edges 613 with source and target as links (a click opens that node), id, the object columns, one row selected; on the canvas that edge drawn thick in the selection gold and its two ends outlined and labelled; the Edge inspector with About (from, to, weight, Values, Member of, Look, Notes) and the Attributes and Endpoints tabs. Until the element can pick edges on the canvas (#319), this table and a node's Links tab are the ways to reach one.",
  },
};
