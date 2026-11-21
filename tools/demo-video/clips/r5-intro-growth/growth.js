// Round 5, intro "Growth": what its takes share. A .js file, so record.mjs does not take it for a
// clip. One graph grows through the whole intro: the world's airline network (the app's OpenFlights
// sample), airport by airport, from a single gray node in 2D to a glowing 3D network that turns out
// to be the world on a globe. Filmed like the round 4 intros (../r4-intro/cine.js): no cursor, the
// camera and the growth driven through graphty-element's public API in the page.
import { rng } from "../../lib/path.mjs";
import { add, cross, dot, len, mul, sub, unit } from "../../lib/vec.mjs";
import { onElement } from "../r4-intro/cine.js";

export { FLIGHTS } from "../ch6/map.js";

/** How many airports the network grows to: the busiest, so the globe still shows every continent. */
export const AIRPORTS = 250;
/** The airport the network starts from (Frankfurt, the busiest hub of the sample's top three). */
export const SEED = "FRA";
/** The two ends of the path the camera follows: Sydney to New York JFK. */
export const PATH_ENDS = ["SYD", "JFK"];
/** The airport the globe turns toward at the end, so Europe's network passes the camera. */
export const EUROPE = "FRA";
/** How wide the network is drawn (scene units), round its middle. */
const SPAN = 90;
/** The gray of the plain drawing, before color arrives. */
export const GRAY = { node: "#6a7180", edge: "#566072" };

/**
 * How many routes the i-th airport brings when it joins: one while the shape is a tree, then two,
 * then three.
 * @param i - its place in the order
 * @returns the most routes
 */
function routesAt(i) {
    if (i < 30) return 1;
    return i < 100 ? 2 : 3;
}

/**
 * The growth order over a route list: the AIRPORTS busiest airports (most distinct routes), each
 * joining when it is the busiest with a route to one already in, and the routes it brings to those
 * (routesAt, picked at random among its real ones, seeded).
 * @param routes - [source, target] pairs
 * @returns [{ id, edges: [{ id, source, target }] }], SEED first
 */
export function growthOrder(routes) {
    const adj = new Map();
    const link = (x, y) => {
        if (!adj.has(x)) adj.set(x, new Set());
        adj.get(x).add(y);
    };
    for (const [a, b] of routes)
        if (a !== b) {
            link(a, b);
            link(b, a);
        }
    const deg = (n) => adj.get(n)?.size ?? 0;
    const busiest = [...adj.keys()].sort((a, b) => deg(b) - deg(a) || (a < b ? -1 : 1)).slice(0, AIRPORTS);
    const random = rng(2026);
    const joined = new Set([SEED]);
    const out = [{ id: SEED, edges: [] }];
    let eid = 0;
    for (;;) {
        const next = busiest.find((n) => !joined.has(n) && [...adj.get(n)].some((m) => joined.has(m)));
        if (!next) return out;
        const ins = [...adj.get(next)].filter((m) => joined.has(m)).sort();
        const picked = [];
        while (picked.length < routesAt(out.length) && ins.length)
            picked.push(ins.splice(Math.floor(random() * ins.length), 1)[0]);
        out.push({ id: next, edges: picked.map((m) => ({ id: `route-${eid++}`, source: m, target: next })) });
        joined.add(next);
    }
}

/**
 * The growth plan from the opened OpenFlights sample (setup only): its AIRPORTS busiest airports
 * (most distinct routes), in the order they join -- each the busiest airport with a route to one
 * already in -- and the routes each brings to airports already in: one while the shape is a tree,
 * two, then three (picked at random among its real routes, seeded). Then the graph is cleared and
 * SEED added back (session.data.clear, addNodes), so the take starts from one node.
 * @param h - the hand
 * @param preload - (spot, europe) => promise: run while the globe is up, given where it puts the
 *     path's end and Europe (EUROPE)
 * @returns the steps: [{ node: <record>, edges: [{ id, source, target }] }], SEED's first; and
 *     `spot` and `europe`, where the globe puts the path's end and EUROPE; each node carries
 *     `position`, its place in the 3D drawing (SPAN across, centered on the origin)
 */
