// Round 4, intro "Shape-shifter", take 3 (shot 5): from where take 2 lands (the spiral), every node
// turns into a 3D person model in its community color -- a style layer setting node.model to the
// app's Person sample, as Style > Shape > Model... > Person writes it -- while the camera pushes in
// low among the models, then whips round (fast, speeding up) for the hard cut into the globe, which
// carries the whip on in the same direction.
import { hideLegend } from "../r2-5b-and-more/more.js";
import { CINE_CLIP, noCursor, onElement } from "../r4-intro/cine.js";
import { glowLook, MODELS_END, MORPH_END, placeNow, rig, shapeBank, shapeLook } from "./shape.js";

/** The slow-motion factor (the cut plays the take 1.6x). */
const K = 1.6;
/** The whip at the end: the camera turns this far round the models, speeding up to the cut. */
const WHIP = 1.3;

export default {
    id: "shape-models",
    ...CINE_CLIP,
    caption: "Shape-shifter: 3D models",
    tag: "Synthetic data",
    async setup(h) {
        await shapeBank(h);
        await onElement(h, (el) => el.setViewMode("3d"));
        await placeNow(h, "spiral", {});
        await h.app.settled();
        await rig(h, [{ ...MORPH_END, ms: 1 }], MORPH_END);
        await shapeLook(h, K);
        // no lanterns: a lantern draws a sphere in place of the model
        await glowLook(h, { k: K, size: 2.2, edgeOpacity: 0.3, lanterns: false });
        // the Person model loaded off camera (a layer switched off again), so it is not drawn as a
        // large sphere while it loads when the take turns it on
        h.models = await onElement(h, async (el) => {
            const layer = await el.session.styles.add({
                name: "Models",
                target: "node",
                selector: { match: "everything" },
                set: { "node.model": "asset:sample/person", "node.size": 6 },
            });
            await el.waitForPainted();
            await el.session.styles.update(layer.id, { enabled: false });
            return layer.id;
        });
        await hideLegend(h.page);
        await h.app.frames(60);
        await noCursor(h);
    },
    async run(h) {
        const push = rig(
            h,
            [
                { ...MODELS_END, ms: 2600, easing: "easeOut", mark: "push" },
                { ...MODELS_END, alpha: MODELS_END.alpha - WHIP, ms: 1100, easing: "easeIn", mark: "whip" },
            ],
            MORPH_END,
        );
        await h.pause(250);
        await onElement(h, (el, id) => el.session.styles.update(id, { enabled: true }).then(() => null), h.models);
        h.mark("models");
        await push;
        h.mark("whipped");
    },
    holdMs: 300,
};
