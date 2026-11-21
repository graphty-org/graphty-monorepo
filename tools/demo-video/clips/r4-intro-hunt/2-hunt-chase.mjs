// The Hunt, shot 2: the camera chases the money round the ring, one transfer a hop: each hop cuts
// (mark "hop1".."hop5") to a camera side on to the next transfer, partway along it, and glides with
// its comets onto the next account, which lands about a third of the frame high (hunt.js hopKeys).
// Shot 2x slow (moves and comets at half speed): cut it at 2x, one hop per beat, the last two per
// half beat.
import { CINE_CLIP } from "../r4-intro/cine.js";
import { rig } from "../r4-intro-shape/shape.js";

import { comets, hopKeys, HUNT, huntLook, noCursor } from "./hunt.js";

const K = 2; // undercrank
/** Each hop's move, in the app: a beat (0.84 s) on screen for the first three, half a beat after. */
const HOP_MS = [1900, 1900, 1900, 1050, 1050];
let keys;

export default {
    id: "hunt-chase",
    ...CINE_CLIP,
    ...HUNT,
    async setup(h) {
        const look = await huntLook(h, "hunt-chase");
        await comets(h, K, look.ring.trail);
        keys = HOP_MS.flatMap((ms, i) => hopKeys(look.pos, i, ms, `hop${i + 1}`));
        await rig(h, [{ ...keys[0], mark: undefined }]);
        await h.app.frames(30);
        await noCursor(h);
    },
    async run(h) {
        await rig(h, keys);
    },
    holdMs: 300,
};
