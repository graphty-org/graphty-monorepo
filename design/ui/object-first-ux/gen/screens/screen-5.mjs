// Screen 5: the same run computing, beside a waiting object
// (round-2/screens.md), on College football. The run started from screen 4;
// "How far from everything" was created from Structure and waits over the
// cost gate (4 minutes on this mock's machine).
import { DATASET_ROW, conferenceFills, conferenceTreeRow, conferenceLegendBlock } from "../football-state.mjs";

export default {
  id: 5,
  title: "The same run computing, beside a waiting object",
  theme: "light",
  file: "College football",
  left: {
    views: { rows: [{ name: "Overview", current: true }] },
    objects: { rows: [
      { ...DATASET_ROW, children: [
        { kind: "measure", name: "How far from everything (Eccentricity)", state: "waiting", runLabel: "Run (4 min)" },
        { kind: "measure", name: "Bridges (Betweenness)", state: "computing", progress: 42, selected: true },
        conferenceTreeRow(),
      ] },
    ] },
  },
  canvas: {
    graph: "football",
    nodes: { default: {}, byId: conferenceFills() },
    edges: { default: { width: 1 } },
    overlays: {
      legend: { blocks: [conferenceLegendBlock()] },
      dock: { open: false },
    },
  },
  toolbar: { active: "select", mode: "2D" },
  inspector: {
    kind: "Measure", name: "Bridges (Betweenness)",
    chip: null,
    // No chip; "Computing 42%", Cancel, and "sampling" in secondary text (the
    // "on the CPU" word waits on the element's backend field).
    summary: { text: "Computing 42%", cancel: true, note: "sampling" },
    reading: null,
    tabs: ["Values", "Define", "Style", "Record"], tab: "Define",
    rows: [
      { type: "keyValue", pairs: [{ label: "Method", value: "Bridges (Betweenness)", info: true, wide: true }] },
      { type: "switch", label: "Weights", on: false, second: { label: "Direction", select: "As loaded" } },
      { type: "switch", label: "Exact", on: true },
      { type: "keyValue", pairs: [{ label: "Within", value: "Everything", secondary: true, wide: true }] },
      { type: "disclosure", title: "Advanced", summary: "1 option" },
    ],
  },
  status: { counts: { nodes: 115, edges: 613 }, computing: { text: "Computing 1 of 1", cancel: "Cancel" }, layout: "Spread out: settled", zoom: "100%" },
  caption: {
    title: "Screen 5 of 15: the same run computing, beside a waiting object.",
    text: "Look at: two live states side by side in the tree, one row waiting over the cost gate with its Run (4 min) button in the count slot (its long name gives way to the button) and one computing with a 42% ring, selected; the tool already back on Select; nothing painted yet, so the canvas is still the Conference colouring with its twelve-row legend; the Measure inspector opens on Define with \"Betweenness\" on its kind line, Cancel and \"sampling\" in its summary row and an empty reading row; the computing chip in the status bar with its own Cancel.",
  },
};
