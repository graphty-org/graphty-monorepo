// Self-check of the growth intro's camera math: node --test tools/demo-video/clips/r5-intro-growth/growth.test.js
import assert from "node:assert/strict";
import test from "node:test";

import {
    arcRoute,
    carry,
    flatPlaces,
    flightPoses,
    flightRoute,
    groupsApart,
    nearLens,
    principalAxes,
    pullIn,
    revealPoses,
    scatter,
    spreadOut,
    stretch,
    treeFraming,
} from "./growth.js";

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const unit = (a) => {
    const l = Math.hypot(a.x, a.y, a.z);
    return { x: a.x / l, y: a.y / l, z: a.z / l };
};
const angle = (a, b) => Math.acos(Math.min(1, a.x * b.x + a.y * b.y + a.z * b.z));

test("the widest spread comes first, the thinnest last", () => {
    const ps = [];
    for (let i = -10; i <= 10; i++) ps.push({ x: 0.1 * i, y: 5 * i, z: (i % 3) * 2 });
    const [a, , c] = principalAxes(ps);
    assert.ok(Math.abs(a.y) > 0.99);
    assert.ok(Math.abs(c.x) > 0.9);
});

test("communities become separate lobes: their airports apart, empty space between lobes", () => {
    // two communities drawn through each other, each a tight clump
    const ps = [];
    for (let i = 0; i < 20; i++) ps.push([`a${i}`, { x: (i % 5) * 0.3, y: (i % 3) * 0.3, z: (i % 2) * 0.3 }, 0]);
    for (let i = 0; i < 20; i++) ps.push([`b${i}`, { x: 0.5 + (i % 5) * 0.3, y: (i % 3) * 0.3, z: 0 }, 1]);
    const at = groupsApart(ps, 40, 5, 12);
    const ids = (g) => ps.filter((x) => x[2] === g).map(([id]) => id);
    for (const g of [0, 1])
        for (const [i, a] of ids(g).entries())
            for (const b of ids(g).slice(i + 1)) assert.ok(dist(at[a], at[b]) > 4.9, `${a}-${b} too near`);
    const gap = Math.min(...ids(0).flatMap((a) => ids(1).map((b) => dist(at[a], at[b]))));
    assert.ok(gap >= 12, `lobes ${gap.toFixed(1)} apart`);
});

test("the flat drawing puts each airport beside the one it joins, with no route crossing another", () => {
    // a hub with six spokes, each with two leaves, their 3D places scattered at random (seeded)
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 80 - 40;
    const steps = [{ node: { id: "h", position: { x: rand(), y: rand(), z: rand() } }, edges: [] }];
    const add = (id, parent) =>
        steps.push({
            node: { id, position: { x: rand(), y: rand(), z: rand() } },
            edges: [{ source: parent, target: id }],
        });
    for (let i = 0; i < 6; i++) add(`s${i}`, "h");
    for (let i = 0; i < 12; i++) add(`l${i}`, `s${i % 6}`);
    const at = flatPlaces(steps, steps.length);
    const edges = steps.flatMap((s) => s.edges);
    const lengths = edges.map((e) => dist(at[e.source], at[e.target]));
    const route = lengths.reduce((a, b) => a + b) / lengths.length;
    for (const l of lengths)
        assert.ok(l < 1.5 * route && l > 0.5 * route, `a route ${l.toFixed(1)} long, typical ${route.toFixed(1)}`);
    for (const s of steps) assert.equal(at[s.node.id].z, 0);
    const side = (p, q, r) => Math.sign((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x));
    for (const [i, e] of edges.entries())
        for (const f of edges.slice(i + 1)) {
            if (new Set([e.source, e.target, f.source, f.target]).size < 4) continue;
            const [a, b, c, d] = [at[e.source], at[e.target], at[f.source], at[f.target]];
            assert.ok(!(side(a, b, c) * side(a, b, d) < 0 && side(c, d, a) * side(c, d, b) < 0), "routes cross");
        }
});

