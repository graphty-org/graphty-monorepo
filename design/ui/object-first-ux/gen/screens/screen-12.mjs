// Screen 12: screen 3 in the dark theme (round-2/screens.md). The state is
// screen 3's, imported from its spec so nothing is typed twice; only the
// theme changes. The outline style, the Set's ring chip and the labels are
// "ink", which the theme resolves to #ffffff here and #1e1e1e on screen 3.
import { STATE } from "./screen-3.mjs";

export default {
  id: 12,
  title: "Screen 3 in the dark theme",
  theme: "dark",
  ...STATE,
  caption: {
    title: "Screen 12 of 15: screen 3 in the dark theme.",
    text: "The same state as screen 3 with data-theme=\"dark\". Look at: panels #2c2c2c on a #1e1e1e canvas; the one accent (Export, the selected row's tint) at #0c8ce9; the Okabe-Ito colours, the #d55e00 override and the gold halo unchanged; the Degree > 8 outline, its ring chip and the six labels now white because they are the theme's ink; the default edge grey #5a5a5a; the legend card dark with white text; the tab strip, the labelled toolbar and every row exactly where screen 3 has them.",
  },
};
