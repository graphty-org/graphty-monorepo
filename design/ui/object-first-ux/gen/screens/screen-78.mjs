// Screen 78: two objects compared side by side (round-3/
// analysis-results.md, "Compare two objects or two time windows"). Karate
// Club: Communities (Louvain, 4 groups) and Club (the file's club column as
// a Grouping, 2 groups) selected together, Compare on. The canvas splits into
// two panes (canvas.panes), each painted only by its own object, with the
// same camera and the nodes on which the two Groupings disagree ringed in
// both. The agreement and the adjusted Rand index are computed here.

import { NODES, COMMUNITIES } from "../karate.mjs";
import { OKABE_4 } from "../palettes.mjs";

const MR_HI = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 17, 18, 20, 22]);
const ids = NODES.map((x) => x.id);
const groupOf = {};
for (const [g, m] of Object.entries(COMMUNITIES)) for (const id of m) groupOf[id] = g;
const club = (id) => (MR_HI.has(id) ? "Mr. Hi" : "Officer");
// Agreement: each group takes its majority club; count the nodes that match.
const majority = {};
for (const [g, m] of Object.entries(COMMUNITIES)) majority[g] = m.filter((id) => MR_HI.has(id)).length * 2 >= m.length ? "Mr. Hi" : "Officer";
const DIFFER = ids.filter((id) => club(id) !== majority[groupOf[id]]);
// Adjusted Rand index from the contingency table.
const c2 = (k) => (k * (k - 1)) / 2;
const table = {};
for (const id of ids) { const k = `${groupOf[id]}|${club(id)}`; table[k] = (table[k] || 0) + 1; }
const rows = {}, cols = {};
for (const id of ids) { rows[groupOf[id]] = (rows[groupOf[id]] || 0) + 1; cols[club(id)] = (cols[club(id)] || 0) + 1; }
const sumIJ = Object.values(table).reduce((t, v) => t + c2(v), 0);
const sumA = Object.values(rows).reduce((t, v) => t + c2(v), 0), sumB = Object.values(cols).reduce((t, v) => t + c2(v), 0);
const expected = (sumA * sumB) / c2(ids.length);
const ari = (sumIJ - expected) / ((sumA + sumB) / 2 - expected);

const byId = {};
for (const [g, m] of Object.entries(COMMUNITIES)) for (const id of m) byId[id] = { fill: OKABE_4[g - 1] };
for (const id of DIFFER) byId[id] = { ...byId[id], outline: { color: "ink", width: 2 }, label: true };
const CLUB = ["#0072b2", "#d55e00"];
const clubById = {};
for (const id of ids) clubById[id] = { fill: CLUB[MR_HI.has(id) ? 0 : 1], ...(DIFFER.includes(id) ? { outline: { color: "ink", width: 2 }, label: true } : {}) };
const DIFF_TEXT = DIFFER.length === 1 ? "Select the 1 that differs" : `Select the ${DIFFER.length} that differ`;
const DIFF_NODES = DIFFER.length === 1 ? "1 node" : `${DIFFER.length} nodes`;

export default {
  id: 78,
  title: "Two objects compared side by side",
  theme: "light",
  file: "Karate Club",
  left: {
    views: { rows: [{ name: "Overview", current: true }] },
    objects: { rows: [
      { kind: "dataset", name: "Karate Club", nodes: 34, edges: 78, locked: true, chip: { type: "locked" }, expanded: true, children: [
        { kind: "grouping", name: "Communities (Louvain)", groups: 4, expanded: false, chip: { type: "strip", colors: OKABE_4 }, selected: true },
        { kind: "grouping", name: "Club", tech: "club column", groups: 2, expanded: false, chip: { type: "strip", colors: CLUB }, selected: true },
      ] },
    ] },
  },
  canvas: {
    nodes: { default: {}, byId, sizeBy: "degree" },
    edges: { default: { width: 1 } },
    panes: [
      { title: "Communities", nodes: { byId, sizeBy: "degree" }, legend: { blocks: [
        { title: "Communities", rows: [1, 2, 3, 4].map((g) => ({ chip: { type: "swatch", color: OKABE_4[g - 1] }, label: `Group ${g}`, count: String(COMMUNITIES[g].length) })) },
        { title: "Disagree", rows: [{ chip: { type: "ring", color: "ink" }, label: "ringed", count: String(DIFFER.length) }] },
      ] } },
      { title: "Club", nodes: { byId: clubById, sizeBy: "degree" }, legend: { blocks: [
        { title: "Club", rows: [{ chip: { type: "swatch", color: CLUB[0] }, label: "Mr. Hi", count: String(MR_HI.size) }, { chip: { type: "swatch", color: CLUB[1] }, label: "Officer", count: String(34 - MR_HI.size) }] },
      ] } },
    ],
    overlays: {
      dock: { open: false },
    },
  },
  toolbar: { active: "select", mode: "2D" },
  inspector: {
    kind: "2 objects", name: "Communities, Club",
    summary: "2 Groupings, 4 and 2 groups",
    reading: null,
    tabs: [],
    rows: [
      { type: "text", text: "Combine takes Sets and Groups; these are Groupings" },
      { type: "switch", label: "Compare", on: true },
      { type: "select", label: "Right pane", value: "Same" },
      { type: "switch", label: "Cameras", on: true, note: "linked" },
      { type: "section", title: "Findings" },
      { type: "keyValue", pairs: [{ label: "Agree on", value: `${ids.length - DIFFER.length} of ${ids.length} nodes`, wide: true }] },
      { type: "keyValue", pairs: [{ label: "Adjusted Rand", value: ari.toFixed(2), info: true, wide: true }] },
      { type: "button", buttons: [{ label: DIFF_TEXT }] },
      { type: "button", buttons: [{ label: "Make a set" }] },
      { type: "section", title: "Style", count: "Mixed" },
    ],
  },
  status: { counts: { nodes: 34, edges: 78 }, mask: { text: "Comparing Communities with Club", exit: true }, layout: "Spread out: settled", zoom: "100%" },
  caption: {
    title: "Screen 78: two objects compared side by side.",
    text: `Communities and Club (the file's club column as a Grouping) selected together, Compare switched on. Look at: the several-objects inspector with Compare on, "Right pane [Same]" (a View puts a different time window or Focus in the right pane), Link cameras, and FINDINGS: they agree on ${ids.length - DIFFER.length} of ${ids.length} nodes, adjusted Rand ${ari.toFixed(2)} (1 is identical, 0 is chance), "${DIFF_TEXT}" and "Make a set"; the legend naming both panes; the ${DIFF_NODES} on which they disagree ringed and labelled; the status bar's "Comparing Communities with Club [Exit]" (Escape closes the second pane). The canvas is two panes with one camera, left painted by Communities and right by Club, each with its own legend; a click in one halos the node in both. Two Measures show "Difference" instead of the agreement.`,
  },
};
