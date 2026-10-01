// Screen 13: the Settings sheet (round-2/screens.md screen 13, revised in
// round-3/file-project.md, "Settings"). College football loaded as screen 2;
// File > Settings... (Ctrl+comma) opened the sheet over a scrim. The sheet is
// the dialog every other dialog uses, its eight sections disclosures in one
// list (several may be open, each closed one showing its summary), so no new
// surface is needed. Drawn: General (theme, autosave), Performance (the
// acceleration policy) and Assistant (provider and key) open.
import { DATASET_ROW, conferenceFills, conferenceTreeRow, datasetInspector } from "../football-state.mjs";

export default {
  id: 13,
  title: "The Settings sheet",
  theme: "light",
  file: "College football",
  left: {
    views: { rows: [{ name: "Overview", current: true }] },
    objects: { rows: [{ ...DATASET_ROW, children: [conferenceTreeRow()] }] },
  },
  canvas: {
    graph: "football",
    nodes: { default: {}, byId: conferenceFills() },
    edges: { default: { width: 1 } },
    overlays: {
      dock: { open: false },
      dialog: {
        title: "Settings",
        rows: [
          { type: "disclosure", title: "General", summary: "", open: true },
          { type: "select", label: "Theme", value: "Follow system" },
          { type: "switch", label: "Autosave", on: true, second: { label: "Keep closed", select: "7 days" } },
          { type: "disclosure", title: "Canvas", summary: "halo, hover neighbours off, animate 500 ms" },
          { type: "disclosure", title: "Camera", summary: "start at Fit, wheel not inverted" },
          { type: "disclosure", title: "Analysis", summary: "nothing runs on load, ask above 30 s" },
          { type: "disclosure", title: "Performance", summary: "", open: true },
          { type: "select", label: "GPU", value: "Auto", note: "Auto, Off, Required" },
          { type: "field", label: "GPU above", value: "5,000", suffix: "nodes" },
          { type: "text", text: "Active: NVIDIA T4, WebGPU" },
          { type: "button", buttons: [{ label: "Measure this machine (about 10 s)" }] },
          { type: "switch", label: "Frame stats", on: false, second: { label: "Rendering", select: "WebGL" } },
          { type: "field", label: "Draw up to", value: "200,000", suffix: "nodes" },
          { type: "disclosure", title: "Headset", summary: "teleport off, hands on" },
          { type: "disclosure", title: "Assistant", summary: "", open: true },
          { type: "select", label: "Provider", value: "Anthropic", note: "or In-browser, None" },
          { type: "field", label: "API key", value: "sk-ant-...7Qf", mono: true },
          { type: "segmented", label: "Keep key", options: ["Session", "Device", "Never"], value: "Session" },
          { type: "disclosure", title: "Advanced", summary: "logging: warnings" },
        ],
        footer: [{ label: "Done", primary: true }],
      },
    },
  },
  toolbar: { active: "select", mode: "2D" },
  inspector: datasetInspector("Overview"),
  status: { counts: { nodes: 115, edges: 613 }, layout: "Spread out: settled", zoom: "Fit" },
  caption: {
    title: "Screen 13: the Settings sheet (File > Settings..., Ctrl+comma).",
    text: "Everything that is a preference of the reader or the machine, never of the data. Look at: eight sections as disclosures in the one dialog, closed ones showing their current values; General (Theme, Autosave and how long closed sessions are kept); Performance (GPU policy, the GPU threshold, the state line with the adapter, Measure this machine, frame stats, the renderer, the drawing ceiling); Assistant (provider, the key masked, where the key is kept). Changes apply at once; Done closes.",
  },
};
