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
export const AIRPORTS = 140;
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
 * @param flat - how many airports join while the drawing is flat (their flat places: flatPlaces)
 * @returns the steps: [{ node: <record>, edges: [{ id, source, target }] }], SEED's first; and
 *     `spot` and `europe`, where the globe puts the path's end and EUROPE; each node carries
 *     `position`, its place in the 3D drawing (SPAN across, centered on the origin); `flat`, the
 *     first `flat` airports' places in the flat drawing, by id
 */
export async function plan(h, preload, flat) {
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
    // where every airport will be drawn: the force layout of the network the take grows (its
    // airports and the routes they bring), in 3D, seeded and settled once here, then the fixed
    // layout puts each airport there as it joins -- so no addition reflows the drawing, the 2D view
    // draws the same places flat, and the lift into 3D is the same drawing gaining its depth. Its
    // Louvain communities (found here as the take's ignition will find them, on the same graph) are
    // drawn apart, each a lobe of its own with dark space between, so the colors read as groups
    const drawn = await onElement(
        h,
        async (el, [records, routes]) => {
            const { data } = el.session;
            await data.clear();
            await data.addNodes(records);
            await data.addEdges(routes);
            // under a name of its own and painting nothing: a run under the id the take's ignition
            // derives would count as that run's first completion, and the take's run, a re-run,
            // would then paint nothing (defects.md 17)
            const run = await el.session.run({
                op: "algo.run",
                algorithm: "louvain",
                params: {},
                as: "plan_lobes",
                style: false,
            });
            const group = Object.fromEntries(records.map((r) => [r.id, run.node(r.id)?.group ?? 0]));
            await el.setLayout("ngraph", { dim: 3, seed: 7 });
            await new Promise((done) => {
                const look = () =>
                    el.session.layout.motion === "settled" ? done() : globalThis.requestAnimationFrame(look);
                globalThis.requestAnimationFrame(look);
            });
            return { ps: el.getNodes().map((n) => [n.id, n.getPosition(), group[n.id]]) };
        },
        [steps.map((s) => s.node), steps.flatMap((s) => s.edges.map(({ source, target }) => ({ source, target })))],
    );
    const at = lobes(drawn.ps, SPAN, 1.8, 0.5);
    // turned so the drawing's widest spread lies across the screen and its thinnest is the depth:
    // the flat view (z 0) is then the least tangled one, and the lift adds the rest
    const turn = principalAxes(Object.values(at));
    for (const n of nodes)
        if (at[n.id]) {
            const p = at[n.id];
            const [x, y, z] = turn.map((a) => a.x * p.x + a.y * p.y + a.z * p.z);
            n.position = { x, y, z };
        }
    steps.flat = flatPlaces(steps, flat);
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
        { ...byId.get(SEED), position: steps.flat[SEED] },
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
 * A drawing's communities drawn apart: each group's middle pushed out from the drawing's by
 * `apart`, its airports drawn in toward it by `tight`, then the whole centered on the origin and
 * scaled to `span` across.
 * @param ps - [id, position, group]
 * @param span - the width it is scaled to
 * @param [apart] - how far each group's middle moves out, against where it was
 * @param [tight] - how close each airport comes to its group's middle, against where it was
 * @returns each airport's new position, by id
 */
export function lobes(ps, span, apart = 1.45, tight = 0.6) {
    const mean = (qs) =>
        mul(
            qs.reduce((s, q) => add(s, q), { x: 0, y: 0, z: 0 }),
            1 / qs.length,
        );
    const c = mean(ps.map(([, p]) => p));
    const mids = new Map();
    for (const g of new Set(ps.map(([, , x]) => x)))
        mids.set(g, mean(ps.filter(([, , x]) => x === g).map(([, p]) => p)));
    const moved = ps.map(([id, p, g]) => {
        const m = mids.get(g);
        return [id, add(add(c, mul(sub(m, c), apart)), mul(sub(p, m), tight))];
    });
    const c2 = mean(moved.map(([, p]) => p));
    const r = Math.max(...moved.map(([, p]) => len(sub(p, c2))));
    return Object.fromEntries(moved.map(([id, p]) => [id, mul(sub(p, c2), span / 2 / r)]));
}

/**
 * Where the first `n` airports are drawn while the drawing is flat: a stress layout of the network
 * they make (each route about one length, airports kept apart by how many routes lie between
 * them), started from the 3D drawing seen flat, then moved onto that view with its widest spread
 * across the screen (fitOnto) and scaled to spread as widely: so each airport lands beside the one
 * it joins, a hub's airports spread round it and few routes cross. (Holding the airports toward
 * their 3D places, to shorten the lift's moves, brings the crossings back.)
 * @param steps - plan's steps (their nodes carry the 3D positions)
 * @param n - how many airports
 * @param [iterations] - stress majorization rounds
 * @returns each airport's flat position { x, y, z: 0 }, by id
 */
export function flatPlaces(steps, n, iterations = 400) {
    const ids = steps.slice(0, n).map((s) => s.node.id);
    const ix = new Map(ids.map((id, i) => [id, i]));
    const adj = ids.map(() => []);
    for (const s of steps.slice(0, n))
        for (const { source, target } of s.edges)
            if (ix.has(source) && ix.has(target)) {
                adj[ix.get(source)].push(ix.get(target));
                adj[ix.get(target)].push(ix.get(source));
            }
    const hops = ids.map((_, a) => hopsFrom(adj, a));
    const goal = steps.slice(0, n).map((s) => s.node.position);
    // started at the flat view, scaled to route lengths
    const scale0 = Math.max(...goal.map((p) => Math.hypot(p.x, p.y))) / Math.max(1, ...hops[0]);
    const xs = goal.map((p) => ({ x: p.x / scale0, y: p.y / scale0 }));
    for (let k = 0; k < iterations; k++) stressRound(xs, hops);
    const at = fitOnto(xs, goal);
    return Object.fromEntries(ids.map((id, i) => [id, at[i]]));
}

/**
 * One round of stress majorization: each point moved to where its distances to the others best
 * match the routes between them (in place).
 * @param xs - the points, { x, y }
 * @param hops - routes between each pair
 */
function stressRound(xs, hops) {
    const n = xs.length;
    for (let i = 0; i < n; i++) {
        let [sx, sy, sw] = [0, 0, 0];
        for (let j = 0; j < n; j++) {
            if (i === j) continue;
            const d = hops[i][j];
            const w = 1 / (d * d);
            const [dx, dy] = [xs[i].x - xs[j].x, xs[i].y - xs[j].y];
            const l = Math.hypot(dx, dy) || 1e-6;
            sx += w * (xs[j].x + (d * dx) / l);
            sy += w * (xs[j].y + (d * dy) / l);
            sw += w;
        }
        xs[i] = { x: sx / sw, y: sy / sw };
    }
}

/**
 * How many routes lie between one airport and each other (breadth first); `adj.length` where
 * none connects them.
 * @param adj - each airport's neighbors, by index
 * @param a - the airport's index
 * @returns the counts, by index
 */
function hopsFrom(adj, a) {
    const d = adj.map(() => Infinity);
    d[a] = 0;
    const queue = [a];
    for (let q = 0; q < queue.length; q++)
        for (const b of adj[queue[q]])
            if (d[b] === Infinity) {
                d[b] = d[queue[q]] + 1;
                queue.push(b);
            }
    return d.map((x) => (Number.isFinite(x) ? x : adj.length));
}

/**
 * Flat points laid onto others: centered, turned so their widest spread lies across the screen,
 * either way round and mirrored or not, whichever lies closest (least squares), and scaled to
 * spread as widely.
 * @param xs - the points to move ({ x, y })
 * @param goal - where they should be (x and y read)
 * @returns the moved points, { x, y, z: 0 }
 */
function fitOnto(xs, goal) {
    const mean = (ps) => ps.reduce((m, p) => ({ x: m.x + p.x / ps.length, y: m.y + p.y / ps.length }), { x: 0, y: 0 });
    const [ca, cb] = [mean(xs), mean(goal)];
    const a = xs.map((p) => ({ x: p.x - ca.x, y: p.y - ca.y }));
    const b = goal.map((p) => ({ x: p.x - cb.x, y: p.y - cb.y }));
    const fit = (m, half) => {
        const am = a.map((p) => ({ x: p.x, y: m * p.y }));
        // its widest spread across the screen (the frame is wide), either way round
        const cxx = am.reduce((s, p) => s + p.x * p.x, 0);
        const cyy = am.reduce((s, p) => s + p.y * p.y, 0);
        const cxy = am.reduce((s, p) => s + p.x * p.y, 0);
        const th = -Math.atan2(2 * cxy, cxx - cyy) / 2 + half * Math.PI;
        // as spread out as the flat view (a least-squares scale shrinks a drawing that fits badly)
        const k = Math.sqrt(
            b.reduce((s, p) => s + p.x * p.x + p.y * p.y, 0) / am.reduce((s, p) => s + p.x * p.x + p.y * p.y, 0),
        );
        const out = am.map((p) => ({
            x: cb.x + k * (p.x * Math.cos(th) - p.y * Math.sin(th)),
            y: cb.y + k * (p.x * Math.sin(th) + p.y * Math.cos(th)),
            z: 0,
        }));
        return { out, err: out.reduce((s, p, i) => s + (p.x - goal[i].x) ** 2 + (p.y - goal[i].y) ** 2, 0) };
    };
    const fits = [fit(1, 0), fit(1, 1), fit(-1, 0), fit(-1, 1)];
    return fits.reduce((x, y) => (y.err < x.err ? y : x)).out;
}

/**
 * A point rounded to a thousandth (poses go to the page as JSON).
 * @param q - the point
 * @returns it rounded
 */
const r3 = (q) => ({ x: +q.x.toFixed(3), y: +q.y.toFixed(3), z: +q.z.toFixed(3) });

/**
 * Smoothstep, clamped to [0, 1]: eases in and out.
 * @param k - the share done
 * @returns the eased share
 */
const smooth = (k) => {
    const x = Math.min(1, Math.max(0, k));
    return x * x * (3 - 2 * x);
};

/**
 * A centripetal Catmull-Rom curve through points (no loops or cusps at uneven spacing), sampled
 * densely, looked up by arc length.
 * @param ctrl - the points it passes through, in order
 * @param [per] - samples per span
 * @returns its `length`, `knots` (the arc length at each point), and `at(s)`, the point s units
 *     along it (clamped to its ends)
 */
function curve(ctrl, per = 48) {
    const pts = [];
    for (let i = 0; i + 1 < ctrl.length; i++) {
        const [p1, p2] = [ctrl[i], ctrl[i + 1]];
        const p0 = ctrl[i - 1] ?? sub(mul(p1, 2), p2);
        const p3 = ctrl[i + 2] ?? sub(mul(p2, 2), p1);
        const knot = (a, b) => Math.max(1e-6, Math.sqrt(len(sub(b, a))));
        const t1 = knot(p0, p1);
        const t2 = t1 + knot(p1, p2);
        const t3 = t2 + knot(p2, p3);
        for (let k = 0; k < per; k++) {
            const t = t1 + ((t2 - t1) * k) / per;
            const l = (a, b, ta, tb) => add(mul(a, (tb - t) / (tb - ta)), mul(b, (t - ta) / (tb - ta)));
            const [a1, a2, a3] = [l(p0, p1, 0, t1), l(p1, p2, t1, t2), l(p2, p3, t2, t3)];
            pts.push(l(l(a1, a2, 0, t2), l(a2, a3, t1, t3), t1, t2));
        }
    }
    pts.push(ctrl.at(-1));
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + len(sub(pts[i], pts[i - 1])));
    const length = cum.at(-1);
    const at = (s) => {
        const x = Math.min(length, Math.max(0, s));
        let [lo, hi] = [0, cum.length - 1];
        while (hi - lo > 1) {
            const m = (lo + hi) >> 1;
            if (cum[m] <= x) lo = m;
            else hi = m;
        }
        const f = (x - cum[lo]) / (cum[hi] - cum[lo] || 1);
        return add(pts[lo], mul(sub(pts[hi], pts[lo]), f));
    };
    return { length, knots: ctrl.map((_, i) => cum[i * per]), at };
}

