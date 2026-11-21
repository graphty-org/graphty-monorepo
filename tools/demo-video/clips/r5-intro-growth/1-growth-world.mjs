// Intro "Growth", the whole intro in one continuous take (shot K times slow, sped up in the cut):
// one gray airport, flat; a second, its route drawn in; more, faster and faster; arrowheads; the
// app's indigo sweeps across; the drawing rises into 3D where it stands as the glass shading arrives,
// the camera tilting and circling as it keeps growing; Louvain's communities sweep their colors
// across; the camera pushes in as the nodes glow and breathe and comets run along the routes; the
// shortest path from Sydney to New York lights up and the rest fades dark, a reticle locks onto
// Sydney; the camera flies along the path from one side, airport by airport, translating only; from
// New York it pulls back on the dark until the globe appears far out, the airports glide onto it in
// their community colors, and the globe turns slowly with North America and Europe facing the camera.
//
// Every airport lands where plan put it (the fixed layout), so no addition reflows the drawing,
// and the take changes styles at most a few times a second: a style update costs the page tens of
// milliseconds (tmp/demo-video/intros/growth/defects.md), and the take must keep its frame rate.
import { still } from "../ch6/map.js";
import { hideLegend } from "../r2-5b-and-more/more.js";
import {
    addLayer,
    canvasColor,
    CINE_CLIP,
    noCursor,
    onElement,
    shade,
    slowMotion,
    tween,
    tweenShader,
} from "../r4-intro/cine.js";
import { rig, steadyShaders } from "../r4-intro-shape/shape.js";
import {
    above,
    accelerating,
    analyze,
    FLIGHTS,
    follow,
    GLOBE,
    GRAY,
    grown,
    lift,
    PATH_ENDS,
    plan,
    sideFlight,
    startGrowth,
    sweep,
    unfollow,
} from "./growth.js";

/** Undercranking: the take runs this many times slower than it plays. */
const K = 2;
/**
 * A length on screen, in the take's (slowed) milliseconds.
 * @param ms - milliseconds on screen
 * @returns milliseconds in the take
 */
const S = (ms) => ms * K;
/** How many airports join while the drawing is flat. */
const FLAT = 80;
/** The app's default node color. */
const INDIGO = "#6366F1";
/**
 * The cut's full-bleed box is 778 of the canvas's 1,016 px tall (it crops the top bar and the
 * toolbar) and its middle is where the camera aims (measured on the frames), so the framing counts
 * that height, split evenly.
 */
const BOX = { top: 119, bottom: 119 };
/** Shader parameter tweens step this often (take ms), never every frame. */
const STEP = 200;

/**
 * The angle nearest `a` that equals `b` (radians).
 * @param a - the angle to be near
 * @param b - the angle wanted
 * @returns b plus whole turns
 */
const near = (a, b) => b + 2 * Math.PI * Math.round((a - b) / (2 * Math.PI));

/**
 * A camera move left running while the take does other things, awaited later: marked handled now,
 * so an error elsewhere in the take is reported as itself, not hidden by this move failing as the
 * browser closes.
 * @param p - the move (rig's promise)
 * @returns the same promise
 */
function meanwhile(p) {
    p.catch(() => null);
    return p;
}

/**
 * The end of the take, after the globe has appeared: the camera, already far out over New York,
 * pulls back slowly while it turns toward the middle of the North Atlantic (between New York and
 * Europe), then keeps turning slowly past it, so North America and Europe both face the camera
 * (rig keys, aimed at the origin).
 * @param spot - where the globe puts New York
 * @param europe - where it puts Europe
 * @param alpha - the camera's angle at the start
 * @returns the keys
 */
