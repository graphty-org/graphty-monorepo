// Screen 97: the Export sheet's Report tab, on screen 3's state. The report
// is a checklist: the tree's objects in tree order, then the fixed sections.
// The Format select is open; its last row is the evidence bundle (one ZIP of
// the report, the project file, the data and the images), whose two choices
// appear on this tab when it is picked.
import { KARATE, menuItems } from "./screen-83.mjs";
import { EXPORT_SHEET } from "./screen-95.mjs";

export default {
  id: 97,
  title: "Export a report or a bundle",
  theme: "light",
  ...KARATE,
  canvas: {
    ...KARATE.canvas,
    overlays: { ...KARATE.canvas.overlays },
  },
  menus: [{
    anchor: { inspectorRow: 7, side: "left", align: "start", dx: -8, dy: -40 },
    width: 244,
    rows: menuItems([
        { label: "HTML", note: "one file", chosen: true },
        { label: "Markdown", note: "ZIP with images" },
        { label: "PDF", note: "for print" },
        "-",
        { label: "Evidence bundle", note: "ZIP" },
        { head: "The report, the project file, the data and the images in one ZIP; adds Original data file and Images at print size" },
      ]),
  }],
  inspector: {
    ...EXPORT_SHEET, name: "Report", tab: "Report", footer: [{ label: "Export", primary: true }],
    summary: "5 sections, 1 image, about 600 KB",
    reading: "Objects in tree order, each with its reading, values and method.",
    rows: [
      { type: "section", title: "Objects" },
      { type: "checkbox", items: [{ label: "Degree > 8", checked: true }, { label: "Connections", checked: false }] },
      { type: "checkbox", items: [{ label: "Communities", checked: true }] },
      { type: "section", title: "Sections" },
      { type: "checkbox", items: [{ label: "Statistics", checked: true }, { label: "Image", checked: true }] },
      { type: "checkbox", items: [{ label: "Legend", checked: true }, { label: "Methods", checked: true }] },
      { type: "checkbox", items: [{ label: "Notes", checked: false }], button: "none yet" },
      { type: "select", label: "Format", value: "HTML" },
      { type: "select", label: "Image", value: "As Export image" },
    ],
  },
  status: { counts: { nodes: 34, edges: 78 }, layout: "Spread out: settled", zoom: "100%" },
  caption: {
    title: "Screen 97: export a report or an evidence bundle.",
    text: "Export > \"Export report...\" opened the Report tab. Look at: OBJECTS, one tick per tree row in tree order (each becomes a section with its reading, its values or members, and its Record); SECTIONS: Statistics (the Dataset's Overview facts), Image, Legend, Methods (the methods text of every ticked object), Notes (greyed \"none yet\" when there are none); Format and the image settings (\"As Export image\" reuses the Image tab); the summary row's count and size. The Format list is open: HTML, Markdown, PDF, and Evidence bundle, a ZIP of the report, the project file, the data and the images, whose two choices (include the original data file; images at print size) take the Image row's place when it is picked. Export > \"Export bundle...\" opens this tab with the bundle chosen.",
  },
};
