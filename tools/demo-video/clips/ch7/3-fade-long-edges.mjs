// Chapter 7, clip 3: the Style tab's Edge > Line settings, Fade end set, so the edges long on
// screen fade. Checked on the real drawing: the gray tangle thins and the nodes show through; the
// planted groups do not visibly separate in this layout, so the caption does not promise them.
import { FADE_END, laidOutForEdges, lineSetting } from "./big.js";

export default {
    id: "fade-long-edges",
    chapter: 7,
    caption: "Fade the long edges, and the tangle thins out.",
    async setup(h) {
        await laidOutForEdges(h);
        await h.park({ x: 1500, y: 880 });
    },
    async run(h) {
        await lineSetting(h, "fade end", FADE_END);
        h.mark("faded");
    },
};
