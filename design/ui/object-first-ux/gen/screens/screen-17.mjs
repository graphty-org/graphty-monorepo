// Screen 17: the save-changes prompt and the Close dataset confirmation
// (round-3/file-project.md, "Unsaved work" and "Close the dataset"). One
// prompt serves every action that replaces or closes the dataset while it has
// unsaved work; only its first sentence and its buttons change. The main
// state is the prompt that File > Open recent > les-miserables.gml raised
// (the dialog). The Close
// dataset variant, raised from the Dataset's "..." menu, is drawn as an
// inset at the stage's left, above the scrim.
import { EDITED } from "./screen-16.mjs";

const lost = [
  { type: "keyValue", pairs: [{ label: "Objects", value: "3" }, { label: "Views", value: "1 saved" }] },
  { type: "keyValue", pairs: [{ label: "Notes", value: "3" }, { label: "Moved nodes", value: "5" }] },
  { type: "keyValue", pairs: [{ label: "Last saved", value: "never", wide: true }] },
];

export default {
  id: 17,
  title: "Save changes before opening another dataset; Close dataset",
  theme: "light",
  file: EDITED.file,
  fileState: { unsaved: true },
  left: EDITED.left,
  canvas: {
    ...EDITED.canvas,
    overlays: {
      ...EDITED.canvas.overlays,
      dialog: {
        title: "Save changes to Karate Club?",
        rows: [
          { type: "note", text: "Opening les-miserables.gml replaces Karate Club. This work is not in a project file yet:" },
          ...lost,
          { type: "text", text: "An unsaved copy stays in Open recent for 7 days." },
          { type: "link", text: "Open les-miserables.gml as a second graph instead" },
        ],
        footer: [{ label: "Cancel" }, { label: "Don't save" }, { label: "Save...", primary: true }],
      },
    },
  },
  insets: [{
    tag: "Also: Close dataset", left: 256, top: 56, width: 256,
    title: "Close Karate Club?",
    rows: [
      { type: "note", text: "From the Dataset's \"...\" menu, or File > Close dataset. Closes the graph and everything made from it:" },
      ...lost,
      { type: "text", text: "Copy kept in Open recent, 7 days" },
    ],
    footer: [{ label: "Cancel" }, { label: "Close" }, { label: "Save first", primary: true }],
  }],
  toolbar: EDITED.toolbar,
  inspector: EDITED.inspector({ value: "Not saved", action: "Save..." }),
  status: EDITED.status,
  caption: {
    title: "Screen 17: the save-changes prompt, and Close dataset.",
    text: "Karate Club has unsaved work (the dot after its name in the header). File > Open recent > les-miserables.gml raised the prompt in the middle: what would be lost, counted (3 objects, 1 saved View, 3 notes, 5 hand-moved nodes, never saved), the 7-day copy, a way out that loses nothing (open it as a second graph), and Save... as the one filled button. The inset at the left is the same prompt as Close dataset raises it (from the Dataset's \"...\" menu or the file menu): Cancel, Close, Save first. With no unsaved work neither prompt appears.",
  },
};
