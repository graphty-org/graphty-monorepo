// Intro "Growth", the whole intro in one continuous take (shot K times slow, sped up in the cut),
// one unbroken camera move that builds from stillness to speed and lets the light rise and fall:
// one dim airport in near darkness, the camera drifting in; a second glides out along its route,
// then more, slowly at first and faster and faster as the sky and the drawing brighten; the app's
// indigo and the arrowheads spread through the network in the order it grew; the drawing rises
// into 3D as glass spreads over it and its glow swells, the camera tilting and circling at once,
// while airports keep coming, faster; Louvain's communities ignite outward from the middle, each
// its own lobe, their routes lit with comets, the brightest moment; then the world darkens toward
// Sydney, the route to New York lights up airport by airport, and the camera flies along it like
// an airplane -- beside each airport, never through one, banking gently -- and comes round into an
// extreme close-up on New York's airport, seen from the side the globe will show it from. The cut
// dissolves the earth in behind it (tmp/demo-video/intros/growth/shots.md) while the camera still
// creeps in, and the camera pulls back from it in one long eased move to show the network on the
// globe, its colors and comets coming back outward from New York, the globe turning under the logo.
//
// Every airport lands where plan put it (the fixed layout), so no addition reflows the drawing;
// every change spreads (a layer's selector grown or narrowed over time, values tweened), and the
// take updates styles at most a few times a second: an update costs the page tens of milliseconds
// (tmp/demo-video/intros/growth/defects.md), and the take must keep its frame rate.
import { hideLegend } from "../r2-5b-and-more/more.js";
import { addLayer, CINE_CLIP, noCursor, onElement, slowMotion, tween, tweenShader } from "../r4-intro/cine.js";
import { steadyShaders } from "../r4-intro-shape/shape.js";
import {
    accelerating,
    analyze,
    FLIGHTS,
    flightPoses,
    follow,
    GLOBE,
    GRAY,
    grown,
    lift,
    nearLens,
    PATH_ENDS,
    plan,
    playPoses,
    revealPoses,
    startGrowth,
    sweep,
    unfollow,
} from "./growth.js";

/** Undercranking: the take runs this many times slower than it plays. */
const K = 3;
/**
 * A length on screen, in the take's (slowed) milliseconds.
 * @param ms - milliseconds on screen
 * @returns milliseconds in the take
 */
const S = (ms) => ms * K;
/** How many airports join while the drawing is flat. */
const FLAT = 40;
/** The app's default node color, and its light tint for routes. */
const INDIGO = { node: "#6366F1", edge: "#a5a9f5" };
/** The canvas through the intro: the light's arc (kept low: the light comes from the graph). */
const SKY = {
    night: "#020308",
    dusk: "#070a16",
    day: "#0a0e1d",
    swell: "#0c1024",
    bloom: "#0f1430",
    hush: "#010104",
};
/** The plain airports, dim in the dark at first and lighter as the light climbs. */
const DIM_GRAY = "#454b5c";
const LIGHT_GRAY = "#9aa2b4";
/** The plain routes, lighter as the light climbs. */
const LIGHT_EDGE = "#7a86a0";
/**
 * The cut's full-bleed box is 778 of the canvas's 1,016 px tall (it crops the top bar and the
 * toolbar) and its middle is where the camera aims (measured on the frames), so the framing counts
 * that height, split evenly.
 */
const BOX = { top: 119, bottom: 119 };
/** The close-up on New York: the camera's distance from it as the flight arrives (world units). */
const CLOSE = 4.6;
/** How much the close-up creeps in while it is held. */
const CREEP = 0.1;
/** How long the close-up is held, creeping in (take ms). */
const HOLD = S(1900);
/** How long the flight takes, from the orbit to the close-up (take ms). */
const FLY = S(11500);
/**
 * The dissolve between the close-up before and after the globe, in take ms: the cut's 1.5 s
 * crossfade at its ramp there (0.8 K). The globe's close-up starts where the flight's was this long
 * before its end, so the two plates match frame for frame through the dissolve.
 */
