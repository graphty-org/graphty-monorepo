// The Hunt, shot 4: the colored network with the amber ring in the middle; the camera pushes in
// slowly along the line with no nodes in the way (mark "push"), drifting round, then leans toward
// ACC-1484 as a reticle swings in and locks onto it ("lock"); then the ring turns red and rings out
// with a shockwave while everything else fades to nothing ("dark"), the camera circling on as the
// ring turns (hunt.js payoff). Shot 2x slow (the restyles lag on a loaded machine; the cut ramps
// each step onto its beat between 2.2x and 3x).
import { addLayer, CINE_CLIP } from "../r4-intro/cine.js";
import { rig } from "../r4-intro-shape/shape.js";

import {
    clearView,
    comets,
    FLAT,
    HUNT,
    huntLook,
    MARK,
    noCursor,
    payoff,
    preparePayoff,
    prepareCommunities,
    snap,
} from "./hunt.js";

const K = 2; // undercrank
let keys;
let prep;

export default {
    id: "hunt-lock",
    ...CINE_CLIP,
    ...HUNT,
    async setup(h) {
        const look = await huntLook(h, "hunt-lock");
        await comets(h, K, look.ring.trail);
        await snap(h, await prepareCommunities(h), look.size);
        await addLayer(h, {
            name: "Mark",
            target: "node",
            selector: { match: "ids", nodes: [MARK] },
            set: { "node.size": 3.6 },
        });
        prep = await preparePayoff(h, look.ring);
        const R = look.ring.radius;
        const c = look.pos[FLAT];
        const m = look.pos[MARK];
        const mid = { x: (c.x + m.x) / 2, y: (c.y + m.y) / 2, z: (c.z + m.z) / 2 };
        const v = await clearView(h, c, R * 3.6);
        keys = [
            { target: c, alpha: v.alpha, beta: v.beta, radius: R * 3.6, ms: 1, mark: "push" },
            { target: c, alpha: v.alpha + 0.12, beta: v.beta, radius: R * 3, ms: 1690 * K, easing: "linear" },
            {
                target: mid,
                alpha: v.alpha + 0.26,
                beta: v.beta - 0.04,
                radius: R * 2.4,
                ms: 1690 * K,
                easing: "linear",
            },
            { target: c, alpha: v.alpha + 0.55, beta: v.beta - 0.1, radius: R * 2.7, ms: 5500 * K, easing: "easeOut" },
        ];
        await rig(h, [{ ...keys[0], mark: undefined }]);
        await h.app.frames(30);
        await noCursor(h);
    },
    async run(h) {
        await Promise.all([
            rig(h, keys),
            (async () => {
                await h.pause(1690 * K);
                await payoff(h, prep, K);
            })(),
        ]);
    },
    holdMs: 300,
};
