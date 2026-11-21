// Round 4, intro "Shape-shifter", take 1 (shots 1-3), shot at K times slow and sped up K times in
// the cut. It opens close on a small knot of glowing nodes in the tangle, light packets already
// running along the edges; on the beat the force layout pulls the tangle apart while the camera
// cranes up and back, turning; the Louvain communities color in as a wave, left to right, in
// batches on the eighth beats, the nodes growing as they color; then the drawing switches to 3D and
// lifts into depth (#9372) before the camera swings to the side, so the move shows the depth.
import { hideLegend } from "../r2-5b-and-more/more.js";
import { CINE_CLIP, layout, noCursor, onElement } from "../r4-intro/cine.js";
import {
    communities,
    FORCE,
    frameOf,
    glowLook,
    grow,
    leftToRight,
    orbitOf,
    paintCommunities,
    rig,
    shapeBank,
    shapeLook,
    swingEnd,
    tangle,
} from "./shape.js";

/** The undercrank: every move K times slower than it plays. */
const K = 2;
/** One eighth beat of the music (71.2 bpm), in the take's slowed time. */
const EIGHTH = (60 / 71.2 / 2) * 1000 * K;
/** How many communities color in on each eighth beat (17 in all, five beats). */
const BATCHES = [4, 4, 3, 3, 3];

export default {
    id: "shape-tangle",
    ...CINE_CLIP,
    caption: "Shape-shifter: tangle to 3D",
    tag: "Synthetic data",
    async setup(h) {
        await shapeBank(h);
        h.ids = await communities(h);
        await paintCommunities(h, h.ids, false);
        await tangle(h);
        await h.app.settled();
        const { flat } = await frameOf(h);
        h.flat = flat;
        // close on a knot at the scatter's middle (the force layout first pulls the scatter in
        // toward it): a quarter of its width, so about 40 nodes fill the frame
        h.close = { zoom: flat.zoom * 4, pan: flat.pan, rotation: -0.2 };
        await rig(h, [{ ...h.close, ms: 1 }]);
        h.order = await leftToRight(h, h.ids);
        await shapeLook(h, K);
        // no neon: every edge of a random scatter crosses the frame, and their glow burns the knot white
        h.size = await glowLook(h, { k: K, size: 0.8, edgeOpacity: 0.5, neon: false });
        await hideLegend(h.page);
        // the shaders compiled and drawing before the first recorded frame
        await h.app.frames(60);
        await noCursor(h);
    },
    async run(h) {
        // a slow push into the knot while the light runs, then the force layout on the beat
        await rig(h, [
            { ...h.close, zoom: h.close.zoom * 1.12, rotation: -0.16, ms: 1360, easing: "linear", mark: "knot" },
        ]);
        await layout(h, ...FORCE);
        h.mark("force");
        // crane: up and back, turning, as the tangle pulls apart; the nodes grow as the camera
        // pulls away, so they stay bright points, not specks
        const swelling = grow(h, h.size, 0.8, 1.8, 5000);
        await rig(h, [
            {
                zoom: h.close.zoom * 0.45,
                pan: { x: h.flat.pan.x, y: h.flat.pan.y - 6 },
                rotation: -0.02,
                ms: 2400,
                easing: "easeIn",
                mark: "crane",
            },
        ]);
        const wide = await frameOf(h, 0.9);
        await rig(h, [{ ...wide.flat, zoom: wide.flat.zoom * 1.1, rotation: 0.12, ms: 2660, easing: "easeOut" }]);
        // the color wave, on the eighth beats, while the camera keeps turning toward level (linear,
        // so it is still moving when the view switches to 3D and the push carries on)
        await swelling;
        const framed = await frameOf(h, 0.85);
        const settle = rig(h, [{ ...framed.flat, rotation: 0, ms: EIGHTH * 6, easing: "linear", mark: "frame" }]);
        h.mark("flood");
        const growing = grow(h, h.size, 1.8, 2.6, EIGHTH * 5);
        let i = 0;
        for (const n of BATCHES) {
            const t0 = Date.now();
            await paintCommunities(h, h.order.slice(i, i + n), true);
            i += n;
            await h.pause(Math.max(0, EIGHTH - (Date.now() - t0)));
        }
        h.mark("colored");
        await growing;
        await settle;
        // 3D: the same picture straight on, a slow push while the drawing lifts, then the swing
        const { front } = await frameOf(h, 0.8);
        await onElement(h, (el) => el.setViewMode("3d"));
        h.mark("3D");
        const straight = orbitOf(front.position, front.target);
        await rig(h, [{ ...straight, radius: straight.radius * 0.95, ms: 1000, easing: "linear" }], straight);
        h.mark("swing");
        await rig(h, [{ ...swingEnd(straight), ms: 5740, easing: "easeOut" }]);
        h.mark("lifted");
    },
    holdMs: 300,
};