const SEAM = 1500 * 0.8 * K;
/** The pull back from the close-up to the whole globe (take ms). */
const PULL = S(12000);
/** The route's airports' size: large enough to fill most of the frame in the close-up. */
const ROUTE_SIZE = 2.2;
/** The comets on the routes, in their source airports' colors (their speed slowed with the take). */
const COMETS = { useEdgeColor: true, intensity: 2.6, bloom: 2, tail: 200, spacing: 260, speed: 1.2 / K };
/** The route's airports: amber glass. */
const ROUTE_AMBER = "#c98a3a";
/** Drawn at their scene size, even on the globe (the map draws nodes at a size on screen). */
const SCENE = { "node.sizeSpace": "scene" };
/** The plain airports' size on the globe (a size on screen there): near New York, and far out. */
const GLOBE_SIZE = [0.12, 0.6];
/** The plain airports' size in 3D. */
const SIZE_3D = 1.15;
/** The glass the airports take as the drawing lifts, and the lantern that lights the communities. */
const GLASS = { shader: "glass", params: { sparkle: 0.6, bloom: 0, tint: 1 } };
const LANTERN = (intensity, bloom) => ({ shader: "lantern", params: { intensity, flicker: 0, bloom } });

/**
 * A move or a fade left running while the take does other things, awaited later: marked handled
 * now, so an error elsewhere in the take is reported as itself, not hidden by this one failing as
 * the browser closes.
 * @param p - the promise
 * @returns the same promise
 */
function meanwhile(p) {
    p.catch(() => null);
    return p;
}

/**
 * The reveal's camera: the close-up on New York's place on the globe, seen from the flight's side
 * and creeping in through the dissolve, then the long pull back, turning toward the North
 * Atlantic, the globe sinking low in the frame for the title, and on, turning (also flown once in
 * setup, so the map's tiles are cached for the take).
 * @param spot - where the globe puts New York
 * @param europe - where it puts Europe
 * @param [o] - the flight's close-up: `from`, its side, `close`, `creepV`
 * @returns the poses and their rate (revealPoses)
 */
const reveal = (spot, europe, o = {}) =>
    revealPoses(spot, europe, {
        close: CLOSE,
        ...o,
        hold: SEAM,
        pull: PULL,
        turn: S(4000),
        far: 6.5,
        spin: 0.07,
        drop: 0.35,
    });

/**
 * The style of the routes as they cool: their color and width, no arrows.
 * @param color - the color
 * @param width - the width
 * @returns the channels
 */
const plainEdges = (color, width) => ({ "edge.color": color, "edge.arrowHead": "none", "edge.width": width });

