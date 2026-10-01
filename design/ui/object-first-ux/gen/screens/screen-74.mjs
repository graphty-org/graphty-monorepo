// Screen 74: a batch run and a parameter sweep (round-3/analysis-results.md,
// "Batch and sweep"). College football. The Rank flyout is open with
// "Several..." pressed and its checklist popover beside it; below, the Table
// dock is open on its Findings tab showing the result of an earlier Groups >
// Sweep... of Communities' resolution, one row per value. The sweep numbers
// are plausible for Louvain on this graph, not computed.

import { DATASET_ROW, conferenceFills, conferenceTreeRow, datasetInspector } from "../football-state.mjs";

const SWEEP = [
  ["0.50", "7", "0.554", "24", "9"],
  ["0.75", "9", "0.588", "19", "7"],
  ["1.00", "10", "0.602", "15", "5"],
  ["1.25", "11", "0.596", "14", "4"],
  ["1.50", "12", "0.581", "13", "4"],
].map((r) => [...r, { buttons: ["Make an object"] }]);

const overview = datasetInspector("Overview");
// The Overview's FINDINGS section carries the sweep's door row.
const rows = overview.rows.map((r) => (r.type === "emptyPlus" && /Findings/i.test(r.title)
  ? [{ type: "section", title: "Findings", count: "1", plus: true }, { type: "keyValue", pairs: [{ label: "Sweep", value: "5 values", action: "Open in table", wide: true }] }]
  : [r])).flat();

export default {
  id: 74,
  title: "Several runs at once, and a parameter sweep",
  theme: "light",
  file: "College football",
  left: {
    views: { rows: [{ name: "Overview", current: true }] },
    objects: { rows: [{ ...DATASET_ROW, children: [conferenceTreeRow()] }] },
  },
  canvas: {
    graph: "football",
    nodes: { default: {}, byId: conferenceFills() },
    edges: { default: { width: 1 } },
    overlays: {
      popover: {
        title: "Rank several", left: 270, top: 196, caret: "right", caretAt: 292,
        rows: [
          { type: "text", text: "On what is showing, 115 nodes" },
          { type: "checkbox", items: [{ label: "Connections  instant", checked: true }] },
          { type: "checkbox", items: [{ label: "Bridges  about 2 s", checked: true }] },
          { type: "checkbox", items: [{ label: "Reach  about 2 s", checked: true }] },
          { type: "checkbox", items: [{ label: "Influence  instant", checked: false }] },
          { type: "note", text: "3 chosen, about 4 s in all. The first paints; the rest arrive with their eye off." },
        ],
        footer: [{ label: "Create 3", primary: true }],
        carriesPrimary: true,
      },
      dock: {
        open: true, tab: "Table", height: 240,
        table: {
          tabs: [{ label: "Nodes 115" }, { label: "Edges 613" }, { label: "Findings 1", selected: true }],
          showing: "Sweep: Communities, resolution",
          columns: [
            { label: "Resolution", width: "96px", sorted: true },
            { label: "Groups", width: "72px" },
            { label: "Modularity", width: "96px" },
            { label: "Largest", width: "72px" },
            { label: "Smallest", width: "72px" },
            { label: "", width: "1fr" },
          ],
          rows: SWEEP,
          selectedRow: 2,
        },
      },
    },
  },
  toolbar: {
    active: "select", armed: "rank", mode: "2D",
    openFlyout: "rank", flyoutPressed: "Several...",
    secondary: { tool: "rank", variant: "Several...", scope: "what is showing", count: "115", cost: "about 4 s" },
  },
  inspector: { ...overview, rows },
  status: { counts: { nodes: 115, edges: 613 }, layout: "Spread out: settled", tool: "Rank: several", zoom: "100%" },
  caption: {
    title: "Screen 74: several runs at once, and a parameter sweep.",
    text: "Two ways of running many things. Look at: Rank armed, its flyout open with \"Several...\" pressed and the checklist beside it, every row with its cost, the total, and one filled button \"Create 3\" (the bar's Run dims while the popover carries the primary) (after it: three Measure rows appear at once, the first computing, the others reading \"queued, 2nd\" and \"queued, 3rd\", and the status bar reads \"Computing 1 of 3 [Cancel all]\"). Below, the Table dock on its new Findings tab showing an earlier Groups > Sweep... of Communities' resolution from 0.50 to 1.50 in 5 steps: one row per value with groups, modularity and group sizes, the best modularity row highlighted, and \"Make an object\" turning one row into a normal Communities row. The sweep is a Finding, not a tree row; its door is the Overview's FINDINGS row \"Sweep  5 values  Open in table\".",
  },
};
