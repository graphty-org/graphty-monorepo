// Screen 50: Find open with results (round-3/navigate-select.md, "Find").
// College football with screen 9's objects. The reader pressed Ctrl+F and
// typed "state": the Objects header turned into the find field and the tree
// is replaced in place by three result sections (Objects, Nodes by label or
// id, Values in attributes), as Figma's layer search filters its layer list.
// The Values row is highlighted, so its 24 matches are lit on the canvas and
// the dark bar offers what to do with them; the table shows the same 24 rows
// with the search in its field.
import { NODES, BETWEENNESS } from "../football.mjs";
import { CONF_OF, CONF_COLOR, conferenceFills } from "../football-state.mjs";

const HITS = NODES.filter((x) => /state/i.test(x.label));
const byId = conferenceFills();
for (const nd of NODES) {
  if (HITS.includes(nd)) { byId[nd.id].halo = true; }
  else byId[nd.id].opacity = 0.35;
}

const nodeRow = (nd, extra = {}) => ({ kind: "node", name: nd.label, id: nd.id, chip: { type: "swatch", color: CONF_COLOR[CONF_OF[nd.id]] }, ...extra });
const sorted = [...HITS].sort((a, b) => a.label.localeCompare(b.label));
const fmt = (v) => v.toFixed(3);

export default {
  id: 50,
  title: "Find open with results",
  theme: "light",
  file: "College football",
  left: {
    views: { rows: [{ name: "Overview", current: true }] },
    objects: { find: { query: "state", count: "24" }, rows: [
      { kind: "heading", name: "Objects", count: "none" },
      { kind: "heading", name: "Nodes, by label or id", count: "24" },
      ...sorted.slice(0, 4).map((nd) => nodeRow(nd)),
      { kind: "more", name: "20 more", members: "" },
      { kind: "heading", name: "Values in", select: "Any attribute", count: "1" },
      { kind: "set", name: "label contains \"state\"", nodes: 24, chip: { type: "ring", color: "#ffb800" }, selected: true },
    ] },
  },
  canvas: {
    graph: "football",
    nodes: { default: {}, byId, sizeBy: { values: BETWEENNESS, from: 0.8, to: 2.4 } },
    edges: { default: { width: 1, opacity: 0.5 } },
    overlays: {
      dock: {
        open: true, tab: "Table", height: 256,
        table: {
          tabs: [{ label: "Nodes 24 of 115", selected: true }, { label: "Edges 613" }],
          showing: "Everything", search: "state", searchCount: "24 of 115",
          columns: [
            { label: "label", width: "176px", sorted: true },
            { label: "value", width: "56px" },
            { label: "id", width: "48px" },
            { label: "Bridges", width: "1fr", chip: { type: "size" } },
          ],
          rows: sorted.slice(0, 6).map((nd) => [nd.label, String(CONF_OF[nd.id]), String(nd.id), fmt(BETWEENNESS[nd.id])]),
          scrolled: 0,
        },
      },
    },
  },
  toolbar: {
    active: "select", mode: "2D",
    // The find bar: the secondary bar's slot, with its own parts.
    secondary: { parts: [{ count: "24" }, "nodes have \"state\" in label", { ghost: "Select (Enter)" }, { button: "Make a set (Ctrl+G)" }, { ghost: "Show in table" }, { cancel: "Close (Esc)" }] },
  },
  inspector: {
    kind: "Dataset", name: "College football",
    actions: [{ icon: "plus", title: "Add data" }, { icon: "more" }],
    chip: { type: "locked" }, summary: "football.gml, GML",
    reading: "115 teams joined by 613 games in one connected part",
    tabs: ["Overview", "Layout", "Canvas", "Data"], tab: "Overview",
    framing: "100%",
    rows: [
      { type: "keyValue", pairs: [{ label: "Nodes", value: "115" }, { label: "Edges", value: "613" }] },
      { type: "keyValue", pairs: [{ label: "Direction", value: "Undirected (file)", action: "Change..." }] },
      { type: "keyValue", pairs: [{ label: "Density", value: "0.094" }, { label: "Mean links", value: "10.7" }] },
      { type: "keyValue", pairs: [{ label: "Parts", value: "1" }, { label: "Weighted", value: "No" }] },
    ],
  },
  status: { counts: { nodes: 115, edges: 613 }, tool: "Find: 24 matches", layout: "Spread out: settled", zoom: "100%" },
  caption: {
    title: "Screen 50: Find open (Ctrl+F) with \"state\" typed.",
    text: "Look at: the Objects header turned into the find field, with the count; the tree replaced in place by three sections: Objects (none), Nodes by label or id (four rows with the conference colour, then \"20 more\"), and Values in attributes with its scope select; the highlighted Values row lights its 24 matches and fades the rest; the dark bar offers Select, Make a set, Show in table; the table shows the same 24 rows, its search field carrying the same text. Arrow keys walk all sections; Enter on a node selects it and zooms to it; Esc restores the tree.",
  },
};
