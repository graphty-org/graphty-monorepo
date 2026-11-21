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
 * The flight along a route, as camera poses (playPoses): an airplane's view. The camera runs in
 * from `from` and on along a smooth curve that passes `clear` above and beside each airport of
 * the route (never through one, so each passes large beside the lens), looking ahead along the
 * route's own line (the look smoothed over time, so the line holds its place in the frame),
 * banking a little into the turns; it gathers speed, eases a little at each airport, swings round
 * to above the last airport and comes in along `normal` -- the way the close-up on the globe sees
 * it, so the two close-ups match -- slowing into an extreme close-up (`close` from it), creeping
 * closer through `hold`.
 * @param pts - the route's airports, in order
 * @param o - the flight
 * @param o.ms - how long the flight takes, to the close-up (take ms)
 * @param o.normal - the direction the close-up looks from (from the last airport to the camera)
 * @param [o.from] - where the camera is when the flight starts (default behind the first airport)
 * @param [o.cone] - how far (rad) the close-up's side may lean from `normal`
 * @param [o.lead] - how far before the first airport the run-in starts
 * @param [o.clear] - how far from each airport the camera passes
 * @param [o.ahead] - how far along the route ahead it looks
 * @param [o.close] - the close-up's distance from the last airport
 * @param [o.hold] - the close-up held after it (take ms), creeping in by `creep` of `close`
 * @param [o.creep] - how much closer the hold creeps
 * @param [o.v0] - the starting speed, against the top speed
 * @param [o.dip] - how much the camera slows at each airport (0-1)
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
    const { from = null, normal, cone = 0.6, lead = 24, clear = 7.5, ahead = 36, close = 4.6, hold = 0 } = o;
    const { creep = 0.1 } = o;
    const { v0 = 0.3, dip = 0.4, bank = 0.5, maxRoll = 0.17, sigma = 2, maxTurn = 0.3, hz = 60 } = o;
    const last = pts.at(-1);
    const u = unit(normal);
    const n = pts.length;
    const Y = { x: 0, y: 1, z: 0 };
    const back = from ? unit(sub(from, pts[0])) : unit(sub(pts[0], pts[1]));
    const start = add(pts[0], mul(back, lead));
    // `clear` above and to the side of a point of the route going `T`
    const beside = (p, T) => {
        let up = sub(Y, mul(T, dot(Y, T)));
        if (len(up) < 0.2) up = sub({ x: 1, y: 0, z: 0 }, mul(T, T.x));
        up = unit(up);
        return add(p, mul(add(mul(up, 0.8), mul(unit(cross(T, up)), 0.6)), clear));
    };
    const line = [start, ...pts];
    const cam = line.slice(0, -1).map((p, i) => beside(p, unit(sub(line[i + 1], line[Math.max(0, i - 1)]))));
    // the close-up's side: as the last leg comes in (from behind and above), turned toward
    // `normal` until it is within `cone` of it (so the close-up on the globe, seen from the same
    // side, looks down on the earth and never from under it)
    const T1 = unit(sub(last, pts.at(-2)));
    const natural = unit(sub(beside(sub(last, mul(T1, 3 * close)), T1), last));
    const lean = dot(natural, u);
    let side = unit(sub(natural, mul(u, lean)));
    if (!Number.isFinite(side.x)) side = unit(cross(u, Math.abs(u.y) < 0.9 ? Y : { x: 1, y: 0, z: 0 }));
    const dir = lean >= Math.cos(cone) ? natural : unit(add(mul(u, Math.cos(cone)), mul(side, Math.sin(cone))));
    // the approach: round to it, then in along it
    let swing = add(dir, unit(sub(cam.at(-1), last)));
    if (len(swing) < 0.3) swing = side;
    cam.push(add(last, mul(unit(swing), close * 5)), add(last, mul(dir, close * 2.2)), add(last, mul(dir, close)));
    const c = curve(cam);
    const route = curve(line);
    // the route's arc level with the camera's, knot to knot (the approach level with the last leg)
    const ck = [...c.knots.slice(0, n), c.length];
    const onRoute = (s) => {
        let i = 0;
        while (i < n - 1 && ck[i + 1] <= s) i++;
        const f = Math.min(1, (s - ck[i]) / (ck[i + 1] - ck[i]));
        return route.knots[i] + (route.knots[i + 1] - route.knots[i]) * f;
    };
    // the speed: from v0 of the top speed, rising to the top three quarters of the way, then
    // slowing to the creep; a dip at each airport (by arc length)
    const sEnd = c.length;
    const T = o.ms / 1000;
    const H = hold / 1000;
    const vEnd = H > 0 ? (creep * close) / H : 0;
    const dt = 1 / hz;
    const near = (s) => 1 - dip * Math.max(0, ...c.knots.slice(1, n).map((k) => Math.exp(-(((s - k) / 8) ** 2) / 2)));
    const speed = (vmax, x) => {
        const rise = smooth(x / 0.6);
        const fall = smooth((x - 0.6) / 0.4);
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
    const raw = arc.map((s) => route.at(onRoute(s) + ahead));
    for (let k = 1; k <= Math.round(H * hz); k++) {
        ps.push(add(last, mul(dir, close - vEnd * k * dt)));
        raw.push(last);
    }
    // the look: toward the smoothed point ahead, turning at most `maxTurn` a second (it eases into
    // a turn rather than whipping round; the close-up's look is reached in the slow approach)
    // over the approach the look comes round to the last airport
    const settle = (i, from, over) => (i < arc.length ? smooth((arc[i] - (sEnd - from * close)) / (over * close)) : 1);
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
 * The other airports the flight's camera passes within `clear` of (to hide them: one passing
 * through the lens would flash across the frame).
 * @param poses - flightPoses' poses
 * @param others - [id, position] of the airports not on the route
 * @param clear - the least distance
 * @returns their ids
 */