export async function plan(h, preload) {
    const { nodes, edges } = await onElement(h, (el) => ({
        nodes: el.session.data.nodes().map((n) => ({ ...n })),
        edges: el.session.data.edges().map((e) => [e.source, e.target]),
    }));
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const steps = growthOrder(edges).map(({ id, edges: e }) => ({ node: byId.get(id), edges: e }));
    const order = steps.map((x) => x.node.id);
    for (const end of PATH_ENDS)
        if (!order.includes(end)) throw new Error(`growth plan: ${end} is not among the airports`);
    // where the globe will put the last airport of the path: the network laid on the globe once
    // (the same airports, so the same globe) and read; `preload` then looks at the globe from the
    // take's views, so its map tiles are in the browser's cache before the take rolls
    await onElement(
        h,
        (el, keep) => {
            const k = new Set(keep);
            const out = el.session.data
                .nodes()
                .map((n) => n.id)
                .filter((id) => !k.has(id));
            return el.session.data.removeNodes(out);
        },
        order,
    );
    const spots = await onElement(
        h,
        async (el, [ids, globe]) => {
            el.autoFrame = false;
            await el.session.config.set({ layoutTransition: undefined });
            await el.setLayout("location-map", globe);
            const read = () => ids.map((id) => el.getNode(id)?.getPosition());
            const landed = (q) => q && Math.hypot(q.x, q.y, q.z) > 0.8 * globe.size;
            for (;;) {
                const qs = read();
                if (qs.every((q) => landed(q)) && el.session.layout.motion === "settled")
                    return Object.fromEntries(ids.map((id, i) => [id, qs[i]]));
                await new Promise((r) => globalThis.requestAnimationFrame(r));
            }
        },
        [[PATH_ENDS[1], EUROPE], GLOBE],
    );
    const spot = spots[PATH_ENDS[1]];
    await preload(spot, spots[EUROPE]);
    // where every airport will be drawn: the force layout of the whole network, in 3D, seeded and
    // settled once here, then the fixed layout puts each airport there as it joins -- so no
    // addition reflows the drawing, the 2D view draws the same places flat, and the lift into 3D
    // is the same drawing gaining its depth
    const at = await onElement(
        h,
        async (el, span) => {
            await el.setLayout("ngraph", { dim: 3, seed: 7 });
            await new Promise((done) => {
                const look = () =>
                    el.session.layout.motion === "settled" ? done() : globalThis.requestAnimationFrame(look);
                globalThis.requestAnimationFrame(look);
            });
            const ps = el.getNodes().map((n) => [n.id, n.getPosition()]);
            const c = { x: 0, y: 0, z: 0 };
            for (const [, p] of ps) for (const k of ["x", "y", "z"]) c[k] += p[k] / ps.length;
            // scaled to SPAN across, so the globe (radius 25) forms inside it
            let r = 0;
            for (const [, p] of ps) r = Math.max(r, Math.hypot(p.x - c.x, p.y - c.y, p.z - c.z));
            const k = span / 2 / r;
            return Object.fromEntries(
                ps.map(([id, p]) => [id, { x: (p.x - c.x) * k, y: (p.y - c.y) * k, z: (p.z - c.z) * k }]),
            );
        },
        SPAN,
    );
    // turned so the drawing's widest spread lies across the screen and its thinnest is the depth:
    // the flat view (z 0) is then the least tangled one, and the lift adds the rest
    const turn = principalAxes(Object.values(at));
    for (const n of nodes)
        if (at[n.id]) {
            const p = at[n.id];
            const [x, y, z] = turn.map((a) => a.x * p.x + a.y * p.y + a.z * p.z);
            n.position = { x, y, z };
        }
    // the sample cleared and the first airport added back: removing all but one of the sample's
    // 3,214 airports instead leaves every later addNodes and addEdges call taking 1-5 s
    // (tmp/demo-video/intros/growth/defects.md)
    await onElement(
        h,
        async (el, seed) => {
            await el.session.data.clear();
            await el.setLayout("fixed", { scale: 1, spacing: 0 });
            await el.session.data.addNodes([seed]);
        },
        byId.get(SEED),
    );
    steps.spot = spot;
    // the store numbers edges on from the sample's count, cleared or not
    steps.firstEdgeId = edges.length;
    steps.europe = spots[EUROPE];
    return steps;
}

