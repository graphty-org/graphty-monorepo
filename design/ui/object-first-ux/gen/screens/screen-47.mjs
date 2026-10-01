// Screen 47: the graphics context was lost (round-3/history-errors.md,
// "Failures of the whole graph view"). Screen 3's Karate Club, Group 2
// selected. The browser took the WebGL context back (a driver reset, the
// machine waking from sleep, too many tabs drawing). The session still holds
// the data, the runs and the layers, so only the picture is gone: the canvas
// is blank and greyed with a card in its middle; the tree, the inspector, the
// table and the status bar keep working. The card's Details are open.
import { STATE } from "./screen-3.mjs";

export default {
  id: 47,
  title: "Graphics context lost",
  theme: "light",
  ...STATE,
  canvas: {
    graph: false, // a lost context leaves the canvas blank
    overlays: {
      dialog: {
        title: "The graphics context was lost",
        rows: [
          { type: "note", text: "Your data and objects are kept. The browser took the graphics card back from this page, which happens after a driver reset, when the computer wakes from sleep, or when many tabs draw at once. The tree, the inspector and the table still work." },
          { type: "disclosure", title: "Details", summary: "", open: true },
          { type: "keyValue", pairs: [{ label: "Code", value: "E_CONTEXT_LOST", wide: true }] },
          { type: "keyValue", pairs: [{ label: "At", value: "10:42:07, lost once", wide: true }] },
          { type: "keyValue", pairs: [{ label: "Renderer", value: "WebGL 2, Intel UHD 770", wide: true }] },
          { type: "keyValue", pairs: [{ label: "Versions", value: "element 2.0.0, Chrome 131", wide: true }] },
        ],
        footer: [{ label: "Copy diagnostics" }, { label: "Reload view", primary: true }],
      },
      dock: { open: false },
    },
  },
  insets: [{
    tag: "A non-fatal error: the chip and its Details", left: 256, top: 16, width: 264,
    title: "Error: background image failed",
    rows: [
      { type: "keyValue", pairs: [{ label: "Code", value: "E_ASSET_LOAD", action: "Copy" }] },
      { type: "keyValue", pairs: [{ label: "File", value: "floorplan.png, 404", wide: true }] },
      { type: "note", text: "The graph is drawn without the background. Nothing else is affected." },
      { type: "button", buttons: [{ label: "Choose another image..." }, { label: "Remove background", ghost: true }] },
    ],
  }],
  toolbar: { active: "select", mode: "2D" },
  status: { counts: { nodes: 34, edges: 78 }, error: { text: "View lost", links: ["Reload view"] }, selection: "11 selected", zoom: "100%" },
  caption: {
    title: "Screen 47: the graphics context was lost.",
    text: "Screen 3 after the browser reclaimed the page's graphics context. Look at: the blank canvas under a grey, with one card that says what happened, that nothing was lost, and what still works; Reload view (rebuilds the picture from the session: same tree, layout positions and camera) and Copy diagnostics; the open Details with the code, time, renderer and versions; the toolbar under the grey, because its tools need the picture; the tree, Group 2's inspector and \"11 selected\" untouched; \"View lost [Reload view]\" in the status bar's error slot. The inset is a non-fatal element error (a background image that failed): only the red status chip \"Error: background image failed [Details]\" and this Details popover, with the canvas left working.",
  },
};
