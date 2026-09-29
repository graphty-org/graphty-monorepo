// Screen 87: the Dataset's Canvas tab, with the Look list open and "Show
// hidden faintly" on. Karate Club focused on Group 1 (the mask: 12 of 34
// showing); with the switch on, the 22 nodes and their edges outside the mask
// are drawn at low opacity instead of being absent (the element's
// `visibility.showContext`). Everything is from screen 3's state.
import { COMMUNITIES, EDGES } from "../karate.mjs";
import { OTHER } from "../palettes.mjs";
import { KARATE, DATASET, menuItems } from "./screen-83.mjs";

const SHOWN = new Set(COMMUNITIES[1]);
const byId = {};
for (const [id, v] of Object.entries(KARATE.canvas.nodes.byId)) byId[id] = SHOWN.has(Number(id)) ? v : { ...v, outline: undefined, opacity: 0.18 };
const byPair = {};
for (const [a, b] of EDGES) if (!SHOWN.has(a) || !SHOWN.has(b)) byPair[`${Math.min(a, b)}-${Math.max(a, b)}`] = { opacity: 0.15 };

export default {
  id: 87,
  title: "The Dataset's Canvas tab, hidden elements drawn faintly",
  theme: "light",
  ...KARATE,
  canvas: {
    ...KARATE.canvas,
    nodes: { ...KARATE.canvas.nodes, byId },
    edges: { default: { width: 1 }, byPair },
    labels: [34, 33, 9],
    overlays: { ...KARATE.canvas.overlays },
  },
  menus: [{
    anchor: { inspectorRow: 1, side: "left", align: "start", dx: -8, dy: -8 },
    width: 244,
    rows: menuItems([
        { label: "Default", chosen: true },
        { label: "Presentation", note: "bigger" },
        { label: "Print", note: "grey, patterns" },
        { label: "Colour-blind safe" },
        { label: "High contrast" },
        { label: "Dark" },
        "-",
        { label: "Save current as look..." },
        { head: "A look sets defaults, never an object's Style" },
      ]),
  }],
  inspector: {
    ...DATASET, tab: "Canvas",
    rows: [
      { type: "swatchHex", label: "Background", color: "#f5f5f5", value: "Follow theme" },
      { type: "select", label: "Look", value: "Default" },
      { type: "select", label: "Labels", value: "Top 6 by Connections", gear: true },
      { type: "select", label: "Edge labels", value: "None" },
      { type: "select", label: "Tooltip", value: "Label + 3 values", gear: true },
      { type: "switch", label: "Legend", on: true, second: { label: "Minimap", on: false } },
      { type: "switch", label: "Note markers", on: true, wide: true },
      { type: "switch", label: "Show hidden faintly", on: true, wide: true, caption: "what the mask leaves out, at 15 percent" },
      { type: "section", title: "Default look", plus: true },
      { type: "swatchHex", label: "Node", color: OTHER, value: "6 px" },
      { type: "swatchHex", label: "Edge", color: "#c4c4c4", value: "1 px" },
    ],
  },
  status: { counts: { nodes: 34, edges: 78 }, mask: { text: "Focused on Group 1: 12 of 34", exit: true }, layout: "Spread out: settled", zoom: "100%" },
  caption: {
    title: "Screen 87: the Dataset's Canvas tab, hidden elements drawn faintly.",
    text: "Karate Club focused on Group 1 (the status bar's mask). Look at: the 12 members at full strength and the other 22 nodes and their edges at about 15 percent, because \"Show hidden faintly\" is on (off, they are absent, as on every other screen); the Canvas tab's rows in order: Background (Follow theme), Look, Labels and Tooltip each with a gear (screens 88 and 89), Edge labels, Legend and Minimap with their keys, Note markers, the faint switch with its caption, and the DEFAULT LOOK section (the node and edge defaults under every object). Arrows is drawn only for directed data. The Look list: the base looks, the current one tinted, and \"Save current as look...\".",
  },
};
