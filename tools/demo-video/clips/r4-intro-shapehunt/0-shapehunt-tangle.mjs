// Round 4, intro "Shape-shifter ending on the lock-on", the cold open. Shape-shifter's own tangle take
// opened too close (the tangle's 2D edges filled the frame gray for its first second), so this take
// is the same graph already dark from its first frame: the bank as a tangle on the nebula, light
// packets running along every edge (fiber-packets), the camera already pulling back as the force
// layout tears it apart; the Louvain communities flood in; then the drawing lifts into 3D (#9372)
// while the camera swings round and pushes into the collector's community (ACC-1493), a close-up.
import { CINE_CLIP, layout, noCursor, onElement, shade } from "../r4-intro/cine.js";
import {
    communities,
    FORCE,
    frameOf,
    orbitOf,
    paintCommunities,
    rig,
    shapeBank,
    shapeLook,
    tangle,
} from "../r4-intro-shape/shape.js";

/** The collector in Riga: the push lands on its community. */
const FOCUS = "ACC-1493";

export default {
    id: "shapehunt-tangle",
    ...CINE_CLIP,
    caption: "Shape-shifter: tangle to 3D",
    tag: "Synthetic data",
    async setup(h) {
        await shapeBank(h);
        await paintCommunities(h, await communities(h), false);
        await tangle(h);
        await h.app.settled();
        const { flat } = await frameOf(h);
        h.zoom = flat.zoom;
        // far enough back that the tangle's edges are lines, not a gray wash (0.45 was too close, 0.26 a speck)
        await rig(h, [{ zoom: flat.zoom * 0.36, pan: { x: 0, y: 0 }, rotation: -0.15, ms: 1 }]);
        await shapeLook(h);
        await shade(h, {
            shader: "fiber-packets",
            params: { packets: 1, speed: 0.9, tail: 12, glint: 0.5, bloom: 0 },
        });
        await noCursor(h);
        // the nebula and the packets compiled and drawn before the first captured frame
        await h.app.frames(60);
    },
    async run(h) {
        const ids = await communities(h);
        await layout(h, ...FORCE);
        h.mark("force");
        await rig(h, [
            { zoom: h.zoom * 0.16, pan: { x: 0, y: 0 }, rotation: -0.05, ms: 1100, easing: "easeIn", mark: "rise" },
            { zoom: h.zoom * 0.075, pan: { x: 0, y: 0 }, rotation: 0.3, ms: 1700, easing: "easeOut" },
        ]);
        const frame = await frameOf(h, 0.8);
        const settle = rig(h, [{ ...frame.flat, ms: 1500, easing: "easeInOut", mark: "frame" }]);
        h.mark("flood");
        await paintCommunities(h, ids, true, 60);
        h.mark("colored");
        await settle;
        // lift into 3D straight on, then swing to the side and push into the collector's community
        await onElement(h, (el) => el.setViewMode("3d"));
        h.mark("3D");
        const front = orbitOf(frame.front.position, frame.front.target);
        await rig(
            h,
            [
                {
                    node: FOCUS,
                    alpha: front.alpha + 0.35,
                    beta: 1.45,
                    radius: front.radius * 0.6,
                    ms: 900,
                    easing: "easeIn",
                    mark: "swing",
                },
                {
                    node: FOCUS,
                    alpha: front.alpha + 0.8,
                    beta: 1.25,
                    radius: front.radius * 0.16,
                    ms: 1800,
                    easing: "easeOut",
                    mark: "push",
                },
            ],
            front,
        );
        h.mark("close");
    },
    holdMs: 300,
};
