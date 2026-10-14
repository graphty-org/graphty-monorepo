import { fromEdgeArrays, type GraphSnapshot } from "@graphty/graph-format";
import { afterEach, assert, describe, it, vi } from "vitest";

import * as layout from "../src";
import { detAcos, detCos, detLog, detSin } from "../src/utils/det-math";

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

const view = new DataView(new ArrayBuffer(16));

/** The distance in units in the last place between two doubles of the same sign. */
function ulps(a: number, b: number): number {
    view.setFloat64(0, a);
    view.setFloat64(8, b);
    const d = view.getBigInt64(0) - view.getBigInt64(8);
    return Number(d < 0n ? -d : d);
}

/**
 * A fixed sequence of doubles in [0, 1), the same in every engine.
 * @param count - how many
 * @yields the next double
 */
function* uniform(count: number): Generator<number> {
    let x = 12345;
    for (let i = 0; i < count; i++) {
        x = (Math.imul(x, 1103515245) + 12345) >>> 0;
        yield x / 4294967296;
    }
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

describe("engine-independent math", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("stays within 1 ulp of Math over wide ranges", () => {
        // fdlibm's error bound; in an engine that uses fdlibm (Node 22, Chromium 143) the results are identical
        const cases: [string, (x: number) => number, (x: number) => number, (u: number) => number][] = [
            ["log", detLog, Math.log, (u) => 10 ** (-300 + 600 * u)],
            ["log", detLog, Math.log, (u) => 1 + 100 * u],
            ["sin", detSin, Math.sin, (u) => (2 * u - 1) * 1e5],
            ["cos", detCos, Math.cos, (u) => (2 * u - 1) * 1e5],
            ["sin", detSin, Math.sin, (u) => (2 * u - 1) * 7],
            ["cos", detCos, Math.cos, (u) => (2 * u - 1) * 7],
            ["acos", detAcos, Math.acos, (u) => 2 * u - 1],
        ];
        for (const [name, det, ref, gen] of cases) {
            for (const u of uniform(10000)) {
                const x = gen(u);
                const a = det(x);
                const b = ref(x);
                assert.isAtMost(ulps(a, b), 1, `${name}(${x}): ${a} vs ${b}`);
            }
        }
    });

    it("handles the special values", () => {
        assert.strictEqual(detLog(0), -Infinity);
        assert.isNaN(detLog(-1));
        assert.isNaN(detLog(Number.NaN));
        assert.strictEqual(detLog(Infinity), Infinity);
        assert.strictEqual(detLog(1), 0);
        assert.strictEqual(detLog(Number.MIN_VALUE), Math.log(Number.MIN_VALUE));
        assert.isNaN(detSin(Infinity));
        assert.isNaN(detCos(Number.NaN));
        assert.strictEqual(detSin(-0), -0);
        assert.strictEqual(detCos(0), 1);
        assert.isTrue(Number.isFinite(detSin(1e300)) && Math.abs(detSin(1e300)) <= 1);
        assert.strictEqual(detAcos(1), 0);
        assert.strictEqual(detAcos(-1), Math.PI);
        assert.isNaN(detAcos(1.5));
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
