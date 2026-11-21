// Round 4, intro "Shape-shifter", take 2 (shot 4): from where take 1 lands (the lifted bank, seen
// from the side) the graph snaps to a circle, then to rings by community, then to a spiral, a
// shockwave ringing out of every node on each snap, while the camera orbits without a pause. Each
// change is a short glide and a long settle: the cut plays the glide 3x and the settle slower, so the
// change snaps and the landing breathes, each snap starting on a beat.
import { hideLegend } from "../r2-5b-and-more/more.js";
import { CINE_CLIP, layout, noCursor, onElement, slowMotion } from "../r4-intro/cine.js";
import {
    COMMUNITY,
    frameOf,
    glowLook,
    MORPH_END,
    orbitOf,
    pulledApart,
    rig,
    shapeBank,
    shapeLook,
    shock,
    swingEnd,
} from "./shape.js";

/** The slow-motion factor the shaders are slowed by (the cut plays the take 1.5-3x). */
const K = 2;
/** Each change: the glide (played 3x), then the time to the next change. */
const GLIDE_MS = 1200;
const STEP_MS = 1860;
/** The last shape holds this long (to the cut into the models). */
const LAST_MS = 3200;

export default {
    id: "shape-morph",
    ...CINE_CLIP,
    caption: "Shape-shifter: layouts",
    tag: "Synthetic data",
    async setup(h) {
        await shapeBank(h);
        await pulledApart(h);
        const { front } = await frameOf(h, 0.8);
        await onElement(h, (el) => el.setViewMode("3d"));
        await h.app.settled();
        h.start = swingEnd(orbitOf(front.position, front.target));
        await rig(h, [{ ...h.start, ms: 1 }], h.start);
        await slowMotion(h, { layoutSeconds: GLIDE_MS / 1000, transition: "glide" });
        await shapeLook(h, K);
        await glowLook(h, { k: K, size: 2.2, edgeOpacity: 0.3 });
        await hideLegend(h.page);
        await h.app.frames(60);
        await noCursor(h);
    },
    async run(h) {
        // one orbit over the whole take at an even speed, back from the swing toward the face of the
        // layouts, its center drifting to the origin where they land; the cut's ramp makes it race on
        // each snap
        const turn = rig(
            h,
            [{ ...MORPH_END, ms: STEP_MS * 2 + LAST_MS + 400, easing: "linear", mark: "orbit" }],
            h.start,
        );
        let ring = null;
        for (const [mark, type, opts, ms] of [
            ["circle", "circular", { dim: 2 }, STEP_MS],
            ["rings", "shell", { groupBy: COMMUNITY }, STEP_MS],
            ["spiral", "spiral", {}, LAST_MS],
        ]) {
            const t0 = Date.now();
            await layout(h, type, opts);
            h.mark(mark);
            ring = await shock(h, ring);
            await h.pause(Math.max(0, ms - (Date.now() - t0)));
        }
        await turn;
    },
    holdMs: 300,
};
