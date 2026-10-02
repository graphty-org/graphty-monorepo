// Screen 95: the Export menu and the Export image sheet. Karate Club in
// screen 3's state, nothing selected. The Export button's menu is drawn under
// it, tagged as the moment before, with "Export image..." highlighted; it
// opened the Export sheet, which takes the right panel's place (so the canvas
// stays live for framing) with one tab per export that has settings (Image,
// Data, Report, Video), on Image, and a footer with Copy and Export. The
// dashed frame on the canvas is the picture's edges. The status bar shows the
// confirmation Copy image leaves.
import { KARATE, menuItems } from "./screen-83.mjs";

export const EXPORT_SHEET = {
  kind: "Export", name: "Image",
  actions: [{ icon: "close", title: "Close (Esc)" }],
  tabs: ["Image", "Data", "Report", "Video"],
  framing: "100%",
  footer: [{ label: "Copy" }, { label: "Export", primary: true }],
};

export default {
  id: 95,
  title: "The Export menu and the Export image sheet",
  theme: "light",
  ...KARATE,
  canvas: {
    ...KARATE.canvas,
    overlays: { ...KARATE.canvas.overlays, exportFrame: { x: 150, y: 40, w: 660, h: 440, label: "2400 x 1600" } },
  },
  exportOpen: true,
  menus: [{
    tag: "A moment before: the Export button",
    anchor: { el: "export", side: "below", align: "end" },
    width: 232,
    rows: menuItems([
        { label: "Export image...", chosen: true },
        { label: "Copy image", key: "Ctrl+Shift+C" },
        "-",
        { label: "Export data..." },
        { label: "Export report..." },
        { label: "Export video..." },
        { label: "Export styles..." },
        { label: "Export bundle..." },
        { label: "Export recipe..." },
        { label: "Copy methods text" },
      ]),
  }],
  inspector: {
    ...EXPORT_SHEET, tab: "Image",
    summary: "2400 x 1600 PNG, about 1.2 MB",
    reading: "34 nodes in the frame; the legend is drawn in.",
    rows: [
      { type: "select", label: "Preset", value: "Web" },
      { type: "select", label: "Format", value: "PNG" },
      { type: "select", label: "Scale", value: "2x", note: "2400 x 1600" },
      { type: "select", label: "Framing", value: "Current view" },
      { type: "switch", label: "Transparent background", on: false, wide: true },
      { type: "switch", label: "Legend in picture", on: true, wide: true },
      { type: "switch", label: "Notes in picture", on: false, wide: true },
      { type: "disclosure", title: "Quality", summary: "2x supersampling, smoothing" },
      { type: "note", text: "Copy image (Ctrl+Shift+C) uses these settings without opening this sheet. Formats are the ones this browser can write; SVG and PDF appear when the element can capture them." },
    ],
  },
  status: { counts: { nodes: 34, edges: 78 }, notice: { text: "Image copied to the clipboard", tone: "success" }, layout: "Spread out: settled", zoom: "100%" },
  caption: {
    title: "Screen 95: the Export menu and the Export image sheet.",
    text: "The Export button's menu is drawn under it, tagged as the moment before, with \"Export image...\" highlighted. Look at: the menu in two groups, the picture first (Export image..., Copy image with its key) then data, report, video, styles, bundle, recipe and methods text; the Export sheet in the right panel's place with a tab per export that has settings, on Image: Preset first (Print, Web, Thumbnail, Documentation), Format, Scale with the pixel size, Framing, three switches, Quality folded, and Copy and Export in the sheet's footer; the summary row with the size and weight of the file; the canvas left live behind the sheet so the reader can frame the picture, the picture's edges drawn as a dashed frame with its size; the status bar's confirmation from the last Copy image. Esc or the close button returns the inspector.",
  },
};