/**
 * The principal axes of a point cloud (centered on the origin), widest first: power iteration on
 * its 3x3 covariance, the third axis the cross product of the first two.
 * @param ps - the points
 * @returns three unit vectors
 */
export function principalAxes(ps) {
    const c = [0, 1, 2].map(() => [0, 0, 0]);
    for (const p of ps) {
        const v = [p.x, p.y, p.z];
        for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) c[i][j] += v[i] * v[j];
    }
    const times = (m, v) => ({
        x: m[0][0] * v.x + m[0][1] * v.y + m[0][2] * v.z,
        y: m[1][0] * v.x + m[1][1] * v.y + m[1][2] * v.z,
        z: m[2][0] * v.x + m[2][1] * v.y + m[2][2] * v.z,
    });
    const power = (m, start) => {
        let v = unit(start);
        for (let k = 0; k < 200; k++) v = unit(times(m, v));
        return v;
    };
    const a = power(c, { x: 1, y: 0.3, z: 0.2 });
    const la = dot(a, times(c, a));
    const d = c.map((row, i) => row.map((x, j) => x - la * [a.x, a.y, a.z][i] * [a.x, a.y, a.z][j]));
    let b = power(d, { x: 0.2, y: 1, z: 0.3 });
    b = unit(sub(b, mul(a, dot(a, b))));
    return [a, b, cross(a, b)];
}

/**
 * The path flight's camera: it looks at the route from one side the whole way, so a hop is a pure
 * translation (no turn), from the side nearest `toward` (the way the camera will face the globe),
 * and far enough out that no airport of the route comes within `clear` of the lens. A long hop
 * pulls the camera out on its way (to 1.2 times the hop's length), as the flight's keys do.
 * @param pts - the route's airports, in order
 * @param toward - the direction the camera should be nearest (from the scene's middle)
 * @param others - [id, position] of every other airport
 * @param [o] - options
 * @param [o.radius] - the least distance from the camera to the airport it looks at
 * @param [o.clear] - the least distance from the lens to any airport of the route
 * @returns alpha and beta (orbit angles of the side), radius, and `near`: the other airports that
 *     come within `clear` of the lens somewhere on the flight
 */
export function sideFlight(pts, toward, others, { radius = 34, clear = 6 } = {}) {
    const d = unit(sub(pts.at(-1), pts[0]));
    const t = unit(toward);
    let n = sub(t, mul(d, dot(t, d)));
    if (len(n) < 1e-3) n = sub({ x: 0, y: 1, z: 0 }, mul(d, d.y));
    n = unit(n);
    const track = (r) => {
        const out = [];
        for (let i = 0; i + 1 < pts.length; i++) {
            const seg = len(sub(pts[i + 1], pts[i]));
            const far = Math.max(r, 1.2 * seg);
            for (let k = 0; k <= 16; k++) {
                const f = k / 16;
                const at = add(pts[i], mul(sub(pts[i + 1], pts[i]), f));
                out.push(add(at, mul(n, r * (far / r) ** Math.sin(Math.PI * f))));
            }
        }
        return out;
    };
    let r = radius;
    while (r < radius * 3 && !track(r).every((c) => pts.every((p) => len(sub(p, c)) >= clear))) r *= 1.1;
    const cams = track(r);
    const near = others.filter(([, p]) => cams.some((c) => len(sub(p, c)) < clear)).map(([id]) => id);
    return { alpha: Math.atan2(n.z, n.x), beta: Math.acos(Math.max(-1, Math.min(1, n.y))), radius: r, near };
}

/**
 * The globe: the map layout on the airports' latitude and longitude, the whole world, drawn small
 * (radius 25 scene units) so the force drawing (about 50 across) lies around it and falls onto it,
 * never seen through it.
 */
export const GLOBE = { latitude: "latitude", longitude: "longitude", mapDimension: "3d", extent: "world", size: 25 };

/**
 * The camera's angles that look straight down at a point of the globe from outside.
 * @param p - the point (centered on the origin)
 * @returns alpha, beta and the point's distance from the center
 */
export function above(p) {
    const r = Math.hypot(p.x, p.y, p.z);
    return { alpha: Math.atan2(p.z, p.x), beta: Math.acos(p.y / r), r };
}

