// Intro "Genesis", shot 4: the bright point becomes an airport. The OpenFlights airline network on
// the satellite globe: the camera opens on LAX locked in the same reticle the protein network
// shrank to (same color, same size, frame center), the other airports small and dim, and pulls back
// fast while the Earth turns under it, until the whole globe glows with light packets running along
// its routes, the 250 busiest airports gold (and the title lies over it).
import { FLIGHTS, still } from "../ch6/map.js";
import { airportsGlobe } from "../r3-intro/intro.js";
import { hideLegend } from "../r2-5b-and-more/more.js";
import { addLayer, CINE_CLIP, fly, noCursor, onElement, shade } from "../r4-intro/cine.js";
import { edgeLook, SPECK } from "./genesis.js";

/** Undercranking: the shot runs this many times slower than it plays (the globe films slowly). */
const K = 2;

/** The airport the shot starts on (its IATA code, the node id). */
const AIRPORT = "LAX"; // Los Angeles International

/**
 * A camera key over a point of the globe (centered on the origin): `height` world units above it
 * along the radius, looking at a point `look` of the way from it to the globe's center, turned
 * `turn` radians about the vertical.
 * @param p - the point on the globe
 * @param height - how far above it
 * @param look - 0 looks at the point, 1 at the globe's center
 * @param turn - radians about the vertical axis
 * @returns a camera state
 */
function over(p, height, look, turn) {
    const len = Math.hypot(p.x, p.y, p.z);
    const s = Math.sin(turn);
    const co = Math.cos(turn);
    const rot = (v) => ({ x: v.x * co + v.z * s, y: v.y, z: -v.x * s + v.z * co });
    const up = rot({
        x: (p.x / len) * (len + height),
        y: (p.y / len) * (len + height),
        z: (p.z / len) * (len + height),
    });
    const q = rot(p);
    return { position: up, target: { x: q.x * (1 - look), y: q.y * (1 - look), z: q.z * (1 - look) } };
}

export default {
    id: "genesis-globe",
    ...CINE_CLIP,
    caption: "",
    dataset: FLIGHTS,
    async setup(h) {
        const { page } = h;
        await airportsGlobe(h);
        // routes faint, no arrowheads (they drew as stray white triangles at the frame's edges)
        await edgeLook(h, { "edge.opacity": 0.12, "edge.arrowHead": "none" });
        // airports small and dim, the 250 busiest gold, LAX white: a living network, not a yellow rash
        const hubs = await onElement(h, (el) => {
            const d = new Map();
            for (const e of el.getEdges()) for (const n of [e.srcId, e.dstId]) d.set(n, (d.get(n) ?? 0) + 1);
            return [...d]
                .sort((a, b) => b[1] - a[1])
                .slice(0, 250)
                .map((x) => x[0]);
        });
        const airport = (name, nodes, set) =>
            addLayer(h, {
                name,
                target: "node",
                selector: nodes ? { match: "ids", nodes } : { match: "everything" },
                set,
            });
        await airport("Airports", null, { "node.size": 0.8, "node.color": "#7a5c1c" });
        await airport("Hubs", hubs, { "node.size": 1.3, "node.color": "#ffd23f" });
        await airport(AIRPORT, [AIRPORT], { "node.size": 1, "node.color": "#ffffff" });
        await hideLegend(page);
        const p = await onElement(h, (el, id) => el.getNode(id)?.getPosition(), AIRPORT);
        if (!p) throw new Error(`no airport ${AIRPORT}`);
        const R = Math.hypot(p.x, p.y, p.z);
        h.keys = [
            // high enough that LAX's reticle is drawn at its least size, as the protein speck was
            { ...over(p, R * 0.8, 0, 0), ms: 0 },
            // fast back: the Earth's limb is in by about a second in
            { ...over(p, R * 1.5, 0.55, 0.2), ms: 1100 * K, easing: "easeIn", mark: "rise" },
            { ...over(p, R * 2.3, 1, 0.5), ms: 1800 * K, easing: "linear", mark: "globe" },
            { ...over(p, R * 2.6, 1, 0.9), ms: 5000 * K, easing: "easeOut" },
        ];
        // every view the flight passes through, its satellite tiles loaded first (they arrive
        // late and in squares while the camera moves); the camera ends where the shot starts
        for (const k of [...h.keys.slice(1), h.keys[0]]) {
            await fly(h, [{ ...k, ms: 0, mark: undefined }]);
            await still(page);
        }
        // light after the tiles: a looping shader keeps the frame changing, so `still` would never return
        await shade(h, { shader: "fiber-packets", params: { speed: 1.2 / K } });
        await shade(h, {
            shader: "lock-on-reticle",
            nodes: [AIRPORT],
            params: { hudColor: SPECK, spin: 0.4 / K, lineWidth: 2.4 },
        });
        await noCursor(h);
        await h.app.frames(30);
    },
    async run(h) {
        await fly(h, h.keys.slice(1));
    },
    holdMs: 1500,
};
