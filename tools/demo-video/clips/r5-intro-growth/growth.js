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
/**
 * The two ends of the path the camera follows: Chongqing to San Francisco (the network's shortest
 * path between them runs by Sydney and Manila).
 */
export const PATH_ENDS = ["CKG", "SFO"];
/** The airport the globe turns toward at the end, so Europe's network passes the camera. */
export const EUROPE = "FRA";
/** How wide the force layout's drawing is scaled to (scene units) before its communities are drawn apart. */
const SPAN = 110;
/** How wide the drawing the flat places are laid out from is (scene units): the 2D tree's scale. */
const SPAN_FLAT = 90;
/** The least distance between two airports of one community in the 3D drawing (scene units). */
const APART = 11;
/** The empty space between two communities in the 3D drawing (scene units). */
const GAP = 20;
/**
 * How near the path's end on the globe (globe units, about 160 km) another airport is drawn on or
 * under it (plan's `under`): on the end globe such an airport, drawn a size on screen, would grow
 * round the path's end, a ring round it.
 */
const UNDER = 0.65;
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
 *     `spot` and `europe`, where the globe puts the path's end and EUROPE; `under`, the ids of
 *     the airports it draws within UNDER of the path's end; each node carries
 *     `position`, its place in the 3D drawing (centered on the origin: groupsApart); `flat`, the
 *     first `flat` airports' places in the flat drawing, by id; `scatter`, where the others
 *     first appear (scatter), by id
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
        async (el, [ids, globe, near]) => {
            el.autoFrame = false;
            await el.session.config.set({ layoutTransition: undefined });
            await el.setLayout("location-map", globe);
            const read = () => ids.map((id) => el.getNode(id)?.getPosition());
            const landed = (q) => q && Math.hypot(q.x, q.y, q.z) > 0.8 * globe.size;
            for (;;) {
                const qs = read();
                if (qs.every((q) => landed(q)) && el.session.layout.motion === "settled") {
                    // the other airports the globe draws on the path's end, within `under` of it
                    const [end] = qs;
                    const under = el
                        .getNodes()
                        .filter((n) => n.id !== ids[0])
                        .filter((n) => {
                            const q = n.getPosition();
                            return Math.hypot(q.x - end.x, q.y - end.y, q.z - end.z) < near;
                        })
                        .map((n) => n.id);
                    return { ...Object.fromEntries(ids.map((id, i) => [id, qs[i]])), under };
                }
                await new Promise((r) => globalThis.requestAnimationFrame(r));
            }
        },
        [[PATH_ENDS[1], EUROPE], GLOBE, UNDER],
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
    // the 3D drawing: each community its own lobe, its airports at least APART, with GAP of empty
    // space between lobes, so it is airy and its communities distinct groups (groupsApart); the
    // flat drawing is laid out from a tighter version of the same drawing, SPAN_FLAT across
    // (lobes), so the 2D tree is drawn at the scale the 2D camera and the airports' size suit
    const at = groupsApart(drawn.ps, SPAN, APART, GAP);
    const tight = lobes(drawn.ps, SPAN_FLAT, 1.8, 0.5);
    // both turned alike, so the drawing's widest spread lies across the screen and its thinnest is
    // the depth: the flat view (z 0) is then the least tangled one, and the lift adds the rest
    const turn = principalAxes(Object.values(tight));
    const turned = (p) => {
        const [x, y, z] = turn.map((a) => a.x * p.x + a.y * p.y + a.z * p.z);
        return { x, y, z };
    };
    const flatById = new Map();
    for (const n of nodes)
        if (at[n.id]) {
            n.position = turned(at[n.id]);
            flatById.set(n.id, { position: turned(tight[n.id]) });
        }
    // in 3D, the route's corner at Manila eased (MANILA): its airport drawn toward the middle of the
    // two either side, so the flight meets it head on and turns after it gently (the flat tree keeps it)
    pullIn(byId, MANILA, 0.3);
    // the airports that join the 3D drawing appear scattered through it, in its open spaces, and
    // glide to their lobes as the communities light (scatter)
    steps.scatter = scatter(
        Object.fromEntries(steps.map((s) => [s.node.id, s.node.position])),
        order.slice(flat),
        1.6 * APART,
    );
    steps.flat = flatPlaces(
        steps.map((s) => ({ ...s, node: { ...s.node, position: flatById.get(s.node.id).position } })),
        flat,
    );
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
    steps.under = spots.under;
    return steps;
}

/**
 * The flight's corner at Manila, [before, middle, after]: in the force drawing the route turns about
 * 90 degrees at its middle airport (MNL), too sharp to fly past it at speed without whipping the look.
 */
const MANILA = ["SYD", "MNL", "SFO"];

/**
 * A corner of the route eased: its middle airport moved toward the middle of the two either side,
 * to `keep` of its distance from it (in place).
 * @param byId - the airport records, by id (their `position` read and the middle's replaced)
 * @param ids - [before, middle, after]
 * @param keep - the share of its distance from their middle it keeps
 */
export function pullIn(byId, ids, keep) {
    const [a, m, b] = ids.map((id) => byId.get(id).position);
    const mid = mul(add(a, b), 0.5);
    byId.get(ids[1]).position = add(mid, mul(sub(m, mid), keep));
}

