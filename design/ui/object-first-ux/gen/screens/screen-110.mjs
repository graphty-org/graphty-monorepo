// Screen 110: Export styles (round-4/revision-round-4.md section 6.3). The
// Styles panel of screen 106, its "Export styles..." button pressed, opened
// this dialog: what to write (Everything, The look only, Saved styles and
// palettes), a list of what goes in the file with counts, what never goes in
// it, and the file name. The toast the export leaves is not drawn: the
// generator has no Toast part.
import { SHOT, STYLES } from "./screen-106.mjs";

export default {
  id: 110,
  title: "Export styles",
  theme: "light",
  ...SHOT,
  left: STYLES({ focus: "export" }),
  canvas: {
    ...SHOT.canvas,
    overlays: {
      ...SHOT.canvas.overlays,
      dialog: {
        title: "Export styles",
        rows: [
          { type: "segmented", label: "What", options: ["Everything", "The look only", "Saved styles and palettes"], value: "Everything", fill: true },
          { type: "table", columns: ["1.1fr", "40px", "2fr"], head: ["Goes in the file", "", "Which"], rows: [
            ["Style layers", "7", "in paint order, with their selectors"],
            ["Look", "1", "Default"],
            ["Saved styles", "3", "Thick red dashed, Orange outline, ..."],
            ["Palettes", "2", "Okabe-Ito, Viridis"],
            ["Legend settings", "1", "bottom right, Sets shown"],
          ] },
          { type: "text", text: "Never in the file: data, objects, members, positions, views." },
          { type: "field", label: "File name", value: "karate-styles", suffix: ".graphty-style.json" },
        ],
        footer: [{ label: "Cancel" }, { label: "Export", primary: true }],
      },
    },
  },
  caption: {
    title: "Screen 110: Export styles.",
    text: "Styles panel > Files > Export styles... (the pressed button at the panel's foot; the Export menu's \"For reuse\" group and Ctrl+K reach the same dialog). Look at: What [Everything | The look only | Saved styles and palettes]; the list of what goes in the file with a count per kind; the one line saying what never does; the file name with its fixed extension; one filled button, Export, which downloads the file. After it, a toast (not drawn) says \"Exported karate-styles.graphty-style.json\".",
  },
};