/**
 * A running Gaussian mean over a list (vectors or numbers), `w` samples wide (sigma), the window
 * cut at the list's ends.
 * @param xs - the list
 * @param w - sigma, in samples
 * @param [vec] - the items are points
 * @returns the smoothed list
 */
function gauss(xs, w, vec = true) {
    const k = Math.ceil(3 * w);
    const wt = Array.from({ length: 2 * k + 1 }, (_, j) => Math.exp(-(((j - k) / w) ** 2) / 2));
    return xs.map((_, i) => {
        let sum = vec ? { x: 0, y: 0, z: 0 } : 0;
        let n = 0;
        for (let j = Math.max(0, i - k); j <= Math.min(xs.length - 1, i + k); j++) {
            const a = wt[j - i + k];
            sum = vec ? add(sum, mul(xs[j], a)) : sum + xs[j] * a;
            n += a;
        }
        return vec ? mul(sum, 1 / n) : sum / n;
    });
}

/**
 * A value given once or per airport: the m-th of a list (its last past its end), or the value.
 * @param x - a value or a list
 * @param m - the airport's index
 * @returns its value
 */
const each = (x, m) => (Array.isArray(x) ? x[Math.min(m, x.length - 1)] : x);

/**
 * `cl` beside a point of a route going `T`, at angle `a` round it from above.
 * @param p - the point
 * @param T - the way the route goes (unit)
 * @param a - the angle round it (0 above, PI/2 to the right)
 * @param cl - how far
 * @returns the point beside it
 */