export default {
    id: "growth-world",
    ...CINE_CLIP,
    caption: "",
    dataset: FLIGHTS,
    async setup(h) {
        await onElement(h, (el) => {
            // the sun over the Atlantic: the Americas and Europe in daylight, so the globe reads as the
            // Earth; low, so its glint on the sea sits below the airports the camera ends on (globeLook
            // has no specular setting)
            el.globeLook = { atmosphere: true, sun: { lat: 5, lon: -40 }, background: "#05070d" };
        });
        h.steps = await plan(h, async (spot, europe) => {
            const { poses } = reveal(spot, europe);
            for (const f of [0, 0.2, 0.3, 0.4, 0.5, 0.65, 0.8, 1]) {
                const q = poses[Math.round(f * (poses.length - 1))];
                await playPoses(h, { poses: [q, q], hz: 1000 });
                await h.app.frames(f === 0 ? 240 : 90);
            }
        });
        await h.app.ready2D();
        await onElement(
            h,
            (el, c) => el.session.config.set({ background: { backgroundType: "color", color: c } }),
            SKY.night,
        );
        h.gray = await addLayer(h, {
            name: "Plain nodes",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": DIM_GRAY, "node.opacity": 0 },
        });
        h.edges = await addLayer(h, {
            name: "Plain edges",
            target: "edge",
            selector: { match: "everything" },
            set: plainEdges(GRAY.edge, 2),
        });
        // after the layers: the legend opens only once it has entries
        await hideLegend(h.page);
        await steadyShaders(h);
        await onElement(h, (el) => {
            el.autoFrame = false;
        });
        await h.app.settled();
        // the camera far out on the one airport, ready to drift in
        await follow(h, { fill: 0.4, least: 12, tau: S(300), box: BOX });
        await h.app.frames(120);
        await noCursor(h);
    },
    async run(h) {
        const t0 = Date.now();
        const at = (ms) => h.pause(Math.max(0, t0 + ms - Date.now()));
        h.mark("open");
        // ---- one airport in near darkness: it fades up as the camera drifts in and the sky lifts
        await follow(h, { fill: 0.45, least: 12, tau: S(2500), push: 0.035 / K, aheadMs: S(2500), box: BOX });
        meanwhile(
            tween(
                h,
                h.gray,
                { "node.color": DIM_GRAY, "node.opacity": 0 },
                { "node.color": DIM_GRAY, "node.opacity": 1 },
                S(2600),
                150,
            ),
        );
        // the canvas a step at a time (each is an 8-bit code; the cut's grain dithers them)
        const sky = meanwhile(tween(h, "background", { color: SKY.night }, { color: SKY.dusk }, S(9000), 150));
        // ---- flat and gray: airports join one by one, each gliding out along its route, slowly at
        // first and faster and faster (each in its flat place: the depth comes with the lift)
        const flat = h.steps
            .slice(1, FLAT)
            .map((s) => ({ ...s, node: { ...s.node, position: { ...s.node.position, z: 0 } } }));
        const times = accelerating(flat.length, S(2100), 0.84, S(70), S(5200));
        const drawMs = times.map((t, i) =>
            Math.min(S(2600), Math.max(S(400), 0.95 * ((times[i + 1] ?? t + S(400)) - t))),
        );
        flat.firstEdgeId = h.steps.firstEdgeId;
        h.mark("grow");
        await startGrowth(h, flat, times, { drawMs, layers: 2, tickMs: 60, glide: 8, cool: GRAY.edge });
        // the camera's drift settles into following the growing drawing, widening well before the
        // second airport arrives, so both ends of the first route are framed as it is drawn
        await at(times[0] - S(2600));
        await follow(h, { fill: 0.45, least: 18, tau: S(600), push: 0.006 / K, aheadMs: S(3000), box: BOX });
        await at(times[2]);
        // the light climbs: the routes lighter and wider from the third, the airports after them
        await onElement(h, (_, c) => globalThis.__growth.cool(c), LIGHT_EDGE);
        meanwhile(tween(h, h.edges, plainEdges(GRAY.edge, 2), plainEdges(LIGHT_EDGE, 3), S(4000), 300));
        await at(times[4]);
        meanwhile(
            tween(
                h,
                h.gray,
                { "node.color": DIM_GRAY, "node.opacity": 1 },
                { "node.color": GRAY.node, "node.opacity": 1 },
                S(5000),
                300,
            ),
        );
        await sky;
        meanwhile(tween(h, "background", { color: SKY.dusk }, { color: SKY.day }, S(5000), 150));
        await follow(h, { fill: 0.6, least: 14, tau: S(800), aheadMs: S(2000), box: BOX });
        await at(times[14]);
        meanwhile(
            tween(
                h,
                h.gray,
                { "node.color": GRAY.node, "node.opacity": 1 },
                { "node.color": LIGHT_GRAY, "node.opacity": 1 },
                S(4000),
                300,
            ),
        );
        // the app's indigo and the arrowheads spread through the network in the order it grew;
        // routes arriving from now on cool to the indigo tint
        await at(times[22]);
        h.mark("indigo");
        const indigo = await addLayer(h, {
            name: "Indigo",
            target: "node",
            selector: { match: "ids", nodes: [] },
            set: { "node.color": INDIGO.node },
        });
        const arrowSet = (size, width) => ({
            "edge.color": INDIGO.edge,
            "edge.arrowHead": "normal",
            "edge.arrowHeadSize": size,
            "edge.width": width,
        });
        const arrows = await addLayer(h, {
            name: "Arrows",
            target: "edge",
            selector: { match: "ids", edges: [] },
            set: arrowSet(2.5, 3),
        });
        await onElement(h, (_, c) => globalThis.__growth.cool(c), INDIGO.edge);
        await Promise.all([
            sweep(h, { id: indigo, by: "arrival", grow: true, ms: S(2400), stepMs: 160 }),
            sweep(h, { id: arrows, edges: true, by: "arrival", grow: true, ms: S(2400), stepMs: 160 }),
        ]);
        await grown(h);
        // ---- the lift: the drawing rises into 3D where it stands, the camera tilting and circling
        // as it rises, glass spreading over the nodes in the order they came and their glow swelling;
        // the arrowheads shrink away (debris in 3D) and the routes widen so they read in depth
        h.size = await addLayer(h, {
            name: "Node size",
            target: "node",
            selector: { match: "everything" },
            set: { "node.size": 1 },
        });
        h.glass = await addLayer(h, {
            name: "Glass",
            target: "node",
            selector: { match: "ids", nodes: [] },
            set: { "node.shaders": [GLASS] },
        });
        await unfollow(h);
        await slowMotion(h, { layoutSeconds: 2.4 * K, transition: "glide" });
        const front = await lift(h, h.steps);
        h.mark("lift");
        const orbit = {
            fill: 0.95,
            share: 0.85,
            tau: S(1000),
            beta: 1.05,
            tilt: 1.4,
            least: 10,
            aheadMs: S(600),
            box: BOX,
        };
        // the tilt and the turn start with the light, so the depth shows in the parallax at once
        await follow(h, { ...orbit, alpha: front.alpha, tau: S(600), tilt: 2.2, spin: 0.16 / K });
        const swell = meanwhile(
            Promise.all([
                (async () => {
                    await tweenShader(h, h.glass, "bloom", 0, 0.7, S(1200), { ease: true, stepMs: 150 });
                    await tweenShader(h, h.glass, "bloom", 0.7, 0.15, S(3000), { ease: true, stepMs: 200 });
                })(),
                (async () => {
                    await tween(h, "background", { color: SKY.day }, { color: SKY.swell }, S(1200), 150);
                    await tween(h, "background", { color: SKY.swell }, { color: SKY.day }, S(3000), 200);
                })(),
            ]),
        );
        await Promise.all([
            sweep(h, { id: h.glass, by: "arrival", grow: true, ms: S(2000), stepMs: 200 }),
            tween(h, h.size, { "node.size": 1 }, { "node.size": SIZE_3D }, S(2000), 200),
            tween(h, arrows, arrowSet(2.5, 3), arrowSet(0.01, 4), S(2400), 250),
        ]);
        await onElement(h, (el, [id, set]) => el.session.styles.update(id, { set }), [
            arrows,
            { ...arrowSet(0.01, 4), "edge.arrowHead": "none" },
        ]);
        const rest = h.steps.slice(FLAT);
        // in bursts of three airports, faster and faster, each burst's routes drawn in
        const gaps = accelerating(Math.ceil(rest.length / 3), S(420), 0.9, S(80), 0);
        h.mark("grow3d");
        await startGrowth(
            h,
            rest,
            rest.map((_, i) => gaps[Math.floor(i / 3)]),
            { layers: 1, tickMs: 150, drawMs: S(600), cool: INDIGO.edge, width: 4 },
        );
        await follow(h, { ...orbit, spin: 0.22 / K });
        await h.pause(gaps[Math.floor(gaps.length / 2)]);
        await follow(h, { ...orbit, spin: 0.32 / K });
        await grown(h);
        await swell;
        // ---- the communities ignite outward from the middle: Louvain's colors (each community its
        // own lobe of the drawing) and a lantern's glow under an indigo mask that recedes, the glow
        // blooming and settling; the routes take their airports' colors and carry comets, spreading
        // the same way; the camera eases back to hold the whole of it
        h.mark("communities");
        const mask = await onElement(
            h,
            async (el, set) => {
                const all = el.session.styles.list();
                const layer = await el.session.styles.add(
                    {
                        name: "Indigo mask",
                        target: "node",
                        selector: { match: "ids", nodes: el.getNodes().map((n) => n.id) },
                        set,
                    },
                    { above: all.at(-1).id },
                );
                return layer.id;
            },
            { "node.color": INDIGO.node, "node.shaders": [GLASS] },
        );
        await analyze(h, "louvain", {}, mask, "tol-vibrant");
        const lit = (intensity) => ({
            "node.shaders": [
                LANTERN(intensity, 0.9),
                { shader: "glass", params: { sparkle: 0.8, bloom: 0.2, tint: 1 } },
            ],
        });
        await onElement(
            h,
            (el, [id, set]) => el.session.styles.update(id, { selector: { match: "everything" }, set }),
            [h.glass, lit(0.9)],
        );
        h.routes = await addLayer(h, {
            name: "Route color",
            target: "edge",
            selector: { match: "ids", edges: [] },
            set: {
                "edge.colorFrom": "source",
                "edge.opacity": 0.4,
                "edge.arrowHead": "none",
                "edge.width": 3,
                "edge.shaders": [{ shader: "comet-tracers", params: COMETS }],
            },
        });
        const middle = { x: 0, y: 0, z: 0 };
        await follow(h, { ...orbit, fill: 0.82, share: 0.92, tau: S(1500), spin: 0.36 / K });
        const bloomSky = meanwhile(
            (async () => {
                await tween(h, "background", { color: SKY.day }, { color: SKY.bloom }, S(1800), 200);
                await tween(h, "background", { color: SKY.bloom }, { color: SKY.day }, S(2500), 250);
            })(),
        );
        await Promise.all([
            sweep(h, { id: mask, by: middle, ms: S(2400), stepMs: 450 }),
            sweep(h, { id: h.routes, edges: true, by: middle, grow: true, ms: S(2600), stepMs: 450 }),
            tweenShader(h, h.glass, "intensity", 0.9, 1.9, S(2200), { ease: true, stepMs: 400 }),
        ]);
        // the bloom settles while the full color holds, the orbit gathering speed, the comets running
        await follow(h, { ...orbit, fill: 0.82, share: 0.92, tau: S(1500), spin: 0.46 / K });
        await tweenShader(h, h.glass, "intensity", 1.9, 1.3, S(2200), { ease: true, stepMs: 400 });
        await bloomSky;
        await h.pause(S(1600));
        // ---- the hush: the world darkens toward Sydney (the far side first), the comets and the
        // glow going out with it, the camera slowing as it turns to Sydney; before the dark has
        // landed, the route to New York starts to light up airport by airport
        h.mark("hush");
        const path = await analyze(h, "shortest-path", { source: PATH_ENDS[0], target: PATH_ENDS[1] }, h.gray);
        console.log(`  growth-world: path ${path.nodes.join(" > ")}`);
        const all = await onElement(h, (el) => el.getNodes().map((n) => [n.id, n.getPosition()]));
        const where = new Map(all);
        const pts = path.nodes.map((id) => where.get(id));
        const sydney = pts[0];
        const dim = {
            nodes: await addLayer(h, {
                name: "Dim nodes",
                target: "node",
                selector: { match: "ids", nodes: [] },
                set: {
                    "node.color": "#232838",
                    "node.shaders": [{ ...GLASS, params: { ...GLASS.params, sparkle: 0.5 } }],
                },
            }),
            edges: await addLayer(h, {
                name: "Dim edges",
                target: "edge",
                selector: { match: "ids", edges: [] },
                set: { ...plainEdges("#2a3045", 2), "edge.opacity": 0.12 },
            }),
        };
        await follow(h, { ...orbit, only: path.nodes.slice(0, 3), fill: 0.6, tau: S(2200), spin: 0.12 / K });
        const dark = meanwhile(
            Promise.all([
                sweep(h, { id: dim.nodes, by: sydney, reverse: true, grow: true, ms: S(2200), stepMs: 450 }),
                sweep(h, {
                    id: dim.edges,
                    edges: true,
                    by: sydney,
                    reverse: true,
                    grow: true,
                    ms: S(2200),
                    stepMs: 450,
                }),
                sweep(h, { id: h.routes, edges: true, by: sydney, reverse: true, ms: S(2200), stepMs: 450 }),
                tween(h, "background", { color: SKY.day }, { color: SKY.hush }, S(2200), 200),
            ]),
        );
        await h.pause(S(1500));
        // the flight's path (in to the close-up from the side the globe will show New York from),
        // and the airports in a corridor round it, shrunk away
        const cam = await onElement(h, (el) => el.getCameraState().position);
        const flight = flightPoses(pts, {
            from: cam,
            normal: h.steps.spot,
            ms: FLY,
            hold: HOLD,
            close: CLOSE,
            creep: CREEP,
        });
        const others = all.filter(([id]) => !path.nodes.includes(id));
        const near = nearLens(flight.poses, others, 7);
        console.log(`  growth-world: flight ${flightStats(flight, pts, others, near)}`);
        const lens = await addLayer(h, {
            name: "Near the lens",
            target: "node",
            selector: { match: "ids", nodes: near },
            set: { "node.size": SIZE_3D },
        });
        const routeLine = (opacity, width) => ({
            "edge.color": "#fff4d6",
            "edge.arrowHead": "none",
            "edge.width": width,
            "edge.opacity": opacity,
            "edge.shaders": [
                { shader: "fiber-packets", params: { packets: 3, speed: 1.2 / K, tail: 40, glint: 1.4, bloom: 1.6 } },
            ],
        });
        const route = {
            edges: await addLayer(h, {
                name: "Route",
                target: "edge",
                selector: { match: "ids", edges: [] },
                set: routeLine(1, 6),
            }),
            nodes: await addLayer(h, {
                name: "Route airports",
                target: "node",
                selector: { match: "ids", nodes: [] },
                // amber glass marbles: no shader that blooms (glass, lantern), whose glow fills the
                // whole frame in the close-up, more so on the sunlit globe (defects.md 14); their
                // swirl still, so the close-up before the globe and after it show the same marble
                set: {
                    "node.color": ROUTE_AMBER,
                    // over the darkened airports' layer, which hides them on the globe
                    "node.opacity": 1,
                    "node.shaders": [
                        { shader: "glass-marble", params: { spin: 0, glassTint: "#ffe6bd", secondColor: "#fff4e0" } },
                    ],
                },
            }),
            size: await addLayer(h, {
                name: "Route size",
                target: "node",
                selector: { match: "ids", nodes: path.nodes },
                // scene-sized even on the globe (the map draws nodes screen-sized), so New York is
                // the same in the close-up before and after the globe appears
                set: { ...SCENE, "node.size": SIZE_3D },
            }),
        };
        h.mark("route");
        // the route's airports out of the lantern's layer: a lantern near the lens fills the frame
        await onElement(h, (el, [id, nodes]) => el.session.styles.update(id, { selector: { match: "ids", nodes } }), [
            h.glass,
            others.map(([id]) => id),
        ]);
        await Promise.all([
            sweep(h, { id: route.nodes, by: path.nodes, grow: true, ms: S(1600), stepMs: 450 }),
            sweep(h, { id: route.edges, edges: true, by: path.edges, grow: true, ms: S(1600), stepMs: 450 }),
            tween(
                h,
                route.size,
                { ...SCENE, "node.size": SIZE_3D },
                { ...SCENE, "node.size": ROUTE_SIZE },
                S(1600),
                450,
            ),
            tween(h, lens, { "node.size": SIZE_3D }, { "node.size": 0.01 }, S(1600), 450),
        ]);
        await dark;
        // ---- the flight: the camera leaves its orbit for Sydney and flies the route to New York,
        // gathering speed, and comes round into the close-up, creeping in; the route's line fades as
        // the camera closes on New York, so it never stabs end-on into the lens
        h.mark("flight");
        meanwhile(
            (async () => {
                await h.pause(FLY - S(2400));
                await tween(h, route.edges, routeLine(1, 6), routeLine(0, 2), S(1800), 200);
            })(),
        );
        await playPoses(h, flight, {
            blendMs: S(3000),
            marks: [
                [FLY, "close"],
                [FLY + HOLD, "seam"],
            ],
        });
        // ---- the globe: switched to in one frame behind the close-up (it cannot fade in,
        // defects.md 8: the cut dissolves from the close-up before to the close-up after), the
        // camera put on New York's place on it, on the same side as the flight's close-up, where
        // that close-up was SEAM before its end; then the pull back
        await slowMotion(h, { layoutSeconds: null });
        h.mark("switch");
        // in the same cut-away: the map draws the other airports at a size on screen, so they are
        // made small; only New York keeps its close-up size; the darkened ones are hidden (on the
        // bright map dark glass reads as dead black balls, pale glass as white flares) and come
        // back lit as the pull reveals them; the glowing glass becomes marbles (on the sunlit map any
        // glow, the lantern's or the glass's, reads as a white flare: defects.md 14)
        await onElement(
            h,
            async (el, o) => {
                const { styles } = el.session;
                await styles.update(o.size, { set: { "node.size": o.small } });
                await styles.remove(o.lens);
                await styles.update(o.routeSize, { selector: { match: "ids", nodes: [o.ny] } });
                // hidden by opacity: on the map a node has a least size on screen, so 0.01 is no help
                await styles.update(o.dimNodes, { set: { "node.color": "#232838", "node.opacity": 0 } });
                await styles.update(o.dimEdges, {
                    set: { "edge.color": "#2a3045", "edge.opacity": 0.01, "edge.width": 2, "edge.arrowHead": "none" },
                });
                await styles.update(o.glass, { set: o.lit });
            },
            {
                size: h.size,
                small: GLOBE_SIZE[0],
                lens,
                routeSize: route.size,
                ny: PATH_ENDS[1],
                dimNodes: dim.nodes,
                dimEdges: dim.edges,
                glass: h.glass,
                lit: { "node.shaders": [{ shader: "glass-marble", params: { spin: 0 } }] },
            },
        );
        await onElement(h, (el, o) => el.setLayout("location-map", o), GLOBE);
        // where New York lands on the globe (lifted off the surface by its size), once it is there
        const landed = await onElement(
            h,
            (el, [id, size]) =>
                new Promise((done) => {
                    const look = () => {
                        const p = el.getNode(id)?.getPosition();
                        if (p && Math.hypot(p.x, p.y, p.z) > 0.8 * size) done(p);
                        else globalThis.requestAnimationFrame(look);
                    };
                    look();
                }),
            [PATH_ENDS[1], GLOBE.size],
        );
        const pull = reveal(landed, h.steps.europe, {
            from: flight.dir,
            close: CLOSE - (flight.vEnd * (HOLD - SEAM)) / 1000,
            creepV: flight.vEnd,
        });
        await playPoses(h, { poses: pull.poses.slice(0, 1), hz: pull.hz });
        await h.app.frames(30);
        const ride = meanwhile(
            playPoses(h, pull, {
                marks: [
                    [0, "onglobe"],
                    [SEAM, "pull"],
                    [SEAM + PULL, "turn"],
                ],
            }),
        );
        // the light comes back outward from New York as the camera pulls back: the network's
        // colors, glow and routes, comets on the busiest airports' routes, and the route's line
        await h.pause(SEAM);
        const comets = await onElement(
            h,
            async (el, set) => {
                const edges = el.session.data.edges();
                const deg = new Map();
                for (const e of edges) for (const n of [e.source, e.target]) deg.set(n, (deg.get(n) ?? 0) + 1);
                const hubs = new Set([...deg.keys()].sort((a, b) => deg.get(b) - deg.get(a)).slice(0, 25));
                const ids = edges.filter((e) => hubs.has(e.source) || hubs.has(e.target)).map((e) => e.id);
                const layer = await el.session.styles.add({
                    name: "Comets",
                    target: "edge",
                    selector: { match: "ids", edges: ids },
                    set,
                });
                return layer.id;
            },
            { "edge.shaders": [{ shader: "comet-tracers", params: { ...COMETS, intensity: 0 } }] },
        );
        // beneath the pale veil, so they show as it lifts: every route in its airport's color
        await onElement(
            h,
            (el, [above, set]) =>
                el.session.styles.add(
                    { name: "Globe routes", target: "edge", selector: { match: "everything" }, set },
                    { above },
                ),
            [arrows, { "edge.colorFrom": "source", "edge.arrowHead": "none", "edge.opacity": 0.5, "edge.width": 2.5 }],
        );
        await Promise.all([
            // a restyle on the globe costs the page a frame or more: few layers, slow steps, so the
            // pull keeps its frame rate
            sweep(h, { id: dim.nodes, by: landed, ms: S(5000), stepMs: 700 }),
            sweep(h, { id: dim.edges, edges: true, by: landed, ms: S(5000), stepMs: 700 }),
            tween(h, route.size, { ...SCENE, "node.size": ROUTE_SIZE }, { ...SCENE, "node.size": 0.45 }, S(5000), 800),
            tween(h, h.size, { "node.size": GLOBE_SIZE[0] }, { "node.size": GLOBE_SIZE[1] }, S(6000), 800),
            tween(h, route.edges, routeLine(0, 2), routeLine(0.9, 3), S(3000), 800),
        ]);
        await tweenShader(h, comets, "intensity", 0, COMETS.intensity, S(2000), { ease: true, stepMs: 800 });
        await ride;
    },
    holdMs: 300,
};