test("the flight swoops in carrying the orbit's motion, rides beside the route looking along it, builds speed, eases into the close-up as the last airport grows steadily on screen", () => {
    const pts = [
        { x: 0, y: 0, z: 0 },
        { x: 60, y: 10, z: 0 },
        { x: 100, y: 0, z: 50 },
        { x: 170, y: -10, z: 60 },
    ];
    const from = { x: -150, y: 120, z: -180 };
    const fromV = { x: 30, y: 0, z: -20 };
    const o = { ms: 20000, approachMs: 9000, hold: 300, close: 2.8, clear: 8, lastOver: 0, from, fromV, look: pts[2] };
    const { poses, hz, vEnd, dir, runMs, flyMs } = flightPoses(pts, o);
    assert.ok(flyMs > 20000);
    assert.equal(
        poses.length,
        Math.round((9000 * hz) / 1000) + Math.round((flyMs * hz) / 1000) + 1 + Math.round(0.3 * hz),
    );
    assert.equal(runMs, 9000);
    const run = (runMs * hz) / 1000;
    const step = (i) => dist(poses[i + 1].p, poses[i].p);
    // it leaves `from` moving as the orbit moved, and meets the run-in at the flight's own speed
    assert.ok(dist(poses[0].p, from) < 1e-3);
    assert.ok(Math.abs(step(0) * hz - Math.hypot(fromV.x, fromV.z)) < 0.05 * Math.hypot(fromV.x, fromV.z));
    assert.ok(Math.abs(step(run - 1) - step(run)) < 0.1 * step(run), "a jolt at the run-in");
    // from the run-in the speed only builds, then only falls into the close-up: one peak
    const v = [];
    for (let i = run; i < poses.length - 1; i++) v.push(step(i));
    const top = v.indexOf(Math.max(...v));
    for (let i = 1; i <= top; i++) assert.ok(v[i] >= v[i - 1] - 3e-3, `slows at pose ${run + i}`);
    for (let i = top + 1; i < v.length; i++) assert.ok(v[i] <= v[i - 1] + 3e-3, `speeds up at pose ${run + i}`);
    assert.ok(v[0] > 0.4 * v[top], "parked at the run-in");
    // the last airport only comes nearer, from the top speed on
    for (let i = top + run; i < poses.length - 1; i++)
        assert.ok(dist(poses[i + 1].p, pts[3]) < dist(poses[i].p, pts[3]), `backs off at pose ${i}`);
    // beside every airport on the way, never through one
    for (const q of pts.slice(0, -1)) {
        const least = Math.min(...poses.map(({ p }) => dist(p, q)));
        assert.ok(least > 0.7 * o.clear && least < 1.5 * o.clear, `passes ${least.toFixed(2)} from an airport`);
    }
    // it looks the way it goes, never back at an airport it passed, and never whips round
    const f = (q) => unit({ x: q.t.x - q.p.x, y: q.t.y - q.p.y, z: q.t.z - q.p.z });
    for (let i = run; i < poses.length - 1; i++) {
        const go = unit({
            x: poses[i + 1].p.x - poses[i].p.x,
            y: poses[i + 1].p.y - poses[i].p.y,
            z: poses[i + 1].p.z - poses[i].p.z,
        });
        assert.ok(angle(f(poses[i]), go) < 1, `looks away from its way at pose ${i}`);
    }
    for (let i = 1; i < poses.length; i++) {
        assert.ok(angle(f(poses[i]), f(poses[i - 1])) * hz < 0.6, `turns fast at pose ${i}`);
        assert.ok(Math.abs(poses[i].r) <= 0.175);
    }
    // from `near` (4 close) in, the last airport's size on screen (1 / distance) grows at one steady rate
    // (measured over quarter seconds: the poses are rounded to a thousandth)
    const g = poses.map(({ p }) => 1 / dist(p, pts[3]));
    const q = hz / 4;
    const steady = [];
    for (let i = q; i < poses.length; i += q) if (1 / g[i - q] < 4 * o.close - 0.5) steady.push(g[i] - g[i - q]);
    assert.ok(steady.length > 4, "no steady arrival");
    for (const x of steady) assert.ok(Math.abs(x - steady[0]) < 0.06 * steady[0], "uneven growth on screen");
    // the close-up: looking straight at the last airport from `dir`, creeping in at vEnd, level
    const end = poses.at(-1);
    const back = unit({ x: end.p.x - pts[3].x, y: end.p.y - pts[3].y, z: end.p.z - pts[3].z });
    assert.ok(angle(back, dir) < 1e-3);
    assert.ok(angle(f(end), { x: -dir.x, y: -dir.y, z: -dir.z }) < 1e-3);
    assert.ok(Math.abs(dist(end.p, pts[3]) - (2.8 - 0.3 * vEnd)) < 0.01);
    assert.ok(vEnd > 0 && vEnd * 0.3 < 0.1 * 2.8);
    assert.equal(end.r, 0);
});