/**
 * The growth itself, run in the page in the background: each step's airport and routes added at
 * its time (session.data.addNodes, addEdges, one write after another, never awaited by a frame);
 * steps due together join one batch. The airports land where plan put them (the fixed layout), so
 * nothing already drawn moves. While a draw-in layer is free, a batch's routes are drawn in: each
 * arrives white-hot and wide and cools to the drawing's gray, and the first `glide` airports glide
 * out along their route from the airport they join, so the route grows with them (the edge-change
 * shader's front does not draw in this build, its clock played by hand or not). A style update costs the page tens of milliseconds (defects.md), so there are only
 * `layers` draw-in layers, each played at most every `tickMs`; batches that find none free appear
 * at once, as the fast growth does.
 * `globalThis.__growth.ahead(ms)` gives the places of the airports due in the next `ms`, so the
 * camera (follow) widens before they arrive. Resolves at once; `grown(h)` waits for the last step.
 * @param h - the hand
 * @param steps - plan's steps to add (not SEED's)
 * @param times - each step's time, ms after the start
 * @param [o] - options
 * @param [o.drawMs] - how long one route takes to draw in: a number, or one per step
 * @param [o.layers] - how many batches may draw in at once (0: routes appear at once)
 * @param [o.tickMs] - the least time between two updates of a draw-in layer
 * @param [o.flash] - the color a route arrives in
 * @param [o.cool] - the color it cools to (the drawing's routes)
 * @param [o.glide] - how many of the first steps' airports glide out from the airport they join,
 *     so their route grows with them (session.positions.set, a step every tick)
 */
