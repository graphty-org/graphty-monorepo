// Screen 45: a failed run (round-3/history-errors.md, "A failed run").
// Screen 5's state one moment later: the Bridges run on the GPU lost its
// device at 42% during sampling. The row turns failed (a red dot, no count,
// nothing painted); the inspector says why and offers the two recoveries,
// Retry (same backend) and an explicit Retry on the CPU with its own cost.
// The status bar says once that it failed, in red, because the computing
// chip the reader was watching has gone. The inset shows the same failed
// state when the element refuses to paint an object.
import { DATASET_ROW, conferenceFills, conferenceTreeRow } from "../football-state.mjs";

export default {
  id: 45,
  title: "A failed run",
  theme: "light",
  file: "College football",
  left: {
    views: { rows: [{ name: "Overview", current: true }] },
    objects: { rows: [
      { ...DATASET_ROW, children: [
        { kind: "measure", name: "How far from everything (Eccentricity)", state: "waiting", runLabel: "Run (4 min)" },
        { kind: "measure", name: "Bridges (Betweenness)", state: "failed", selected: true },
        conferenceTreeRow(),
      ] },
    ] },
  },
  canvas: {
    graph: "football",
    nodes: { default: {}, byId: conferenceFills() },
    edges: { default: { width: 1 } },
    overlays: {
      dock: { open: false },
    },
  },
  insets: [{
    tag: "The same state for a refused style", left: 256, top: 16, width: 256,
    title: "Measure  Influence (PageRank)",
    rows: [
      { type: "text", text: "Paint refused: no values to spread", tone: "error" },
      { type: "note", text: "The colour scale has no values to spread (E_SELECTOR_EMPTY). The values are kept; only the paint is off." },
      { type: "button", label: "Back to the suggested look", buttons: [{ label: "Reset style" }] },
    ],
  }],
  toolbar: { active: "select", mode: "2D" },
  inspector: {
    kind: "Measure", name: "Bridges (Betweenness)",
    chip: null,
    summary: { text: "Failed at 42%: GPU device lost", tone: "failed" },
    reading: "Nothing was painted; the colours are still Conference's.",
    tabs: ["Values", "Define", "Style", "Record"], tab: "Define",
    framing: "100%",
    rows: [
      { type: "button", label: "Same settings, on the GPU", buttons: [{ label: "Retry", primary: true, focus: true }] },
      { type: "button", label: "", buttons: [{ label: "Retry on the CPU (about 40 min)" }] },
      { type: "note", text: "The graphics card was reset during sampling (E_DEVICE_LOST). A GPU run never finishes on the CPU by itself; the CPU retry is your choice and says its cost." },
      { type: "keyValue", pairs: [{ label: "At", value: "10:42, 42%", action: "Copy details" }] },
      { type: "section", title: "Settings" },
      { type: "keyValue", pairs: [{ label: "Method", value: "Bridges (Betweenness)", info: true, wide: true }] },
      { type: "switch", label: "Weights", on: false, second: { label: "Direction", select: "As loaded" } },
      { type: "switch", label: "Exact", on: true },
      { type: "keyValue", pairs: [{ label: "Within", value: "Everything", secondary: true, wide: true }] },
    ],
  },
  status: { counts: { nodes: 115, edges: 613 }, error: { text: "Bridges failed", links: ["Show"] }, layout: "Spread out: settled", zoom: "100%" },
  caption: {
    title: "Screen 45: a failed run.",
    text: "Screen 5 a moment later: the GPU was lost during sampling. Look at: the red dot on the Bridges row and no count; the summary row in red saying what failed and at what point; the reading row saying nothing was painted (the Conference colours stand); Retry, focused, and Retry on the CPU as a separate button carrying its cost, which is the visible form of the no-silent-fallback rule; the error code and Copy details; the Define settings still editable below, so a changed setting plus Retry is the other way out; the red \"Bridges failed [Show]\" replacing the computing chip that disappeared. The inset is the same state for a refused style, with Reset style. (Costs are the section 4 example's 50,000-node figures, as on screen 5.)",
  },
};