function beside(p, T, a, cl) {
    const Y = { x: 0, y: 1, z: 0 };
    let up = sub(Y, mul(T, dot(Y, T)));
    if (len(up) < 0.2) up = sub({ x: 1, y: 0, z: 0 }, mul(T, T.x));
    up = unit(up);
    return add(p, mul(add(mul(up, Math.cos(a)), mul(unit(cross(T, up)), Math.sin(a))), cl));
}

/**
 * The flight path's points before the last airport (flightPoses): from `from` round over the top
 * to the `out` side (when `out` is given), the run-in's start `lead` out from the first airport,
 * and a point beside each airport but the last.
 * @param pts - the route's airports
 * @param o - as flightPoses'
 * @param o.from - where the camera starts
 * @param o.out - the side the run-in comes from
 * @param o.lead - how far out the run-in starts
 * @param o.sides - the side each airport is passed on
 * @param o.clear - how far from each airport
 * @returns `cam`, the points, and `k0`, the index of the run-in's start among them
 */
function passPoints(pts, { from, out, lead, sides, clear }) {
    const toFrom = from ? unit(sub(from, pts[0])) : null;
    const back = out ? unit(out) : (toFrom ?? unit(sub(pts[0], pts[1])));
    const cam = [];
    if (out && from) {
        const r = (len(sub(from, pts[0])) + lead) / 2;
        cam.push(from, add(pts[0], mul(unit(add(add(toFrom, back), { x: 0, y: 0.8, z: 0 })), r)));
    }
    const k0 = cam.length;
    const line = [add(pts[0], mul(back, lead)), ...pts];
    for (let i = 0; i + 1 < line.length; i++) {
        const m = Math.max(0, i - 1);
        const T = unit(sub(line[i + 1], line[Math.max(0, i - 1)]));
        cam.push(beside(line[i], T, each(sides, m), each(clear, m)));
    }
    return { cam, k0 };
}

/**
 * The side the flight's close-up sees the last airport from: as the last leg comes in (from behind
 * and above), turned toward `u` until it is within `cone` of it (so the close-up on the globe, seen
 * from the same side, looks down on the earth and never from under it).
 * @param pts - the route's airports
 * @param u - the close-up's normal (unit)
 * @param close - the close-up's distance
 * @param cl - how far beside the last leg the camera comes in
 * @param cone - how far (rad) the side may lean from `u`
 * @returns `dir`, the side, and `side`, its part across `u`
 */
function closeSide(pts, u, close, cl, cone) {
    const Y = { x: 0, y: 1, z: 0 };
    const last = pts.at(-1);
    const T1 = unit(sub(last, pts.at(-2)));
    const natural = unit(sub(beside(sub(last, mul(T1, 3 * close)), T1, Math.PI / 3, cl), last));
    const lean = dot(natural, u);
    let side = unit(sub(natural, mul(u, lean)));
    if (!Number.isFinite(side.x)) side = unit(cross(u, Math.abs(u.y) < 0.9 ? Y : { x: 1, y: 0, z: 0 }));
    const dir = lean >= Math.cos(cone) ? natural : unit(add(mul(u, Math.cos(cone)), mul(side, Math.sin(cone))));
    return { dir, side };
}

/**
 * What the flight's camera looks at, at arc length s along its path: the airport it is coming to,
 * eased on to the next one from `before` that airport is passed to `after` (never starting before
 * the last hand-off ends).
 * @param pts - the route's airports
 * @param passAt - the arc length where the path passes each airport but the last
 * @param handoff - [before, after] per airport
 * @returns s -> the point looked at
 */
function lookAlong(pts, passAt, handoff) {
    return (s) => {
        let a0 = -Infinity;
        for (let m = 0; m + 1 < pts.length; m++) {
            const [before, after] = handoff[Math.min(m, handoff.length - 1)];
            const a = Math.max(a0, passAt[m] - before);
            const b = Math.max(a + 1, passAt[m] + after);
            if (s < a) return pts[m];
            if (s < b) return add(pts[m], mul(sub(pts[m + 1], pts[m]), smooth((s - a) / (b - a))));
            a0 = b;
        }
        return pts.at(-1);
    };
}

/**
 * How much slower than its top speed the flight goes at arc length s (flightPoses' `dip`, `dipWidth`,
 * `pace`, `paceExp`).
 * @param pts - the route's airports
 * @param c - the flight's curve
 * @param passAt - the arc length where it passes each airport but the last
 * @param o - flightPoses' options
 * @param o.dip - how much slower at most (0-1)
 * @param o.dipWidth - over how much of the path round each airport it slows (without `pace`)
 * @param o.pace - the distance from the nearest route airport at which it goes at full speed
 * @param o.paceExp - the power of that distance it goes at
 * @returns s -> the share of the top speed
 */
function slowing(pts, c, passAt, { dip, dipWidth, pace, paceExp }) {
    if (!pace) return (s) => 1 - dip * Math.max(0, ...passAt.map((k) => Math.exp(-(((s - k) / dipWidth) ** 2) / 2)));
    return (s) => {
        const p = c.at(s);
        const d = Math.min(...pts.map((q) => len(sub(p, q))));
        return Math.min(1, Math.max(1 - dip, (d / pace) ** paceExp));
    };
}