export async function startGrowth(
    h,
    steps,
    times,
    { drawMs = 700, layers = 2, tickMs = 70, flash = "#e8f4ff", cool = "#4a505d", glide = 0 } = {},
) {
    await onElement(
        h,
        async (el, o) => {
            const { styles, data } = el.session;
            const smooth = (k) => k * k * (3 - 2 * k);
            const hex = (c) => [1, 3, 5].map((j) => Number.parseInt(c.slice(j, j + 2), 16));
            const [hot, cold] = [hex(o.flash), hex(o.cool)];
            const mix = (f) =>
                `#${hot
                    .map((v, j) =>
                        Math.round(v + (cold[j] - v) * f)
                            .toString(16)
                            .padStart(2, "0"),
                    )
                    .join("")}`;
            // a route arrives white-hot and wide, and cools to the drawing's gray; one whose airport
            // glides out along it is drawn at once (it grows as the airport moves), others fade up
            const look = (k, grows = false) => ({
                "edge.opacity": grows ? 1 : smooth(Math.min(1, k / 0.45)),
                "edge.color": mix(smooth(Math.max(0, (k - 0.45) / 0.55))),
                "edge.width": 2 + 2 * (1 - smooth(Math.max(0, (k - 0.45) / 0.55))),
            });
            const none = { match: "ids", edges: [] };
            const pool = [];
            for (let i = 0; i < o.layers; i++)
                pool.push({
                    id: (await styles.add({ name: "Arriving routes", target: "edge", selector: none, set: look(1) }))
                        .id,
                    busy: null,
                });
            const t0 = performance.now();
            let i = 0;
            let writing = Promise.resolve();
            const count = { left: o.steps.length };
            // the store gives each edge its own id, the next of a counter, not the record's (defects.md):
            // the draw-in layer is put on the ids it will give, and corrected if they differ
            const known = new Set(data.edges().map((e) => e.id));
            let next = o.firstEdgeId;
            const write = async (due, edges, slot) => {
                const guess = edges.map((_, k) => String(next + k));
                const grows = slot?.busy.glide;
                if (slot)
                    await styles.update(slot.id, { selector: { match: "ids", edges: guess }, set: look(0, grows) });
                // an airport that glides out starts on the airport it joins
                const from = (s) => el.getNode(s.edges[0].source)?.getPosition();
                if (grows) slot.busy.glide = due.map((s) => ({ id: s.node.id, from: from(s), to: s.node.position }));
                await data.addNodes(
                    grows ? due.map((s) => ({ ...s.node, position: from(s) })) : due.map((s) => s.node),
                );
                if (edges.length) await data.addEdges(edges);
                const got = data
                    .edges()
                    .map((e) => e.id)
                    .filter((id) => !known.has(id));
                for (const id of got) known.add(id);
                next = Math.max(
                    next + edges.length,
                    ...got
                        .map(Number)
                        .filter((x) => Number.isFinite(x))
                        .map((x) => x + 1),
                );
                if (slot && got.join() !== guess.join())
                    await styles.update(slot.id, { selector: { match: "ids", edges: got } });
                if (slot) slot.busy.t = performance.now();
                count.left -= due.length;
            };
            // a batch: its draw-in layer on its routes first (unseen), then the airports and routes
            const arrive = (due, ms, grows) => {
                const edges = due.flatMap((s) => s.edges);
                const slot = edges.length ? pool.find((x) => !x.busy) : null;
                if (slot) slot.busy = { t: Infinity, ms, glide: grows };
                writing = writing.then(() => write(due, edges, slot));
            };
            const tick = async () => {
                for (const x of pool) {
                    if (!x.busy || x.busy.t === Infinity) continue;
                    const k = Math.min(1, (performance.now() - x.busy.t) / x.busy.ms);
                    const { glide: g } = x.busy;
                    if (g) {
                        const e = 1 - (1 - Math.min(1, k / 0.7)) ** 3;
                        await el.session.positions.set(
                            g.map(({ id, from: a, to: b }) => ({
                                id,
                                x: a.x + (b.x - a.x) * e,
                                y: a.y + (b.y - a.y) * e,
                                z: a.z + (b.z - a.z) * e,
                            })),
                        );
                    }
                    // the look in eight steps: each new color, width and opacity is a new material the
                    // element keeps, and a style update costs a frame, so only a new step is written
                    const q = Math.round(k * 8) / 8;
                    if (k >= 1) {
                        await styles.update(x.id, { selector: none, set: look(1) });
                        x.busy = null;
                    } else if (q !== x.busy.q) {
                        x.busy.q = q;
                        await styles.update(x.id, { set: look(q, !!g) });
                    }
                }
            };
            const done = (async () => {
                while (count.left > 0 || pool.some((x) => x.busy)) {
                    const due = [];
                    while (i < o.steps.length && o.times[i] <= performance.now() - t0) due.push(i++);
                    if (due.length)
                        arrive(
                            due.map((k) => o.steps[k]),
                            Array.isArray(o.drawMs) ? o.drawMs[due[0]] : o.drawMs,
                            due[0] < o.glide,
                        );
                    const t = performance.now();
                    await tick();
                    await new Promise((r) => setTimeout(r, Math.max(0, o.tickMs - (performance.now() - t))));
                }
                await writing;
                for (const x of pool) await styles.remove(x.id);
                return i;
            })();
            globalThis.__growth = {
                done,
                ahead: (ms) => {
                    const now = performance.now() - t0;
                    const out = [];
                    for (let k = i; k < o.steps.length && o.times[k] <= now + ms; k++)
                        out.push(o.steps[k].node.position);
                    return out;
                },
            };
        },
        { steps, times, drawMs, layers, tickMs, flash, cool, glide, firstEdgeId: steps.firstEdgeId ?? 0 },
    );
}

/**
 * Wait until the growth has added its last step and drawn it.
 * @param h - the hand
 * @returns how many airports it added
 */
export const grown = (h) => onElement(h, () => globalThis.__growth.done);

/**
 * Step times that start `first` ms apart and shrink by `factor` each step, never under `least`:
 * the growth accelerates.
 * @param count - how many steps
 * @param first - the first gap (ms)
 * @param factor - each gap times this (under 1 accelerates)
 * @param least - the shortest gap
 * @param [start] - the first step's time
 * @returns the times
 */
export function accelerating(count, first, factor, least, start = 0) {
    const out = [];
    let t = start;
    let gap = first;
    for (let i = 0; i < count; i++) {
        out.push(Math.round(t));
        t += gap;
        gap = Math.max(least, gap * factor);
    }
    return out;
}

