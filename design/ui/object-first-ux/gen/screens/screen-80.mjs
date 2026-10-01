// Screen 80: community evolution (round-3/analysis-results.md, "Community
// evolution"). The Email network, window 2019-03 to 2019-05. Communities was
// run once per month ("Communities over time..." from the Grouping's "..."
// menu or the transport gear's OVER TIME "+"), and each month's groups were
// matched to the previous month's by largest overlap, so a group keeps its
// colour while it lasts. The Groups tab carries the over-time row; its
// settings popover is open beside it; the Table dock is on Findings with the
// flow chart of groups across months (an alluvial chart: one band per group,
// splits and merges as forks) above the events (form, split, merge,
// dissolve). Event figures are invented.

import { NODES, DEGREE, COMMUNITIES } from "../email.mjs";
import { OKABE_8, OTHER } from "../palettes.mjs";

const groupColor = (g) => OKABE_8[g - 1] || OTHER;
const byId = {};
for (const [g, members] of Object.entries(COMMUNITIES)) for (const id of members) byId[id] = { fill: groupColor(Number(g)) };
const SIZES = Object.fromEntries(Object.entries(COMMUNITIES).map(([g, ids]) => [g, ids.length]));
const month = (m) => (m - 1) / 11;
const EVENTS = [
  ["2019-02", "Group 9 forms", "9", "14", "Make a Grouping"],
  ["2019-04", "Group 3 splits into 3 and 10", "10", "61 -> 38 + 23", "Make a Grouping"],
  ["2019-06", "Groups 5 and 6 merge into 5", "9", "40 + 22 -> 62", "Make a Grouping"],
  ["2019-09", "Group 10 dissolves", "8", "23 -> 0", "Make a Grouping"],
  ["2019-09", "Group 2 splits into 2 and 11", "9", "88 -> 51 + 37", "Make a Grouping"],
];

