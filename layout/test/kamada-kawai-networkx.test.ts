import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { assert, describe, it } from "vitest";

import { kamadaKawaiLayout } from "../src";

interface Fixture {
    networkx: string;
    nodes: (string | number)[];
    edges: [string | number, string | number, number][];
    /** networkx's 2D layout from its circular start. */
    positions: number[][];
    /** 3D only: networkx starts from an unseeded random layout, so each run records its start. */
    runs: { start: number[][]; positions: number[][] }[];
}

// Located from the working directory, as the ForceAtlas2 fixtures are: this package's vitest
// environment is happy-dom, which rewrites import.meta.url.
const load = (name: string): Fixture =>
    JSON.parse(
        readFileSync(resolve(process.cwd(), "test/fixtures/networkx", `kamada-kawai-${name}.json`), "utf8"),
    ) as Fixture;

/**
 * Procrustes disparity between two layouts of any dimension, as scipy.spatial.procrustes reports
 * it: 0 when one is the other rotated, reflected, scaled and moved, 1 when they share nothing. A
 * Kamada-Kawai cost is unchanged by all four, so this is the distance that means something here.
 */
function disparity(a: number[][], b: number[][]): number {
    const dim = a[0].length;
    const normalise = (p: number[][]): number[][] => {
        const mean = [...Array(dim).keys()].map((k) => p.reduce((s, v) => s + v[k], 0) / p.length);
        const c = p.map((v) => v.map((x, k) => x - mean[k]));
        const norm = Math.sqrt(c.reduce((s, v) => s + v.reduce((t, x) => t + x * x, 0), 0));
        return c.map((v) => v.map((x) => x / norm));
    };
    const [p, q] = [normalise(a), normalise(b)];
    // The nuclear norm of M = p^T q -- the best rotation or reflection -- is the sum of the square
    // roots of the eigenvalues of the symmetric M^T M, found here by cyclic Jacobi rotations.
    const m = [...Array(dim).keys()].map((r) =>
        [...Array(dim).keys()].map((c) => p.reduce((s, v, i) => s + v[r] * q[i][c], 0)),
    );
    const s = m.map((_, r) => m.map((_, c) => m.reduce((t, row) => t + row[r] * row[c], 0)));
    for (let sweep = 0; sweep < 50; sweep++) {
        for (let i = 0; i < dim; i++) {
            for (let j = i + 1; j < dim; j++) {
                if (Math.abs(s[i][j]) < 1e-300) {
                    continue;
                }
                const theta = 0.5 * Math.atan2(2 * s[i][j], s[j][j] - s[i][i]);
                const [cos, sin] = [Math.cos(theta), Math.sin(theta)];
                for (const row of s) {
                    [row[i], row[j]] = [cos * row[i] - sin * row[j], sin * row[i] + cos * row[j]];
                }
                for (let k = 0; k < dim; k++) {
                    [s[i][k], s[j][k]] = [cos * s[i][k] - sin * s[j][k], sin * s[i][k] + cos * s[j][k]];
                }
            }
        }
    }
    const nuclear = s.reduce((t, row, k) => t + Math.sqrt(Math.max(row[k], 0)), 0);
    return 1 - nuclear * nuclear;
}

function layoutOf(fixture: Fixture, start?: number[][]): number[][] {
    const distance = new Map(fixture.edges.map(([u, v, d]) => [JSON.stringify([u, v]), d]));
    const graph = {
        nodes: () => fixture.nodes,
        edges: () => fixture.edges.map(([u, v]) => [u, v]),
        getEdgeData: (u: string | number, v: string | number) =>
            distance.get(JSON.stringify([u, v])) ?? distance.get(JSON.stringify([v, u])),
    };
    const pos = start
        ? kamadaKawaiLayout(
              graph as never,
              null,
              Object.fromEntries(fixture.nodes.map((n, i) => [n, start[i]])),
              "distance",
              1,
              null,
              3,
          )
        : kamadaKawaiLayout(graph as never, null, null, "distance");
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

    // In 3D the minima crowd closer still: networkx moves by up to 0.15 from its own layout when its
    // start is nudged by 1% noise. So no single start says much, and the port is held to networkx
    // over ten recorded starts instead. It lands on networkx's own layout (disparity below 0.001)
    // from five of them and reads 0.010, 0.026, 0.030, 0.070 and 0.167 from the rest: neighbouring
    // minima whose cost is within 3% of networkx's, in either direction.
    it("draws networkx's 3D layouts of karate from networkx's own random starts", () => {
        const fixture = load("karate-3d");
        const ds = fixture.runs
            .map((run) => disparity(run.positions, layoutOf(fixture, run.start)))
            .sort((a, b) => a - b);
        const detail = ds.map((d) => d.toFixed(3)).join(", ");

        assert.isAtLeast(ds.filter((d) => d < 1e-3).length, 4, `disparities ${detail}`);
        assert.isBelow(ds[Math.floor(ds.length / 2)], TOLERANCE, `median of ${detail}`);
    });

    it("measures a rotated, reflected, scaled copy as identical and a shuffled one as not", () => {
        const { positions } = load("karate-unweighted");
        const turned = positions.map(([x, y]) => [3 * (0.6 * x - 0.8 * y) + 5, -3 * (0.8 * x + 0.6 * y)]);
        const shuffled = positions.map((_, i) => positions[(i * 7) % positions.length]);

        assert.isBelow(disparity(positions, turned), 1e-12);
        assert.isAbove(disparity(positions, shuffled), 0.3);
    });

    it("measures a turned 3D copy as identical and a shuffled one as not", () => {
        const { positions } = load("karate-3d").runs[0];
        // A rotation about z followed by a rotation about x, then a reflection of y.
        const turned = positions.map(([x, y, z]) => {
            const [x1, y1] = [0.6 * x - 0.8 * y, 0.8 * x + 0.6 * y];
            return [2 * x1 + 1, -2 * (0.28 * y1 - 0.96 * z), 2 * (0.96 * y1 + 0.28 * z) - 4];
        });
        const shuffled = positions.map((_, i) => positions[(i * 7) % positions.length]);

        assert.isBelow(disparity(positions, turned), 1e-12);
        assert.isAbove(disparity(positions, shuffled), 0.3);
    });
});
