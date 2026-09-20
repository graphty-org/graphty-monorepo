/**
 * HITS, eigenvector centrality and Katz centrality on the device (spec 3.3 lines 794-796, 8.2 lines 2603-2605):
 * three entry points over the ONE power-iteration driver, differing only in the adjacency the pull walks, the
 * normaliser and the coefficients. Eigenvector is the L2-normalised iteration over the forward core; Katz is
 * `alpha * A^T x + beta` over the reverse view with no per-iteration normaliser; HITS alternates the two pulls with
 * sum normalisation, `a(i) = A^T norm(h(i-1))` and `h(i) = A norm(a(i-1))` (the CPU package's recurrence, which
 * design 9.7 makes the parity target), as TWO interleaved chains of the driver -- the reverse-first chain from the
 * hub seed and the forward-first chain from the authority seed -- so a call is still two runs and two readbacks.
 * Every result is normalised ONCE on the host after the readback (sum for HITS, L2 for the other two), matching
 * the f64 oracle; the per-iteration normaliser never leaves the device (PD-10).
 */

import { type F32, type GraphSnapshot } from "@graphty/graph-format";

import { type GpuContext } from "../context.js";
import { WebGpuGraphError } from "../errors.js";
import {
    type EigenvectorOptions,
    type GpuHitsResult,
    type GpuScoresResult,
    type HitsOptions,
    type KatzOptions,
} from "../types/algorithms.js";
import { type Binding } from "../types/memory.js";
import { type GpuRunOptions } from "../types/run.js";
import { aborted, checkDest, coreOf, type PowerIterationRun, reverseOf, runPowerIteration } from "./power-iteration.js";

/** The three options every entry point shares, resolved. */
interface Resolved {
    readonly n: number;
    readonly maxIterations: number;
    readonly tolerance: number;
    readonly weights: Binding | null | undefined;
    readonly dest: F32 | null;
}

/**
 * Resolves and validates the shared options and the run options' `dest` / `signal`.
 * @param ctx - the context
 * @param s - the snapshot
 * @param options - maxIterations / tolerance / weighted plus dest / signal
 * @param algorithm - the public name, for messages
 * @returns the resolved options
 */
function resolve(
    ctx: GpuContext,
    s: GraphSnapshot,
    options: (HitsOptions & GpuRunOptions) | undefined,
    algorithm: string,
): Resolved {
    ctx.assertReady();
    const n = s.nodeCount;
    const maxIterations = options?.maxIterations ?? 100;
    const tolerance = options?.tolerance ?? 1e-6;
    if (!Number.isInteger(maxIterations) || maxIterations < 1) {
        throw new WebGpuGraphError("E_INVALID_ARGUMENT", `${algorithm}: maxIterations must be a positive integer`, {
            argument: "maxIterations",
            value: maxIterations,
            expected: "a positive integer",
        });
    }
    const dest = checkDest(options?.dest, n, algorithm);
    if (options?.signal?.aborted) {
        throw aborted(algorithm);
    }
    // weighted: false runs UNWEIGHTED on a weighted snapshot: the pull folds 1 per arc (prepareSpmvPull's null)
    return { n, maxIterations, tolerance, weights: options?.weighted === false ? null : undefined, dest };
}

/**
 * A finite coefficient, or E_INVALID_ARGUMENT.
 * @param value - the caller's value, or undefined for the default
 * @param fallback - the default
 * @param argument - the option name
 * @returns the coefficient
 */
function finite(value: number | undefined, fallback: number, argument: string): number {
    const resolved = value ?? fallback;
    if (!Number.isFinite(resolved)) {
        throw new WebGpuGraphError("E_INVALID_ARGUMENT", `katzCentrality: ${argument} must be a finite number`, {
            argument,
            value: resolved,
            expected: "a finite number",
        });
    }
    return resolved;
}

/**
 * Copies the raw iterate into its destination divided by its norm (unchanged when the norm is not positive).
 * @param raw - the driver's iterate
 * @param dest - the caller's destination, or null for the raw array itself
 * @param norm - "sum" (L1) or "l2"
 * @returns the normalised scores
 */
