// Screen 107: the Views rail panel (round-4/revision-round-4.md section
// 2.6). Karate Club in screen 3's state, three views saved. The reader
// opened Views on the rail (Alt+4) and clicked "Hub close-up": the camera
// moved to it (3D, tilted, closer on node 34), the row is current, and the
// View inspector is on the right. The panel holds what used to be spread
// over the top of the tree, the Canvas tab and the file menu: the saved
// views with Previous and Next, the camera (framing, follow, minimap),
// Compare, and Present.
import { STATE } from "./screen-3.mjs";

export default {
  id: 107,
  title: "The Views panel",
  theme: "light",
  ...STATE,
  left: {
    panel: "views",
    views: { rows: [
      { type: "section", title: "Saved views", actions: ["chevron-up", "chevron-down"] },
      { name: "Overview" },
      { name: "Hub close-up", current: true },
      { name: "Top down 2D" },
      { type: "section", title: "Camera" },
      { type: "select", label: "Framing", value: "Hub close-up" },
      { type: "keyValue", pairs: [{ label: "Follow", value: "no node" }] },
      { type: "switch", label: "Minimap", on: false },
      { type: "section", title: "Compare" },
      { type: "button", buttons: [{ label: "Compare two objects..." }] },
      { type: "switch", label: "Link cameras", on: true, wideLabel: true },
      { type: "section", title: "Present" },
      { type: "button", buttons: [{ label: "Present from the start" }] },
      { type: "button", buttons: [{ label: "Present from this view" }] },
    ] },
  },
  canvas: {
    ...STATE.canvas,
    camera: { pitch: 35, zoom: 1.15, center: 34 },
    nodes: { sizeBy: "degree", byId: Object.fromEntries(Object.entries(STATE.canvas.nodes.byId).map(([k, v]) => [k, { ...v, halo: false }])) },
    overlays: { ...STATE.canvas.overlays },
  },
  toolbar: { active: "select", mode: "3D" },
  inspector: {
    kind: "View", name: "Hub close-up",
    actions: [{ icon: "camera", title: "Apply" }, { icon: "more", title: "Rename, Duplicate, Delete, Present from here" }],
    summary: "3D camera, showing everything",
    reading: null,
    tabs: [], tab: null,
    framing: "Hub close-up",
    rows: [
      { type: "keyValue", pairs: [{ label: "Camera", value: "as saved", wide: true }] },
      { type: "segmented", label: "Mode", options: ["2D", "3D", "VR", "AR"], value: "3D" },
      { type: "select", label: "Showing", value: "Everything" },
      { type: "button", buttons: [{ label: "Export image from this view" }] },
      { type: "section", title: "What a view keeps" },
      { type: "note", text: "The camera, the mode and what is showing. Not colours, eyes, the selection or node positions: applying a view never repaints anything." },
    ],
  },
  status: { ...STATE.status, selection: null, zoom: "Hub close-up" },
  caption: {
    title: "Screen 107: the Views panel (Views on the rail, Alt+4) and the View inspector.",
    text: "Karate Club, the view Hub close-up just applied. Look at: Views active on the rail; Saved views with Previous and Next (PgUp, PgDn) in its header, the current view tinted; Camera: Framing (the same menu as the zoom pill, which reads the view's name), Follow, Minimap (M); Compare two objects... (a split canvas, screen 78) with Link cameras; Present from the start (Shift+\\) or from this view, which step through the views in order (screen 99). \"+\" saves a view (Ctrl+Alt+V); \"...\" exports and imports views. The View inspector on the right: Camera, Mode, Showing, Export image.",
  },
};
