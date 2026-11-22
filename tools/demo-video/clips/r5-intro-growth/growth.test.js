// Self-check of the growth intro's camera math: node --test tools/demo-video/clips/r5-intro-growth/growth.test.js
import assert from "node:assert/strict";
import test from "node:test";

import { bendOut, flatPlaces, flightPoses, govern, lobes, principalAxes, revealPoses, stretch } from "./growth.js";

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const unit = (a) => {
    const l = Math.hypot(a.x, a.y, a.z);
    return { x: a.x / l, y: a.y / l, z: a.z / l };
};
const angle = (a, b) => Math.acos(Math.min(1, a.x * b.x + a.y * b.y + a.z * b.z));

test("a bend opened out puts its middle airport halfway, on the outside, apart from both ends", () => {
    const at = (x, y, z) => ({ position: { x, y, z } });
    const byId = new Map([
        ["a", at(-20, 0, 0)],
        ["b", at(0, 0, 0)],
        ["c", at(1, 0.5, 0)],
        ["d", at(0, -10, 0)],
    ]);
    bendOut(byId, ["a", "b", "c", "d"], 6);
    const c = byId.get("c").position;
    assert.ok(Math.abs(c.y + 5) < 1e-9 && Math.abs(c.x - 6) < 1e-9 && c.z === 0);
    assert.ok(dist(c, byId.get("b").position) > 7 && dist(c, byId.get("d").position) > 7);
});

test("the widest spread comes first, the thinnest last", () => {
    const ps = [];
    for (let i = -10; i <= 10; i++) ps.push({ x: 0.1 * i, y: 5 * i, z: (i % 3) * 2 });
    const [a, , c] = principalAxes(ps);
    assert.ok(Math.abs(a.y) > 0.99);
    assert.ok(Math.abs(c.x) > 0.9);
});

test("communities are drawn apart, each tighter round its middle, within the span", () => {
    const ps = [];
    for (let i = 0; i < 20; i++) ps.push([`a${i}`, { x: -2 + (i % 5), y: i % 3, z: 0 }, 0]);
    for (let i = 0; i < 20; i++) ps.push([`b${i}`, { x: 2 + (i % 5), y: i % 3, z: 0 }, 1]);
    const at = lobes(ps, 90);
    const mid = (g) => {
        const qs = ps.filter((x) => x[2] === g).map(([id]) => at[id]);
        return qs.reduce((s, q) => ({ x: s.x + q.x / qs.length, y: s.y + q.y / qs.length, z: 0 }), {
            x: 0,
            y: 0,
            z: 0,
        });
    };
    const spread = (g) => Math.max(...ps.filter((x) => x[2] === g).map(([id]) => dist(at[id], mid(g))));
    assert.ok(dist(mid(0), mid(1)) > 2 * spread(0));
    assert.ok(Math.max(...Object.values(at).map((p) => Math.hypot(p.x, p.y, p.z))) <= 45 + 1e-9);
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

test("the flight passes beside every airport, turns gently and arrives along the close-up's normal", () => {
    const pts = [
        { x: 0, y: 0, z: 0 },
        { x: 30, y: 5, z: 0 },
        { x: 50, y: 0, z: 25 },
        { x: 85, y: -5, z: 30 },
    ];
    const normal = unit({ x: 0.3, y: 1, z: -0.4 });
    const o = { ms: 18000, hold: 3000, close: 4.6, clear: 5.5, normal, from: { x: -50, y: 40, z: -60 } };
    const { poses, hz, vEnd, dir } = flightPoses(pts, o);
    assert.equal(poses.length, 21 * hz + 1);
    // no jumps: never more than a fraction of a unit a frame
    for (let i = 1; i < poses.length; i++) assert.ok(dist(poses[i].p, poses[i - 1].p) < 0.6);
    // clear of every airport on the way (the marbles pass beside the lens, never through it)
    for (const q of pts.slice(0, -1)) {
        const least = Math.min(...poses.map(({ p }) => dist(p, q)));
        assert.ok(least > 0.7 * o.clear && least < 2 * o.clear, `passes ${least.toFixed(2)} from an airport`);
    }
    // the look turns at most 0.22 rad a second of take (twice that in the slow approach), the roll under 10 degrees
    for (let i = 1; i < poses.length; i++) {
        const f = (q) => unit({ x: q.t.x - q.p.x, y: q.t.y - q.p.y, z: q.t.z - q.p.z });
        assert.ok(angle(f(poses[i]), f(poses[i - 1])) * hz < 0.45, `turns fast at pose ${i}`);
        assert.ok(Math.abs(poses[i].r) <= 0.175);
    }
    // the close-up: looking at the last airport from `dir`, within the cone round `normal`, creeping in, level
    const end = poses.at(-1);
    const back = unit({ x: end.p.x - pts[3].x, y: end.p.y - pts[3].y, z: end.p.z - pts[3].z });
    assert.ok(dist(end.t, pts[3]) < 1e-3);
    assert.ok(angle(back, dir) < 1e-3);
    assert.ok(angle(dir, normal) <= 0.6 + 1e-6);
    assert.ok(Math.abs(dist(end.p, pts[3]) - (4.6 - 3 * vEnd)) < 0.01);
    assert.equal(end.r, 0);
    // each airport on the way comes up front in turn: near the middle of the frame and growing
    for (const q of pts.slice(0, -1)) {
        const front = poses.filter(({ p, t }) => {
            const f = unit({ x: t.x - p.x, y: t.y - p.y, z: t.z - p.z });
            return angle(f, unit({ x: q.x - p.x, y: q.y - p.y, z: q.z - p.z })) < 0.15 && dist(p, q) < 4 * o.clear;
        });
        assert.ok(front.length > 0.3 * hz, `airport at ${JSON.stringify(q)} is never up front`);
    }
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
    // clearly pulling back a twentieth of the way into the pull (over a tenth farther out)
    const at = poses[Math.round(((1000 + 0.05 * 12000) * 60) / 1000)];
    assert.ok(dist(at.p, spot) > 1.15 * dist(poses[60].p, spot));
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

test("govern slows the camera where an airport sweeps past, and hurries it where there is none", () => {
    // 60 Hz, 4 s: the camera runs along x, looking ahead, past an airport 4 units to its side at x = 20
    const run = (side) =>
        Array.from({ length: 241 }, (_, i) => {
            const x = i / 6;
            return { p: { x, y: 0, z: 0 }, t: { x: x + 10, y: 0, z: side }, r: 0 };
        });
    const pts = [{ x: 20, y: 0, z: 4 }];
    const slow = govern(run(0), 60, pts, { maxSlide: 0.5, maxSlow: 4 });
    assert.ok(slow.poses.length > 290);
    assert.equal(slow.poses[0].p.x, 0);
    assert.ok(Math.abs(slow.poses.at(-1).p.x - 40) < 1e-6);
    // slowed round the pass, not before it
    assert.ok(Math.abs(slow.at(500) - 500) < 20);
    assert.ok(slow.at(3000) - slow.at(1000) > 2600);
    // nothing slows when the limit is never reached
    assert.equal(govern(run(0), 60, pts, { maxSlide: 5 }).poses.length, 241);
    // looking away from it, nothing is ever in the frame: the whole run plays twice as fast
    const fast = govern(run(-1e4), 60, pts, { fast: 0.5 });
    assert.ok(Math.abs(fast.poses.length - 121) <= 1);
});