/**
 * The mean of points.
 * @param qs - the points
 * @returns their mean
 */
const mean = (qs) =>
    mul(
        qs.reduce((s, q) => add(s, q), { x: 0, y: 0, z: 0 }),
        1 / qs.length,
    );

/**
 * A drawing's communities drawn apart, tightly (the flat drawing's starting point): each group's
 * middle pushed out from the drawing's by `apart`, its airports drawn in toward it by `tight`,
 * then the whole centered on the origin and scaled to `span` across.
 * @param ps - [id, position, group]
 * @param span - the width it is scaled to
 * @param apart - how far each group's middle moves out, against where it was
 * @param tight - how close each airport comes to its group's middle, against where it was
 * @returns each airport's new position, by id
 */
function lobes(ps, span, apart, tight) {
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
 * Lobes' middles pushed apart (in place) until every two have `gap` between the spheres round them,
 * the smaller lobe moving more.
 * @param groups - [{ mid, radius, n }]
 * @param gap - the empty space between two
 */
function pushApart(groups, gap) {
    // one pair: whether it had to move
    const part = (a, b) => {
        const d = sub(b.mid, a.mid);
        const l = len(d);
        const need = a.radius + b.radius + gap;
        if (l >= need) return false;
        const u = l > 1e-9 ? mul(d, 1 / l) : { x: 1, y: 0, z: 0 };
        a.mid = sub(a.mid, mul(u, ((need - l) * b.n) / (a.n + b.n)));
        b.mid = add(b.mid, mul(u, ((need - l) * a.n) / (a.n + b.n)));
        return true;
    };
    for (let round = 0; round < 400; round++) {
        let moved = false;
        for (let i = 0; i < groups.length; i++)
            for (let j = i + 1; j < groups.length; j++) moved = part(groups[i], groups[j]) || moved;
        if (!moved) return;
    }
}

/**
 * A drawing's communities drawn as separate lobes: the drawing scaled to `span` across, then each
 * community kept in its own shape round its middle but opened out until no two of its airports
 * are nearer than `least` (spreadOut), and the communities' middles pushed apart (each kept in the
 * direction it lay from the drawing's middle) until every two lobes have `gap` of empty space
 * between them (between the spheres round their farthest airports; the smaller lobe moves more);
 * the whole centered on the origin. Not scaled down after, so the spacing holds.
 * @param ps - [id, position, group]
 * @param span - the width the drawing is scaled to first
 * @param least - the least distance between two airports of a lobe
 * @param gap - the empty space between two lobes
 * @returns each airport's new position, by id
 */
export function groupsApart(ps, span, least, gap) {
    const c = mean(ps.map(([, p]) => p));
    const r = Math.max(...ps.map(([, p]) => len(sub(p, c)))) || 1;
    const groups = [...new Set(ps.map(([, , g]) => g))].map((g) => {
        const own = ps.filter(([, , x]) => x === g).map(([id, p]) => [id, mul(sub(p, c), span / 2 / r)]);
        const mid = mean(own.map(([, p]) => p));
        const local = spreadOut(Object.fromEntries(own.map(([id, p]) => [id, sub(p, mid)])), least);
        const radius = Math.max(0, ...Object.values(local).map((q) => len(q)));
        return { mid, local, radius, n: own.length };
    });
    pushApart(groups, gap);
    const out = groups.flatMap(({ mid, local }) => Object.entries(local).map(([id, q]) => [id, add(mid, q)]));
    const c2 = mean(out.map(([, p]) => p));
    return Object.fromEntries(out.map(([id, p]) => [id, sub(p, c2)]));
}

/**
 * Points pushed apart until no two are nearer than `least` (each pair too near moved apart along
 * the line between them, half each, `rounds` times over): clumps open up, while points already
 * farther apart, such as separate lobes, stay where they are.
 * @param at - the points, by id
 * @param least - the least distance
 * @param [rounds] - how many passes
 * @returns the moved points, by id
 */
export function spreadOut(at, least, rounds = 60) {
    const ids = Object.keys(at);
    const ps = ids.map((id) => ({ ...at[id] }));
    for (let r = 0; r < rounds; r++)
        for (let i = 0; i < ps.length; i++)
            for (let j = i + 1; j < ps.length; j++) {
                const d = sub(ps[j], ps[i]);
                const l = len(d);
                if (l >= least) continue;
                const push = mul(l > 1e-9 ? mul(d, 1 / l) : { x: 1, y: 0, z: 0 }, (least - l) / 2);
                ps[i] = sub(ps[i], push);
                ps[j] = add(ps[j], push);
            }
    return Object.fromEntries(ids.map((id, i) => [id, ps[i]]));
}

/**
 * Where airports first appear before their communities gather them: each at a random place (seeded)
 * in the ellipsoid that holds the drawing, `least` or more from every other airport's place there
 * and from those already scattered (or, failing that, as far as it found), so they land in the open
 * spaces across and round the drawing, not on its lobes.
 * @param at - every airport's place in the drawing, by id
 * @param ids - the airports to scatter, in the order they join
 * @param least - the least distance from any other
 * @param [seed] - the random seed
 * @returns each scattered airport's place, by id
 */
export function scatter(at, ids, least, seed = 11) {
    const random = rng(seed);
    const away = new Set(ids);
    const taken = Object.entries(at)
        .filter(([id]) => !away.has(id))
        .map(([, p]) => p);
    const half = ["x", "y", "z"].map((k) => Math.max(...Object.values(at).map((p) => Math.abs(p[k]))));
    const out = {};
    for (const id of ids) {
        let best = null;
        let far = -1;
        for (let k = 0; k < 400 && far < least; k++) {
            const u = [0, 1, 2].map(() => 2 * random() - 1);
            if (u[0] ** 2 + u[1] ** 2 + u[2] ** 2 > 1) continue;
            const q = { x: u[0] * half[0], y: u[1] * half[1], z: u[2] * half[2] };
            const d = Math.min(...taken.map((p) => len(sub(p, q))));
            if (d > far) [best, far] = [q, d];
        }
        out[id] = best;
        taken.push(best);
    }
    return out;
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
 * A curve (curve) with its corners rounded: sampled a unit apart, each sample moved to the
 * Gaussian mean of its neighbors `sigma` units wide, the width tapering to nothing toward the ends,
 * so the ends stay put and the last straight stays straight.
 * @param c - the curve
 * @param sigma - the width (units)
 * @returns the rounded curve, as curve
 */
function rounded(c, sigma) {
    const n = Math.max(2, Math.ceil(c.length));
    const xs = Array.from({ length: n + 1 }, (_, i) => c.at((i * c.length) / n));
    const out = xs.map((x, i) => {
        const w = sigma * Math.min(smooth(i / (3 * sigma)), smooth((n - i) / (3 * sigma)));
        if (w < 0.3) return x;
        const k = Math.ceil(3 * w);
        let [sum, tot] = [{ x: 0, y: 0, z: 0 }, 0];
        for (let j = Math.max(0, i - k); j <= Math.min(n, i + k); j++) {
            const a = Math.exp(-(((j - i) / w) ** 2) / 2);
            sum = add(sum, mul(xs[j], a));
            tot += a;
        }
        return mul(sum, 1 / tot);
    });
    return curve(out, 1);
}

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
 * The camera's curve for flightPoses: from the run-in `lead` back along the first leg, a point
 * beside each airport but the last (`clear` of it, at `side` round the way the route comes in) and
 * `over` on past it before the turn, and beside the middle of each leg but the last (each leg seen
 * along its own way, so the curve keeps off the route's straight lines), then straight in on the last
 * along `dir`, from `run` out to `close` from it; its corners rounded `round` wide, so the look never whips round a
 * bend (the ends kept where they are). The rounding moves the curve nearer some airports and
 * farther from others, so each airport's offset is scaled until the camera passes it `clear` away
 * (a few rounds settle it).
 * @param pts - the route's airports
 * @param o - the curve
 * @param o.away - the way back along the first leg (unit)
 * @param o.dir - the way the close-up is seen from (unit, from the last airport)
 * @param o.lead - how far back the run-in is
 * @param o.clear - how far beside each airport it passes
 * @param o.side - which side (the angle round the way the route goes)
 * @param o.over - how far on past each airport it carries before turning
 * @param o.lastOver - as much past the last airport but one
 * @param o.round - how widely its corners are rounded
 * @param o.close - the close-up's distance
 * @param o.run - how far out on `dir` the straight run in on the last airport starts
 * @returns `c0`, the curve through the points, and `c`, it rounded (both as curve)
 */
function besideCurve(pts, { away, dir, lead, clear, side, over, lastOver, round, close, run }) {
    const last = pts.at(-1);
    const ov = (i) => (i + 2 === pts.length ? lastOver : over);
    const path = (cl) => {
        const cam = [beside(add(pts[0], mul(away, lead)), mul(away, -1), side, cl[0])];
        for (let i = 0; i + 1 < pts.length; i++) {
            const tin = unit(sub(pts[i], pts[Math.max(0, i - 1)]));
            cam.push(beside(pts[i], i === 0 ? unit(sub(pts[1], pts[0])) : tin, side, cl[i]));
            if (i > 0 && ov(i) > 0) cam.push(beside(add(pts[i], mul(tin, ov(i))), tin, side, cl[i]));
            if (i + 2 < pts.length) {
                const mid = mul(add(add(pts[i], mul(tin, i > 0 ? ov(i) : 0)), pts[i + 1]), 0.5);
                cam.push(beside(mid, unit(sub(pts[i + 1], mid)), side, (cl[i] + cl[i + 1]) / 2));
            }
        }
        cam.push(add(last, mul(dir, run)), add(last, mul(dir, close)));
        const c0 = curve(cam);
        return { c0, c: rounded(c0, round) };
    };
    let cl = pts.map(() => clear);
    let built = path(cl);
    for (let k = 0; k < 6; k++) {
        const ss = Array.from({ length: Math.ceil(built.c.length) }, (_, i) => built.c.at(i));
        const near = pts.slice(0, -1).map((q) => Math.min(...ss.map((p) => len(sub(p, q)))));
        cl = cl.map((x, i) =>
            i < near.length ? Math.min(4 * clear, Math.max(0.25 * clear, (x * clear) / near[i])) : x,
        );
        built = path(cl);
    }
    return built;
}

/**
 * How far along a line each camera position is level with: the nearest point of it, searched a
 * little way on from the last (so it never goes back); the first `skip` positions (far off, in the
 * swoop) are held at its start.
 * @param ps - the camera's positions
 * @param line - the line's point at a length along it
 * @param length - its length
 * @param skip - how many positions to hold at its start
 * @returns the lengths along it
 */
function levelAlong(ps, line, length, skip) {
    const us = [];
    let u = 0;
    for (const [i, p] of ps.entries()) {
        let best = u;
        if (i >= skip)
            for (let x = u; x <= Math.min(length, u + 20); x += 0.25)
                if (len(sub(line(x), p)) < len(sub(line(best), p))) best = x;
        u = best;
        us.push(u);
    }
    return us;
}

/**
 * The flight along a route, as camera poses (playPoses): an airplane's view. The camera leaves
 * `from`, moving at `fromV` (the orbit's own motion, so it carries straight on) and looking at
 * `look`, and swoops in along one cubic (Hermite) curve to a run-in `lead` behind the first airport,
 * arriving along the route at the flight's starting speed; then it flies one smooth curve that runs
 * `clear` beside each airport of the route, on the same side of it (`side`, an angle round the way
 * the route goes), so it rides beside the route's line and never through an airport; past the last
 * but one it comes in on the last airport from `dir` (nearly straight back along the last leg) to
 * `close` from it. It looks along the route: at the point of the route's own line `ahead` beyond
 * the point of it the camera is level with (and past the last airport, on along the line the camera
 * comes in on), so the line runs away ahead into the distance, each airport comes up along it and
 * sweeps out to the side large as the camera passes, and the close-up looks straight at the last
 * airport with no turn to find it. Through the swoop its look eases from `look` onto the route.
 *
 * The speed: from the run-in it only builds (smoothstep), from `v0` of the top speed to the top as
 * it passes the last airport but one; then it only slows: a smoothstep down to `near` from the
 * last airport, then eased by the airport's size on screen, which from there grows at a steady
 * rate (1 / distance rising linearly), arriving at `vEnd` (`creep` of `close` a second) at the
 * close-up; it holds the close-up `hold` more, creeping on at `vEnd` (the same steady growth).
 * The close-up is aimed `aim` below the airport (so it sits that much above the canvas's middle, in
 * the middle of a crop), eased in as it comes in. It banks a little into the turns, level by the
 * close-up.
 * @param pts - the route's airports, in order
 * @param o - the flight
 * @param o.ms - how long the build takes, from the run-in to the last airport but one (take ms);
 *     the arrival takes what its speeds make it (`flyMs`)
 * @param o.close - the close-up's distance from the last airport
 * @param [o.approachMs] - how long the swoop from `from` to the run-in takes (take ms)
 * @param [o.from] - where the camera is when the flight starts (default: it starts at the run-in)
 * @param [o.fromV] - how it moves there (units a second of take; default still)
 * @param [o.look] - what it looks at there (default along the route)
 * @param [o.lead] - how far behind the first airport the run-in starts
 * @param [o.clear] - how far beside each airport the camera passes
 * @param [o.side] - which side: the angle round the way the route goes (0 above, PI/2 to the right)
 * @param [o.ahead] - how far along the route ahead the camera looks
 * @param [o.round] - how widely the camera's curve's corners are rounded (the smoothing's width, units)
 * @param [o.lineRound] - as much for the route's line it looks along
 * @param [o.over] - how far on past each airport but the first and last the camera and its look
 *     carry straight on before they turn onto the next leg (so it meets each airport head on and
 *     turns after it, in open space)
 * @param [o.lastOver] - as much past the last airport but one (default `over`; 0 bends onto the
 *     last leg right after it)
 * @param [o.run] - how far out the straight run in on the last airport starts (default 6 `close`)
 * @param [o.hold] - the close-up held after it (take ms)
 * @param [o.v0] - the speed at the run-in, against the top speed
 * @param [o.creep] - the speed at the close-up, in `close`s a second of take
 * @param [o.near] - how far from the last airport its steady growth on screen starts (default 4 `close`)
 * @param [o.aim] - how far the close-up aims below the airport, in half-heights of the view
 * @param [o.bank] - roll per rad/s of turn
 * @param [o.maxRoll] - the most roll (radians)
 * @param [o.sigma] - how long the look is smoothed over (s of take)
 * @param [o.hz] - poses a second
 * @returns `poses`, the camera's position `p`, its target `t` and its roll `r`, `hz` a second;
 *     `runMs`, when it reaches the run-in (take ms: `approachMs`); `flyMs`, how long it takes from
 *     the run-in to the close-up (take ms); `vEnd`, its speed at the
 *     close-up (units a second of take); and `dir`, the side the close-up is seen from (from the
 *     last airport toward the camera)
 */
export function flightPoses(pts, o) {
    const { from = null, fromV = { x: 0, y: 0, z: 0 }, look = null, lead = 30, clear = 8, side = 0.6 } = o;
    const { ahead = 60, over = 30, round = 20, lineRound = 30, hold = 0, v0 = 0.6, creep = 0.2, aim = 0, close } = o;
    const { near = 4 * close, lastOver = over, run = 6 * close } = o;
    const { bank = 0.5, maxRoll = 0.17, sigma = 1.5, hz = 60 } = o;
    const last = pts.at(-1);
    const Y = { x: 0, y: 1, z: 0 };
    // the run-in straight back along the route's first leg, and the side the last is seen from:
    // nearly straight back along the last leg, so the look comes onto it with little turn
    const away = unit(sub(pts[0], pts[1]));
    const T1 = unit(sub(last, pts.at(-2)));
    const dir = unit(sub(beside(sub(last, mul(T1, 9 * close)), T1, side, clear), last));
    const { c0, c } = besideCurve(pts, { away, dir, lead, clear, side, over, lastOver, round, close, run });
    const sEnd = c.length;
    const sArr = (c0.knots.at(-3) * c.length) / c0.length;
    // the speed: smoothly from v0 to the top over the build (`ms`, to the last airport but one;
    // a smoothstep, so it takes its length over the mean of its two speeds); then smoothly down
    // (a smoothstep) to the speed at which the last airport, `near` away, grows on screen at the
    // rate it will keep; then that steady growth (1 / distance rising at a constant rate: the
    // speed falls with the distance squared) to `close`, arriving at vEnd
    const vEnd = creep * close;
    const grow = vEnd / close ** 2;
    const sN = sEnd - (near - close);
    if (sN <= sArr) throw new Error("flightPoses: `near` reaches back past the last airport but one");
    const vN = grow * near ** 2;
    const tb = o.ms / 1000;
    const vmax = (2 * sArr) / ((1 + v0) * tb);
    const ta = (2 * (sN - sArr)) / (vmax + vN);
    const tn = (1 / close - 1 / near) / grow;
    const T = tb + ta + tn;
    // the integral of a + (b - a) smoothstep(t / d), from 0 to t
    const ramp = (t, d, a, b) => {
        const x = Math.min(1, t / d);
        return d * (a * x + (b - a) * (x * x * x - (x * x * x * x) / 2));
    };
    const at = (t) => {
        if (t <= tb) return ramp(t, tb, v0 * vmax, vmax);
        if (t <= tb + ta) return sArr + ramp(t - tb, ta, vmax, vN);
        return Math.min(sEnd, sEnd + close - 1 / (1 / near + grow * (t - tb - ta)));
    };
    const arc = [];
    const steps = Math.round(T * hz);
    for (let k = 0; k <= steps; k++) arc.push(at(k / hz));
    const nh = Math.round((hold / 1000) * hz);
    for (let k = 1; k <= nh; k++) arc.push(sEnd + (vEnd * k) / hz);
    // positions (past the curve's end, on in along -dir)
    const on = (s) => (s <= sEnd ? c.at(s) : sub(c.at(sEnd), mul(dir, s - sEnd)));
    let ps = arc.map((s) => on(s));
    // the swoop: a cubic from `from` at fromV to the run-in at the starting speed along the curve
    const na = from ? Math.round(((o.approachMs ?? 0) / 1000) * hz) : 0;
    if (na > 0) {
        const D = na / hz;
        const [P1, V1] = [c.at(0), mul(unit(sub(c.at(1), c.at(0))), v0 * vmax)];
        const swoop = Array.from({ length: na }, (_, k) => {
            const x = k / na;
            const [x2, x3] = [x * x, x * x * x];
            return add(
                add(mul(from, 2 * x3 - 3 * x2 + 1), mul(fromV, D * (x3 - 2 * x2 + x))),
                add(mul(P1, -2 * x3 + 3 * x2), mul(V1, D * (x3 - x2))),
            );
        });
        ps = [...swoop, ...ps];
    }
    // the route's own line, from the run-in's point on it, and on past the last airport along the
    // line the camera comes in on; the camera's place along it (the nearest point, never going
    // back; the run-in's through the swoop), and the look `ahead` of that
    const lineCtrl = [add(pts[0], mul(away, lead)), pts[0]];
    for (let i = 1; i < pts.length; i++) {
        lineCtrl.push(pts[i]);
        const carryOn = i + 2 === pts.length ? lastOver : over;
        if (i + 1 < pts.length && carryOn > 0) lineCtrl.push(add(pts[i], mul(unit(sub(pts[i], pts[i - 1])), carryOn)));
    }
    const r0 = rounded(curve(lineCtrl), lineRound);
    const line = (u) => (u <= r0.length ? r0.at(u) : sub(last, mul(dir, u - r0.length)));
    const us = levelAlong(ps, line, r0.length, na);
    const raw = ps.map((_, i) => {
        const go = line(us[i] + ahead);
        const w = na > 0 ? smooth(i / na) : 1;
        return add(mul(look ?? go, 1 - w), mul(go, w));
    });
    // the place along the arc of each pose (the swoop before the run-in)
    const where = ps.map((_, i) => (i < na ? -1 : arc[i - na]));
    // smoothed, then aimed `aim` below (along the screen's up), eased in over the arrival
    const ts = gauss(raw, sigma * hz).map((t, i) => {
        const f = unit(sub(t, ps[i]));
        const up = unit(sub(Y, mul(f, f.y)));
        const w = smooth((where[i] - sArr) / (sEnd - sArr));
        return sub(t, mul(up, aim * len(sub(t, ps[i])) * Math.tan(0.4) * w));
    });
    // bank into the turn: roll from how fast the look swings sideways, smoothed, none at the end
    const fwd = ps.map((p, i) => unit(sub(ts[i], p)));
    const turn = fwd.map((f, i) => {
        const [a, b] = [fwd[Math.max(0, i - 1)], fwd[Math.min(fwd.length - 1, i + 1)]];
        return (dot(sub(b, a), unit(cross(f, Y))) * hz) / 2;
    });
    const roll = gauss(turn, sigma * hz, false).map((w, i) => {
        const fade = where[i] < 0 ? smooth(i / na) : smooth((sEnd - where[i]) / (close * 6));
        return Math.max(-maxRoll, Math.min(maxRoll, -bank * w)) * fade;
    });
    return {
        poses: ps.map((p, i) => ({ p: r3(p), t: r3(ts[i]), r: +roll[i].toFixed(4) })),
        hz,
        runMs: (na * 1000) / hz,
        flyMs: T * 1000,
        vEnd,
        dir,
    };
}

/**
 * Poses moved from round one point to round another, turned so that looking from `a.dir` at
 * `a.at` becomes looking from `b.dir` at `b.at`, with the screen's up (the world's up, across the
 * view) kept up: the same picture of the point, the same move round it.
 * @param poses - [{ p, t, r }]
 * @param a - { at, dir }: the point they move round now, and the side they see it from
 * @param b - { at, dir }: where to move them
 * @returns the moved poses
 */
export function carry(poses, a, b) {
    const Y = { x: 0, y: 1, z: 0 };
    const frame = (d) => {
        const z = unit(d);
        const x = unit(cross(Y, z));
        return [x, cross(z, x), z];
    };
    const [fa, fb] = [frame(a.dir), frame(b.dir)];
    const move = (q) => {
        const v = sub(q, a.at);
        return fa.reduce((s, e, k) => add(s, mul(fb[k], dot(v, e))), b.at);
    };
    return poses.map((q) => ({ p: r3(move(q.p)), t: r3(move(q.t)), r: q.r }));
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
 * Play a stretch of poses `f` times slower (the cut speeds that stretch up `f` times more, so the
 * output video's camera is unchanged): a style update stalls the page for 80-200 ms
 * (defects.md 5), and while the take runs slower each stall is a smaller share of an output
 * frame, so it no longer shows as a held frame and a jump.
 * @param poses - [{ p, t, r }] at `hz`
 * @param hz - poses a second
 * @param a - where the stretch starts (ms into the poses)
 * @param b - where it ends (ms into the poses)
 * @param f - how many times slower
 * @returns the new poses, at `hz`
 */
export function stretch(poses, hz, a, b, f) {
    const last = poses.length - 1;
    const total = (last * 1000) / hz + (b - a) * (f - 1);
    const lerp = (u, v, k) => ({ x: u.x + (v.x - u.x) * k, y: u.y + (v.y - u.y) * k, z: u.z + (v.z - u.z) * k });
    const out = [];
    for (let i = 0; (i * 1000) / hz <= total + 1e-6; i++) {
        const T = (i * 1000) / hz;
        let ms = T - (b - a) * (f - 1); // after the stretch
        if (T < a) ms = T;
        else if (T < a + (b - a) * f) ms = a + (T - a) / f;
        const x = Math.min(last, (ms * hz) / 1000);
        const j = Math.floor(x);
        const [u, v] = [poses[j], poses[Math.min(j + 1, last)]];
        const k = x - j;
        out.push({ p: lerp(u.p, v.p, k), t: lerp(u.t, v.t, k), r: u.r + (v.r - u.r) * k });
    }
    return out;
}

/**
 * The reveal, as camera poses (playPoses): an extreme close-up on a point of the globe, straight
 * down on it (as the flight's close-up), still creeping in at `creepV`; then one long pull back,
 * eased in briefly (over the creep's fade, so the creep turns into it smoothly) and out long (a
 * sine of a power of the time, in the log of the distance, so it is clearly moving within a few
 * percent of its length), along the line from the globe's middle
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
 * @param [o.creepFade] - over what share of the pull the creep fades out
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
    const { close, pull, creepV = 0, creepFade = 0.08, hold = 0, turn = 0, far = 4.6, spin = 0.02 } = o;
    const { drop = 0, aim = 0, hz = 60 } = o;
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
        // the creep's ground given back as the pull goes out, so the pull ends `far` out, centered;
        // the pull eased in over the creep's fade, so the creep turns into the pull with no jolt
        const e = ease(k) * smooth(k / creepFade);
        const radius = (close - crept * (1 - e)) * (R / close) ** e;
        crept += creepV * (1 - smooth(k / creepFade)) * dt;
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
                    if (x >= o.poses.length - 1) {
                        // marks due at the very end (the last pose falls up to a frame short of them)
                        while (next < o.marks.length) out.push({ name: o.marks[next++][1], t: Date.now() });
                        return done(out);
                    }
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
 * The 2D camera's framing of the growing tree, planned ahead from when each airport arrives and
 * where it lands, as one move: its middle the middle of the box round every airport due within
 * `ahead` of now (a box that only grows), smoothed; its half width the least that holds them all
 * round that middle, never less than before (the view only ever opens), smoothed in log terms from
 * a little ahead so it is never short of that (and the move's speed never jumps), and opened on by `drift` a second all the while (the picture never
 * stops, also once the last airport is in). Smoothing is a Gaussian `sigma` wide.
 * @param arrivals - [{ t, p }]: each airport's arrival (ms from the start) and place, in order
 * @param o - the framing
 * @param o.fill - the share of the frame the drawing fills
 * @param o.least - the least width framed (world units)
 * @param o.aspect - the frame's width over its height
 * @param o.ahead - how long before an airport arrives it is framed (ms)
 * @param o.sigma - how widely the move is smoothed (ms)
 * @param [o.drift] - how fast the view opens on its own (log of the width a second)
 * @param [o.dt] - the time between two samples (ms)
 * @returns `{ dt, drift, half, x, y }`: the view's half width and its middle, a sample every `dt` ms
 */
export function treeFraming(arrivals, { fill, least, aspect, ahead, sigma, drift = 0, dt = 100 }) {
    const n = Math.ceil((arrivals.at(-1).t + 3 * sigma) / dt) + 1;
    const due = (k) => arrivals.filter((a) => a.t <= k * dt + ahead).map((a) => a.p);
    const span = (qs, key) => [Math.min(...qs.map((q) => q[key])), Math.max(...qs.map((q) => q[key]))];
    // the smoothing's half window, in samples
    const w = Math.ceil((3 * sigma) / dt);
    const smooth = (xs) =>
        xs.map((_, k) => {
            let [sum, z] = [0, 0];
            for (let j = -w; j <= w; j++) {
                const g = Math.exp(-0.5 * ((j * dt) / sigma) ** 2);
                sum += g * xs[Math.min(n - 1, Math.max(0, k + j))];
                z += g;
            }
            return sum / z;
        });
    const need = (qs, c) =>
        Math.max(least / 2, ...qs.map((q) => Math.max(Math.abs(q.x - c.x), Math.abs(q.y - c.y) * aspect))) / fill;
    const sets = Array.from({ length: n }, (_, k) => due(k));
    const mids = sets.map((qs) => ({
        x: span(qs, "x").reduce((a, b) => a + b) / 2,
        y: span(qs, "y").reduce((a, b) => a + b) / 2,
    }));
    const x = smooth(mids.map((q) => q.x));
    const y = smooth(mids.map((q) => q.y));
    const ever = (xs) => xs.map((_, k) => Math.max(...xs.slice(0, k + 1)));
    const needs = sets.map((qs, k) => need(qs, { x: x[k], y: y[k] }));
    // what each moment needs round the smoothed middle, never closing in (a step up each time an
    // airport falls due), read the smoothing's half window early and then smoothed: the smoothing
    // at a moment then averages only what that moment and the next ones need, so it is never short
    // of it, and its speed changes smoothly (held to the need instead, the view stepped out in a
    // frame or two each time an airport fell due, just after the route before it was drawn)
    const ls = ever(needs.map((v) => Math.log(v)));
    const logs = smooth(ls.map((_, k) => ls[Math.min(n - 1, k + w)]));
    return { dt, drift, half: logs.map((l, k) => Math.exp(l + (drift * k * dt) / 1000)), x, y };
}

/**
 * The camera follows the growing drawing, in the page, every frame (setCameraState with skipQueue,
 * as shape.js rig does): it keeps the drawing framed at `fill` of the canvas, easing toward the new
 * framing (time constant `tau` ms), so the view widens smoothly as airports arrive. In 2D it frames
 * the box round every airport drawn or due soon, a box that only ever grows (never closer than
 * `least` world units across), so the framing only opens and its middle moves only as the drawing
 * spreads, eased twice over (its speed never jumps), and turns by `spin` rad/s; in 3D it
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
 * @param [o.plan] - 2D: play this framing (treeFraming) from now instead, eased in from where the
 *     camera is over `tau`; after its end it opens on, its `drift` eased to `later` over `rampMs`
 * @param [o.push] - 2D: the framing tightens by this share a second (a slow push in, never still;
 *     below 0, a slow pull out), carried on from the follow before
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
                          const alpha = opt.alpha ?? Math.atan2(d.z, d.x);
                          const beta = Math.acos(d.y / r);
                          // taken over where the camera looks: the rig aims `shift` px below its
                          // target (below), so its target starts that far above the camera's, or the
                          // first frame jumps the whole picture up by `shift` (the lift into 3D)
                          const dn = (shift / el.getCanvasSize().height) * 2 * r * Math.tan((cam.fov ?? 0.8) / 2);
                          return {
                              alpha,
                              beta,
                              radius: r,
                              target: {
                                  x: cam.target.x - dn * Math.cos(alpha) * Math.cos(beta),
                                  y: cam.target.y + dn * Math.sin(beta),
                                  z: cam.target.z - dn * Math.sin(alpha) * Math.cos(beta),
                              },
                          };
                      })();
            const s = was && "half" in was.state === (cam.mode === "2d") ? was.state : fresh();
            if (opt.plan) s.start = null;
            // the airports drawn and those due soon, so the view widens before they arrive
            const drawn = () =>
                el
                    .getNodes()
                    .filter((n) => !only || only.has(n.id))
                    .map((n) => n.getPosition());
            const coming = () => (opt.aheadMs && globalThis.__growth?.ahead?.(opt.aheadMs)) || [];
            const points = () => [...drawn(), ...coming()];
            // 2D: the box round all it has framed so far and the points now (it only grows), its
            // middle, and its width and height
            const framing = (ps) => {
                const b = s.ext ?? { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
                for (const p of ps) {
                    b.x0 = Math.min(b.x0, p.x);
                    b.x1 = Math.max(b.x1, p.x);
                    b.y0 = Math.min(b.y0, p.y);
                    b.y1 = Math.max(b.y1, p.y);
                }
                s.ext = b;
                return {
                    mid: { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 },
                    wx: Math.max(least, b.x1 - b.x0),
                    wy: Math.max(least * 0.5625, b.y1 - b.y0),
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
                    if ("half" in s && opt.plan) {
                        // the planned framing, eased in from where the camera was
                        const p = opt.plan;
                        const u = (now - t0) / p.dt;
                        const k = Math.min(p.half.length - 1, Math.floor(u));
                        const j = Math.min(p.half.length - 1, k + 1);
                        const f = Math.min(1, u - k);
                        const lerp = (xs) => xs[k] + (xs[j] - xs[k]) * f;
                        // after the plan, opening on, its speed eased from `drift` to `later` over `rampMs`
                        const over = Math.max(0, u - (p.half.length - 1)) * p.dt;
                        const { later = p.drift, rampMs = 1 } = p;
                        const ramped = Math.min(over, rampMs);
                        const opened =
                            p.drift * over +
                            (later - p.drift) * (ramped ** 2 / (2 * rampMs) + Math.max(0, over - rampMs));
                        const logHalf =
                            Math.log(p.half[k]) + (Math.log(p.half[j]) - Math.log(p.half[k])) * f + opened / 1000;
                        const b = Math.exp(-(now - t0) / tau);
                        s.start = s.start ?? { half: s.half, x: s.pan.x, y: s.pan.y };
                        s.half = Math.exp(logHalf + (Math.log(s.start.half) - logHalf) * b);
                        const { width: cw } = el.getCanvasSize();
                        const up =
                            Math.sign(
                                el.worldToScreen({ x: 0, y: 0, z: 0 }).y - el.worldToScreen({ x: 0, y: 1, z: 0 }).y,
                            ) || 1;
                        const aim = lerp(p.y) - (up * shift * 2 * s.half) / cw;
                        s.pan.x = lerp(p.x) + (s.start.x - lerp(p.x)) * b;
                        s.pan.y = aim + (s.start.y - aim) * b;
                        const k2 = el.getCanvasSize().height / cw;
                        el.setCameraState(
                            {
                                orthoLeft: -s.half,
                                orthoRight: s.half,
                                orthoTop: s.half * k2,
                                orthoBottom: -s.half * k2,
                                pan: s.pan,
                                rotation: s.rotation,
                            },
                            { skipQueue: true },
                        );
                    } else if ("half" in s) {
                        const { mid, wx, wy } = framing(ps);
                        // the half width that fits the box, in world units: the frustum is set by its
                        // edges, not by `zoom`, whose reference size the element may change as data
                        // arrives (a one-frame jump in the framing)
                        const a = el.worldToScreen({ x: 0, y: 0, z: 0 });
                        const up = Math.sign(a.y - el.worldToScreen({ x: 0, y: 1, z: 0 }).y) || 1;
                        const { width: cw, height: ch } = el.getCanvasSize();
                        const hb = ch - top - bottom;
                        // the push, summed over time and carried on from the follow before (so a
                        // new follow's push changes the framing's speed, never its size)
                        s.pushed = (s.pushed ?? 0) + (push * dt) / 1000;
                        const f = fill * Math.exp(s.pushed);
                        const goal = Math.max(wx / (2 * f), (wy * cw) / (2 * f * hb));
                        // eased twice over (in log terms): toward the goal, and the view toward that,
                        // so the framing's speed changes smoothly, never in a jump
                        const ease = (a, b) => Math.exp(Math.log(a) + (Math.log(b) - Math.log(a)) * w);
                        s.goal = ease(s.goal ?? s.half, goal);
                        s.half = ease(s.half, s.goal);
                        // the drawing's middle on the middle of the box, `shift` px above the canvas's
                        s.mid = s.mid ?? { x: s.pan.x, y: s.pan.y + (up * shift * 2 * s.half) / cw };
                        s.mid.x += (mid.x - s.mid.x) * w;
                        s.mid.y += (mid.y - s.mid.y) * w;
                        const aim = s.mid.y - (up * shift * 2 * s.half) / cw;
                        s.pan.x += (s.mid.x - s.pan.x) * w;
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
            // TEMPORARY (defects.md 19): setViewMode re-runs the fixed layout from the records and
            // drops places set with session.positions.set (the growth's gliders keep the airport they
            // joined in their record), so every airport's drawn place is written into its record
            // first; a no-op on screen. Delete once the element keeps drawn places across the switch.
            await el.session.data.updateNodes(
                el.getNodes().map((n) => ({ id: n.id, values: { position: { ...n.getPosition() } } })),
            );
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
