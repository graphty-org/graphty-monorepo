// The Hunt, shot 1: one ring account in close-up (pearl-shaded, square to its two transfers), the
// camera pushing in and turning, then pushing faster (23% closer over 3.7 s); it beats like a heart
// on the music's beats 13-15 (0.74, 1.58 and 2.42 s), and at 1.8 s (mark "packets") comets of light
// start running along its transfers, in and out. The fade up from black is the cut's (`fadeIn`).
// Real time (1x); the camera is flown with rig, so the style changes cannot hold it up.
import { addLayer, CINE_CLIP, tween } from "../r4-intro/cine.js";
import { rig } from "../r4-intro-shape/shape.js";

import { comets, HERO, HUNT, huntLook, noCursor, RING, wakeView } from "./hunt.js";

const START = RING[0];
let view;
let pulse;
let trail;

export default {
    id: "hunt-wake",
    ...CINE_CLIP,
    ...HUNT,
    async setup(h) {
        const look = await huntLook(h, "hunt-wake");
        trail = look.ring.trail;
        view = { ...wakeView(look.pos), target: look.pos[START] };
        pulse = await addLayer(h, {
            name: "Pulse",
            target: "node",
            selector: { match: "ids", nodes: [START] },
            set: { "node.size": HERO["node.size"] },
        });
        await rig(h, [{ ...view, radius: 9.5, ms: 1 }]);
        await h.app.frames(30);
        await noCursor(h);
    },
    async run(h) {
        h.mark("fade");
        const t0 = Date.now();
        const at = async (ms) => h.pause(Math.max(0, ms - (Date.now() - t0)));
        const size = HERO["node.size"];
        await Promise.all([
            rig(h, [
                { ...view, alpha: view.alpha + 0.1, radius: 8.7, ms: 1800, easing: "linear" },
                { ...view, alpha: view.alpha + 0.3, radius: 7.3, ms: 1900, easing: "linear" },
            ]),
            (async () => {
                for (const beat of [740, 1580, 2420]) {
                    await at(beat - 60);
                    await tween(h, pulse, { "node.size": size }, { "node.size": size * 1.25 }, 120);
                    await tween(h, pulse, { "node.size": size * 1.25 }, { "node.size": size }, 420);
                }
            })(),
            (async () => {
                await at(1800);
                h.mark("packets");
                await comets(h, 1, trail);
            })(),
        ]);
    },
    holdMs: 300,
};