export default {
  id: 80,
  title: "Communities over time",
  theme: "light",
  file: "Email network",
  left: {
    views: { rows: [{ name: "Overview", current: true }] },
    objects: { rows: [
      { kind: "dataset", name: "Email network", nodes: 1204, edges: 5830, locked: true, chip: { type: "locked" }, expanded: true, children: [
        { kind: "grouping", name: "Communities (Louvain)", groups: 9, selected: true, expanded: true, chip: { type: "strip", colors: OKABE_8 }, children: [
          ...[1, 2, 3, 4, 5].map((g) => ({ kind: "group", name: `Group ${g}`, members: SIZES[g], chip: { type: "swatch", color: groupColor(g) } })),
          { kind: "more", name: "Other", members: [6, 7, 8, 9].reduce((t, g) => t + (SIZES[g] || 0), 0), chip: { type: "swatch", color: OTHER } },
        ] },
      ] },
    ] },
  },
  canvas: {
    graph: "email",
    nodes: { default: {}, byId, sizeBy: { values: DEGREE, from: 0.6, to: 2.0 } },
    edges: { default: { width: 1 } },
    overlays: {
      transport: {
        window: "2019-03 to 2019-05", playing: false, speed: "1x", from: "2019-01", to: "2019-12",
        ticks: Array.from({ length: 12 }, (_, i) => month(i + 1)), changes: [month(2), month(4), month(6), month(9)], band: [month(3), month(5)],
        counts: ["412 of 1,204 nodes", "1,910 of 5,830 edges"],
      },
      popover: {
        title: "Communities over time", right: 8, top: 190, caret: "right", caretAt: 151,
        rows: [
          { type: "keyValue", pairs: [{ label: "Steps", value: "12, one per month", wide: true }] },
          { type: "select", label: "Match by", value: "Largest overlap" },
          { type: "number", label: "At least", fields: [{ value: "30", suffix: "%" }] },
          { type: "switch", label: "Colours", on: true, note: "kept stable" },
          { type: "text", text: "About 4 s x 12, on the CPU" },
        ],
        footer: [{ label: "Re-run" }, { label: "Open in table" }],
      },
      dock: {
        open: true, tab: "Table", height: 312,
        chart: {
          type: "alluvial", height: 112, title: "Groups by month: band height is members; forks are splits and merges",
          steps: ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"], window: [2, 4],
          groups: [
            { color: groupColor(1), sizes: Array(12).fill(120) },
            { color: groupColor(2), sizes: [88, 88, 88, 88, 88, 88, 88, 88, 51, 51, 51, 51] },
            { color: "#8c8c8c", sizes: [0, 0, 0, 0, 0, 0, 0, 0, 37, 37, 37, 37], from: 1 },
            { color: groupColor(3), sizes: [61, 61, 61, 38, 38, 38, 38, 38, 38, 38, 38, 38] },
            { color: "#c9a0dc", sizes: [0, 0, 0, 23, 23, 23, 23, 23, 0, 0, 0, 0], from: 3 },
            { color: groupColor(5), sizes: [40, 40, 40, 40, 40, 62, 62, 62, 62, 62, 62, 62] },
            { color: groupColor(6), sizes: [22, 22, 22, 22, 22, 0, 0, 0, 0, 0, 0, 0], into: 5 },
            { color: groupColor(9) || "#cc79a7", sizes: [0, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14] },
          ],
        },
        table: {
          tabs: [{ label: "Nodes 1,204" }, { label: "Edges 5,830" }, { label: "Findings 2", selected: true }],
          showing: "Communities over time: 5 events",
          columns: [
            { label: "Month", width: "88px", sorted: true },
            { label: "Event", width: "248px" },
            { label: "Groups", width: "72px" },
            { label: "Members", width: "128px" },
            { label: "", width: "1fr" },
          ],
          rows: EVENTS.map((r) => [...r.slice(0, 4), { buttons: ["Make a Grouping"] }]),
          selectedRow: 1,
        },
      },
    },
  },
  toolbar: { active: "select", mode: "2D" },
  inspector: {
    kind: "Grouping", name: "Communities (Louvain)",
    actions: [{ icon: "eye", on: true }, { icon: "unlock" }, { icon: "more", title: "Communities over time..., Collapse groups, Compare with..." }],
    chip: { type: "strip", colors: OKABE_8 }, summary: "9 groups",
    reading: "The groups are clearly separated (modularity 0.58).",
    tabs: ["Groups", "Define", "Style", "Record"], tab: "Groups",
    rows: [
      { type: "keyValue", pairs: [{ label: "Modularity", value: "0.58", note: "a clear split", wide: true }] },
      { type: "keyValue", pairs: [{ label: "Sizes", value: Object.values(SIZES).sort((a, b) => b - a).slice(0, 5).join(", ") + ", ...", wide: true }] },
      { type: "select", label: "Largest", value: "5", note: "rest as Other" },
      { type: "select", label: "Names from", value: "none", wideLabel: true },
      { type: "section", title: "Over time", count: "12 steps" },
      { type: "keyValue", pairs: [{ label: "Events", value: "1 forms, 2 split, 1 merge, 1 ends", wide: true }] },
      { type: "button", buttons: [{ label: "Make a Grouping from this month" }] },
      { type: "section", title: "Findings", plus: true },
    ],
  },
  status: { counts: { nodes: 1204, edges: 5830 }, mask: { text: "2019-03 to 2019-05: 412 of 1,204" }, layout: "Spread out: settled", zoom: "100%" },
  caption: {
    title: "Screen 80: communities over time.",
    text: "Communities was run once per month and each month's groups matched to the last by largest overlap. Look at: the Groups tab's OVER TIME section (12 steps; 1 forms, 2 split, 1 merge, 1 ends) with \"Make a Grouping from this month\"; the settings beside it (steps, Match by, the 30% threshold below which a group counts as new, Keep colours) ; the transport bar's marks at the four event months; the Table dock's Findings tab with the flow chart of groups across months (one band per group, the splits in April and September and the June merge as forks, the window shaded) above each event with the members that moved and a \"Make a Grouping\" per row. The canvas keeps the tracked colours, so a group that survives a month is the same colour before and after. The entry is the Grouping's \"...\" menu (\"Communities over time...\") or the gear's OVER TIME \"+\".",
  },
};