/**
 * The camera follows the growing drawing, in the page, every frame (setCameraState with skipQueue,
 * as shape.js rig does): it keeps the drawing framed at `fill` of the canvas, easing toward the new
 * framing (time constant `tau` ms), so the view widens smoothly as airports arrive. In 2D it frames
 * the nodes' box (never closer than `least` world units across) and turns by `spin` rad/s; in 3D it
 * orbits the middle of the drawing's box at `spin` rad/s about the vertical, `beta` down from it, at the
 * distance that holds 90% of the nodes. Replaces any follow running; `unfollow` stops it.
 * @param h - the hand
 * @param o - options
 * @param [o.fill] - the share of the canvas the drawing fills
 * @param [o.tau] - how slowly the framing eases (ms)
 * @param [o.spin] - the turn (rad/s)
 * @param [o.least] - the least width framed (world units, 2D) or radius (3D)
 * @param [o.beta] - 3D: the camera's angle down from the vertical
 * @param [o.alpha] - 3D: the starting turn (default where the camera is)
 * @param [o.share] - 3D: the share of the nodes inside the framed radius
 * @param [o.tilt] - 3D: how fast the camera's angle down eases toward `beta`, against `tau`
 * @param [o.aheadMs] - also frame the airports the growth adds in the next this many ms
 * @param [o.box] - { top, bottom }: canvas pixels the finished video crops off (the cut's
 *     full-bleed box), so the drawing is framed in what is left; the 3D camera's state then carries
 *     `aim`, the target it really looks at
 * @returns when it is running
 */
export const follow = (h, o = {}) =>
    onElement(
        h,
        (el, opt) => {
            const { fill = 0.7, tau = 900, spin = 0, least = 14, beta = 1.25, share = 0.9, tilt = 0.5 } = opt;
            const { top = 0, bottom = 0 } = opt.box ?? {};
            const shift = (bottom - top) / 2;
            globalThis.__follow?.stop();
            let on = true;
            let last = performance.now();
            const cam = el.getCameraState();
            const s =
                cam.mode === "2d"
                    ? { zoom: cam.zoom, pan: { ...cam.pan }, rotation: cam.rotation ?? 0 }
                    : (() => {
                          const d = {
                              x: cam.position.x - cam.target.x,
                              y: cam.position.y - cam.target.y,
                              z: cam.position.z - cam.target.z,
                          };
                          const r = Math.hypot(d.x, d.y, d.z);
                          return {
                              alpha: opt.alpha ?? Math.atan2(d.z, d.x),
                              beta: Math.acos(d.y / r),
                              radius: r,
                              target: { ...cam.target },
                          };
                      })();
            // the airports drawn and those due soon, so the view widens before they arrive
            const points = () => [
                ...el.getNodes().map((n) => n.getPosition()),
                ...((opt.aheadMs && globalThis.__growth?.ahead?.(opt.aheadMs)) || []),
            ];
            const frame = () => {
                if (!on) return;
                const now = performance.now();
                const dt = Math.min(100, now - last);
                last = now;
                const w = 1 - Math.exp(-dt / tau);
                const ps = points();
                if (ps.length) {
                    if ("zoom" in s) {
                        const xs = ps.map((p) => p.x);
                        const ys = ps.map((p) => p.y);
                        const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
                        const mid = { x: (x0 + x1) / 2, y: (y0 + y1) / 2 };
                        const wx = Math.max(least, x1 - x0);
                        const wy = Math.max(least * 0.5625, y1 - y0);
                        // pixels per world unit now, measured, then the zoom that fits the box
                        const a = el.worldToScreen({ x: 0, y: 0, z: 0 });
                        const b = el.worldToScreen({ x: 1, y: 0, z: 0 });
                        const ppu = Math.hypot(b.x - a.x, b.y - a.y) || 1;
                        const up = Math.sign(a.y - el.worldToScreen({ x: 0, y: 1, z: 0 }).y) || 1;
                        const { width: cw, height: ch } = el.getCanvasSize();
                        const hb = ch - top - bottom;
                        const goal =
                            el.getCameraState().zoom * Math.min((fill * cw) / (wx * ppu), (fill * hb) / (wy * ppu));
                        s.zoom = Math.exp(Math.log(s.zoom) + (Math.log(goal) - Math.log(s.zoom)) * w);
                        // the drawing's middle on the middle of the box, `shift` px above the canvas's
                        const aim = mid.y - (up * shift) / ppu;
                        s.pan.x += (mid.x - s.pan.x) * w;
                        s.pan.y += (aim - s.pan.y) * w;
                        s.rotation += (spin * dt) / 1000;
                        el.setCameraState({ zoom: s.zoom, pan: s.pan, rotation: s.rotation }, { skipQueue: true });
                    } else {
                        // the middle of the drawing's box, so the framing holds its outliers evenly
                        const c = {};
                        for (const k of ["x", "y", "z"]) {
                            const v = ps.map((p) => p[k]);
                            c[k] = (Math.min(...v) + Math.max(...v)) / 2;
                        }
                        const d = ps.map((p) => Math.hypot(p.x - c.x, p.y - c.y, p.z - c.z)).sort((x, y) => x - y);
                        const r = Math.max(least, d[Math.min(d.length - 1, Math.floor(d.length * share))] ?? least);
                        const fov = el.getCameraState().fov ?? 0.8;
                        const { height: ch } = el.getCanvasSize();
                        const goal = r / Math.tan(fov / 2) / (fill * ((ch - top - bottom) / ch));
                        s.radius = Math.exp(Math.log(s.radius) + (Math.log(goal) - Math.log(s.radius)) * w);
                        for (const k of ["x", "y", "z"]) s.target[k] += (c[k] - s.target[k]) * w;
                        s.beta += (beta - s.beta) * Math.min(1, w * tilt);
                        s.alpha += (spin * dt) / 1000;
                        // the middle `shift` px above the canvas's: the camera aims that far below it,
                        // along the screen's up
                        const dn = (shift / ch) * 2 * s.radius * Math.tan(fov / 2);
                        const ca = Math.cos(s.alpha);
                        const sa = Math.sin(s.alpha);
                        const t = {
                            x: s.target.x + dn * ca * Math.cos(s.beta),
                            y: s.target.y - dn * Math.sin(s.beta),
                            z: s.target.z + dn * sa * Math.cos(s.beta),
                        };
                        s.aim = t;
                        el.setCameraState(
                            {
                                target: t,
                                position: {
                                    x: t.x + s.radius * Math.cos(s.alpha) * Math.sin(s.beta),
                                    y: t.y + s.radius * Math.cos(s.beta),
                                    z: t.z + s.radius * Math.sin(s.alpha) * Math.sin(s.beta),
                                },
                            },
                            { skipQueue: true },
                        );
                    }
                }
                globalThis.requestAnimationFrame(frame);
            };
            globalThis.__follow = { stop: () => (on = false), state: s };
            globalThis.requestAnimationFrame(frame);
        },
        o,
    );

