// Screen 88: which nodes get labels, from which column, and how labels look.
// College football with the objects of screen 9 (Top 10 by Bridges, Bridges,
// Conference); the Dataset's Canvas tab with the Labels gear pressed, which
// opens the Labels popover: which nodes, the text, the style, overlaps. The
// six labels drawn are the top six teams by real betweenness.
import { NODES, BETWEENNESS } from "../football.mjs";
import { DATASET_ROW, CONF_STRIP, conferenceFills, conferenceLegendBlock, datasetInspector } from "../football-state.mjs";

const ranked = NODES.map((x) => x.id).sort((a, b) => BETWEENNESS[b] - BETWEENNESS[a]);
const TOP6 = ranked.slice(0, 6);
const TOP10 = ranked.slice(0, 10);
const byId = conferenceFills();
for (const id of TOP10) byId[id].outline = { color: "ink", width: 2 };

export const FOOTBALL = {
  file: "College football",
  left: {
    views: { rows: [{ name: "Overview", current: true }] },
    objects: { rows: [
      { ...DATASET_ROW, children: [
        { kind: "set", name: "Top 10 by Bridges", nodes: 10, chip: { type: "ring", color: "ink" } },
        { kind: "measure", name: "Bridges (Betweenness)", values: 115, chip: { type: "size" } },
        { kind: "grouping", name: "Conference", groups: 12, expanded: false, chip: CONF_STRIP },
      ] },
    ] },
  },
  canvas: {
    graph: "football",
    nodes: { default: {}, byId, sizeBy: { values: BETWEENNESS, from: 0.8, to: 2.4 } },
    edges: { default: { width: 1 } },
    labels: TOP6,
    overlays: { legend: { blocks: [conferenceLegendBlock()] }, dock: { open: false } },
  },
  toolbar: { active: "select", mode: "2D" },
};
const { rows: _overview, ...DS } = datasetInspector("Canvas");
export const FOOTBALL_DATASET = DS;
export const CANVAS_ROWS = [
  { type: "swatchHex", label: "Background", color: "#f5f5f5", value: "Follow theme" },
  { type: "select", label: "Look", value: "Default" },
  { type: "select", label: "Labels", value: "Top 6 by Bridges", gear: true },
  { type: "select", label: "Edge labels", value: "None" },
  { type: "select", label: "Tooltip", value: "Label + 3 values", gear: true },
  { type: "switch", label: "Legend", on: true, second: { label: "Minimap", on: false } },
  { type: "switch", label: "Note markers", on: true, wide: true },
  { type: "switch", label: "Show hidden faintly", on: false, wide: true },
  { type: "section", title: "Default look", plus: true },
];

export default {
  id: 88,
  title: "Label choices and the Labels popover",
  theme: "light",
  ...FOOTBALL,
  canvas: {
    ...FOOTBALL.canvas,
    overlays: {
      ...FOOTBALL.canvas.overlays,
      // Beside the Labels row, the tab's third row (256 px down the frame).
      popover: {
        title: "Labels", anchor: { inspectorRow: 2, side: "left", align: "start", dx: -8, dy: -36 }, caret: "right",
        rows: [
          { type: "select", label: "Show", value: "Top N by a value" },
          { type: "select", label: "By", value: "Bridges", note: "top 6" },
          { type: "select", label: "Text from", value: "label" },
          { type: "section", title: "Text" },
          { type: "field", label: "Size", value: "11", suffix: "px" },
          { type: "swatchHex", label: "Colour", color: "ink", value: "Theme ink" },
          { type: "swatchHex", label: "Backing", color: "#ffffff", value: "4 px, 80%" },
          { type: "select", label: "Place", value: "Right of node" },
          { type: "number", fields: [{ caption: "Wrap at (characters)", value: "20" }, { caption: "Lines", value: "2" }] },
          { type: "switch", label: "Face the camera", on: true, wide: true },
          { type: "switch", label: "Fade with distance", on: false, wide: true },
          { type: "switch", label: "Avoid overlaps", on: true, wide: true, caption: "where two collide, the lower-ranked hides" },
        ],
      },
    },
  },
  inspector: { ...FOOTBALL_DATASET, rows: CANVAS_ROWS },
  status: { counts: { nodes: 115, edges: 613 }, layout: "Spread out: settled", zoom: "Fit" },
  caption: {
    title: "Screen 88: label choices and the Labels popover.",
    text: "The Canvas tab's Labels row reads \"Top 6 by Bridges\"; its gear opens this popover. Look at: Show (None, All, Selected only, Top N by a value, Members of a Set), By [Bridges] with the count, Text from [label] (any column, or the id); then the text's size, colour and backing, Place (right, below, centre), Wrap at 20 characters on 2 lines (longer names are cut with an ellipsis), Face the camera (for 3D), Fade with distance, and Avoid overlaps, whose caption says what yields. The six labels on the canvas are the six top teams by betweenness. Edge labels is the next row: None, or a column of the edges. A Set's Style tab can add its own Label row, which wins on its members.",
  },
};
