// Screen 111: Save current look, and applying a look (round-4/revision-round-4.md
// sections 2.5 and 6.3). The Styles panel of screen 106 with a darker
// background and larger labels already set by hand. The "+" in the panel's
// title row is open: a popover names the whole-graph settings as a look and
// says what it includes and where it is kept. The inset is the moment after:
// the Look select open, the new look listed under the built-in ones and
// chosen.
import { SHOT, stylesRows } from "./screen-106.mjs";
import { KARATE, menuItems } from "./screen-83.mjs";

const rows = stylesRows({ look: "Default, edited" }).map((r) =>
  r.label === "Background" ? { ...r, color: "#ffffff", value: "White" } : r);

export default {
  id: 111,
  title: "Save current look, and the Look list",
  theme: "light",
  ...SHOT,
  left: { panel: "styles", views: KARATE.left.views, objects: KARATE.left.objects, styles: { rows, plusOpen: true } },
  canvas: {
    ...SHOT.canvas,
    overlays: {
      ...SHOT.canvas.overlays,
      popover: {
        title: "Save current look",
        left: 8, top: 44, caret: "left", caretAt: 24,
        width: 300,
        rows: [
          { type: "field", label: "Name", value: "Lab print", focus: true, caret: true },
          { type: "note", text: "Includes the background, the default node and edge, and the labels." },
          { type: "radio", label: "Keep in", items: [{ label: "This project" }, { label: "This project and my library", checked: true }] },
          { type: "note", text: "A look never changes an object's Style." },
        ],
        footer: [{ label: "Cancel" }, { label: "Save look", primary: true }],
      },
    },
  },
  menus: [{
    tag: "A moment after: the Look select",
    anchor: { sel: ".k-panel-left .k-prop", side: "right", align: "start", dx: 380, dy: 40 },
    width: 232,
    rows: menuItems([
      { label: "Default" },
      { label: "Presentation", note: "bigger" },
      { label: "Print", note: "grey, patterns" },
      { label: "Colour-blind safe" },
      { label: "High contrast" },
      { label: "Dark" },
      "-",
      { head: "Your looks" },
      { label: "Lab print", note: "new", chosen: true },
      { label: "Poster 2025" },
      "-",
      { label: "Save current look..." },
    ]),
  }],
  caption: {
    title: "Screen 111: save current look, and the Look list.",
    text: "The background was set to white by hand, so the Look select reads \"Default, edited\". Styles panel > \"+\" (open) is Save current look...; the same command is in Ctrl+K. Look at: Name; Includes, read from the current whole-graph settings; Keep in [This project | This project and my library], the library being this browser, so the look is offered in the next project; the one filled button, Save look. The moment after (dark menu): the Look select lists the built-in looks, then Your looks with Lab print chosen. Picking any row applies that look in one undo step, and Ctrl+K \"Look: Print\" does the same.",
  },
};
