// Round 4, intro "Shape-shifter", take 4 (shots 6-7): a hard cut on the whip into the real airline
// network (the OpenFlights sample) on the globe at night -- the sun over the Pacific west of it, so the Americas and
// the Atlantic are dark and the airports glow -- the routes drawn faint, the hub routes brighter with
// comets running along them. The camera carries the models' whip on, rides low across the Atlantic
// from Chicago to Europe (fastest on the loudest hit), then pulls far back until the Earth is a
// speck in the dark. Shot at K times slow, sped up in the cut.
import { airportsGlobe } from "../r3-intro/intro.js";
import { FLIGHTS, still } from "../ch6/map.js";
import { hideLegend } from "../r2-5b-and-more/more.js";
import { addLayer, CINE_CLIP, noCursor, onElement, shade } from "../r4-intro/cine.js";
import { rig, steadyShaders } from "./shape.js";

const K = 2;
/** The hubs whose routes carry comets. */
const HUBS = [
    "ATL",
    "ORD",
    "JFK",
    "LAX",
    "DFW",
    "DEN",
    "LHR",
    "CDG",
    "FRA",
    "AMS",
    "IST",
    "MAD",
    "DXB",
    "PEK",
    "HND",
    "SIN",
];
const EARTH = { x: 0, y: 0, z: 0 };

/**
 * A rig key over a point of the globe: the camera `height` from a target just under the point,
 * swung from straight above it by `dAlpha` and tipped toward the horizon by `dBeta` (radians).
 * @param p - the point (a node's position on the globe)
 * @param height - the camera's distance from the target
 * @param dAlpha - the turn about the vertical
 * @param dBeta - the tip toward the horizon
 * @returns the key's alpha, beta, radius and target
 */
function over(p, height, dAlpha, dBeta) {
    const r = Math.hypot(p.x, p.y, p.z);
    const n = { x: p.x / r, y: p.y / r, z: p.z / r };
    return {
        alpha: Math.atan2(n.z, n.x) + dAlpha,
        beta: Math.acos(n.y) + dBeta,
        radius: height,
        target: { x: p.x * 0.97, y: p.y * 0.97, z: p.z * 0.97 },
    };
}

export default {
    id: "shape-globe",
    ...CINE_CLIP,
    caption: "Shape-shifter: the globe",
    dataset: FLIGHTS,
    async setup(h) {
        const { page } = h;
        await airportsGlobe(h);
        await addLayer(h, {
            name: "Airports",
            target: "node",
            selector: { match: "everything" },
            set: { "node.size": 1.2 },
        });
        await addLayer(h, {
            name: "Routes",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.color": "#2f6bff", "edge.width": 0.6, "edge.opacity": 0.35 },
        });
        h.hubEdges = await onElement(
            h,
            (el, ids) => {
                const s = new Set(ids);
                return el.session.data
                    .edges()
                    .filter((e) => s.has(e.source) || s.has(e.target))
                    .map((e) => e.id);
            },
            HUBS,
        );
        await addLayer(h, {
            name: "Hub routes",
            target: "edge",
            selector: { match: "ids", edges: h.hubEdges },
            set: { "edge.color": "#59a8ff", "edge.width": 1.2, "edge.opacity": 0.8 },
        });
        await steadyShaders(h);
        await onElement(h, (el) => {
            el.autoFrame = false;
            el.globeLook = { atmosphere: true, sun: { lat: 5, lon: 150 }, background: "#05070d" };
        });
        await hideLegend(page);
        const at = await onElement(
            h,
            (el, ids) => Object.fromEntries(ids.map((i) => [i, el.getNode(i)?.getPosition()])),
            ["ORD", "JFK", "LHR", "FRA"],
        );
        const mid = { x: (at.JFK.x + at.LHR.x) / 2, y: (at.JFK.y + at.LHR.y) / 2, z: (at.JFK.z + at.LHR.z) / 2 };
        const s = Math.hypot(at.JFK.x, at.JFK.y, at.JFK.z) / Math.hypot(mid.x, mid.y, mid.z);
        const atlantic = { x: mid.x * s, y: mid.y * s, z: mid.z * s };
        h.start = over(at.ORD, 700, 0.9, 0.5);
        h.keys = [
            // the whip carried on, landing over the Great Lakes
            { ...over(at.ORD, 650, 0.3, 0.6), ms: 600, easing: "easeOut", mark: "ride" },
            // speeding up out over the Atlantic
            { ...over(atlantic, 950, -0.1, 0.45), ms: 670, easing: "easeIn", mark: "atlantic" },
            // fastest here (the loudest hit), then an even glide over Europe: never a stop
            { ...over(at.LHR, 450, -0.5, 0.7), ms: 1600, easing: "linear", mark: "europe" },
            { ...over(at.FRA, 500, -0.8, 0.6), ms: 1800, easing: "linear", mark: "drift" },
            // pull far back until the Earth is a speck
            { alpha: 0.2, beta: 1.2, radius: 40000, target: EARTH, ms: 1700, easing: "easeIn", mark: "pull" },
            { alpha: 0.25, beta: 1.2, radius: 90000, target: EARTH, ms: 700, easing: "linear", mark: "gone" },
        ];
        // each key's angle the turn nearest the key before (atan2 wraps at pi), or the camera spins
        // the long way round the Earth between two keys
        let near = h.start.alpha;
        for (const k of h.keys) {
            k.alpha += 2 * Math.PI * Math.round((near - k.alpha) / (2 * Math.PI));
            near = k.alpha;
        }
        // every view the flight passes through, its map tiles loaded first; then back to the start
        for (const k of [h.start, ...h.keys.slice(0, 4), h.start]) {
            await rig(h, [{ ...k, ms: 1, mark: undefined }]);
            await still(page);
        }
        await shade(h, {
            shader: "comet-tracers",
            edges: h.hubEdges,
            params: {
                speed: 0.8 / K,
                spacing: 600,
                tail: 200,
                headColor: "#fff6e0",
                tailColor: "#ff8a2a",
                intensity: 3,
                bloom: 2,
            },
        });
        await hideLegend(page);
        await h.app.frames(60);
        await noCursor(h);
    },
    async run(h) {
        await rig(
            h,
            h.keys.map((k) => ({ ...k, ms: k.ms * K })),
            h.start,
        );
    },
    holdMs: 300,
};