/**
 * What the flight's numbers come to, for the take's log: its fastest turn and roll, and how near
 * it passes the route's airports and the others it does not hide.
 * @param flight - flightPoses' result
 * @param pts - the route's airports
 * @param others - [id, position] of the rest
 * @param hidden - the ids hidden near the lens
 * @returns a line
 */
function flightStats(flight, pts, others, hidden) {
    const { poses, hz } = flight;
    const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
    const f = (q) => {
        const l = d(q.t, q.p);
        return { x: (q.t.x - q.p.x) / l, y: (q.t.y - q.p.y) / l, z: (q.t.z - q.p.z) / l };
    };
    let turn = 0;
    for (let i = 1; i < poses.length; i++) {
        const [a, b] = [f(poses[i - 1]), f(poses[i])];
        turn = Math.max(turn, Math.acos(Math.min(1, a.x * b.x + a.y * b.y + a.z * b.z)) * hz);
    }
    const roll = Math.max(...poses.map((q) => Math.abs(q.r)));
    const least = (qs) => Math.min(...qs.map((q) => Math.min(...poses.map(({ p }) => d(p, q)))));
    const shown = others.filter(([id]) => !hidden.includes(id)).map(([, q]) => q);
    return [
        `max turn ${turn.toFixed(2)} rad/s of take`,
        `max roll ${roll.toFixed(2)}`,
        `nearest route airport ${least(pts.slice(0, -1)).toFixed(1)}`,
        `nearest other shown ${least(shown).toFixed(1)}`,
        `${hidden.length} hidden`,
    ].join(", ");
}
