// Screen 4: the Rank tool armed, its secondary bar, the flyout and the
// parameters popover (round-2/screens.md), on College football. Nothing has
// run; every flyout row prints its cost before the click. The popover opens
// beside the flyout's Bridges row (the generator anchors it; the flyouts of
// the right-hand tools leave no room on the right, so it opens to the left
// with a caret pointing at the row). The legend is on but hidden while the
// flyout and the popover are open.
import { DATASET_ROW, conferenceFills, conferenceTreeRow, conferenceLegendBlock, datasetInspector } from "../football-state.mjs";

export default {
  id: 4,
  title: "Rank armed, the secondary bar, the flyout and the parameters popover",
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
      legend: { blocks: [conferenceLegendBlock()] },
      popover: {
        title: "Bridges", anchorRow: "Bridges",
        rows: [
          { type: "text", text: "On what is showing, 115 nodes" },
          { type: "switch", label: "Weights", on: false, second: { label: "Direction", select: "As loaded" } },
          { type: "switch", label: "Exact", on: true },
          { type: "number", label: "Sample", fields: [{ value: "2,000", disabled: true }] },
          { type: "text", text: "About 2 s" },
        ],
        footer: [{ label: "Run" }],
      },
      dock: { open: false },
    },
  },
  toolbar: {
    active: "select", armed: "rank", mode: "2D",
    openFlyout: "rank", flyoutPressed: "Bridges",
    faces: { rank: "Bridges" },
    secondary: { tool: "rank", variant: "Bridges", scope: "what is showing", count: "115", cost: "about 2 s" },
  },
  inspector: datasetInspector("Overview"),
  status: { counts: { nodes: 115, edges: 613 }, layout: "Spread out: settled", tool: "Rank: Bridges", zoom: "100%" },
  caption: {
    title: "Screen 4 of 15: Rank armed, the secondary bar, the flyout and the parameters popover.",
    text: "Nothing has run. Look at: Rank with the brand fill; the secondary bar reading the whole sentence (what, on what, how many, the cost) with Run as its one light button and Cancel; the flyout above it with the Measure icon on every row, the technical name beside the plain one, the cost at the right and Bridges bold because the bar's select chose it; the unregistered rows (Clustering, Bridges (edges), Unusual nodes) absent, a divider before \"Several...\"; its \"...\" pressed and the light 240 px popover to its left, caret on the row, with the scope line, Weights and Direction on one row, Exact, the disabled Sample and the cost, Run unfilled; the legend hidden while the flyout is open; the status bar's \"Rank: Bridges\"; the Dataset inspector untouched.",
  },
};
