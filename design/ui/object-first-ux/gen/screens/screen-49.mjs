// Screen 49: the canvas right-click menus (round-3/navigate-select.md,
// "Right-click menus"). Screen 9's state with the dock closed: BrighamYoung
// selected, then right-clicked. The menu at the pointer is the node
// inspector's "..." list with the select and route verbs in front, so the two
// doors read the same rows in the same order. Two more right-click menus are
// drawn with a tag each: on empty canvas, and on a tree row.
import s9 from "./screen-9.mjs";
import { NODES } from "../football.mjs";

const BY = NODES.find((x) => x.label === "BrighamYoung").id;

export default {
  ...s9,
  id: 49,
  title: "Canvas right-click menus",
  canvas: { ...s9.canvas, overlays: { dock: { open: false } } },
  menus: [
    {
      anchor: { node: BY, side: "right", align: "start", dx: 10, dy: -8 },
      width: 236,
      rows: [
        { heading: "BrighamYoung" },
        { label: "Select neighbours", key: "Dbl-click", highlighted: true },
        { label: "Select connected part" },
        { divider: true },
        { label: "Path from here", key: "P" },
        { label: "Path to here" },
        { divider: true },
        { label: "Locate", key: "Shift+2" },
        { label: "Follow" },
        { label: "Pin" },
        { label: "Note...", key: "N" },
        { label: "Style this node..." },
        { label: "Add to Set", sub: true },
        { label: "What breaks if removed" },
        { divider: true },
        { label: "Hide", key: "Ctrl+Shift+H" },
        { label: "Copy id", key: "Ctrl+C" },
        { label: "Remove from data...", key: "Del", danger: true },
      ],
    },
    {
      tag: "On empty canvas",
      left: 256, top: 560, width: 220,
      rows: [
        { label: "Paste", key: "Ctrl+V" },
        { label: "Add node here..." },
        { label: "Select all shown", key: "Ctrl+A" },
        { label: "Show all hidden" },
        { divider: true },
        { label: "Zoom to fit", key: "Shift+1" },
        { label: "Reset view", key: "Home" },
        { label: "Save view...", key: "Ctrl+Alt+V" },
      ],
    },
    {
      tag: "On a tree row",
      anchor: { row: "Top 10 by Bridges", side: "right", align: "start", dx: -12, dy: 36 },
      width: 208,
      rows: [
        { label: "Rename", key: "F2" },
        { label: "Duplicate", key: "Ctrl+D" },
        { label: "Focus on this" },
        { label: "Select members" },
        { label: "Show in table" },
        { divider: true },
        { label: "Delete...", key: "Del", danger: true },
      ],
    },
  ],
  status: { ...s9.status },
  caption: {
    title: "Screen 49: the canvas right-click menus.",
    text: "Right press on BrighamYoung (a right drag still pans). Look at: the dark menu at the pointer is the node inspector's \"...\" list with the select and route verbs first and keys at the right; Remove from data... last and red. Also drawn: the menu on empty canvas (Paste, Add node here..., Select all shown, Show all hidden, Zoom to fit, Reset view, Save view...) and on a tree row (the object menu of screen 44). On a node inside a larger selection the menu lists Make a set, Add to Set, Select the edges between, Invert, Focus on these, Hide these. Edges join with #319.",
  },
};
