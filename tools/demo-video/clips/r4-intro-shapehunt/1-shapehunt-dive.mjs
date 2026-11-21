// Round 4, intro "Shape-shifter ending on the lock-on", the bridge take and the payoff. Shape-shifter's
// globe take is cut while the camera pulls back from the Earth; this take opens on the bank -- a 3D
// network (force layout, Louvain colors) in the same nebula, its clusters already in frame -- and the
// camera dives in (mark "dive", shot K times slow) and pushes into ring account ACC-1484 until it
// fills about a quarter of the frame ("land"). On landing ("hit", real time from here) the ring lights
// up red with a glow, everything else goes dark, the reticle locks onto ACC-1484 and a shockwave rings
// out from it, while the camera keeps drifting in and then pulls back round the red ring (the title
// lies over that pull-back). The reticle, shockwave and glow are compiled in setup on layers matching
// nothing, and the hit points them at their nodes, so their first visible frame is the shader (a
// reticle added at the hit drew one frame of a flat mint square).
import { addLayer, bankIntro, CINE_CLIP, edgesAmong, noCursor, onElement, shade, tween } from "../r4-intro/cine.js";
import { FLAT, MARK, RING } from "../r4-intro-hunt/hunt.js";
import { rig, shapeLook } from "../r4-intro-shape/shape.js";

const K = 2;
/** Close enough that the bank's clusters show from the first frame. */
const START = { alpha: 5.4, beta: 1.05, radius: 700, target: { x: 0, y: 0, z: 0 } };
/** Matches no node (an empty id list is refused: it would match everything). */
const NONE = { match: "ids", nodes: ["no-such-node"] };

/**
 * Point a layer at other nodes (a selector change; the layer and its compiled shader stay).
 * @param h - the hand
 * @param id - the layer
 * @param nodes - the node ids
 * @returns when the layer matches them
 */
const aim = (h, id, nodes) =>
    onElement(h, (el, o) => el.session.styles.update(o.id, { selector: o.selector }).then(() => null), {
        id,
        selector: nodes.length ? { match: "ids", nodes } : NONE,
    });

let s;

export default {
    id: "shapehunt-dive",
    ...CINE_CLIP,
    caption: "Shape-shifter: dive and lock-on",
    tag: "Synthetic data",
    async setup(h) {
        await bankIntro(h, { flat: false });
        const edges = await edgesAmong(h, [...RING, FLAT]);
        await shapeLook(h);
        // the payoff's layers, warmed on a ring account while the camera is far out, then matched to nothing
        const warm = [RING[0]];
        s = {
            edges,
            glow: await shade(h, {
                shader: "lantern",
                nodes: warm,
                params: { flicker: 0.5, bloom: 1.2 },
                name: "Glow",
            }),
            shock: await shade(h, { shader: "shockwave", nodes: warm, params: { ringGlow: 1.5 }, name: "Shock" }),
            reticle: await shade(h, {
                shader: "lock-on-reticle",
                nodes: warm,
                params: { spin: 0.8, lineWidth: 4, hudColor: "#7dffc4" },
                name: "Reticle",
            }),
        };
        await rig(h, [{ ...START, ms: 1 }], START);
        await h.app.frames(60);
        for (const id of [s.glow, s.shock, s.reticle]) await aim(h, id, []);
        await h.app.frames(30);
        await noCursor(h);
    },
    async run(h) {
        // the dive (K times slow), the push into the mark, and -- the camera never stops -- a slow
        // drift in on it and a pull back round the red ring (real time); the payoff fires while the push
        // is still landing, three quarters into it
        const camera = rig(
            h,
            [
                { node: FLAT, alpha: 5.8, beta: 1.1, radius: 220, ms: 1000 * K, easing: "easeIn", mark: "dive" },
                { node: MARK, alpha: 6.3, beta: 1.2, radius: 45, ms: 600 * K, easing: "linear" },
                { node: MARK, alpha: 6.75, beta: 1.25, radius: 11, ms: 1200 * K, easing: "easeOut", mark: "land" },
                { node: MARK, alpha: 6.95, beta: 1.28, radius: 9.5, ms: 1400, easing: "linear" },
                { node: FLAT, alpha: 7.5, beta: 1.55, radius: 45, ms: 2600, easing: "easeInOut" },
                { node: FLAT, alpha: 8.1, beta: 1.7, radius: 62, ms: 4000, easing: "easeOut" },
            ],
            START,
        );
        await h.pause((1000 + 600 + 900) * K);
        h.mark("hit");
        await aim(h, s.reticle, [MARK]);
        await aim(h, s.shock, [MARK]);
        const ring = [...RING, FLAT];
        await addLayer(h, {
            name: "Ring",
            target: "node",
            selector: { match: "ids", nodes: ring },
            set: { "node.color": "#ff3b30" },
        });
        await addLayer(h, {
            name: "Ring edges",
            target: "edge",
            selector: { match: "ids", edges: s.edges },
            set: { "edge.color": "#ff6a3d", "edge.width": 1 },
        });
        await aim(h, s.glow, ring);
        const dim = {
            nodes: await addLayer(h, {
                name: "Dim nodes",
                target: "node",
                selector: { match: "everything" },
                set: { "node.opacity": 1 },
            }),
            edges: await addLayer(h, {
                name: "Dim edges",
                target: "edge",
                selector: { match: "everything" },
                set: { "edge.opacity": 1 },
            }),
        };
        // the ring on top of the dimming
        await addLayer(h, {
            name: "Ring lit",
            target: "node",
            selector: { match: "ids", nodes: ring },
            set: { "node.opacity": 1 },
        });
        await addLayer(h, {
            name: "Ring edges lit",
            target: "edge",
            selector: { match: "ids", edges: s.edges },
            set: { "edge.opacity": 1 },
        });
        await Promise.all([
            tween(h, dim.nodes, { "node.opacity": 1 }, { "node.opacity": 0.06 }, 500),
            tween(h, dim.edges, { "edge.opacity": 1 }, { "edge.opacity": 0.03 }, 500),
        ]);
        h.mark("dark");
        await camera;
    },
    holdMs: 300,
};
