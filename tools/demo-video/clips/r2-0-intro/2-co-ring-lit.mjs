// Round 2 intro, shot 2: the Fraud ring layer's eye: thirteen large nodes in the middle snap red, the
// twelve accounts and the address they share, joined by red edges; then the wheel moves in on them.
import { BANK_CLIP } from "../r2-1-fraud-ring/bank.js";
import { darkRing, NEAR_EYE, ringCenter } from "./coldopen.js";

let center = null; // the shared address on screen, found in setup

export default {
    id: "co-ring-lit",
    ...BANK_CLIP,
    chapter: 0,
    caption: "Found: 12 accounts sharing one address",
    async setup(h) {
        await darkRing(h);
        center = await ringCenter(h);
        await h.park({ x: NEAR_EYE.x + 15, y: NEAR_EYE.y + 6 });
    },
    leadMs: 600,
    async run(h) {
        await h.click("Show Fraud ring");
        h.mark("ring lit");
        // then a slow wheel in on the shared address: the camera, not the edit, frames the ring
        await h.scroll(center, -200, { ms: 1400 });
        await h.move({ x: 1560, y: 960, width: 80, height: 50 }); // off the ring for the hold
        h.mark("framed");
    },
    holdMs: 2500,
};