export const nearLens = (poses, others, clear) =>
    others.filter(([, q]) => poses.some(({ p }) => len(sub(p, q)) < clear)).map(([id]) => id);

/**
 * The reveal, as camera poses (playPoses): an extreme close-up on a point of the globe, straight
 * down on it (as the flight's close-up), still creeping in at `creepV`; then one long pull back,
 * eased in and out (a sine, in the log of the distance), along the line from the globe's middle
 * (the point stays in the middle of the frame while the camera is near), the creep fading into it,
 * turning as it goes toward the point halfway to `toward`, to `far` globe radii out, the globe
 * sinking in the frame by `drop` (so a title above it leaves the network in view); then on,
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
 * @param [o.drop] - how far the globe sinks in the frame by the end, in half-heights of it
 * @param [o.hz] - poses a second
 * @returns `poses` and `hz`, as flightPoses
 */
export function revealPoses(spot, toward, o) {
    const { close, pull, creepV = 0, hold = 0, turn = 0, far = 4.6, spin = 0.02, drop = 0, hz = 60 } = o;
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
    const ease = (k) => (1 - Math.cos(Math.PI * Math.min(1, Math.max(0, k)))) / 2;
    const poses = [];
    let ramp = 0;
    let crept = 0;
    const dt = 1 / hz;
    for (let t = 0; t <= (hold + pull + turn) / 1000 + 1e-9; t += dt) {
        const k = (t - hold / 1000) / (pull / 1000);
        const radius = (close - crept) * (R / close) ** ease(k);
        crept += creepV * (1 - smooth(k / 0.3)) * dt;
        // the target slides to the globe's middle with the distance, so the camera only ever recedes
        const target = mul(spot, 1 - Math.max(0, (radius - close) / (R - close)));
        const q = soft((k - 0.2) / 0.8);
        ramp += smooth((k - 0.5) / 0.5) * dt;
        const a = a0 + (a1 - a0) * q + spin * ramp;
        const b = b0 + (b1 - b0) * q;
        const dir = { x: Math.cos(a) * Math.sin(b), y: Math.cos(b), z: Math.sin(a) * Math.sin(b) };
        const up = unit(sub({ x: 0, y: 1, z: 0 }, mul(dir, dir.y)));
        const look = add(target, mul(up, drop * radius * Math.tan(0.4) * soft((k - 0.3) / 0.7)));
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
 * @param [o.box] - { top, bottom }: canvas pixels the finished video crops off (the cut's
 *     full-bleed box), so the drawing is framed in what is left; the 3D camera's state then carries
 *     `aim`, the target it really looks at
 * @returns when it is running
 */
export const follow = (h, o = {}) =>
    onElement(
        h,
        (el, opt) => {
            const { fill = 0.7, tau = 900, spin = 0, least = 14, beta = 1.25, share = 0.9, tilt = 0.5, push = 0 } = opt;
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
            const points = () => [
                ...el
                    .getNodes()
                    .filter((n) => !only || only.has(n.id))
                    .map((n) => n.getPosition()),
                ...((opt.aheadMs && globalThis.__growth?.ahead?.(opt.aheadMs)) || []),
            ];
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
                        const xs = ps.map((p) => p.x);
                        const ys = ps.map((p) => p.y);
                        const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
                        const mid = { x: (x0 + x1) / 2, y: (y0 + y1) / 2 };
                        const wx = Math.max(least, x1 - x0);
                        const wy = Math.max(least * 0.5625, y1 - y0);
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
