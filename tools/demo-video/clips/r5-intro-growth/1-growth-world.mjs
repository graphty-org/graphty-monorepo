// Intro "Growth", the whole intro in one continuous take (shot K times slow, sped up in the cut),
// one unbroken camera move that builds from stillness to speed and lets the light rise and fall:
// one dim airport in near darkness, the camera drifting in; a second glides out along its route,
// then more, slowly at first and faster and faster as the sky and the drawing brighten, the camera
// opening out in one planned move (treeFraming: it only ever widens, its middle following the
// tree's smoothly) and still opening as the app's indigo and the arrowheads spread through the
// network in the order it grew; the drawing rises into 3D as glass spreads over it and its glow
// swells, the camera tilting and circling at once, while airports keep coming, faster, scattered
// through the drawing's open spaces (scatter); Louvain's communities ignite outward from the
// middle, gathering their airports into lobes of their own, their routes lit with comets, the
// brightest moment; then the world darkens toward Shenzhen and the route from there to San
// Francisco (by Beijing and Manila; plan's flightRoute, four stops, every leg long) lights up red
// airport by airport, while the camera leaves its orbit, carrying its motion on, and swoops in
// behind Shenzhen, its look coming round onto the route; and it flies the route like an airplane -- riding beside it and looking along its line
// ahead, faster and faster, each airport coming up along the line and sweeping by large beside it,
// never through one, turning after each, banking gently -- and bends onto San Francisco right
// after Manila, easing into a close-up on it, at its place on the globe (the route's line faded
// before it), San Francisco a small plain red ball already exactly the globe's airports' size in the
// world (GLOBE_SIZE), large on screen only because the camera comes near (CLOSE).
// The cut dissolves the earth in behind it (tmp/demo-video/intros/growth/shots.md), and the camera
// pulls back from it, starting within the dissolve, in one long eased move to the whole globe
// (evenly lit, no night side), large and a little above the frame's middle, the whole network
// there as the earth dissolves in, muted (MUTED: each community's hue at half its
// saturation, quiet dots on the map), its routes one color and width all the way, San Francisco one ordinary airport of the globe (its size all
// along, every airport shrinking together as the camera pulls back; its community's muted color
// eased in; every airport of the globe a plain ball, PLAIN), the globe turning behind the title's
// logo, its line under the globe. While the
// drawing is flat (the first FLAT airports) each airport lands beside the one it joins
// (flatPlaces), so the drawing grows as an untangled tree; the lift is two moves: each airport
// rises to its depth in the 3D drawing and a third of the way across (lift), then the drawing
// opens to its 3D places (place).
//
// Every airport ends where plan put it (the fixed layout), so no addition reflows the drawing;
// every change spreads (a layer's selector grown or narrowed over time, values tweened), and the
// take updates styles at most a few times a second: an update costs the page tens of milliseconds
// (tmp/demo-video/intros/growth/defects.md), and the take must keep its frame rate.
import { hideLegend } from "../r2-5b-and-more/more.js";
import { addLayer, CINE_CLIP, noCursor, onElement, slowMotion, tween, tweenShader } from "../r4-intro/cine.js";
import { steadyShaders } from "../r4-intro-shape/shape.js";
import {
    accelerating,
    analyze,
    carry,
    FLIGHTS,
    flightPoses,
    follow,
    GLOBE,
    GRAY,
    grown,
    lift,
    nearLens,
    PATH_END,
    place,
    plan,
    playPoses,
    revealPoses,
    startGrowth,
    stretch,
    sweep,
    treeFraming,
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
const FLAT = 32;
/** The app's default node color, its light tint for routes, and the node color dimmed through the lift. */
const INDIGO = { node: "#6366F1", edge: "#a5a9f5", dim: "#4a4db5" };
/** How far the routes dim through the switch to 3D (their opacity). */
const LIFT_DIM = 0.4;
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
 * The cut's full-bleed crop (assemble.mjs CANVAS: take rows 112-887) of the canvas (rows 40-1056):
 * the canvas rows it leaves off at the top and the bottom, so the follow frames the drawing in the
 * middle of the finished frame.
 */
const BOX = { top: 72, bottom: 169 };
/**
 * How far the crop's middle is above the canvas's (in half-heights of the 1,016 px canvas): the
 * flight's close-up and the reveal aim that far below San Francisco and then the globe, so they sit in
 * the middle of the finished frame.
 */
const RAISE = (BOX.bottom - BOX.top) / 1016;
/**
 * The 2D camera as the tree grows (follow's `plan`, treeFraming): the whole tree at `fill` of the
 * frame (less as the view keeps opening), never framed closer than `least`; the camera eased onto
 * the plan over `tau` from the drift before it.
 */
const TREE = { fill: 0.8, least: 14, tau: S(1200), box: BOX };
/**
 * The close-up on San Francisco: the camera's distance from it as the flight arrives (world units,
 * the globe's radius 25), near enough that the earth's map round it fills the frame and its small
 * ball (GLOBE_SIZE) reads large; the camera's near plane is 1 unit out, so no nearer.
 */
const CLOSE = 2;
/**
 * The speed the flight arrives at, in CLOSEs a second of take: San Francisco grows on screen at the
 * same steady rate from 4 CLOSE out (flightPoses' `near`), about 0.9 s of output, through the
 * close-up's creep (0.27, not 0.18: at 0.18 the creep changed each output frame by too little to
 * tell from a stalled render, cut46's frozen run of 34 frames).
 */
const CREEP = 0.27;
/** The cut's speed through the close-up and the dissolve (cuts/intro-growth.json's ramp there). */
const END = 3.2;
/** How long the close-up is held, creeping in, before the dissolve starts (take ms: 0.1 s in the cut). */
const HOLD = 100 * END;
/**
 * How many times slower the take plays the hush (from mark hush to mark flight) than the rest:
 * the hush restyles many layers while the camera swoops, and each restyle stalls the page
 * (defects.md 5); played slower, a stall is a smaller share of an output frame. The cut plays the
 * hush as much faster (cuts/intro-growth.json's ramp from marks hush and route: 9.6x).
 */
const HUSH_SLOW = 2;
/**
 * A length on screen in the hush, in the take's milliseconds (S, HUSH_SLOW times slower).
 * @param ms - milliseconds on screen
 * @returns milliseconds in the take
 */
const H = (ms) => S(ms) * HUSH_SLOW;
/**
 * How long the swoop takes, from the orbit to the run-in behind the route's first airport (take ms at the flight's
 * speed), and how many times slower the take plays it: the cut plays the hush at 9.6x and the
 * flight at 3.1x (cuts/intro-growth.json's ramp from marks hush and flight), so the camera's speed
 * carries on unchanged into the flight.
 */
const APPROACH = S(3000);
const APPROACH_SLOW = (4.8 * HUSH_SLOW) / 3.1;
/**
 * How long the flight's build takes, from the run-in to Manila, the last airport but one (take ms:
 * the route from Shenzhen by Beijing, 153 units to Manila against Sydney's 70, at 4200 instead of
 * 2200, so its top speed is Chongqing's and each airport passes on its own, about 2.2 s and 1.1 s
 * of output apart, for about 1 s more of flight in the cut with the faster CREEP); the
 * arrival on San Francisco takes what its speeds make it (flightPoses' `flyMs`).
 */
const FLY = S(4200);
/**
 * The stretch of the flight the route's line fades over (take ms before the flight's end: from
 * 2 s of output before the close-up to 1.1 s before, before the line could streak past the lens),
 * played FADE_SLOW times slower in the take (stretch); cuts/intro-growth.json plays it FADE_SLOW
 * times faster, from mark close minus (FADE length x FADE_SLOW + FADE[1]) of take (11.4 s) to mark
 * close minus FADE[1] (3.3 s).
 */
const FADE = [S(2000), S(1100)];
const FADE_SLOW = 3;
/** How much longer the take's flight is for that (take ms). */
const FADE_EXTRA = (FADE[0] - FADE[1]) * (FADE_SLOW - 1);
/**
 * The dissolve between the close-up before and after the globe, in take ms: the cut's 1.5 s
 * crossfade at its ramp there (END). Both plates play the same reveal (revealPoses) from its
 * start through this long, the flight's plate round San Francisco's place in the 3D drawing and the
 * globe's round its place on the globe, so they match frame for frame through the dissolve.
 */
const SEAM = 1500 * END;
/**
 * How long the reveal creeps in before the pull back starts: the whole dissolve, so no line of the
 * flight's plate fades out (nor the globe's in) while the camera pulls back.
 */
const REST = SEAM;
/** The pull back from the close-up to the whole globe (take ms). */
const PULL = S(12000);
/**
 * The pull back's first stretch, over which San Francisco's color eases (take ms from SEAM, at the cut's
 * speed), and how many times slower the take plays it (cuts/intro-growth.json plays it as much
 * faster: its ramp entries from mark pull + SEAM through pull + SEAM + PULL_LIGHT x PULL_SLOW).
 */
const PULL_LIGHT = S(6000);
const PULL_SLOW = 2;
/** How long the communities take to gather their scattered airports into their lobes (take ms). */
const GATHER = S(2200);
/** The size of the route's airports but San Francisco, large as the flight sweeps past them. */
const ROUTE_SIZE = 3.2;
/** The comets on the routes, in their source airports' colors (their speed slowed with the take). */
const COMETS = { useEdgeColor: true, intensity: 2.6, bloom: 2, tail: 200, spacing: 260, speed: 1.2 / K };
/**
 * The routes on the globe: this many pixels wide on screen at every distance (as drawn in the world
 * they went from 25 px to 3 px as the camera pulled back), near opaque, so they read as lines over
 * the map behind the logo, at 1080p and at README size.
 */
const GLOBE_EDGE = 3;
const GLOBE_EDGE_OPACITY = 0.85;
/** The route's line and its airports: a rich red that reads on the dark sky and on the map. */
const ROUTE_RED = "#e0262f";
/** The route's line: its width as the flight flies it, and on the globe. */
const ROUTE_WIDTH = [8, 8];
/**
 * The globe's airports, San Francisco's too: plain lit balls, every shader off. A node drawn by a
 * shader keeps the scale it had when it was last restyled instead of following its size space
 * (defects.md 24), so a marble or pearl could draw at another size than its plain neighbors; and
 * glow on the sunlit map reads as a flare (defects.md 14).
 */
const PLAIN = {
    "node.shaders": ["glass", "glass-marble", "lantern", "pearl"].map((shader) => ({ shader, off: true })),
};
/**
 * San Francisco through the flight: a plain red ball (PLAIN, below), the same as on the globe
 * (END_GLOBE), so the two plates show the same ball through the dissolve.
 */
const END_LOOK = { "node.color": ROUTE_RED, ...PLAIN };
/**
 * Airports hidden on the globe: opacity 0 and no shader (a shaded node draws at any opacity,
 * defects.md 21).
 */
const HIDDEN = {
    "node.color": "#232838",
    "node.opacity": 0,
    "node.shaders": ["glass", "glass-marble", "lantern"].map((shader) => ({ shader, off: true })),
};
/**
 * The communities' colors on the globe: the take's palette (tol-vibrant, analyze's), in its order,
 * at half its saturation and about three quarters of its brightness, so the airports sit on the map
 * as quiet dots, each community's hue still its own.
 */
const VIBRANT = ["#0077bb", "#33bbee", "#009988", "#ee7733", "#cc3311", "#ee3377", "#bbbbbb"];
const MUTED = ["#436e87", "#6899ab", "#376e68", "#ab8168", "#935c50", "#ab6881", "#878787"];
/**
 * The routes' colors on the globe, in the same order: dark steel blues, slate teals and cool grays,
 * no warm hue, so the lines read as one calm network over the lit map (darker than its land and
 * its sea alike), San Francisco's red the only warm mark.
 */
const COOL = ["#24506e", "#2b6582", "#235e5e", "#3b4557", "#4d5868", "#3d4275", "#59616d"];
/**
 * A community color's quiet version on the globe: the nearest of the palette's colors, its
 * counterpart in `to` (MUTED for the airports, COOL for the routes).
 * @param hex - a drawn color, "#rrggbb"
 * @param [to] - the palette in VIBRANT's order
 * @returns its muted color
 */
const muted = (hex, to = MUTED) => {
    const rgb = (c) => [1, 3, 5].map((i) => Number.parseInt(c.slice(i, i + 2), 16));
    const d = (c) => rgb(c).reduce((sum, v, i) => sum + (v - rgb(hex)[i]) ** 2, 0);
    return to[VIBRANT.indexOf(VIBRANT.reduce((a, b) => (d(b) < d(a) ? b : a)))];
};
/** Drawn at their scene size, even on the globe (the map draws nodes at a size on screen). */
const SCENE = { "node.sizeSpace": "scene" };
/**
 * Every airport's size on the globe, San Francisco's too, and San Francisco's through the flight's
 * arrival (a scene size, in world units against the globe's radius 25): the same ball in both
 * plates, large in the close-up only because the camera is near (about 210 px of the output's
 * 1,080 at CLOSE), and small dots on the end globe (about 3-4 px), every airport shrinking together
 * as the camera pulls back. A size on screen would keep them as large on the end globe as in the
 * close-up's neighborhood: a pile of beads over a 370 px globe (cut34).
 */
const GLOBE_SIZE = 0.19;
/** San Francisco on the globe: still red, plain (PLAIN), the globe's size (GLOBE_SIZE). */
const END_GLOBE = { "node.color": ROUTE_RED, ...PLAIN, ...SCENE, "node.size": GLOBE_SIZE };
/** How near San Francisco (in the 3D drawing) another airport is hidden for the close-up. */
const END_CLEAR = 17;
/** The plain airports' size in 3D (scaled with the spread-out drawing, so they stay visible). */
const SIZE_3D = 2.4;
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
 * The reveal's camera: the close-up on San Francisco's place on the globe, straight down on it
 * and creeping in into the dissolve, then the long pull back, turning toward the North Atlantic,
 * to the whole globe, about 760 px of the output's 1,080 and its middle 80 px above the frame's
 * (`drop`), behind the title's logo, with the title's line under it (cuts/intro-growth.json's
 * `logoY` and `linesY`),
 * and on, turning (also flown once in setup, so the map's tiles are cached for the take).
 * @param spot - where the globe puts San Francisco
 * @param europe - where it puts Europe
 * @param [o] - the close-up: `close`, `creepV`
 * @returns the poses and their rate (revealPoses)
 */
const reveal = (spot, europe, o = {}) =>
    revealPoses(spot, europe, {
        close: CLOSE,
        ...o,
        hold: REST,
        creepFade: 0.03,
        pull: PULL,
        turn: S(4000),
        far: 4.6,
        drop: -0.11,
        spin: 0.07,
        aim: RAISE,
        // the camera ends level with the equator, over the longitude halfway to Europe
        lat: 0,
    });

/**
 * The style of the routes as they cool: their color and width, no arrows.
 * @param color - the color
 * @param width - the width
 * @returns the channels
 */
const plainEdges = (color, width) => ({ "edge.color": color, "edge.arrowHead": "none", "edge.width": width });

/** The route's line gone: no shader (its packets draw at any opacity, defects.md 21), opacity 0. */
const LINE_OFF = { ...plainEdges(ROUTE_RED, 2), "edge.opacity": 0 };

export default {
    id: "growth-world",
    ...CINE_CLIP,
    caption: "",
    dataset: FLIGHTS,
    async setup(h) {
        h.steps = await plan(
            h,
            async (spot, europe) => {
                const { poses } = reveal(spot, europe);
                for (const f of [0, 0.2, 0.3, 0.4, 0.5, 0.65, 0.8, 1]) {
                    const q = poses[Math.round(f * (poses.length - 1))];
                    await playPoses(h, { poses: [q, q], hz: 1000 });
                    await h.app.frames(f === 0 ? 240 : 90);
                }
            },
            FLAT,
        );
        // no sun: every side of the globe lit alike, so no night side ever crosses the pull back,
        // which sweeps from America to Europe (a fixed sun leaves one end or the other in the dark)
        await onElement(h, (el) => {
            el.globeLook = { atmosphere: true, background: "#05070d" };
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
        await follow(h, { fill: 0.6, least: 12, tau: S(2500), push: 0.035 / K, aheadMs: S(2500), box: BOX });
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
        // first and faster and faster (each in its flat place, beside the airport it joins: the
        // 3D places come with the lift)
        const flat = h.steps
            .slice(1, FLAT)
            .map((s) => ({ ...s, node: { ...s.node, position: h.steps.flat[s.node.id] } }));
        const times = accelerating(flat.length, S(2100), 0.84, S(70), S(5200));
        const drawMs = times.map((t, i) =>
            Math.min(S(2600), Math.max(S(400), 0.95 * ((times[i + 1] ?? t + S(400)) - t))),
        );
        flat.firstEdgeId = h.steps.firstEdgeId;
        // the camera's framing of the growing tree, planned from where and when each airport lands
        // (treeFraming): one move, only opening out, its middle following the tree's smoothly, each
        // airport framed 1.2 s before it arrives (the first ones glide out from the airport they
        // join, so both ends of a route are framed as it is drawn); after the last airport it keeps opening, a little faster, through the arrows
        // up to the lift, so the picture never stops
        const canvas = await onElement(h, (el) => el.getCanvasSize());
        const plan2d = treeFraming(
            [
                { t: 0, p: h.steps.flat[h.steps[0].node.id] },
                ...flat.map((s, i) => ({ t: times[i], p: s.node.position })),
            ],
            {
                fill: TREE.fill,
                least: TREE.least,
                aspect: canvas.width / (canvas.height - BOX.top - BOX.bottom),
                ahead: S(1200),
                sigma: S(800),
                drift: 0.012 / K,
            },
        );
        h.mark("grow");
        await startGrowth(h, flat, times, { drawMs, layers: 2, tickMs: 60, glide: 8, cool: GRAY.edge });
        await follow(h, { ...TREE, plan: { ...plan2d, later: 0.05 / K, rampMs: S(1500) } });
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
        const arrowSet = (size, width, opacity = 1) => ({
            "edge.color": INDIGO.edge,
            "edge.arrowHead": "normal",
            "edge.arrowHeadSize": size,
            "edge.width": width,
            "edge.opacity": opacity,
            // the arrowheads dim with their lines (edge.opacity leaves them alone)
            "edge.arrowHeadOpacity": opacity,
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
        // ---- the lift: the drawing rises and opens into its 3D places, the camera tilting and circling
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
        // the routes and airports dim before the switch to 3D and come back after it: the 3D view
        // draws the same edge width about half as wide and lights the flat disks as shaded spheres,
        // in the one frame of the switch (defects.md 18), which no style can match on both sides;
        // dimmed, that step is a small one, and the change around it spreads over time
        await Promise.all([
            tween(h, arrows, arrowSet(2.5, 3), arrowSet(2.5, 3, LIFT_DIM), S(900), 225),
            tween(h, indigo, { "node.color": INDIGO.node }, { "node.color": INDIGO.dim }, S(900), 225),
        ]);
        // in two moves, so it reads as a rise, not a reshuffle: first each airport rises to its depth
        // in the 3D drawing, moving only a third of the way across toward its 3D place, then the
        // drawing opens the rest of the way
        const deep = (s) => {
            const [f, p] = [h.steps.flat[s.node.id], s.node.position];
            return [s.node.id, { x: f.x + (p.x - f.x) / 3, y: f.y + (p.y - f.y) / 3, z: p.z }];
        };
        await unfollow(h);
        await slowMotion(h, { layoutSeconds: 2.4 * K, transition: "glide" });
        const front = await lift(h, Object.fromEntries(h.steps.slice(0, FLAT).map((s) => deep(s))));
        h.mark("lift");
        const opened = meanwhile(
            (async () => {
                await h.pause(S(2500));
                await slowMotion(h, { layoutSeconds: 3.4 * K, transition: "glide" });
                await place(h, Object.fromEntries(h.steps.map((s) => [s.node.id, s.node.position])));
            })(),
        );
        const orbit = {
            fill: 0.92,
            share: 1,
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
            tween(h, arrows, arrowSet(2.5, 3, LIFT_DIM), arrowSet(0.01, 4), S(2400), 250),
            tween(h, indigo, { "node.color": INDIGO.dim }, { "node.color": INDIGO.node }, S(1600), 320),
        ]);
        await onElement(h, (el, [id, set]) => el.session.styles.update(id, { set }), [
            arrows,
            { ...arrowSet(0.01, 4), "edge.arrowHead": "none" },
        ]);
        await opened;
        // the rest appear scattered through the drawing's open spaces, not on its lobes (plan's
        // `scatter`): their communities gather them in as they light
        const rest = h.steps
            .slice(FLAT)
            .map((s) => ({ ...s, node: { ...s.node, position: h.steps.scatter[s.node.id] } }));
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
        // each community gathers its scattered airports into its own lobe as it lights (the fixed
        // layout's glide), done well before the hush reads where the airports are
        await slowMotion(h, { layoutSeconds: GATHER / 1000, transition: "glide" });
        await place(h, Object.fromEntries(h.steps.map((s) => [s.node.id, s.node.position])));
        const gathered = h.pause(GATHER);
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
        await follow(h, { ...orbit, fill: 0.86, share: 1, tau: S(1500), spin: 0.36 / K });
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
        await follow(h, { ...orbit, fill: 0.86, share: 1, tau: S(1500), spin: 0.46 / K });
        await tweenShader(h, h.glass, "intensity", 1.9, 1.3, S(2200), { ease: true, stepMs: 400 });
        await bloomSky;
        await h.pause(S(900));
        await gathered;
        // ---- the hush: the world darkens toward Shenzhen (the far side first), the comets and the
        // glow going out with it, while the camera leaves its orbit and closes in on the run-in
        // behind Shenzhen (the flight's approach), its look coming round onto the route; before
        // the dark has landed, the route to San Francisco starts to light up airport by airport
        // from here to the flight the take runs HUSH_SLOW times slower (the cut as much faster): the
        // orbit's turn slowed with it at once (its framing has long settled, so a short tau moves nothing)
        await follow(h, { ...orbit, fill: 0.86, share: 1, tau: 50, spin: 0.46 / K / HUSH_SLOW });
        h.mark("hush");
        const path = await analyze(h, "shortest-path", { source: h.steps.route[0], target: PATH_END }, h.gray);
        console.log(`  growth-world: path ${path.nodes.join(" > ")}`);
        if (path.nodes.join() !== h.steps.route.join())
            throw new Error(`growth-world: the path is not plan's route (${h.steps.route.join(" > ")})`);
        // the route's middle airports glide onto a gentle arc (plan's arcRoute: even legs, no sharp
        // corner) while the world darkens, long before the flight reaches them; the flight is
        // planned on the places they glide to
        await slowMotion(h, { layoutSeconds: H(2000) / 1000, transition: "glide" });
        await place(h, Object.fromEntries(h.steps.map((s) => [s.node.id, h.steps.arc[s.node.id] ?? s.node.position])));
        const all = await onElement(h, (el) => el.getNodes().map((n) => [n.id, n.getPosition()]));
        const where = new Map(all);
        const pts = path.nodes.map((id) => h.steps.arc[id] ?? where.get(id));
        const start = pts[0];
        console.log(
            `  growth-world: route at ${JSON.stringify(pts)}, San Francisco on the globe ${JSON.stringify(h.steps.spot)}`,
        );
        const others = all.filter(([id]) => !path.nodes.includes(id));
        // San Francisco's community color: on the end globe it is one ordinary airport again
        // (and every airport's, for its routes' color there)
        const colors = await onElement(h, (el) =>
            Object.fromEntries(
                el.getNodes().map(({ id }) => {
                    const c = el.getNode(id).drawnInstanceColor;
                    return [id, `#${[c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`];
                }),
            ),
        );
        const endColor = colors[PATH_END];
        const dimSet = {
            "node.color": "#232838",
            "node.shaders": [{ ...GLASS, params: { ...GLASS.params, sparkle: 0.5 } }],
        };
        const dim = {
            nodes: await addLayer(h, {
                name: "Dim nodes",
                target: "node",
                selector: { match: "ids", nodes: [] },
                set: dimSet,
            }),
            edges: await addLayer(h, {
                name: "Dim edges",
                target: "edge",
                selector: { match: "ids", edges: [] },
                set: { ...plainEdges("#2a3045", 2), "edge.opacity": 0.12 },
            }),
        };
        // San Francisco's own routes (but the flight's): faded out once the world is dark (below), so
        // the close-up shows no line that would fade out through the dissolve while the globe's
        // lines of the same routes fade in another way
        const sfEdges = await onElement(
            h,
            (el, [end, keep]) =>
                el.session.data
                    .edges()
                    .filter((e) => (e.source === end || e.target === end) && !keep.includes(e.id))
                    .map((e) => e.id),
            [PATH_END, path.edges],
        );
        const sfDim = { ...plainEdges("#2a3045", 2), "edge.opacity": 0.12 };
        // the flight, planned from where the orbit has the camera now (flightPoses): the approach
        // to the run-in, then the route; on into the reveal's first SEAM played round San Francisco's
        // place in this drawing (where the globe will put it is only known once it is up; plan
        // measured its surface point, near enough for the dissolve's first moments). The approach
        // is played APPROACH_SLOW times slower (the cut plays the hush that much faster than the
        // flight), then the line's fade FADE_SLOW times slower (stretch); and the airports near
        // its lens (nearLens)
        // where the orbit has the camera, what it looks at and how it moves (take units a second)
        const cam = await onElement(h, () => {
            // as playPoses' blend reads the orbit: round the target it really looks at
            const { alpha, beta, radius, spin = 0, target, aim } = globalThis.__follow.state;
            const c = aim ?? target;
            const [sa, ca, sb] = [Math.sin(alpha), Math.cos(alpha), Math.sin(beta)];
            return {
                position: { x: c.x + radius * ca * sb, y: c.y + radius * Math.cos(beta), z: c.z + radius * sa * sb },
                look: c,
                v: { x: -radius * spin * sa * sb, y: 0, z: radius * spin * ca * sb },
            };
        });
        console.log(`  growth-world: the flight starts from ${JSON.stringify(cam)}`);
        const flight = flightPoses(pts, {
            from: cam.position,
            // the swoop's poses play APPROACH_SLOW times slower than their own clock
            fromV: { x: cam.v.x * APPROACH_SLOW, y: 0, z: cam.v.z * APPROACH_SLOW },
            look: cam.look,
            approachMs: APPROACH,
            ms: FLY,
            hold: HOLD,
            close: CLOSE,
            creep: CREEP,
            // the camera bends onto San Francisco's approach right after Manila
            lastOver: 0,
            aim: RAISE,
        });
        // the globe's close-up looks straight down on San Francisco; the flight's plate plays the
        // same move round its place in this drawing, turned onto the side the flight came in
        // from (carry), so the two plates show the same picture of it through the dissolve
        const atRest = { close: CLOSE - (flight.vEnd * HOLD) / 1000, creepV: flight.vEnd };
        const into = carry(
            reveal(h.steps.spot, h.steps.europe, atRest).poses.slice(1, Math.round((SEAM * flight.hz) / 1000) + 1),
            { at: h.steps.spot, dir: h.steps.spot },
            { at: pts.at(-1), dir: flight.dir },
        );
        const runMs = flight.runMs * APPROACH_SLOW;
        const flyMs = runMs + flight.flyMs;
        const fade = [flyMs - FADE[0], flyMs - FADE[1]];
        const poses = stretch(
            stretch([...flight.poses, ...into], flight.hz, 0, flight.runMs, APPROACH_SLOW),
            flight.hz,
            fade[0],
            fade[1],
            FADE_SLOW,
        );
        // and every airport round San Francisco: in the close-up one beside it, out of the lens's
        // path, drew as a large white bubble at the frame's edge through the dissolve (take32); and
        // every one the close-up sees past it, however far (the near camera saw a cluster 70 units
        // behind as glass bubbles under it, take36)
        const end = pts.at(-1);
        const round = others.filter(([, q]) => Math.hypot(q.x - end.x, q.y - end.y, q.z - end.z) < END_CLEAR);
        const closing = poses.slice(-Math.round(((S(1500) + HOLD + SEAM) * flight.hz) / 1000));
        const past = nearLens(closing, others, 0, Infinity, { cone: 0.9, behind: true });
        const near = [...new Set([...nearLens(poses, others, 7, 25), ...round.map(([id]) => id), ...past])];
        console.log(`  growth-world: flight ${flightStats(flight, pts, others, near)}`);
        // the airports in a corridor round the flight's path, to shrink away while the route lights up
        const lens = await addLayer(h, {
            name: "Near the lens",
            target: "node",
            selector: { match: "ids", nodes: near },
            set: { "node.size": SIZE_3D },
        });
        // ---- the flight: the camera leaves its orbit and closes in on Shenzhen, then flies the
        // route to San Francisco, gathering speed, looking along it, and comes into the close-up,
        // creeping in; the route's line fades as the camera closes on San Francisco, so it never
        // stabs into the lens
        // (that fade's stretch played slower: its style updates' stalls stay under an output frame,
        // defects.md 5)
        const flownAt = Date.now();
        const flown = meanwhile(
            playPoses(
                h,
                { poses, hz: flight.hz },
                {
                    // the swoop starts where the orbit is, moving as it moves; the blend takes up the
                    // little the orbit turned while the flight was planned
                    blendMs: H(600),
                    marks: [
                        [runMs, "flight"],
                        [flyMs + FADE_EXTRA, "close"],
                        [flyMs + FADE_EXTRA + HOLD + SEAM, "seam"],
                    ],
                },
            ),
        );
        const dark = meanwhile(
            Promise.all([
                sweep(h, { id: dim.nodes, by: start, reverse: true, grow: true, ms: H(2200), stepMs: 900 }),
                sweep(h, {
                    id: dim.edges,
                    edges: true,
                    by: start,
                    reverse: true,
                    grow: true,
                    ms: H(2200),
                    stepMs: 900,
                }),
                sweep(h, { id: h.routes, edges: true, by: start, reverse: true, ms: H(2200), stepMs: 900 }),
                tween(h, "background", { color: SKY.day }, { color: SKY.hush }, H(2200), 400),
            ]).then(async () => {
                // over the dimmed routes' layer, looking the same, then faded out
                const id = await addLayer(h, {
                    name: "San Francisco's routes",
                    target: "edge",
                    selector: { match: "ids", edges: sfEdges },
                    set: sfDim,
                });
                await tween(h, id, sfDim, { ...sfDim, "edge.opacity": 0 }, H(600), 900);
                return id;
            }),
        );
        await h.pause(H(1200));
        const routeLine = (opacity, width) => ({
            "edge.color": ROUTE_RED,
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
                set: routeLine(1, ROUTE_WIDTH[0]),
            }),
            nodes: await addLayer(h, {
                name: "Route airports",
                target: "node",
                selector: { match: "ids", nodes: [] },
                // red glass marbles: no shader that blooms (glass, lantern), whose glow fills the
                // whole frame in the close-up, more so on the sunlit globe (defects.md 14); their
                // swirl still, so the close-up before the globe and after it show the same marble
                set: {
                    "node.color": ROUTE_RED,
                    // over the darkened airports' layer, which hides them on the globe
                    "node.opacity": 1,
                    "node.shaders": [
                        { shader: "glass-marble", params: { spin: 0, glassTint: "#ffd2d2", secondColor: "#ffb0b0" } },
                    ],
                },
            }),
            // scene-sized: the airports the flight passes large, San Francisco at the globe's
            // airports' size (GLOBE_SIZE)
            size: await addLayer(h, {
                name: "Route size",
                target: "node",
                selector: { match: "ids", nodes: path.nodes.slice(0, -1) },
                set: { ...SCENE, "node.size": SIZE_3D },
            }),
            end: await addLayer(h, {
                name: "San Francisco size",
                target: "node",
                selector: { match: "ids", nodes: [PATH_END] },
                set: { ...SCENE, ...END_LOOK, "node.size": SIZE_3D },
            }),
        };
        // the route's line fades over FADE before the close-up (the take plays that stretch
        // FADE_SLOW times slower), then goes (its packets' shader draws at any opacity, defects.md
        // 21), so it never streaks past the lens as the camera closes on San Francisco; the other
        // airports stay, to fade with the dissolve
        const faded = meanwhile(
            (async () => {
                await h.pause(Math.max(0, flownAt + fade[0] - Date.now()));
                await tween(
                    h,
                    route.edges,
                    routeLine(1, ROUTE_WIDTH[0]),
                    routeLine(0, 2),
                    (FADE[0] - FADE[1]) * FADE_SLOW - 900,
                    450,
                );
                await onElement(h, (el, [id, set]) => el.session.styles.update(id, { set }), [route.edges, LINE_OFF]);
            })(),
        );
        h.mark("route");
        // the route's airports out of the lantern's layer: a lantern near the lens fills the frame
        await onElement(h, (el, [id, nodes]) => el.session.styles.update(id, { selector: { match: "ids", nodes } }), [
            h.glass,
            others.map(([id]) => id),
        ]);
        await Promise.all([
            tween(h, lens, { "node.size": SIZE_3D }, { "node.size": 0.01 }, H(1300), 900),
            sweep(h, { id: route.nodes, by: path.nodes, grow: true, ms: H(1300), stepMs: 900 }),
            sweep(h, { id: route.edges, edges: true, by: path.edges, grow: true, ms: H(1300), stepMs: 900 }),
            tween(
                h,
                route.size,
                { ...SCENE, "node.size": SIZE_3D },
                { ...SCENE, "node.size": ROUTE_SIZE },
                H(1300),
                900,
            ),
            tween(
                h,
                route.end,
                { ...SCENE, ...END_LOOK, "node.size": SIZE_3D },
                { ...SCENE, ...END_LOOK, "node.size": GLOBE_SIZE },
                H(1300),
                900,
            ),
        ]);
        const sfRoutes = await dark;
        await faded;
        await flown;
        // ---- the globe: switched to in one frame (it cannot fade in, defects.md 8: the cut
        // dissolves from the plate before to the plate after), the camera put on San Francisco's place
        // on it where the flight's plate was SEAM before its end, at the reveal's start; then the
        // reveal plays on, the same as the flight's plate through the dissolve
        await slowMotion(h, { layoutSeconds: null });
        h.mark("switch");
        // in the same cut-away: every airport at the globe's size in the world (GLOBE_SIZE, a scene
        // size: the map would draw them a size on screen), the route's with them, San Francisco too
        // (drawn that large through the arrival already); the darkened ones are hidden (on the
        // bright map dark glass reads as dead black balls, pale glass as white flares) and come
        // back lit as the pull reveals them; every airport's shaders go off (PLAIN: a shaded node
        // keeps its close-up scale, defects.md 24, and on the sunlit map any glow, the lantern's or
        // the glass's, reads as a white flare: defects.md 14)
        await onElement(
            h,
            async (el, o) => {
                const { styles } = el.session;
                await styles.update(o.size, { set: { ...o.scene, "node.size": o.small } });
                await styles.remove(o.lens);
                // San Francisco left to the size layer, as every airport: never larger than they are
                // (its size space said outright, as the route's is below)
                await styles.update(o.end, { set: o.endLook });
                // the globe's size like the rest (left as they were, they kept the flight's large
                // size and stood out on the globe)
                await styles.update(o.routeSize, { set: { ...o.scene, "node.size": o.small } });
                // the route's other airports left to the darkened layer, hidden with the rest until
                // the pull back brings them back lit (marbles round San Francisco read as dark balls)
                await styles.update(o.routeNodes, {
                    selector: { match: "ids", nodes: [o.endId] },
                    set: { "node.color": o.endLook["node.color"], "node.opacity": 1, ...o.plain },
                });
                // the dark lifted and the flight's line gone, here in the cut-away: the whole network is
                // on the globe in its end look as the earth dissolves in, and nothing restyles a route
                // as the camera pulls back
                for (const id of [o.dimNodes, o.dimEdges, o.sfRoutes, o.routeEdges]) await styles.remove(id);
                // the airports the globe draws on or under San Francisco stay hidden: they would
                // crowd it in the close-up
                await styles.add({
                    name: "Under San Francisco",
                    target: "node",
                    selector: { match: "ids", nodes: o.under },
                    set: o.hidden,
                });
                // every airport plain (PLAIN: a shaded node might not keep the globe's size)
                await styles.update(o.glass, { selector: { match: "everything" }, set: o.plain });
                // the communities' colors quieted (MUTED: the same hues, in the palette's order),
                // while every airport is hidden, so the change is never seen
                for (const l of styles.list()) {
                    const color = l.encode?.["node.color"];
                    if (color?.palette !== "tol-vibrant") continue;
                    const quiet = { ...color, palette: undefined, colors: o.muted };
                    await styles.update(l.id, { encode: { ...l.encode, "node.color": quiet } });
                }
            },
            {
                size: h.size,
                small: GLOBE_SIZE,
                scene: SCENE,
                lens,
                end: route.end,
                endLook: END_GLOBE,
                routeSize: route.size,
                routeNodes: route.nodes,
                endId: PATH_END,
                dimNodes: dim.nodes,
                dimEdges: dim.edges,
                sfRoutes,
                hidden: HIDDEN,
                routeEdges: route.edges,
                under: h.steps.under,
                glass: h.glass,
                plain: PLAIN,
                muted: MUTED,
            },
        );
        await onElement(h, (el, o) => el.setLayout("location-map", o), GLOBE);
        // where San Francisco lands on the globe (lifted off the surface by its size), once it is
        // there and the layout has settled (a node can pass the globe's radius on its way: take30
        // read a place in China)
        const landed = await onElement(
            h,
            (el, [id, size]) =>
                new Promise((done) => {
                    const look = () => {
                        const p = el.getNode(id)?.getPosition();
                        if (p && Math.hypot(p.x, p.y, p.z) > 0.8 * size && el.session.layout.motion === "settled")
                            done(p);
                        else globalThis.requestAnimationFrame(look);
                    };
                    look();
                }),
            [PATH_END, GLOBE.size],
        );
        console.log(
            `  growth-world: San Francisco lands ${JSON.stringify(landed)}, plan put it ${JSON.stringify(h.steps.spot)}`,
        );
        // in the same cut-away, every route in its airport's quiet color (by id, not from the node: San
        // Francisco's eases from red as the camera pulls back) and GLOBE_EDGE wide on screen at every
        // distance, so no route changes color or width in the shot. No comets here: where routes
        // crowd, as over Europe and the North Atlantic, their glow adds up to a white flare
        await onElement(
            h,
            async (el, [above, set, quiet]) => {
                const byColor = new Map();
                for (const e of el.session.data.edges()) {
                    const c = quiet[e.source];
                    byColor.set(c, [...(byColor.get(c) ?? []), e.id]);
                }
                for (const [color, edges] of byColor)
                    await el.session.styles.add(
                        {
                            name: "Globe routes",
                            target: "edge",
                            selector: { match: "ids", edges },
                            set: { ...set, "edge.color": color },
                        },
                        { above },
                    );
            },
            [
                arrows,
                {
                    "edge.arrowHead": "none",
                    "edge.opacity": GLOBE_EDGE_OPACITY,
                    "edge.width": 0.1,
                    "edge.minScreenWidth": GLOBE_EDGE,
                },
                Object.fromEntries(Object.entries(colors).map(([id, c]) => [id, muted(c, COOL)])),
            ],
        );
        const pull = reveal(landed, h.steps.europe, atRest);
        await playPoses(h, { poses: pull.poses.slice(0, 1), hz: pull.hz });
        await h.app.frames(30);
        // the stretch the light comes back over is played PULL_SLOW times slower (the cut plays it
        // as much faster), so its restyles' stalls stay under an output frame (defects.md 5)
        const ride = meanwhile(
            playPoses(
                h,
                { poses: stretch(pull.poses, pull.hz, SEAM, SEAM + PULL_LIGHT, PULL_SLOW), hz: pull.hz },
                {
                    marks: [
                        [0, "onglobe"],
                        [REST, "pull"],
                        [REST + PULL + PULL_LIGHT * (PULL_SLOW - 1), "turn"],
                    ],
                },
            ),
        );
        // San Francisco becomes one ordinary airport of the globe as the globe comes into view, at its
        // place and at their size all along: its color eased to its community's, once the dissolve is over
        await h.pause(SEAM + S(1500) * PULL_SLOW);
        const look = (color) => ({ ...END_GLOBE, "node.color": color });
        await tween(h, route.end, look(ROUTE_RED), look(muted(endColor)), S(3000) * PULL_SLOW, 700 * PULL_SLOW);
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
