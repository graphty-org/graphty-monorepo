import { fromEdgeArrays, type GraphSnapshot } from "@graphty/graph-format";
import { afterEach, assert, describe, it, vi } from "vitest";

import * as layout from "../src";

/** A w x h grid, node i = y * w + x. */
function grid(w: number, h: number): GraphSnapshot {
    const src: number[] = [];
    const dst: number[] = [];
    for (let i = 0; i < w * h; i++) {
        if ((i % w) + 1 < w) {
            src.push(i);
            dst.push(i + 1);
        }
        if (i + w < w * h) {
            src.push(i);
            dst.push(i + w);
        }
    }
    return fromEdgeArrays({
        directed: false,
        nodeCount: w * h,
        src: Uint32Array.from(src),
        dst: Uint32Array.from(dst),
    });
}

const TRANSCENDENTALS = ["log", "exp", "sin", "cos", "tan", "acos", "asin", "atan", "atan2", "cbrt", "log1p", "expm1"];

/** Runs fn with every engine-approximated Math function replaced by one that throws. */
function withoutEngineMath<T>(fn: () => T): T {
    for (const name of TRANSCENDENTALS) {
        vi.spyOn(Math, name as "log").mockImplementation(() => {
            throw new Error(`Math.${name} called`);
        });
    }
    try {
        return fn();
    } finally {
        vi.restoreAllMocks();
    }
}

describe("engine-independent math in layouts", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("never calls an engine-approximated Math function in a layout", () => {
        const g = grid(4, 3);
        withoutEngineMath(() => {
            layout.forceAtlas2(g, { seed: 42, linlog: true, maxIter: 20 });
            layout.forceAtlas2(g, { seed: 42, linlog: true, maxIter: 20, dim: 3 });
            // every node on one point: the coincident kick
            layout.forceAtlas2(g, { pos: new Float32Array(24), maxIter: 2 });
            layout.forceAtlas2(g, { pos: new Float32Array(36), maxIter: 2, dim: 3 });
            layout.kamadaKawai(g);
            layout.kamadaKawai(g, { dim: 3, seed: 1 });
            layout.circular(g);
            layout.circular(g, { dim: 3 });
            layout.shell(g);
            layout.spiral(g);
            layout.spiral(g, { equidistant: true });
            layout.radial(g, { root: 0 });
            layout.radial(g, { root: 0, arrangement: "sectors" });
            layout.fruchtermanReingold(g, { seed: 42 });
        });
    });

    it("pins seeded ForceAtlas2 (LinLog) and Kamada-Kawai positions", () => {
        // Recorded with the engine-independent functions: no engine or engine upgrade may move them.
        const g = grid(4, 3);
        const fa2 = Array.from(layout.forceAtlas2(g, { seed: 42, linlog: true, maxIter: 50 }).positions);
        const kk = Array.from(layout.kamadaKawai(g).positions);
        assert.deepStrictEqual(fa2, FA2_LINLOG_SEED_42);
        assert.deepStrictEqual(kk, KAMADA_KAWAI_2D);
    });
});

const FA2_LINLOG_SEED_42 = [
    -0.14685086905956268, -0.9752542972564697, 0.2634741961956024, -0.6347725987434387, 0.6801734566688538,
    -0.1731354147195816, 0.9595178961753845, 0.2668447196483612, -0.5778079032897949, -0.6809089183807373,
    -0.14064905047416687, -0.1571016162633896, 0.15699982643127441, 0.18950125575065613, 0.5863067507743835,
    0.6774111986160278, -0.9494130611419678, -0.3140300214290619, -0.6834277510643005, 0.15834105014801025,
    -0.280283123254776, 0.652610182762146, 0.13195957243442535, 0.990494430065155,
];
const KAMADA_KAWAI_2D = [
    0.15304718911647797, 0.9882189035415649, -0.14336229860782623, 0.6268467307090759, 0.10229941457509995,
    0.09124709665775299, 0.3756265938282013, -0.42295530438423157, 0.3042566478252411, 0.5872517824172974,
    -0.21253782510757446, 0.2914789915084839, -0.3298026919364929, -0.14615927636623383, -0.03013192117214203,
    -0.6607033014297485, 0.5367798805236816, 0.1784767210483551, 0.04297040030360222, -0.1301720291376114,
    -0.4375787079334259, -0.47118404507637024, -0.3615666925907135, -0.9323462247848511,
];