function normalised(raw: F32, dest: F32 | null, norm: "sum" | "l2"): F32 {
    let acc = 0;
    for (const v of raw) {
        acc += norm === "sum" ? Math.abs(v) : v * v;
    }
    const scale = norm === "sum" ? acc : Math.sqrt(acc);
    const out = dest ?? raw;
    for (let v = 0; v < raw.length; v++) {
        out[v] = scale > 0 ? raw[v] / scale : raw[v];
    }
    return out;
}

/**
 * The score result of one run.
 * @param run - the driver's run
 * @param dest - the caller's destination, or null
 * @param norm - the final normaliser
 * @returns the result
 */
function scoresOf(run: PowerIterationRun, dest: F32 | null, norm: "sum" | "l2"): GpuScoresResult {
    return {
        scores: normalised(run.scores, dest, norm),
        iterations: run.iterations,
        converged: run.converged,
        precision: "f32",
    };
}

/**
 * The n = 0 result: nothing to iterate.
 * @param dest - the caller's destination, or null
 * @param total - the run's progress denominator, reported to onProgress as both done and total
 * @param onProgress - the caller's progress callback
 * @returns the empty result
 */
function empty(
    dest: F32 | null,
    total: number,
    onProgress: ((done: number, total: number) => void) | undefined,
): GpuScoresResult {
    onProgress?.(total, total);
    return { scores: dest ?? new Float32Array(0), iterations: 0, converged: true, precision: "f32" };
}

/**
 * The latest iterate of one kind across the two HITS chains: a chain holds its seed's kind after an even number of
 * iterations m (in `scores`, index m) and the other kind's last iterate one back (in `previous`, index m - 1, never
 * null on an alternating run; the fallback only satisfies the type).
 * @param sameSeed - the chain seeded with the wanted kind
 * @param otherSeed - the chain seeded with the other kind
 * @returns the raw iterate with the higher index
 */
function latestOfKind(sameSeed: PowerIterationRun, otherSeed: PowerIterationRun): F32 {
    const fromSame = sameSeed.iterationsRun % 2 === 0 ? sameSeed.iterationsRun : sameSeed.iterationsRun - 1;
    const fromOther = otherSeed.iterationsRun % 2 === 1 ? otherSeed.iterationsRun : otherSeed.iterationsRun - 1;
    const chain = fromSame >= fromOther ? sameSeed : otherSeed;
    const index = Math.max(fromSame, fromOther);
    return (index === chain.iterationsRun ? chain.scores : chain.previous) ?? chain.scores;
}

/**
 * Eigenvector centrality on the device (spec 3.3, 8.2): the L2-normalised power iteration over the forward
 * adjacency, converging on `delta < n * tolerance`; the scores are L2-normalised.
 * @param ctx - the context whose device runs the kernels
 * @param s - the snapshot (uploaded through ctx.residency, or found there)
 * @param options - maxIterations 100 / tolerance 1e-6 / weighted true, plus dest / signal / onProgress
 * @returns the scores, iterations, converged and precision
 */
export async function eigenvectorCentrality(
    ctx: GpuContext,
    s: GraphSnapshot,
    options?: EigenvectorOptions & GpuRunOptions,
): Promise<GpuScoresResult> {
    const algorithm = "eigenvectorCentrality";
    const r = resolve(ctx, s, options, algorithm);
    if (r.n === 0) {
        return empty(r.dest, r.maxIterations, options?.onProgress);
    }
    const run = await runPowerIteration(ctx, r.n, {
        normMode: 2,
        adjacency: coreOf(ctx, s, algorithm),
        alternate: null,
        alpha: 1,
        beta: 0,
        uniformP: 0,
        maxIterations: r.maxIterations,
        tolerance: r.tolerance,
        weights: r.weights,
        label: algorithm,
        signal: options?.signal,
        onProgress: options?.onProgress,
    });
    return scoresOf(run, r.dest, "l2");
}

/**
 * Katz centrality on the device (spec 3.3, 8.2): `x = alpha * A^T x + beta` over the reverse adjacency with no
 * per-iteration normaliser; the scores are L2-normalised once at the end.
 * @param ctx - the context whose device runs the kernels
 * @param s - the snapshot (uploaded through ctx.residency, or found there)
 * @param options - alpha 0.1 / beta 1 / maxIterations 100 / tolerance 1e-6 / weighted true, plus dest / signal / onProgress
 * @returns the scores, iterations, converged and precision
 */
