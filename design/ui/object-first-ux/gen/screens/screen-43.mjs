// Screen 43: the History dock open after an undo, on College football
// (round-3/history-errors.md, "Undo, redo and the History dock").
// The reader ran Bridges, cut a top 10, turned Weights on (a re-run), then
// the Assistant found groups and the reader renamed one. Two Ctrl+Z presses
// undid the last two steps: the Communities row is gone from the tree, the
// canvas is back to Conference colours sized by Bridges. The reader then
// clicked the History tab of the dock handle and is pointing at "Ran Bridges".
import { BETWEENNESS } from "../football.mjs";
import { DATASET_ROW, conferenceFills, conferenceTreeRow, datasetInspector } from "../football-state.mjs";

const TOP10 = Object.entries(BETWEENNESS).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id]) => Number(id));
const byId = conferenceFills();
for (const id of TOP10) byId[id] = { ...byId[id], outline: { color: "ink", width: 2 } };

export default {
  id: 43,
  title: "History dock after an undo",
  theme: "light",
  file: "College football",
  left: {
    views: { rows: [{ name: "Overview", current: true }] },
    objects: { rows: [
      { ...DATASET_ROW, children: [
        { kind: "set", name: "Top 10 by Bridges", nodes: 10, chip: { type: "ring", color: "ink" } },
        // The step under the pointer touched Bridges: its row is outlined (hover).
        { kind: "measure", name: "Bridges (Betweenness)", values: 115, chip: { type: "size" }, hover: true },
        conferenceTreeRow(),
      ] },
    ] },
  },
  canvas: {
    graph: "football",
    nodes: { default: {}, byId, sizeBy: { values: BETWEENNESS, from: 0.8, to: 2.4 } },
    edges: { default: { width: 1 } },
    overlays: {
      dock: {
        open: true, tab: "History", height: 360,
        // Oldest at the top, as a photo editor's History panel: the undone
        // steps sit below the current one, where the next change would land.
        history: {
          showing: "All objects",
          hover: 2,
          rows: [
            { icon: "data", step: "Opened football.gml", object: "College football", by: "You", when: "10:02" },
            { icon: "group", step: "Coloured by value", object: "Conference", by: "You", when: "10:03" },
            { icon: "rank", step: "Ran Bridges", object: "Bridges", by: "You", when: "10:05", actions: ["Restore to here", "Copy as command"] },
            { icon: "filter", step: "Cut the top 10", object: "Top 10 by Bridges", by: "You", when: "10:06" },
            { icon: "settings", step: "Weights on, re-ran", object: "Bridges", by: "You", when: "10:08", state: "current", actions: ["Restore this result"] },
            { icon: "group", step: "Found groups", object: "Communities", by: "Assistant", when: "10:11", state: "undone" },
            { icon: "text", step: "Renamed Group 3", object: "Mountain West", by: "You", when: "10:12", state: "undone" },
          ],
          note: "Ctrl+Z undoes, Ctrl+Shift+Z redoes. A new change discards the 2 undone steps.",
        },
      },
    },
  },
  toolbar: { active: "select", mode: "2D" },
  inspector: { ...datasetInspector("Overview"), framing: "100%" },
  status: { counts: { nodes: 115, edges: 613 }, notice: { text: "Undone: Found groups, Renamed Group 3", links: ["Redo"], tone: "info" }, layout: "Spread out: settled", zoom: "100%" },
  caption: {
    title: "Screen 43: the History dock after an undo.",
    text: "Two Ctrl+Z presses undid the Assistant's Communities and a rename; the History tab of the dock handle opened the dock. Look at: steps oldest first, each with what it did, the object it touched, who did it (You, Assistant) and when; the current step marked \"now\" with a brand bar at its left and the two below it faded and marked \"undone\", which the tree and canvas no longer show (no Communities row, Conference colours); the row under the pointer with Restore to here and Copy as command, and its object (Bridges) outlined in the tree; Restore this result on the re-run step (brings the unweighted values back as a new object); the last line saying a new change discards the undone steps, with both keys; the status bar's notice naming what was undone, with Redo.",
  },
};