function globeKeys(spot, europe, alpha) {
    const { r } = above(spot);
    const u = (p) => {
        const k = Math.hypot(p.x, p.y, p.z);
        return { x: p.x / k, y: p.y / k, z: p.z / k };
    };
    const [a, b] = [u(spot), u(europe)];
    const mid = above({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
    const to = near(alpha, mid.alpha);
    const O = { x: 0, y: 0, z: 0 };
    return [
        {
            target: O,
            alpha: to - 0.22,
            beta: mid.beta,
            radius: r * 4.7,
            ms: S(2600),
            easing: "easeInOut",
            mark: "pull",
        },
        { target: O, alpha: to + 0.12, beta: mid.beta, radius: r * 4.8, ms: S(7000), easing: "linear", mark: "turn" },
        { target: O, alpha: to + 0.3, beta: mid.beta, radius: r * 4.8, ms: S(4000), easing: "easeOut" },
    ];
}

export default {
    id: "growth-world",
    ...CINE_CLIP,
    caption: "",
    dataset: FLIGHTS,
    async setup(h) {
        await onElement(h, (el) => {
            // the sun over the Atlantic: the Americas and Europe in daylight, so the globe reads as the
            // Earth (at night the small globe read as an empty glass ball); low, so its glint on the
            // sea sits below the airports the camera ends on (globeLook has no specular setting)
            el.globeLook = { atmosphere: true, sun: { lat: 5, lon: -40 }, background: "#05070d" };
        });
        h.steps = await plan(h, async (spot, europe) => {
            const { alpha } = above(spot);
            const { beta, r } = above(spot);
            const reveal = { target: { x: 0, y: 0, z: 0 }, alpha, beta, radius: r * 3 };
            for (const k of [reveal, ...globeKeys(spot, europe, alpha)]) {
                await rig(h, [{ ...k, ms: 1, mark: undefined }]);
                await still(h.page);
            }
        });
        await h.app.ready2D();
        await canvasColor(h.page);
        h.gray = await addLayer(h, {
            name: "Plain nodes",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": GRAY.node },
        });
        h.edges = await addLayer(h, {
            name: "Plain edges",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.color": GRAY.edge, "edge.arrowHead": "none", "edge.width": 2 },
        });
        // after the layers: the legend opens only once it has entries
        await hideLegend(h.page);
        await steadyShaders(h);
        await onElement(h, (el) => {
            el.autoFrame = false;
        });
        await h.app.settled();
        // the camera already on the one airport, framing the first newcomers before they come
        await follow(h, { fill: 0.85, least: 14, tau: S(500), aheadMs: S(1500), box: BOX });
        await h.app.frames(120);
        await noCursor(h);
    },
    async run(h) {
        const t0 = Date.now();
        const at = (ms) => h.pause(Math.max(0, t0 + ms - Date.now()));
        // ---- flat and gray: one airport, then routes drawn in, slowly at first, then faster
        // (each airport in its flat place: the depth comes with the lift)
        const flat = h.steps
            .slice(1, FLAT)
            .map((s) => ({ ...s, node: { ...s.node, position: { ...s.node.position, z: 0 } } }));
        const times = accelerating(flat.length, S(1900), 0.8, S(70), S(1300));
        const drawMs = times.map((t, i) =>
            Math.min(S(1500), Math.max(S(350), 0.8 * ((times[i + 1] ?? t + S(400)) - t))),
        );
        flat.firstEdgeId = h.steps.firstEdgeId;
        h.mark("grow");
        await startGrowth(h, flat, times, { drawMs, layers: 2, tickMs: 60, glide: 5, cool: GRAY.edge });
        // the arrowheads arrive, the routes brighter for a beat, then back to a quieter gray
        await at(times[30]);
        h.mark("arrows");
        const routes = (color, width) =>
            onElement(h, (el, [id, set]) => el.session.styles.update(id, { set }), [
                h.edges,
                { "edge.color": color, "edge.arrowHead": "normal", "edge.arrowHeadSize": 2.5, "edge.width": width },
            ]);
        await routes("#b4bbcc", 2.6);
        await h.pause(S(1300));
        await routes("#7a8294", 2);
        await at(times[52]);
        h.mark("indigo");
        // the routes a light indigo with it, wide enough to still show once the nodes shine
        await routes("#a5a9f5", 2);
        await sweep(h, { id: h.gray, ms: S(1300) });
        await grown(h);
        await h.pause(S(500));
        // ---- the nodes swell, then the drawing rises into 3D where it stands as the shading
        // arrives (glass drawn in 2D is brighter than in 3D, so it waits for the lift); no airport
        // joins meanwhile
        h.size = await addLayer(h, {
            name: "Node size",
            target: "node",
            selector: { match: "everything" },
            set: { "node.size": 1 },
        });
        await tween(h, h.size, { "node.size": 1 }, { "node.size": 1.5 }, S(600));
        await unfollow(h);
        await slowMotion(h, { layoutSeconds: 2.2 * K, transition: "glide" });
        const front = await lift(h, h.steps);
        h.mark("lift");
        h.glass = await shade(h, { shader: "glass", params: { sparkle: 0.2, bloom: 0, tint: 1 }, name: "Glass" });
        h.mark("shade");
        // the camera turns and tilts down at once, so the depth shows in the parallax as it rises,
        // and keeps circling the drawing's middle while the network grows, timed to face New York's
        // place on the globe when the path starts
        const { spot, europe } = h.steps;
        const { alpha: endAlpha } = above(spot);
        const circleMs = S(13500);
        let goal = near(front.alpha + 1.4, endAlpha - 0.5);
        if (Math.abs(goal - front.alpha) < 1.2) goal += 2 * Math.PI * Math.sign(goal - front.alpha || 1);
        const spin = ((goal - front.alpha) * 1000) / circleMs;
        const orbit = {
            fill: 0.8,
            share: 1,
            tau: S(1000),
            spin,
            beta: 1,
            tilt: 1.4,
            least: 10,
            aheadMs: S(600),
            box: BOX,
        };
        await follow(h, orbit);
        await h.pause(S(2600));
        const rest = h.steps.slice(FLAT);
        // in bursts of four airports, faster and faster
        const gaps = accelerating(Math.ceil(rest.length / 4), S(520), 0.93, S(110), 0);
        h.mark("grow3d");
        await startGrowth(
            h,
            rest,
            rest.map((_, i) => gaps[Math.floor(i / 4)]),
            { layers: 0 },
        );
        await grown(h);
        await h.pause(S(800));
        // ---- communities sweep their colors across
        h.mark("communities");
        // the indigo held over every node before the run, and the colors the run adds (a
        // Communities layer, put on top) moved beneath it at once, so they show only as it sweeps
        const mask = await onElement(
            h,
            async (el, color) => {
                const all = el.session.styles.list();
                const layer = await el.session.styles.add(
                    {
                        name: "Indigo",
                        target: "node",
                        selector: { match: "ids", nodes: el.getNodes().map((n) => n.id) },
                        set: { "node.color": color },
                    },
                    { above: all.at(-1).id },
                );
                return layer.id;
            },
            INDIGO,
        );
        await analyze(h, "louvain", {}, mask);
        await sweep(h, { id: mask, ms: S(1600), stepMs: 300 });
        await h.pause(S(400));
        // ---- glow: the camera pushes in, the nodes brighten and breathe, wider routes carry comets
        // in their colors
        h.mark("glow");
        await follow(h, { ...orbit, fill: 1.2, tau: S(900) });
        h.routes = await addLayer(h, {
            name: "Route color",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.colorFrom": "source", "edge.opacity": 0.55, "edge.arrowHead": "none", "edge.width": 3.5 },
        });
        h.comets = await shade(h, {
            shader: "comet-tracers",
            params: { useEdgeColor: true, intensity: 0, bloom: 2, tail: 200, spacing: 260, speed: 1.2 / K },
        });
        await onElement(
            h,
            (el, [id, flicker]) => {
                const l = el.session.styles.list().find((x) => x.id === id);
                return el.session.styles.update(id, {
                    set: {
                        ...l.set,
                        "node.shaders": [
                            { shader: "lantern", params: { intensity: 0, flicker, bloom: 0.9 } },
                            { shader: "glass", params: { sparkle: 0.8, bloom: 0.2, tint: 1 } },
                        ],
                    },
                });
            },
            [h.glass, 0.35 / K],
        );
        // the nodes breathe twice (their size), as the light comes up
        const breathe = async () => {
            for (let i = 0; i < 2; i++) {
                await tween(h, h.size, { "node.size": 1.5 }, { "node.size": 1.95 }, S(650), 140);
                await tween(h, h.size, { "node.size": 1.95 }, { "node.size": 1.5 }, S(650), 140);
            }
        };
        await Promise.all([
            tweenShader(h, h.glass, "intensity", 0, 1.3, S(1500), { ease: true, stepMs: STEP }),
            tweenShader(h, h.comets, "intensity", 0, 3, S(1500), { ease: true, stepMs: STEP }),
            breathe(),
        ]);
        await h.pause(S(800));
        // ---- the path: Sydney to New York, lit first; then the rest fades dark, left to right
        h.mark("path");
        const layerIds = () => onElement(h, (el) => el.session.styles.list().map((l) => l.id));
        const had = new Set(await layerIds());
        const path = await analyze(h, "shortest-path", { source: PATH_ENDS[0], target: PATH_ENDS[1] });
        console.log(`  growth-world: path ${path.nodes.join(" > ")}`);
        // the dark (beneath the route's own layers, filled in below): a dark slate over every node
        // (opacity does not dim a shader's glass or glow, so the color does), every route faded
        const dim = {
            nodes: await addLayer(h, {
                name: "Dim nodes",
                target: "node",
                selector: { match: "ids", nodes: [] },
                set: { "node.color": "#262b3d" },
            }),
            edges: await addLayer(h, {
                name: "Dim edges",
                target: "edge",
                selector: { match: "everything" },
                set: { "edge.opacity": 0.55 },
            }),
        };
        await addLayer(h, {
            name: "Route",
            target: "edge",
            selector: { match: "ids", edges: path.edges },
            set: {
                "edge.color": "#fff4d6",
                "edge.width": 10,
                "edge.opacity": 1,
                "edge.shaders": [
                    {
                        shader: "fiber-packets",
                        params: { packets: 3, speed: 1.2 / K, tail: 40, glint: 1.4, bloom: 1.6 },
                    },
                ],
            },
        });
        await addLayer(h, {
            name: "Route airports",
            target: "node",
            selector: { match: "ids", nodes: path.nodes },
            set: {
                "node.color": "#fff4d6",
                "node.opacity": 1,
                "node.shaders": [
                    { shader: "lantern", params: { intensity: 0.7, flicker: 0.35 / K, bloom: 0.6 } },
                    { shader: "glass", params: { sparkle: 0.8, bloom: 0.3, tint: 1 } },
                ],
            },
        });
        await addLayer(h, {
            name: "Route size",
            target: "node",
            selector: { match: "ids", nodes: path.nodes },
            set: { "node.size": 2.2 },
        });
        // the flight's camera: one side of the route the whole way (sideFlight), the side nearest
        // the way it will face New York on the globe; airports that would pass the lens hidden
        const cam = await onElement(h, () => globalThis.__follow.state);
        await unfollow(h);
        const all = await onElement(h, (el) => el.getNodes().map((n) => [n.id, n.getPosition()]));
        const where = new Map(all);
        const pts = path.nodes.map((id) => where.get(id));
        const side = sideFlight(
            pts,
            spot,
            all.filter(([id]) => !path.nodes.includes(id)),
            { radius: 34, clear: 7 },
        );
        console.log(`  growth-world: flight radius ${side.radius.toFixed(1)}, ${side.near.length} airports hidden`);
        const V = { alpha: near(cam.alpha, side.alpha), beta: side.beta };
        const mid = { x: 0, y: 0, z: 0 };
        for (const p of pts) for (const c of ["x", "y", "z"]) mid[c] += p[c] / pts.length;
        const reach = Math.max(...pts.map((p) => Math.hypot(p.x - mid.x, p.y - mid.y, p.z - mid.z)));
        const whole = { ...V, radius: (reach / Math.tan(0.4)) * 1.5, target: mid };
        const framing = meanwhile(
            rig(h, [{ ...whole, ms: S(1800), easing: "easeInOut", mark: "frame" }], {
                alpha: cam.alpha,
                beta: cam.beta,
                radius: cam.radius,
                target: cam.aim ?? cam.target,
            }),
        );
        await addLayer(h, {
            name: "Near the lens",
            target: "node",
            selector: { match: "ids", nodes: side.near },
            set: { "node.opacity": 0, "node.size": 0.01 },
        });
        await h.pause(S(300));
        await Promise.all([
            sweep(h, { id: dim.nodes, ms: S(900), stepMs: 180, grow: true }),
            tween(h, dim.edges, { "edge.opacity": 0.55 }, { "edge.opacity": 0.08 }, S(900), 220),
            tweenShader(h, h.comets, "intensity", 3, 0, S(900), { ease: true, stepMs: 220 }),
            tweenShader(h, h.glass, "intensity", 1.3, 0.15, S(900), { ease: true, stepMs: 220 }),
        ]);
        await tween(h, h.size, { "node.size": 1.5 }, { "node.size": 0.9 }, S(1000), 140);
        await framing;
        // ---- the flight: settle on Sydney, lock on, and as the lock lands push in; then airport to
        // airport, the camera only translating, each hop eased out and in with a rest on its
        // airport; a long hop pulls back on its way so the frame never sweeps fast
        const onSydney = { node: path.nodes[0], ...V, radius: whole.radius * 0.8 };
        await rig(h, [{ ...onSydney, ms: S(1600), easing: "easeInOut", mark: "onSydney" }], whole);
        const reticle = await shade(h, {
            shader: "lock-on-reticle",
            nodes: [path.nodes[0]],
            params: { hudColor: "#5cffb0", spin: 0.5 / K, lineWidth: 3, lockTime: 0, leaveTime: 0 },
        });
        h.mark("lock");
        const locking = tweenShader(h, reticle, "lockTime", 0, 0.55, S(1100), { stepMs: 100 });
        await h.pause(S(800));
        const R = side.radius;
        const keys = [{ node: path.nodes[0], ...V, radius: R, ms: S(2000), easing: "easeInOut", mark: "dive" }];
        for (let i = 1; i < pts.length; i++) {
            const seg = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y, pts[i].z - pts[i - 1].z);
            const ms = S(Math.min(2600, 1500 + 30 * seg));
            const far = Math.max(R, 1.2 * seg);
            const to = { node: path.nodes[i], ...V, radius: R };
            if (far > R * 1.15) {
                const halfway = {
                    x: (pts[i].x + pts[i - 1].x) / 2,
                    y: (pts[i].y + pts[i - 1].y) / 2,
                    z: (pts[i].z + pts[i - 1].z) / 2,
                };
                keys.push(
                    { target: halfway, ...V, radius: far, ms: ms / 2, easing: "easeIn", mark: `hop${i}` },
                    { ...to, ms: ms / 2, easing: "easeOut" },
                );
            } else keys.push({ ...to, ms, easing: "easeInOut", mark: `hop${i}` });
            keys.push({ ...to, radius: R * 0.97, ms: S(650), easing: "linear" });
        }
        await Promise.all([locking, rig(h, keys, onSydney)]);
        // ---- the globe: New York marked, the camera pulls back from it on the dark, turning to look
        // down on New York's place on the globe; only once it is three globe radii out does the
        // globe appear (it cannot fade in, defects.md 8: the cut dissolves over it), the path
        // cleared, and the airports glide onto it taking back their community colors
        const nyc = await shade(h, {
            shader: "lock-on-reticle",
            nodes: [PATH_ENDS[1]],
            params: { hudColor: "#5cffb0", spin: 0.5 / K, lineWidth: 3, lockTime: 0, leaveTime: 0 },
        });
        const nycLock = meanwhile(tweenShader(h, nyc, "lockTime", 0, 0.55, S(900), { stepMs: 100 }));
        await h.pause(S(500));
        const top = above(spot);
        const back = {
            target: { x: 0, y: 0, z: 0 },
            alpha: near(V.alpha, top.alpha),
            beta: top.beta,
            radius: top.r * 3,
        };
        await slowMotion(h, { layoutSeconds: 3.4 * K, transition: "glide" });
        const ride = meanwhile(
            rig(
                h,
                [{ ...back, ms: S(3000), easing: "easeInOut", mark: "back" }, ...globeKeys(spot, europe, back.alpha)],
                { node: PATH_ENDS[1], ...V, radius: R * 0.97 },
            ),
        );
        await nycLock;
        await h.pause(S(2500));
        // the route's layers, the reticles, the analysis's own layers and the hidden airports' layer
        const pathLayers = (await layerIds()).filter((id) => !had.has(id) && id !== dim.nodes && id !== dim.edges);
        h.mark("globe");
        await onElement(h, (el, o) => el.setLayout("location-map", o), GLOBE);
        await onElement(
            h,
            async (el, ids) => {
                // removing an analysis's layer can take its sibling layers with it, so skip the gone ones
                for (const id of ids) {
                    if (el.session.styles.list().some((l) => l.id === id)) await el.session.styles.remove(id);
                }
            },
            pathLayers,
        );
        await Promise.all([
            sweep(h, { id: dim.nodes, ms: S(1000), stepMs: 200 }),
            tween(h, h.size, { "node.size": 0.9 }, { "node.size": 1.2 }, S(1000), 200),
            tween(h, dim.edges, { "edge.opacity": 0.08 }, { "edge.opacity": 0.4 }, S(1000), 250),
        ]);
        // on the globe the comets run only on the routes of the 30 busiest airports: on all 615 long
        // arcs the turning globe drew a few frames a second
        await onElement(
            h,
            (el, id) => {
                const edges = el.session.data.edges();
                const deg = new Map();
                for (const e of edges) for (const n of [e.source, e.target]) deg.set(n, (deg.get(n) ?? 0) + 1);
                const hubs = new Set([...deg.keys()].sort((a, b) => deg.get(b) - deg.get(a)).slice(0, 30));
                const ids = edges.filter((e) => hubs.has(e.source) || hubs.has(e.target)).map((e) => e.id);
                return el.session.styles.update(id, { selector: { match: "ids", edges: ids } });
            },
            h.comets,
        );
        // the light comes back up once the airports have landed and the camera is out
        await h.pause(S(3000));
        await Promise.all([
            tweenShader(h, h.comets, "intensity", 0, 3, S(1600), { ease: true, stepMs: 300 }),
            tweenShader(h, h.glass, "intensity", 0.15, 0.9, S(1600), { ease: true, stepMs: 300 }),
        ]);
        await ride;
    },
    holdMs: 300,
};