export async function katzCentrality(
    ctx: GpuContext,
    s: GraphSnapshot,
    options?: KatzOptions & GpuRunOptions,
): Promise<GpuScoresResult> {
    const algorithm = "katzCentrality";
    const alpha = finite(options?.alpha, 0.1, "alpha");
    const beta = finite(options?.beta, 1, "beta");
    const r = resolve(ctx, s, options, algorithm);
    if (r.n === 0) {
        return empty(r.dest, r.maxIterations, options?.onProgress);
    }
    const run = await runPowerIteration(ctx, r.n, {
        normMode: 4,
        adjacency: reverseOf(ctx, s),
        alternate: null,
        alpha,
        beta,
        uniformP: 1,
        maxIterations: r.maxIterations,
        tolerance: r.tolerance,
        weights: r.weights,
        label: algorithm,
        signal: options?.signal,
        onProgress: options?.onProgress,
    });
    return scoresOf(run, r.dest, "l2");
}

/**
 * HITS on the device (spec 3.3, 8.2): `a(i) = A^T norm(h(i-1))` and `h(i) = A norm(a(i-1))` from uniform seeds,
 * sum-normalised. Those two recurrences interleave into two independent chains, each alternating the reverse and
 * the forward pull, so the driver runs twice: the chain seeded as hubs pulls reverse first and holds h(m) after an
 * even number m of iterations and a(m) after an odd one; the chain seeded as authorities is the mirror image. Each
 * chain stops at its own batch boundary, so the two can end on opposite parities holding the SAME kind; the result
 * takes the latest iterate of each kind across both chains (a chain's last two iterates are one of each kind),
 * which is h(m) and a(m) when both ran m iterations and never two vectors of one kind otherwise.
 * `iterations` is the larger of the two and `converged` their conjunction. `dest`, when given, receives the hubs.
 * Both vectors are sum-normalised.
 * @param ctx - the context whose device runs the kernels
 * @param s - the snapshot (uploaded through ctx.residency, or found there)
 * @param options - maxIterations 100 / tolerance 1e-6 / weighted true, plus dest / signal / onProgress
 * @returns hubs, authorities, iterations, converged and precision
 */
export async function hits(
    ctx: GpuContext,
    s: GraphSnapshot,
    options?: HitsOptions & GpuRunOptions,
): Promise<GpuHitsResult> {
    const algorithm = "hits";
    const r = resolve(ctx, s, options, algorithm);
    const total = 2 * r.maxIterations;
    if (r.n === 0) {
        const { scores, iterations, converged, precision } = empty(r.dest, total, options?.onProgress);
        return { hubs: scores, authorities: new Float32Array(0), iterations, converged, precision };
    }
    const onProgress = options?.onProgress;
    const shared = {
        normMode: 1 as const,
        alpha: 1,
        beta: 0,
        uniformP: 0,
        maxIterations: r.maxIterations,
        tolerance: r.tolerance,
        weights: r.weights,
        signal: options?.signal,
    };
    const forward = coreOf(ctx, s, algorithm);
    const reverse = reverseOf(ctx, s);
    const hubSeeded = await runPowerIteration(ctx, r.n, {
        ...shared,
        adjacency: reverse,
        alternate: forward,
        label: `${algorithm}/hub-seeded`,
        onProgress:
            onProgress === undefined
                ? undefined
                : (done) => {
                      onProgress(done, total);
                  },
    });
    const authoritySeeded = await runPowerIteration(ctx, r.n, {
        ...shared,
        adjacency: forward,
        alternate: reverse,
        label: `${algorithm}/authority-seeded`,
        onProgress:
            onProgress === undefined
                ? undefined
                : (done) => {
                      onProgress(r.maxIterations + done, total);
                  },
    });
    return {
        hubs: normalised(latestOfKind(hubSeeded, authoritySeeded), r.dest, "sum"),
        authorities: normalised(latestOfKind(authoritySeeded, hubSeeded), null, "sum"),
        iterations: Math.max(hubSeeded.iterations, authoritySeeded.iterations),
        converged: hubSeeded.converged && authoritySeeded.converged,
        precision: "f32",
    };
}
