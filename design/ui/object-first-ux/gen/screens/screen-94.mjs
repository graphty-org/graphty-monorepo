// Screen 94: saving, applying and importing styles. Screen 3's state (Group 2
// selected, its Style tab), where the Style tab now ends with the saved-style
// row: a select of the saved styles that fit this kind of object, and
// "Save..."; the Style tab's "..." keeps Reset style. Over it, the dialog a
// style file opens (from the file menu's "Import styles...", or by dropping
// the file): what the file holds, what each item fits, and the one choice
// that matters, add or replace.
import { STATE } from "./screen-3.mjs";

export default {
  id: 94,
  title: "Saving, applying and importing styles",
  theme: "light",
  ...STATE,
  canvas: {
    ...STATE.canvas,
    overlays: {
      ...STATE.canvas.overlays,
      dialog: {
        title: "Import styles from lab-look.json",
        rows: [
          { type: "keyValue", pairs: [{ label: "Holds", value: "3 saved styles, 1 look, 2 palettes", wide: true }] },
          { type: "table", columns: ["1.4fr", "1fr", "1.2fr"], head: ["Name", "Kind", "Fits"], rows: [
            ["Thick red dashed", "saved style", "Paths and edge Sets"],
            ["Orange outline", "saved style", "any node Set or Group"],
            ["Muted groups", "saved style", "Groupings"],
            ["Lab print", "look", "the Dataset (Canvas tab)"],
            ["Lab blues, Lab reds", "palettes", "every palette picker"],
          ] },
          { type: "segmented", label: "Import as", options: ["Add to mine", "Replace all"], value: "Add to mine" },
          { type: "note", text: "Add keeps every object's Style; the saved styles join the Saved style lists, the look joins Canvas > Look, the palettes join the picker. Replace all also resets every object's Style and the Dataset's look to the file's; objects keep their members, and one undo restores it." },
          { type: "text", text: "Name clash: \"Orange outline\" exists; the import is named \"Orange outline 2\"." },
        ],
        footer: [{ label: "Cancel" }, { label: "Import", primary: true }],
      },
    },
  },
  inspector: {
    ...STATE.inspector,
    rows: [
      ...STATE.inspector.rows,
      { type: "section", title: "Saved style" },
      { type: "select", label: "Apply", value: "Orange outline", note: "3 fit" },
      { type: "button", label: "", buttons: [{ label: "Save this style..." }, { label: "Reset", ghost: true }] },
    ],
  },
  caption: {
    title: "Screen 94: saving, applying and importing styles.",
    text: "Group 2 on its Style tab, as screen 3, with the saved-style rows at its foot. Look at: Apply [Orange outline] (the list holds only the saved styles that fit a Group, with a preview chip each; an edge style is listed greyed with \"fits edge Sets\"); \"Save this style...\" names the current rows as a saved style, stored in the project file; Reset returns the Group to its inherited colour. Over the canvas, the dialog a style file opens (file menu > \"Import styles...\", or a dropped .json): what it holds, what each item fits, Import as [Add to mine | Replace all] with what each does and that one undo restores it, and the name clash rule. Export > \"Export styles...\" writes the same file (screen 95).",
  },
};