test("flightRoute: a unique shortest path, enough stops, every leg long, the one nearest the pacing's length", () => {
    // a -- b -- end and s -- a -- b -- end: a to b is a short hop; c -- d -- end is long every leg;
    // e, nearer the length, has two shortest paths (by d and by b), so the take's run might light either
    const at = {
        end: { x: 0, y: 0, z: 0 },
        b: { x: 50, y: 0, z: 0 },
        a: { x: 60, y: 0, z: 0 },
        s: { x: 110, y: 0, z: 0 },
        d: { x: 0, y: 50, z: 0 },
        c: { x: 0, y: 105, z: 0 },
        f: { x: 0, y: 165, z: 0 },
        e: { x: 50, y: 50, z: 0 },
    };
    const links = [
        ["s", "a"],
        ["a", "b"],
        ["b", "end"],
        ["c", "d"],
        ["d", "end"],
        ["f", "c"],
        ["e", "d"],
        ["e", "b"],
    ];
    // at least three airports: c's is the one nearest 100 long
    const route = flightRoute(at, links, "end", 40, 100, 3);
    assert.deepEqual(route, ["c", "d", "end"]);
    for (let i = 1; i < route.length; i++) assert.ok(dist(at[route[i - 1]], at[route[i]]) >= 40);
    // longer pacing picks the longer route; no route with long legs throws
    assert.deepEqual(flightRoute(at, links, "end", 40, 160, 3), ["f", "c", "d", "end"]);
    assert.throws(() => flightRoute(at, links, "end", 200, 100, 3));
    // by default at least four airports: f's, however near c's is to the length; none that long throws
    const four = flightRoute(at, links, "end", 40, 100);
    assert.ok(four.length >= 4);
    assert.deepEqual(four, ["f", "c", "d", "end"]);
    assert.throws(() => flightRoute(at, links, "end", 40, 100, 5));
});

test("flightRoute measures the legs the flight flies: its last corner eased as pullIn eases it", () => {
    // r sits 30 from q as drawn, 44 once eased toward the middle of q and end (and 56 from end)
    const at = {
        p: { x: 0, y: 200, z: 0 },
        q: { x: 0, y: 100, z: 0 },
        r: { x: 0, y: 70, z: 0 },
        end: { x: 0, y: 0, z: 0 },
    };
    const links = [
        ["p", "q"],
        ["q", "r"],
        ["r", "end"],
    ];
    assert.deepEqual(flightRoute(at, links, "end", 40, 200), ["p", "q", "r", "end"]);
    assert.throws(() => flightRoute(at, links, "end", 40, 200, 4, 1));
});

test("pullIn eases a corner: the middle airport drawn toward the middle of its two neighbors", () => {
    const at = (x, y, z) => ({ position: { x, y, z } });
    const byId = new Map([
        ["a", at(0, 0, 0)],
        ["m", at(10, 0, 20)],
        ["b", at(20, 0, 0)],
    ]);
    pullIn(byId, ["a", "m", "b"], 0.25);
    assert.deepEqual(byId.get("m").position, { x: 10, y: 0, z: 5 });
});

test("carry moves a view of one point onto another, seen from another side, up kept up", () => {
    const a = { at: { x: 10, y: 5, z: 0 }, dir: { x: 0, y: 1, z: 0.2 } };
    const b = { at: { x: -3, y: 2, z: 7 }, dir: { x: 1, y: 0.3, z: -0.5 } };
    const ua = unit(a.dir);
    const pose = { p: { x: a.at.x + 4 * ua.x, y: a.at.y + 4 * ua.y, z: a.at.z + 4 * ua.z }, t: a.at, r: 0.1 };
    const [q] = carry([pose], a, b);
    const ub = unit(b.dir);
    assert.ok(dist(q.p, { x: b.at.x + 4 * ub.x, y: b.at.y + 4 * ub.y, z: b.at.z + 4 * ub.z }) < 1e-2);
    assert.ok(dist(q.t, b.at) < 1e-2);
    assert.equal(q.r, 0.1);
});