/**
 * The flight along a route, as camera poses (playPoses): an airplane's view. The camera leaves
 * `from`, swings round to `out` of the first airport (its open side, so no other airport stands
 * between them) and runs in along a smooth curve that passes beside each airport of the route
 * (never through one: `clear` from it, on its `sides`), looking at the airport it is coming to --
 * so each in turn sits up front in the middle of the frame, growing as the camera nears it --
 * until `handoff[0]` before passing it, when the look eases on to the next over `handoff[0] +
 * handoff[1]` of the path (the airport slides out past the side of the frame as the next comes
 * up), banking a little into the turns; it gathers speed, slows at each airport, swings round to
 * above the last airport and comes in along `normal` -- the way the close-up on the globe sees it,
 * so the two close-ups match -- slowing into an extreme close-up (`close` from it), creeping closer
 * through `hold`, aimed `aim` below it (so it sits that much above the canvas's middle, in the
 * middle of a crop).
 * @param pts - the route's airports, in order
 * @param o - the flight
 * @param o.ms - how long the flight takes, to the close-up (take ms)
 * @param o.normal - the direction the close-up looks from (from the last airport to the camera)
 * @param [o.from] - where the camera is when the flight starts (default behind the first airport)
 * @param [o.out] - the side the run-in comes to the first airport from (default toward `from`)
 * @param [o.cone] - how far (rad) the close-up's side may lean from `normal`
 * @param [o.lead] - how far before the first airport the run-in starts
 * @param [o.clear] - how far from each airport the camera passes: a number, or one per airport
 * @param [o.sides] - which side of each airport it passes, an angle round the way it is going
 *     (0 above, PI/2 to the right): a number, or one per airport
 * @param [o.handoff] - [before, after]: along the path, how long before passing an airport the
 *     look starts to move on to the next, and how long after it gets there; or one such pair per
 *     airport
 * @param [o.close] - the close-up's distance from the last airport
 * @param [o.hold] - the close-up held after it (take ms), creeping in by `creep` of `close`
 * @param [o.creep] - how much closer the hold creeps
 * @param [o.aim] - how far the close-up aims below the airport, in half-heights of the view
 * @param [o.v0] - the starting speed, against the top speed
 * @param [o.land] - how far into the flight (0-1 of its time) it stops gathering speed and starts
 *     slowing into the close-up
 * @param [o.dip] - how much the camera slows at each airport (0-1)
 * @param [o.dipWidth] - over how much of the path round each airport it slows
 * @param [o.pace] - instead of slowing round each airport by `dipWidth`: its speed is scaled by
 *     (distance to the nearest route airport / pace) ** paceExp, never under 1 - dip, so an
 *     airport grows on screen at an even rate (paceExp 1) or lingers once it is large (above 1),
 *     and the cruise between airports is quick
 * @param [o.paceExp] - see `pace`
 * @param [o.bank] - roll per rad/s of turn
 * @param [o.maxRoll] - the most roll (radians)
 * @param [o.sigma] - how long the look is smoothed over (s of take)
 * @param [o.maxTurn] - the fastest the look turns (rad a second of take)
 * @param [o.hz] - poses a second
 * @returns `poses`, the camera's position `p`, its target `t` and its roll `r`, `hz` a second;
 *     `vEnd`, the creep's speed (units a second of take); and `dir`, the side the close-up is
 *     seen from (from the last airport toward the camera)
 */
export function flightPoses(pts, o) {
    const { from = null, normal, cone = 0.6, lead = 32, clear = 5.5, sides = Math.PI / 3, handoff = [2, 2] } = o;
    const { close = 4.6, hold = 0, creep = 0.1, aim = 0, dipWidth = 8, pace = 0, paceExp = 1 } = o;
    const { v0 = 0.3, dip = 0.5, bank = 0.5, maxRoll = 0.17, sigma = 0.7, maxTurn = 0.4, hz = 60, land = 0.6 } = o;
    const last = pts.at(-1);
    const u = unit(normal);
    const n = pts.length;
    const Y = { x: 0, y: 1, z: 0 };
    const { cam, k0 } = passPoints(pts, { from, out: o.out, lead, sides, clear });
    const { dir, side } = closeSide(pts, u, close, each(clear, n - 1), cone);
    // the approach: round to it, then in along it
    let swing = add(dir, unit(sub(cam.at(-1), last)));
    if (len(swing) < 0.3) swing = side;
    cam.push(add(last, mul(unit(swing), close * 5)), add(last, mul(dir, close * 2.2)), add(last, mul(dir, close)));
    const c = curve(cam);
    // where along the path the camera passes each airport but the last
    const passAt = pts.slice(0, -1).map((_, m) => c.knots[k0 + 1 + m]);
    const coming = lookAlong(pts, passAt, Array.isArray(handoff[0]) ? handoff : pts.map(() => handoff));
    // the speed: from v0 of the top speed, rising to the top `land` of the way, then slowing to
    // the creep; slower near each airport (dip, or pace)
    const sEnd = c.length;
    const T = o.ms / 1000;
    const H = hold / 1000;
    const vEnd = H > 0 ? (creep * close) / H : 0;
    const dt = 1 / hz;
    const near = slowing(pts, c, passAt, { dip, dipWidth, pace, paceExp });
    const speed = (vmax, x) => {
        const rise = smooth(x / land);
        const fall = smooth((x - land) / (1 - land));
        return (vmax * v0 + vmax * (1 - v0) * rise) * (1 - fall) + vEnd * fall;
    };
    const steps = Math.round(T * hz);
    const travel = (vmax, out) => {
        let s = 0;
        for (let k = 0; k <= steps; k++) {
            out?.push(s);
            s += speed(vmax, (k * dt) / T) * near(s) * dt;
        }
        return s;
    };
    let [lo, hi] = [0.01, 1000];
    for (let k = 0; k < 50; k++) {
        const m = (lo + hi) / 2;
        if (travel(m) < sEnd) lo = m;
        else hi = m;
    }
    const arc = [];
    travel(lo, arc);
    const ps = arc.map((s) => c.at(s));
    const raw = arc.map((s) => coming(s));
    for (let k = 1; k <= Math.round(H * hz); k++) {
        ps.push(add(last, mul(dir, close - vEnd * k * dt)));
        raw.push(last);
    }
    // the look: toward the smoothed airport ahead, turning at most `maxTurn` a second (it eases into
    // a turn rather than whipping round; the close-up's look is reached in the slow approach)
    // over the approach the look comes round to the last airport
    const settle = (i, far, over) => (i < arc.length ? smooth((arc[i] - (sEnd - far * close)) / (over * close)) : 1);
    const ts = gauss(raw, sigma * hz).map((q, i) => add(mul(q, 1 - settle(i, 10, 8)), mul(last, settle(i, 10, 8))));
    const cap = maxTurn / hz;
    const fwd = [];
    for (const [i, p] of ps.entries()) {
        const want = unit(sub(ts[i], p));
        const was = fwd[i - 1] ?? want;
        const a = Math.acos(Math.min(1, Math.max(-1, dot(was, want))));
        // turned toward the wanted look by at most cap (spherical interpolation)
        // a little quicker in the slow approach, so the look is settled before the close-up holds
        const c = cap * (1 + 0.5 * settle(i, 4, 3));
        const f = a <= c ? want : unit(add(mul(was, Math.sin(a - c)), mul(want, Math.sin(c))));
        fwd.push(f);
        ts[i] = add(p, mul(f, len(sub(ts[i], p))));
    }
    // the close-up aimed `aim` below the airport (along the screen's up, as revealPoses' `aim`),
    // eased in over the approach
    const below = unit(sub(Y, mul(dir, dir.y)));
    for (const [i, p] of ps.entries())
        ts[i] = sub(ts[i], mul(below, aim * len(sub(p, last)) * Math.tan(0.4) * settle(i, 6, 5)));
    // bank into the turn: roll from how fast the look swings sideways, smoothed, none at the end
    const turn = fwd.map((f, i) => {
        const [a, b] = [fwd[Math.max(0, i - 1)], fwd[Math.min(fwd.length - 1, i + 1)]];
        return (dot(sub(b, a), unit(cross(f, Y))) * hz) / 2;
    });
    const roll = gauss(turn, sigma * hz, false).map((w, i) => {
        const fade = i < arc.length ? smooth((sEnd - arc[i]) / (close * 6)) : 0;
        return Math.max(-maxRoll, Math.min(maxRoll, -bank * w)) * fade;
    });
    return {
        poses: ps.map((p, i) => ({ p: r3(p), t: r3(ts[i]), r: +roll[i].toFixed(4) })),
        hz,
        vEnd,
        dir,
    };
}

