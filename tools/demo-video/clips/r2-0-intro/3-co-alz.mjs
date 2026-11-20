// Round 2 intro, shot 3: the Alzheimer's network at the end of chapter 2: communities outlined, the
// approved-drug targets in their own layer, the ACHE to APOE path bold and named. The hand is still.
import { ALZ_CLIP, alzHull, alzPathBold, alzSelectApproved, alzTargetsLayer } from "../r2-2-alzheimer/alz.js";

export default {
    id: "co-alz",
    ...ALZ_CLIP,
    chapter: 0,
    caption: "And inside Alzheimer's disease",
    async setup(h) {
        await alzHull(h);
        await alzSelectApproved(h);
        await alzTargetsLayer(h);
        await alzPathBold(h);
        await h.park({ x: -10, y: -10 }); // no cursor in this shot
    },
    leadMs: 800,
    async run(h) {
        await h.pause(1200);
    },
    holdMs: 1500,
};