test("spreadOut opens a clump to the least distance and leaves far points alone", () => {
    const at = {
        a: { x: 0, y: 0, z: 0 },
        b: { x: 1, y: 0, z: 0 },
        c: { x: 0, y: 1, z: 0 },
        far: { x: 50, y: 0, z: 0 },
    };
    const out = spreadOut(at, 5);
    const ids = Object.keys(out);
    for (const [i, a] of ids.entries())
        for (const b of ids.slice(i + 1)) assert.ok(dist(out[a], out[b]) > 4.9, `${a}-${b} too near`);
    assert.deepEqual(out.far, at.far);
});

test("the reveal starts on the flight's close-up, creeping, then pulls back and never goes into the globe", () => {
    const spot = { x: 10, y: 15, z: -17 };
    const from = { x: 0.7, y: 0.6, z: -0.4 };
    const o = { close: 4, creepV: 0.1, hold: 1000, pull: 12000, turn: 4000, drop: 0.3, from };
    const { poses } = revealPoses(spot, { x: -20, y: 10, z: 12 }, o);
    const u = unit(from);
    assert.ok(dist(poses[0].p, { x: spot.x + 4 * u.x, y: spot.y + 4 * u.y, z: spot.z + 4 * u.z }) < 1e-3);
    assert.ok(dist(poses[0].t, spot) < 1e-3);
    // creeping in first, then out
    assert.ok(dist(poses[30].p, spot) < dist(poses[0].p, spot));
    assert.ok(dist(poses.at(-1).p, spot) > 3 * Math.hypot(spot.x, spot.y, spot.z));
    for (const { p } of poses) assert.ok(Math.hypot(p.x, p.y, p.z) > Math.hypot(spot.x, spot.y, spot.z));
    // it ends `far` out looking at the globe's middle, whatever the creep took (the default far 4.6)
    const r = Math.hypot(spot.x, spot.y, spot.z);
    const tail = revealPoses(spot, { x: -20, y: 10, z: 12 }, { ...o, creepV: 0.5, turn: 0 }).poses.at(-1);
    assert.ok(Math.abs(Math.hypot(tail.p.x, tail.p.y, tail.p.z) - 4.6 * r) < 0.01 * r);
    // clearly pulling back a twentieth of the way into the pull (over a tenth farther out)
    const at = poses[Math.round(((1000 + 0.05 * 12000) * 60) / 1000)];
    assert.ok(dist(at.p, spot) > 1.15 * dist(poses[60].p, spot));
});

test("arcRoute puts the middle airports on an arc: equal legs, the same gentle turn at each", () => {
    // a sharp, uneven route: a 90 degree corner after a short leg
    const at = {
        a: { x: 0, y: 0, z: 0 },
        b: { x: 10, y: 0, z: 0 },
        c: { x: 10, y: 60, z: 5 },
        d: { x: 80, y: 70, z: 0 },
    };
    const ids = ["a", "b", "c", "d"];
    const out = arcRoute(at, ids, Math.PI / 3);
    assert.deepEqual(Object.keys(out).sort(), ["b", "c"]);
    const q = ids.map((id) => out[id] ?? at[id]);
    const legs = q.slice(1).map((p, i) => dist(p, q[i]));
    for (const l of legs) assert.ok(Math.abs(l - legs[0]) < 1e-9, `legs ${legs}`);
    const dir = (i) => unit({ x: q[i + 1].x - q[i].x, y: q[i + 1].y - q[i].y, z: q[i + 1].z - q[i].z });
    for (const i of [0, 1]) assert.ok(Math.abs(angle(dir(i), dir(i + 1)) - Math.PI / 9) < 1e-6);
    // bowed toward the side the middle airports were on (+y of the chord a-d)
    assert.ok(out.b.y - (70 / 80) * out.b.x > 0 && out.c.y - (70 / 80) * out.c.x > 0);
});

test("revealPoses ends over the latitude asked for", () => {
    const spot = { x: 10, y: 15, z: -17 };
    const o = { close: 4, pull: 12000, turn: 0, lat: 0.1 };
    const { p } = revealPoses(spot, { x: -20, y: 10, z: 12 }, o).poses.at(-1);
    assert.ok(Math.abs(Math.asin(p.y / Math.hypot(p.x, p.y, p.z)) - 0.1) < 1e-3);
});

