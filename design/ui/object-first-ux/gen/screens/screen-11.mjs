// Screen 11: the toolbar reference sheet (round-2/screens.md). Not an app
// screen: page: "reference" makes render.mjs draw the white sheet instead of
// the frame. Top to bottom: the bar at 1:1 with a callout per button and the
// 725 px dimension line; the fit band at 1280 (the bar between two 240 px
// panel outlines in an 800 px canvas, the legend card above its right end);
// every flyout open in a column with proposed rows at 50 percent and their
// issue numbers; the example strips and the Communities parameters popover;
// the footnote. build.mjs captures it full page and also writes it as
// toolbar-reference.html and .png.
import { OKABE_4 } from "../palettes.mjs";

export default {
  id: 11,
  page: "reference",
  title: "The toolbar, every control and every menu",
  heading: "The toolbar, every control and every menu",
  intro: "The round-4 toolbar (round-4/revision-round-4.md section 3) as a picture, drawn from design/ui/object-first-ux/gen/toolbar.mjs, the one definition every screen's toolbar is rendered from. Eight controls with no words on them: Select, Filter, Path, Groups, Rank, Structure, Actions (the command palette, Ctrl+K) and the view-mode button, whose face is the mode; a ninth, Time, only when the data has a time column. Each control's name, key and one sentence are its tooltip. Six flyouts and the view-mode menu. In a flyout the left icon is the kind of tree row the item makes (a Set, a Measure, a Grouping, a Finding); the bold row is the face a plain click uses; the technical name follows in secondary text; the cost sits at the right; \"...\" opens the parameters popover; a row at 50 percent is proposed, with its issue number, and is absent from the app's flyout until its capability is registered.",
  fit: {
    width: 1280,
    text: "At 1280 x 800 the canvas between the rail with its left panel (57 + 240) and the inspector (241) is 742 px, so the 505 px bar (Time shown) leaves 118 px clear on each side, 138 without Time. The legend card keeps its place 12 px above the bar's top and 12 px from the inspector.",
    legend: { blocks: [{ title: "Communities", rows: [
      { chip: { type: "swatch", color: OKABE_4[0] }, label: "Group 1", count: 12 },
      { chip: { type: "swatch", color: OKABE_4[1] }, label: "Group 2", count: 11 },
      { chip: { type: "swatch", color: OKABE_4[2] }, label: "Group 3", count: 6 },
      { chip: { type: "swatch", color: OKABE_4[3] }, label: "Group 4", count: 5 },
    ] }] },
  },
  stripsText: "The secondary bar appears the moment a tool is armed: the variant, the scope, the count and the cost, one filled verb, the gear (the parameters popover) and the X (Cancel, Esc). Filter's Create is a split button whose second row is Create and focus. The popover opens from the gear, from a flyout row's \"...\", or always for Filter.",
  strips: [
    { tool: "rank", variant: "Connections", scope: "what is showing", count: "115", cost: "instant" },
    { tool: "path", variant: "Shortest route", stage: "end" },
    { tool: "filter", variant: "By values", count: 8 },
  ],
  popover: {
    title: "Communities",
    rows: [
      { type: "text", text: "On what is showing, 34 nodes" },
      { type: "number", fields: [{ caption: "Resolution", value: "1.0" }, { caption: "Seed", value: "42", button: "dice" }] },
      { type: "number", label: "Iterations", fields: [{ value: "100" }] },
      { type: "switch", label: "Weights", on: false, second: { label: "Direction", select: "As loaded" } },
      { type: "text", text: "About 80 ms" },
    ],
    footer: [{ label: "Run" }],
  },
  foot: "Every flyout row is also a Ctrl+K command under both names. A plugin algorithm appears in the flyout its catalogue entry names. On a fresh session the faces are Select, By values, Shortest route, Communities, Connections, Separate pieces.",
  caption: {
    title: "Screen 11: the toolbar reference sheet (round 4).",
    text: "The icon-only bar at 1:1 with a callout per control and its width (505 px with Time, 465 without); the fit at 1280 between the rail, the left panel and the inspector; every control's tooltip, which is its label; six flyouts and the view-mode menu open in columns (proposed rows at 50 percent with their issue numbers; Hand is Select's third row, Around a node is Filter's last); the trimmed Rank, Path and Filter strips; the Communities popover; the footnote.",
  },
};
