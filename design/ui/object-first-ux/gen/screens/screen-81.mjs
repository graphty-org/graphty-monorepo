// Screen 81: notes, the note list and canvas callouts (round-3/
// analysis-results.md, "Notes"). Karate Club. The reader pressed N (the Note
// tool), clicked node 34, and is typing: the note opens in the node's About
// tab, in edit mode. An older note shows as a marker on node 1; node
// 34's note is expanded into a callout (a box with a leader line). The
// Dataset's note list (every note by what it is about, with an Orphaned
// group), which lives in the Dataset Overview's NOTES disclosure and opens
// from the status bar's note count, is the inset.

import { COMMUNITIES } from "../karate.mjs";
import { OKABE_4 } from "../palettes.mjs";

const byId = {};
for (const [g, members] of Object.entries(COMMUNITIES)) for (const id of members) byId[id] = { fill: OKABE_4[g - 1] };
byId[34] = { ...byId[34], halo: true, label: true, marker: true, callout: "Leads the Officer side after the split", calloutAt: { dx: 60, dy: -70 } };
byId[1] = { ...byId[1], label: true, marker: true };

export default {
  id: 81,
  title: "Notes, the note list and canvas callouts",
  theme: "light",
  file: "Karate Club",
  left: {
    views: { rows: [{ name: "Overview", current: true }] },
    objects: { rows: [
      { kind: "dataset", name: "Karate Club", nodes: 34, edges: 78, locked: true, chip: { type: "locked" }, expanded: true, children: [
        { kind: "grouping", name: "Communities (Louvain)", groups: 4, expanded: false, chip: { type: "strip", colors: OKABE_4 } },
      ] },
    ] },
  },
  canvas: {
    nodes: { default: {}, byId, sizeBy: "degree" },
    edges: { default: { width: 1 } },
    overlays: {
      dock: { open: false },
    },
  },
  insets: [{
    tag: "The note list: Dataset > Overview > NOTES", left: 256, top: 16, width: 256,
    title: "Notes  4",
    rows: [
      { type: "section", title: "Node 34", count: "1" },
      { type: "text", text: "Leads the Officer side after the split", secondary: false },
      { type: "section", title: "Node 1", count: "1" },
      { type: "text", text: "Mr. Hi, the instructor", secondary: false },
      { type: "section", title: "Communities", count: "1" },
      { type: "text", text: "Group 3 is the Officer's inner circle", secondary: false },
      { type: "section", title: "Orphaned", count: "1" },
      { type: "keyValue", pairs: [{ label: "Was on", value: "node 35", note: "removed", wide: true }] },
      { type: "button", buttons: [{ label: "Reattach..." }, { label: "Delete", ghost: true }] },
    ],
  }],
  toolbar: { active: "select", mode: "2D" },
  inspector: {
    kind: "Node", sub: "id 34", name: "node 34",
    actions: [{ icon: "locate", title: "Locate" }, { icon: "pin", on: false, title: "Pin" }, { icon: "more" }],
    summary: "17 neighbours",
    reading: null,
    tabs: ["About", "Attributes", "Links"], tab: "About",
    rows: [
      { type: "keyValue", pairs: [{ label: "club", value: "Officer", wide: true }] },
      { type: "link", text: "Connected to 17 nodes" },
      { type: "section", title: "Values" },
      { type: "keyValue", pairs: [{ label: "Communities", value: "Group 1", chevron: true }] },
      { type: "section", title: "Notes", count: "1", plus: true },
      { type: "textarea", lines: ["Leads the Officer side after the split"], caret: true, rows: 2 },
      { type: "keyValue", pairs: [{ label: "Tags", value: "split, leader", wide: true }] },
      { type: "keyValue", pairs: [{ label: "By", value: "Adam, 2026-09-25 14:02", wide: true }] },
      { type: "switch", label: "Callout", on: true, note: "on the canvas" },
      { type: "button", buttons: [{ label: "Done", primary: true }, { label: "Delete", ghost: true }] },
    ],
  },
  status: { counts: { nodes: 34, edges: 78 }, layout: "Spread out: settled", selection: "1 selected", tool: "4 notes", zoom: "100%" },
  caption: {
    title: "Screen 81: notes, the note list and canvas callouts.",
    text: "The reader pressed N, clicked node 34 and is typing. Look at: the node's About tab with NOTES open in edit mode (the text with its cursor, tags, who and when, Callout on, Done and Delete; Ctrl+Enter is Done); node 34's callout on the canvas, a box with a leader line carrying the text, and the speech-bubble markers on nodes 1 and 34; the note list in the inset, grouped by what each note is about, with an Orphaned group whose node was removed from the data, offering Reattach... and Delete. The list lives in the Dataset Overview's NOTES disclosure and opens from the status bar's \"4 notes\"; Canvas > Note markers (Shift+N) hides every marker.",
  },
};
