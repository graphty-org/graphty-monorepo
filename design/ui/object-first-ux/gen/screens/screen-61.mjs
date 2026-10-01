// Screen 61: Filter by rule (round-3/filters-sets.md, "Filter by an expression or by
// several rules").
// Karate Club after Rank > Connections and Groups > Communities. The Filter tool is armed on
// By rule; the popover is in Build mode: Match [All | Any], two rule lines (the second one
// negated), "+ Rule", the live count. The inspector shows an earlier rule Set, "Big hubs", in
// Expression mode while the reader edits it: the typed rule, an inline error at the misspelt
// name, the autocomplete list, and the members kept from the last valid rule. Counts are
// derived from karate.mjs.
import { DEGREE, COMMUNITIES } from "../karate.mjs";
import { OKABE_4 } from "../palettes.mjs";

const g2 = new Set(COMMUNITIES[2]);
const ids = Object.keys(DEGREE).map(Number);
const match = ids.filter((id) => DEGREE[id] >= 5 && !g2.has(id));
const hubs = ids.filter((id) => DEGREE[id] >= 10);
const commOf = {};
for (const [g, m] of Object.entries(COMMUNITIES)) for (const id of m) commOf[id] = Number(g);

const byId = {};
for (const id of ids) {
  byId[id] = { fill: OKABE_4[commOf[id] - 1] };
  if (!match.includes(id)) byId[id].opacity = 0.25;
  if (hubs.includes(id)) byId[id].outline = { color: "ink", width: 2 };
}

export default {
  id: 61,
  title: "Filter by rule, built or typed",
  theme: "light",
  file: "Karate Club",
  left: {
    views: { rows: [{ name: "Overview", current: true }] },
    objects: { rows: [
      { kind: "dataset", name: "Karate Club", nodes: 34, edges: 78, locked: true, chip: { type: "locked" }, expanded: true, children: [
        { kind: "set", name: "Big hubs", nodes: hubs.length, chip: { type: "ring", color: "ink" }, selected: true },
        { kind: "measure", name: "Connections (Degree)", values: 34, chip: { type: "size" } },
        { kind: "grouping", name: "Communities (Louvain)", groups: 4, expanded: false, chip: { type: "strip", colors: OKABE_4 } },
      ] },
    ] },
  },
  canvas: {
    nodes: { sizeBy: "degree", byId },
    edges: { default: { width: 1, opacity: 0.35 } },
    overlays: {
      popover: {
        title: "Filter by rule",
        left: 196, bottom: 124, caret: "bottom", caretAt: 54, width: 300,
        rows: [
          { type: "segmented", label: "Write", options: ["Build", "Expression"], value: "Build" },
          { type: "segmented", label: "Target", options: ["Nodes", "Edges"], value: "Nodes" },
          { type: "text", text: "On what is showing, 34 nodes" },
          { type: "segmented", label: "Match", options: ["All", "Any"], value: "All" },
          { type: "ruleLine", field: "Connections", op: ">=", value: "5" },
          { type: "ruleLine", not: true, field: "Communities", op: "is", value: "2" },
          { type: "link", text: "+ Rule", chevron: false },
          { type: "text", text: `Matches ${match.length} nodes`, secondary: false },
          { type: "note", text: "Expression shows the same rule as text." },
        ],
        footer: [{ label: "Create", primary: true }],
        carriesPrimary: true,
      },
      dock: { open: false },
    },
  },
  toolbar: {
    active: "select", armed: "filter", mode: "2D", faces: { filter: "By rule" },
    secondary: { tool: "filter", variant: "By rule", count: String(match.length) },
  },
  inspector: {
    kind: "Set", name: "Big hubs",
    chip: { type: "ring", color: "ink" }, summary: { nodes: hubs.length },
    reading: `${hubs.length} of 34 members have 10 or more connections.`,
    tabs: ["Define", "Members", "Style", "Record"], tab: "Define",
    framing: "100%",
    rows: [
      { type: "segmented", label: "Write", options: ["Build", "Expression"], value: "Expression" },
      { type: "textarea", mono: true, lines: ["[Connections] >= 10", "and [Comunities] != 1"], caret: true, error: { line: 1, from: 4, to: 17, text: "No name [Comunities]. Did you mean [Communities]?" },
        suggest: [{ label: "[Communities]", note: "Grouping", highlighted: true }, { label: "[Connections]", note: "Measure" }, { label: "contains( )", note: "function" }] },
      { type: "text", text: `Keeps the last valid rule: ${hubs.length} nodes` },
      { type: "switch", label: "Invert", on: false },
      { type: "select", label: "Within", value: "Everything" },
      { type: "text", text: "Re-filters on Enter" },
    ],
  },
  status: { counts: { nodes: 34, edges: 78 }, layout: "Spread out: settled", tool: "Filter: By rule", selection: `${hubs.length} selected`, zoom: "100%" },
  caption: {
    title: "Screen 61: Filter by rule, built in the popover and typed in a Set's Define tab.",
    text: `Look at: the By rule popover in Build mode: Write [Build | Expression], Target, the scope line, Match [All | Any] (All is AND, Any is OR), two rule lines, each [Not] [attribute or object] [operator] [value] [x], the second with Not pressed, "+ Rule", the live "Matches ${match.length} nodes"; the canvas previewing those nodes; the inspector on the earlier Set "Big hubs" switched to Expression: the typed rule in a code field with the misspelt name underlined in red, the error under it naming the likely name, the autocomplete list from the catalogue's names and functions, the members kept from the last valid rule, Invert, Within, and "Re-filters on Enter".`,
  },
};