/**
 * The other airports to hide from the flight's camera: those it passes within `clear` of (one
 * passing through the lens would flash across the frame), and those standing in front of what it
 * looks at, nearer than `ahead` (so the route's airport it comes to is the largest thing in the
 * middle of the frame, never behind a crowd of others).
 * @param poses - flightPoses' poses
 * @param others - [id, position] of the airports not on the route
 * @param clear - the least distance
 * @param [ahead] - how near in front of the camera an airport hides, if it lies between the camera
 *     and its target and within a third of the view's height of its middle
 * @returns their ids
 */
export const nearLens = (poses, others, clear, ahead = 0) =>
    others
        .filter(([, q]) =>
            poses.some(({ p, t }) => {
                const v = sub(q, p);
                if (len(v) < clear) return true;
                const F = sub(t, p);
                const z = dot(v, unit(F));
                return z > 0 && z < ahead && z < len(F) && len(sub(v, mul(unit(F), z))) < 0.3 * z;
            }),
        )
        .map(([id]) => id);

/**
 * The reveal, as camera poses (playPoses): an extreme close-up on a point of the globe, straight
 * down on it (as the flight's close-up), still creeping in at `creepV`; then one long pull back,
 * eased in briefly and out long (a sine of a power of the time, in the log of the distance, so it
 * is clearly moving within a few percent of its length), along the line from the globe's middle
 * (the point stays in the middle of the frame while the camera is near), the creep fading into it,
 * turning as it goes toward the point halfway to `toward`, to `far` globe radii out, the globe
 * moved in the frame by `drop` (down, or up below 0: to sit where a crop or a title wants it); then on,
 * turning about the globe.
 * @param spot - the point (centered on the globe's middle)
 * @param toward - where the camera turns to face, halfway
 * @param o - the move
 * @param o.close - the distance at the first pose
 * @param o.pull - how long the pull back takes (take ms)
 * @param [o.from] - the side the close-up is seen from (default straight down)
 * @param [o.creepV] - the close-up's creep in (units a second of take)
 * @param [o.hold] - how long the close-up only creeps first (take ms)
 * @param [o.turn] - how long it turns on after (take ms)
 * @param [o.far] - how far out it ends, in globe radii
 * @param [o.spin] - the turn after, rad/s of take
 * @param [o.drop] - how far the globe sinks in the frame by the end, in half-heights of it (below 0, it rises)
 * @param [o.aim] - how far the camera aims below its target throughout, in half-heights of the
 *     view (so the point, then the globe, sits that much above the canvas's middle: in the middle of
 *     a crop)
 * @param [o.hz] - poses a second
 * @returns `poses` and `hz`, as flightPoses
 */
export function revealPoses(spot, toward, o) {
    const { close, pull, creepV = 0, hold = 0, turn = 0, far = 4.6, spin = 0.02, drop = 0, aim = 0, hz = 60 } = o;
    const r = len(spot);
    const u = unit(o.from ?? spot);
    const m = unit(add(unit(spot), unit(toward)));
    const [a0, b0] = [Math.atan2(u.z, u.x), Math.acos(u.y)];
    let a1 = Math.atan2(m.z, m.x);
    a1 += 2 * Math.PI * Math.round((a0 - a1) / (2 * Math.PI));
    const b1 = Math.acos(m.y);
    const R = r * far;
    // smootherstep: a longer, softer start and end than smoothstep
    const soft = (k) => {
        const x = Math.min(1, Math.max(0, k));
        return x * x * x * (x * (6 * x - 15) + 10);
    };
    const ease = (k) => (1 - Math.cos(Math.PI * Math.min(1, Math.max(0, k)) ** 0.5)) / 2;
    const poses = [];
    let ramp = 0;
    let crept = 0;
    const dt = 1 / hz;
    for (let t = 0; t <= (hold + pull + turn) / 1000 + 1e-9; t += dt) {
        const k = (t - hold / 1000) / (pull / 1000);
        const radius = (close - crept) * (R / close) ** ease(k);
        crept += creepV * (1 - smooth(k / 0.08)) * dt;
        // the target slides to the globe's middle with the distance, so the camera only ever recedes
        const target = mul(spot, 1 - Math.max(0, (radius - close) / (R - close)));
        const q = soft((k - 0.2) / 0.8);
        ramp += smooth((k - 0.5) / 0.5) * dt;
        const a = a0 + (a1 - a0) * q + spin * ramp;
        const b = b0 + (b1 - b0) * q;
        const dir = { x: Math.cos(a) * Math.sin(b), y: Math.cos(b), z: Math.sin(a) * Math.sin(b) };
        const up = unit(sub({ x: 0, y: 1, z: 0 }, mul(dir, dir.y)));
        const look = add(target, mul(up, (drop * soft((k - 0.3) / 0.7) - aim) * radius * Math.tan(0.4)));
        poses.push({ p: r3(add(target, mul(dir, radius))), t: r3(look), r: 0 });
    }
    return { poses, hz };
}

