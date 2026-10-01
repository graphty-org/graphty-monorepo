// Screen 59: Filter by values (round-3/filters-sets.md, "Filter by attribute values").
// College football. The Filter tool is armed on its face, By values; the parameters popover
// is open above the Filter button (the Filter tool always opens it, revision.md 3.5): Target,
// the scope line, Attribute [value], a search field, All / None, the value checklist with
// counts, the live count and Create. The canvas previews the dry run: the 23 matching teams
// (conference values 2 and 9) at full strength, the rest at 25 percent. The inspector shows
// the Dataset's Data tab, the second door to the same popover (a column's "..." > Filter by).
// Counts are the real ones from football.mjs.
import { NODES, COMMUNITIES } from "../football.mjs";
import { DATASET_ROW, conferenceFills, conferenceTreeRow, CONF_OF } from "../football-state.mjs";

const PICKED = [2, 9];
const byId = conferenceFills();
for (const nd of NODES) if (!PICKED.includes(CONF_OF[nd.id])) byId[nd.id].opacity = 0.25;
const matches = PICKED.reduce((t, v) => t + COMMUNITIES[v].length, 0); // 23

// The checklist, value order; the popover scrolls past the seventh row.
const values = Object.keys(COMMUNITIES).map(Number).sort((a, b) => a - b);
const checks = values.slice(0, 7).map((v) => ({ type: "checkbox", items: [{ label: `${v}  (${COMMUNITIES[v].length} nodes)`, checked: PICKED.includes(v) }] }));

export default {
  id: 59,
  title: "Filter by values",
  theme: "light",
  file: "College football",
  left: {
    views: { rows: [{ name: "Overview", current: true }] },
    objects: { rows: [{ ...DATASET_ROW, children: [conferenceTreeRow()] }] },
  },
  canvas: {
    graph: "football",
    nodes: { default: {}, byId },
    edges: { default: { width: 1, opacity: 0.35 } },
    overlays: {
      popover: {
        title: "Filter by values",
        left: 196, bottom: 124, caret: "bottom", caretAt: 54,
        rows: [
          { type: "segmented", label: "Target", options: ["Nodes", "Edges"], value: "Nodes" },
          { type: "text", text: "On what is showing, 115 nodes" },
          { type: "select", label: "Attribute", value: "value" },
          { type: "field", label: "Find", placeholder: "Search values", icon: "search" },
          { type: "button", label: "2 of 12 chosen", buttons: [{ label: "All", ghost: true }, { label: "None", ghost: true }] },
          ...checks,
          { type: "text", text: "and 5 more (scroll)" },
          { type: "switch", label: "Invert", on: false },
          { type: "text", text: `Matches ${matches} nodes`, secondary: false },
        ],
        footer: [{ label: "Create", primary: true }],
        carriesPrimary: true,
      },
      dock: { open: false },
    },
  },
  toolbar: {
    active: "select", armed: "filter", mode: "2D",
    secondary: { tool: "filter", variant: "By values", count: String(matches) },
  },
  insets: [{
    tag: "After Create: the new Set and its Define tab", left: 928, top: 16, width: 256,
    title: "Set  value is 2 or 9",
    rows: [
      { type: "keyValue", pairs: [{ label: "Tree", value: "value is 2 or 9", note: "23 nodes", wide: true }] },
      { type: "keyValue", pairs: [{ label: "Made by", value: "Filter, by values", wide: true }] },
      { type: "select", label: "Values", value: "2, 9  (2 of 12)" },
      { type: "text", text: "The tool snaps back to Select; screen 60 draws this Define tab in full." },
    ],
  }],
  inspector: {
    kind: "Dataset", name: "College football",
    actions: [{ icon: "plus", title: "Add data" }, { icon: "more" }],
    chip: { type: "locked" }, summary: "football.gml, GML",
    reading: "115 teams joined by 613 games in one connected part",
    tabs: ["Overview", "Layout", "Canvas", "Data"], tab: "Data",
    framing: "100%",
    rows: [
      { type: "section", title: "Attributes", count: "3", plus: true },
      { type: "attribute", dtype: "text", name: "label", filled: "100%" },
      { type: "attribute", dtype: "number", name: "value", filled: "100%" },
      { type: "attribute", dtype: "number", name: "id", filled: "100%" },
      { type: "note", text: "A column's \"...\" > Filter by opens this same popover with the column chosen: By values for a column with few distinct values, By range for a number column." },
      { type: "select", label: "Time", value: "none" },
      { type: "disclosure", title: "Made by", summary: "football.gml, GML" },
    ],
  },
  status: { counts: { nodes: 115, edges: 613 }, layout: "Spread out: settled", tool: "Filter: By values", zoom: "100%" },
  caption: {
    title: "Screen 59: Filter by values, with the live count.",
    text: "Look at: Filter armed (brand fill) and its bar \"Filter by values  Options  Matches 23 nodes  Select  Create  Create and focus  Cancel\", whose Create dims while the popover carries the filled Create; the popover above the Filter button, caret on it: Target Nodes | Edges, the scope line, Attribute [value], a search field for long value lists, All / None with \"2 of 12 chosen\", one checkbox per value with its count from the element (values 2 and 9 ticked: 11 + 12 teams), Invert, the live count and Create; the canvas previews the dry run (the 23 matches at full strength, the rest faded) without creating anything; the inspector's Data tab, whose column \"...\" > Filter by is the second door. The inset is the moment after Create: the tool snaps back and a Set \"value is 2 or 9\" appears; screen 60 shows its Define tab.",
  },
};
