// Self-check of the growth intro's camera math: node --test tools/demo-video/clips/r5-intro-growth/growth.test.js
import assert from "node:assert/strict";
import test from "node:test";

import { flightPoses, lobes, principalAxes, revealPoses } from "./growth.js";

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
});