/**
 * Fly the camera through poses (flightPoses, revealPoses), in the page, one a frame, interpolated
 * by the clock (setCameraState with a pivot rotation, so the camera can roll). With `blendMs`, it
 * takes over from the follow rig: the rig's orbit runs on, faded into the poses over that long, so
 * the camera never stops. Resolves when the last pose is reached.
 * @param h - the hand
 * @param path - the poses
 * @param path.poses - [{ p, t, r }]: position, target, roll
 * @param path.hz - poses a second
 * @param [o] - options
 * @param [o.blendMs] - fade in from the follow rig's orbit over this long
 * @param [o.marks] - [[ms, name]]: marks logged when the flight reaches those times
 */
export async function playPoses(h, { poses, hz }, { blendMs = 0, marks = [] } = {}) {
    const times = await onElement(
        h,
        (el, o) =>
            new Promise((done, fail) => {
                const f = globalThis.__follow;
                let orbit = null;
                if (o.blendMs && f) {
                    f.stop();
                    orbit = { ...f.state, target: { ...(f.state.aim ?? f.state.target) } };
                }
                const lerp = (a, b, k) => ({
                    x: a.x + (b.x - a.x) * k,
                    y: a.y + (b.y - a.y) * k,
                    z: a.z + (b.z - a.z) * k,
                });
                const out = [];
                let next = 0;
                const t0 = performance.now();
                const frame = () => {
                    const ms = performance.now() - t0;
                    while (next < o.marks.length && o.marks[next][0] <= ms)
                        out.push({ name: o.marks[next++][1], t: Date.now() });
                    const x = Math.min(o.poses.length - 1, (ms * o.hz) / 1000);
                    const i = Math.floor(x);
                    const [a, b] = [o.poses[i], o.poses[Math.min(i + 1, o.poses.length - 1)]];
                    let p = lerp(a.p, b.p, x - i);
                    let t = lerp(a.t, b.t, x - i);
                    let roll = a.r + (b.r - a.r) * (x - i);
                    if (orbit && ms < o.blendMs) {
                        const k = Math.min(1, ms / o.blendMs);
                        const w = k * k * (3 - 2 * k);
                        const al = orbit.alpha + ((orbit.spin ?? 0) * ms) / 1000;
                        const op = {
                            x: orbit.target.x + orbit.radius * Math.cos(al) * Math.sin(orbit.beta),
                            y: orbit.target.y + orbit.radius * Math.cos(orbit.beta),
                            z: orbit.target.z + orbit.radius * Math.sin(al) * Math.sin(orbit.beta),
                        };
                        p = lerp(op, p, w);
                        t = lerp(orbit.target, t, w);
                        roll *= w;
                    }
                    const d = { x: p.x - t.x, y: p.y - t.y, z: p.z - t.z };
                    const dist = Math.hypot(d.x, d.y, d.z);
                    el.setCameraState(
                        {
                            target: t,
                            cameraDistance: dist,
                            pivotRotation: { x: Math.asin(d.y / dist), y: Math.atan2(d.x, d.z) + Math.PI, z: roll },
                        },
                        { skipQueue: true },
                    ).catch(fail);
                    if (x >= o.poses.length - 1) return done(out);
                    globalThis.requestAnimationFrame(frame);
                };
                globalThis.requestAnimationFrame(frame);
            }),
        { poses, hz, blendMs, marks },
    );
    for (const { name, t } of times) h.events.push({ t, type: "mark", name });
}

/**
 * The globe: the map layout on the airports' latitude and longitude, the whole world, drawn small
 * (radius 25 scene units) so the force drawing (about 50 across) lies around it and falls onto it,
 * never seen through it.
 */
