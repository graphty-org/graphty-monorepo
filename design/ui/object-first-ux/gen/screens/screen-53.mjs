// Screen 53: saved views and the View inspector (round-3/navigate-select.md,
// "Saved views"). Karate Club in screen 3's state, three Views saved; the
// reader applied "Hub close-up" (3D) and has since orbited, so its row
// carries the moved-away dot and the pill reads "Custom". The Views "..."
// menu is open under its button.
import { STATE } from "./screen-3.mjs";

export default {
  id: 53,
  title: "Saved views and the View inspector",
  theme: "light",
  ...STATE,
  left: {
    ...STATE.left,
    panel: "views", // round 4: the Views list is the Views rail panel, and its "..." is this menu's anchor
    views: { menuOpen: true, rows: [
      { name: "Overview" },
      { name: "Hub close-up", current: true, drift: true },
      { name: "Top down 2D" },
    ] },
    objects: { rows: STATE.left.objects.rows.map((r) => ({ ...r, children: r.children.map((c) => (c.children ? { ...c, children: c.children.map((g) => ({ ...g, selected: false })) } : c)) })) },
  },
  canvas: {
    ...STATE.canvas,
    camera: { pitch: 35, zoom: 1.4, center: 34 },
    nodes: { sizeBy: "degree", byId: Object.fromEntries(Object.entries(STATE.canvas.nodes.byId).map(([k, v]) => [k, { ...v, halo: false }])) },
    overlays: { ...STATE.canvas.overlays },
  },
  menus: [{
    anchor: { el: "viewsMore", side: "below", align: "start", dx: -8 },
    width: 220,
    rows: [
      { label: "Save view", key: "Ctrl+Alt+V" },
      { label: "Previous view", key: "PgUp" },
      { label: "Next view", key: "PgDn" },
      { divider: true },
      { label: "Present from here", key: "Shift+\\" },
      { divider: true },
      { label: "Export views...", highlighted: true },
      { label: "Import views..." },
    ],
  }],
  toolbar: { active: "select", mode: "3D" },
  inspector: {
    kind: "View", name: "Hub close-up",
    actions: [{ icon: "camera", title: "Apply" }, { icon: "more", title: "Rename, Duplicate, Delete, Present from here" }],
    summary: "3D camera, showing everything",
    reading: "The camera has moved since this view was saved.",
    tabs: [], tab: null,
    framing: "Custom",
    rows: [
      { type: "keyValue", pairs: [{ label: "Camera", value: "moved", action: "Update to current" }] },
      { type: "segmented", label: "Mode", options: ["2D", "3D", "VR", "AR"], value: "3D" },
      { type: "select", label: "Showing", value: "Everything" },
      { type: "button", buttons: [{ label: "Export image from this view" }] },
      { type: "section", title: "What a view keeps" },
      { type: "note", text: "The camera (where it stands, what it looks at, the zoom), the mode, and what is showing: a Focus, a time window. Not colours, eyes, the selection or node positions: those belong to the tree, so applying a view never repaints anything." },
    ],
  },
  status: { ...STATE.status, selection: null, zoom: "Custom" },
  caption: {
    title: "Screen 53: saved views, the View inspector and the Views menu.",
    text: "Look at: three rows in Views, \"Hub close-up\" current with the grey fill and a dot because the camera moved after it was applied (the canvas shows the orbited 3D camera closer on node 34); the pill and status bar reading \"Custom\"; the View inspector with Update to current, the Mode segments, Showing, Export image from this view and what a view keeps; the dark Views \"...\" menu under its button with Save view, previous and next, Present from here, Export views... and Import views.... Click a row applies it with a 500 ms move; double-click renames; drag reorders.",
  },
};
