// Screen 18: save the project, and reopen one whose linked data is missing
// (round-3/file-project.md, "Save and reopen a project"). Main state: the
// first Ctrl+S on Karate Club opened the Save project dialog. The generator
// reopen case (a later Open recent of a project that links to a file the
// browser no longer has) is an inset at the stage's left, and the saved state after pressing Save (the
// status bar's green notice "Saved karate-club.graphty 14:02", the dot gone,
// Overview's "Project" row) is the second inset.
import { EDITED } from "./screen-16.mjs";

export default {
  id: 18,
  title: "Save the project; reopen one whose data is missing",
  theme: "light",
  file: EDITED.file,
  fileState: { unsaved: true },
  left: EDITED.left,
  canvas: {
    ...EDITED.canvas,
    overlays: {
      ...EDITED.canvas.overlays,
      dialog: {
        title: "Save project",
        rows: [
          { type: "field", label: "File name", value: "karate-club", suffix: ".graphty", focus: true },
          { type: "radio", label: "Data", items: [{ label: "Include the data", note: "adds 9 KB", checked: true }, { label: "Link to the source", note: "karate.gml" }] },
          { type: "note", text: "Include: the project opens anywhere, on any machine. Link: smaller, but karate.gml must be found again when the project is reopened." },
          { type: "note", text: "Saves karate-club.graphty with the 3 objects and their results, 2 Views, 3 notes and the node positions. Not kept: Settings (theme, GPU, assistant key)." },
          { type: "note", text: "Chrome and Edge write back to this file on every later Ctrl+S. Firefox and Safari download a new copy each time." },
        ],
        footer: [{ label: "Cancel" }, { label: "Save", primary: true }],
      },
    },
  },
  insets: [
    {
      tag: "Later: reopening it without its data", left: 256, top: 56, width: 256,
      title: "Open karate-club.graphty",
      rows: [
        { type: "note", text: "Open recent > karate-club.graphty, saved with Link to the source." },
        { type: "keyValue", pairs: [{ label: "Needs", value: "karate.gml", note: "34 nodes  78 edges", wide: true }] },
        { type: "text", text: "Not found in this browser.", tone: "warning" },
      ],
      footer: [{ label: "Open without data" }, { label: "Locate the file...", primary: true }],
    },
    {
      tag: "After Save: the status bar and Overview", left: 256, top: 330, width: 256,
      title: "Saved",
      rows: [
        { type: "keyValue", pairs: [{ label: "Header", value: "Karate Club", note: "no dot", wide: true }] },
        { type: "keyValue", pairs: [{ label: "Project", value: "karate-club.graphty, 14:02", wide: true }] },
        { type: "text", text: "Saved karate-club.graphty 14:02", tone: "success" },
      ],
    },
  ],
  toolbar: EDITED.toolbar,
  inspector: EDITED.inspector({ value: "Not saved", action: "Save..." }),
  status: EDITED.status,
  caption: {
    title: "Screen 18: Save project (Ctrl+S), and reopening a project whose data is missing.",
    text: "The first Ctrl+S opened Save project: a file name, Include the data (default under 50 MB) or Link to the source, what the project keeps and what it does not, and what each browser does on the next Ctrl+S. Insets: reopening a linked project whose data file is gone (Locate the file..., checked by its fingerprint, or Open without data); and after Save, the dot gone from the header, the status bar's green \"Saved karate-club.graphty 14:02\" for 4 s, and Overview's first row reading \"Project  karate-club.graphty, 14:02\".",
  },
};