test("stretch plays a stretch slower and keeps the poses before and after it", () => {
    const at = (x) => ({ p: { x, y: 0, z: 0 }, t: { x: x + 1, y: 0, z: 0 }, r: 0 });
    const poses = Array.from({ length: 11 }, (_, i) => at(i)); // 10 Hz, 1 s
    const out = stretch(poses, 10, 200, 400, 3);
    assert.equal(out.length, 15); // 1.4 s
    assert.equal(out[2].p.x, 2);
    assert.ok(Math.abs(out[5].p.x - 3) < 1e-9); // 300 ms into the stretch: 100 ms of the poses
    assert.ok(Math.abs(out[8].p.x - 4) < 1e-9);
    assert.equal(out.at(-1).p.x, 10);
});

test("scatter puts airports in the drawing's open spaces, apart from the rest, inside its extent", () => {
    // two tight lobes on the x axis, and five airports to scatter
    const at = {};
    for (let i = 0; i < 10; i++) {
        at[`a${i}`] = { x: -60 + (i % 3), y: (i % 2) * 2, z: 0 };
        at[`b${i}`] = { x: 60 - (i % 3), y: (i % 2) * 2, z: 0 };
    }
    for (let i = 0; i < 5; i++) at[`s${i}`] = { x: 60, y: 0, z: 0 };
    at.top = { x: 0, y: 40, z: 20 };
    const ids = ["s0", "s1", "s2", "s3", "s4"];
    const out = scatter(at, ids, 12);
    const placed = [];
    for (const id of ids) {
        const q = out[id];
        assert.ok(Math.abs(q.x) <= 62 && Math.abs(q.y) <= 40 && Math.abs(q.z) <= 20, `${id} outside`);
        for (const [other, p] of Object.entries(at))
            if (!ids.includes(other)) assert.ok(dist(q, p) >= 12, `${id} on ${other}`);
        for (const p of placed) assert.ok(dist(q, p) >= 12, `${id} on another scattered one`);
        placed.push(q);
    }
    assert.deepEqual(scatter(at, ids, 12), out);
});

test("the tree's framing only opens, moves smoothly, and frames each airport before it lands", () => {
    // a tree growing out in turn to the right, the left, up and far down
    const arrivals = [
        { t: 0, p: { x: 0, y: 0 } },
        { t: 3000, p: { x: 20, y: 2 } },
        { t: 5000, p: { x: -25, y: 0 } },
        { t: 6000, p: { x: -10, y: 18 } },
        { t: 6500, p: { x: 30, y: -10 } },
        { t: 6800, p: { x: 5, y: -60 } },
    ];
    const o = { fill: 0.8, least: 14, aspect: 2.5, ahead: 3000, sigma: 1000, drift: 0.01 };
    const { dt, half, x, y } = treeFraming(arrivals, o);
    for (let k = 1; k < half.length; k++) {
        assert.ok(half[k] >= half[k - 1], `closes in at ${k}`);
        // the middle never moves more than a tenth of the view in a tenth of a second
        assert.ok(Math.hypot(x[k] - x[k - 1], y[k] - y[k - 1]) < 0.1 * half[k], `jumps at ${k}`);
    }
    // the zoom's speed changes smoothly: never a step out as an airport falls due
    const speed = half.slice(1).map((h, k) => Math.log(h / half[k]));
    for (let k = 1; k < speed.length; k++)
        assert.ok(Math.abs(speed[k] - speed[k - 1]) < 0.01, `the zoom steps at ${k}`);
    for (const a of arrivals)
        for (let k = Math.round(a.t / dt); k < half.length; k++) {
            assert.ok(Math.abs(a.p.x - x[k]) <= half[k], `airport at ${a.t} off the side at ${k}`);
            assert.ok(Math.abs(a.p.y - y[k]) * o.aspect <= half[k], `airport at ${a.t} off the top or bottom at ${k}`);
        }
});

test("nearLens hides what a close-up sees behind its subject only when asked", () => {
    const poses = [{ p: { x: 0, y: 0, z: 0 }, t: { x: 0, y: 0, z: 2 }, r: 0 }];
    const others = [
        ["before", { x: 0, y: 0, z: 1 }],
        ["behind", { x: 10, y: 0, z: 70 }],
        ["aside", { x: 0, y: 0, z: -70 }],
    ];
    assert.deepEqual(nearLens(poses, others, 0, Infinity), ["before"]);
    assert.deepEqual(nearLens(poses, others, 0, Infinity, { cone: 0.9, behind: true }), ["before", "behind"]);
});
