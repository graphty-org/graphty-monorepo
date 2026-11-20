// Round 2 intro, shot 1: the bank, every node pale gray. The question, before anything happens.
import { BANK_CLIP } from "../r2-1-fraud-ring/bank.js";
import { darkRing, NEAR_EYE } from "./coldopen.js";

export default {
    id: "co-ring-dark",
    ...BANK_CLIP,
    chapter: 0,
    caption: "A fraud ring hides in these 623 nodes",
    async setup(h) {
        await darkRing(h);
        await h.park({ x: 760, y: 700 });
    },
    leadMs: 800,
    async run(h) {
        // the hand drifts toward Style layers, where the next shot clicks
        await h.move(NEAR_EYE, { slow: 1.6 });
    },
    holdMs: 1500,
};
