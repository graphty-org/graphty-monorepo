// The one toolbar definition: every button, chevron, key, tooltip, flyout
// row and secondary-bar sentence of the round-4 toolbar
// (design/ui/object-first-ux/round-4/revision-round-4.md section 3, which
// replaces round-2 revision.md section 3). render.mjs draws the bar from this
// and nothing else, so every screen's toolbar is identical. The bar carries
// no words: a tool's name, its sentence (say) and its key are its tooltip.
//
// A flyout row: { name, tech, kind, cost, face, issue, proposed, check, dots }.
//   kind is the tree-row icon the row will make: set | measure | grouping |
//   finding. face marks the row a plain click on the tool uses. proposed rows
//   are absent from a flyout in the app frame (a row appears when the
//   capability is registered) and drawn at 50 percent with their issue number
//   on the reference page. dots draws the "..." that opens the parameters
//   popover. check draws the row as a checkbox. { divider: true } is a rule
//   before the batch rows.

export const TOOLS = [
  { id: "select", icon: "cursor", key: "V", chevron: true, tip: "Select", say: "click or drag to select", menuTip: "Select tools", flyout: [
    { name: "Select", tech: "", kind: null, face: true, key: "V" },
    { name: "Lasso", tech: "", kind: null, proposed: true },
    { name: "Hand", tech: "move the view", kind: null, key: "H", icon: "hand" },
    { name: "Front only", tech: "in 3D, keep the nearest hit", kind: null, check: true, proposed: true },
  ] },
  { divider: true },
  { id: "filter", icon: "filter", key: "F", chevron: true, tip: "Filter", say: "keep the nodes or edges that match, as a Set", menuTip: "Filter methods", target: ["Nodes", "Edges"], flyout: [
    { name: "By values", tech: "categories filter", kind: "set", face: true, cost: "instant", dots: true },
    { name: "By range", tech: "range filter", kind: "set", cost: "instant", dots: true },
    { name: "By connections", tech: "degree filter", kind: "set", cost: "instant", dots: true },
    { name: "By rule", tech: "expression filter", kind: "set", cost: "instant", proposed: true, issue: "#149", dots: true },
    { name: "By id list", tech: "ids target", kind: "set", cost: "instant", dots: true },
    { name: "Largest connected part", tech: "largest-component scope", kind: "set", cost: "instant" },
    { name: "Pattern", tech: "subgraph match", kind: "set", cost: "about 2 s", proposed: true, issue: "design", dots: true },
    { name: "Around a node", tech: "neighbourhood", kind: "set", cost: "instant", key: "E", dots: true },
  ] },
  { id: "path", icon: "path", key: "P", chevron: true, tip: "Path", say: "find a route between two nodes", menuTip: "Path methods", foot: "flow rows land here", flyout: [
    { name: "Shortest route", tech: "shortest-path", kind: "set", face: true, cost: "instant", dots: true },
    { name: "All routes", tech: "all simple paths", kind: "set", cost: "about 2 s", proposed: true, issue: "#329", dots: true },
    { name: "Most that can flow", tech: "max-flow", kind: "measure", cost: "instant", dots: true },
    { name: "Weakest link between two", tech: "min-cut", kind: "set", cost: "instant", dots: true },
    { name: "Weakest link anywhere", tech: "min-cut, global", kind: "set", cost: "about 2 s", dots: true },
    { name: "Best pairing", tech: "bipartite matching", kind: "set", cost: "instant" },
  ] },
  { id: "groups", icon: "group", key: "G", chevron: true, tip: "Groups", say: "split the nodes into groups", menuTip: "Group methods", flyout: [
    { name: "Communities", tech: "Louvain", kind: "grouping", face: true, cost: "about 80 ms", dots: true },
    { name: "Communities, refined", tech: "Leiden", kind: "grouping", cost: "about 100 ms", dots: true },
    { name: "Communities, fast", tech: "Label propagation", kind: "grouping", cost: "instant", dots: true },
    { name: "Communities by cutting bridges", tech: "Girvan-Newman", kind: "grouping", cost: "about 4 s", dots: true },
    { name: "Communities, Markov / spectral / hierarchical", tech: "", kind: "grouping", cost: "about 2 s", proposed: true, issue: "#55", dots: true },
    { name: "Steps away from a node", tech: "BFS levels", kind: "grouping", cost: "instant", dots: true },
    { name: "By attribute...", tech: "category column", kind: "grouping", cost: "instant" },
    { divider: true },
    { name: "Several...", tech: "batch", kind: "grouping", cost: "" },
    { name: "Sweep...", tech: "parameter sweep", kind: "finding", cost: "", proposed: true, issue: "#194" },
  ] },
  { id: "rank", icon: "rank", key: "R", chevron: true, tip: "Rank", say: "give every node a value, such as how central it is", menuTip: "Rank methods", flyout: [
    { name: "Connections", tech: "Degree centrality", kind: "measure", face: true, cost: "instant", dots: true },
    { name: "Bridges", tech: "Betweenness centrality", kind: "measure", cost: "about 2 s", dots: true },
    { name: "Reach", tech: "Closeness centrality", kind: "measure", cost: "about 2 s", dots: true },
    { name: "Influence", tech: "PageRank", kind: "measure", cost: "instant", dots: true },
    { name: "Influence by association", tech: "Eigenvector centrality", kind: "measure", cost: "instant", dots: true },
    { name: "Influence at a distance", tech: "Katz centrality", kind: "measure", cost: "instant", dots: true },
    { name: "Hubs and authorities", tech: "HITS", kind: "measure", cost: "instant", dots: true },
    { name: "Clustering", tech: "Clustering coefficient", kind: "measure", cost: "instant", proposed: true, issue: "#330", dots: true },
    { name: "Bridges (edges)", tech: "Edge betweenness", kind: "measure", cost: "about 2 s", proposed: true, issue: "#55", dots: true },
    { name: "Unusual nodes", tech: "Anomaly score", kind: "measure", cost: "about 2 s", proposed: true, issue: "#312", dots: true },
    { name: "Exploration order", tech: "Depth-first search", kind: "measure", cost: "instant" },
    { divider: true },
    { name: "Several...", tech: "batch", kind: "measure", cost: "" },
  ] },
  { id: "structure", icon: "bridge", key: "S", chevron: true, tip: "Structure", say: "find the parts, cores and weak points of the graph", menuTip: "Structure methods", foot: "prediction rows land here", flyout: [
    { name: "Separate pieces", tech: "Connected components", kind: "grouping", face: true, cost: "instant", dots: true },
    { name: "Densest shells", tech: "k-core decomposition", kind: "grouping", cost: "instant", proposed: true, issue: "unregistered" },
    { name: "Bridge edges and cut points", tech: "Articulation points, bridges", kind: "set", cost: "instant", proposed: true, issue: "#311" },
    { name: "Cheapest connecting network", tech: "Kruskal MST", kind: "set", cost: "instant" },
    { name: "Cheapest network from a node", tech: "Prim MST", kind: "set", cost: "instant" },
    { name: "How far from everything", tech: "Eccentricity", kind: "measure", cost: "about 4 min", dots: true },
    { name: "Distances", tech: "Diameter, radius, mean path", kind: "finding", cost: "about 4 min", proposed: true, issue: "#310" },
    { name: "Likely missing links", tech: "Link prediction", kind: "finding", cost: "about 2 s", proposed: true, issue: "unregistered" },
  ] },
  { divider: true },
  // Time is drawn only when the data has a time column (toolbar.time).
  { id: "time", icon: "clock", key: "T", chevron: false, tip: "Time", say: "play the data over its time column", timeOnly: true },
  { id: "actions", icon: "actions", key: "Ctrl+K", chevron: false, tip: "Actions", say: "search and run any command, object or node" },
  { divider: true },
  { mode: true },
];

