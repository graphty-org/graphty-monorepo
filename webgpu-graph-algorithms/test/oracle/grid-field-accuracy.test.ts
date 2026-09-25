/**
 * The grid tier's far-field law against the exact pair law, on the CPU oracle of G1-G7 (no device; the GPU stages are
 * held to this oracle by grid-inspect.test.ts and to the exact tier by grid-exact.test.ts):
 *
 * - issue #89: a far-field cell term for ForceAtlas2 (LAW 0) never uses a distance below the 0.01 floor of the exact
 *   tier and the near field. On a fine grid (cellSize < 0.01) a far cell can sit closer than the floor, and the
 *   unfloored term was larger than the exact tier's by the ratio floor^2 / d^2.
 * - issue #90: outside nodes are aggregated per orthant of the grid centre, so two outlier groups on opposite sides
 *   each push the core from their own side instead of from a merged centroid in the middle of the grid where no node
 *   is. The core's grid force stays within the grid-exact tolerances of the exact force.
 */

import { FA2_DISTANCE_FLOOR_SQ } from "../../src/constants.js";
import { gridSpecFor } from "../../src/primitives/grid.js";
import { gridTolerance, opposingOutliers } from "../helpers/grid-parity.js";
import { flooredRelError } from "../helpers/matchers.js";
import { gridOracleBuild, type GridOracleInput } from "./grid.js";
import { gridOracleFarField, gridOracleK1, gridOracleNearField } from "./grid-field.js";
import { gridOraclePyramid } from "./grid-pyramid.js";

const TUNING = { gridMax2D: 512, gridMax3D: 128, deterministic: true } as const;
const WG = 256;
const SCALING_RATIO = 2;
/** Every cell sums exactly in the near field (no sampling), so the only approximation is the far field's. */
const NO_SAMPLING = 1 << 30;

/**
 * The f64 exact FA2 repulsion of every node (k m_i m_j / d with the 0.01 floor; no node here is coincident).
 * @param positions - stride 4 (xyz, mass)
 * @param n - the node count
 * @returns stride-3 forces
 */
function exactRepulsion(positions: Float32Array, n: number): Float64Array {
    const out = new Float64Array(3 * n);
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            if (j === i) {
                continue;
            }
            const d = [0, 1, 2].map((a) => positions[4 * i + a] - positions[4 * j + a]);
            const d2 = Math.max(d[0] * d[0] + d[1] * d[1] + d[2] * d[2], FA2_DISTANCE_FLOOR_SQ);
            const k = (SCALING_RATIO * positions[4 * i + 3] * positions[4 * j + 3]) / d2;
            for (let a = 0; a < 3; a++) {
                out[3 * i + a] += d[a] * k;
            }
        }
    }
    return out;
}

/**
 * The grid oracle's far + near field of every node under K1's own frame (extent factor 6).
 * @param positions - stride 4 (xyz, mass), f32
 * @param n - the node count
 * @param dim - 2 or 3
 * @returns stride-3 forces and the number of outside nodes
 */
function gridRepulsion(
    positions: Float32Array,
    n: number,
    dim: 2 | 3,
): { readonly force: Float64Array; readonly outside: number } {
    const min: [number, number, number] = [Infinity, Infinity, Infinity];
    const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
    const centroid: [number, number, number] = [0, 0, 0];
    for (let i = 0; i < n; i++) {
        for (let a = 0; a < 3; a++) {
            min[a] = Math.min(min[a], positions[4 * i + a]);
            max[a] = Math.max(max[a], positions[4 * i + a]);
            centroid[a] += positions[4 * i + a] / n;
        }
    }
    let r2 = 0;
    for (let i = 0; i < n; i++) {
        for (let a = 0; a < 3; a++) {
            r2 += (positions[4 * i + a] - centroid[a]) ** 2;
        }
    }
    const spec = gridSpecFor(n, dim, TUNING);
    const frame = gridOracleK1({ min, max, centroid, rmsRadius: Math.sqrt(r2 / n) }, spec, 6);
    const input: GridOracleInput = { positions, n, spec, gridMin: frame.gridMin, invCellSize: frame.invCellSize };
    const build = gridOracleBuild(input);
    const params = { scalingRatio: SCALING_RATIO, eps: frame.eps, nearMax: NO_SAMPLING, iterationIndex: 0, seed: 0 };
    const far = gridOracleFarField(input, gridOraclePyramid(build, input, WG), params);
    const near = gridOracleNearField(input, build, params);
    return { force: far.map((v, k) => v + near[k]), outside: build.outside };
}

describe("the grid far field against the exact pair law (CPU oracle)", () => {
    it("issue #89: a far cell closer than the 0.01 floor gives the floored FA2 magnitude, as the exact tier does", () => {
        // G = 8 (levels 2) with cellSize 0.001: node 0 in cell (0, 0), node 1 in cell (4, 0), two coarsest cells away,
        // so their pair is a far-field term at d = 0.004, inside the 0.01 floor
        const spec = gridSpecFor(2, 2, TUNING);
        expect(spec.g).toBe(8);
        const positions = Float32Array.from([0.0005, 0.0005, 0, 1, 0.0045, 0.0005, 0, 1]);
        const input: GridOracleInput = { positions, n: 2, spec, gridMin: [0, 0, 0], invCellSize: 1000 };
        const build = gridOracleBuild(input);
        const eps = 0.25 * 0.001;
        const far = gridOracleFarField(input, gridOraclePyramid(build, input, WG), {
            scalingRatio: SCALING_RATIO,
            eps,
            nearMax: NO_SAMPLING,
            iterationIndex: 0,
            seed: 0,
        });
        const d = -0.004;
        const want = (d * SCALING_RATIO) / (FA2_DISTANCE_FLOOR_SQ + eps * eps);
        expect(far[0] / want).toBeCloseTo(1, 6); // the f32 positions: d is 0.004 to 1e-8
        expect(far[1]).toBe(0);
    });

    for (const dim of [2, 3] as const) {
        it(`issue #90 (${dim}D): a core with two outlier groups on opposite sides stays within grid-exact.rms / grid-exact.p99 of the exact force`, () => {
            const { core, start } = opposingOutliers(dim);
            const n = start.length / 3;
            const positions = new Float32Array(4 * n);
            for (let i = 0; i < n; i++) {
                positions.set([start[3 * i], start[3 * i + 1], start[3 * i + 2], 1], 4 * i);
            }
            const grid = gridRepulsion(positions, n, dim);
            expect(grid.outside, "both outlier groups are outside the grid").toBe(n - core);
            const exact = exactRepulsion(positions, n);
            const err = flooredRelError(grid.force.subarray(0, 3 * core), exact.subarray(0, 3 * core), 1e-3);
            const rms = gridTolerance("grid-exact.rms").value;
            const p99 = gridTolerance("grid-exact.p99").value;
            console.warn(`[grid-field-accuracy] outliers ${dim}D: core rms ${err.rms.toExponential(3)}, p99 ${err.p99.toExponential(3)}`);
            expect(err.rms, `core rms (tolerance ${rms})`).toBeLessThan(rms);
            expect(err.p99, `core p99 (tolerance ${p99})`).toBeLessThan(p99);
        });
    }
});
