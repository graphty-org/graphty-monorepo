/**
 * Random hyperbolic graphs (D. Krioukov, F. Papadopoulos, M. Kitsak, A. Vahdat and M. Boguna,
 * "Hyperbolic geometry of complex networks", Phys. Rev. E 82, 036106, 2010,
 * doi:10.1103/PhysRevE.82.036106): power-law degrees, high clustering and a native 2D embedding.
 */

import { detExp } from "../random/exp.js";
import { detLog } from "../random/log.js";
import { RandomStream, resolveSeed } from "../random/stream.js";
import { detCosSinTurn } from "../random/trig.js";
import { type SampleGraph } from "../types.js";
import { checkInt, EdgeBuffer, toGraph } from "./util.js";
import { applyWeights, type WeightOptions } from "./weights.js";

/** The largest node count of the O(n^2) pair loop. */
const MAX_NODES = 20000;

/** Options of {@link hyperbolicGraph}. */
export interface HyperbolicOptions extends WeightOptions {
    /** The node count, in [0, 20000]. */
    n: number;
    /** The target mean degree, a finite number > 0 (approximate: see {@link hyperbolicGraph}). */
    averageDegree: number;
    /** The power-law exponent gamma of the degree distribution, a finite number > 2. */
    exponent: number;
    /** The temperature T in [0, 1); 0 (default) is the threshold model, higher T lowers clustering. */
    temperature?: number | undefined;
    /** The seed, an integer in [0, 2^53); default 0. */
    seed?: number | undefined;
}

/** The checked options, the disk radius and the points. */
interface HyperbolicPlan {
    readonly n: number;
    readonly seed: number;
    readonly temperature: number;
    /** The disk radius R. */
    readonly R: number;
    readonly coshR: number;
    readonly cosT: Float64Array<ArrayBuffer>;
    readonly sinT: Float64Array<ArrayBuffer>;
    readonly coshr: Float64Array<ArrayBuffer>;
    readonly sinhr: Float64Array<ArrayBuffer>;
    readonly x: Float64Array<ArrayBuffer>;
    readonly y: Float64Array<ArrayBuffer>;
    readonly radius: Float64Array<ArrayBuffer>;
}

/**
 * cosh(x) from detExp.
 * @param x - the argument
 * @returns cosh x
 */
function cosh(x: number): number {
    return (detExp(x) + detExp(-x)) / 2;
}

/**
 * acosh(y) for y >= 1 from detLog.
 * @param y - the argument
 * @returns acosh y
 */
function acosh(y: number): number {
    return detLog(y + Math.sqrt((y - 1) * (y + 1)));
}

/**
 * Check the options, compute the disk radius and draw the points.
 * @param options - the options
 * @returns the plan
 */
export function planHyperbolic(options: HyperbolicOptions): HyperbolicPlan {
    const { n, averageDegree, exponent } = options;
    const temperature = options.temperature ?? 0;
    checkInt("n", n, 0, MAX_NODES);
    if (!(Number.isFinite(averageDegree) && averageDegree > 0)) {
        throw new RangeError(`averageDegree must be a finite number > 0, got ${String(averageDegree)}`);
    }
    if (!(Number.isFinite(exponent) && exponent > 2)) {
        throw new RangeError(`exponent must be a finite number > 2, got ${String(exponent)}`);
    }
    if (!(temperature >= 0 && temperature < 1)) {
        throw new RangeError(`temperature must be in [0, 1), got ${String(temperature)}`);
    }
    const seed = resolveSeed(options.seed);

    const alpha = (exponent - 1) / 2;
    const xi = alpha / (alpha - 0.5);
    let correction = 1;
    if (temperature > 0) {
        const cs = new Float64Array(2);
        detCosSinTurn(temperature / 2, cs);
        correction = (Math.PI * temperature) / cs[1];
    }
    const scale = ((2 * xi * xi * n) / (Math.PI * averageDegree)) * correction;
    if (n >= 2 && !(scale > 1)) {
        throw new RangeError(`averageDegree ${averageDegree} is too large for n = ${n}: the disk radius would be <= 0`);
    }
    const R = n >= 2 ? 2 * detLog(scale) : 0;
    const coshAlphaR = cosh(alpha * R);
    if (!Number.isFinite(coshAlphaR)) {
        throw new RangeError(`exponent ${exponent} is too large: cosh(alpha R) overflows`);
    }

    const cosT = new Float64Array(n);
    const sinT = new Float64Array(n);
    const coshr = new Float64Array(n);
    const sinhr = new Float64Array(n);
    const x = new Float64Array(n);
    const y = new Float64Array(n);
    const radius = new Float64Array(n);
    const cs = new Float64Array(2);
    const stream = new RandomStream(seed, "hyperbolic-points", 0);
    for (let i = 0; i < n; i++) {
        stream.reset(i);
        detCosSinTurn(stream.nextFloat(), cs);
        const r = acosh(1 + (coshAlphaR - 1) * stream.nextFloat()) / alpha;
        const er = detExp(r);
        cosT[i] = cs[0];
        sinT[i] = cs[1];
        coshr[i] = (er + 1 / er) / 2;
        sinhr[i] = (er - 1 / er) / 2;
        radius[i] = r;
        x[i] = r * cs[0];
        y[i] = r * cs[1];
    }
    return { n, seed, temperature, R, coshR: cosh(R), cosT, sinT, coshr, sinhr, x, y, radius };
}

