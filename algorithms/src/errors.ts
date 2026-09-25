/**
 * Thrown when an iterative algorithm reaches its iteration cap before meeting its tolerance.
 *
 * The scores it had reached are not returned: an unconverged vector is not the answer, and
 * returning it in silence would pass it off as one. networkx makes the same choice with
 * `PowerIterationFailedConvergence`. Raise `maxIterations`, or loosen `tolerance`, and call again.
 */
export class ConvergenceError extends Error {
    override readonly name = "ConvergenceError";

    /**
     * Builds the error and its message.
     * @param algorithm - The function that gave up, e.g. `"eigenvectorCentrality"`
     * @param iterations - The passes it ran, which is its `maxIterations`
     * @param tolerance - The tolerance it did not meet
     */
    constructor(
        readonly algorithm: string,
        readonly iterations: number,
        readonly tolerance: number,
    ) {
        super(
            `${algorithm} did not converge in ${String(iterations)} iterations (tolerance ${String(tolerance)}); raise maxIterations or tolerance`,
        );
    }
}

/**
 * Thrown when a shortest path cannot be walked back from its predecessor array: the walk met a
 * missing or out-of-range predecessor before the source (`"gap"`), or took more than
 * `nodeCount - 1` steps without reaching it (`"cycle"`).
 *
 * A CPU search never produces such an array; an accelerator's result can (a kernel bug, a lost
 * device, a buffer read too early). The error surfaces it instead of hanging or returning a wrong
 * path, and nothing recomputes the path on the CPU.
 */
export class PathWalkError extends Error {
    override readonly name = "PathWalkError";

    /**
     * Builds the error and its message.
     * @param source - The search's source node index
     * @param target - The node index the walk started from
     * @param reason - `"gap"` or `"cycle"`, as above
     */
    constructor(
        readonly source: number,
        readonly target: number,
        readonly reason: "cycle" | "gap",
    ) {
        super(
            `cannot walk the shortest path from node ${String(source)} to node ${String(target)}: the predecessor array has a ${reason}`,
        );
    }
}