// Tools that left the bar in round 4, and the tool that now holds each (a
// spec that still names one is drawn with its new home pressed or armed).
export const MOVED = { hand: "select", neighbours: "filter", note: "select", ask: "select" };
export const MOVED_FACE = { hand: "Hand", neighbours: "Around a node" };

export const MODES = ["2D", "3D", "VR", "AR"];

// The secondary bar's sentence per tool, trimmed in round 4 (round-4
// revision section 3.5): the variant, the scope, the count, the cost and one
// verb; no lead-in words. Parts are strings, { select }, { button } (the one
// filled control), { split } (a filled button with a caret: "Create", whose
// menu holds "Create and focus"), { ghost } (a text button), { gear: true }
// (the parameters popover) or { cancel: true } (a close X). A bar that is not
// a tool's passes its own parts (render.mjs secondaryBarHtml).
const cap = (t) => (t ? t[0].toUpperCase() + t.slice(1) : t);
const scope = (o) => [{ select: cap(o.scope) }, `${o.count} nodes, ${o.cost}`];
const run = (o) => [{ select: o.variant }, ...scope(o), { gear: true }, { button: "Run" }, { cancel: true }];
export const SECONDARY = {
  rank: run,
  groups: run,
  structure: run,
  path: (o) => o.stage === "start" ? ["Pick the start node", { cancel: true }] : ["Pick the end node", { select: o.variant }, { cancel: true }],
  neighbours: (o) => [{ select: `${o.steps ?? 1} step${(o.steps ?? 1) === 1 ? "" : "s"}` }, { select: o.direction ?? "All directions" }, `around node ${o.node}`, { button: "Create" }, { cancel: true }],
  filter: (o) => [{ select: o.variant }, `${o.count}${o.of ? ` of ${o.of}` : ""} ${o.unit || "nodes"}`, { gear: true }, { ghost: "Select" }, { split: o.createDisabled ? "Create (not yet)" : "Create", disabled: o.createDisabled }, { cancel: true }],
  note: () => ["Click what the note is about", { cancel: true }],
};

// Geometry (round-4 section 3.1): the x offset (from the bar's left edge) of
// every control, so a flyout or a menu can be anchored to it. Padding 8, gap
// 8, tool 32, chevron 16 one px after it, divider 1, view-mode button 40.
// 465 px without Time, 505 with it.
export const GAP = 8;
export const TOOL = 32, CHEVRON = 16, MODE_W = 40;
export function geometry(o = {}) {
  let x = 8;
  const at = {};
  let first = true;
  for (const t of TOOLS) {
    if (t.timeOnly && !o.time) continue;
    if (!first) x += GAP;
    first = false;
    if (t.divider) { x += 1; continue; }
    if (t.mode) { at.mode = x; x += MODE_W; continue; }
    const w = TOOL + (t.chevron ? 1 + CHEVRON : 0);
    at[t.id] = { x, w, chevronX: x + TOOL + 1 };
    x += w;
  }
  return { at, width: x + 8 };
}

// Fresh-session faces (decision T2). A screen may override per tool.
export const FACES = { select: "Select", filter: "By values", path: "Shortest route", groups: "Communities", rank: "Connections", structure: "Separate pieces" };