/**
 * Rows [start, end) of the hyperbolic graph: row u holds the pairs (u, v), v = u + 1 .. n - 1 in
 * ascending v, with cosh d = cosh r_u cosh r_v - sinh r_u sinh r_v cos(theta_u - theta_v) (the
 * cosine of the angle difference expanded from the stored cosines and sines). At T = 0 the pair is
 * an edge iff cosh d < cosh R (no draws). At T > 0 row u draws one nextFloat() t per pair from
 * stream (seed, "hyperbolic", u) and the pair is an edge iff t < 1 / (1 + exp((d - R) / (2 T))),
 * decided as acosh(cosh d) < R + 2 T ln((1 - t) / t) with no exp. Any split of [0, n) into
 * consecutive ranges gives the whole graph.
 * @param plan - the checked options and points
 * @param start - the first row
 * @param end - one past the last row
 * @param out - receives the edges
 */
export function hyperbolicRows(plan: HyperbolicPlan, start: number, end: number, out: EdgeBuffer): void {
    const { n, R, coshR, temperature, cosT, sinT, coshr, sinhr } = plan;
    const stream = new RandomStream(plan.seed, "hyperbolic", 0);
    for (let u = start; u < end; u++) {
        stream.reset(u);
        for (let v = u + 1; v < n; v++) {
            const coshD = coshr[u] * coshr[v] - sinhr[u] * sinhr[v] * (cosT[u] * cosT[v] + sinT[u] * sinT[v]);
            if (temperature === 0) {
                if (coshD < coshR) {
                    out.push(u, v);
                }
                continue;
            }
            const t = stream.nextFloat();
            if (acosh(Math.max(1, coshD)) < R + 2 * temperature * detLog((1 - t) / t)) {
                out.push(u, v);
            }
        }
    }
}

/**
 * A random hyperbolic graph (Krioukov et al. 2010): n points in a hyperbolic disk of radius R,
 * angles uniform and radii with density proportional to sinh(alpha r), alpha = (gamma - 1) / 2,
 * so the degrees follow a power law with exponent gamma. At temperature 0 two nodes are joined iff
 * their hyperbolic distance is below R; at T > 0 with probability 1 / (1 + exp((d - R) / (2 T))).
 *
 * R comes from the paper's approximation of the mean degree, R = 2 ln(2 xi^2 n / (pi k)) with
 * xi = alpha / (alpha - 1/2), times (pi T / sin(pi T)) inside the logarithm for T > 0. It is an
 * approximation, so the measured mean degree only lands near `averageDegree`: measured at n = 3000
 * and 10000, within about 10% for exponent >= 2.5 and T <= 0.7, but about 0.6x at exponent 2.2 and
 * about 0.5x at T = 0.9 (the approximation degrades as gamma approaches 2 and T approaches 1).
 *
 * Node i draws its angle theta = 2 pi u and then its radius r = acosh(1 + (cosh(alpha R) - 1) u') /
 * alpha (inverse CDF) from stream (seed, "hyperbolic-points", i); the pairs are decided by
 * {@link hyperbolicRows}. Edges are the pairs (u, v), u < v, ascending u then v. Node columns (all
 * Float64Array): `x`, `y` (the native polar embedding r cos theta, r sin theta) and `radius` (r).
 *
 * Cost: O(n^2) pairs (and one draw per pair at T > 0), so n is capped at 20000.
 * ponytail: naive pair loop, n <= 20000; the band algorithm of M. von Looz, H. Meyerhenke and
 * R. Prutkin, "Generating random hyperbolic graphs in subquadratic time", ISAAC 2015,
 * doi:10.1007/978-3-662-48971-0_40, is the upgrade path.
 * @param options - n, averageDegree, exponent, temperature and seed
 * @returns the undirected graph
 */
export function hyperbolicGraph(options: HyperbolicOptions): SampleGraph {
    const plan = planHyperbolic(options);
    const out = new EdgeBuffer(Math.ceil(plan.n * options.averageDegree * 0.75) + 16);
    hyperbolicRows(plan, 0, plan.n, out);
    return applyWeights(toGraph(plan.n, out, false, { x: plan.x, y: plan.y, radius: plan.radius }), options);
}
