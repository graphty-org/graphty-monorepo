// Checks of the layout quality measures (quality.js) on drawings whose answer is known.
//   node --test benchmarks/compare/quality.test.mjs
import assert from "node:assert/strict";
import { test } from "node:test";

import { layoutQuality, nearest } from "./quality.js";

/** A path 0-1-2-...-(n-1). */
function path(n) {
    const src = new Uint32Array(n - 1),
        dst = new Uint32Array(n - 1);
    for (let i = 0; i < n - 1; i++) {
        src[i] = i;
        dst[i] = i + 1;
    }
    return { n, src, dst };
}

test("a path drawn on a line, evenly spaced, is a perfect drawing", () => {
    const g = path(50);
    const p = new Float32Array(3 * g.n);
    for (let i = 0; i < g.n; i++) p[3 * i] = 7 * i; // any scale
    const q = layoutQuality(g, p, { samples: 50 });
    assert.ok(q.stress < 1e-9, `stress ${q.stress}`);
    assert.ok(q.edgeSpread < 1e-6, `edge spread ${q.edgeSpread}`);
    assert.equal(q.neighborhood, 1);
    assert.equal(q.silhouette, null);
});

test("the same path drawn at random scores worse on every measure", () => {
    const g = path(200);
    const p = new Float32Array(3 * g.n);
    let s = 3;
    for (let i = 0; i < 2 * g.n; i++) {
        s = (s * 16807) % 2147483647;
        p[3 * Math.floor(i / 2) + (i % 2)] = s / 2147483647;
    }
    const q = layoutQuality(g, p);
    assert.ok(q.stress > 0.1, `stress ${q.stress}`);
    assert.ok(q.edgeSpread > 0.2, `edge spread ${q.edgeSpread}`);
    assert.ok(q.neighborhood < 0.5, `neighborhood ${q.neighborhood}`);
});

test("two cliques drawn far apart are separated; drawn on top of each other they are not", () => {
    const k = 10,
        n = 2 * k;
    const src = [],
        dst = [];
    const edge = (a, b) => {
        src.push(a);
        dst.push(b);
    };
    for (let c = 0; c < 2; c++) for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) edge(c * k + i, c * k + j);
    edge(0, k); // one bridge, so the graph is connected
    const community = Uint32Array.from({ length: n }, (_, i) => (i < k ? 0 : 1));
    const g = { n, src: Uint32Array.from(src), dst: Uint32Array.from(dst), community };
    const apart = new Float32Array(3 * n),
        mixed = new Float32Array(3 * n);
    for (let i = 0; i < n; i++) {
        const angle = (2 * Math.PI * (i % k)) / k;
        apart[3 * i] = Math.cos(angle) + (i < k ? 0 : 100);
        apart[3 * i + 1] = Math.sin(angle);
        mixed[3 * i] = Math.cos(angle + (i < k ? 0 : Math.PI / k));
        mixed[3 * i + 1] = Math.sin(angle + (i < k ? 0 : Math.PI / k));
    }
    const a = layoutQuality(g, apart, { samples: n }),
        m = layoutQuality(g, mixed, { samples: n });
    assert.ok(a.silhouette > 0.9, `apart silhouette ${a.silhouette}`);
    assert.equal(a.purity, 0.9); // 9 of a node's 10 nearest are its own clique, the 10th the other clique's nearest
    assert.ok(m.silhouette < 0.1, `mixed silhouette ${m.silhouette}`);
    assert.ok(m.purity < 0.6, `mixed purity ${m.purity}`);
});

test("nearest returns the k smallest, nearest first", () => {
    const d = Float64Array.from([5, 1, 4, 0, 3, 2, 9]);
    assert.deepEqual(nearest(d, 3), [3, 1, 5]);
    assert.deepEqual(nearest(d, 0), []);
});
