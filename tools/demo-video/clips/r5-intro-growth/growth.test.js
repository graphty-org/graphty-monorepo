// Self-check of the growth intro's camera math: node --test tools/demo-video/clips/r5-intro-growth/growth.test.js
import assert from "node:assert/strict";
import test from "node:test";

import { principalAxes, sideFlight } from "./growth.js";

test("the widest spread comes first, the thinnest last", () => {
    const ps = [];
    for (let i = -10; i <= 10; i++) ps.push({ x: 0.1 * i, y: 5 * i, z: (i % 3) * 2 });
    const [a, , c] = principalAxes(ps);
    assert.ok(Math.abs(a.y) > 0.99);
    assert.ok(Math.abs(c.x) > 0.9);
});

test("the flight looks from the side nearest the wanted way, clear of the route", () => {
    const pts = [
        { x: 0, y: 0, z: 0 },
        { x: 10, y: 0, z: 0 },
        { x: 20, y: 0, z: 0 },
    ];
    const f = sideFlight(pts, { x: 1, y: 0, z: 1 }, [["near", { x: 5, y: 0, z: 34 }]], { radius: 34, clear: 6 });
    // straight out along +z: alpha pi/2, beta pi/2
    assert.ok(Math.abs(f.alpha - Math.PI / 2) < 1e-6);
    assert.ok(Math.abs(f.beta - Math.PI / 2) < 1e-6);
    assert.deepEqual(f.near, ["near"]);
});
