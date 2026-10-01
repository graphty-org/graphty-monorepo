// Screen 112: Export recipe from the file menu (round-4/revision-round-4.md
// sections 2.8 and 6.3). Karate Club in screen 3's state, nothing selected,
// never saved, Objects the active rail item. The file menu is drawn as the
// moment before, with its round-4 rows: the recipe pair (Run a recipe...,
// Export recipe...) sits under Save project, and Export recipe... is
// highlighted. The dialog lists the session's steps in the order they ran,
// each with a checkbox, the two switches, what the recipe will need from new
// data, and the file name.
import { KARATE, menuItems } from "./screen-83.mjs";
import { DATASET2 } from "./screen-106.mjs";

const step = (label, checked = true) => ({ type: "checkbox", items: [{ label, checked }] });

export default {
  id: 112,
  title: "Export recipe from the file menu",
  theme: "light",
  ...KARATE,
  fileState: { unsaved: true, menuOpen: true },
  canvas: {
    ...KARATE.canvas,
    overlays: {
      ...KARATE.canvas.overlays,
      dialog: {
        title: "Export recipe",
        rows: [
          { type: "text", text: "Steps, in the order they ran" },
          step("1  Load karate.gml (GML, undirected)"),
          step("2  Rename column 'club' to 'faction'"),
          step("3  Set: Degree > 8"),
          step("4  Connections (Degree)"),
          step("5  Communities (Louvain), resolution 1.0"),
          step("6  Style: Communities colour, Group 2 override"),
          step("7  Style: Degree > 8 outline"),
          step("8  Layout: Spread out, seed 42", false),
          { type: "switch", label: "Include views", on: true, wide: true, second: { label: "Include data edits", on: true } },
          { type: "keyValue", pairs: [{ label: "Checks on new data", value: "needs column club; any number of nodes", wide: true }] },
          { type: "field", label: "File name", value: "karate-analysis", suffix: ".recipe.json" },
        ],
        footer: [{ label: "Cancel" }, { label: "Export", primary: true }],
      },
    },
  },
  menus: [{
    tag: "A moment before: the file menu",
    anchor: { el: "file", side: "below", align: "start", dx: 8, dy: -8 },
    width: 244,
    rows: menuItems([
      { label: "Open...", key: "Ctrl+O" },
      { label: "Open recent", sub: true },
      { label: "Open sample", sub: true },
      "-",
      { label: "Save project", key: "Ctrl+S" },
      { label: "Save project as...", key: "Ctrl+Shift+S" },
      { label: "Close dataset" },
      "-",
      { label: "Run a recipe..." },
      { label: "Export recipe...", chosen: true },
    ]),
  }],
  inspector: { ...DATASET2, rows: [{ type: "keyValue", pairs: [{ label: "Project", value: "Not saved", action: "Save...", wide: true }] }, ...DATASET2.rows] },
  status: { counts: { nodes: 34, edges: 78 }, layout: "Spread out: settled", zoom: "100%" },
  caption: {
    title: "Screen 112: export recipe from the file menu.",
    text: "The file menu (the moment before) keeps what acts on the session: open, save, close, and the recipe pair under them, Run a recipe... and Export recipe.... The dialog: every step in the order it ran, each with a checkbox (the layout, unchecked, is left out, so new data gets its own); Include views and Include data edits; the checks the recipe will run on new data; the file name. A recipe holds the steps, never the data, results or positions. Also reached from Export > For reuse, History's \"...\", and Ctrl+K. Running one is screen 20 (file menu > Run a recipe..., or drop the file on the canvas).",
  },
};
