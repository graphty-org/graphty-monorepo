// Screen 51: screen 3's state switched to 3D, with the framing menu open
// (round-3/navigate-select.md, "The framing menu" and "3D"). The selection
// (Group 2) survives the mode switch. The pill reads the framing name
// ("Isometric") because a percentage means nothing in 3D. The camera is
// tilted (canvas.camera.pitch): rows nearer the viewer are lower, wider apart
// and larger.
import { STATE } from "./screen-3.mjs";

export default {
  id: 51,
  title: "3D canvas with the framing menu open",
  theme: "light",
  ...STATE,
  pillOpen: true,
  canvas: {
    ...STATE.canvas,
    camera: { pitch: 50 },
    overlays: {
      ...STATE.canvas.overlays,
      cursor: { x: 330, y: 560, icon: "refresh" },
    },
  },
  menus: [{
    anchor: { el: "pill", side: "below", align: "start" },
    width: 228,
    rows: [
      { label: "Zoom in", key: "Ctrl+=" },
      { label: "Zoom out", key: "Ctrl+-" },
      { label: "Zoom to fit", key: "Shift+1" },
      { label: "Zoom to selection", key: "Shift+2" },
      { divider: true },
      { label: "Top", key: "7" },
      { label: "Front", key: "1" },
      { label: "Side", key: "3" },
      { label: "Isometric", key: "9", checked: true, highlighted: true },
      { divider: true },
      { label: "Reset view", key: "Home" },
      { label: "Save view...", key: "Ctrl+Alt+V" },
      { divider: true },
      { heading: "In 2D: Zoom to 100% (Ctrl+0) instead of the four views" },
    ],
  }],
  toolbar: { active: "hand", mode: "3D" },
  inspector: { ...STATE.inspector, framing: "Isometric" },
  status: { ...STATE.status, zoom: "Isometric" },
  caption: {
    title: "Screen 51: 3D, with the framing menu open from the pill.",
    text: "Look at: the mode switch on 3D and Group 2 still selected across the switch; the camera tilted, so nearer rows are lower and larger; the pill and the status bar reading \"Isometric\" (a named framing; \"Custom\" after an orbit); the dark framing menu under the pill with zoom, fit, selection, the four 3D framings (the current one ticked), Reset view and Save view, keys at the right; Hand armed, so a drag orbits (the cursor), right-drag pans, the wheel zooms toward the pointer. With Select, a drag orbits and Shift+drag draws the selection box.",
  },
};
