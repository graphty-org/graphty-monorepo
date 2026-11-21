// Round 3, intro shot 4, cut full-bleed: the bank, colored by community, glides from its force
// drawing onto rings by community (Arc move), then onto one circle. The Layout popover is cut away:
// each window starts once Apply has closed it.
import { pickLayout, ringsByCommunity, setTransition } from "../r2-5b-and-more/more.js";
import { bankIntro, INTRO_CLIP, OFF_CANVAS } from "./intro.js";

export default {
    id: "intro-morph",
    ...INTRO_CLIP,
    caption: "Animated layouts",
    tag: "Synthetic data",
    async setup(h) {
        await bankIntro(h);
        await setTransition(h.page, /^Rings by group\b/, "Arc move", 1.6);
        await h.park({ x: 1100, y: 900 });
    },
    leadMs: 400,
    async run(h) {
        await ringsByCommunity(h);
        h.mark("rings");
        await h.move(OFF_CANVAS);
        await h.app.settled();
        await pickLayout(h, /^Circle\b/);
        h.mark("circle");
        await h.move(OFF_CANVAS);
        await h.app.settled();
        h.mark("done");
    },
    holdMs: 1500,
};
