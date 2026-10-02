// Screen 99: Present mode, stepping through saved Views. Karate Club in
// screen 3's state with five saved Views; the reader chose File > Present
// (Shift+\) and pressed Next once, so the second View is applied. Both panels,
// the toolbar and the status bar are hidden: the canvas fills the window and
// the pill at the bottom is the only control. The legend stays, because it is
// part of the picture.
import { KARATE } from "./screen-83.mjs";
import { COMMUNITIES } from "../karate.mjs";

export default {
  id: 99,
  title: "Present mode",
  theme: "light",
  ...KARATE,
  present: { pill: [{ text: "Group 2 close-up" }, { text: "2 of 5", secondary: true }, { ghost: "Previous" }, { ghost: "Next" }, { button: "Exit (Esc)" }] },
  canvas: { ...KARATE.canvas, labels: COMMUNITIES[2], camera: { center: 1, zoom: 1.5 } },
  caption: {
    title: "Screen 99: Present mode.",
    text: "File > Present (Shift+\\), or the Views header's \"...\" > \"Present from here\". Look at: no panels, toolbar or status bar, the canvas filling the window; the second of five saved Views applied (Group 2 close-up: the camera on node 1 at 150%, Group 2 labelled); the pill \"Group 2 close-up  2 of 5\" with Previous, Next and \"Exit (Esc)\"; the legend kept because it is part of the picture. The Views list is the running order; Left and Right arrows or Page Up and Page Down step, Home returns to the first. With no saved Views the pill reads \"No saved views: Exit\" and Present shows the current view full-window.",
  },
};