export const GLOBE = { latitude: "latitude", longitude: "longitude", mapDimension: "3d", extent: "world", size: 25 };

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
 * @param [o.cool] - the color it cools to (the drawing's routes); `globalThis.__growth.cool(c)`
 *     changes it while the growth runs
 * @param [o.width] - the width a route cools to (it arrives 2 wider)
 * @param [o.glide] - how many of the first steps' airports glide out from the airport they join,
 *     so their route grows with them (session.positions.set, a step every tick)
 */
export async function startGrowth(
    h,
    steps,
    times,
    { drawMs = 700, layers = 2, tickMs = 70, flash = "#e8f4ff", cool = "#4a505d", glide = 0, width = 2 } = {},
) {
    await onElement(
        h,
        async (el, o) => {
            const { styles, data } = el.session;
            const smooth = (k) => k * k * (3 - 2 * k);
            const hex = (c) => [1, 3, 5].map((j) => Number.parseInt(c.slice(j, j + 2), 16));
            const hot = hex(o.flash);
            let cold = hex(o.cool);
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
                "edge.width": o.width + 2 * (1 - smooth(Math.max(0, (k - 0.45) / 0.55))),
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
                // the color routes cool to from now on (the drawing's routes change color)
                cool: (c) => {
                    cold = hex(c);
                },
                ahead: (ms) => {
                    const now = performance.now() - t0;
                    const out = [];
                    for (let k = i; k < o.steps.length && o.times[k] <= now + ms; k++)
                        out.push(o.steps[k].node.position);
                    return out;
                },
            };
        },
        { steps, times, drawMs, layers, tickMs, flash, cool, glide, width, firstEdgeId: steps.firstEdgeId ?? 0 },
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
 * distance that holds 90% of the nodes. Replaces any follow running, carrying on from where it had
 * the camera (its framing and turn speed ease to the new options); `unfollow` stops it.
 * @param h - the hand
 * @param o - options
 * @param [o.fill] - the share of the canvas the drawing fills
 * @param [o.tau] - how slowly the framing eases (ms)
 * @param [o.spin] - the turn (rad/s); a change of spin eases in over `tau`
 * @param [o.least] - the least width framed (world units, 2D) or radius (3D)
 * @param [o.beta] - 3D: the camera's angle down from the vertical
 * @param [o.alpha] - 3D: the starting turn (default where the camera is)
 * @param [o.share] - 3D: the share of the nodes inside the framed radius
 * @param [o.tilt] - 3D: how fast the camera's angle down eases toward `beta`, against `tau`
 * @param [o.aheadMs] - also frame the airports the growth adds in the next this many ms
 * @param [o.only] - frame only these nodes (ids)
 * @param [o.push] - 2D: the framing tightens by this share a second (a slow push in, never still)
 * @param [o.lean] - 2D: how far the framing's middle leans from what is drawn toward the airports
 *     coming (`aheadMs`): 0 keeps what is drawn in the middle, 1 frames both alike
 * @param [o.box] - { top, bottom }: canvas pixels the finished video crops off (the cut's
 *     full-bleed box), so the drawing is framed in what is left; the 3D camera's state then carries
 *     `aim`, the target it really looks at
 * @returns when it is running
 */
export const follow = (h, o = {}) =>
    onElement(
        h,
        (el, opt) => {
            const {
                fill = 0.7,
                tau = 900,
                spin = 0,
                least = 14,
                beta = 1.25,
                share = 0.9,
                tilt = 0.5,
                push = 0,
                lean = 1,
            } = opt;
            const { top = 0, bottom = 0 } = opt.box ?? {};
            const shift = (bottom - top) / 2;
            const was = globalThis.__follow;
            was?.stop();
            let on = true;
            let last = performance.now();
            const t0 = last;
            const cam = el.getCameraState();
            const only = opt.only ? new Set(opt.only) : null;
            const fresh = () =>
                cam.mode === "2d"
                    ? (() => {
                          // the half width it shows, in world units, measured
                          const a = el.worldToScreen({ x: 0, y: 0, z: 0 });
                          const b = el.worldToScreen({ x: 1, y: 0, z: 0 });
                          const ppu = Math.hypot(b.x - a.x, b.y - a.y) || 1;
                          return {
                              half: el.getCanvasSize().width / 2 / ppu,
                              pan: { ...cam.pan },
                              rotation: cam.rotation ?? 0,
                          };
                      })()
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
            const s = was && "half" in was.state === (cam.mode === "2d") ? was.state : fresh();
            // the airports drawn and those due soon, so the view widens before they arrive
            const drawn = () =>
                el
                    .getNodes()
                    .filter((n) => !only || only.has(n.id))
                    .map((n) => n.getPosition());
            const coming = () => (opt.aheadMs && globalThis.__growth?.ahead?.(opt.aheadMs)) || [];
            const points = () => [...drawn(), ...coming()];
            const box = (qs) => {
                const [xs, ys] = [qs.map((p) => p.x), qs.map((p) => p.y)];
                return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
            };
            // 2D: the middle of what is drawn, moved `lean` of the way toward the middle of it and
            // what is coming, and the width and height that hold both round it
            const framing = (ps) => {
                const all = box(ps);
                const seen = drawn();
                const now = seen.length ? box(seen) : all;
                const mid = { x: now.x + (all.x - now.x) * lean, y: now.y + (all.y - now.y) * lean };
                return {
                    mid,
                    wx: Math.max(least, 2 * Math.max(...ps.map((p) => Math.abs(p.x - mid.x)))),
                    wy: Math.max(least * 0.5625, 2 * Math.max(...ps.map((p) => Math.abs(p.y - mid.y)))),
                };
            };
            const frame = () => {
                if (!on) return;
                const now = performance.now();
                const dt = Math.min(100, now - last);
                last = now;
                const w = 1 - Math.exp(-dt / tau);
                s.spin = (s.spin ?? spin) + (spin - (s.spin ?? spin)) * w;
                const ps = points();
                if (ps.length) {
                    if ("half" in s) {
                        const { mid, wx, wy } = framing(ps);
                        // the half width that fits the box, in world units: the frustum is set by its
                        // edges, not by `zoom`, whose reference size the element may change as data
                        // arrives (a one-frame jump in the framing)
                        const a = el.worldToScreen({ x: 0, y: 0, z: 0 });
                        const up = Math.sign(a.y - el.worldToScreen({ x: 0, y: 1, z: 0 }).y) || 1;
                        const { width: cw, height: ch } = el.getCanvasSize();
                        const hb = ch - top - bottom;
                        const f = fill * Math.exp((push * (now - t0)) / 1000);
                        const goal = Math.max(wx / (2 * f), (wy * cw) / (2 * f * hb));
                        // widening linearly (in log terms it lags the pan, and a far arrival pushes
                        // what is drawn off the frame's edge before the view has opened), narrowing
                        // in log terms (an even push in)
                        s.half =
                            goal > s.half
                                ? s.half + (goal - s.half) * w
                                : Math.exp(Math.log(s.half) + (Math.log(goal) - Math.log(s.half)) * w);
                        // the drawing's middle on the middle of the box, `shift` px above the canvas's
                        const aim = mid.y - (up * shift * 2 * s.half) / cw;
                        s.pan.x += (mid.x - s.pan.x) * w;
                        s.pan.y += (aim - s.pan.y) * w;
                        s.rotation += (s.spin * dt) / 1000;
                        const k = ch / cw;
                        el.setCameraState(
                            {
                                orthoLeft: -s.half,
                                orthoRight: s.half,
                                orthoTop: s.half * k,
                                orthoBottom: -s.half * k,
                                pan: s.pan,
                                rotation: s.rotation,
                            },
                            { skipQueue: true },
                        );
                    } else {
                        // the drawing's centroid, so the framing sits on its mass, not its outliers
                        const c = {};
                        for (const k of ["x", "y", "z"]) c[k] = ps.reduce((sum, p) => sum + p[k], 0) / ps.length;
                        const d = ps.map((p) => Math.hypot(p.x - c.x, p.y - c.y, p.z - c.z)).sort((x, y) => x - y);
                        const r = Math.max(least, d[Math.min(d.length - 1, Math.floor(d.length * share))] ?? least);
                        const fov = el.getCameraState().fov ?? 0.8;
                        const { height: ch } = el.getCanvasSize();
                        const goal = r / Math.tan(fov / 2) / (fill * ((ch - top - bottom) / ch));
                        s.radius = Math.exp(Math.log(s.radius) + (Math.log(goal) - Math.log(s.radius)) * w);
                        for (const k of ["x", "y", "z"]) s.target[k] += (c[k] - s.target[k]) * w;
                        s.beta += (beta - s.beta) * Math.min(1, w * tilt);
                        s.alpha += (s.spin * dt) / 1000;
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
export const unfollow = (h) =>
    onElement(h, () => {
        globalThis.__follow?.stop();
        globalThis.__follow = null;
    });

/**
 * A wave of change: a layer that covers the nodes (or edges) still to change lets them go one after
 * another over `ms`, eased in and out, by narrowing its selector, then is removed; or, growing, a
 * layer that selects none yet spreads over them and stays. The order: left to right on the screen,
 * the order they joined the graph, nearest a point first (outward from it), or a list of ids given.
 * Nodes added meanwhile are not covered: they arrive changed (growing: the layer ends on everything,
 * so they arrive changed too). Call it with a layer just added over everything, or let it add one
 * (`set`).
 * @param h - the hand
 * @param o - the wave
 * @param [o.id] - an existing layer to narrow (or, `grow`, to spread)
 * @param [o.set] - or the channels of a new one (added on top, covering everything)
 * @param o.ms - how long the wave takes
 * @param [o.edges] - the layer is on edges (an edge's place is its middle)
 * @param [o.by] - "screen" (left to right), "arrival", a point { x, y, z } (nearest first), or a
 *     list of ids in order (only they are covered)
 * @param [o.reverse] - the other way round (farthest first)
 * @param [o.stepMs] - the time between two steps of the wave
 * @param [o.grow] - spread the layer instead of narrowing it
 * @returns when the wave has passed
 */
export async function sweep(
    h,
    { id, set, ms, edges = false, by = "screen", reverse = false, stepMs = 110, grow = false },
) {
    let ids = Array.isArray(by) ? [...by] : await waveOrder(h, edges, by);
    if (reverse) ids = ids.toReversed();
    await onElement(
        h,
        async (el, o) => {
            const { styles } = el.session;
            const pick = (list) => (o.edges ? { match: "ids", edges: list } : { match: "ids", nodes: list });
            const layer =
                o.id ??
                (
                    await styles.add({
                        name: "Sweep",
                        target: o.edges ? "edge" : "node",
                        selector: pick(o.ids),
                        set: o.set,
                    })
                ).id;
            const t0 = performance.now();
            for (let k = 0; k < 1; k = Math.min(1, (performance.now() - t0) / o.ms)) {
                const n = Math.round(k * k * (3 - 2 * k) * o.ids.length);
                const t = performance.now();
                await styles.update(layer, { selector: pick(o.grow ? o.ids.slice(0, n) : o.ids.slice(n)) });
                // a style update costs the page tens of milliseconds: a step every stepMs, not every frame
                await new Promise((r) => setTimeout(r, Math.max(0, o.stepMs - (performance.now() - t))));
            }
            if (!o.grow) await styles.remove(layer);
            else await styles.update(layer, { selector: o.all ? { match: "everything" } : pick(o.ids) });
        },
        { id, set, ms, edges, ids, stepMs, grow, all: !Array.isArray(by) },
    );
}

/**
 * The nodes' (or edges') ids in a wave's order (sweep).
 * @param h - the hand
 * @param edges - edges, placed at their middles
 * @param by - "screen" (left to right), "arrival", or a point { x, y, z } (nearest first)
 * @returns the ids
 */
async function waveOrder(h, edges, by) {
    const items = await onElement(
        h,
        (el, o) => {
            const at = new Map(el.getNodes().map((n) => [n.id, n.getPosition()]));
            const list = o.edges
                ? el.session.data.edges().map((e) => {
                      const [a, b] = [at.get(e.source), at.get(e.target)];
                      return { id: e.id, p: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 } };
                  })
                : el.session.data.nodes().map((n) => ({ id: n.id, p: at.get(n.id) }));
            return list.map((x) => ({ ...x, sx: o.screen ? el.worldToScreen(x.p).x : 0 }));
        },
        { edges, screen: by === "screen" },
    );
    if (by === "arrival") return items.map((x) => x.id);
    const key = by === "screen" ? (x) => x.sx : (x) => len(sub(x.p, by));
    return items.toSorted((x, y) => key(x) - key(y)).map((x) => x.id);
}

/**
 * Run an analysis on the graph (session.run, as the Analyze panel runs it).
 * @param h - the hand
 * @param algorithm - its key ("louvain", "shortest-path")
 * @param [params] - its parameters
 * @param [under] - a layer to keep the layers the run adds beneath (moved there in the same call,
 *     before a frame is drawn), so a mask over them holds
 * @param [palette] - a palette for the node colors the run's layers paint, in place of the one the
 *     element picks (Louvain's default, okabe-ito, has black among its colors)
 * @returns for shortest-path, the route's airports in order and its edges in the same order; else nothing
 */
export const analyze = (h, algorithm, params = {}, under = null, palette = null) =>
    onElement(
        h,
        async (el, o) => {
            const { styles } = el.session;
            const had = new Set(styles.list().map((l) => l.id));
            const run = await el.session.run({ op: "algo.run", algorithm: o.algorithm, params: o.params });
            const added = styles.list().filter((x) => !had.has(x.id));
            for (const l of added) {
                const color = l.encode?.["node.color"];
                if (o.palette && color)
                    await styles.update(l.id, {
                        encode: { ...l.encode, "node.color": { ...color, palette: o.palette } },
                    });
                if (o.under) await styles.move(l.id, o.under);
            }
            if (o.algorithm !== "shortest-path") return null;
            const nodes = el
                .getNodes()
                .map((n) => n.id)
                .filter((id) => run.node(id)?.onPath)
                .sort((a, b) => run.node(a).order - run.node(b).order);
            const step = (id) => run.node(id).order;
            const edges = el.session.data
                .edges()
                .filter((e) => run.edge(e.id)?.onPath)
                .sort((a, b) => Math.min(step(a.source), step(a.target)) - Math.min(step(b.source), step(b.target)))
                .map((e) => e.id);
            return { nodes, edges };
        },
        { algorithm, params, under, palette },
    );

/**
 * The lift into 3D: the view switched to 3D with the camera seeing exactly the picture the 2D
 * camera saw (straight on, at the distance that keeps the screen scale; the 2D view must not be
 * turned), then each airport drawn so far is given its place `at` (session.data.updateNodes) and
 * the fixed layout run again, so with slowMotion's transition the drawing rises into depth (`place`
 * then carries it on to its 3D places). Stop follow first.
 * @param h - the hand
 * @param at - where each airport goes, by id
 * @returns the 3D camera it starts from, as orbit angles { alpha, beta, radius, target }
 */
export const lift = (h, at) =>
    onElement(
        h,
        async (el, to) => {
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
            await el.session.data.updateNodes(ids.map((id) => ({ id, values: { position: to[id] } })));
            await el.setLayout("fixed", { scale: 1, spacing: 0 });
            return { alpha: -Math.PI / 2, beta: Math.PI / 2, radius, target };
        },
        at,
    );

/**
 * Move the airports drawn so far to new places (session.data.updateNodes and the fixed layout run
 * again: with slowMotion's transition they travel there).
 * @param h - the hand
 * @param at - where each airport goes, by id
 * @returns when the layout has been started
 */
export const place = (h, at) =>
    onElement(
        h,
        async (el, to) => {
            const ids = el.getNodes().map((n) => n.id);
            await el.session.data.updateNodes(ids.map((id) => ({ id, values: { position: to[id] } })));
            await el.setLayout("fixed", { scale: 1, spacing: 0 });
        },
        at,
    );