/**
 * Stop the camera following the drawing (follow), leaving it where it is.
 * @param h - the hand
 * @returns when stopped
 */
export const unfollow = (h) => onElement(h, () => globalThis.__follow?.stop());

/**
 * A wave of change across the frame: a node layer that covers the nodes still to change (`set`,
 * such as the plain gray) lets them go from the left of the screen to the right over `ms`, by
 * narrowing its selector, then is removed. Nodes added meanwhile are not covered: they arrive
 * changed. Call it with a layer just added over everything, or let it add one (`set`).
 * @param h - the hand
 * @param o - the wave
 * @param [o.id] - an existing node layer over everything to narrow
 * @param [o.set] - or the channels of a new one (added on top, covering every node)
 * @param o.ms - how long the wave takes
 * @param [o.stepMs] - the time between two steps of the wave
 * @param [o.grow] - the other way: the layer (`id`, selecting nothing yet) spreads over the nodes
 *     from the left to the right, and stays
 * @returns when the wave has passed and the layer is gone (or, growing, covers every node)
 */
export const sweep = (h, { id, set, ms, stepMs = 110, grow = false }) =>
    onElement(
        h,
        async (el, o) => {
            const { styles } = el.session;
            const ids = el.getNodes().map((n) => n.id);
            const x = new Map(el.getNodes().map((n) => [n.id, el.worldToScreen(n.getPosition()).x]));
            ids.sort((a, b) => x.get(a) - x.get(b));
            const layer =
                o.id ??
                (
                    await styles.add({
                        name: "Sweep",
                        target: "node",
                        selector: { match: "ids", nodes: ids },
                        set: o.set,
                    })
                ).id;
            const t0 = performance.now();
            for (;;) {
                const k = Math.min(1, (performance.now() - t0) / o.ms);
                const left = o.grow ? ids.slice(0, Math.round(k * ids.length)) : ids.slice(Math.round(k * ids.length));
                if (k >= 1) break;
                const t = performance.now();
                await styles.update(layer, { selector: { match: "ids", nodes: left } });
                // a style update costs the page tens of milliseconds: a step every stepMs, not every frame
                await new Promise((r) => setTimeout(r, Math.max(0, o.stepMs - (performance.now() - t))));
            }
            if (o.grow) await styles.update(layer, { selector: { match: "ids", nodes: ids } });
            else await styles.remove(layer);
        },
        { id, set, ms, stepMs, grow },
    );

