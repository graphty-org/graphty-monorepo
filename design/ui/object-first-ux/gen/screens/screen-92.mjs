// Screen 92: the channel menus and a Shape block. Screen 7's state (College
// football, the Conference grouping selected on its Style tab); the reader
// pressed NODES "+" and chose Shape, so a Shape block bound to the same
// conferences now sits under Colour, and the canvas draws each conference's
// nodes as its shape (flat silhouettes of the meshes), the legend with a
// shape beside each swatch. The "+" menu is drawn beside the section, tagged
// as the moment before.
import screen7 from "./screen-7.mjs";
import { menuItems } from "./screen-83.mjs";
import { CONF_OF } from "../football-state.mjs";

const SHAPES = ["Sphere", "Box", "Cone", "Cylinder", "Diamond"];
const colour = screen7.inspector.rows.find((r) => r.type === "block");
const groups = screen7.inspector.rows.filter((r) => r.type === "groupSwatch").slice(0, 5);
const shapeOf = Object.fromEntries(groups.map((g, i) => [g.name, SHAPES[i].toLowerCase()]));
const byId = {};
for (const [id, v] of Object.entries(screen7.canvas.nodes.byId)) byId[id] = { ...v, shape: shapeOf[String(CONF_OF[id])] };
const legend = screen7.canvas.overlays.legend;
const shapedLegend = { blocks: legend.blocks.map((b) => ({ ...b, title: "Conference", rows: b.rows.map((r) => ({ ...r, shape: shapeOf[r.label] || "sphere" })) })) };

export default {
  ...screen7,
  id: 92,
  title: "The NODES and EDGES channel menus, and a Shape block",
  canvas: {
    ...screen7.canvas,
    nodes: { ...screen7.canvas.nodes, byId },
    overlays: { ...screen7.canvas.overlays, legend: shapedLegend },
  },
  menus: [{
    tag: "A moment before: NODES +",
    anchor: { inspectorRow: 0, side: "left", align: "start", dx: -8, dy: -30 },
    width: 244,
    rows: menuItems([
        { label: "Colour", disabled: true, reason: "in use" },
        { label: "Opacity" },
        { label: "Size" },
        { label: "Shape", note: "one per group", chosen: true },
        { label: "Outline" },
        { label: "Glow" },
        { label: "Label" },
        { label: "Tooltip" },
        { label: "Marker" },
        { label: "Animation" },
        { label: "More...", note: "wireframe, flat" },
        "-",
        { head: "EDGES + lists: Colour, Opacity, Width, Pattern, Curve, Arrows, Animation, Label" },
      ]),
  }],
  inspector: {
    ...screen7.inspector,
    rows: [
      { type: "section", title: "Nodes", plus: true },
      { ...colour, open: false, summary: "on" },
      { type: "block", label: "Shape", chip: colour.chip, open: true },
      ...groups.map((g, i) => ({ type: "select", label: g.name, value: SHAPES[i] })),
      { type: "text", text: "and 3 more" },
      { type: "select", label: "Other", value: "Sphere" },
      { type: "select", label: "Overflow", value: "Repeat shapes" },
      { type: "section", title: "Edges", plus: true },
    ],
  },
  caption: {
    title: "Screen 92: the NODES and EDGES channel menus, and a Shape block.",
    text: "Screen 7's Conference grouping on its Style tab. The NODES \"+\" menu is drawn beside the section, tagged as the moment before, with Shape highlighted. Look at: every channel a node can take (Colour greyed because this object already writes it; Opacity, Size, Shape, Outline, Glow, Label, Tooltip, Marker, Animation, More... for wireframe and flat), and the EDGES \"+\" list as its footnote; the Colour block collapsed to its header and the new Shape block open: one row per conference with its mesh (the element's 25 node shapes), \"and 3 more\", Other and Overflow. The canvas draws each of the five conferences in its shape (flat silhouettes of the meshes) and the legend adds the shape beside each swatch.",
  },
};
