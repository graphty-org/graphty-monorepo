// Screen 100: VR, before and after. Karate Club in screen 3's state. The
// reader has just come back from a VR session in which they asked for the
// path from node 12 to node 34 and grabbed node 34's neighbours: the two new
// objects are at the top of the tree, marked new (the paler fill), and the
// status bar says "Back from VR: 2 objects added". The right-click menu on the
// VR segment (what to take into the headset) is drawn above it, tagged as
// the moment before, with the Group the reader chose highlighted.
import { KARATE, DATASET, menuItems } from "./screen-83.mjs";
import { EDGES } from "../karate.mjs";
import { HIGHLIGHT } from "../palettes.mjs";

const PATH = [[1, 12], [1, 32], [32, 34]];
const byPair = {};
for (const [a, b] of PATH) byPair[`${Math.min(a, b)}-${Math.max(a, b)}`] = { stroke: HIGHLIGHT.purple, width: 3 };
const byId = { ...KARATE.canvas.nodes.byId };
for (const [a, b] of EDGES) if (a === 34 || b === 34) { const id = a === 34 ? b : a; byId[id] = { ...byId[id], outline: { color: HIGHLIGHT.magenta, width: 2 } }; }
for (const id of [12, 1, 32, 34]) byId[id] = { ...byId[id], outline: { color: HIGHLIGHT.purple, width: 2 } };
const n34 = EDGES.filter(([a, b]) => a === 34 || b === 34).length;

const [root] = KARATE.left.objects.rows;
const tree = [{ ...root, children: [
  { kind: "path", name: "Path: 12 -> 34", edges: 3, chip: { type: "line", color: HIGHLIGHT.purple, width: 3 }, badge: "new" },
  { kind: "set", name: "Neighbours of 34", nodes: n34, chip: { type: "ring", color: HIGHLIGHT.magenta }, badge: "new" },
  ...root.children,
] }];


export default {
  id: 100,
  title: "Entering and leaving VR",
  theme: "light",
  ...KARATE,
  left: { ...KARATE.left, objects: { rows: tree } },
  canvas: {
    ...KARATE.canvas,
    nodes: { ...KARATE.canvas.nodes, byId },
    edges: { default: { width: 1 }, byPair },
    overlays: { ...KARATE.canvas.overlays },
  },
  menus: [{
    tag: "A moment before: right-click on VR",
    anchor: { el: "mode-VR", side: "left", align: "end", dx: -8 },
    width: 232,
    rows: menuItems([
        { head: "Enter VR showing" },
        { label: "Everything", note: "34 nodes" },
        "-",
        { label: "Degree > 8", note: "5 nodes" },
        { label: "Group 1", note: "12 nodes" },
        { label: "Group 2", note: "11 nodes", chosen: true },
        { label: "Group 3", note: "6 nodes" },
        { label: "Group 4", note: "5 nodes" },
        "-",
        { head: "Above 10,000 nodes Everything is greyed: the headset's limit; pick a Set" },
      ]),
  }],
  toolbar: { active: "select", mode: "2D", modeMenu: true, modePressed: "VR" },
  inspector: {
    ...DATASET, tab: "Overview",
    rows: [
      { type: "keyValue", pairs: [{ label: "Nodes", value: "34" }, { label: "Edges", value: "78" }] },
      { type: "keyValue", pairs: [{ label: "Direction", value: "Undirected (file)", action: "Change..." }] },
      { type: "keyValue", pairs: [{ label: "Density", value: "0.139" }, { label: "Mean links", value: "4.6" }] },
      { type: "keyValue", pairs: [{ label: "Parts", value: "1" }, { label: "Weighted", value: "No" }] },
      { type: "disclosure", title: "Import report", summary: "read 80, kept 78" },
      { type: "emptyPlus", title: "Findings" },
      { type: "emptyPlus", title: "Notes" },
    ],
  },
  status: { counts: { nodes: 34, edges: 78 }, notice: { text: "Back from VR: 2 objects added", tone: "info" }, layout: "Spread out: settled", zoom: "100%" },
  caption: {
    title: "Screen 100: entering and leaving VR.",
    text: "The view-mode button's menu, VR row, \"Showing >\" opens \"Enter VR showing\", drawn beside it, tagged as the moment before, with Group 2 highlighted. Look at: Everything with its count, then every Set and Group with theirs (Everything greyed with the headset's limit in its tooltip above 10,000 nodes); a plain click on VR takes what is showing. During the session both panels minimise, the status bar reads \"Focused on Group 2: 11 of 34 [Exit]  VR [Exit]\", and Esc or Exit returns. Back at the desk: the camera restored, the two objects made in the headset (a path asked for by voice, a Set of node 34's neighbours) at the top of the tree marked new until the next click, and \"Back from VR: 2 objects added\" for a few seconds. AR works the same way.",
  },
};