/**
 * Run an analysis on the graph (session.run, as the Analyze panel runs it).
 * @param h - the hand
 * @param algorithm - its key ("louvain", "shortest-path")
 * @param [params] - its parameters
 * @param [under] - a layer to keep the layers the run adds beneath (moved there in the same call,
 *     before a frame is drawn), so a mask over them holds
 * @returns for shortest-path, the route's airports in order and its edges; else nothing
 */
export const analyze = (h, algorithm, params = {}, under = null) =>
    onElement(
        h,
        async (el, o) => {
            const { styles } = el.session;
            const had = new Set(styles.list().map((l) => l.id));
            const run = await el.session.run({ op: "algo.run", algorithm: o.algorithm, params: o.params });
            if (o.under) for (const l of styles.list().filter((x) => !had.has(x.id))) await styles.move(l.id, o.under);
            if (o.algorithm !== "shortest-path") return null;
            const nodes = el
                .getNodes()
                .map((n) => n.id)
                .filter((id) => run.node(id)?.onPath)
                .sort((a, b) => run.node(a).order - run.node(b).order);
            const edges = el.session.data
                .edges()
                .filter((e) => run.edge(e.id)?.onPath)
                .map((e) => e.id);
            return { nodes, edges };
        },
        { algorithm, params, under },
    );

/**
 * The lift into 3D: the view switched to 3D with the camera seeing exactly the picture the 2D
 * camera saw (straight on, at the distance that keeps the screen scale; the 2D view must not be
 * turned), then each airport drawn so far is given its depth (session.data.updateNodes, its
 * `position` from plan) and the fixed layout run again, so with slowMotion's transition the drawing
 * rises into depth where it stands. Stop follow first.
 * @param h - the hand
 * @param steps - plan's steps (their nodes carry the 3D positions)
 * @returns the 3D camera it starts from, as orbit angles { alpha, beta, radius, target }
 */
export const lift = (h, steps) =>
    onElement(
        h,
        async (el, at) => {
            const cam = el.getCameraState();
            const a = el.worldToScreen({ x: cam.pan.x, y: cam.pan.y, z: 0 });
            const b = el.worldToScreen({ x: cam.pan.x, y: cam.pan.y + 1, z: 0 });
            const ppu = Math.hypot(b.x - a.x, b.y - a.y);
            await el.setViewMode("3d");
            await new Promise((done) => {
                const look = () =>
                    el.getCameraState().mode === "3d" ? done() : globalThis.requestAnimationFrame(look);
                look();
            });
            const { height } = el.getCanvasSize();
            const fov = el.getCameraState().fov ?? 0.8;
            const radius = height / ppu / 2 / Math.tan(fov / 2);
            const target = { x: cam.pan.x, y: cam.pan.y, z: 0 };
            await el.setCameraState(
                { target, position: { x: target.x, y: target.y, z: -radius } },
                { skipQueue: true },
            );
            const ids = el.getNodes().map((n) => n.id);
            await el.session.data.updateNodes(ids.map((id) => ({ id, values: { position: at[id] } })));
            await el.setLayout("fixed", { scale: 1, spacing: 0 });
            return { alpha: -Math.PI / 2, beta: Math.PI / 2, radius, target };
        },
        Object.fromEntries(steps.map((s) => [s.node.id, s.node.position])),
    );
