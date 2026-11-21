// The Hunt, shot 3: from the account the chase landed on, the camera whips back in one move (mark
// "whip"; shot 2x slow, cut at 2x) to the whole network, nearer than Fit so its nodes read, and
// keeps drifting round it ("drift", real time); 1.13 s later the Louvain communities and their
// edges snap into saturated color and every node punches up in size ("color", on the first big
// hit). Flown with rig, so the restyle cannot hold the camera up.
import { CINE_CLIP } from "../r4-intro/cine.js";
import { orbitOf, rig } from "../r4-intro-shape/shape.js";

import { comets, hopKeys, HUNT, huntLook, noCursor, prepareCommunities, snap } from "./hunt.js";

const K = 2; // undercrank of the whip
let landed;
let wide;
let from;
let edgeLayers;
let size;

export default {
    id: "hunt-reveal",
    ...CINE_CLIP,
    ...HUNT,
    async setup(h) {
        const look = await huntLook(h, "hunt-reveal");
        size = look.size;
        await comets(h, K, look.ring.trail);
        edgeLayers = await prepareCommunities(h);
        // where the chase's last hop lands
        landed = hopKeys(look.pos, 4, 1, "x")[1];
        from = landed.target;
        const w = orbitOf(look.wide.position, look.wide.target);
        // the wide view's turn nearest the landing's, so the whip does not swing the long way round
        const alpha = w.alpha + 0.35 + 2 * Math.PI * Math.round((landed.alpha - w.alpha) / (2 * Math.PI));
        wide = { target: w.target, alpha, beta: 1.3, radius: w.radius * 0.6 };
        await rig(h, [{ ...landed, ms: 1 }]);
        await h.app.frames(30);
        await noCursor(h);
    },
    async run(h) {
        await rig(h, [
            {
                target: from,
                alpha: landed.alpha + 0.3,
                beta: landed.beta - 0.1,
                radius: 55,
                ms: 550 * K,
                easing: "easeIn",
                mark: "whip",
            },
            { ...wide, ms: 900 * K, easing: "easeOut" },
        ]);
        await Promise.all([
            rig(h, [
                {
                    ...wide,
                    alpha: wide.alpha + 0.3,
                    radius: wide.radius * 0.93,
                    ms: 4200,
                    easing: "linear",
                    mark: "drift",
                },
            ]),
            (async () => {
                await h.pause(1130);
                await snap(h, edgeLayers, size);
            })(),
        ]);
    },
    holdMs: 300,
};
