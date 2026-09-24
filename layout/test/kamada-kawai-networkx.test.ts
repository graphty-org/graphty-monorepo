import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { assert, describe, it } from "vitest";

import { kamadaKawaiLayout } from "../src";

interface Fixture {
    networkx: string;
    nodes: (string | number)[];
    edges: [string | number, string | number, number][];
    positions: [number, number][];
}

// Located from the working directory, as the ForceAtlas2 fixtures are: this package's vitest
// environment is happy-dom, which rewrites import.meta.url.
const load = (name: string): Fixture =>
    JSON.parse(
        readFileSync(resolve(process.cwd(), "test/fixtures/networkx", `kamada-kawai-${name}.json`), "utf8"),
    ) as Fixture;

/**
 * Procrustes disparity between two 2D layouts, as scipy.spatial.procrustes reports it: 0 when one
 * is the other rotated, reflected, scaled and moved, 1 when they share nothing. A Kamada-Kawai
 * cost is unchanged by all four, so this is the distance that means something here.
 */
function disparity(a: number[][], b: number[][]): number {
    const normalise = (p: number[][]): number[][] => {
        const mx = p.reduce((s, v) => s + v[0], 0) / p.length;
        const my = p.reduce((s, v) => s + v[1], 0) / p.length;
        const c = p.map((v) => [v[0] - mx, v[1] - my]);
        const norm = Math.sqrt(c.reduce((s, v) => s + v[0] * v[0] + v[1] * v[1], 0));
        return c.map((v) => [v[0] / norm, v[1] / norm]);
    };
    const [p, q] = [normalise(a), normalise(b)];
    let m00 = 0,
        m01 = 0,
        m10 = 0,
        m11 = 0;
    for (let i = 0; i < p.length; i++) {
        m00 += p[i][0] * q[i][0];
        m01 += p[i][0] * q[i][1];
        m10 += p[i][1] * q[i][0];
        m11 += p[i][1] * q[i][1];
    }
    // The sum of a 2x2 matrix's singular values: the best rotation, or the best reflection.
    const nuclear = Math.max(Math.hypot(m00 + m11, m10 - m01), Math.hypot(m00 - m11, m10 + m01));
    return 1 - nuclear * nuclear;
}

function layoutOf(fixture: Fixture): number[][] {
    const distance = new Map(fixture.edges.map(([u, v, d]) => [JSON.stringify([u, v]), d]));
    const graph = {
        nodes: () => fixture.nodes,
        edges: () => fixture.edges.map(([u, v]) => [u, v]),
        getEdgeData: (u: string | number, v: string | number) =>
            distance.get(JSON.stringify([u, v])) ?? distance.get(JSON.stringify([v, u])),
    };
    const pos = kamadaKawaiLayout(graph as never, null, null, "distance");
    return fixture.nodes.map((n) => pos[n]);
}

describe("Kamada-Kawai against networkx", () => {
    // The Kamada-Kawai cost has many local minima, so even networkx does not always return ITS OWN
    // layout: nudging its circular start by 1% noise moves karate by up to 0.06 (0.021, 0.043 and
    // 0.061 in ten runs) and Les Miserables by up to 0.011. The port reads 0.021 on karate -- a
    // converged neighbouring minimum, cost 38.17 against networkx's 37.94 -- and 0.000 on Les
    // Miserables. The port before its L-BFGS fix read 0.45 on karate and 0.998 on Les Miserables.
    const TOLERANCE = 0.05;

    for (const name of ["karate-unweighted", "lesmis-weighted"]) {
        it(`draws networkx's layout of ${name}`, () => {
            const fixture = load(name);
            const d = disparity(fixture.positions, layoutOf(fixture));

            assert.isBelow(d, TOLERANCE, `disparity ${d.toFixed(4)} from networkx ${fixture.networkx}`);
        });
    }

    it("measures a rotated, reflected, scaled copy as identical and a shuffled one as not", () => {
        const { positions } = load("karate-unweighted");
        const turned = positions.map(([x, y]) => [3 * (0.6 * x - 0.8 * y) + 5, -3 * (0.8 * x + 0.6 * y)]);
        const shuffled = positions.map((_, i) => positions[(i * 7) % positions.length]);

        assert.isBelow(disparity(positions, turned), 1e-12);
        assert.isAbove(disparity(positions, shuffled), 0.3);
    });
});
