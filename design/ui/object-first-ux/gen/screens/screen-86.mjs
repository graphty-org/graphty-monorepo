// Screen 86: dragging a node pins it. Node 12 is mid-drag under the grab
// cursor (it and node 17 have been moved by hand); both carry the pin marker,
// the tree gained the system Set "Pinned" (the element's own list of pinned
// nodes, whose Style is the marker), and the Dataset's Layout tab reads
// "Pinned 2 [Unpin all]". Each pinned node carries the pin mark.
import { KARATE, DATASET } from "./screen-83.mjs";
import { nodeAt } from "../render.mjs";

const MOVED = { 12: { x: 905, y: 330 }, 17: { x: 640, y: 730 } };
const byId = { ...KARATE.canvas.nodes.byId };
byId[12] = { ...byId[12], pin: true, label: true, halo: true };
byId[17] = { ...byId[17], pin: true, label: true };

const [root] = KARATE.left.objects.rows;
const tree = [{ ...root, children: [{ kind: "set", name: "Pinned", nodes: 2, system: true, glyph: "pin", glyphTitle: "Its style is the pin mark" }, ...root.children] }];

const spec = {
  id: 86,
  title: "Dragged and pinned nodes",
  theme: "light",
  ...KARATE,
  left: { ...KARATE.left, objects: { rows: tree } },
  canvas: {
    ...KARATE.canvas,
    positions: MOVED,
    nodes: { ...KARATE.canvas.nodes, byId },
    overlays: { ...KARATE.canvas.overlays },
  },
  inspector: {
    ...DATASET, tab: "Layout",
    rows: [
      { type: "select", label: "Layout", value: "Spread out", gear: true },
      { type: "button", label: "Settling 80%", buttons: [{ label: "Pause" }, { label: "Step" }] },
      { type: "button", label: "Re-run", buttons: [{ label: "Same seed" }, { label: "New seed" }] },
      { type: "keyValue", pairs: [{ label: "Pinned", value: "2", action: "Unpin all" }] },
      { type: "select", label: "Apply to", value: "Whole graph" },
      { type: "keyValue", pairs: [{ label: "Dimensions", value: "2D, follows the view", wide: true }] },
      { type: "note", text: "A dragged node stays where it is dropped. Re-running the layout moves every node except the pinned ones. Pin or unpin one node from its inspector (the pin beside Locate) or its right-click menu." },
    ],
  },
  status: { counts: { nodes: 34, edges: 78 }, layout: "Spread out: settling 80%", selection: "1 selected", zoom: "100%" },
  caption: {
    title: "Screen 86: dragged and pinned nodes.",
    text: "With Select active, the reader is dragging node 12 (grab cursor, haloed because a drag selects); node 17 was dropped earlier. Look at: both carry the pin mark at their top right; the tree's system Set \"Pinned 2 nodes\" at the top (secondary italic, the pin glyph), whose members are the pinned nodes and whose Style is the marker, so hiding its eye hides the markers and deleting it unpins all; the Layout tab's \"Pinned 2 [Unpin all]\"; the simulation re-warmed by the drag (\"settling 80%\") and working around the two fixed nodes. A node's own Pin toggle is the pin beside Locate in its inspector header (screen 9).",
  },
};

const at = nodeAt(spec, 12);
spec.canvas.overlays.cursor = { x: at.x - 2, y: at.y - 2, icon: "hand" };
export default spec;
