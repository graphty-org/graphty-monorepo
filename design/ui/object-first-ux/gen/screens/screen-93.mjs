// Screen 93: styling one node. Screen 9's state (College football,
// BrighamYoung, the top ten by Bridges outlined, sized by Bridges, coloured by
// conference); from the node's Look section the reader chose "Style this
// node...", which made a one-node Set at the top of the tree (so it paints
// above everything) and opened its Style tab; picking Colour wrote a magenta
// override above the colour it inherits from Conference. Only BrighamYoung
// changes.
import screen9 from "./screen-9.mjs";
import { NODES } from "../football.mjs";
import { CONF_COLOR, CONF_OF, conferenceLegendBlock } from "../football-state.mjs";
import { HIGHLIGHT } from "../palettes.mjs";

const ME = NODES.find((n) => n.label === "BrighamYoung").id;
const MAGENTA = HIGHLIGHT.magenta;
const byId = { ...screen9.canvas.nodes.byId, [ME]: { ...screen9.canvas.nodes.byId[ME], fill: MAGENTA } };
const [root] = screen9.left.objects.rows;
const tree = [{ ...root, children: [
  { kind: "set", name: "BrighamYoung", nodes: 1, chip: { type: "swatch", color: MAGENTA }, selected: true },
  ...root.children.map((c) => ({ ...c, childSelected: true })),
] }];

export default {
  ...screen9,
  id: 93,
  title: "Styling one node",
  left: { ...screen9.left, objects: { rows: tree } },
  canvas: {
    ...screen9.canvas,
    nodes: { ...screen9.canvas.nodes, byId },
    overlays: {
      legend: { blocks: [conferenceLegendBlock(), { title: "BrighamYoung", rows: [{ chip: { type: "swatch", color: MAGENTA }, label: "1 node" }] }] },
      dock: { open: false },
    },
  },
  inspector: {
    kind: "Set", name: "BrighamYoung", sub: "one node",
    chip: { type: "swatch", color: MAGENTA }, summary: "1 node",
    reading: "One node, styled on its own; it paints above every other object.",
    tabs: ["Define", "Members", "Style", "Record"], tab: "Style",
    rows: [
      { type: "section", title: "Nodes", plus: true },
      { type: "swatchHex", label: "Colour", color: MAGENTA, hex: MAGENTA, opacity: "100", override: true, actions: ["eye", "minus"] },
      { type: "swatchHex", label: "Colour", color: CONF_COLOR[CONF_OF[ME]], inherited: "Conference", lock: true },
      { type: "swatchHex", label: "Size", color: "#b3b3b3", inherited: "Bridges", lock: true },
      { type: "swatchHex", label: "Outline", color: "#1e1e1e", inherited: "Top 10", lock: true },
      { type: "section", title: "Edges", plus: true },
      { type: "keyValue", pairs: [{ label: "Saved style", value: "None", action: "Save..." }] },
      { type: "note", text: "Add a channel with Nodes +; click an inherited chit to override it here. Delete this Set, or its minus, to return the node to its objects' look." },
    ],
  },
  status: { counts: { nodes: 115, edges: 613 }, layout: "Spread out: settled", selection: "1 selected", zoom: "Fit" },
  caption: {
    title: "Screen 93: styling one node.",
    text: "From BrighamYoung's inspector, Look > \"+\" > \"Style this node...\" (screen 9 draws the Look row; the node's right-click menu has the same row). Look at: a one-node Set \"BrighamYoung\" at the top of the tree, selected, painting above Top 10, Bridges and Conference; its Style tab lists the node's look channel by channel: the new Colour override (magenta, with its eye and minus) above the Colour it inherits from Conference, then Size from Bridges and Outline from Top 10 as locked inherited rows, each of which becomes an override on a click; only BrighamYoung turned magenta; the legend gains a one-row block for the Set. The Saved style row saves this look for other objects (screen 94).",
  },
};
