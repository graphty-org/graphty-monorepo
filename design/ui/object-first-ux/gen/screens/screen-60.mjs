// Screen 60: Filter by range over a histogram (round-3/filters-sets.md).
// College football, a little later than screen 59: the reader created "value is 2 or 9"
// there (the Set is selected, so the inspector shows its Define tab, the rule Set's editable
// home), then ran Rank > Bridges, and has now armed Filter > By range. The popover chooses
// the Bridges Measure (a Measure is listed beside the attributes), draws its histogram, and
// the band Min 0.015 to Max 0.034 keeps the top 38 teams. Create on a Measure waits on #192,
// so the popover offers Select and a disabled Create. Numbers are real (football.mjs).
import { NODES, BETWEENNESS, COMMUNITIES } from "../football.mjs";
import { DATASET_ROW, conferenceFills, conferenceTreeRow, CONF_OF } from "../football-state.mjs";

const MIN = 0.015;
const inBand = (id) => BETWEENNESS[id] >= MIN;
const matches = NODES.filter((n) => inBand(n.id)).length; // 38
const SET = [2, 9];
const setSize = SET.reduce((t, v) => t + COMMUNITIES[v].length, 0);

const byId = conferenceFills();
for (const nd of NODES) {
  if (!inBand(nd.id)) byId[nd.id].opacity = 0.25;
  if (SET.includes(CONF_OF[nd.id])) byId[nd.id].outline = { color: "ink", width: 2 };
}

// 16 bins over the real betweenness values, normalised to the tallest bin.
const vals = Object.values(BETWEENNESS), lo = Math.min(...vals), hi = Math.max(...vals);
const bins = Array(16).fill(0);
for (const v of vals) bins[Math.min(15, Math.floor(((v - lo) / (hi - lo)) * 16))]++;
const top = Math.max(...bins);

export default {
  id: 60,
  title: "Filter by range over a histogram",
  theme: "light",
  file: "College football",
  left: {
    views: { rows: [{ name: "Overview", current: true }] },
    objects: { rows: [{ ...DATASET_ROW, children: [
      { kind: "set", name: "value is 2 or 9", nodes: setSize, chip: { type: "ring", color: "ink" }, selected: true },
      { kind: "measure", name: "Bridges (Betweenness)", values: 115, chip: { type: "size" } },
      conferenceTreeRow(),
    ] }] },
  },
  canvas: {
    graph: "football",
    nodes: { default: {}, byId },
    edges: { default: { width: 1, opacity: 0.35 } },
    overlays: {
      popover: {
        title: "Filter by range",
        left: 196, bottom: 124, caret: "bottom", caretAt: 54,
        rows: [
          { type: "segmented", label: "Target", options: ["Nodes", "Edges"], value: "Nodes" },
          { type: "text", text: "On what is showing, 115 nodes" },
          { type: "select", label: "Of", value: "Bridges (Measure)" },
          { type: "histogram", bars: bins.map((b) => b / top), scale: "linear", band: [(MIN - lo) / (hi - lo), 1], ends: [lo.toFixed(3), hi.toFixed(3)] },
          { type: "number", fields: [{ caption: "Min", value: "0.015" }, { caption: "Max", value: "0.034" }] },
          { type: "switch", label: "Invert", on: false },
          { type: "text", text: `Matches ${matches} nodes`, secondary: false },
          { type: "note", text: "Drag across the histogram to set the band; its handles move Min and Max. Create on a Measure waits on #192; Select works today." },
        ],
        footer: [{ label: "Select" }, { label: "Create", primary: true, disabled: true }],
        carriesPrimary: true,
      },
      dock: { open: false },
    },
  },
  toolbar: {
    active: "select", armed: "filter", mode: "2D", faces: { filter: "By range" },
    secondary: { tool: "filter", variant: "By range", count: String(matches), createDisabled: true },
  },
  inspector: {
    kind: "Set", name: "value is 2 or 9",
    chip: { type: "ring", color: "ink" }, summary: { nodes: setSize },
    reading: "23 of 115 teams have value 2 or 9.",
    tabs: ["Define", "Members", "Style", "Record"], tab: "Define",
    framing: "100%",
    rows: [
      { type: "keyValue", pairs: [{ label: "Made by", value: "Filter, by values", wide: true }] },
      { type: "segmented", label: "Target", options: ["Nodes", "Edges"], value: "Nodes" },
      { type: "select", label: "Attribute", value: "value" },
      { type: "select", label: "Values", value: "2, 9  (2 of 12)" },
      { type: "link", text: "+ Rule", chevron: false },
      { type: "switch", label: "Invert", on: false },
      { type: "select", label: "Within", value: "Everything" },
      { type: "disclosure", title: "Advanced", summary: "none" },
      { type: "text", text: "Live: an edit re-filters at once" },
    ],
  },
  status: { counts: { nodes: 115, edges: 613 }, layout: "Spread out: settled", tool: "Filter: By range", selection: `${setSize} selected`, zoom: "100%" },
  caption: {
    title: "Screen 60: Filter by range over a histogram, beside the Define tab of the Set screen 59 made.",
    text: "Look at: the By range popover with \"Of [Bridges (Measure)]\" (every numeric attribute and every Measure in the tree), the histogram of the real betweenness values with lin | log and the dragged band tinted between its two handles, the Min / Max fields the band writes, Invert, the live \"Matches 38 nodes\", Select live and Create disabled while #192 is open (in the popover and in the bar, which reads \"Create (not yet)\"); the canvas previewing the 38 matches, the rest faded, the earlier Set's ink outlines still painted; the inspector showing that earlier Set \"value is 2 or 9\" on its Define tab: Made by, Target, Attribute, the chosen values as one editable select, \"+ Rule\" to add an AND line, Invert, Within, Advanced and the Live word.",
  },
};
