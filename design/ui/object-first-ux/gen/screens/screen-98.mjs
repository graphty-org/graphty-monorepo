// Screen 98: the Export sheet's Video tab while a video is being written.
// Karate Club in screen 3's state with three saved Views, which are the
// camera's waypoints ("Along views": the Views list is the storyboard). The
// export runs in the background: the tab shows its progress and Cancel, and
// the status bar's computing chip mirrors it, so the sheet can be closed.
import { KARATE } from "./screen-83.mjs";
import { EXPORT_SHEET } from "./screen-95.mjs";

export default {
  id: 98,
  title: "Export a video along the saved views",
  theme: "light",
  ...KARATE,
  left: {
    ...KARATE.left,
    views: { rows: [{ name: "Overview", current: true }, { name: "Group 2 close-up" }, { name: "The two leaders" }] },
  },
  canvas: {
    ...KARATE.canvas,
    overlays: { ...KARATE.canvas.overlays, exportFrame: { x: 140, y: 60, w: 680, h: 383, label: "1920 x 1080, the camera's path" } },
  },
  inspector: {
    ...EXPORT_SHEET, name: "Video", tab: "Video", footer: [{ label: "Export", primary: true, disabled: true }], footerNote: "Writing 30%",
    summary: "1920 x 1080 WebM, 10 s, about 40 MB",
    reading: "The camera moves through the three saved views in order.",
    rows: [
      { type: "select", label: "Camera", value: "Along views" },
      { type: "table", columns: ["1fr", "56px"], head: ["View", "Seconds"], rows: [["Overview", "3"], ["Group 2 close-up", "4"], ["The two leaders", "3"]] },
      { type: "keyValue", pairs: [{ label: "Duration", value: "10 s" }, { label: "Rate", value: "30 fps" }] },
      { type: "segmented", label: "Format", options: ["WebM", "MP4"], value: "WebM" },
      { type: "switch", label: "While the layout settles", on: false, wide: true },
      { type: "switch", label: "While the time window plays", on: false, wide: true, caption: "needs a time column; this data has none" },
      { type: "switch", label: "Transparent background", on: false, wide: true },
      { type: "progress", label: "Writing 30%", value: 30, cancel: true },
    ],
  },
  status: { counts: { nodes: 34, edges: 78 }, computing: { text: "Exporting video 30%", cancel: "Cancel" }, layout: "Spread out: settled", zoom: "100%" },
  caption: {
    title: "Screen 98: export a video along the saved views.",
    text: "Export > \"Export video...\" opened the Video tab; the reader pressed Export. Look at: Camera [Along views] (also Hold still, Orbit) with one row per saved View and its seconds, in the Views list's order, so reordering Views reorders the film; Duration and frames a second; Format [WebM | MP4] (MP4 greyed where the browser cannot record it); the two animation sources, the layout settling and the time window playing, the second greyed with its reason; Transparent background; the summary row's size estimate; the dashed frame on the canvas that the video will show; the progress row with Cancel (Export waits in the footer), mirrored by the status bar's \"Exporting video 30% [Cancel]\" so the sheet can be closed while it runs.",
  },
};
