/**
 * Counted-work scaling: run an operation at two graph sizes and assert how a work counter grows.
 *
 * Work is counted -- visits, searches, repaints, rebuilds -- never timed, so the result holds on
 * any machine however busy it is. A per-item operation (remove one node) should do about the same
 * work at either size; a whole-graph operation (load, clear) about `large / small` times as much.
 * A cost per item that grows with the graph shows up as the square of that.
 *
 * Register the public method a test covers in `test/cost-coverage/counted-work.ts`.
 */
import { assert } from "vitest";

/** How the work should grow from the small size to the large one. */
export type Growth = "constant" | "linear";

export interface ScalingOptions {
    /** The two graph sizes, small then large; `[n, 4 * n]` is the usual pair. */
    readonly sizes: readonly [number, number];
    /** `linear` (the default) for a whole-graph operation, `constant` for a per-item one. */
    readonly growth?: Growth;
    /** What is counted, for the failure message; a function is read after both runs. */
    readonly counter?: string | (() => string);
    /** A tighter bound on large / small than `growth` gives, for a test that held one before. */
    readonly maxRatio?: number;
}

/**
 * Run `measure` at both sizes and assert the work grows no faster than `growth` allows.
 *
 * The bound sits halfway, on a log scale, between the growth asked for and the next one up: for a
 * 4x size step, linear allows 8x (quadratic is 16x) and constant allows 2x (linear is 4x).
 * @param measure - Builds a graph of the given size, runs the operation, and returns the work
 *     counted while the operation ran.
 * @param options - The sizes, the expected growth, and the counter's name.
 * @returns The two counts.
 */
export async function assertScalesLinearly(
    measure: (size: number) => number | Promise<number>,
    options: ScalingOptions,
): Promise<{ small: number; large: number }> {
    const [smallSize, largeSize] = options.sizes;
    assert.isAbove(largeSize, smallSize, "sizes are small then large");
    const small = await measure(smallSize);
    const large = await measure(largeSize);
    const step = largeSize / smallSize;
    const growth = options.growth ?? "linear";
    const allowed = options.maxRatio ?? (growth === "linear" ? step ** 1.5 : step ** 0.5);
    const what = typeof options.counter === "function" ? options.counter() : (options.counter ?? "work");
    const message =
        `${what}: ${String(small)} at size ${String(smallSize)}, ${String(large)} at size ${String(largeSize)} ` +
        `(${(large / small).toFixed(2)}x for a ${String(step)}x larger graph; at most ${allowed.toFixed(1)}x allowed)`;

    // A count of 0 means the counter saw nothing, not that the operation is free.
    assert.isAbove(small, 0, message);
    assert.isAtMost(large, allowed * small, message);
    return { small, large };
}
