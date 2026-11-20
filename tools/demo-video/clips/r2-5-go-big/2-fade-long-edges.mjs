// Round 2, clip 5.2: Edge line > Fade end 10: edges long on screen fade out, and the communities
// (colored by Louvain) stand out in the short edges that stay.
import { addLineSetting, BIG_CLIP, bioplex, REST } from "./big.js";

export default {
    id: "fade-long-edges",
    ...BIG_CLIP,
    caption: "Fade long edges to see communities",
    async setup(h) {
        await bioplex(h);
        await h.park({ x: 1600, y: 600 });
    },
    leadMs: 500,
    async run(h) {
        await addLineSetting(h, "fade end", "10");
        h.mark("faded");
        await h.move(REST);
        await h.app.settled();
    },
    holdMs: 1500,
};
